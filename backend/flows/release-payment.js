const { waitForNOWJCEvent } = require('../utils/event-monitor');
const { pollCCTPAttestation } = require('../utils/cctp-poller');
const { executeReceiveMessageOnOpSepolia } = require('../utils/tx-executor');
const { getDomainFromJobId, getChainNameFromJobId } = require('../utils/chain-utils');
const { saveCCTPTransfer, updateCCTPStatus } = require('../utils/cctp-storage');
const config = require('../config');

/**
 * Process Release Payment flow: Arbitrum → Multi-Chain
 * Triggered when user releases payment which causes NOWJC to emit PaymentReleased
 * Payment goes to the chain where the job was posted
 * @param {string} jobId - Job ID from the transaction (format: "eid-jobNumber")
 */
async function processReleasePayment(jobId) {
  console.log('\n💰 ========== RELEASE PAYMENT FLOW INITIATED ==========');
  console.log(`Job ID: ${jobId}`);
  
  // Detect destination chain from job ID
  let destinationChain, destinationDomain;
  try {
    destinationChain = getChainNameFromJobId(jobId);
    destinationDomain = getDomainFromJobId(jobId);
    console.log(`Destination Chain: ${destinationChain} (Domain ${destinationDomain})`);
  } catch (error) {
    console.error(`❌ Failed to detect chain from job ID: ${error.message}`);
    throw error;
  }
  
  try {
    // STEP 1: Monitor NOWJC for PaymentReleased event
    console.log('\n📍 STEP 1/3: Monitoring for PaymentReleased event on Arbitrum...');
    const nowjcTxHash = await waitForNOWJCEvent('PaymentReleased', jobId);
    console.log(`✅ PaymentReleased detected: ${nowjcTxHash}`);
    
    // Save to database
    saveCCTPTransfer('releasePayment', jobId, nowjcTxHash, 'Arbitrum Sepolia', config.DOMAINS.ARBITRUM_SEPOLIA);
    
    // STEP 2: Poll Circle API for CCTP attestation
    updateCCTPStatus(jobId, 'releasePayment', { step: 'polling_attestation' });
    
    console.log('\n📍 STEP 2/3: Polling Circle API for CCTP attestation...');
    const attestation = await pollCCTPAttestation(
      nowjcTxHash, 
      config.DOMAINS.ARBITRUM_SEPOLIA // Domain 3
    );
    console.log('✅ Attestation received');
    
    // Update - attestation received
    updateCCTPStatus(jobId, 'releasePayment', {
      step: 'executing_receive',
      attestationMessage: attestation.message,
      attestationSignature: attestation.attestation
    });
    
    // STEP 3: Execute receiveMessage() on destination chain
    console.log(`\n📍 STEP 3/3: Executing receiveMessage() on ${destinationChain}...`);
    const result = await executeReceiveMessageOnOpSepolia(attestation);
    
    if (result.alreadyCompleted) {
      console.log(`✅ Payment already completed to applicant on ${destinationChain} (completed by CCTP)`);
    } else {
      console.log(`✅ Payment completed to applicant on ${destinationChain}: ${result.transactionHash}`);
    }
    
    // Mark as completed in DB
    updateCCTPStatus(jobId, 'releasePayment', {
      status: 'completed',
      completionTxHash: result.transactionHash || 'already_completed'
    });
    
    console.log('\n🎉 ========== RELEASE PAYMENT FLOW COMPLETED ==========\n');
    return {
      success: true,
      jobId,
      nowjcTxHash,
      completionTxHash: result.transactionHash,
      alreadyCompleted: result.alreadyCompleted
    };
    
  } catch (error) {
    console.error('\n❌ ========== RELEASE PAYMENT FLOW FAILED ==========');
    console.error(`Job ID: ${jobId}`);
    console.error(`Error: ${error.message}`);
    console.error('====================================================\n');
    
    // Mark as failed in DB
    updateCCTPStatus(jobId, 'releasePayment', {
      status: 'failed',
      lastError: error.message
    });
    
    throw error;
  }
}

module.exports = {
  processReleasePayment
};
