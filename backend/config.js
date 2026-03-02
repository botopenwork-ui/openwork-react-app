const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

/**
 * OpenWork Backend Configuration
 * Supports both testnet and mainnet via NETWORK_MODE env variable
 */

// Get network mode from environment (default: testnet)
const NETWORK_MODE = process.env.NETWORK_MODE === 'mainnet' ? 'mainnet' : 'testnet';
const isMainnet = () => NETWORK_MODE === 'mainnet';

// ============================================================
// RPC URLs
// ============================================================
const RPC_URLS = {
  testnet: {
    ETHEREUM: process.env.ETHEREUM_SEPOLIA_RPC_URL,
    OPTIMISM: process.env.OPTIMISM_SEPOLIA_RPC_URL,
    ARBITRUM: process.env.ARBITRUM_SEPOLIA_RPC_URL,
    BASE: process.env.BASE_SEPOLIA_RPC_URL
  },
  mainnet: {
    ETHEREUM: process.env.ETHEREUM_MAINNET_RPC_URL,
    OPTIMISM: process.env.OPTIMISM_MAINNET_RPC_URL,
    ARBITRUM: process.env.ARBITRUM_MAINNET_RPC_URL
  }
};

// ============================================================
// Contract Addresses
// ============================================================
const CONTRACT_ADDRESSES = {
  testnet: {
    // Arbitrum Sepolia (Native Chain)
    GENESIS: '0x00Fad82208A77232510cE16CBB63c475A914C95a',
    NOWJC: '0x39158a9F92faB84561205B05223929eFF131455e',
    NATIVE_ATHENA: '0x2d9C882C450B5e992C1F5bE5f0594654ae4B4f1f',
    NATIVE_REWARDS: '0xaf2661D3430311b5372fda7ef60d099C1CdaFaf0',
    NATIVE_BRIDGE: '0x4E8A3Cb25BbE74C44fD9b731e214e6A5c5CAF502',
    CCTP_ARB: '0x959d0fc6dD8efCf764BD3B0bbaC191F2D7Dd03f1',
    // OP Sepolia (Local Chain)
    LOWJC_OP: '0x36aAEAbF2C04F1BecD520CF34Ef62783a9A446Db',
    LOCAL_ATHENA_OP: '0xed81395eb69ac568f92188948C1CC1adfD595361',
    LOCAL_BRIDGE_OP: '0xc0a7B2a893Be5Fd4E4Fee8485744bF7AA321F28b',
    CCTP_OP: '0x3c820FE16F7B85BA193527E5ca64dd3193F6ABB3',
    // ETH Sepolia (Local Chain)
    LOWJC_ETH: '0x3b4cE6441aB77437e306F396c83779A2BC8E5134',
    LOCAL_ATHENA_ETH: '0xA08a6E73397EaE0A3Df9eb528d9118ae4AF80fcf',
    LOCAL_BRIDGE_ETH: '0xb9AD7758d2B5c80cAd30b471D07a8351653d24eb',
    // USDC
    USDC_ARB: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
    USDC_OP: '0x5fd84259d66Cd46123540766Be93DFE6D43130D7',
    USDC_ETH: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    // Message Transmitters (CCTP)
    MESSAGE_TRANSMITTER_ARB: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
    MESSAGE_TRANSMITTER_OP: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275'
  },
  mainnet: {
    // Arbitrum One (Native Chain)
    GENESIS: '0xE8f7963fF3cE9f7dB129e3f619abd71cBB5Bb294',
    NOWJC: '0x8EfbF240240613803B9c9e716d4b5AD1388aFd99',
    NATIVE_ATHENA: '0xE6B9d996b56162cD7eDec3a83aE72943ee7C46Bf',
    NATIVE_REWARDS: '0x5E80B57E1C465498F3E0B4360397c79A64A67Ce9', // V2 (Jan 23) - Graceful referrer fix
    NATIVE_BRIDGE: '0x1bC57d93eC9F9214EDe2e81281A26Ac0E01A9A5F', // V2 (Jan 24) - User refund address fix
    CCTP_ARB: '0x765D70496Ef775F6ba1cB7465c2e0B296eB50d87',
    // Optimism (Local Chain)
    LOWJC_OP: '0x620205A4Ff0E652fF03a890d2A677de878a1dB63', // V4 Proxy with impl V3 (Jan 23)
    LOCAL_ATHENA_OP: '0x4756294bE516f73e8D1984E7a94E4ABaffA94c4d',
    LOCAL_BRIDGE_OP: '0x74566644782e98c87a12E8Fc6f7c4c72e2908a36',
    CCTP_OP: '0x586C700ACFA1D129Ba2C6a6E673c55d586c32f15', // V2 (Jan 23) - CCTP V2
    // Ethereum Mainnet (Main Chain - governance only)
    MAIN_DAO: '0xE8f7963fF3cE9f7dB129e3f619abd71cBB5Bb294',
    MAIN_REWARDS: '0x4756294bE516f73e8D1984E7a94E4ABaffA94c4d',
    MAIN_BRIDGE: '0x20Fa268106A3C532cF9F733005Ab48624105c42F',
    OPENWORK_TOKEN: '0x765D70496Ef775F6ba1cB7465c2e0B296eB50d87',
    // USDC
    USDC_ARB: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    USDC_OP: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
    // Message Transmitters (CCTP V2) - Same address across all EVM chains
    MESSAGE_TRANSMITTER_ARB: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
    MESSAGE_TRANSMITTER_OP: '0x4D41f22c5a0e5c74090899E5a8Fb597a8842b3e8'  // OP Mainnet MessageTransmitter V2 (fixed 2026-03-02)
  }
};

