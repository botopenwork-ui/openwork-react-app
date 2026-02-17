/**
 * Chain Utilities for Backend Multi-Chain Support
 * 
 * Provides utilities to detect chain information from job IDs
 * and map to appropriate CCTP domains for attestation polling.
 */

// LayerZero EID → Chain ID mapping
// Job IDs use EIDs (e.g., "40161-3") not chain IDs
const EID_TO_CHAIN_ID = {
  40232: 11155420,  // OP Sepolia
  40161: 11155111,  // Ethereum Sepolia
  40231: 421614,    // Arbitrum Sepolia
  40245: 84532,     // Base Sepolia
  // Mainnets (for future)
  30111: 10,        // OP Mainnet
  30101: 1,         // Ethereum Mainnet
  30110: 42161,     // Arbitrum One
  30184: 8453,      // Base Mainnet
  30109: 137        // Polygon
};

// Chain ID → CCTP Domain mapping
// Used for Circle API attestation polling
const CHAIN_TO_DOMAIN = {
  // Testnets
  11155111: 0,      // Ethereum Sepolia
  11155420: 2,      // OP Sepolia
  421614: 3,        // Arbitrum Sepolia
  84532: 6,         // Base Sepolia
  // Mainnets
  1: 0,             // Ethereum Mainnet
  10: 2,            // OP Mainnet
  42161: 3,         // Arbitrum One
  8453: 6,          // Base Mainnet
  137: 7            // Polygon
};

// Chain ID → Chain Name mapping
const CHAIN_NAMES = {
  11155111: 'Ethereum Sepolia',
  11155420: 'OP Sepolia',
  421614: 'Arbitrum Sepolia',
  84532: 'Base Sepolia',
  1: 'Ethereum',
  10: 'Optimism',
  42161: 'Arbitrum One',
  8453: 'Base',
  137: 'Polygon'
};

/**
 * Extract Chain ID from job ID
 * @param {string} jobId - Format: "eid-jobNumber" (e.g., "40161-3")
 * @returns {number} Chain ID
 * @throws {Error} If job ID format is invalid or EID is unknown
 */
function getChainIdFromJobId(jobId) {
  if (!jobId || typeof jobId !== 'string') {
    throw new Error('Invalid job ID: must be a string');
  }

  const parts = jobId.split('-');
  if (parts.length < 2) {
    throw new Error(`Invalid job ID format: ${jobId}. Expected format: "eid-jobNumber"`);
  }

  const eid = parseInt(parts[0]);
  if (isNaN(eid)) {
    throw new Error(`Invalid EID in job ID: ${jobId}`);
  }

  const chainId = EID_TO_CHAIN_ID[eid];
  if (!chainId) {
    throw new Error(`Unknown EID ${eid} in job ID: ${jobId}`);
  }

  return chainId;
}

/**
 * Extract CCTP domain from job ID
 * @param {string} jobId - Format: "eid-jobNumber" (e.g., "40161-3")
 * @returns {number} CCTP domain (0, 2, 3, 6, or 7)
 * @throws {Error} If job ID is invalid or chain doesn't support CCTP
 */
function getDomainFromJobId(jobId) {
  const chainId = getChainIdFromJobId(jobId);
  const domain = CHAIN_TO_DOMAIN[chainId];
  
  if (domain === undefined) {
    const chainName = CHAIN_NAMES[chainId] || `Chain ${chainId}`;
    throw new Error(`CCTP domain not configured for ${chainName} (Chain ID: ${chainId})`);
  }
  
  return domain;
}

/**
 * Get chain name from job ID
 * @param {string} jobId - Format: "eid-jobNumber"
 * @returns {string} Human-readable chain name
 */
function getChainNameFromJobId(jobId) {
  try {
    const chainId = getChainIdFromJobId(jobId);
    return CHAIN_NAMES[chainId] || `Unknown Chain (${chainId})`;
  } catch (error) {
    return 'Unknown Chain';
  }
}

/**
 * Get chain configuration from job ID
 * @param {string} jobId - Format: "eid-jobNumber"
 * @returns {object} Chain configuration object
 */
function getChainConfigFromJobId(jobId) {
  const chainId = getChainIdFromJobId(jobId);
  const domain = CHAIN_TO_DOMAIN[chainId];
  const name = CHAIN_NAMES[chainId];

  return {
    chainId,
    domain,
    name,
    jobId
  };
}

module.exports = {
  getDomainFromJobId,
  getChainIdFromJobId,
  getChainNameFromJobId,
  getChainConfigFromJobId,
  EID_TO_CHAIN_ID,
  CHAIN_TO_DOMAIN,
  CHAIN_NAMES
};
