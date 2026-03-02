const fetch = require('node-fetch');
const config = require('../config');

/**
 * Poll Circle API for CCTP attestation
 * @param {string} txHash - Transaction hash from source chain
 * @param {number} sourceDomain - CCTP source domain (2 for OP Sepolia, 3 for Arbitrum)
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<{message: string, attestation: string}>}
 */
async function pollCCTPAttestation(txHash, sourceDomain, timeout = config.CCTP_ATTESTATION_TIMEOUT) {
  console.log(`🔍 Starting CCTP attestation polling for tx: ${txHash} (Domain ${sourceDomain})`);
  
  const apiUrl = `${config.CIRCLE_API_BASE_URL}/${sourceDomain}?transactionHash=${txHash}`;
  const startTime = Date.now();
  const endTime = startTime + timeout;
  let attempts = 0;

  // Note: only timeout controls the loop — MAX_RETRY_ATTEMPTS is ignored here
  // so slow attestations (>200s) don't fail prematurely
  while (Date.now() < endTime) {
    attempts++;
    
    try {
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        console.warn(`⚠️ Circle API responded with status ${response.status}, attempt ${attempts}`);
        await sleep(config.CCTP_POLL_INTERVAL);
        continue;
      }
      
      const data = await response.json();
      
      if (data.messages && data.messages.length > 0) {
        const message = data.messages[0];
        
        if (message.status === 'complete') {
          console.log('✅ CCTP attestation COMPLETE:', {
            status: message.status,
            messageLength: message.message?.length,
            attestationLength: message.attestation?.length,
            attempts,
            timeElapsed: `${((Date.now() - startTime) / 1000).toFixed(1)}s`
          });
          
          return {
            message: message.message,
            attestation: message.attestation,
            mintRecipient: message.decodedMessage?.mintRecipient,
            amount: message.decodedMessage?.amount
          };
        }
        
        console.log(`⏳ CCTP status: ${message.status} (attempt ${attempts}, elapsed ${Math.round((Date.now()-startTime)/1000)}s/${timeout/1000}s)`);
        if (message.status === 'pending_confirmations') {
             console.log('   Note: Waiting for block confirmations on source chain...');
        }
      } else {
        console.log(`📡 No CCTP messages indexed yet (attempt ${attempts}, elapsed ${Math.round((Date.now()-startTime)/1000)}s/${timeout/1000}s)...`);
      }
      
      // Wait before next poll
      await sleep(config.CCTP_POLL_INTERVAL);
      
    } catch (error) {
      console.error(`❌ CCTP polling error (attempt ${attempts}):`, error.message);
      await sleep(config.CCTP_POLL_INTERVAL * 1.5); // Wait longer on error
    }
  }
  
  throw new Error(`CCTP attestation timeout after ${attempts} attempts (${timeout / 1000}s) for tx: ${txHash}`);
}

/**
 * Sleep utility
 * @param {number} ms - Milliseconds to sleep
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  pollCCTPAttestation
};
