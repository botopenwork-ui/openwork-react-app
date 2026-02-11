const express = require('express');
const cors = require('cors');
const { Web3 } = require('web3');
const config = require('./config');
const { processStartJob } = require('./flows/start-job');
const { processReleasePayment } = require('./flows/release-payment');
const { processSettleDispute } = require('./flows/settle-dispute');
const { compileContract } = require('./utils/compiler');
const deploymentRoutes = require('./routes/deployments');
const proposalRoutes = require('./routes/proposals');
const registryRoutes = require('./routes/registry');
const adminRoutes = require('./routes/admin');
const ipfsRoutes = require('./routes/ipfs');
const chatRoutes = require('./routes/chat');

// Initialize Express
const app = express();
app.use(express.json());
app.use(cors()); // Enable CORS for frontend communication

// Mount deployment routes
app.use('/api/deployments', deploymentRoutes);

// Mount proposal routes
app.use('/api/proposals', proposalRoutes);

// Mount registry routes
app.use('/api/registry', registryRoutes);

// Mount admin routes
app.use('/api/admin', adminRoutes);

// Mount IPFS proxy routes
app.use('/api/ipfs', ipfsRoutes);

// Mount chat routes
app.use('/api/chat', chatRoutes);

// Track processing jobs to avoid duplicates
const processingJobs = new Set();
const completedJobs = new Map(); // jobId -> timestamp
const jobStatuses = new Map(); // jobId -> { status, message, error }

// Event listener state
let eventListenerActive = false;
let eventListenerInterval = null;

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'running',
    uptime: process.uptime(),
    processingJobs: processingJobs.size,
    completedJobs: completedJobs.size,
    eventListenerActive,
    timestamp: new Date().toISOString()
  });
});

// Stats endpoint
app.get('/stats', (req, res) => {
  res.json({
    processingJobs: Array.from(processingJobs),
    recentCompletions: Array.from(completedJobs.entries()).slice(-10),
    eventListenerActive,
    config: {
      nowjcAddress: config.NOWJC_ADDRESS,
      cctpTransceiver: config.CCTP_TRANSCEIVER_ADDRESS,
      messageTransmitter: config.MESSAGE_TRANSMITTER_ADDRESS
    }
  });
});

// Start job endpoint - accepts tx hash from frontend
app.post('/api/start-job', async (req, res) => {
  const { jobId, txHash } = req.body;
  
  if (!jobId || !txHash) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing jobId or txHash' 
    });
  }
  
  const key = `start-${jobId}`;
  
  if (processingJobs.has(key)) {
    return res.json({ 
      success: true, 
      jobId, 
      status: 'already_processing',
      message: 'Job is already being processed'
    });
  }
  
  if (completedJobs.has(key)) {
    return res.json({ 
      success: true, 
      jobId, 
      status: 'already_completed',
      message: 'Job has already been completed'
    });
  }
  
  // Mark as processing
  processingJobs.add(key);
  jobStatuses.set(jobId, {
    status: 'received',
    message: 'Backend received request, starting CCTP process...',
    txHash
  });
  
  console.log(`\n📥 API: Received start-job request for Job ${jobId}`);
  console.log(`   OP Sepolia TX: ${txHash}`);
  
  // Process in background
  processStartJobDirect(jobId, txHash)
    .then(() => {
      jobStatuses.set(jobId, {
        status: 'completed',
        message: 'CCTP transfer completed successfully',
        txHash
      });
    })
    .catch((error) => {
      jobStatuses.set(jobId, {
        status: 'failed',
        message: 'CCTP transfer failed',
        error: error.message,
        txHash
      });
    })
    .finally(() => {
      processingJobs.delete(key);
      completedJobs.set(key, Date.now());
      
      // Clean up old completed jobs (keep last 100)
      if (completedJobs.size > 100) {
        const firstKey = completedJobs.keys().next().value;
        completedJobs.delete(firstKey);
      }
      
      // Clean up old statuses after 1 hour
      setTimeout(() => {
        jobStatuses.delete(jobId);
      }, 60 * 60 * 1000);
    });
  
  // Return immediately
  res.json({ 
    success: true, 
    jobId, 
    status: 'processing',
    message: 'Job processing started'
  });
});

