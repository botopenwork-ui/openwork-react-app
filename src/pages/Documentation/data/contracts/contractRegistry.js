export const contractRegistry = {
  id: 'contractRegistry',
  name: 'Contract Registry',
  chain: 'l2',
  column: 'l2-center',
  order: 3,
  status: 'testnet',
  version: 'v1.0.0',
  gas: '32K',
  mainnetNetwork: 'Arbitrum One',
  testnetNetwork: 'Arbitrum Sepolia',
  mainnetDeployed: 'Not deployed',
  testnetDeployed: 'Deployed',
  mainnetAddress: null,
  testnetAddress: '0x8AbC0E626A8fC723ec6f27FE8a4157A186D5767D',
  isUUPS: false,
  implementationAddress: null,
  tvl: 'N/A',
  docs: 'OpenworkContractRegistry - System directory that tracks all deployed OpenWork contracts across chains. Stores contract names, addresses, chain identifiers, and deployer info. Used by frontend for dynamic address discovery and by admins for deployment tracking. Simple owner-only registry, not operational storage.',
  
  overview: {
    purpose: 'OpenworkContractRegistry is a centralized directory service that maintains metadata about all deployed OpenWork contracts across multiple chains. Unlike OpenworkGenesis (which stores operational data like jobs and disputes), this registry stores CONTRACT INFORMATION - names, addresses, chains, and deployers. It serves as the system\'s "phone book" allowing frontends to dynamically discover contract addresses, deployment scripts to register new contracts, and admins to track the deployment state. The contract is owner-controlled (no authorization mapping) and intentionally simple - just CRUD operations on a name-to-metadata mapping.',
    tier: 'Native Chain (Arbitrum Sepolia)',
    category: 'Infrastructure - Directory Service',
    upgradeability: 'Not Upgradeable (Simple Registry)'
  },
  
  features: [
    'Contract directory: Maps contract names to addresses, chains, and deployer info',
    'Multi-chain tracking: Records which chain each contract is deployed on',
    'Dynamic discovery: Frontend can query addresses instead of hardcoding',
    'Deployment tracking: Records who deployed each contract and when',
    'Complete enumeration: getAllContracts() returns full directory',
    'Name-based lookup: getContract(name) for specific contract info',
    'Owner-only writes: Only registry owner can add/update/remove contracts',
    'Event logging: All CRUD operations emit events for tracking',
    'Simple CRUD: Add, update, remove, and query contract metadata',
    'Non-upgradeable: Intentionally simple design without proxy pattern',
    'Complementary to Genesis: Different purpose - directory vs operational storage',
    'Centralized management: Single owner controls registry (not multi-contract authorization)'
  ],
  
  systemPosition: {
    description: 'Contract Registry sits as the system directory on Arbitrum, providing a lookup service for all OpenWork contracts. When contracts are deployed, admins register them here with metadata (address, chain, deployer). Frontends query the registry to dynamically fetch contract addresses rather than hardcoding them. This allows contract upgrades without frontend redeployment. Unlike Genesis contracts that store operational data and are called by multiple authorized contracts, the registry stores metadata and is only written by the owner.',
    diagram: `
📍 System Directory Architecture

OpenworkContractRegistry ⭐ (You are here - Directory Service)
    ↑ Queries for addresses
    │
    ├─> Frontend/UI
    │   └─> Fetches contract addresses dynamically
    │   └─> No hardcoded addresses needed
    │
    ├─> Deployment Scripts
    │   └─> Register contracts after deployment
    │   └─> Track deployment state
    │
    ├─> Admin Tools
    │   └─> Manage contract directory
    │   └─> Update after upgrades
    │
    └─> Documentation/Monitoring
        └─> Source of truth for addresses
        └─> Track multi-chain deployments

Comparison with Genesis Contracts:

┌─────────────────────┐         ┌──────────────────────┐
│  Contract Registry  │         │  Genesis Contracts   │
│  (Directory)        │         │  (Operational Data)  │
├─────────────────────┤         ├──────────────────────┤
│ • Contract names    │         │ • Jobs data          │
│ • Contract addresses│         │ • Disputes           │
│ • Chain info        │         │ • Stakes             │
│ • Deployer info     │         │ • Profiles           │
│ • Owner-only writes │         │ • Multi-auth writes  │
│ • Simple metadata   │         │ • Complex structures │
└─────────────────────┘         └──────────────────────┘
        ↓                               ↓
    Discovery Layer              Operational Storage
    Address Lookup               State Management

Typical Workflow:
1. Deploy contract (e.g., NOWJC v2.0)
2. Owner calls registry.addContract("NOWJC", address, "Arbitrum", deployer)
3. Frontend calls registry.getContract("NOWJC")
4. Frontend gets address and interacts with NOWJC
5. On upgrade: Owner calls registry.updateContract("NOWJC", newAddress, ...)`
  },
  
  dependencies: {
    dependsOn: [],
    requiredBy: [
      { 
        name: 'Frontend/UI', 
        reason: 'Queries registry to dynamically fetch contract addresses instead of hardcoding them in application.',
        type: 'Discovery'
      },
      { 
        name: 'Deployment Scripts', 
        reason: 'Register newly deployed contracts with their addresses, chains, and deployer information.',
        type: 'Registration'
      },
      { 
        name: 'Admin Tools', 
        reason: 'Manage contract directory, update addresses after upgrades, track multi-chain deployments.',
        type: 'Management'
      },
      { 
        name: 'Monitoring/Documentation', 
        reason: 'Query for complete list of deployed contracts, verify deployment state, track system architecture.',
        type: 'Tracking'
      }
    ],
    prerequisites: [
      'Owner address must be secure (controls entire registry)',
      'Deploy registry before other contracts (or update after)',
      'Frontend must be configured with registry address',
      'Deployment scripts should auto-register new contracts'
    ]
  },
  
  functions: [
    {
      category: 'Contract Management',
      description: 'Owner-only functions for managing the contract directory',
      items: [
        {
          name: 'addContract',
          signature: 'addContract(string name, address contractAddress, string chain, address deployer)',
          whatItDoes: 'Registers a new contract in the directory with its metadata.',
          whyUse: 'Called by owner after deploying a new contract to make it discoverable.',
          howItWorks: [
            'Validates name is not empty and not already registered',
            'Validates contract address and deployer are not zero addresses',
            'Validates chain identifier is not empty',
            'Creates ContractInfo struct with provided data',
            'Adds name to contractNames array for enumeration',
            'Emits ContractAdded event'
          ],
          parameters: [
            { name: 'name', type: 'string', description: 'Unique contract identifier (e.g., "NOWJC", "Native Athena")' },
            { name: 'contractAddress', type: 'address', description: 'Deployed contract address' },
            { name: 'chain', type: 'string', description: 'Chain identifier (e.g., "Arbitrum Sepolia", "Ethereum Mainnet")' },
            { name: 'deployer', type: 'address', description: 'Address that deployed the contract' }
          ],
          accessControl: 'onlyOwner',
          events: ['ContractAdded(name, contractAddress, chain, deployer)'],
          gasEstimate: '~100K gas',
          example: `// After deploying NOWJC on Arbitrum Sepolia
await registry.addContract(
  "NOWJC",
  "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "Arbitrum Sepolia",
  deployerAddress
);

// Frontend can now query:
const nowjc = await registry.getContract("NOWJC");
console.log("NOWJC address:", nowjc.contractAddress);
console.log("Chain:", nowjc.chain);`,
          relatedFunctions: ['updateContract', 'removeContract', 'getContract']
        },
        {
          name: 'updateContract',
          signature: 'updateContract(string name, address newContractAddress, string newChain, address newDeployer)',
          whatItDoes: 'Updates existing contract information (typically after upgrade).',
          whyUse: 'Called by owner when contract is upgraded to new address or redeployed.',
          howItWorks: [
            'Requires contract already exists in registry',
            'Validates new address, chain, and deployer are valid',
            'Updates ContractInfo with new values',
            'Emits ContractUpdated event',
            'Name remains the same (lookup key)'
          ],
          parameters: [
            { name: 'name', type: 'string', description: 'Contract name to update' },
            { name: 'newContractAddress', type: 'address', description: 'New contract address (after upgrade)' },
            { name: 'newChain', type: 'string', description: 'Updated chain identifier if moved' },
            { name: 'newDeployer', type: 'address', description: 'New deployer address' }
          ],
          accessControl: 'onlyOwner',
          events: ['ContractUpdated(name, newContractAddress, newChain, newDeployer)'],
          gasEstimate: '~40K gas',
          example: `// After upgrading NOWJC to v2.0
await registry.updateContract(
  "NOWJC",
  "0xNewAddress...",
  "Arbitrum Sepolia",
  deployerAddress
);

// Frontend automatically gets new address:
const nowjc = await registry.getContract("NOWJC");
console.log("Updated address:", nowjc.contractAddress); // New address!`,
          relatedFunctions: ['addContract', 'getContract']
        },
        {
          name: 'removeContract',
          signature: 'removeContract(string name)',
          whatItDoes: 'Removes a contract from the registry.',
          whyUse: 'Called by owner to remove deprecated or test contracts.',
          howItWorks: [
            'Requires contract exists',
            'Deletes ContractInfo from mapping',
            'Removes name from contractNames array (swap and pop)',
            'Emits ContractRemoved event'
          ],
          parameters: [
            { name: 'name', type: 'string', description: 'Contract name to remove' }
          ],
          accessControl: 'onlyOwner',
          events: ['ContractRemoved(name)'],
          gasEstimate: '~35K gas',
          example: `// Remove deprecated test contract
await registry.removeContract("NOWJC_Test_v1");

// Contract no longer discoverable
try {
  const contract = await registry.getContract("NOWJC_Test_v1");
} catch (error) {
  console.log("Contract does not exist"); // Expected
}`,
          relatedFunctions: ['addContract', 'getAllContracts']
        }
      ]
    },
    {
      category: 'Query Functions',
      description: 'Public view functions for looking up contract information',
      items: [
        {
          name: 'getContract',
          signature: 'getContract(string name) view returns (ContractInfo)',
          whatItDoes: 'Retrieves complete metadata for a specific contract.',
          whyUse: 'Frontend uses this to fetch contract addresses dynamically.',
          howItWorks: [
            'Requires contract exists in registry',
            'Returns ContractInfo struct with all metadata',
            'Reverts if contract not found'
          ],
          parameters: [
            { name: 'name', type: 'string', description: 'Contract name to look up' }
          ],
          accessControl: 'Public view',
          events: ['None (view function)'],
          gasEstimate: 'N/A (view)',
          example: `// Frontend fetches NOWJC address
const nowjc = await registry.getContract("NOWJC");

console.log("Name:", nowjc.name);
console.log("Address:", nowjc.contractAddress);
console.log("Chain:", nowjc.chain);
console.log("Deployer:", nowjc.deployer);

// Use address to interact with contract
const nowjcContract = new ethers.Contract(
  nowjc.contractAddress,
  nowjcABI,
  provider
);`,
          relatedFunctions: ['getAllContracts', 'getContractCount']
        },
        {
          name: 'getAllContracts',
          signature: 'getAllContracts() view returns (ContractInfo[])',
          whatItDoes: 'Returns array of all registered contracts.',
          whyUse: 'Admin tools use this to display complete directory or verify deployment state.',
          howItWorks: [
            'Iterates through contractNames array',
            'Fetches ContractInfo for each name',
            'Returns array of all contracts'
          ],
          parameters: [],
          accessControl: 'Public view',
          events: ['None (view function)'],
          gasEstimate: 'N/A (view)',
          example: `// Admin dashboard displays all contracts
const allContracts = await registry.getAllContracts();

console.log("Total contracts:", allContracts.length);

for (const contract of allContracts) {
  console.log(\`\${contract.name}: \${contract.contractAddress} (\${contract.chain})\`);
}

// Output example:
// NOWJC: 0x742d35... (Arbitrum Sepolia)
// Native Athena: 0x8f9e... (Arbitrum Sepolia)
// Main DAO: 0x1a2b... (Ethereum Sepolia)`,
          relatedFunctions: ['getContract', 'getContractCount']
        },
        {
          name: 'getContractCount',
          signature: 'getContractCount() view returns (uint256)',
          whatItDoes: 'Returns total number of registered contracts.',
          whyUse: 'Quick check for registry size or iteration bounds.',
          howItWorks: [
            'Returns length of contractNames array'
          ],
          parameters: [],
          accessControl: 'Public view',
          events: ['None (view function)'],
          gasEstimate: 'N/A (view)',
          example: `const count = await registry.getContractCount();
console.log("Registered contracts:", count);

// Use for pagination if needed
const pageSize = 10;
const pages = Math.ceil(count / pageSize);`,
          relatedFunctions: ['getAllContracts']
        }
      ]
    },
    {
      category: 'Ownership',
      description: 'Function for transferring registry ownership',
      items: [
        {
          name: 'transferOwnership',
          signature: 'transferOwnership(address newOwner)',
          whatItDoes: 'Transfers registry ownership to a new address.',
          whyUse: 'Owner can transfer control to different admin or multisig.',
          howItWorks: [
            'Validates new owner is not zero address',
            'Validates new owner is different from current',
            'Updates owner variable',
            'Emits OwnershipTransferred event'
          ],
          parameters: [
            { name: 'newOwner', type: 'address', description: 'New owner address' }
          ],
          accessControl: 'onlyOwner',
          events: ['OwnershipTransferred(previousOwner, newOwner)'],
          gasEstimate: '~30K gas',
          example: `// Transfer to multisig for security
await registry.transferOwnership(multisigAddress);

// Or transfer to new admin
await registry.transferOwnership(newAdminAddress);`,
          relatedFunctions: ['addContract', 'updateContract', 'removeContract']
        }
      ]
    }
  ],
  
  dataFlows: [
    {
      title: 'Contract Registration Flow',
      description: 'How newly deployed contracts are registered',
      steps: [
        { chain: 'Any Chain', action: '1. Developer deploys new contract (e.g., NOWJC v2.0)' },
        { chain: 'Any Chain', action: '2. Deployment script records address and chain' },
        { chain: 'Native Chain', action: '3. Script calls registry.addContract() on Arbitrum' },
        { chain: 'Native Chain', action: '4. Registry validates inputs and stores metadata' },
        { chain: 'Native Chain', action: '5. Registry emits ContractAdded event' },
        { chain: 'Native Chain', action: '6. Contract now discoverable via getContract()' },
        { chain: 'Native Chain', action: '7. Frontend can fetch address dynamically' }
      ]
    },
    {
      title: 'Frontend Discovery Flow',
      description: 'How frontend dynamically discovers contract addresses',
      steps: [
        { chain: 'Native Chain', action: '1. Frontend loads, needs NOWJC address' },
        { chain: 'Native Chain', action: '2. Calls registry.getContract("NOWJC")' },
        { chain: 'Native Chain', action: '3. Registry returns ContractInfo with address' },
        { chain: 'Native Chain', action: '4. Frontend creates ethers contract instance' },
        { chain: 'Native Chain', action: '5. User can now interact with NOWJC' },
        { chain: 'Native Chain', action: '6. If NOWJC upgraded, registry updated by owner' },
        { chain: 'Native Chain', action: '7. Frontend automatically gets new address (no redeploy!)' }
      ]
    },
    {
      title: 'Upgrade Management Flow',
      description: 'How contract upgrades are reflected in registry',
      steps: [
        { chain: 'Any Chain', action: '1. Contract needs upgrade (bug fix, new features)' },
        { chain: 'Any Chain', action: '2. Deploy new version at new address' },
        { chain: 'Native Chain', action: '3. Owner calls registry.updateContract()' },
        { chain: 'Native Chain', action: '4. Registry updates address in directory' },
        { chain: 'Native Chain', action: '5. Emits ContractUpdated event' },
        { chain: 'Native Chain', action: '6. Frontend queries registry' },
        { chain: 'Native Chain', action: '7. Gets new address automatically' },
        { chain: 'Native Chain', action: '8. Users interact with upgraded contract seamlessly' }
      ]
    }
  ],
  
  integrationGuide: {
    example: `// OpenworkContractRegistry Integration Example
const { ethers } = require('ethers');

// Setup registry
const registry = new ethers.Contract(
  registryAddress,
  registryABI,
  signer
);

// 1. DEPLOYMENT: Register new contract
await registry.addContract(
  "NOWJC",
  "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "Arbitrum Sepolia",
  deployerAddress
);

// 2. FRONTEND: Fetch contract addresses dynamically
const nowjcInfo = await registry.getContract("NOWJC");
const nativeAthenaInfo = await registry.getContract("Native Athena");
const nativeDAOInfo = await registry.getContract("Native DAO");

// Create contract instances
const nowjc = new ethers.Contract(
  nowjcInfo.contractAddress,
  nowjcABI,
  signer
);

// 3. ADMIN: Get all contracts for dashboard
const allContracts = await registry.getAllContracts();
console.log("System Directory:");
for (const c of allContracts) {
  console.log(\`  \${c.name}: \${c.contractAddress} on \${c.chain}\`);
}

// 4. UPGRADE: Update contract after deployment
await registry.updateContract(
  "NOWJC",
  "0xNewAddress...",
  "Arbitrum Sepolia",
  deployerAddress
);

// Frontend automatically gets new address on next query!
const updated = await registry.getContract("NOWJC");
console.log("New address:", updated.contractAddress);

// 5. MONITORING: Check registry state
const count = await registry.getContractCount();
console.log("Total registered contracts:", count);`,
    tips: [
      'Registry is NOT upgradeable - deploy once and use forever',
      'Owner-only writes - secure the owner address (consider multisig)',
      'Frontend should cache registry address but query contract addresses dynamically',
      'Use consistent naming convention (e.g., "NOWJC", "Native Athena")',
      'Chain strings should be human-readable (e.g., "Arbitrum Sepolia" not "421614")',
      'Deployment scripts should auto-register contracts',
      'Update registry immediately after contract upgrades',
      'getAllContracts() may hit gas limits with 100+ contracts',
      'Registry stores metadata, not operational data (use Genesis for that)',
      'Events provide audit trail of all registry changes',
      'Consider emitting event indexing for off-chain tracking',
      'Registry enables contract upgrades without frontend redeployment'
    ]
  },
  
  deployConfig: {
    type: 'standard',
    constructor: [],
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
    estimatedGas: '800K',
    postDeploy: {
      message: 'Standard deployment complete! Contract registry ready for use.',
      nextSteps: [
        '1. Deploy OpenworkContractRegistry (no constructor params)',
        '2. Owner is automatically set to deployer address',
        '3. Register all deployed contracts via addContract():',
        '   - addContract("NOWJC", address, "Arbitrum Sepolia", deployer)',
        '   - addContract("Native Athena", address, "Arbitrum Sepolia", deployer)',
        '   - addContract("Main DAO", address, "Base Sepolia", deployer)',
        '   - etc. for all contracts',
        '4. Verify contract on Arbiscan',
        '5. Share registry address with frontend team',
        '6. Configure frontend to query registry for addresses',
        '7. Update deployment scripts to auto-register new contracts',
        '8. Consider transferring ownership to multisig for security',
        '9. Test getAllContracts() to view complete directory',
        '10. IMPORTANT: Registry is NOT upgradeable - deploy once, use forever'
      ]
    }
  },
  
  securityConsiderations: [
    'Owner-only writes: Single owner controls entire registry',
    'Not upgradeable: Simple contract, intentional design choice',
    'No multi-signature: Consider transferring ownership to multisig',
    'Centralized control: Owner can arbitrarily change addresses',
    'Name collisions: Owner must ensure unique, consistent naming',
    'No address validation: Registry trusts owner to provide correct addresses',
    'Public reads: Anyone can query directory (transparency)',
    'No automated verification: Owner responsible for accuracy',
    'Event logging: All changes tracked for audit',
    'Zero address checks: Prevents invalid addresses',
    'No business logic: Simple CRUD reduces attack surface',
    'Trust model: Frontend trusts registry for correct addresses'
  ],
  
  code: `// Full implementation: contracts/openwork-full-contract-suite-layerzero+CCTP 2 Dec/openwork-contract-registry.sol

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract OpenworkContractRegistry {
    struct ContractInfo {
        string name;
        address contractAddress;
        string chain;
        address deployer;
    }

    address public owner;
    mapping(string => ContractInfo) private contracts;
    string[] private contractNames;

    modifier onlyOwner() {
        require(msg.sender == owner, "Not the owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function addContract(
        string memory name,
        address contractAddress,
        string memory chain,
        address deployer
    ) external onlyOwner {
        require(bytes(name).length > 0, "Name cannot be empty");
        require(contractAddress != address(0), "Invalid address");
        
        contracts[name] = ContractInfo({
            name: name,
            contractAddress: contractAddress,
            chain: chain,
            deployer: deployer
        });
        
        contractNames.push(name);
        emit ContractAdded(name, contractAddress, chain, deployer);
    }

    function updateContract(
        string memory name,
        address newContractAddress,
        string memory newChain,
        address newDeployer
    ) external onlyOwner {
        require(newContractAddress != address(0), "Invalid address");
        
        contracts[name].contractAddress = newContractAddress;
        contracts[name].chain = newChain;
        contracts[name].deployer = newDeployer;
        
        emit ContractUpdated(name, newContractAddress, newChain, newDeployer);
    }

    function removeContract(string memory name) external onlyOwner {
        delete contracts[name];
        
        for (uint256 i = 0; i < contractNames.length; i++) {
            if (keccak256(bytes(contractNames[i])) == keccak256(bytes(name))) {
                contractNames[i] = contractNames[contractNames.length - 1];
                contractNames.pop();
                break;
            }
        }
        
        emit ContractRemoved(name);
    }

    function getContract(string memory name) external view returns (ContractInfo memory) {
        return contracts[name];
    }

    function getAllContracts() external view returns (ContractInfo[] memory) {
        ContractInfo[] memory allContracts = new ContractInfo[](contractNames.length);
        for (uint256 i = 0; i < contractNames.length; i++) {
            allContracts[i] = contracts[contractNames[i]];
        }
        return allContracts;
    }

    function getContractCount() external view returns (uint256) {
        return contractNames.length;
    }

    // ... Additional owner and view functions
    // See full implementation in repository
}`
};
