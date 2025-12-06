export const nowjc = {
  id: 'nowjc',
  name: 'NOWJC',
  chain: 'l2',
  column: 'l2-left',
  order: 0,
  status: 'testnet',
  version: 'v2.0.0',
  gas: '56K',
  mainnetNetwork: 'Arbitrum One',
  testnetNetwork: 'Arbitrum Sepolia',
  mainnetDeployed: 'Not deployed',
  testnetDeployed: 'Deployed',
  mainnetAddress: null,
  testnetAddress: '0x9E39B37275854449782F1a2a4524405cE79d6C1e',
  isUUPS: true,
  implementationAddress: '0xAe55797B042169936f7816b85bf8387b739084c4',
  tvl: 'N/A',
  docs: 'Native OpenWork Job Contract - Central hub for job lifecycle management, cross-chain payment processing, and rewards distribution.',
  
  overview: {
    purpose: 'NOWJC (Native OpenWork Job Contract) is the central orchestrator of the OpenWork platform on Arbitrum. It manages the complete job lifecycle across all chains, coordinates cross-chain USDC payments via Circle\'s CCTP, integrates with the rewards system for OW token distribution, handles dispute fund releases, and serves as the single source of truth for all job-related operations in the multi-chain ecosystem.',
    tier: 'Native Chain (Arbitrum Sepolia)',
    category: 'Job Management (Core Logic)',
    upgradeability: 'UUPS Upgradeable (owner + bridge can upgrade)'
  },
  
  features: [
    'Multi-chain job management: Receives jobs from any Local chain (Ethereum, OP, Base, Polygon)',
    'CCTP payment integration: Releases USDC payments to any supported chain via Circle\'s Cross-Chain Transfer Protocol',
    'Automated commission: Deducts 1% platform fee (minimum $1 USDC) from all payments',
    'Rewards integration: Automatically calculates and awards OW tokens to job participants via Native Rewards',
    'Governance tracking: Records user actions for voting power calculations',
    'Direct contract support: Enables instant job start for pre-agreed freelancer engagements',
    'Dispute integration: Handles fund releases based on Native Athena dispute outcomes',
    'Cross-chain sync: Syncs rewards and voting power data to Main chain for governance',
    'Treasury management: Accumulates commission for protocol sustainability'
  ],
  
  systemPosition: {
    description: 'NOWJC sits at the heart of the OpenWork ecosystem on Arbitrum (Native Chain). It acts as the central hub that receives job operations from all Local chains via LayerZero bridges, holds USDC escrow received through CCTP, and coordinates with Native Rewards for token distribution, Native Athena for dispute resolution, and OpenworkGenesis for persistent storage. All job state changes flow through NOWJC, making it the single source of truth for the entire multi-chain job marketplace.',
    diagram: `
📍 Cross-Chain Job Architecture

Local Chains (Ethereum, OP, Base, Polygon)
    └─> LOWJC (Job Interface)
        └─> Local Bridge (LayerZero)
            └─> Native Bridge (Message Router)
                ↓
    ┌───────── NOWJC ⭐ (Central Hub) ─────────┐
    ↓                                           ↓
OpenworkGenesis          Native Rewards        CCTP Transceiver
(Data Storage)           (OW Tokens)           (USDC Payments)
    ↓                    ↓                     ↓
Profile Data         Token Awards           Cross-Chain $
Job State            Voting Power           USDC Release
Milestones           Governance             Any Supported Chain
    ↓                    ↓                     
Native Athena        Native Bridge
(Disputes)           (Main Chain Sync)
    ↓                    ↓
Dispute Votes        Main DAO
Fund Release         Main Rewards`
  },
  
  dependencies: {
    dependsOn: [
      { 
        name: 'OpenworkGenesis', 
        reason: 'Stores all job data, applications, milestones, and payment history. NOWJC reads/writes all state here.',
        type: 'Storage'
      },
      { 
        name: 'Native Rewards', 
        reason: 'Calculates OW token awards based on platform payment volume and distributes tokens to job participants.',
        type: 'Rewards'
      },
      { 
        name: 'CCTP Transceiver', 
        reason: 'Executes cross-chain USDC transfers using Circle\'s CCTP for releasing payments to any supported chain.',
        type: 'Bridge'
      },
      { 
        name: 'Native Bridge', 
        reason: 'Receives job operations from Local chains and sends reward/voting data to Main chain.',
        type: 'Bridge'
      },
      { 
        name: 'USDC Token', 
        reason: 'ERC-20 stablecoin used for all job payments. NOWJC holds escrowed funds and releases them.',
        type: 'Token'
      },
      {
        name: 'Native Athena',
        reason: 'Dispute resolution contract that calls NOWJC to release funds to dispute winners.',
        type: 'Dispute Resolution'
      }
    ],
    requiredBy: [
      { 
        name: 'LOWJC (All Local Chains)', 
        reason: 'Every Local chain (Ethereum, OP, Base, Polygon) forwards job operations to NOWJC for execution.',
        type: 'Job Interface'
      },
      { 
        name: 'Native Athena', 
        reason: 'Calls releaseDisputedFunds() after dispute resolution to distribute funds to the winner.',
        type: 'Dispute Resolution'
      },
      { 
        name: 'Main Rewards', 
        reason: 'Receives synced claimable token data via syncRewardsData() for cross-chain claims.',
        type: 'Rewards'
      },
      {
        name: 'Native DAO',
        reason: 'Receives governance action updates via incrementGovernanceAction() for voting power tracking.',
        type: 'Governance'
      }
    ],
    prerequisites: [
      'OpenworkGenesis must be deployed and initialized with owner access',
      'Native Rewards must be deployed and linked to NOWJC',
      'CCTP Transceiver must be configured with correct domain mappings',
      'Native Bridge must be initialized with all Local chain endpoints',
      'USDC token contract address must be set correctly',
      'Treasury address must be configured for commission withdrawals',
      'Native Athena must be set for dispute resolution integration'
    ]
  },
  
  functions: [
    {
      category: 'Job Management',
      description: 'Core functions for managing the complete job lifecycle from posting to completion',
      items: [
        {
          name: 'postJob',
          signature: 'postJob(string jobId, address jobGiver, string jobDetailHash, string[] descriptions, uint256[] amounts)',
          whatItDoes: 'Creates a new job listing and stores it in OpenworkGenesis with initial milestones proposed by the job poster.',
          whyUse: 'This is automatically called by the Native Bridge when a user posts a job on any Local chain. It creates the canonical job record that all chains reference.',
          howItWorks: [
            'Validates job doesn\'t already exist',
            'Validates milestone arrays have matching lengths',
            'Increments global job counter',
            'Creates job in OpenworkGenesis with Open status',
            'Stores milestone descriptions and payment amounts',
            'Adds job ID to poster\'s personal job list',
            'Emits JobPosted and JobStatusChanged events'
          ],
          parameters: [
            { name: 'jobId', type: 'string', description: 'Unique identifier (format: "chainEid-jobNumber", e.g., "40232-57")' },
            { name: 'jobGiver', type: 'address', description: 'Address of the job creator/poster' },
            { name: 'jobDetailHash', type: 'string', description: 'IPFS hash containing complete job description, requirements, deadlines, and terms' },
            { name: 'descriptions', type: 'string[]', description: 'Array of milestone descriptions explaining deliverables for each phase' },
            { name: 'amounts', type: 'uint256[]', description: 'USDC amounts per milestone in 6 decimals (e.g., 1000_000_000 = 1000 USDC)' }
          ],
          accessControl: 'Public function, typically called by Native Bridge after cross-chain message',
          events: [
            'JobPosted(jobId, jobGiver, jobDetailHash)',
            'JobStatusChanged(jobId, JobStatus.Open)'
          ],
          gasEstimate: '~45K gas',
          example: `// User-facing interaction on Local chain:
// User pays LayerZero fee and calls LOWJC
const lzFee = await localBridge.quoteSendToNative(...);
await lowjc.postJob(
  "QmX7h5...",  // IPFS job description
  ["Phase 1: Design", "Phase 2: Development", "Phase 3: Testing"],
  [500_000_000, 1000_000_000, 500_000_000],  // 500, 1000, 500 USDC
  lzOptions,
  { value: lzFee }
);

// ↓ LayerZero bridges the message
// ↓ Native Bridge receives and calls:

await nowjc.postJob(
  "40232-57",
  jobGiverAddress,
  "QmX7h5...",
  ["Phase 1: Design", "Phase 2: Development", "Phase 3: Testing"],
  [500_000_000, 1000_000_000, 500_000_000]
);

// Result: Job now visible on all chains`,
          relatedFunctions: ['applyToJob', 'startJob', 'handleStartDirectContract']
        },
        {
          name: 'applyToJob',
          signature: 'applyToJob(address applicant, string jobId, string applicationHash, string[] descriptions, uint256[] amounts, uint32 preferredChainDomain)',
          whatItDoes: 'Submits a freelancer\'s application with proposed milestones and payment preferences, including their preferred chain for receiving payments.',
          whyUse: 'Freelancers call this (via LOWJC on their preferred chain) to apply for posted jobs. They can propose alternative milestones and specify where they want to receive payments.',
          howItWorks: [
            'Validates application arrays match in length',
            'Checks applicant hasn\'t already applied',
            'Adds applicant to job\'s applicant list',
            'Increments application counter',
            'Stores application with proposed milestones',
            'Records applicant\'s preferred payment chain domain',
            'Stores preferred payment address',
            'Emits JobApplication event'
          ],
          parameters: [
            { name: 'applicant', type: 'address', description: 'Address of the freelancer applying' },
            { name: 'jobId', type: 'string', description: 'Job identifier to apply for' },
            { name: 'applicationHash', type: 'string', description: 'IPFS hash with cover letter, portfolio links, and proposal details' },
            { name: 'descriptions', type: 'string[]', description: 'Applicant\'s proposed milestone descriptions (can differ from job poster\'s)' },
            { name: 'amounts', type: 'uint256[]', description: 'Applicant\'s proposed payment amounts (can differ from job poster\'s)' },
            { name: 'preferredChainDomain', type: 'uint32', description: 'CCTP domain for payments: 0=Ethereum, 2=Optimism, 3=Arbitrum, 6=Base' }
          ],
          accessControl: 'Public function, typically called by Native Bridge',
          events: [
            'JobApplication(jobId, applicationId, applicant, applicationHash)'
          ],
          gasEstimate: '~52K gas',
          example: `// Freelancer applies on Optimism, wants payment on Base
await lowjc.applyToJob(
  "40232-57",
  "QmApply123...",  // Application IPFS hash
  ["Milestone 1 modified", "Milestone 2 modified"],
  [600_000_000, 900_000_000],  // Counter-offer: 600 + 900 USDC
  6,  // Base Sepolia domain
  lzOptions,
  { value: lzFee }
);

// Stored in NOWJC with payment preferences
// If hired, payments go to Base chain`,
          relatedFunctions: ['postJob', 'startJob', 'releasePaymentCrossChain']
        },
        {
          name: 'startJob',
          signature: 'startJob(address jobGiver, string jobId, uint256 applicationId, bool useApplicantMilestones)',
          whatItDoes: 'Starts a job by selecting a winning applicant and locking in the final milestone structure (either job poster\'s or applicant\'s proposed milestones).',
          whyUse: 'Job poster calls this after reviewing applications to officially start the job with their chosen freelancer. This locks in payment terms and moves job to InProgress status.',
          howItWorks: [
            'Retrieves selected application from Genesis',
            'Sets selected applicant on the job',
            'Changes job status from Open to InProgress',
            'Sets current milestone to 1 (first milestone active)',
            'If useApplicantMilestones=true: Uses applicant\'s proposed milestones',
            'If useApplicantMilestones=false: Uses job poster\'s original milestones',
            'Copies chosen milestones to finalMilestones array',
            'Emits JobStarted and JobStatusChanged events'
          ],
          parameters: [
            { name: 'jobGiver', type: 'address', description: 'Address of job creator (for validation)' },
            { name: 'jobId', type: 'string', description: 'Job identifier' },
            { name: 'applicationId', type: 'uint256', description: 'ID of the winning application' },
            { name: 'useApplicantMilestones', type: 'bool', description: 'true = use applicant\'s milestones, false = use job poster\'s milestones' }
          ],
          accessControl: 'Public function, typically called by job poster via bridge',
          events: [
            'JobStarted(jobId, applicationId, selectedApplicant, useApplicantMilestones)',
            'JobStatusChanged(jobId, JobStatus.InProgress)'
          ],
          gasEstimate: '~58K gas',
          example: `// Job poster accepts application #2 with their original milestones
await lowjc.startJob(
  "40232-57",
  2,  // Application ID
  false,  // Use job poster's milestones
  lzOptions,
  { value: lzFee }
);

// Job now InProgress
// Milestone 1 is active
// Freelancer can start working`,
          relatedFunctions: ['applyToJob', 'submitWork', 'releasePaymentCrossChain']
        },
        {
          name: 'handleStartDirectContract',
          signature: 'handleStartDirectContract(address jobGiver, address jobTaker, string jobId, string jobDetailHash, string[] descriptions, uint256[] amounts, uint32 jobTakerChainDomain)',
          whatItDoes: 'Creates and immediately starts a job with a pre-selected freelancer in one atomic operation, bypassing the normal application process.',
          whyUse: 'For established client-freelancer relationships where terms are pre-agreed. Saves time and gas by skipping the application/selection phase.',
          howItWorks: [
            'Validates job doesn\'t exist',
            'Validates milestone arrays match',
            'Creates job in Genesis with provided milestones',
            'Automatically creates application for job taker',
            'Sets application ID to 1',
            'Immediately selects the job taker',
            'Sets job status to InProgress',
            'Sets current milestone to 1',
            'Copies milestones to finalMilestones',
            'Stores job taker\'s preferred payment chain',
            'Emits JobPosted, JobApplication, JobStarted, JobStatusChanged events'
          ],
          parameters: [
            { name: 'jobGiver', type: 'address', description: 'Job creator address' },
            { name: 'jobTaker', type: 'address', description: 'Pre-selected freelancer address' },
            { name: 'jobId', type: 'string', description: 'Unique job identifier' },
            { name: 'jobDetailHash', type: 'string', description: 'IPFS hash with job description' },
            { name: 'descriptions', type: 'string[]', description: 'Milestone descriptions' },
            { name: 'amounts', type: 'uint256[]', description: 'Milestone payment amounts' },
            { name: 'jobTakerChainDomain', type: 'uint32', description: 'CCTP domain where freelancer wants payments' }
          ],
          accessControl: 'Bridge-only: Can only be called by Native Bridge',
          events: [
            'JobPosted(jobId, jobGiver, jobDetailHash)',
            'JobApplication(jobId, 1, jobTaker, "direct-contract-auto-application")',
            'JobStarted(jobId, 1, jobTaker, false)',
            'JobStatusChanged(jobId, JobStatus.InProgress)'
          ],
          gasEstimate: '~78K gas',
          example: `// Client on Ethereum directly hires freelancer who wants payment on Base
await lowjc.startDirectContract(
  freelancerAddress,
  "QmDirect123...",
  ["Full project delivery"],
  [5000_000_000],  // 5000 USDC
  6,  // Base domain for payment
  lzOptions,
  { value: lzFee }
);

// Job created and started immediately
// Freelancer can begin work
// Payment will go to Base when released`,
          relatedFunctions: ['postJob', 'startJob', 'releasePaymentCrossChain']
        },
        {
          name: 'submitWork',
          signature: 'submitWork(address applicant, string jobId, string submissionHash)',
          whatItDoes: 'Allows freelancer to submit completed work for the current milestone by uploading proof to IPFS.',
          whyUse: 'Freelancers call this after completing a milestone to notify the client and provide deliverables for review.',
          howItWorks: [
            'Adds submission IPFS hash to job\'s work submissions array',
            'Retrieves current milestone number from job',
            'Emits WorkSubmitted event with milestone number',
            'Does not change job status (waits for client review)'
          ],
          parameters: [
            { name: 'applicant', type: 'address', description: 'Freelancer submitting work' },
            { name: 'jobId', type: 'string', description: 'Job identifier' },
            { name: 'submissionHash', type: 'string', description: 'IPFS hash with deliverables, screenshots, code, documentation, etc.' }
          ],
          accessControl: 'Public function, called by freelancer via bridge',
          events: [
            'WorkSubmitted(jobId, applicant, submissionHash, currentMilestone)'
          ],
          gasEstimate: '~28K gas',
          example: `// Freelancer submits milestone 1 work
await lowjc.submitWork(
  "40232-57",
  "QmWork123...",  // IPFS with deliverables
  lzOptions,
  { value: lzFee }
);

// Client can review and release payment`,
          relatedFunctions: ['releasePaymentCrossChain', 'releasePaymentAndLockNext']
        }
      ]
    },
    {
      category: 'Payment Functions',
      description: 'Functions for releasing escrowed USDC payments across chains via CCTP',
      items: [
        {
          name: 'releasePaymentCrossChain',
          signature: 'releasePaymentCrossChain(address jobGiver, string jobId, uint256 amount, uint32 targetChainDomain, address targetRecipient)',
          whatItDoes: 'Releases escrowed USDC payment to freelancer on any supported chain via Circle\'s CCTP, deducting platform commission and awarding OW tokens.',
          whyUse: 'This is the primary payment function. Job giver uses this after reviewing and approving submitted work. It handles commission, cross-chain transfer, reward distribution, and milestone progression in one transaction.',
          howItWorks: [
            'Validates job status is InProgress',
            'Validates amount exactly matches current milestone amount',
            'Calculates commission: max(1% of amount, $1 USDC)',
            'Deducts commission from payment (accumulates in contract)',
            'Approves CCTP Transceiver to spend net USDC amount',
            'Calls CCTP sendFast() to burn USDC on Arbitrum',
            'CCTP mints USDC on target chain for recipient',
            'Calls Native Rewards to calculate and award OW tokens',
            'Updates total paid in Genesis',
            'Increments milestone counter',
            'If final milestone: marks job as Completed',
            'Emits CommissionDeducted and PaymentReleased events'
          ],
          parameters: [
            { name: 'jobGiver', type: 'address', description: 'Job creator initiating payment' },
            { name: 'jobId', type: 'string', description: 'Job identifier' },
            { name: 'amount', type: 'uint256', description: 'Gross payment (before commission, must match milestone exactly)' },
            { name: 'targetChainDomain', type: 'uint32', description: 'CCTP domain: 0=Ethereum, 2=Optimism, 3=Arbitrum, 6=Base' },
            { name: 'targetRecipient', type: 'address', description: 'Freelancer address on target chain' }
          ],
          accessControl: 'Public function, callable by job giver or via bridge',
          events: [
            'CommissionDeducted(jobId, grossAmount, commission, netAmount)',
            'PaymentReleased(jobId, jobGiver, targetRecipient, netAmount, milestone)',
            'JobStatusChanged(jobId, JobStatus.Completed) [if final milestone]'
          ],
          gasEstimate: '~78K gas',
          example: `// Release 1000 USDC milestone payment to freelancer on Base
await lowjc.releasePaymentCrossChain(
  "40232-57",
  1000_000_000,  // 1000 USDC gross
  6,  // Base domain
  freelancerAddress,
  lzOptions,
  { value: lzFee }
);

// Commission: 10 USDC (1%)
// Freelancer receives: 990 USDC on Base
// OW tokens awarded automatically
// Milestone incremented to 2`,
          relatedFunctions: ['calculateCommission', 'releasePaymentAndLockNext', 'releaseDisputedFunds']
        },
        {
          name: 'releasePaymentAndLockNext',
          signature: 'releasePaymentAndLockNext(address jobGiver, string jobId, uint256 releasedAmount, uint256 lockedAmount)',
          whatItDoes: 'Releases payment for current milestone and immediately locks escrow for the next milestone in one atomic operation.',
          whyUse: 'Optimizes multi-milestone jobs by combining payment release + next milestone activation in a single transaction, saving gas and reducing friction.',
          howItWorks: [
            'Validates selected applicant exists',
            'Calculates and deducts commission from released amount',
            'Retrieves applicant\'s preferred payment chain',
            'If native chain (Arbitrum): transfers USDC directly',
            'If other chain: approves and calls CCTP sendFast()',
            'Updates total paid in Genesis (net amount)',
            'Calls Native Rewards for OW token distribution',
            'Increments current milestone counter',
            'If past final milestone: marks job Completed',
            'Emits CommissionDeducted and PaymentReleasedAndNextMilestoneLocked'
          ],
          parameters: [
            { name: 'jobGiver', type: 'address', description: 'Job creator' },
            { name: 'jobId', type: 'string', description: 'Job identifier' },
            { name: 'releasedAmount', type: 'uint256', description: 'Amount to release for completed milestone' },
            { name: 'lockedAmount', type: 'uint256', description: 'Amount locked for next milestone (informational)' }
          ],
          accessControl: 'Bridge-only: Called by Native Bridge',
          events: [
            'CommissionDeducted(jobId, releasedAmount, commission, netAmount)',
            'PaymentReleasedAndNextMilestoneLocked(jobId, netAmount, lockedAmount, currentMilestone)'
          ],
          gasEstimate: '~82K gas',
          example: `// Release milestone 1 (500 USDC) and activate milestone 2 (1000 USDC)
await nowjc.releasePaymentAndLockNext(
  jobGiverAddress,
  "40232-57",
  500_000_000,   // Release 500 USDC
  1000_000_000,  // Lock 1000 USDC for next
  { from: bridgeAddress }
);

// Milestone 1: 495 USDC sent to freelancer (after 5 USDC commission)
// Milestone 2: now active
// OW tokens awarded`,
          relatedFunctions: ['releasePaymentCrossChain', 'lockNextMilestone']
        },
        {
          name: 'releaseDisputedFunds',
          signature: 'releaseDisputedFunds(address recipient, uint256 amount, uint32 targetChainDomain)',
          whatItDoes: 'Releases disputed escrowed funds to the winner of an Athena dispute resolution vote, with commission deduction.',
          whyUse: 'Called by Native Athena after dispute voting concludes to transfer funds to the party that won the vote (either job giver or freelancer).',
          howItWorks: [
            'Validates caller is Native Athena contract',
            'Validates recipient and amount',
            'Calculates and deducts commission',
            'If target is Arbitrum (domain 3): direct USDC transfer',
            'If other chain: approves CCTP and calls sendFast()',
            'Accumulates commission in treasury',
            'Emits CommissionDeducted and DisputedFundsReleased events'
          ],
          parameters: [
            { name: 'recipient', type: 'address', description: 'Winner of the dispute (job giver or freelancer)' },
            { name: 'amount', type: 'uint256', description: 'Total amount to release (before commission)' },
            { name: 'targetChainDomain', type: 'uint32', description: 'CCTP domain where winner wants funds' }
          ],
          accessControl: 'Native Athena only: Can only be called by the dispute resolution contract',
          events: [
            'CommissionDeducted("dispute", amount, commission, netAmount)',
            'DisputedFundsReleased("dispute", recipient, targetChainDomain, netAmount)'
          ],
          gasEstimate: '~68K gas',
          example: `// Athena contract releases funds after vote
// (This is called automatically by Native Athena)
await nowjc.releaseDisputedFunds(
  winnerAddress,
  2000_000_000,  // 2000 USDC
  6,  // Winner wants payment on Base
  { from: nativeAthenaAddress }
);

// Commission: 20 USDC
// Winner receives: 1980 USDC on Base`,
          relatedFunctions: ['releasePaymentCrossChain', 'calculateCommission']
        }
      ]
    },
    {
      category: 'Commission Management',
      description: 'Functions for calculating, tracking, and withdrawing platform commission fees',
      items: [
        {
          name: 'calculateCommission',
          signature: 'calculateCommission(uint256 amount) view returns (uint256)',
          whatItDoes: 'Calculates the platform commission for a given payment amount: 1% or $1 minimum, whichever is higher.',
          whyUse: 'Always call this before payment to show users the exact fee they\'ll pay. Essential for transaction transparency.',
          howItWorks: [
            'Calculates 1% of amount: (amount * 100) / 10000',
            'Compares with minimum commission (1 USDC = 1e6)',
            'Returns the larger of the two values'
          ],
          parameters: [
            { name: 'amount', type: 'uint256', description: 'Gross payment amount to calculate commission for (6 decimals)' }
          ],
          accessControl: 'Public view function - anyone can call',
          events: ['None (view function)'],
          gasEstimate: 'N/A (view function)',
          example: `// Check commission before payment
const commission = await nowjc.calculateCommission(1000_000_000);
console.log(\`Commission: \${commission / 1e6} USDC\`);

// Examples:
// 1000 USDC → 10 USDC commission (1%)
// 50 USDC → 1 USDC commission (minimum)
// 10000 USDC → 100 USDC commission (1%)`,
          relatedFunctions: ['releasePaymentCrossChain', 'setCommissionPercentage', 'setMinCommission']
        },
        {
          name: 'withdrawCommission',
          signature: 'withdrawCommission(uint256 amount)',
          whatItDoes: 'Allows treasury to withdraw accumulated commission up to the specified amount.',
          whyUse: 'Treasury uses this to claim earned platform fees for protocol operations and sustainability.',
          howItWorks: [
            'Validates caller is treasury address',
            'Validates amount doesn\'t exceed accumulated commission',
            'Validates amount is greater than zero',
            'Deducts amount from accumulatedCommission',
            'Transfers USDC to treasury',
            'Emits CommissionWithdrawn event'
          ],
          parameters: [
            { name: 'amount', type: 'uint256', description: 'Amount of USDC to withdraw (6 decimals)' }
          ],
          accessControl: 'Treasury-only: Only the designated treasury address can call',
          events: [
            'CommissionWithdrawn(treasury, amount)'
          ],
          gasEstimate: '~35K gas',
          example: `// Treasury withdraws 500 USDC in commission
await nowjc.withdrawCommission(
  500_000_000,
  { from: treasuryAddress }
);

// Commission balance decreases by 500 USDC
// Treasury receives 500 USDC`,
          relatedFunctions: ['withdrawAllCommission', 'setTreasury', 'calculateCommission']
        },
        {
          name: 'withdrawAllCommission',
          signature: 'withdrawAllCommission()',
          whatItDoes: 'Withdraws all accumulated commission to the treasury in a single transaction.',
          whyUse: 'Convenient function for treasury to claim all available commission without specifying an amount.',
          howItWorks: [
            'Validates caller is treasury address',
            'Validates accumulated commission is greater than zero',
            'Stores commission amount in local variable',
            'Resets accumulatedCommission to zero',
            'Transfers all USDC to treasury',
            'Emits CommissionWithdrawn event'
          ],
          parameters: [],
          accessControl: 'Treasury-only: Only the designated treasury address can call',
          events: [
            'CommissionWithdrawn(treasury, amount)'
          ],
          gasEstimate: '~33K gas',
          example: `// Treasury claims all available commission
await nowjc.withdrawAllCommission({ from: treasuryAddress });

// All accumulated commission transferred to treasury
// accumulatedCommission reset to 0`,
          relatedFunctions: ['withdrawCommission', 'calculateCommission']
        }
      ]
    },
    {
      category: 'Rewards & Governance Integration',
      description: 'Functions for syncing reward and voting power data with the Main chain',
      items: [
        {
          name: 'syncRewardsData',
          signature: 'syncRewardsData(bytes options) payable',
          whatItDoes: 'Syncs user\'s claimable OW token balance to Main chain for cross-chain token claims.',
          whyUse: 'Users call this to make their earned tokens available for claiming on the Main chain where the OW token contract lives.',
          howItWorks: [
            'Validates Native Bridge is set',
            'Retrieves user\'s total claimable tokens from Native Rewards',
            'Validates user has claimable tokens',
            'Calls Native Bridge sendSyncRewardsData() with LayerZero fee',
            'Bridge sends message to Main chain',
            'Main Rewards records claimable amount',
            'Emits RewardsDataSynced event'
          ],
          parameters: [
            { name: 'options', type: 'bytes', description: 'LayerZero message options for gas and execution settings' }
          ],
          accessControl: 'Public payable - users pay LayerZero fee',
          events: [
            'RewardsDataSynced(user, syncType=1, claimableAmount, 0)'
          ],
          gasEstimate: '~42K gas + LayerZero fee',
          example: `// User syncs 500 OW tokens to claim on Main chain
const lzFee = await nativeBridge.quoteSendToMain(...);
await nowjc.syncRewardsData(
  lzOptions,
  { value: lzFee }
);

// Tokens now claimable on Main chain
// User can call Main Rewards.claimTokens()`,
          relatedFunctions: ['syncVotingPower', 'getUserEarnedTokens']
        },
        {
          name: 'syncVotingPower',
          signature: 'syncVotingPower(bytes options) payable',
          whatItDoes: 'Syncs user\'s total earned tokens to Main chain for governance voting power calculations.',
          whyUse: 'Users sync this before creating proposals or voting to ensure their voting power reflects their latest rewards.',
          howItWorks: [
            'Validates Native Bridge is set',
            'Retrieves user\'s total earned tokens from Native Rewards',
            'Validates user has earned tokens',
            'Calls Native Bridge sendSyncVotingPower() with LayerZero fee',
            'Bridge sends message to Main chain',
            'Main DAO updates user\'s voting power',
            'Emits RewardsDataSynced event'
          ],
          parameters: [
            { name: 'options', type: 'bytes', description: 'LayerZero message options' }
          ],
          accessControl: 'Public payable - users pay LayerZero fee',
          events: [
            'RewardsDataSynced(user, syncType=2, totalEarnedTokens, 0)'
          ],
          gasEstimate: '~40K gas + LayerZero fee',
          example: `// User syncs voting power before creating proposal
const lzFee = await nativeBridge.quoteSendToMain(...);
await nowjc.syncVotingPower(
  lzOptions,
  { value: lzFee }
);

// Voting power updated on Main chain
// User can now vote or create proposals`,
          relatedFunctions: ['syncRewardsData', 'incrementGovernanceAction']
        },
        {
          name: 'incrementGovernanceAction',
          signature: 'incrementGovernanceAction(address user)',
          whatItDoes: 'Records a governance action (vote, proposal creation) to increase user\'s future token rewards.',
          whyUse: 'Called automatically when users participate in governance to reward active participation.',
          howItWorks: [
            'Updates governance action count in OpenworkGenesis',
            'Calls Native Rewards to record action in current band',
            'Retrieves current band number for event',
            'Emits GovernanceActionIncremented event'
          ],
          parameters: [
            { name: 'user', type: 'address', description: 'Address that performed governance action' }
          ],
          accessControl: 'Bridge or authorized contracts',
          events: [
            'GovernanceActionIncremented(user, newCount, currentBand)'
          ],
          gasEstimate: '~32K gas',
          example: `// Automatically called when user votes on dispute
// Or when user creates/votes on DAO proposal
// (Not directly called by users)`,
          relatedFunctions: ['syncVotingPower', 'getUserGovernanceActions']
        }
      ]
    }
  ],
  
  dataFlows: [
    {
      title: 'Complete Job Lifecycle Flow',
      description: 'End-to-end flow of a job from posting to payment completion',
      steps: [
        { chain: 'Local Chain (e.g., Ethereum)', action: '1. User posts job via LOWJC with USDC escrow' },
        { chain: 'Local Chain', action: '2. USDC sent to Native chain via CCTP' },
        { chain: 'Local Chain', action: '3. Job data sent to Native chain via LayerZero' },
        { chain: 'Native Chain (Arbitrum)', action: '4. Native Bridge receives message' },
        { chain: 'Native Chain', action: '5. NOWJC.postJob() creates job in Genesis' },
        { chain: 'Native Chain', action: '6. Freelancer applies via NOWJC.applyToJob()' },
        { chain: 'Native Chain', action: '7. Job poster calls NOWJC.startJob()' },
        { chain: 'Native Chain', action: '8. Freelancer submits work via NOWJC.submitWork()' },
        { chain: 'Native Chain', action: '9. Job poster calls NOWJC.releasePaymentCrossChain()' },
        { chain: 'Native Chain', action: '10. Commission deducted (1% or $1 min)' },
        { chain: 'Native Chain', action: '11. CCTP burns USDC on Arbitrum' },
        { chain: 'Target Chain', action: '12. CCTP mints USDC for freelancer' },
        { chain: 'Native Chain', action: '13. Native Rewards calculates OW token awards' },
        { chain: 'Native Chain', action: '14. Genesis updated with payment & completion' }
      ]
    },
    {
      title: 'Cross-Chain Payment Release Flow',
      description: 'How payments are released from Native chain to any supported chain',
      steps: [
        { chain: 'Local Chain', action: 'Job giver calls LOWJC.releasePaymentCrossChain()' },
        { chain: 'Local Chain', action: 'Local Bridge sends LayerZero message' },
        { chain: 'Native Chain', action: 'Native Bridge receives and calls NOWJC' },
        { chain: 'Native Chain', action: 'NOWJC calculates commission (1% or $1)' },
        { chain: 'Native Chain', action: 'NOWJC approves CCTP Transceiver for net amount' },
        { chain: 'Native Chain', action: 'CCTP burns USDC on Arbitrum' },
        { chain: 'Target Chain', action: 'CCTP mints USDC for freelancer' },
        { chain: 'Native Chain', action: 'Native Rewards awards OW tokens to participants' },
        { chain: 'Native Chain', action: 'Genesis updated with payment record' }
      ]
    },
    {
      title: 'Dispute Resolution Payment Flow',
      description: 'How disputed funds are released after Athena voting',
      steps: [
        { chain: 'Native Chain', action: 'Dispute raised via Native Athena' },
        { chain: 'Native Chain', action: 'Oracle members vote on outcome' },
        { chain: 'Native Chain', action: 'Athena finalizes dispute with winner' },
        { chain: 'Native Chain', action: 'Athena calls NOWJC.releaseDisputedFunds()' },
        { chain: 'Native Chain', action: 'NOWJC calculates commission' },
        { chain: 'Native/Target Chain', action: 'Funds released via CCTP to winner' },
        { chain: 'Native Chain', action: 'Commission accumulated in treasury' }
      ]
    }
  ],
  
  integrationGuide: {
    example: `// Complete NOWJC Integration Example
// This shows common patterns for working with NOWJC

const { ethers } = require('ethers');

// 1. Setup contracts
const nowjc = new ethers.Contract(nowjcAddress, nowjcABI, signer);
const nativeBridge = new ethers.Contract(bridgeAddress, bridgeABI, signer);

// 2. Calculate commission before payment
const paymentAmount = ethers.parseUnits('1000', 6); // 1000 USDC
const commission = await nowjc.calculateCommission(paymentAmount);
const netAmount = paymentAmount - commission;

console.log(\`Gross: \${ethers.formatUnits(paymentAmount, 6)} USDC\`);
console.log(\`Commission: \${ethers.formatUnits(commission, 6)} USDC\`);
console.log(\`Net to freelancer: \${ethers.formatUnits(netAmount, 6)} USDC\`);

// 3. Get job details
const jobId = "40232-57";
const job = await openworkGenesis.getJob(jobId);
console.log(\`Job Status: \${job.status}\`); // 0=Open, 1=InProgress, 2=Completed
console.log(\`Current Milestone: \${job.currentMilestone}\`);
console.log(\`Total Paid: \${ethers.formatUnits(job.totalPaid, 6)} USDC\`);

// 4. Release payment (via LOWJC on Local chain)
const targetChain = 6; // Base Sepolia
const lzOptions = ethers.solidityPacked(
  ['uint16', 'uint256'],
  [1, 200000] // version 1, 200K gas
);

const lzFee = await localBridge.quoteSendToNative(
  jobId,
  paymentAmount,
  targetChain,
  freelancerAddress,
  lzOptions
);

const tx = await lowjc.releasePaymentCrossChain(
  jobId,
  paymentAmount,
  targetChain,
  freelancerAddress,
  lzOptions,
  { value: lzFee }
);

await tx.wait();
console.log('Payment released successfully!');

// 5. Sync rewards for claiming
const syncLzFee = await nativeBridge.quoteSendToMain(userAddress, lzOptions);
await nowjc.syncRewardsData(lzOptions, { value: syncLzFee });

console.log('Rewards synced to Main chain for claiming');`,
    tips: [
      'Always call calculateCommission() before payment to show users exact fees',
      'Validate amount matches current milestone exactly before releasing payment',
      'Use CCTP domain codes correctly: 0=Ethereum, 2=Optimism, 3=Arbitrum, 6=Base',
      'Ensure freelancer\'s preferred payment chain is set during application',
      'Sync rewards data regularly to keep Main chain claims up to date',
      'Monitor CommissionDeducted events to track platform revenue',
      'Check job.currentMilestone to know which payment is being released',
      'For direct contracts, use handleStartDirectContract to skip application phase',
      'Always wait for LayerZero message confirmation before assuming completion',
      'Treasury should regularly withdraw commission to prevent accumulation'
    ]
  },
  
  securityConsiderations: [
    'UUPS upgradeable - owner and bridge can upgrade implementation',
    'Bridge-only functions prevent unauthorized cross-chain message execution',
    'Commission is always deducted before payments to ensure platform sustainability',
    'Amount validation prevents overpayment or milestone amount mismatches',
    'CCTP approve pattern prevents stuck funds in transceiver',
    'Native Athena-only access for dispute fund releases',
    'Treasury-only access for commission withdrawals',
    'All state stored in OpenworkGenesis for upgradeable persistence',
    'Milestone guard prevents payment release for wrong milestone',
    'Job status checks ensure payments only in InProgress jobs',
    'Accumulated commission tracking prevents double-withdrawal'
  ],
  
  code: `// Full implementation available in: contracts/openwork-full-contract-suite-layerzero+CCTP 2 Dec/nowjc.sol
// This is a truncated version showing key structure - see repository for complete code

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import { UUPSUpgradeable } from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import { OwnableUpgradeable } from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract NativeOpenWorkJobContract is 
    Initializable,
    OwnableUpgradeable,
    UUPSUpgradeable
{
    using SafeERC20 for IERC20;
    
    // ==================== STATE VARIABLES ====================
    IOpenworkGenesis public genesis;
    IOpenWorkRewards public rewardsContract;
    address public bridge;
    IERC20 public usdtToken;
    address public cctpReceiver;
    address public cctpTransceiver;
    address public nativeAthena;
    address public treasury;
    uint256 public accumulatedCommission;
    uint256 public commissionPercentage = 100; // 1% in basis points
    uint256 public minCommission = 1e6; // 1 USDC
    
    // ==================== CORE FUNCTIONS ====================
    
    function initialize(
        address _owner, 
        address _bridge, 
        address _genesis,
        address _rewardsContract,
        address _usdtToken,
        address _cctpReceiver
    ) public initializer {
        __Ownable_init(_owner);
        __UUPSUpgradeable_init();
        bridge = _bridge;
        genesis = IOpenworkGenesis(_genesis);
        rewardsContract = IOpenWorkRewards(_rewardsContract);
        usdtToken = IERC20(_usdtToken);
        cctpReceiver = _cctpReceiver;
    }
    
    function postJob(
        string memory _jobId, 
        address _jobGiver, 
        string memory _jobDetailHash, 
        string[] memory _descriptions, 
        uint256[] memory _amounts
    ) external {
        require(!genesis.jobExists(_jobId), "Job exists");
        require(_descriptions.length == _amounts.length, "Length mismatch");
        
        genesis.setJob(_jobId, _jobGiver, _jobDetailHash, _descriptions, _amounts);
        emit JobPosted(_jobId, _jobGiver, _jobDetailHash);
    }
    
    function applyToJob(
        address _applicant, 
        string memory _jobId, 
        string memory _applicationHash, 
        string[] memory _descriptions, 
        uint256[] memory _amounts, 
        uint32 _preferredChainDomain
    ) external {
        genesis.addJobApplicant(_jobId, _applicant);
        uint256 applicationId = genesis.getJobApplicationCount(_jobId) + 1;
        genesis.setJobApplication(
            _jobId, 
            applicationId, 
            _applicant, 
            _applicationHash, 
            _descriptions, 
            _amounts, 
            _preferredChainDomain, 
            _applicant
        );
        jobApplicantChainDomain[_jobId][_applicant] = _preferredChainDomain;
        emit JobApplication(_jobId, applicationId, _applicant, _applicationHash);
    }
    
    function releasePaymentCrossChain(
        address _jobGiver, 
        string memory _jobId, 
        uint256 _amount,
        uint32 _targetChainDomain,
        address _targetRecipient
    ) public {
        IOpenworkGenesis.Job memory job = genesis.getJob(_jobId);
        require(job.selectedApplicant != address(0), "No applicant");
        
        // Calculate and deduct commission
        uint256 commission = calculateCommission(_amount);
        uint256 netAmount = _amount - commission;
        accumulatedCommission += commission;
        
        // Approve and send via CCTP
        bytes32 mintRecipient = bytes32(uint256(uint160(_targetRecipient)));
        usdtToken.approve(cctpTransceiver, netAmount);
        ICCTPTransceiver(cctpTransceiver).sendFast(
            netAmount,
            _targetChainDomain,
            mintRecipient,
            1000
        );
        
        // Process rewards and update state
        _processRewardsForPayment(_jobGiver, _jobId, netAmount);
        genesis.updateJobTotalPaid(_jobId, netAmount);
        genesis.setJobCurrentMilestone(_jobId, job.currentMilestone + 1);
        
        emit CommissionDeducted(_jobId, _amount, commission, netAmount);
        emit PaymentReleased(_jobId, _jobGiver, _targetRecipient, netAmount, job.currentMilestone);
    }
    
    function calculateCommission(uint256 amount) public view returns (uint256) {
        uint256 percentCommission = (amount * commissionPercentage) / 10000;
        return percentCommission > minCommission ? percentCommission : minCommission;
    }
    
    function releaseDisputedFunds(
        address _recipient,
        uint256 _amount,
        uint32 _targetChainDomain
    ) external {
        require(_recipient != address(0), "Invalid recipient");
        uint256 commission = calculateCommission(_amount);
        uint256 netAmount = _amount - commission;
        accumulatedCommission += commission;
        
        if (_targetChainDomain == 3) {
            usdtToken.safeTransfer(_recipient, netAmount);
        } else {
            usdtToken.approve(cctpTransceiver, netAmount);
            ICCTPTransceiver(cctpTransceiver).sendFast(
                netAmount,
                _targetChainDomain,
                bytes32(uint256(uint160(_recipient))),
                1000
            );
        }
        
        emit DisputedFundsReleased("dispute", _recipient, _targetChainDomain, netAmount);
    }
    
    // ... Additional functions for job management, rewards, commission, etc.
    // See full implementation in repository
}`,

  deployConfig: {
    type: 'uups',
    constructor: [
      { 
        name: 'initialOwner',
        type: 'address',
        default: 'WALLET',
        description: 'Address that will own the NOWJC contract',
        placeholder: '0x...'
      },
      {
        name: 'bridge',
        type: 'address',
        description: 'Native Bridge address for cross-chain messages',
        placeholder: '0x3b2AC1d1281cA4a1188d9F09A5Af9a9E6a114D6c'
      },
      {
        name: 'genesis',
        type: 'address',
        description: 'OpenworkGenesis contract address',
        placeholder: '0x1f23683C748fA1AF99B7263dea121eCc5Fe7564C'
      },
      {
        name: 'rewardsContract',
        type: 'address',
        description: 'Native Rewards contract address',
        placeholder: '0x947cAd64a26Eae5F82aF68b7Dbf8b457a8f492De'
      },
      {
        name: 'usdtToken',
        type: 'address',
        description: 'USDC token address on Arbitrum Sepolia',
        placeholder: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d'
      },
      {
        name: 'cctpReceiver',
        type: 'address',
        description: 'CCTP Transceiver address for cross-chain USDC',
        placeholder: '0xB64f20A20F55D77bbe708Db107AA5E53a9e39063'
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
    estimatedGas: '4.5M',
    postDeploy: {
      message: 'NOWJC Implementation deployed! Deploy proxy and initialize on block scanner.',
      nextSteps: [
        'Deploy implementation (no params)',
        'Deploy proxy with implementation address',
        'Call initialize() on proxy with: owner, bridge, genesis, rewards, usdc, cctpReceiver',
        'Set CCTP Transceiver address',
        'Set Native Athena address',
        'Set Treasury address',
        'Authorize in OpenworkGenesis',
        'Verify both contracts on Arbiscan'
      ]
    }
  }
};