// Get job status endpoint
app.get('/api/start-job-status/:jobId', (req, res) => {
  const { jobId } = req.params;
  const status = jobStatuses.get(jobId);
  
  if (!status) {
    return res.status(404).json({
      success: false,
      error: 'Job status not found'
    });
  }
  
  res.json({
    success: true,
    jobId,
    ...status
  });
});

// Release payment endpoint - accepts jobId from frontend
app.post('/api/release-payment', async (req, res) => {
  const { jobId, opSepoliaTxHash } = req.body;

  if (!jobId) {
    return res.status(400).json({
      success: false,
      error: 'Missing jobId'
    });
  }

  // Auto-start event listener if not active (for PaymentReleased monitoring)
  if (!eventListenerActive) {
    console.log('🎧 Auto-starting event listener for release payment flow...');
    startEventListener();
  }

  // Use tx hash in key to distinguish multiple milestone releases for same job
  const key = opSepoliaTxHash ? `payment-${jobId}-${opSepoliaTxHash}` : `payment-${jobId}`;
  // Status key also uses tx hash so each release is tracked independently
  const statusKey = opSepoliaTxHash ? `${jobId}-${opSepoliaTxHash}` : jobId;

  if (processingJobs.has(key)) {
    return res.json({
      success: true,
      jobId,
      statusKey,
      status: 'already_processing',
      message: 'Payment is already being processed'
    });
  }

  if (completedJobs.has(key)) {
    return res.json({
      success: true,
      jobId,
      statusKey,
      status: 'already_completed',
      message: 'Payment has already been completed'
    });
  }

  // Mark as processing
  processingJobs.add(key);
  jobStatuses.set(statusKey, {
    status: 'waiting_for_event',
    message: 'Waiting for PaymentReleased event on Arbitrum...',
    opSepoliaTxHash
  });

  console.log(`\n📥 API: Received release-payment request for Job ${jobId}`);
  if (opSepoliaTxHash) {
    console.log(`   OP TX: ${opSepoliaTxHash}`);
  }

  // Process in background — pass statusKey so internal updates use the right key
  processReleasePaymentFlow(jobId, jobStatuses, statusKey)
    .then(() => {
      jobStatuses.set(statusKey, {
        status: 'completed',
        message: 'Payment released successfully to applicant'
      });
    })
    .catch((error) => {
      jobStatuses.set(statusKey, {
        status: 'failed',
        message: 'Payment release failed',
        error: error.message
      });
    })
    .finally(() => {
      processingJobs.delete(key);
      completedJobs.set(key, Date.now());

      // Clean up old completed jobs (keep last 100)
      if (completedJobs.size > 100) {
        const firstKey = completedJobs.keys().next().value;
        completedJobs.delete(firstKey);
      }

      // Clean up old statuses after 1 hour
      setTimeout(() => {
        jobStatuses.delete(statusKey);
      }, 60 * 60 * 1000);
    });

  // Return immediately with statusKey so frontend can poll the correct status
  res.json({
    success: true,
    jobId,
    statusKey,
    status: 'processing',
    message: 'Payment release processing started'
  });
});

// Lock milestone CCTP relay endpoint - triggers OP→ARB receive after lockNextMilestone
app.post('/api/lock-milestone', async (req, res) => {
  const { jobId, txHash } = req.body;

  if (!jobId || !txHash) {
    return res.status(400).json({
      success: false,
      error: 'Missing jobId or txHash'
    });
  }

  // Use txHash in dedup key so each lock can be processed independently
  const key = `lock-${jobId}-${txHash}`;
  const statusKey = `lock-${jobId}-${txHash}`;

  if (processingJobs.has(key)) {
    return res.json({
      success: true,
      jobId,
      statusKey,
      status: 'already_processing',
      message: 'Lock milestone CCTP relay is already being processed'
    });
  }

  if (completedJobs.has(key)) {
    return res.json({
      success: true,
      jobId,
      statusKey,
      status: 'already_completed',
      message: 'Lock milestone CCTP relay has already been completed'
    });
  }

  // Mark as processing
  processingJobs.add(key);
  jobStatuses.set(statusKey, {
    status: 'received',
    message: 'Backend received lock milestone CCTP relay request...',
    txHash
  });

  console.log(`\n📥 API: Received lock-milestone CCTP relay request for Job ${jobId}`);
  console.log(`   Source TX: ${txHash}`);

  // Process in background — same CCTP relay as start-job (OP→ARB via Transceiver)
  processLockMilestoneCCTP(jobId, txHash, statusKey)
    .then((result) => {
      jobStatuses.set(statusKey, {
        status: 'completed',
        message: 'CCTP relay completed — USDC received by NOWJC on Arbitrum',
        txHash,
        completionTxHash: result.completionTxHash || 'already_completed'
      });
    })
    .catch((error) => {
      jobStatuses.set(statusKey, {
        status: 'failed',
        message: 'CCTP relay failed — USDC may not have reached NOWJC',
        error: error.message,
        txHash
      });
    })
    .finally(() => {
      processingJobs.delete(key);
      completedJobs.set(key, Date.now());

      if (completedJobs.size > 100) {
        const firstKey = completedJobs.keys().next().value;
        completedJobs.delete(firstKey);
      }

      setTimeout(() => {
        jobStatuses.delete(statusKey);
      }, 60 * 60 * 1000);
    });

  res.json({
    success: true,
    jobId,
    statusKey,
    status: 'processing',
    message: 'Lock milestone CCTP relay started'
  });
});

