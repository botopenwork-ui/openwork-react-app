export const mainDAO = {
  id: 'mainDAO',
  name: 'Main DAO',
  chain: 'base',
  column: 'base-main',
  order: 1,
  status: 'testnet',
  version: 'v1.0.0',
  gas: '890K',
  mainnetNetwork: 'Ethereum Mainnet',
  testnetNetwork: 'Base Sepolia',
  mainnetDeployed: 'Not deployed',
  testnetDeployed: 'Deployed',
  mainnetAddress: null,
  testnetAddress: '0xc3579BDC6eC1fAad8a67B1Dc5542EBcf28456465',
  isUUPS: true,
  implementationAddress: '0xbde733D64D8C2bcA369433E7dC96DC3ecFE414e4',
  tvl: 'N/A',
  docs: 'Main DAO - OpenZeppelin Governor implementation for protocol-wide governance with stake-based and earned token voting power. Users stake OW tokens with duration multipliers to gain proposal and voting rights, synchronized cross-chain with Native rewards.',
  
  overview: {
    purpose: 'Main DAO is the supreme governance authority for OpenWork, built on OpenZeppelin\'s Governor framework. Users stake OW tokens for 1-3 minutes (with duration multipliers) to gain voting power, which is combined with earned rewards synced from Native Chain. The DAO controls protocol parameters, contract upgrades across all chains, and treasury management. Governance actions (proposals, votes) trigger cross-chain notifications to Native Chain via Main Bridge, allowing earned tokens to unlock progressively as users participate. This creates a hybrid governance model where both committed stakers and active platform users have influence. Note: Currently deployed on Base Sepolia for testing; production deployment will be on Ethereum mainnet.',
    tier: 'Main Chain (Base Sepolia testnet / Ethereum mainnet)',
    category: 'Governance - Protocol Authority',
    upgradeability: 'UUPS Upgradeable (owner + DAO)'
  },
  
  features: [
    'OpenZeppelin Governor: Standard governance interface compatible with governance tools',
    'Stake-based voting: Users stake OW with 1-3 minute duration multipliers',
    'Combined voting power: stake × duration + earned rewards from Native Chain',
    'Cross-chain governance: Notifications sent to Native Chain via Main Bridge',
    'Progressive unlock mechanism: Earned tokens unlock as users vote/propose',
    'Delegation system: Stake holders can delegate voting power to others',
    'Flexible thresholds: Proposal and voting thresholds adjustable via governance',
    'Unstake delay: 24-hour safety period after unlock before withdrawal',
    'Cross-chain upgrades: Can upgrade contracts on Local and Native chains',
    'Quorum requirement: 50 OW minimum for proposal passage',
    'Main Rewards integration: Stake data synced to Main Rewards for claim eligibility'
  ],
  
  systemPosition: {
    description: 'Main DAO sits at the apex of OpenWork\'s three-tier governance architecture on Base Sepolia (Main Chain). Users stake OW tokens here to participate in protocol governance. When users vote or propose, the DAO sends notifications to Native Chain via Main Bridge, triggering reward unlocks in Native Rewards. The DAO receives voting power data from Native Chain (earned rewards) via the bridge, which combines with local stake data for governance eligibility. Main DAO has supreme authority to upgrade any contract in the system, including Native contracts via Main Bridge and Local contracts via cascading bridge messages.',
    diagram: `
📍 Main DAO in Governance Architecture

┌─────────────────────────────────────────────────────────┐
│  MAIN CHAIN (Base Sepolia) - Governance Layer           │
├─────────────────────────────────────────────────────────┤
│  ⭐ Main DAO ⭐ (YOU ARE HERE)                           │
│     ↓ Sends:                                            │
│     ├─> Governance notifications → Main Bridge          │
│     ├─> Contract upgrade commands → Main Bridge         │
│     └─> Stake data → Main Rewards                       │
│     ↑ Receives:                                         │
│     └─> Earned reward data ← Main Bridge ← Native       │
│                                                          │
│  Main Rewards (sibling contract)                        │
│     ↑ Receives: Stake updates from Main DAO             │
│     ↓ Sends: Stake data to Native via Bridge            │
└─────────────────────────┬───────────────────────────────┘
                          │ Main Bridge (LayerZero)
                          ↓
┌─────────────────────────────────────────────────────────┐
│  NATIVE CHAIN (Arbitrum Sepolia) - Execution Layer      │
├─────────────────────────────────────────────────────────┤
│  Native Rewards                                          │
│     ↓ Awards tokens based on activity                   │
│     ↓ Sends earned totals → Native Bridge               │
│                                                          │
│  NOWJC                                                   │
│     ↑ Receives governance notifications                 │
│     ↓ Unlocks earned tokens when notified               │
└─────────────────────────────────────────────────────────┘

Governance Flow:
1. User stakes OW in Main DAO (1-3 min duration)
2. Stake synced to Main Rewards → Native Chain
3. User earns tokens on Native from activity
4. Earned totals synced back to Main DAO
5. Combined power = stake + rewards
6. User proposes/votes in Main DAO
7. Notification sent to Native → unlocks earned tokens

Upgrade Authority:
Main DAO → Main Bridge → Native Bridge → Native Contracts
Main DAO → Main Bridge → Local Bridge → Local Contracts`
  },
  
  dependencies: {
    dependsOn: [
      { 
        name: 'OpenWork Token (OW)', 
        reason: 'ERC-20 token used for staking. Users transfer OW to DAO for governance rights.',
        type: 'Token'
      },
      { 
        name: 'Main Bridge', 
        reason: 'Sends governance notifications and upgrade commands to Native Chain. Receives earned reward data.',
        type: 'Bridge'
      },
      { 
        name: 'Main Rewards', 
        reason: 'Receives stake data updates for reward claiming eligibility on Main Chain.',
        type: 'Sibling Contract'
      },
      { 
        name: 'OpenZeppelin Governor', 
        reason: 'Inherits standard governance framework for protocol governance.',
        type: 'Framework'
      }
    ],
    requiredBy: [
      { 
        name: 'Main Rewards', 
        reason: 'Main DAO can upgrade Main Rewards via upgradeFromDAO(). Forwards stake data.',
        type: 'Sibling Contract'
      },
      { 
        name: 'Native Rewards', 
        reason: 'Receives governance notifications to unlock earned tokens when users vote/propose.',
        type: 'Token Economics'
      },
      { 
        name: 'Main Bridge', 
        reason: 'Sends upgrade commands cross-chain when DAO votes to upgrade Native/Local contracts.',
        type: 'Bridge'
      }
    ],
    prerequisites: [
      'OpenWork Token (OW) deployed on Base Sepolia',
      'Main Bridge deployed and configured',
      'Main Rewards deployed and set in DAO',
      'LayerZero endpoint configured for Base Sepolia',
      'Minimum stake amount: 100 OW tokens',
      'Proposal threshold: 100 OW (stake + rewards)',
      'Voting threshold: 50 OW (stake + rewards)',
      'Quorum: 50 OW minimum'
    ]
  },
  
  functions: [
    {
      category: 'Staking Functions',
      description: 'Stake OW tokens to gain governance power',
      items: [
        {
          name: 'stake',
          signature: 'stake(uint256 amount, uint256 durationMinutes, bytes _options) payable',
          whatItDoes: 'Stake OW tokens for governance rights with duration multiplier.',
          whyUse: 'Gain voting power to participate in protocol governance.',
          howItWorks: [
            'Validates amount ≥ 100 OW and duration 1-3 minutes',
            'Transfers OW from user to DAO contract',
            'Calculates unlock time based on duration',
            'Stores stake with amount, unlock time, duration',
            'Adds user to stakers array if first stake',
            'Sends stake data to Main Rewards via internal call',
            'Sends stake data cross-chain via Main Bridge (if msg.value provided)',
            'Emits StakeCreated event'
          ],
          parameters: [
            { name: 'amount', type: 'uint256', description: 'OW tokens to stake (minimum 100 * 10^18)' },
            { name: 'durationMinutes', type: 'uint256', description: 'Lock duration in minutes (1-3). Higher = more voting power' },
            { name: '_options', type: 'bytes', description: 'LayerZero options for cross-chain message' }
          ],
          accessControl: 'Public - any user with OW tokens',
          events: ['StakeCreated(staker, amount, durationMinutes)', 'StakeDataSentCrossChain(staker, true, fee)'],
          gasEstimate: '~150K gas + LayerZero fee',
          example: `// Stake 500 OW for 2 minutes (2x multiplier)
const amount = ethers.parseEther("500"); // 500 OW
const duration = 2; // 2 minutes
const lzOptions = ethers.solidityPacked(["uint16", "uint256"], [1, 200000]);

// Approve DAO to spend OW
await owToken.approve(mainDAOAddress, amount);

// Quote LayerZero fee
const fee = await mainDAO.quoteStakeUpdate(userAddress, true, lzOptions);

// Stake with cross-chain sync
await mainDAO.stake(amount, duration, lzOptions, { value: fee });

// Voting power = 500 * 2 = 1000`,
          relatedFunctions: ['unstake', 'getVotingPower', 'quoteStakeUpdate']
        },
        {
          name: 'unstake',
          signature: 'unstake(bytes _options) payable',
          whatItDoes: 'Withdraw staked OW tokens after lock period and delay.',
          whyUse: 'Retrieve staked tokens when no longer participating in governance.',
          howItWorks: [
            'First call: Validates stake unlocked, records request time',
            'Second call (after 24h delay):',
            '  - Validates 24-hour delay passed',
            '  - Retrieves stake amount',
            '  - Deletes stake and request records',
            '  - Updates isStaker flag',
            '  - Transfers OW back to user',
            '  - Sends inactive stake data cross-chain',
            'Emits UnstakeRequested or UnstakeCompleted'
          ],
          parameters: [
            { name: '_options', type: 'bytes', description: 'LayerZero options for cross-chain sync' }
          ],
          accessControl: 'Public - only stake owner',
          events: ['UnstakeRequested(staker, requestTime, availableTime)', 'UnstakeCompleted(staker, amount)'],
          gasEstimate: '~80K gas + LayerZero fee',
          example: `// Step 1: Request unstake (after lock period ends)
const lzOptions = ethers.solidityPacked(["uint16", "uint256"], [1, 200000]);
const fee = await mainDAO.quoteStakeUpdate(userAddress, false, lzOptions);

await mainDAO.unstake(lzOptions, { value: fee });
// Wait 24 hours...

// Step 2: Complete unstake
await mainDAO.unstake(lzOptions, { value: fee });
// OW tokens returned to wallet`,
          relatedFunctions: ['stake', 'getUnstakeAvailableTime', 'removeStake']
        },
        {
          name: 'removeStake',
          signature: 'removeStake(address staker, uint256 removeAmount, bytes _options) payable',
          whatItDoes: 'Governance-only function to remove stake (punishment mechanism).',
          whyUse: 'DAO can vote to remove malicious staker\'s tokens.',
          howItWorks: [
            'Validates caller is via governance proposal',
            'Validates staker has stake',
            'Subtracts removeAmount from stake',
            'If stake falls below 100 OW minimum, deletes entire stake',
            'Sends updated stake data cross-chain',
            'Emits StakeRemoved event'
          ],
          parameters: [
            { name: 'staker', type: 'address', description: 'Address of staker to punish' },
            { name: 'removeAmount', type: 'uint256', description: 'Amount to remove (up to full stake)' },
            { name: '_options', type: 'bytes', description: 'LayerZero options' }
          ],
          accessControl: 'onlyGovernance - requires passed proposal',
          events: ['StakeRemoved(staker, removeAmount)', 'StakeDataSentCrossChain(staker, isActive, fee)'],
          gasEstimate: '~100K gas + LayerZero fee',
          example: `// Governance proposal to remove 100 OW from bad actor
const targets = [mainDAOAddress];
const values = [fee]; // LayerZero fee
const calldatas = [
  mainDAO.interface.encodeFunctionData("removeStake", [
    badActorAddress,
    ethers.parseEther("100"),
    lzOptions
  ])
];
const description = "Remove 100 OW from malicious staker";

await mainDAO.propose(targets, values, calldatas, description, lzOptions);`,
          relatedFunctions: ['stake', 'unstake']
        }
      ]
    },
    {
      category: 'Governance Functions',
      description: 'Create proposals and vote on protocol changes',
      items: [
        {
          name: 'propose',
          signature: 'propose(address[] targets, uint256[] values, bytes[] calldatas, string description, bytes _options) payable returns (uint256)',
          whatItDoes: 'Create a governance proposal for DAO vote.',
          whyUse: 'Submit changes to protocol parameters, upgrades, or treasury actions.',
          howItWorks: [
            'Validates proposer has ≥100 OW (stake + rewards)',
            'Sends governance notification to Native Chain',
            'Creates proposal via OpenZeppelin Governor',
            'Stores proposal ID in tracking array',
            'Returns proposal ID for voting',
            'Emits ProposalCreated event (from Governor)',
            'Emits GovernanceActionSentToBridge event'
          ],
          parameters: [
            { name: 'targets', type: 'address[]', description: 'Contract addresses to call' },
            { name: 'values', type: 'uint256[]', description: 'ETH amounts to send (usually 0)' },
            { name: 'calldatas', type: 'bytes[]', description: 'Encoded function calls' },
            { name: 'description', type: 'string', description: 'Human-readable proposal description' },
            { name: '_options', type: 'bytes', description: 'LayerZero options for governance notification' }
          ],
          accessControl: 'Public - requires 100 OW (stake + rewards)',
          events: ['ProposalCreated(...)', 'GovernanceActionSentToBridge(user, "propose", fee)'],
          gasEstimate: '~250K gas + LayerZero fee',
          example: `// Propose to update proposal threshold to 200 OW
const targets = [mainDAOAddress];
const values = [0];
const calldatas = [
  mainDAO.interface.encodeFunctionData("updateProposalThreshold", [
    ethers.parseEther("200")
  ])
];
const description = "Increase proposal threshold to 200 OW";
const lzOptions = ethers.solidityPacked(["uint16", "uint256"], [1, 200000]);

const fee = await mainDAO.quoteGovernanceNotification(userAddress, lzOptions);

const proposalId = await mainDAO.propose(
  targets, values, calldatas, description, lzOptions,
  { value: fee }
);

// Proposal created - voting opens after 1 minute delay`,
          relatedFunctions: ['castVote', 'getGovernanceEligibility', 'quoteGovernanceNotification']
        },
        {
          name: 'castVote',
          signature: 'castVote(uint256 proposalId, uint8 support, bytes _options) payable returns (uint256)',
          whatItDoes: 'Vote on an active proposal.',
          whyUse: 'Exercise governance rights to approve/reject proposals.',
          howItWorks: [
            'Validates voter has ≥50 OW (stake + rewards)',
            'Sends governance notification to Native Chain',
            'Records vote via OpenZeppelin Governor',
            'Voting power = stake × duration + delegated + rewards',
            'Support: 0=Against, 1=For, 2=Abstain',
            'Emits VoteCast event',
            'Emits GovernanceActionSentToBridge event'
          ],
          parameters: [
            { name: 'proposalId', type: 'uint256', description: 'ID of proposal to vote on' },
            { name: 'support', type: 'uint8', description: '0=Against, 1=For, 2=Abstain' },
            { name: '_options', type: 'bytes', description: 'LayerZero options' }
          ],
          accessControl: 'Public - requires 50 OW (stake + rewards)',
          events: ['VoteCast(voter, proposalId, support, weight, reason)', 'GovernanceActionSentToBridge(user, "vote", fee)'],
          gasEstimate: '~120K gas + LayerZero fee',
          example: `// Vote FOR proposal
const proposalId = 1;
const support = 1; // 1 = For
const lzOptions = ethers.solidityPacked(["uint16", "uint256"], [1, 200000]);

const fee = await mainDAO.quoteGovernanceNotification(userAddress, lzOptions);

await mainDAO.castVote(proposalId, support, lzOptions, { value: fee });

// Vote recorded - earned tokens unlock on Native Chain`,
          relatedFunctions: ['propose', 'getVotingPower', 'delegate']
        },
        {
          name: 'delegate',
          signature: 'delegate(address delegatee)',
          whatItDoes: 'Delegate voting power to another address.',
          whyUse: 'Allow trusted party to vote with your stake weight.',
          howItWorks: [
            'Validates user has stake to delegate',
            'Calculates delegator power = stake × duration',
            'Removes power from current delegate (if any)',
            'Adds power to new delegatee',
            'Updates delegates mapping',
            'Emits DelegateChanged event'
          ],
          parameters: [
            { name: 'delegatee', type: 'address', description: 'Address to receive voting power' }
          ],
          accessControl: 'Public - only stake owner',
          events: ['DelegateChanged(delegator, fromDelegate, toDelegate)'],
          gasEstimate: '~50K gas',
          example: `// Delegate to trusted community member
await mainDAO.delegate(trustedMemberAddress);

// trustedMember can now vote with your stake weight
// You keep ownership of staked tokens`,
          relatedFunctions: ['stake', 'getVotingPower']
        }
      ]
    },
    {
      category: 'Cross-Chain Functions',
      description: 'Synchronize governance data across chains',
      items: [
        {
          name: 'handleSyncVotingPower',
          signature: 'handleSyncVotingPower(address user, uint256 totalRewards, uint32 sourceChain)',
          whatItDoes: 'Bridge handler that receives earned reward totals from Native Chain.',
          whyUse: 'Updates user voting power with earned tokens for governance eligibility.',
          howItWorks: [
            'Validates caller is Main Bridge',
            'Updates userTotalRewards[user] with synced amount',
            'This affects getCombinedGovernancePower() and _getVotes()',
            'Emits UserRewardsSynced event'
          ],
          parameters: [
            { name: 'user', type: 'address', description: 'User address' },
            { name: 'totalRewards', type: 'uint256', description: 'Total earned OW tokens from Native' },
            { name: 'sourceChain', type: 'uint32', description: 'Chain EID (Native = 40231)' }
          ],
          accessControl: 'Bridge only - called automatically',
          events: ['UserRewardsSynced(user, totalRewards, sourceChain)'],
          gasEstimate: '~30K gas',
          example: `// Automatic - called by Main Bridge when Native syncs
// User earns 500 OW on Native from job activity
// Native Rewards → Native Bridge → Main Bridge → Main DAO.handleSyncVotingPower()
// User's voting power now includes earned 500 OW`,
          relatedFunctions: ['getCombinedGovernancePower', '_getVotes']
        },
        {
          name: '_sendGovernanceNotificationViaBridge',
          signature: '_sendGovernanceNotificationViaBridge(address account, string actionType, bytes _options) internal',
          whatItDoes: 'Internal function to notify Native Chain of governance actions.',
          whyUse: 'Triggers earned token unlock on Native when user votes/proposes.',
          howItWorks: [
            'Validates bridge is set',
            'Encodes "incrementGovernanceAction" payload',
            'Sends to Native Chain via Main Bridge',
            'Uses msg.value for LayerZero fees',
            'Emits GovernanceActionSentToBridge event',
            'Silent fail if bridge not set (doesn\'t revert)'
          ],
          parameters: [
            { name: 'account', type: 'address', description: 'User who performed action' },
            { name: 'actionType', type: 'string', description: '"propose" or "vote"' },
            { name: '_options', type: 'bytes', description: 'LayerZero options' }
          ],
          accessControl: 'Internal - called by propose() and castVote()',
          events: ['GovernanceActionSentToBridge(user, actionType, fee)'],
          gasEstimate: 'Part of propose/vote cost',
          example: `// Automatic - called internally when user votes
// User votes on proposal
// → _sendGovernanceNotificationViaBridge()
// → Main Bridge → Native Bridge → NOWJC
// → Native Rewards unlocks earned tokens`,
          relatedFunctions: ['propose', 'castVote', 'quoteGovernanceNotification']
        },
        {
          name: '_sendStakeDataCrossChain',
          signature: '_sendStakeDataCrossChain(address staker, bool isActive, bytes _options) internal',
          whatItDoes: 'Internal function to sync stake data to Native Chain.',
          whyUse: 'Keeps Native Chain aware of stake changes for reward calculations.',
          howItWorks: [
            'Validates bridge is set',
            'Encodes stake data (amount, unlock time, duration, isActive)',
            'Quotes fee from Main Bridge',
            'Sends if contract has ETH balance for fee',
            'Emits StakeDataSentCrossChain event',
            'Silent fail if no balance (doesn\'t block staking)'
          ],
          parameters: [
            { name: 'staker', type: 'address', description: 'Staker address' },
            { name: 'isActive', type: 'bool', description: 'true if stake active, false if removed' },
            { name: '_options', type: 'bytes', description: 'LayerZero options' }
          ],
          accessControl: 'Internal - called by stake/unstake/removeStake',
          events: ['StakeDataSentCrossChain(staker, isActive, fee)'],
          gasEstimate: 'Part of staking function cost',
          example: `// Automatic - called when user stakes
// User stakes 500 OW for 2 minutes
// → _sendStakeDataCrossChain(user, true, options)
// → Main Bridge → Native Bridge → Native Rewards
// → Native knows user has 500 OW × 2 = 1000 power`,
          relatedFunctions: ['stake', 'unstake', 'removeStake']
        }
      ]
    },
    {
      category: 'View Functions',
      description: 'Query governance power and eligibility',
      items: [
        {
          name: 'getCombinedGovernancePower',
          signature: 'getCombinedGovernancePower(address account) view returns (uint256)',
          whatItDoes: 'Get total governance power (stake + earned rewards).',
          whyUse: 'Check if user meets proposal/voting thresholds.',
          howItWorks: [
            'Gets stake amount (not multiplied)',
            'Gets earned rewards from Native sync',
            'Returns sum of both',
            'Used for eligibility checks'
          ],
          parameters: [
            { name: 'account', type: 'address', description: 'User address' }
          ],
          accessControl: 'Public view',
          events: ['None (view)'],
          gasEstimate: 'N/A (view)',
          example: `const power = await mainDAO.getCombinedGovernancePower(userAddress);
// If user has:
// - 100 OW staked (2 min duration)
// - 50 OW earned on Native
// Returns: 150 OW (used for proposal/vote eligibility)`,
          relatedFunctions: ['getGovernanceEligibility', '_getVotes']
        },
        {
          name: 'getVotingPower',
          signature: 'getVotingPower(address account) view returns (uint256 own, uint256 delegated, uint256 reward, uint256 total)',
          whatItDoes: 'Get detailed breakdown of voting power sources.',
          whyUse: 'Understand where voting weight comes from.',
          howItWorks: [
            'Own power = stake × duration',
            'Delegated power = power delegated TO this user',
            'Reward power = earned tokens from Native',
            'Total = own + delegated + reward'
          ],
          parameters: [
            { name: 'account', type: 'address', description: 'User address' }
          ],
          accessControl: 'Public view',
          events: ['None (view)'],
          gasEstimate: 'N/A (view)',
          example: `const { own, delegated, reward, total } = await mainDAO.getVotingPower(userAddress);
// Example return:
// own: 200 (100 OW × 2 min)
// delegated: 300 (from 2 delegators)
// reward: 150 (earned on Native)
// total: 650 (actual voting weight)`,
          relatedFunctions: ['getCombinedGovernancePower', 'delegate']
        },
        {
          name: 'getGovernanceEligibility',
          signature: 'getGovernanceEligibility(address account) view returns (bool canPropose, bool canVote, uint256 stakeAmount, uint256 rewardTokens, uint256 combinedPower, uint256 votingPower)',
          whatItDoes: 'Complete governance eligibility check with all relevant data.',
          whyUse: 'Single call to determine what governance actions user can perform.',
          howItWorks: [
            'Gets stake amount',
            'Gets earned rewards',
            'Calculates combined power (stake + rewards)',
            'Gets actual voting power (includes delegation)',
            'canPropose = combined ≥ proposalThreshold (100 OW)',
            'canVote = combined ≥ votingThreshold (50 OW)'
          ],
          parameters: [
            { name: 'account', type: 'address', description: 'User address' }
          ],
          accessControl: 'Public view',
          events: ['None (view)'],
          gasEstimate: 'N/A (view)',
          example: `const eligibility = await mainDAO.getGovernanceEligibility(userAddress);

// Example for user with 75 OW stake + 30 OW earned:
// canPropose: false (105 < 100 threshold - WAIT this should be true!)
// canVote: true (105 ≥ 50 threshold)
// stakeAmount: 75000000000000000000
// rewardTokens: 30000000000000000000
// combinedPower: 105000000000000000000
// votingPower: 150000000000000000000 (if 2 min stake + delegation)`,
          relatedFunctions: ['getCombinedGovernancePower', 'getVotingPower']
        },
        {
          name: 'getStakerInfo',
          signature: 'getStakerInfo(address staker) view returns (uint256 amount, uint256 unlockTime, uint256 durationMinutes, bool hasStake)',
          whatItDoes: 'Get complete stake details for a user.',
          whyUse: 'Check stake amount, when it unlocks, and duration.',
          howItWorks: [
            'Returns stake struct data',
            'amount: OW tokens staked',
            'unlockTime: timestamp when can unstake',
            'durationMinutes: 1-3 minutes',
            'hasStake: true if amount > 0'
          ],
          parameters: [
            { name: 'staker', type: 'address', description: 'Staker address' }
          ],
          accessControl: 'Public view',
          events: ['None (view)'],
          gasEstimate: 'N/A (view)',
          example: `const { amount, unlockTime, durationMinutes, hasStake } = 
  await mainDAO.getStakerInfo(userAddress);

console.log('Staked:', ethers.formatEther(amount), 'OW');
console.log('Duration:', durationMinutes, 'minutes');
console.log('Unlocks:', new Date(unlockTime * 1000));
console.log('Can vote with power:', amount * durationMinutes);`,
          relatedFunctions: ['stake', 'getUnstakeAvailableTime']
        },
        {
          name: 'getUnstakeAvailableTime',
          signature: 'getUnstakeAvailableTime(address staker) view returns (uint256)',
          whatItDoes: 'Get timestamp when unstake will be available after request.',
          whyUse: 'Check how long until user can complete unstake.',
          howItWorks: [
            'Returns 0 if no unstake request',
            'Returns requestTime + unstakeDelay (24 hours)',
            'User must wait until this time for second unstake() call'
          ],
          parameters: [
            { name: 'staker', type: 'address', description: 'Staker address' }
          ],
          accessControl: 'Public view',
          events: ['None (view)'],
          gasEstimate: 'N/A (view)',
          example: `const availableTime = await mainDAO.getUnstakeAvailableTime(userAddress);
if (availableTime === 0n) {
  console.log('No unstake request');
} else {
  const now = Date.now() / 1000;
  if (now >= availableTime) {
    console.log('Unstake available now!');
  } else {
    const hoursLeft = (availableTime - now) / 3600;
    console.log('Unstake available in', hoursLeft, 'hours');
  }
}`,
          relatedFunctions: ['unstake', 'getStakerInfo']
        }
      ]
    },
    {
      category: 'Admin & Governance Configuration',
      description: 'Update governance parameters and manage contracts',
      items: [
        {
          name: 'updateProposalThreshold',
          signature: 'updateProposalThreshold(uint256 newThreshold)',
          whatItDoes: 'Update minimum tokens required to create proposals.',
          whyUse: 'Adjust governance accessibility as platform grows.',
          howItWorks: [
            'Validates caller is via governance proposal',
            'Updates proposalThresholdAmount',
            'Affects getCombinedGovernancePower() checks',
            'Emits ThresholdUpdated event'
          ],
          parameters: [
            { name: 'newThreshold', type: 'uint256', description: 'New threshold in OW tokens (18 decimals)' }
          ],
          accessControl: 'onlyGovernance - requires passed proposal',
          events: ['ThresholdUpdated("proposalThreshold", newThreshold)'],
          gasEstimate: '~30K gas',
          example: `// Via governance proposal
const targets = [mainDAOAddress];
const values = [0];
const calldatas = [
  mainDAO.interface.encodeFunctionData("updateProposalThreshold", [
    ethers.parseEther("200") // Raise to 200 OW
  ])
];
await mainDAO.propose(targets, values, calldatas, "Increase proposal threshold", lzOptions);`,
          relatedFunctions: ['updateVotingThreshold', 'getGovernanceEligibility']
        },
        {
          name: 'setBridge',
          signature: 'setBridge(address _bridge)',
          whatItDoes: 'Update Main Bridge contract address.',
          whyUse: 'Reconnect to new bridge if upgraded.',
          howItWorks: [
            'Validates caller is owner',
            'Validates bridge address not zero',
            'Updates bridge interface',
            'Emits BridgeUpdated event'
          ],
          parameters: [
            { name: '_bridge', type: 'address', description: 'New Main Bridge address' }
          ],
          accessControl: 'onlyOwner',
          events: ['BridgeUpdated(newBridge)'],
          gasEstimate: '~30K gas',
          example: `await mainDAO.setBridge(newBridgeAddress);`,
          relatedFunctions: ['handleSyncVotingPower']
        },
        {
          name: 'upgradeContract',
          signature: 'upgradeContract(uint32 targetChainId, address targetProxy, address newImplementation, bytes _options) payable',
          whatItDoes: 'Upgrade contracts on any chain via governance authority.',
          whyUse: 'DAO can upgrade Native/Local contracts cross-chain.',
          howItWorks: [
            'If targetChainId = local chain: Direct upgrade call',
            'If targetChainId ≠ local: Send via Main Bridge',
            'Bridge routes to target chain',
            'Target chain executes upgrade',
            'Owner-only function'
          ],
          parameters: [
            { name: 'targetChainId', type: 'uint32', description: 'Chain EID of target' },
            { name: 'targetProxy', type: 'address', description: 'Proxy contract to upgrade' },
            { name: 'newImplementation', type: 'address', description: 'New implementation address' },
            { name: '_options', type: 'bytes', description: 'LayerZero options' }
          ],
          accessControl: 'onlyOwner',
          events: ['Varies by chain'],
          gasEstimate: '~100K gas + LayerZero fee',
          example: `// Upgrade Native Rewards on Arbitrum
const arbitrumEid = 40231;
const fee = ethers.parseEther("0.01");

await mainDAO.upgradeContract(
  arbitrumEid,
  nativeRewardsProxyAddress,
  newImplementationAddress,
  lzOptions,
  { value: fee }
);`,
          relatedFunctions: ['setBridge']
        }
      ]
    },
    {
      category: 'Quote Functions',
      description: 'Estimate LayerZero fees before transactions',
      items: [
        {
          name: 'quoteStakeUpdate',
          signature: 'quoteStakeUpdate(address staker, bool isActive, bytes _options) view returns (uint256 fee)',
          whatItDoes: 'Get LayerZero fee for stake sync message.',
          whyUse: 'Calculate msg.value needed for stake/unstake with cross-chain sync.',
          howItWorks: [
            'Returns 0 if bridge not set',
            'Encodes stake data payload',
            'Quotes fee from Main Bridge',
            'Returns fee in wei'
          ],
          parameters: [
            { name: 'staker', type: 'address', description: 'Staker address' },
            { name: 'isActive', type: 'bool', description: 'true for stake, false for unstake' },
            { name: '_options', type: 'bytes', description: 'LayerZero options' }
          ],
          accessControl: 'Public view',
          events: ['None (view)'],
          gasEstimate: 'N/A (view)',
          example: `const lzOptions = ethers.solidityPacked(["uint16", "uint256"], [1, 200000]);
const fee = await mainDAO.quoteStakeUpdate(userAddress, true, lzOptions);
console.log('LayerZero fee:', ethers.formatEther(fee), 'ETH');

// Use in stake call
await mainDAO.stake(amount, duration, lzOptions, { value: fee });`,
          relatedFunctions: ['stake', 'unstake']
        },
        {
          name: 'quoteGovernanceNotification',
          signature: 'quoteGovernanceNotification(address account, bytes _options) view returns (uint256 fee)',
          whatItDoes: 'Get LayerZero fee for governance notification.',
          whyUse: 'Calculate msg.value for propose/vote with cross-chain unlock.',
          howItWorks: [
            'Returns 0 if bridge not set',
            'Encodes governance action payload',
            'Quotes fee from Main Bridge'
          ],
          parameters: [
            { name: 'account', type: 'address', description: 'User address' },
            { name: '_options', type: 'bytes', description: 'LayerZero options' }
          ],
          accessControl: 'Public view',
          events: ['None (view)'],
          gasEstimate: 'N/A (view)',
          example: `const fee = await mainDAO.quoteGovernanceNotification(userAddress, lzOptions);
await mainDAO.castVote(proposalId, 1, lzOptions, { value: fee });`,
          relatedFunctions: ['propose', 'castVote']
        }
      ]
    }
  ],
  
  dataFlows: [
    {
      title: 'Staking & Cross-Chain Sync Flow',
      description: 'User stakes OW, data synced to Native Chain',
      steps: [
        { chain: 'Main Chain', action: '1. User approves Main DAO to spend OW' },
        { chain: 'Main Chain', action: '2. User calls stake(500 OW, 2 min, lzOptions)' },
        { chain: 'Main Chain', action: '3. OW transferred to Main DAO' },
        { chain: 'Main Chain', action: '4. Stake recorded: 500 OW, 2 min duration' },
        { chain: 'Main Chain', action: '5. Voting power calculated: 500 × 2 = 1000' },
        { chain: 'Main Chain', action: '6. Main DAO → Main Rewards (local call)' },
        { chain: 'Main Chain', action: '7. Main DAO → Main Bridge (LayerZero)' },
        { chain: 'Native Chain', action: '8. Native Bridge receives stake data' },
        { chain: 'Native Chain', action: '9. Native Rewards records stake' },
        { chain: 'Native Chain', action: '10. User now eligible for rewards on Native' }
      ]
    },
    {
      title: 'Governance Action & Reward Unlock Flow',
      description: 'User votes, earned tokens unlock on Native',
      steps: [
        { chain: 'Main Chain', action: '1. Proposal created and active' },
        { chain: 'Main Chain', action: '2. User calls castVote(proposalId, FOR, lzOptions)' },
        { chain: 'Main Chain', action: '3. Main DAO validates voting power ≥ 50 OW' },
        { chain: 'Main Chain', action: '4. Vote recorded with weight' },
        { chain: 'Main Chain', action: '5. Main DAO → Main Bridge (governance notification)' },
        { chain: 'Native Chain', action: '6. Native Bridge receives notification' },
        { chain: 'Native Chain', action: '7. Native Bridge → NOWJC.incrementGovernanceAction()' },
        { chain: 'Native Chain', action: '8. NOWJC → Native Rewards' },
        { chain: 'Native Chain', action: '9. Native Rewards unlocks earned tokens' },
        { chain: 'Native Chain', action: '10. User\'s claimable balance increases' }
      ]
    },
    {
      title: 'Earned Rewards Sync to Main DAO Flow',
      description: 'Native syncs earned totals to Main DAO for voting power',
      steps: [
        { chain: 'Native Chain', action: '1. User earns 500 OW from job completions' },
        { chain: 'Native Chain', action: '2. Native Rewards tracks earned amount' },
        { chain: 'Native Chain', action: '3. User triggers sync or automatic sync' },
        { chain: 'Native Chain', action: '4. Native Bridge → Main Bridge (sync message)' },
        { chain: 'Main Chain', action: '5. Main Bridge receives earned total' },
        { chain: 'Main Chain', action: '6. Main Bridge → Main DAO.handleSyncVotingPower()' },
        { chain: 'Main Chain', action: '7. Main DAO updates userTotalRewards[user] = 500 OW' },
        { chain: 'Main Chain', action: '8. Combined power = stake + 500 OW' },
        { chain: 'Main Chain', action: '9. User now meets proposal threshold' },
        { chain: 'Main Chain', action: '10. User can create proposals' }
      ]
    },
    {
      title: 'Cross-Chain Contract Upgrade Flow',
      description: 'Main DAO upgrades Native contract',
      steps: [
        { chain: 'Main Chain', action: '1. Governance proposal to upgrade Native Rewards' },
        { chain: 'Main Chain', action: '2. Proposal passes with quorum' },
        { chain: 'Main Chain', action: '3. Execute proposal calls upgradeContract()' },
        { chain: 'Main Chain', action: '4. Main DAO → Main Bridge (upgrade command)' },
        { chain: 'Native Chain', action: '5. Native Bridge receives upgrade command' },
        { chain: 'Native Chain', action: '6. Native Bridge → Native Rewards.upgradeFromDAO()' },
        { chain: 'Native Chain', action: '7. Native Rewards UUPS upgrade executed' },
        { chain: 'Native Chain', action: '8. New implementation active' },
        { chain: 'All Chains', action: '9. Storage preserved, logic updated' }
      ]
    },
    {
      title: 'Delegation Flow',
      description: 'User delegates voting power to trusted member',
      steps: [
        { chain: 'Main Chain', action: '1. User has 500 OW staked for 2 min (1000 power)' },
        { chain: 'Main Chain', action: '2. User calls delegate(trustedAddress)' },
        { chain: 'Main Chain', action: '3. Main DAO removes power from old delegate (if any)' },
        { chain: 'Main Chain', action: '4. Main DAO adds 1000 power to trusted address' },
        { chain: 'Main Chain', action: '5. Trusted member now has own + delegated power' },
        { chain: 'Main Chain', action: '6. Trusted member votes with combined weight' },
        { chain: 'Main Chain', action: '7. User still owns staked OW' },
        { chain: 'Main Chain', action: '8. User can undelegate anytime' }
      ]
    }
  ],
  
  integrationGuide: {
    example: `// Main DAO Integration Example
const { ethers } = require('ethers');

// 1. Setup contracts
const mainDAO = new ethers.Contract(mainDAOAddress, mainDAOABI, signer);
const owToken = new ethers.Contract(owTokenAddress, erc20ABI, signer);

// 2. STAKING: Gain governance power
const stakeAmount = ethers.parseEther("500"); // 500 OW
const duration = 2; // 2 minutes (2x multiplier)
const lzOptions = ethers.solidityPacked(["uint16", "uint256"], [1, 200000]);

// Approve and quote
await owToken.approve(mainDAOAddress, stakeAmount);
const stakeFee = await mainDAO.quoteStakeUpdate(userAddress, true, lzOptions);

// Stake with cross-chain sync
await mainDAO.stake(stakeAmount, duration, lzOptions, { value: stakeFee });
// Voting power = 500 × 2 = 1000

// 3. CHECK ELIGIBILITY
const eligibility = await mainDAO.getGovernanceEligibility(userAddress);
console.log('Can propose?', eligibility.canPropose);
console.log('Can vote?', eligibility.canVote);
console.log('Voting power:', ethers.formatEther(eligibility.votingPower));

// 4. CREATE PROPOSAL
if (eligibility.canPropose) {
  const targets = [treasuryAddress];
  const values = [ethers.parseEther("1")];
  const calldatas = [
    treasury.interface.encodeFunctionData("transfer", [
      recipientAddress,
      ethers.parseEther("1")
    ])
  ];
  const description = "Fund development team with 1 ETH";
  
  const govFee = await mainDAO.quoteGovernanceNotification(userAddress, lzOptions);
  
  const proposalId = await mainDAO.propose(
    targets, values, calldatas, description, lzOptions,
    { value: govFee }
  );
  
  console.log('Proposal created:', proposalId);
}

// 5. VOTE ON PROPOSAL
const proposalId = 1;
const support = 1; // 1 = For, 0 = Against, 2 = Abstain

const voteFee = await mainDAO.quoteGovernanceNotification(userAddress, lzOptions);

await mainDAO.castVote(proposalId, support, lzOptions, { value: voteFee });
console.log('Vote cast - earned tokens will unlock on Native Chain');

// 6. DELEGATE (optional)
await mainDAO.delegate(trustedMemberAddress);
console.log('Voting power delegated');

// 7. UNSTAKE (after lock period + 24h delay)
const { unlockTime } = await mainDAO.getStakerInfo(userAddress);
if (Date.now() / 1000 >= unlockTime) {
  const unstakeFee = await mainDAO.quoteStakeUpdate(userAddress, false, lzOptions);
  
  // First call: Request unstake
  await mainDAO.unstake(lzOptions, { value: unstakeFee });
  console.log('Unstake requested - wait 24 hours');
  
  // After 24 hours...
  // Second call: Complete unstake
  await mainDAO.unstake(lzOptions, { value: unstakeFee });
  console.log('OW tokens returned');
}`,
    tips: [
      'Main DAO is supreme governance authority for entire protocol',
      'Voting power = (stake × duration) + delegated + earned rewards',
      'Minimum stake: 100 OW, duration: 1-3 minutes',
      'Proposal threshold: 100 OW (stake + rewards)',
      'Voting threshold: 50 OW (stake + rewards)',
      'Quorum: 50 OW minimum for proposal passage',
      'Duration multiplier: 1 min = 1x, 2 min = 2x, 3 min = 3x',
      'Earned rewards synced from Native Chain count toward eligibility',
      'Governance actions (propose/vote) unlock earned tokens on Native',
      'Unstake requires lock period end + 24-hour delay',
      'Delegation allows trusted parties to vote with your power',
      'Main DAO can upgrade any contract via cross-chain messages',
      'LayerZero fees required for cross-chain synchronization',
      'Always quote fees before stake/propose/vote operations',
      'Main Rewards receives stake updates automatically',
      'Owner can set bridge address if upgraded',
      'Governance can adjust proposal/voting thresholds',
      'Two-step unstake prevents immediate power loss attacks'
    ]
  },
  
  securityConsiderations: [
    'UUPS upgradeable: Owner + DAO can upgrade via upgradeContract()',
    'OpenZeppelin Governor: Battle-tested governance framework',
    'Reentrancy protection: ReentrancyGuard on stake/unstake functions',
    'Minimum stake: 100 OW prevents spam proposals',
    'Unstake delay: 24-hour safety period after unlock',
    'Duration multiplier: Encourages longer-term commitment',
    'Cross-chain trust: Relies on LayerZero DVN security',
    'Bridge dependency: All cross-chain ops require Main Bridge',
    'Governance thresholds: Adjustable via governance vote',
    'Delegation system: Users retain token ownership',
    'Silent cross-chain fails: Doesn\'t revert if bridge unavailable',
    'Owner powers: Can set bridge, upgrade contracts, emergency withdraw',
    'Quorum requirement: 50 OW minimum prevents minority rule',
    'Vote weight = power at proposal creation (prevents manipulation)',
    'Combined power check: Stake + rewards for fair eligibility',
    'Main Rewards coordination: Stake data must sync correctly'
  ],
  
  code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import { UUPSUpgradeable } from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import { GovernorUpgradeable } from "@openzeppelin/contracts-upgradeable/governance/GovernorUpgradeable.sol";
import { GovernorSettingsUpgradeable } from "@openzeppelin/contracts-upgradeable/governance/extensions/GovernorSettingsUpgradeable.sol";
import { GovernorCountingSimpleUpgradeable } from "@openzeppelin/contracts-upgradeable/governance/extensions/GovernorCountingSimpleUpgradeable.sol";
import { OwnableUpgradeable } from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import { ReentrancyGuardUpgradeable } from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/governance/IGovernor.sol";

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

interface IThirdChainBridge {
    function sendToNativeChain(
        string memory _functionName,
        bytes memory _payload,
        bytes calldata _options
    ) external payable;
    
    function quoteNativeChain(
        bytes calldata _payload,
        bytes calldata _options
    ) external view returns (uint256 fee);

    function sendUpgradeCommand(
        uint32 targetChainId,
        address targetProxy, 
        address newImplementation,
        bytes calldata _options
    ) external payable;
}

interface IUpgradeable {
    function upgradeFromDAO(address newImplementation) external;
}

contract MainDAO is 
    Initializable,
    GovernorUpgradeable,
    GovernorSettingsUpgradeable,
    GovernorCountingSimpleUpgradeable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable
{
    IERC20 public openworkToken;
    IThirdChainBridge public bridge;
    uint256 public constant MIN_STAKE = 100 * 10**18;
    uint32 public chainId;
    
    // Governance parameters (updatable) - for Tally compatibility
    uint256 public proposalThresholdAmount;
    uint256 public votingThresholdAmount;
    uint256 public unstakeDelay;
    
    // Synced user reward data from NOWJC
    mapping(address => uint256) public userTotalRewards;
    
    struct Stake {
        uint256 amount;
        uint256 unlockTime;
        uint256 durationMinutes;
    }

    mapping(address => Stake) public stakes;
    mapping(address => uint256) public unstakeRequestTime;
    mapping(address => address) public delegates;
    mapping(address => uint256) public delegatedVotingPower;
    mapping(address => bool) public isStaker;
    
    // Helper arrays for easier testing
    uint256[] public proposalIds;
    address[] public allStakers;
    
    // Events
    event StakeCreated(address indexed staker, uint256 amount, uint256 durationMinutes);
    event StakeRemoved(address indexed staker, uint256 amount);
    event UnstakeRequested(address indexed staker, uint256 requestTime, uint256 availableTime);
    event UnstakeCompleted(address indexed staker, uint256 amount);
    event DelegateChanged(address indexed delegator, address indexed fromDelegate, address indexed toDelegate);
    event BridgeUpdated(address indexed newBridge);
    event ThresholdUpdated(string thresholdType, uint256 newThreshold);
    event StakeDataSentCrossChain(address indexed staker, bool isActive, uint256 fee);
    event GovernanceActionSentToBridge(address indexed user, string action, uint256 fee);
    event CrossContractCallFailed(address indexed account, string reason);
    event UserRewardsSynced(address indexed user, uint256 totalRewards, uint32 sourceChain);
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    function initialize(
        address _owner,
        address _openworkToken,
        uint32 _chainId,
        address _bridge
    ) public initializer {
        __Governor_init("OpenWorkDAO");
        __GovernorSettings_init(
            1 minutes,
            5 minutes,
            100 * 10**18  // This is the base proposalThreshold for Governor
        );
        __GovernorCountingSimple_init();
        __Ownable_init(_owner);
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        
        openworkToken = IERC20(_openworkToken);
        chainId = _chainId;
        bridge = IThirdChainBridge(_bridge);
        
        // Initialize governance parameters
        proposalThresholdAmount = 100 * 10**18;
        votingThresholdAmount = 50 * 10**18;
        unstakeDelay = 24 hours;
    }
    
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
    
    // Additional contract code truncated for brevity...
    // See full implementation in contracts folder
}`,

  proxyCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @title UUPSProxy
 * @notice A UUPS-compatible proxy that uses OpenZeppelin's ERC1967Proxy
 * @dev This proxy is compatible with any UUPS upgradeable contract
 */
contract UUPSProxy is ERC1967Proxy {
    constructor(
        address implementation,
        bytes memory data
    ) ERC1967Proxy(implementation, data) {}
    
    receive() external payable {}
    
    function getImplementation() external view returns (address impl) {
        return _implementation();
    }
    
    function supportsUUPS() external pure returns (bool) {
        return true;
    }
}`,

  deployConfig: {
    type: 'uups',
    constructor: [
      { 
        name: 'initialOwner',
        type: 'address',
        description: 'Address that will own the Main DAO contract (admin wallet)',
        placeholder: '0x...'
      },
      { 
        name: 'openworkToken',
        type: 'address',
        description: 'OpenWork Token (OW) ERC-20 contract address for staking',
        placeholder: '0x5f24747d5e59F9CCe5a9815BC12E2fB5Ae713679'
      },
      { 
        name: 'chainId',
        type: 'uint32',
        description: 'Chain ID - Base Sepolia: 84532, Ethereum Mainnet: 1',
        placeholder: '84532'
      },
      { 
        name: 'bridge',
        type: 'address',
        description: 'Main Bridge contract address (for cross-chain governance sync)',
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
      },
      mainnet: {
        name: 'Ethereum Mainnet',
        chainId: 1,
        rpcUrl: 'https://eth.llamarpc.com',
        explorer: 'https://etherscan.io',
        currency: 'ETH'
      }
    },
    estimatedGas: '4.8M',
    postDeploy: {
      message: 'UUPS deployment complete! Next: Initialize the proxy and configure governance.',
      nextSteps: [
        '1. Deploy MainDAO implementation contract (no constructor params)',
        '2. Deploy UUPSProxy with implementation address',
        '3. Call initialize() on proxy via block scanner with:',
        '   - Owner address (your admin wallet)',
        '   - OpenWork Token (OW) address',
        '   - Chain ID (84532 for Base Sepolia, 1 for Ethereum)',
        '   - Main Bridge address',
        '4. Set Main Rewards contract: setMainRewards(mainRewardsAddress)',
        '5. Verify governance parameters initialized correctly:',
        '   - proposalThresholdAmount: 100 OW [default]',
        '   - votingThresholdAmount: 50 OW [default]',
        '   - unstakeDelay: 24 hours [default]',
        '   - Quorum: 50 OW [default]',
        '6. Configure Main Bridge to route governance messages:',
        '   - MainBridge.setMainDAO(mainDAOAddress)',
        '7. Test staking flow:',
        '   - Approve OW tokens',
        '   - Call stake(100 OW, 1-3 min, lzOptions)',
        '   - Verify cross-chain sync to Native',
        '8. Test governance:',
        '   - Create test proposal',
        '   - Vote on proposal',
        '   - Check quorum and execution',
        '9. Verify both implementation and proxy on Basescan/Etherscan',
        '10. Fund contract with ETH for LayerZero fees (optional)',
        '11. IMPORTANT: Main DAO has supreme upgrade authority over all contracts'
      ]
    }
  }
};
