export const profileManager = {
  id: 'profileManager',
  name: 'Profile Manager',
  chain: 'l2',
  column: 'l2-center',
  order: 2,
  status: 'testnet',
  version: 'v1.0.0',
  gas: '67K',
  mainnetNetwork: 'Arbitrum One',
  testnetNetwork: 'Arbitrum Sepolia',
  mainnetDeployed: 'Not deployed',
  testnetDeployed: 'Deployed',
  mainnetAddress: null,
  testnetAddress: '0xFc4dA60Ea9D88B81a894CfbD5941b7d0E3fEe401',
  isUUPS: true,
  implementationAddress: '0x30aAA1f297711d10dFeC015704320Cf823DA5130',
  tvl: 'N/A',
  docs: 'Profile Manager - Centralized profile and portfolio management system for the OpenWork multi-chain platform.',
  
  overview: {
    purpose: 'Profile Manager is the central hub for managing user profiles and portfolios across the OpenWork multi-chain ecosystem. It provides a unified profile system that works seamlessly across all Local chains, handles portfolio item management, processes post-job ratings, and maintains professional reputation data. All write operations are bridge-controlled to ensure consistency, while profile data is stored in OpenworkGenesis for persistence across upgrades.',
    tier: 'Native Chain (Arbitrum Sepolia)',
    category: 'Profile Management',
    upgradeability: 'UUPS Upgradeable (owner + bridge can upgrade)'
  },
  
  features: [
    'Cross-chain profile creation: Users on any Local chain can create profiles that exist on Native chain',
    'IPFS-based storage: All profile data stored on IPFS with content hashes on-chain for verifiability',
    'Portfolio management: Add, update, and remove portfolio items to showcase work and skills',
    'Referral tracking: Records referrer addresses to build reputation networks',
    'Post-job rating system: Job givers and freelancers rate each other (1-5 stars) after job completion',
    'Profile updates: Users can update their profile IPFS hash to refresh information',
    'Bridge-enforced access control: All write operations require bridge authorization for security'
  ],
  
  systemPosition: {
    description: 'Profile Manager sits on the Native Chain (Arbitrum) and acts as the single source of truth for user profiles across the entire OpenWork multi-chain platform. When users create or update profiles from any Local chain (Ethereum, OP, Base, etc.), the requests are routed through LayerZero bridges to Profile Manager, which validates and stores the data in OpenworkGenesis. This centralized approach ensures profile consistency across all chains while maintaining decentralization through bridge-based access control.',
    diagram: `
📍 Cross-Chain Profile Architecture

Local Chains (Ethereum, OP, Base, Polygon)
    └─> User Profile Actions
        └─> Local Bridge (LayerZero)
            └─> Native Bridge (Message Router)
                └─> Profile Manager ⭐ (You are here)
                    ├─> OpenworkGenesis (Profile Storage)
                    │   ├─ Profile Data (IPFS hashes)
                    │   ├─ Portfolio Items
                    │   ├─ Referrer Info
                    │   └─ Ratings
                    └─> Events
                        ├─ ProfileCreated
                        ├─ PortfolioAdded
                        └─ UserRated

Frontend Apps (All Chains)
    └─> Query Profile Manager
        └─> Display Profiles
        └─> Show Portfolios
        └─> Show Ratings`
  },
  
  dependencies: {
    dependsOn: [
      { 
        name: 'OpenworkGenesis', 
        reason: 'Stores all profile data, portfolio items, and ratings. Profile Manager reads/writes profile state here.',
        type: 'Storage'
      },
      { 
        name: 'Native Bridge', 
        reason: 'Routes cross-chain profile operations and enforces access control for all write functions.',
        type: 'Bridge'
      }
    ],
    requiredBy: [
      { 
        name: 'Frontend Applications', 
        reason: 'Display user profiles, portfolios, and ratings in the UI across all chains.',
        type: 'User Interface'
      },
      { 
        name: 'NOWJC', 
        reason: 'Verifies job poster and freelancer profiles exist before allowing job operations.',
        type: 'Job Management'
      },
      { 
        name: 'Native Athena', 
        reason: 'Checks profile existence and ratings when validating dispute participants.',
        type: 'Dispute Resolution'
      }
    ],
    prerequisites: [
      'OpenworkGenesis must be deployed and initialized',
      'Native Bridge must be deployed and configured with Local chain endpoints',
      'Bridge must be authorized to call Profile Manager functions',
      'IPFS gateway must be accessible for profile data storage'
    ]
  },
  
  functions: [
    {
      category: 'Profile Management',
      description: 'Core functions for creating and managing user profiles and portfolios',
      items: [
        {
          name: 'createProfile',
          signature: 'createProfile(address user, string ipfsHash, address referrerAddress)',
          whatItDoes: 'Creates a new user profile with IPFS-stored data and optional referrer tracking.',
          whyUse: 'Called automatically via bridge when users create profiles on any Local chain. This establishes their professional identity in the OpenWork ecosystem.',
          howItWorks: [
            'Validates caller is the Native Bridge',
            'Validates user address is not zero',
            'Checks user doesn\'t already have a profile',
            'Increments profile counter',
            'Adds user to allProfileUsers tracking array',
            'Stores profile in OpenworkGenesis with IPFS hash and referrer',
            'Emits ProfileCreated event'
          ],
          parameters: [
            { name: 'user', type: 'address', description: 'Address of the user creating profile' },
            { name: 'ipfsHash', type: 'string', description: 'IPFS hash containing profile data (name, bio, skills, contact info)' },
            { name: 'referrerAddress', type: 'address', description: 'Address of user who referred this user (can be zero address)' }
          ],
          accessControl: 'Bridge-only: Can only be called by Native Bridge contract',
          events: [
            'ProfileCreated(user, ipfsHash, referrerAddress)'
          ],
          gasEstimate: '~55K gas',
          example: `// User creates profile on Local chain (e.g., Ethereum)
// Frontend uploads profile data to IPFS first
const profileData = {
  name: "Alice Johnson",
  bio: "Senior Frontend Developer...",
  skills: ["React", "TypeScript", "Web3"],
  portfolio: "https://alice.dev",
  contact: "alice@example.com"
};

// Upload to IPFS
const ipfsHash = await uploadToIPFS(profileData);
// Returns: "QmProfileHash123..."

// User calls Local chain contract
const lzFee = await localBridge.quoteSendToNative(...);
await localProfileContract.createProfile(
  ipfsHash,
  referrerAddress,  // Optional: address(0) if no referrer
  lzOptions,
  { value: lzFee }
);

// ↓ LayerZero bridges the message
// ↓ Native Bridge receives and calls:

await profileManager.createProfile(
  userAddress,
  "QmProfileHash123...",
  referrerAddress,
  { from: nativeBridgeAddress }
);

// Profile now exists on Native chain
// Visible on all chains`,
          relatedFunctions: ['updateProfile', 'addPortfolio', 'getProfile']
        },
        {
          name: 'updateProfile',
          signature: 'updateProfile(address user, string newIpfsHash)',
          whatItDoes: 'Updates an existing user profile with new IPFS data while preserving portfolio and rating history.',
          whyUse: 'Users call this to refresh their profile information (update bio, add new skills, change contact info) without losing their portfolio or ratings.',
          howItWorks: [
            'Validates caller is Native Bridge',
            'Validates user address is not zero',
            'Checks profile exists for user',
            'Validates IPFS hash is not empty',
            'Updates profile IPFS hash in OpenworkGenesis',
            'Emits ProfileUpdated event'
          ],
          parameters: [
            { name: 'user', type: 'address', description: 'Address of user updating profile' },
            { name: 'newIpfsHash', type: 'string', description: 'New IPFS hash with updated profile data' }
          ],
          accessControl: 'Bridge-only: Can only be called by Native Bridge',
          events: [
            'ProfileUpdated(user, newIpfsHash)'
          ],
          gasEstimate: '~28K gas',
          example: `// User updates profile after gaining new skills
const updatedProfile = {
  ...existingProfile,
  skills: [...existingProfile.skills, "Solidity", "Web3.js"],
  bio: "Senior Full-Stack Developer with blockchain expertise..."
};

const newIpfsHash = await uploadToIPFS(updatedProfile);

await localProfileContract.updateProfile(
  newIpfsHash,
  lzOptions,
  { value: lzFee }
);

// Profile updated on Native chain
// Portfolio and ratings preserved`,
          relatedFunctions: ['createProfile', 'getProfile']
        },
        {
          name: 'addPortfolio',
          signature: 'addPortfolio(address user, string portfolioHash)',
          whatItDoes: 'Adds a new portfolio item to user\'s profile showcasing completed work, projects, or certifications.',
          whyUse: 'Freelancers use this to build credibility by adding links to their work, code repositories, designs, or case studies.',
          howItWorks: [
            'Validates caller is Native Bridge',
            'Validates user address is not zero',
            'Checks profile exists',
            'Adds portfolio IPFS hash to user\'s portfolio array in Genesis',
            'Emits PortfolioAdded event'
          ],
          parameters: [
            { name: 'user', type: 'address', description: 'Address of user adding portfolio item' },
            { name: 'portfolioHash', type: 'string', description: 'IPFS hash containing portfolio item details (title, description, images, links)' }
          ],
          accessControl: 'Bridge-only: Can only be called by Native Bridge',
          events: [
            'PortfolioAdded(user, portfolioHash)'
          ],
          gasEstimate: '~35K gas',
          example: `// User adds completed project to portfolio
const portfolioItem = {
  title: "DeFi Dashboard",
  description: "Built a real-time DeFi analytics dashboard...",
  technologies: ["React", "ethers.js", "The Graph"],
  images: ["QmImage1...", "QmImage2..."],
  liveLink: "https://defi-dash.example.com",
  githubRepo: "https://github.com/user/defi-dashboard",
  completedDate: "2025-01-15"
};

const portfolioHash = await uploadToIPFS(portfolioItem);

await localProfileContract.addPortfolio(
  portfolioHash,
  lzOptions,
  { value: lzFee }
);

// Portfolio item added
// Shows up in profile across all chains`,
          relatedFunctions: ['updatePortfolioItem', 'removePortfolioItem', 'createProfile']
        },
        {
          name: 'updatePortfolioItem',
          signature: 'updatePortfolioItem(address user, uint256 index, string newPortfolioHash)',
          whatItDoes: 'Updates a specific portfolio item by index with new IPFS data.',
          whyUse: 'Users can refresh portfolio items with updated screenshots, improved descriptions, or new achievements without removing and re-adding.',
          howItWorks: [
            'Validates caller is Native Bridge',
            'Validates user address is not zero',
            'Checks profile exists',
            'Validates portfolio hash is not empty',
            'Updates portfolio item at specified index in Genesis',
            'Emits PortfolioItemUpdated event'
          ],
          parameters: [
            { name: 'user', type: 'address', description: 'Address of user updating portfolio' },
            { name: 'index', type: 'uint256', description: 'Array index of portfolio item to update (0-based)' },
            { name: 'newPortfolioHash', type: 'string', description: 'New IPFS hash with updated portfolio item data' }
          ],
          accessControl: 'Bridge-only: Can only be called by Native Bridge',
          events: [
            'PortfolioItemUpdated(user, index, newPortfolioHash)'
          ],
          gasEstimate: '~32K gas',
          example: `// User updates portfolio item #0 with better screenshots
const updatedItem = {
  ...existingItem,
  images: ["QmNewImage1...", "QmNewImage2...", "QmNewImage3..."],
  description: "Enhanced description with more details..."
};

const newHash = await uploadToIPFS(updatedItem);

await localProfileContract.updatePortfolioItem(
  0,  // Update first portfolio item
  newHash,
  lzOptions,
  { value: lzFee }
);

// Portfolio item updated at index 0`,
          relatedFunctions: ['addPortfolio', 'removePortfolioItem']
        },
        {
          name: 'removePortfolioItem',
          signature: 'removePortfolioItem(address user, uint256 index)',
          whatItDoes: 'Removes a portfolio item from user\'s profile by index, shifting remaining items down.',
          whyUse: 'Users can remove outdated or irrelevant portfolio items to keep their profile current and professional.',
          howItWorks: [
            'Validates caller is Native Bridge',
            'Validates user address is not zero',
            'Checks profile exists',
            'Removes portfolio item at index from Genesis',
            'Shifts remaining items down (array pop operation)',
            'Emits PortfolioItemRemoved event'
          ],
          parameters: [
            { name: 'user', type: 'address', description: 'Address of user removing portfolio item' },
            { name: 'index', type: 'uint256', description: 'Array index of portfolio item to remove (0-based)' }
          ],
          accessControl: 'Bridge-only: Can only be called by Native Bridge',
          events: [
            'PortfolioItemRemoved(user, index)'
          ],
          gasEstimate: '~30K gas',
          example: `// User removes outdated portfolio item
await localProfileContract.removePortfolioItem(
  2,  // Remove third portfolio item (index 2)
  lzOptions,
  { value: lzFee }
);

// Portfolio item removed
// Items at index 3, 4, etc. shift down to 2, 3, etc.`,
          relatedFunctions: ['addPortfolio', 'updatePortfolioItem']
        }
      ]
    },
    {
      category: 'Rating System',
      description: 'Post-job rating functionality for building reputation',
      items: [
        {
          name: 'rate',
          signature: 'rate(address rater, string jobId, address userToRate, uint256 rating)',
          whatItDoes: 'Allows job givers and freelancers to rate each other after job completion with a score of 1-5 stars.',
          whyUse: 'Builds trust and reputation in the platform. Job givers rate freelancer quality, and freelancers rate client professionalism.',
          howItWorks: [
            'Validates caller is Native Bridge',
            'Validates rating is between 1 and 5',
            'Retrieves job from OpenworkGenesis',
            'Validates job exists',
            'Checks authorization: job giver can rate job taker, or vice versa',
            'Stores rating in OpenworkGenesis',
            'Rating becomes part of user\'s permanent reputation',
            'Emits UserRated event'
          ],
          parameters: [
            { name: 'rater', type: 'address', description: 'Address giving the rating (job giver or freelancer)' },
            { name: 'jobId', type: 'string', description: 'Job ID for which rating is being given' },
            { name: 'userToRate', type: 'address', description: 'Address being rated (job giver or freelancer)' },
            { name: 'rating', type: 'uint256', description: 'Rating score: 1 (poor) to 5 (excellent)' }
          ],
          accessControl: 'Bridge-only: Can only be called by Native Bridge',
          events: [
            'UserRated(jobId, rater, userToRate, rating)'
          ],
          gasEstimate: '~42K gas',
          example: `// Job giver rates freelancer after job completion
await localJobContract.rateFreelancer(
  "40232-57",  // Job ID
  freelancerAddress,
  5,  // 5 stars - excellent work!
  lzOptions,
  { value: lzFee }
);

// Rating stored on Native chain
// Contributes to freelancer's average rating

// Example rating breakdown:
// Rating 1: Poor - Did not meet expectations
// Rating 2: Below Average - Significant issues
// Rating 3: Average - Met basic requirements
// Rating 4: Good - Exceeded expectations
// Rating 5: Excellent - Outstanding work`,
          relatedFunctions: ['getUserRating', 'getProfile']
        }
      ]
    },
    {
      category: 'View Functions',
      description: 'Read-only functions for retrieving profile and rating data',
      items: [
        {
          name: 'getProfile',
          signature: 'getProfile(address user) view returns (address userAddress, string ipfsHash, address referrerAddress, string[] portfolioHashes)',
          whatItDoes: 'Retrieves complete profile information for a user including IPFS hash, referrer, and all portfolio items.',
          whyUse: 'Frontend applications and other contracts call this to display user profiles and verify identity.',
          howItWorks: [
            'Queries OpenworkGenesis for user\'s profile',
            'Returns profile struct with all fields',
            'If profile doesn\'t exist, returns empty data'
          ],
          parameters: [
            { name: 'user', type: 'address', description: 'Address of user to retrieve profile for' }
          ],
          accessControl: 'Public view function - anyone can call',
          events: ['None (view function)'],
          gasEstimate: 'N/A (view function)',
          example: `// Fetch user profile for display
const profile = await profileManager.getProfile(userAddress);

console.log("User:", profile.userAddress);
console.log("Profile IPFS:", profile.ipfsHash);
console.log("Referred by:", profile.referrerAddress);
console.log("Portfolio items:", profile.portfolioHashes.length);

// Frontend fetches IPFS data
const profileData = await fetchFromIPFS(profile.ipfsHash);
console.log("Name:", profileData.name);
console.log("Bio:", profileData.bio);

// Display portfolio
for (const portfolioHash of profile.portfolioHashes) {
  const item = await fetchFromIPFS(portfolioHash);
  console.log("Project:", item.title);
}`,
          relatedFunctions: ['hasProfile', 'getUserRating']
        },
        {
          name: 'getProfileCount',
          signature: 'getProfileCount() view returns (uint256)',
          whatItDoes: 'Returns the total number of profiles created on the platform.',
          whyUse: 'Useful for analytics, pagination, and understanding platform growth.',
          howItWorks: [
            'Returns profileCount state variable',
            'Increments each time createProfile is called'
          ],
          parameters: [],
          accessControl: 'Public view function',
          events: ['None (view function)'],
          gasEstimate: 'N/A (view function)',
          example: `// Check total platform users
const totalProfiles = await profileManager.getProfileCount();
console.log(\`Total profiles: \${totalProfiles}\`);

// Use for pagination
const pageSize = 10;
const totalPages = Math.ceil(totalProfiles / pageSize);`,
          relatedFunctions: ['getProfileByIndex', 'getAllProfileUsers']
        },
        {
          name: 'getProfileByIndex',
          signature: 'getProfileByIndex(uint256 index) view returns (address userAddress, string ipfsHash, address referrerAddress, string[] portfolioHashes)',
          whatItDoes: 'Retrieves profile information by array index for pagination and iteration.',
          whyUse: 'Allows frontend to paginate through all profiles or build leaderboards.',
          howItWorks: [
            'Validates index is within bounds',
            'Gets user address from allProfileUsers array',
            'Retrieves and returns full profile for that user'
          ],
          parameters: [
            { name: 'index', type: 'uint256', description: 'Array index (0 to getProfileCount()-1)' }
          ],
          accessControl: 'Public view function',
          events: ['None (view function)'],
          gasEstimate: 'N/A (view function)',
          example: `// Paginate through profiles
const pageSize = 10;
const page = 0;
const startIdx = page * pageSize;

for (let i = startIdx; i < startIdx + pageSize; i++) {
  if (i >= await profileManager.getProfileCount()) break;
  
  const profile = await profileManager.getProfileByIndex(i);
  console.log(\`Profile \${i}: \${profile.userAddress}\`);
}`,
          relatedFunctions: ['getProfileCount', 'getAllProfileUsers']
        },
        {
          name: 'getAllProfileUsers',
          signature: 'getAllProfileUsers() view returns (address[])',
          whatItDoes: 'Returns array of all user addresses that have created profiles.',
          whyUse: 'Quick way to get all profile addresses for batch operations or analytics.',
          howItWorks: [
            'Returns allProfileUsers state array',
            'Contains addresses in order of profile creation'
          ],
          parameters: [],
          accessControl: 'Public view function',
          events: ['None (view function)'],
          gasEstimate: 'N/A (view function, may be gas-intensive for large arrays)',
          example: `// Get all profile addresses
const allUsers = await profileManager.getAllProfileUsers();
console.log(\`Total users: \${allUsers.length}\`);

// Batch fetch profiles
const profiles = await Promise.all(
  allUsers.map(addr => profileManager.getProfile(addr))
);

// WARNING: For large platforms, use pagination instead
// This function may hit gas limits with many profiles`,
          relatedFunctions: ['getProfileCount', 'getProfileByIndex']
        },
        {
          name: 'hasProfile',
          signature: 'hasProfile(address user) view returns (bool)',
          whatItDoes: 'Checks if a user has created a profile.',
          whyUse: 'Quick validation before operations that require profiles (job posting, applications).',
          howItWorks: [
            'Queries OpenworkGenesis hasProfile mapping',
            'Returns true if profile exists, false otherwise'
          ],
          parameters: [
            { name: 'user', type: 'address', description: 'Address to check' }
          ],
          accessControl: 'Public view function',
          events: ['None (view function)'],
          gasEstimate: 'N/A (view function)',
          example: `// Check if user needs to create profile
const hasProfile = await profileManager.hasProfile(userAddress);

if (!hasProfile) {
  // Redirect to profile creation
  console.log("Please create a profile first");
  return;
}

// Proceed with job posting/application
await postJob(...);`,
          relatedFunctions: ['createProfile', 'getProfile']
        },
        {
          name: 'getUserRating',
          signature: 'getUserRating(address user) view returns (uint256)',
          whatItDoes: 'Calculates and returns user\'s average rating based on all ratings received.',
          whyUse: 'Display reputation score on profiles, use for featured freelancer lists, or in hiring decisions.',
          howItWorks: [
            'Retrieves all ratings for user from OpenworkGenesis',
            'Calculates sum of all ratings',
            'Divides by number of ratings to get average',
            'Returns 0 if no ratings exist'
          ],
          parameters: [
            { name: 'user', type: 'address', description: 'Address to get rating for' }
          ],
          accessControl: 'Public view function',
          events: ['None (view function)'],
          gasEstimate: 'N/A (view function)',
          example: `// Display user reputation
const avgRating = await profileManager.getUserRating(userAddress);

if (avgRating === 0) {
  console.log("No ratings yet");
} else {
  console.log(\`Average rating: \${avgRating}/5 stars\`);
  
  // Display stars in UI
  const stars = "⭐".repeat(avgRating);
  console.log(stars);
}

// Get detailed ratings
const profile = await profileManager.getProfile(userAddress);
const ratings = await genesis.getUserRatings(userAddress);
console.log(\`Based on \${ratings.length} ratings\`);`,
          relatedFunctions: ['rate', 'getProfile']
        }
      ]
    }
  ],
  
  dataFlows: [
    {
      title: 'Cross-Chain Profile Creation Flow',
      description: 'How users create profiles from any Local chain',
      steps: [
        { chain: 'User\'s Device', action: '1. User uploads profile data (name, bio, skills) to IPFS' },
        { chain: 'IPFS Network', action: '2. IPFS returns content hash (e.g., QmProfile123...)' },
        { chain: 'Local Chain (e.g., Ethereum)', action: '3. User calls Local Profile Contract.createProfile()' },
        { chain: 'Local Chain', action: '4. User pays LayerZero message fee' },
        { chain: 'Local Chain', action: '5. Local Bridge sends LayerZero message with profile data' },
        { chain: 'Native Chain (Arbitrum)', action: '6. Native Bridge receives message' },
        { chain: 'Native Chain', action: '7. Native Bridge calls ProfileManager.createProfile()' },
        { chain: 'Native Chain', action: '8. Profile Manager validates and stores in OpenworkGenesis' },
        { chain: 'Native Chain', action: '9. ProfileCreated event emitted' },
        { chain: 'All Chains', action: '10. Profile now queryable from any chain' }
      ]
    },
    {
      title: 'Portfolio Update Flow',
      description: 'How users add and manage portfolio items',
      steps: [
        { chain: 'User\'s Device', action: 'User creates portfolio item (project details, images, links)' },
        { chain: 'IPFS Network', action: 'Upload portfolio item to IPFS, get hash' },
        { chain: 'Local Chain', action: 'Call addPortfolio() via Local chain contract' },
        { chain: 'Native Chain', action: 'Bridge routes to Profile Manager' },
        { chain: 'Native Chain', action: 'Portfolio hash added to user\'s portfolio array' },
        { chain: 'Native Chain', action: 'PortfolioAdded event emitted' },
        { chain: 'Frontend', action: 'Display new portfolio item on profile' }
      ]
    },
    {
      title: 'Post-Job Rating Flow',
      description: 'How ratings are given after job completion',
      steps: [
        { chain: 'Local Chain', action: 'Job completed successfully' },
        { chain: 'Local Chain', action: 'Job giver calls rateFreelancer() with 1-5 stars' },
        { chain: 'Native Chain', action: 'Bridge routes to Profile Manager' },
        { chain: 'Native Chain', action: 'Profile Manager validates: job exists, rater is authorized' },
        { chain: 'Native Chain', action: 'Rating stored in OpenworkGenesis' },
        { chain: 'Native Chain', action: 'UserRated event emitted' },
        { chain: 'Native Chain', action: 'Rating permanently affects user\'s average rating' },
        { chain: 'Frontend', action: 'Updated rating displays on user\'s profile' }
      ]
    }
  ],
  
  integrationGuide: {
    example: `// Complete Profile Manager Integration Example
const { ethers } = require('ethers');

// 1. Setup contracts
const profileManager = new ethers.Contract(
  profileManagerAddress,
  profileManagerABI,
  provider
);
const localBridge = new ethers.Contract(
  localBridgeAddress,
  localBridgeABI,
  signer
);

// 2. Check if user has profile
const hasProfile = await profileManager.hasProfile(userAddress);

if (!hasProfile) {
  console.log("Creating profile...");
  
  // Upload profile data to IPFS
  const profileData = {
    name: "Alice Johnson",
    bio: "Senior Full-Stack Developer with 5 years experience",
    skills: ["React", "Node.js", "Solidity", "TypeScript"],
    location: "San Francisco, CA",
    timezone: "PST",
    hourlyRate: "$100-150",
    availability: "Full-time",
    portfolio: "https://alice.dev",
    github: "https://github.com/alice",
    linkedin: "https://linkedin.com/in/alice"
  };
  
  const ipfsHash = await uploadToIPFS(profileData);
  console.log(\`Profile uploaded to IPFS: \${ipfsHash}\`);
  
  // Quote LayerZero fee
  const lzOptions = ethers.solidityPacked(
    ['uint16', 'uint256'],
    [1, 200000]
  );
  
  const lzFee = await localBridge.quoteSendToNative(
    "createProfile",
    lzOptions
  );
  
  // Create profile via Local chain
  const tx = await localProfileContract.createProfile(
    ipfsHash,
    referrerAddress || ethers.ZeroAddress,
    lzOptions,
    { value: lzFee }
  );
  
  await tx.wait();
  console.log("Profile created!");
}

// 3. Fetch and display profile
const profile = await profileManager.getProfile(userAddress);
console.log("User:", profile.userAddress);
console.log("Profile IPFS:", profile.ipfsHash);
console.log("Portfolio items:", profile.portfolioHashes.length);

// Fetch IPFS data
const profileData = await fetchFromIPFS(profile.ipfsHash);
console.log("Name:", profileData.name);
console.log("Skills:", profileData.skills.join(", "));

// 4. Add portfolio item
const portfolioItem = {
  title: "DeFi Dashboard",
  description: "Real-time analytics dashboard for DeFi protocols",
  technologies: ["React", "ethers.js", "The Graph"],
  images: ["QmImage1...", "QmImage2..."],
  liveLink: "https://defi-dash.example.com",
  completedDate: "2025-01"
};

const portfolioHash = await uploadToIPFS(portfolioItem);

const lzFee2 = await localBridge.quoteSendToNative("addPortfolio", lzOptions);
await localProfileContract.addPortfolio(portfolioHash, lzOptions, { value: lzFee2 });

console.log("Portfolio item added!");

// 5. Display user rating
const avgRating = await profileManager.getUserRating(userAddress);
console.log(\`Average rating: \${avgRating}/5 stars\`);`,
    tips: [
      'Always validate IPFS hashes client-side before submitting transactions',
      'Profile creation is one-time only - users cannot recreate profiles',
      'Portfolio items can be freely added, updated, or removed at any time',
      'Ratings are permanent and immutable once given',
      'Check hasProfile() before allowing job posting or application',
      'Use pagination (getProfileByIndex) instead of getAllProfileUsers for large datasets',
      'Store high-quality profile images and work samples on IPFS',
      'Referrer addresses help build trust networks in the platform',
      'Average ratings update automatically as new ratings are added',
      'Bridge operations require LayerZero fees - always quote first'
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
        description: 'Native Bridge contract address (for cross-chain profile operations)',
        placeholder: '0x...'
      },
      {
        name: '_genesis',
        type: 'address',
        description: 'OpenworkGenesis or ProfileGenesis contract address (for profile data storage)',
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
    estimatedGas: '2.5M',
    postDeploy: {
      message: 'UUPS deployment complete! Next: Initialize the proxy contract on block scanner.',
      nextSteps: [
        '1. Deploy ProfileManager implementation contract (no constructor params)',
        '2. Deploy UUPSProxy with implementation address',
        '3. Call initialize() on proxy via block scanner with:',
        '   - Owner address (your admin wallet)',
        '   - Native Bridge address',
        '   - ProfileGenesis (or OpenworkGenesis) address',
        '4. Ensure ProfileGenesis is authorized to receive writes:',
        '   - ProfileGenesis.authorizeContract(profileManagerAddress, true)',
        '5. Configure Native Bridge to route profile messages:',
        '   - NativeBridge.setProfileManager(profileManagerAddress)',
        '6. Test profile creation from Local chain',
        '7. Test portfolio management (add/update/remove)',
        '8. Test rating system after job completion',
        '9. Verify both implementation and proxy on Arbiscan',
        '10. Ensure Local chains have profile creation UI configured'
      ]
    }
  },
  
  securityConsiderations: [
    'UUPS upgradeable - owner and bridge can upgrade implementation',
    'Bridge-only write access prevents unauthorized profile manipulation',
    'Profile creation is one-time to prevent identity fraud',
    'Rating authorization validates only job participants can rate',
    'IPFS hashes are not validated on-chain - frontend must validate',
    'All profile data stored in OpenworkGenesis for upgrade persistence',
    'Portfolio array operations validate bounds to prevent errors',
    'Rating values constrained to 1-5 range',
    'Zero address checks prevent invalid profile creation'
  ],
  
  code: `// Full implementation: contracts/openwork-full-contract-suite-layerzero+CCTP 2 Dec/profile-manager.sol

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import { UUPSUpgradeable } from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import { OwnableUpgradeable } from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract ProfileManager is 
    Initializable,
    OwnableUpgradeable,
    UUPSUpgradeable
{
    // ==================== STATE VARIABLES ====================
    IOpenworkGenesis public genesis;
    address public bridge;
    address[] private allProfileUsers;
    uint256 private profileCount;

    // ==================== INITIALIZATION ====================
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _owner,
        address _bridge,
        address _genesis
    ) public initializer {
        __Ownable_init(_owner);
        __UUPSUpgradeable_init();
        bridge = _bridge;
        genesis = IOpenworkGenesis(_genesis);
    }

    function _authorizeUpgrade(address) internal view override {
        require(owner() == _msgSender() || address(bridge) == _msgSender(), "Unauthorized");
    }

    // ==================== PROFILE MANAGEMENT ====================
    function createProfile(
        address _user, 
        string memory _ipfsHash, 
        address _referrerAddress
    ) external {
        require(msg.sender == bridge, "Only bridge");
        require(_user != address(0), "Invalid address");
        require(!genesis.hasProfile(_user), "Profile exists");
        
        allProfileUsers.push(_user);
        profileCount++;
        genesis.setProfile(_user, _ipfsHash, _referrerAddress);
        
        emit ProfileCreated(_user, _ipfsHash, _referrerAddress);
    }
    
    function addPortfolio(address _user, string memory _portfolioHash) external {
        require(msg.sender == bridge, "Only bridge");
        require(genesis.hasProfile(_user), "Profile does not exist");
        
        genesis.addPortfolio(_user, _portfolioHash);
        emit PortfolioAdded(_user, _portfolioHash);
    }
    
    function updateProfile(address _user, string memory _newIpfsHash) external {
        require(msg.sender == bridge, "Only bridge");
        require(genesis.hasProfile(_user), "Profile does not exist");
        
        genesis.updateProfileIpfsHash(_user, _newIpfsHash);
        emit ProfileUpdated(_user, _newIpfsHash);
    }

    function rate(
        address _rater,
        string memory _jobId,
        address _userToRate,
        uint256 _rating
    ) external {
        require(msg.sender == bridge, "Only bridge");
        require(_rating > 0 && _rating <= 5, "Rating 1-5");
        
        IOpenworkGenesis.Job memory job = genesis.getJob(_jobId);
        bool isAuthorized = (_rater == job.jobGiver && _userToRate == job.selectedApplicant) ||
                           (_rater == job.selectedApplicant && _userToRate == job.jobGiver);
        require(isAuthorized, "Not authorized");
        
        genesis.setJobRating(_jobId, _userToRate, _rating);
        emit UserRated(_jobId, _rater, _userToRate, _rating);
    }

    // ==================== VIEW FUNCTIONS ====================
    function getProfile(address _user) external view returns (
        address userAddress,
        string memory ipfsHash,
        address referrerAddress,
        string[] memory portfolioHashes
    ) {
        IOpenworkGenesis.Profile memory profile = genesis.getProfile(_user);
        return (profile.userAddress, profile.ipfsHash, profile.referrerAddress, profile.portfolioHashes);
    }
    
    function getUserRating(address _user) external view returns (uint256) {
        uint256[] memory ratings = genesis.getUserRatings(_user);
        if (ratings.length == 0) return 0;
        uint256 total = 0;
        for (uint i = 0; i < ratings.length; i++) {
            total += ratings[i];
        }
        return total / ratings.length;
    }
    
    // ... Additional view functions
    // See full implementation in repository
}`
};