// Get lock milestone CCTP relay status
app.get('/api/lock-milestone-status/:statusKey', (req, res) => {
  const { statusKey } = req.params;
  const status = jobStatuses.get(statusKey);

  if (!status) {
    return res.status(404).json({
      success: false,
      error: 'Lock milestone status not found'
    });
  }

  res.json({
    success: true,
    statusKey,
    ...status
  });
});

// Get release payment status endpoint
// Supports both /api/release-payment-status/:statusKey and legacy /api/release-payment-status/:jobId
app.get('/api/release-payment-status/:statusKey', (req, res) => {
  const { statusKey } = req.params;
  const status = jobStatuses.get(statusKey);

  if (!status) {
    return res.status(404).json({
      success: false,
      error: 'Payment status not found'
    });
  }

  res.json({
    success: true,
    statusKey,
    ...status
  });
});

// Settle dispute endpoint - accepts tx hash from frontend
app.post('/api/settle-dispute', async (req, res) => {
  const { disputeId, txHash } = req.body;
  
  if (!disputeId || !txHash) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing disputeId or txHash' 
    });
  }
  
  const key = `dispute-${disputeId}`;
  
  if (processingJobs.has(key)) {
    return res.json({ 
      success: true, 
      disputeId, 
      status: 'already_processing',
      message: 'Dispute is already being processed'
    });
  }
  
  if (completedJobs.has(key)) {
    return res.json({ 
      success: true, 
      disputeId, 
      status: 'already_completed',
      message: 'Dispute has already been completed'
    });
  }
  
  // Mark as processing
  processingJobs.add(key);
  jobStatuses.set(disputeId, {
    status: 'received',
    message: 'Backend received request, starting CCTP process...',
    txHash
  });
  
  console.log(`\n📥 API: Received settle-dispute request for Dispute ${disputeId}`);
  console.log(`   Arbitrum TX: ${txHash}`);
  
  // Process in background
  processSettleDisputeFlow(disputeId, txHash)
    .then(() => {
      jobStatuses.set(disputeId, {
        status: 'completed',
        message: 'CCTP transfer completed - winner received funds',
        txHash
      });
    })
    .catch((error) => {
      jobStatuses.set(disputeId, {
        status: 'failed',
        message: 'CCTP transfer failed',
        error: error.message,
        txHash
      });
    })
    .finally(() => {
      processingJobs.delete(key);
      completedJobs.set(key, Date.now());
      
      // Clean up old completed jobs (keep last 100)
      if (completedJobs.size > 100) {
        const firstKey = completedJobs.keys().next().value;
        completedJobs.delete(firstKey);
      }
      
      // Clean up old statuses after 1 hour
      setTimeout(() => {
        jobStatuses.delete(disputeId);
      }, 60 * 60 * 1000);
    });
  
  // Return immediately
  res.json({ 
    success: true, 
    disputeId, 
    status: 'processing',
    message: 'Dispute settlement processing started'
  });
});

// Get settle dispute status endpoint
app.get('/api/settle-dispute-status/:disputeId', (req, res) => {
  const { disputeId } = req.params;
  const status = jobStatuses.get(disputeId);
  
  if (!status) {
    return res.status(404).json({
      success: false,
      error: 'Dispute status not found'
    });
  }
  
  res.json({
    success: true,
    disputeId,
    ...status
  });
});

