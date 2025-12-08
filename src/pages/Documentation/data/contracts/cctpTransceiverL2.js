export const cctpTransceiverL2 = {
  id: 'cctpTransceiverL2',
  name: 'CCTP Transceiver',
  chain: 'l2',
  column: 'l2-right',
  order: 2,
  status: 'testnet',
  version: 'v2.0 Dynamic (Rewards)',
  gas: '150K (with rewards)',
  mainnetNetwork: 'Arbitrum One',
  testnetNetwork: 'Arbitrum Sepolia',
  mainnetDeployed: 'Not deployed',
  testnetDeployed: 'Deployed',
  mainnetAddress: null,
  testnetAddress: '0xBB05779D4c48cAFe6a91ddA23D326933B4588f68',
  tvl: 'N/A',
  docs: 'Circle CCTP V2 Transceiver on Arbitrum Sepolia with Dynamic Gas-Based Confirmation Rewards - Enables native USDC cross-chain transfers using Circle\'s Cross-Chain Transfer Protocol. Automatically pays ETH rewards (2x gas cost, capped at 0.001 ETH) to incentivize rapid confirmations, reducing transfer times from 30+ minutes to 10-15 minutes. Handles USDC bridging for job payments from Local chains, refunds to Local chains, and dispute fee transfers. Supports fast finality transfers (≤1000 blocks) for instant USDC availability.',
  
  overview: {
    purpose: 'CCTP Transceiver on Arbitrum (Native Chain) facilitates native USDC transfers in OpenWork\'s payment infrastructure. When users post jobs on Local chains (OP, Ethereum, etc.) with USDC payment, Local CCTP Transceivers burn USDC and send attestations to this Arbitrum transceiver, which receives and mints USDC for NOWJC. For refunds or dispute resolutions, this transceiver sends USDC back to Local chains. Unlike bridge-wrapped tokens, CCTP transfers native USDC, eliminating liquidity risks and ensuring instant finality through Circle\'s attestation network.',
    tier: 'Native Chain (Arbitrum Sepolia)',
    category: 'Payment Infrastructure - USDC Bridge',
    upgradeability: 'Immutable (No proxy pattern)',
    protocol: 'Circle CCTP V2'
  },
  
  features: [
    'Native USDC transfers: Burns on source, mints native USDC on destination',
    'Fast finality: minFinalityThreshold ≤ 1000 for instant transfers',
    'Circle attestation: Secure cross-chain verification via Circle\'s attestation API',
    'Domain-based routing: Domain 3 for Arbitrum Sepolia',
    'Dynamic gas-based rewards: Pays confirmers 2x actual gas cost (capped at 0.001 ETH)',
    'Automatic reward payment: ETH rewards paid instantly on confirmation',
    'Non-blocking rewards: CCTP always succeeds even if reward fails',
    'Configurable parameters: Adjust cap, multiplier, and gas estimation',
    'Reward pool management: Owner can fund/withdraw ETH for rewards',
    'Failed reward recovery: Manual claim if automatic payment fails',
    'Refund mechanism: 24-hour timeout for unclaimed specific rewards',
    '2-3x faster confirmations: Incentives reduce wait time from 30+ min to 10-15 min',
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
│     └─> sendFast() to Domain 3 (Arbitrum)              │
│  4. Circle attestation generated                        │
└───────────────────────┬─────────────────────────────────┘
                        │ CCTP Attestation
                        ↓
┌─────────────────────────────────────────────────────────┐
│  NATIVE CHAIN (Payment Hub) ⭐                          │
│  Arbitrum Sepolia (Domain 3) - YOU ARE HERE             │
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
- Domain 3: Arbitrum One / Sepolia ⭐
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
      'Circle TokenMessenger deployed on Arbitrum Sepolia',
      'Circle MessageTransmitter deployed on Arbitrum Sepolia',
      'Native USDC contract deployed on Arbitrum Sepolia',
      'Circle attestation API access configured',
      'Domain 3 configured for Arbitrum Sepolia',
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
          relatedFunctions: ['sendFast', 'getPoolBalance', 'calculateCurrentReward']
        }
      ]
    },
    {
      category: 'Reward Management (Owner)',
      description: 'Fund and configure the ETH reward pool for confirmation incentives',
      items: [
        {
          name: 'fundRewardPool',
          signature: 'fundRewardPool() payable',
          whatItDoes: 'Deposits ETH into the reward pool to pay confirmers.',
          whyUse: 'Owner funds the pool to ensure continuous confirmation incentives. Requires regular refills.',
          howItWorks: [
            '1. Owner sends ETH transaction with value',
            '2. ETH added to contract balance',
            '3. Available for automatic reward payments'
          ],
          parameters: [],
          accessControl: 'Owner only',
          events: ['None (payable function)'],
          gasEstimate: '~21K gas',
          example: `// Fund reward pool with 0.1 ETH
await cctpTransceiver.fundRewardPool({ 
  value: ethers.parseEther("0.1") 
});

console.log("Pool funded with 0.1 ETH");`,
          relatedFunctions: ['getPoolBalance', 'withdrawETH']
        },
        {
          name: 'withdrawETH',
          signature: 'withdrawETH(uint256 amount)',
          whatItDoes: 'Allows owner to withdraw ETH from reward pool.',
          whyUse: 'Recover excess funds or emergency withdrawal.',
          howItWorks: [
            '1. Checks contract balance >= amount',
            '2. Transfers ETH to owner',
            '3. Reverts if transfer fails'
          ],
          parameters: [
            { name: 'amount', type: 'uint256', description: 'Amount of ETH to withdraw in wei' }
          ],
          accessControl: 'Owner only',
          events: ['None'],
          gasEstimate: '~30K gas',
          example: `// Withdraw 0.05 ETH
const amount = ethers.parseEther("0.05");
await cctpTransceiver.withdrawETH(amount);`,
          relatedFunctions: ['fundRewardPool', 'getPoolBalance']
        },
        {
          name: 'setMaxRewardAmount',
          signature: 'setMaxRewardAmount(uint256 newAmount)',
          whatItDoes: 'Updates the maximum reward cap per confirmation.',
          whyUse: 'Adjust reward ceiling based on economics or gas price changes.',
          howItWorks: [
            '1. Updates maxRewardAmount state variable',
            '2. Emits MaxRewardAmountUpdated event',
            '3. Affects future reward calculations'
          ],
          parameters: [
            { name: 'newAmount', type: 'uint256', description: 'New maximum reward in wei (default: 0.001 ETH = 1000000000000000)' }
          ],
          accessControl: 'Owner only',
          events: ['MaxRewardAmountUpdated(oldAmount, newAmount)'],
          gasEstimate: '~28K gas',
          example: `// Increase cap to 0.002 ETH
const newCap = ethers.parseEther("0.002");
await cctpTransceiver.setMaxRewardAmount(newCap);`,
          relatedFunctions: ['setRewardMultiplier', 'setEstimatedGasUsage']
        },
        {
          name: 'setEstimatedGasUsage',
          signature: 'setEstimatedGasUsage(uint256 newGas)',
          whatItDoes: 'Updates the estimated gas for receive() function.',
          whyUse: 'Tune reward calculation accuracy based on actual gas usage patterns.',
          howItWorks: [
            '1. Updates estimatedGasUsage state variable',
            '2. Emits EstimatedGasUpdated event',
            '3. Used in dynamic reward calculation'
          ],
          parameters: [
            { name: 'newGas', type: 'uint256', description: 'Estimated gas units (default: 200000)' }
          ],
          accessControl: 'Owner only',
          events: ['EstimatedGasUpdated(oldGas, newGas)'],
          gasEstimate: '~28K gas',
          example: `// Adjust to 180000 gas based on observations
await cctpTransceiver.setEstimatedGasUsage(180000);`,
          relatedFunctions: ['setMaxRewardAmount', 'calculateCurrentReward']
        },
        {
          name: 'setRewardMultiplier',
          signature: 'setRewardMultiplier(uint256 newMultiplier)',
          whatItDoes: 'Updates the reward multiplier (default 2 = 2x gas cost).',
          whyUse: 'Increase/decrease reward generosity to incentivize faster confirmations.',
          howItWorks: [
            '1. Validates multiplier is between 1 and 10',
            '2. Updates rewardMultiplier state variable',
            '3. Emits RewardMultiplierUpdated event'
          ],
          parameters: [
            { name: 'newMultiplier', type: 'uint256', description: 'New multiplier (1-10, default: 2)' }
          ],
          accessControl: 'Owner only',
          events: ['RewardMultiplierUpdated(oldMultiplier, newMultiplier)'],
          gasEstimate: '~28K gas',
          example: `// Increase to 3x for high-priority periods
await cctpTransceiver.setRewardMultiplier(3);

// Reduce to 1.5x during low gas periods
await cctpTransceiver.setRewardMultiplier(1);`,
          relatedFunctions: ['setMaxRewardAmount', 'calculateCurrentReward']
        }
      ]
    },
    {
      category: 'Reward Operations (User)',
      description: 'Deposit specific rewards and claim failed payments',
      items: [
        {
          name: 'depositReward',
          signature: 'depositReward(bytes32 messageHash) payable',
          whatItDoes: 'Deposits a specific ETH reward for a particular CCTP message.',
          whyUse: 'Users can offer custom rewards to incentivize urgent confirmations.',
          howItWorks: [
            '1. Accepts ETH with transaction',
            '2. Associates reward with messageHash',
            '3. Stores depositor and timestamp',
            '4. Emits RewardDeposited event'
          ],
          parameters: [
            { name: 'messageHash', type: 'bytes32', description: 'Keccak256 hash of the CCTP message' }
          ],
          accessControl: 'Public',
          events: ['RewardDeposited(messageHash, depositor, amount)'],
          gasEstimate: '~45K gas',
          example: `// Offer 0.005 ETH reward for urgent transfer
const messageHash = await cctpTransceiver.getMessageHash(message);
await cctpTransceiver.depositReward(messageHash, {
  value: ethers.parseEther("0.005")
});`,
          relatedFunctions: ['refundReward', 'getMessageHash']
        },
        {
          name: 'claimReward',
          signature: 'claimReward(bytes32 messageHash)',
          whatItDoes: 'Manually claims a pending reward if automatic payment failed.',
          whyUse: 'Confirmers can recover rewards that failed to transfer automatically.',
          howItWorks: [
            '1. Verifies caller is the confirmer',
            '2. Checks pending reward exists',
            '3. Transfers ETH to confirmer',
            '4. Emits RewardClaimed event'
          ],
          parameters: [
            { name: 'messageHash', type: 'bytes32', description: 'Hash of the confirmed message' }
          ],
          accessControl: 'Confirmer only',
          events: ['RewardClaimed(messageHash, claimer, amount)'],
          gasEstimate: '~35K gas',
          example: `// Claim failed reward payment
const messageHash = "0x...";
await cctpTransceiver.claimReward(messageHash);`,
          relatedFunctions: ['receive', 'hasPendingReward']
        },
        {
          name: 'refundReward',
          signature: 'refundReward(bytes32 messageHash)',
          whatItDoes: 'Refunds a deposited reward after 24-hour timeout if unclaimed.',
          whyUse: 'Allows depositor to recover funds if message never confirmed.',
          howItWorks: [
            '1. Verifies caller is original depositor',
            '2. Checks 24-hour timeout passed',
            '3. Transfers ETH back to depositor',
            '4. Emits RewardRefunded event'
          ],
          parameters: [
            { name: 'messageHash', type: 'bytes32', description: 'Hash of the unconfirmed message' }
          ],
          accessControl: 'Depositor only',
          events: ['RewardRefunded(messageHash, depositor, amount)'],
          gasEstimate: '~35K gas',
          example: `// Refund after 24 hours
const messageHash = "0x...";
await cctpTransceiver.refundReward(messageHash);`,
          relatedFunctions: ['depositReward', 'canRefund']
        }
      ]
    },
    {
      category: 'View Functions',
      description: 'Query reward pool status and message reward information',
      items: [
        {
          name: 'getPoolBalance',
          signature: 'getPoolBalance() view returns (uint256)',
          whatItDoes: 'Returns current ETH balance available for rewards.',
          whyUse: 'Monitor pool to determine when refill is needed.',
          howItWorks: [
            'Returns address(this).balance'
          ],
          parameters: [],
          accessControl: 'Public view',
          events: ['None (view function)'],
          gasEstimate: 'Minimal (view)',
          example: `const balance = await cctpTransceiver.getPoolBalance();
console.log(\`Pool has \${ethers.formatEther(balance)} ETH\`);

if (balance < ethers.parseEther("0.01")) {
  console.log("⚠️ Pool running low, refill needed");
}`,
          relatedFunctions: ['fundRewardPool']
        },
        {
          name: 'calculateCurrentReward',
          signature: 'calculateCurrentReward() view returns (uint256)',
          whatItDoes: 'Calculates what reward would be paid at current gas price.',
          whyUse: 'Preview reward amount before confirmation.',
          howItWorks: [
            '1. Gets current tx.gasprice',
            '2. Calculates: estimatedGas * gasprice * multiplier',
            '3. Returns min(calculated, maxRewardAmount)'
          ],
          parameters: [],
          accessControl: 'Public view',
          events: ['None (view function)'],
          gasEstimate: 'Minimal (view)',
          example: `const reward = await cctpTransceiver.calculateCurrentReward();
console.log(\`Current reward: \${ethers.formatEther(reward)} ETH\`);`,
          relatedFunctions: ['receive', 'setRewardMultiplier']
        },
        {
          name: 'hasPendingReward',
          signature: 'hasPendingReward(bytes32 messageHash) view returns (bool)',
          whatItDoes: 'Checks if a message has an unclaimed reward.',
          whyUse: 'Determine if manual claim is needed.',
          howItWorks: [
            'Returns true if pendingRewards[messageHash] > 0'
          ],
          parameters: [
            { name: 'messageHash', type: 'bytes32', description: 'Hash of the CCTP message' }
          ],
          accessControl: 'Public view',
          events: ['None (view function)'],
          gasEstimate: 'Minimal (view)',
          example: `const hasPending = await cctpTransceiver.hasPendingReward(messageHash);
if (hasPending) {
  console.log("Reward available to claim!");
}`,
          relatedFunctions: ['claimReward', 'getRewardInfo']
        },
        {
          name: 'getRewardInfo',
          signature: 'getRewardInfo(bytes32 messageHash) view returns (uint256, address, uint256, address, uint256)',
          whatItDoes: 'Returns complete reward information for a message.',
          whyUse: 'Get detailed status including depositor, confirmer, and timestamps.',
          howItWorks: [
            'Returns tuple: (reward, depositor, depositedAt, confirmer, confirmedAt)'
          ],
          parameters: [
            { name: 'messageHash', type: 'bytes32', description: 'Hash of the CCTP message' }
          ],
          accessControl: 'Public view',
          events: ['None (view function)'],
          gasEstimate: 'Minimal (view)',
          example: `const [reward, depositor, depositTime, confirmer, confirmTime] = 
  await cctpTransceiver.getRewardInfo(messageHash);

console.log(\`Reward: \${ethers.formatEther(reward)} ETH\`);
console.log(\`Depositor: \${depositor}\`);
console.log(\`Confirmer: \${confirmer || "Not confirmed"}\`);`,
          relatedFunctions: ['hasPendingReward', 'canRefund']
        },
        {
          name: 'canRefund',
          signature: 'canRefund(bytes32 messageHash) view returns (bool)',
          whatItDoes: 'Checks if reward is eligible for refund (24h passed).',
          whyUse: 'Verify refund eligibility before calling refundReward().',
          howItWorks: [
            '1. Checks block.timestamp >= depositTime + 24 hours',
            '2. Checks pendingRewards > 0'
          ],
          parameters: [
            { name: 'messageHash', type: 'bytes32', description: 'Hash of the CCTP message' }
          ],
          accessControl: 'Public view',
          events: ['None (view function)'],
          gasEstimate: 'Minimal (view)',
          example: `const canRefund = await cctpTransceiver.canRefund(messageHash);
if (canRefund) {
  await cctpTransceiver.refundReward(messageHash);
}`,
          relatedFunctions: ['refundReward', 'depositReward']
        },
        {
          name: 'getMessageHash',
          signature: 'getMessageHash(bytes message) pure returns (bytes32)',
          whatItDoes: 'Calculates the keccak256 hash of a CCTP message.',
          whyUse: 'Helper to get messageHash for reward functions.',
          howItWorks: [
            'Returns keccak256(message)'
          ],
          parameters: [
            { name: 'message', type: 'bytes', description: 'CCTP message bytes' }
          ],
          accessControl: 'Public pure',
          events: ['None (pure function)'],
          gasEstimate: 'Minimal (pure)',
          example: `const message = "0x..."; // From Circle API
const messageHash = await cctpTransceiver.getMessageHash(message);`,
          relatedFunctions: ['depositReward', 'getRewardInfo']
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
        { chain: 'OP Sepolia', action: '3. Local CCTP Transceiver.sendFast(100 USDC, Domain 3, NOWJC)' },
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
  
  economics: {
    rewardStructure: {
      title: 'Dynamic Reward Calculation',
      formula: 'reward = min(estimatedGas × tx.gasprice × multiplier, maxRewardAmount)',
      defaults: {
        estimatedGas: '200,000 gas',
        multiplier: '2x',
        maxRewardAmount: '0.001 ETH'
      },
      examples: [
        { gasPrice: '1 gwei', calculated: '0.0004 ETH', actual: '0.0004 ETH', capped: false },
        { gasPrice: '5 gwei', calculated: '0.001 ETH', actual: '0.001 ETH', capped: true },
        { gasPrice: '50 gwei', calculated: '0.01 ETH', actual: '0.001 ETH', capped: true }
      ]
    },
    costs: {
      perConfirmation: '0.0004-0.001 ETH ($1.50-$3.80 @ $3,800/ETH)',
      monthly100Confirmations: '~0.05-0.1 ETH ($190-$380)',
      monthly500Confirmations: '~0.25-0.5 ETH ($950-$1,900)',
      platformFunded: 'Yes - zero cost to end users',
      advantages: [
        'Cheaper during low gas periods (self-adjusting)',
        'Fairer to confirmers (pays actual costs)',
        'Predictable maximum spend (capped)',
        'More cost-efficient than fixed rewards'
      ]
    },
    benefits: {
      speedImprovement: '2-3x faster (30+ min → 10-15 min)',
      confirmationRate: '~100% (incentivized)',
      userExperience: 'Near-instant USDC transfers',
      platformCost: 'Minimal vs. UX improvement'
    }
  },
  
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
        description: 'Circle TokenMessenger contract address on Arbitrum Sepolia',
        placeholder: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5'
      },
      {
        name: '_messageTransmitter',
        type: 'address',
        description: 'Circle MessageTransmitter contract address on Arbitrum Sepolia',
        placeholder: '0xaCF1ceeF35caAc005e15888dDb8A3515C41B4872'
      },
      {
        name: '_usdc',
        type: 'address',
        description: 'Circle USDC token address on Arbitrum Sepolia',
        placeholder: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d'
      }
    ],
    networks: {
      testnet: {
        name: 'Arbitrum Sepolia',
        chainId: 421614,
        rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
        explorer: 'https://sepolia.arbiscan.io',
        currency: 'ETH'
      },
      mainnet: {
        name: 'Arbitrum One',
        chainId: 42161,
        rpcUrl: 'https://arb1.arbitrum.io/rpc',
        explorer: 'https://arbiscan.io',
        currency: 'ETH'
      }
    },
    estimatedGas: '1.2M',
    postDeploy: {
      message: 'Standard deployment complete! Central USDC hub transceiver ready.',
      nextSteps: [
        '1. Deploy CCTPv2Transceiver with Circle contract addresses on Arbitrum',
        '2. Configure NOWJC: NOWJC.setCCTPSender(cctpTransceiverAddress)',
        '3. Configure Native Athena: NativeAthena.setCCTPSender(cctpTransceiverAddress)',
        '4. Test receiving USDC from Local chains (OP, Ethereum)',
        '5. Test sending USDC refunds to Local chains',
        '6. Setup backend to poll Circle API and relay attestations',
        '7. Verify contract on Arbiscan',
        '8. CRITICAL: This is central hub - all USDC flows through Arbitrum'
      ]
    }
  },
  
  securityConsiderations: [
    'Reward is optional: CCTP always completes first, reward payment happens after',
    'Non-blocking design: Failed reward transfer does not revert CCTP transaction',
    'Gas-limited reward transfer: 10K gas limit prevents griefing attacks',
    'Capped rewards: maxRewardAmount prevents pool drainage',
    'Reentrancy protection: nonReentrant modifier on receive() and claim functions',
    '24-hour refund timeout: Prevents permanent lock of deposited rewards',
    'Owner-controlled parameters: Only owner can adjust cap, multiplier, and estimated gas',
    'Immutable contract: Cannot upgrade, must redeploy if issues found',
    'Circle attestation security: Relies on Circle\'s attestation service integrity',
    'Public receive(): Anyone can submit valid attestations (permissionless by design)',
    'Approval requirement: Sender must approve transceiver before sendFast()',
    'No token holding: Transceiver never holds USDC, only approves for burn',
    'Domain validation: Ensure correct domain IDs for each chain',
    'Message verification: Circle MessageTransmitter validates all attestations',
    'Fast finality: minFinalityThreshold ≤1000 balances speed vs. security',
    'Single attestation: Each burn creates one mint permission',
    'Backend dependency: Requires off-chain service to fetch attestations',
    'Circle service availability: System dependent on Circle API uptime',
    'Reward pool monitoring: Owner must monitor balance and refill regularly'
  ],
  
  code: `// Full implementation: contracts/openwork-full-contract-suite-layerzero+CCTP 2 Dec/cctp-v2-ft-transceiver-with-rewards-dynamic.sol

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title CCTPv2Transceiver with Dynamic Gas-Based Rewards
 * @notice CCTP transceiver that pays confirmers based on actual gas costs (2x) with safety cap
 * @dev Production version with automatic dynamic reward calculation
 */

interface IERC20 {
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

interface ITokenMessengerV2 {
    function depositForBurn(
        uint256 amount,
        uint32 destinationDomain,
        bytes32 mintRecipient,
        address burnToken,
        bytes32 destinationCaller,
        uint256 maxFee,
        uint32 minFinalityThreshold
    ) external;
}

interface IMessageTransmitterV2 {
    function receiveMessage(
        bytes calldata message,
        bytes calldata attestation
    ) external;
}

contract CCTPv2TransceiverWithRewardsDynamic {
    ITokenMessengerV2 public immutable tokenMessenger;
    IMessageTransmitterV2 public immutable messageTransmitter;
    IERC20 public immutable usdc;
    address public owner;
    
    // Reward config
    uint256 public maxRewardAmount;           // Safety cap (default 0.001 ETH)
    uint256 public estimatedGasUsage;         // Estimated gas for receive() (default 200k)
    uint256 public rewardMultiplier;          // Multiplier for gas cost (default 2 = 2x)
    
    // Tracking
    mapping(bytes32 => uint256) public pendingRewards;
    mapping(bytes32 => address) public confirmedBy;
    mapping(bytes32 => uint256) public confirmationTime;
    mapping(bytes32 => address) public rewardDepositor;
    mapping(bytes32 => uint256) public depositTime;
    
    uint256 public constant REFUND_TIMEOUT = 24 hours;
    uint256 public constant REWARD_TRANSFER_GAS_LIMIT = 10000;
    uint256 private locked = 1;
    
    // Events
    event FastTransferSent(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient, uint256 maxFee);
    event FastTransferReceived(bytes message, bytes attestation);
    event RewardPaid(bytes32 indexed messageHash, address indexed recipient, uint256 amount);
    event RewardPaymentFailed(bytes32 indexed messageHash, address indexed recipient, uint256 amount, string reason);
    event RewardClaimed(bytes32 indexed messageHash, address indexed claimer, uint256 amount);
    event RewardRefunded(bytes32 indexed messageHash, address indexed depositor, uint256 amount);
    event RewardDeposited(bytes32 indexed messageHash, address indexed depositor, uint256 amount);
    event MaxRewardAmountUpdated(uint256 oldAmount, uint256 newAmount);
    event EstimatedGasUpdated(uint256 oldGas, uint256 newGas);
    event RewardMultiplierUpdated(uint256 oldMultiplier, uint256 newMultiplier);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    modifier nonReentrant() {
        require(locked == 1, "Reentrancy");
        locked = 2;
        _;
        locked = 1;
    }
    
    constructor(
        address _tokenMessenger,
        address _messageTransmitter,
        address _usdc
    ) {
        tokenMessenger = ITokenMessengerV2(_tokenMessenger);
        messageTransmitter = IMessageTransmitterV2(_messageTransmitter);
        usdc = IERC20(_usdc);
        owner = msg.sender;
        maxRewardAmount = 0.001 ether;    // Safety cap
        estimatedGasUsage = 200000;       // Typical receive() gas
        rewardMultiplier = 2;             // 2x gas cost
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        address oldOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
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
    
    /**
     * @notice Receive CCTP transfer and pay dynamic gas-based reward
     * @dev Calculates reward as: gasUsed * tx.gasprice * 2, capped at maxRewardAmount
     */
    function receive(
        bytes calldata message,
        bytes calldata attestation
    ) external nonReentrant {
        bytes32 messageHash = keccak256(message);
        
        // CRITICAL: CCTP always succeeds first
        messageTransmitter.receiveMessage(message, attestation);
        emit FastTransferReceived(message, attestation);
        
        // Try to pay dynamic reward
        _tryPayReward(messageHash, msg.sender);
    }
    
    /**
     * @notice Calculate and pay dynamic reward based on actual gas cost
     * @dev Reward = min(estimatedGas * tx.gasprice * multiplier, maxRewardAmount)
     */
    function _tryPayReward(bytes32 messageHash, address recipient) private {
        // Check for specific deposited reward first
        uint256 reward = pendingRewards[messageHash];
        
        // If no specific reward, calculate dynamic reward from gas price
        if (reward == 0) {
            reward = estimatedGasUsage * tx.gasprice * rewardMultiplier;
            
            // Apply safety cap
            if (reward > maxRewardAmount) {
                reward = maxRewardAmount;
            }
        }
        
        // Skip if no balance
        if (address(this).balance < reward || reward == 0) {
            return;
        }
        
        // Mark confirmer
        confirmedBy[messageHash] = recipient;
        confirmationTime[messageHash] = block.timestamp;
        
        // Clear specific reward if exists
        if (pendingRewards[messageHash] > 0) {
            pendingRewards[messageHash] = 0;
        }
        
        // Pay reward (gas-limited)
        (bool success, ) = recipient.call{value: reward, gas: REWARD_TRANSFER_GAS_LIMIT}("");
        
        if (success) {
            emit RewardPaid(messageHash, recipient, reward);
        } else {
            pendingRewards[messageHash] = reward;
            emit RewardPaymentFailed(messageHash, recipient, reward, "Transfer failed");
        }
    }
    
    // ==================== OWNER FUNCTIONS ====================
    
    function setMaxRewardAmount(uint256 newAmount) external onlyOwner {
        uint256 oldAmount = maxRewardAmount;
        maxRewardAmount = newAmount;
        emit MaxRewardAmountUpdated(oldAmount, newAmount);
    }
    
    function setEstimatedGasUsage(uint256 newGas) external onlyOwner {
        uint256 oldGas = estimatedGasUsage;
        estimatedGasUsage = newGas;
        emit EstimatedGasUpdated(oldGas, newGas);
    }
    
    function setRewardMultiplier(uint256 newMultiplier) external onlyOwner {
        require(newMultiplier > 0 && newMultiplier <= 10, "Invalid multiplier");
        uint256 oldMultiplier = rewardMultiplier;
        rewardMultiplier = newMultiplier;
        emit RewardMultiplierUpdated(oldMultiplier, newMultiplier);
    }
    
    function fundRewardPool() external payable onlyOwner {
        require(msg.value > 0, "Must send ETH");
    }
    
    function withdrawETH(uint256 amount) external onlyOwner {
        require(address(this).balance >= amount, "Insufficient balance");
        (bool success, ) = owner.call{value: amount}("");
        require(success, "Withdraw failed");
    }
    
    function recoverUSDC(uint256 amount) external onlyOwner {
        usdc.transferFrom(address(this), owner, amount);
    }
    
    // ==================== REWARD MANAGEMENT ====================
    
    function depositReward(bytes32 messageHash) external payable {
        require(msg.value > 0, "Must deposit reward");
        pendingRewards[messageHash] += msg.value;
        rewardDepositor[messageHash] = msg.sender;
        depositTime[messageHash] = block.timestamp;
        emit RewardDeposited(messageHash, msg.sender, msg.value);
    }
    
    function claimReward(bytes32 messageHash) external nonReentrant {
        require(confirmedBy[messageHash] == msg.sender, "Not the confirmer");
        uint256 reward = pendingRewards[messageHash];
        require(reward > 0, "No reward available");
        
        pendingRewards[messageHash] = 0;
        (bool success, ) = msg.sender.call{value: reward}("");
        require(success, "Claim transfer failed");
        
        emit RewardClaimed(messageHash, msg.sender, reward);
    }
    
    function refundReward(bytes32 messageHash) external nonReentrant {
        require(msg.sender == rewardDepositor[messageHash], "Not the depositor");
        require(block.timestamp >= depositTime[messageHash] + REFUND_TIMEOUT, "Timeout not reached");
        
        uint256 reward = pendingRewards[messageHash];
        require(reward > 0, "No reward to refund");
        
        pendingRewards[messageHash] = 0;
        (bool success, ) = msg.sender.call{value: reward}("");
        require(success, "Refund transfer failed");
        
        emit RewardRefunded(messageHash, msg.sender, reward);
    }
    
    // ==================== VIEW FUNCTIONS ====================
    
    function getPoolBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    function calculateCurrentReward() external view returns (uint256) {
        uint256 reward = estimatedGasUsage * tx.gasprice * rewardMultiplier;
        return reward > maxRewardAmount ? maxRewardAmount : reward;
    }
    
    function hasPendingReward(bytes32 messageHash) external view returns (bool) {
        return pendingRewards[messageHash] > 0;
    }
    
    function getRewardInfo(bytes32 messageHash) external view returns (
        uint256 reward,
        address depositor,
        uint256 depositedAt,
        address confirmer,
        uint256 confirmedAt
    ) {
        return (
            pendingRewards[messageHash],
            rewardDepositor[messageHash],
            depositTime[messageHash],
            confirmedBy[messageHash],
            confirmationTime[messageHash]
        );
    }
    
    function canRefund(bytes32 messageHash) external view returns (bool) {
        return block.timestamp >= depositTime[messageHash] + REFUND_TIMEOUT 
            && pendingRewards[messageHash] > 0;
    }
    
    function addressToBytes32(address addr) external pure returns (bytes32) {
        return bytes32(uint256(uint160(addr)));
    }
    
    function getMessageHash(bytes calldata message) external pure returns (bytes32) {
        return keccak256(message);
    }
    
    receive() external payable {}
}`
};
