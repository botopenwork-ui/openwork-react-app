export const lowjcOP = {
  id: 'lowjcOP',
  name: 'LOWJC',
  chain: 'op',
  column: 'op-main',
  order: 0,
  status: 'testnet',
  version: 'v1.0.0',
  gas: '23K',
  mainnetNetwork: 'Optimism',
  testnetNetwork: 'OP Sepolia',
  mainnetDeployed: 'Not deployed',
  testnetDeployed: 'Deployed',
  mainnetAddress: null,
  testnetAddress: '0x896a3Bc6ED01f549Fe20bD1F25067951913b793C',
  tvl: 'N/A',
  docs: 'Local OpenWork Job Contract (LOWJC) on OP Sepolia - User-facing job management interface. Enables job posting, applications, work submission, and payments. Syncs all data to Native Chain (Arbitrum) via LayerZero + CCTP for unified state and USDC escrow.',
  
  overview: {
    purpose: 'LOWJC on OP Sepolia is the primary user interface for the OpenWork platform. Users post jobs with USDC on OP, which LOWJC splits into two parallel flows: (1) Job metadata sent via Local Bridge to NOWJC on Arbitrum for storage in Genesis, and (2) USDC sent via CCTP to NOWJC for escrow. This dual-channel architecture enables cross-chain job management while keeping funds secure on Arbitrum. Users can post jobs on OP but pay workers on any supported chain (Ethereum, Polygon, Base, etc.) through NOWJC\'s cross-chain payment capabilities.',
    tier: 'Local Chain (OP Sepolia)',
    category: 'Job Management - User Gateway',
    upgradeability: 'UUPS Upgradeable (owner or bridge authorized)'
  },
  
  features: [
    'Job posting with USDC escrow via CCTP',
    'Cross-chain job synchronization to Arbitrum via LayerZero',
    'Job applications with custom milestone proposals',
    'Direct contract mode (skip application process)',
    'Work submission with IPFS content hashes',
    'Cross-chain payment release to any supported chain',
    'Milestone-based payment system',
    'Job giver and applicant rating system',
    'Profile management with portfolio support',
    'Dispute resolution integration with Athena',
    'Automatic platform total tracking for rewards',
    'DAO-authorized upgrades via bridge',
    'UUPS proxy pattern for future improvements',
    'Same contract deployed on multiple Local chains'
  ],
  
  systemPosition: {
    description: 'LOWJC sits at the user-facing tier as the entry point for all job activities on OP Sepolia. When users post jobs, LOWJC coordinates two independent but synchronized operations: (1) sends job data through Local Bridge to Native Bridge to NOWJC for storage in Genesis, and (2) burns USDC through CCTP Transceiver which mints on Arbitrum for NOWJC escrow. This separation of concerns allows job data to flow instantly via LayerZero while USDC follows Circle\'s attestation-based CCTP protocol. The same LOWJC contract is deployed identically on Ethereum, Polygon, Base, etc., with only addresses and chain IDs differing.',
    diagram: `
📍 LOWJC (OP) in OpenWork Architecture

┌─────────────────────────────────────────────────────────┐
│  LOCAL CHAIN: OP SEPOLIA ⭐ (YOU ARE HERE)              │
│  User-Facing Job Interface                              │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ⭐ LOWJC (Local OpenWork Job Contract)                │
│     ├─> postJob() - Create new job                     │
│     ├─> applyToJob() - Submit application              │
│     ├─> startJob() - Job giver accepts applicant       │
│     ├─> submitWork() - Job taker submits deliverable   │
│     └─> releasePaymentCrossChain() - Pay job taker     │
│                                                          │
│  Dependencies on OP:                                     │
│  ├─> Local Bridge (LayerZero messaging)                │
│  ├─> CCTP Transceiver (USDC burns/mints)               │
│  ├─> Athena Client (dispute interface)                 │
│  └─> USDC Token (payment currency)                     │
│                                                          │
└─────────────┬───────────────────┬───────────────────────┘
              │                   │
    (1) Job Data          (2) USDC Transfer
    LayerZero             CCTP Protocol
              │                   │
              ↓                   ↓
┌─────────────────────────────────────────────────────────┐
│  NATIVE CHAIN: ARBITRUM SEPOLIA                         │
│  Central Processing Hub                                  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ├─> Native Bridge (receives LayerZero messages)       │
│  │    └─> Routes to NOWJC                              │
│  │                                                      │
│  ├─> CCTP Transceiver (receives USDC mints)            │
│  │    └─> Mints USDC to NOWJC                          │
│  │                                                      │
│  ⭐ NOWJC (Native OpenWork Job Contract)               │
│     ├─> Stores job data in Genesis                     │
│     ├─> Holds USDC escrow from all chains              │
│     ├─> Processes applications                          │
│     ├─> Releases payments cross-chain                   │
│     └─> Calculates OW token rewards                    │
│                                                          │
│  ├─> Genesis (persistent job/profile storage)          │
│  ├─> Native Rewards (OW token distribution)            │
│  └─> Native Athena (dispute resolution)                │
│                                                          │
└─────────────────────────────────────────────────────────┘

Complete Job Posting Flow:

1. User on OP → LOWJC.postJob(100 USDC)
   
2. LOWJC splits into TWO parallel operations:

   A. JOB DATA PATH (LayerZero):
      LOWJC → Local Bridge.sendToNativeChain()
      → Native Bridge._lzReceive()
      → NOWJC.postJob()
      → Genesis.setJob() ✓

   B. USDC PATH (CCTP):
      LOWJC.sendFunds() → CCTP Transceiver (OP).sendFast()
      → Burns 100 USDC on OP
      → Circle generates attestation
      → Backend polls Circle API
      → CCTP Transceiver (Arb).receive()
      → Mints 100 USDC to NOWJC ✓

3. Result: Job visible on ALL chains, funds secure on Arbitrum

Key Benefits:
✓ Post once on OP, visible everywhere
✓ Pay workers on any supported chain  
✓ Native USDC (no wrapped tokens)
✓ Unified state via Genesis
✓ Instant job data sync via LayerZero
✓ Secure escrow on Arbitrum`
  },
  
  dependencies: {
    dependsOn: [
      { 
        name: 'Local Bridge (OP)', 
        reason: 'Sends job data, applications, work submissions to Native Chain via LayerZero messages.',
        type: 'Bridge Infrastructure'
      },
      { 
        name: 'CCTP Transceiver (OP)', 
        reason: 'Burns USDC on OP and initiates mint on Arbitrum for job escrow.',
        type: 'Payment Infrastructure'
      },
      { 
        name: 'USDC Token', 
        reason: 'Payment currency for jobs. LOWJC approves CCTP for burns.',
        type: 'Token'
      },
      { 
        name: 'Athena Client (OP)', 
        reason: 'Local dispute interface. Can call LOWJC.resolveDispute() after resolution.',
        type: 'Dispute Resolution'
      }
    ],
    requiredBy: [
      { 
        name: 'NOWJC (Arbitrum)', 
        reason: 'Receives job postings, applications, and work submissions from LOWJC via bridge.',
        type: 'Job Management'
      },
      { 
        name: 'Native Bridge', 
        reason: 'Processes all cross-chain messages from LOWJC.',
        type: 'Bridge Infrastructure'
      },
      { 
        name: 'Frontend dApp', 
        reason: 'Users interact with LOWJC to post jobs, apply, submit work, and manage payments.',
        type: 'Application Layer'
      }
    ],
    prerequisites: [
      'UUPS Proxy deployed on OP Sepolia',
      'Implementation contract deployed',
      'Local Bridge address configured',
      'CCTP Transceiver address configured',
      'USDC token address configured',
      'Chain ID set (OP Sepolia)',
      'CCTP mint recipient (NOWJC on Arbitrum) configured',
      'Athena Client address configured',
      'LayerZero V2 Endpoint active on OP'
    ]
  },
  
  functions: [
    {
      category: 'Profile Management',
      description: 'User profile creation and portfolio management',
      items: [
        {
          name: 'createProfile',
          signature: 'createProfile(string _ipfsHash, address _referrerAddress, bytes _nativeOptions) payable',
          whatItDoes: 'Creates user profile on OP and syncs to Native Chain for unified identity.',
          whyUse: 'Required before posting jobs or applying. Enables referral tracking and portfolio building.',
          howItWorks: [
            '1. Validates user doesn\'t have existing profile',
            '2. Creates profile locally with IPFS hash and referrer',
            '3. Sends profile data to Native Chain via bridge',
            '4. NOWJC stores in Genesis for cross-chain visibility',
            '5. Emits ProfileCreated event'
          ],
          parameters: [
            { name: '_ipfsHash', type: 'string', description: 'IPFS hash containing profile data (name, bio, skills, etc.)' },
            { name: '_referrerAddress', type: 'address', description: 'Address of referring user (for referral rewards)' },
            { name: '_nativeOptions', type: 'bytes', description: 'LayerZero options for Native Chain message' }
          ],
          accessControl: 'Public (one profile per address)',
          events: ['ProfileCreated(user, ipfsHash, referrer)'],
          gasEstimate: '~60K gas + LayerZero fee',
          example: `const ipfsHash = "QmX7s2..."; // Profile data uploaded to IPFS
const referrer = "0x742d35..."; // Referrer address
const lzOptions = ethers.solidityPacked(["uint16", "uint256"], [1, 200000]);

await lowjc.createProfile(
  ipfsHash,
  referrer,
  lzOptions,
  { value: ethers.parseEther("0.001") } // LayerZero fee
);`,
          relatedFunctions: ['updateProfile', 'addPortfolio']
        },
        {
          name: 'updateProfile',
          signature: 'updateProfile(string _newIpfsHash, bytes _nativeOptions) payable',
          whatItDoes: 'Updates user profile IPFS hash on OP and syncs to Native Chain.',
          whyUse: 'Allows users to update their profile information (bio, skills, etc.) after initial creation.',
          howItWorks: [
            '1. Validates user has existing profile',
            '2. Updates profile IPFS hash locally',
            '3. Sends update to Native Chain via bridge',
            '4. NOWJC updates in Genesis',
            '5. Emits ProfileUpdated event'
          ],
          parameters: [
            { name: '_newIpfsHash', type: 'string', description: 'New IPFS hash with updated profile data' },
            { name: '_nativeOptions', type: 'bytes', description: 'LayerZero options' }
          ],
          accessControl: 'Public (own profile only)',
          events: ['ProfileUpdated(user, newIpfsHash)'],
          gasEstimate: '~50K gas + LayerZero fee',
          example: `const newProfileHash = "QmNewProfile...";
await lowjc.updateProfile(newProfileHash, lzOptions, { value: lzFee });`,
          relatedFunctions: ['createProfile', 'addPortfolio']
        },
        {
          name: 'addPortfolio',
          signature: 'addPortfolio(string _portfolioHash, bytes _nativeOptions) payable',
          whatItDoes: 'Adds portfolio item to user profile.',
          whyUse: 'Build portfolio showcasing previous work, projects, or achievements.',
          howItWorks: [
            '1. Validates user has profile',
            '2. Adds portfolio hash to local profile array',
            '3. Sends to Native Chain via bridge',
            '4. NOWJC adds to Genesis profile',
            '5. Emits PortfolioAdded event'
          ],
          parameters: [
            { name: '_portfolioHash', type: 'string', description: 'IPFS hash with portfolio item details' },
            { name: '_nativeOptions', type: 'bytes', description: 'LayerZero options' }
          ],
          accessControl: 'Public (own profile only)',
          events: ['PortfolioAdded(user, portfolioHash)'],
          gasEstimate: '~45K gas + LayerZero fee',
          example: `const portfolio = "QmPortfolio1...";
await lowjc.addPortfolio(portfolio, lzOptions, { value: lzFee });`,
          relatedFunctions: ['updatePortfolioItem', 'removePortfolioItem']
        },
        {
          name: 'updatePortfolioItem',
          signature: 'updatePortfolioItem(uint256 _index, string _newPortfolioHash, bytes _nativeOptions) payable',
          whatItDoes: 'Updates existing portfolio item at specified index.',
          whyUse: 'Edit portfolio entries to reflect updates or corrections.',
          howItWorks: [
            '1. Validates profile exists and index is valid',
            '2. Updates portfolio item at index',
            '3. Syncs to Native Chain',
            '4. Emits PortfolioItemUpdated event'
          ],
          parameters: [
            { name: '_index', type: 'uint256', description: 'Array index of portfolio item to update' },
            { name: '_newPortfolioHash', type: 'string', description: 'New IPFS hash for portfolio item' },
            { name: '_nativeOptions', type: 'bytes', description: 'LayerZero options' }
          ],
          accessControl: 'Public (own profile only)',
          events: ['PortfolioItemUpdated(user, index, newPortfolioHash)'],
          gasEstimate: '~45K gas + LayerZero fee',
          example: `await lowjc.updatePortfolioItem(0, "QmUpdated...", lzOptions, { value: lzFee });`,
          relatedFunctions: ['addPortfolio', 'removePortfolioItem']
        },
        {
          name: 'removePortfolioItem',
          signature: 'removePortfolioItem(uint256 _index, bytes _nativeOptions) payable',
          whatItDoes: 'Removes portfolio item at specified index.',
          whyUse: 'Clean up outdated or unwanted portfolio entries.',
          howItWorks: [
            '1. Validates profile and index',
            '2. Removes item (moves last to index, pops)',
            '3. Syncs removal to Native Chain',
            '4. Emits PortfolioItemRemoved event'
          ],
          parameters: [
            { name: '_index', type: 'uint256', description: 'Array index to remove' },
            { name: '_nativeOptions', type: 'bytes', description: 'LayerZero options' }
          ],
          accessControl: 'Public (own profile only)',
          events: ['PortfolioItemRemoved(user, index)'],
          gasEstimate: '~40K gas + LayerZero fee',
          example: `await lowjc.removePortfolioItem(2, lzOptions, { value: lzFee });`,
          relatedFunctions: ['addPortfolio', 'updatePortfolioItem']
        }
      ]
    },
    {
      category: 'Job Posting',
      description: 'Create jobs with milestone-based payments',
      items: [
        {
          name: 'postJob',
          signature: 'postJob(string _jobDetailHash, string[] _descriptions, uint256[] _amounts, bytes _nativeOptions) payable',
          whatItDoes: 'Posts new job on OP with USDC milestones, syncs to Arbitrum for storage and escrow.',
          whyUse: 'Job givers use this to create freelance jobs with defined milestones and payments.',
          howItWorks: [
            '1. Validates milestone arrays match (descriptions + amounts)',
            '2. Generates unique jobId: "chainId-jobCounter"',
            '3. Creates job locally with Open status',
            '4. Sends job data to Native via bridge',
            '5. NOWJC stores in Genesis, visible on all chains',
            '6. No USDC sent yet (escrow happens at startJob)',
            '7. Emits JobPosted and JobStatusChanged events'
          ],
          parameters: [
            { name: '_jobDetailHash', type: 'string', description: 'IPFS hash with job title, description, requirements, etc.' },
            { name: '_descriptions', type: 'string[]', description: 'Array of milestone description hashes' },
            { name: '_amounts', type: 'uint256[]', description: 'Array of USDC amounts per milestone (6 decimals)' },
            { name: '_nativeOptions', type: 'bytes', description: 'LayerZero options' }
          ],
          accessControl: 'Public (requires profile)',
          events: ['JobPosted(jobId, jobGiver, jobDetailHash)', 'JobStatusChanged(jobId, Open)'],
          gasEstimate: '~80K gas + LayerZero fee',
          example: `const jobDetails = "QmY8..."; // IPFS hash
const milestones = [
  "QmZ1...", // Milestone 1: Design mockups
  "QmZ2...", // Milestone 2: Frontend implementation  
  "QmZ3..."  // Milestone 3: Testing & deployment
];
const amounts = [
  ethers.parseUnits("100", 6), // 100 USDC
  ethers.parseUnits("300", 6), // 300 USDC
  ethers.parseUnits("100", 6)  // 100 USDC
]; // Total: 500 USDC

const lzOptions = ethers.solidityPacked(["uint16", "uint256"], [1, 200000]);

await lowjc.postJob(
  jobDetails,
  milestones,
  amounts,
  lzOptions,
  { value: ethers.parseEther("0.001") }
);

// Result: Job created with ID "10232-1" (chainId-jobCounter)
// Visible on all chains via Genesis
// Status: Open (ready for applications)`,
          relatedFunctions: ['startJob', 'startDirectContract']
        }
      ]
    },
    {
      category: 'Job Applications',
      description: 'Apply to jobs with custom milestone proposals',
      items: [
        {
          name: 'applyToJob',
          signature: 'applyToJob(string _jobId, string _appHash, string[] _descriptions, uint256[] _amounts, uint32 _preferredChainDomain, bytes _nativeOptions) payable',
          whatItDoes: 'Submits job application with optional custom milestones and preferred payment chain.',
          whyUse: 'Job takers apply to jobs, propose their own milestones, and specify where they want to receive payments.',
          howItWorks: [
            '1. Requires applicant has profile',
            '2. Creates application locally with proposed milestones',
            '3. Stores preferred chain domain for payments',
            '4. Sends application to Native via bridge',
            '5. NOWJC stores in Genesis',
            '6. Job giver reviews on any chain',
            '7. Emits JobApplication event'
          ],
          parameters: [
            { name: '_jobId', type: 'string', description: 'Job ID to apply to (e.g., "10232-1")' },
            { name: '_appHash', type: 'string', description: 'IPFS hash with cover letter, portfolio links, etc.' },
            { name: '_descriptions', type: 'string[]', description: 'Proposed milestone hashes (can differ from job)' },
            { name: '_amounts', type: 'uint256[]', description: 'Proposed milestone amounts' },
            { name: '_preferredChainDomain', type: 'uint32', description: 'CCTP domain for payments (0=ETH, 2=OP, 3=Arb, 6=Base)' },
            { name: '_nativeOptions', type: 'bytes', description: 'LayerZero options' }
          ],
          accessControl: 'Public (requires profile, cannot apply twice)',
          events: ['JobApplication(jobId, applicationId, applicant, applicationHash)'],
          gasEstimate: '~70K gas + LayerZero fee',
          example: `const jobId = "10232-1";
const coverLetter = "QmA5..."; // IPFS
const proposedMilestones = [
  "QmB1...", // My milestone 1
  "QmB2..."  // My milestone 2
];
const proposedAmounts = [
  ethers.parseUnits("250", 6),
  ethers.parseUnits("250", 6)
];
const preferredChain = 2; // OP Sepolia (want payment on OP)

await lowjc.applyToJob(
  jobId,
  coverLetter,
  proposedMilestones,
  proposedAmounts,
  preferredChain,
  lzOptions,
  { value: ethers.parseEther("0.001") }
);`,
          relatedFunctions: ['startJob']
        }
      ]
    },
    {
      category: 'Job Execution',
      description: 'Start jobs, submit work, and release payments',
      items: [
        {
          name: 'startJob',
          signature: 'startJob(string _jobId, uint256 _appId, bool _useAppMilestones, bytes _nativeOptions) payable',
          whatItDoes: 'Job giver accepts application, locks first milestone USDC, starts work.',
          whyUse: 'Transitions job from Open to InProgress, escrows first milestone on Arbitrum.',
          howItWorks: [
            '1. Validates job exists and is Open',
            '2. Validates job giver is caller',
            '3. Selects application, updates status to InProgress',
            '4. Sets finalMilestones (job giver\'s or applicant\'s)',
            '5. Sends first milestone USDC via CCTP to Arbitrum',
            '6. CCTP burns USDC on OP, mints on Arbitrum to NOWJC',
            '7. Sends job start message to Native via bridge',
            '8. Emits JobStarted and JobStatusChanged events'
          ],
          parameters: [
            { name: '_jobId', type: 'string', description: 'Job ID' },
            { name: '_appId', type: 'uint256', description: 'Application ID to accept' },
            { name: '_useAppMilestones', type: 'bool', description: 'true = use applicant milestones, false = use original' },
            { name: '_nativeOptions', type: 'bytes', description: 'LayerZero options' }
          ],
          accessControl: 'Job giver only',
          events: ['JobStarted(jobId, appId, applicant, useAppMilestones)', 'JobStatusChanged(jobId, InProgress)'],
          gasEstimate: '~120K gas + LayerZero fee',
          example: `const jobId = "10232-1";
const applicationId = 3; // Selected applicant
const useTheirMilestones = true; // Accept their proposal

// Approve USDC first
const firstMilestone = ethers.parseUnits("100", 6);
await usdc.approve(lowjcAddress, firstMilestone);

await lowjc.startJob(
  jobId,
  applicationId,
  useTheirMilestones,
  lzOptions,
  { value: ethers.parseEther("0.001") }
);

// Result:
// - Job status: Open → InProgress
// - 100 USDC burned on OP
// - 100 USDC minted to NOWJC on Arbitrum
// - Job taker can now start work`,
          relatedFunctions: ['submitWork', 'releasePaymentCrossChain']
        },
        {
          name: 'submitWork',
          signature: 'submitWork(string _jobId, string _submissionHash, bytes _nativeOptions) payable',
          whatItDoes: 'Job taker submits completed work for current milestone.',
          whyUse: 'Notifies job giver that milestone deliverable is ready for review.',
          howItWorks: [
            '1. Validates job is InProgress',
            '2. Validates caller is selected applicant',
            '3. Adds submission hash to job',
            '4. Sends submission to Native via bridge',
            '5. Job giver reviews and releases payment if satisfied',
            '6. Emits WorkSubmitted event'
          ],
          parameters: [
            { name: '_jobId', type: 'string', description: 'Job ID' },
            { name: '_submissionHash', type: 'string', description: 'IPFS hash with deliverable files, demo links, etc.' },
            { name: '_nativeOptions', type: 'bytes', description: 'LayerZero options' }
          ],
          accessControl: 'Selected applicant only',
          events: ['WorkSubmitted(jobId, applicant, submissionHash, milestone)'],
          gasEstimate: '~50K gas + LayerZero fee',
          example: `const jobId = "10232-1";
const deliverable = "QmC7..."; // IPFS with completed work

await lowjc.submitWork(
  jobId,
  deliverable,
  lzOptions,
  { value: ethers.parseEther("0.001") }
);`,
          relatedFunctions: ['releasePaymentCrossChain']
        },
        {
          name: 'releasePaymentCrossChain',
          signature: 'releasePaymentCrossChain(string _jobId, uint32 _targetChainDomain, address _targetRecipient, bytes _nativeOptions) payable',
          whatItDoes: 'Job giver releases payment to job taker on their preferred chain.',
          whyUse: 'Pays job taker after work approval, can send to any supported chain.',
          howItWorks: [
            '1. Validates job giver is caller',
            '2. Validates job is InProgress with locked funds',
            '3. Validates target recipient address',
            '4. Updates local job state (clear locked amount)',
            '5. Increments milestone counter',
            '6. Sends cross-chain payment request to Native',
            '7. NOWJC on Arbitrum:',
            '   - Deducts 1% commission',
            '   - Sends USDC via CCTP to target chain',
            '   - Calculates OW token rewards',
            '   - Updates Genesis',
            '8. Marks job Completed if last milestone',
            '9. Emits PaymentReleased event'
          ],
          parameters: [
            { name: '_jobId', type: 'string', description: 'Job ID' },
            { name: '_targetChainDomain', type: 'uint32', description: 'CCTP domain (0=ETH, 2=OP, 3=Arb, 6=Base, 7=Polygon)' },
            { name: '_targetRecipient', type: 'address', description: 'Job taker address on target chain' },
            { name: '_nativeOptions', type: 'bytes', description: 'LayerZero options' }
          ],
          accessControl: 'Job giver only',
          events: ['PaymentReleased(jobId, jobGiver, recipient, amount, milestone)', 'PlatformTotalUpdated(newTotal)'],
          gasEstimate: '~90K gas + LayerZero fee',
          example: `const jobId = "10232-1";
const opDomain = 2; // Pay on OP
const recipient = "0x742d35..."; // Job taker

await lowjc.releasePaymentCrossChain(
  jobId,
  opDomain,
  recipient,
  lzOptions,
  { value: ethers.parseEther("0.001") }
);

// Flow:
// 1. LOWJC → Native Bridge → NOWJC
// 2. NOWJC deducts 1% commission (1 USDC)
// 3. NOWJC → CCTP Transceiver (Arb).sendFast()
// 4. Burns 99 USDC on Arbitrum
// 5. Circle attestation
// 6. CCTP Transceiver (OP).receive()
// 7. Mints 99 USDC to recipient on OP
// 8. OW tokens awarded to both parties
// 9. Milestone incremented or job completed`,
          relatedFunctions: ['lockNextMilestone', 'releaseAndLockNext']
        },
        {
          name: 'startDirectContract',
          signature: 'startDirectContract(address _jobTaker, string _jobDetailHash, string[] _descriptions, uint256[] _amounts, uint32 _jobTakerChainDomain, bytes _nativeOptions) payable',
          whatItDoes: 'Creates job and immediately starts it with specified job taker, bypassing application process.',
          whyUse: 'For direct contracts where job giver and taker have pre-existing agreement.',
          howItWorks: [
            '1. Validates job taker address and milestones',
            '2. Generates jobId, creates job locally',
            '3. Creates auto-application (appId=1)',
            '4. Immediately sets status to InProgress',
            '5. Locks first milestone USDC via CCTP',
            '6. Sends to Native Chain for Genesis storage',
            '7. Emits JobPosted, JobApplication, JobStarted events'
          ],
          parameters: [
            { name: '_jobTaker', type: 'address', description: 'Pre-selected job taker address' },
            { name: '_jobDetailHash', type: 'string', description: 'IPFS hash with job details' },
            { name: '_descriptions', type: 'string[]', description: 'Milestone description hashes' },
            { name: '_amounts', type: 'uint256[]', description: 'Milestone amounts in USDC (6 decimals)' },
            { name: '_jobTakerChainDomain', type: 'uint32', description: 'Job taker preferred payment chain domain' },
            { name: '_nativeOptions', type: 'bytes', description: 'LayerZero options' }
          ],
          accessControl: 'Public',
          events: ['JobPosted', 'JobApplication', 'JobStarted', 'JobStatusChanged(InProgress)'],
          gasEstimate: '~150K gas + LayerZero fee',
          example: `// Skip application process, start job immediately
const jobTaker = "0x742d35...";
const jobDetails = "QmDirectJob...";
const milestones = ["QmM1...", "QmM2..."];
const amounts = [ethers.parseUnits("200", 6), ethers.parseUnits("300", 6)];
const jobTakerChain = 2; // OP

// Approve first milestone
await usdc.approve(lowjcAddress, amounts[0]);

await lowjc.startDirectContract(
  jobTaker,
  jobDetails,
  milestones,
  amounts,
  jobTakerChain,
  lzOptions,
  { value: lzFee }
);

// Result: Job created + started in one transaction
// Status: InProgress (ready for work)
// First milestone locked on Arbitrum`,
          relatedFunctions: ['postJob', 'startJob']
        },
        {
          name: 'lockNextMilestone',
          signature: 'lockNextMilestone(string _jobId, bytes _nativeOptions) payable',
          whatItDoes: 'Locks next milestone USDC without releasing previous payment.',
          whyUse: 'Pre-fund next milestone while current work is ongoing.',
          howItWorks: [
            '1. Validates job is InProgress',
            '2. Validates no currently locked payment',
            '3. Validates not all milestones completed',
            '4. Increments milestone counter',
            '5. Sends next milestone USDC via CCTP',
            '6. Updates locked amount',
            '7. Emits MilestoneLocked event'
          ],
          parameters: [
            { name: '_jobId', type: 'string', description: 'Job ID' },
            { name: '_nativeOptions', type: 'bytes', description: 'LayerZero options' }
          ],
          accessControl: 'Job giver only',
          events: ['MilestoneLocked(jobId, newMilestone, lockedAmount)'],
          gasEstimate: '~100K gas + LayerZero fee',
          example: `// Pre-fund next milestone
await usdc.approve(lowjcAddress, nextMilestoneAmount);
await lowjc.lockNextMilestone(jobId, lzOptions, { value: lzFee });`,
          relatedFunctions: ['releasePaymentCrossChain', 'releaseAndLockNext']
        },
        {
          name: 'releaseAndLockNext',
          signature: 'releaseAndLockNext(string _jobId, bytes _nativeOptions) payable',
          whatItDoes: 'Releases current milestone payment AND locks next milestone in one transaction.',
          whyUse: 'Efficient way to approve work and fund next phase simultaneously.',
          howItWorks: [
            '1. Validates job is InProgress with locked funds',
            '2. Releases current milestone to job taker',
            '3. Increments milestone counter',
            '4. If more milestones exist:',
            '   - Locks next milestone USDC via CCTP',
            '5. If last milestone:',
            '   - Marks job Completed',
            '6. Updates totals and rewards',
            '7. Emits PaymentReleasedAndNextMilestoneLocked'
          ],
          parameters: [
            { name: '_jobId', type: 'string', description: 'Job ID' },
            { name: '_nativeOptions', type: 'bytes', description: 'LayerZero options' }
          ],
          accessControl: 'Job giver only',
          events: ['PaymentReleasedAndNextMilestoneLocked(jobId, releasedAmount, lockedAmount, milestone)'],
          gasEstimate: '~130K gas + LayerZero fee',
          example: `// Approve current work + fund next phase
await usdc.approve(lowjcAddress, nextAmount);
await lowjc.releaseAndLockNext(jobId, lzOptions, { value: lzFee });

// Result:
// - Current milestone paid
// - Next milestone locked
// - Or job completed if last milestone`,
          relatedFunctions: ['releasePaymentCrossChain', 'lockNextMilestone']
        },
        {
          name: 'rate',
          signature: 'rate(string _jobId, address _userToRate, uint256 _rating, bytes _nativeOptions) payable',
          whatItDoes: 'Rate counterparty after job completion (1-5 stars).',
          whyUse: 'Build reputation system for quality control.',
          howItWorks: [
            '1. Validates job is InProgress or Completed',
            '2. Validates rating is 1-5',
            '3. Validates not already rated this user for this job',
            '4. Validates caller authorized (jobGiver rates taker, taker rates giver)',
            '5. Stores rating locally',
            '6. Syncs to Native Chain',
            '7. Emits UserRated event'
          ],
          parameters: [
            { name: '_jobId', type: 'string', description: 'Job ID' },
            { name: '_userToRate', type: 'address', description: 'Address to rate (counterparty)' },
            { name: '_rating', type: 'uint256', description: 'Rating 1-5 stars' },
            { name: '_nativeOptions', type: 'bytes', description: 'LayerZero options' }
          ],
          accessControl: 'Job participants only (mutual rating)',
          events: ['UserRated(jobId, rater, rated, rating)'],
          gasEstimate: '~40K gas + LayerZero fee',
          example: `// Job giver rates job taker
await lowjc.rate(jobId, jobTakerAddress, 5, lzOptions, { value: lzFee });

// Job taker rates job giver
await lowjc.rate(jobId, jobGiverAddress, 4, lzOptions, { value: lzFee });`,
          relatedFunctions: ['getRating']
        }
      ]
    },
    {
      category: 'Dispute Resolution',
      description: 'Handle dispute outcomes',
      items: [
        {
          name: 'resolveDispute',
          signature: 'resolveDispute(string _jobId, bool _jobGiverWins)',
          whatItDoes: 'Called by Athena Client to resolve dispute and distribute escrowed funds.',
          whyUse: 'Athena Client executes resolution after oracle voting completes.',
          howItWorks: [
            '1. Only Athena Client can call',
            '2. Validates job exists and is InProgress',
            '3. Validates funds are locked',
            '4. If job giver wins: funds stay with NOWJC (no release)',
            '5. If job taker wins: updates local totals',
            '6. Clears locked amount',
            '7. Marks job Completed',
            '8. Emits DisputeResolved event'
          ],
          parameters: [
            { name: '_jobId', type: 'string', description: 'Job ID' },
            { name: '_jobGiverWins', type: 'bool', description: 'true if job giver wins dispute' }
          ],
          accessControl: 'Athena Client only',
          events: ['DisputeResolved(jobId, jobGiverWins, winner, amount)', 'JobStatusChanged(Completed)'],
          gasEstimate: '~35K gas',
          example: `// Called automatically by Athena Client after resolution
// NOT called directly by users

// If job giver wins:
await lowjc.resolveDispute(jobId, true);
// Funds refunded to job giver

// If job taker wins:
await lowjc.resolveDispute(jobId, false);
// Funds released to job taker`,
          relatedFunctions: ['Athena Client dispute flow']
        }
      ]
    },
    {
      category: 'Admin Functions',
      description: 'Contract configuration and maintenance (owner only)',
      items: [
        {
          name: 'setBridge',
          signature: 'setBridge(address _bridge) onlyOwner',
          whatItDoes: 'Updates Local Bridge address for LayerZero messaging.',
          whyUse: 'Admin can update bridge if new version deployed or migration needed.',
          parameters: [{ name: '_bridge', type: 'address', description: 'New Local Bridge address' }],
          accessControl: 'Owner only',
          events: ['BridgeSet(bridge)'],
          gasEstimate: '~25K gas'
        },
        {
          name: 'setCCTPSender',
          signature: 'setCCTPSender(address _cctpSender) onlyOwner',
          whatItDoes: 'Updates CCTP Transceiver address for USDC transfers.',
          parameters: [{ name: '_cctpSender', type: 'address', description: 'New CCTP Transceiver address' }],
          accessControl: 'Owner only',
          gasEstimate: '~25K gas'
        },
        {
          name: 'setCCTPMintRecipient',
          signature: 'setCCTPMintRecipient(address _mintRecipient) onlyOwner',
          whatItDoes: 'Updates NOWJC address on Arbitrum (CCTP mint recipient).',
          parameters: [{ name: '_mintRecipient', type: 'address', description: 'NOWJC proxy address on Arbitrum' }],
          accessControl: 'Owner only',
          events: ['CCTPMintRecipientSet(mintRecipient)'],
          gasEstimate: '~25K gas'
        },
        {
          name: 'setAthenaClientContract',
          signature: 'setAthenaClientContract(address _athenaClient) onlyOwner',
          whatItDoes: 'Updates Athena Client address for dispute resolution.',
          parameters: [{ name: '_athenaClient', type: 'address', description: 'Athena Client address' }],
          accessControl: 'Owner only',
          gasEstimate: '~25K gas'
        },
        {
          name: 'setUSDTToken',
          signature: 'setUSDTToken(address _newToken) onlyOwner',
          whatItDoes: 'Updates USDC token address (emergency use only).',
          parameters: [{ name: '_newToken', type: 'address', description: 'New USDC token address' }],
          accessControl: 'Owner only',
          gasEstimate: '~25K gas'
        },
        {
          name: 'withdraw',
          signature: 'withdraw() onlyOwner',
          whatItDoes: 'Withdraws native ETH balance to owner.',
          whyUse: 'Recover excess LayerZero fees sent to contract.',
          accessControl: 'Owner only',
          gasEstimate: '~30K gas'
        },
        {
          name: 'emergencyWithdrawUSDT',
          signature: 'emergencyWithdrawUSDT() onlyOwner',
          whatItDoes: 'Emergency withdrawal of any USDC stuck in contract.',
          whyUse: 'Recovery mechanism for edge cases (should normally be zero balance).',
          accessControl: 'Owner only',
          gasEstimate: '~35K gas'
        },
        {
          name: 'upgradeFromDAO',
          signature: 'upgradeFromDAO(address newImplementation)',
          whatItDoes: 'Upgrades contract implementation via bridge (DAO governance).',
          whyUse: 'Allows DAO-authorized upgrades through Native Bridge.',
          parameters: [{ name: 'newImplementation', type: 'address', description: 'New implementation contract' }],
          accessControl: 'Bridge only',
          gasEstimate: '~45K gas'
        },
        {
          name: 'updateLocalPlatformTotal',
          signature: 'updateLocalPlatformTotal(uint256 newTotal) onlyOwner',
          whatItDoes: 'Manually sync platform payment total from Native Chain.',
          whyUse: 'Backup mechanism to sync totals if discrepancy occurs.',
          parameters: [{ name: 'newTotal', type: 'uint256', description: 'New platform total from Arbitrum' }],
          accessControl: 'Owner only',
          events: ['PlatformTotalUpdated(newTotal)'],
          gasEstimate: '~25K gas'
        }
      ]
    },
    {
      category: 'View Functions',
      description: 'Read contract state (no gas cost)',
      items: [
        {
          name: 'getProfile',
          signature: 'getProfile(address _user) view returns (Profile)',
          whatItDoes: 'Returns user profile data.',
          parameters: [{ name: '_user', type: 'address', description: 'User address' }],
          returns: 'Profile struct (userAddress, ipfsHash, referrerAddress, portfolioHashes[])',
          accessControl: 'Public view',
          gasEstimate: 'Free (view)'
        },
        {
          name: 'getJob',
          signature: 'getJob(string _jobId) view returns (Job)',
          whatItDoes: 'Returns complete job data.',
          parameters: [{ name: '_jobId', type: 'string', description: 'Job ID' }],
          returns: 'Job struct with all details',
          accessControl: 'Public view',
          gasEstimate: 'Free (view)'
        },
        {
          name: 'getApplication',
          signature: 'getApplication(string _jobId, uint256 _appId) view returns (Application)',
          whatItDoes: 'Returns application data.',
          parameters: [
            { name: '_jobId', type: 'string', description: 'Job ID' },
            { name: '_appId', type: 'uint256', description: 'Application ID' }
          ],
          returns: 'Application struct',
          accessControl: 'Public view',
          gasEstimate: 'Free (view)'
        },
        {
          name: 'getRating',
          signature: 'getRating(address _user) view returns (uint256)',
          whatItDoes: 'Returns user average rating (1-5 stars).',
          parameters: [{ name: '_user', type: 'address', description: 'User address' }],
          returns: 'Average rating or 0 if no ratings',
          accessControl: 'Public view',
          gasEstimate: 'Free (view)'
        },
        {
          name: 'getJobCount',
          signature: 'getJobCount() view returns (uint256)',
          whatItDoes: 'Returns total number of jobs created on this chain.',
          returns: 'Job counter',
          accessControl: 'Public view',
          gasEstimate: 'Free (view)'
        },
        {
          name: 'getJobApplicationCount',
          signature: 'getJobApplicationCount(string _jobId) view returns (uint256)',
          whatItDoes: 'Returns number of applications for a job.',
          parameters: [{ name: '_jobId', type: 'string', description: 'Job ID' }],
          returns: 'Application count',
          accessControl: 'Public view',
          gasEstimate: 'Free (view)'
        },
        {
          name: 'isJobOpen',
          signature: 'isJobOpen(string _jobId) view returns (bool)',
          whatItDoes: 'Checks if job is accepting applications.',
          parameters: [{ name: '_jobId', type: 'string', description: 'Job ID' }],
          returns: 'true if status is Open',
          accessControl: 'Public view',
          gasEstimate: 'Free (view)'
        },
        {
          name: 'getEscrowBalance',
          signature: 'getEscrowBalance(string _jobId) view returns (uint256 escrowed, uint256 released, uint256 remaining)',
          whatItDoes: 'Returns job escrow status.',
          parameters: [{ name: '_jobId', type: 'string', description: 'Job ID' }],
          returns: 'Total escrowed, released, and remaining USDC',
          accessControl: 'Public view',
          gasEstimate: 'Free (view)'
        },
        {
          name: 'getJobStatus',
          signature: 'getJobStatus(string _jobId) view returns (JobStatus)',
          whatItDoes: 'Returns job status enum.',
          parameters: [{ name: '_jobId', type: 'string', description: 'Job ID' }],
          returns: 'JobStatus (Open=0, InProgress=1, Completed=2, Cancelled=3)',
          accessControl: 'Public view',
          gasEstimate: 'Free (view)'
        },
        {
          name: 'getTotalPlatformPayments',
          signature: 'getTotalPlatformPayments() view returns (uint256)',
          whatItDoes: 'Returns total platform payments on this chain.',
          whyUse: 'Local tracking for rewards calculation.',
          returns: 'Total USDC paid through platform',
          accessControl: 'Public view',
          gasEstimate: 'Free (view)'
        }
      ]
    }
  ],
  
  integrationGuide: {
    example: `// LOWJC (OP) Integration Example
const { ethers } = require('ethers');

// 1. Setup contracts
const lowjc = new ethers.Contract(lowjcAddress, lowjcABI, signer);
const usdc = new ethers.Contract(usdcAddress, usdcABI, signer);
const localBridge = new ethers.Contract(localBridgeAddress, localBridgeABI, provider);

// 2. Helper: Get LayerZero fee quote
async function quoteLzFee(payload) {
  const lzOptions = ethers.solidityPacked(["uint16", "uint256"], [1, 200000]);
  return await localBridge.quoteNativeChain(payload, lzOptions);
}

// 3. Create Profile
const profileIpfs = "QmProfileHash...";
const referrer = "0x742d35...";
const lzOptions = ethers.solidityPacked(["uint16", "uint256"], [1, 200000]);
const profilePayload = ethers.AbiCoder.defaultAbiCoder().encode(
  ["string", "address", "string", "address"],
  ["createProfile", signer.address, profileIpfs, referrer]
);
const profileFee = await quoteLzFee(profilePayload);

await lowjc.createProfile(profileIpfs, referrer, lzOptions, { value: profileFee });

// 4. Post Job with Milestones
const jobDetails = "QmJobHash...";
const milestones = ["QmM1...", "QmM2...", "QmM3..."];
const amounts = [
  ethers.parseUnits("100", 6),
  ethers.parseUnits("200", 6),
  ethers.parseUnits("100", 6)
];

const jobPayload = ethers.AbiCoder.defaultAbiCoder().encode(
  ["string", "string", "address", "string", "string[]", "uint256[]"],
  ["postJob", "jobId", signer.address, jobDetails, milestones, amounts]
);
const jobFee = await quoteLzFee(jobPayload);

await lowjc.postJob(jobDetails, milestones, amounts, lzOptions, { value: jobFee });

// 5. Apply to Job (as job taker)
const jobId = "10232-1";
const coverLetter = "QmApp...";
const proposedMilestones = ["QmA1...", "QmA2..."];
const proposedAmounts = [ethers.parseUnits("200", 6), ethers.parseUnits("200", 6)];
const preferredChain = 2; // OP

const appPayload = ethers.AbiCoder.defaultAbiCoder().encode(
  ["string", "address", "string", "string", "string[]", "uint256[]", "uint32"],
  ["applyToJob", signer.address, jobId, coverLetter, proposedMilestones, proposedAmounts, preferredChain]
);
const appFee = await quoteLzFee(appPayload);

await lowjc.applyToJob(
  jobId,
  coverLetter,
  proposedMilestones,
  proposedAmounts,
  preferredChain,
  lzOptions,
  { value: appFee }
);

// 6. Start Job (as job giver)
const applicationId = 1;
const useTheirMilestones = false; // Use original

// Approve USDC for first milestone
const firstAmount = amounts[0];
await usdc.approve(lowjcAddress, firstAmount);

const startPayload = ethers.AbiCoder.defaultAbiCoder().encode(
  ["string", "address", "string", "uint256", "bool"],
  ["startJob", signer.address, jobId, applicationId, useTheirMilestones]
);
const startFee = await quoteLzFee(startPayload);

await lowjc.startJob(jobId, applicationId, useTheirMilestones, lzOptions, { value: startFee });

// 7. Submit Work (as job taker)
const deliverable = "QmWork...";
const submitPayload = ethers.AbiCoder.defaultAbiCoder().encode(
  ["string", "address", "string", "string"],
  ["submitWork", signer.address, jobId, deliverable]
);
const submitFee = await quoteLzFee(submitPayload);

await lowjc.submitWork(jobId, deliverable, lzOptions, { value: submitFee });

// 8. Release Payment (as job giver)
const targetChain = 2; // OP
const recipient = "0xJobTaker...";
const releasePayload = ethers.AbiCoder.defaultAbiCoder().encode(
  ["string", "address", "string", "uint256", "uint32", "address"],
  ["releasePaymentCrossChain", signer.address, jobId, amounts[0], targetChain, recipient]
);
const releaseFee = await quoteLzFee(releasePayload);

await lowjc.releasePaymentCrossChain(
  jobId,
  targetChain,
  recipient,
  lzOptions,
  { value: releaseFee }
);`,
    tips: [
      'LOWJC is user entry point - all job activities start here',
      'Same contract on OP, Ethereum, Polygon, Base (only addresses differ)',
      'Always quote LayerZero fees before transactions',
      'Approve USDC before startJob() for first milestone',
      'Job data syncs instantly via LayerZero',
      'USDC follows slower CCTP attestation flow (10-20s)',
      'Cross-chain payments work seamlessly (post on OP, pay on Ethereum)',
      'Monitor both JobPosted (local) and job in Genesis (global)',
      'Use preferredChainDomain in applications for payment preferences',
      'NOWJC deducts 1% commission on all payments',
      'OW tokens awarded automatically on each payment',
      'Jobs are globally visible but locally created',
      'Test LayerZero fees on testnet (can vary)',
      'USDC has 6 decimals - use parseUnits("100", 6)'
    ]
  },
  
  securityConsiderations: [
    'UUPS upgradeable: Owner or bridge can upgrade implementation',
    'Dual authorization: Owner or bridge can authorize upgrades',
    'ReentrancyGuard: Protects against reentrancy on critical functions',
    'USDC approval required: Users must approve before sending funds',
    'Local state tracking: Jobs tracked locally, definitive state on Arbitrum',
    'LayerZero dependency: Cross-chain messages rely on LayerZero security',
    'CCTP dependency: USDC transfers rely on Circle attestation service',
    'Profile requirement: Must create profile before job posting/applying',
    'One profile per address: Cannot create multiple profiles',
    'Job ID uniqueness: chainId-jobCounter format prevents collisions',
    'Milestone validation: Amounts and descriptions arrays must match',
    'Athena integration: Dispute resolution delegated to Athena Client',
    'Commission system: 1% deducted on Native Chain by NOWJC',
    'Cross-chain payment flexibility: Job takers specify preferred chain',
    'No direct fund holding: LOWJC never holds USDC (immediately sent via CCTP)',
    'Bridge trust: Relies on Local Bridge for message routing',
    'Event logging: Complete audit trail of all job activities'
  ]
};
