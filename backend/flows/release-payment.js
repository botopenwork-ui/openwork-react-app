const { waitForNOWJCEvent } = require('../utils/event-monitor');
const { pollCCTPAttestation } = require('../utils/cctp-poller');
const { executeReceiveMessage, executeReceiveOnOptimism } = require('../utils/tx-executor');
const { getDomainFromJobId, getChainNameFromJobId } = require('../utils/chain-utils');
const { saveCCTPTransfer, updateCCTPStatus } = require('../utils/cctp-storage');
const { recordTx, updateTxStatus } = require('../utils/payment-store');
const config = require('../config');

/**
 * Process Release Payment flow: Arbitrum → Multi-Chain
 *
 * @param {string} jobId       - Job ID (format "eid-jobNumber")
 * @param {Map}    statusMap   - Optional in-memory status map
 * @param {string} statusKey   - Key for status updates
 * @param {string} knownTxHash - If provided, skip event scanning (use this ARB tx hash directly)
 *                               Pass this when the event was already detected by the event listener.
 */
async function processReleasePayment(jobId, statusMap, statusKey, knownTxHash = null) {
  const sKey = statusKey || jobId;
  console.log('\n💰 ========== RELEASE PAYMENT FLOW INITIATED ==========');
  console.log(`Job ID: ${jobId}${knownTxHash ? ' (known tx: ' + knownTxHash + ')' : ''}`);

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
    // STEP 1: Get the ARB PaymentReleased tx hash
    // If caller already has it (from event listener), skip scanning — much faster + resilient to restarts
    let nowjcTxHash;
    if (knownTxHash) {
      nowjcTxHash = knownTxHash;
      console.log(`\n📍 STEP 1/3: Using known ARB tx hash: ${nowjcTxHash}`);
    } else {
      console.log('\n📍 STEP 1/3: Monitoring for PaymentReleased event on Arbitrum...');
      if (statusMap) statusMap.set(sKey, { status: 'waiting_for_event', message: 'Waiting for LayerZero message to reach Arbitrum...' });

      // 30s delay for LZ propagation only when we don't already have the tx hash
      console.log('⏳ Waiting 30 seconds for LayerZero message propagation...');
      await new Promise(resolve => setTimeout(resolve, 30000));

      nowjcTxHash = await waitForNOWJCEvent('PaymentReleased', jobId, undefined, 200);
      console.log(`✅ PaymentReleased detected: ${nowjcTxHash}`);
    }

    // 📝 Persist ARB tx hash immediately — user can always recover via /api/payment-log
    recordTx(jobId, 'release_burn', nowjcTxHash, {
      chain: 'Arbitrum', domain: config.DOMAINS.ARBITRUM,
      note: 'ARB PaymentReleased tx. To recover: poll iris-api.circle.com/v2/messages/3?transactionHash=' + nowjcTxHash + ' then call OP CCTPTransceiver.receive() selector 0x7376ee1f'
    });

    const sourceChainName = config.isMainnet() ? 'Arbitrum One' : 'Arbitrum Sepolia';
    await saveCCTPTransfer('releasePayment', jobId, nowjcTxHash, sourceChainName, config.DOMAINS.ARBITRUM);

    // STEP 2: Poll Circle API for attestation
    await updateCCTPStatus(jobId, 'releasePayment', { step: 'polling_attestation' });
    if (statusMap) statusMap.set(sKey, { status: 'polling_attestation', message: 'Polling Circle API for CCTP attestation...' });

    console.log('\n📍 STEP 2/3: Polling Circle API for CCTP attestation...');
    const attestation = await pollCCTPAttestation(nowjcTxHash, config.DOMAINS.ARBITRUM);
    console.log('✅ Attestation received');

    await updateCCTPStatus(jobId, 'releasePayment', {
      step: 'executing_receive',
      attestationMessage: attestation.message,
      attestationSignature: attestation.attestation
    });
    if (statusMap) statusMap.set(sKey, { status: 'executing_receive', message: `Executing CCTP transfer to ${destinationChain}...` });

    // STEP 3: Execute CCTP receive on destination chain
    console.log(`\n📍 STEP 3/3: Executing CCTP receive on ${destinationChain}...`);
    const isOpMainnet = config.isMainnet() &&
      (destinationChain.toLowerCase().includes('optimism') || destinationChain.toLowerCase() === 'op');

    let result;
    if (isOpMainnet) {
      console.log('   Using CCTPTransceiver.receive() for OP mainnet (selector 0x7376ee1f)');
      result = await executeReceiveOnOptimism(attestation);
    } else {
      result = await executeReceiveMessage(attestation, destinationChain);
    }

    if (result.alreadyCompleted) {
      console.log(`✅ Payment already completed on ${destinationChain}`);
    } else {
      console.log(`✅ Payment completed on ${destinationChain}: ${result.transactionHash}`);
    }

    updateTxStatus(jobId, 'release_burn', 'completed', result.transactionHash);
    if (result.transactionHash) {
      recordTx(jobId, 'release_mint', result.transactionHash, { chain: destinationChain, status: 'completed' });
    }

    await updateCCTPStatus(jobId, 'releasePayment', {
      status: 'completed',
      completionTxHash: result.transactionHash || 'already_completed'
    });

    if (statusMap) statusMap.set(sKey, {
      status: 'completed',
      message: 'Payment delivered to taker ✅',
      completionTxHash: result.transactionHash
    });

    console.log('\n🎉 ========== RELEASE PAYMENT FLOW COMPLETED ==========\n');
    return { success: true, jobId, nowjcTxHash, completionTxHash: result.transactionHash, alreadyCompleted: result.alreadyCompleted };

  } catch (error) {
    console.error('\n❌ ========== RELEASE PAYMENT FLOW FAILED ==========');
    console.error(`Job ID: ${jobId} | Error: ${error.message}`);
    await updateCCTPStatus(jobId, 'releasePayment', { status: 'failed', lastError: error.message });
    if (statusMap) statusMap.set(sKey, { status: 'failed', error: error.message });
    throw error;
  }
}