// ============================================================
// CCTP Domains
// ============================================================
const CCTP_DOMAINS = {
  testnet: {
    ETHEREUM: 0,
    OPTIMISM: 2,
    ARBITRUM: 3,
    BASE: 6
  },
  mainnet: {
    ETHEREUM: 0,
    OPTIMISM: 2,
    ARBITRUM: 3
  }
};

// ============================================================
// Circle API URLs
// ============================================================
const CIRCLE_API_URLS = {
  testnet: 'https://iris-api-sandbox.circle.com/v2/messages',
  mainnet: 'https://iris-api.circle.com/v2/messages'
};

// ============================================================
// Helper Functions
// ============================================================
function getRpcUrl(chain) {
  return RPC_URLS[NETWORK_MODE][chain];
}

function getContractAddress(name) {
  return CONTRACT_ADDRESSES[NETWORK_MODE][name];
}

function getCctpDomain(chain) {
  return CCTP_DOMAINS[NETWORK_MODE][chain];
}

// ============================================================
// Export Configuration
// ============================================================
module.exports = {
  // Network Mode
  NETWORK_MODE,
  isMainnet,

  // RPC URLs (dynamic based on mode)
  ETHEREUM_RPC: getRpcUrl('ETHEREUM'),
  OPTIMISM_RPC: getRpcUrl('OPTIMISM'),
  ARBITRUM_RPC: getRpcUrl('ARBITRUM'),
  BASE_RPC: getRpcUrl('BASE'),

  // Legacy aliases for backward compatibility
  ETHEREUM_SEPOLIA_RPC: RPC_URLS.testnet.ETHEREUM,
  OP_SEPOLIA_RPC: RPC_URLS.testnet.OPTIMISM,
  ARBITRUM_SEPOLIA_RPC: RPC_URLS.testnet.ARBITRUM,
  BASE_SEPOLIA_RPC: RPC_URLS.testnet.BASE,

  // Contract Addresses (dynamic)
  GENESIS_ADDRESS: getContractAddress('GENESIS'),
  NOWJC_ADDRESS: getContractAddress('NOWJC'),
  NATIVE_ATHENA_ADDRESS: getContractAddress('NATIVE_ATHENA'),
  LOWJC_OP_ADDRESS: getContractAddress('LOWJC_OP'),
  CCTP_ARB_ADDRESS: getContractAddress('CCTP_ARB'),
  CCTP_OP_ADDRESS: getContractAddress('CCTP_OP'),
  MESSAGE_TRANSMITTER_ARB: getContractAddress('MESSAGE_TRANSMITTER_ARB'),
  MESSAGE_TRANSMITTER_OP: getContractAddress('MESSAGE_TRANSMITTER_OP'),

  // Service Wallet
  WALL2_PRIVATE_KEY: process.env.WALL2_PRIVATE_KEY,

  // Circle API
  CIRCLE_API_BASE_URL: CIRCLE_API_URLS[NETWORK_MODE],

  // Server Configuration
  PORT: process.env.PORT || 3001,
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',

  // Polling Configuration
  EVENT_POLL_INTERVAL: parseInt(process.env.EVENT_POLL_INTERVAL) || 3000,
  CCTP_POLL_INTERVAL: parseInt(process.env.CCTP_POLL_INTERVAL) || 10000,
  MAX_RETRY_ATTEMPTS: parseInt(process.env.MAX_RETRY_ATTEMPTS) || 20,

  // Timeouts
  EVENT_DETECTION_TIMEOUT: parseInt(process.env.EVENT_DETECTION_TIMEOUT) || 300000,
  CCTP_ATTESTATION_TIMEOUT: parseInt(process.env.CCTP_ATTESTATION_TIMEOUT) || 300000,

  // CCTP Domains
  DOMAINS: CCTP_DOMAINS[NETWORK_MODE],

  // Helper functions
  getRpcUrl,
  getContractAddress,
  getCctpDomain,

  // Contract ABIs (unchanged)
  ABIS: {
    CCTP_TRANSCEIVER: [
      {
        inputs: [
          { name: 'message', type: 'bytes' },
          { name: 'attestation', type: 'bytes' }
        ],
        name: 'receive',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function'
      }
    ],
    MESSAGE_TRANSMITTER: [
      {
        inputs: [
          { internalType: 'bytes', name: 'message', type: 'bytes' },
          { internalType: 'bytes', name: 'attestation', type: 'bytes' }
        ],
        name: 'receiveMessage',
        outputs: [{ internalType: 'bool', name: 'success', type: 'bool' }],
        stateMutability: 'nonpayable',
        type: 'function'
      }
    ],
    NOWJC_EVENTS: [
      {
        anonymous: false,
        inputs: [
          { indexed: true, internalType: 'string', name: 'jobId', type: 'string' },
          { indexed: true, internalType: 'uint256', name: 'applicationId', type: 'uint256' },
          { indexed: true, internalType: 'address', name: 'selectedApplicant', type: 'address' },
          { indexed: false, internalType: 'bool', name: 'useApplicantMilestones', type: 'bool' }
        ],
        name: 'JobStarted',
        type: 'event'
      },
      {
        anonymous: false,
        inputs: [
          { indexed: true, internalType: 'string', name: 'jobId', type: 'string' },
          { indexed: true, internalType: 'address', name: 'jobGiver', type: 'address' },
          { indexed: true, internalType: 'address', name: 'applicant', type: 'address' },
          { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' },
          { indexed: false, internalType: 'uint256', name: 'milestone', type: 'uint256' }
        ],
        name: 'PaymentReleased',
        type: 'event'
      }
    ]
  }
};
