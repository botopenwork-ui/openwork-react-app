const { pollCCTPAttestation } = require('../utils/cctp-poller');
const { executeReceiveMessage } = require('../utils/tx-executor');
const { getDomainFromJobId, getChainNameFromJobId } = require('../utils/chain-utils');
const { saveCCTPTransfer, updateCCTPStatus } = require('../utils/cctp-storage');
const config = require('../config');

/**
 * Process Settle Dispute flow: Arbitrum → Multi-Chain
 * Triggered when dispute is settled on Arbitrum Native Athena
 * Funds go to the chain where the job was posted
 * @param {string} disputeId - Dispute ID from the transaction
 * @param {string} jobId - Job ID to determine destination chain (format: "eid-jobNumber")
 * @param {string} sourceTxHash - Transaction hash from Arbitrum (native chain)
 */
async function processSettleDispute(disputeId, jobId, sourceTxHash) {
  console.log('\n⚖️ ========== SETTLE DISPUTE FLOW INITIATED ==========');
  console.log(`Dispute ID: ${disputeId}`);
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
  
  // Determine source chain name based on network mode
  const sourceChainName = config.isMainnet() ? 'Arbitrum One' : 'Arbitrum Sepolia';
  console.log(`Source TX (${sourceChainName}): ${sourceTxHash}`);

  try {
    // Save to database - use dynamic domain from config
    await saveCCTPTransfer('settleDispute', jobId, sourceTxHash, sourceChainName, config.DOMAINS.ARBITRUM, disputeId);

    // STEP 1: Poll Circle API for CCTP attestation
    await updateCCTPStatus(jobId, 'settleDispute', { step: 'polling_attestation' });

    console.log('\n📍 STEP 1/2: Polling Circle API for CCTP attestation...');
    const attestation = await pollCCTPAttestation(
      sourceTxHash,
      config.DOMAINS.ARBITRUM // Domain 3 for both testnet and mainnet
    );
    console.log('✅ Attestation received');
    
    // Update - attestation received
    await updateCCTPStatus(jobId, 'settleDispute', {
      step: 'executing_receive',
      attestationMessage: attestation.message,
      attestationSignature: attestation.attestation
    });
    
    // STEP 2: Execute receiveMessage() on destination chain (dynamic based on job ID)
    console.log(`\n📍 STEP 2/2: Executing receiveMessage() on ${destinationChain}...`);
    const result = await executeReceiveMessage(attestation, destinationChain);
    
    if (result.alreadyCompleted) {
      console.log(`✅ USDC already transferred to winner on ${destinationChain} (completed by CCTP)`);
    } else {
      console.log(`✅ USDC transferred to winner on ${destinationChain}: ${result.transactionHash}`);
    }
    
    // Mark as completed in DB
    await updateCCTPStatus(jobId, 'settleDispute', {
      status: 'completed',
      completionTxHash: result.transactionHash || 'already_completed'
    });
    
    console.log('\n🎉 ========== SETTLE DISPUTE FLOW COMPLETED ==========\n');
    return {
      success: true,
      disputeId,
      sourceTxHash,
      completionTxHash: result.transactionHash,
      alreadyCompleted: result.alreadyCompleted
    };
    
  } catch (error) {
    console.error('\n❌ ========== SETTLE DISPUTE FLOW FAILED ==========');
    console.error(`Dispute ID: ${disputeId}`);
    console.error(`Error: ${error.message}`);
    console.error('====================================================\n');
    
    // Mark as failed in DB
    await updateCCTPStatus(jobId, 'settleDispute', {
      status: 'failed',
      lastError: error.message
    });
    
    throw error;
  }
}

module.exports = {
  processSettleDispute
};
