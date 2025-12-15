const { waitForNOWJCEvent } = require('../utils/event-monitor');
const { pollCCTPAttestation } = require('../utils/cctp-poller');
const { executeReceiveOnArbitrum } = require('../utils/tx-executor');
const { getDomainFromJobId, getChainNameFromJobId } = require('../utils/chain-utils');
const config = require('../config');

/**
 * Process Start Job flow: Multi-Chain → Arbitrum
 * Triggered when user starts a job on any local chain (OP Sepolia, ETH Sepolia, etc.)
 * @param {string} jobId - Job ID from the transaction (format: "eid-jobNumber")
 * @param {string} sourceTxHash - Transaction hash from source chain
 */
async function processStartJob(jobId, sourceTxHash) {
  console.log('\n🚀 ========== START JOB FLOW INITIATED ==========');
  console.log(`Job ID: ${jobId}`);
  
  // Detect source chain from job ID
  let sourceChain, sourceDomain;
  try {
    sourceChain = getChainNameFromJobId(jobId);
    sourceDomain = getDomainFromJobId(jobId);
    console.log(`Source Chain: ${sourceChain} (Domain ${sourceDomain})`);
  } catch (error) {
    console.error(`❌ Failed to detect chain from job ID: ${error.message}`);
    throw error;
  }
  
  console.log(`Source TX (${sourceChain}): ${sourceTxHash}`);
  
  try {
    // STEP 1: Monitor NOWJC for JobStarted event
    console.log('\n📍 STEP 1/3: Monitoring for JobStarted event on Arbitrum...');
    const nowjcTxHash = await waitForNOWJCEvent('JobStarted', jobId);
    console.log(`✅ JobStarted detected: ${nowjcTxHash}`);
    
    // STEP 2: Poll Circle API for CCTP attestation
    console.log(`\n📍 STEP 2/3: Polling Circle API for CCTP attestation (Domain ${sourceDomain})...`);
    const attestation = await pollCCTPAttestation(
      sourceTxHash, 
      sourceDomain  // Dynamic domain based on job ID
    );
    console.log(`✅ Attestation received from ${sourceChain}`);
    
    // STEP 3: Execute receive() on Arbitrum
    console.log('\n📍 STEP 3/3: Executing receive() on Arbitrum...');
    const result = await executeReceiveOnArbitrum(attestation);
    
    if (result.alreadyCompleted) {
      console.log('✅ USDC already transferred to NOWJC (completed by CCTP)');
    } else {
      console.log(`✅ USDC transferred to NOWJC: ${result.transactionHash}`);
    }
    
    console.log('\n🎉 ========== START JOB FLOW COMPLETED ==========\n');
    return {
      success: true,
      jobId,
      sourceTxHash,
      nowjcTxHash,
      completionTxHash: result.transactionHash,
      alreadyCompleted: result.alreadyCompleted
    };
    
  } catch (error) {
    console.error('\n❌ ========== START JOB FLOW FAILED ==========');
    console.error(`Job ID: ${jobId}`);
    console.error(`Error: ${error.message}`);
    console.error('===============================================\n');
    
    throw error;
  }
}

module.exports = {
  processStartJob
};
