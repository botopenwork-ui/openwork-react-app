/**
 * OpenWork Multi-Chain Configuration
 *
 * Defines all supported chains and their contract addresses.
 * Architecture:
 * - Native Chain (Arbitrum): Read-only, single source of truth for all data
 * - Local Chains (OP, etc.): Write operations (post jobs, apply, dispute, etc.)
 * - Main Chain: Governance only (blocked for job operations)
 *
 * NETWORK MODE:
 * - Set VITE_NETWORK_MODE=testnet for development (default)
 * - Set VITE_NETWORK_MODE=mainnet for production
 */

// Chain Types
export const CHAIN_TYPES = {
  NATIVE: "native",   // Arbitrum - Central hub, read-only
  LOCAL: "local",     // OP, etc. - User transactions
  MAIN: "main"        // Governance only
};

/**
 * Get current network mode from environment
 * @returns {'testnet' | 'mainnet'} Network mode
 */
export function getNetworkMode() {
  return import.meta.env.VITE_NETWORK_MODE === 'mainnet' ? 'mainnet' : 'testnet';
}

/**
 * Check if currently in mainnet mode
 * @returns {boolean} True if mainnet
 */
export function isMainnet() {
  return getNetworkMode() === 'mainnet';
}

// ============================================================
// LAYERZERO GAS ESTIMATION
// ============================================================
/**
 * Estimated gas usage for NOWJC operations on Arbitrum (destination chain)
 * Based on actual mainnet transaction analysis + 25% safety buffer
 */
export const DESTINATION_GAS_ESTIMATES = {
  // Conservative estimates to avoid destination failures
  // Tune down based on actual Arbiscan usage if fees are too high
  APPLY_JOB: 800000,
  POST_JOB: 800000,
  RELEASE_PAYMENT: 800000,
  LOCK_MILESTONE: 500000,
  START_JOB: 800000,
  DEFAULT: 800000
};

/**
 * Build LayerZero V2 execution options with specific gas limit
 * Format: 0x0003 + 01 + 0011 + 01 + [16 bytes gas in big-endian]
 * @param {number} gasLimit - Destination chain gas limit
 * @returns {string} Hex-encoded options bytes
 */
export function buildLzOptions(gasLimit) {
  // LayerZero V2 Options format:
  // 0x0003 - Options type 3 (execution options)
  // 01 - Worker ID (executor)
  // 0011 - Option data length (17 bytes)
  // 01 - Option type (lzReceive gas)
  // [16 bytes] - Gas limit in big-endian

  const gasHex = gasLimit.toString(16).padStart(32, '0'); // 16 bytes = 32 hex chars
  return `0x000301001101${gasHex}`;
}

// ============================================================
// TESTNET CONFIGURATION
// ============================================================
export const TESTNET_CHAIN_CONFIG = {
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
      lowjc: "0x36aAEAbF2C04F1BecD520CF34Ef62783a9A446Db",
      athenaClient: "0xed81395eb69ac568f92188948C1CC1adfD595361",
      localBridge: "0xc0a7B2a893Be5Fd4E4Fee8485744bF7AA321F28b",
      usdc: "0x5fd84259d66Cd46123540766Be93DFE6D43130D7",
      cctp: "0x3c820FE16F7B85BA193527E5ca64dd3193F6ABB3"
    },
    layerzero: {
      eid: 40232,
      options: "0x0003010011010000000000000000000000000007a120" // 500k gas
    },
    cctpDomain: 2 // OP Sepolia uses domain 2 (same as OP mainnet)
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
    },
    cctpDomain: 0 // Ethereum Sepolia uses domain 0 (same as ETH mainnet)
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
      genesis: "0x00Fad82208A77232510cE16CBB63c475A914C95a",
      profileGenesis: "0x45468344678D2Af5353fb4b5E825A21b186Fa57a",
      profileManager: "0xbf26f05A4e14f1Cb410424AA5242993eF121c2F7",
      nowjc: "0x39158a9F92faB84561205B05223929eFF131455e",
      nativeAthena: "0x2d9C882C450B5e992C1F5bE5f0594654ae4B4f1f",
      nativeDAO: "0x3e0C062DbbC61ec6D7ac8Ab14d9B05F31484C113",
      nativeRewards: "0xaf2661D3430311b5372fda7ef60d099C1CdaFaf0",
      oracleManager: "0x24BB11ffA6b68a007297A0132e6D9f71638bA2ce",
      activityTracker: "0x7b2cBA5368d5F02Cb86CEbB11a4A4e071545A755",
      nativeBridge: "0x4E8A3Cb25BbE74C44fD9b731e214e6A5c5CAF502",
      cctp: "0x959d0fc6dD8efCf764BD3B0bbaC191F2D7Dd03f1",
      usdc: "0x75faf114eafb1bdbe2f0316df893fd58ce46aa4d"
    },
    layerzero: {
      eid: 40231
    },
    cctpDomain: 3 // Arbitrum Sepolia uses domain 3 (same as Arb mainnet)
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
    },
    cctpDomain: 6 // Base Sepolia uses domain 6 (same as Base mainnet)
  }
};