// Start event listener endpoint (for release payment flow)
app.post('/api/start-listener', (req, res) => {
  if (eventListenerActive) {
    return res.json({
      success: true,
      message: 'Event listener is already active'
    });
  }
  
  console.log('🎧 Starting event listener via API...');
  startEventListener();
  
  res.json({
    success: true,
    message: 'Event listener started'
  });
});

// Stop event listener endpoint
app.post('/api/stop-listener', (req, res) => {
  if (!eventListenerActive) {
    return res.json({
      success: true,
      message: 'Event listener is not active'
    });
  }
  
  console.log('🛑 Stopping event listener via API...');
  if (eventListenerInterval) {
    clearInterval(eventListenerInterval);
    eventListenerInterval = null;
  }
  eventListenerActive = false;
  
  res.json({
    success: true,
    message: 'Event listener stopped'
  });
});

// CCTP Status endpoint - Check transfer status from database
app.get('/api/cctp-status/:operation/:jobId', async (req, res) => {
  const { operation, jobId } = req.params;

  const { getCCTPStatus } = require('./utils/cctp-storage');
  const status = await getCCTPStatus(jobId, operation);
  
  if (!status) {
    return res.json({ 
      found: false,
      jobId,
      operation
    });
  }
  
  res.json({
    found: true,
    jobId,
    operation,
    status: status.status,
    step: status.step,
    lastError: status.last_error,
    sourceChain: status.source_chain,
    sourceTxHash: status.source_tx_hash,
    completionTxHash: status.completion_tx_hash,
    retryCount: status.retry_count,
    createdAt: status.created_at,
    updatedAt: status.updated_at,
    completedAt: status.completed_at
  });
});

