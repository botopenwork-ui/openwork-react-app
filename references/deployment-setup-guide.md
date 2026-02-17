# Deployment Setup Guide

## How to Add Deployment Capability to Any Contract

This guide explains how to enable deployment functionality for contracts in the documentation system.

---

## Overview

Each contract needs:
1. **deployConfig** section in its data file
2. **Compiler mapping** in `backend/utils/compiler.js`
3. **Contract source file** in `contracts/src/` (compiled with Foundry)

---

## Step 1: Add deployConfig to Contract Data File

Location: `src/pages/Documentation/data/contracts/[contractName].js`

### For Regular Contracts (Standard ERC20, etc.):

```javascript
export const myContract = {
  // ... existing fields ...
  
  deployConfig: {
    type: 'standard', // or omit this field
    constructor: [
      { 
        name: 'initialOwner',
        type: 'address',
        default: 'WALLET', // Will auto-fill with connected wallet
        description: 'Address that will own the contract',
        placeholder: '0x...'
      },
      {
        name: 'tokenAddress',
        type: 'address',
        default: null,
        description: 'OpenWork Token contract address',
        placeholder: '0x5f24747d5e59F9CCe5a9815BC12E2fB5Ae713679'
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
    estimatedGas: '2.5M',
    postDeploy: {
      message: 'Contract deployed successfully!',
      nextSteps: [
        'Verify contract on block explorer',
        'Initialize contract if needed',
        'Set up permissions/roles',
        'Update contract registry'
      ]
    }
  }
};
```

### For UUPS Contracts:

```javascript
export const myUUPSContract = {
  // ... existing fields ...
  
  deployConfig: {
    type: 'uups', // IMPORTANT: This hides params and skips validation
    constructor: [
      // List params needed for initialize() function
      // These are shown in docs but not used during deployment
      { 
        name: 'openworkToken',
        type: 'address',
        description: 'OpenWork Token address for initialization',
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
    estimatedGas: '3.5M',
    postDeploy: {
      message: 'UUPS contract deployed! Initialize the proxy on block scanner.',
      nextSteps: [
        'Deploy implementation (no params)',
        'Deploy proxy with implementation address (no params)',
        'Call initialize() on proxy via block scanner',
        'Verify both contracts'
      ]
    }
  }
};
```

---

## Step 2: Add Compiler Mapping

Location: `backend/utils/compiler.js`

Add your contract to the `contractMapping` object:

```javascript
const contractMapping = {
  // Existing...
  'MainDAO': {
    fileName: 'MainDAO.sol',
    className: 'MainDAO',
    subDir: null // src/ directory
  },
  
  // Add new contract
  'NOWJC': {
    fileName: 'NOWJC.sol', // Exact filename in contracts/src/
    className: 'NOWJC', // Contract class name
    subDir: null // null = src/, or specify subdirectory path
  }
};
```

**If contract is in subdirectory:**
```javascript
'MyContract': {
  fileName: 'my-contract.sol',
  className: 'MyContract',
  subDir: 'openwork-full-contract-suite-layerzero+CCTP 2 Dec'
}
```

---

## Step 3: Ensure Contract Source Exists

Check that the contract .sol file exists:

```bash
# Check src/ directory
ls contracts/src/

# Check subdirectories
ls "contracts/openwork-full-contract-suite-layerzero+CCTP 2 Dec/"
```

If not in src/, you may need to copy it:
```bash
cp "contracts/openwork-full-contract-suite-layerzero+CCTP 2 Dec/nowjc.sol" contracts/src/NOWJC.sol
```

---

## Step 4: Test Compilation

Test the compiler mapping:

```bash
cd backend
node -e "const {compileContract} = require('./utils/compiler'); compileContract('NOWJC').then(r => console.log('✅ Works!')).catch(e => console.error('❌', e.message));"
```

---

## Constructor Parameter Types Reference

Common parameter types used:

- `address` - Ethereum address (0x...)
- `uint256` - Unsigned integer
- `string` - Text string
- `bool` - true/false
- `bytes32` - 32-byte data
- `address[]` - Array of addresses

**Special Defaults:**
- `default: 'WALLET'` - Auto-fills with connected wallet
- `default: null` - User must provide

---

## Network Chain IDs Reference

```javascript
84532  // Base Sepolia
421614 // Arbitrum Sepolia  
11155420 // OP Sepolia
11155111 // Ethereum Sepolia
8453   // Base Mainnet
42161  // Arbitrum One
10     // Optimism
1      // Ethereum Mainnet
```

---

## Checklist for Adding New Contract Deployment

- [ ] 1. Add `deployConfig` to contract data file
- [ ] 2. Specify `type: 'uups'` or `type: 'standard'`
- [ ] 3. List constructor parameters (with types, descriptions)
- [ ] 4. Set network info (testnet/mainnet)
- [ ] 5. Add compiler mapping in `backend/utils/compiler.js`
- [ ] 6. Ensure .sol file exists in contracts/src/
- [ ] 7. Test compilation with backend script
- [ ] 8. Test deployment in UI
- [ ] 9. Verify deployment saves to history
- [ ] 10. Admin can set as current

---

## Troubleshooting

**"Artifact not found" error:**
- Check filename in compiler mapping matches exactly
- Ensure contract is in correct directory
- Run `forge build` to generate artifacts

**"Missing required parameters" error:**
- For UUPS: Ensure `type: 'uups'` is set
- For standard: Fill in all constructor params
- Check parameter names match exactly

**"Internal JSON-RPC error" when deploying:**
- Check you're on the correct network
- Ensure sufficient gas balance
- Verify bytecode is valid (not abstract contract)

---

## Example: Adding NOWJC Deployment

**File:** `src/pages/Documentation/data/contracts/nowjc.js`

```javascript
export const nowjc = {
  id: 'nowjc',
  name: 'NOWJC',
  // ... existing fields ...
  
  deployConfig: {
    type: 'uups',
    constructor: [
      { 
        name: 'initialOwner',
        type: 'address',
        default: 'WALLET',
        description: 'Initial contract owner',
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
    estimatedGas: '4.5M',
    postDeploy: {
      message: 'NOWJC deployed! Initialize the proxy on block scanner.',
      nextSteps: [
        'Deploy implementation',
        'Deploy proxy',
        'Call initialize() with parameters',
        'Verify contracts'
      ]
    }
  }
};
```

**Compiler Mapping:** `backend/utils/compiler.js`

```javascript
'NOWJC': {
  fileName: 'NOWJC.sol',
  className: 'NOWJC',
  subDir: null
}
```

---

## Summary

With these three components in place, any contract will have:
- Deploy button in UI
- Current address display
- Deployment history
- Admin version management

The system is designed to be extensible - just follow this guide for each new contract!
