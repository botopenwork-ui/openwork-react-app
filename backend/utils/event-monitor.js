const { Web3 } = require('web3');
const config = require('../config');

// Track event tx hashes already returned, so multi-milestone jobs
// don't accidentally re-use a previous milestone's event
const processedEventTxHashes = new Set();

/**
 * Monitor NOWJC contract for specific events
 * @param {string} eventName - Event name ('JobStarted' or 'PaymentReleased')
 * @param {string} jobId - Job ID to filter by
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<string>} Transaction hash of the event
 */
async function waitForNOWJCEvent(eventName, jobId, timeout = config.EVENT_DETECTION_TIMEOUT) {
  console.log(`🔍 Monitoring NOWJC contract for ${eventName} event (jobId: ${jobId})...`);
  console.log(`   Network Mode: ${config.NETWORK_MODE}`);

  const web3 = new Web3(config.ARBITRUM_RPC);
  const nowjcContract = new web3.eth.Contract(config.ABIS.NOWJC_EVENTS, config.NOWJC_ADDRESS);
  
  // Look back 7500 blocks (~30 min on Arbitrum @4 blocks/sec) — handles Cloud Run cold starts
  const latestBlockInitial = await web3.eth.getBlockNumber();
  const startBlock = BigInt(latestBlockInitial) - 7500n; 
  const startTime = Date.now();
  const endTime = startTime + timeout;
  
  console.log('📊 Event monitoring started:', {
    eventName,
    jobId,
    startBlock: startBlock.toString(),
    latestBlock: latestBlockInitial.toString(),
    contractAddress: config.NOWJC_ADDRESS,
    timeout: `${timeout / 1000} seconds`
  });
  
  // Test contract connection (check code at address)
  try {
    const code = await web3.eth.getCode(config.NOWJC_ADDRESS);
    if (code === '0x') throw new Error('No contract code at address');
    console.log('✅ NOWJC contract connection verified (code exists)')
  } catch (error) {
    console.error('❌ Failed to connect to NOWJC contract:', error.message);
  }
  
  let currentBlock = startBlock;
  
  while (Date.now() < endTime) {
    try {
      const latestBlock = await web3.eth.getBlockNumber();
      
      // Limit block range to 5 for free-tier RPC (safer than 10)
      const maxBlockRange = 5;
      const toBlock = Math.min(
        Number(latestBlock),
        Number(currentBlock) + maxBlockRange
      );
      
      // First check for ANY events of this type (for debugging)
      // Only do this debug check if we are close to latest block to avoid spamming logs during catch-up
      if (Number(latestBlock) - Number(currentBlock) < 20) {
        const allEvents = await nowjcContract.getPastEvents(eventName, {
            fromBlock: currentBlock,
            toBlock: BigInt(toBlock)
        });
        
        if (allEvents.length > 0) {
            console.log(`🔍 Found ${allEvents.length} ${eventName} events in blocks ${currentBlock}-${toBlock}`);
            allEvents.forEach(e => {
            console.log(`  - JobId: ${e.returnValues.jobId} (Target: ${jobId}), Block: ${e.blockNumber}, TX: ${e.transactionHash}`);
            });
        }
      }
      
      // Get events for our specific jobId (with 10-block limit)
      const events = await nowjcContract.getPastEvents(eventName, {
        filter: { jobId: jobId },
        fromBlock: currentBlock,
        toBlock: BigInt(toBlock)
      });
      
      if (events.length > 0) {
        // Filter out events we've already processed (from previous milestone releases)
        const newEvents = events.filter(e => !processedEventTxHashes.has(e.transactionHash));

        if (newEvents.length > 0) {
          const event = newEvents[0];
          processedEventTxHashes.add(event.transactionHash);
          console.log(`✅ Found MATCHING ${eventName} event for Job ${jobId}:`, {
            transactionHash: event.transactionHash,
            blockNumber: event.blockNumber.toString(),
            jobId: event.returnValues.jobId,
            timeElapsed: `${((Date.now() - startTime) / 1000).toFixed(1)}s`
          });

          return event.transactionHash;
        } else {
          console.log(`⏩ Found ${events.length} ${eventName} event(s) for Job ${jobId} but all already processed, continuing...`);
        }
      }
      
      // Move forward to next chunk
      // If we processed up to toBlock, start next from toBlock + 1
      currentBlock = BigInt(toBlock) + 1n;
      
      // If we are caught up to latest block, wait before next check
      if (Number(toBlock) >= Number(latestBlock)) {
        await sleep(config.EVENT_POLL_INTERVAL);
      }
      
    } catch (error) {
      console.warn(`Event polling error for ${eventName}:`, error.message);
      await sleep(config.EVENT_POLL_INTERVAL * 2); // Wait longer on error
    }
  }
  
  throw new Error(`NOWJC ${eventName} event not found for job ${jobId} within ${timeout / 1000} seconds`);
}

/**
 * Sleep utility
 * @param {number} ms - Milliseconds to sleep
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  waitForNOWJCEvent
};
