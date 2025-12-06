export const cctpTransceiverOP = {
  id: 'cctpTransceiverOP',
  name: 'CCTP Transceiver',
  chain: 'op',
  column: 'op-main',
  order: 3,
  status: 'testnet',
  version: 'v2.0.0',
  gas: '89K',
  mainnetNetwork: 'OP Mainnet',
  testnetNetwork: 'OP Sepolia',
  mainnetDeployed: 'Not deployed',
  testnetDeployed: 'Deployed',
  mainnetAddress: null,
  testnetAddress: '0x72d6EfeDdA70f9B4eD3FfF4BDd0844655AEa2bD5',
  tvl: 'N/A',
  docs: 'Circle CCTP V2 Transceiver on OP Sepolia - Enables native USDC cross-chain transfers using Circle\'s Cross-Chain Transfer Protocol. Handles USDC bridging for job payments from Local chains, refunds to Local chains, and dispute fee transfers. Supports fast finality transfers (≤1000 blocks) for instant USDC availability.',
  
  overview: {
    purpose: 'CCTP Transceiver on OP Sepolia (Local Chain) enables users to send USDC to Arbitrum for job payments and receive USDC refunds back. When users post jobs on OP with USDC, LOWJC calls this transceiver to burn USDC and send it to Arbitrum Domain 3, where NOWJC receives and holds it as escrow. For refunds or completed jobs, Arbitrum sends USDC back through this transceiver. Unlike bridge-wrapped tokens, CCTP transfers native USDC, eliminating liquidity risks and ensuring instant finality through Circle\'s attestation network.',
    tier: 'Local Chain (OP Sepolia)',
    category: 'Payment Infrastructure - USDC Bridge',
    upgradeability: 'Immutable (No proxy pattern)',
    protocol: 'Circle CCTP V2'
  },
  
  features: [
    'Native USDC transfers: Burns on source, mints native USDC on destination',
    'Fast finality: minFinalityThreshold ≤ 1000 for instant transfers',
    'Circle attestation: Secure cross-chain verification via Circle\'s attestation API',
    'Domain-based routing: Domain 2 for OP Sepolia',
    'Receives from Local chains: OP (Domain 2), Ethereum (Domain 0)',
    'Sends to Local chains: For refunds and dispute resolutions',
    'No liquidity pools: Direct burn/mint eliminates liquidity risks',
    'Job payment flow: Local CCTP → Arbitrum CCTP → NOWJC',
    'Refund flow: NOWJC → Arbitrum CCTP → Local CCTP',
    'Immutable design: No upgrades, deployed once per chain',
    'TokenMessenger integration: Circle\'s burn/mint interface',
    'MessageTransmitter integration: Circle\'s attestation verification'
  ],
  
  systemPosition: {
    description: 'CCTP Transceiver (Arbitrum) sits at the Native Chain tier as the central hub for all USDC transfers in OpenWork. When users post jobs on Local chains with USDC, Local CCTP Transceivers burn USDC and send CCTP messages. This Arbitrum transceiver receives attestations, verifies through Circle, and mints native USDC for NOWJC to hold as job escrow. When jobs complete or disputes resolve, this transceiver sends USDC back to Local chains by burning on Arbitrum and allowing Local transceivers to mint. This eliminates bridge liquidity issues since every burn creates a mint permission.',
    diagram: `
📍 CCTP Transceiver (Arbitrum) in Payment Flow

┌─────────────────────────────────────────────────────────┐
│  LOCAL CHAINS (Job Posting)                             │
│  OP Sepolia / Ethereum Sepolia / Polygon / Base         │
├─────────────────────────────────────────────────────────┤
│  1. User posts job with USDC payment                    │
│  2. LOWJC receives USDC                                 │
│  3. CCTP Transceiver (Local) burns USDC                 │
│     └─> sendFast() to Domain 2 (Arbitrum)              │
│  4. Circle attestation generated                        │
└───────────────────────┬─────────────────────────────────┘
                        │ CCTP Attestation
                        ↓
┌─────────────────────────────────────────────────────────┐
│  NATIVE CHAIN (Payment Hub) ⭐                          │
│  OP Sepolia (Domain 2) - YOU ARE HERE             │
├─────────────────────────────────────────────────────────┤
│  5. ⭐ CCTP Transceiver receives attestation           │
│     └─> receive() verifies & mints USDC                │
│  6. NOWJC receives minted USDC                          │
│  7. Job stored with USDC in escrow                      │
│                                                          │
│  [Job Completion / Refund Flow]                         │
│  8. NOWJC approves payment/refund                       │
│  9. ⭐ CCTP Transceiver burns USDC                     │
│     └─> sendFast() to Local chain domain               │
│  10. Circle attestation generated                       │
└───────────────────────┬─────────────────────────────────┘
                        │ CCTP Attestation
                        ↓
┌─────────────────────────────────────────────────────────┐
│  LOCAL CHAINS (Payment/Refund Receipt)                  │
│  OP / Ethereum / Polygon / Base                         │
├─────────────────────────────────────────────────────────┤
│  11. CCTP Transceiver (Local) receives attestation     │
│  12. Mints native USDC to recipient                     │
│  13. User receives payment/refund                       │
└─────────────────────────────────────────────────────────┘

Circle CCTP Domains:
- Domain 0: Ethereum Mainnet / Sepolia
- Domain 2: OP Mainnet / Sepolia  
- Domain 2: OP Mainnet / Sepolia ⭐
- Domain 6: Base Mainnet / Sepolia
- Domain 7: Polygon PoS / Mumbai

Key Benefits:
✓ Native USDC (not wrapped)
✓ No liquidity pools needed
✓ Instant finality (fast threshold)
✓ Circle's attestation security
✓ Direct burn/mint mechanism`
  },
  
  dependencies: {
    dependsOn: [
      { 
        name: 'Circle TokenMessenger', 
        reason: 'Core CCTP interface for burning USDC and initiating cross-chain transfers via depositForBurn().',
        type: 'Infrastructure'
      },
      { 
        name: 'Circle MessageTransmitter', 
        reason: 'Receives and validates CCTP messages with attestations via receiveMessage().',
        type: 'Infrastructure'
      },
      { 
        name: 'USDC Token Contract', 
        reason: 'Native USDC token for approvals, transfers, burns, and mints.',
        type: 'Token'
      },
      { 
        name: 'Circle Attestation API', 
        reason: 'Off-chain service providing attestations for CCTP message verification.',
        type: 'External Service'
      }
    ],
    requiredBy: [
      { 
        name: 'NOWJC (Arbitrum)', 
        reason: 'Receives minted USDC from job postings. Sends USDC to transceiver for refunds/payments.',
        type: 'Job Management'
      },
      { 
        name: 'Native Athena (Arbitrum)', 
        reason: 'Uses CCTP for dispute fee transfers and resolutions requiring USDC movement.',
        type: 'Dispute Resolution'
      },
      { 
        name: 'Local CCTP Transceivers', 
        reason: 'Source chains burn USDC, Arbitrum receives. Arbitrum burns for refunds, Local chains receive.',
        type: 'Payment Infrastructure'
      }
    ],
    prerequisites: [
      'Circle TokenMessenger deployed on OP Sepolia',
      'Circle MessageTransmitter deployed on OP Sepolia',
      'Native USDC contract deployed on OP Sepolia',
      'Circle attestation API access configured',
      'Domain 2 configured for OP Sepolia',
      'Supported destination domains configured (0, 2, 6, 7)',
      'NOWJC approved to use this transceiver',
      'Native Athena approved to use this transceiver'
    ]
  },
  
  functions: [
    {
      category: 'Sending USDC',
      description: 'Burn USDC on Arbitrum and initiate transfer to Local chains',
      items: [
        {
          name: 'sendFast',
          signature: 'sendFast(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient, uint256 maxFee)',
          whatItDoes: 'Burns USDC on Arbitrum and initiates fast transfer to destination chain via Circle CCTP.',
          whyUse: 'NOWJC calls this to send refunds or payments back to Local chains. Fast finality ensures instant availability.',
          howItWorks: [
            '1. Transfers USDC from caller (NOWJC) to transceiver',
            '2. Approves TokenMessenger to burn USDC',
            '3. Calls TokenMessenger.depositForBurn() with:',
            '   - amount: USDC to burn',
            '   - destinationDomain: Target chain (0=ETH, 2=OP, etc.)',
            '   - mintRecipient: Address to receive USDC on destination',
            '   - minFinalityThreshold: 1000 (fast transfer)',
            '4. Circle generates attestation off-chain',
            '5. Destination chain can mint after attestation',
            '6. Emits FastTransferSent event'
          ],
          parameters: [
            { name: 'amount', type: 'uint256', description: 'Amount of USDC to burn and transfer (6 decimals)' },
            { name: 'destinationDomain', type: 'uint32', description: 'CCTP domain ID (0=ETH, 2=OP, 3=Arbitrum, 6=Base, 7=Polygon)' },
            { name: 'mintRecipient', type: 'bytes32', description: 'Destination address as bytes32 (use addressToBytes32())' },
            { name: 'maxFee', type: 'uint256', description: 'Maximum fee willing to pay (usually 0 for fast transfers)' }
          ],
          accessControl: 'Public - but requires USDC approval',
          events: ['FastTransferSent(amount, destinationDomain, mintRecipient, maxFee)'],
          gasEstimate: '~89K gas',
          example: `// NOWJC sends refund to OP user
const refundAmount = ethers.parseUnits("100", 6); // 100 USDC
const opDomain = 2; // OP Sepolia
const recipientBytes32 = await cctpTransceiver.addressToBytes32(userAddress);

// Approve CCTP Transceiver
await usdc.approve(cctpTransceiverAddress, refundAmount);

// Send fast transfer
await cctpTransceiver.sendFast(
  refundAmount,
  opDomain,
  recipientBytes32,
  0 // maxFee
);

// Off-chain: Poll Circle API for attestation
// On-chain (OP): Call receive() with message + attestation`,
          relatedFunctions: ['addressToBytes32', 'receive']
        },
        {
          name: 'addressToBytes32',
          signature: 'addressToBytes32(address addr) pure returns (bytes32)',
          whatItDoes: 'Converts Ethereum address to bytes32 format required by CCTP.',
          whyUse: 'Helper function to format mintRecipient parameter for sendFast().',
          howItWorks: [
            'Casts address to uint160',
            'Casts uint160 to uint256',
            'Casts uint256 to bytes32',
            'Returns bytes32 representation'
          ],
          parameters: [
            { name: 'addr', type: 'address', description: 'Ethereum address to convert' }
          ],
          accessControl: 'Public pure',
          events: ['None (pure function)'],
          gasEstimate: 'Minimal (pure)',
          example: `const userAddress = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1";
const recipientBytes32 = await cctpTransceiver.addressToBytes32(userAddress);
// Result: 0x000000000000000000000000742d35cc6634c0532925a3b844bc9e7595f0beb1`,
          relatedFunctions: ['sendFast']
        }
      ]
    },
    {
      category: 'Receiving USDC',
      description: 'Verify attestation and mint USDC from Local chains',
      items: [
        {
          name: 'receive',
          signature: 'receive(bytes message, bytes attestation)',
          whatItDoes: 'Receives CCTP message with Circle attestation and mints native USDC on Arbitrum.',
          whyUse: 'Called when Local chains send USDC to Arbitrum. Verifies attestation and triggers USDC mint.',
          howItWorks: [
            '1. Accepts CCTP message from source chain',
            '2. Accepts Circle attestation for verification',
            '3. Calls MessageTransmitter.receiveMessage()',
            '4. MessageTransmitter verifies attestation with Circle',
            '5. If valid, USDC is minted to mintRecipient from message',
            '6. Emits FastTransferReceived event',
            '7. NOWJC can now use minted USDC for job escrow'
          ],
          parameters: [
            { name: 'message', type: 'bytes', description: 'CCTP message from source chain containing transfer details' },
            { name: 'attestation', type: 'bytes', description: 'Circle attestation proving message validity' }
          ],
          accessControl: 'Public - anyone can submit valid attestations',
          events: ['FastTransferReceived(message, attestation)'],
          gasEstimate: '~150K gas',
          example: `// Backend service flow:
// 1. Monitor source chain (e.g., OP) for FastTransferSent events
// 2. Extract message hash from event
// 3. Poll Circle Attestation API:
const attestationResponse = await fetch(
  \`https://iris-api-sandbox.circle.com/attestations/\${messageHash}\`
);
const { attestation, message } = await attestationResponse.json();

// 4. Submit to Arbitrum CCTP Transceiver
await cctpTransceiver.receive(message, attestation);

// 5. USDC now minted on Arbitrum
// 6. NOWJC receives USDC for job escrow`,
          relatedFunctions: ['sendFast']
        }
      ]
    }
  ],
  
  dataFlows: [
    {
      title: 'Job Payment Flow (Local → Arbitrum)',
      description: 'User posts job with USDC on Local chain, USDC transferred to Arbitrum for escrow',
      steps: [
        { chain: 'OP Sepolia', action: '1. User posts job on LOWJC with 100 USDC' },
        { chain: 'OP Sepolia', action: '2. LOWJC approves Local CCTP Transceiver' },
        { chain: 'OP Sepolia', action: '3. Local CCTP Transceiver.sendFast(100 USDC, Domain 2, NOWJC)' },
        { chain: 'OP Sepolia', action: '4. Circle TokenMessenger burns 100 USDC on OP' },
        { chain: 'Circle API', action: '5. Circle generates attestation for message' },
        { chain: 'Backend', action: '6. Backend polls Circle API, retrieves attestation' },
        { chain: 'Arbitrum', action: '7. Backend calls Arbitrum CCTP Transceiver.receive()' },
        { chain: 'Arbitrum', action: '8. Circle MessageTransmitter verifies attestation' },
        { chain: 'Arbitrum', action: '9. 100 USDC minted to NOWJC on Arbitrum' },
        { chain: 'Arbitrum', action: '10. NOWJC holds USDC in escrow for job' }
      ]
    },
    {
      title: 'Refund Flow (Arbitrum → Local)',
      description: 'Job canceled, NOWJC refunds USDC to user on Local chain',
      steps: [
        { chain: 'Arbitrum', action: '1. Job canceled, NOWJC initiates refund' },
        { chain: 'Arbitrum', action: '2. NOWJC approves Arbitrum CCTP Transceiver' },
        { chain: 'Arbitrum', action: '3. Arbitrum CCTP Transceiver.sendFast(100 USDC, Domain 2, userAddress)' },
        { chain: 'Arbitrum', action: '4. Circle TokenMessenger burns 100 USDC on Arbitrum' },
        { chain: 'Circle API', action: '5. Circle generates attestation' },
        { chain: 'Backend', action: '6. Backend polls Circle API for attestation' },
        { chain: 'OP Sepolia', action: '7. Backend calls OP CCTP Transceiver.receive()' },
        { chain: 'OP Sepolia', action: '8. Circle MessageTransmitter verifies attestation' },
        { chain: 'OP Sepolia', action: '9. 100 USDC minted to user on OP' },
        { chain: 'OP Sepolia', action: '10. User receives full refund in native USDC' }
      ]
    },
    {
      title: 'Dispute Fee Flow',
      description: 'Native Athena handles dispute fees via CCTP',
      steps: [
        { chain: 'OP Sepolia', action: '1. User raises dispute, pays fee in USDC' },
        { chain: 'OP Sepolia', action: '2. Athena Client receives USDC fee' },
        { chain: 'OP Sepolia', action: '3. Local CCTP sends fee to Arbitrum' },
        { chain: 'Arbitrum', action: '4. Arbitrum CCTP receives, mints to Native Athena' },
        { chain: 'Arbitrum', action: '5. Native Athena holds fee during voting' },
        { chain: 'Arbitrum', action: '6. Dispute resolves, fees distributed' },
        { chain: 'Arbitrum', action: '7. If refund needed, Arbitrum CCTP sends back' },
        { chain: 'OP Sepolia', action: '8. Local CCTP mints refund to user' }
      ]
    }
  ],
  
  integrationGuide: {
    example: `// CCTP Transceiver (Arbitrum) Integration Example
const { ethers } = require('ethers');

// 1. Setup contracts
const cctpTransceiver = new ethers.Contract(
  cctpTransceiverAddress,
  cctpTransceiverABI,
  signer
);

const usdc = new ethers.Contract(
  usdcAddress,
  usdcABI,
  signer
);

// 2. SENDING: NOWJC refunds user on OP
const refundAmount = ethers.parseUnits("100", 6); // 100 USDC
const opDomain = 2; // OP Sepolia domain
const userAddressBytes32 = await cctpTransceiver.addressToBytes32(userAddress);

// Approve transceiver
await usdc.approve(cctpTransceiverAddress, refundAmount);

// Send fast transfer
const tx = await cctpTransceiver.sendFast(
  refundAmount,
  opDomain,
  userAddressBytes32,
  0 // maxFee
);

const receipt = await tx.wait();
console.log("USDC burned on Arbitrum, attestation pending");

// 3. RECEIVING: Backend monitors and submits attestations
// Monitor Local chain for FastTransferSent events
const localCCTP = new ethers.Contract(
  localCCTPAddress,
  cctpABI,
  localProvider
);

localCCTP.on('FastTransferSent', async (amount, domain, recipient, maxFee) => {
  if (domain !== 3) return; // Only interested in transfers to Arbitrum
  
  // Get message hash from transaction
  const messageHash = await getMessageHashFromTx(txHash);
  
  // Poll Circle API for attestation
  let attestation;
  while (!attestation) {
    const response = await fetch(
      \`https://iris-api-sandbox.circle.com/attestations/\${messageHash}\`
    );
    const data = await response.json();
    if (data.status === 'complete') {
      attestation = data.attestation;
    }
    await new Promise(r => setTimeout(r, 5000)); // Wait 5s
  }
  
  // Submit to Arbitrum
  await cctpTransceiver.receive(data.message, attestation);
  console.log("USDC minted on Arbitrum");
});

// 4. Helper: Get message hash from transaction
async function getMessageHashFromTx(txHash) {
  const receipt = await provider.getTransactionReceipt(txHash);
  const messageEvent = receipt.logs.find(log => 
    log.topics[0] === messageHashEventTopic
  );
  return messageEvent.topics[1];
}

// 5. Domain mapping reference
const CCTP_DOMAINS = {
  ETHEREUM: 0,
  OP: 2,
  ARBITRUM: 3,
  BASE: 6,
  POLYGON: 7
};`,
    tips: [
      'CCTP provides native USDC - no wrapped tokens or liquidity pools',
      'Fast transfers (threshold ≤1000) provide instant finality',
      'Always poll Circle API for attestations before calling receive()',
      'Attestations are typically available in 10-20 seconds',
      'Use addressToBytes32() helper to format recipient addresses',
      'Monitor FastTransferSent events to track outbound transfers',
      'Circle API: https://iris-api-sandbox.circle.com (testnet)',
      'Each burn creates mint permission - no liquidity limits',
      'CCTP is immutable - test thoroughly on testnet',
      'Domain IDs differ between mainnet and testnet',
      'Backend automation critical for seamless UX',
      'USDC has 6 decimals - use parseUnits("100", 6) not 18'
    ]
  },
  
  deployConfig: {
    type: 'standard',
    constructor: [
      {
        name: '_tokenMessenger',
        type: 'address',
        description: 'Circle TokenMessenger contract address on OP Sepolia',
        placeholder: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5'
      },
      {
        name: '_messageTransmitter',
        type: 'address',
        description: 'Circle MessageTransmitter contract address on OP Sepolia',
        placeholder: '0x7865fAfC2db2093669d92c0F33AeEF291086BEFD'
      },
      {
        name: '_usdc',
        type: 'address',
        description: 'Circle USDC token address on OP Sepolia',
        placeholder: '0x5fd84259d66Cd46123540766Be93DFE6D43130D7'
      }
    ],
    networks: {
      testnet: {
        name: 'OP Sepolia',
        chainId: 11155420,
        rpcUrl: 'https://sepolia.optimism.io',
        explorer: 'https://sepolia-optimism.etherscan.io',
        currency: 'ETH'
      },
      mainnet: {
        name: 'OP Mainnet',
        chainId: 10,
        rpcUrl: 'https://mainnet.optimism.io',
        explorer: 'https://optimistic.etherscan.io',
        currency: 'ETH'
      }
    },
    estimatedGas: '1.2M',
    postDeploy: {
      message: 'Standard deployment complete! CCTP Transceiver ready for USDC transfers.',
      nextSteps: [
        '1. Deploy CCTPv2Transceiver with constructor parameters:',
        '   - Circle TokenMessenger: 0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5',
        '   - Circle MessageTransmitter: 0x7865fAfC2db2093669d92c0F33AeEF291086BEFD',
        '   - Circle USDC: 0x5fd84259d66Cd46123540766Be93DFE6D43130D7',
        '2. Configure LOWJC to use this transceiver:',
        '   - LOWJC.setCCTPSender(cctpTransceiverAddress)',
        '3. Configure Athena Client to use this transceiver:',
        '   - AthenaClient.setCCTPSender(cctpTransceiverAddress)',
        '4. Test USDC transfer to Arbitrum:',
        '   - Approve USDC to transceiver',
        '   - Call sendFast() with Arbitrum domain (3)',
        '   - Monitor Circle API for attestation',
        '   - Call receive() on Arbitrum transceiver',
        '5. Test USDC receipt from Arbitrum:',
        '   - Monitor Arbitrum sendFast events',
        '   - Poll Circle API for attestation',
        '   - Call receive() on OP transceiver',
        '6. Verify contract on OP Sepolia Etherscan',
        '7. Setup backend service to monitor and relay attestations',
        '8. IMPORTANT: Same contract on all chains, only Circle addresses differ'
      ]
    }
  },
  
  securityConsiderations: [
    'Immutable contract: Cannot upgrade, must redeploy if issues found',
    'Circle attestation security: Relies on Circle\'s attestation service integrity',
    'Public receive(): Anyone can submit valid attestations (permissionless by design)',
    'Approval requirement: Sender must approve transceiver before sendFast()',
    'No token holding: Transceiver never holds USDC, only approves for burn',
    'Domain validation: Ensure correct domain IDs for each chain',
    'Message verification: Circle MessageTransmitter validates all attestations',
    'Fast finality: minFinalityThreshold ≤1000 balances speed vs. security',
    'No admin functions: Fully decentralized, no owner controls',
    'Single attestation: Each burn creates one mint permission',
    'Backend dependency: Requires off-chain service to fetch attestations',
    'Circle service availability: System dependent on Circle API uptime'
  ],
  
  code: `// Same implementation as Arbitrum transceiver
// See: contracts/openwork-full-contract-suite-layerzero+CCTP 2 Dec/cctp-v2-ft-transceiver.sol

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract CCTPv2Transceiver {
    ITokenMessengerV2 public immutable tokenMessenger;
    IMessageTransmitterV2 public immutable messageTransmitter;
    IERC20 public immutable usdc;

    constructor(
        address _tokenMessenger,
        address _messageTransmitter,
        address _usdc
    ) {
        tokenMessenger = ITokenMessengerV2(_tokenMessenger);
        messageTransmitter = IMessageTransmitterV2(_messageTransmitter);
        usdc = IERC20(_usdc);
    }

    function sendFast(
        uint256 amount,
        uint32 destinationDomain,
        bytes32 mintRecipient,
        uint256 maxFee
    ) external {
        usdc.transferFrom(msg.sender, address(this), amount);
        usdc.approve(address(tokenMessenger), amount);
        
        tokenMessenger.depositForBurn(
            amount,
            destinationDomain,
            mintRecipient,
            address(usdc),
            bytes32(0),
            maxFee,
            1000
        );
        
        emit FastTransferSent(amount, destinationDomain, mintRecipient, maxFee);
    }

    function receive(bytes calldata message, bytes calldata attestation) external {
        messageTransmitter.receiveMessage(message, attestation);
        emit FastTransferReceived(message, attestation);
    }

    function addressToBytes32(address addr) external pure returns (bytes32) {
        return bytes32(uint256(uint160(addr)));
    }
}`
};
