const { Web3 } = require('web3');
const config = require('../config');

/**
 * Monitor NOWJC contract for specific events
 * @param {string} eventName - Event name ('JobStarted' or 'PaymentReleased')
 * @param {string} jobId - Job ID to filter by
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<string>} Transaction hash of the event
 */
async function waitForNOWJCEvent(eventName, jobId, timeout = config.EVENT_DETECTION_TIMEOUT) {
  console.log(`🔍 Monitoring NOWJC contract for ${eventName} event (jobId: ${jobId})...`);
  
  const web3 = new Web3(config.ARBITRUM_SEPOLIA_RPC);
  const nowjcContract = new web3.eth.Contract(config.ABIS.NOWJC_EVENTS, config.NOWJC_ADDRESS);
  
  const startBlock = await web3.eth.getBlockNumber();
  const startTime = Date.now();
  const endTime = startTime + timeout;
  
  console.log('📊 Event monitoring started:', {
    eventName,
    jobId,
    startBlock: startBlock.toString(),
    contractAddress: config.NOWJC_ADDRESS,
    timeout: `${timeout / 1000} seconds`
  });
  
  let currentBlock = startBlock;
  
  while (Date.now() < endTime) {
    try {
      const latestBlock = await web3.eth.getBlockNumber();
      
      // Limit block range to 10 for free-tier RPC
      const maxBlockRange = 10;
      const toBlock = Math.min(
        Number(latestBlock),
        Number(currentBlock) + maxBlockRange
      );
      
      // Get events for our specific jobId (with 10-block limit)
      const events = await nowjcContract.getPastEvents(eventName, {
        filter: { jobId: jobId },
        fromBlock: currentBlock,
        toBlock: BigInt(toBlock)
      });
      
      if (events.length > 0) {
        const event = events[0]; // Get the first matching event
        console.log(`✅ Found ${eventName} event:`, {
          transactionHash: event.transactionHash,
          blockNumber: event.blockNumber.toString(),
          jobId: event.returnValues.jobId,
          timeElapsed: `${((Date.now() - startTime) / 1000).toFixed(1)}s`
        });
        
        return event.transactionHash;
      }
      
      // Move forward to next 10-block chunk
      currentBlock = BigInt(toBlock);
      
      // Wait before next check
      await sleep(config.EVENT_POLL_INTERVAL);
      
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
