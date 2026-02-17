# OpenWork Web3 Patterns Reference

## Chain Configuration

### Supported Chains
```javascript
const CHAINS = {
  BASE_SEPOLIA: {
    chainId: 84532,
    chainIdHex: '0x14a34',
    name: 'Base Sepolia',
    role: 'Main Chain',
    eid: 40245,
    rpc: 'https://sepolia.base.org',
    explorer: 'https://sepolia.basescan.org'
  },
  ARBITRUM_SEPOLIA: {
    chainId: 421614,
    chainIdHex: '0x66eee',
    name: 'Arbitrum Sepolia',
    role: 'Native Chain',
    eid: 40231,
    cctpDomain: 3,
    rpc: 'https://sepolia-rollup.arbitrum.io/rpc',
    explorer: 'https://sepolia.arbiscan.io'
  },
  OP_SEPOLIA: {
    chainId: 11155420,
    chainIdHex: '0xaa37dc',
    name: 'OP Sepolia',
    role: 'Local Chain',
    eid: 40232,
    cctpDomain: 2,
    rpc: 'https://sepolia.optimism.io',
    explorer: 'https://sepolia-optimism.etherscan.io'
  },
  ETHEREUM_SEPOLIA: {
    chainId: 11155111,
    chainIdHex: '0xaa36a7',
    name: 'Ethereum Sepolia',
    role: 'Local Chain',
    eid: 40161,
    cctpDomain: 0,
    rpc: 'https://sepolia.infura.io/v3/YOUR_KEY',
    explorer: 'https://sepolia.etherscan.io'
  }
};
```

## Contract Roles by Chain

### Main Chain (Base Sepolia)
- **OpenWork Token (OW)** - Governance token
- **Main DAO** - Primary governance
- **Main Rewards** - Token distribution
- **Main Chain Bridge** - LayerZero hub

### Native Chain (Arbitrum Sepolia)
- **Genesis** - Core data storage
- **Native DAO** - Local governance
- **NOWJC** - Native OpenWork Job Contract
- **ProfileManager** - User profiles (UUPS upgradeable)
- **Native Athena** - Dispute resolution
- **Native Rewards** - Rewards calculation
- **CCTP Transceiver** - USDC transfers
- **Native Bridge** - LayerZero messaging

### Local Chains (OP Sepolia, Ethereum Sepolia)
- **LOWJC** - Local OpenWork Job Contract
- **Athena Client** - Local dispute interface
- **CCTP Transceiver** - USDC handling
- **Local Bridge** - LayerZero messaging

## Common Web3 Operations

### Initialize Web3
```javascript
import Web3 from 'web3';

const initWeb3 = async () => {
  if (typeof window.ethereum !== 'undefined') {
    const web3 = new Web3(window.ethereum);
    return web3;
  }
  throw new Error('No Web3 provider found');
};
```

### Connect Wallet
```javascript
const connectWallet = async () => {
  try {
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts'
    });
    return accounts[0];
  } catch (error) {
    console.error('User rejected connection:', error);
    throw error;
  }
};
```

### Get Current Chain
```javascript
const getCurrentChain = async () => {
  const chainId = await window.ethereum.request({
    method: 'eth_chainId'
  });
  return parseInt(chainId, 16);
};
```

### Switch Chain
```javascript
const switchChain = async (chainIdHex) => {
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: chainIdHex }]
    });
  } catch (error) {
    // Chain not added, try adding it
    if (error.code === 4902) {
      await addChain(chainIdHex);
    } else {
      throw error;
    }
  }
};
```

### Add Chain
```javascript
const addChain = async (chain) => {
  await window.ethereum.request({
    method: 'wallet_addEthereumChain',
    params: [{
      chainId: chain.chainIdHex,
      chainName: chain.name,
      rpcUrls: [chain.rpc],
      blockExplorerUrls: [chain.explorer],
      nativeCurrency: {
        name: 'ETH',
        symbol: 'ETH',
        decimals: 18
      }
    }]
  });
};
```

### Listen for Account Changes
```javascript
useEffect(() => {
  if (window.ethereum) {
    window.ethereum.on('accountsChanged', (accounts) => {
      if (accounts.length > 0) {
        setWalletAddress(accounts[0]);
      } else {
        setWalletAddress(null);
      }
    });

    window.ethereum.on('chainChanged', (chainId) => {
      setCurrentChainId(parseInt(chainId, 16));
    });
  }

  return () => {
    if (window.ethereum) {
      window.ethereum.removeAllListeners('accountsChanged');
      window.ethereum.removeAllListeners('chainChanged');
    }
  };
}, []);
```

## Contract Interaction Patterns

### Read Contract Data
```javascript
const readContract = async (contractAddress, abi, methodName, params = []) => {
  const web3 = new Web3(window.ethereum);
  const contract = new web3.eth.Contract(abi, contractAddress);

  try {
    const result = await contract.methods[methodName](...params).call();
    return result;
  } catch (error) {
    console.error(`Error reading ${methodName}:`, error);
    throw error;
  }
};
```

