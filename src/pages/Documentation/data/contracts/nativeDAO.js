export const nativeDAO = {
  id: 'nativeDAO',
  name: 'Native DAO',
  chain: 'l2',
  column: 'l2-right',
  order: 0,
  status: 'testnet',
  version: 'v1.0.0',
  gas: '45K',
  mainnetNetwork: 'Arbitrum One',
  testnetNetwork: 'Arbitrum Sepolia',
  mainnetDeployed: 'Not deployed',
  testnetDeployed: 'Deployed',
  mainnetAddress: null,
  testnetAddress: '0x21451dCE07Ad3Ab638Ec71299C1D2BD2064b90E5',
  isUUPS: true,
  implementationAddress: '0x18d2eC7459eFf0De9495be21525E0742890B5065',
  tvl: 'N/A',
  docs: 'Native DAO - Governance contract mirroring Main DAO stake data with dual voting power from staked and earned tokens, featuring time-weighted staking and delegation support.',
  
  overview: {
    purpose: 'Native DAO is the governance mirror on Arbitrum that receives and stores stake data from Main DAO (on Ethereum). Users gain voting power from staking OW tokens on Main DAO (time-weighted by duration) and earning tokens through platform activity on Native chain. Voting power = (stake amount × duration in minutes) + earned tokens. This design enables local governance eligibility checks (for disputes, etc.) while keeping actual staking operations on Main DAO. The contract does NOT accept direct stakes - all staking happens on Main DAO and is synced via LayerZero bridge.',
    tier: 'Native Chain (Arbitrum Sepolia)',
    category: 'Governance',
    upgradeability: 'UUPS Upgradeable (owner + DAO can upgrade)'
  },
  
  features: [
    'Main DAO mirror: Receives and stores stake data from Main DAO via LayerZero bridge',
    'No direct staking: Users stake on Main DAO (Ethereum), data synced to Native DAO automatically',
    'Dual voting power: Combined power from staked tokens (time-weighted) and earned tokens',
    'Time-weighted calculation: Voting power = (stake amount × duration in minutes) + earned tokens',
    'Earned token integration: Automatic voting power from job payments and governance participation',
    'Local eligibility checks: Native Athena queries Native DAO to verify voter eligibility',
    'Minimum thresholds: 100 OW required (from stake or earned) for proposal/voting eligibility',
    'Delegation support: Users can delegate their voting power to trusted addresses',
    'Cross-chain sync: Stake updates from Main DAO propagated via bridge automatically'
  ],
  
  systemPosition: {
    description: 'Native DAO is a governance mirror on Arbitrum that receives stake data from Main DAO on Ethereum via LayerZero bridge. Users stake tokens on Main DAO, and Native DAO stores a synchronized copy for local eligibility checks (e.g., Native Athena dispute voting). Native DAO combines staked power (time-weighted: amount × duration) with earned tokens from Native Rewards to calculate total voting power. This architecture enables fast local governance checks on L2 while keeping actual staking and formal governance on Ethereum.',
    diagram: `
📍 Cross-Chain Governance Architecture

Main Chain (Ethereum)
    └─> Main DAO
        ├─> Users stake OW tokens here
        ├─> Calculate: power = amount × duration
        └─> Send stake data via bridge
            ↓
    Main Chain Bridge (LayerZero)
        └─> Message: updateStakeData()
            ↓
    Native Bridge (LayerZero)
        └─> Routes to Native DAO
            ↓
Native Chain (Arbitrum) ⭐
    └─> Native DAO (You are here)
        ├─> Receive & store stake data
        ├─> Store in OpenworkGenesis
        ├─> Add earned tokens from Native Rewards
        ├─> Total power = stake power + earned power
        └─> Used by:
            ├─> Native Athena (voter eligibility)
            ├─> NOWJC (governance actions)
            └─> Local governance checks

Power Calculation:
  Staked Power = amount × durationMinutes (from Main DAO)
  Earned Power = tokens from jobs/governance (from Native Rewards)
  Total = Staked + Earned`
  },
  
  dependencies: {
    dependsOn: [
      { 
        name: 'OpenworkGenesis', 
        reason: 'Stores all stake data, delegation mappings, and staker tracking for persistent storage.',
        type: 'Storage'
      },
      { 
        name: 'Native Rewards', 
        reason: 'Tracks earned OW tokens from job payments and governance participation for voting power calculation.',
        type: 'Rewards'
      },
      { 
        name: 'OW Token (ERC20)', 
        reason: 'The governance token that users stake and earn. Native DAO holds staked tokens.',
        type: 'Token'
      },
      { 
        name: 'Native Bridge', 
        reason: 'Routes voting power sync messages to Main DAO and receives DAO upgrade commands.',
        type: 'Bridge'
      }
    ],
    requiredBy: [
      { 
        name: 'Native Athena', 
        reason: 'Checks canVote() to validate dispute voter eligibility based on staked/earned tokens.',
        type: 'Dispute Resolution'
      },
      { 
        name: 'Main DAO', 
        reason: 'Receives synced voting power from Native DAO for proposal creation and voting on Ethereum.',
        type: 'Governance'
      },
      { 
        name: 'NOWJC', 
        reason: 'Calls Native DAO to check voting eligibility and sync voting power after governance actions.',
        type: 'Job Management'
      }
    ],
    prerequisites: [
      'OpenworkGenesis must be deployed for stake storage',
      'Native Rewards must be deployed and linked for earned token tracking',
      'OW Token contract must be deployed and Native DAO approved to transfer',
      'Native Bridge must be configured for Main DAO sync',
      'Minimum stake requirement: 100 OW tokens for voting eligibility'
    ]
  },
  
  functions: [
    {
      category: 'Cross-Chain Sync',
      description: 'Functions for receiving and storing stake data from Main DAO',
      items: [
        {
          name: 'stake',
          signature: 'stake(uint256 amount, uint256 durationMinutes)',
          whatItDoes: 'Stakes OW tokens for a specified duration to gain voting power with time-based multipliers.',
          whyUse: 'Users stake to participate in governance. Longer lock periods provide higher voting power multipliers, rewarding long-term commitment.',
          howItWorks: [
            'Validates amount and duration',
            'Calculates unlock time = current time + duration',
            'Transfers OW tokens from user to Native DAO contract',
            'Stores stake details in OpenworkGenesis',
            'Adds user to stakers list if first stake',
            'Marks stake as active',
            'Emits Staked event'
          ],
          parameters: [
            { name: 'amount', type: 'uint256', description: 'Amount of OW tokens to stake (18 decimals, e.g., 100e18 = 100 OW)' },
            { name: 'durationMinutes', type: 'uint256', description: 'Lock duration: 10080=1week(1x), 43200=1month(1.5x), 129600=3months(2x), 259200=6months(3x), 525600=1year(5x)' }
          ],
          accessControl: 'Public function - any user can stake',
          events: [
            'Staked(staker, amount, unlockTime, durationMinutes)'
          ],
          gasEstimate: '~65K gas',
          example: `// Stake 500 OW tokens for 6 months (3x multiplier)
const stakeAmount = ethers.parseEther("500");  // 500 OW
const sixMonths = 259200;  // 6 months in minutes

// Approve Native DAO to spend OW tokens
await owToken.approve(nativeDAOAddress, stakeAmount);

// Stake tokens
await nativeDAO.stake(stakeAmount, sixMonths);

// Result:
// - 500 OW locked until unlock time
// - Voting power: 500 * 3 = 1500 (6 month multiplier)
// - Can vote immediately, unstake after 6 months

// Duration options and multipliers:
// 10080 min (1 week)   → 1x   multiplier
// 43200 min (1 month)  → 1.5x multiplier
// 129600 min (3 months) → 2x   multiplier
// 259200 min (6 months) → 3x   multiplier
// 525600 min (1 year)   → 5x   multiplier`,
          relatedFunctions: ['unstake', 'getVotingPower', 'calculateVotingPowerFromStake']
        },
        {
          name: 'unstake',
          signature: 'unstake()',
          whatItDoes: 'Withdraws staked OW tokens after the time-lock period expires.',
          whyUse: 'Users call this after their stake unlock time to retrieve their tokens and stop participating in governance.',
          howItWorks: [
            'Retrieves user\'s stake from OpenworkGenesis',
            'Validates stake exists and is active',
            'Checks current time >= unlock time',
            'Marks stake as inactive in Genesis',
            'Removes user from stakers list',
            'Transfers OW tokens back to user',
            'Emits Unstaked event'
          ],
          parameters: [],
          accessControl: 'Public function - only stake owner can unstake their own tokens',
          events: [
            'Unstaked(staker, amount)'
          ],
          gasEstimate: '~55K gas',
          example: `// Check if stake is unlocked
const stakeInfo = await nativeDAO.getStakerInfo(userAddress);
const isUnlocked = await nativeDAO.isStakeUnlocked(userAddress);

if (isUnlocked) {
  // Unstake tokens
  await nativeDAO.unstake();
  
  console.log(\`Unstaked \${ethers.formatEther(stakeInfo.amount)} OW\`);
  // Tokens returned to wallet
  // Voting power now zero (unless has earned tokens)
} else {
  const unlockDate = new Date(stakeInfo.unlockTime * 1000);
  console.log(\`Stake unlocks on: \${unlockDate}\`);
}`,
          relatedFunctions: ['stake', 'isStakeUnlocked', 'getStakerInfo']
        },
        {
          name: 'getStakerInfo',
          signature: 'getStakerInfo(address staker) view returns (uint256 amount, uint256 unlockTime, uint256 durationMinutes, bool isActive)',
          whatItDoes: 'Retrieves complete staking information for a user.',
          whyUse: 'Check stake amount, when it unlocks, lock duration, and if it\'s still active.',
          howItWorks: [
            'Queries OpenworkGenesis for stake data',
            'Returns all stake fields',
            'If no stake exists, returns zeros and false'
          ],
          parameters: [
            { name: 'staker', type: 'address', description: 'Address to get stake info for' }
          ],
          accessControl: 'Public view function',
          events: ['None (view function)'],
          gasEstimate: 'N/A (view)',
          example: `// Get user's stake details
const info = await nativeDAO.getStakerInfo(userAddress);

console.log("Staked:", ethers.formatEther(info.amount), "OW");
console.log("Unlocks:", new Date(info.unlockTime * 1000));
console.log("Duration:", info.durationMinutes, "minutes");
console.log("Active:", info.isActive);

// Calculate voting power multiplier
const votingPower = await nativeDAO.calculateVotingPowerFromStake(
  info.amount,
  info.durationMinutes
);
console.log("Staked voting power:", ethers.formatEther(votingPower));`,
          relatedFunctions: ['stake', 'unstake', 'calculateVotingPowerFromStake']
        },
        {
          name: 'calculateVotingPowerFromStake',
          signature: 'calculateVotingPowerFromStake(uint256 stakeAmount, uint256 durationMinutes) view returns (uint256)',
          whatItDoes: 'Calculates voting power from stake amount and lock duration using multiplier formula.',
          whyUse: 'Preview voting power before staking or understand current multiplier effect.',
          howItWorks: [
            'Determines multiplier based on duration:',
            '  - 1 week (10080 min): 1x',
            '  - 1 month (43200 min): 1.5x',
            '  - 3 months (129600 min): 2x',
            '  - 6 months (259200 min): 3x',
            '  - 1 year (525600 min): 5x',
            'Returns stakeAmount * multiplier'
          ],
          parameters: [
            { name: 'stakeAmount', type: 'uint256', description: 'Amount of OW tokens staked' },
            { name: 'durationMinutes', type: 'uint256', description: 'Lock duration in minutes' }
          ],
          accessControl: 'Public view function',
          events: ['None (view function)'],
          gasEstimate: 'N/A (view)',
          example: `// Preview voting power for different lock periods
const amount = ethers.parseEther("1000");  // 1000 OW

const oneWeek = await nativeDAO.calculateVotingPowerFromStake(amount, 10080);
console.log("1 week:", ethers.formatEther(oneWeek));  // 1000 OW

const oneMonth = await nativeDAO.calculateVotingPowerFromStake(amount, 43200);
console.log("1 month:", ethers.formatEther(oneMonth));  // 1500 OW

const threeMonths = await nativeDAO.calculateVotingPowerFromStake(amount, 129600);
console.log("3 months:", ethers.formatEther(threeMonths));  // 2000 OW

const sixMonths = await nativeDAO.calculateVotingPowerFromStake(amount, 259200);
console.log("6 months:", ethers.formatEther(sixMonths));  // 3000 OW

const oneYear = await nativeDAO.calculateVotingPowerFromStake(amount, 525600);
console.log("1 year:", ethers.formatEther(oneYear));  // 5000 OW`,
          relatedFunctions: ['stake', 'getVotingPower']
        },
        {
          name: 'isStakeUnlocked',
          signature: 'isStakeUnlocked(address staker) view returns (bool)',
          whatItDoes: 'Checks if a user\'s stake has passed its unlock time and can be withdrawn.',
          whyUse: 'Quick check before attempting to unstake to avoid transaction failures.',
          howItWorks: [
            'Retrieves stake from OpenworkGenesis',
            'Returns true if current time >= unlock time',
            'Returns false if still locked or no stake exists'
          ],
          parameters: [
            { name: 'staker', type: 'address', description: 'Address to check' }
          ],
          accessControl: 'Public view function',
          events: ['None (view function)'],
          gasEstimate: 'N/A (view)',
          example: `// Check if can unstake
const canUnstake = await nativeDAO.isStakeUnlocked(userAddress);

if (canUnstake) {
  await nativeDAO.unstake();
  console.log("Unstaked successfully!");
} else {
  const info = await nativeDAO.getStakerInfo(userAddress);
  const timeLeft = info.unlockTime - Math.floor(Date.now() / 1000);
  console.log(\`Stake locked for \${timeLeft / 86400} more days\`);
}`,
          relatedFunctions: ['unstake', 'getStakerInfo']
        }
      ]
    },
    {
      category: 'Voting Power',
      description: 'Functions for calculating and querying total voting power from staked and earned tokens',
      items: [
        {
          name: 'getVotingPower',
          signature: 'getVotingPower(address user) view returns (uint256)',
          whatItDoes: 'Calculates total voting power from both staked tokens (with multipliers) and earned tokens from platform activity.',
          whyUse: 'Get complete voting power for governance participation. This is the definitive voting power used for proposals and votes.',
          howItWorks: [
            'Calculates staked voting power with time-lock multiplier',
            'Retrieves earned tokens from Native Rewards contract',
            'Sums staked power + earned power',
            'Returns total voting power'
          ],
          parameters: [
            { name: 'user', type: 'address', description: 'Address to get voting power for' }
          ],
          accessControl: 'Public view function',
          events: ['None (view function)'],
          gasEstimate: 'N/A (view)',
          example: `// Get complete voting power breakdown
const totalPower = await nativeDAO.getVotingPower(userAddress);
const stakedPower = await nativeDAO.getStakedVotingPower(userAddress);
const earnedPower = await nativeDAO.getEarnedVotingPower(userAddress);

console.log("Total voting power:", ethers.formatEther(totalPower));
console.log("  From staked:", ethers.formatEther(stakedPower));
console.log("  From earned:", ethers.formatEther(earnedPower));

// Example:
// User staked 500 OW for 6 months (3x multiplier)
// User earned 300 OW from platform activity
// Total power = (500 * 3) + 300 = 1800 OW`,
          relatedFunctions: ['getStakedVotingPower', 'getEarnedVotingPower', 'canVote']
        },
        {
          name: 'canVote',
          signature: 'canVote(address account) view returns (bool)',
          whatItDoes: 'Checks if an address meets the minimum requirement (100 OW) to participate in governance.',
          whyUse: 'Quick eligibility check before allowing dispute votes or governance participation.',
          howItWorks: [
            'Calls getVotingPower() for total power',
            'Checks if >= 100 OW (100e18)',
            'Returns true if eligible, false otherwise'
          ],
          parameters: [
            { name: 'account', type: 'address', description: 'Address to check eligibility' }
          ],
          accessControl: 'Public view function',
          events: ['None (view function)'],
          gasEstimate: 'N/A (view)',
          example: `// Check voting eligibility
const eligible = await nativeDAO.canVote(userAddress);

if (eligible) {
  const power = await nativeDAO.getVotingPower(userAddress);
  console.log(\`Eligible! Power: \${ethers.formatEther(power)} OW\`);
  // User can vote on disputes and proposals
} else {
  console.log("Not eligible - need 100 OW minimum");
  console.log("Stake tokens or earn through platform activity");
}`,
          relatedFunctions: ['getVotingPower', 'stake']
        },
        {
          name: 'getStakedVotingPower',
          signature: 'getStakedVotingPower(address user) view returns (uint256)',
          whatItDoes: 'Returns voting power from staked tokens only, including time-lock multiplier effect.',
          whyUse: 'See breakdown of voting power sources - how much comes from staking vs earning.',
          howItWorks: [
            'Retrieves stake from OpenworkGenesis',
            'If stake inactive or doesn\'t exist: returns 0',
            'Calculates power with multiplier based on lock duration',
            'Returns staked voting power'
          ],
          parameters: [
            { name: 'user', type: 'address', description: 'Address to get staked power for' }
          ],
          accessControl: 'Public view function',
          events: ['None (view function)'],
          gasEstimate: 'N/A (view)',
          example: `// Compare power sources
const stakedPower = await nativeDAO.getStakedVotingPower(userAddress);
const earnedPower = await nativeDAO.getEarnedVotingPower(userAddress);

console.log("Power from staking:", ethers.formatEther(stakedPower));
console.log("Power from earning:", ethers.formatEther(earnedPower));

// This helps users understand their governance weight distribution`,
          relatedFunctions: ['getEarnedVotingPower', 'getVotingPower']
        },
        {
          name: 'getEarnedVotingPower',
          signature: 'getEarnedVotingPower(address user) view returns (uint256)',
          whatItDoes: 'Returns voting power from tokens earned through platform activity (no multiplier).',
          whyUse: 'See how much voting power comes from actual platform usage and contributions.',
          howItWorks: [
            'Queries Native Rewards contract',
            'Gets user\'s total earned OW tokens',
            'Returns earned amount (1:1 voting power, no multiplier)'
          ],
          parameters: [
            { name: 'user', type: 'address', description: 'Address to get earned power for' }
          ],
          accessControl: 'Public view function',
          events: ['None (view function)'],
          gasEstimate: 'N/A (view)',
          example: `// Users earn tokens by:
// - Posting jobs (job giver rewards)
// - Completing jobs (freelancer rewards)
// - Voting on disputes
// - Participating in governance

const earnedPower = await nativeDAO.getEarnedVotingPower(userAddress);
console.log("Earned through activity:", ethers.formatEther(earnedPower));

// Earned tokens provide 1:1 voting power (no multiplier)
// But they never expire and don't require lock-up`,
          relatedFunctions: ['getStakedVotingPower', 'getVotingPower']
        }
      ]
    },
    {
      category: 'Delegation',
      description: 'Functions for delegating voting power to other addresses',
      items: [
        {
          name: 'delegate',
          signature: 'delegate(address delegatee)',
          whatItDoes: 'Delegates your voting power to another address while maintaining token ownership.',
          whyUse: 'Users can delegate to trusted community members who actively participate in governance, while keeping their tokens.',
          howItWorks: [
            'Validates delegatee is not zero address',
            'Calculates delegator\'s current voting power',
            'Stores delegation in OpenworkGenesis',
            'Increases delegatee\'s delegated power count',
            'Emits Delegated event'
          ],
          parameters: [
            { name: 'delegatee', type: 'address', description: 'Address to delegate voting power to' }
          ],
          accessControl: 'Public function',
          events: [
            'Delegated(delegator, delegatee, votingPower)'
          ],
          gasEstimate: '~45K gas',
          example: `// Delegate to an active governance participant
const delegateeAddress = "0x...";

// Check your voting power
const myPower = await nativeDAO.getVotingPower(myAddress);
console.log(\`Delegating \${ethers.formatEther(myPower)} OW power\`);

// Delegate
await nativeDAO.delegate(delegateeAddress);

// Result:
// - You keep your staked/earned tokens
// - Delegatee can now vote with your power
// - You cannot vote while delegated
// - Can undelegate anytime`,
          relatedFunctions: ['undelegate', 'getDelegatedVotingPower', 'getDelegate']
        },
        {
          name: 'undelegate',
          signature: 'undelegate()',
          whatItDoes: 'Removes delegation and returns voting power to yourself.',
          whyUse: 'Take back voting power to vote yourself or delegate to someone else.',
          howItWorks: [
            'Retrieves current delegation from Genesis',
            'Validates delegation exists',
            'Calculates delegator\'s voting power',
            'Decreases delegatee\'s delegated power count',
            'Removes delegation mapping',
            'Emits Undelegated event'
          ],
          parameters: [],
          accessControl: 'Public function',
          events: [
            'Undelegated(delegator, delegatee, votingPower)'
          ],
          gasEstimate: '~40K gas',
          example: `// Check current delegation
const currentDelegate = await genesis.getDelegate(myAddress);

if (currentDelegate !== ethers.ZeroAddress) {
  console.log(\`Currently delegated to: \${currentDelegate}\`);
  
  // Undelegate
  await nativeDAO.undelegate();
  
  console.log("Voting power returned to you");
  // You can now vote or delegate to someone else
}`,
          relatedFunctions: ['delegate', 'getDelegate']
        },
        {
          name: 'getDelegatedVotingPower',
          signature: 'getDelegatedVotingPower(address delegatee) view returns (uint256)',
          whatItDoes: 'Returns total voting power delegated TO an address by others.',
          whyUse: 'See how much additional voting power an address has from delegations.',
          howItWorks: [
            'Queries OpenworkGenesis for delegated power count',
            'Returns accumulated delegation amount'
          ],
          parameters: [
            { name: 'delegatee', type: 'address', description: 'Address to check delegated power for' }
          ],
          accessControl: 'Public view function',
          events: ['None (view function)'],
          gasEstimate: 'N/A (view)',
          example: `// Check governance leader's total power
const ownPower = await nativeDAO.getVotingPower(leaderAddress);
const delegatedPower = await nativeDAO.getDelegatedVotingPower(leaderAddress);
const totalPower = ownPower + delegatedPower;

console.log("Own power:", ethers.formatEther(ownPower));
console.log("Delegated to them:", ethers.formatEther(delegatedPower));
console.log("Total influence:", ethers.formatEther(totalPower));

// This shows true governance influence including delegations`,
          relatedFunctions: ['delegate', 'getVotingPower']
        }
      ]
    }
  ],
  
  dataFlows: [
    {
      title: 'Staking Flow with Time-Lock Multipliers',
      description: 'How users stake tokens and gain multiplied voting power',
      steps: [
        { chain: 'User Wallet', action: '1. User has OW tokens to stake' },
        { chain: 'User Wallet', action: '2. Approve Native DAO to spend OW tokens' },
        { chain: 'Native Chain', action: '3. Call stake(amount, duration) with chosen lock period' },
        { chain: 'Native Chain', action: '4. Native DAO calculates multiplier based on duration' },
        { chain: 'Native Chain', action: '5. Transfer OW tokens to Native DAO contract' },
        { chain: 'Native Chain', action: '6. Store stake details in OpenworkGenesis' },
        { chain: 'Native Chain', action: '7. Calculate unlock time = now + duration' },
        { chain: 'Native Chain', action: '8. Voting power = amount * multiplier instantly available' },
        { chain: 'Native Chain', action: '9. User can vote immediately, unstake after unlock time' }
      ]
    },
    {
      title: 'Voting Power Calculation Flow',
      description: 'How total voting power is calculated from multiple sources',
      steps: [
        { chain: 'Native Chain', action: 'User calls getVotingPower()' },
        { chain: 'Native Chain', action: 'Native DAO retrieves stake from Genesis' },
        { chain: 'Native Chain', action: 'Calculate staked power = stake amount * duration multiplier' },
        { chain: 'Native Chain', action: 'Query Native Rewards for earned tokens' },
        { chain: 'Native Chain', action: 'Earned power = total earned tokens (1:1, no multiplier)' },
        { chain: 'Native Chain', action: 'Total power = staked power + earned power' },
        { chain: 'Native Chain', action: 'Return total voting power' }
      ]
    },
    {
      title: 'Delegation Flow',
      description: 'How voting power is delegated to trusted addresses',
      steps: [
        { chain: 'Native Chain', action: 'User A calls delegate(User B address)' },
        { chain: 'Native Chain', action: 'Native DAO calculates User A\'s current voting power' },
        { chain: 'Native Chain', action: 'Store delegation mapping: A → B in Genesis' },
        { chain: 'Native Chain', action: 'Increase User B\'s delegated power counter' },
        { chain: 'Native Chain', action: 'User A retains tokens but cannot vote while delegated' },
        { chain: 'Native Chain', action: 'User B can now vote with combined own + delegated power' },
        { chain: 'Native Chain', action: 'User A can undelegate() anytime to reclaim voting rights' }
      ]
    },
    {
      title: 'Cross-Chain Governance Sync Flow',
      description: 'How voting power syncs to Main DAO for actual governance',
      steps: [
        { chain: 'Native Chain', action: 'User builds voting power via staking/earning on Arbitrum' },
        { chain: 'Native Chain', action: 'User calls syncVotingPower() on NOWJC' },
        { chain: 'Native Chain', action: 'NOWJC queries Native DAO for total voting power' },
        { chain: 'Native Chain', action: 'Native Bridge sends LayerZero message to Ethereum' },
        { chain: 'Main Chain (Ethereum)', action: 'Main DAO receives and stores voting power' },
        { chain: 'Main Chain', action: 'User can now create proposals or vote on Ethereum' },
        { chain: 'Main Chain', action: 'Governance executed through Main DAO Governor contract' }
      ]
    }
  ],
  
  integrationGuide: {
    example: `// Complete Native DAO Integration Example
const { ethers } = require('ethers');

// 1. Setup contracts
const nativeDAO = new ethers.Contract(nativeDAOAddress, nativeDAOABI, signer);
const owToken = new ethers.Contract(owTokenAddress, owTokenABI, signer);

// 2. Check current voting power
const currentPower = await nativeDAO.getVotingPower(userAddress);
console.log(\`Current voting power: \${ethers.formatEther(currentPower)} OW\`);

// 3. Stake tokens for governance (1 year for 5x multiplier)
const stakeAmount = ethers.parseEther("1000");
const oneYear = 525600;

await owToken.approve(nativeDAOAddress, stakeAmount);
await nativeDAO.stake(stakeAmount, oneYear);

// New power: 1000 * 5 = 5000 OW

// 4. Check eligibility
const canVote = await nativeDAO.canVote(userAddress);
console.log(\`Can vote: \${canVote}\`);

// 5. View stake details
const info = await nativeDAO.getStakerInfo(userAddress);
console.log(\`Unlocks: \${new Date(info.unlockTime * 1000)}\`);

// 6. After unlock, unstake
const isUnlocked = await nativeDAO.isStakeUnlocked(userAddress);
if (isUnlocked) {
  await nativeDAO.unstake();
}`,
    tips: [
      'Longer locks = higher multipliers: 1 year = 5x voting power',
      'Earned tokens provide 1:1 voting power without lock-up',
      'Minimum 100 OW total (staked + earned) required to vote',
      'Voting power is immediate upon staking',
      'Delegation maintains token ownership while transferring voting rights',
      'Stake unlock time is fixed - cannot unstake early',
      'Consider your governance participation commitment when choosing lock duration',
      'Delegated power updates automatically when delegator\'s power changes',
      'Check isStakeUnlocked() before attempting unstake',
      'Sync voting power to Main DAO before creating proposals on Ethereum'
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
        name: '_bridge',
        type: 'address',
        description: 'Native Bridge contract address (for cross-chain governance sync)',
        placeholder: '0x...'
      },
      {
        name: '_genesis',
        type: 'address',
        description: 'OpenworkGenesis contract address (for persistent stake storage)',
        placeholder: '0x...'
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
    estimatedGas: '3.0M',
    postDeploy: {
      message: 'UUPS deployment complete! Next: Initialize the proxy contract on block scanner.',
      nextSteps: [
        '1. Deploy NativeDAO implementation contract (no constructor params)',
        '2. Deploy UUPSProxy with implementation address',
        '3. Call initialize() on proxy via block scanner with:',
        '   - Owner address (your admin wallet)',
        '   - Native Bridge address',
        '   - OpenworkGenesis contract address',
        '4. Set NOWJC contract: setNOWJContract(nowjcAddress)',
        '5. Configure governance thresholds (optional - defaults are reasonable):',
        '   - setProposalStakeThreshold(100 OW) [default]',
        '   - setVotingStakeThreshold(50 OW) [default]',
        '   - setProposalRewardThreshold(100 OW) [default]',
        '   - setVotingRewardThreshold(100 OW) [default]',
        '6. Note: This contract receives stake data from Main DAO',
        '   - Users stake on Main DAO (Ethereum)',
        '   - Data synced automatically via LayerZero bridge',
        '7. Verify both implementation and proxy on Arbiscan',
        '8. Test voting power calculation',
        '9. Test cross-chain governance sync to Main DAO'
      ]
    }
  },
  
  securityConsiderations: [
    'UUPS upgradeable - owner and DAO can upgrade implementation',
    'Time-lock enforcement prevents early unstaking',
    'Minimum 100 OW threshold prevents spam voting',
    'Delegation validation ensures zero address cannot be delegatee',
    'Stake storage in Genesis ensures persistence across upgrades',
    'Multiplier calculations are deterministic and transparent',
    'Earned token integration relies on Native Rewards accuracy',
    'Voting power synced to Main DAO for actual governance execution',
    'Only active stakes count toward voting power',
    'Delegation is non-custodial - delegator retains token ownership'
  ],
  
  code: `// Full implementation: contracts/openwork-full-contract-suite-layerzero+CCTP 2 Dec/native-dao.sol

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import { UUPSUpgradeable } from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import { GovernorUpgradeable } from "@openzeppelin/contracts-upgradeable/governance/GovernorUpgradeable.sol";
import { GovernorSettingsUpgradeable } from "@openzeppelin/contracts-upgradeable/governance/extensions/GovernorSettingsUpgradeable.sol";
import { GovernorCountingSimpleUpgradeable } from "@openzeppelin/contracts-upgradeable/governance/extensions/GovernorCountingSimpleUpgradeable.sol";
import { OwnableUpgradeable } from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract NativeDAO is 
    Initializable,
    GovernorUpgradeable,
    GovernorSettingsUpgradeable,
    GovernorCountingSimpleUpgradeable,
    OwnableUpgradeable,
    UUPSUpgradeable
{
    // ==================== STATE VARIABLES ====================
    INativeOpenWorkJobContract public nowjContract;
    INativeChainBridge public bridge;
    IOpenworkGenesis public genesis;
    
    uint256 public proposalStakeThreshold;
    uint256 public votingStakeThreshold;
    uint256 public proposalRewardThreshold;
    uint256 public votingRewardThreshold;

    // ==================== INITIALIZATION ====================
    constructor() {
        _disableInitializers();
    }
    
    function initialize(
        address _owner, 
        address _bridge, 
        address _genesis
    ) public initializer {
        __Governor_init("CrossChainNativeDAO");
        __GovernorSettings_init(1 minutes, 5 minutes, 100 * 10**18);
        __GovernorCountingSimple_init();
        __Ownable_init(_owner);
        __UUPSUpgradeable_init();
        
        bridge = INativeChainBridge(_bridge);
        genesis = IOpenworkGenesis(_genesis);
        
        proposalStakeThreshold = 100 * 10**18;
        votingStakeThreshold = 50 * 10**18;
        proposalRewardThreshold = 100 * 10**18;
        votingRewardThreshold = 100 * 10**18;
    }
    
    function _authorizeUpgrade(address) internal view override {
        require(owner() == _msgSender() || address(bridge) == _msgSender(), "Unauthorized");
    }

    // ==================== GOVERNANCE ELIGIBILITY ====================
    function _hasGovernanceEligibility(
        address account, 
        uint256 stakeThreshold, 
        uint256 rewardThreshold
    ) internal view returns (bool) {
        IOpenworkGenesis.Stake memory stake = genesis.getStake(account);
        if (stake.isActive && stake.amount >= stakeThreshold) {
            return true;
        }
        
        if (address(nowjContract) != address(0)) {
            uint256 earnedTokens = nowjContract.getUserEarnedTokens(account);
            if (earnedTokens >= rewardThreshold) {
                return true;
            }
        }
        
        return false;
    }
    
    function canPropose(address account) public view returns (bool) {
        return _hasGovernanceEligibility(account, proposalStakeThreshold, proposalRewardThreshold);
    }
    
    function canVote(address account) public view returns (bool) {
        return _hasGovernanceEligibility(account, votingStakeThreshold, votingRewardThreshold);
    }

    // ==================== DELEGATION ====================
    function delegate(address delegatee) external {
        address currentDelegate = genesis.getDelegate(msg.sender);
        require(delegatee != currentDelegate, "Already delegated");
        
        IOpenworkGenesis.Stake memory userStake = genesis.getStake(msg.sender);
        require(userStake.isActive && userStake.amount > 0, "No active stake");
        
        uint256 delegatorPower = userStake.amount * userStake.durationMinutes;
        
        if (currentDelegate != address(0)) {
            genesis.updateDelegatedVotingPower(currentDelegate, delegatorPower, false);
        }
        
        if (delegatee != address(0)) {
            genesis.updateDelegatedVotingPower(delegatee, delegatorPower, true);
        }
        
        genesis.setDelegate(msg.sender, delegatee);
        emit DelegateChanged(msg.sender, currentDelegate, delegatee);
    }

    // ==================== VOTING POWER CALCULATION ====================
    function _getVotes(address account, uint256, bytes memory) internal view override returns (uint256) {
        IOpenworkGenesis.Stake memory userStake = genesis.getStake(account);
        uint256 ownPower = 0;
        if (userStake.isActive && userStake.amount > 0) {
            ownPower = userStake.amount * userStake.durationMinutes;
        }
        
        uint256 rewardPower = 0;
        if (address(nowjContract) != address(0)) {
            uint256 earnedTokens = nowjContract.getUserEarnedTokens(account);
            rewardPower = earnedTokens;
        }
        
        uint256 totalPower = ownPower + genesis.getDelegatedVotingPower(account) + rewardPower;
        return totalPower;
    }

    // ==================== GOVERNANCE ACTIONS ====================
    function propose(
        address[] memory targets, 
        uint256[] memory values, 
        bytes[] memory calldatas, 
        string memory description
    ) public override returns (uint256) {
        require(canPropose(msg.sender), "Insufficient tokens to propose");
        
        genesis.updateMemberActivity(msg.sender);
        nowjContract.incrementGovernanceAction(msg.sender);
        
        uint256 proposalId = super.propose(targets, values, calldatas, description);
        genesis.addProposalId(proposalId);
        return proposalId;
    }
    
    function _castVote(
        uint256 proposalId, 
        address account, 
        uint8 support, 
        string memory reason, 
        bytes memory params
    ) internal override returns (uint256) {
        require(canVote(account), "Insufficient tokens to vote");
        
        genesis.updateMemberActivity(account);
        nowjContract.incrementGovernanceAction(account);
        
        return super._castVote(proposalId, account, support, reason, params);
    }

    // ==================== MESSAGE HANDLERS ====================
    function updateStakeData(
        address staker,
        uint256 amount,
        uint256 unlockTime,
        uint256 durationMinutes,
        bool isActive
    ) external {
        require(msg.sender == address(bridge), "Only bridge");
        genesis.setStake(staker, amount, unlockTime, durationMinutes, isActive);
        emit StakeDataReceived(staker, amount, isActive);
    }
    
    // ... Additional view functions and admin functions
    // See full implementation in repository
}`
};
