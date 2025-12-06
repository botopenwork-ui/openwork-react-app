export const profileGenesis = {
  id: 'profileGenesis',
  name: 'ProfileGenesis',
  chain: 'l2',
  column: 'l2-center',
  order: 1,
  status: 'testnet',
  version: 'v1.0.0',
  gas: '85K',
  mainnetNetwork: 'Arbitrum One',
  testnetNetwork: 'Arbitrum Sepolia',
  mainnetDeployed: 'Not deployed',
  testnetDeployed: 'Deployed',
  mainnetAddress: null,
  testnetAddress: '0xC37A9dFbb57837F74725AAbEe068f07A1155c394',
  isUUPS: true,
  implementationAddress: '0x16481537d0Bff65e591D3D44f6F4C38Fb8579d5d',
  tvl: 'N/A',
  docs: 'ProfileGenesis - Dedicated storage contract for user profiles, portfolios, ratings, and referral system. Separated from OpenworkGenesis for size optimization and focused access patterns. Pure storage with no business logic.',
  
  overview: {
    purpose: 'ProfileGenesis is a dedicated storage contract focusing exclusively on user identity and reputation data: profiles (IPFS hashes with user details), portfolios (work samples), ratings (job performance), and the referral system. It implements the Storage Separation Pattern like OpenworkGenesis but focuses on user-facing data rather than platform operations. This separation allows Profile Manager to upgrade independently of job/governance contracts, and keeps contract sizes under the 24KB limit. The contract stores NO business logic - only data structures, setters, and getters.',
    tier: 'Native Chain (Arbitrum Sepolia)',
    category: 'Storage Layer - User Identity',
    upgradeability: 'UUPS Upgradeable (owner only)'
  },
  
  features: [
    'User profiles: IPFS hashes storing bio, skills, experience, contact info',
    'Portfolio system: Array of IPFS hashes for work samples, case studies, projects',
    'Rating system: Per-job ratings and cumulative rating history per user',
    'Referral tracking: Who referred whom for referral bonus distribution',
    'Batch portfolio operations: Update or remove individual portfolio items',
    'Profile tracking: Maintains array of all profile addresses for enumeration',
    'Batch getters: Paginated queries (getProfileAddressesBatch) for large datasets',
    'Pure storage pattern: No business logic, only authorized setters and getters',
    'Authorization system: Only authorized contracts (Profile Manager) can write',
    'Upgrade persistence: User data survives logic contract upgrades',
    'Complementary to OpenworkGenesis: Focused on identity vs platform operations',
    'Size optimization: Separate contract keeps both under 24KB limit'
  ],
  
  systemPosition: {
    description: 'ProfileGenesis sits alongside OpenworkGenesis as the user identity storage layer. While OpenworkGenesis stores platform operational data (jobs, disputes, governance), ProfileGenesis stores user-facing reputation data. Profile Manager is the primary authorized contract, managing all profile CRUD operations. Native Rewards queries ProfileGenesis to get user referrers for bonus distribution. Job contracts may query profiles/ratings for display. This separation allows independent upgrade cycles and keeps contracts modular.',
    diagram: `
📍 User Identity Storage Architecture

ProfileGenesis ⭐ (User Identity Storage - You are here)
    ↑ Writes profile data
    │
    ├─> Profile Manager (Primary User)
    │   └─> Creates profiles, manages portfolios, stores ratings
    │
    ├─> Native Rewards
    │   └─> Queries referrer addresses for bonus distribution
    │
    └─> Job Contracts (NOWJC, LOWJC)
        └─> Query profiles/ratings for freelancer display

Relationship with OpenworkGenesis:
┌─────────────────────┐         ┌──────────────────────┐
│  OpenworkGenesis    │         │  ProfileGenesis      │
│  (Platform Ops)     │         │  (User Identity)     │
├─────────────────────┤         ├──────────────────────┤
│ • Jobs              │         │ • Profiles           │
│ • Applications      │         │ • Portfolios         │
│ • Disputes          │         │ • Ratings            │
│ • Oracles           │         │ • Referrals          │
│ • DAO Data          │         │                      │
│ • Rewards Tracking  │         │                      │
└─────────────────────┘         └──────────────────────┘
        ↓                               ↓
    Operational                    Identity/Reputation
    Platform State                 User-Facing Data

Storage Categories in ProfileGenesis:
1. Profiles (IPFS hash, referrer, portfolio array)
2. Ratings (per-job, cumulative history)
3. Referral System (user → referrer mapping)
4. Profile Tracking (all addresses for enumeration)`
  },
  
  dependencies: {
    dependsOn: [],
    requiredBy: [
      { 
        name: 'Profile Manager', 
        reason: 'Stores all profile data: creates profiles, manages portfolios, records ratings. Primary authorized contract.',
        type: 'Profile Management'
      },
      { 
        name: 'Native Rewards', 
        reason: 'Queries user referrers to distribute referral bonuses (10% to job giver\'s referrer, 10% to job taker\'s referrer).',
        type: 'Token Economics'
      },
      { 
        name: 'Job Contracts', 
        reason: 'May query profiles and ratings to display freelancer information in job listings and applications.',
        type: 'Job Management'
      }
    ],
    prerequisites: [
      'Must be deployed before Profile Manager',
      'Owner must authorize Profile Manager via authorizeContract()',
      'Profile Manager must be configured with ProfileGenesis address',
      'Referral system must be active for bonus distribution to work'
    ]
  },
  
  functions: [
    {
      category: 'Access Control',
      description: 'Functions for managing contract authorization',
      items: [
        {
          name: 'authorizeContract',
          signature: 'authorizeContract(address _contract, bool _authorized)',
          whatItDoes: 'Grants or revokes write access for logic contracts.',
          whyUse: 'Owner uses this to authorize Profile Manager to manage profile data.',
          howItWorks: [
            'Sets authorizedContracts[_contract] = _authorized',
            'Emits ContractAuthorized event',
            'Authorized contracts can call setters',
            'Non-authorized can only call view functions'
          ],
          parameters: [
            { name: '_contract', type: 'address', description: 'Contract to authorize/revoke' },
            { name: '_authorized', type: 'bool', description: 'true to authorize, false to revoke' }
          ],
          accessControl: 'onlyOwner',
          events: ['ContractAuthorized(contractAddress, authorized)'],
          gasEstimate: '~30K gas',
          example: `// During deployment, authorize Profile Manager
await profileGenesis.authorizeContract(profileManagerAddress, true);

// Now Profile Manager can manage all profile data`,
          relatedFunctions: ['transferOwnership']
        }
      ]
    },
    {
      category: 'Profile Management',
      description: 'Functions for creating and updating user profiles',
      items: [
        {
          name: 'setProfile',
          signature: 'setProfile(address user, string ipfsHash, address referrer)',
          whatItDoes: 'Creates or updates a user profile with IPFS hash and referrer.',
          whyUse: 'Called by Profile Manager when user creates or updates their profile.',
          howItWorks: [
            'Tracks new profile in allProfileAddresses array',
            'Creates Profile struct with empty portfolio',
            'Sets hasProfile[user] = true',
            'Stores referrer if not zero address',
            'Increments profileCount for tracking'
          ],
          parameters: [
            { name: 'user', type: 'address', description: 'User address' },
            { name: 'ipfsHash', type: 'string', description: 'IPFS hash containing profile data (bio, skills, experience, etc.)' },
            { name: 'referrer', type: 'address', description: 'Address of user who referred this user (zero address if none)' }
          ],
          accessControl: 'onlyAuthorized - typically Profile Manager',
          events: ['None directly'],
          gasEstimate: '~100K gas',
          example: `// User creates profile with referral
await profileGenesis.setProfile(
  userAddress,
  "ipfs://Qm...", // Profile JSON with bio, skills, etc.
  referrerAddress
);

// Later, user updates profile (referrer unchanged)
await profileGenesis.setProfile(
  userAddress,
  "ipfs://Qm...new", // Updated profile data
  existingReferrer // Keep same referrer
);`,
          relatedFunctions: ['updateProfileIpfsHash', 'getProfile', 'getUserReferrer']
        },
        {
          name: 'updateProfileIpfsHash',
          signature: 'updateProfileIpfsHash(address user, string newIpfsHash)',
          whatItDoes: 'Updates only the IPFS hash of an existing profile.',
          whyUse: 'Efficient way to update profile data without resetting portfolio or referrer.',
          howItWorks: [
            'Requires profile exists',
            'Updates profiles[user].ipfsHash',
            'Emits ProfileUpdated event',
            'Portfolio and referrer unchanged'
          ],
          parameters: [
            { name: 'user', type: 'address', description: 'User to update' },
            { name: 'newIpfsHash', type: 'string', description: 'New IPFS hash with updated profile data' }
          ],
          accessControl: 'onlyAuthorized',
          events: ['ProfileUpdated(user, newIpfsHash)'],
          gasEstimate: '~35K gas',
          example: `// Quick profile update (gas efficient)
await profileGenesis.updateProfileIpfsHash(
  userAddress,
  "ipfs://Qm...updated"
);`,
          relatedFunctions: ['setProfile', 'getProfile']
        }
      ]
    },
    {
      category: 'Portfolio Management',
      description: 'Functions for managing user portfolio items',
      items: [
        {
          name: 'addPortfolio',
          signature: 'addPortfolio(address user, string portfolioHash)',
          whatItDoes: 'Adds a new portfolio item (work sample) to user\'s profile.',
          whyUse: 'Called by Profile Manager when user uploads work samples.',
          howItWorks: [
            'Requires profile exists',
            'Pushes portfolioHash to portfolioHashes array',
            'No limit on number of portfolio items'
          ],
          parameters: [
            { name: 'user', type: 'address', description: 'User adding portfolio item' },
            { name: 'portfolioHash', type: 'string', description: 'IPFS hash of portfolio item (images, descriptions, links)' }
          ],
          accessControl: 'onlyAuthorized',
          events: ['None directly'],
          gasEstimate: '~50K gas',
          example: `// User adds work samples to portfolio
await profileGenesis.addPortfolio(
  userAddress,
  "ipfs://Qm...project1"
);

await profileGenesis.addPortfolio(
  userAddress,
  "ipfs://Qm...project2"
);

// Query portfolio
const profile = await profileGenesis.getProfile(userAddress);
console.log("Portfolio items:", profile.portfolioHashes.length);`,
          relatedFunctions: ['updatePortfolioItem', 'removePortfolioItem', 'getProfile']
        },
        {
          name: 'updatePortfolioItem',
          signature: 'updatePortfolioItem(address user, uint256 index, string newPortfolioHash)',
          whatItDoes: 'Updates a specific portfolio item at given index.',
          whyUse: 'User wants to replace an existing portfolio item with updated version.',
          howItWorks: [
            'Requires profile exists',
            'Validates index < array length',
            'Updates portfolioHashes[index]',
            'Emits PortfolioItemUpdated event'
          ],
          parameters: [
            { name: 'user', type: 'address', description: 'User address' },
            { name: 'index', type: 'uint256', description: 'Array index of item to update (0-based)' },
            { name: 'newPortfolioHash', type: 'string', description: 'New IPFS hash to replace old one' }
          ],
          accessControl: 'onlyAuthorized',
          events: ['PortfolioItemUpdated(user, index, newPortfolioHash)'],
          gasEstimate: '~40K gas',
          example: `// Update second portfolio item (index 1)
await profileGenesis.updatePortfolioItem(
  userAddress,
  1,
  "ipfs://Qm...updated-project"
);`,
          relatedFunctions: ['addPortfolio', 'removePortfolioItem']
        },
        {
          name: 'removePortfolioItem',
          signature: 'removePortfolioItem(address user, uint256 index)',
          whatItDoes: 'Removes a portfolio item from user\'s profile.',
          whyUse: 'User wants to delete outdated or irrelevant work samples.',
          howItWorks: [
            'Requires profile exists',
            'Validates index < array length',
            'Moves last element to removed index',
            'Pops last element (efficient removal)',
            'Emits PortfolioItemRemoved event'
          ],
          parameters: [
            { name: 'user', type: 'address', description: 'User address' },
            { name: 'index', type: 'uint256', description: 'Index of item to remove' }
          ],
          accessControl: 'onlyAuthorized',
          events: ['PortfolioItemRemoved(user, index)'],
          gasEstimate: '~35K gas',
          example: `// Remove first portfolio item
await profileGenesis.removePortfolioItem(userAddress, 0);

// Note: Removal changes array order!
// Last item moves to removed position`,
          relatedFunctions: ['addPortfolio', 'updatePortfolioItem']
        }
      ]
    },
    {
      category: 'Rating System',
      description: 'Functions for storing job performance ratings',
      items: [
        {
          name: 'setJobRating',
          signature: 'setJobRating(string jobId, address user, uint256 rating)',
          whatItDoes: 'Records a job rating for a user.',
          whyUse: 'Called by Profile Manager after job completion to store rating.',
          howItWorks: [
            'Stores rating in jobRatings[jobId][user]',
            'Adds rating to userRatings[user] array',
            'Builds rating history for reputation calculation'
          ],
          parameters: [
            { name: 'jobId', type: 'string', description: 'Job identifier' },
            { name: 'user', type: 'address', description: 'User being rated (job taker or giver)' },
            { name: 'rating', type: 'uint256', description: 'Rating value (typically 1-5)' }
          ],
          accessControl: 'onlyAuthorized',
          events: ['None directly'],
          gasEstimate: '~55K gas',
          example: `// After job completion, store rating
await profileGenesis.setJobRating(
  "job-abc-123",
  freelancerAddress,
  5 // 5-star rating
);

// Query user's rating history
const ratings = await profileGenesis.getUserRatings(freelancerAddress);
console.log("Total ratings:", ratings.length);

// Calculate average
const sum = ratings.reduce((a, b) => a + b, 0n);
const avg = sum / BigInt(ratings.length);
console.log("Average rating:", avg.toString());`,
          relatedFunctions: ['getUserRatings', 'getJobRating']
        }
      ]
    },
    {
      category: 'View Functions',
      description: 'Functions for reading profile and rating data',
      items: [
        {
          name: 'getProfile',
          signature: 'getProfile(address user) view returns (Profile)',
          whatItDoes: 'Returns complete profile data structure.',
          whyUse: 'Query user profile for display in UI or job applications.',
          howItWorks: [
            'Returns Profile struct',
            'Contains address, IPFS hash, referrer, portfolio array'
          ],
          parameters: [
            { name: 'user', type: 'address', description: 'User to query' }
          ],
          accessControl: 'Public view',
          events: ['None (view)'],
          gasEstimate: 'N/A (view)',
          example: `const profile = await profileGenesis.getProfile(userAddress);
console.log("Profile IPFS:", profile.ipfsHash);
console.log("Referrer:", profile.referrerAddress);
console.log("Portfolio items:", profile.portfolioHashes.length);

// Access portfolio items
for (const hash of profile.portfolioHashes) {
  console.log("Portfolio:", hash);
}`,
          relatedFunctions: ['getAllProfileAddresses', 'getUserReferrer']
        },
        {
          name: 'getUserReferrer',
          signature: 'getUserReferrer(address user) view returns (address)',
          whatItDoes: 'Returns the address that referred this user.',
          whyUse: 'Native Rewards uses this to distribute referral bonuses.',
          howItWorks: [
            'Returns userReferrers[user]',
            'Returns zero address if no referrer'
          ],
          parameters: [
            { name: 'user', type: 'address', description: 'User to check' }
          ],
          accessControl: 'Public view',
          events: ['None (view)'],
          gasEstimate: 'N/A (view)',
          example: `// Check if user has referrer
const referrer = await profileGenesis.getUserReferrer(userAddress);

if (referrer !== ethers.ZeroAddress) {
  console.log("Referred by:", referrer);
  // Native Rewards will send 10% bonus to referrer
} else {
  console.log("No referrer");
}`,
          relatedFunctions: ['getProfile', 'setProfile']
        },
        {
          name: 'getUserRatings',
          signature: 'getUserRatings(address user) view returns (uint256[])',
          whatItDoes: 'Returns array of all ratings received by user.',
          whyUse: 'Calculate average rating, display rating history.',
          howItWorks: [
            'Returns userRatings[user] array',
            'Chronological order (oldest to newest)'
          ],
          parameters: [
            { name: 'user', type: 'address', description: 'User to query' }
          ],
          accessControl: 'Public view',
          events: ['None (view)'],
          gasEstimate: 'N/A (view)',
          example: `const ratings = await profileGenesis.getUserRatings(userAddress);

// Calculate statistics
const total = ratings.length;
const sum = ratings.reduce((a, b) => a + b, 0n);
const avg = total > 0 ? Number(sum) / total : 0;

console.log("Total ratings:", total);
console.log("Average:", avg.toFixed(2));`,
          relatedFunctions: ['getJobRating', 'setJobRating']
        },
        {
          name: 'getProfileAddressesBatch',
          signature: 'getProfileAddressesBatch(uint256 startIndex, uint256 count) view returns (address[])',
          whatItDoes: 'Returns paginated list of profile addresses.',
          whyUse: 'Enumerate all profiles without hitting gas limits.',
          howItWorks: [
            'Returns slice of allProfileAddresses array',
            'Handles edge cases (count exceeds remaining)',
            'Reverts if startIndex out of bounds'
          ],
          parameters: [
            { name: 'startIndex', type: 'uint256', description: 'Starting index (0-based)' },
            { name: 'count', type: 'uint256', description: 'Number of addresses to return' }
          ],
          accessControl: 'Public view',
          events: ['None (view)'],
          gasEstimate: 'N/A (view)',
          example: `// Get total profile count
const total = await profileGenesis.getProfileCount();
console.log("Total profiles:", total);

// Fetch in batches of 100
const batchSize = 100;
for (let i = 0; i < total; i += batchSize) {
  const batch = await profileGenesis.getProfileAddressesBatch(i, batchSize);
  console.log(\`Batch \${i/batchSize + 1}: \${batch.length} profiles\`);
  
  // Process batch
  for (const addr of batch) {
    const profile = await profileGenesis.getProfile(addr);
    // ... process profile
  }
}`,
          relatedFunctions: ['getProfileCount', 'getAllProfileAddresses']
        }
      ]
    }
  ],
  
  dataFlows: [
    {
      title: 'Profile Creation Flow',
      description: 'How user profiles are created and stored',
      steps: [
        { chain: 'Native Chain', action: '1. User creates profile via Profile Manager' },
        { chain: 'Native Chain', action: '2. Profile Manager validates data' },
        { chain: 'Native Chain', action: '3. Profile Manager uploads to IPFS' },
        { chain: 'Native Chain', action: '4. Profile Manager calls ProfileGenesis.setProfile()' },
        { chain: 'Native Chain', action: '5. ProfileGenesis stores Profile struct' },
        { chain: 'Native Chain', action: '6. ProfileGenesis adds to allProfileAddresses' },
        { chain: 'Native Chain', action: '7. ProfileGenesis tracks referrer if provided' },
        { chain: 'Native Chain', action: '8. Profile now queryable via getProfile()' }
      ]
    },
    {
      title: 'Referral Bonus Flow',
      description: 'How referral system integrates with rewards',
      steps: [
        { chain: 'Native Chain', action: '1. User A refers User B (stored in ProfileGenesis)' },
        { chain: 'Native Chain', action: '2. User B completes job and receives payment' },
        { chain: 'Native Chain', action: '3. Native Rewards processes payment' },
        { chain: 'Native Chain', action: '4. Native Rewards queries ProfileGenesis.getUserReferrer(B)' },
        { chain: 'Native Chain', action: '5. ProfileGenesis returns User A address' },
        { chain: 'Native Chain', action: '6. Native Rewards awards 10% bonus to User A' },
        { chain: 'Native Chain', action: '7. Bonus stored in OpenworkGenesis' }
      ]
    },
    {
      title: 'Portfolio Management Flow',
      description: 'How users manage their work samples',
      steps: [
        { chain: 'Native Chain', action: '1. User uploads work sample via Profile Manager' },
        { chain: 'Native Chain', action: '2. Profile Manager uploads to IPFS' },
        { chain: 'Native Chain', action: '3. Profile Manager calls ProfileGenesis.addPortfolio()' },
        { chain: 'Native Chain', action: '4. ProfileGenesis adds hash to portfolio array' },
        { chain: 'Native Chain', action: '5. User decides to update item' },
        { chain: 'Native Chain', action: '6. Profile Manager calls updatePortfolioItem()' },
        { chain: 'Native Chain', action: '7. ProfileGenesis replaces hash at index' },
        { chain: 'Native Chain', action: '8. Emits PortfolioItemUpdated event' }
      ]
    }
  ],
  
  integrationGuide: {
    example: `// ProfileGenesis Integration Example
const { ethers } = require('ethers');

// Setup contract
const profileGenesis = new ethers.Contract(
  profileGenesisAddress,
  profileGenesisABI,
  signer
);

// 1. Owner: Authorize Profile Manager
await profileGenesis.authorizeContract(profileManagerAddress, true);

// 2. Profile Manager: Create user profile
await profileGenesis.setProfile(
  userAddress,
  "ipfs://Qm...profile-data",
  referrerAddress
);

// 3. Add portfolio items
await profileGenesis.addPortfolio(
  userAddress,
  "ipfs://Qm...project1"
);

await profileGenesis.addPortfolio(
  userAddress,
  "ipfs://Qm...project2"
);

// 4. Record job rating
await profileGenesis.setJobRating(
  "job-123",
  userAddress,
  5 // 5 stars
);

// 5. Query profile data
const profile = await profileGenesis.getProfile(userAddress);
console.log("Profile:", profile.ipfsHash);
console.log("Portfolio:", profile.portfolioHashes);
console.log("Referrer:", profile.referrerAddress);

// 6. Get rating history
const ratings = await profileGenesis.getUserRatings(userAddress);
const avg = ratings.reduce((a, b) => a + b, 0n) / BigInt(ratings.length);
console.log("Average rating:", avg.toString());

// 7. Enumerate all profiles
const totalProfiles = await profileGenesis.getProfileCount();
const batch = await profileGenesis.getProfileAddressesBatch(0, 100);`,
    tips: [
      'ProfileGenesis must be deployed before Profile Manager',
      'Authorize Profile Manager via authorizeContract() before use',
      'Profile IPFS hash should contain: bio, skills, experience, contact',
      'Portfolio items are work samples: projects, case studies, designs',
      'Referrer stored permanently - cannot be changed after profile creation',
      'Use setProfile() for full updates, updateProfileIpfsHash() for hash-only updates',
      'Portfolio removal uses swap-and-pop (changes array order)',
      'Use batch getters for enumerating large user lists',
      'Native Rewards queries referrers for bonus distribution',
      'Rating arrays grow unbounded - consider off-chain aggregation for very active users',
      'Complementary to OpenworkGenesis - different data categories',
      'No business logic in ProfileGenesis - validation happens in Profile Manager'
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
    estimatedGas: '2.8M',
    postDeploy: {
      message: 'UUPS deployment complete! Next: Initialize and authorize Profile Manager.',
      nextSteps: [
        '1. Deploy ProfileGenesis implementation contract (no constructor params)',
        '2. Deploy UUPSProxy with implementation address',
        '3. Call initialize() on proxy via block scanner with:',
        '   - Owner address (your admin wallet)',
        '4. ⚠️ CRITICAL: Authorize Profile Manager to write data:',
        '   - authorizeContract(profileManagerAddress, true)',
        '5. Configure Profile Manager with ProfileGenesis address:',
        '   - ProfileManager.setProfileGenesis(profileGenesisAddress)',
        '6. Optional: Also authorize Native Rewards for referrer queries',
        '   - authorizeContract(nativeRewardsAddress, true)',
        '7. Test profile creation flow',
        '8. Test portfolio management (add/update/remove)',
        '9. Test referral system',
        '10. Verify both implementation and proxy on Arbiscan',
        '11. IMPORTANT: Deploy ProfileGenesis before Profile Manager',
        '12. Monitor profile count growth as users join platform'
      ]
    }
  },
  
  securityConsiderations: [
    'UUPS upgradeable - owner only can upgrade',
    'Authorization required: Only Profile Manager can write data',
    'View functions public: Anyone can read profiles and ratings',
    'No business logic: Pure storage reduces attack surface',
    'Referrer immutability: Cannot change after profile creation',
    'Portfolio array growth: Unbounded, user controls size',
    'Rating array growth: Unbounded, consider aggregation for high-volume users',
    'No token holding: ProfileGenesis never holds funds',
    'Data persistence: Survives Profile Manager upgrades',
    'Batch operations: Use getProfileAddressesBatch to avoid gas limits',
    'Privacy consideration: All profile data is public on-chain',
    'IPFS hashes: User responsible for maintaining IPFS content availability'
  ],
  
  code: `// Full implementation: contracts/openwork-full-contract-suite-layerzero+CCTP 2 Dec/profile-genesis.sol

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import { UUPSUpgradeable } from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract ProfileGenesis is Initializable, UUPSUpgradeable {
    
    // ==================== STRUCTS ====================
    struct Profile {
        address userAddress;
        string ipfsHash;
        address referrerAddress;
        string[] portfolioHashes;
    }

    // ==================== STATE VARIABLES ====================
    mapping(address => bool) public authorizedContracts;
    address public owner;
    mapping(address => Profile) public profiles;
    mapping(address => bool) public hasProfile;
    mapping(address => address) public userReferrers;
    mapping(string => mapping(address => uint256)) public jobRatings;
    mapping(address => uint256[]) public userRatings;
    address[] private allProfileAddresses;
    uint256 private profileCount;

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

    // ==================== PROFILE SETTERS ====================
    function setProfile(
        address user,
        string memory ipfsHash,
        address referrer
    ) external onlyAuthorized {
        if (!hasProfile[user]) {
            allProfileAddresses.push(user);
            profileCount++;
        }
        
        profiles[user] = Profile({
            userAddress: user,
            ipfsHash: ipfsHash,
            referrerAddress: referrer,
            portfolioHashes: new string[](0)
        });
        hasProfile[user] = true;
        if (referrer != address(0)) {
            userReferrers[user] = referrer;
        }
    }
    
    function addPortfolio(address user, string memory portfolioHash) external onlyAuthorized {
        require(hasProfile[user], "Profile does not exist");
        profiles[user].portfolioHashes.push(portfolioHash);
    }
    
    function updateProfileIpfsHash(address user, string memory newIpfsHash) external onlyAuthorized {
        require(hasProfile[user], "Profile does not exist");
        profiles[user].ipfsHash = newIpfsHash;
        emit ProfileUpdated(user, newIpfsHash);
    }

    function setJobRating(string memory jobId, address user, uint256 rating) external onlyAuthorized {
        jobRatings[jobId][user] = rating;
        userRatings[user].push(rating);
    }

    // ==================== GETTERS ====================
    function getProfile(address user) external view returns (Profile memory) {
        return profiles[user];
    }
    
    function getUserReferrer(address user) external view returns (address) {
        return userReferrers[user];
    }
    
    function getUserRatings(address user) external view returns (uint256[] memory) {
        return userRatings[user];
    }
    
    function getProfileCount() external view returns (uint256) {
        return profileCount;
    }
    
    function getProfileAddressesBatch(uint256 startIndex, uint256 count) external view returns (address[] memory) {
        require(startIndex < profileCount, "Out of bounds");
        uint256 remaining = profileCount - startIndex;
        uint256 actualCount = count > remaining ? remaining : count;
        
        address[] memory addresses = new address[](actualCount);
        for (uint256 i = 0; i < actualCount; i++) {
            addresses[i] = allProfileAddresses[startIndex + i];
        }
        return addresses;
    }
    
    // ... Additional update and remove functions
    // See full implementation in repository
}`
};
