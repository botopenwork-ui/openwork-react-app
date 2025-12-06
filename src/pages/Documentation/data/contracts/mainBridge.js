export const mainBridge = {
  id: 'mainBridge',
  name: 'Main Bridge',
  chain: 'base',
  column: 'base-main',
  order: 3,
  status: 'testnet',
  version: 'v1.0.0',
  gas: '72K',
  mainnetNetwork: 'Ethereum Mainnet',
  testnetNetwork: 'Base Sepolia',
  mainnetDeployed: 'Not deployed',
  testnetDeployed: 'Deployed',
  mainnetAddress: null,
  testnetAddress: '0x1234567890123456789012345678901234567890', // Placeholder
  tvl: 'N/A',
  docs: 'Main Chain Bridge - LayerZero OApp on Base/Ethereum serving as the governance and rewards hub. Receives sync data from Native Chain, routes to Main DAO and Main Rewards, and sends upgrade commands to all chains.',
  
  overview: {
    purpose: 'Main Chain Bridge is the governance and rewards coordination center of OpenWork. Deployed on Base Sepolia (testnet) or Ethereum Mainnet (production), it receives rewards and voting power sync from the Native Chain, routes them to Main DAO and Main Rewards for token distribution and governance, and serves as the command center for protocol upgrades. Main DAO uses this bridge to send upgrade commands to all chains (Native and Local). It supports batch operations to update multiple chains simultaneously, making governance efficient. Unlike other bridges, Main Bridge is the source of upgrade commands, not a recipient.',
    tier: 'Main Chain (Base Sepolia / Ethereum)',
    category: 'Bridge Infrastructure - Governance Hub',
    upgradeability: 'Non-upgradeable (LayerZero OApp)'
  },
  
  features: [
    'Governance hub: Central coordination for DAO operations and protocol upgrades',
    'Rewards router: Receives claimable rewards sync from Native Chain, routes to Main Rewards',
    'Voting power sync: Receives total earned tokens from Native, routes to Main DAO for voting power',
    'Upgrade command center: Main DAO sends upgrade commands through this bridge to all chains',
    'Multi-chain sending: Send to 1, 2, or 3 chains in single transaction',
    'Batch operations: Update multiple chains simultaneously for governance efficiency',
    'Flexible routing: Can target Native Chain, specific Local Chains, or multiple chains',
    'Fee quoting: Accurate LayerZero fee estimation for all destinations',
    'Authorization system: Only authorized contracts (Main DAO, Main Rewards) can use bridge',
    'onlyMainDAO security: Only Main DAO can send upgrade commands',
    'Refund handling: Returns excess native fees to callers',
    'Complete event logging: Full audit trail of all governance operations'
  ],
  
  systemPosition: {
    description: 'Main Chain Bridge sits at the top of OpenWork\'s three-tier architecture on Base/Ethereum. It receives governance data (rewards, voting power) from Native Chain via Native Bridge, routes them to Main DAO and Main Rewards for processing, and serves as the command center for protocol upgrades. When Main DAO passes an upgrade proposal, this bridge sends the upgrade command to Native Bridge (which further routes to Native contracts) or directly to Local Bridges. It\'s the only bridge that originates upgrade commands, making it the governance nerve center.',
    diagram: `
📍 Main Chain Bridge in Three-Tier Architecture

┌─────────────────────────────────────────────────────────┐
│  TIER 3: MAIN CHAIN (Governance & Rewards)              │
│  Base Sepolia (testnet) / Ethereum (mainnet)            │
├─────────────────────────────────────────────────────────┤
│  ⭐ Main Bridge (YOU ARE HERE) ⭐                       │
│     Governance Command Center                           │
│     ↓ Routes inbound to:                                │
│     ├─> Main DAO (voting power, proposals)              │
│     └─> Main Rewards (claimable tokens)                 │
│     ↓ Sends outbound to:                                │
│     ├─> Native Chain (upgrade commands)                 │
│     └─> Local Chains (upgrade commands)                 │
└───────────────────────┬─────────────────────────────────┘
                        │ Governance Sync ↑ | Upgrades ↓
                        ↓
┌─────────────────────────────────────────────────────────┐
│  TIER 2: NATIVE CHAIN (Execution Hub)                   │
│  Arbitrum Sepolia                                        │
├─────────────────────────────────────────────────────────┤
│  • Native Bridge (message router)                       │
│  • NOWJC, Native Athena, Native DAO                     │
│  • Sends rewards/voting sync UP to Main                 │
│  • Receives upgrade commands DOWN from Main             │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────────┐
│  TIER 1: LOCAL CHAINS (User-Facing)                     │
│  OP, Ethereum, Polygon, Base, etc.                      │
├─────────────────────────────────────────────────────────┤
│  • Local Bridges (per chain)                            │
│  • LOWJC, Athena Client                                 │
│  • Receives upgrade commands from Main                  │
└─────────────────────────────────────────────────────────┘

Message Flow Examples:

1. Rewards Sync (Inbound):
   Native Chain → Native Bridge → Main Bridge → Main Rewards

2. Voting Power Sync (Inbound):
   Native Chain → Native Bridge → Main Bridge → Main DAO

3. Upgrade Native Contract (Outbound):
   Main DAO → Main Bridge → Native Bridge → Native Contract

4. Upgrade Local Contract (Outbound):
   Main DAO → Main Bridge → Local Bridge → Local Contract

5. Batch Upgrade (Outbound):
   Main DAO → Main Bridge → [Native, OP, Ethereum] simultaneously`
  },
  
  dependencies: {
    dependsOn: [
      { 
        name: 'LayerZero V2 Endpoint', 
        reason: 'Core messaging protocol for cross-chain communication. Main Bridge extends OAppSender and OAppReceiver.',
        type: 'Infrastructure'
      },
      { 
        name: 'Native Bridge', 
        reason: 'Sends rewards/voting sync TO Main Bridge. Receives upgrade commands FROM Main Bridge.',
        type: 'Bridge'
      },
      { 
        name: 'Main DAO', 
        reason: 'Must be set to authorize upgrade commands. Only Main DAO can call sendUpgradeCommand().',
        type: 'Governance'
      }
    ],
    requiredBy: [
      { 
        name: 'Main DAO', 
        reason: 'Calls sendUpgradeCommand() to upgrade contracts across all chains. Receives voting power sync.',
        type: 'Governance'
      },
      { 
        name: 'Main Rewards', 
        reason: 'Receives claimable rewards sync from Main Bridge. Users claim OW tokens here.',
        type: 'Token Distribution'
      },
      { 
        name: 'Native Bridge', 
        reason: 'Sends rewards and voting data to Main Bridge. Receives upgrade commands from Main Bridge.',
        type: 'Bridge'
      },
      { 
        name: 'Local Bridges', 
        reason: 'Receive upgrade commands directly from Main Bridge for Local Chain contracts.',
        type: 'Bridge'
      }
    ],
    prerequisites: [
      'LayerZero V2 Endpoint deployed on Base/Ethereum',
      'Main DAO and Main Rewards deployed and configured',
      'Native Chain EID set correctly (Arbitrum Sepolia)',
      'Local Chain EIDs configured (OP, Ethereum, Polygon, etc.)',
      'Main DAO address set for upgrade authorization',
      'Main Rewards address set for rewards routing',
      'Contracts authorized via authorizeContract()',
      'LayerZero peers configured for all chains'
    ]
  },
  
  functions: [
    {
      category: 'Inbound Message Handling',
      description: 'Receiving and routing messages from Native Chain',
      items: [
        {
          name: '_lzReceive',
          signature: '_lzReceive(Origin _origin, bytes32 _guid, bytes _message, address _executor, bytes _extraData)',
          whatItDoes: 'LayerZero callback that routes incoming messages from Native Chain to Main contracts.',
          whyUse: 'Automatically called by LayerZero when Native Bridge sends sync data. Routes to Main DAO or Main Rewards.',
          howItWorks: [
            'Decodes function name from message',
            'Rejects upgrade messages (upgrades originate here, not received)',
            'Routes "syncClaimableRewards" to Main Rewards contract',
            'Routes "syncVotingPower" to Main DAO contract',
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
          gasEstimate: '50K - 150K gas (varies by routed function)',
          example: `// Called automatically when Native Bridge sends sync
// Native Bridge → LayerZero → Main Bridge._lzReceive()
// → Routes to Main Rewards or Main DAO`,
          relatedFunctions: ['handleSyncClaimableRewards', 'handleSyncVotingPower']
        }
      ]
    },
    {
      category: 'Outbound Message Sending',
      description: 'Sending messages to Native and Local Chains',
      items: [
        {
          name: 'sendToNativeChain',
          signature: 'sendToNativeChain(string _functionName, bytes _payload, bytes _options) payable',
          whatItDoes: 'Sends a message to Native Chain (Arbitrum) via LayerZero.',
          whyUse: 'Main DAO or Main Rewards send governance or reward updates to Native Chain.',
          howItWorks: [
            'Validates caller is authorized',
            'Calls LayerZero _lzSend() with nativeChainEid',
            'Pays fee from msg.value, refunds excess',
            'Emits CrossChainMessageSent event'
          ],
          parameters: [
            { name: '_functionName', type: 'string', description: 'Function name for logging' },
            { name: '_payload', type: 'bytes', description: 'ABI-encoded message' },
            { name: '_options', type: 'bytes', description: 'LayerZero options' }
          ],
          accessControl: 'onlyAuthorized',
          events: ['CrossChainMessageSent(functionName, nativeChainEid, payload)'],
          gasEstimate: '~45K gas + LayerZero fee',
          example: `// Send governance update to Native Chain
const payload = ethers.AbiCoder.defaultAbiCoder().encode(
  ["string", "address", "uint256"],
  ["updateParameter", contract, value]
);

await mainBridge.sendToNativeChain(
  "updateParameter",
  payload,
  lzOptions,
  { value: fee }
);`,
          relatedFunctions: ['quoteNativeChain', 'sendUpgradeCommand']
        },
        {
          name: 'sendToAthenaClientChain',
          signature: 'sendToAthenaClientChain(string _functionName, bytes _payload, bytes _options) payable',
          whatItDoes: 'Sends message to the chain where Athena Client is deployed (typically OP or Ethereum).',
          whyUse: 'Direct communication to specific Local Chain for Athena operations.',
          howItWorks: [
            'Sends to athenaClientChainEid',
            'Used for Athena-specific updates',
            'Bypasses Native Bridge for direct communication'
          ],
          parameters: [
            { name: '_functionName', type: 'string', description: 'Function name' },
            { name: '_payload', type: 'bytes', description: 'Message payload' },
            { name: '_options', type: 'bytes', description: 'LayerZero options' }
          ],
          accessControl: 'onlyAuthorized',
          events: ['CrossChainMessageSent(functionName, athenaClientChainEid, payload)'],
          gasEstimate: '~45K gas + LayerZero fee',
          example: `await mainBridge.sendToAthenaClientChain(
  "updateOracleConfig",
  payload,
  lzOptions,
  { value: fee }
);`,
          relatedFunctions: ['sendToLowjcChain', 'quoteAthenaClientChain']
        },
        {
          name: 'sendToLowjcChain',
          signature: 'sendToLowjcChain(string _functionName, bytes _payload, bytes _options) payable',
          whatItDoes: 'Sends message to the chain where LOWJC is deployed.',
          whyUse: 'Direct communication to specific Local Chain for job contract operations.',
          howItWorks: [
            'Sends to lowjcChainEid',
            'Used for LOWJC-specific updates',
            'Direct communication bypassing Native Bridge'
          ],
          parameters: [
            { name: '_functionName', type: 'string', description: 'Function name' },
            { name: '_payload', type: 'bytes', description: 'Message payload' },
            { name: '_options', type: 'bytes', description: 'LayerZero options' }
          ],
          accessControl: 'onlyAuthorized',
          events: ['CrossChainMessageSent(functionName, lowjcChainEid, payload)'],
          gasEstimate: '~45K gas + LayerZero fee',
          example: `await mainBridge.sendToLowjcChain(
  "updateFeeConfig",
  payload,
  lzOptions,
  { value: fee }
);`,
          relatedFunctions: ['sendToAthenaClientChain', 'quoteLowjcChain']
        },
        {
          name: 'sendToSpecificChain',
          signature: 'sendToSpecificChain(string _functionName, uint32 _dstEid, bytes _payload, bytes _options) payable',
          whatItDoes: 'Sends message to any chain by EID (most flexible function).',
          whyUse: 'When you need to send to a chain not covered by specific functions (e.g., new Local Chain).',
          howItWorks: [
            'Accepts destination EID as parameter',
            'Flexible routing to any configured chain',
            'Used for one-off or new chain communications'
          ],
          parameters: [
            { name: '_functionName', type: 'string', description: 'Function name' },
            { name: '_dstEid', type: 'uint32', description: 'Destination chain EID' },
            { name: '_payload', type: 'bytes', description: 'Message payload' },
            { name: '_options', type: 'bytes', description: 'LayerZero options' }
          ],
          accessControl: 'onlyAuthorized',
          events: ['CrossChainMessageSent(functionName, dstEid, payload)'],
          gasEstimate: '~45K gas + LayerZero fee',
          example: `// Send to Polygon (new chain)
const polygonEid = 40267;
await mainBridge.sendToSpecificChain(
  "initializeChain",
  polygonEid,
  payload,
  lzOptions,
  { value: fee }
);`,
          relatedFunctions: ['quoteSpecificChain', 'sendToTwoChains']
        }
      ]
    },
    {
      category: 'Batch Operations',
      description: 'Send to multiple chains in single transaction for governance efficiency',
      items: [
        {
          name: 'sendToTwoChains',
          signature: 'sendToTwoChains(string _functionName, uint32 _dstEid1, uint32 _dstEid2, bytes _payload1, bytes _payload2, bytes _options1, bytes _options2) payable',
          whatItDoes: 'Sends messages to two chains simultaneously in one transaction.',
          whyUse: 'Governance efficiency - update two chains at once (e.g., Native + OP).',
          howItWorks: [
            'Quotes fees for both chains upfront',
            'Validates total fee provided',
            'Sends both messages via LayerZero',
            'Refunds excess fees',
            'Emits event for each chain'
          ],
          parameters: [
            { name: '_functionName', type: 'string', description: 'Function name for logging' },
            { name: '_dstEid1', type: 'uint32', description: 'First destination EID' },
            { name: '_dstEid2', type: 'uint32', description: 'Second destination EID' },
            { name: '_payload1', type: 'bytes', description: 'First message payload' },
            { name: '_payload2', type: 'bytes', description: 'Second message payload' },
            { name: '_options1', type: 'bytes', description: 'First message options' },
            { name: '_options2', type: 'bytes', description: 'Second message options' }
          ],
          accessControl: 'onlyAuthorized',
          events: ['CrossChainMessageSent (x2)'],
          gasEstimate: '~80K gas + LayerZero fees for both',
          example: `// Update Native and OP simultaneously
const { totalFee } = await mainBridge.quoteTwoChains(
  nativeEid, opEid,
  payload1, payload2,
  options1, options2
);

await mainBridge.sendToTwoChains(
  "updateFeeStructure",
  nativeEid, opEid,
  payload1, payload2,
  options1, options2,
  { value: totalFee }
);`,
          relatedFunctions: ['sendToThreeChains', 'quoteTwoChains']
        },
        {
          name: 'sendToThreeChains',
          signature: 'sendToThreeChains(string _functionName, uint32 _dstEid1, uint32 _dstEid2, uint32 _dstEid3, bytes _payload1, bytes _payload2, bytes _payload3, bytes _options1, bytes _options2, bytes _options3) payable',
          whatItDoes: 'Sends messages to three chains simultaneously in one transaction.',
          whyUse: 'Maximum governance efficiency - update Native + two Local Chains at once.',
          howItWorks: [
            'Quotes all three fees upfront',
            'Validates total fee sufficient',
            'Sends all three messages',
            'Refunds excess',
            'Emits three events'
          ],
          parameters: [
            { name: '_functionName', type: 'string', description: 'Function name' },
            { name: '_dstEid1', type: 'uint32', description: 'First destination' },
            { name: '_dstEid2', type: 'uint32', description: 'Second destination' },
            { name: '_dstEid3', type: 'uint32', description: 'Third destination' },
            { name: '_payload1', type: 'bytes', description: 'First payload' },
            { name: '_payload2', type: 'bytes', description: 'Second payload' },
            { name: '_payload3', type: 'bytes', description: 'Third payload' },
            { name: '_options1', type: 'bytes', description: 'First options' },
            { name: '_options2', type: 'bytes', description: 'Second options' },
            { name: '_options3', type: 'bytes', description: 'Third options' }
          ],
          accessControl: 'onlyAuthorized',
          events: ['CrossChainMessageSent (x3)'],
          gasEstimate: '~115K gas + LayerZero fees for all three',
          example: `// Update Native, OP, and Ethereum
const { totalFee } = await mainBridge.quoteThreeChains(
  nativeEid, opEid, ethEid,
  payload1, payload2, payload3,
  options1, options2, options3
);

await mainBridge.sendToThreeChains(
  "protocolUpgrade",
  nativeEid, opEid, ethEid,
  payload1, payload2, payload3,
  options1, options2, options3,
  { value: totalFee }
);`,
          relatedFunctions: ['sendToTwoChains', 'quoteThreeChains']
        }
      ]
    },
    {
      category: 'Upgrade Commands',
      description: 'Main DAO sending upgrade commands to all chains',
      items: [
        {
          name: 'sendUpgradeCommand',
          signature: 'sendUpgradeCommand(uint32 _dstChainId, address targetProxy, address newImplementation, bytes _options) payable',
          whatItDoes: 'Sends upgrade command from Main DAO to any chain (Native or Local).',
          whyUse: 'Main DAO upgrades contracts across all chains from single governance action.',
          howItWorks: [
            'Validates caller is Main DAO (onlyMainDAO modifier)',
            'Encodes upgrade message with "upgradeFromDAO" function name',
            'Sends to destination chain',
            'Destination bridge routes to target contract',
            'Target contract executes upgrade',
            'Emits UpgradeCommandSent event'
          ],
          parameters: [
            { name: '_dstChainId', type: 'uint32', description: 'Destination chain EID' },
            { name: 'targetProxy', type: 'address', description: 'UUPS proxy contract to upgrade' },
            { name: 'newImplementation', type: 'address', description: 'New implementation address' },
            { name: '_options', type: 'bytes', description: 'LayerZero options' }
          ],
          accessControl: 'onlyMainDAO - ONLY Main DAO can call',
          events: ['UpgradeCommandSent(dstChainId, targetProxy, newImplementation)'],
          gasEstimate: '~50K gas + LayerZero fee',
          example: `// Main DAO upgrades Native Athena
const fee = await mainBridge.quoteUpgradeCommand(
  nativeChainEid,
  nativeAthenaProxy,
  newAthenaImpl
);

// Only Main DAO can call this
await mainBridge.sendUpgradeCommand(
  nativeChainEid,
  nativeAthenaProxy,
  newAthenaImpl,
  lzOptions,
  { value: fee }
);

// Message flow:
// Main Bridge → Native Bridge → Native Athena.upgradeFromDAO()`,
          relatedFunctions: ['quoteUpgradeCommand']
        },
        {
          name: 'quoteUpgradeCommand',
          signature: 'quoteUpgradeCommand(uint32 targetChainId, address targetProxy, address newImplementation) view returns (uint256 fee)',
          whatItDoes: 'Quotes LayerZero fee for sending upgrade command.',
          whyUse: 'Check fee before Main DAO sends upgrade to ensure sufficient funds.',
          howItWorks: [
            'Encodes upgrade payload',
            'Calls _quote() with target chain EID',
            'Returns native fee in wei',
            'View function, no gas cost'
          ],
          parameters: [
            { name: 'targetChainId', type: 'uint32', description: 'Chain to upgrade' },
            { name: 'targetProxy', type: 'address', description: 'Proxy to upgrade' },
            { name: 'newImplementation', type: 'address', description: 'New implementation' }
          ],
          accessControl: 'Public view',
          events: ['None (view)'],
          gasEstimate: 'N/A (view)',
          example: `const fee = await mainBridge.quoteUpgradeCommand(
  nativeChainEid,
  nativeAthenaProxy,
  newImplementation
);
console.log("Upgrade fee:", ethers.formatEther(fee));`,
          relatedFunctions: ['sendUpgradeCommand']
        }
      ]
    },
    {
      category: 'Fee Quoting',
      description: 'Estimate LayerZero fees for all operations',
      items: [
        {
          name: 'quoteNativeChain',
          signature: 'quoteNativeChain(bytes _payload, bytes _options) view returns (uint256 fee)',
          whatItDoes: 'Returns LayerZero fee for sending to Native Chain.',
          whyUse: 'Check fee before any Native Chain operation.',
          howItWorks: [
            'Calls _quote() with nativeChainEid',
            'Returns fee in wei'
          ],
          parameters: [
            { name: '_payload', type: 'bytes', description: 'Message payload' },
            { name: '_options', type: 'bytes', description: 'LayerZero options' }
          ],
          accessControl: 'Public view',
          events: ['None (view)'],
          gasEstimate: 'N/A (view)',
          example: `const fee = await mainBridge.quoteNativeChain(payload, lzOptions);`,
          relatedFunctions: ['sendToNativeChain']
        },
        {
          name: 'quoteTwoChains',
          signature: 'quoteTwoChains(uint32 _dstEid1, uint32 _dstEid2, bytes _payload1, bytes _payload2, bytes _options1, bytes _options2) view returns (uint256 totalFee, uint256 fee1, uint256 fee2)',
          whatItDoes: 'Quotes cumulative fee for two-chain batch operation.',
          whyUse: 'Get total fee before calling sendToTwoChains().',
          howItWorks: [
            'Quotes each chain separately',
            'Returns individual fees and sum',
            'Use totalFee as msg.value'
          ],
          parameters: [
            { name: '_dstEid1', type: 'uint32', description: 'First destination' },
            { name: '_dstEid2', type: 'uint32', description: 'Second destination' },
            { name: '_payload1', type: 'bytes', description: 'First payload' },
            { name: '_payload2', type: 'bytes', description: 'Second payload' },
            { name: '_options1', type: 'bytes', description: 'First options' },
            { name: '_options2', type: 'bytes', description: 'Second options' }
          ],
          accessControl: 'Public view',
          events: ['None (view)'],
          gasEstimate: 'N/A (view)',
          example: `const { totalFee, fee1, fee2 } = await mainBridge.quoteTwoChains(
  nativeEid, opEid,
  payload1, payload2,
  options1, options2
);
console.log(\`Total: \${ethers.formatEther(totalFee)}\`);`,
          relatedFunctions: ['sendToTwoChains', 'quoteThreeChains']
        },
        {
          name: 'quoteThreeChains',
          signature: 'quoteThreeChains(uint32 _dstEid1, uint32 _dstEid2, uint32 _dstEid3, bytes _payload1, bytes _payload2, bytes _payload3, bytes _options1, bytes _options2, bytes _options3) view returns (uint256 totalFee, uint256 fee1, uint256 fee2, uint256 fee3)',
          whatItDoes: 'Quotes cumulative fee for three-chain batch operation.',
          whyUse: 'Get total fee for maximum batch efficiency.',
          howItWorks: [
            'Quotes all three chains',
            'Returns individual and total fees'
          ],
          parameters: [
            { name: '_dstEid1', type: 'uint32', description: 'First destination' },
            { name: '_dstEid2', type: 'uint32', description: 'Second destination' },
            { name: '_dstEid3', type: 'uint32', description: 'Third destination' },
            { name: '_payload1', type: 'bytes', description: 'First payload' },
            { name: '_payload2', type: 'bytes', description: 'Second payload' },
            { name: '_payload3', type: 'bytes', description: 'Third payload' },
            { name: '_options1', type: 'bytes', description: 'First options' },
            { name: '_options2', type: 'bytes', description: 'Second options' },
            { name: '_options3', type: 'bytes', description: 'Third options' }
          ],
          accessControl: 'Public view',
          events: ['None (view)'],
          gasEstimate: 'N/A (view)',
          example: `const { totalFee } = await mainBridge.quoteThreeChains(
  nativeEid, opEid, ethEid,
  payload1, payload2, payload3,
  options1, options2, options3
);`,
          relatedFunctions: ['sendToThreeChains', 'quoteTwoChains']
        }
      ]
    },
    {
      category: 'Admin Functions',
      description: 'Owner configuration and management',
      items: [
        {
          name: 'setMainDaoContract',
          signature: 'setMainDaoContract(address _mainDao)',
          whatItDoes: 'Sets Main DAO address for upgrade authorization.',
          whyUse: 'Configure which contract can send upgrade commands.',
          howItWorks: [
            'Validates address not zero',
            'Sets mainDaoContract',
            'Only this address can call sendUpgradeCommand()',
            'Emits ContractAddressSet event'
          ],
          parameters: [
            { name: '_mainDao', type: 'address', description: 'Main DAO contract address' }
          ],
          accessControl: 'onlyOwner',
          events: ['ContractAddressSet("mainDao", address)'],
          gasEstimate: '~30K gas',
          example: `await mainBridge.setMainDaoContract(mainDaoAddress);`,
          relatedFunctions: ['sendUpgradeCommand']
        },
        {
          name: 'setRewardsContract',
          signature: 'setRewardsContract(address _rewards)',
          whatItDoes: 'Sets Main Rewards address for rewards routing.',
          whyUse: 'Configure which contract receives claimable rewards sync.',
          howItWorks: [
            'Sets rewardsContract address',
            '_lzReceive routes syncClaimableRewards to this address',
            'Emits ContractAddressSet event'
          ],
          parameters: [
            { name: '_rewards', type: 'address', description: 'Main Rewards address' }
          ],
          accessControl: 'onlyOwner',
          events: ['ContractAddressSet("rewards", address)'],
          gasEstimate: '~30K gas',
          example: `await mainBridge.setRewardsContract(mainRewardsAddress);`,
          relatedFunctions: ['setMainDaoContract']
        },
        {
          name: 'updateChainEndpoints',
          signature: 'updateChainEndpoints(uint32 _nativeChainEid, uint32 _athenaClientChainEid, uint32 _lowjcChainEid)',
          whatItDoes: 'Updates all chain EIDs in one transaction.',
          whyUse: 'Batch update when migrating to mainnet or adding chains.',
          howItWorks: [
            'Sets all three chain EIDs',
            'Emits three ChainEndpointUpdated events'
          ],
          parameters: [
            { name: '_nativeChainEid', type: 'uint32', description: 'Native Chain EID' },
            { name: '_athenaClientChainEid', type: 'uint32', description: 'Athena Client Chain EID' },
            { name: '_lowjcChainEid', type: 'uint32', description: 'LOWJC Chain EID' }
          ],
          accessControl: 'onlyOwner',
          events: ['ChainEndpointUpdated (x3)'],
          gasEstimate: '~50K gas',
          example: `await mainBridge.updateChainEndpoints(
  arbitrumEid,
  opEid,
  ethereumEid
);`,
          relatedFunctions: ['updateNativeChainEid']
        }
      ]
    }
  ],
  
  dataFlows: [
    {
      title: 'Rewards Distribution Flow',
      description: 'User earns rewards, syncs to Main Chain, claims tokens',
      steps: [
        { chain: 'Arbitrum', action: '1. User completes job on Native Chain' },
        { chain: 'Arbitrum', action: '2. Native Rewards calculates claimable tokens' },
        { chain: 'Arbitrum', action: '3. User calls syncRewardsData()' },
        { chain: 'Arbitrum', action: '4. Native Bridge sends to Main Bridge' },
        { chain: 'Base/Ethereum', action: '5. Main Bridge._lzReceive() receives message' },
        { chain: 'Base/Ethereum', action: '6. Routes to Main Rewards contract' },
        { chain: 'Base/Ethereum', action: '7. Main Rewards updates claimable balance' },
        { chain: 'Base/Ethereum', action: '8. User claims OW tokens' }
      ]
    },
    {
      title: 'Voting Power Sync Flow',
      description: 'User syncs voting power for governance participation',
      steps: [
        { chain: 'Arbitrum', action: '1. User earns rewards over time' },
        { chain: 'Arbitrum', action: '2. User calls syncVotingPower()' },
        { chain: 'Arbitrum', action: '3. Native Bridge sends total rewards to Main' },
        { chain: 'Base/Ethereum', action: '4. Main Bridge receives message' },
        { chain: 'Base/Ethereum', action: '5. Routes to Main DAO' },
        { chain: 'Base/Ethereum', action: '6. Main DAO updates voting power' },
        { chain: 'Base/Ethereum', action: '7. User can create proposals & vote' }
      ]
    },
    {
      title: 'Protocol Upgrade Flow',
      description: 'Main DAO upgrades contract across chains',
      steps: [
        { chain: 'Base/Ethereum', action: '1. Main DAO proposal created' },
        { chain: 'Base/Ethereum', action: '2. Token holders vote on upgrade' },
        { chain: 'Base/Ethereum', action: '3. Proposal passes, executes' },
        { chain: 'Base/Ethereum', action: '4. Main DAO calls Main Bridge.sendUpgradeCommand()' },
        { chain: 'Base/Ethereum', action: '5. Main Bridge sends LayerZero message' },
        { chain: 'Arbitrum', action: '6. Native Bridge receives upgrade command' },
        { chain: 'Arbitrum', action: '7. Routes to target contract (e.g., Native Athena)' },
        { chain: 'Arbitrum', action: '8. Target contract upgrades implementation' },
        { chain: 'Arbitrum', action: '9. New implementation active' }
      ]
    },
    {
      title: 'Batch Upgrade Flow',
      description: 'Upgrading multiple chains simultaneously',
      steps: [
        { chain: 'Base/Ethereum', action: '1. Main DAO proposal for multi-chain upgrade' },
        { chain: 'Base/Ethereum', action: '2. Proposal passes' },
        { chain: 'Base/Ethereum', action: '3. Calls sendToThreeChains()' },
        { chain: 'Base/Ethereum', action: '4. Main Bridge sends to Native, OP, Ethereum' },
        { chain: 'Multiple', action: '5. All three bridges receive simultaneously' },
        { chain: 'Multiple', action: '6. Each routes to its target contract' },
        { chain: 'Multiple', action: '7. All contracts upgrade in parallel' },
        { chain: 'Multiple', action: '8. Protocol updated across all chains' }
      ]
    }
  ],
  
  integrationGuide: {
    example: `// Main Bridge Integration Example
const { ethers } = require('ethers');

// 1. Setup
const mainBridge = new ethers.Contract(
  mainBridgeAddress,
  mainBridgeABI,
  signer
);

// 2. ADMIN: Configure Main Bridge
await mainBridge.setMainDaoContract(mainDaoAddress);
await mainBridge.setRewardsContract(mainRewardsAddress);
await mainBridge.updateChainEndpoints(nativeEid, opEid, ethEid);

// 3. MAIN DAO: Send upgrade command
const upgradePayload = ethers.AbiCoder.defaultAbiCoder().encode(
  ["string", "address", "address"],
  ["upgradeFromDAO", targetProxy, newImplementation]
);

const upgradeFee = await mainBridge.quoteUpgradeCommand(
  nativeChainEid,
  nativeAthenaProxy,
  newAthenaImplementation
);

// Only Main DAO can call
await mainBridge.sendUpgradeCommand(
  nativeChainEid,
  nativeAthenaProxy,
  newAthenaImplementation,
  lzOptions,
  { value: upgradeFee }
);

// 4. BATCH OPERATIONS: Update multiple chains
const { totalFee, fee1, fee2, fee3 } = await mainBridge.quoteThreeChains(
  nativeEid,
  opEid,
  ethEid,
  nativePayload,
  opPayload,
  ethPayload,
  lzOptions,
  lzOptions,
  lzOptions
);

await mainBridge.sendToThreeChains(
  "updateFeeStructure",
  nativeEid,
  opEid,
  ethEid,
  nativePayload,
  opPayload,
  ethPayload,
  lzOptions,
  lzOptions,
  lzOptions,
  { value: totalFee }
);

// 5. Receive rewards sync from Native (automatic via _lzReceive)
// Native Bridge → Main Bridge → Main Rewards

// 6. Receive voting power sync (automatic)
// Native Bridge → Main Bridge → Main DAO`,
    tips: [
      'Main Bridge is the governance command center - only source of upgrade commands',
      'Only Main DAO can call sendUpgradeCommand() (onlyMainDAO security)',
      'Use batch operations (sendToTwoChains, sendToThreeChains) for efficiency',
      'Quote fees before all operations to ensure sufficient msg.value',
      'Main Bridge never receives upgrades - it only sends them',
      'Configure Main DAO and Main Rewards addresses before operations',
      'LayerZero options: [version(uint16), gas(uint256)]',
      'Excess msg.value automatically refunded to caller',
      'Monitor UpgradeCommandSent events for governance audit trail',
      'Use sendToSpecificChain for new chains not yet configured',
      'Batch operations save gas compared to multiple individual sends',
      'Test upgrade commands on testnet before mainnet governance'
    ]
  },
  
  deployConfig: {
    type: 'standard',
    constructor: [
      {
        name: '_endpoint',
        type: 'address',
        description: 'LayerZero V2 Endpoint address on Base/Ethereum (core messaging protocol)',
        placeholder: '0x6EDCE65403992e310A62460808c4b910D972f10f'
      },
      {
        name: '_owner',
        type: 'address',
        description: 'Contract owner address (admin who manages chains and configurations)',
        placeholder: '0x...'
      },
      {
        name: '_nativeChainEid',
        type: 'uint32',
        description: 'LayerZero Endpoint ID for Native Chain (Arbitrum Sepolia: 421614)',
        placeholder: '421614'
      },
      {
        name: '_athenaClientChainEid',
        type: 'uint32',
        description: 'LayerZero EID for Athena Client chain (OP Sepolia: 40232)',
        placeholder: '40232'
      },
      {
        name: '_lowjcChainEid',
        type: 'uint32',
        description: 'LayerZero EID for LOWJC chain (Ethereum Sepolia: 40161)',
        placeholder: '40161'
      }
    ],
    networks: {
      testnet: {
        name: 'Base Sepolia',
        chainId: 84532,
        rpcUrl: 'https://sepolia.base.org',
        explorer: 'https://sepolia.basescan.org',
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
    estimatedGas: '3.8M',
    postDeploy: {
      message: 'Standard deployment complete! Configure bridge before governance operations.',
      nextSteps: [
        '1. Deploy MainBridge with constructor parameters:',
        '   - LayerZero Endpoint: 0x6EDCE65403992e310A62460808c4b910D972f10f',
        '   - Owner: your admin wallet',
        '   - Native Chain EID: 421614 (Arbitrum Sepolia)',
        '   - Athena Client Chain EID: 40232 (OP Sepolia)',
        '   - LOWJC Chain EID: 40161 (Ethereum Sepolia)',
        '2. Set Main Chain contract addresses:',
        '   - setMainDaoContract(mainDAOAddress)',
        '   - setRewardsContract(mainRewardsAddress)',
        '3. Authorize contracts to use bridge:',
        '   - authorizeContract(mainDAOAddress, true)',
        '   - authorizeContract(mainRewardsAddress, true)',
        '4. Configure LayerZero peers on this contract:',
        '   - setPeer(nativeChainEid, nativeBridgeAddress)',
        '   - setPeer(opSepoliaEid, opBridgeAddress)',
        '   - setPeer(ethSepoliaEid, ethBridgeAddress)',
        '5. Configure Main DAO and Main Rewards with bridge:',
        '   - MainDAO.setBridge(mainBridgeAddress)',
        '   - MainRewards.setBridge(mainBridgeAddress)',
        '6. Test rewards sync from Native Chain',
        '7. Test voting power sync from Native Chain',
        '8. Test upgrade command to Native Chain',
        '9. Verify contract on Basescan/Etherscan',
        '10. CRITICAL: Main Bridge has upgrade authority - secure Main DAO access'
      ]
    }
  },
  
  securityConsiderations: [
    'Non-upgradeable: LayerZero OApp, cannot upgrade bridge itself',
    'onlyMainDAO security: Only Main DAO can send upgrade commands',
    'Authorization required: Only authorized contracts can send messages',
    'LayerZero security: Relies on LayerZero V2 DVN verification',
    'Upgrade command source: Only bridge that originates upgrades (others receive)',
    'Fee validation: Requires sufficient msg.value for batch operations',
    'Owner controls: Chain endpoints, contract addresses, authorizations',
    'No token holding: Bridge never holds funds (only routes messages)',
    'Event logging: Complete audit trail for governance actions',
    'Upgrade flow: Main DAO → Main Bridge → Native/Local Bridge → Target',
    'Batch atomicity: Multi-chain sends are atomic (all or none)',
    'Refund mechanism: Returns excess fees to prevent lock-up'
  ],
  
  code: `// Full implementation: contracts/openwork-full-contract-suite-layerzero+CCTP 2 Dec/main-chain-bridge.sol

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { OAppSender, MessagingFee } from "@layerzerolabs/oapp-evm/contracts/oapp/OAppSender.sol";
import { OAppReceiver } from "@layerzerolabs/oapp-evm/contracts/oapp/OAppReceiver.sol";

contract ThirdChainBridge is OAppSender, OAppReceiver {
    
    // ==================== STATE VARIABLES ====================
    mapping(address => bool) public authorizedContracts;
    address public mainDaoContract;
    address public rewardsContract;
    uint32 public nativeChainEid;
    uint32 public athenaClientChainEid;
    uint32 public lowjcChainEid;

    // ==================== INITIALIZATION ====================
    constructor(
        address _endpoint,
        address _owner,
        uint32 _nativeChainEid,
        uint32 _athenaClientChainEid,
        uint32 _lowjcChainEid
    ) OAppCore(_endpoint, _owner) Ownable(_owner) {
        nativeChainEid = _nativeChainEid;
        athenaClientChainEid = _athenaClientChainEid;
        lowjcChainEid = _lowjcChainEid;
    }

    // ==================== MESSAGE ROUTING ====================
    function _lzReceive(
        Origin calldata _origin,
        bytes32,
        bytes calldata _message,
        address,
        bytes calldata
    ) internal override {
        (string memory functionName) = abi.decode(_message, (string));
        
        if (keccak256(bytes(functionName)) == keccak256(bytes("syncClaimableRewards"))) {
            (, address user, uint256 claimableAmount) = abi.decode(_message, (string, address, uint256));
            IRewardsContract(rewardsContract).handleSyncClaimableRewards(user, claimableAmount, _origin.srcEid);
        }
        else if (keccak256(bytes(functionName)) == keccak256(bytes("syncVotingPower"))) {
            (, address user, uint256 totalRewards) = abi.decode(_message, (string, address, uint256));
            IMainDAO(mainDaoContract).handleSyncVotingPower(user, totalRewards, _origin.srcEid);
        }
            
        emit CrossChainMessageReceived(functionName, _origin.srcEid, _message);
    }

    // ==================== UPGRADE COMMANDS ====================
    function sendUpgradeCommand(
        uint32 _dstChainId,
        address targetProxy,
        address newImplementation,
        bytes calldata _options
    ) external payable onlyMainDAO {
        bytes memory payload = abi.encode("upgradeFromDAO", targetProxy, newImplementation);
        _lzSend(uint16(_dstChainId), payload, _options, MessagingFee(msg.value, 0), payable(msg.sender));
        emit UpgradeCommandSent(_dstChainId, targetProxy, newImplementation);
    }

    // ==================== SENDING FUNCTIONS ====================
    function sendToNativeChain(
        string memory _functionName,
        bytes memory _payload,
        bytes calldata _options
    ) external payable onlyAuthorized {
        _lzSend(nativeChainEid, _payload, _options, MessagingFee(msg.value, 0), payable(msg.sender));
        emit CrossChainMessageSent(_functionName, nativeChainEid, _payload);
    }

    function sendToTwoChains(
        string memory _functionName,
        uint32 _dstEid1,
        uint32 _dstEid2,
        bytes memory _payload1,
        bytes memory _payload2,
        bytes calldata _options1,
        bytes calldata _options2
    ) external payable onlyAuthorized {
        MessagingFee memory fee1 = _quote(_dstEid1, _payload1, _options1, false);
        MessagingFee memory fee2 = _quote(_dstEid2, _payload2, _options2, false);
        require(msg.value >= fee1.nativeFee + fee2.nativeFee, "Insufficient fee");
        
        _lzSend(_dstEid1, _payload1, _options1, fee1, payable(msg.sender));
        _lzSend(_dstEid2, _payload2, _options2, fee2, payable(msg.sender));
        
        emit CrossChainMessageSent(_functionName, _dstEid1, _payload1);
        emit CrossChainMessageSent(_functionName, _dstEid2, _payload2);
    }

    // ... Additional sending, quoting, and admin functions
    // See full implementation in repository
}`
};
