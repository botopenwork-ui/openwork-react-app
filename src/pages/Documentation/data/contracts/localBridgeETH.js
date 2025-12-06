export const localBridgeETH = {
  id: 'localBridgeETH',
  name: 'Local Bridge',
  chain: 'eth',
  column: 'eth-main',
  order: 2,
  status: 'testnet',
  version: 'v1.0.0',
  gas: '65K',
  mainnetNetwork: 'Ethereum Mainnet',
  testnetNetwork: 'Ethereum Sepolia',
  mainnetDeployed: 'Not deployed',
  testnetDeployed: 'Deployed',
  mainnetAddress: null,
  testnetAddress: '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12', // Placeholder
  tvl: 'N/A',
  docs: 'Local Bridge on Ethereum Sepolia - LayerZero OApp connecting Local Chain contracts (LOWJC, Athena Client) to Native and Main Chains. Sends user operations to Native, receives dispute results, and handles upgrades from Main DAO.',
  
  overview: {
    purpose: 'Local Bridge is the communication gateway for Ethereum Sepolia in OpenWork\'s three-tier architecture. It connects Local Chain user-facing contracts (LOWJC for jobs, Athena Client for disputes) to the Native Chain (Arbitrum) for execution and the Main Chain (Base/Ethereum) for governance. When users post jobs or raise disputes on Ethereum, LOWJC and Athena Client send messages through this bridge to Native Bridge, which routes them to Native contracts. This bridge also receives dispute finalization results from Native Chain and upgrade commands from Main Chain. The same contract code is deployed on multiple Local Chains (Ethereum, Polygon, Base, etc.), with only chain-specific configuration differing.',
    tier: 'Local Chain (Ethereum Sepolia)',
    category: 'Bridge Infrastructure - User Gateway',
    upgradeability: 'Non-upgradeable (LayerZero OApp)'
  },
  
  features: [
    'User gateway: Connects Ethereum users to Native execution layer',
    'Bidirectional routing: Sends operations TO Native, receives results FROM Native',
    'Job operations: LOWJC → Local Bridge → Native Bridge → NOWJC',
    'Dispute operations: Athena Client → Local Bridge → Native Bridge → Native Athena',
    'Dispute finalization: Native Athena → Native Bridge → Local Bridge → Athena Client',
    'Upgrade receiver: Receives upgrade commands from Main DAO via Main/Native bridges',
    'Batch sending: Can send to Native + Main simultaneously (sendToTwoChains)',
    'Chain identification: Stores thisLocalChainEid (40161 for Ethereum Sepolia)',
    'Athena Client routing: Routes dispute finalization to Athena Client',
    'LOWJC routing: Configured for future LOWJC updates',
    'Fee quoting: LayerZero fee estimation for Native and Main',
    'Multi-chain deployment: Same contract on OP, Ethereum, Polygon, Base, etc.'
  ],
  
  systemPosition: {
    description: 'Local Bridge (Ethereum) sits at the user-facing tier of OpenWork\'s three-tier architecture. Users on Ethereum Sepolia interact with LOWJC (job posting) and Athena Client (dispute raising), which send cross-chain messages through this bridge. The bridge forwards job operations to Native Bridge on Arbitrum, which routes them to NOWJC and Native Athena for execution. When disputes are finalized on Native Chain, Native Bridge sends results back through this Local Bridge to Athena Client on Ethereum. Main DAO can also send upgrade commands to this bridge to upgrade Athena Client or LOWJC. This bridge is one instance of an identical contract deployed on multiple Local Chains.',
    diagram: `
📍 Local Bridge (Ethereum) in Three-Tier Architecture

┌─────────────────────────────────────────────────────────┐
│  TIER 1: LOCAL CHAINS (User-Facing)                     │
│  Ethereum Sepolia ⭐ (YOU ARE HERE)                           │
├─────────────────────────────────────────────────────────┤
│  • LOWJC (job interface)                                │
│  • Athena Client (dispute interface)                    │
│  • ⭐ Local Bridge ⭐ (message gateway)                 │
│     ↓ Sends to Native Chain:                            │
│     ├─> Job operations                                  │
│     └─> Dispute operations                              │
│     ↑ Receives from Native Chain:                       │
│     └─> Dispute finalization                            │
└───────────────────────┬─────────────────────────────────┘
                        │ LayerZero Messages
                        ↓
┌─────────────────────────────────────────────────────────┐
│  TIER 2: NATIVE CHAIN (Execution Hub)                   │
│  Arbitrum Sepolia                                        │
├─────────────────────────────────────────────────────────┤
│  • Native Bridge (central router)                       │
│  • NOWJC (job execution)                                │
│  • Native Athena (dispute resolution)                   │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────────┐
│  TIER 3: MAIN CHAIN (Governance)                        │
│  Base Sepolia / Ethereum                                │
├─────────────────────────────────────────────────────────┤
│  • Main Bridge (governance hub)                         │
│  • Main DAO (sends upgrade commands)                    │
└─────────────────────────────────────────────────────────┘

Message Flow Examples:

1. Job Posting (User → Execution):
   User → LOWJC (Ethereum) → Local Bridge (Ethereum) → Native Bridge → NOWJC

2. Dispute Raising (User → Resolution):
   User → Athena Client (Ethereum) → Local Bridge (Ethereum) → Native Bridge → Native Athena

3. Dispute Finalization (Result → User):
   Native Athena → Native Bridge → Local Bridge (Ethereum) → Athena Client (Ethereum)

4. Upgrade Command (Governance → Local):
   Main DAO → Main Bridge → Local Bridge (Ethereum) → Athena Client (Ethereum)

5. Multi-Chain Deployment:
   Same contract on: OP Sepolia, Ethereum Sepolia, Polygon, Base, etc.
   Only chain-specific config differs (thisLocalChainEid, addresses)`
  },
  
  dependencies: {
    dependsOn: [
      { 
        name: 'LayerZero V2 Endpoint', 
        reason: 'Core messaging protocol for cross-chain communication. Local Bridge extends OAppSender and OAppReceiver.',
        type: 'Infrastructure'
      },
      { 
        name: 'Native Bridge', 
        reason: 'Receives messages FROM Local Bridge (job/dispute operations). Sends results TO Local Bridge (dispute finalization).',
        type: 'Bridge'
      },
      { 
        name: 'Main Bridge', 
        reason: 'Sends upgrade commands to Local Bridge (via LayerZero).',
        type: 'Bridge'
      }
    ],
    requiredBy: [
      { 
        name: 'LOWJC (Ethereum)', 
        reason: 'Sends job operations through Local Bridge to Native Chain. Receives updates from Main DAO.',
        type: 'Job Management'
      },
      { 
        name: 'Athena Client (Ethereum)', 
        reason: 'Sends dispute operations through Local Bridge. Receives dispute finalization results.',
        type: 'Dispute Resolution'
      },
      { 
        name: 'Native Bridge', 
        reason: 'Receives all Local Chain operations from this bridge.',
        type: 'Bridge'
      }
    ],
    prerequisites: [
      'LayerZero V2 Endpoint deployed on Ethereum Sepolia',
      'Native Chain EID configured (Arbitrum Sepolia)',
      'Main Chain EID configured (Base Sepolia)',
      'thisLocalChainEid set to 40161 (Ethereum Sepolia)',
      'Athena Client address configured',
      'LOWJC address configured (optional)',
      'LOWJC and Athena Client authorized via authorizeContract()',
      'LayerZero peers configured for Native and Main chains'
    ]
  },
  
  functions: [
    {
      category: 'Inbound Message Handling',
      description: 'Receiving and routing messages from Native and Main Chains',
      items: [
        {
          name: '_lzReceive',
          signature: '_lzReceive(Origin _origin, bytes32 _guid, bytes _message, address _executor, bytes _extraData)',
          whatItDoes: 'LayerZero callback that routes incoming messages to Athena Client or handles upgrades.',
          whyUse: 'Automatically called by LayerZero when Native/Main send messages. Routes to appropriate Local contracts.',
          howItWorks: [
            'Decodes function name from message',
            'Routes "finalizeDisputeWithVotes" to Athena Client',
            'Routes "upgradeFromDAO" to _handleUpgradeMessage()',
            'Emits CrossChainMessageReceived event',
            'Reverts on unknown function names'
          ],
          parameters: [
            { name: '_origin', type: 'Origin', description: 'LayerZero origin with source chain EID' },
            { name: '_guid', type: 'bytes32', description: 'Unique message identifier' },
            { name: '_message', type: 'bytes', description: 'ABI-encoded message payload' },
            { name: '_executor', type: 'address', description: 'LayerZero executor' },
            { name: '_extraData', type: 'bytes', description: 'Extra data' }
          ],
          accessControl: 'Internal - only LayerZero Endpoint',
          events: ['CrossChainMessageReceived(functionName, sourceChain, data)'],
          gasEstimate: '50K - 150K gas',
          example: `// Called automatically when Native sends dispute result
// Native Athena → Native Bridge → LayerZero → Local Bridge._lzReceive()
// → Routes to Athena Client.handleFinalizeDisputeWithVotes()`,
          relatedFunctions: ['_handleUpgradeMessage', '_handleAthenaMessage']
        },
        {
          name: '_handleUpgradeMessage',
          signature: '_handleUpgradeMessage(Origin _origin, bytes _message)',
          whatItDoes: 'Internal handler for upgrade commands from Main DAO.',
          whyUse: 'Executes upgrades on Athena Client or LOWJC when Main DAO sends command.',
          howItWorks: [
            'Decodes targetProxy and newImplementation',
            'Calls upgradeFromDAO() on target contract',
            'No validation (trusts Main DAO)',
            'Emits UpgradeExecuted event'
          ],
          parameters: [
            { name: '_origin', type: 'Origin', description: 'LayerZero origin' },
            { name: '_message', type: 'bytes', description: 'Upgrade message payload' }
          ],
          accessControl: 'Internal - called by _lzReceive',
          events: ['UpgradeExecuted(targetProxy, newImplementation, sourceChain)'],
          gasEstimate: '~95K gas',
          example: `// Main DAO upgrades Athena Client on Ethereum
// Main DAO → Main Bridge → LayerZero → Local Bridge
// → _handleUpgradeMessage() → Athena Client.upgradeFromDAO()`,
          relatedFunctions: ['_lzReceive']
        }
      ]
    },
    {
      category: 'Outbound Message Sending',
      description: 'Sending messages to Native and Main Chains',
      items: [
        {
          name: 'sendToNativeChain',
          signature: 'sendToNativeChain(string _functionName, bytes _payload, bytes _options) payable',
          whatItDoes: 'Sends message to Native Chain (Arbitrum) via LayerZero.',
          whyUse: 'LOWJC and Athena Client call this to send operations to Native Chain.',
          howItWorks: [
            'Validates caller is authorized (LOWJC or Athena Client)',
            'Calls LayerZero _lzSend() with nativeChainEid',
            'Pays fee from msg.value, refunds excess',
            'Emits CrossChainMessageSent event'
          ],
          parameters: [
            { name: '_functionName', type: 'string', description: 'Function name for logging' },
            { name: '_payload', type: 'bytes', description: 'ABI-encoded message' },
            { name: '_options', type: 'bytes', description: 'LayerZero options' }
          ],
          accessControl: 'onlyAuthorized (LOWJC, Athena Client)',
          events: ['CrossChainMessageSent(functionName, nativeChainEid, payload)'],
          gasEstimate: '~45K gas + LayerZero fee',
          example: `// LOWJC posts job to Native Chain
const payload = ethers.AbiCoder.defaultAbiCoder().encode(
  ["string", "string", "address", "string", "string[]", "uint256[]"],
  ["postJob", jobId, jobGiver, jobDetailHash, descriptions, amounts]
);

await localBridge.sendToNativeChain(
  "postJob",
  payload,
  lzOptions,
  { value: fee }
);`,
          relatedFunctions: ['quoteNativeChain', 'sendToTwoChains']
        },
        {
          name: 'sendToMainChain',
          signature: 'sendToMainChain(string _functionName, bytes _payload, bytes _options) payable',
          whatItDoes: 'Sends message to Main Chain (Base/Ethereum) via LayerZero.',
          whyUse: 'For direct communication with Main Chain (rarely used, mostly via Native).',
          howItWorks: [
            'Validates caller is authorized',
            'Sends to mainChainEid',
            'Pays fee, refunds excess',
            'Emits event'
          ],
          parameters: [
            { name: '_functionName', type: 'string', description: 'Function name' },
            { name: '_payload', type: 'bytes', description: 'Message payload' },
            { name: '_options', type: 'bytes', description: 'LayerZero options' }
          ],
          accessControl: 'onlyAuthorized',
          events: ['CrossChainMessageSent(functionName, mainChainEid, payload)'],
          gasEstimate: '~45K gas + LayerZero fee',
          example: `// Direct message to Main Chain (uncommon)
await localBridge.sendToMainChain(
  "someFunction",
  payload,
  lzOptions,
  { value: fee }
);`,
          relatedFunctions: ['sendToNativeChain', 'quoteMainChain']
        },
        {
          name: 'sendToTwoChains',
          signature: 'sendToTwoChains(string _functionName, bytes _mainChainPayload, bytes _nativePayload, bytes _mainChainOptions, bytes _nativeOptions) payable',
          whatItDoes: 'Sends messages to both Main and Native chains in one transaction.',
          whyUse: 'Batch efficiency when operation needs to notify both chains.',
          howItWorks: [
            'Quotes fees for both chains upfront',
            'Validates total fee provided',
            'Sends to Main Chain',
            'Sends to Native Chain',
            'Refunds excess',
            'Emits two events'
          ],
          parameters: [
            { name: '_functionName', type: 'string', description: 'Function name' },
            { name: '_mainChainPayload', type: 'bytes', description: 'Main Chain payload' },
            { name: '_nativePayload', type: 'bytes', description: 'Native Chain payload' },
            { name: '_mainChainOptions', type: 'bytes', description: 'Main Chain options' },
            { name: '_nativeOptions', type: 'bytes', description: 'Native Chain options' }
          ],
          accessControl: 'onlyAuthorized',
          events: ['CrossChainMessageSent (x2)'],
          gasEstimate: '~80K gas + LayerZero fees',
          example: `// Send to both chains simultaneously
const { totalFee } = await localBridge.quoteTwoChains(
  mainPayload, nativePayload,
  mainOptions, nativeOptions
);

await localBridge.sendToTwoChains(
  "batchUpdate",
  mainPayload, nativePayload,
  mainOptions, nativeOptions,
  { value: totalFee }
);`,
          relatedFunctions: ['quoteTwoChains', 'sendToSpecificChain']
        },
        {
          name: 'sendToSpecificChain',
          signature: 'sendToSpecificChain(string _functionName, uint32 _dstEid, bytes _payload, bytes _options) payable',
          whatItDoes: 'Sends message to any chain by EID (flexible routing).',
          whyUse: 'For operations to chains not covered by specific functions.',
          howItWorks: [
            'Accepts destination EID as parameter',
            'Flexible routing',
            'Used for special cases'
          ],
          parameters: [
            { name: '_functionName', type: 'string', description: 'Function name' },
            { name: '_dstEid', type: 'uint32', description: 'Destination EID' },
            { name: '_payload', type: 'bytes', description: 'Message payload' },
            { name: '_options', type: 'bytes', description: 'LayerZero options' }
          ],
          accessControl: 'onlyAuthorized',
          events: ['CrossChainMessageSent(functionName, dstEid, payload)'],
          gasEstimate: '~45K gas + LayerZero fee',
          example: `// Send to custom destination
await localBridge.sendToSpecificChain(
  "customFunction",
  customEid,
  payload,
  lzOptions,
  { value: fee }
);`,
          relatedFunctions: ['quoteSpecificChain']
        }
      ]
    },
    {
      category: 'Fee Quoting',
      description: 'Estimate LayerZero fees before sending',
      items: [
        {
          name: 'quoteNativeChain',
          signature: 'quoteNativeChain(bytes _payload, bytes _options) view returns (uint256 fee)',
          whatItDoes: 'Returns LayerZero fee for sending to Native Chain.',
          whyUse: 'LOWJC/Athena Client check fee before sending operations.',
          howItWorks: [
            'Calls _quote() with nativeChainEid',
            'Returns fee in wei',
            'View function, no gas cost'
          ],
          parameters: [
            { name: '_payload', type: 'bytes', description: 'Message payload' },
            { name: '_options', type: 'bytes', description: 'LayerZero options' }
          ],
          accessControl: 'Public view',
          events: ['None (view)'],
          gasEstimate: 'N/A (view)',
          example: `const fee = await localBridge.quoteNativeChain(payload, lzOptions);
console.log("LayerZero fee:", ethers.formatEther(fee));`,
          relatedFunctions: ['sendToNativeChain']
        },
        {
          name: 'quoteMainChain',
          signature: 'quoteMainChain(bytes _payload, bytes _options) view returns (uint256 fee)',
          whatItDoes: 'Returns LayerZero fee for sending to Main Chain.',
          whyUse: 'Check fee before sendToMainChain().',
          howItWorks: [
            'Calls _quote() with mainChainEid',
            'Returns fee in wei'
          ],
          parameters: [
            { name: '_payload', type: 'bytes', description: 'Message payload' },
            { name: '_options', type: 'bytes', description: 'LayerZero options' }
          ],
          accessControl: 'Public view',
          events: ['None (view)'],
          gasEstimate: 'N/A (view)',
          example: `const fee = await localBridge.quoteMainChain(payload, lzOptions);`,
          relatedFunctions: ['sendToMainChain']
        },
        {
          name: 'quoteTwoChains',
          signature: 'quoteTwoChains(bytes _mainChainPayload, bytes _nativePayload, bytes _mainChainOptions, bytes _nativeOptions) view returns (uint256 totalFee, uint256 mainChainFee, uint256 nativeFee)',
          whatItDoes: 'Quotes cumulative fee for sending to both chains.',
          whyUse: 'Get total fee before batch operation.',
          howItWorks: [
            'Quotes both chains',
            'Returns individual and total fees'
          ],
          parameters: [
            { name: '_mainChainPayload', type: 'bytes', description: 'Main payload' },
            { name: '_nativePayload', type: 'bytes', description: 'Native payload' },
            { name: '_mainChainOptions', type: 'bytes', description: 'Main options' },
            { name: '_nativeOptions', type: 'bytes', description: 'Native options' }
          ],
          accessControl: 'Public view',
          events: ['None (view)'],
          gasEstimate: 'N/A (view)',
          example: `const { totalFee, mainChainFee, nativeFee } = await localBridge.quoteTwoChains(
  mainPayload, nativePayload,
  mainOptions, nativeOptions
);`,
          relatedFunctions: ['sendToTwoChains']
        }
      ]
    },
    {
      category: 'Admin Functions',
      description: 'Owner configuration and management',
      items: [
        {
          name: 'authorizeContract',
          signature: 'authorizeContract(address _contract, bool _authorized)',
          whatItDoes: 'Grants or revokes bridge access for Local contracts.',
          whyUse: 'Owner authorizes LOWJC and Athena Client to use bridge.',
          howItWorks: [
            'Sets authorizedContracts[_contract] = _authorized',
            'Emits ContractAuthorized event'
          ],
          parameters: [
            { name: '_contract', type: 'address', description: 'Contract to authorize' },
            { name: '_authorized', type: 'bool', description: 'true to authorize, false to revoke' }
          ],
          accessControl: 'onlyOwner',
          events: ['ContractAuthorized(contractAddress, authorized)'],
          gasEstimate: '~30K gas',
          example: `// Authorize Athena Client
await localBridge.authorizeContract(athenaClientAddress, true);`,
          relatedFunctions: ['setAthenaClientContract']
        },
        {
          name: 'setAthenaClientContract',
          signature: 'setAthenaClientContract(address _athenaClient)',
          whatItDoes: 'Sets Athena Client address for message routing.',
          whyUse: 'Configure which contract receives dispute finalization.',
          howItWorks: [
            'Sets athenaClientContract address',
            '_lzReceive routes finalizeDisputeWithVotes to this address',
            'Emits ContractAddressSet event'
          ],
          parameters: [
            { name: '_athenaClient', type: 'address', description: 'Athena Client address' }
          ],
          accessControl: 'onlyOwner',
          events: ['ContractAddressSet("athenaClient", address)'],
          gasEstimate: '~30K gas',
          example: `await localBridge.setAthenaClientContract(athenaClientAddress);`,
          relatedFunctions: ['setLowjcContract']
        },
        {
          name: 'updateChainEndpoints',
          signature: 'updateChainEndpoints(uint32 _nativeChainEid, uint32 _mainChainEid, uint32 _thisLocalChainEid)',
          whatItDoes: 'Updates all chain EIDs in one transaction.',
          whyUse: 'Batch update when migrating to mainnet.',
          howItWorks: [
            'Sets all three EIDs',
            'Emits three events'
          ],
          parameters: [
            { name: '_nativeChainEid', type: 'uint32', description: 'Native Chain EID' },
            { name: '_mainChainEid', type: 'uint32', description: 'Main Chain EID' },
            { name: '_thisLocalChainEid', type: 'uint32', description: 'This Local Chain EID (40161 for OP)' }
          ],
          accessControl: 'onlyOwner',
          events: ['ChainEndpointUpdated (x2), ThisLocalChainEidUpdated'],
          gasEstimate: '~50K gas',
          example: `await localBridge.updateChainEndpoints(
  arbitrumEid,     // Native
  baseEid,         // Main
  40161            // Ethereum Sepolia
);`,
          relatedFunctions: ['updateNativeChainEid', 'updateMainChainEid']
        }
      ]
    }
  ],
  
  dataFlows: [
    {
      title: 'Job Posting Flow',
      description: 'User posts job on Ethereum, sent to Native for execution',
      steps: [
        { chain: 'Ethereum Sepolia', action: '1. User calls LOWJC.postJob() with payment' },
        { chain: 'Ethereum Sepolia', action: '2. USDC sent to Native via CCTP' },
        { chain: 'Ethereum Sepolia', action: '3. LOWJC calls Local Bridge.sendToNativeChain()' },
        { chain: 'Ethereum Sepolia', action: '4. Local Bridge sends LayerZero message' },
        { chain: 'Arbitrum', action: '5. Native Bridge receives message' },
        { chain: 'Arbitrum', action: '6. Routes to NOWJC.postJob()' },
        { chain: 'Arbitrum', action: '7. Job stored in OpenworkGenesis' },
        { chain: 'All Chains', action: '8. Job visible on all chains' }
      ]
    },
    {
      title: 'Dispute Flow',
      description: 'User raises dispute on Ethereum, resolved on Native, result returned',
      steps: [
        { chain: 'Ethereum Sepolia', action: '1. User calls Athena Client.raiseDispute()' },
        { chain: 'Ethereum Sepolia', action: '2. Athena Client calls Local Bridge.sendToNativeChain()' },
        { chain: 'Arbitrum', action: '3. Native Bridge receives, routes to Native Athena' },
        { chain: 'Arbitrum', action: '4. Native Athena creates dispute, opens voting' },
        { chain: 'Arbitrum', action: '5. Oracle members vote' },
        { chain: 'Arbitrum', action: '6. Native Athena finalizes dispute' },
        { chain: 'Arbitrum', action: '7. Native Bridge sends result to Local Bridge (Ethereum)' },
        { chain: 'Ethereum Sepolia', action: '8. Local Bridge._lzReceive() receives' },
        { chain: 'Ethereum Sepolia', action: '9. Routes to Athena Client.handleFinalizeDisputeWithVotes()' },
        { chain: 'Ethereum Sepolia', action: '10. Dispute status updated on Ethereum' }
      ]
    },
    {
      title: 'Upgrade Flow',
      description: 'Main DAO upgrades Athena Client on Ethereum',
      steps: [
        { chain: 'Base/Ethereum', action: '1. Main DAO proposal passes' },
        { chain: 'Base/Ethereum', action: '2. Main Bridge.sendUpgradeCommand() to Ethereum' },
        { chain: 'Ethereum Sepolia', action: '3. Local Bridge._lzReceive() receives upgrade' },
        { chain: 'Ethereum Sepolia', action: '4. Routes to _handleUpgradeMessage()' },
        { chain: 'Ethereum Sepolia', action: '5. Calls Athena Client.upgradeFromDAO()' },
        { chain: 'Ethereum Sepolia', action: '6. Athena Client upgrades to new implementation' },
        { chain: 'Ethereum Sepolia', action: '7. New Athena Client features active' }
      ]
    }
  ],
  
  integrationGuide: {
    example: `// Local Bridge (Ethereum) Integration Example
const { ethers } = require('ethers');

// 1. Setup
const localBridge = new ethers.Contract(
  localBridgeAddress,
  localBridgeABI,
  signer
);

// 2. ADMIN: Configure Local Bridge
await localBridge.setAthenaClientContract(athenaClientAddress);
await localBridge.setLowjcContract(lowjcAddress);
await localBridge.authorizeContract(athenaClientAddress, true);
await localBridge.authorizeContract(lowjcAddress, true);

// 3. LOWJC: Post job to Native Chain
const jobPayload = ethers.AbiCoder.defaultAbiCoder().encode(
  ["string", "string", "address", "string", "string[]", "uint256[]"],
  ["postJob", jobId, jobGiver, jobDetailHash, descriptions, amounts]
);

const jobFee = await localBridge.quoteNativeChain(jobPayload, lzOptions);

await localBridge.sendToNativeChain(
  "postJob",
  jobPayload,
  lzOptions,
  { value: jobFee }
);

// 4. Athena Client: Raise dispute
const disputePayload = ethers.AbiCoder.defaultAbiCoder().encode(
  ["string", "string", "string", "string", "string", "uint256", "uint256", "address"],
  ["raiseDispute", jobId, disputeHash, oracleName, ...params]
);

const disputeFee = await localBridge.quoteNativeChain(disputePayload, lzOptions);

await localBridge.sendToNativeChain(
  "raiseDispute",
  disputePayload,
  lzOptions,
  { value: disputeFee }
);

// 5. Receive dispute finalization (automatic via _lzReceive)
// Native Athena → Native Bridge → Local Bridge → Athena Client`,
    tips: [
      'Local Bridge is user gateway - connects Ethereum to Native/Main',
      'Same contract deployed on OP, Ethereum, Polygon, Base, etc.',
      'Only chain-specific config differs (thisLocalChainEid)',
      'LOWJC and Athena Client must be authorized',
      'Quote fees before all operations',
      'LayerZero options: [version(uint16), gas(uint256)]',
      'Bridge automatically refunds excess msg.value',
      '_lzReceive routes finalizeDisputeWithVotes to Athena Client',
      'Upgrade commands come from Main DAO via Main Bridge',
      'Monitor CrossChainMessageReceived events for debugging',
      'thisLocalChainEid must match actual chain (40161 for OP)',
      'Test on testnet before mainnet deployment'
    ]
  },
  
  deployConfig: {
    type: 'standard',
    constructor: [
      {
        name: '_endpoint',
        type: 'address',
        description: 'LayerZero V2 Endpoint address on Ethereum Sepolia',
        placeholder: '0x6EDCE65403992e310A62460808c4b910D972f10f'
      },
      {
        name: '_owner',
        type: 'address',
        description: 'Contract owner address (admin who manages chain configurations)',
        placeholder: '0x...'
      },
      {
        name: '_nativeChainEid',
        type: 'uint32',
        description: 'LayerZero EID for Native Chain (Arbitrum Sepolia: 421614)',
        placeholder: '421614'
      },
      {
        name: '_mainChainEid',
        type: 'uint32',
        description: 'LayerZero EID for Main Chain (Base Sepolia: 40245)',
        placeholder: '40245'
      },
      {
        name: '_thisLocalChainEid',
        type: 'uint32',
        description: 'LayerZero EID for THIS chain (Ethereum Sepolia: 40161)',
        placeholder: '40161'
      }
    ],
    networks: {
      testnet: {
        name: 'Ethereum Sepolia',
        chainId: 11155111,
        rpcUrl: 'https://sepolia.infura.io/v3/YOUR-PROJECT-ID',
        explorer: 'https://sepolia.etherscan.io',
        currency: 'ETH'
      },
      mainnet: {
        name: 'Ethereum Mainnet',
        chainId: 1,
        rpcUrl: 'https://eth.llamarpc.com',
        explorer: 'https://etherscan.io',
        currency: 'ETH'
      }
    },
    estimatedGas: '3.2M',
    postDeploy: {
      message: 'Standard deployment complete! Configure bridge for Local Chain operations.',
      nextSteps: [
        '1. Deploy LocalBridge (LayerZeroBridge) with constructor parameters:',
        '   - LayerZero Endpoint: 0x6EDCE65403992e310A62460808c4b910D972f10f',
        '   - Owner: your admin wallet',
        '   - Native Chain EID: 421614 (Arbitrum Sepolia)',
        '   - Main Chain EID: 40245 (Base Sepolia)',
        '   - This Local Chain EID: 40161 (Ethereum Sepolia)',
        '2. Set Local Chain contract addresses:',
        '   - setAthenaClientContract(athenaClientETHAddress)',
        '   - setLowjcContract(lowjcETHAddress)',
        '3. Authorize Local contracts to use bridge:',
        '   - authorizeContract(athenaClientETHAddress, true)',
        '   - authorizeContract(lowjcETHAddress, true)',
        '4. Configure LayerZero peers on this contract:',
        '   - setPeer(nativeChainEid, nativeBridgeAddress)',
        '   - setPeer(mainChainEid, mainBridgeAddress)',
        '5. Configure LOWJC and Athena Client with bridge:',
        '   - LOWJC.setBridge(localBridgeAddress)',
        '   - AthenaClient.setBridge(localBridgeAddress)',
        '6. Test job posting flow to Native Chain',
        '7. Test dispute raising flow',
        '8. Test receiving dispute finalization from Native',
        '9. Verify contract on Ethereum Sepolia Etherscan',
        '10. IMPORTANT: Same contract deploys on all Local Chains with different EIDs'
      ]
    }
  },
  
  securityConsiderations: [
    'Non-upgradeable: LayerZero OApp, cannot upgrade bridge itself',
    'Authorization required: Only LOWJC and Athena Client can send messages',
    'LayerZero security: Relies on LayerZero V2 DVN verification',
    'Upgrade trust: No validation of upgrade commands (trusts Main DAO)',
    'Owner controls: Chain endpoints, contract addresses, authorizations',
    'No token holding: Bridge never holds funds (only routes messages)',
    'Event logging: Complete audit trail of all messages',
    'Multi-chain deployment: Same code on all Local Chains for consistency',
    'Chain identification: thisLocalChainEid prevents cross-chain confusion',
    'Refund mechanism: Returns excess fees to prevent lock-up',
    'Direct Main communication: Rarely used, most operations via Native',
    'Upgrade flow: Main DAO → Main Bridge → Local Bridge → Local Contract'
  ],
  
  code: `// Same implementation as localBridgeOP - see: contracts/openwork-full-contract-suite-layerzero+CCTP 2 Dec/local-bridge.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

contract LayerZeroBridge is OAppSender, OAppReceiver {
    mapping(address => bool) public authorizedContracts;
    address public athenaClientContract;
    address public lowjcContract;
    uint32 public nativeChainEid;
    uint32 public mainChainEid;
    uint32 public thisLocalChainEid;

    function sendToNativeChain(string memory _functionName, bytes memory _payload, bytes calldata _options) external payable onlyAuthorized {
        _lzSend(nativeChainEid, _payload, _options, MessagingFee(msg.value, 0), payable(msg.sender));
        emit CrossChainMessageSent(_functionName, nativeChainEid, _payload);
    }
    // ... Additional functions - see full implementation
}`
};
