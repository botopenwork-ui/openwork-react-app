const { waitForNOWJCEvent } = require('../utils/event-monitor');
const { pollCCTPAttestation } = require('../utils/cctp-poller');
const { executeReceiveMessage } = require('../utils/tx-executor');
const { getDomainFromJobId, getChainNameFromJobId } = require('../utils/chain-utils');
const { saveCCTPTransfer, updateCCTPStatus } = require('../utils/cctp-storage');
const config = require('../config');

/**
 * Process Release Payment flow: Arbitrum → Multi-Chain
 * Triggered when user releases payment which causes NOWJC to emit PaymentReleased
 * Payment goes to the chain where the job was posted
 * @param {string} jobId - Job ID from the transaction (format: "eid-jobNumber")
 * @param {Map} statusMap - Optional status map to update progress
 * @param {string} statusKey - Key for status updates (defaults to jobId for backward compat)
 */
async function processReleasePayment(jobId, statusMap, statusKey) {
  const sKey = statusKey || jobId;
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
    console.log('⏳ Waiting for LayerZero message to arrive from source chain...');
    
    // Update status if statusMap provided
    if (statusMap) {
      statusMap.set(sKey, {
        status: 'waiting_for_event',
        message: 'Waiting for LayerZero message to reach Arbitrum...'
      });
    }
    
    // Add delay to allow LayerZero message to propagate (usually takes 20-40 seconds)
    console.log('⏳ Waiting 30 seconds for LayerZero message propagation...');
    await new Promise(resolve => setTimeout(resolve, 30000)); // 30 second delay
    
    const nowjcTxHash = await waitForNOWJCEvent('PaymentReleased', jobId, undefined, 200);
    console.log(`✅ PaymentReleased detected: ${nowjcTxHash}`);
    
    // Save to database - use dynamic chain name based on network mode
    const sourceChainName = config.isMainnet() ? 'Arbitrum One' : 'Arbitrum Sepolia';
    await saveCCTPTransfer('releasePayment', jobId, nowjcTxHash, sourceChainName, config.DOMAINS.ARBITRUM);

    // STEP 2: Poll Circle API for CCTP attestation
    await updateCCTPStatus(jobId, 'releasePayment', { step: 'polling_attestation' });

    // Update status if statusMap provided
    if (statusMap) {
      statusMap.set(sKey, {
        status: 'polling_attestation',
        message: 'Polling Circle API for CCTP attestation...'
      });
    }

    console.log('\n📍 STEP 2/3: Polling Circle API for CCTP attestation...');
    console.log(`   Source TX Hash: ${nowjcTxHash}`);
    console.log(`   Source Domain: ${config.DOMAINS.ARBITRUM} (${sourceChainName})`);
    console.log(`   Destination Chain: ${destinationChain} (Domain ${destinationDomain})`);

    const attestation = await pollCCTPAttestation(
      nowjcTxHash,
      config.DOMAINS.ARBITRUM // Domain 3 for both testnet and mainnet
    );
    console.log('✅ Attestation received');
    console.log('   Attestation details:', {
      messageLength: attestation.message?.length,
      attestationLength: attestation.attestation?.length,
      mintRecipient: attestation.mintRecipient,
      amount: attestation.amount
    });
    
    // Update - attestation received
    await updateCCTPStatus(jobId, 'releasePayment', {
      step: 'executing_receive',
      attestationMessage: attestation.message,
      attestationSignature: attestation.attestation
    });
    
    // Update status if statusMap provided
    if (statusMap) {
      statusMap.set(sKey, {
        status: 'executing_receive',
        message: `Executing CCTP transfer to ${destinationChain}...`
      });
    }
    
    // STEP 3: Execute receiveMessage() on destination chain
    console.log(`\n📍 STEP 3/3: Executing receiveMessage() on ${destinationChain}...`);
    const result = await executeReceiveMessage(attestation, destinationChain);
    
    if (result.alreadyCompleted) {
      console.log(`✅ Payment already completed to applicant on ${destinationChain} (completed by CCTP)`);
    } else {
      console.log(`✅ Payment completed to applicant on ${destinationChain}: ${result.transactionHash}`);
    }
    
    // Mark as completed in DB
    await updateCCTPStatus(jobId, 'releasePayment', {
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
    await updateCCTPStatus(jobId, 'releasePayment', {
      status: 'failed',
      lastError: error.message
    });
    
    throw error;
  }
}

module.exports = {
  processReleasePayment
};
