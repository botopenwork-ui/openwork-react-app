const { pollCCTPAttestation } = require('../utils/cctp-poller');
const { executeReceiveMessageOnOpSepolia } = require('../utils/tx-executor');
const { getDomainFromJobId, getChainNameFromJobId } = require('../utils/chain-utils');
const config = require('../config');

/**
 * Process Settle Dispute flow: Arbitrum → Multi-Chain
 * Triggered when dispute is settled on Arbitrum Native Athena
 * Funds go to the chain where the job was posted
 * @param {string} disputeId - Dispute ID from the transaction
 * @param {string} jobId - Job ID to determine destination chain (format: "eid-jobNumber")
 * @param {string} sourceTxHash - Transaction hash from Arbitrum Sepolia
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
  
  console.log(`Source TX (Arbitrum Sepolia): ${sourceTxHash}`);
  
  try {
    // STEP 1: Poll Circle API for CCTP attestation
    console.log('\n📍 STEP 1/2: Polling Circle API for CCTP attestation...');
    const attestation = await pollCCTPAttestation(
      sourceTxHash, 
      config.DOMAINS.ARBITRUM_SEPOLIA // Domain 3
    );
    console.log('✅ Attestation received');
    
    // STEP 2: Execute receiveMessage() on destination chain
    console.log(`\n📍 STEP 2/2: Executing receiveMessage() on ${destinationChain}...`);
    const result = await executeReceiveMessageOnOpSepolia(attestation);
    
    if (result.alreadyCompleted) {
      console.log(`✅ USDC already transferred to winner on ${destinationChain} (completed by CCTP)`);
    } else {
      console.log(`✅ USDC transferred to winner on ${destinationChain}: ${result.transactionHash}`);
    }
    
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
    
    throw error;
  }
}

module.exports = {
  processSettleDispute
};
