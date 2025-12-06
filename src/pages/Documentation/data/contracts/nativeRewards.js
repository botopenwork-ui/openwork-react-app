export const nativeRewards = {
  id: 'nativeRewards',
  name: 'Native Rewards',
  chain: 'l2',
  column: 'l2-right',
  order: 1,
  status: 'testnet',
  version: 'v2.0.0',
  gas: '34K',
  mainnetNetwork: 'Arbitrum One',
  testnetNetwork: 'Arbitrum Sepolia',
  mainnetDeployed: 'Not deployed',
  testnetDeployed: 'Deployed',
  mainnetAddress: null,
  testnetAddress: '0x947cAd64a26Eae5F82aF68b7Dbf8b457a8f492De',
  isUUPS: true,
  implementationAddress: '0x3cd75e13ef261fb59e4bA8b161F25d11a238c844',
  tvl: 'N/A',
  docs: 'Native Rewards - Token economics engine with 20-band progressive reward system, governance unlock mechanism, and referral bonuses.',
  
  overview: {
    purpose: 'Native Rewards is the token economics calculation engine that determines how many OW tokens users earn from platform activity. It implements a 20-band progressive reward system where token rates decrease as the platform grows (from 300 OW/USDT down to ~0.01 OW/USDT). Each band distributes 30M OW tokens for a total of 600M across all bands. Features a clever governance unlock mechanism: tokens are earned but LOCKED until users participate in governance (voting/proposing). This prevents gaming while incentivizing active participation. Only NOWJC can call state-changing functions - Native Rewards is purely a calculation and tracking engine.',
    tier: 'Native Chain (Arbitrum Sepolia)',
    category: 'Token Economics',
    upgradeability: 'UUPS Upgradeable (owner only)'
  },
  
  features: [
    '20 progressive reward bands: Each distributing 30M OW tokens (600M total)',
    'Decreasing rates: From 300 OW/USDT (early) to ~0.01 OW/USDT (late stage)',
    'Governance unlock mechanism: Earned tokens locked until user votes/proposes',
    'Referral bonuses: 10% bonus for job giver\'s referrer, 10% for job taker\'s referrer',
    'Band-specific tracking: Separate accounting per reward band for accuracy',
    'Cross-chain claims: Calculate on Arbitrum, claim tokens on Ethereum',
    'NOWJC-only access: All state changes controlled by job contract',
    'Dual referrer sources: ProfileGenesis (primary) with Genesis fallback',
    'Platform growth tracking: Automatically advances through bands as volume grows',
    'Anti-gaming design: No direct claims, governance-gated unlocks'
  ],
  
  systemPosition: {
    description: 'Native Rewards sits on Arbitrum as a pure calculation engine that tracks token earnings and governance-based unlocks. When NOWJC releases a payment, it calls processJobPayment() which calculates tokens based on the current reward band and distributes bonuses to referrers. Earned tokens start LOCKED - users must participate in governance (vote/propose) to unlock them. When ready to claim, the claimable amount is synced to Main Rewards on Ethereum via LayerZero bridge, where users receive actual OW tokens. Native Rewards never holds tokens itself - it only tracks calculations.',
    diagram: `
📍 Token Economics Architecture

Job Payment Flow:
    NOWJC.releasePaymentCrossChain()
        └─> Native Rewards.processJobPayment() ⭐ (You are here)
            ├─> Calculate tokens based on current band
            ├─> Award to job giver (80-90% of payment value)
            ├─> Award 10% bonus to job giver's referrer (if exists)
            ├─> Award 10% bonus to job taker's referrer (if exists)
            └─> Store as LOCKED tokens

Governance Unlock Flow:
    User votes/proposes
        └─> NOWJC.incrementGovernanceAction()
            └─> Native Rewards.recordGovernanceAction()
                └─> Unlock earned tokens (bandRate per action)

Voting Power Integration:
    Native DAO.getVotingPower(user)
        └─> Queries NOWJC
            └─> NOWJC.getUserEarnedTokens()
                └─> Native Rewards (earned tokens)
                    └─> Used for voting eligibility

Cross-Chain Claim Flow:
    NOWJC.syncRewardsData()
        └─> Native Rewards.getUserTotalClaimableTokens()
            └─> Native Bridge → Main Bridge
                └─> Main Rewards (Ethereum)
                    └─> User claims OW tokens
                        └─> Update synced back
                            └─> Native Rewards.markTokensClaimed()`
  },
  
  dependencies: {
    dependsOn: [
      { 
        name: 'ProfileGenesis', 
        reason: 'Primary source for user referrer lookups to calculate 10% referral bonuses.',
        type: 'Storage'
      },
      { 
        name: 'OpenworkGenesis', 
        reason: 'Fallback referrer source for backward compatibility with old referral system.',
        type: 'Storage'
      }
    ],
    requiredBy: [
      { 
        name: 'NOWJC', 
        reason: 'ONLY authorized caller. Calls processJobPayment(), recordGovernanceAction(), getUserTotalClaimableTokens(), markTokensClaimed().',
        type: 'Job Management'
      },
      { 
        name: 'Native DAO', 
        reason: 'Queries earned tokens (via NOWJC) to add to voting power calculation: stakeAmount × duration + earnedTokens.',
        type: 'Governance'
      },
      { 
        name: 'Native Athena', 
        reason: 'Checks earned tokens (via NOWJC) as alternative to staking requirement for dispute voter eligibility.',
        type: 'Dispute Resolution'
      },
      { 
        name: 'Main Rewards', 
        reason: 'Receives claimable amounts via cross-chain sync. Users claim actual OW tokens there, updates synced back.',
        type: 'Token Distribution'
      }
    ],
    prerequisites: [
      'NOWJC must be deployed and authorized as jobContract',
      'ProfileGenesis deployed for referrer lookups',
      'OpenworkGenesis deployed as fallback',
      'Main Rewards deployed on Ethereum for claims',
      'Bridge infrastructure for cross-chain sync',
      '20 reward bands must be initialized'
    ]
  },
  
  functions: [
    {
      category: 'Token Calculation (NOWJC-only)',
      description: 'Core functions for calculating and awarding tokens based on platform activity',
      items: [
        {
          name: 'processJobPayment',
          signature: 'processJobPayment(address jobGiver, address jobTaker, uint256 amount, uint256 newPlatformTotal) returns (uint256[] tokensAwarded)',
          whatItDoes: 'Calculates and awards OW tokens based on USDT payment amount, current reward band, and referral structure.',
          whyUse: 'Called by NOWJC after every payment release to distribute token rewards to job giver and referrers.',
          howItWorks: [
            'Updates totalPlatformPayments to track platform growth',
            'Gets job giver\'s referrer from ProfileGenesis (or Genesis fallback)',
            'Gets job taker\'s referrer from ProfileGenesis (or Genesis fallback)',
            'Calculates distribution: jobGiver gets 80-100%, referrers get 10% each',
            'Calls _awardTokensInCurrentBand() for each recipient',
            'Determines current band based on platform total',
            'Calculates tokens using band rate (e.g., 300 OW per USDT)',
            'Stores tokens as LOCKED in user\'s band-specific rewards',
            'Returns array: [jobGiverTokens, jobGiverReferrerTokens, jobTakerReferrerTokens]'
          ],
          parameters: [
            { name: 'jobGiver', type: 'address', description: 'Address of job poster (primary recipient)' },
            { name: 'jobTaker', type: 'address', description: 'Address of freelancer (used for referrer lookup)' },
            { name: 'amount', type: 'uint256', description: 'USDT payment amount (6 decimals, e.g., 1000000000 = 1000 USDT)' },
            { name: 'newPlatformTotal', type: 'uint256', description: 'New cumulative platform payment total after this payment' }
          ],
          accessControl: 'onlyJobContract - ONLY NOWJC can call',
          events: [
            'TokensEarnedInBand(user, tokensEarned, band, newBandTotal, newUserTotal)'
          ],
          gasEstimate: '~85K gas',
          example: `// Called by NOWJC after payment release
// Example: $1000 USDT payment in Band 1 (300 OW/USDT)

await nowjc.releasePaymentCrossChain(...);
// Internally calls:
await nativeRewards.processJobPayment(
  jobGiverAddress,
  jobTakerAddress,
  1000000000, // 1000 USDT (6 decimals)
  5000000000  // New platform total: $5000
);

// Results:
// - Job giver: ~800 OW (80% of 1000 * 300/1000)
// - Job giver's referrer: ~100 OW (10%)
// - Job taker's referrer: ~100 OW (10%)
// All tokens LOCKED until governance participation

// Band rates:
// Band 1:  300 OW/USDT ($0-$100k)
// Band 3:  150 OW/USDT ($200k-$400k)
// Band 5:  37.5 OW/USDT ($800k-$1.6M)
// Band 10: 1.17 OW/USDT ($25.6M-$51.2M)`,
          relatedFunctions: ['recordGovernanceAction', 'calculateTokensForRange', 'getCurrentBand']
        },
        {
          name: 'recordGovernanceAction',
          signature: 'recordGovernanceAction(address user)',
          whatItDoes: 'Records a governance action (vote/proposal) which unlocks earned tokens proportional to current band rate.',
          whyUse: 'Called by NOWJC when user votes or creates proposals. This is how locked tokens become claimable.',
          howItWorks: [
            'Gets current platform band',
            'Increments userGovernanceActionsByBand[user][currentBand]',
            'Increments userTotalGovernanceActions[user]',
            'Emits GovernanceActionRecorded event',
            'Does NOT directly unlock - unlocking calculated dynamically in getUserTotalClaimableTokens()',
            'Each action unlocks = current band rate worth of tokens',
            'Example: In Band 1 (300 OW/USDT), each action unlocks 300 OW worth'
          ],
          parameters: [
            { name: 'user', type: 'address', description: 'Address that performed governance action' }
          ],
          accessControl: 'onlyJobContract - ONLY NOWJC can call',
          events: [
            'GovernanceActionRecorded(user, band, newBandActions, newTotalActions)'
          ],
          gasEstimate: '~35K gas',
          example: `// User votes on a proposal
await mainDAO.castVote(proposalId, support);

// Main DAO sends message to Native chain
// NOWJC.incrementGovernanceAction() is called
// Which calls:
await nativeRewards.recordGovernanceAction(userAddress);

// Result:
// - Governance actions in current band +1
// - Total governance actions +1
// - Tokens unlocked = bandRate per action

// Example unlock calculation:
// User earned 3000 OW from jobs (Band 1: 300 OW/USDT)
// Initially: claimable = 0 (all locked)
// After 1 vote: claimable = 300 OW
// After 5 votes: claimable = 1500 OW  
// After 10 votes: claimable = 3000 OW (all unlocked)`,
          relatedFunctions: ['getUserTotalClaimableTokens', 'getUserGovernanceActionsInBand']
        },
        {
          name: 'calculateTokensForRange',
          signature: 'calculateTokensForRange(uint256 fromAmount, uint256 toAmount) view returns (uint256)',
          whatItDoes: 'Calculates total OW tokens for a payment range, accounting for band transitions.',
          whyUse: 'Used internally to accurately calculate tokens when payment spans multiple reward bands.',
          howItWorks: [
            'Validates fromAmount < toAmount',
            'Iterates through reward bands',
            'For each band, calculates overlap with range',
            'Calculates tokens: (amountInBand × bandRate) / 1e6',
            'Sums tokens across all overlapping bands',
            'Returns total OW tokens (18 decimals)',
            'Handles edge cases like band transitions mid-payment'
          ],
          parameters: [
            { name: 'fromAmount', type: 'uint256', description: 'Starting platform total (USDT 6 decimals)' },
            { name: 'toAmount', type: 'uint256', description: 'Ending platform total (USDT 6 decimals)' }
          ],
          accessControl: 'Public view function',
          events: ['None (view function)'],
          gasEstimate: 'N/A (view)',
          example: `// Calculate tokens for $1000 payment starting at $99,500
const fromAmount = ethers.parseUnits("99500", 6);   // Near end of Band 1
const toAmount = ethers.parseUnits("100500", 6);    // Spans into Band 2

const tokens = await nativeRewards.calculateTokensForRange(
  fromAmount,
  toAmount
);

// Band 1: $99,500 to $100,000 = $500 @ 300 OW/USDT = 150,000 OW
// Band 2: $100,000 to $100,500 = $500 @ 300 OW/USDT = 150,000 OW
// Total: 300,000 OW (300,000 * 1e18)

console.log("Tokens awarded:", ethers.formatEther(tokens));`,
          relatedFunctions: ['processJobPayment', 'getCurrentBand']
        }
      ]
    },
    {
      category: 'Claimable Calculation',
      description: 'Functions for determining how many tokens users can claim based on governance participation',
      items: [
        {
          name: 'getUserTotalClaimableTokens',
          signature: 'getUserTotalClaimableTokens(address user) view returns (uint256)',
          whatItDoes: 'Calculates total tokens user can claim across all bands, limited by governance actions.',
          whyUse: 'Called by NOWJC for cross-chain sync. Shows how many tokens are unlocked and ready to claim.',
          howItWorks: [
            'Iterates through user\'s band rewards array',
            'For each band, calls _calculateBandClaimable()',
            'Band claimable = min(earned - claimed, govActions × bandRate)',
            'Sums claimable across all bands',
            'Returns total claimable OW tokens (18 decimals)',
            'Governance actions unlock tokens at band-specific rates'
          ],
          parameters: [
            { name: 'user', type: 'address', description: 'User address to check' }
          ],
          accessControl: 'Public view function',
          events: ['None (view function)'],
          gasEstimate: 'N/A (view)',
          example: `// Get user's claimable tokens
const claimable = await nativeRewards.getUserTotalClaimableTokens(
  userAddress
);

console.log("Claimable:", ethers.formatEther(claimable), "OW");

// Example scenario:
// Band 1 (300 OW/USDT):
//   - Earned: 3000 OW
//   - Governance actions: 5
//   - Claimable: min(3000, 5 × 300) = 1500 OW
//
// Band 2 (300 OW/USDT):
//   - Earned: 1500 OW
//   - Governance actions: 10
//   - Claimable: min(1500, 10 × 300) = 1500 OW
//
// Total claimable: 3000 OW`,
          relatedFunctions: ['recordGovernanceAction', 'markTokensClaimed', 'getUserBandRewards']
        },
        {
          name: 'markTokensClaimed',
          signature: 'markTokensClaimed(address user, uint256 amountClaimed) returns (bool)',
          whatItDoes: 'Updates claimed amounts after successful cross-chain claim on Main Rewards.',
          whyUse: 'Called by NOWJC after user claims tokens on Ethereum. Prevents double claiming.',
          howItWorks: [
            'Iterates through user\'s bands in FIFO order',
            'For each band with claimable tokens:',
            '  - Calculate how much from this band',
            '  - Update band\'s tokensClaimed',
            '  - Subtract from remainingToClaim',
            'Updates userTotalTokensClaimed',
            'Returns true on success'
          ],
          parameters: [
            { name: 'user', type: 'address', description: 'User who claimed tokens' },
            { name: 'amountClaimed', type: 'uint256', description: 'Amount of OW tokens claimed (18 decimals)' }
          ],
          accessControl: 'onlyJobContract - ONLY NOWJC can call',
          events: ['None directly'],
          gasEstimate: '~45K gas',
          example: `// User claims 1000 OW on Main Rewards (Ethereum)
// Main Rewards sends confirmation back to Native chain
// NOWJC receives message and calls:

await nativeRewards.markTokensClaimed(
  userAddress,
  ethers.parseEther("1000") // 1000 OW claimed
);

// Result:
// - Band 1 claimed: +1000 OW
// - User total claimed: +1000 OW
// - Future claimable reduced by 1000 OW`,
          relatedFunctions: ['getUserTotalClaimableTokens', 'processJobPayment']
        }
      ]
    },
    {
      category: 'Band Management',
      description: 'Functions for viewing and managing the 20 reward bands',
      items: [
        {
          name: 'getCurrentBand',
          signature: 'getCurrentBand() view returns (uint256)',
          whatItDoes: 'Returns the current active reward band based on totalPlatformPayments.',
          whyUse: 'Determines which band rate applies to new payments and governance unlocks.',
          howItWorks: [
            'Iterates through rewardBands array',
            'Checks if totalPlatformPayments falls within band range',
            'Returns matching band index (0-19)',
            'If beyond all bands, returns last band index',
            'Band determines: token rate, governance unlock rate'
          ],
          parameters: [],
          accessControl: 'Public view function',
          events: ['None (view function)'],
          gasEstimate: 'N/A (view)',
          example: `// Check current platform band
const currentBand = await nativeRewards.getCurrentBand();
const bandInfo = await nativeRewards.getRewardBand(currentBand);

console.log("Current Band:", currentBand);
console.log("Min Amount:", ethers.formatUnits(bandInfo.minAmount, 6), "USDT");
console.log("Max Amount:", ethers.formatUnits(bandInfo.maxAmount, 6), "USDT");
console.log("Rate:", ethers.formatEther(bandInfo.owPerDollar), "OW per USDT");

// Example outputs:
// Band 0: $0-$100k @ 300 OW/USDT
// Band 2: $200k-$400k @ 150 OW/USDT
// Band 5: $800k-$1.6M @ 37.5 OW/USDT`,
          relatedFunctions: ['getRewardBand', 'getPlatformBandInfo']
        },
        {
          name: 'getRewardBand',
          signature: 'getRewardBand(uint256 index) view returns (uint256 minAmount, uint256 maxAmount, uint256 owPerDollar)',
          whatItDoes: 'Returns configuration for a specific reward band.',
          whyUse: 'View band parameters: min/max amounts and token rate.',
          howItWorks: [
            'Validates index < rewardBands.length',
            'Returns band\'s minAmount, maxAmount, owPerDollar',
            'All amounts in respective units (USDT 6 decimals, OW 18 decimals)'
          ],
          parameters: [
            { name: 'index', type: 'uint256', description: 'Band index (0-19)' }
          ],
          accessControl: 'Public view function',
          events: ['None (view function)'],
          gasEstimate: 'N/A (view)',
          example: `// View all 20 reward bands
for (let i = 0; i < 20; i++) {
  const band = await nativeRewards.getRewardBand(i);
  console.log(\`Band \${i}:\`, 
    \`$\${ethers.formatUnits(band.minAmount, 6)} - \`,
    \`$\${ethers.formatUnits(band.maxAmount, 6)} @ \`,
    \`\${ethers.formatEther(band.owPerDollar)} OW/USDT\`
  );
}

// Output shows 20 bands, rates decreasing:
// Band 0:  $0 - $100k @ 300 OW/USDT
// Band 1:  $100k - $200k @ 300 OW/USDT
// Band 2:  $200k - $400k @ 150 OW/USDT
// ...
// Band 19: $26.2B - $52.4B @ 0.01 OW/USDT`,
          relatedFunctions: ['getCurrentBand', 'getRewardBandsCount']
        },
        {
          name: 'getPlatformBandInfo',
          signature: 'getPlatformBandInfo() view returns (uint256 currentBand, uint256 currentTotal, uint256 bandMinAmount, uint256 bandMaxAmount, uint256 governanceRewardRate)',
          whatItDoes: 'Returns complete platform status: current band, total payments, and band parameters.',
          whyUse: 'Single call to get all platform-wide reward system information.',
          howItWorks: [
            'Gets current band via getCurrentBand()',
            'Gets totalPlatformPayments',
            'Gets current band\'s min/max amounts',
            'Gets current band\'s owPerDollar rate',
            'Returns all values in one struct'
          ],
          parameters: [],
          accessControl: 'Public view function',
          events: ['None (view function)'],
          gasEstimate: 'N/A (view)',
          example: `// Get complete platform status
const info = await nativeRewards.getPlatformBandInfo();

console.log("Current Band:", info.currentBand);
console.log("Platform Total:", ethers.formatUnits(info.currentTotal, 6), "USDT");
console.log("Band Range:", 
  ethers.formatUnits(info.bandMinAmount, 6), "-",
  ethers.formatUnits(info.bandMaxAmount, 6), "USDT"
);
console.log("Current Rate:", ethers.formatEther(info.governanceRewardRate), "OW/USDT");

// Use for UI display of platform progress`,
          relatedFunctions: ['getCurrentBand', 'getRewardBand']
        }
      ]
    },
    {
      category: 'User Data Views',
      description: 'Functions for querying user-specific reward data',
      items: [
        {
          name: 'getUserBandRewards',
          signature: 'getUserBandRewards(address user) view returns (UserBandRewards[] memory)',
          whatItDoes: 'Returns complete array of user\'s rewards across all bands they\'ve earned in.',
          whyUse: 'See detailed breakdown of earned, claimable, and claimed tokens per band.',
          howItWorks: [
            'Returns userBandRewards[user] array',
            'Each element contains:',
            '  - band: Band index',
            '  - tokensEarned: Total earned in this band',
            '  - tokensClaimable: Available to claim (calculated)',
            '  - tokensClaimed: Already claimed from this band'
          ],
          parameters: [
            { name: 'user', type: 'address', description: 'User address to query' }
          ],
          accessControl: 'Public view function',
          events: ['None (view function)'],
          gasEstimate: 'N/A (view)',
          example: `// Get user's band-by-band breakdown
const bandRewards = await nativeRewards.getUserBandRewards(userAddress);

bandRewards.forEach((reward, i) => {
  console.log(\`Band \${reward.band}:\`);
  console.log(\`  Earned: \${ethers.formatEther(reward.tokensEarned)} OW\`);
  console.log(\`  Claimed: \${ethers.formatEther(reward.tokensClaimed)} OW\`);
});

// Shows rewards earned in each band user participated in`,
          relatedFunctions: ['getUserRewardsInBand', 'getUserTotalTokensEarned']
        },
        {
          name: 'getUserTotalTokensEarned',
          signature: 'getUserTotalTokensEarned(address user) view returns (uint256)',
          whatItDoes: 'Returns total OW tokens user has earned across all bands (locked + unlocked).',
          whyUse: 'See lifetime token earnings from platform activity.',
          howItWorks: [
            'Returns userTotalTokensEarned[user]',
            'Includes all bands',
            'Includes both locked and unlocked tokens',
            'Does NOT subtract claimed tokens'
          ],
          parameters: [
            { name: 'user', type: 'address', description: 'User address' }
          ],
          accessControl: 'Public view function',
          events: ['None (view function)'],
          gasEstimate: 'N/A (view)',
          example: `// Get user's lifetime earnings
const totalEarned = await nativeRewards.getUserTotalTokensEarned(
  userAddress
);
const totalClaimed = await nativeRewards.getUserTotalTokensClaimed(
  userAddress
);
const remaining = totalEarned - totalClaimed;

console.log("Total Earned:", ethers.formatEther(totalEarned), "OW");
console.log("Total Claimed:", ethers.formatEther(totalClaimed), "OW");
console.log("Remaining:", ethers.formatEther(remaining), "OW");`,
          relatedFunctions: ['getUserTotalTokensClaimed', 'getUserTotalClaimableTokens']
        },
        {
          name: 'getUserGovernanceActionsInBand',
          signature: 'getUserGovernanceActionsInBand(address user, uint256 band) view returns (uint256)',
          whatItDoes: 'Returns number of governance actions user performed in a specific band.',
          whyUse: 'See how many unlock actions user has in each band for claimable calculation.',
          howItWorks: [
            'Returns userGovernanceActionsByBand[user][band]',
            'Each action unlocks = band rate worth of tokens',
            'Used in claimable calculation'
          ],
          parameters: [
            { name: 'user', type: 'address', description: 'User address' },
            { name: 'band', type: 'uint256', description: 'Band index to check' }
          ],
          accessControl: 'Public view function',
          events: ['None (view function)'],
          gasEstimate: 'N/A (view)',
          example: `// Check governance participation per band
const currentBand = await nativeRewards.getCurrentBand();
const actionsInBand = await nativeRewards.getUserGovernanceActionsInBand(
  userAddress,
  currentBand
);

const bandRate = await nativeRewards.getRewardBand(currentBand);
const unlockedAmount = actionsInBand * bandRate.owPerDollar;

console.log("Actions in Band", currentBand + ":", actionsInBand);
console.log("Unlocked:", ethers.formatEther(unlockedAmount), "OW");`,
          relatedFunctions: ['getUserTotalGovernanceActions', 'recordGovernanceAction']
        }
      ]
    }
  ],
  
  dataFlows: [
    {
      title: 'Token Earning Flow (Job Payment)',
      description: 'How tokens are calculated and awarded when payments are released',
      steps: [
        { chain: 'Native Chain', action: '1. NOWJC releases payment to freelancer' },
        { chain: 'Native Chain', action: '2. NOWJC calls processJobPayment()' },
        { chain: 'Native Chain', action: '3. Native Rewards gets current platform band' },
        { chain: 'Native Chain', action: '4. Looks up job giver\'s referrer in ProfileGenesis' },
        { chain: 'Native Chain', action: '5. Looks up job taker\'s referrer in ProfileGenesis' },
        { chain: 'Native Chain', action: '6. Calculates: jobGiver gets 80-100%, referrers get 10% each' },
        { chain: 'Native Chain', action: '7. Awards tokens at current band rate (e.g., 300 OW/USDT)' },
        { chain: 'Native Chain', action: '8. Stores tokens as LOCKED in band-specific tracking' },
        { chain: 'Native Chain', action: '9. Updates user and platform totals' },
        { chain: 'Native Chain', action: '10. Returns awarded amounts to NOWJC' }
      ]
    },
    {
      title: 'Governance Unlock Flow',
      description: 'How locked tokens become claimable through governance participation',
      steps: [
        { chain: 'Main Chain', action: '1. User votes or proposes on Main DAO (Ethereum)' },
        { chain: 'Main Chain', action: '2. Main DAO sends governance notification via bridge' },
        { chain: 'Native Chain', action: '3. Native Bridge receives message' },
        { chain: 'Native Chain', action: '4. Routes to NOWJC.incrementGovernanceAction()' },
        { chain: 'Native Chain', action: '5. NOWJC calls Native Rewards.recordGovernanceAction()' },
        { chain: 'Native Chain', action: '6. Increments governance actions in current band' },
        { chain: 'Native Chain', action: '7. Unlock formula: govActions × bandRate' },
        { chain: 'Native Chain', action: '8. User can now claim unlocked tokens' }
      ]
    },
    {
      title: 'Cross-Chain Claim Flow',
      description: 'How users claim tokens on Ethereum after earning on Arbitrum',
      steps: [
        { chain: 'Native Chain', action: '1. User checks claimable via getUserTotalClaimableTokens()' },
        { chain: 'Native Chain', action: '2. User calls NOWJC.syncRewardsData()' },
        { chain: 'Native Chain', action: '3. NOWJC queries Native Rewards for claimable amount' },
        { chain: 'Native Chain', action: '4. Native Bridge sends LayerZero message to Main chain' },
        { chain: 'Main Chain', action: '5. Main Rewards receives and stores claimable amount' },
        { chain: 'Main Chain', action: '6. User calls Main Rewards.claimRewards()' },
        { chain: 'Main Chain', action: '7. OW tokens transferred to user wallet' },
        { chain: 'Main Chain', action: '8. Main Bridge sends claim confirmation back' },
        { chain: 'Native Chain', action: '9. NOWJC receives confirmation' },
        { chain: 'Native Chain', action: '10. Calls Native Rewards.markTokensClaimed()' },
        { chain: 'Native Chain', action: '11. Updates claimed balances to prevent double claim' }
      ]
    }
  ],
  
  integrationGuide: {
    example: `// Complete Native Rewards Integration Example
const { ethers } = require('ethers');

// Setup contracts
const nativeRewards = new ethers.Contract(rewardsAddress, rewardsABI, provider);
const nowjc = new ethers.Contract(nowjcAddress, nowjcABI, signer);

// 1. Check current platform band and rate
const bandInfo = await nativeRewards.getPlatformBandInfo();
console.log(\`Current Band: \${bandInfo.currentBand}\`);
console.log(\`Platform Total: $\${ethers.formatUnits(bandInfo.currentTotal, 6)}\`);
console.log(\`Current Rate: \${ethers.formatEther(bandInfo.governanceRewardRate)} OW/USDT\`);

// 2. Check user's earned tokens
const totalEarned = await nativeRewards.getUserTotalTokensEarned(userAddress);
console.log(\`Total Earned: \${ethers.formatEther(totalEarned)} OW\`);

// 3. Check governance participation
const totalGovActions = await nativeRewards.getUserTotalGovernanceActions(userAddress);
console.log(\`Governance Actions: \${totalGovActions}\`);

// 4. Calculate claimable amount
const claimable = await nativeRewards.getUserTotalClaimableTokens(userAddress);
console.log(\`Claimable: \${ethers.formatEther(claimable)} OW\`);

// 5. Get detailed band breakdown
const bandRewards = await nativeRewards.getUserBandRewards(userAddress);
bandRewards.forEach(reward => {
  console.log(\`Band \${reward.band}:\`);
  console.log(\`  Earned: \${ethers.formatEther(reward.tokensEarned)} OW\`);
  console.log(\`  Claimed: \${ethers.formatEther(reward.tokensClaimed)} OW\`);
});

// 6. Sync to Main chain for claiming (via NOWJC)
const lzFee = await nowjc.quoteSyncRewardsData(userAddress, claimable, lzOptions);
await nowjc.syncRewardsData(lzOptions, { value: lzFee });`,
    tips: [
      'Tokens start LOCKED - must participate in governance to unlock',
      'Each governance action unlocks = current band rate (e.g., 300 OW in Band 1)',
      'Referral bonuses: 10% to job giver\'s referrer, 10% to job taker\'s referrer',
      '20 bands total, each distributing 30M OW (600M total)',
      'Rates decrease as platform grows (300 → ~0.01 OW/USDT)',
      'Only NOWJC can call state-changing functions',
      'Claims happen on Ethereum (Main Rewards), not on Native Rewards directly',
      'Band-specific tracking ensures accurate accounting across platform growth',
      'Governance actions must be in same or earlier bands as earnings',
      'ProfileGenesis used first for referrers, Genesis as fallback',
      'No direct token holding - Native Rewards only tracks calculations',
      'Cross-chain sync required before claiming on Ethereum'
    ]
  },
  
  deployConfig: {
    type: 'uups',
    constructor: [
      {
        name: '_owner',
        type: 'address',
        description: 'Contract owner address (admin who can upgrade)',
        placeholder: '0x...'
      },
      {
        name: '_jobContract',
        type: 'address',
        description: 'NOWJC contract address (ONLY authorized caller for state changes)',
        placeholder: '0x...'
      },
      {
        name: '_genesis',
        type: 'address',
        description: 'OpenworkGenesis contract address (for fallback referrer lookups)',
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
    estimatedGas: '4.2M',
    postDeploy: {
      message: 'UUPS deployment complete! Next: Initialize the proxy contract on block scanner.',
      nextSteps: [
        '1. Deploy NativeRewards (OpenWorkRewardsContract) implementation (no constructor params)',
        '2. Deploy UUPSProxy with implementation address',
        '3. Call initialize() on proxy via block scanner with:',
        '   - Owner address (your admin wallet)',
        '   - NOWJC contract address (jobContract)',
        '   - OpenworkGenesis contract address',
        '4. Set ProfileGenesis address: setProfileGenesis(profileGenesisAddress)',
        '5. Verify 20 reward bands initialized correctly:',
        '   - Call getRewardBandsCount() → should return 20',
        '   - Call getRewardBand(0) → Band 1: $0-$100k @ 300 OW/USDT',
        '   - Call getCurrentBand() → should return 0 (Band 1)',
        '6. Test token calculation:',
        '   - calculateTokensForRange(0, 1000 USDT)',
        '   - Should return 300,000 OW (300 * 1000)',
        '7. Verify both implementation and proxy on Arbiscan',
        '8. Ensure NOWJC has this contract configured as rewardsContract'
      ]
    }
  },
  
  securityConsiderations: [
    'UUPS upgradeable - owner only can upgrade',
    'onlyJobContract modifier: ONLY NOWJC can change state',
    'No direct user claims - prevents gaming and manipulation',
    'Governance-gated unlocks: can\'t dump tokens without participation',
    'Band-specific tracking: prevents cross-band manipulation',
    'Referral validation: checks for self-referral and duplicate referrers',
    'Platform total tracking: accurate band progression',
    'FIFO claim ordering: fair distribution across bands',
    'View-only user queries: anyone can check data',
    'Cross-chain claim confirmation: prevents double claiming',
    'Separate band accounting: isolates risks per band',
    'ProfileGenesis integration: flexible referral system with fallback'
  ],
  
  code: `// Full implementation: contracts/openwork-full-contract-suite-layerzero+CCTP 2 Dec/native-rewards.sol

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import { UUPSUpgradeable } from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import { OwnableUpgradeable } from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract OpenWorkRewardsContract is 
    Initializable,
    OwnableUpgradeable,
    UUPSUpgradeable
{
    // ==================== REWARD STRUCTURES ====================
    struct RewardBand {
        uint256 minAmount;
        uint256 maxAmount;
        uint256 owPerDollar;
    }
    
    struct UserBandRewards {
        uint256 band;
        uint256 tokensEarned;
        uint256 tokensClaimable;
        uint256 tokensClaimed;
    }

    // ==================== STATE VARIABLES ====================
    address public jobContract;
    IOpenworkGenesis public genesis;
    IProfileGenesis public profileGenesis;
    RewardBand[] public rewardBands;
    uint256 public totalPlatformPayments;
    uint256 public currentPlatformBand;
    
    mapping(address => UserBandRewards[]) public userBandRewards;
    mapping(address => mapping(uint256 => uint256)) public userBandIndex;
    mapping(address => mapping(uint256 => bool)) public userHasBandRewards;
    mapping(address => uint256) public userTotalTokensEarned;
    mapping(address => uint256) public userTotalTokensClaimed;
    mapping(address => mapping(uint256 => uint256)) public userGovernanceActionsByBand;
    mapping(address => uint256) public userTotalGovernanceActions;

    // ==================== INITIALIZATION ====================
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _owner,
        address _jobContract,
        address _genesis
    ) public initializer {
        __Ownable_init(_owner);
        __UUPSUpgradeable_init();
        
        jobContract = _jobContract;
        genesis = IOpenworkGenesis(_genesis);
        totalPlatformPayments = 0;
        currentPlatformBand = 0;
        
        _initializeRewardBands();
    }
    
    function _initializeRewardBands() private {
        // 20 reward bands, each distributing 30M OW tokens
        rewardBands.push(RewardBand(0, 100000 * 1e6, 300 * 1e18));                    // Band 1
        rewardBands.push(RewardBand(100000 * 1e6, 200000 * 1e6, 300 * 1e18));         // Band 2
        rewardBands.push(RewardBand(200000 * 1e6, 400000 * 1e6, 150 * 1e18));         // Band 3
        // ... 17 more bands
        rewardBands.push(RewardBand(26214400000 * 1e6, 52428800000 * 1e6, 11444091796875 * 1e2)); // Band 20
    }

    function getCurrentBand() public view returns (uint256) {
        for (uint256 i = 0; i < rewardBands.length; i++) {
            if (totalPlatformPayments >= rewardBands[i].minAmount && 
                totalPlatformPayments <= rewardBands[i].maxAmount) {
                return i;
            }
        }
        return rewardBands.length > 0 ? rewardBands.length - 1 : 0;
    }

    // ==================== CORE REWARD PROCESSING ====================
    function processJobPayment(
        address jobGiver,
        address jobTaker, 
        uint256 amount,
        uint256 newPlatformTotal
    ) external onlyJobContract returns (uint256[] memory tokensAwarded) {
        totalPlatformPayments = newPlatformTotal;
        
        // Get referrers
        address jobGiverReferrer = address(0);
        address jobTakerReferrer = address(0);
        
        if (address(profileGenesis) != address(0)) {
            jobGiverReferrer = profileGenesis.getUserReferrer(jobGiver);
            jobTakerReferrer = profileGenesis.getUserReferrer(jobTaker);
        }
        
        // Calculate reward distribution (job giver 80%, referrers 10% each)
        uint256 jobGiverAmount = amount;
        uint256 jobGiverReferrerAmount = 0;
        uint256 jobTakerReferrerAmount = 0;
        
        if (jobGiverReferrer != address(0)) {
            jobGiverReferrerAmount = amount / 10;
            jobGiverAmount -= jobGiverReferrerAmount;
        }
        
        if (jobTakerReferrer != address(0)) {
            jobTakerReferrerAmount = amount / 10;
            jobGiverAmount -= jobTakerReferrerAmount;
        }
        
        // Award tokens
        tokensAwarded = new uint256[](3);
        if (jobGiverAmount > 0) {
            tokensAwarded[0] = _awardTokensInCurrentBand(jobGiver, jobGiverAmount, newPlatformTotal - amount);
        }
        if (jobGiverReferrerAmount > 0) {
            tokensAwarded[1] = _awardTokensInCurrentBand(jobGiverReferrer, jobGiverReferrerAmount, newPlatformTotal - amount);
        }
        if (jobTakerReferrerAmount > 0) {
            tokensAwarded[2] = _awardTokensInCurrentBand(jobTakerReferrer, jobTakerReferrerAmount, newPlatformTotal - amount);
        }
        
        return tokensAwarded;
    }

    function recordGovernanceAction(address user) external onlyJobContract {
        uint256 currentBand = getCurrentBand();
        userGovernanceActionsByBand[user][currentBand]++;
        userTotalGovernanceActions[user]++;
        emit GovernanceActionRecorded(user, currentBand, userGovernanceActionsByBand[user][currentBand], userTotalGovernanceActions[user]);
    }

    // ==================== CLAIMABLE CALCULATION ====================
    function getUserTotalClaimableTokens(address user) external view returns (uint256) {
        uint256 totalClaimable = 0;
        UserBandRewards[] memory rewards = userBandRewards[user];
        
        for (uint256 i = 0; i < rewards.length; i++) {
            totalClaimable += _calculateBandClaimable(user, rewards[i]);
        }
        
        return totalClaimable;
    }
    
    function _calculateBandClaimable(address user, UserBandRewards memory bandReward) internal view returns (uint256) {
        uint256 govActionsInBand = userGovernanceActionsByBand[user][bandReward.band];
        uint256 rewardRate = rewardBands[bandReward.band].owPerDollar;
        uint256 maxClaimableFromGovActions = govActionsInBand * rewardRate;
        
        uint256 availableToEarn = bandReward.tokensEarned > bandReward.tokensClaimed ? 
            bandReward.tokensEarned - bandReward.tokensClaimed : 0;
        
        return availableToEarn > maxClaimableFromGovActions ? 
            maxClaimableFromGovActions : availableToEarn;
    }

    function markTokensClaimed(address user, uint256 amountClaimed) external onlyJobContract returns (bool) {
        uint256 remainingToClaim = amountClaimed;
        
        for (uint256 i = 0; i < userBandRewards[user].length && remainingToClaim > 0; i++) {
            UserBandRewards memory bandReward = userBandRewards[user][i];
            uint256 bandClaimable = _calculateBandClaimable(user, bandReward);
            
            if (bandClaimable > 0) {
                uint256 claimFromThisBand = remainingToClaim > bandClaimable ? 
                    bandClaimable : remainingToClaim;
                
                uint256 bandIndex = userBandIndex[user][bandReward.band];
                userBandRewards[user][bandIndex].tokensClaimed += claimFromThisBand;
                remainingToClaim -= claimFromThisBand;
            }
        }
        
        userTotalTokensClaimed[user] += amountClaimed;
        return true;
    }

    // ... Additional view and calculation functions
    // See full implementation in repository
}`
};
