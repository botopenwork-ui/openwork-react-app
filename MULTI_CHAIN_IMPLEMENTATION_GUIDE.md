# Multi-Chain Implementation Guide

**Created**: December 16, 2025  
**Feature Branch**: `feature/multi-chain-support`  
**Status**: ✅ Core Infrastructure Complete  

---

## 🎯 What's Been Implemented

### **✅ Core Infrastructure (Ready to Use)**

1. **Chain Configuration System** (`src/config/chainConfig.js`)
   - Centralized config for all chains (OP Sepolia, ETH Sepolia, Arbitrum, Base)
   - Easy to add new chains - just add to config object
   - Helper functions for chain validation

2. **Chain Detection Hooks** (`src/hooks/useChainDetection.js`)
   - `useChainDetection()` - Detects user's connected chain
   - `useWalletAddress()` - Gets user's wallet address
   - Auto-updates on network/account changes

3. **Local Chain Service** (`src/services/localChainService.js`)
   - Write operations for all LOWJC functions
   - Write operations for Athena Client (disputes)
   - Auto-routes to correct contract based on chain ID
   - Functions: `postJob`, `applyToJob`, `startJob`, `raiseDispute`, etc.

4. **Network Switching** (`src/utils/switchNetwork.js`)
   - Helpers to switch wallet networks
   - Auto-add networks to wallet if missing
   - User-friendly prompts

---

## 🚀 How to Use in Your Components

### **Example 1: PostJob Page**

```jsx
import { useChainDetection, useWalletAddress } from '../../hooks/useChainDetection';
import { postJob } from '../../services/localChainService';
import { getLocalChains } from '../../config/chainConfig';

function PostJob() {
  const { chainId, chainConfig, isAllowed, error } = useChainDetection();
  const { address, isConnected } = useWalletAddress();
  
  // Show error if on blocked chain
  if (chainId && !isAllowed) {
    return (
      <div className="chain-error">
        <h3>⚠️ Cannot Post Jobs on {chainConfig?.name}</h3>
        <p>{error}</p>
        <p>Supported chains:</p>
        <ul>
          {getLocalChains().map(chain => (
            <li key={chain.chainId}>{chain.name}</li>
          ))}
        </ul>
      </div>
    );
  }
  
  // Show current chain indicator
  if (isAllowed && chainConfig) {
    console.log(`✅ Ready to post on: ${chainConfig.name}`);
  }
  
  async function handleSubmit(formData) {
    try {
      // Prepare job data
      const jobData = {
        jobDetailHash: formData.ipfsHash,
        descriptions: formData.milestoneDescriptions,
        amounts: formData.milestoneAmounts // USDC units
      };
      
      // Post to user's current chain
      const tx = await postJob(chainId, address, jobData);
      
      alert(`Job posted successfully on ${chainConfig.name}!\nTransaction: ${tx.transactionHash}\n\nYour job will appear on Arbitrum Genesis in ~30-60 seconds.`);
      
    } catch (err) {
      console.error("Post job failed:", err);
      alert(`Failed to post job: ${err.message}`);
    }
  }
  
  return (
    <div>
      <div className="chain-indicator">
        📡 Posting on: <strong>{chainConfig?.name}</strong>
      </div>
      {/* Your existing form */}
      <button onClick={handleSubmit}>Post Job</button>
    </div>
  );
}
```

### **Example 2: Apply to Job**

```jsx
import { useChainDetection, useWalletAddress } from '../../hooks/useChainDetection';
import { applyToJob } from '../../services/localChainService';

function ApplyJob({ jobId }) {
  const { chainId, chainConfig, isAllowed } = useChainDetection();
  const { address } = useWalletAddress();
  
  if (!isAllowed) {
    return <div>Please switch to OP Sepolia or Ethereum Sepolia</div>;
  }
  
  async function handleApply(applicationData) {
    const appData = {
      jobId,
      applicationHash: applicationData.ipfsHash,
      descriptions: applicationData.milestoneDescriptions,
      amounts: applicationData.proposedAmounts,
      preferredChainDomain: 3 // Arbitrum
    };
    
    const tx = await applyToJob(chainId, address, appData);
    console.log("Applied!", tx.transactionHash);
  }
  
  return <div>{/* form */}</div>;
}
```

