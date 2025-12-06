const express = require('express');
const cors = require('cors');
const { Web3 } = require('web3');
const config = require('./config');
const { processStartJob } = require('./flows/start-job');
const { processReleasePayment } = require('./flows/release-payment');
const { compileContract } = require('./utils/compiler');
const deploymentRoutes = require('./routes/deployments');
const proposalRoutes = require('./routes/proposals');
const registryRoutes = require('./routes/registry');
const adminRoutes = require('./routes/admin');

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
  
  const key = `payment-${jobId}`;
  
  if (processingJobs.has(key)) {
    return res.json({ 
      success: true, 
      jobId, 
      status: 'already_processing',
      message: 'Payment is already being processed'
    });
  }
  
  if (completedJobs.has(key)) {
    return res.json({ 
      success: true, 
      jobId, 
      status: 'already_completed',
      message: 'Payment has already been completed'
    });
  }
  
  // Mark as processing
  processingJobs.add(key);
  jobStatuses.set(jobId, {
    status: 'waiting_for_event',
    message: 'Waiting for PaymentReleased event on Arbitrum...',
    opSepoliaTxHash
  });
  
  console.log(`\n📥 API: Received release-payment request for Job ${jobId}`);
  if (opSepoliaTxHash) {
    console.log(`   OP Sepolia TX: ${opSepoliaTxHash}`);
  }
  
  // Process in background
  processReleasePaymentFlow(jobId)
    .then(() => {
      jobStatuses.set(jobId, {
        status: 'completed',
        message: 'Payment released successfully to applicant'
      });
    })
    .catch((error) => {
      jobStatuses.set(jobId, {
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
        jobStatuses.delete(jobId);
      }, 60 * 60 * 1000);
    });
  
  // Return immediately
  res.json({ 
    success: true, 
    jobId, 
    status: 'processing',
    message: 'Payment release processing started'
  });
});

// Get release payment status endpoint
app.get('/api/release-payment-status/:jobId', (req, res) => {
  const { jobId } = req.params;
  const status = jobStatuses.get(jobId);
  
  if (!status) {
    return res.status(404).json({
      success: false,
      error: 'Payment status not found'
    });
  }
  
  res.json({
    success: true,
    jobId,
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
 * Process Start Job directly from OP Sepolia tx hash
 * No need to wait for NOWJC event
 */
async function processStartJobDirect(jobId, opSepoliaTxHash) {
  try {
    console.log('\n🚀 ========== START JOB DIRECT FLOW ==========');
    console.log(`Job ID: ${jobId}`);
    console.log(`OP Sepolia TX: ${opSepoliaTxHash}`);
    
    // Update status
    jobStatuses.set(jobId, {
      status: 'polling_attestation',
      message: 'Polling Circle API for CCTP attestation...',
      txHash: opSepoliaTxHash
    });
    
    // Import utilities
    const { pollCCTPAttestation } = require('./utils/cctp-poller');
    const { executeReceiveOnArbitrum } = require('./utils/tx-executor');
    
    // STEP 1: Poll Circle API for CCTP attestation
    console.log('\n📍 STEP 1/2: Polling Circle API for CCTP attestation...');
    const attestation = await pollCCTPAttestation(
      opSepoliaTxHash, 
      config.DOMAINS.OP_SEPOLIA // Domain 2
    );
    console.log('✅ Attestation received');
    
    // Update status
    jobStatuses.set(jobId, {
      status: 'executing_receive',
      message: 'Executing receive() on Arbitrum CCTP Transceiver...',
      txHash: opSepoliaTxHash
    });
    
    // STEP 2: Execute receive() on Arbitrum
    console.log('\n📍 STEP 2/2: Executing receive() on Arbitrum...');
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
      opSepoliaTxHash,
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
      
      if (latestBlock <= lastProcessedBlock) {
        return; // No new blocks
      }

      // Check for PaymentReleased events only
      const paymentReleasedEvents = await nowjcContract.getPastEvents('PaymentReleased', {
        fromBlock: lastProcessedBlock + 1n,
        toBlock: latestBlock
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
          processReleasePaymentFlow(jobId)
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
async function processReleasePaymentFlow(jobId) {
  try {
    await processReleasePayment(jobId);
  } catch (error) {
    console.error(`Failed to process Release Payment for ${jobId}:`, error.message);
  }
}

// Start the server
const PORT = config.PORT;
app.listen(PORT, () => {
  console.log(`🌐 OpenWork Backend Server running on http://localhost:${PORT}`);
  console.log(`   - Health: http://localhost:${PORT}/health`);
  console.log(`   - Stats:  http://localhost:${PORT}/stats`);
  console.log(`   - API: http://localhost:${PORT}/api/*\n`);
  console.log('✅ Server ready to accept requests');
  console.log('ℹ️  Event listener is OFF by default (start via API when needed)\n');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down gracefully...');
  if (eventListenerInterval) {
    clearInterval(eventListenerInterval);
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n👋 Shutting down gracefully...');
  if (eventListenerInterval) {
    clearInterval(eventListenerInterval);
  }
  process.exit(0);
});
