/**
 * OpenWork Multi-Chain Configuration
 * 
 * Defines all supported chains and their contract addresses.
 * Architecture:
 * - Native Chain (Arbitrum): Read-only, single source of truth for all data
 * - Local Chains (OP, ETH, etc.): Write operations (post jobs, apply, dispute, etc.)
 * - Main Chain (Base): Governance only (blocked for job operations)
 * 
 * To add a new chain:
 * 1. Deploy LOWJC + Athena Client + Local Bridge on the new chain
 * 2. Add chain config below with type: "local" and allowed: true
 * 3. Done! App automatically supports the new chain
 */

// Chain Types
export const CHAIN_TYPES = {
  NATIVE: "native",   // Arbitrum - Central hub, read-only
  LOCAL: "local",     // OP, ETH, etc. - User transactions
  MAIN: "main"        // Base - Governance only
};

// Testnet Configuration
export const CHAIN_CONFIG = {
  // OP Sepolia - Local Chain (Job Posting Enabled)
  11155420: {
    name: "OP Sepolia",
    type: CHAIN_TYPES.LOCAL,
    allowed: true,
    isTestnet: true,
    nativeCurrency: {
      name: "Sepolia Ether",
      symbol: "ETH",
      decimals: 18
    },
    rpcUrl: import.meta.env.VITE_OPTIMISM_SEPOLIA_RPC_URL,
    blockExplorer: "https://sepolia-optimism.etherscan.io",
    contracts: {
      lowjc: "0x896a3Bc6ED01f549Fe20bD1F25067951913b793C",
      athenaClient: "0x45E51B424c87Eb430E705CcE3EcD8e22baD267f7",
      localBridge: "0x6601cF4156160cf43fd024bac30851d3ee0F8668",
      usdc: "0x5fd84259d66Cd46123540766Be93DFE6D43130D7",
      cctp: "0xA7fa6002666376aDe9EBF5c657D62E50ACFE5354"
    },
    layerzero: {
      eid: 40232,
      options: "0x0003010011010000000000000000000000000007a120" // 500k gas
    }
  },

  // Ethereum Sepolia - Local Chain (Job Posting Enabled)
  11155111: {
    name: "Ethereum Sepolia",
    type: CHAIN_TYPES.LOCAL,
    allowed: true,
    isTestnet: true,
    nativeCurrency: {
      name: "Sepolia Ether",
      symbol: "ETH",
      decimals: 18
    },
    rpcUrl: import.meta.env.VITE_ETHEREUM_SEPOLIA_RPC_URL,
    blockExplorer: "https://sepolia.etherscan.io",
    contracts: {
      lowjc: "0x3b4cE6441aB77437e306F396c83779A2BC8E5134",
      athenaClient: "0xA08a6E73397EaE0A3Df9eb528d9118ae4AF80fcf",
      localBridge: "0xb9AD7758d2B5c80cAd30b471D07a8351653d24eb",
      usdc: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
      cctp: "0x0ad0306EAfCBf121Ed9990055b89e1249011455F"
    },
    layerzero: {
      eid: 40161,
      options: "0x0003010011010000000000000000000000000007a120"
    }
  },

  // Arbitrum Sepolia - Native Chain (Read-Only, Data Hub)
  421614: {
    name: "Arbitrum Sepolia",
    type: CHAIN_TYPES.NATIVE,
    allowed: false,
    isTestnet: true,
    reason: "Native chain - read only. Use OP Sepolia or Ethereum Sepolia for transactions.",
    nativeCurrency: {
      name: "Sepolia Ether",
      symbol: "ETH",
      decimals: 18
    },
    rpcUrl: import.meta.env.VITE_ARBITRUM_SEPOLIA_RPC_URL,
    blockExplorer: "https://sepolia.arbiscan.io",
    contracts: {
      genesis: "0x1f23683C748fA1AF99B7263dea121eCc5Fe7564C",
      profileGenesis: "0xC37A9dFbb57837F74725AAbEe068f07A1155c394",
      genesisHelper: "0x9B16b4211a05912E312541513Ea847d4756f1589",
      nowjc: "0x9E39B37275854449782F1a2a4524405cE79d6C1e",
      nativeAthena: "0x098E52Aff44AEAd944AFf86F4A5b90dbAF5B86bd",
      oracleManager: "0x70F6fa515120efeA3e404234C318b7745D23ADD4",
      nativeBridge: "0x3b2AC1d1281cA4a1188d9F09A5Af9a9E6a114D6c",
      usdc: "0x75faf114eafb1bdbe2f0316df893fd58ce46aa4d"
    },
    layerzero: {
      eid: 40231
    }
  },

  // Base Sepolia - Main Chain (Governance Only)
  84532: {
    name: "Base Sepolia",
    type: CHAIN_TYPES.MAIN,
    allowed: false,
    isTestnet: true,
    reason: "Main chain - governance only. Use OP Sepolia or Ethereum Sepolia for job operations.",
    nativeCurrency: {
      name: "Sepolia Ether",
      symbol: "ETH",
      decimals: 18
    },
    rpcUrl: import.meta.env.VITE_BASE_SEPOLIA_RPC_URL,
    blockExplorer: "https://sepolia.basescan.org",
    contracts: {
      openworkToken: "0x5f24747d5e59F9CCe5a9815BC12E2fB5Ae713679",
      mainDAO: "0xc3579BDC6eC1fAad8a67B1Dc5542EBcf28456465",
      mainRewards: "0xd6bE0C187408155be99C4e9d6f860eDDa27b056B",
      mainBridge: "0x70d30e5dAb5005b126C040f1D9b0bDDBc16679b0"
    },
    layerzero: {
      eid: 40245
    }
  }
};

