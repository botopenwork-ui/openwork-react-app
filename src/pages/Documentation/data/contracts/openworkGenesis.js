export const openworkGenesis = {
  id: 'openworkGenesis',
  name: 'OpenworkGenesis',
  chain: 'l2',
  column: 'l2-center',
  order: 0,
  status: 'testnet',
  version: 'v1.0.0',
  gas: '120K',
  mainnetNetwork: 'Arbitrum One',
  testnetNetwork: 'Arbitrum Sepolia',
  mainnetDeployed: 'Not deployed',
  testnetDeployed: 'Deployed',
  mainnetAddress: null,
  testnetAddress: '0x1f23683C748fA1AF99B7263dea121eCc5Fe7564C',
  isUUPS: true,
  implementationAddress: '0xC1b2CC467f9b4b7Be3484a3121Ad6a8453dfB584',
  tvl: 'N/A',
  docs: 'OpenworkGenesis - Central storage contract for ALL OpenWork platform data. Pure storage pattern with no business logic, just authorized setters and getters. Stores jobs, applications, oracles, disputes, voting, DAO data, and rewards tracking.',
  
  overview: {
    purpose: 'OpenworkGenesis is the central storage contract for the entire OpenWork platform, implementing the Storage Separation Pattern for upgrade persistence. It contains NO business logic - only data structures, setters, and getters. All platform contracts (NOWJC, Native Athena, Native DAO, Native Rewards, Oracle Manager) store their data here. This architecture allows logic contracts to be upgraded while preserving all historical data. The contract stores 6 major categories: Jobs & Applications, Skill Oracles, Disputes & Voting, Voter Data, DAO Data (stakes/delegations), and Rewards Tracking.',
    tier: 'Native Chain (Arbitrum Sepolia)',
    category: 'Storage Layer',
    upgradeability: 'UUPS Upgradeable (owner only)'
  },
  
  features: [
    'Pure storage pattern: No business logic, only data structures and access control',
    'Central data repository: ALL platform data stored in one upgradeable contract',
    'Jobs system: Complete job lifecycle data - postings, applications, milestones, payments',
    'Skill Oracles: Oracle definitions, members, skill verification dates, verified addresses',
    'Dispute resolution: Dispute data, voting records, voter tracking for all dispute types',
    'Voter data storage: Who voted, their power, vote direction, and claim addresses',
    'DAO governance: Stakes, unlock times, delegations, voting power, proposal IDs',
    'Rewards tracking: User earned tokens, governance action counts, claim history',
    'Cross-chain support: CCTP payment targets, multi-chain address preferences',
    'Authorization system: Only authorized contracts can write data',
    'Batch getters: Paginated queries for oracles and large datasets',
    'Upgrade persistence: Data survives logic contract upgrades'
  ],
  
  systemPosition: {
    description: 'OpenworkGenesis sits at the core of OpenWork as the persistent storage layer. Every major contract writes and reads from it: NOWJC stores jobs and applications, Native Athena stores disputes and votes, Native DAO stores stakes and delegations, Native Rewards stores earned tokens and governance actions, Oracle Manager stores oracle data. This separation allows logic contracts to be upgraded without losing data. Only authorized contracts can write; anyone can read view functions.',
    diagram: `
📍 Storage Layer Architecture

OpenworkGenesis ⭐ (Central Storage - You are here)
    ↑ Writes data to Genesis
    │
    ├─> NOWJC
    │   └─> Jobs, Applications, Payments, Work Submissions
    │
    ├─> Native Athena  
    │   └─> Disputes, Voting, Voter Data, Skill Verifications
    │
    ├─> Oracle Manager
    │   └─> Skill Oracles, Members, Verified Addresses
    │
    ├─> Native DAO
    │   └─> Stakes, Delegations, Voting Power, Proposals
    │
    ├─> Native Rewards
    │   └─> Earned Tokens, Governance Actions, Claims
    │
    └─> Profile Manager
        └─> Some job-related profile data

All contracts READ from Genesis
All authorized contracts WRITE to Genesis
Data persists across logic contract upgrades

Storage Categories in Genesis:
1. Jobs & Applications (9 data types)
2. Skill Oracles (5 data types)
3. Disputes & Voting (3 voting systems)
4. Voter Data (3 types: dispute, skill, athena)
5. DAO Data (5 types: stakes, delegations, proposals)
6. Rewards (2 types: earned tokens, governance actions)`
  },
  
  dependencies: {
    dependsOn: [],
    requiredBy: [
      { 
        name: 'NOWJC', 
        reason: 'Stores all job data: postings, applications, milestones, payments, work submissions, payment targets.',
        type: 'Job Management'
      },
      { 
        name: 'Native Athena', 
        reason: 'Stores disputes, voting data, voter information, skill verification applications, Ask Athena applications.',
        type: 'Dispute Resolution'
      },
      { 
        name: 'Oracle Manager', 
        reason: 'Stores skill oracle definitions, members lists, skill verification dates, verified user addresses.',
        type: 'Oracle Management'
      },
      { 
        name: 'Native DAO', 
        reason: 'Stores stakes (amount, unlock time, duration), delegations, voting power, proposal IDs, staker tracking.',
        type: 'Governance'
      },
      { 
        name: 'Native Rewards', 
        reason: 'Stores user earned tokens, governance action counts, claimed token amounts for rewards distribution.',
        type: 'Token Economics'
      },
      { 
        name: 'Main DAO', 
        reason: 'May query data via cross-chain messages for governance synchronization.',
        type: 'Governance'
      }
    ],
    prerequisites: [
      'Must be deployed before any logic contracts',
      'Owner must authorize logic contracts via authorizeContract()',
      'Logic contracts must be configured with Genesis address',
      'UUPS upgrade pattern requires careful testing before upgrades'
    ]
  },
  
  functions: [
    {
      category: 'Access Control',
      description: 'Functions for managing contract authorization and ownership',
      items: [
        {
          name: 'authorizeContract',
          signature: 'authorizeContract(address _contract, bool _authorized)',
          whatItDoes: 'Grants or revokes write access for logic contracts to store data in Genesis.',
          whyUse: 'Owner uses this to authorize NOWJC, Native Athena, Native DAO, etc. to write data.',
          howItWorks: [
            'Sets authorizedContracts[_contract] = _authorized',
            'Emits ContractAuthorized event',
            'Authorized contracts can call all setter functions',
            'Non-authorized contracts can only call view functions'
          ],
          parameters: [
            { name: '_contract', type: 'address', description: 'Logic contract address to authorize/revoke' },
            { name: '_authorized', type: 'bool', description: 'true to authorize, false to revoke' }
          ],
          accessControl: 'onlyOwner',
          events: ['ContractAuthorized(contractAddress, authorized)'],
          gasEstimate: '~30K gas',
          example: `// During deployment, authorize all logic contracts
await openworkGenesis.authorizeContract(nowjcAddress, true);
await openworkGenesis.authorizeContract(nativeAthenaAddress, true);
await openworkGenesis.authorizeContract(nativeDAOAddress, true);
await openworkGenesis.authorizeContract(nativeRewardsAddress, true);
await openworkGenesis.authorizeContract(oracleManagerAddress, true);

// Now these contracts can store data in Genesis`,
          relatedFunctions: ['transferOwnership']
        }
      ]
    },
    {
      category: 'Jobs & Applications Storage',
      description: 'Functions for storing complete job lifecycle data',
      items: [
        {
          name: 'setJob',
          signature: 'setJob(string jobId, address jobGiver, string jobDetailHash, string[] descriptions, uint256[] amounts)',
          whatItDoes: 'Creates a new job entry with initial milestone structure.',
          whyUse: 'Called by NOWJC when user posts a new job.',
          howItWorks: [
            'Increments jobCounter',
            'Adds jobId to allJobIds array',
            'Adds jobId to jobsByPoster mapping',
            'Creates Job struct with Open status',
            'Stores milestone descriptions and amounts'
          ],
          parameters: [
            { name: 'jobId', type: 'string', description: 'Unique job identifier' },
            { name: 'jobGiver', type: 'address', description: 'Job poster address' },
            { name: 'jobDetailHash', type: 'string', description: 'IPFS hash of job details' },
            { name: 'descriptions', type: 'string[]', description: 'Milestone description hashes' },
            { name: 'amounts', type: 'uint256[]', description: 'USDT amounts per milestone (6 decimals)' }
          ],
          accessControl: 'onlyAuthorized - typically NOWJC',
          events: ['None directly'],
          gasEstimate: '~150K gas (varies with milestone count)',
          example: `// NOWJC posts a job with 3 milestones
await genesis.setJob(
  "job-abc-123",
  jobGiverAddress,
  "ipfs://Qm...",
  ["milestone1Hash", "milestone2Hash", "milestone3Hash"],
  [1000000000, 1500000000, 2000000000] // $1000, $1500, $2000 USDT
);`,
          relatedFunctions: ['setJobApplication', 'updateJobStatus', 'addJobApplicant']
        },
        {
          name: 'setJobApplication',
          signature: 'setJobApplication(string jobId, uint256 applicationId, address applicant, string applicationHash, string[] descriptions, uint256[] amounts, uint32 preferredPaymentChainDomain, address preferredPaymentAddress)',
          whatItDoes: 'Stores a freelancer\'s job application with proposed milestones and payment preferences.',
          whyUse: 'Called by NOWJC when freelancer applies to a job.',
          howItWorks: [
            'Updates jobApplicationCounter if needed',
            'Creates Application struct',
            'Stores applicant address and proposal details',
            'Stores CCTP payment preferences (chain domain, address)',
            'Clears and repopulates proposed milestones'
          ],
          parameters: [
            { name: 'jobId', type: 'string', description: 'Job to apply to' },
            { name: 'applicationId', type: 'uint256', description: 'Application sequence number' },
            { name: 'applicant', type: 'address', description: 'Freelancer address' },
            { name: 'applicationHash', type: 'string', description: 'IPFS hash of application details' },
            { name: 'descriptions', type: 'string[]', description: 'Proposed milestone hashes' },
            { name: 'amounts', type: 'uint256[]', description: 'Proposed USDT amounts' },
            { name: 'preferredPaymentChainDomain', type: 'uint32', description: 'CCTP domain for payments' },
            { name: 'preferredPaymentAddress', type: 'address', description: 'Where to receive payments' }
          ],
          accessControl: 'onlyAuthorized',
          events: ['None directly'],
          gasEstimate: '~180K gas',
          example: `// Freelancer applies with payment on different chain
await genesis.setJobApplication(
  "job-abc-123",
  1,
  freelancerAddress,
  "ipfs://Qm...",
  ["my-milestone1", "my-milestone2"],
  [1200000000, 1800000000], // Counter-proposal amounts
  0, // Ethereum domain
  freelancerEthereumAddress // Receive on Ethereum
);`,
          relatedFunctions: ['addJobApplicant', 'setJobSelectedApplicant', 'setApplicationPaymentPreference']
        },
        {
          name: 'updateJobStatus',
          signature: 'updateJobStatus(string jobId, JobStatus status)',
          whatItDoes: 'Updates job state: Open, InProgress, Completed, or Cancelled.',
          whyUse: 'Called by NOWJC when job progresses through lifecycle.',
          howItWorks: [
            'Sets jobs[jobId].status',
            'Status enum: 0=Open, 1=InProgress, 2=Completed, 3=Cancelled'
          ],
          parameters: [
            { name: 'jobId', type: 'string', description: 'Job to update' },
            { name: 'status', type: 'JobStatus', description: 'New status (0-3)' }
          ],
          accessControl: 'onlyAuthorized',
          events: ['None directly'],
          gasEstimate: '~30K gas',
          example: `// NOWJC updates job to InProgress after selection
await genesis.updateJobStatus("job-abc-123", 1); // InProgress

// Later, mark as Completed
await genesis.updateJobStatus("job-abc-123", 2); // Completed`,
          relatedFunctions: ['setJobSelectedApplicant', 'addWorkSubmission']
        },
        {
          name: 'updateJobTotalPaid',
          signature: 'updateJobTotalPaid(string jobId, uint256 amount)',
          whatItDoes: 'Increments job\'s total paid amount and platform-wide payment tracking.',
          whyUse: 'Called by NOWJC after each milestone payment to track totals.',
          howItWorks: [
            'Adds amount to jobs[jobId].totalPaid',
            'Adds amount to totalPlatformPayments',
            'Platform total used by Native Rewards for band progression'
          ],
          parameters: [
            { name: 'jobId', type: 'string', description: 'Job receiving payment' },
            { name: 'amount', type: 'uint256', description: 'USDT amount paid (6 decimals)' }
          ],
          accessControl: 'onlyAuthorized',
          events: ['None directly'],
          gasEstimate: '~35K gas',
          example: `// After releasing milestone payment
await genesis.updateJobTotalPaid("job-abc-123", 1000000000); // $1000

// Tracks both job-specific and platform-wide totals
const job = await genesis.getJob("job-abc-123");
console.log("Job total paid:", job.totalPaid);

const platformTotal = await genesis.totalPlatformPayments();
console.log("Platform total:", platformTotal); // Used by Native Rewards bands`,
          relatedFunctions: ['getJob', 'setJob']
        }
      ]
    },
    {
      category: 'Oracle Storage',
      description: 'Functions for storing Skill Oracle data',
      items: [
        {
          name: 'setOracle',
          signature: 'setOracle(string name, address[] members, string shortDescription, string hashOfDetails, address[] skillVerifiedAddresses)',
          whatItDoes: 'Creates or updates a Skill Oracle with members and verified users.',
          whyUse: 'Called by Oracle Manager when creating or updating oracles.',
          howItWorks: [
            'Tracks new oracle in allOracleNames array',
            'Stores Oracle struct with all data',
            'Maintains oracle count for pagination'
          ],
          parameters: [
            { name: 'name', type: 'string', description: 'Unique oracle name' },
            { name: 'members', type: 'address[]', description: 'Oracle member addresses' },
            { name: 'shortDescription', type: 'string', description: 'Brief description' },
            { name: 'hashOfDetails', type: 'string', description: 'IPFS hash of full details' },
            { name: 'skillVerifiedAddresses', type: 'address[]', description: 'Users verified by this oracle' }
          ],
          accessControl: 'onlyAuthorized',
          events: ['None directly'],
          gasEstimate: '~200K gas (varies with array sizes)',
          example: `// Oracle Manager creates oracle
await genesis.setOracle(
  "Solidity Development",
  [member1, member2, member3, member4, member5],
  "Expert Solidity developers",
  "ipfs://Qm...",
  [verifiedUser1, verifiedUser2]
);`,
          relatedFunctions: ['addOracleMember', 'removeOracleMember', 'addSkillVerifiedAddress']
        },
        {
          name: 'addSkillVerifiedAddress',
          signature: 'addSkillVerifiedAddress(string oracleName, address user)',
          whatItDoes: 'Adds user to oracle\'s skill-verified list with timestamp.',
          whyUse: 'Called by Native Athena after successful skill verification vote.',
          howItWorks: [
            'Adds user to oracle\'s skillVerifiedAddresses array',
            'Records verification date in skillVerificationDates mapping'
          ],
          parameters: [
            { name: 'oracleName', type: 'string', description: 'Oracle that verified the user' },
            { name: 'user', type: 'address', description: 'User being verified' }
          ],
          accessControl: 'onlyAuthorized',
          events: ['None directly'],
          gasEstimate: '~50K gas',
          example: `// After skill verification vote passes
await genesis.addSkillVerifiedAddress(
  "Solidity Development",
  developerAddress
);

// Later, check verification date
const date = await genesis.getSkillVerificationDate(
  "Solidity Development",
  developerAddress
);`,
          relatedFunctions: ['setOracle', 'getSkillVerificationDate']
        }
      ]
    },
    {
      category: 'Dispute & Voting Storage',
      description: 'Functions for storing all voting and dispute data',
      items: [
        {
          name: 'setDispute',
          signature: 'setDispute(string jobId, uint256 disputedAmount, string hash, address disputeRaiser, uint256 fees)',
          whatItDoes: 'Creates a new job dispute with initial state.',
          whyUse: 'Called by Native Athena when dispute is raised.',
          howItWorks: [
            'Creates Dispute struct',
            'Sets isVotingActive = true',
            'Records timestamp and fees',
            'Initializes vote counts to 0'
          ],
          parameters: [
            { name: 'jobId', type: 'string', description: 'Job being disputed' },
            { name: 'disputedAmount', type: 'uint256', description: 'Amount in dispute' },
            { name: 'hash', type: 'string', description: 'IPFS hash of dispute details' },
            { name: 'disputeRaiser', type: 'address', description: 'Who raised the dispute' },
            { name: 'fees', type: 'uint256', description: 'Dispute fee amount' }
          ],
          accessControl: 'onlyAuthorized',
          events: ['None directly'],
          gasEstimate: '~100K gas',
          example: `// Native Athena creates dispute
await genesis.setDispute(
  "job-abc-123",
  500000000, // $500 disputed
  "ipfs://Qm...",
  freelancerAddress,
  50000000 // $50 fee
);`,
          relatedFunctions: ['updateDisputeVotes', 'finalizeDispute', 'setDisputeVote']
        },
        {
          name: 'addDisputeVoter',
          signature: 'addDisputeVoter(string disputeId, address voter, address claimAddress, uint256 votingPower, bool voteFor)',
          whatItDoes: 'Records complete voter information for dispute rewards distribution.',
          whyUse: 'Called by Native Athena after each vote to track rewards.',
          howItWorks: [
            'Adds VoterData to disputeVoters array',
            'Stores voter, claim address, power, vote direction',
            'Used later for reward distribution'
          ],
          parameters: [
            { name: 'disputeId', type: 'string', description: 'Dispute ID' },
            { name: 'voter', type: 'address', description: 'Who voted' },
            { name: 'claimAddress', type: 'address', description: 'Where to send rewards' },
            { name: 'votingPower', type: 'uint256', description: 'Voter\'s power' },
            { name: 'voteFor', type: 'bool', description: 'true for, false against' }
          ],
          accessControl: 'onlyAuthorized',
          events: ['None directly'],
          gasEstimate: '~60K gas',
          example: `// After user votes on dispute
await genesis.addDisputeVoter(
  "job-abc-123",
  voterAddress,
  claimAddress,
  1500000000000000000000, // 1500 OW voting power
  true // Vote FOR
);`,
          relatedFunctions: ['getDisputeVoters', 'finalizeDispute']
        }
      ]
    },
    {
      category: 'DAO Data Storage',
      description: 'Functions for storing stakes, delegations, and governance data',
      items: [
        {
          name: 'setStake',
          signature: 'setStake(address staker, uint256 amount, uint256 unlockTime, uint256 durationMinutes, bool isActive)',
          whatItDoes: 'Stores or updates user\'s stake information.',
          whyUse: 'Called by Native DAO when user stakes or unstakes tokens.',
          howItWorks: [
            'Creates/updates Stake struct',
            'Tracks staker in allStakers array if first stake',
            'Sets isStaker flag for quick lookups'
          ],
          parameters: [
            { name: 'staker', type: 'address', description: 'User staking' },
            { name: 'amount', type: 'uint256', description: 'OW tokens staked (18 decimals)' },
            { name: 'unlockTime', type: 'uint256', description: 'Unix timestamp when unlocks' },
            { name: 'durationMinutes', type: 'uint256', description: 'Lock duration in minutes' },
            { name: 'isActive', type: 'bool', description: 'true if stake is active' }
          ],
          accessControl: 'onlyAuthorized',
          events: ['None directly'],
          gasEstimate: '~70K gas',
          example: `// Native DAO stakes user tokens
await genesis.setStake(
  userAddress,
  ethers.parseEther("1000"), // 1000 OW
  Date.now() / 1000 + (259200 * 60), // 6 months
  259200, // 6 months in minutes
  true // Active
);`,
          relatedFunctions: ['getStake', 'removeStaker', 'setDelegate']
        },
        {
          name: 'setDelegate',
          signature: 'setDelegate(address delegator, address delegatee)',
          whatItDoes: 'Records voting power delegation.',
          whyUse: 'Called by Native DAO when user delegates their voting power.',
          howItWorks: [
            'Sets delegates[delegator] = delegatee',
            'Native DAO manages delegated power calculations'
          ],
          parameters: [
            { name: 'delegator', type: 'address', description: 'User delegating power' },
            { name: 'delegatee', type: 'address', description: 'User receiving power' }
          ],
          accessControl: 'onlyAuthorized',
          events: ['None directly'],
          gasEstimate: '~30K gas',
          example: `// User delegates to governance expert
await genesis.setDelegate(userAddress, expertAddress);

// User can undelegate by setting to zero address
await genesis.setDelegate(userAddress, ethers.ZeroAddress);`,
          relatedFunctions: ['getDelegate', 'updateDelegatedVotingPower']
        }
      ]
    },
    {
      category: 'Rewards Data Storage',
      description: 'Functions for tracking earned tokens and governance actions',
      items: [
        {
          name: 'setUserTotalOWTokens',
          signature: 'setUserTotalOWTokens(address user, uint256 tokens)',
          whatItDoes: 'Sets user\'s total earned OW tokens amount.',
          whyUse: 'Called by Native Rewards to track lifetime earnings.',
          howItWorks: [
            'Sets userTotalOWTokens[user] = tokens',
            'Used by Native DAO for voting power calculation'
          ],
          parameters: [
            { name: 'user', type: 'address', description: 'User address' },
            { name: 'tokens', type: 'uint256', description: 'Total earned OW (18 decimals)' }
          ],
          accessControl: 'onlyAuthorized',
          events: ['None directly'],
          gasEstimate: '~30K gas',
          example: `// Native Rewards updates earned tokens
await genesis.setUserTotalOWTokens(
  userAddress,
  ethers.parseEther("5000") // 5000 OW earned
);`,
          relatedFunctions: ['getUserEarnedTokens', 'incrementUserGovernanceActions']
        },
        {
          name: 'incrementUserGovernanceActions',
          signature: 'incrementUserGovernanceActions(address user)',
          whatItDoes: 'Increments user\'s governance action counter by 1.',
          whyUse: 'Called by Native Rewards each time user votes or proposes.',
          howItWorks: [
            'Increments userGovernanceActions[user]++',
            'Used to unlock earned tokens in Native Rewards'
          ],
          parameters: [
            { name: 'user', type: 'address', description: 'User who performed action' }
          ],
          accessControl: 'onlyAuthorized',
          events: ['None directly'],
          gasEstimate: '~30K gas',
          example: `// After user votes
await genesis.incrementUserGovernanceActions(userAddress);

// Check total actions
const actions = await genesis.getUserGovernanceActions(userAddress);
console.log("Governance actions:", actions);`,
          relatedFunctions: ['getUserGovernanceActions', 'setUserTotalOWTokens']
        }
      ]
    },
    {
      category: 'View Functions',
      description: 'Functions for reading stored data',
      items: [
        {
          name: 'getJob',
          signature: 'getJob(string jobId) view returns (Job)',
          whatItDoes: 'Returns complete job data structure.',
          whyUse: 'Query job details for display or processing.',
          howItWorks: [
            'Returns entire Job struct',
            'Includes all milestones, applicants, status, payments'
          ],
          parameters: [
            { name: 'jobId', type: 'string', description: 'Job to query' }
          ],
          accessControl: 'Public view',
          events: ['None (view)'],
          gasEstimate: 'N/A (view)',
          example: `const job = await genesis.getJob("job-abc-123");
console.log("Job giver:", job.jobGiver);
console.log("Status:", job.status);
console.log("Total paid:", ethers.formatUnits(job.totalPaid, 6), "USDT");
console.log("Milestones:", job.milestonePayments.length);`,
          relatedFunctions: ['getAllJobIds', 'getJobsByPoster', 'getJobApplication']
        },
        {
          name: 'getOracle',
          signature: 'getOracle(string oracleName) view returns (Oracle)',
          whatItDoes: 'Returns complete oracle data structure.',
          whyUse: 'Query oracle members and verified users.',
          howItWorks: [
            'Returns entire Oracle struct',
            'Includes members, descriptions, verified addresses'
          ],
          parameters: [
            { name: 'oracleName', type: 'string', description: 'Oracle to query' }
          ],
          accessControl: 'Public view',
          events: ['None (view)'],
          gasEstimate: 'N/A (view)',
          example: `const oracle = await genesis.getOracle("Solidity Development");
console.log("Members:", oracle.members.length);
console.log("Verified users:", oracle.skillVerifiedAddresses.length);
console.log("Description:", oracle.shortDescription);`,
          relatedFunctions: ['getAllOracleNames', 'getOracleNamesBatch']
        },
        {
          name: 'getStake',
          signature: 'getStake(address staker) view returns (Stake)',
          whatItDoes: 'Returns user\'s stake information.',
          whyUse: 'Check stake amount, unlock time, and active status.',
          howItWorks: [
            'Returns Stake struct',
            'Contains amount, unlockTime, durationMinutes, isActive'
          ],
          parameters: [
            { name: 'staker', type: 'address', description: 'User to query' }
          ],
          accessControl: 'Public view',
          events: ['None (view)'],
          gasEstimate: 'N/A (view)',
          example: `const stake = await genesis.getStake(userAddress);
console.log("Amount:", ethers.formatEther(stake.amount), "OW");
console.log("Unlocks:", new Date(stake.unlockTime * 1000));
console.log("Duration:", stake.durationMinutes, "minutes");
console.log("Active:", stake.isActive);`,
          relatedFunctions: ['getAllStakers', 'getDelegate']
        }
      ]
    }
  ],
  
  dataFlows: [
    {
      title: 'Job Storage Flow',
      description: 'How job data flows from NOWJC to Genesis storage',
      steps: [
        { chain: 'Native Chain', action: '1. User posts job via NOWJC' },
        { chain: 'Native Chain', action: '2. NOWJC validates job data' },
        { chain: 'Native Chain', action: '3. NOWJC calls Genesis.setJob()' },
        { chain: 'Native Chain', action: '4. Genesis stores Job struct' },
        { chain: 'Native Chain', action: '5. Genesis adds to allJobIds array' },
        { chain: 'Native Chain', action: '6. Genesis adds to jobsByPoster mapping' },
        { chain: 'Native Chain', action: '7. Job data now queryable via getJob()' }
      ]
    },
    {
      title: 'Dispute Resolution Storage Flow',
      description: 'How dispute and voting data is stored',
      steps: [
        { chain: 'Native Chain', action: '1. User raises dispute via Native Athena' },
        { chain: 'Native Chain', action: '2. Native Athena calls Genesis.setDispute()' },
        { chain: 'Native Chain', action: '3. Genesis stores Dispute struct' },
        { chain: 'Native Chain', action: '4. Users vote via Native Athena' },
        { chain: 'Native Chain', action: '5. Native Athena calls Genesis.addDisputeVoter()' },
        { chain: 'Native Chain', action: '6. Genesis stores voter data for rewards' },
        { chain: 'Native Chain', action: '7. Native Athena finalizes dispute' },
        { chain: 'Native Chain', action: '8. Genesis.finalizeDispute() stores result' }
      ]
    },
    {
      title: 'Upgrade Persistence Pattern',
      description: 'How data survives contract upgrades',
      steps: [
        { chain: 'Native Chain', action: '1. Logic contracts store data in Genesis' },
        { chain: 'Native Chain', action: '2. All data persists in Genesis storage' },
        { chain: 'Native Chain', action: '3. Logic contract needs upgrade' },
        { chain: 'Native Chain', action: '4. Deploy new logic contract version' },
        { chain: 'Native Chain', action: '5. Authorize new contract in Genesis' },
        { chain: 'Native Chain', action: '6. New contract reads existing Genesis data' },
        { chain: 'Native Chain', action: '7. No data migration needed!' },
        { chain: 'Native Chain', action: '8. Historical data intact and accessible' }
      ]
    }
  ],
  
  integrationGuide: {
    example: `// OpenworkGenesis Integration Example
const { ethers } = require('ethers');

// Setup Genesis contract
const genesis = new ethers.Contract(genesisAddress, genesisABI, signer);

// 1. Owner: Authorize logic contracts (one-time setup)
await genesis.authorizeContract(nowjcAddress, true);
await genesis.authorizeContract(nativeAthenaAddress, true);

// 2. Logic contract: Store job data
await genesis.setJob(
  "job-123",
  jobGiverAddress,
  "ipfs://Qm...",
  ["milestone1", "milestone2"],
  [1000000000, 2000000000]
);

// 3. Anyone: Query stored data
const job = await genesis.getJob("job-123");
console.log("Job giver:", job.jobGiver);
console.log("Status:", job.status);

// 4. Logic contract: Store oracle data
await genesis.setOracle(
  "Solidity Dev",
  [member1, member2, member3],
  "Solidity experts",
  "ipfs://Qm...",
  []
);

// 5. Query oracle
const oracle = await genesis.getOracle("Solidity Dev");
console.log("Members:", oracle.members.length);

// 6. Store DAO data
await genesis.setStake(
  userAddress,
  ethers.parseEther("1000"),
  unlockTime,
  259200,
  true
);

// 7. Query all data categories
const allJobs = await genesis.getAllJobIds();
const allOracles = await genesis.getAllOracleNames();
const allStakers = await genesis.getAllStakers();`,
    tips: [
      'Genesis must be deployed before all logic contracts',
      'Authorize each logic contract via authorizeContract() before use',
      'Only authorized contracts can write; anyone can read',
      'Genesis uses pure storage pattern - no business logic',
      'Data persists across logic contract upgrades',
      'Use batch getters (getOracleNamesBatch) for large datasets to avoid gas limits',
      'All amounts stored with correct decimals: USDT=6, OW=18',
      'Job status enum: 0=Open, 1=InProgress, 2=Completed, 3=Cancelled',
      'Stakes, disputes, and votes all stored here for cross-contract access',
      'totalPlatformPayments used by Native Rewards for band progression',
      'CCTP payment preferences stored in applications for cross-chain payments',
      'Voter data arrays used for reward distribution calculations'
    ]
  },
  
  deployConfig: {
    type: 'uups',
    constructor: [
      {
        name: '_owner',
        type: 'address',
        description: 'Contract owner address (admin who can upgrade and authorize contracts)',
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
    estimatedGas: '5.5M',
    postDeploy: {
      message: 'UUPS deployment complete! Next: Initialize and authorize all logic contracts.',
      nextSteps: [
        '1. Deploy OpenworkGenesis implementation contract (no constructor params)',
        '2. Deploy UUPSProxy with implementation address',
        '3. Call initialize() on proxy via block scanner with:',
        '   - Owner address (your admin wallet)',
        '4. ⚠️ CRITICAL: Authorize ALL logic contracts before they can write:',
        '   - authorizeContract(nowjcAddress, true)',
        '   - authorizeContract(nativeAthenaAddress, true)',
        '   - authorizeContract(nativeDAOAddress, true)',
        '   - authorizeContract(nativeRewardsAddress, true)',
        '   - authorizeContract(oracleManagerAddress, true)',
        '   - authorizeContract(profileManagerAddress, true)',
        '5. Configure all logic contracts with Genesis address:',
        '   - NOWJC.setGenesis(genesisAddress)',
        '   - NativeAthena.setGenesis(genesisAddress)',
        '   - NativeDAO.setGenesis(genesisAddress)',
        '   - etc.',
        '6. Test authorization: Try writing from authorized contract',
        '7. Test view functions: Anyone can read data',
        '8. Verify both implementation and proxy on Arbiscan',
        '9. IMPORTANT: Genesis must be deployed FIRST before all other contracts',
        '10. Monitor storage usage as platform grows'
      ]
    }
  },
  
  securityConsiderations: [
    'UUPS upgradeable - owner only can upgrade Genesis itself',
    'Authorization required: Only authorized contracts can write data',
    'View functions public: Anyone can read stored data',
    'No business logic: Pure storage reduces attack surface',
    'Owner control: Single owner can authorize/revoke contracts',
    'Upgrade persistence: Historical data survives logic upgrades',
    'Array growth: Large arrays (allJobs, allStakers) may hit gas limits',
    'Batch getters provided: Use getOracleNamesBatch for pagination',
    'No token holding: Genesis never holds user funds',
    'Data integrity: Logic contracts responsible for validation',
    'Access isolation: Each contract writes its own data categories',
    'Emergency recovery: Owner can revoke malicious contract authorization'
  ],
  
  code: `// Full implementation: contracts/openwork-full-contract-suite-layerzero+CCTP 2 Dec/openwork-genesis.sol
// Truncated version showing key structure

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import { UUPSUpgradeable } from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract OpenworkGenesis is Initializable, UUPSUpgradeable {
    
    // ==================== ENUMS ====================
    enum JobStatus { Open, InProgress, Completed, Cancelled }

    // ==================== STRUCTS ====================
    struct MilestonePayment {
        string descriptionHash;
        uint256 amount;
    }
    
    struct Job {
        string id;
        address jobGiver;
        address[] applicants;
        string jobDetailHash;
        JobStatus status;
        string[] workSubmissions;
        MilestonePayment[] milestonePayments;
        MilestonePayment[] finalMilestones;
        uint256 totalPaid;
        uint256 currentMilestone;
        address selectedApplicant;
        uint256 selectedApplicationId;
        uint32 paymentTargetChainDomain;
        address paymentTargetAddress;
        uint32 applierOriginChainDomain;
    }
    
    struct Oracle {
        string name;
        address[] members;
        string shortDescription;
        string hashOfDetails;
        address[] skillVerifiedAddresses;
    }
    
    struct Dispute {
        string jobId;
        uint256 disputedAmount;
        string hash;
        address disputeRaiserAddress;
        uint256 votesFor;
        uint256 votesAgainst;
        bool result;
        bool isVotingActive;
        bool isFinalized;
        uint256 timeStamp;
        uint256 fees;
    }
    
    struct Stake {
        uint256 amount;
        uint256 unlockTime;
        uint256 durationMinutes;
        bool isActive;
    }

    // ==================== STATE VARIABLES ====================
    mapping(address => bool) public authorizedContracts;
    address public owner;
    
    // Job data
    mapping(string => Job) public jobs;
    mapping(string => mapping(uint256 => Application)) public jobApplications;
    uint256 public totalPlatformPayments;
    uint256 public jobCounter;
    string[] public allJobIds;
    mapping(address => string[]) public jobsByPoster;
    
    // Oracle data
    mapping(string => Oracle) public oracles;
    string[] private allOracleNames;
    uint256 private oracleCount;
    
    // Dispute/Voting data
    mapping(string => Dispute) public disputes;
    mapping(uint256 => SkillVerificationApplication) public skillApplications;
    uint256 public applicationCounter;
    
    // DAO data
    mapping(address => Stake) public stakes;
    mapping(address => address) public delegates;
    address[] public allStakers;
    
    // Rewards data
    mapping(address => uint256) public userTotalOWTokens;
    mapping(address => uint256) public userGovernanceActions;

    // ==================== MODIFIERS ====================
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier onlyAuthorized() {
        require(authorizedContracts[msg.sender] || msg.sender == owner, "Not authorized");
        _;
    }

    // ==================== INITIALIZATION ====================
    constructor() {
        _disableInitializers();
    }

    function initialize(address _owner) public initializer {
        __UUPSUpgradeable_init();
        owner = _owner;
    }

    function _authorizeUpgrade(address) internal view override {
        require(msg.sender == owner, "Not owner");
    }

    // ==================== ACCESS CONTROL ====================
    function authorizeContract(address _contract, bool _authorized) external onlyOwner {
        authorizedContracts[_contract] = _authorized;
        emit ContractAuthorized(_contract, _authorized);
    }

    // ==================== JOB SETTERS ====================
    function setJob(
        string memory jobId,
        address jobGiver,
        string memory jobDetailHash,
        string[] memory descriptions,
        uint256[] memory amounts
    ) external onlyAuthorized {
        jobCounter++;
        allJobIds.push(jobId);
        jobsByPoster[jobGiver].push(jobId);
        
        Job storage newJob = jobs[jobId];
        newJob.id = jobId;
        newJob.jobGiver = jobGiver;
        newJob.jobDetailHash = jobDetailHash;
        newJob.status = JobStatus.Open;
        
        for (uint i = 0; i < descriptions.length; i++) {
            newJob.milestonePayments.push(MilestonePayment({
                descriptionHash: descriptions[i],
                amount: amounts[i]
            }));
        }
    }
    
    function updateJobStatus(string memory jobId, JobStatus status) external onlyAuthorized {
        jobs[jobId].status = status;
    }
    
    function updateJobTotalPaid(string memory jobId, uint256 amount) external onlyAuthorized {
        jobs[jobId].totalPaid += amount;
        totalPlatformPayments += amount;
    }

    // ==================== ORACLE SETTERS ====================
    function setOracle(
        string memory name,
        address[] memory members,
        string memory shortDescription,
        string memory hashOfDetails,
        address[] memory skillVerifiedAddresses
    ) external onlyAuthorized {
        if (bytes(oracles[name].name).length == 0) {
            allOracleNames.push(name);
            oracleCount++;
        }
        oracles[name] = Oracle({
            name: name,
            members: members,
            shortDescription: shortDescription,
            hashOfDetails: hashOfDetails,
            skillVerifiedAddresses: skillVerifiedAddresses
        });
    }

    // ==================== DISPUTE SETTERS ====================
    function setDispute(
        string memory jobId,
        uint256 disputedAmount,
        string memory hash,
        address disputeRaiser,
        uint256 fees
    ) external onlyAuthorized {
        disputes[jobId] = Dispute({
            jobId: jobId,
            disputedAmount: disputedAmount,
            hash: hash,
            disputeRaiserAddress: disputeRaiser,
            votesFor: 0,
            votesAgainst: 0,
            result: false,
            isVotingActive: true,
            isFinalized: false,
            timeStamp: block.timestamp,
            fees: fees
        });
    }

    // ==================== DAO SETTERS ====================
    function setStake(
        address staker,
        uint256 amount,
        uint256 unlockTime,
        uint256 durationMinutes,
        bool isActive
    ) external onlyAuthorized {
        stakes[staker] = Stake({
            amount: amount,
            unlockTime: unlockTime,
            durationMinutes: durationMinutes,
            isActive: isActive
        });
    }

    // ==================== REWARDS SETTERS ====================
    function setUserTotalOWTokens(address user, uint256 tokens) external onlyAuthorized {
        userTotalOWTokens[user] = tokens;
    }

    function incrementUserGovernanceActions(address user) external onlyAuthorized {
        userGovernanceActions[user]++;
    }

    // ==================== GETTERS ====================
    function getJob(string memory jobId) external view returns (Job memory) {
        return jobs[jobId];
    }
    
    function getOracle(string memory oracleName) external view returns (Oracle memory) {
        return oracles[oracleName];
    }
    
    function getStake(address staker) external view returns (Stake memory) {
        return stakes[staker];
    }
    
    function getAllJobIds() external view returns (string[] memory) {
        return allJobIds;
    }
    
    function getAllOracleNames() external view returns (string[] memory) {
        return allOracleNames;
    }
    
    // ... 100+ more setters and getters for complete data management
    // See full contract for all functionality
}`
};