// ============================================================
// MAINNET CONFIGURATION
// ============================================================
export const MAINNET_CHAIN_CONFIG = {
  // Optimism - Local Chain (Job Posting Enabled) - ONLY local chain on mainnet
  10: {
    name: "Optimism",
    type: CHAIN_TYPES.LOCAL,
    allowed: true,
    isTestnet: false,
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18
    },
    rpcUrl: import.meta.env.VITE_OPTIMISM_MAINNET_RPC_URL || 'https://opt-mainnet.g.alchemy.com/v2/ECvjGU_6M0Jrw6wlFkPo2ZbonbfW5oIZ',
    blockExplorer: "https://optimistic.etherscan.io",
    contracts: {
      lowjc: "0x620205A4Ff0E652fF03a890d2A677de878a1dB63", // V4 Proxy with impl V3 (Jan 23)
      athenaClient: "0x4756294bE516f73e8D1984E7a94E4ABaffA94c4d",
      localBridge: "0x74566644782e98c87a12E8Fc6f7c4c72e2908a36",
      cctp: "0x586C700ACFA1D129Ba2C6a6E673c55d586c32f15", // V2 (Jan 23) - CCTP V2
      usdc: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85"
    },
    layerzero: {
      eid: 30111,
      options: "0x0003010011010000000000000000000000000007a120" // 500k gas
    },
    cctpDomain: 2 // Optimism mainnet CCTP domain
  },

  // Arbitrum One - Native Chain (Read-Only, Data Hub)
  42161: {
    name: "Arbitrum One",
    type: CHAIN_TYPES.NATIVE,
    allowed: false,
    isTestnet: false,
    reason: "Native chain - read only. Use Optimism for transactions.",
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18
    },
    rpcUrl: import.meta.env.VITE_ARBITRUM_MAINNET_RPC_URL || 'https://arb-mainnet.g.alchemy.com/v2/ECvjGU_6M0Jrw6wlFkPo2ZbonbfW5oIZ',
    blockExplorer: "https://arbiscan.io",
    contracts: {
      genesis: "0xE8f7963fF3cE9f7dB129e3f619abd71cBB5Bb294",
      genesisReaderHelper: "0x72ee091C288512f0ee9eB42B8C152fbB127Dc782",
      profileGenesis: "0x794809471215cBa5cE56c7d9F402eDd85F9eBa2E",
      profileManager: "0x51285003A01319c2f46BB2954384BCb69AfB1b45",
      nowjc: "0x8EfbF240240613803B9c9e716d4b5AD1388aFd99",
      nativeAthena: "0xE6B9d996b56162cD7eDec3a83aE72943ee7C46Bf",
      nativeDAO: "0x24af98d763724362DC920507b351cC99170a5aa4",
      nativeRewards: "0x5E80B57E1C465498F3E0B4360397c79A64A67Ce9", // V2 (Jan 23) - Graceful referrer fix
      oracleManager: "0xEdF3Bcf87716bE05e35E12bA7C0Fc6e1879c0f15",
      activityTracker: "0x8C04840c3f5b5a8c44F9187F9205ca73509690EA",
      contractRegistry: "0x29D61B1a9E2837ABC0810925429Df641CBed58c3",
      nativeBridge: "0x1bC57d93eC9F9214EDe2e81281A26Ac0E01A9A5F", // V2 (Jan 24) - User refund address fix
      cctp: "0x765D70496Ef775F6ba1cB7465c2e0B296eB50d87",
      usdc: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831"
    },
    layerzero: {
      eid: 30110
    },
    cctpDomain: 3 // Arbitrum One CCTP domain
  },

  // Ethereum Mainnet - Main Chain (Governance + Token)
  1: {
    name: "Ethereum",
    type: CHAIN_TYPES.MAIN,
    allowed: false,
    isTestnet: false,
    reason: "Main chain - governance only. Use Optimism for job operations.",
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18
    },
    rpcUrl: import.meta.env.VITE_ETHEREUM_MAINNET_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/ECvjGU_6M0Jrw6wlFkPo2ZbonbfW5oIZ',
    blockExplorer: "https://etherscan.io",
    contracts: {
      openworkToken: "0x765D70496Ef775F6ba1cB7465c2e0B296eB50d87",
      mainDAO: "0xE8f7963fF3cE9f7dB129e3f619abd71cBB5Bb294",
      mainRewards: "0x4756294bE516f73e8D1984E7a94E4ABaffA94c4d",
      mainBridge: "0x20Fa268106A3C532cF9F733005Ab48624105c42F"
    },
    layerzero: {
      eid: 30101
    },
    cctpDomain: 0 // Ethereum mainnet CCTP domain
  }
};