### Write to Contract
```javascript
const writeContract = async (contractAddress, abi, methodName, params, from) => {
  const web3 = new Web3(window.ethereum);
  const contract = new web3.eth.Contract(abi, contractAddress);

  try {
    const tx = await contract.methods[methodName](...params).send({
      from: from
    });
    return tx;
  } catch (error) {
    console.error(`Error writing ${methodName}:`, error);
    throw error;
  }
};
```

### Estimate Gas
```javascript
const estimateGas = async (contractAddress, abi, methodName, params, from) => {
  const web3 = new Web3(window.ethereum);
  const contract = new web3.eth.Contract(abi, contractAddress);

  const gas = await contract.methods[methodName](...params).estimateGas({
    from: from
  });

  return gas;
};
```

## Job Flow Patterns

### Post Job (Local Chain → Native Chain)
```javascript
const postJob = async (jobData) => {
  // 1. Ensure on Local Chain (OP or ETH Sepolia)
  await switchChain(CHAINS.OP_SEPOLIA.chainIdHex);

  // 2. Call LOWJC.postJob()
  const tx = await writeContract(
    LOWJC_ADDRESS,
    LOWJC_ABI,
    'postJob',
    [jobData.title, jobData.description, jobData.budget],
    walletAddress
  );

  // 3. Job routes to NOWJC on Native Chain via LayerZero
  return tx;
};
```

### Apply for Job
```javascript
const applyForJob = async (jobId, proposal) => {
  const tx = await writeContract(
    LOWJC_ADDRESS,
    LOWJC_ABI,
    'applyForJob',
    [jobId, proposal],
    walletAddress
  );
  return tx;
};
```

## USDC Payment Patterns (via CCTP)

### Approve USDC
```javascript
const approveUSDC = async (spender, amount) => {
  const tx = await writeContract(
    USDC_ADDRESS,
    ERC20_ABI,
    'approve',
    [spender, amount],
    walletAddress
  );
  return tx;
};
```

### Cross-Chain Payment
```javascript
const sendCrossChainPayment = async (recipient, amount, destinationChain) => {
  // 1. Approve USDC for CCTP Transceiver
  await approveUSDC(CCTP_TRANSCEIVER_ADDRESS, amount);

  // 2. Initiate cross-chain transfer
  const tx = await writeContract(
    CCTP_TRANSCEIVER_ADDRESS,
    CCTP_ABI,
    'transferUSDC',
    [recipient, amount, destinationChain.cctpDomain],
    walletAddress
  );

  return tx;
};
```

## Profile Management

### Create Profile
```javascript
const createProfile = async (profileData) => {
  // Must be on Native Chain (Arbitrum Sepolia)
  await switchChain(CHAINS.ARBITRUM_SEPOLIA.chainIdHex);

  const tx = await writeContract(
    PROFILE_MANAGER_ADDRESS,
    PROFILE_MANAGER_ABI,
    'createProfile',
    [profileData.name, profileData.bio, profileData.skills],
    walletAddress
  );

  return tx;
};
```

### Get Profile
```javascript
const getProfile = async (address) => {
  const profile = await readContract(
    PROFILE_MANAGER_ADDRESS,
    PROFILE_MANAGER_ABI,
    'getProfile',
    [address]
  );
  return profile;
};
```

## Dispute Resolution

### Raise Dispute
```javascript
const raiseDispute = async (jobId, reason, evidence) => {
  // Can be called from any Local Chain
  const tx = await writeContract(
    ATHENA_CLIENT_ADDRESS,
    ATHENA_CLIENT_ABI,
    'raiseDispute',
    [jobId, reason, evidence],
    walletAddress
  );

  // Routes to Native Athena on Arbitrum Sepolia
  return tx;
};
```

## Wallet Address Formatting
```javascript
// Format wallet address for display (0x1234...5678)
const formatWalletAddress = (address) => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};
```

## Error Handling
```javascript
const handleWeb3Error = (error) => {
  if (error.code === 4001) {
    return 'Transaction rejected by user';
  }
  if (error.code === -32603) {
    return 'Internal JSON-RPC error';
  }
  if (error.message.includes('insufficient funds')) {
    return 'Insufficient funds for transaction';
  }
  return error.message || 'Unknown error occurred';
};
```

## Transaction Status Tracking
```javascript
const waitForTransaction = async (txHash) => {
  const web3 = new Web3(window.ethereum);

  return new Promise((resolve, reject) => {
    const checkReceipt = async () => {
      try {
        const receipt = await web3.eth.getTransactionReceipt(txHash);
        if (receipt) {
          if (receipt.status) {
            resolve(receipt);
          } else {
            reject(new Error('Transaction failed'));
          }
        } else {
          setTimeout(checkReceipt, 2000);
        }
      } catch (error) {
        reject(error);
      }
    };
    checkReceipt();
  });
};
```
