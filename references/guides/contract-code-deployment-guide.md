# Contract Code & Deployment Feature Implementation Guide

**Last Updated:** April 11, 2025  
**Author:** Development Team  
**Purpose:** Standardize the process of adding contract code and deployment functionality to the OpenWork documentation interface with automated compilation.

---

## Table of Contents

1. [Overview](#overview)
2. [Part 1: Adding Contract Code to Code Tab](#part-1-adding-contract-code-to-code-tab)
3. [Part 2: Adding Deployment Configuration](#part-2-adding-deployment-configuration)
4. [Part 3: Automated Compilation System](#part-3-automated-compilation-system)
5. [Part 4: Implementation Checklist](#part-4-implementation-checklist)
6. [Part 5: Complete Examples](#part-5-complete-examples)
7. [Troubleshooting](#troubleshooting)

---

## Overview

This guide documents the **automated deployment system** for the OpenWork documentation interface. The system uses Foundry for on-demand contract compilation, eliminating the need for manual artifact creation.

### System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend (React)                     │
│  src/pages/Documentation/OpenworkDocs.jsx               │
│  - User clicks "Deploy Contract"                        │
│  - Calls backend compilation API                        │
└──────────────────┬──────────────────────────────────────┘
                   │ HTTP POST /api/compile
                   ▼
┌─────────────────────────────────────────────────────────┐
│                  Backend (Express)                       │
│  backend/server.js                                      │
│  - Receives compilation request                         │
│  - Calls Foundry compiler utility                       │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│               Foundry (Solc Compiler)                    │
│  backend/utils/compiler.js                              │
│  - Runs `forge build` command                           │
│  - Extracts ABI and bytecode from artifacts             │
└──────────────────┬──────────────────────────────────────┘
                   │ Returns {abi, bytecode}
                   ▼
┌─────────────────────────────────────────────────────────┐
│                     Web3.js                             │
│  - Creates contract instance with ABI                   │
│  - Deploys with bytecode to blockchain                  │
│  - Returns deployed contract address                    │
└─────────────────────────────────────────────────────────┘
```

### Key Benefits

✅ **No Manual Artifacts** - Contracts compile on-demand  
✅ **Always Fresh** - Uses latest contract code  
✅ **Developer Friendly** - Just add Solidity files  
✅ **Production Ready** - Proper error handling  
✅ **Multi-Contract Support** - Compile any contract in `contracts/src/`

---

## Part 1: Adding Contract Code to Code Tab

### 1.1 Standard Contracts (Non-Upgradeable)

**Location:** `src/pages/Documentation/data/contracts/{contractName}.js`

**Step 1:** Add the `code` property to the contract object

```javascript
export const token = {
  id: 'token',
  name: 'OpenWork Token',
  // ... other properties ...
  
  code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Full contract source code here
// Include all imports, contract declaration, and functions
contract VotingToken is ERC20, ERC20Permit, ERC20Votes, Ownable {
    // Contract implementation
}`,
};
```

**Key Points:**
- Use template literals (backticks) for multi-line code
- Include complete contract source with all imports
- Maintain proper indentation (will be displayed in monospace font)
- Include SPDX license identifier
- Add contract comments for clarity

### 1.2 UUPS Contracts (Upgradeable)

For UUPS contracts, add **both** implementation and proxy code:

**Step 1:** Add implementation contract to `code` property

```javascript
export const mainDAO = {
  id: 'mainDAO',
  name: 'Main DAO',
  isUUPS: true,  // Important flag!
  
  code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Implementation contract code
contract MainDAOImplementation is 
    Initializable,
    OwnableUpgradeable,
    UUPSUpgradeable 
{
    // Implementation
}`,
  
  proxyCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract UUPSProxy is ERC1967Proxy {
    constructor(
        address implementation,
        bytes memory data
    ) ERC1967Proxy(implementation, data) {}
    
    receive() external payable {}
    
    function getImplementation() external view returns (address impl) {
        return _implementation();
    }
}`,
};
```

**Key Points:**
- Set `isUUPS: true` flag
- Add both `code` (implementation) and `proxyCode` properties
- Proxy code is standardized (same for all UUPS contracts)
- UI automatically shows both sections with copy buttons

### 1.3 Copy Button Functionality

**Already Implemented Globally** - No action needed!

The `OpenworkDocs.jsx` component includes:
```javascript
const [copiedCode, setCopiedCode] = useState(null);

const handleCopyCode = async (code, id) => {
  await navigator.clipboard.writeText(code);
  setCopiedCode(id);
  setTimeout(() => setCopiedCode(null), 2000);
};
```

Copy buttons appear automatically for:
- Main contract code (`id='main'`)
- Proxy contract code (`id='proxy'` for UUPS contracts)

---

## Part 2: Adding Deployment Configuration

### 2.1 deployConfig Object Structure

Add the `deployConfig` object to enable deployment functionality:

```javascript
export const token = {
  // ... existing properties ...
  
  deployConfig: {
    type: 'standard',  // or 'uups' for upgradeable contracts
    
    constructor: [
      { 
        name: 'initialOwner',
        type: 'address',
        default: 'WALLET',  // Special keyword: auto-fills with connected wallet
        description: 'Address that will own the token contract',
        placeholder: '0x...'
      },
      // Add more constructor parameters as needed
    ],
    
    networks: {
      testnet: {
        name: 'Base Sepolia',
        chainId: 84532,
        rpcUrl: 'https://sepolia.base.org',
        explorer: 'https://sepolia.basescan.org',
        currency: 'ETH'
      },
      mainnet: {
        name: 'Base Mainnet',
        chainId: 8453,
        rpcUrl: 'https://mainnet.base.org',
        explorer: 'https://basescan.org',
        currency: 'ETH'
      }
    },
    
    estimatedGas: '2.1M',  // Approximate gas for deployment
    
    postDeploy: {
      message: 'Token deployed successfully! Initial supply of 1B OWORK minted to your address.',
      nextSteps: [
        'Transfer tokens to Main Rewards contract for user claims',
        'Transfer tokens to Main DAO treasury',
        'Verify contract on Basescan',
        'Add token to MetaMask'
      ]
    }
  }
};
```

### 2.2 Constructor Parameters

Each parameter object supports:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | string | ✅ | Parameter name (matches Solidity) |
| `type` | string | ✅ | Solidity type (address, uint256, string, etc.) |
| `default` | string | ❌ | Default value. Use 'WALLET' to auto-fill with connected wallet |
| `description` | string | ✅ | User-friendly explanation |
| `placeholder` | string | ❌ | Input placeholder text |

**Example with multiple parameters:**

```javascript
constructor: [
  { 
    name: 'initialOwner',
    type: 'address',
    default: 'WALLET',
    description: 'Contract owner address',
    placeholder: '0x...'
  },
  { 
    name: 'tokenAddress',
    type: 'address',
    description: 'Address of the OWORK token contract',
    placeholder: '0x...'
  },
  { 
    name: 'minimumStake',
    type: 'uint256',
    description: 'Minimum tokens required to stake',
    placeholder: '100000000000000000000'  // 100 tokens
  }
]
```

### 2.3 Network Configuration

**Supported Networks:**

#### Base (Primary)
```javascript
testnet: {
  name: 'Base Sepolia',
  chainId: 84532,
  rpcUrl: 'https://sepolia.base.org',
  explorer: 'https://sepolia.basescan.org',
  currency: 'ETH'
},
mainnet: {
  name: 'Base Mainnet',
  chainId: 8453,
  rpcUrl: 'https://mainnet.base.org',
  explorer: 'https://basescan.org',
  currency: 'ETH'
}
```

#### Arbitrum (Alternative)
```javascript
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
```

### 2.4 Post-Deployment Configuration

```javascript
postDeploy: {
  message: 'Clear success message shown to user',
  nextSteps: [
    'Step 1: What user should do first',
    'Step 2: Secondary action',
    'Step 3: Verification or testing',
    'Step 4: Additional setup'
  ]
}
```

**Best Practices:**
- Keep message concise and positive
- List 3-5 actionable next steps
- Include verification step (Basescan/Arbiscan)
- Mention any required post-deployment transactions

---

## Part 3: Automated Compilation System

### 3.1 System Overview

The automated compilation system eliminates manual artifact creation by compiling contracts on-demand using Foundry.

**Workflow:**
1. User clicks "Deploy Contract" in UI
2. Frontend calls backend: `POST /api/compile`
3. Backend runs Foundry: `forge build`
4. Backend extracts ABI/bytecode from build artifacts
5. Returns to frontend for Web3.js deployment

### 3.2 Prerequisites

#### Install Foundry

```bash
# Install Foundry (if not already installed)
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Verify installation
forge --version
# Should output: forge 0.2.0 or higher
```

#### Initialize Foundry Project

```bash
# Navigate to contracts directory
cd contracts

# Initialize (creates foundry.toml, lib/, src/, etc.)
forge init --no-git --force .

# Install OpenZeppelin contracts
forge install OpenZeppelin/openzeppelin-contracts@v5.0.0
```

**Project Structure:**
```
contracts/
├── foundry.toml           # Foundry configuration
├── lib/                   # Dependencies (OpenZeppelin)
├── src/                   # Contract source files ← Add contracts here
├── out/                   # Build artifacts (auto-generated)
├── cache/                 # Compiler cache (auto-generated)
└── test/                  # Test files (optional)
```

### 3.3 Adding Contract Source Files

**Location:** `contracts/src/{ContractName}.sol`

**Step 1:** Copy contract to `src/` directory

```bash
cd contracts
cp "openwork-full-contract-suite-layerzero+CCTP 2 Nov/openwork-token.sol" src/VotingToken.sol
```

**Step 2:** Verify contract compiles

```bash
forge build

# Expected output:
# [⠊] Compiling...
# [⠒] Compiling 50 files with Solc 0.8.29
# [⠢] Solc 0.8.29 finished in 995.88ms
# Compiler run successful!
```

**Step 3:** Check build artifacts

```bash
# Artifacts are created in out/
ls out/VotingToken.sol/
# VotingToken.json  ← Contains ABI and bytecode
```

### 3.4 Backend Compilation API

**Endpoint:** `POST http://localhost:3001/api/compile`

**Request:**
```json
{
  "contractName": "VotingToken"
}
```

**Response (Success):**
```json
{
  "success": true,
  "contractName": "VotingToken",
  "abi": [ /* Full ABI array */ ],
  "bytecode": "0x608060405234801561000f575f80fd5b50..."
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Compilation failed: Contract not found"
}
```

### 3.5 Backend Implementation

**File:** `backend/utils/compiler.js`

```javascript
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function compileContract(contractName) {
  try {
    // Run forge build
    const contractsDir = path.join(__dirname, '../../contracts');
    execSync('forge build', { 
      cwd: contractsDir,
      stdio: 'inherit'
    });
    
    // Read artifact
    const artifactPath = path.join(
      contractsDir, 
      'out', 
      `${contractName}.sol`, 
      `${contractName}.json`
    );
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    
    // Extract ABI and bytecode
    return {
      success: true,
      contractName,
      abi: artifact.abi,
      bytecode: artifact.bytecode.object
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = { compileContract };
```

**File:** `backend/server.js` (excerpt)

```javascript
const { compileContract } = require('./utils/compiler');

app.post('/api/compile', (req, res) => {
  const { contractName } = req.body;
  
  console.log(`📦 API: Received compile request for ${contractName}`);
  
  const result = compileContract(contractName);
  
  if (result.success) {
    console.log(`✅ Successfully compiled ${contractName}`);
    res.json(result);
  } else {
    console.error(`❌ Compilation failed:`, result.error);
    res.status(500).json(result);
  }
});
```

### 3.6 Frontend Integration

**File:** `src/pages/Documentation/OpenworkDocs.jsx` (excerpt)

```javascript
const handleDeploy = async () => {
  try {
    setDeployStatus('deploying');
    
    // Step 1: Compile contract via backend
    console.log('Compiling contract via backend...');
    const compileResponse = await fetch('http://localhost:3001/api/compile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contractName: 'VotingToken' })
    });
    
    const artifact = await compileResponse.json();
    console.log('Contract compiled successfully');
    
    // Step 2: Deploy with Web3.js
    const contract = new web3.eth.Contract(artifact.abi);
    const deployTx = contract.deploy({
      data: artifact.bytecode,
      arguments: [deployParams.initialOwner]
    });
    
    const gas = await deployTx.estimateGas({ from: account });
    const gasWithBuffer = gas + (gas * 20n / 100n);
    
    const deployed = await deployTx.send({
      from: account,
      gas: gasWithBuffer
    });
    
    setDeployedAddress(deployed.options.address);
    setDeployStatus('success');
  } catch (error) {
    console.error('Deployment error:', error);
    setErrorMessage(error.message);
    setDeployStatus('idle');
  }
};
```

### 3.7 Testing the System

**Step 1:** Start backend server
```bash
cd backend
npm start
# Server running on http://localhost:3001
```

**Step 2:** Test compilation endpoint
```bash
curl -X POST http://localhost:3001/api/compile \
  -H "Content-Type: application/json" \
  -d '{"contractName":"VotingToken"}'
```

**Expected Response:**
```json
{
  "success": true,
  "contractName": "VotingToken",
  "abi": [...],
  "bytecode": "0x608060405..."
}
```

**Step 3:** Test in UI
1. Open http://localhost:5173/docs
2. Select contract → Deploy tab
3. Connect wallet
4. Fill parameters
5. Click "Deploy Contract"
6. ✅ Should compile and deploy successfully

---

## Part 4: Implementation Checklist

### Pre-Implementation

- [ ] Foundry installed and initialized
- [ ] OpenZeppelin contracts installed
- [ ] Backend server configured with compilation endpoint
- [ ] Contract source code available
- [ ] Constructor parameters documented
- [ ] Network configurations identified
- [ ] Post-deployment steps planned

### Contract Setup

- [ ] Copy contract to `contracts/src/{ContractName}.sol`
- [ ] Run `forge build` to verify compilation
- [ ] Check artifacts created in `out/` directory
- [ ] Test backend compilation endpoint with curl

### Code Tab Implementation

- [ ] Add `code` property with full source code
- [ ] For UUPS: Add `proxyCode` property
- [ ] For UUPS: Set `isUUPS: true` flag
- [ ] Verify code formatting (indentation, line breaks)
- [ ] Test copy button functionality

### Deployment Configuration

- [ ] Add `deployConfig` object
- [ ] Configure `constructor` array with all parameters
- [ ] Set appropriate `default` values (use 'WALLET' for owner)
- [ ] Add testnet network configuration
- [ ] Add mainnet network configuration
- [ ] Specify `estimatedGas`
- [ ] Write `postDeploy.message`
- [ ] List `postDeploy.nextSteps` (3-5 items)

### Testing

- [ ] Backend server running (`npm start`)
- [ ] Frontend running (`npm run dev`)
- [ ] Load documentation page
- [ ] Select contract from sidebar
- [ ] Verify Code tab displays properly
- [ ] Test copy button(s)
- [ ] Click Deploy tab
- [ ] Connect wallet (MetaMask)
- [ ] Verify parameters auto-fill correctly
- [ ] Verify compilation step works (check console)
- [ ] Deploy to testnet
- [ ] Verify success screen
- [ ] Check deployed contract on block explorer

---

## Part 5: Complete Examples

### Example 1: Standard Contract (OpenWork Token)

**Step 1:** Add contract source to `contracts/src/VotingToken.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract VotingToken is ERC20, ERC20Permit, ERC20Votes, Ownable {
    uint256 public constant INITIAL_SUPPLY = 1_000_000_000 * 10**18;

    constructor(address initialOwner) 
        ERC20("OpenWorkToken", "OWORK")
        ERC20Permit("DAOToken")
        Ownable(initialOwner)
    {
        _mint(initialOwner, INITIAL_SUPPLY);
    }
    
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
    
    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Votes)
    {
        super._update(from, to, value);
    }
    
    function nonces(address owner)
        public
        view
        override(ERC20Permit, Nonces)
        returns (uint256)
    {
        return super.nonces(owner);
    }
}
```

**Step 2:** Verify compilation

```bash
cd contracts
forge build

# Success output:
# Compiler run successful!
```

**Step 3:** Add to documentation - `src/pages/Documentation/data/contracts/token.js`

```javascript
export const token = {
  id: 'token',
  name: 'OpenWork Token',
  chain: 'base',
  // ... other metadata ...
  
  code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract VotingToken is ERC20, ERC20Permit, ERC20Votes, Ownable {
    uint256 public constant INITIAL_SUPPLY = 1_000_000_000 * 10**18;

    constructor(address initialOwner) 
        ERC20("OpenWorkToken", "OWORK")
        ERC20Permit("DAOToken")
        Ownable(initialOwner)
    {
        _mint(initialOwner, INITIAL_SUPPLY);
    }
    
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
    
    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Votes)
    {
        super._update(from, to, value);
    }
    
    function nonces(address owner)
        public
        view
        override(ERC20Permit, Nonces)
        returns (uint256)
    {
        return super.nonces(owner);
    }
}`,

  deployConfig: {
    type: 'standard',
    constructor: [
      { 
        name: 'initialOwner',
        type: 'address',
        default: 'WALLET',
        description: 'Address that will own the token contract and can mint tokens',
        placeholder: '0x...'
      }
    ],
    networks: {
      testnet: {
        name: 'Base Sepolia',
        chainId: 84532,
        rpcUrl: 'https://sepolia.base.org',
        explorer: 'https://sepolia.basescan.org',
        currency: 'ETH'
      },
      mainnet: {
        name: 'Base Mainnet',
        chainId: 8453,
        rpcUrl: 'https://mainnet.base.org',
        explorer: 'https://basescan.org',
        currency: 'ETH'
      }
    },
    estimatedGas: '2.1M',
    postDeploy: {
      message: 'Token deployed successfully! Initial supply of 1B OWORK minted to your address.',
      nextSteps: [
        'Transfer tokens to Main Rewards contract for user claims',
        'Transfer tokens to Main DAO treasury',
        'Verify contract on Basescan',
        'Add token to MetaMask'
      ]
    }
  }
};
```

**Step 4:** Test deployment

```bash
# Backend
cd backend && npm start

# Frontend (new terminal)
npm run dev

# Open browser
open http://localhost:5173/docs
```

### Example 2: Testing Compilation Endpoint

```bash
# Test compilation
curl -X POST http://localhost:3001/api/compile \
  -H "Content-Type: application/json" \
  -d '{"contractName":"VotingToken"}' | jq

# Expected response:
{
  "success": true,
  "contractName": "VotingToken",
  "abi": [
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "initialOwner",
          "type": "address"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    // ... full ABI
  ],
  "bytecode": "0x608060405234801561000f575f80fd5b506040516..."
}
```

---

## Troubleshooting

### Common Issues and Solutions

#### Issue 1: Foundry not installed

**Symptoms:** `forge: command not found`

**Solutions:**
```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Verify
forge --version
```

#### Issue 2: Compilation fails - "Contract not found"

**Symptoms:** Backend returns error about missing contract

**Solutions:**
- Verify contract file exists in `contracts/src/`
- Check filename matches request: `VotingToken.sol`
- Ensure contract name in Solidity matches filename
- Run `forge build` manually to test

```bash
cd contracts
ls -la src/VotingToken.sol  # Should exist
forge build                  # Should succeed
```

#### Issue 3: Backend compilation endpoint fails

**Symptoms:** 500 error from `/api/compile`

**Solutions:**
- Check backend console for error details
- Verify backend is running: `curl http://localhost:3001/health`
- Check `forge build` works manually in contracts/ directory
- Ensure OpenZeppelin installed: `ls contracts/lib/openzeppelin-contracts`

```bash
# Debug steps
cd contracts
forge build  # Should work

# Check backend logs
cd backend
npm start
# Look for compilation errors in output
```

#### Issue 4: "Invalid bytecode" error

**Symptoms:** Deployment fails with bytecode validation error

**Solutions:**
- Verify `forge build` completed successfully
- Check artifact exists: `ls contracts/out/VotingToken.sol/VotingToken.json`
- Verify artifact has bytecode:
```bash
cat contracts/out/VotingToken.sol/VotingToken.json | jq '.bytecode.object' | head -c 100
# Should output: "0x608060405..."
```

#### Issue 5: Backend can't find compiler.js

**Symptoms:** `Cannot find module './utils/compiler'`

**Solutions:**
- Verify file exists: `ls backend/utils/compiler.js`
- Check require path in server.js matches file location
- Restart backend server after creating file

```bash
# Verify structure
ls -la backend/utils/
# Should show compiler.js

# Restart
cd backend
npm start
```

#### Issue 6: OpenZeppelin imports fail

**Symptoms:** Compilation error: "File import callback not supported"

**Solutions:**
```bash
cd contracts

# Install OpenZeppelin
forge install OpenZeppelin/openzeppelin-contracts@v5.0.0

# Verify installation
ls -la lib/openzeppelin-contracts

# Rebuild
forge build
```

#### Issue 7: Port already in use

**Symptoms:** Backend won't start - "EADDRINUSE: address already in use :::3001"

**Solutions:**
```bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill -9

# Restart backend
cd backend && npm start
```

#### Issue 8: Network mismatch

**Symptoms:** MetaMask prompts to switch networks

**Solutions:**
- Deployment uses whatever network you're connected to in MetaMask
- No network selection in UI currently
- To deploy on different network: switch in MetaMask first
- Verify chain ID matches your connected network

---

## Quick Reference

### File Locations

```
Project Structure:
├── contracts/
│   ├── src/
│   │   └── {ContractName}.sol     ← Add contract source here
│   ├── out/                        ← Build artifacts (auto-generated)
│   └── foundry.toml                ← Foundry config
├── backend/
│   ├── server.js                   ← Compilation endpoint
│   └── utils/
│       └── compiler.js             ← Foundry integration
└── src/pages/Documentation/
    ├── data/contracts/
    │   └── {contractId}.js         ← Add: code, deployConfig
    └── OpenworkDocs.jsx            ← Deployment UI (complete)
```

### Required Commands

```bash
# Setup
forge init --no-git --force .
forge install OpenZeppelin/openzeppelin-contracts@v5.0.0

# Development
forge build                    # Compile contracts
cd backend && npm start       # Start backend
npm run dev                   # Start frontend

# Testing
curl -X POST http://localhost:3001/api/compile \
  -H "Content-Type: application/json" \
  -d '{"contractName":"VotingToken"}'
```

### API Reference

**Endpoint:** `POST http://localhost:3001/api/compile`

**Request:**
```json
{
  "contractName": "VotingToken"
}
```

**Response:**
```json
{
  "success": true,
  "contractName": "VotingToken",
  "abi": [...],
  "bytecode": "0x..."
}
```

### Deployment Flow

```
User clicks Deploy
    ↓
Frontend: POST /api/compile
    ↓
Backend: forge build
    ↓
Backend: Extract ABI/bytecode
    ↓
Frontend: web3.eth.Contract(abi)
    ↓
Frontend: deploy({data: bytecode})
    ↓
MetaMask: Sign transaction
    ↓
Blockchain: Deploy contract
    ↓
Frontend: Display success + address
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.0.0 | 2025-04-11 | Complete rewrite for automated compilation system |
| 1.0.0 | 2025-04-11 | Initial guide with manual artifacts |

---

## Support

For questions or issues:
1. Check this guide first
2. Review backend console logs
3. Test compilation manually: `cd contracts && forge build`
4. Verify backend endpoint: `curl http://localhost:3001/api/compile ...`
5. Check browser console for frontend errors

---

**End of Guide