/**
 * Get the active chain configuration based on network mode
 * @returns {object} Chain configuration object
 */
export function getActiveChainConfig() {
  return isMainnet() ? MAINNET_CHAIN_CONFIG : TESTNET_CHAIN_CONFIG;
}

// Legacy export for backward compatibility - dynamically returns correct config
export const CHAIN_CONFIG = new Proxy({}, {
  get(target, prop) {
    const config = getActiveChainConfig();
    if (prop === Symbol.iterator) {
      return function* () {
        for (const key of Object.keys(config)) {
          yield [key, config[key]];
        }
      };
    }
    return config[prop];
  },
  has(target, prop) {
    return prop in getActiveChainConfig();
  },
  ownKeys() {
    return Object.keys(getActiveChainConfig());
  },
  getOwnPropertyDescriptor(target, prop) {
    const config = getActiveChainConfig();
    if (prop in config) {
      return { enumerable: true, configurable: true, value: config[prop] };
    }
    return undefined;
  }
});

/**
 * Get configuration for a specific chain
 * @param {number} chainId - Chain ID
 * @returns {object|null} Chain configuration or null if not found
 */
export function getChainConfig(chainId) {
  const config = getActiveChainConfig();
  return config[chainId] || null;
}

/**
 * Check if a chain is allowed for user transactions
 * @param {number} chainId - Chain ID
 * @returns {boolean} True if transactions are allowed
 */
export function isChainAllowed(chainId) {
  const config = getChainConfig(chainId);
  return config?.allowed === true;
}

/**
 * Get all local chains (where users can post jobs)
 * @returns {Array} Array of chain configurations
 */
export function getLocalChains() {
  const config = getActiveChainConfig();
  return Object.entries(config)
    .filter(([_, cfg]) => cfg.type === CHAIN_TYPES.LOCAL && cfg.allowed)
    .map(([chainId, cfg]) => ({
      chainId: parseInt(chainId),
      ...cfg
    }));
}

/**
 * Get native chain configuration (Arbitrum - data source)
 * @returns {object} Native chain config
 */
export function getNativeChain() {
  const config = getActiveChainConfig();
  const entry = Object.entries(config).find(
    ([_, cfg]) => cfg.type === CHAIN_TYPES.NATIVE
  );
  if (!entry) return null;
  return {
    chainId: parseInt(entry[0]),
    ...entry[1]
  };
}

/**
 * Get main chain configuration (governance)
 * @returns {object} Main chain config
 */