### **Example 3: Raise Dispute**

```jsx
import { useChainDetection } from '../../hooks/useChainDetection';
import { raiseDispute, approveUSDC } from '../../services/localChainService';
import { getContractAddress } from '../../services/localChainService';

function RaiseDispute({ jobId }) {
  const { chainId, isAllowed } = useChainDetection();
  const { address } = useWalletAddress();
  
  async function handleRaiseDispute(disputeData) {
    try {
      // Step 1: Approve USDC for Athena Client
      const athenaClientAddress = getContractAddress(chainId, 'athenaClient');
      await approveUSDC(chainId, address, athenaClientAddress, disputeData.feeAmount);
      
      // Step 2: Raise dispute
      const data = {
        jobId,
        disputeHash: disputeData.ipfsHash,
        oracleName: disputeData.selectedOracle,
        feeAmount: disputeData.feeAmount,
        disputedAmount: disputeData.disputedAmount
      };
      
      const tx = await raiseDispute(chainId, address, data);
      alert("Dispute raised! Will sync to Arbitrum in ~30 seconds.");
      
    } catch (err) {
      alert(`Failed: ${err.message}`);
    }
  }
  
  return <div>{/* form */}</div>;
}
```

---

## 📋 Architecture Summary

### **Data Flow:**

```
User on OP Sepolia:
  1. Calls postJob() in UI
  2. localChainService routes to OP LOWJC (0x896a...)
  3. OP LOWJC sends LayerZero message to Arbitrum
  4. Arbitrum NOWJC receives and stores in Genesis
  5. All users see job (via jobService reading from Arbitrum)

User on Ethereum Sepolia:
  1. Same UI, calls postJob()
  2. localChainService routes to ETH LOWJC (0x3b4c...)
  3. ETH LOWJC sends LayerZero message to Arbitrum
  4. Same result - job visible to everyone
```

### **Key Principle:**
- **WRITE**: User's chain → Local LOWJC/Athena Client
- **READ**: Always Arbitrum Genesis (jobService unchanged)
- **SYNC**: Automatic via LayerZero

---

## 🔧 Adding a New Chain (e.g., Polygon)

### **Step 1: Deploy Contracts**
Deploy LOWJC, Athena Client, and Local Bridge on Polygon mainnet.

### **Step 2: Add to Config**
Edit `src/config/chainConfig.js`:

```javascript
export const CHAIN_CONFIG = {
  // ... existing chains ...
  
  // Polygon Mainnet - NEW
  137: {
    name: "Polygon",
    type: CHAIN_TYPES.LOCAL,
    allowed: true,
    isTestnet: false,
    nativeCurrency: {
      name: "MATIC",
      symbol: "MATIC",
      decimals: 18
    },
    rpcUrl: import.meta.env.VITE_POLYGON_RPC_URL,
    blockExplorer: "https://polygonscan.com",
    contracts: {
      lowjc: "0x...", // Your deployed LOWJC
      athenaClient: "0x...", // Your deployed Athena Client
      localBridge: "0x...",
      usdc: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174" // Polygon USDC
    },
    layerzero: {
      eid: 30109, // Polygon LZ EID
      options: "0x0003010011010000000000000000000000000007a120"
    }
  }
};
```

### **Step 3: Done!**
No code changes needed. App automatically supports Polygon:
- Users on Polygon can post jobs
- Jobs sync to Arbitrum
- Everyone sees Polygon jobs in the unified view

---

## ⚠️ Important Notes

### **Blocked Chains**
- **Arbitrum Sepolia (421614)**: Native chain - read only
- **Base Sepolia (84532)**: Main chain - governance only

These show friendly error messages when users try to post jobs.

### **Read vs Write**
- **Read operations** (browsing jobs): Keep using `jobService.js` → Arbitrum Genesis ✅
- **Write operations** (posting jobs): Use new `localChainService.js` → User's chain

