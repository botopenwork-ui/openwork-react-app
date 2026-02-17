// Flow visualization data for OpenWork contract interactions

export const flowsData = {
  'post-job': {
    id: 'post-job',
    title: 'Post a Job',
    category: 'Job Management',
    description: 'Complete flow of posting a job from a Local chain to the Native chain, making it visible across all chains.',
    icon: '📝',
    complexity: 'Medium',
    estimatedTime: '~30 seconds',
    chains: ['Local Chain', 'LayerZero Network', 'Native Chain'],
    contracts: ['LOWJC', 'Local Bridge', 'Native Bridge', 'NOWJC', 'OpenworkGenesis'],
    steps: [
      {
        step: 1,
        chain: 'ethereum',
        chainLabel: 'Local Chain',
        actor: 'User',
        contract: 'User Wallet',
        action: 'Prepare Job Data & Escrow USDC',
        description: 'User uploads job description to IPFS and prepares to escrow USDC payment for milestones.',
        details: [
          'Upload job details to IPFS (description, requirements, deadlines)',
          'Get IPFS hash (e.g., "QmX7h5...")',
          'Calculate total USDC needed for all milestones',
          'Approve USDC spending for LOWJC contract'
        ],
        codeSnippet: `// Upload to IPFS
const jobDetails = {
  title: "Full Stack Developer Needed",
  description: "Build a React + Node.js app...",
  requirements: ["3+ years experience", "Portfolio required"],
  deadline: "2024-03-01"
};
const ipfsHash = await uploadToIPFS(jobDetails);

// Approve USDC
const totalAmount = 2000_000_000; // 2000 USDC
await usdc.approve(lowjcAddress, totalAmount);`,
        gasEstimate: '~50K gas',
        icon: '👤'
      },
      {
        step: 2,
        chain: 'ethereum',
        chainLabel: 'Local Chain',
        actor: 'User',
        contract: 'LOWJC',
        action: 'Call postJob() on Local Chain',
        description: 'User calls LOWJC.postJob() with job details, milestones, and LayerZero fee to initiate cross-chain message.',
        details: [
          'Provide IPFS hash of job description',
          'Define milestone descriptions and USDC amounts',
          'Calculate and pay LayerZero cross-chain messaging fee',
          'LOWJC escrows the USDC payment'
        ],
        codeSnippet: `// Get LayerZero fee quote
const lzOptions = ethers.solidityPacked(
  ['uint16', 'uint256'],
  [1, 200000] // version 1, 200K gas
);
const lzFee = await localBridge.quoteSendToNative(
  ipfsHash,
  descriptions,
  amounts,
  lzOptions
);

// Post job
await lowjc.postJob(
  ipfsHash,  // "QmX7h5..."
  ["Phase 1: Design", "Phase 2: Development", "Phase 3: Deploy"],
  [500_000_000, 1000_000_000, 500_000_000], // 500, 1000, 500 USDC
  lzOptions,
  { value: lzFee }
);`,
        gasEstimate: '~85K gas + LayerZero fee',
        icon: '📝',
        emittedEvents: ['JobPostedLocal(jobId, jobGiver, jobDetailHash)']
      },
      {
        step: 3,
        chain: 'ethereum',
        chainLabel: 'Local Chain',
        actor: 'System',
        contract: 'Local Bridge',
        action: 'Package Cross-Chain Message',
        description: 'Local Bridge prepares the job data for cross-chain transmission via LayerZero.',
        details: [
          'LOWJC calls Local Bridge with job data',
          'Bridge generates unique message ID',
          'Encodes job data into LayerZero message format',
          'Includes sender verification and nonce'
        ],
        codeSnippet: `// Inside Local Bridge
function sendJobPostToNative(
    string memory _jobId,
    address _jobGiver,
    string memory _jobDetailHash,
    string[] memory _descriptions,
    uint256[] memory _amounts,
    bytes memory _options
) external payable {
    // Encode message payload
    bytes memory payload = abi.encode(
        _jobId,
        _jobGiver,
        _jobDetailHash,
        _descriptions,
        _amounts
    );
    
    // Send via LayerZero
    _lzSend(
        nativeChainEid,  // Arbitrum Sepolia EID: 40231
        payload,
        _options,
        MessagingFee(msg.value, 0),
        payable(msg.sender)
    );
}`,
        gasEstimate: '~45K gas',
        icon: '📦',
        emittedEvents: ['MessageSent(messageId, nativeChainEid, payload)']
      },
      {
        step: 4,
        chain: 'ethereum',
        chainLabel: 'Local Chain',
        actor: 'System',
        contract: 'CCTP Transceiver',
        action: 'Transfer USDC via CCTP',
        description: 'USDC is burned on Ethereum and prepared to be minted on Arbitrum via Circle\'s CCTP.',
        details: [
          'LOWJC approves CCTP Transceiver to spend USDC',
          'Transceiver burns USDC on source chain',
          'Circle attestation service monitors burn event',
          'Prepares to mint on destination chain'
        ],
        codeSnippet: `// Inside CCTP Transceiver ETH
function sendFast(
    uint256 amount,
    uint32 destinationDomain,  // 3 = Arbitrum
    bytes32 mintRecipient,     // NOWJC address
    uint32 maxWait
) external {
    // Burn USDC on Ethereum
    usdc.approve(address(tokenMessenger), amount);
    
    uint64 nonce = tokenMessenger.depositForBurn(
        amount,
        destinationDomain,
        mintRecipient,
        address(usdc)
    );
    
    emit CCTPTransferInitiated(nonce, destinationDomain, amount);
}`,
        gasEstimate: '~120K gas',
        icon: '💵',
        emittedEvents: ['CCTPTransferInitiated(nonce, domain, amount)']
      },
      {
        step: 5,
        chain: 'layerzero',
        chainLabel: 'LayerZero Network',
        actor: 'System',
        contract: 'LayerZero Protocol',
        action: 'Route Message Cross-Chain',
        description: 'LayerZero validators verify and route the message from Ethereum to Arbitrum.',
        details: [
          'Decentralized Verifier Network (DVN) validates message',
          'Multiple independent validators confirm transaction',
          'Message queued for delivery to Arbitrum',
          'Security threshold must be met before delivery'
        ],
        codeSnippet: `// LayerZero Protocol (conceptual)
// This happens off-chain in LayerZero's infrastructure

1. DVN receives message from Ethereum endpoint
2. Validates source chain finality
3. Confirms message integrity and sender authorization  
4. Routes to Arbitrum endpoint
5. Executor delivers message to Native Bridge

// Security: Multiple independent entities must agree`,
        gasEstimate: 'Paid via LayerZero fee',
        icon: '⚡',
        emittedEvents: ['PacketSent(srcEid, dstEid, nonce, payload)']
      },
      {
        step: 6,
        chain: 'arbitrum',
        chainLabel: 'Native Chain',
        actor: 'System',
        contract: 'Native Bridge',
        action: 'Receive & Validate Message',
        description: 'Native Bridge on Arbitrum receives the LayerZero message and validates it before executing.',
        details: [
          'LayerZero endpoint delivers message to Native Bridge',
          'Bridge validates message came from authorized Local Bridge',
          'Decodes job data from payload',
          'Verifies sender permissions and data integrity'
        ],
        codeSnippet: `// Inside Native Bridge
function _lzReceive(
    Origin calldata _origin,
    bytes32 _guid,
    bytes calldata _payload,
    address _executor,
    bytes calldata _extraData
) internal override {
    // Verify message from authorized Local Bridge
    require(
        peers[_origin.srcEid] == _origin.sender,
        "Unauthorized sender"
    );
    
    // Decode job data
    (
        string memory jobId,
        address jobGiver,
        string memory jobDetailHash,
        string[] memory descriptions,
        uint256[] memory amounts
    ) = abi.decode(_payload, (string, address, string, string[], uint256[]));
    
    // Call NOWJC to create job
    INativeOpenWorkJobContract(nowjc).postJob(
        jobId,
        jobGiver,
        jobDetailHash,
        descriptions,
        amounts
    );
}`,
        gasEstimate: '~55K gas',
        icon: '🎯',
        emittedEvents: ['MessageReceived(srcEid, sender, nonce)']
      },
      {
        step: 7,
        chain: 'arbitrum',
        chainLabel: 'Native Chain',
        actor: 'System',
        contract: 'CCTP Receiver',
        action: 'Mint USDC on Arbitrum',
        description: 'Circle\'s CCTP mints the USDC on Arbitrum after attestation is received.',
        details: [
          'Circle attestation API confirms burn on Ethereum',
          'CCTP Receiver calls TokenMessenger with attestation',
          'USDC minted to NOWJC contract',
          'Funds ready for escrow'
        ],
        codeSnippet: `// Circle CCTP process
// 1. Monitor burn event on Ethereum
// 2. Attestation service signs the burn
// 3. Anyone can submit attestation to Arbitrum

const attestation = await getCircleAttestation(txHash);

await tokenMessenger.receiveMessage(
    message,      // Original burn message
    attestation   // Circle's signature
);

// USDC minted to NOWJC address
// Event: MintAndWithdraw(mintRecipient, amount)`,
        gasEstimate: '~180K gas (paid by relayer)',
        icon: '💰',
        emittedEvents: ['MintAndWithdraw(mintRecipient, amount)']
      },
      {
        step: 8,
        chain: 'arbitrum',
        chainLabel: 'Native Chain',
        actor: 'System',
        contract: 'NOWJC',
        action: 'Create Job Record',
        description: 'NOWJC processes the job creation and stores all data in OpenworkGenesis.',
        details: [
          'Validates job doesn\'t already exist',
          'Increments global job counter',
          'Stores job with "Open" status',
          'Records milestone descriptions and amounts',
          'Adds to job poster\'s personal job list'
        ],
        codeSnippet: `// Inside NOWJC
function postJob(
    string memory _jobId,
    address _jobGiver,
    string memory _jobDetailHash,
    string[] memory _descriptions,
    uint256[] memory _amounts
) external {
    require(!genesis.jobExists(_jobId), "Job exists");
    require(_descriptions.length == _amounts.length, "Length mismatch");
    
    // Store in Genesis
    genesis.setJob(
        _jobId,
        _jobGiver,
        _jobDetailHash,
        _descriptions,
        _amounts
    );
    
    // Set initial state
    genesis.setJobStatus(_jobId, JobStatus.Open);
    genesis.setJobCurrentMilestone(_jobId, 0);
    
    emit JobPosted(_jobId, _jobGiver, _jobDetailHash);
    emit JobStatusChanged(_jobId, JobStatus.Open);
}`,
        gasEstimate: '~95K gas',
        icon: '🔨',
        emittedEvents: [
          'JobPosted(jobId, jobGiver, jobDetailHash)',
          'JobStatusChanged(jobId, JobStatus.Open)'
        ]
      },
      {
        step: 9,
        chain: 'arbitrum',
        chainLabel: 'Native Chain',
        actor: 'System',
        contract: 'OpenworkGenesis',
        action: 'Store Job Data Permanently',
        description: 'Job data is permanently stored in Genesis contract, making it the single source of truth.',
        details: [
          'Job mapped by unique ID in storage',
          'All milestone data indexed and queryable',
          'Job status set to "Open"',
          'Available for applicants to view and apply',
          'Visible across all chains via read functions'
        ],
        codeSnippet: `// Inside OpenworkGenesis
function setJob(
    string memory _jobId,
    address _jobGiver,
    string memory _jobDetailHash,
    string[] memory _descriptions,
    uint256[] memory _amounts
) external onlyAuthorized {
    Job storage job = jobs[_jobId];
    
    job.jobId = _jobId;
    job.jobGiver = _jobGiver;
    job.jobDetailHash = _jobDetailHash;
    job.status = JobStatus.Open;
    job.currentMilestone = 0;
    job.createdAt = block.timestamp;
    
    // Store milestones
    for (uint i = 0; i < _descriptions.length; i++) {
        job.milestoneDescriptions.push(_descriptions[i]);
        job.milestoneAmounts.push(_amounts[i]);
    }
    
    // Add to user's job list
    userJobs[_jobGiver].push(_jobId);
    
    emit JobCreated(_jobId, _jobGiver);
}`,
        gasEstimate: '~125K gas',
        icon: '💾',
        emittedEvents: ['JobCreated(jobId, jobGiver)']
      },
      {
        step: 10,
        chain: 'all',
        chainLabel: 'All Chains',
        actor: 'User',
        contract: 'Multiple',
        action: '✅ Job is Live & Visible Everywhere!',
        description: 'Job successfully posted and visible on all connected chains. Freelancers can now apply from any supported network.',
        details: [
          'Job visible on Ethereum, Optimism, Base, Polygon, and Arbitrum',
          'Freelancers can apply from their preferred chain',
          'USDC securely escrowed on Arbitrum',
          'Job poster can review applications and select winner',
          'All chains read from same Genesis data source'
        ],
        codeSnippet: `// Freelancers on ANY chain can now see the job
const job = await genesis.getJob("40161-57");

console.log(\`Job: \${job.jobDetailHash}\`);
console.log(\`Status: \${job.status}\`); // 0 = Open
console.log(\`Milestones: \${job.milestoneDescriptions.length}\`);
console.log(\`Total Budget: \${job.milestoneAmounts.reduce((a,b) => a+b)} USDC\`);

// Apply from any Local chain
await lowjc.applyToJob(
  job.jobId,
  applicationIPFSHash,
  proposedDescriptions,
  proposedAmounts,
  preferredPaymentChain, // Where you want to get paid
  lzOptions,
  { value: lzFee }
);`,
        gasEstimate: 'N/A',
        icon: '🎉',
        emittedEvents: []
      }
    ],
    totalGasEstimate: '~600K gas across all chains',
    totalTime: '~30-60 seconds (depends on LayerZero and CCTP)',
    keyTakeaways: [
      'Jobs are posted on Local chains but stored on Native chain (Arbitrum)',
      'LayerZero handles secure cross-chain messaging',
      'CCTP handles secure USDC transfers',
      'OpenworkGenesis is the single source of truth',
      'Job visible on all chains once confirmed',
      'Freelancers can apply from any supported chain'
    ]
  }
};

export default flowsData;