export function getMainChain() {
  const config = getActiveChainConfig();
  const entry = Object.entries(config).find(
    ([_, cfg]) => cfg.type === CHAIN_TYPES.MAIN
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
  const config = getChainConfig(chainId);
  if (!config) {
    const localChains = getLocalChains();
    const chainNames = localChains.map(c => c.name).join(' or ');
    return `This network is not supported. Please switch to ${chainNames || 'a supported network'}.`;
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
 * Map LayerZero EID to Chain ID
 * Job IDs use EIDs (40232, 40161) not chain IDs (11155420, 11155111)
 */
const EID_TO_CHAIN_ID = {
  // Testnets
  40232: 11155420,  // OP Sepolia
  40161: 11155111,  // Ethereum Sepolia
  40231: 421614,    // Arbitrum Sepolia
  40245: 84532,     // Base Sepolia
  // Mainnets
  30111: 10,        // Optimism
  30101: 1,         // Ethereum Mainnet
  30110: 42161,     // Arbitrum One
  30184: 8453,      // Base Mainnet
  30109: 137        // Polygon
};

// CCTP Domain to Chain ID mapping (used in job IDs on mainnet)
const CCTP_DOMAIN_TO_CHAIN_ID = {
  0: 1,         // Ethereum Mainnet
  2: 10,        // Optimism
  3: 42161,     // Arbitrum One
  6: 8453,      // Base
  // Testnets use different domains
  5: 11155420,  // OP Sepolia (testnet domain)
  7: 84532      // Base Sepolia (testnet domain)
};

/**
 * Extract chain ID from job ID
 * Job ID formats:
 * - "eid-jobNumber" (e.g., "40232-1") - uses LayerZero EID
 * - "domain-jobNumber" (e.g., "2-5") - uses CCTP domain (mainnet)
 * - "jobNumber" (e.g., "1") - native chain job
 * @param {string} jobId - Job ID
 * @returns {number} Chain ID
 */
export function extractChainIdFromJobId(jobId) {
  if (!jobId) return null;

  // Convert to string if needed (bigint or number)
  const jobIdStr = jobId.toString();

  // Check if job ID has prefix format (prefix-jobNumber)
  if (jobIdStr.includes('-')) {
    const parts = jobIdStr.split('-');
    const prefix = parseInt(parts[0]);

    // First check LayerZero EID (larger numbers like 30111, 40232)
    if (EID_TO_CHAIN_ID[prefix]) {
      return EID_TO_CHAIN_ID[prefix];
    }

    // Then check CCTP domain (smaller numbers like 0, 2, 3, 6)
    if (CCTP_DOMAIN_TO_CHAIN_ID[prefix] !== undefined) {
      return CCTP_DOMAIN_TO_CHAIN_ID[prefix];
    }
  }

  // No prefix or unknown prefix - job was posted on native chain
  // Return native chain ID based on network mode
  return isMainnet() ? 42161 : 421614;  // Arbitrum One or Arbitrum Sepolia
}

/**
 * Get chain logo path for a chain ID
 * @param {number} chainId - Chain ID
 * @returns {string} Logo path
 */
export function getChainLogo(chainId) {
  const logos = {
    // Testnets
    11155420: '/optimism-chain.png',  // OP Sepolia
    11155111: '/ethereum-chain.png',  // Ethereum Sepolia
    421614: '/arbitrum-chain.png',    // Arbitrum Sepolia
    84532: '/base-chain.png',         // Base Sepolia
    // Mainnets
    10: '/optimism-chain.png',        // Optimism
    1: '/ethereum-chain.png',         // Ethereum Mainnet
    42161: '/arbitrum-chain.png',     // Arbitrum One
    8453: '/base-chain.png',          // Base Mainnet
    137: '/polygon-chain.png'         // Polygon
  };
  return logos[chainId] || '/OWIcon.svg';  // Fallback to OpenWork icon
}

/**
 * Get all supported chain IDs for current network mode
 * @returns {number[]} Array of chain IDs
 */
export function getSupportedChainIds() {
  return Object.keys(getActiveChainConfig()).map(id => parseInt(id));
}

export default CHAIN_CONFIG;
// build: 20260221025451