module.exports = { processReleasePayment };


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

    // 📝 Persist ARB tx hash immediately — user can recover manually if backend fails here
    recordTx(jobId, 'release_burn', nowjcTxHash, {
      chain: 'Arbitrum', domain: config.DOMAINS.ARBITRUM,
      note: 'PaymentReleased on ARB NOWJC — CCTP burn pending. If backend fails, poll iris-api.circle.com/v2/messages/3?transactionHash=' + nowjcTxHash + ' then call OP CCTPTransceiver.receive() selector 0x7376ee1f'
    });

    // Save to database
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
    
    // STEP 3: Execute CCTP receive on destination chain
    // ⚠️ CRITICAL: For OP mainnet, must call CCTPTransceiver.receive() NOT MessageTransmitter.receiveMessage()
    // Direct MT call fails with "Invalid signature: not attester" on OP mainnet
    console.log(`\n📍 STEP 3/3: Executing CCTP receive on ${destinationChain}...`);
    
    let result;
    const isOpMainnet = config.isMainnet() && 
      (destinationChain.toLowerCase().includes('optimism') || destinationChain.toLowerCase() === 'op');
    
    if (isOpMainnet) {
      console.log('   Using CCTPTransceiver.receive() for OP mainnet (selector 0x7376ee1f)');
      result = await executeReceiveOnOptimism(attestation);
    } else {
      result = await executeReceiveMessage(attestation, destinationChain);
    }
    
    if (result.alreadyCompleted) {
      console.log(`✅ Payment already completed to applicant on ${destinationChain}`);
    } else {
      console.log(`✅ Payment completed to applicant on ${destinationChain}: ${result.transactionHash}`);
    }

    // 📝 Record completion tx hash
    updateTxStatus(jobId, 'release_burn', 'completed', result.transactionHash);
    if (result.transactionHash) {
      recordTx(jobId, 'release_mint', result.transactionHash, {
        chain: destinationChain, status: 'completed',
        note: 'USDC minted at taker on OP via CCTPTransceiver.receive()'
      });
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
