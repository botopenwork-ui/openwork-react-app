export const ipfsData = {
  gateway: 'https://gateway.pinata.cloud/ipfs/',
  docs: 'IPFS (InterPlanetary File System) is the decentralized storage layer for OpenWork. All job descriptions, user profiles, applications, work submissions, portfolio items, and dispute evidence are stored on IPFS, ensuring data permanence, transparency, and censorship resistance. Only the IPFS content hashes are stored on-chain, keeping blockchain storage costs minimal while maintaining data integrity.',
  
  hashStructures: [
    {
      name: 'Job Detail Hash',
      description: 'Complete job posting with milestones and attachments',
      usedIn: ['LOWJC.postJob()', 'LOWJC.startDirectContract()', 'NOWJC.postJob()'],
      structure: {
        title: 'string - Job title (e.g., "Full Stack Developer Needed")',
        description: 'string - Detailed job requirements and expectations',
        skills: 'string[] - Required skills (e.g., ["React", "Node.js", "Solidity"])',
        milestoneType: 'string - "Single Milestone" or "Multiple Milestones"',
        milestones: 'Array<{title: string, content: string, amount: number}> - Original milestone data',
        milestoneHashes: 'string[] - IPFS hashes of individual milestone details',
        attachments: 'Array<{name: string, size: number, type: string, ipfsHash: string, timestamp: string}> - Uploaded files',
        totalCompensation: 'number - Sum of all milestone amounts in USDC',
        jobGiver: 'string - Wallet address of job creator',
        timestamp: 'string - ISO 8601 creation timestamp'
      },
      example: `{
  "title": "Full Stack Developer for DeFi Platform",
  "description": "We need an experienced developer to build...",
  "skills": ["React", "Solidity", "Web3.js"],
  "milestoneType": "Multiple Milestones",
  "milestones": [
    {
      "title": "Milestone 1: Smart Contracts",
      "content": "Develop and test core smart contracts...",
      "amount": 500
    },
    {
      "title": "Milestone 2: Frontend Integration", 
      "content": "Build React frontend with Web3 integration...",
      "amount": 300
    }
  ],
  "milestoneHashes": [
    "QmX7h5kLN8R...",
    "QmY9j6mPQ9S..."
  ],
  "attachments": [
    {
      "name": "requirements.pdf",
      "size": 245760,
      "type": "application/pdf",
      "ipfsHash": "QmZ1a2b3c4d...",
      "timestamp": "2025-06-12T01:30:00.000Z"
    }
  ],
  "totalCompensation": 800,
  "jobGiver": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "timestamp": "2025-06-12T01:30:00.000Z"
}`
    },
    {
      name: 'Milestone Hash',
      description: 'Individual milestone deliverables and payment details',
      usedIn: ['LOWJC.postJob()', 'LOWJC.applyToJob()', 'NOWJC.postJob()', 'NOWJC.applyToJob()'],
      structure: {
        title: 'string - Milestone name (e.g., "Milestone 1: Design Phase")',
        content: 'string - Detailed description of deliverables',
        amount: 'number - Payment amount in USDC',
        index: 'number - Milestone index (0-based)',
        timestamp: 'string - ISO 8601 creation timestamp'
      },
      example: `{
  "title": "Milestone 1: Smart Contract Development",
  "content": "Develop core smart contracts including:\n- Token contract (ERC-20)\n- Staking contract\n- Governance contract\n- Unit tests with 90% coverage\n- Gas optimization",
  "amount": 500,
  "index": 0,
  "timestamp": "2025-06-12T01:30:00.000Z"
}`
    },
    {
      name: 'Profile Hash',
      description: 'User profile with personal and professional information',
      usedIn: ['LOWJC.createProfile()', 'LOWJC.updateProfile()', 'ProfileManager.createProfile()', 'ProfileManager.updateProfile()'],
      structure: {
        username: 'string - Display name',
        firstName: 'string - First name',
        lastName: 'string - Last name',
        skills: 'Array<{title: string, verified: boolean}> - User skills with verification status',
        location: 'string - Geographic location',
        languages: 'string - Languages spoken',
        experience: 'string - Years of experience (e.g., "4 Years")',
        description: 'string - Bio/about me section',
        email: 'string - Contact email',
        telegram: 'string - Telegram handle',
        phone: 'string - Phone number',
        profilePhotoHash: 'string - IPFS hash of profile photo',
        profilePhoto: 'string - Full IPFS gateway URL to photo'
      },
      example: `{
  "username": "alice_dev",
  "firstName": "Alice",
  "lastName": "Smith",
  "skills": [
    {"title": "Solidity", "verified": true},
    {"title": "React", "verified": true},
    {"title": "Web3.js", "verified": false}
  ],
  "location": "San Francisco, USA",
  "languages": "English, Spanish",
  "experience": "5 Years",
  "description": "Experienced blockchain developer specializing in DeFi protocols...",
  "email": "alice@example.com",
  "telegram": "@alice_dev",
  "phone": "+1-555-0123",
  "profilePhotoHash": "QmP1h2o3t4o5...",
  "profilePhoto": "https://gateway.pinata.cloud/ipfs/QmP1h2o3t4o5..."
}`
    },
    {
      name: 'Portfolio Hash',
      description: 'Individual portfolio item showcasing previous work',
      usedIn: ['ProfileManager.addPortfolio()', 'ProfileManager.updatePortfolioItem()', 'LOWJC.addPortfolio()'],
      structure: {
        title: 'string - Project name',
        description: 'string - Project description and achievements',
        skills: 'string[] - Technologies/skills used in project',
        images: 'string[] - Array of IPFS hashes for project images',
        createdAt: 'string - ISO 8601 creation timestamp',
        updatedAt: 'string - ISO 8601 last update timestamp'
      },
      example: `{
  "title": "DeFi Lending Protocol",
  "description": "Built a complete lending protocol with collateralized loans, liquidation mechanisms, and yield farming. Processed over $10M TVL in 6 months.",
  "skills": ["Solidity", "Hardhat", "React", "The Graph"],
  "images": [
    "QmA1b2c3d4e...",
    "QmF5g6h7i8j...",
    "QmK9l0m1n2o..."
  ],
  "createdAt": "2025-05-15T10:00:00.000Z",
  "updatedAt": "2025-06-12T01:30:00.000Z"
}`
    },
    {
      name: 'Application Hash',
      description: 'Job application with cover letter and proposed milestones',
      usedIn: ['LOWJC.applyToJob()', 'NOWJC.applyToJob()'],
      structure: {
        description: 'string - Cover letter explaining why you should be hired',
        applicant: 'string - Wallet address of applicant',
        jobId: 'string - Job identifier (e.g., "40232-57")',
        milestones: 'Array<{title: string, content: string, amount: number}> - Counter-proposed milestones',
        preferredChain: 'string - Preferred chain for payment (e.g., "OP Sepolia")',
        timestamp: 'string - ISO 8601 submission timestamp'
      },
      example: `{
  "description": "I have 5 years of experience building DeFi protocols and have delivered similar projects. My portfolio includes 3 lending platforms with $50M+ TVL. I can deliver high-quality, gas-optimized smart contracts with comprehensive tests.",
  "applicant": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "jobId": "40232-57",
  "milestones": [
    {
      "title": "Milestone 1: Contract Development",
      "content": "I will deliver all core contracts with tests",
      "amount": 600
    },
    {
      "title": "Milestone 2: Frontend + Deployment",
      "content": "I will build the UI and deploy to mainnet",
      "amount": 400
    }
  ],
  "preferredChain": "OP Sepolia",
  "timestamp": "2025-06-12T02:00:00.000Z"
}`
    },
    {
      name: 'Work Submission Hash',
      description: 'Completed work deliverable for milestone approval',
      usedIn: ['LOWJC.submitWork()', 'NOWJC.submitWork()'],
      structure: {
        jobId: 'string - Job identifier',
        jobTaker: 'string - Wallet address of freelancer',
        jobUpdate: 'string - Description of completed work',
        jobGiver: 'string - Wallet address of client',
        date: 'string - ISO 8601 submission timestamp'
      },
      example: `{
  "jobId": "40232-57",
  "jobTaker": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "jobUpdate": "Milestone 1 complete! Deliverables:\n- All smart contracts deployed\n- 95% test coverage achieved\n- Gas optimized (saved 30% vs original)\n- Audit report attached\n\nDemo: https://demo.example.com\nGitHub: https://github.com/...",
  "jobGiver": "0x8AbC0E626A8fC723ec6f27FE8a4157A186D5767D",
  "date": "2025-06-12T03:30:00.000Z"
}`
    },
    {
      name: 'Dispute Hash',
      description: 'Dispute evidence and details for oracle voting',
      usedIn: ['Athena Client.raiseDispute()', 'Native Athena.raiseDispute()'],
      structure: {
        jobId: 'string - Job identifier being disputed',
        title: 'string - Dispute title/summary',
        description: 'string - Detailed explanation of the dispute',
        disputedAmount: 'string - Amount in dispute (USDC)',
        receiverWallet: 'string - Address to receive funds if dispute won',
        compensation: 'string - Fee paid to oracle members (USDC)',
        timestamp: 'string - ISO 8601 submission timestamp',
        file: '{name: string, size: number, type: string} | null - Evidence file metadata',
        fileIpfsHash: 'string (optional) - IPFS hash of evidence file if uploaded'
      },
      example: `{
  "jobId": "40232-57",
  "title": "Work Not Delivered According to Specification",
  "description": "The delivered smart contracts have critical security vulnerabilities that were not part of the agreement. Specifically:\n1. Reentrancy vulnerability in withdraw function\n2. Missing access controls on admin functions\n3. No gas optimization as promised\n\nI requested fixes but freelancer has not responded in 2 weeks.",
  "disputedAmount": "500",
  "receiverWallet": "0x8AbC0E626A8fC723ec6f27FE8a4157A186D5767D",
  "compensation": "50",
  "timestamp": "2025-06-12T04:00:00.000Z",
  "file": {
    "name": "audit-report.pdf",
    "size": 1245760,
    "type": "application/pdf"
  },
  "fileIpfsHash": "QmD1s2p3u4t5e..."
}`
    }
  ],
  
  examples: [
    {
      title: 'Upload Job to IPFS (Pinata)',
      description: 'Upload job details JSON to IPFS using Pinata API',
      code: `const jobDetails = {
  title: "Full Stack Developer",
  description: "Build a DeFi platform...",
  skills: ["React", "Solidity"],
  milestoneType: "Multiple Milestones",
  milestones: [/* ... */],
  milestoneHashes: [/* ... */],
  attachments: [/* ... */],
  totalCompensation: 800,
  jobGiver: "0x742d35...",
  timestamp: new Date().toISOString()
};

const response = await fetch(
  "https://api.pinata.cloud/pinning/pinJSONToIPFS",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": \`Bearer \${PINATA_API_KEY}\`
    },
    body: JSON.stringify({
      pinataContent: jobDetails,
      pinataMetadata: {
        name: \`job-\${Date.now()}\`,
        keyvalues: {
          jobTitle: jobDetails.title,
          jobGiver: jobDetails.jobGiver,
          type: "job"
        }
      }
    })
  }
);

const data = await response.json();
const jobDetailHash = data.IpfsHash;
console.log("Job IPFS Hash:", jobDetailHash);`
    },
    {
      title: 'Fetch Data from IPFS (Multi-Gateway)',
      description: 'Retrieve data from IPFS with fallback gateways for reliability',
      code: `const fetchFromIPFS = async (hash, timeout = 5000) => {
  const gateways = [
    \`https://ipfs.io/ipfs/\${hash}\`,
    \`https://gateway.pinata.cloud/ipfs/\${hash}\`,
    \`https://cloudflare-ipfs.com/ipfs/\${hash}\`,
    \`https://dweb.link/ipfs/\${hash}\`
  ];

  for (const gateway of gateways) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(gateway, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        console.log(\`✅ Fetched from \${gateway}\`);
        return data;
      }
    } catch (error) {
      console.warn(\`❌ Failed: \${gateway}\`);
      continue;
    }
  }
  
  throw new Error("All IPFS gateways failed");
};

// Usage
const jobData = await fetchFromIPFS("QmX7h5kLN8R...");
console.log("Job Title:", jobData.title);`
    },
    {
      title: 'Upload File to IPFS',
      description: 'Upload binary files (images, PDFs, documents) to IPFS',
      code: `const uploadFileToIPFS = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(
    'https://api.pinata.cloud/pinning/pinFileToIPFS',
    {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${PINATA_API_KEY}\`
      },
      body: formData
    }
  );

  const data = await response.json();
  return data.IpfsHash;
};

// Usage
const file = document.getElementById('fileInput').files[0];
const fileHash = await uploadFileToIPFS(file);
console.log("File uploaded:", fileHash);

// Access file at:
// https://gateway.pinata.cloud/ipfs/{fileHash}`
    },
    {
      title: 'Submit Application with Milestones',
      description: 'Create application with proposed milestones and upload to IPFS',
      code: `// Step 1: Upload each milestone to IPFS
const milestones = [
  { title: "Phase 1", content: "Design mockups", amount: 200 },
  { title: "Phase 2", content: "Development", amount: 500 }
];

const milestoneHashes = [];
for (let i = 0; i < milestones.length; i++) {
  const milestone = milestones[i];
  const milestoneData = {
    title: milestone.title,
    content: milestone.content,
    amount: milestone.amount,
    index: i,
    timestamp: new Date().toISOString()
  };
  
  const response = await fetch(
    "https://api.pinata.cloud/pinning/pinJSONToIPFS",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": \`Bearer \${PINATA_API_KEY}\`
      },
      body: JSON.stringify({
        pinataContent: milestoneData,
        pinataMetadata: {
          name: \`proposed-milestone-\${i}-\${Date.now()}\`,
          keyvalues: {
            type: "proposed_milestone",
            jobId: jobId
          }
        }
      })
    }
  );
  
  const data = await response.json();
  milestoneHashes.push(data.IpfsHash);
}

// Step 2: Upload application details
const applicationDetails = {
  description: "I'm perfect for this job because...",
  applicant: walletAddress,
  jobId: "40232-57",
  milestones: milestones,
  preferredChain: "OP Sepolia",
  timestamp: new Date().toISOString()
};

const appResponse = await fetch(
  "https://api.pinata.cloud/pinning/pinJSONToIPFS",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": \`Bearer \${PINATA_API_KEY}\`
    },
    body: JSON.stringify({
      pinataContent: applicationDetails,
      pinataMetadata: {
        name: \`job-application-\${jobId}-\${Date.now()}\`,
        keyvalues: {
          jobId: jobId,
          applicant: walletAddress,
          type: "job_application"
        }
      }
    })
  }
);

const appData = await appResponse.json();
const applicationHash = appData.IpfsHash;

// Step 3: Submit to contract
await lowjc.applyToJob(
  jobId,
  applicationHash,
  milestoneHashes, // Use as descriptions
  amounts,
  preferredChainDomain,
  lzOptions
);`
    },
    {
      title: 'IPFS Caching Strategy',
      description: 'Implement client-side caching for faster IPFS data retrieval',
      code: `// IPFS cache with 1-hour TTL
const ipfsCache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

const fetchFromIPFS = async (hash, timeout = 5000) => {
  // Check cache first
  const cached = ipfsCache.get(hash);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    console.log(\`✅ Using cached IPFS data for \${hash}\`);
    return cached.data;
  }

  const gateways = [
    \`https://ipfs.io/ipfs/\${hash}\`,
    \`https://gateway.pinata.cloud/ipfs/\${hash}\`,
    \`https://cloudflare-ipfs.com/ipfs/\${hash}\`,
    \`https://dweb.link/ipfs/\${hash}\`
  ];

  for (const gateway of gateways) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(gateway, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        
        // Cache the result
        ipfsCache.set(hash, {
          data,
          timestamp: Date.now()
        });
        
        console.log(\`📦 Cached IPFS data for \${hash}\`);
        return data;
      }
    } catch (error) {
      continue;
    }
  }
  
  throw new Error("All IPFS gateways failed");
};`
    }
  ],
  
  bestPractices: [
    'Always upload data to IPFS before calling smart contract functions',
    'Use Pinata metadata (keyvalues) for better organization and searchability',
    'Implement multi-gateway fallbacks for data retrieval reliability',
    'Cache IPFS data client-side to reduce gateway load and improve UX',
    'Validate data structure before uploading to ensure consistency',
    'Store file metadata separately from file content for better indexing',
    'Use ISO 8601 timestamps for all date fields',
    'Keep sensitive data off IPFS - only public information should be uploaded',
    'Pin important data to prevent garbage collection',
    'Use descriptive naming in pinataMetadata for easier debugging',
    'Handle IPFS gateway timeouts gracefully with loading states',
    'Consider data size - large files may take time to propagate',
    'Test IPFS uploads on testnet before mainnet deployment',
    'Monitor Pinata API limits and implement rate limiting if needed'
  ],
  
  gateways: [
    { name: 'Pinata', url: 'https://gateway.pinata.cloud/ipfs/', speed: 'Fast', reliability: 'High' },
    { name: 'IPFS.io', url: 'https://ipfs.io/ipfs/', speed: 'Medium', reliability: 'High' },
    { name: 'Cloudflare', url: 'https://cloudflare-ipfs.com/ipfs/', speed: 'Fast', reliability: 'High' },
    { name: 'Dweb.link', url: 'https://dweb.link/ipfs/', speed: 'Medium', reliability: 'Medium' }
  ]
};
