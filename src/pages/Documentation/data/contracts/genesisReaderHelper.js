export const genesisReaderHelper = {
  id: 'genesisReaderHelper',
  name: 'Genesis Reader',
  chain: 'l2',
  column: 'l2-center',
  order: 1,
  status: 'testnet',
  version: 'v1.0.0',
  gas: '50K',
  mainnetNetwork: 'Arbitrum One',
  testnetNetwork: 'Arbitrum Sepolia',
  mainnetDeployed: 'Not deployed',
  testnetDeployed: 'Deployed',
  mainnetAddress: null,
  testnetAddress: '0x...',
  isUUPS: false,
  tvl: 'N/A',
  docs: 'Genesis Reader Helper - Stateless batch reading contract for efficient querying of OpenworkGenesis data. Provides filtered queries for active applications, status-based job filtering, and paginated data retrieval to avoid gas limits.',
  
  overview: {
    purpose: 'GenesisReaderHelper is a stateless helper contract that provides batch reading capabilities for OpenworkGenesis storage. It contains NO state - just pure view functions that query the Genesis contract efficiently. Designed to solve gas limit issues when reading large datasets by providing filtered queries (active disputes only, open jobs only, etc.) and paginated results. Essential for frontend applications and indexers that need to display filtered platform data without hitting RPC gas limits.',
    tier: 'Native Chain (Arbitrum Sepolia)',
    category: 'Data Access Layer - Helper',
    upgradeability: 'Immutable (no upgrade mechanism needed)'
  },
  
  features: [
    'Stateless design: No storage, purely computational view functions',
    'Batch getters: Retrieve multiple items in single call',
    'Filtered queries: Get only active disputes, open jobs, in-progress jobs',
    'Paginated results: Batch queries with startIndex and count',
    'Gas-efficient: Avoids hitting RPC limits on large datasets',
    'Skill applications: Get all active skill verification applications',
    'Ask Athena queries: Retrieve active governance consultations',
    'Dispute filtering: Active disputes only for voter UIs',
    'Job status filters: Query jobs by Open/InProgress/Completed/Cancelled',
    'User-specific queries: Get all applications by specific user',
    'Application aggregation: Get all job applications across all jobs',
    'Counter helpers: Quick access to total counts'
  ],
  
  systemPosition: {
    description: 'Genesis Reader Helper sits alongside OpenworkGenesis as a query optimization layer. It does not store any data itself - it\'s a stateless contract that makes complex, filtered queries to Genesis more efficient. Frontend apps and indexers use it to get paginated, filtered data without hitting gas limits. For example, instead of fetching all 10,000 skill applications and filtering client-side, the helper returns only the 50 active ones. This is critical for good UX as the platform scales.',
    diagram: `
📍 Data Access Architecture

OpenworkGenesis (Storage Layer)
    ↑ Queries via interface
    │
Genesis Reader Helper ⭐ (YOU ARE HERE)
    ↓ Provides filtered/paginated queries
    │
Frontend Applications & Indexers
    └─> Job listing pages (open jobs only)
    └─> Dispute voting UI (active disputes only)
    └─> Skill verification dashboard (active applications)
    └─> User profile (applications by user)
    └─> Analytics dashboards (aggregated data)

Query Flow:
1. Frontend needs "all active disputes"
2. Calls GenesisReaderHelper.getActiveDisputes()
3. Helper queries Genesis for all disputes
4. Helper filters for isVotingActive == true
5. Returns only active disputes (saves gas & bandwidth)

Benefits:
- Single contract call instead of thousands
- No client-side filtering needed
- Avoids RPC gas limits on large queries
- Immutable - never needs upgrades
- Can be redeployed if new query patterns needed`
  },
  
  dependencies: {
    dependsOn: [
      { 
        name: 'OpenworkGenesis', 
        reason: 'All queries read from Genesis storage via IOpenworkGenesis interface.',
        type: 'Storage Contract'
      }
    ],
    requiredBy: [
      { 
        name: 'Frontend Applications', 
        reason: 'UI uses batch getters for efficient data loading without gas limits.',
        type: 'Application Layer'
      },
      { 
        name: 'Indexers & Analytics', 
        reason: 'Off-chain indexers use filtered queries to build efficient databases.',
        type: 'Infrastructure'
      }
    ],
    prerequisites: [
      'OpenworkGenesis must be deployed first',
      'Genesis address passed to constructor (immutable)',
      'No authorization needed - all functions are view-only'
    ]
  },
  
  functions: [
    {
      category: 'Skill Application Batch Getters',
      description: 'Efficiently query skill verification applications',
      items: [
        {
          name: 'getAllSkillApplicationIds',
          signature: 'getAllSkillApplicationIds() view returns (uint256[])',
          whatItDoes: 'Returns array of all skill application IDs from 0 to counter-1.',
          whyUse: 'Get complete list of skill applications for pagination or iteration.',
          howItWorks: [
            'Queries genesis.applicationCounter()',
            'Creates array [0, 1, 2, ..., counter-1]',
            'Returns complete ID list'
          ],
          parameters: [],
          accessControl: 'Public view - anyone can call',
          events: ['None (view)'],
          gasEstimate: 'Varies with application count (~50K for 100 apps)',
          example: `const allIds = await readerHelper.getAllSkillApplicationIds();
console.log('Total applications:', allIds.length);
// Returns: [0, 1, 2, 3, ..., 99]

// Use for pagination
for (let i = 0; i < allIds.length; i += 10) {
  const batch = allIds.slice(i, i + 10);
  // Process batch of 10
}`,
          relatedFunctions: ['getSkillApplicationsBatch', 'getActiveSkillApplications']
        },
        {
          name: 'getActiveSkillApplications',
          signature: 'getActiveSkillApplications() view returns (SkillVerificationApplication[])',
          whatItDoes: 'Returns only skill verification applications that are currently open for voting.',
          whyUse: 'Display active skill verifications to oracle members for voting without fetching all historical applications.',
          howItWorks: [
            'Queries all applications from Genesis',
            'Filters for isVotingActive == true',
            'Returns array of active applications only',
            'Two-pass algorithm: count active, then collect'
          ],
          parameters: [],
          accessControl: 'Public view',
          events: ['None (view)'],
          gasEstimate: 'High gas (~500K for 1000 apps) but read-only',
          example: `const activeApps = await readerHelper.getActiveSkillApplications();
console.log('Active verifications:', activeApps.length);

// Display in UI
activeApps.forEach(app => {
  console.log('Applicant:', app.applicant);
  console.log('Oracle:', app.targetOracleName);
  console.log('Votes For:', app.votesFor);
  console.log('Votes Against:', app.votesAgainst);
});`,
          relatedFunctions: ['getAllSkillApplicationIds', 'getSkillApplicationsBatch']
        }
      ]
    },
    {
      category: 'Ask Athena Batch Getters',
      description: 'Query governance consultation applications',
      items: [
        {
          name: 'getAllAskAthenaIds',
          signature: 'getAllAskAthenaIds() view returns (uint256[])',
          whatItDoes: 'Returns array of all Ask Athena application IDs.',
          whyUse: 'Get complete list of governance consultations for pagination.',
          howItWorks: [
            'Queries genesis.askAthenaCounter()',
            'Creates array [0, 1, 2, ..., counter-1]'
          ],
          parameters: [],
          accessControl: 'Public view',
          events: ['None (view)'],
          gasEstimate: 'Varies with count (~50K for 100)',
          example: `const allAthenaIds = await readerHelper.getAllAskAthenaIds();
console.log('Total Ask Athena:', allAthenaIds.length);`,
          relatedFunctions: ['getAskAthenaApplicationsBatch', 'getActiveAskAthenaApplications']
        },
        {
          name: 'getActiveAskAthenaApplications',
          signature: 'getActiveAskAthenaApplications() view returns (AskAthenaApplication[])',
          whatItDoes: 'Returns only Ask Athena applications currently open for voting.',
          whyUse: 'Display active governance consultations without historical noise.',
          howItWorks: [
            'Queries all Ask Athena applications',
            'Filters for isVotingActive == true',
            'Returns active consultations only'
          ],
          parameters: [],
          accessControl: 'Public view',
          events: ['None (view)'],
          gasEstimate: 'High gas for large datasets (~500K)',
          example: `const activeAthena = await readerHelper.getActiveAskAthenaApplications();

// Display governance consultations
activeAthena.forEach(app => {
  console.log('Question:', app.description);
  console.log('Target Oracle:', app.targetOracle);
  console.log('Votes:', app.votesFor, 'for,', app.votesAgainst, 'against');
});`,
          relatedFunctions: ['getAllAskAthenaIds']
        }
      ]
    },
    {
      category: 'Dispute Batch Getters',
      description: 'Efficiently query dispute data',
      items: [
        {
          name: 'getAllDisputeIds',
          signature: 'getAllDisputeIds() view returns (string[])',
          whatItDoes: 'Returns all dispute IDs across all jobs (handles multi-disputes per job).',
          whyUse: 'Get complete dispute history for analytics or indexing.',
          howItWorks: [
            'Gets all job IDs from Genesis',
            'For each job, checks up to 10 disputes (job-abc-1, job-abc-2, etc.)',
            'Collects all valid dispute IDs',
            'Returns full list'
          ],
          parameters: [],
          accessControl: 'Public view',
          events: ['None (view)'],
          gasEstimate: 'Very high (~1M+ gas for many jobs)',
          example: `const allDisputes = await readerHelper.getAllDisputeIds();
console.log('Total disputes:', allDisputes.length);
// Returns: ['job-abc-1', 'job-def-1', 'job-def-2', ...]`,
          relatedFunctions: ['getActiveDisputes', 'getDisputesBatch']
        },
        {
          name: 'getActiveDisputes',
          signature: 'getActiveDisputes() view returns (Dispute[])',
          whatItDoes: 'Returns only disputes currently open for voting (critical for voter UI).',
          whyUse: 'Display active disputes to oracle members without showing finalized disputes.',
          howItWorks: [
            'Queries all jobs and their disputes',
            'Filters for isVotingActive == true',
            'Returns array of active disputes only',
            'Handles multiple disputes per job'
          ],
          parameters: [],
          accessControl: 'Public view',
          events: ['None (view)'],
          gasEstimate: 'Very high (~1M+ gas)',
          example: `const activeDisputes = await readerHelper.getActiveDisputes();
console.log('Disputes needing votes:', activeDisputes.length);

// Display in voting UI
activeDisputes.forEach(dispute => {
  console.log('Job:', dispute.jobId);
  console.log('Amount:', ethers.formatUnits(dispute.disputedAmount, 6), 'USDT');
  console.log('Raised by:', dispute.disputeRaiserAddress);
  console.log('Current votes:', dispute.votesFor, 'vs', dispute.votesAgainst);
});`,
          relatedFunctions: ['getAllDisputeIds', 'getDisputesBatch']
        }
      ]
    },
    {
      category: 'Job Batch Getters',
      description: 'Filter jobs by status and poster',
      items: [
        {
          name: 'getJobsByStatus',
          signature: 'getJobsByStatus(JobStatus status) view returns (Job[])',
          whatItDoes: 'Returns all jobs matching a specific status (0=Open, 1=InProgress, 2=Completed, 3=Cancelled).',
          whyUse: 'Display job listings filtered by status without client-side filtering.',
          howItWorks: [
            'Queries all job IDs from Genesis',
            'Filters for matching status',
            'Returns array of matching jobs'
          ],
          parameters: [
            { name: 'status', type: 'JobStatus', description: '0=Open, 1=InProgress, 2=Completed, 3=Cancelled' }
          ],
          accessControl: 'Public view',
          events: ['None (view)'],
          gasEstimate: 'High gas (~800K for 1000 jobs)',
          example: `// Get all open jobs
const openJobs = await readerHelper.getJobsByStatus(0);
console.log('Open jobs:', openJobs.length);

// Display job board
openJobs.forEach(job => {
  console.log('Job:', job.id);
  console.log('Posted by:', job.jobGiver);
  console.log('Applicants:', job.applicants.length);
  console.log('Details:', job.jobDetailHash);
});`,
          relatedFunctions: ['getOpenJobs', 'getInProgressJobs']
        },
        {
          name: 'getOpenJobs',
          signature: 'getOpenJobs() view returns (Job[])',
          whatItDoes: 'Convenience function that returns all jobs with status = Open.',
          whyUse: 'Quick access to available jobs for job board display.',
          howItWorks: [
            'Calls getJobsByStatus(JobStatus.Open)',
            'Returns only open jobs'
          ],
          parameters: [],
          accessControl: 'Public view',
          events: ['None (view)'],
          gasEstimate: 'High gas (~800K)',
          example: `const openJobs = await readerHelper.getOpenJobs();
console.log('Available jobs:', openJobs.length);`,
          relatedFunctions: ['getJobsByStatus', 'getInProgressJobs']
        },
        {
          name: 'getInProgressJobs',
          signature: 'getInProgressJobs() view returns (Job[])',
          whatItDoes: 'Returns all jobs currently being worked on.',
          whyUse: 'Display active work to track platform activity.',
          howItWorks: [
            'Calls getJobsByStatus(JobStatus.InProgress)',
            'Returns in-progress jobs'
          ],
          parameters: [],
          accessControl: 'Public view',
          events: ['None (view)'],
          gasEstimate: 'High gas (~800K)',
          example: `const activeWork = await readerHelper.getInProgressJobs();
console.log('Active jobs:', activeWork.length);`,
          relatedFunctions: ['getJobsByStatus', 'getOpenJobs']
        },
        {
          name: 'getJobsByPosterWithStatus',
          signature: 'getJobsByPosterWithStatus(address poster, JobStatus status) view returns (Job[])',
          whatItDoes: 'Returns specific user\'s jobs filtered by status.',
          whyUse: 'Display user\'s job history filtered (e.g., "My Open Jobs", "My Completed Jobs").',
          howItWorks: [
            'Queries user\'s jobs from Genesis',
            'Filters for matching status',
            'Returns user\'s filtered jobs'
          ],
          parameters: [
            { name: 'poster', type: 'address', description: 'Job poster address' },
            { name: 'status', type: 'JobStatus', description: 'Job status to filter by' }
          ],
          accessControl: 'Public view',
          events: ['None (view)'],
          gasEstimate: 'Moderate (~200K)',
          example: `// Get user's open jobs only
const myOpenJobs = await readerHelper.getJobsByPosterWithStatus(
  userAddress,
  0 // Open
);

console.log('My open jobs:', myOpenJobs.length);`,
          relatedFunctions: ['getJobsByStatus']
        }
      ]
    },
    {
      category: 'Job Application Batch Getters',
      description: 'Query applications across jobs and users',
      items: [
        {
          name: 'getAllJobApplications',
          signature: 'getAllJobApplications() view returns (Application[])',
          whatItDoes: 'Returns ALL job applications across ALL jobs (very expensive query).',
          whyUse: 'Analytics and indexing - not recommended for frontend use.',
          howItWorks: [
            'Queries all job IDs',
            'For each job, gets all applications',
            'Aggregates into single array',
            'Returns complete application list'
          ],
          parameters: [],
          accessControl: 'Public view',
          events: ['None (view)'],
          gasEstimate: 'Extremely high (1M+ gas)',
          example: `// Use sparingly - very expensive
const allApplications = await readerHelper.getAllJobApplications();
console.log('Total applications:', allApplications.length);`,
          relatedFunctions: ['getApplicationsByApplicant', 'getApplicationsByJob']
        },
        {
          name: 'getApplicationsByApplicant',
          signature: 'getApplicationsByApplicant(address applicant) view returns (Application[])',
          whatItDoes: 'Returns all applications submitted by a specific user.',
          whyUse: 'Display user\'s application history in their profile.',
          howItWorks: [
            'Queries all jobs and applications',
            'Filters for applications by user',
            'Returns user\'s applications'
          ],
          parameters: [
            { name: 'applicant', type: 'address', description: 'Freelancer address' }
          ],
          accessControl: 'Public view',
          events: ['None (view)'],
          gasEstimate: 'High (~800K)',
          example: `const myApplications = await readerHelper.getApplicationsByApplicant(
  freelancerAddress
);

console.log('Applications submitted:', myApplications.length);

myApplications.forEach(app => {
  console.log('Job:', app.jobId);
  console.log('Proposed milestones:', app.proposedMilestones.length);
  console.log('Payment chain:', app.preferredPaymentChainDomain);
});`,
          relatedFunctions: ['getAllJobApplications', 'getApplicationsByJob']
        },
        {
          name: 'getApplicationsByJob',
          signature: 'getApplicationsByJob(string jobId) view returns (Application[])',
          whatItDoes: 'Returns all applications for a specific job.',
          whyUse: 'Display applicant list when job poster reviews candidates.',
          howItWorks: [
            'Queries application count for job',
            'Fetches all applications',
            'Returns array'
          ],
          parameters: [
            { name: 'jobId', type: 'string', description: 'Job to query' }
          ],
          accessControl: 'Public view',
          events: ['None (view)'],
          gasEstimate: 'Moderate (~100K)',
          example: `const applicants = await readerHelper.getApplicationsByJob('job-abc-123');
console.log('Total applicants:', applicants.length);

applicants.forEach((app, idx) => {
  console.log(\`Applicant \${idx + 1}: \${app.applicant}\`);
  console.log('Proposal:', app.applicationHash);
});`,
          relatedFunctions: ['getAllJobApplications', 'getApplicationsByApplicant']
        }
      ]
    },
    {
      category: 'Utility Functions',
      description: 'Quick access to counters and counts',
      items: [
        {
          name: 'getSkillApplicationCount',
          signature: 'getSkillApplicationCount() view returns (uint256)',
          whatItDoes: 'Returns total number of skill verification applications.',
          whyUse: 'Quick count without fetching full array.',
          howItWorks: [
            'Queries genesis.applicationCounter()',
            'Returns count'
          ],
          parameters: [],
          accessControl: 'Public view',
          events: ['None (view)'],
          gasEstimate: 'Very low (~3K)',
          example: `const count = await readerHelper.getSkillApplicationCount();
console.log('Total skill applications:', count);`,
          relatedFunctions: ['getAllSkillApplicationIds']
        },
        {
          name: 'getAskAthenaCount',
          signature: 'getAskAthenaCount() view returns (uint256)',
          whatItDoes: 'Returns total number of Ask Athena applications.',
          whyUse: 'Quick count for analytics.',
          howItWorks: [
            'Queries genesis.askAthenaCounter()',
            'Returns count'
          ],
          parameters: [],
          accessControl: 'Public view',
          events: ['None (view)'],
          gasEstimate: 'Very low (~3K)',
          example: `const count = await readerHelper.getAskAthenaCount();
console.log('Total Ask Athena:', count);`,
          relatedFunctions: ['getAllAskAthenaIds']
        }
      ]
    }
  ],
  
  integrationGuide: {
    example: `// Genesis Reader Helper Integration Example
const { ethers } = require('ethers');

// Setup
const readerHelper = new ethers.Contract(
  readerHelperAddress, 
  readerHelperABI, 
  provider // Read-only, no signer needed
);

// 1. Get active skill verifications for voting UI
const activeSkills = await readerHelper.getActiveSkillApplications();
console.log('Active verifications:', activeSkills.length);

activeSkills.forEach(app => {
  console.log('Applicant:', app.applicant);
  console.log('Oracle:', app.targetOracleName);
  console.log('Votes:', \`\${app.votesFor} for, \${app.votesAgainst} against\`);
});

// 2. Display active disputes for voter dashboard
const activeDisputes = await readerHelper.getActiveDisputes();
console.log('Disputes needing votes:', activeDisputes.length);

// 3. Job board - show only open jobs
const openJobs = await readerHelper.getOpenJobs();
console.log('Available jobs:', openJobs.length);

// Render job cards
openJobs.forEach(job => {
  renderJobCard({
    title: job.id,
    poster: job.jobGiver,
    applicants: job.applicants.length,
    detailsHash: job.jobDetailHash
  });
});

// 4. User profile - show my applications
const myApplications = await readerHelper.getApplicationsByApplicant(
  userAddress
);

console.log('My applications:', myApplications.length);

// 5. Analytics - get counts
const skillCount = await readerHelper.getSkillApplicationCount();
const athenaCount = await readerHelper.getAskAthenaCount();

console.log('Platform stats:');
console.log('- Skill applications:', skillCount);
console.log('- Ask Athena:', athenaCount);

// 6. Paginated queries (for large datasets)
const startIndex = 0;
const batchSize = 50;
const skillBatch = await readerHelper.getSkillApplicationsBatch(
  startIndex,
  batchSize
);

console.log('Fetched batch:', skillBatch.length);`,
    tips: [
      'All functions are view-only - no gas cost for off-chain calls',
      'On-chain calls (from contracts) may hit gas limits on large datasets',
      'Use filtered queries (getActive*) instead of fetching all + client filtering',
      'Paginated functions (getBatch) help avoid RPC timeouts',
      'Immutable contract - can be redeployed if new query patterns needed',
      'No authorization required - anyone can query',
      'Stateless design means no storage costs or upgrade complexity',
      'Consider caching results client-side to reduce RPC calls',
      'For real-time data, query frequently; for historical, cache longer',
      'Use count functions first to determine pagination needs'
    ]
  },
  
  securityConsiderations: [
    'Read-only contract: No security risk from unauthorized writes',
    'No state storage: Cannot be exploited for state manipulation',
    'Immutable: Once deployed, code cannot change (feature, not bug)',
    'Gas limits: Some queries may fail on-chain if dataset too large',
    'RPC limits: Off-chain queries may timeout on public RPCs',
    'Genesis dependency: Requires correct Genesis address in constructor',
    'Interface matching: Must match Genesis interface exactly',
    'No access control: All data publicly readable (by design)',
    'No token holding: Never holds funds or tokens',
    'Pure queries: Cannot modify blockchain state'
  ],
  
  code: `// See full implementation in contracts/openwork-full-contract-suite-layerzero+CCTP 2 Dec/genesis-reader-helper.sol

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

/**
 * @title GenesisReaderHelper
 * @dev Helper contract to provide batch reading capabilities for OpenworkGenesis
 * @notice This is a stateless reader contract that queries the Genesis proxy for efficient batch operations
 */

interface IOpenworkGenesis {
    // Interface definitions...
    function applicationCounter() external view returns (uint256);
    function askAthenaCounter() external view returns (uint256);
    function getSkillApplication(uint256 applicationId) external view returns (SkillVerificationApplication memory);
    // ... more functions
}

contract GenesisReaderHelper {
    IOpenworkGenesis public immutable genesis;
    
    constructor(address _genesis) {
        require(_genesis != address(0), "Invalid genesis address");
        genesis = IOpenworkGenesis(_genesis);
    }
    
    // Skill Application Batch Getters
    function getAllSkillApplicationIds() external view returns (uint256[] memory) {
        // Implementation...
    }
    
    function getActiveSkillApplications() external view returns (IOpenworkGenesis.SkillVerificationApplication[] memory) {
        // Implementation...
    }
    
    // Ask Athena Batch Getters
    function getAllAskAthenaIds() external view returns (uint256[] memory) {
        // Implementation...
    }
    
    function getActiveAskAthenaApplications() external view returns (IOpenworkGenesis.AskAthenaApplication[] memory) {
        // Implementation...
    }
    
    // Dispute Batch Getters
    function getAllDisputeIds() external view returns (string[] memory) {
        // Implementation...
    }
    
    function getActiveDisputes() external view returns (IOpenworkGenesis.Dispute[] memory) {
        // Implementation...
    }
    
    // Job Batch Getters
    function getJobsByStatus(IOpenworkGenesis.JobStatus status) external view returns (IOpenworkGenesis.Job[] memory) {
        // Implementation...
    }
    
    function getOpenJobs() external view returns (IOpenworkGenesis.Job[] memory) {
        return this.getJobsByStatus(IOpenworkGenesis.JobStatus.Open);
    }
    
    // Job Application Batch Getters
    function getAllJobApplications() external view returns (IOpenworkGenesis.Application[] memory) {
        // Implementation...
    }
    
    function getApplicationsByApplicant(address applicant) external view returns (IOpenworkGenesis.Application[] memory) {
        // Implementation...
    }
    
    // Utility Functions
    function getSkillApplicationCount() external view returns (uint256) {
        return genesis.applicationCounter();
    }
    
    function getAskAthenaCount() external view returns (uint256) {
        return genesis.askAthenaCounter();
    }
}`,

  deployConfig: {
    type: 'regular',
    constructor: [
      { 
        name: 'genesisAddress',
        type: 'address',
        description: 'OpenworkGenesis proxy contract address',
        placeholder: '0x1f23683C748fA1AF99B7263dea121eCc5Fe7564C'
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
    estimatedGas: '50K',
    postDeploy: {
      message: 'Genesis Reader Helper deployed! Frontend can now use efficient batch queries.',
      nextSteps: [
        'Verify contract on Arbiscan',
        'Update frontend with reader helper address',
        'Test batch queries for job board',
        'Integrate active dispute queries for voting UI',
        'Use filtered queries to improve page load times'
      ]
    }
  }
};
