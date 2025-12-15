require('dotenv').config();

module.exports = {
  // RPC URLs
  ETHEREUM_SEPOLIA_RPC: process.env.ETHEREUM_SEPOLIA_RPC_URL,
  OP_SEPOLIA_RPC: process.env.OP_SEPOLIA_RPC_URL,
  ARBITRUM_SEPOLIA_RPC: process.env.ARBITRUM_SEPOLIA_RPC_URL,

  // Contract Addresses
  LOWJC_ADDRESS: process.env.LOWJC_CONTRACT_ADDRESS,
  NOWJC_ADDRESS: process.env.NOWJC_CONTRACT_ADDRESS,
  CCTP_TRANSCEIVER_ADDRESS: process.env.CCTP_TRANSCEIVER_ADDRESS,
  MESSAGE_TRANSMITTER_ADDRESS: process.env.MESSAGE_TRANSMITTER_ADDRESS,

  // Service Wallet
  WALL2_PRIVATE_KEY: process.env.WALL2_PRIVATE_KEY,

  // Circle API
  CIRCLE_API_BASE_URL: process.env.CIRCLE_API_BASE_URL || 'https://iris-api-sandbox.circle.com/v2/messages',

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

  // CCTP Domains (for reference - use chain-utils.js for dynamic detection)
  DOMAINS: {
    ETHEREUM_SEPOLIA: 0,
    OP_SEPOLIA: 2,
    ARBITRUM_SEPOLIA: 3,
    BASE_SEPOLIA: 6
  },

  // Contract ABIs (minimal required functions)
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