// Future chains can be added here:
// Example for Polygon:
// 137: {
//   name: "Polygon",
//   type: CHAIN_TYPES.LOCAL,
//   allowed: true,
//   isTestnet: false,
//   contracts: { lowjc: "0x...", athenaClient: "0x..." }
// }

/**
 * Get configuration for a specific chain
 * @param {number} chainId - Chain ID
 * @returns {object|null} Chain configuration or null if not found
 */
export function getChainConfig(chainId) {
  return CHAIN_CONFIG[chainId] || null;
}

/**
 * Check if a chain is allowed for user transactions
 * @param {number} chainId - Chain ID
 * @returns {boolean} True if transactions are allowed
 */
export function isChainAllowed(chainId) {
  const config = CHAIN_CONFIG[chainId];
  return config?.allowed === true;
}

/**
 * Get all local chains (where users can post jobs)
 * @returns {Array} Array of chain configurations
 */
export function getLocalChains() {
  return Object.entries(CHAIN_CONFIG)
    .filter(([_, config]) => config.type === CHAIN_TYPES.LOCAL && config.allowed)
    .map(([chainId, config]) => ({
      chainId: parseInt(chainId),
      ...config
    }));
}

/**
 * Get native chain configuration (Arbitrum - data source)
 * @returns {object} Native chain config
 */
export function getNativeChain() {
  const entry = Object.entries(CHAIN_CONFIG).find(
    ([_, config]) => config.type === CHAIN_TYPES.NATIVE
  );
  if (!entry) return null;
  return {
    chainId: parseInt(entry[0]),
    ...entry[1]
  };
}

/**
 * Get user-friendly error message for blocked chains
 * @param {number} chainId - Chain ID
 * @returns {string} Error message
 */
export function getBlockedChainMessage(chainId) {
  const config = CHAIN_CONFIG[chainId];
  if (!config) {
    return "This network is not supported. Please switch to OP Sepolia or Ethereum Sepolia.";
  }
  return config.reason || "Transactions are not allowed on this network.";
}

/**
 * Format chain ID for wallet requests (hex format)
 * @param {number} chainId - Chain ID
 * @returns {string} Hex formatted chain ID
 */
export function toHexChainId(chainId) {
  return '0x' + chainId.toString(16);
}

/**
 * Extract chain ID from job ID (format: "chainId-jobNumber")
 * @param {string} jobId - Job ID (e.g., "40232-1", "40161-2")
 * @returns {number} Chain ID
 */
export function extractChainIdFromJobId(jobId) {
  if (!jobId || typeof jobId !== 'string') return null;
  const parts = jobId.split('-');
  return parts.length > 0 ? parseInt(parts[0]) : null;
}

/**
 * Get chain logo path for a chain ID
 * @param {number} chainId - Chain ID
 * @returns {string} Logo path
 */
export function getChainLogo(chainId) {
  const logos = {
    11155420: '/optimism-chain.png',  // OP Sepolia
    11155111: '/ethereum-chain.png',  // Ethereum Sepolia
    421614: '/arbitrum-chain.png',    // Arbitrum Sepolia
    84532: '/base-chain.png',         // Base Sepolia
    // Mainnet logos (same as testnet)
    10: '/optimism-chain.png',        // OP Mainnet
    1: '/ethereum-chain.png',         // Ethereum Mainnet
    42161: '/arbitrum-chain.png',     // Arbitrum One
    8453: '/base-chain.png',          // Base Mainnet
    137: '/polygon-chain.png'         // Polygon
  };
  return logos[chainId] || '/question-mark.svg';
}

export default CHAIN_CONFIG;
