export const nativeBridge = {
  id: 'nativeBridge',
  name: 'Native Bridge',
  chain: 'l2',
  column: 'l2-left',
  order: 2,
  status: 'testnet',
  version: 'v1.0.0',
  gas: '67K',
  mainnetNetwork: 'Arbitrum One',
  testnetNetwork: 'Arbitrum Sepolia',
  mainnetDeployed: 'Not deployed',
  testnetDeployed: 'Deployed',
  mainnetAddress: null,
  testnetAddress: '0x3b2AC1d1281cA4a1188d9F09A5Af9a9E6a114D6c',
  tvl: 'N/A',
  docs: 'Native Bridge - LayerZero OApp serving as the central messaging hub on Arbitrum. Routes messages between Local Chains, Native contracts, and Main Chain for the entire OpenWork cross-chain architecture.',
  
  overview: {
    purpose: 'Native Bridge is the heart of OpenWork\'s cross-chain messaging architecture. Deployed on Arbitrum (Native Chain), it acts as the central router receiving messages from all Local Chains (OP, Ethereum, Polygon, Base), routing them to the appropriate Native Chain contracts (NOWJC, Native Athena, Native DAO, Profile Manager, Oracle Manager), and syncing data to the Main Chain (Base Sepolia testnet / Ethereum mainnet). It uses LayerZero V2 for secure cross-chain communication, supports dynamic Local Chain management, and handles upgrade commands from Main DAO. Every cross-chain operation flows through this bridge.',
    tier: 'Native Chain (Arbitrum Sepolia)',
    category: 'Bridge Infrastructure - Central Hub',
    upgradeability: 'Non-upgradeable (LayerZero OApp)'
  },
  
  features: [
    'Central messaging hub: Routes messages between 3 chain tiers (Local, Native, Main)',
    'Multi-chain receiver: Accepts messages from unlimited Local Chains (OP, Ethereum, Polygon, Base, etc.)',
    'Dynamic chain management: Add/remove Local Chains without redeployment',
    'Smart routing: Automatically routes to 5+ Native contracts based on function name',
    'Job ID parsing: Extracts chain EID from job IDs (format: chainEid-jobNumber) for reverse routing',
    'Main Chain sync: Sends rewards and voting power data to Main Chain for governance',
    'Upgrade coordinator: Receives and executes upgrade commands from Main DAO',
    'Batch operations: Quote and send to multiple chains in single transaction',
    'Authorization system: Only authorized contracts can use bridge functions',
    'Fee quoting: Accurate LayerZero fee estimation for all routes',
    'Refund handling: Returns excess native fees to callers',
    'Comprehensive events: Full audit trail of all cross-chain messages'
  ],
  
  systemPosition: {
    description: 'Native Bridge sits at the absolute center of OpenWork\'s three-tier architecture on Arbitrum. It receives job operations from Local Chains via their Local Bridges, routes them to Native Chain contracts for execution, and syncs governance data to the Main Chain. All cross-chain communication flows through this single point, making it the backbone of the entire multi-chain system. It connects Local users → Native execution → Main governance.',
    diagram: `
📍 Three-Tier Bridge Architecture

┌─────────────────────────────────────────────────────────┐
│  TIER 1: LOCAL CHAINS (User-Facing)                     │
│  OP Sepolia, Ethereum Sepolia, Polygon, Base, etc.      │
├─────────────────────────────────────────────────────────┤
│  • Local Bridge (per chain)                             │
│  • LOWJC (job interface)                                │
│  • Athena Client (dispute interface)                    │
└───────────────────────┬─────────────────────────────────┘
                        │ LayerZero Messages
                        ↓
┌─────────────────────────────────────────────────────────┐
│  TIER 2: NATIVE CHAIN (Execution Hub)                   │
│  Arbitrum Sepolia                                        │
├─────────────────────────────────────────────────────────┤
│  ⭐ Native Bridge (YOU ARE HERE) ⭐                     │
│     Central Message Router & Hub                        │
│     ↓ Routes to:                                        │
│     ├─> NOWJC (job lifecycle)                           │
│     ├─> Native Athena (disputes, voting)                │
│     ├─> Native DAO (stakes, governance)                 │
│     ├─> Native Rewards (token distribution)             │
│     ├─> Profile Manager (profiles, portfolios)          │
│     └─> Oracle Manager (skill verification)             │
└───────────────────────┬─────────────────────────────────┘
                        │ Governance Sync
                        ↓
┌─────────────────────────────────────────────────────────┐
│  TIER 3: MAIN CHAIN (Governance)                        │
│  Base Sepolia (testnet) / Ethereum (mainnet)            │
├─────────────────────────────────────────────────────────┤
│  • Main Bridge                                          │
│  • Main DAO (governance proposals)                      │
│  • Main Rewards (OW token distribution)                 │
│  • OpenWork Token (ERC-20)                              │
└─────────────────────────────────────────────────────────┘

Message Flow Examples:

1. Job Posting:
   Local (LOWJC) → Local Bridge → Native Bridge → NOWJC

2. Dispute:
   Local (Athena Client) → Local Bridge → Native Bridge → Native Athena

3. Rewards Sync:
   NOWJC → Native Bridge → Main Bridge → Main Rewards

4. Upgrade:
   Main DAO → Main Bridge → Native Bridge → [Target Contract]

5. Dispute Finalization:
   Native Athena → Native Bridge → [Extracts EID from disputeId] → Local Bridge → Athena Client`
  },
  
  dependencies: {
    dependsOn: [
      { 
        name: 'LayerZero V2 Endpoint', 
        reason: 'Core messaging protocol for secure cross-chain communication. Native Bridge extends OAppSender and OAppReceiver.',
        type: 'Infrastructure'
      },
      { 
        name: 'Local Bridges', 
        reason: 'Each Local Chain has a bridge that sends messages to Native Bridge. Must be authorized via addLocalChain().',
        type: 'Bridge'
      },
      { 
        name: 'Main Bridge', 
        reason: 'Receives governance sync messages (rewards, voting power) from Native Bridge for Main Chain operations.',
        type: 'Bridge'
      }
    ],
    requiredBy: [
      { 
        name: 'NOWJC', 
        reason: 'Calls sendToMainChain() for rewards/voting sync. Receives job operations from Native Bridge after routing.',
        type: 'Job Management'
      },
      { 
        name: 'Native Athena', 
        reason: 'Calls sendToLocalChain() for dispute finalization. Receives dispute operations from Native Bridge.',
        type: 'Dispute Resolution'
      },
      { 
        name: 'Native DAO', 
        reason: 'Receives stake updates from Native Bridge. Future: may send governance messages.',
        type: 'Governance'
      },
      { 
        name: 'Profile Manager', 
        reason: 'Receives profile operations (create, update, portfolio, ratings) from Native Bridge.',
        type: 'Profile Management'
      },
      { 
        name: 'All Local Contracts', 
        reason: 'LOWJC and Athena Client send all user operations through their Local Bridge to Native Bridge.',
        type: 'User Interface'
      }
    ],
    prerequisites: [
      'LayerZero V2 Endpoint must be deployed on Arbitrum',
      'All Native Chain contracts must be deployed and configured',
      'Local Chain EIDs must be added via addLocalChain()',
      'Main Chain EID must be set correctly (Base testnet / Ethereum mainnet)',
      'Native contracts must be authorized via authorizeContract()',
      'Native contract addresses must be set via setters',
      'LayerZero peers must be configured for all chains'
    ]
  },
  
  functions: [
    {
      category: 'Local Chain Management',
      description: 'Functions for managing authorized Local Chains that can send messages',
      items: [
        {
          name: 'addLocalChain',
          signature: 'addLocalChain(uint32 _localChainEid)',
          whatItDoes: 'Adds a new Local Chain to the authorized list, allowing it to send messages to Native Bridge.',
          whyUse: 'When expanding to a new blockchain (e.g., adding Polygon after launching on OP), owner adds its EID.',
          howItWorks: [
            'Validates chain not already authorized',
            'Sets authorizedLocalChains[eid] = true',
            'Adds EID to localChainEids array for enumeration',
            'Emits LocalChainAdded event',
            'Chain can now send messages via LayerZero'
          ],
          parameters: [
            { name: '_localChainEid', type: 'uint32', description: 'LayerZero Endpoint ID of the new Local Chain' }
          ],
          accessControl: 'onlyOwner',
          events: ['LocalChainAdded(localChainEid)'],
          gasEstimate: '~50K gas',
          example: `// Add Polygon as a new Local Chain
const polygonEid = 40267; // Polygon Sepolia EID
await nativeBridge.addLocalChain(polygonEid);

// Polygon Local Bridge can now send messages`,
          relatedFunctions: ['removeLocalChain', 'getLocalChains']
        },
        {
          name: 'removeLocalChain',
          signature: 'removeLocalChain(uint32 _localChainEid)',
          whatItDoes: 'Removes a Local Chain from authorized list, preventing future messages.',
          whyUse: 'If a chain is deprecated or compromised, owner can revoke its access.',
          howItWorks: [
            'Validates chain is currently authorized',
            'Sets authorizedLocalChains[eid] = false',
            'Removes from localChainEids array (swap and pop)',
            'Emits LocalChainRemoved event',
            'Chain can no longer send messages'
          ],
          parameters: [
            { name: '_localChainEid', type: 'uint32', description: 'EID to remove' }
          ],
          accessControl: 'onlyOwner',
          events: ['LocalChainRemoved(localChainEid)'],
          gasEstimate: '~35K gas',
          example: `// Remove a deprecated chain
await nativeBridge.removeLocalChain(oldChainEid);`,
          relatedFunctions: ['addLocalChain', 'getLocalChains']
        },
        {
          name: 'getLocalChains',
          signature: 'getLocalChains() view returns (uint32[])',
          whatItDoes: 'Returns array of all authorized Local Chain EIDs.',
          whyUse: 'Query which chains are currently authorized to send messages.',
          howItWorks: [
            'Returns localChainEids array',
            'Includes all added chains minus removed ones'
          ],
          parameters: [],
          accessControl: 'Public view',
          events: ['None (view)'],
          gasEstimate: 'N/A (view)',
          example: `const chains = await nativeBridge.getLocalChains();
console.log("Authorized Local Chains:", chains);
// [40232, 40161, 40267] // OP, Ethereum, Polygon`,
          relatedFunctions: ['addLocalChain', 'removeLocalChain']
        }
      ]
    },
    {
      category: 'Message Routing (Inbound)',
      description: 'Internal LayerZero message handling - routes to Native contracts',
      items: [
        {
          name: '_lzReceive',
          signature: '_lzReceive(Origin _origin, bytes32 _guid, bytes _message, address _executor, bytes _extraData)',
          whatItDoes: 'LayerZero callback that routes incoming messages to appropriate Native contracts.',
          whyUse: 'Automatically called by LayerZero when messages arrive. Decodes function name and routes.',
          howItWorks: [
            'Decodes function name from message payload',
            'Routes upgrade messages to _handleUpgradeMessage()',
            'Routes DAO messages to Native DAO (updateStakeData)',
            'Routes Athena messages to Native Athena (raiseDispute, submitSkillVerification, askAthena)',
            'Routes Profile messages to Profile Manager (createProfile, addPortfolio, rate, updateProfile, etc.)',
            'Routes Job messages to NOWJC (postJob, applyToJob, startJob, submitWork, releasePayment, etc.)',
            'Routes Governance messages to NOWJC (incrementGovernanceAction, updateUserClaimData)',
            'Emits CrossChainMessageReceived event',
            'Reverts on unknown function names'
          ],
          parameters: [
            { name: '_origin', type: 'Origin', description: 'LayerZero origin struct with source chain EID' },
            { name: '_guid', type: 'bytes32', description: 'Unique message identifier (not used)' },
            { name: '_message', type: 'bytes', description: 'ABI-encoded message with function name and parameters' },
            { name: '_executor', type: 'address', description: 'LayerZero executor (not used)' },
            { name: '_extraData', type: 'bytes', description: 'Extra data (not used)' }
          ],
          accessControl: 'Internal - only LayerZero Endpoint',
          events: ['CrossChainMessageReceived(functionName, sourceChain, data)'],
          gasEstimate: 'Varies by routed function (50K - 200K gas)',
          example: `// This is called automatically by LayerZero
// User posts job on OP → Local Bridge sends message
// → LayerZero calls _lzReceive on Native Bridge
// → Routes to NOWJC.postJob()`,
          relatedFunctions: ['decodeFunctionName', '_handleUpgradeMessage']
        },
        {
          name: 'decodeFunctionName',
          signature: 'decodeFunctionName(bytes _message) pure returns (string)',
          whatItDoes: 'External helper to safely decode function name from message (allows try/catch).',
          whyUse: 'Used by _lzReceive to safely extract function name without reverting entire transaction.',
          howItWorks: [
            'Decodes first element of ABI-encoded message',
            'Returns function name as string',
            'Can be called externally for debugging'
          ],
          parameters: [
            { name: '_message', type: 'bytes', description: 'ABI-encoded message' }
          ],
          accessControl: 'Public pure',
          events: ['None'],
          gasEstimate: 'N/A (pure)',
          example: `const message = ethers.AbiCoder.defaultAbiCoder().encode(
  ["string", "address", "uint256"],
  ["postJob", jobGiver, amount]
);
const functionName = await nativeBridge.decodeFunctionName(message);
console.log(functionName); // "postJob"`,
          relatedFunctions: ['_lzReceive']
        }
      ]
    },
    {
      category: 'Message Sending (Outbound)',
      description: 'Functions for sending messages to Main Chain and Local Chains',
      items: [
        {
          name: 'sendToMainChain',
          signature: 'sendToMainChain(string _functionName, bytes _payload, bytes _options) payable',
          whatItDoes: 'Sends a message to Main Chain (Base testnet / Ethereum mainnet) via LayerZero.',
          whyUse: 'Native contracts call this to sync rewards data or voting power to Main Chain.',
          howItWorks: [
            'Validates caller is authorized contract',
            'Calls LayerZero _lzSend() with mainChainEid',
            'Pays LayerZero fee from msg.value',
            'Refunds excess to caller',
            'Emits CrossChainMessageSent event'
          ],
          parameters: [
            { name: '_functionName', type: 'string', description: 'Function name for event logging' },
            { name: '_payload', type: 'bytes', description: 'ABI-encoded message payload' },
            { name: '_options', type: 'bytes', description: 'LayerZero options (gas limits, etc.)' }
          ],
          accessControl: 'onlyAuthorized - typically NOWJC',
          events: ['CrossChainMessageSent(functionName, mainChainEid, payload)'],
          gasEstimate: '~45K gas + LayerZero fee',
          example: `// NOWJC syncs rewards data to Main Chain
const payload = ethers.AbiCoder.defaultAbiCoder().encode(
  ["string", "address", "uint256"],
  ["syncClaimableRewards", userAddress, claimableAmount]
);

const lzOptions = ethers.solidityPacked(
  ['uint16', 'uint256'],
  [1, 200000]
);

await nativeBridge.sendToMainChain(
  "syncClaimableRewards",
  payload,
  lzOptions,
  { value: lzFee }
);`,
          relatedFunctions: ['quoteMainChain', 'sendSyncRewardsData', 'sendSyncVotingPower']
        },
        {
          name: 'sendToLocalChain',
          signature: 'sendToLocalChain(string _disputeId, string _functionName, bytes _payload, bytes _options) payable',
          whatItDoes: 'Sends message to specific Local Chain by extracting EID from dispute/job ID.',
          whyUse: 'Native Athena uses this to send dispute finalization results back to originating Local Chain.',
          howItWorks: [
            'Calls extractEidFromJobId() to parse dispute ID (format: "chainEid-jobNumber")',
            'Validates extracted EID is in authorizedLocalChains',
            'Sends message via LayerZero to that specific Local Chain',
            'Emits CrossChainMessageSent event'
          ],
          parameters: [
            { name: '_disputeId', type: 'string', description: 'Dispute/Job ID containing EID (e.g., "40232-57")' },
            { name: '_functionName', type: 'string', description: 'Function name for logging' },
            { name: '_payload', type: 'bytes', description: 'Message payload' },
            { name: '_options', type: 'bytes', description: 'LayerZero options' }
          ],
          accessControl: 'onlyAuthorized',
          events: ['CrossChainMessageSent(functionName, targetEid, payload)'],
          gasEstimate: '~50K gas + LayerZero fee',
          example: `// Native Athena finalizes dispute, sends to OP Sepolia
const disputeId = "40232-57"; // OP Sepolia EID: 40232

await nativeBridge.sendToLocalChain(
  disputeId,
  "finalizeDisputeWithVotes",
  payload,
  lzOptions,
  { value: lzFee }
);

// Bridge parses "40232" from ID, sends to OP`,
          relatedFunctions: ['extractEidFromJobId', 'quoteLocalChain']
        },
        {
          name: 'sendSyncRewardsData',
          signature: 'sendSyncRewardsData(address user, uint256 claimableAmount, bytes _options) payable',
          whatItDoes: 'Convenience function to sync user\'s claimable rewards to Main Chain.',
          whyUse: 'NOWJC calls this after calculating rewards to make them claimable on Main Chain.',
          howItWorks: [
            'Encodes payload with function name "syncClaimableRewards"',
            'Calls _lzSend() to mainChainEid',
            'Main Bridge receives and routes to Main Rewards',
            'Emits CrossChainMessageSent event'
          ],
          parameters: [
            { name: 'user', type: 'address', description: 'User address to sync' },
            { name: 'claimableAmount', type: 'uint256', description: 'OW tokens claimable (18 decimals)' },
            { name: '_options', type: 'bytes', description: 'LayerZero options' }
          ],
          accessControl: 'onlyAuthorized',
          events: ['CrossChainMessageSent("syncClaimableRewards", mainChainEid, payload)'],
          gasEstimate: '~45K gas + LayerZero fee',
          example: `// After job payment, sync rewards
await nativeBridge.sendSyncRewardsData(
  userAddress,
  ethers.parseEther("50"), // 50 OW tokens
  lzOptions,
  { value: lzFee }
);`,
          relatedFunctions: ['quoteSyncRewardsData', 'sendToMainChain']
        },
        {
          name: 'sendSyncVotingPower',
          signature: 'sendSyncVotingPower(address user, uint256 totalRewards, bytes _options) payable',
          whatItDoes: 'Syncs user\'s total earned rewards to Main Chain for voting power calculation.',
          whyUse: 'Users sync this before creating proposals or voting to ensure accurate voting power.',
          howItWorks: [
            'Encodes payload with "syncVotingPower"',
            'Sends to Main Chain',
            'Main DAO updates user\'s voting power',
            'Emits event'
          ],
          parameters: [
            { name: 'user', type: 'address', description: 'User to sync' },
            { name: 'totalRewards', type: 'uint256', description: 'Total earned OW tokens' },
            { name: '_options', type: 'bytes', description: 'LayerZero options' }
          ],
          accessControl: 'onlyAuthorized',
          events: ['CrossChainMessageSent("syncVotingPower", mainChainEid, payload)'],
          gasEstimate: '~45K gas + LayerZero fee',
          example: `// User syncs voting power before proposal
await nativeBridge.sendSyncVotingPower(
  userAddress,
  ethers.parseEther("1000"), // 1000 OW total earned
  lzOptions,
  { value: lzFee }
);`,
          relatedFunctions: ['quoteSyncVotingPower', 'sendToMainChain']
        }
      ]
    },
    {
      category: 'Fee Quoting',
      description: 'Functions for estimating LayerZero fees before sending messages',
      items: [
        {
          name: 'quoteMainChain',
          signature: 'quoteMainChain(bytes _payload, bytes _options) view returns (uint256 fee)',
          whatItDoes: 'Returns LayerZero fee for sending message to Main Chain.',
          whyUse: 'Check fee before calling sendToMainChain() to ensure sufficient msg.value.',
          howItWorks: [
            'Calls LayerZero _quote() with mainChainEid',
            'Returns nativeFee in wei',
            'View function, no gas cost'
          ],
          parameters: [
            { name: '_payload', type: 'bytes', description: 'Message payload to quote' },
            { name: '_options', type: 'bytes', description: 'LayerZero options' }
          ],
          accessControl: 'Public view',
          events: ['None (view)'],
          gasEstimate: 'N/A (view)',
          example: `const payload = ethers.AbiCoder.defaultAbiCoder().encode(
  ["string", "address", "uint256"],
  ["syncClaimableRewards", user, amount]
);

const fee = await nativeBridge.quoteMainChain(payload, lzOptions);
console.log("LayerZero fee:", ethers.formatEther(fee), "ETH");`,
          relatedFunctions: ['sendToMainChain', 'quoteSyncRewardsData']
        },
        {
          name: 'quoteLocalChain',
          signature: 'quoteLocalChain(string _disputeId, bytes _payload, bytes _options) view returns (uint256)',
          whatItDoes: 'Quotes fee for sending to Local Chain (extracts EID from dispute ID).',
          whyUse: 'Check fee before sending dispute finalization to Local Chain.',
          howItWorks: [
            'Extracts EID from _disputeId',
            'Validates chain is authorized',
            'Calls _quote() with extracted EID',
            'Returns fee'
          ],
          parameters: [
            { name: '_disputeId', type: 'string', description: 'Dispute ID with EID' },
            { name: '_payload', type: 'bytes', description: 'Message payload' },
            { name: '_options', type: 'bytes', description: 'LayerZero options' }
          ],
          accessControl: 'Public view',
          events: ['None (view)'],
          gasEstimate: 'N/A (view)',
          example: `const fee = await nativeBridge.quoteLocalChain(
  "40232-57", // OP Sepolia
  payload,
  lzOptions
);`,
          relatedFunctions: ['sendToLocalChain', 'extractEidFromJobId']
        },
        {
          name: 'quoteThreeChains',
          signature: 'quoteThreeChains(uint32 _dstEid1, uint32 _dstEid2, uint32 _dstEid3, bytes _payload1, bytes _payload2, bytes _payload3, bytes _options1, bytes _options2, bytes _options3) view returns (uint256 totalFee, uint256 fee1, uint256 fee2, uint256 fee3)',
          whatItDoes: 'Quotes cumulative fee for sending to three chains in one transaction.',
          whyUse: 'For batch operations like syncing data to multiple chains simultaneously.',
          howItWorks: [
            'Quotes fee for each destination separately',
            'Returns individual fees and total sum',
            'Useful for batch transactions'
          ],
          parameters: [
            { name: '_dstEid1', type: 'uint32', description: 'First destination EID' },
            { name: '_dstEid2', type: 'uint32', description: 'Second destination EID' },
            { name: '_dstEid3', type: 'uint32', description: 'Third destination EID' },
            { name: '_payload1', type: 'bytes', description: 'First message payload' },
            { name: '_payload2', type: 'bytes', description: 'Second message payload' },
            { name: '_payload3', type: 'bytes', description: 'Third message payload' },
            { name: '_options1', type: 'bytes', description: 'First message options' },
            { name: '_options2', type: 'bytes', description: 'Second message options' },
            { name: '_options3', type: 'bytes', description: 'Third message options' }
          ],
          accessControl: 'Public view',
          events: ['None (view)'],
          gasEstimate: 'N/A (view)',
          example: `const { totalFee, fee1, fee2, fee3 } = await nativeBridge.quoteThreeChains(
  opEid, ethEid, polyEid,
  payload1, payload2, payload3,
  options1, options2, options3
);
console.log("Total:", ethers.formatEther(totalFee));`,
          relatedFunctions: ['quoteMainChain', 'quoteLocalChain']
        }
      ]
    },
    {
      category: 'Upgrade Management',
      description: 'Functions for handling protocol upgrades from Main DAO',
      items: [
        {
          name: 'handleUpgradeContract',
          signature: 'handleUpgradeContract(address targetProxy, address newImplementation)',
          whatItDoes: 'Executes upgrade on a Native Chain contract.',
          whyUse: 'Called internally by _lzReceive when upgrade command arrives from Main DAO.',
          howItWorks: [
            'Validates addresses are not zero',
            'Calls upgradeFromDAO() on target proxy contract',
            'Target must implement IUpgradeable interface',
            'Emits UpgradeExecuted event'
          ],
          parameters: [
            { name: 'targetProxy', type: 'address', description: 'UUPS proxy to upgrade' },
            { name: 'newImplementation', type: 'address', description: 'New implementation address' }
          ],
          accessControl: 'Public - but only called via _lzReceive from Main DAO',
          events: ['UpgradeExecuted(targetProxy, newImplementation, mainChainEid)'],
          gasEstimate: '~100K gas',
          example: `// This is called automatically when Main DAO sends upgrade
// Main DAO → Main Bridge → LayerZero → Native Bridge → handleUpgradeContract`,
          relatedFunctions: ['_handleUpgradeMessage']
        },
        {
          name: '_handleUpgradeMessage',
          signature: '_handleUpgradeMessage(Origin _origin, bytes _message)',
          whatItDoes: 'Internal router for upgrade messages to specific contracts.',
          whyUse: 'Routes upgrade commands to correct Native contract (Athena, DAO, NOWJC).',
          howItWorks: [
            'Decodes targetProxy and newImplementation from message',
            'Checks if target is Native Athena, Native DAO, or NOWJC',
            'Calls upgradeFromDAO() on matched contract',
            'Reverts if target unknown',
            'Emits UpgradeExecuted event'
          ],
          parameters: [
            { name: '_origin', type: 'Origin', description: 'LayerZero origin' },
            { name: '_message', type: 'bytes', description: 'Upgrade message payload' }
          ],
          accessControl: 'Internal - called by _lzReceive',
          events: ['UpgradeExecuted(targetProxy, newImplementation, sourceChain)'],
          gasEstimate: '~95K gas',
          example: `// Internal routing:
// if (targetProxy == nativeAthena) → upgrade Athena
// else if (targetProxy == nativeDAO) → upgrade DAO
// else if (targetProxy == nowjc) → upgrade NOWJC`,
          relatedFunctions: ['handleUpgradeContract', '_lzReceive']
        }
      ]
    },
    {
      category: 'Utility Functions',
      description: 'Helper functions for ID parsing and contract management',
      items: [
        {
          name: 'extractEidFromJobId',
          signature: 'extractEidFromJobId(string jobId) pure returns (uint32)',
          whatItDoes: 'Parses chain EID from job/dispute ID format (chainEid-jobNumber).',
          whyUse: 'Used by sendToLocalChain() to determine which chain to send messages to.',
          howItWorks: [
            'Finds dash position in string',
            'Extracts numbers before dash',
            'Converts to uint32 EID',
            'Validates format and returns EID'
          ],
          parameters: [
            { name: 'jobId', type: 'string', description: 'Job or dispute ID (e.g., "40232-57")' }
          ],
          accessControl: 'Internal pure',
          events: ['None'],
          gasEstimate: 'N/A (pure)',
          example: `// Job posted on OP Sepolia (EID: 40232)
const jobId = "40232-57";
const eid = await nativeBridge.extractEidFromJobId(jobId);
console.log(eid); // 40232

// Used internally for routing`,
          relatedFunctions: ['sendToLocalChain', 'quoteLocalChain']
        }
      ]
    },
    {
      category: 'Admin Functions',
      description: 'Owner-only functions for contract configuration',
      items: [
        {
          name: 'authorizeContract',
          signature: 'authorizeContract(address _contract, bool _authorized)',
          whatItDoes: 'Grants or revokes bridge access for Native contracts.',
          whyUse: 'Owner authorizes NOWJC, Native Athena, etc. to use bridge functions.',
          howItWorks: [
            'Sets authorizedContracts[_contract] = _authorized',
            'Emits ContractAuthorized event',
            'Authorized contracts can call bridge functions'
          ],
          parameters: [
            { name: '_contract', type: 'address', description: 'Contract to authorize' },
            { name: '_authorized', type: 'bool', description: 'true to authorize, false to revoke' }
          ],
          accessControl: 'onlyOwner',
          events: ['ContractAuthorized(contractAddress, authorized)'],
          gasEstimate: '~30K gas',
          example: `// Authorize NOWJC to use bridge
await nativeBridge.authorizeContract(nowjcAddress, true);`,
          relatedFunctions: ['setNativeOpenWorkJobContract']
        },
        {
          name: 'setNativeOpenWorkJobContract',
          signature: 'setNativeOpenWorkJobContract(address _nativeOpenWorkJob)',
          whatItDoes: 'Sets NOWJC address for message routing.',
          whyUse: 'Owner configures which contract receives job-related messages.',
          howItWorks: [
            'Sets nativeOpenWorkJobContract address',
            'Used by _lzReceive for routing',
            'Emits ContractAddressSet event'
          ],
          parameters: [
            { name: '_nativeOpenWorkJob', type: 'address', description: 'NOWJC address' }
          ],
          accessControl: 'onlyOwner',
          events: ['ContractAddressSet("nativeOpenWorkJob", address)'],
          gasEstimate: '~30K gas',
          example: `await nativeBridge.setNativeOpenWorkJobContract(nowjcAddress);`,
          relatedFunctions: ['setNativeAthenaContract', 'setNativeDaoContract']
        },
        {
          name: 'updateMainChainEid',
          signature: 'updateMainChainEid(uint32 _mainChainEid)',
          whatItDoes: 'Updates Main Chain endpoint ID.',
          whyUse: 'If moving from Base Sepolia (testnet) to Ethereum (mainnet).',
          howItWorks: [
            'Sets mainChainEid',
            'Affects all sendToMainChain() calls',
            'Emits ChainEndpointUpdated event'
          ],
          parameters: [
            { name: '_mainChainEid', type: 'uint32', description: 'New Main Chain EID' }
          ],
          accessControl: 'onlyOwner',
          events: ['ChainEndpointUpdated("main", newEid)'],
          gasEstimate: '~30K gas',
          example: `// Switch from Base Sepolia to Ethereum mainnet
await nativeBridge.updateMainChainEid(ethereumMainnetEid);`,
          relatedFunctions: ['sendToMainChain']
        }
      ]
    }
  ],
  
  dataFlows: [
    {
      title: 'Complete Job Posting Flow',
      description: 'Cross-chain job posting from Local to Native',
      steps: [
        { chain: 'OP Sepolia', action: '1. User posts job via LOWJC with payment' },
        { chain: 'OP Sepolia', action: '2. USDC sent to Native chain via CCTP' },
        { chain: 'OP Sepolia', action: '3. LOWJC calls Local Bridge with job data' },
        { chain: 'OP Sepolia', action: '4. Local Bridge sends LayerZero message' },
        { chain: 'Arbitrum', action: '5. LayerZero calls Native Bridge._lzReceive()' },
        { chain: 'Arbitrum', action: '6. Native Bridge decodes "postJob" function' },
        { chain: 'Arbitrum', action: '7. Routes to NOWJC.postJob()' },
        { chain: 'Arbitrum', action: '8. NOWJC stores job in OpenworkGenesis' },
        { chain: 'Arbitrum', action: '9. Job now visible on all chains' }
      ]
    },
    {
      title: 'Dispute Resolution Flow',
      description: 'Dispute raised, voted, and finalized across chains',
      steps: [
        { chain: 'OP Sepolia', action: '1. User raises dispute via Athena Client' },
        { chain: 'OP Sepolia', action: '2. Local Bridge sends to Native Bridge' },
        { chain: 'Arbitrum', action: '3. Native Bridge routes to Native Athena' },
        { chain: 'Arbitrum', action: '4. Native Athena creates dispute, opens voting' },
        { chain: 'Arbitrum', action: '5. Oracle members vote on dispute' },
        { chain: 'Arbitrum', action: '6. Native Athena finalizes dispute' },
        { chain: 'Arbitrum', action: '7. Native Athena calls Native Bridge.sendToLocalChain()' },
        { chain: 'Arbitrum', action: '8. Bridge extracts EID from dispute ID' },
        { chain: 'Arbitrum', action: '9. Sends finalization to OP Local Bridge' },
        { chain: 'OP Sepolia', action: '10. Athena Client updates dispute status' }
      ]
    },
    {
      title: 'Rewards Sync Flow',
      description: 'Syncing claimable tokens from Native to Main',
      steps: [
        { chain: 'Arbitrum', action: '1. User completes job, earns rewards' },
        { chain: 'Arbitrum', action: '2. Native Rewards calculates claimable tokens' },
        { chain: 'Arbitrum', action: '3. User calls NOWJC.syncRewardsData()' },
        { chain: 'Arbitrum', action: '4. NOWJC calls Native Bridge.sendSyncRewardsData()' },
        { chain: 'Arbitrum', action: '5. Bridge sends LayerZero message to Main Chain' },
        { chain: 'Base/Ethereum', action: '6. Main Bridge receives message' },
        { chain: 'Base/Ethereum', action: '7. Routes to Main Rewards' },
        { chain: 'Base/Ethereum', action: '8. Updates user claimable balance' },
        { chain: 'Base/Ethereum', action: '9. User can claim OW tokens' }
      ]
    },
    {
      title: 'Upgrade Command Flow',
      description: 'Main DAO upgrading Native contract',
      steps: [
        { chain: 'Base/Ethereum', action: '1. Main DAO proposal passes' },
        { chain: 'Base/Ethereum', action: '2. Main DAO calls Main Bridge.sendUpgradeCommand()' },
        { chain: 'Base/Ethereum', action: '3. Main Bridge sends LayerZero message' },
        { chain: 'Arbitrum', action: '4. Native Bridge._lzReceive() receives message' },
        { chain: 'Arbitrum', action: '5. Routes to _handleUpgradeMessage()' },
        { chain: 'Arbitrum', action: '6. Identifies target contract (e.g., Native Athena)' },
        { chain: 'Arbitrum', action: '7. Calls Native Athena.upgradeFromDAO()' },
        { chain: 'Arbitrum', action: '8. Native Athena upgrades to new implementation' },
        { chain: 'Arbitrum', action: '9. Emits UpgradeExecuted event' }
      ]
    }
  ],
  
  integrationGuide: {
    example: `// Native Bridge Integration Example
const { ethers } = require('ethers');

// 1. Setup
const nativeBridge = new ethers.Contract(
  nativeBridgeAddress,
  nativeBridgeABI,
  signer
);

// 2. ADMIN: Add new Local Chain
await nativeBridge.addLocalChain(40267); // Polygon Sepolia

// 3. ADMIN: Configure Native contracts
await nativeBridge.setNativeOpenWorkJobContract(nowjcAddress);
await nativeBridge.setNativeAthenaContract(nativeAthenaAddress);
await nativeBridge.authorizeContract(nowjcAddress, true);

// 4. NOWJC: Send rewards sync to Main Chain
const payload = ethers.AbiCoder.defaultAbiCoder().encode(
  ["string", "address", "uint256"],
  ["syncClaimableRewards", userAddress, claimableAmount]
);

const lzOptions = ethers.solidityPacked(['uint16', 'uint256'], [1, 200000]);
const fee = await nativeBridge.quoteMainChain(payload, lzOptions);

await nativeBridge.sendToMainChain(
  "syncClaimableRewards",
  payload,
  lzOptions,
  { value: fee }
);

// 5. Native Athena: Send dispute finalization to Local Chain
const disputeId = "40232-57"; // OP Sepolia
const disputePayload = ethers.AbiCoder.defaultAbiCoder().encode(
  ["string", "string", "bool", "uint256", "uint256", "address[]", "address[]", "uint256[]", "bool[]"],
  ["finalizeDisputeWithVotes", disputeId, true, votesFor, votesAgainst, voters, claimAddrs, powers, directions]
);

const localFee = await nativeBridge.quoteLocalChain(disputeId, disputePayload, lzOptions);

await nativeBridge.sendToLocalChain(
  disputeId,
  "finalizeDisputeWithVotes",
  disputePayload,
  lzOptions,
  { value: localFee }
);

// 6. Check authorized Local Chains
const chains = await nativeBridge.getLocalChains();
console.log("Authorized chains:", chains);`,
    tips: [
      'Native Bridge is the central hub - all cross-chain messages flow through it',
      'Add Local Chains via addLocalChain() before they can send messages',
      'Authorize Native contracts before they can use bridge functions',
      'Use quoting functions to estimate LayerZero fees accurately',
      'Job/Dispute IDs format: "chainEid-jobNumber" for automatic routing',
      'Main Chain is Base Sepolia (testnet) or Ethereum (mainnet)',
      'LayerZero options format: [version(uint16), gas(uint256)]',
      'Bridge automatically refunds excess msg.value',
      'Monitor CrossChainMessageReceived events for debugging',
      'Use extractEidFromJobId() to understand routing logic',
      'Upgrade commands must come from Main DAO via Main Bridge',
      'Each Native contract must implement upgradeFromDAO() for upgrades'
    ]
  },
  
  deployConfig: {
    type: 'standard',
    constructor: [
      {
        name: '_endpoint',
        type: 'address',
        description: 'LayerZero V2 Endpoint address on Arbitrum (core messaging protocol)',
        placeholder: '0x6EDCE65403992e310A62460808c4b910D972f10f'
      },
      {
        name: '_owner',
        type: 'address',
        description: 'Contract owner address (admin who manages chains and configurations)',
        placeholder: '0x...'
      },
      {
        name: '_mainChainEid',
        type: 'uint32',
        description: 'LayerZero Endpoint ID for Main Chain (Base Sepolia: 40245, Ethereum: 30101)',
        placeholder: '40245'
      }
    ],
    networks: {
      testnet: {
        name: 'Arbitrum Sepolia',
        chainId: 421614,
        rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
        explorer: 'https://sepolia.arbiscan.io',
        currency: 'ETH'
      }
    },
    estimatedGas: '3.5M',
    postDeploy: {
      message: 'Standard deployment complete! Configure bridge before use.',
      nextSteps: [
        '1. Deploy NativeBridge with constructor parameters:',
        '   - LayerZero Endpoint: 0x6EDCE65403992e310A62460808c4b910D972f10f',
        '   - Owner: your admin wallet',
        '   - Main Chain EID: 40245 (Base Sepolia)',
        '2. Add Local Chains via addLocalChain():',
        '   - OP Sepolia: 40232',
        '   - Ethereum Sepolia: 40161',
        '   - Polygon Amoy: 40267',
        '   - Base Sepolia: 40245',
        '3. Set Native contract addresses:',
        '   - setNativeOpenWorkJobContract(nowjcAddress)',
        '   - setNativeAthenaContract(nativeAthenaAddress)',
        '   - setNativeDaoContract(nativeDaoAddress)',
        '   - setProfileManager(profileManagerAddress)',
        '   - setOracleManager(oracleManagerAddress)',
        '4. Authorize contracts to use bridge:',
        '   - authorizeContract(nowjcAddress, true)',
        '   - authorizeContract(nativeAthenaAddress, true)',
        '5. Configure LayerZero peers on this contract:',
        '   - setPeer(mainChainEid, mainBridgeAddress)',
        '   - setPeer(opSepoliaEid, opBridgeAddress)',
        '   - setPeer(ethSepoliaEid, ethBridgeAddress)',
        '6. Verify contract on Arbiscan',
        '7. Test message routing from Local Chain',
        '8. Test rewards sync to Main Chain'
      ]
    }
  },
  
  securityConsiderations: [
    'Non-upgradeable: LayerZero OApp pattern, cannot upgrade bridge itself',
    'Owner controls: Chain management, contract addresses, authorizations',
    'Authorization required: Only authorized contracts can send messages',
    'LayerZero security: Relies on LayerZero V2 DVN network for message verification',
    'Message validation: Decodes and validates function names before routing',
    'EID validation: Checks Local Chains are authorized before accepting messages',
    'Upgrade routing: Only routes upgrades to known contracts (Athena, DAO, NOWJC)',
    'Fee handling: Requires sufficient msg.value, refunds excess',
    'Single point: All cross-chain communication flows through this bridge',
    'No token holding: Bridge never holds user funds (only passes messages)',
    'Event logging: Complete audit trail of all messages',
    'Revert on unknown: Rejects messages with unrecognized function names'
  ],
  
  code: `// Full implementation: contracts/openwork-full-contract-suite-layerzero+CCTP 2 Dec/native-bridge.sol

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { OAppSender, MessagingFee } from "@layerzerolabs/oapp-evm/contracts/oapp/OAppSender.sol";
import { OAppReceiver } from "@layerzerolabs/oapp-evm/contracts/oapp/OAppReceiver.sol";
import { OAppCore } from "@layerzerolabs/oapp-evm/contracts/oapp/OAppCore.sol";
import { Origin } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";

contract NativeChainBridge is OAppSender, OAppReceiver {
    
    // ==================== STATE VARIABLES ====================
    mapping(address => bool) public authorizedContracts;
    address public nativeDaoContract;
    address public nativeAthenaContract;
    address public nativeOpenWorkJobContract;
    address public profileManager;
    
    mapping(uint32 => bool) public authorizedLocalChains;
    uint32[] public localChainEids;
    uint32 public mainChainEid;

    // ==================== INITIALIZATION ====================
    constructor(
        address _endpoint,
        address _owner,
        uint32 _mainChainEid
    ) OAppCore(_endpoint, _owner) Ownable(_owner) {
        mainChainEid = _mainChainEid;
    }

    // ==================== MESSAGE ROUTING ====================
    function _lzReceive(
        Origin calldata _origin,
        bytes32,
        bytes calldata _message,
        address,
        bytes calldata
    ) internal override {
        string memory functionName;
        (functionName) = abi.decode(_message, (string));

        // Route messages to appropriate contracts based on function name
        if (keccak256(bytes(functionName)) == keccak256(bytes("postJob"))) {
            (, string memory jobId, address jobGiver, string memory jobDetailHash, string[] memory descriptions, uint256[] memory amounts) = abi.decode(_message, (string, string, address, string, string[], uint256[]));
            INativeOpenWorkJobContract(nativeOpenWorkJobContract).postJob(jobId, jobGiver, jobDetailHash, descriptions, amounts);
        }
        else if (keccak256(bytes(functionName)) == keccak256(bytes("raiseDispute"))) {
            (, string memory jobId, string memory disputeHash, string memory oracleName, uint256 fee, uint256 disputedAmount, address disputeRaiser) = abi.decode(_message, (string, string, string, string, uint256, uint256, address));
            INativeAthena(nativeAthenaContract).handleRaiseDispute(jobId, disputeHash, oracleName, fee, disputedAmount, disputeRaiser);
        }
        else if (keccak256(bytes(functionName)) == keccak256(bytes("updateStakeData"))) {
            (, address staker, uint256 amount, uint256 unlockTime, uint256 durationMinutes, bool isActive) = abi.decode(_message, (string, address, uint256, uint256, uint256, bool));
            INativeDAO(nativeDaoContract).updateStakeData(staker, amount, unlockTime, durationMinutes, isActive);
        }
        else if (keccak256(bytes(functionName)) == keccak256(bytes("incrementGovernanceAction"))) {
            (, address user) = abi.decode(_message, (string, address));
            INativeOpenWorkJobContract(nativeOpenWorkJobContract).incrementGovernanceAction(user);
        }
        else if (keccak256(bytes(functionName)) == keccak256(bytes("upgradeFromDAO"))) {
            (, address targetProxy, address newImplementation) = abi.decode(_message, (string, address, address));
            IUpgradeable(targetProxy).upgradeFromDAO(newImplementation);
        }
        else {
            revert("Unknown function");
        }

        emit CrossChainMessageReceived(functionName, _origin.srcEid, _message);
    }

    // ==================== SENDING FUNCTIONS ====================
    function sendToMainChain(
        string memory _functionName,
        bytes memory _payload,
        bytes calldata _options
    ) external payable onlyAuthorized {
        _lzSend(
            mainChainEid,
            _payload,
            _options,
            MessagingFee(msg.value, 0),
            payable(msg.sender)
        );
        
        emit CrossChainMessageSent(_functionName, mainChainEid, _payload);
    }

    function sendSyncRewardsData(
        address user,
        uint256 claimableAmount,
        bytes calldata _options
    ) external payable onlyAuthorized {
        bytes memory payload = abi.encode(
            "syncClaimableRewards",
            user,
            claimableAmount
        );
        
        _lzSend(mainChainEid, payload, _options, MessagingFee(msg.value, 0), payable(msg.sender));
        emit CrossChainMessageSent("syncClaimableRewards", mainChainEid, payload);
    }

    function sendSyncVotingPower(
        address user,
        uint256 totalRewards,
        bytes calldata _options
    ) external payable onlyAuthorized {
        bytes memory payload = abi.encode(
            "syncVotingPower",
            user,
            totalRewards
        );
        
        _lzSend(mainChainEid, payload, _options, MessagingFee(msg.value, 0), payable(msg.sender));
        emit CrossChainMessageSent("syncVotingPower", mainChainEid, payload);
    }

    // ==================== LOCAL CHAIN MANAGEMENT ====================
    function addLocalChain(uint32 _localChainEid) external onlyOwner {
        require(!authorizedLocalChains[_localChainEid], "Already authorized");
        authorizedLocalChains[_localChainEid] = true;
        localChainEids.push(_localChainEid);
        emit LocalChainAdded(_localChainEid);
    }

    // ... Quote functions and admin functions
    // See full implementation in repository
}`
};
