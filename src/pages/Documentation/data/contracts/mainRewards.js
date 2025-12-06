export const mainRewards = {
  id: 'mainRewards',
  name: 'Main Rewards',
  chain: 'base',
  column: 'base-main',
  order: 2,
  status: 'testnet',
  version: 'v1.0.0',
  gas: '180K',
  mainnetNetwork: 'Ethereum Mainnet',
  testnetNetwork: 'Base Sepolia',
  mainnetDeployed: 'Not deployed',
  testnetDeployed: 'Deployed',
  mainnetAddress: null,
  testnetAddress: '0xd6bE0C187408155be99C4e9d6f860eDDa27b056B',
  isUUPS: true,
  implementationAddress: '0x58c1EA0d278252e8F48C46F470b601FcbF779346',
  tvl: 'N/A',
  docs: 'Main Rewards (Cross-Chain Rewards Contract) - Manages OW token claiming on Main Chain with claimable balances synced from Native Chain. Serves as relay hub between Main DAO and Native Chain for stake data, profile creation, and reward distribution. Note: Contract must be funded with OW tokens to enable claims.',
  
  overview: {
    purpose: 'Main Rewards is the token distribution hub where users claim their earned OW tokens. It receives claimable balance updates from Native Chain via Main Bridge, allowing users who earned tokens through platform activity to withdraw them. The contract holds OW tokens in custody and distributes them when users call claimRewards(). It also serves as a critical relay between Main DAO and Native Chain - forwarding stake data from Main DAO to Native for reward calculations, and handling cross-chain profile creation. Important: The contract must be funded with OW tokens before users can claim rewards. Note: Currently deployed on Base Sepolia for testing; production deployment will be on Ethereum mainnet.',
    tier: 'Main Chain (Base Sepolia testnet / Ethereum mainnet)',
    category: 'Token Distribution - Claiming Hub',
    upgradeability: 'UUPS Upgradeable (owner + Main DAO + bridge)'
  },
  
  features: [
    'Token claiming: Users withdraw earned OW tokens synced from Native Chain',
    'Claimable balance tracking: Stores user balances synced via Main Bridge',
    'Stake data relay: Forwards Main DAO stake updates to Native Chain',
    'Profile creation handler: Receives and stores referrer relationships',
    'Main DAO integration: Local forwarding of stake data for coordination',
    'Cross-chain messaging: Notifies Native when users claim tokens',
    'Referrer tracking: Stores user referrer relationships from profiles',
    'Total claimed tracking: Records lifetime claimed amounts per user',
    'Authorized chains: Manages which chains can interact (ETH, OP, Arbitrum)',
    'Emergency controls: Owner can update balances and withdraw tokens',
    'LayerZero fee quoting: Estimates cross-chain message costs',
    'Upgradeable by Main DAO: DAO can upgrade contract via upgradeFromDAO()'
  ],
  
  systemPosition: {
    description: 'Main Rewards sits on Base Sepolia as the distribution endpoint where users claim earned OW tokens. When users earn tokens on Native Chain through job completions, Native Rewards calculates their balances and syncs them to this contract via Native Bridge → Main Bridge. Users then call claimRewards() here to receive actual OW tokens. The contract also acts as a relay hub: when Main DAO updates stake data, this contract forwards it to Native Chain via Main Bridge, keeping both chains synchronized. Profile creation flows through here too - Local chains create profiles that travel through Native to Main Rewards for referrer tracking.',
    diagram: `
📍 Main Rewards in Token Distribution Architecture

┌─────────────────────────────────────────────────────────┐
│  MAIN CHAIN (Base Sepolia) - Distribution Layer         │
├─────────────────────────────────────────────────────────┤
│  Main DAO                                                │
│     ↓ Sends stake updates when users stake              │
│     ↓                                                    │
│  ⭐ Main Rewards ⭐ (YOU ARE HERE)                       │
│     ├─> Forwards stake to Native via Main Bridge        │
│     ├─> Stores claimable balances from Native           │
│     └─> Distributes OW tokens to users                  │
│     ↑ Receives:                                         │
│     ├─ Profile creation (from Native)                   │
│     ├─ Claimable balance updates (from Native)          │
│     └─ Stake data (from Main DAO locally)               │
│                                                          │
│  OpenWork Token (OW)                                     │
│     ↑ Transferred to users on claim                     │
└───────────────────────┬─────────────────────────────────┘
                        │ Main Bridge (LayerZero)
                        ↓
┌─────────────────────────────────────────────────────────┐
│  NATIVE CHAIN (Arbitrum Sepolia) - Calculation Layer    │
├─────────────────────────────────────────────────────────┤
│  Native Rewards                                          │
│     ├─> Calculates earned tokens from activity          │
│     ├─> Sends claimable totals → Main Bridge            │
│     └─> Receives stake data for calculations            │
│                                                          │
│  NOWJC                                                   │
│     └─> Triggers reward calculations                    │
│                                                          │
│  Native Bridge                                           │
│     └─> Routes messages to/from Main Chain              │
└─────────────────────────────────────────────────────────┘

Key Flows:

1. Earning & Syncing:
   User earns on Native → Native Rewards calculates
   → Native Bridge → Main Bridge → Main Rewards.handleSyncClaimableRewards()
   → Balance stored for claiming

2. Claiming:
   User → Main Rewards.claimRewards()
   → OW tokens transferred
   → Claim notification → Main Bridge → Native Rewards

3. Stake Relay:
   Main DAO.stake() → Main Rewards.handleStakeDataUpdate()
   → Forwards to Main DAO locally
   → Main Rewards.sendStakeUpdateCrossChain() → Native

4. Profile Creation:
   Local Chain creates profile → Native → Main Bridge
   → Main Rewards.handleCreateProfile()
   → Referrer stored`
  },
  
  dependencies: {
    dependsOn: [
      { 
        name: 'OpenWork Token (OW)', 
        reason: 'ERC-20 token for actual transfers when users claim rewards.',
        type: 'Token'
      },
      { 
        name: 'Main Bridge', 
        reason: 'Receives claimable balances, profiles, stake data from Native. Sends stake updates and claim notifications.',
        type: 'Bridge'
      },
      { 
        name: 'Main DAO', 
        reason: 'Sends stake data locally when users stake. Can upgrade this contract.',
        type: 'Governance'
      }
    ],
    requiredBy: [
      { 
        name: 'Main DAO', 
        reason: 'Main Rewards forwards stake data to Main DAO locally for coordination.',
        type: 'Governance'
      },
      { 
        name: 'Native Rewards', 
        reason: 'Sends claimable balance updates here. Receives claim notifications.',
        type: 'Token Economics'
      },
      { 
        name: 'Main Bridge', 
        reason: 'Routes all cross-chain messages to/from Main Rewards.',
        type: 'Bridge'
      },
      { 
        name: 'Users', 
        reason: 'Claim earned OW tokens here after earning on Native Chain.',
        type: 'Frontend'
      }
    ],
    prerequisites: [
      'OpenWork Token deployed on Base Sepolia with supply',
      'Main Bridge deployed and configured',
      'Main DAO deployed and address set',
      'Main Rewards funded with OW tokens for claims',
      'Authorized chains configured (ETH, OP, Arbitrum)',
      'LayerZero endpoint configured for Base Sepolia'
    ]
  },
  
  functions: [
    {
      category: 'Message Handlers (Bridge-Only)',
      description: 'Receive cross-chain messages from Main Bridge',
      items: [
        {
          name: 'handleSyncClaimableRewards',
          signature: 'handleSyncClaimableRewards(address user, uint256 claimableAmount, uint32 sourceChain)',
          whatItDoes: 'Receives claimable balance update from Native Chain.',
          whyUse: 'Syncs earned token totals so users can claim on Main Chain.',
          howItWorks: [
            'Validates caller is Main Bridge',
            'Updates userClaimableBalance[user] = claimableAmount',
            'Overwrites previous value (not additive)',
            'Emits ClaimableBalanceUpdated event'
          ],
          parameters: [
            { name: 'user', type: 'address', description: 'User address' },
            { name: 'claimableAmount', type: 'uint256', description: 'Total claimable OW tokens (18 decimals)' },
            { name: 'sourceChain', type: 'uint32', description: 'Source chain EID (Native = 40231)' }
          ],
          accessControl: 'Bridge only - called automatically',
          events: ['ClaimableBalanceUpdated(user, claimableAmount, sourceChain)'],
          gasEstimate: '~40K gas',
          example: `// Automatic - called by Main Bridge
// User earns 500 OW on Native from completing jobs
// Native Rewards → Native Bridge → Main Bridge
// → Main Rewards.handleSyncClaimableRewards(user, 500e18, 40231)
// User can now claim 500 OW on Main Chain`,
          relatedFunctions: ['claimRewards', 'getClaimableRewards']
        },
        {
          name: 'handleStakeDataUpdate',
          signature: 'handleStakeDataUpdate(address staker, uint256 amount, uint256 unlockTime, uint256 durationMinutes, bool isActive, uint32 sourceChain)',
          whatItDoes: 'Receives stake data from Native/Main DAO, forwards to Main DAO locally.',
          whyUse: 'Keeps Main DAO synchronized when stake changes occur.',
          howItWorks: [
            'Validates caller is Main Bridge',
            'Checks if mainDAO is set',
            'Calls mainDAO.handleUpdateStakeDataFromRewards()',
            'Silent fail if Main DAO call fails (doesn\'t revert)',
            'Emits StakeDataForwarded event'
          ],
          parameters: [
            { name: 'staker', type: 'address', description: 'Staker address' },
            { name: 'amount', type: 'uint256', description: 'Stake amount in OW' },
            { name: 'unlockTime', type: 'uint256', description: 'Timestamp when stake unlocks' },
            { name: 'durationMinutes', type: 'uint256', description: 'Stake duration (1-3 min)' },
            { name: 'isActive', type: 'bool', description: 'true if stake active' },
            { name: 'sourceChain', type: 'uint32', description: 'Source chain EID' }
          ],
          accessControl: 'Bridge only',
          events: ['StakeDataForwarded(staker, isActive)'],
          gasEstimate: '~60K gas',
          example: `// Automatic - called by Main Bridge
// When stake data comes from Native or needs local forwarding
// → Main Rewards.handleStakeDataUpdate(...)
// → Main DAO.handleUpdateStakeDataFromRewards(...)`,
          relatedFunctions: ['sendStakeUpdateCrossChain']
        },
        {
          name: 'handleCreateProfile',
          signature: 'handleCreateProfile(address user, address referrer, uint32 sourceChain)',
          whatItDoes: 'Receives profile creation from Native Chain, stores referrer.',
          whyUse: 'Track referrer relationships for reward distribution.',
          howItWorks: [
            'Validates caller is Main Bridge',
            'Validates user address not zero',
            'If referrer provided and not same as user:',
            '  - Stores userReferrers[user] = referrer',
            'Emits ProfileCreated event'
          ],
          parameters: [
            { name: 'user', type: 'address', description: 'New user address' },
            { name: 'referrer', type: 'address', description: 'Referrer address (can be zero)' },
            { name: 'sourceChain', type: 'uint32', description: 'Chain where profile created' }
          ],
          accessControl: 'Bridge only',
          events: ['ProfileCreated(user, referrer, sourceChain)'],
          gasEstimate: '~35K gas',
          example: `// Automatic - called by Main Bridge
// User creates profile on Local Chain with referrer
// Local → Native → Main Bridge → Main Rewards.handleCreateProfile()
// Referrer relationship stored`,
          relatedFunctions: ['getUserReferrer']
        }
      ]
    },
    {
      category: 'Claiming Functions',
      description: 'User claims earned OW tokens',
      items: [
        {
          name: 'claimRewards',
          signature: 'claimRewards(bytes _options) payable',
          whatItDoes: 'User claims their earned OW tokens.',
          whyUse: 'Withdraw tokens earned from platform activity.',
          howItWorks: [
            'Gets user claimable balance',
            'Validates balance > 0',
            'Validates contract has enough OW tokens',
            'Resets userClaimableBalance to 0',
            'Updates userTotalClaimed',
            'Transfers OW tokens to user',
            'Sends claim notification to Native Chain',
            'Emits RewardsClaimed event'
          ],
          parameters: [
            { name: '_options', type: 'bytes', description: 'LayerZero options for claim notification' }
          ],
          accessControl: 'Public - any user with claimable balance',
          events: ['RewardsClaimed(user, amount)'],
          gasEstimate: '~120K gas + LayerZero fee',
          example: `// User claims 500 OW earned on Native
const claimable = await mainRewards.getClaimableRewards(userAddress);
console.log('Claimable:', ethers.formatEther(claimable), 'OW');

const lzOptions = ethers.solidityPacked(["uint16", "uint256"], [1, 200000]);
const fee = await mainRewards.quoteClaimSync(userAddress, claimable, lzOptions);

await mainRewards.claimRewards(lzOptions, { value: fee });
// OW tokens transferred to wallet
// Native Rewards notified of claim`,
          relatedFunctions: ['getClaimableRewards', 'quoteClaimSync']
        },
        {
          name: 'getClaimableRewards',
          signature: 'getClaimableRewards(address user) view returns (uint256)',
          whatItDoes: 'Get user\'s current claimable OW token balance.',
          whyUse: 'Check how much user can claim before calling claimRewards().',
          howItWorks: [
            'Returns userClaimableBalance[user]',
            'Updated by handleSyncClaimableRewards()',
            'Reset to 0 after claiming'
          ],
          parameters: [
            { name: 'user', type: 'address', description: 'User address' }
          ],
          accessControl: 'Public view',
          events: ['None (view)'],
          gasEstimate: 'N/A (view)',
          example: `const claimable = await mainRewards.getClaimableRewards(userAddress);
if (claimable > 0) {
  console.log('You can claim:', ethers.formatEther(claimable), 'OW');
} else {
  console.log('No rewards to claim yet');
}`,
          relatedFunctions: ['claimRewards', 'getUserRewardInfo']
        }
      ]
    },
    {
      category: 'Stake Relay Functions (Main DAO)',
      description: 'Forward stake updates to Native Chain',
      items: [
        {
          name: 'sendStakeUpdateCrossChain',
          signature: 'sendStakeUpdateCrossChain(address staker, uint256 amount, uint256 unlockTime, uint256 durationMinutes, bool isActive, bytes _options) payable',
          whatItDoes: 'Main DAO sends stake update to Native Chain via this relay.',
          whyUse: 'Synchronize stake data to Native for reward calculations.',
          howItWorks: [
            'Validates caller is Main DAO',
            'Validates bridge is set',
            'Encodes "updateStakeData" payload',
            'Sends via Main Bridge to Native Chain',
            'Uses msg.value for LayerZero fee'
          ],
          parameters: [
            { name: 'staker', type: 'address', description: 'Staker address' },
            { name: 'amount', type: 'uint256', description: 'Stake amount' },
            { name: 'unlockTime', type: 'uint256', description: 'Unlock timestamp' },
            { name: 'durationMinutes', type: 'uint256', description: 'Duration (1-3)' },
            { name: 'isActive', type: 'bool', description: 'Stake active status' },
            { name: '_options', type: 'bytes', description: 'LayerZero options' }
          ],
          accessControl: 'Main DAO only',
          events: ['None (bridge events)'],
          gasEstimate: '~80K gas + LayerZero fee',
          example: `// Called by Main DAO internally when user stakes
// Main DAO.stake() → Main Rewards.sendStakeUpdateCrossChain()
// → Main Bridge → Native Bridge → Native Rewards`,
          relatedFunctions: ['quoteStakeUpdate', 'handleStakeDataUpdate']
        },
        {
          name: 'quoteStakeUpdate',
          signature: 'quoteStakeUpdate(address staker, uint256 amount, uint256 unlockTime, uint256 durationMinutes, bool isActive, bytes _options) view returns (uint256 fee)',
          whatItDoes: 'Get LayerZero fee for stake update message.',
          whyUse: 'Main DAO quotes fee before sending stake update.',
          howItWorks: [
            'Returns 0 if bridge not set',
            'Encodes stake data payload',
            'Quotes fee from Main Bridge',
            'Returns fee in wei'
          ],
          parameters: [
            { name: 'staker', type: 'address', description: 'Staker address' },
            { name: 'amount', type: 'uint256', description: 'Stake amount' },
            { name: 'unlockTime', type: 'uint256', description: 'Unlock time' },
            { name: 'durationMinutes', type: 'uint256', description: 'Duration' },
            { name: 'isActive', type: 'bool', description: 'Active status' },
            { name: '_options', type: 'bytes', description: 'LayerZero options' }
          ],
          accessControl: 'Public view',
          events: ['None (view)'],
          gasEstimate: 'N/A (view)',
          example: `const fee = await mainRewards.quoteStakeUpdate(
  staker, amount, unlockTime, duration, true, lzOptions
);
console.log('Fee:', ethers.formatEther(fee), 'ETH');`,
          relatedFunctions: ['sendStakeUpdateCrossChain']
        }
      ]
    },
    {
      category: 'View Functions',
      description: 'Query user reward and chain information',
      items: [
        {
          name: 'getUserRewardInfo',
          signature: 'getUserRewardInfo(address user) view returns (uint256 claimableAmount, uint256 totalClaimed)',
          whatItDoes: 'Get complete reward info for user.',
          whyUse: 'Single call to get both claimable and claimed amounts.',
          howItWorks: [
            'Returns userClaimableBalance[user]',
            'Returns userTotalClaimed[user]',
            'Both values in 18-decimal OW tokens'
          ],
          parameters: [
            { name: 'user', type: 'address', description: 'User address' }
          ],
          accessControl: 'Public view',
          events: ['None (view)'],
          gasEstimate: 'N/A (view)',
          example: `const { claimableAmount, totalClaimed } = 
  await mainRewards.getUserRewardInfo(userAddress);

console.log('Claimable:', ethers.formatEther(claimableAmount));
console.log('Total claimed:', ethers.formatEther(totalClaimed));`,
          relatedFunctions: ['getClaimableRewards', 'claimRewards']
        },
        {
          name: 'getUserReferrer',
          signature: 'getUserReferrer(address user) view returns (address)',
          whatItDoes: 'Get user\'s referrer address.',
          whyUse: 'Check who referred a user for reward distribution.',
          howItWorks: [
            'Returns userReferrers[user]',
            'Returns zero address if no referrer',
            'Set via handleCreateProfile()'
          ],
          parameters: [
            { name: 'user', type: 'address', description: 'User address' }
          ],
          accessControl: 'Public view',
          events: ['None (view)'],
          gasEstimate: 'N/A (view)',
          example: `const referrer = await mainRewards.getUserReferrer(userAddress);
if (referrer === ethers.ZeroAddress) {
  console.log('No referrer');
} else {
  console.log('Referred by:', referrer);
}`,
          relatedFunctions: ['handleCreateProfile']
        },
        {
          name: 'getAuthorizedChains',
          signature: 'getAuthorizedChains() view returns (uint32[] chains, bool[] authorized, string[] names)',
          whatItDoes: 'Get list of authorized chain EIDs.',
          whyUse: 'Check which chains can interact with this contract.',
          howItWorks: [
            'Returns array of common testnet chains',
            'ETH Sepolia (40161)',
            'OP Sepolia (40232)',
            'Arbitrum Sepolia (40231)',
            'With authorization status and names'
          ],
          parameters: [],
          accessControl: 'Public view',
          events: ['None (view)'],
          gasEstimate: 'N/A (view)',
          example: `const { chains, authorized, names } = await mainRewards.getAuthorizedChains();
for (let i = 0; i < chains.length; i++) {
  console.log(names[i], 'EID:', chains[i], 'Auth:', authorized[i]);
}`,
          relatedFunctions: ['isChainAuthorized', 'updateAuthorizedChain']
        },
        {
          name: 'quoteClaimSync',
          signature: 'quoteClaimSync(address user, uint256 claimAmount, bytes _options) view returns (uint256 fee)',
          whatItDoes: 'Get LayerZero fee for claim notification.',
          whyUse: 'Estimate msg.value needed for claimRewards().',
          howItWorks: [
            'Returns 0 if bridge not set',
            'Encodes "updateUserClaimData" payload',
            'Quotes fee from Main Bridge'
          ],
          parameters: [
            { name: 'user', type: 'address', description: 'User address' },
            { name: 'claimAmount', type: 'uint256', description: 'Claim amount' },
            { name: '_options', type: 'bytes', description: 'LayerZero options' }
          ],
          accessControl: 'Public view',
          events: ['None (view)'],
          gasEstimate: 'N/A (view)',
          example: `const claimable = await mainRewards.getClaimableRewards(userAddress);
const fee = await mainRewards.quoteClaimSync(userAddress, claimable, lzOptions);
await mainRewards.claimRewards(lzOptions, { value: fee });`,
          relatedFunctions: ['claimRewards']
        }
      ]
    },
    {
      category: 'Admin Functions',
      description: 'Owner configuration and emergency controls',
      items: [
        {
          name: 'setBridge',
          signature: 'setBridge(address _bridge)',
          whatItDoes: 'Update Main Bridge contract address.',
          whyUse: 'Reconnect to new bridge if upgraded.',
          howItWorks: [
            'Validates caller is owner',
            'Stores old bridge address',
            'Updates bridge interface',
            'Emits BridgeUpdated event'
          ],
          parameters: [
            { name: '_bridge', type: 'address', description: 'New Main Bridge address' }
          ],
          accessControl: 'onlyOwner',
          events: ['BridgeUpdated(oldBridge, newBridge)'],
          gasEstimate: '~30K gas',
          example: `await mainRewards.setBridge(newBridgeAddress);`,
          relatedFunctions: ['setMainDAO', 'setOpenworkToken']
        },
        {
          name: 'setMainDAO',
          signature: 'setMainDAO(address _mainDAO)',
          whatItDoes: 'Update Main DAO contract address.',
          whyUse: 'Connect to new Main DAO if upgraded.',
          howItWorks: [
            'Validates caller is owner',
            'Updates mainDAO interface',
            'Emits ContractUpdated event'
          ],
          parameters: [
            { name: '_mainDAO', type: 'address', description: 'New Main DAO address' }
          ],
          accessControl: 'onlyOwner',
          events: ['ContractUpdated("MainDAO", address)'],
          gasEstimate: '~30K gas',
          example: `await mainRewards.setMainDAO(newDAOAddress);`,
          relatedFunctions: ['setBridge']
        },
        {
          name: 'setOpenworkToken',
          signature: 'setOpenworkToken(address _token)',
          whatItDoes: 'Update OpenWork Token contract address.',
          whyUse: 'Connect to new token if upgraded.',
          howItWorks: [
            'Validates caller is owner',
            'Updates openworkToken interface',
            'Emits ContractUpdated event'
          ],
          parameters: [
            { name: '_token', type: 'address', description: 'New OW token address' }
          ],
          accessControl: 'onlyOwner',
          events: ['ContractUpdated("OpenworkToken", address)'],
          gasEstimate: '~30K gas',
          example: `await mainRewards.setOpenworkToken(newTokenAddress);`,
          relatedFunctions: ['setBridge']
        },
        {
          name: 'updateAuthorizedChain',
          signature: 'updateAuthorizedChain(uint32 _chainEid, bool _authorized, string _chainName)',
          whatItDoes: 'Authorize or deauthorize a chain EID.',
          whyUse: 'Add new chains or remove deprecated ones.',
          howItWorks: [
            'Validates caller is owner',
            'Sets authorizedChains[chainEid] = authorized',
            'If authorized and name provided, stores chain name',
            'Emits AuthorizedChainUpdated event'
          ],
          parameters: [
            { name: '_chainEid', type: 'uint32', description: 'Chain EID' },
            { name: '_authorized', type: 'bool', description: 'Authorization status' },
            { name: '_chainName', type: 'string', description: 'Chain name (optional)' }
          ],
          accessControl: 'onlyOwner',
          events: ['AuthorizedChainUpdated(chainEid, authorized, chainName)'],
          gasEstimate: '~35K gas',
          example: `// Add new chain
await mainRewards.updateAuthorizedChain(40245, true, "Polygon Mumbai");

// Remove chain
await mainRewards.updateAuthorizedChain(40245, false, "");`,
          relatedFunctions: ['getAuthorizedChains']
        },
        {
          name: 'emergencyUpdateUserBalance',
          signature: 'emergencyUpdateUserBalance(address user, uint256 newBalance)',
          whatItDoes: 'Manually update user claimable balance.',
          whyUse: 'Emergency fix if sync fails or data corrupted.',
          howItWorks: [
            'Validates caller is owner',
            'Sets userClaimableBalance[user] = newBalance',
            'Emits ClaimableBalanceUpdated with sourceChain = 0'
          ],
          parameters: [
            { name: 'user', type: 'address', description: 'User address' },
            { name: 'newBalance', type: 'uint256', description: 'New claimable amount' }
          ],
          accessControl: 'onlyOwner',
          events: ['ClaimableBalanceUpdated(user, newBalance, 0)'],
          gasEstimate: '~30K gas',
          example: `// Emergency fix
await mainRewards.emergencyUpdateUserBalance(
  userAddress,
  ethers.parseEther("1000")
);`,
          relatedFunctions: ['getClaimableRewards']
        },
        {
          name: 'emergencyWithdraw',
          signature: 'emergencyWithdraw(uint256 amount)',
          whatItDoes: 'Owner withdraws OW tokens from contract.',
          whyUse: 'Emergency recovery or rebalancing.',
          howItWorks: [
            'Validates caller is owner',
            'Transfers amount OW to owner',
            'Reverts if transfer fails'
          ],
          parameters: [
            { name: 'amount', type: 'uint256', description: 'Amount to withdraw' }
          ],
          accessControl: 'onlyOwner',
          events: ['None (token transfer event)'],
          gasEstimate: '~50K gas',
          example: `await mainRewards.emergencyWithdraw(ethers.parseEther("10000"));`,
          relatedFunctions: ['setOpenworkToken']
        },
        {
          name: 'upgradeFromDAO',
          signature: 'upgradeFromDAO(address newImplementation)',
          whatItDoes: 'Main DAO upgrades this contract to new implementation.',
          whyUse: 'DAO-driven upgrades for new features or fixes.',
          howItWorks: [
            'Validates caller is Main DAO',
            'Calls upgradeToAndCall() with new implementation',
            'UUPS upgrade preserves storage'
          ],
          parameters: [
            { name: 'newImplementation', type: 'address', description: 'New implementation address' }
          ],
          accessControl: 'Main DAO only',
          events: ['None (UUPS upgrade events)'],
          gasEstimate: '~100K gas',
          example: `// Via Main DAO governance
// Main DAO votes to upgrade Main Rewards
// → Main DAO.upgradeContract() → Main Rewards.upgradeFromDAO()`,
          relatedFunctions: ['setMainDAO']
        }
      ]
    }
  ],
  
  dataFlows: [
    {
      title: 'Earning & Claiming Flow',
      description: 'User earns on Native, syncs balance, claims on Main',
      steps: [
        { chain: 'Native Chain', action: '1. User completes job, earns 500 OW' },
        { chain: 'Native Chain', action: '2. Native Rewards calculates balance' },
        { chain: 'Native Chain', action: '3. User/system triggers sync' },
        { chain: 'Native Chain', action: '4. Native Bridge → Main Bridge' },
        { chain: 'Main Chain', action: '5. Main Bridge → Main Rewards.handleSyncClaimableRewards()' },
        { chain: 'Main Chain', action: '6. userClaimableBalance[user] = 500 OW' },
        { chain: 'Main Chain', action: '7. User calls claimRewards()' },
        { chain: 'Main Chain', action: '8. OW tokens transferred to user' },
        { chain: 'Main Chain', action: '9. Claim notification → Main Bridge → Native' },
        { chain: 'Native Chain', action: '10. Native Rewards updates claimed records' }
      ]
    },
    {
      title: 'Stake Relay Flow',
      description: 'Main DAO stake forwarded to Native via Main Rewards',
      steps: [
        { chain: 'Main Chain', action: '1. User stakes 500 OW in Main DAO' },
        { chain: 'Main Chain', action: '2. Main DAO stores stake locally' },
        { chain: 'Main Chain', action: '3. Main DAO → Main Rewards.sendStakeUpdateCrossChain()' },
        { chain: 'Main Chain', action: '4. Main Rewards → Main Bridge' },
        { chain: 'Native Chain', action: '5. Native Bridge receives stake data' },
        { chain: 'Native Chain', action: '6. Native Rewards records stake' },
        { chain: 'Native Chain', action: '7. Stake affects reward calculations' }
      ]
    },
    {
      title: 'Profile Creation Flow',
      description: 'Profile with referrer flows through system',
      steps: [
        { chain: 'Local Chain', action: '1. User creates profile with referrer' },
        { chain: 'Local Chain', action: '2. Local Bridge → Native Bridge' },
        { chain: 'Native Chain', action: '3. ProfileManager creates profile' },
        { chain: 'Native Chain', action: '4. Native Bridge → Main Bridge' },
        { chain: 'Main Chain', action: '5. Main Bridge → Main Rewards.handleCreateProfile()' },
        { chain: 'Main Chain', action: '6. userReferrers[user] = referrer stored' }
      ]
    }
  ],
  
  integrationGuide: {
    example: `// Main Rewards Integration Example
const { ethers } = require('ethers');

// 1. Setup
const mainRewards = new ethers.Contract(
  mainRewardsAddress,
  mainRewardsABI,
  signer
);
const owToken = new ethers.Contract(owTokenAddress, erc20ABI, signer);

// ⚠️ STEP 1: FUND THE CONTRACT (CRITICAL!)
// Without this, ALL claims will fail
const fundingAmount = ethers.parseEther("100000"); // 100K OW tokens
await owToken.transfer(mainRewardsAddress, fundingAmount);
console.log('Main Rewards funded with', ethers.formatEther(fundingAmount), 'OW');

// Check contract balance
const contractBalance = await owToken.balanceOf(mainRewardsAddress);
console.log('Contract balance:', ethers.formatEther(contractBalance), 'OW');

// 2. Check claimable balance
const claimable = await mainRewards.getClaimableRewards(userAddress);
console.log('Claimable:', ethers.formatEther(claimable), 'OW');

// 3. Get complete reward info
const { claimableAmount, totalClaimed } = 
  await mainRewards.getUserRewardInfo(userAddress);
console.log('Can claim:', ethers.formatEther(claimableAmount));
console.log('Already claimed:', ethers.formatEther(totalClaimed));

// 4. Claim rewards
if (claimable > 0) {
  const lzOptions = ethers.solidityPacked(["uint16", "uint256"], [1, 200000]);
  const fee = await mainRewards.quoteClaimSync(userAddress, claimable, lzOptions);
  
  await mainRewards.claimRewards(lzOptions, { value: fee });
  console.log('Claimed', ethers.formatEther(claimable), 'OW tokens!');
}

// 5. Check referrer
const referrer = await mainRewards.getUserReferrer(userAddress);
if (referrer !== ethers.ZeroAddress) {
  console.log('Referred by:', referrer);
}`,
    tips: [
      'Main Rewards is the claiming hub - users withdraw earned OW here',
      'Claimable balances synced from Native Chain via Main Bridge',
      'Claiming sends notification back to Native to update records',
      'Contract must be funded with OW tokens for claims',
      'Main Rewards relays stake data between Main DAO and Native',
      'Profile creation stores referrer relationships',
      'LayerZero fees required for cross-chain claim notifications',
      'Always check claimable balance before claiming',
      'Total claimed tracks lifetime withdrawals',
      'Emergency functions for owner if sync fails',
      'Authorized chains: ETH, OP, Arbitrum Sepolia',
      'Main DAO can upgrade via upgradeFromDAO()',
      'Bridge can also upgrade via _authorizeUpgrade',
      'Contract holds OW tokens for distribution',
      'Silent fail on Main DAO forwards prevents blocking'
    ]
  },
  
  deployConfig: {
    type: 'uups',
    constructor: [
      {
        name: '_owner',
        type: 'address',
        description: 'Contract owner address (admin who can upgrade and configure)',
        placeholder: '0x...'
      },
      {
        name: '_openworkToken',
        type: 'address',
        description: 'OpenWork Token (OW) ERC-20 contract address',
        placeholder: '0x...'
      },
      {
        name: '_bridge',
        type: 'address',
        description: 'Main Bridge contract address (for cross-chain messaging)',
        placeholder: '0x...'
      }
    ],
    networks: {
      testnet: {
        name: 'Base Sepolia',
        chainId: 84532,
        rpcUrl: 'https://sepolia.base.org',
        explorer: 'https://sepolia.basescan.org',
        currency: 'ETH'
      }
    },
    estimatedGas: '3.2M',
    postDeploy: {
      message: 'UUPS deployment complete! Next: Initialize, configure, and FUND with OW tokens.',
      nextSteps: [
        '1. Deploy MainRewards (CrossChainRewardsContract) implementation (no constructor params)',
        '2. Deploy UUPSProxy with implementation address',
        '3. Call initialize() on proxy via block scanner with:',
        '   - Owner address (your admin wallet)',
        '   - OpenWork Token address (OW ERC-20)',
        '   - Main Bridge address',
        '4. Set Main DAO address: setMainDAO(mainDAOAddress)',
        '5. Configure authorized chains:',
        '   - updateAuthorizedChain(40161, true, "Ethereum Sepolia")',
        '   - updateAuthorizedChain(40232, true, "OP Sepolia")',
        '   - updateAuthorizedChain(40231, true, "Arbitrum Sepolia")',
        '6. ⚠️ CRITICAL: Fund contract with OW tokens!',
        '   - Transfer OW tokens to contract address',
        '   - Without funding, ALL claims will FAIL',
        '   - Recommended: 100,000+ OW for testing',
        '7. Test claimable balance sync from Native Chain',
        '8. Test user claim flow',
        '9. Verify both implementation and proxy on Basescan',
        '10. Monitor contract OW balance and refund as needed'
      ]
    }
  },
  
  securityConsiderations: [
    'UUPS upgradeable: Owner, Main DAO, or bridge can authorize upgrades',
    'Bridge-only handlers: Only Main Bridge can call message handlers',
    'Main DAO-only relay: Only Main DAO can send stake updates',
    'Reentrancy protection: ReentrancyGuard on claimRewards()',
    'Balance overwrites: handleSyncClaimableRewards overwrites (not additive)',
    'Silent forwards: Main DAO forwards fail silently (no blocking)',
    'Emergency controls: Owner can update balances and withdraw',
    'Cross-chain dependency: Relies on Main Bridge for all messaging',
    'Token custody: Contract holds OW tokens for claims',
    'Authorized chains: Only whitelisted chains can interact',
    'LayerZero security: Inherits LayerZero V2 DVN security',
    'No direct user stake: Users stake in Main DAO, not here',
    'Referrer immutability: Once set, referrer cannot be changed',
    'Claim resets balance: Prevents double claiming',
    'Owner powers: Can set bridge, DAO, token addresses'
  ],
  
  code: `// Full implementation: contracts/openwork-full-contract-suite-layerzero+CCTP 2 Dec/main-rewards.sol

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import { UUPSUpgradeable } from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import { OwnableUpgradeable } from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import { ReentrancyGuardUpgradeable } from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

contract CrossChainRewardsContract is 
    Initializable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable
{
    // ==================== STATE VARIABLES ====================
    IERC20 public openworkToken;
    IMainDAO public mainDAO;
    IThirdChainBridge public bridge;
    
    mapping(address => address) public userReferrers;
    mapping(address => uint256) public userClaimableBalance;
    mapping(address => uint256) public userTotalClaimed;
    mapping(uint32 => bool) public authorizedChains;
    mapping(uint32 => string) public chainNames;

    // ==================== INITIALIZATION ====================
    constructor() {
        _disableInitializers();
    }
    
    function initialize(
        address _owner, 
        address _openworkToken, 
        address _bridge
    ) public initializer {
        __Ownable_init(_owner);
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        
        openworkToken = IERC20(_openworkToken);
        bridge = IThirdChainBridge(_bridge);
        _initializeAuthorizedChains();
    }
    
    function _authorizeUpgrade(address) internal view override {
        require(owner() == _msgSender() || address(bridge) == _msgSender() || address(mainDAO) == _msgSender(), "Unauthorized");
    }

    // ==================== MESSAGE HANDLERS ====================
    function handleCreateProfile(address user, address referrer, uint32 sourceChain) external {
        require(msg.sender == address(bridge), "Only bridge");
        _createProfile(user, referrer, sourceChain);
    }
    
    function handleStakeDataUpdate(
        address staker, 
        uint256 amount, 
        uint256 unlockTime, 
        uint256 durationMinutes, 
        bool isActive, 
        uint32
    ) external {
        require(msg.sender == address(bridge), "Only bridge");
        
        if (address(mainDAO) != address(0)) {
            mainDAO.handleUpdateStakeDataFromRewards(staker, amount, unlockTime, durationMinutes, isActive);
        }
    }

    function handleSyncClaimableRewards(
        address user,
        uint256 claimableAmount,
        uint32 sourceChain
    ) external {
        require(msg.sender == address(bridge), "Only bridge");
        userClaimableBalance[user] = claimableAmount;
        emit ClaimableBalanceUpdated(user, claimableAmount, sourceChain);
    }

    // ==================== CLAIMING ====================
    function claimRewards(bytes calldata _options) external payable nonReentrant {
        uint256 claimableAmount = userClaimableBalance[msg.sender];
        require(claimableAmount > 0, "No rewards");
        require(openworkToken.balanceOf(address(this)) >= claimableAmount, "Insufficient balance");
        
        userClaimableBalance[msg.sender] = 0;
        userTotalClaimed[msg.sender] += claimableAmount;
        
        require(openworkToken.transfer(msg.sender, claimableAmount), "Transfer failed");

        if (address(bridge) != address(0)) {
            bytes memory payload = abi.encode("updateUserClaimData", msg.sender, claimableAmount);
            bridge.sendToNativeChain{value: msg.value}("updateUserClaimData", payload, _options);
        }
        
        emit RewardsClaimed(msg.sender, claimableAmount);
    }

    function getClaimableRewards(address user) public view returns (uint256) {
        return userClaimableBalance[user];
    }

    // ... Additional admin and view functions
    // See full implementation in repository
}`
};