### **LayerZero Fees**
- Each cross-chain transaction needs ~0.001 ETH for LayerZero
- Fee is automatically included in transaction
- Configurable per chain in `chainConfig.js`

---

## 🧪 Testing Checklist

- [ ] Connect wallet to OP Sepolia
- [ ] Post job → verify goes to OP LOWJC
- [ ] Wait 30-60s → verify job appears in Arbitrum Genesis
- [ ] Switch wallet to Ethereum Sepolia
- [ ] Post another job → verify goes to ETH LOWJC
- [ ] Verify both jobs visible in job listing
- [ ] Try on Arbitrum → verify blocked with error
- [ ] Try on Base → verify blocked with error

---

## 📁 Files Created

```
src/
├── config/
│   └── chainConfig.js                 ← Chain definitions & addresses
├── hooks/
│   └── useChainDetection.js           ← Chain detection hook
├── services/
│   ├── jobService.js                  ← [UNCHANGED] Read from Arbitrum
│   └── localChainService.js           ← [NEW] Write to local chains
└── utils/
    └── switchNetwork.js               ← Network switching helpers
```

---

## 🎯 Next Steps (UI Integration)

To complete the multi-chain feature, you need to update these pages:

### **Priority 1 (Essential):**
1. **PostJob** - Add chain detection and use `localChainService.postJob()`
2. **ApplyJob** - Use `localChainService.applyToJob()`
3. **RaiseDispute** - Use `localChainService.raiseDispute()`

### **Priority 2 (Important):**
4. **StartJob** - Use `localChainService.startJob()` with USDC approval
5. **SubmitWork** - Use `localChainService.submitWork()`
6. **ReleasePayment** - Use `localChainService.releasePaymentCrossChain()`

### **Priority 3 (Nice to have):**
7. **Header** - Add network indicator badge
8. **Profile Creation** - Use `localChainService.createProfile()`
9. **Add Portfolio** - Use `localChainService.addPortfolio()`

---

## 💡 Quick Integration Pattern

For any page that submits transactions:

```jsx
// 1. Import hooks
import { useChainDetection, useWalletAddress } from '../../hooks/useChainDetection';
import { postJob } from '../../services/localChainService'; // or other function

// 2. Use hooks
const { chainId, isAllowed, error } = useChainDetection();
const { address } = useWalletAddress();

// 3. Check if allowed
if (!isAllowed) {
  return <div>⚠️ {error}</div>;
}

// 4. Call service function
await postJob(chainId, address, jobData);
```

---

## ✅ What's Working Now

- ✅ **Chain detection** - Automatically detects user's network
- ✅ **Chain validation** - Blocks Arbitrum/Base, allows OP/ETH
- ✅ **Contract routing** - Correct LOWJC/Athena Client per chain
- ✅ **Network switching** - Helpers to switch networks
- ✅ **Extensible** - Add new chains by editing config file only

## ⏳ What Needs UI Integration

- ⏳ Update PostJob page to use chain detection & localChainService
- ⏳ Update ApplyJob page
- ⏳ Update RaiseDispute page
- ⏳ Update other transaction pages
- ⏳ Add network indicator to header (optional but recommended)

---

## 🎉 Benefits

### **For Users:**
- Choose preferred network (OP vs ETH vs future chains)
- Lower gas fees on cheaper networks
- Same unified job view regardless of origin

### **For Developers:**
- Add new chains without code changes
- Centralized config management
- Type-safe chain operations
- Automatic sync to Arbitrum

### **For Platform:**
- Multi-chain scalability
- User preference flexibility
- Future-proof architecture

---

## 📞 Need Help?

**Testing**: Start with PostJob page - it's the simplest integration.

**Debugging**: Check browser console for chain detection logs.

**Questions**: All chain configs in `chainConfig.js`, all write operations in `localChainService.js`.

---

**Branch**: `feature/multi-chain-support`  
**Status**: Infrastructure ready, awaiting UI integration  
**Next**: Integrate into PostJob page as proof of concept
