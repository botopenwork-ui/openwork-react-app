export const oracleManager = {
  id: 'oracleManager',
  name: 'Native Athena Oracle Manager',
  chain: 'l2',
  column: 'l2-left',
  order: 3,
  status: 'testnet',
  version: 'v1.0.0',
  gas: '45K',
  mainnetNetwork: 'Arbitrum One',
  testnetNetwork: 'Arbitrum Sepolia',
  mainnetDeployed: 'Not deployed',
  testnetDeployed: 'Deployed',
  mainnetAddress: null,
  testnetAddress: '0x70F6fa515120efeA3e404234C318b7745D23ADD4',
  isUUPS: true,
  implementationAddress: '0xAdf1d61e5DeD34fAF507C8CEF24cdf46f46bF537',
  tvl: 'N/A',
  docs: 'Native Athena Oracle Manager - Internal helper contract that manages Skill Oracle lifecycle (create, add/remove members, delete). Created to solve Native Athena\'s 24KB contract size limit by extracting oracle management functions. ONLY callable by Native Athena, not user or bridge facing.',
  
  overview: {
    purpose: 'Oracle Manager is an internal helper contract created to solve Native Athena\'s contract size limit (Ethereum\'s 24KB maximum). It extracts all Skill Oracle management functionality from Native Athena into a separate contract while maintaining the same security and validation rules. This contract is NOT user-facing - users interact with Native Athena, which then delegates oracle operations to this manager. The manager validates all members via Native Athena.canVote() and stores oracle data in OpenworkGenesis. Only Native Athena (via authorizedCallers mapping) can call state-changing functions.',
    tier: 'Native Chain (Arbitrum Sepolia)',
    category: 'Dispute Resolution - Helper',
    upgradeability: 'UUPS Upgradeable (owner only)'
  },
  
  features: [
    'Contract size optimization: Extracts oracle management from Native Athena to stay under 24KB limit',
    'Internal helper pattern: ONLY callable by Native Athena (authorizedCallers), not user-facing',
    'Member validation: All oracle members must pass Native Athena.canVote() check',
    'Minimum member enforcement: Validates oracle has at least minOracleMembers (from Native Athena)',
    'Batch operations: Can create/update multiple oracles in single transaction',
    'Single oracle operations: Add/remove individual members or create single oracle',
    'Oracle deletion: Remove oracles by setting empty member array',
    'OpenworkGenesis integration: All oracle data stored in persistent storage contract',
    'Validation loop: Calls back to Native Athena for eligibility checks',
    'Authorization control: Owner can set which addresses can call (Native Athena only in practice)'
  ],
  
  systemPosition: {
    description: 'Oracle Manager sits on Arbitrum as Native Athena\'s internal helper for oracle management. When users want to create or manage Skill Oracles via the UI, they call Native Athena, which delegates to Oracle Manager. The manager validates all operations (checking canVote, minOracleMembers) by calling back to Native Athena, then stores oracle data in OpenworkGenesis. This architectural pattern solved Native Athena\'s contract size problem while maintaining security - only Native Athena can call the manager, creating a secure delegation chain.',
    diagram: `
📍 Oracle Management Architecture

User/UI
  └─> Native Athena (public-facing)
      └─> Oracle Manager ⭐ (You are here - Internal helper)
          ├─> Validates via Native Athena
          │   ├─> canVote() - member eligibility
          │   └─> minOracleMembers() - min size check
          └─> Stores in OpenworkGenesis
              └─> Oracle struct with members, description, etc.

Authorization Flow:
  Owner sets: oracleManager.setAuthorizedCaller(nativeAthena, true)
  Now: Native Athena → Oracle Manager (✓ authorized)
       Users → Oracle Manager (✗ not authorized)
       Bridges → Oracle Manager (✗ not authorized)

Validation Loop:
  Native Athena calls Oracle Manager
    └─> Oracle Manager calls back to Native Athena
        └─> Validates member eligibility
            └─> Stores in Genesis if valid`
  },
  
  dependencies: {
    dependsOn: [
      { 
        name: 'Native Athena', 
        reason: 'ONLY authorized caller. Oracle Manager validates members via canVote() and minOracleMembers().',
        type: 'Authorization & Validation'
      },
      { 
        name: 'OpenworkGenesis', 
        reason: 'Stores all oracle data - members, descriptions, skill-verified addresses. Called via setOracle(), addOracleMember(), removeOracleMember(), getOracle().',
        type: 'Storage'
      }
    ],
    requiredBy: [
      { 
        name: 'Native Athena', 
        reason: 'Delegates ALL oracle management operations to Oracle Manager to stay under 24KB contract size limit.',
        type: 'Dispute Resolution'
      }
    ],
    prerequisites: [
      'Native Athena must be deployed first',
      'OpenworkGenesis must be deployed for storage',
      'Native Athena address must be added to authorizedCallers',
      'Members must have sufficient stake/earned tokens to pass canVote()',
      'Oracles must meet minOracleMembers requirement'
    ]
  },
  
  functions: [
    {
      category: 'Oracle Creation',
      description: 'Functions for creating new Skill Oracles with validated members',
      items: [
        {
          name: 'addSingleOracle',
          signature: 'addSingleOracle(string memory _name, address[] memory _members, string memory _shortDescription, string memory _hashOfDetails, address[] memory _skillVerifiedAddresses)',
          whatItDoes: 'Creates a new Skill Oracle with validation of name, member count, and individual member eligibility.',
          whyUse: 'Called by Native Athena when users create a new oracle. Ensures all members meet staking/earned token requirements.',
          howItWorks: [
            'Validates oracle name is not empty',
            'Checks _members.length >= Native Athena.minOracleMembers()',
            'Iterates through all members',
            'For each member: calls Native Athena.canVote() to validate eligibility',
            'If any member fails validation, entire transaction reverts',
            'Calls OpenworkGenesis.setOracle() to store oracle data',
            'Emits OracleCreated event with name and member count'
          ],
          parameters: [
            { name: '_name', type: 'string', description: 'Unique oracle name (e.g., "Solidity Development", "UI/UX Design")' },
            { name: '_members', type: 'address[]', description: 'Array of addresses that are oracle members. Must meet minOracleMembers.' },
            { name: '_shortDescription', type: 'string', description: 'Brief description of oracle\'s expertise area' },
            { name: '_hashOfDetails', type: 'string', description: 'IPFS hash or URL with detailed oracle information' },
            { name: '_skillVerifiedAddresses', type: 'address[]', description: 'Addresses that have been skill-verified by this oracle' }
          ],
          accessControl: 'onlyAuthorized - ONLY Native Athena (or owner) can call',
          events: [
            'OracleCreated(oracleName, memberCount)'
          ],
          gasEstimate: '~120K gas (varies with member count)',
          example: `// User creates oracle via Native Athena UI
// Native Athena internally calls:

await oracleManager.addSingleOracle(
  "Solidity Development",
  [member1, member2, member3, member4, member5],
  "Expert Solidity developers for smart contract disputes",
  "ipfs://Qm...",
  [] // Initially no verified addresses
);

// Requirements:
// - Name must not be empty
// - At least 5 members (minOracleMembers)
// - All members must pass canVote() (sufficient stake/earned tokens)
// - Called by Native Athena (authorizedCallers)

// Result:
// - Oracle stored in OpenworkGenesis
// - OracleCreated event emitted
// - Available for dispute assignments`,
          relatedFunctions: ['addOrUpdateOracle', 'addMembers', 'getOracle']
        },
        {
          name: 'addOrUpdateOracle',
          signature: 'addOrUpdateOracle(string[] memory _names, address[][] memory _members, string[] memory _shortDescriptions, string[] memory _hashOfDetails, address[][] memory _skillVerifiedAddresses)',
          whatItDoes: 'Batch creates or updates multiple oracles in a single transaction.',
          whyUse: 'Efficient for initial setup or bulk oracle updates. Reduces gas costs for multiple oracle operations.',
          howItWorks: [
            'Validates all array lengths match',
            'Iterates through each oracle in arrays',
            'For each oracle: calls OpenworkGenesis.setOracle()',
            'Does NOT validate members (assumes Native Athena did validation)',
            'Emits OracleCreated event for each oracle',
            'All operations atomic - if one fails, all revert'
          ],
          parameters: [
            { name: '_names', type: 'string[]', description: 'Array of oracle names' },
            { name: '_members', type: 'address[][]', description: '2D array: each element is member array for one oracle' },
            { name: '_shortDescriptions', type: 'string[]', description: 'Array of descriptions matching oracles' },
            { name: '_hashOfDetails', type: 'string[]', description: 'Array of IPFS hashes matching oracles' },
            { name: '_skillVerifiedAddresses', type: 'address[][]', description: '2D array of verified addresses per oracle' }
          ],
          accessControl: 'onlyAuthorized - ONLY Native Athena (or owner) can call',
          events: [
            'OracleCreated(oracleName, memberCount) - emitted for each oracle'
          ],
          gasEstimate: '~80K gas per oracle',
          example: `// Batch create 3 oracles
const names = ["Solidity", "Rust", "Frontend"];
const members = [
  [addr1, addr2, addr3, addr4, addr5],
  [addr6, addr7, addr8, addr9, addr10],
  [addr11, addr12, addr13, addr14, addr15]
];
const descriptions = [
  "Solidity experts",
  "Rust blockchain developers", 
  "Frontend UI/UX specialists"
];
const hashes = ["ipfs://Qm1...", "ipfs://Qm2...", "ipfs://Qm3..."];
const verified = [[], [], []];

await oracleManager.addOrUpdateOracle(
  names,
  members,
  descriptions,
  hashes,
  verified
);

// Result: 3 oracles created in single transaction`,
          relatedFunctions: ['addSingleOracle', 'removeOracle']
        }
      ]
    },
    {
      category: 'Member Management',
      description: 'Functions for adding and removing oracle members',
      items: [
        {
          name: 'addMembers',
          signature: 'addMembers(address[] memory _members, string memory _oracleName)',
          whatItDoes: 'Adds new members to an existing Skill Oracle after validation.',
          whyUse: 'Called by Native Athena when oracle needs to expand. Validates all new members meet eligibility requirements.',
          howItWorks: [
            'Gets oracle from OpenworkGenesis to verify it exists',
            'Validates oracle name exists (bytes length > 0)',
            'Iterates through all new members',
            'For each member: calls Native Athena.canVote() for eligibility',
            'If any member fails, transaction reverts',
            'Calls OpenworkGenesis.addOracleMember() for each valid member',
            'Emits OracleMemberAdded event for each member'
          ],
          parameters: [
            { name: '_members', type: 'address[]', description: 'Array of addresses to add as oracle members' },
            { name: '_oracleName', type: 'string', description: 'Name of existing oracle to add members to' }
          ],
          accessControl: 'onlyAuthorized - ONLY Native Athena (or owner) can call',
          events: [
            'OracleMemberAdded(oracleName, memberAddress) - emitted for each member'
          ],
          gasEstimate: '~55K gas per member',
          example: `// Oracle needs more members
// Native Athena calls:

await oracleManager.addMembers(
  [newMember1, newMember2, newMember3],
  "Solidity Development"
);

// Requirements:
// - Oracle "Solidity Development" must exist
// - All new members must pass canVote() check
// - Called by Native Athena

// Result:
// - 3 members added to oracle
// - 3 OracleMemberAdded events emitted
// - Oracle can now handle more disputes`,
          relatedFunctions: ['removeMemberFromOracle', 'addSingleOracle']
        },
        {
          name: 'removeMemberFromOracle',
          signature: 'removeMemberFromOracle(string memory _oracleName, address _memberToRemove)',
          whatItDoes: 'Removes a specific member from a Skill Oracle.',
          whyUse: 'Called by Native Athena when member needs to be removed (inactive, misconduct, or voluntary exit).',
          howItWorks: [
            'Gets oracle from OpenworkGenesis to verify existence',
            'Validates oracle name exists',
            'Calls OpenworkGenesis.removeOracleMember()',
            'Emits OracleMemberRemoved event',
            'Note: Does NOT check if oracle still meets minOracleMembers after removal'
          ],
          parameters: [
            { name: '_oracleName', type: 'string', description: 'Name of oracle to remove member from' },
            { name: '_memberToRemove', type: 'address', description: 'Address of member to remove' }
          ],
          accessControl: 'onlyAuthorized - ONLY Native Athena (or owner) can call',
          events: [
            'OracleMemberRemoved(oracleName, memberAddress)'
          ],
          gasEstimate: '~45K gas',
          example: `// Remove inactive member
// Native Athena calls:

await oracleManager.removeMemberFromOracle(
  "Solidity Development",
  inactiveMemberAddress
);

// Requirements:
// - Oracle must exist
// - Called by Native Athena

// Result:
// - Member removed from oracle
// - OracleMemberRemoved event emitted
// - Member can no longer vote on this oracle's disputes`,
          relatedFunctions: ['addMembers', 'removeOracle']
        }
      ]
    },
    {
      category: 'Oracle Deletion',
      description: 'Functions for removing entire oracles',
      items: [
        {
          name: 'removeOracle',
          signature: 'removeOracle(string[] memory _oracleNames)',
          whatItDoes: 'Batch deletes oracles by setting them to empty state in OpenworkGenesis.',
          whyUse: 'Called by Native Athena to remove obsolete or problematic oracles. Can delete multiple at once.',
          howItWorks: [
            'Creates empty address arrays',
            'Iterates through oracle names',
            'For each oracle: calls OpenworkGenesis.setOracle() with empty arrays',
            'This effectively deletes the oracle from storage',
            'Emits OracleRemoved event for each oracle'
          ],
          parameters: [
            { name: '_oracleNames', type: 'string[]', description: 'Array of oracle names to delete' }
          ],
          accessControl: 'onlyAuthorized - ONLY Native Athena (or owner) can call',
          events: [
            'OracleRemoved(oracleName) - emitted for each deleted oracle'
          ],
          gasEstimate: '~60K gas per oracle',
          example: `// Remove outdated oracles
// Native Athena calls:

await oracleManager.removeOracle([
  "Old Oracle 1",
  "Deprecated Oracle 2",
  "Obsolete Oracle 3"
]);

// Requirements:
// - Called by Native Athena

// Result:
// - 3 oracles deleted (set to empty state)
// - 3 OracleRemoved events emitted
// - Oracles no longer available for disputes`,
          relatedFunctions: ['addSingleOracle', 'addOrUpdateOracle']
        }
      ]
    },
    {
      category: 'View Functions',
      description: 'Functions for querying oracle data',
      items: [
        {
          name: 'getOracle',
          signature: 'getOracle(string memory _oracleName) view returns (string name, address[] members, string shortDescription, string hashOfDetails, address[] skillVerifiedAddresses)',
          whatItDoes: 'Retrieves complete oracle information from OpenworkGenesis.',
          whyUse: 'Query oracle details without going directly to Genesis. Used by Native Athena and frontend.',
          howItWorks: [
            'Calls OpenworkGenesis.getOracle(_oracleName)',
            'Returns all oracle fields in a tuple',
            'If oracle doesn\'t exist, returns empty values'
          ],
          parameters: [
            { name: '_oracleName', type: 'string', description: 'Name of oracle to query' }
          ],
          accessControl: 'Public view function',
          events: ['None (view function)'],
          gasEstimate: 'N/A (view)',
          example: `// Get oracle details
const oracle = await oracleManager.getOracle("Solidity Development");

console.log("Name:", oracle.name);
console.log("Members:", oracle.members.length);
console.log("Description:", oracle.shortDescription);
console.log("Details hash:", oracle.hashOfDetails);
console.log("Verified addresses:", oracle.skillVerifiedAddresses.length);

// Use for displaying oracle info in UI`,
          relatedFunctions: ['addSingleOracle', 'addMembers']
        }
      ]
    },
    {
      category: 'Admin Functions',
      description: 'Owner-only functions for contract configuration',
      items: [
        {
          name: 'setAuthorizedCaller',
          signature: 'setAuthorizedCaller(address _caller, bool _authorized)',
          whatItDoes: 'Grants or revokes authorization for an address to call oracle management functions.',
          whyUse: 'Owner uses this to authorize Native Athena address. Critical for security.',
          howItWorks: [
            'Sets authorizedCallers[_caller] = _authorized',
            'Emits AuthorizedCallerUpdated event',
            'In practice, only Native Athena should be authorized'
          ],
          parameters: [
            { name: '_caller', type: 'address', description: 'Address to grant/revoke authorization' },
            { name: '_authorized', type: 'bool', description: 'true to authorize, false to revoke' }
          ],
          accessControl: 'onlyOwner',
          events: [
            'AuthorizedCallerUpdated(caller, authorized)'
          ],
          gasEstimate: '~30K gas',
          example: `// During deployment setup
await oracleManager.setAuthorizedCaller(nativeAthenaAddress, true);

// Now Native Athena can call oracle management functions
// Users → Native Athena → Oracle Manager ✓

// Revoke if needed:
await oracleManager.setAuthorizedCaller(oldAddress, false);`,
          relatedFunctions: ['setGenesis', 'setNativeAthena']
        },
        {
          name: 'setGenesis',
          signature: 'setGenesis(address _genesis)',
          whatItDoes: 'Updates the OpenworkGenesis contract address.',
          whyUse: 'Owner can update Genesis address if contract is upgraded or migrated.',
          howItWorks: [
            'Updates genesis contract reference',
            'Emits GenesisUpdated event with old and new addresses'
          ],
          parameters: [
            { name: '_genesis', type: 'address', description: 'New OpenworkGenesis contract address' }
          ],
          accessControl: 'onlyOwner',
          events: [
            'GenesisUpdated(oldGenesis, newGenesis)'
          ],
          gasEstimate: '~30K gas',
          example: `// Update to new Genesis contract
await oracleManager.setGenesis(newGenesisAddress);

// All future oracle operations use new Genesis`,
          relatedFunctions: ['setNativeAthena', 'setAuthorizedCaller']
        },
        {
          name: 'setNativeAthena',
          signature: 'setNativeAthena(address _nativeAthena)',
          whatItDoes: 'Updates the Native Athena contract address used for validation.',
          whyUse: 'Owner can update Native Athena reference if contract is upgraded.',
          howItWorks: [
            'Updates nativeAthena contract reference',
            'Emits NativeAthenaUpdated event with old and new addresses'
          ],
          parameters: [
            { name: '_nativeAthena', type: 'address', description: 'New Native Athena contract address' }
          ],
          accessControl: 'onlyOwner',
          events: [
            'NativeAthenaUpdated(oldAthena, newAthena)'
          ],
          gasEstimate: '~30K gas',
          example: `// Update to new Native Athena contract
await oracleManager.setNativeAthena(newNativeAthenaAddress);

// Future validations use new Native Athena contract`,
          relatedFunctions: ['setGenesis', 'setAuthorizedCaller']
        }
      ]
    }
  ],
  
  dataFlows: [
    {
      title: 'Oracle Creation Flow',
      description: 'How users create Skill Oracles through Native Athena delegation',
      steps: [
        { chain: 'Native Chain', action: '1. User submits create oracle request via Native Athena UI' },
        { chain: 'Native Chain', action: '2. Native Athena receives request and validates user permissions' },
        { chain: 'Native Chain', action: '3. Native Athena calls Oracle Manager.addSingleOracle()' },
        { chain: 'Native Chain', action: '4. Oracle Manager validates oracle name not empty' },
        { chain: 'Native Chain', action: '5. Oracle Manager checks member count >= minOracleMembers' },
        { chain: 'Native Chain', action: '6. For each member: calls Native Athena.canVote() to validate' },
        { chain: 'Native Chain', action: '7. If any member fails validation, transaction reverts' },
        { chain: 'Native Chain', action: '8. All members valid → calls OpenworkGenesis.setOracle()' },
        { chain: 'Native Chain', action: '9. Oracle data stored in Genesis' },
        { chain: 'Native Chain', action: '10. Emits OracleCreated event' },
        { chain: 'Native Chain', action: '11. Oracle now available for dispute assignments' }
      ]
    },
    {
      title: 'Member Addition Flow',
      description: 'How new members are added to existing oracles',
      steps: [
        { chain: 'Native Chain', action: '1. Oracle admin requests member addition via Native Athena' },
        { chain: 'Native Chain', action: '2. Native Athena calls Oracle Manager.addMembers()' },
        { chain: 'Native Chain', action: '3. Oracle Manager fetches oracle from OpenworkGenesis' },
        { chain: 'Native Chain', action: '4. Validates oracle exists (name length > 0)' },
        { chain: 'Native Chain', action: '5. For each new member: calls Native Athena.canVote()' },
        { chain: 'Native Chain', action: '6. All members must pass validation' },
        { chain: 'Native Chain', action: '7. Calls OpenworkGenesis.addOracleMember() for each' },
        { chain: 'Native Chain', action: '8. Emits OracleMemberAdded event per member' },
        { chain: 'Native Chain', action: '9. Members can now vote on oracle\'s disputes' }
      ]
    },
    {
      title: 'Validation Loop',
      description: 'How Oracle Manager validates members via Native Athena',
      steps: [
        { chain: 'Native Chain', action: '1. Oracle Manager receives member to validate' },
        { chain: 'Native Chain', action: '2. Calls Native Athena.canVote(memberAddress)' },
        { chain: 'Native Chain', action: '3. Native Athena checks member\'s voting power:' },
        { chain: 'Native Chain', action: '   - Queries Native DAO for staked power' },
        { chain: 'Native Chain', action: '   - Queries Native Rewards for earned tokens' },
        { chain: 'Native Chain', action: '   - Total power = staked + earned' },
        { chain: 'Native Chain', action: '4. Native Athena returns true if >= minStakeRequired' },
        { chain: 'Native Chain', action: '5. Oracle Manager uses result for validation' },
        { chain: 'Native Chain', action: '6. If false: reverts transaction with error' },
        { chain: 'Native Chain', action: '7. If true: proceeds with oracle operation' }
      ]
    }
  ],
  
  integrationGuide: {
    example: `// Oracle Manager Integration (via Native Athena)
const { ethers } = require('ethers');

// Setup contracts
const oracleManager = new ethers.Contract(oracleManagerAddress, oracleManagerABI, signer);
const nativeAthena = new ethers.Contract(nativeAthenaAddress, nativeAthenaABI, signer);

// IMPORTANT: Users don't call Oracle Manager directly!
// All calls go through Native Athena

// 1. Admin: Authorize Native Athena (one-time setup)
await oracleManager.setAuthorizedCaller(nativeAthenaAddress, true);

// 2. User: Create oracle via Native Athena UI
// Native Athena internally calls:
await nativeAthena.createSkillOracle(
  "Solidity Development",
  [member1, member2, member3, member4, member5],
  "Expert Solidity developers",
  "ipfs://Qm..."
);

// Behind the scenes:
// Native Athena → Oracle Manager.addSingleOracle()
//   → Validates via Native Athena.canVote()
//   → Stores in OpenworkGenesis

// 3. Query oracle (anyone can call)
const oracle = await oracleManager.getOracle("Solidity Development");
console.log("Members:", oracle.members.length);
console.log("Description:", oracle.shortDescription);

// 4. Add members via Native Athena
await nativeAthena.addOracleMembers(
  "Solidity Development",
  [newMember1, newMember2]
);

// 5. Remove member via Native Athena
await nativeAthena.removeOracleMember(
  "Solidity Development",
  inactiveMember
);`,
    tips: [
      'Oracle Manager is NOT user-facing - all interactions via Native Athena',
      'Only Native Athena should be in authorizedCallers mapping',
      'Created to solve Native Athena\'s 24KB contract size limit',
      'All members must pass canVote() check (sufficient stake/earned tokens)',
      'Oracles must meet minOracleMembers requirement from Native Athena',
      'Validation loop: Oracle Manager calls back to Native Athena',
      'Storage in OpenworkGenesis allows data persistence across upgrades',
      'Batch operations (addOrUpdateOracle, removeOracle) save gas',
      'getOracle() is public - anyone can query oracle information',
      'Member removal doesn\'t check if oracle still meets minimum size',
      'IPFS hashes in hashOfDetails can store detailed oracle information',
      'Skill-verified addresses track users validated by each oracle'
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
        name: '_genesis',
        type: 'address',
        description: 'OpenworkGenesis contract address (for oracle data storage)',
        placeholder: '0x...'
      },
      {
        name: '_nativeAthena',
        type: 'address',
        description: 'Native Athena contract address (for member validation via canVote)',
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
    estimatedGas: '2.2M',
    postDeploy: {
      message: 'UUPS deployment complete! Next: Initialize and configure authorization.',
      nextSteps: [
        '1. Deploy OracleManager implementation contract (no constructor params)',
        '2. Deploy UUPSProxy with implementation address',
        '3. Call initialize() on proxy via block scanner with:',
        '   - Owner address (your admin wallet)',
        '   - OpenworkGenesis contract address',
        '   - Native Athena contract address',
        '4. ⚠️ CRITICAL: Authorize Native Athena to call Oracle Manager:',
        '   - setAuthorizedCaller(nativeAthenaAddress, true)',
        '5. Authorize Oracle Manager in OpenworkGenesis:',
        '   - OpenworkGenesis.authorizeContract(oracleManagerAddress, true)',
        '6. Configure Native Athena with Oracle Manager address:',
        '   - NativeAthena.setOracleManager(oracleManagerAddress)',
        '7. Test oracle creation via Native Athena',
        '8. Test member addition/removal',
        '9. Verify both implementation and proxy on Arbiscan',
        '10. IMPORTANT: This is an internal helper - users interact via Native Athena only'
      ]
    }
  },
  
  securityConsiderations: [
    'UUPS upgradeable - owner only can upgrade',
    'onlyAuthorized modifier: ONLY Native Athena (+ owner) can manage oracles',
    'NOT user-facing: Direct user calls will fail authorization check',
    'Member validation: All members must pass Native Athena.canVote()',
    'Minimum size enforcement: Oracles must meet minOracleMembers requirement',
    'Validation loop: Calls back to Native Athena for eligibility checks',
    'Authorization control: Owner sets authorizedCallers (should only be Native Athena)',
    'OpenworkGenesis storage: Data persists across contract upgrades',
    'Batch operation atomicity: All-or-nothing for multi-oracle operations',
    'No direct token handling: Pure management contract',
    'Event emission: All operations emit events for transparency',
    'Oracle deletion: Sets to empty state, doesn\'t truly delete from storage'
  ],
  
  code: `// Full implementation: contracts/openwork-full-contract-suite-layerzero+CCTP 2 Dec/native-athena-oracle-manager.sol

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import { UUPSUpgradeable } from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import { OwnableUpgradeable } from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract NativeAthenaOracleManager is 
    Initializable,
    OwnableUpgradeable,
    UUPSUpgradeable
{
    // ==================== STATE VARIABLES ====================
    IOpenworkGenesis public genesis;
    INativeAthena public nativeAthena;
    mapping(address => bool) public authorizedCallers;

    // ==================== INITIALIZATION ====================
    constructor() {
        _disableInitializers();
    }
    
    function initialize(
        address _owner,
        address _genesis,
        address _nativeAthena
    ) public initializer {
        __Ownable_init(_owner);
        __UUPSUpgradeable_init();
        
        genesis = IOpenworkGenesis(_genesis);
        nativeAthena = INativeAthena(_nativeAthena);
    }
    
    function _authorizeUpgrade(address) internal view override {
        require(owner() == _msgSender(), "Unauthorized");
    }

    // ==================== ORACLE MANAGEMENT ====================
    function addOrUpdateOracle(
        string[] memory _names,
        address[][] memory _members,
        string[] memory _shortDescriptions,
        string[] memory _hashOfDetails,
        address[][] memory _skillVerifiedAddresses
    ) external onlyAuthorized {
        require(_names.length == _members.length, "Length mismatch");
        
        for (uint256 i = 0; i < _names.length; i++) {
            genesis.setOracle(
                _names[i], 
                _members[i], 
                _shortDescriptions[i], 
                _hashOfDetails[i], 
                _skillVerifiedAddresses[i]
            );
            emit OracleCreated(_names[i], _members[i].length);
        }
    }
    
    function addSingleOracle(
        string memory _name,
        address[] memory _members,
        string memory _shortDescription,
        string memory _hashOfDetails,
        address[] memory _skillVerifiedAddresses
    ) external onlyAuthorized {
        require(bytes(_name).length > 0, "Empty name");
        require(_members.length >= nativeAthena.minOracleMembers(), "Not enough members");
        
        // Verify members meet voting requirements
        for (uint256 i = 0; i < _members.length; i++) {
            require(nativeAthena.canVote(_members[i]), "Member doesn't meet requirements");
        }
        
        genesis.setOracle(_name, _members, _shortDescription, _hashOfDetails, _skillVerifiedAddresses);
        emit OracleCreated(_name, _members.length);
    }

    function addMembers(address[] memory _members, string memory _oracleName) external onlyAuthorized {
        IOpenworkGenesis.Oracle memory oracle = genesis.getOracle(_oracleName);
        require(bytes(oracle.name).length > 0, "Oracle not found");
        
        for (uint256 i = 0; i < _members.length; i++) {
            require(nativeAthena.canVote(_members[i]), "Member doesn't meet requirements");
            genesis.addOracleMember(_oracleName, _members[i]);
            emit OracleMemberAdded(_oracleName, _members[i]);
        }
        
        nativeAthena.updateOracleActiveStatus(_oracleName);
    }
    
    function removeMemberFromOracle(string memory _oracleName, address _memberToRemove) external onlyAuthorized {
        genesis.removeOracleMember(_oracleName, _memberToRemove);
        emit OracleMemberRemoved(_oracleName, _memberToRemove);
        nativeAthena.updateOracleActiveStatus(_oracleName);
    }

    function removeOracle(string[] memory _oracleNames) external onlyAuthorized {
        for (uint256 i = 0; i < _oracleNames.length; i++) {
            address[] memory emptyMembers = new address[](0);
            address[] memory emptySkillVerified = new address[](0);
            genesis.setOracle(_oracleNames[i], emptyMembers, "", "", emptySkillVerified);
            emit OracleRemoved(_oracleNames[i]);
        }
    }
    
    // ==================== VIEW FUNCTIONS ====================
    function getOracle(string memory _oracleName) external view returns (
        string memory name,
        address[] memory members,
        string memory shortDescription,
        string memory hashOfDetails,
        address[] memory skillVerifiedAddresses
    ) {
        IOpenworkGenesis.Oracle memory oracle = genesis.getOracle(_oracleName);
        return (oracle.name, oracle.members, oracle.shortDescription, oracle.hashOfDetails, oracle.skillVerifiedAddresses);
    }
    
    // ... Additional admin and view functions
    // See full implementation in repository
}`
};