// CCTP Retry endpoint - Retry failed transfer
app.post('/api/cctp-retry/:operation/:jobId', async (req, res) => {
  const { operation, jobId } = req.params;
  
  const { getCCTPStatus, updateCCTPStatus } = require('./utils/cctp-storage');
  const status = await getCCTPStatus(jobId, operation);

  if (!status) {
    return res.status(404).json({
      success: false,
      error: 'CCTP transfer record not found'
    });
  }
  
  if (status.status === 'completed') {
    return res.json({
      success: true,
      message: 'Transfer already completed',
      status: 'completed'
    });
  }
  
  console.log(`\n🔄 CCTP Retry requested for ${operation}/${jobId}`);
  
  // Increment retry count
  await updateCCTPStatus(jobId, operation, {
    incrementRetry: true,
    status: 'pending',
    step: 'retry_initiated'
  });
  
  // Re-trigger the appropriate flow
  try {
    if (operation === 'startJob') {
      // Re-process from the saved tx hash
      processStartJobDirect(jobId, status.source_tx_hash)
        .catch(err => console.error(`Retry failed for ${jobId}:`, err.message));
    } else if (operation === 'releasePayment') {
      processReleasePaymentFlow(jobId, jobStatuses)
        .catch(err => console.error(`Retry failed for ${jobId}:`, err.message));
    } else if (operation === 'settleDispute') {
      processSettleDisputeFlow(status.dispute_id, status.source_tx_hash)
        .catch(err => console.error(`Retry failed for ${status.dispute_id}:`, err.message));
    }
    
    res.json({
      success: true,
      message: `Retry initiated for ${operation}`,
      jobId,
      retryCount: status.retry_count + 1
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Compile contract endpoint
app.post('/api/compile', async (req, res) => {
  const { contractName } = req.body;
  
  if (!contractName) {
    return res.status(400).json({
      success: false,
      error: 'Missing contractName'
    });
  }
  
  console.log(`\n📦 API: Received compile request for ${contractName}`);
  
  try {
    const result = await compileContract(contractName);
    
    console.log(`✅ Successfully compiled ${contractName}`);
    
    res.json({
      success: true,
      contractName,
      abi: result.abi,
      bytecode: result.bytecode
    });
    
  } catch (error) {
    console.error(`❌ Compilation failed for ${contractName}:`, error.message);
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Process Start Job directly from source chain tx hash
 * No need to wait for NOWJC event
 */
async function processStartJobDirect(jobId, sourceTxHash) {
  try {
    console.log('\n🚀 ========== START JOB DIRECT FLOW ==========');
    console.log(`Job ID: ${jobId}`);
    console.log(`Source TX: ${sourceTxHash}`);
    
    // Import utilities
    const { getDomainFromJobId, getChainNameFromJobId } = require('./utils/chain-utils');
    const { saveCCTPTransfer, updateCCTPStatus } = require('./utils/cctp-storage');
    
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
    
    // Save to database
    await saveCCTPTransfer('startJob', jobId, sourceTxHash, sourceChain, sourceDomain);
    
    // Update in-memory status
    jobStatuses.set(jobId, {
      status: 'polling_attestation',
      message: `Polling Circle API for CCTP attestation from ${sourceChain}...`,
      txHash: sourceTxHash
    });
    
    // Update DB
    await updateCCTPStatus(jobId, 'startJob', { step: 'polling_attestation' });
    
    // Import CCTP utilities
    const { pollCCTPAttestation } = require('./utils/cctp-poller');
    const { executeReceiveOnArbitrum } = require('./utils/tx-executor');
    
    // STEP 1: Poll Circle API for CCTP attestation
    console.log(`\n📍 STEP 1/2: Polling Circle API for CCTP attestation (Domain ${sourceDomain})...`);
    const attestation = await pollCCTPAttestation(
      sourceTxHash, 
      sourceDomain  // Dynamic domain based on job ID
    );
    console.log(`✅ Attestation received from ${sourceChain}`);
    
    // Update status - attestation received
    await updateCCTPStatus(jobId, 'startJob', {
      step: 'executing_receive',
      attestationMessage: attestation.message,
      attestationSignature: attestation.attestation
    });
    
    jobStatuses.set(jobId, {
      status: 'executing_receive',
      message: 'Executing receive() on Arbitrum CCTP Transceiver...',
      txHash: sourceTxHash
    });
    
    // STEP 2: Execute receive() on Arbitrum
    console.log('\n📍 STEP 2/2: Executing receive() on Arbitrum...');
    const result = await executeReceiveOnArbitrum(attestation);
    
    if (result.alreadyCompleted) {
      console.log('✅ USDC already transferred to NOWJC (completed by CCTP)');
    } else {
      console.log(`✅ USDC transferred to NOWJC: ${result.transactionHash}`);
    }
    
    // Mark as completed in DB
    await updateCCTPStatus(jobId, 'startJob', {
      status: 'completed',
      completionTxHash: result.transactionHash || 'already_completed'
    });
    
    console.log('\n🎉 ========== START JOB FLOW COMPLETED ==========\n');
    
    return {
      success: true,
      jobId,
      sourceTxHash,
      sourceChain,
      completionTxHash: result.transactionHash,
      alreadyCompleted: result.alreadyCompleted
    };
    
  } catch (error) {
    console.error('\n❌ ========== START JOB FLOW FAILED ==========');
    console.error(`Job ID: ${jobId}`);
    console.error(`Error: ${error.message}`);
    console.error('===============================================\n');
    
    // Mark as failed in DB
    const { updateCCTPStatus } = require('./utils/cctp-storage');
    await updateCCTPStatus(jobId, 'startJob', {
      status: 'failed',
      lastError: error.message
    });
    
    throw error;
  }
}

/**
 * Process Lock Milestone CCTP relay: OP → Arbitrum
 * Same CCTP flow as startJob (source chain → Arbitrum via Transceiver receive())
 * but with separate status tracking per lock tx
 */
async function processLockMilestoneCCTP(jobId, sourceTxHash, statusKey) {
  try {
    console.log('\n🔒 ========== LOCK MILESTONE CCTP RELAY ==========');
    console.log(`Job ID: ${jobId}`);
    console.log(`Source TX: ${sourceTxHash}`);
    console.log(`Status Key: ${statusKey}`);

    const { getDomainFromJobId, getChainNameFromJobId } = require('./utils/chain-utils');
    const { saveCCTPTransfer, updateCCTPStatus } = require('./utils/cctp-storage');
    const { pollCCTPAttestation } = require('./utils/cctp-poller');
    const { executeReceiveOnArbitrum } = require('./utils/tx-executor');

    // Detect source chain from job ID
    const sourceChain = getChainNameFromJobId(jobId);
    const sourceDomain = getDomainFromJobId(jobId);
    console.log(`Source Chain: ${sourceChain} (Domain ${sourceDomain})`);

    // Save to database
    await saveCCTPTransfer('lockMilestone', jobId, sourceTxHash, sourceChain, sourceDomain);

    // Update in-memory status
    jobStatuses.set(statusKey, {
      status: 'polling_attestation',
      message: `Polling Circle API for CCTP attestation from ${sourceChain}...`,
      txHash: sourceTxHash
    });

    await updateCCTPStatus(jobId, 'lockMilestone', { step: 'polling_attestation' });

    // STEP 1: Poll Circle API for CCTP attestation
    console.log(`\n📍 STEP 1/2: Polling Circle API for CCTP attestation (Domain ${sourceDomain})...`);
    const attestation = await pollCCTPAttestation(sourceTxHash, sourceDomain);
    console.log(`✅ Attestation received from ${sourceChain}`);

    // Update status
    await updateCCTPStatus(jobId, 'lockMilestone', {
      step: 'executing_receive',
      attestationMessage: attestation.message,
      attestationSignature: attestation.attestation
    });

    jobStatuses.set(statusKey, {
      status: 'executing_receive',
      message: 'Executing receive() on Arbitrum CCTP Transceiver...',
      txHash: sourceTxHash
    });

    // STEP 2: Execute receive() on Arbitrum
    console.log('\n📍 STEP 2/2: Executing receive() on Arbitrum...');
    const result = await executeReceiveOnArbitrum(attestation);

    if (result.alreadyCompleted) {
      console.log('✅ USDC already transferred to NOWJC (completed by CCTP)');
    } else {
      console.log(`✅ USDC transferred to NOWJC: ${result.transactionHash}`);
    }

    await updateCCTPStatus(jobId, 'lockMilestone', {
      status: 'completed',
      completionTxHash: result.transactionHash || 'already_completed'
    });

    console.log('\n🎉 ========== LOCK MILESTONE CCTP RELAY COMPLETED ==========\n');

    return {
      success: true,
      jobId,
      sourceTxHash,
      sourceChain,
      completionTxHash: result.transactionHash,
      alreadyCompleted: result.alreadyCompleted
    };

  } catch (error) {
    console.error('\n❌ ========== LOCK MILESTONE CCTP RELAY FAILED ==========');
    console.error(`Job ID: ${jobId}`);
    console.error(`Error: ${error.message}`);
    console.error('=======================================================\n');

    const { updateCCTPStatus } = require('./utils/cctp-storage');
    await updateCCTPStatus(jobId, 'lockMilestone', {
      status: 'failed',
      lastError: error.message
    });

    throw error;
  }
}

/**
 * Monitor NOWJC contract for events (used for release payment)
 */
async function startEventListener() {
  console.log('🎧 Starting OpenWork Event Listener...\n');
  console.log('📡 Configuration:');
  console.log(`   - NOWJC Contract: ${config.NOWJC_ADDRESS}`);
  console.log(`   - Arbitrum RPC: ${config.ARBITRUM_SEPOLIA_RPC}`);
  console.log(`   - Service Wallet: ${config.WALL2_PRIVATE_KEY ? '✓ Configured' : '✗ Missing'}\n`);

  const web3 = new Web3(config.ARBITRUM_SEPOLIA_RPC);
  const nowjcContract = new web3.eth.Contract(config.ABIS.NOWJC_EVENTS, config.NOWJC_ADDRESS);

  // Get current block to start listening from
  const currentBlock = await web3.eth.getBlockNumber();
  console.log(`📍 Starting event listener from block: ${currentBlock}\n`);
  console.log('👂 Listening for PaymentReleased events on NOWJC...\n');

  eventListenerActive = true;
  let lastProcessedBlock = currentBlock;

  eventListenerInterval = setInterval(async () => {
    if (!eventListenerActive) return;
    
    try {
      const latestBlock = await web3.eth.getBlockNumber();
      
      // Limit block range to 10 for free-tier RPC
      const maxBlockRange = 10;
      const toBlock = Math.min(
        Number(latestBlock),
        Number(lastProcessedBlock) + maxBlockRange
      );
      
      if (toBlock <= lastProcessedBlock) {
        return; // No new blocks
      }

      // Check for PaymentReleased events only (with 10-block limit)
      const paymentReleasedEvents = await nowjcContract.getPastEvents('PaymentReleased', {
        fromBlock: lastProcessedBlock + 1n,
        toBlock: BigInt(toBlock)
      });

      // Process PaymentReleased events
      for (const event of paymentReleasedEvents) {
        const jobId = event.returnValues.jobId;
        const key = `payment-${jobId}`;
        
        if (!processingJobs.has(key) && !completedJobs.has(key)) {
          console.log(`\n🔔 NEW EVENT: PaymentReleased detected!`);
          console.log(`   Job ID: ${jobId}`);
          console.log(`   Transaction: ${event.transactionHash}`);
          console.log(`   Block: ${event.blockNumber}`);
          console.log(`   Amount: ${event.returnValues.amount}`);
          
          processingJobs.add(key);
          
          // Process in background
          processReleasePaymentFlow(jobId, jobStatuses)
            .finally(() => {
              processingJobs.delete(key);
              completedJobs.set(key, Date.now());
              if (completedJobs.size > 100) {
                const firstKey = completedJobs.keys().next().value;
                completedJobs.delete(firstKey);
              }
            });
        }
      }

      lastProcessedBlock = latestBlock;
      
    } catch (error) {
      console.error('❌ Error in event polling:', error.message);
    }
  }, config.EVENT_POLL_INTERVAL);
}

/**
 * Process Release Payment flow with error handling
 */
async function processReleasePaymentFlow(jobId, statusMap, statusKey) {
  try {
    await processReleasePayment(jobId, statusMap, statusKey);
  } catch (error) {
    console.error(`Failed to process Release Payment for ${jobId}:`, error.message);
  }
}

/**
 * Process Settle Dispute directly from Arbitrum tx hash
 */
async function processSettleDisputeFlow(disputeId, arbitrumTxHash) {
  try {
    console.log('\n⚖️ ========== SETTLE DISPUTE DIRECT FLOW ==========');
    console.log(`Dispute ID: ${disputeId}`);
    console.log(`Arbitrum TX: ${arbitrumTxHash}`);
    
    // Update status
    jobStatuses.set(disputeId, {
      status: 'polling_attestation',
      message: 'Polling Circle API for CCTP attestation...',
      txHash: arbitrumTxHash
    });
    
    // Import utilities
    const { pollCCTPAttestation } = require('./utils/cctp-poller');
    const { executeReceiveMessageOnOpSepolia } = require('./utils/tx-executor');
    
    // STEP 1: Poll Circle API for CCTP attestation
    console.log('\n📍 STEP 1/2: Polling Circle API for CCTP attestation...');
    const attestation = await pollCCTPAttestation(
      arbitrumTxHash, 
      config.DOMAINS.ARBITRUM_SEPOLIA // Domain 3
    );
    console.log('✅ Attestation received');
    
    // Update status
    jobStatuses.set(disputeId, {
      status: 'executing_receive',
      message: 'Executing receiveMessage() on OP Sepolia MessageTransmitter...',
      txHash: arbitrumTxHash
    });
    
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
      arbitrumTxHash,
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

// Serve React frontend static files
const path = require("path");
app.use(express.static(path.join(__dirname, "../dist")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../dist/index.html"));
});

// Start the server with async database initialization
const PORT = config.PORT;
const { initDatabase } = require('./db/init');

async function startServer() {
  await initDatabase();

  app.listen(PORT, () => {
    console.log(`🌐 OpenWork Backend Server running on http://localhost:${PORT}`);
    console.log(`   - Health: http://localhost:${PORT}/health`);
    console.log(`   - Stats:  http://localhost:${PORT}/stats`);
    console.log(`   - API: http://localhost:${PORT}/api/*\n`);
    console.log('✅ Server ready to accept requests');
    console.log('ℹ️  Event listener is OFF by default (start via /api/start-listener when needed)\n');
  });
}

startServer().catch(err => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});

// Graceful shutdown
const pool = require('./db/pg');

process.on('SIGINT', async () => {
  console.log('\n\n👋 Shutting down gracefully...');
  if (eventListenerInterval) {
    clearInterval(eventListenerInterval);
  }
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n\n👋 Shutting down gracefully...');
  if (eventListenerInterval) {
    clearInterval(eventListenerInterval);
  }
  await pool.end();
  process.exit(0);
});
