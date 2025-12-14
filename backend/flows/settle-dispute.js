const { pollCCTPAttestation } = require('../utils/cctp-poller');
const { executeReceiveMessageOnOpSepolia } = require('../utils/tx-executor');
const config = require('../config');

/**
 * Process Settle Dispute flow: Arbitrum → OP Sepolia
 * Triggered when dispute is settled on Arbitrum Native Athena
 * @param {string} disputeId - Dispute ID from the transaction
 * @param {string} sourceTxHash - Transaction hash from Arbitrum Sepolia
 */
async function processSettleDispute(disputeId, sourceTxHash) {
  console.log('\n⚖️ ========== SETTLE DISPUTE FLOW INITIATED ==========');
  console.log(`Dispute ID: ${disputeId}`);
  console.log(`Source TX (Arbitrum Sepolia): ${sourceTxHash}`);
  
  try {
    // STEP 1: Poll Circle API for CCTP attestation
    console.log('\n📍 STEP 1/2: Polling Circle API for CCTP attestation...');
    const attestation = await pollCCTPAttestation(
      sourceTxHash, 
      config.DOMAINS.ARBITRUM_SEPOLIA // Domain 3
    );
    console.log('✅ Attestation received');
    
    // STEP 2: Execute receiveMessage() on OP Sepolia
    console.log('\n📍 STEP 2/2: Executing receiveMessage() on OP Sepolia...');
    const result = await executeReceiveMessageOnOpSepolia(attestation);
    
    if (result.alreadyCompleted) {
      console.log('✅ USDC already transferred to winner (completed by CCTP)');
    } else {
      console.log(`✅ USDC transferred to winner: ${result.transactionHash}`);
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
