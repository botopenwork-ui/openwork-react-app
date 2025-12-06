export const nativeAthena = {
  id: 'nativeAthena',
  name: 'Native Athena',
  chain: 'l2',
  column: 'l2-left',
  order: 1,
  status: 'testnet',
  version: 'v1.0.0',
  gas: '78K',
  mainnetNetwork: 'Arbitrum One',
  testnetNetwork: 'Arbitrum Sepolia',
  mainnetDeployed: 'Not deployed',
  testnetDeployed: 'Deployed',
  mainnetAddress: null,
  testnetAddress: '0x098E52Aff44AEAd944AFf86F4A5b90dbAF5B86bd',
  isUUPS: true,
  implementationAddress: '0xf360c9a73536a1016d1d35f80f2333a16fb2a4d2',
  tvl: 'N/A',
  docs: 'Native Athena - Decentralized dispute resolution, skill verification, and oracle governance system with proportional fee distribution.',
  
  overview: {
    purpose: 'Native Athena is the governance and dispute resolution hub for OpenWork, handling three key functions: (1) Job dispute resolution through community voting, (2) Skill verification for oracle members, and (3) Ask Athena consultations. The contract verifies voter eligibility through Native DAO (checking staked + earned tokens), collects weighted votes during configurable voting periods, and distributes fees proportionally to winning voters. All data is stored in OpenworkGenesis for persistence.',
    tier: 'Native Chain (Arbitrum Sepolia)',
    category: 'Governance & Dispute Resolution',
    upgradeability: 'UUPS Upgradeable (owner + bridge can upgrade)'
  },
  
  features: [
    'Multi-type voting: Handles disputes, skill verifications, and Ask Athena consultations',
    'Eligibility verification: Checks voting power through Native DAO (staked + earned tokens)',
    'Weighted voting: Vote weight calculated from stake duration and earned tokens',
    'Proportional fee distribution: Winners receive fees based on their voting power contribution',
    'Oracle management: Create, update, and manage skill oracles with member verification',
    'Oracle activity tracking: NEW - Track member participation, auto-detect inactive oracles',
    'Activity-based validation: NEW - Only active oracles can accept disputes/verifications',
    'Member activity monitoring: NEW - Tracks last vote timestamp for each member (90-day threshold)',
    'Configurable activity threshold: NEW - Owner can adjust activity requirements (30-180 days)',
    'Automatic oracle status: NEW - Oracles marked inactive if too few active members',
    'Configurable voting periods: Owner can set voting duration (default 60 minutes)',
    'Cross-chain fund release: Integrates with NOWJC for dispute fund distribution via CCTP',
    'Multi-dispute support: Jobs can have multiple disputes with counter tracking'
  ],
  
  systemPosition: {
    description: 'Native Athena is the central dispute resolution hub that receives disputes from ANY Local chain via LayerZero messaging. Users interact with Athena Client contracts deployed on each Local chain (Ethereum, Optimism, Base, etc.) to raise disputes, submit skill verifications, or ask oracle questions. Athena Client collects USDC fees and routes them via CCTP directly to Native Athena, then sends dispute data through the LayerZero bridge (Local Bridge contract on source chain → Native Bridge contract on Native chain). Native Athena verifies voter eligibility through Native DAO, collects weighted votes, determines outcomes, distributes fees proportionally to winning voters, and triggers fund releases via NOWJC. This multi-chain architecture allows users to raise disputes from any supported chain while maintaining centralized voting and resolution on Arbitrum.',
    diagram: `
📍 Multi-Chain Dispute Resolution Architecture

User on ANY Local Chain
    └─> Athena Client (Local Chain)
        ├─> Collect USDC fee
        ├─> Route fee via CCTP → Native Athena
        └─> Send dispute data via LayerZero
            ↓
    Local Bridge (LayerZero OApp)
        └─> Forward to Native chain
            ↓
    Native Bridge (LayerZero OApp)
        └─> Route to Native Athena
            ↓
    Native Athena ⭐ (You are here)
        ├─> handleRaiseDispute() creates dispute
        ├─> Check Eligibility
        │   └─> Native DAO.canVote()
        │       ├─ Staked tokens * duration
        │       └─ Earned tokens from jobs
        │
        ├─> Collect Votes
        │   └─> OpenworkGenesis
        │       ├─ Store voter data
        │       ├─ Track voting power
        │       └─ Record vote side
        │
        └─> Settlement
            ├─> Calculate winning side
            ├─> Distribute fees proportionally
            │   └─> USDC to winning voters
            ├─> Release dispute funds
            │   └─> NOWJC.releaseDisputedFunds()
            │       └─> CCTP to winner's chain
            └─> Send resolution back
                └─> Native Bridge → Local Bridge
                    └─> Athena Client
                        └─> Auto-resolve in LOWJC`
  },
  
  dependencies: {
    dependsOn: [
      { 
        name: 'OpenworkGenesis', 
        reason: 'Stores all dispute data, vote records, voter information, and oracle configurations.',
        type: 'Storage'
      },
      { 
        name: 'Native Bridge', 
        reason: 'Routes dispute creation messages from all Local chains. Calls handleRaiseDispute(), handleSubmitSkillVerification(), and handleAskAthena().',
        type: 'Bridge'
      },
      { 
        name: 'Native DAO', 
        reason: 'Provides voter eligibility checks via getStakerInfo() for stake-based voting power.',
        type: 'Governance'
      },
      { 
        name: 'NOWJC', 
        reason: 'Provides earned token data via getUserEarnedTokens() and releases disputed funds via releaseDisputedFunds().',
        type: 'Job Management'
      },
      {
        name: 'USDC Token',
        reason: 'Used for fee payments (received via CCTP) and proportional distribution to winning voters.',
        type: 'Token'
      },
      {
        name: 'Oracle Manager',
        reason: 'Handles oracle creation, member management, and skill verification (optional integration).',
        type: 'Governance'
      }
    ],
    requiredBy: [
      { 
        name: 'Athena Client (All Local Chains)', 
        reason: 'User-facing entry point on each Local chain. Collects fees, routes via CCTP, sends dispute data via LayerZero.',
        type: 'Client Interface'
      },
      { 
        name: 'Frontend Applications', 
        reason: 'Display disputes, skill verifications, voting interfaces, and results.',
        type: 'User Interface'
      },
      { 
        name: 'Native Bridge', 
        reason: 'Receives settlement results and voter data to send back to Local chains for auto-resolution.',
        type: 'Bridge'
      }
    ],
    prerequisites: [
      'OpenworkGenesis deployed for data storage',
      'Native DAO deployed for stake-based eligibility',
      'NOWJC deployed for earned tokens and fund release',
      'USDC token contract address configured',
      'minStakeRequired set (default: 100 tokens)',
      'votingPeriodMinutes configured (default: 60 minutes)'
    ]
  },
  
  functions: [
    {
      category: 'Oracle Activity Tracking',
      description: 'NEW: Functions for tracking oracle member activity and determining oracle active status',
      items: [
        {
          name: 'updateOracleActiveStatus',
          signature: 'updateOracleActiveStatus(string _oracleName)',
          whatItDoes: 'Updates the active status of an oracle by counting how many members have voted within the activity threshold (default: 90 days).',
          whyUse: 'Ensures oracles remain active only when members are engaged. Anyone can call this to update oracle status.',
          howItWorks: [
            'Gets all oracle members from Genesis',
            'Iterates through each member',
            'Checks memberLastActivity for each',
            'Counts members active within threshold (90 days)',
            'Sets oracle as active if activeCount >= minOracleMembers',
            'Stores status in Genesis',
            'Emits OracleStatusUpdated event'
          ],
          parameters: [
            { name: '_oracleName', type: 'string', description: 'Name of oracle to update status for' }
          ],
          accessControl: 'Public - anyone can call (they pay gas)',
          events: ['OracleStatusUpdated(oracleName, isActive, activeMemberCount)'],
          gasEstimate: '~150K gas (expensive - iterates all members)',
          example: `// Update oracle status after members vote or become inactive
await nativeAthena.updateOracleActiveStatus("Solidity Development");

// Result:
// - Counts active members (voted within 90 days)
// - If >= minOracleMembers: oracle marked active
// - If < minOracleMembers: oracle marked inactive
// - Inactive oracles cannot accept new disputes/verifications

// Use case: Call periodically (weekly) to maintain oracle health`,
          relatedFunctions: ['isOracleActive', 'getOracleActiveMemberCount']
        },
        {
          name: 'isOracleActive',
          signature: 'isOracleActive(string _oracleName) view returns (bool)',
          whatItDoes: 'Quick check if oracle is currently active (reads from cached status in Genesis).',
          whyUse: 'Fast validation before accepting disputes or skill verifications. Used by handleRaiseDispute() and handleSubmitSkillVerification().',
          howItWorks: [
            'Reads oracleActiveStatus from Genesis (cached value)',
            'Returns boolean',
            'Cheap read - doesn\'t iterate members',
            'Status updated by updateOracleActiveStatus()'
          ],
          parameters: [
            { name: '_oracleName', type: 'string', description: 'Oracle name to check' }
          ],
          accessControl: 'Public view',
          events: ['None (view)'],
          gasEstimate: 'N/A (view)',
          example: `// Check if oracle can accept new work
const isActive = await nativeAthena.isOracleActive("Frontend Development");

if (isActive) {
  console.log("Oracle is active - can raise disputes");
  // Allow dispute creation
} else {
  console.log("Oracle inactive - members haven't been voting");
  // Suggest different oracle or ask members to become active
}

// Frontend use case:
// Filter oracle list to show only active oracles for disputes`,
          relatedFunctions: ['updateOracleActiveStatus', 'handleRaiseDispute']
        },
        {
          name: 'isOracleMember',
          signature: 'isOracleMember(address _account, string _oracleName) view returns (bool)',
          whatItDoes: 'Checks if an address is a member of a specific oracle.',
          whyUse: 'Validate member status, especially for skill verification votes where only oracle members can vote on active oracles.',
          howItWorks: [
            'Gets oracle members array from Genesis',
            'Iterates through members',
            'Returns true if account found',
            'Returns false if not found'
          ],
          parameters: [
            { name: '_account', type: 'address', description: 'Address to check' },
            { name: '_oracleName', type: 'string', description: 'Oracle name' }
          ],
          accessControl: 'Public view',
          events: ['None (view)'],
          gasEstimate: 'N/A (view)',
          example: `// Check if user is oracle member
const isMember = await nativeAthena.isOracleMember(
  userAddress,
  "Solidity Development"
);

if (isMember) {
  console.log("You are a member of this oracle");
  // Can vote on oracle's skill verifications
} else {
  console.log("Not a member");
}`,
          relatedFunctions: ['getOracleActiveMemberCount', 'vote']
        },
        {
          name: 'getOracleActiveMemberCount',
          signature: 'getOracleActiveMemberCount(string _oracleName) view returns (uint256)',
          whatItDoes: 'Counts how many oracle members have been active (voted) within the activity threshold period.',
          whyUse: 'Monitor oracle health, display active member count in UI.',
          howItWorks: [
            'Gets all oracle members from Genesis',
            'Iterates each member',
            'Checks memberLastActivity timestamp',
            'Counts if activity within threshold (90 days)',
            'Returns active count',
            'Expensive - iterates all members'
          ],
          parameters: [
            { name: '_oracleName', type: 'string', description: 'Oracle name' }
          ],
          accessControl: 'Public view',
          events: ['None (view)'],
          gasEstimate: 'N/A (view, but expensive)',
          example: `const totalMembers = (await genesis.getOracle("Frontend Development")).members.length;
const activeMembers = await nativeAthena.getOracleActiveMemberCount("Frontend Development");

console.log(\`Active members: \${activeMembers} / \${totalMembers}\`);

if (activeMembers < 3) {
  console.log("Warning: Oracle below minimum active members");
  console.log("May become inactive soon");
}

// Display in oracle health dashboard`,
          relatedFunctions: ['updateOracleActiveStatus', 'isOracleActive']
        },
        {
          name: 'updateMemberActivityThreshold',
          signature: 'updateMemberActivityThreshold(uint256 _newThresholdDays)',
          whatItDoes: 'Owner updates the activity threshold (default: 90 days) for determining active members.',
          whyUse: 'Adjust activity requirements based on platform maturity and voting frequency.',
          howItWorks: [
            'Validates caller is owner',
            'Sets memberActivityThresholdDays = new value',
            'Emits MemberActivityThresholdUpdated event',
            'Affects future updateOracleActiveStatus() calls'
          ],
          parameters: [
            { name: '_newThresholdDays', type: 'uint256', description: 'New threshold in days (e.g., 30, 60, 90, 180)' }
          ],
          accessControl: 'Owner only',
          events: ['MemberActivityThresholdUpdated(newThresholdDays)'],
          gasEstimate: '~30K gas',
          example: `// Make activity threshold stricter (30 days)
await nativeAthena.updateMemberActivityThreshold(30);

// Or more lenient (180 days)
await nativeAthena.updateMemberActivityThreshold(180);

// After update, next updateOracleActiveStatus() uses new threshold`,
          relatedFunctions: ['updateOracleActiveStatus', 'getOracleActiveMemberCount']
        }
      ]
    },
    {
      category: 'Dispute Management',
      description: 'Functions for creating and settling job disputes with community voting',
      items: [
        {
          name: 'handleRaiseDispute',
          signature: 'handleRaiseDispute(string jobId, string disputeHash, string oracleName, uint256 fee, uint256 disputedAmount, address disputeRaiser)',
          whatItDoes: 'Creates a new dispute for a job, requiring an active oracle and generating a unique dispute ID with counter.',
          whyUse: 'Called by bridge when either party raises a dispute on a Local chain. Creates dispute record and starts voting period.',
          howItWorks: [
            'Validates oracle exists and has minimum required members',
            'Increments dispute counter for the job (jobDisputeCounters[jobId])',
            'Creates dispute ID: jobId + "-" + counter (e.g., "40232-57-1")',
            'Records dispute start time in disputeStartTimes mapping',
            'Calls genesis.setDispute() with all parameters',
            'Emits DisputeRaised event'
          ],
          parameters: [
            { name: 'jobId', type: 'string', description: 'Original job identifier (e.g., "40232-57")' },
            { name: 'disputeHash', type: 'string', description: 'IPFS hash containing dispute details and evidence' },
            { name: 'oracleName', type: 'string', description: 'Name of oracle that will govern this dispute' },
            { name: 'fee', type: 'uint256', description: 'USDC fee amount to be distributed to voters' },
            { name: 'disputedAmount', type: 'uint256', description: 'Amount of USDC in dispute from job escrow' },
            { name: 'disputeRaiser', type: 'address', description: 'Address raising the dispute (job giver or freelancer)' }
          ],
          accessControl: 'Bridge-only: Intended to be called by Native Bridge (commented out in code)',
          events: [
            'DisputeRaised(jobId, disputeRaiser, fees)'
          ],
          gasEstimate: '~72K gas',
          example: `// Called by bridge after cross-chain message
// User initiated dispute on Local chain with evidence
await nativeAthena.handleRaiseDispute(
  "40232-57",  // Job ID
  "QmDispute123...",  // IPFS evidence
  "DeveloperOracle",  // Oracle name
  ethers.parseUnits("100", 6),  // 100 USDC fee
  ethers.parseUnits("2000", 6),  // 2000 USDC disputed
  disputeRaiserAddress
);

// Creates dispute ID: "40232-57-1"
// Voting period starts immediately`,
          relatedFunctions: ['vote', 'settleDispute']
        },
        {
          name: 'vote',
          signature: 'vote(VotingType _votingType, string _disputeId, bool _voteFor, address _claimAddress)',
          whatItDoes: 'Casts a weighted vote on a dispute, skill verification, or Ask Athena application after eligibility check.',
          whyUse: 'Community members with sufficient voting power vote to resolve disputes and verifications. Vote weight is calculated from staked + earned tokens.',
          howItWorks: [
            'Calls canVote() to verify user has minimum required tokens',
            'Calculates vote weight via getUserVotingPower() (stake*duration + earned)',
            'Stores voter data in Genesis with claim address and voting power',
            'Routes to internal _voteOnDispute, _voteOnSkillVerification, or _voteOnAskAthena',
            'Updates vote counters in Genesis (votesFor or votesAgainst)',
            'Marks user as having voted to prevent double voting',
            'Calls NOWJC.incrementGovernanceAction() for rewards',
            'Requires vote weight > 0 and claim address != zero'
          ],
          parameters: [
            { name: '_votingType', type: 'VotingType', description: 'Enum: Dispute(0), SkillVerification(1), or AskAthena(2)' },
            { name: '_disputeId', type: 'string', description: 'Dispute ID or application ID as string (e.g., "40232-57-1" or "5")' },
            { name: '_voteFor', type: 'bool', description: 'true = vote for dispute raiser/applicant, false = vote against' },
            { name: '_claimAddress', type: 'address', description: 'Address where voter wants to receive fee rewards' }
          ],
          accessControl: 'Public function - anyone with sufficient voting power can call',
          events: ['None directly (internal functions emit events)'],
          gasEstimate: '~68K gas',
          example: `// Check eligibility first
const canVote = await nativeAthena.canVote(userAddress);
if (!canVote) {
  console.log("Need minStakeRequired tokens to vote");
  return;
}

// Get voting power
const votingPower = await nativeAthena.getUserVotingPower(userAddress);
console.log(\`Voting with \${ethers.formatEther(votingPower)} power\`);

// Vote on dispute (VotingType.Dispute = 0)
await nativeAthena.vote(
  0,  // VotingType.Dispute
  "40232-57-1",  // Dispute ID
  true,  // Vote for dispute raiser
  userAddress  // Claim address for fees
);

// Vote recorded with weight
// Will receive proportional fee share if wins`,
          relatedFunctions: ['canVote', 'getUserVotingPower', 'settleDispute']
        },
        {
          name: 'settleDispute',
          signature: 'settleDispute(string _disputeId)',
          whatItDoes: 'Finalizes a dispute after voting period, determines winner by vote count, distributes fees proportionally, and releases funds to winner.',
          whyUse: 'Called after voting period ends to execute the community decision and distribute rewards.',
          howItWorks: [
            'Validates dispute exists and voting period ended (block.timestamp >= startTime + votingPeriodMinutes*60)',
            'Retrieves dispute from Genesis, checks not already finalized',
            'Determines winner: votesFor > votesAgainst means dispute raiser wins',
            'Calls genesis.finalizeDispute() with result',
            'Extracts original job ID from dispute ID',
            'Determines fund recipient based on who raised dispute and who won',
            'Calls NOWJC.releaseDisputedFunds() if applicable',
            'If no votes cast: refunds fees to dispute raiser',
            'If votes cast: calls _distributeFeeToWinningVoters()',
            'Emits DisputeFinalized event'
          ],
          parameters: [
            { name: '_disputeId', type: 'string', description: 'Dispute identifier to finalize (e.g., "40232-57-1")' }
          ],
          accessControl: 'Public function - anyone can call after voting period',
          events: [
            'DisputeFinalized(disputeId, winningSide, totalVotesFor, totalVotesAgainst)',
            'FeeDistributed(disputeId, recipient, amount) [for each voter]',
            'DisputeFeeRefunded(disputeId, disputeRaiser, amount, targetChain) [if no votes]'
          ],
          gasEstimate: '~120K gas + variable (depends on number of voters)',
          example: `// Check if voting period ended
const dispute = await nativeAthena.getDispute("40232-57-1");
const startTime = await nativeAthena.disputeStartTimes("40232-57-1");
const votingPeriod = await nativeAthena.votingPeriodMinutes();
const endTime = startTime + (votingPeriod * 60);

if (Date.now() / 1000 >= endTime && !dispute.isFinalized) {
  // Settle dispute
  await nativeAthena.settleDispute("40232-57-1");
  
  // Results:
  // - Winner determined by vote count
  // - Fees distributed proportionally to winning voters
  // - Escrowed funds released to winner via CCTP
  // - Or fees refunded if no votes
  
  console.log("Dispute settled");
  console.log("Winner:", dispute.votesFor > dispute.votesAgainst ? "Raiser" : "Opponent");
}`,
          relatedFunctions: ['handleRaiseDispute', 'vote', 'getDispute']
        }
      ]
    },
    {
      category: 'Skill Verification',
      description: 'Functions for verifying skills of oracle members through community voting',
      items: [
        {
          name: 'handleSubmitSkillVerification',
          signature: 'handleSubmitSkillVerification(address applicant, string applicationHash, uint256 feeAmount, string targetOracleName)',
          whatItDoes: 'Submits a skill verification application for oracle membership with fee payment.',
          whyUse: 'Users apply to become verified members of skill oracles by submitting credentials for community review.',
          howItWorks: [
            'Gets current application counter from Genesis',
            'Calls genesis.setSkillApplication() with all parameters',
            'Increments application counter',
            'Starts voting period automatically',
            'Emits SkillVerificationSubmitted event'
          ],
          parameters: [
            { name: 'applicant', type: 'address', description: 'Address applying for skill verification' },
            { name: 'applicationHash', type: 'string', description: 'IPFS hash with credentials, portfolio, certifications' },
            { name: 'feeAmount', type: 'uint256', description: 'USDC fee to be distributed to voters' },
            { name: 'targetOracleName', type: 'string', description: 'Name of oracle applying to join' }
          ],
          accessControl: 'Bridge-only: Intended to be called by Native Bridge (commented out)',
          events: [
            'SkillVerificationSubmitted(applicant, targetOracleName, feeAmount, applicationId)'
          ],
          gasEstimate: '~58K gas',
          example: `// Called by bridge after user submits on Local chain
await nativeAthena.handleSubmitSkillVerification(
  applicantAddress,
  "QmCredentials123...",  // Portfolio/certs
  ethers.parseUnits("50", 6),  // 50 USDC fee
  "ReactDevelopers"
);

// Application ID auto-assigned
// Voting begins immediately`,
          relatedFunctions: ['vote', 'finalizeSkillVerification']
        },
        {
          name: 'finalizeSkillVerification',
          signature: 'finalizeSkillVerification(uint256 _applicationId)',
          whatItDoes: 'Finalizes skill verification after voting period, adds applicant to oracle if approved, distributes fees to winners.',
          whyUse: 'Called after voting period to execute community decision on skill verification.',
          howItWorks: [
            'Retrieves application from Genesis',
            'Validates exists, not finalized, voting active, period expired',
            'Determines result: votesFor > votesAgainst means approved',
            'Calls genesis.finalizeSkillVerification()',
            'If approved: calls genesis.addSkillVerifiedAddress()',
            'Calls _distributeFeeToWinningVoters() with winning side',
            'Emits SkillVerificationSettled event'
          ],
          parameters: [
            { name: '_applicationId', type: 'uint256', description: 'Application ID to finalize' }
          ],
          accessControl: 'Public function - anyone can call after voting period',
          events: [
            'SkillVerificationSettled(applicationId, result, totalVotesFor, totalVotesAgainst)'
          ],
          gasEstimate: '~85K gas',
          example: `// After voting period
const application = await genesis.getSkillApplication(5);

if (application.timeStamp + (votingPeriod * 60) <= Date.now() / 1000) {
  await nativeAthena.finalizeSkillVerification(5);
  
  // If approved: applicant added to oracle
  // Fees distributed to winning voters proportionally
}`,
          relatedFunctions: ['handleSubmitSkillVerification', 'vote']
        }
      ]
    },
    {
      category: 'Ask Athena',
      description: 'Functions for oracle consultations and advisory voting',
      items: [
        {
          name: 'handleAskAthena',
          signature: 'handleAskAthena(address applicant, string description, string hash, string targetOracle, string fees)',
          whatItDoes: 'Submits a question or consultation request to a specific oracle for community advisory vote.',
          whyUse: 'Users can request advisory opinions from skill oracles on technical questions or decisions.',
          howItWorks: [
            'Validates caller is bridge',
            'Gets current Ask Athena counter from Genesis',
            'Calls genesis.setAskAthenaApplication() with parameters',
            'Increments counter',
            'Emits AskAthenaSubmitted event'
          ],
          parameters: [
            { name: 'applicant', type: 'address', description: 'Address asking the question' },
            { name: 'description', type: 'string', description: 'Question or consultation topic' },
            { name: 'hash', type: 'string', description: 'IPFS hash with detailed question and context' },
            { name: 'targetOracle', type: 'string', description: 'Oracle name to consult' },
            { name: 'fees', type: 'string', description: 'Fee amount as string' }
          ],
          accessControl: 'Bridge-only: Only Native Bridge can call',
          events: [
            'AskAthenaSubmitted(applicant, targetOracle, fees)'
          ],
          gasEstimate: '~55K gas',
          example: `// User asks oracle question on Local chain
// Bridge calls Native Athena
await nativeAthena.handleAskAthena(
  userAddress,
  "Should we refactor the auth module?",
  "QmQuestion123...",
  "SecurityOracle",
  "25000000"  // 25 USDC as string
);`,
          relatedFunctions: ['vote', 'settleAskAthena']
        },
        {
          name: 'settleAskAthena',
          signature: 'settleAskAthena(uint256 _athenaId)',
          whatItDoes: 'Finalizes Ask Athena consultation after voting period, records advisory result, distributes fees.',
          whyUse: 'Called after voting to record oracle\'s advisory opinion and reward voters.',
          howItWorks: [
            'Retrieves Ask Athena application from Genesis',
            'Validates exists, not finalized, voting active, period expired',
            'Determines result: votesFor > votesAgainst',
            'Calls genesis.finalizeAskAthena() with result',
            'Parses fee amount from string',
            'Calls _distributeFeeToWinningVoters()',
            'Emits AskAthenaSettled event'
          ],
          parameters: [
            { name: '_athenaId', type: 'uint256', description: 'Ask Athena application ID to finalize' }
          ],
          accessControl: 'Public function - anyone can call after voting period',
          events: [
            'AskAthenaSettled(athenaId, result, totalVotesFor, totalVotesAgainst)'
          ],
          gasEstimate: '~82K gas',
          example: `// After voting period ends
await nativeAthena.settleAskAthena(3);

// Result recorded (advisory only)
// Fees distributed to winning voters`,
          relatedFunctions: ['handleAskAthena', 'vote']
        }
      ]
    },
    {
      category: 'Voting Eligibility',
      description: 'Functions for checking voter eligibility and calculating voting power',
      items: [
        {
          name: 'canVote',
          signature: 'canVote(address account) view returns (bool)',
          whatItDoes: 'Checks if an address meets the minimum threshold to vote by checking staked and earned tokens.',
          whyUse: 'Quick eligibility check before allowing vote submission.',
          howItWorks: [
            'If daoContract set: calls INativeDAO.getStakerInfo()',
            'Checks if stake active and amount >= minStakeRequired',
            'If sufficient stake: returns true',
            'Otherwise: calls nowjContract.getUserEarnedTokens()',
            'Returns true if earned tokens >= minStakeRequired',
            'Returns false if neither condition met'
          ],
          parameters: [
            { name: 'account', type: 'address', description: 'Address to check eligibility' }
          ],
          accessControl: 'Public view function',
          events: ['None (view function)'],
          gasEstimate: 'N/A (view)',
          example: `// Check if user can vote
const canVote = await nativeAthena.canVote(userAddress);

if (canVote) {
  console.log("Eligible to vote");
  // Show voting interface
} else {
  const minRequired = await nativeAthena.minStakeRequired();
  console.log(\`Need \${ethers.formatEther(minRequired)} tokens (staked or earned)\`);
}`,
          relatedFunctions: ['getUserVotingPower', 'vote']
        },
        {
          name: 'getUserVotingPower',
          signature: 'getUserVotingPower(address account) view returns (uint256)',
          whatItDoes: 'Calculates total voting power from staked tokens (stake * duration) plus earned tokens.',
          whyUse: 'Determines vote weight for a user. Higher stake duration and earned tokens = more voting power.',
          howItWorks: [
            'Initializes totalVotingPower = 0',
            'If daoContract set: gets stake info',
            'If stake active: adds (stakeAmount * durationMinutes)',
            'If nowjContract set: gets earned tokens',
            'Adds earned tokens to total',
            'Returns total voting power'
          ],
          parameters: [
            { name: 'account', type: 'address', description: 'Address to calculate voting power for' }
          ],
          accessControl: 'Public view function',
          events: ['None (view function)'],
          gasEstimate: 'N/A (view)',
          example: `// Get user's voting power
const power = await nativeAthena.getUserVotingPower(userAddress);
console.log(\`Voting power: \${power.toString()}\`);

// Example calculation:
// - Staked 500 tokens for 3 months (129,600 min)
// - Earned 200 tokens from jobs
// - Total power = (500 * 129,600) + 200 = 64,800,200

// Higher power = bigger share of fees if win`,
          relatedFunctions: ['canVote', 'getUserVotingInfo']
        },
        {
          name: 'getUserVotingInfo',
          signature: 'getUserVotingInfo(address account) view returns (bool hasActiveStake, uint256 stakeAmount, uint256 earnedTokens, uint256 totalVotingPower, bool meetsVotingThreshold)',
          whatItDoes: 'Returns complete voting information for an address including stake status, earned tokens, total power, and eligibility.',
          whyUse: 'Single call to get all voting-related info for UI display.',
          howItWorks: [
            'If daoContract set: gets stake info, sets hasActiveStake and stakeAmount',
            'If nowjContract set: gets earnedTokens',
            'Calls getUserVotingPower() for totalVotingPower',
            'Calls canVote() for meetsVotingThreshold',
            'Returns all values as struct'
          ],
          parameters: [
            { name: 'account', type: 'address', description: 'Address to get info for' }
          ],
          accessControl: 'Public view function',
          events: ['None (view function)'],
          gasEstimate: 'N/A (view)',
          example: `// Get comprehensive voting info
const info = await nativeAthena.getUserVotingInfo(userAddress);

console.log("Has active stake:", info.hasActiveStake);
console.log("Stake amount:", ethers.formatEther(info.stakeAmount));
console.log("Earned tokens:", ethers.formatEther(info.earnedTokens));
console.log("Total voting power:", info.totalVotingPower.toString());
console.log("Can vote:", info.meetsVotingThreshold);`,
          relatedFunctions: ['canVote', 'getUserVotingPower']
        }
      ]
    },
    {
      category: 'View Functions',
      description: 'Read-only functions for querying dispute and application data',
      items: [
        {
          name: 'getDispute',
          signature: 'getDispute(string _disputeId) view returns (Dispute)',
          whatItDoes: 'Retrieves complete dispute information from Genesis.',
          whyUse: 'Query dispute details including votes, status, fees, and timestamps.',
          howItWorks: [
            'Queries genesis.getDispute()',
            'Converts Genesis dispute struct to local Dispute struct',
            'Returns all dispute fields'
          ],
          parameters: [
            { name: '_disputeId', type: 'string', description: 'Dispute identifier' }
          ],
          accessControl: 'Public view function',
          events: ['None (view function)'],
          gasEstimate: 'N/A (view)',
          example: `const dispute = await nativeAthena.getDispute("40232-57-1");

console.log("Job ID:", dispute.jobId);
console.log("Disputed amount:", ethers.formatUnits(dispute.disputedAmount, 6));
console.log("Raiser:", dispute.disputeRaiserAddress);
console.log("Votes for:", dispute.votesFor.toString());
console.log("Votes against:", dispute.votesAgainst.toString());
console.log("Is finalized:", dispute.isFinalized);
console.log("Fees:", ethers.formatUnits(dispute.fees, 6));`,
          relatedFunctions: ['settleDispute', 'vote']
        },
        {
          name: 'hasVotedOnDispute',
          signature: 'hasVotedOnDispute(string _disputeId, address _user) view returns (bool)',
          whatItDoes: 'Checks if a user has already voted on a specific dispute.',
          whyUse: 'Prevent double voting and show vote status in UI.',
          howItWorks: [
            'Calls genesis.hasUserVotedOnDispute()',
            'Returns boolean result'
          ],
          parameters: [
            { name: '_disputeId', type: 'string', description: 'Dispute to check' },
            { name: '_user', type: 'address', description: 'User address to check' }
          ],
          accessControl: 'Public view function',
          events: ['None (view function)'],
          gasEstimate: 'N/A (view)',
          example: `const hasVoted = await nativeAthena.hasVotedOnDispute("40232-57-1", userAddress);

if (hasVoted) {
  console.log("You already voted on this dispute");
} else {
  console.log("You can vote");
}`,
          relatedFunctions: ['vote', 'hasVotedOnSkillApplication', 'hasVotedOnAskAthena']
        }
      ]
    }
  ],
  
  dataFlows: [
    {
      title: 'Complete Dispute Resolution Flow',
      description: 'End-to-end flow from dispute creation to settlement',
      steps: [
        { chain: 'Local Chain', action: '1. Job conflict occurs, party raises dispute' },
        { chain: 'Local Chain', action: '2. Bridge routes to Native chain' },
        { chain: 'Native Chain', action: '3. Native Athena.handleRaiseDispute() called' },
        { chain: 'Native Chain', action: '4. Increment job dispute counter, create dispute ID' },
        { chain: 'Native Chain', action: '5. Store dispute in Genesis, start voting period' },
        { chain: 'Native Chain', action: '6. Eligible voters call vote() with their weighted votes' },
        { chain: 'Native Chain', action: '7. Native DAO verifies eligibility and calculates power' },
        { chain: 'Native Chain', action: '8. Votes recorded in Genesis with voter data' },
        { chain: 'Native Chain', action: '9. After voting period, anyone calls settleDispute()' },
        { chain: 'Native Chain', action: '10. Determine winner (votesFor vs votesAgainst)' },
        { chain: 'Native Chain', action: '11. Distribute fees proportionally to winning voters' },
        { chain: 'Native Chain', action: '12. Call NOWJC.releaseDisputedFunds() to winner' },
        { chain: 'Winner\'s Chain', action: '13. Winner receives funds via CCTP' }
      ]
    },
    {
      title: 'Weighted Voting Power Calculation',
      description: 'How vote weight is calculated from multiple sources',
      steps: [
        { chain: 'Native Chain', action: 'User calls vote()' },
        { chain: 'Native Chain', action: 'Native Athena calls canVote()' },
        { chain: 'Native Chain', action: 'Check Native DAO for active stake' },
        { chain: 'Native Chain', action: 'If stakeAmount >= minStakeRequired: eligible' },
        { chain: 'Native Chain', action: 'Else check NOWJC for earned tokens' },
        { chain: 'Native Chain', action: 'If earnedTokens >= minStakeRequired: eligible' },
        { chain: 'Native Chain', action: 'Calculate total power = (stake * duration) + earned' },
        { chain: 'Native Chain', action: 'Store vote with calculated weight' },
        { chain: 'Native Chain', action: 'Higher power = larger share of fees if win' }
      ]
    },
    {
      title: 'Proportional Fee Distribution Flow',
      description: 'How fees are distributed based on voting power',
      steps: [
        { chain: 'Native Chain', action: 'Dispute settled, winner determined' },
        { chain: 'Native Chain', action: 'Get all voters from Genesis' },
        { chain: 'Native Chain', action: 'Calculate total power of winning side' },
        { chain: 'Native Chain', action: 'For each winning voter:' },
        { chain: 'Native Chain', action: '  voterShare = (totalFees * voterPower) / totalWinningPower' },
        { chain: 'Native Chain', action: '  Transfer USDC to voter\'s claim address' },
        { chain: 'Native Chain', action: 'Example: 100 USDC, 3 voters with 60%, 30%, 10% power' },
        { chain: 'Native Chain', action: '  Voter 1: 60 USDC, Voter 2: 30 USDC, Voter 3: 10 USDC' }
      ]
    }
  ],
  
  integrationGuide: {
    example: `// Complete Native Athena Integration Example
const { ethers } = require('ethers');

// Setup
const nativeAthena = new ethers.Contract(athenaAddress, athenaABI, signer);
const nativeDAO = new ethers.Contract(daoAddress, daoABI, signer);

// 1. Check voting eligibility
const canVote = await nativeAthena.canVote(userAddress);
const votingInfo = await nativeAthena.getUserVotingInfo(userAddress);

console.log("Can vote:", canVote);
console.log("Voting power:", votingInfo.totalVotingPower.toString());

// 2. Vote on dispute with weighted vote
const disputeId = "40232-57-1";
await nativeAthena.vote(
  0,  // VotingType.Dispute
  disputeId,
  true,  // Vote for dispute raiser
  userAddress  // Claim address
);

// 3. Check dispute status
const dispute = await nativeAthena.getDispute(disputeId);
console.log("Votes for:", dispute.votesFor.toString());
console.log("Votes against:", dispute.votesAgainst.toString());

// 4. Settle after voting period
const startTime = await nativeAthena.disputeStartTimes(disputeId);
const votingPeriod = await nativeAthena.votingPeriodMinutes();

if (Date.now() / 1000 >= startTime + (votingPeriod * 60)) {
  await nativeAthena.settleDispute(disputeId);
  console.log("Dispute settled");
}`,
    tips: [
      'Voting power = (stakeAmount * durationMinutes) + earnedTokens',
      'minStakeRequired defaults to 100 tokens (configurable by owner)',
      'votingPeriodMinutes defaults to 60 minutes (configurable)',
      'Fees distributed proportionally based on voting power contribution',
      'Multiple disputes per job supported with counter-based IDs',
      'Always provide valid claim address for fee rewards',
      'Check canVote() before attempting to vote',
      'settleDispute() can be called by anyone after voting period',
      'If no votes cast, fees refunded to dispute raiser',
      'Vote weight affects both outcome influence and fee share'
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
        name: '_daoContract',
        type: 'address',
        description: 'Native DAO contract address (for stake-based voting eligibility)',
        placeholder: '0x...'
      },
      {
        name: '_genesis',
        type: 'address',
        description: 'OpenworkGenesis contract address (persistent data storage)',
        placeholder: '0x...'
      },
      {
        name: '_nowjContract',
        type: 'address',
        description: 'NOWJC contract address (for earned tokens and fund releases)',
        placeholder: '0x...'
      },
      {
        name: '_usdcToken',
        type: 'address',
        description: 'USDC token contract address (for fee payments and distributions)',
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
    estimatedGas: '3.8M',
    postDeploy: {
      message: 'UUPS deployment complete! Next: Initialize the proxy contract on block scanner.',
      nextSteps: [
        '1. Deploy NativeAthena implementation contract (no constructor params)',
        '2. Deploy UUPSProxy with implementation address',
        '3. Call initialize() on proxy via block scanner with:',
        '   - Owner address (your admin wallet)',
        '   - Native DAO contract address',
        '   - OpenworkGenesis contract address',
        '   - NOWJC contract address',
        '   - USDC token address (Arbitrum Sepolia)',
        '4. Set bridge address: setBridge(nativeBridgeAddress)',
        '5. Configure parameters if needed:',
        '   - setMinOracleMembers(3) [default]',
        '   - setVotingPeriodMinutes(60) [default]',
        '   - setMinStakeRequired(100) [default]',
        '   - updateMemberActivityThreshold(90) [default]',
        '6. Verify both implementation and proxy on Arbiscan',
        '7. Test dispute creation and voting flow'
      ]
    }
  },
  
  securityConsiderations: [
    'UUPS upgradeable - owner and bridge can upgrade implementation',
    'Voting eligibility verified through Native DAO integration',
    'Proportional fee distribution prevents gaming',
    'One vote per address per dispute/application',
    'Voting period enforced via timestamp checks',
    'Bridge access control for dispute creation (commented in code)',
    'Weighted voting based on stake duration and earned tokens',
    'All data stored in Genesis for upgrade persistence',
    'Fund release only after settlement and validation',
    'Fee refund mechanism if no community participation'
  ],
  
  code: `// Full implementation: contracts/openwork-full-contract-suite-layerzero+CCTP 2 Dec/native-athena.sol

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import { UUPSUpgradeable } from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import { OwnableUpgradeable } from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract NativeAthena is 
    Initializable,
    OwnableUpgradeable,
    UUPSUpgradeable
{
    using SafeERC20 for IERC20;
    
    // ==================== STATE VARIABLES ====================
    address public daoContract;
    IERC20 public usdcToken;
    uint256 public accumulatedFees;
    IOpenworkGenesis public genesis;
    IOracleManager public oracleManager;
    INativeOpenWorkJobContract public nowjContract;
    address public bridge;
    
    enum VotingType { Dispute, SkillVerification, AskAthena }
    
    uint256 public minOracleMembers;
    uint256 public votingPeriodMinutes;
    uint256 public minStakeRequired;
    uint256 public memberActivityThresholdDays = 90;
    
    mapping(string => uint256) public jobDisputeCounters;
    mapping(string => uint256) public disputeStartTimes;

    // ==================== INITIALIZATION ====================
    constructor() {
        _disableInitializers();
    }
    
    function initialize(
        address _owner, 
        address _daoContract, 
        address _genesis,
        address _nowjContract,
        address _usdcToken
    ) public initializer {
        __Ownable_init(_owner);
        __UUPSUpgradeable_init();
        
        daoContract = _daoContract;
        genesis = IOpenworkGenesis(_genesis);
        nowjContract = INativeOpenWorkJobContract(_nowjContract);
        if (_usdcToken != address(0)) {
            usdcToken = IERC20(_usdcToken);
        }
        
        minOracleMembers = 3;
        votingPeriodMinutes = 60;
        minStakeRequired = 100;
    }
    
    function _authorizeUpgrade(address) internal view override {
        require(owner() == _msgSender() || address(bridge) == _msgSender(), "Unauthorized");
    }

    // ==================== VOTING ELIGIBILITY ====================
    function canVote(address account) public view returns (bool) {
        if (daoContract != address(0)) {
            (uint256 stakeAmount, , , bool isActive) = INativeDAO(daoContract).getStakerInfo(account);
            if (isActive && stakeAmount >= minStakeRequired) {
                return true;
            }
        }
        
        if (address(nowjContract) != address(0)) {
            uint256 earnedTokens = nowjContract.getUserEarnedTokens(account);
            return earnedTokens >= minStakeRequired;
        }
        
        return false;
    }
    
    function getUserVotingPower(address account) public view returns (uint256) {
        uint256 totalVotingPower = 0;
        
        if (daoContract != address(0)) {
            (uint256 stakeAmount, , uint256 durationMinutes, bool isActive) = INativeDAO(daoContract).getStakerInfo(account);
            if (isActive && stakeAmount > 0) {
                totalVotingPower += stakeAmount * durationMinutes;
            }
        }
        
        if (address(nowjContract) != address(0)) {
            uint256 earnedTokens = nowjContract.getUserEarnedTokens(account);
            totalVotingPower += earnedTokens;
        }
        
        return totalVotingPower;
    }

    // ==================== DISPUTE MANAGEMENT ====================
    function handleRaiseDispute(
        string memory jobId, 
        string memory disputeHash, 
        string memory oracleName, 
        uint256 fee, 
        uint256 disputedAmount, 
        address disputeRaiser
    ) external {
        IOpenworkGenesis.Oracle memory oracle = genesis.getOracle(oracleName);
        require(oracle.members.length >= minOracleMembers, "Oracle not active");
        
        jobDisputeCounters[jobId]++;
        string memory disputeId = string(abi.encodePacked(jobId, "-", uint2str(jobDisputeCounters[jobId])));
        disputeStartTimes[disputeId] = block.timestamp;
        
        genesis.setDispute(disputeId, disputedAmount, disputeHash, disputeRaiser, fee);
        emit DisputeRaised(disputeId, disputeRaiser, fee);
    }
    
    function vote(
        VotingType _votingType, 
        string memory _disputeId, 
        bool _voteFor, 
        address _claimAddress
    ) external {
        require(canVote(msg.sender), "Insufficient tokens");
        require(_claimAddress != address(0), "Invalid claim address");
        
        uint256 voteWeight = getUserVotingPower(msg.sender);
        require(voteWeight > 0, "No voting power");
        
        if (_votingType == VotingType.Dispute) {
            genesis.addDisputeVoter(_disputeId, msg.sender, _claimAddress, voteWeight, _voteFor);
            _voteOnDispute(_disputeId, _voteFor, _claimAddress, voteWeight);
        }
        // ... similar for SkillVerification and AskAthena
    }
    
    function settleDispute(string memory _disputeId) external {
        require(block.timestamp >= disputeStartTimes[_disputeId] + (votingPeriodMinutes * 60), "Voting not ended");
        
        IOpenworkGenesis.Dispute memory dispute = genesis.getDispute(_disputeId);
        bool disputeRaiserWins = dispute.votesFor > dispute.votesAgainst;
        genesis.finalizeDispute(_disputeId, disputeRaiserWins);
        
        // Release funds to winner via NOWJC
        if (address(nowjContract) != address(0)) {
            string memory originalJobId = _extractJobIdFromDisputeId(_disputeId);
            IOpenworkGenesis.Job memory job = genesis.getJob(originalJobId);
            
            // Determine recipient and chain based on who raised dispute and who won
            // ... fund release logic
        }
        
        // Distribute fees to winning voters
        IOpenworkGenesis.VoterData[] memory voters = genesis.getDisputeVoters(_disputeId);
        if (voters.length > 0) {
            _distributeFeeToWinningVoters(VotingType.Dispute, _disputeId, disputeRaiserWins, dispute.fees);
        }
        
        emit DisputeFinalized(_disputeId, disputeRaiserWins, dispute.votesFor, dispute.votesAgainst);
    }
    
    // ... Additional functions for skill verification, Ask Athena, oracle management
    // See full implementation in repository
}`
};
