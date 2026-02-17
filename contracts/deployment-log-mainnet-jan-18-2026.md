# Deployment Log - Arbitrum Mainnet - January 18, 2026

## Overview

**Purpose:** Deploy mainnet-ready contracts with January 2026 security fixes:
- Voting power centralization (all voting power via RewardsContract, includes team tokens)
- Self-employment prevention (job giver cannot be applicant)
- Non-upgradeable Rewards Contracts

**Source Folder:** `src/suites/mainnet-ready/`

**Deployer:** `0x7a2B7feAB9b0e30A5368d3CC4CB8279c9606384C`

**Network:** Arbitrum One (Mainnet)
- Chain ID: 42161
- LayerZero EID: 30110

---

## 1. NativeOpenWorkJobContract (NOWJC) Implementation (Arbitrum Mainnet)

**Command:**
```bash
source .env && forge create --broadcast \
  --rpc-url $ARBITRUM_MAINNET_RPC_URL \
  --private-key $PROD_DEPLOYER_KEY \
  "src/suites/mainnet-ready/native/native-openwork-job-contract.sol:NativeOpenWorkJobContract"
```

**Output:**
```
Deployer: 0x7a2B7feAB9b0e30A5368d3CC4CB8279c9606384C
Deployed to: 0x74566644782e98c87a12E8Fc6f7c4c72e2908a36
Transaction hash: 0xc741bad71de22798305f38d3f39240ec8d4c74eb1b5b4d67e1fac25a4e9f62fa
```

**Arbiscan:** https://arbiscan.io/address/0x74566644782e98c87a12E8Fc6f7c4c72e2908a36

**Key Features in this version:**
- Self-employment check: `require(_applicant != job.jobGiver, "Self")`
- Refactored modular code structure
- Voting power functions removed (centralized in RewardsContract)

---

## 2. NativeAthena Implementation (Arbitrum Mainnet)

**Command:**
```bash
source .env && forge create --broadcast \
  --rpc-url $ARBITRUM_MAINNET_RPC_URL \
  --private-key $PROD_DEPLOYER_KEY \
  "src/suites/mainnet-ready/native/native-athena.sol:NativeAthena"
```

**Output:**
```
Deployer: 0x7a2B7feAB9b0e30A5368d3CC4CB8279c9606384C
Deployed to: 0x00c70838cA0de7F1Eb192Bd7a11A7F2e14407510
Transaction hash: 0x71e9e00e28f184d1889afd3ba49813427a6aa0af768aa364a70bba71ff2840b0
```

**Arbiscan:** https://arbiscan.io/address/0x00c70838cA0de7F1Eb192Bd7a11A7F2e14407510

**Key Features:**
- Centralized voting power via `rewardsContract.getRewardBasedVotingPower()`
- Dispute resolution with oracle voting
- Cross-chain dispute handling

---

## 3. NativeOpenworkDAO Implementation (Arbitrum Mainnet)

**Command:**
```bash
source .env && forge create --broadcast \
  --rpc-url $ARBITRUM_MAINNET_RPC_URL \
  --private-key $PROD_DEPLOYER_KEY \
  "src/suites/mainnet-ready/native/native-openwork-dao.sol:NativeOpenworkDAO"
```

**Output:**
```
Deployer: 0x7a2B7feAB9b0e30A5368d3CC4CB8279c9606384C
Deployed to: 0x20Fa268106A3C532cF9F733005Ab48624105c42F
Transaction hash: 0x51de1b9c0390e6689612feb6129e04b1c59f280c71e00be4b64b2e82295cfce7
```

**Arbiscan:** https://arbiscan.io/address/0x20Fa268106A3C532cF9F733005Ab48624105c42F

**Key Features:**
- Governance proposals and voting
- Centralized voting power via `rewardsContract.getRewardBasedVotingPower()`
- Cross-chain stake data handling

---

## 4. NativeLZOpenworkBridge (Arbitrum Mainnet) - Non-Upgradeable

**Command:**
```bash
source .env && forge create --broadcast \
  --rpc-url $ARBITRUM_MAINNET_RPC_URL \
  --private-key $PROD_DEPLOYER_KEY \
  "src/suites/mainnet-ready/native/native-lz-openwork-bridge.sol:NativeLZOpenworkBridge" \
  --constructor-args 0x1a44076050125825900e736c501f859c50fE728c 0x7a2B7feAB9b0e30A5368d3CC4CB8279c9606384C 30110
```

**Constructor Args:**
- `_endpoint`: `0x1a44076050125825900e736c501f859c50fE728c` (LayerZero V2 Endpoint - Arbitrum One)
- `_owner`: `0x7a2B7feAB9b0e30A5368d3CC4CB8279c9606384C`
- `_mainChainEid`: `30110` (Arbitrum One EID)

**Output:**
```
Deployer: 0x7a2B7feAB9b0e30A5368d3CC4CB8279c9606384C
Deployed to: 0xF78B688846673C3f6b93184BeC230d982c0db0c9
Transaction hash: 0xe5576bbf39a7e3ae0273c161c6d66ecf27ddcb89d5b5b74c57c0fe76470019b4
```

**Arbiscan:** https://arbiscan.io/address/0xF78B688846673C3f6b93184BeC230d982c0db0c9

**Key Features:**
- LayerZero V2 OApp for cross-chain messaging
- Modular message handlers (refactored version)
- Peer management for multi-chain communication

---

## 5. NativeRewardsContract (Non-Upgradeable) (Arbitrum Mainnet)

**Note:** This is a NON-UPGRADEABLE contract. It uses `Ownable` + constructor pattern, not UUPS proxy.

**Command:**
```bash
source .env && forge create --broadcast \
  --rpc-url $ARBITRUM_MAINNET_RPC_URL \
  --private-key $PROD_DEPLOYER_KEY \
  "src/suites/mainnet-ready/native/native-rewards-contract.sol:NativeRewardsContract" \
  --constructor-args 0x7a2B7feAB9b0e30A5368d3CC4CB8279c9606384C 0x0000000000000000000000000000000000000000 0x0000000000000000000000000000000000000000
```

**Constructor Args:**
- `_owner`: `0x7a2B7feAB9b0e30A5368d3CC4CB8279c9606384C`
- `_jobContract`: `0x0` (will configure via `setJobContract()`)
- `_genesis`: `0x0` (will configure via `setGenesis()`)

**Output:**
```
Deployer: 0x7a2B7feAB9b0e30A5368d3CC4CB8279c9606384C
Deployed to: 0x5cF21bFb944B6851048F9ac18a8C84F6323a8ce7
Transaction hash: 0x5a1982ecf56b6d26619e38b055950468ab5e5477995b1856c12b6073ae87dd64
```

**Arbiscan:** https://arbiscan.io/address/0x5cF21bFb944B6851048F9ac18a8C84F6323a8ce7

**Key Features:**
- Non-upgradeable for security
- `getRewardBasedVotingPower()` - centralized voting power calculation
- Team token allocation and voting power
- Configurable via setter functions
- `syncVotingPower()` - includes team tokens in voting power
- Team token multiplier support

---

---

## 6. NativeOpenworkGenesis Implementation (Arbitrum Mainnet)

**Command:**
```bash
source .env && forge create --broadcast \
  --rpc-url $ARBITRUM_MAINNET_RPC_URL \
  --private-key $PROD_DEPLOYER_KEY \
  "src/suites/mainnet-ready/native/native-openwork-genesis.sol:NativeOpenworkGenesis"
```

**Output:**
```
Deployer: 0x7a2B7feAB9b0e30A5368d3CC4CB8279c9606384C
Deployed to: 0x4756294bE516f73e8D1984E7a94E4ABaffA94c4d
Transaction hash: 0x6f7bcca3ed417410577ddea8a5be6cf5d764ae4d60d729df6a23bfccfdf76304
```

**Arbiscan:** https://arbiscan.io/address/0x4756294bE516f73e8D1984E7a94E4ABaffA94c4d

---

## 7. UUPSProxy for NativeOpenworkGenesis (Arbitrum Mainnet)

**Command:**
```bash
source .env && forge create --broadcast \
  --rpc-url $ARBITRUM_MAINNET_RPC_URL \
  --private-key $PROD_DEPLOYER_KEY \
  "src/suites/mainnet-ready/utilities/proxy.sol:UUPSProxy" \
  --constructor-args 0x4756294bE516f73e8D1984E7a94E4ABaffA94c4d $(cast calldata "initialize(address)" 0x7a2B7feAB9b0e30A5368d3CC4CB8279c9606384C)
```

**Constructor Args:**
- Implementation: `0x4756294bE516f73e8D1984E7a94E4ABaffA94c4d` (Genesis Impl)
- Init data: `initialize(0x7a2B7feAB9b0e30A5368d3CC4CB8279c9606384C)`

**Output:**
```
Deployer: 0x7a2B7feAB9b0e30A5368d3CC4CB8279c9606384C
Deployed to: 0xE8f7963fF3cE9f7dB129e3f619abd71cBB5Bb294
Transaction hash: 0xfe49b8cb11a8755403b6b2f26191c496fb0970d8199d2dedb35f9771f1e08002
```

**Arbiscan:** https://arbiscan.io/address/0xE8f7963fF3cE9f7dB129e3f619abd71cBB5Bb294

---

## 8. CCTPTransceiver (Non-Upgradeable) (Arbitrum Mainnet)

**Note:** This is a NON-UPGRADEABLE contract for USDC cross-chain transfers via Circle CCTP V2.

**Constructor Arg Sources (Verified Jan 18, 2026):**
- USDC Address: https://developers.circle.com/stablecoins/usdc-contract-addresses
- CCTP V2 Contracts: https://developers.circle.com/cctp/references/contract-addresses

**Command:**
```bash
source .env && forge create --broadcast \
  --rpc-url $ARBITRUM_MAINNET_RPC_URL \
  --private-key $PROD_DEPLOYER_KEY \
  "src/suites/mainnet-ready/utilities/cctp-transceiver.sol:CCTPTransceiver" \
  --constructor-args 0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d 0x81D40F21F12A8F0E3252Bccb954D722d4c464B64 0xaf88d065e77c8cC2239327C5EDb3A432268e5831
```

**Constructor Args:**
- `_tokenMessenger`: `0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d` (Circle CCTP V2 TokenMessengerV2 - Domain 3)
- `_messageTransmitter`: `0x81D40F21F12A8F0E3252Bccb954D722d4c464B64` (Circle CCTP V2 MessageTransmitterV2 - Domain 3)
- `_usdc`: `0xaf88d065e77c8cC2239327C5EDb3A432268e5831` (Circle USDC on Arbitrum)

**Output:**
```
Deployer: 0x7a2B7feAB9b0e30A5368d3CC4CB8279c9606384C
Deployed to: 0x765D70496Ef775F6ba1cB7465c2e0B296eB50d87
Transaction hash: 0x18243336929ca7016a1a9baa8775bfbaf88e85f1ec3b811adb2e71652e6a7541
```

**Arbiscan:** https://arbiscan.io/address/0x765D70496Ef775F6ba1cB7465c2e0B296eB50d87

**Key Features:**
- USDC cross-chain transfers via Circle CCTP V2
- Domain-based routing (Arbitrum = Domain 3)
- Non-upgradeable for security

---

## 9. UUPSProxy for NativeOpenWorkJobContract (NOWJC) (Arbitrum Mainnet)

**Command:**
```bash
source .env && forge create --broadcast \
  --rpc-url $ARBITRUM_MAINNET_RPC_URL \
  --private-key $PROD_DEPLOYER_KEY \
  "src/suites/mainnet-ready/utilities/proxy.sol:UUPSProxy" \
  --constructor-args 0x74566644782e98c87a12E8Fc6f7c4c72e2908a36 $(cast calldata "initialize(address,address,address,address,address,address)" 0x7a2B7feAB9b0e30A5368d3CC4CB8279c9606384C 0xE8f7963fF3cE9f7dB129e3f619abd71cBB5Bb294 0x5cF21bFb944B6851048F9ac18a8C84F6323a8ce7 0xF78B688846673C3f6b93184BeC230d982c0db0c9 0x765D70496Ef775F6ba1cB7465c2e0B296eB50d87 0xaf88d065e77c8cC2239327C5EDb3A432268e5831)
```

**Constructor Args:**
- Implementation: `0x74566644782e98c87a12E8Fc6f7c4c72e2908a36` (NOWJC Impl)
- Init data: `initialize(owner, genesis, rewards, bridge, cctp, usdc)`
  - `_owner`: `0x7a2B7feAB9b0e30A5368d3CC4CB8279c9606384C`
  - `_genesis`: `0xE8f7963fF3cE9f7dB129e3f619abd71cBB5Bb294`
  - `_rewardsContract`: `0x5cF21bFb944B6851048F9ac18a8C84F6323a8ce7`
  - `_bridge`: `0xF78B688846673C3f6b93184BeC230d982c0db0c9`
  - `_cctpTransceiver`: `0x765D70496Ef775F6ba1cB7465c2e0B296eB50d87`
  - `_usdc`: `0xaf88d065e77c8cC2239327C5EDb3A432268e5831`

**Output:**
```
Deployer: 0x7a2B7feAB9b0e30A5368d3CC4CB8279c9606384C
Deployed to: 0x8EfbF240240613803B9c9e716d4b5AD1388aFd99
Transaction hash: 0xceb77d9ec74dc9a45b36fe73bcefc7a3deef6e65fd65977a603df480fb6efe11
```

**Arbiscan:** https://arbiscan.io/address/0x8EfbF240240613803B9c9e716d4b5AD1388aFd99

---

## 10. UUPSProxy for NativeOpenworkDAO (Arbitrum Mainnet)

**Command:**
```bash
source .env && forge create --broadcast \
  --rpc-url $ARBITRUM_MAINNET_RPC_URL \
  --private-key $PROD_DEPLOYER_KEY \
  "src/suites/mainnet-ready/utilities/proxy.sol:UUPSProxy" \
  --constructor-args 0x20Fa268106A3C532cF9F733005Ab48624105c42F $(cast calldata "initialize(address,address,address)" 0x7a2B7feAB9b0e30A5368d3CC4CB8279c9606384C 0xF78B688846673C3f6b93184BeC230d982c0db0c9 0xE8f7963fF3cE9f7dB129e3f619abd71cBB5Bb294)
```

**Constructor Args:**
- Implementation: `0x20Fa268106A3C532cF9F733005Ab48624105c42F` (DAO Impl)
- Init data: `initialize(owner, bridge, genesis)`
  - `_owner`: `0x7a2B7feAB9b0e30A5368d3CC4CB8279c9606384C`
  - `_bridge`: `0xF78B688846673C3f6b93184BeC230d982c0db0c9`
  - `_genesis`: `0xE8f7963fF3cE9f7dB129e3f619abd71cBB5Bb294`

**Output:**
```
Deployer: 0x7a2B7feAB9b0e30A5368d3CC4CB8279c9606384C
Deployed to: 0x24af98d763724362DC920507b351cC99170a5aa4
Transaction hash: 0x00dc7f56621d689d55571bdb6018601009093184adb8781b7e89bde53debb5b0
```

**Arbiscan:** https://arbiscan.io/address/0x24af98d763724362DC920507b351cC99170a5aa4

---

## 11. UUPSProxy for NativeAthena (Arbitrum Mainnet)

**Command:**
```bash
source .env && forge create --broadcast \
  --rpc-url $ARBITRUM_MAINNET_RPC_URL \
  --private-key $PROD_DEPLOYER_KEY \
  "src/suites/mainnet-ready/utilities/proxy.sol:UUPSProxy" \
  --constructor-args 0x00c70838cA0de7F1Eb192Bd7a11A7F2e14407510 $(cast calldata "initialize(address,address,address,address,address)" 0x7a2B7feAB9b0e30A5368d3CC4CB8279c9606384C 0x24af98d763724362DC920507b351cC99170a5aa4 0xE8f7963fF3cE9f7dB129e3f619abd71cBB5Bb294 0x8EfbF240240613803B9c9e716d4b5AD1388aFd99 0xaf88d065e77c8cC2239327C5EDb3A432268e5831)
```

**Constructor Args:**
- Implementation: `0x00c70838cA0de7F1Eb192Bd7a11A7F2e14407510` (Athena Impl)
- Init data: `initialize(owner, dao, genesis, nowjc, usdc)`
  - `_owner`: `0x7a2B7feAB9b0e30A5368d3CC4CB8279c9606384C`
  - `_daoContract`: `0x24af98d763724362DC920507b351cC99170a5aa4`
  - `_genesis`: `0xE8f7963fF3cE9f7dB129e3f619abd71cBB5Bb294`
  - `_nowjContract`: `0x8EfbF240240613803B9c9e716d4b5AD1388aFd99`
  - `_usdcToken`: `0xaf88d065e77c8cC2239327C5EDb3A432268e5831`

**Output:**
```
Deployer: 0x7a2B7feAB9b0e30A5368d3CC4CB8279c9606384C
Deployed to: 0xE6B9d996b56162cD7eDec3a83aE72943ee7C46Bf
Transaction hash: 0x910fbcd36437c8fdb52082d819654685ced56f9aa1b02f84c08dcc6db2204a8c
```

**Arbiscan:** https://arbiscan.io/address/0xE6B9d996b56162cD7eDec3a83aE72943ee7C46Bf

---

## Deployment Order & Dependencies

### Phase 1: Deploy Implementations (No dependencies)
1. ✅ NOWJC Implementation
2. ⏳ Athena Implementation
3. ⏳ DAO Implementation
4. ⏳ Bridge Implementation

### Phase 2: Deploy Proxies & Initialize
5. Genesis Proxy (if not existing)
6. NOWJC Proxy → Initialize
7. DAO Proxy → Initialize
8. Athena Proxy → Initialize

### Phase 3: Deploy Non-Upgradeable Contracts
9. NativeRewardsContract (needs proxy addresses)

### Phase 4: Configuration
10. Set authorized contracts on Genesis
11. Set RewardsContract on Athena
12. Set peer connections on Bridge
13. Verify all contracts on Arbiscan

---

## Contract Address Summary

| Contract | Type | Address | Status |
|----------|------|---------|--------|
| NOWJC Implementation | UUPS Impl | `0x74566644782e98c87a12E8Fc6f7c4c72e2908a36` | ✅ Deployed |
| Athena Implementation | UUPS Impl | `0x00c70838cA0de7F1Eb192Bd7a11A7F2e14407510` | ✅ Deployed |
| DAO Implementation | UUPS Impl | `0x20Fa268106A3C532cF9F733005Ab48624105c42F` | ✅ Deployed |
| Bridge | Non-Upgradeable | `0xF78B688846673C3f6b93184BeC230d982c0db0c9` | ✅ Deployed |
| NativeRewardsContract | Non-Upgradeable | `0x5cF21bFb944B6851048F9ac18a8C84F6323a8ce7` | ✅ Deployed |
| Genesis Implementation | UUPS Impl | `0x4756294bE516f73e8D1984E7a94E4ABaffA94c4d` | ✅ Deployed |
| Genesis Proxy | Proxy | `0xE8f7963fF3cE9f7dB129e3f619abd71cBB5Bb294` | ✅ Deployed |
| CCTPTransceiver | Non-Upgradeable | `0x765D70496Ef775F6ba1cB7465c2e0B296eB50d87` | ✅ Deployed |
| NOWJC Proxy | Proxy | `0x8EfbF240240613803B9c9e716d4b5AD1388aFd99` | ✅ Deployed |
| DAO Proxy | Proxy | `0x24af98d763724362DC920507b351cC99170a5aa4` | ✅ Deployed |
| Athena Proxy | Proxy | `0xE6B9d996b56162cD7eDec3a83aE72943ee7C46Bf` | ✅ Deployed |

---

## 12. Configuration Phase (Arbitrum Mainnet)

### 12.1 Genesis: Authorize NOWJC ✅

```bash
source .env && cast send --rpc-url $ARBITRUM_MAINNET_RPC_URL --private-key $PROD_DEPLOYER_KEY \
  0xE8f7963fF3cE9f7dB129e3f619abd71cBB5Bb294 \
  "authorizeContract(address,bool)" \
  0x8EfbF240240613803B9c9e716d4b5AD1388aFd99 true
```

**TX:** `0x70a02a2bbed29a6511ec23bf697d1c769f8d992efe6994b1ab2c2527c7926564`

### 12.2 RewardsContract: Set JobContract and Genesis ✅

```bash
# Set JobContract
source .env && cast send --rpc-url $ARBITRUM_MAINNET_RPC_URL --private-key $PROD_DEPLOYER_KEY \
  0x5cF21bFb944B6851048F9ac18a8C84F6323a8ce7 \
  "setJobContract(address)" \
  0x8EfbF240240613803B9c9e716d4b5AD1388aFd99

# Set Genesis
source .env && cast send --rpc-url $ARBITRUM_MAINNET_RPC_URL --private-key $PROD_DEPLOYER_KEY \
  0x5cF21bFb944B6851048F9ac18a8C84F6323a8ce7 \
  "setGenesis(address)" \
  0xE8f7963fF3cE9f7dB129e3f619abd71cBB5Bb294
```

**TX (setJobContract):** `0x937c2772eaf7cefc1a8a5da55023d146ff779f352e88613fae0d1082f848859f`
**TX (setGenesis):** `0x7e69bdac74bd35671c183355de62c101e19f5d70ab834701f6c2e48a7a109653`

### 12.3 DAO: Set RewardsContract ✅

```bash
source .env && cast send --rpc-url $ARBITRUM_MAINNET_RPC_URL --private-key $PROD_DEPLOYER_KEY \
  0x24af98d763724362DC920507b351cC99170a5aa4 \
  "setRewardsContract(address)" \
  0x5cF21bFb944B6851048F9ac18a8C84F6323a8ce7
```

**TX:** `0xf42bafa8a14e9db984235e96f83485bf68f44ca63bd9591f80e3a2ae0081a72e`

### 12.4 Athena: Set RewardsContract ✅

```bash
source .env && cast send --rpc-url $ARBITRUM_MAINNET_RPC_URL --private-key $PROD_DEPLOYER_KEY \
  0xE6B9d996b56162cD7eDec3a83aE72943ee7C46Bf \
  "setRewardsContract(address)" \
  0x5cF21bFb944B6851048F9ac18a8C84F6323a8ce7
```

**TX:** Completed (see Arbiscan)

### 12.5 NOWJC: Add Admin and Set Athena ✅

```bash
# First add deployer as admin (required for admin-only functions)
source .env && cast send --rpc-url $ARBITRUM_MAINNET_RPC_URL --private-key $PROD_DEPLOYER_KEY \
  0x8EfbF240240613803B9c9e716d4b5AD1388aFd99 \
  "setAdmin(address,bool)" \
  0x7a2B7feAB9b0e30A5368d3CC4CB8279c9606384C true

# Then set Athena
source .env && cast send --rpc-url $ARBITRUM_MAINNET_RPC_URL --private-key $PROD_DEPLOYER_KEY \
  0x8EfbF240240613803B9c9e716d4b5AD1388aFd99 \
  "setNativeAthena(address)" \
  0xE6B9d996b56162cD7eDec3a83aE72943ee7C46Bf
```

**TX (setAdmin):** `0xda366fb54dc752247f311c758de8dfd19c60fee70feea61d9c59677ebc6463ad`
**TX (setNativeAthena):** `0xc1402333b4ee12e2508215c0a5427e12d45bc62b33cc6ae0734993d891a18709`

### 12.6 Bridge: Set Contract References ✅

```bash
# Set DAO
source .env && cast send --rpc-url $ARBITRUM_MAINNET_RPC_URL --private-key $PROD_DEPLOYER_KEY \
  0xF78B688846673C3f6b93184BeC230d982c0db0c9 \
  "setNativeDaoContract(address)" \
  0x24af98d763724362DC920507b351cC99170a5aa4

# Set Athena
source .env && cast send --rpc-url $ARBITRUM_MAINNET_RPC_URL --private-key $PROD_DEPLOYER_KEY \
  0xF78B688846673C3f6b93184BeC230d982c0db0c9 \
  "setNativeAthenaContract(address)" \
  0xE6B9d996b56162cD7eDec3a83aE72943ee7C46Bf

# Set NOWJC
source .env && cast send --rpc-url $ARBITRUM_MAINNET_RPC_URL --private-key $PROD_DEPLOYER_KEY \
  0xF78B688846673C3f6b93184BeC230d982c0db0c9 \
  "setNativeOpenWorkJobContract(address)" \
  0x8EfbF240240613803B9c9e716d4b5AD1388aFd99
```

**TX (setNativeDaoContract):** `0x2bcadd7c937c437a2ad8b031ddc53ae1e4ea516e4ea4f219827306d411dec3e2`
**TX (setNativeAthenaContract):** `0x7c7f5ea376813dc927811f2edfbe66eece5116ff043e8f0f57157171864a378b`
**TX (setNativeOpenWorkJobContract):** `0x50d7bd21b06d09b8eb7ea2a13bc228291d8ce1416c5686bd2ee3a2550b34ba8f`

---

## Configuration Complete ✅

All Arbitrum One (Native Chain) contracts are deployed and configured:
- Genesis ↔ NOWJC authorized
- RewardsContract ↔ NOWJC, Genesis linked
- DAO ↔ RewardsContract linked
- Athena ↔ RewardsContract linked
- NOWJC ↔ Athena linked (admin added)
- Bridge ↔ DAO, Athena, NOWJC linked

**Remaining for full cross-chain:**
- Deploy Optimism (Local Chain) contracts
- Deploy Ethereum Mainnet (ETH Chain) contracts
- Configure LayerZero peer connections between chains

---

# OPTIMISM MAINNET (LOCAL CHAIN) DEPLOYMENT

## Network Info

- **Chain ID:** 10
- **LayerZero EID:** 30111
- **CCTP Domain:** 2

## External Dependencies (Optimism Mainnet)

| Contract | Address | Source |
|----------|---------|--------|
| USDC | `0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85` | Circle |
| LZ Endpoint V2 | `0x1a44076050125825900e736c501f859c50fE728c` | LayerZero |
| TokenMessengerV2 | `0x2B4069517957735bE00ceE0fadAE88a26365528f` | Circle CCTP V2 (Domain 2) |
| MessageTransmitterV2 | `0x4D41f22c5a0e5c74090899E5a8Fb597a8842b3e8` | Circle CCTP V2 (Domain 2) |

---

## 13. LocalLZOpenworkBridge (Optimism Mainnet) - Non-Upgradeable ✅

**Command:**
```bash
source .env && forge create --broadcast \
  --rpc-url $OPTIMISM_MAINNET_RPC_URL \
  --private-key $PROD_DEPLOYER_KEY \
  "src/suites/mainnet-ready/local/local-lz-openwork-bridge.sol:LocalLZOpenworkBridge" \
  --constructor-args 0x1a44076050125825900e736c501f859c50fE728c 0x7a2B7feAB9b0e30A5368d3CC4CB8279c9606384C 30110 30101 30111
```

**Constructor Args:**
- `_endpoint`: `0x1a44076050125825900e736c501f859c50fE728c` (LayerZero V2 Endpoint - Optimism)
- `_owner`: `0x7a2B7feAB9b0e30A5368d3CC4CB8279c9606384C`
- `_nativeChainEid`: `30110` (Arbitrum One)
- `_mainChainEid`: `30101` (Ethereum Mainnet)
- `_thisLocalChainEid`: `30111` (Optimism)

**Output:**
```
Deployer: 0x7a2B7feAB9b0e30A5368d3CC4CB8279c9606384C
Deployed to: 0x74566644782e98c87a12E8Fc6f7c4c72e2908a36
Transaction hash: 0xf2b48bc20137b2d1eaa097510ce2e35eac15ca95bc4200f514ab6f7c960dac50
```

**Optimistic Etherscan:** https://optimistic.etherscan.io/address/0x74566644782e98c87a12E8Fc6f7c4c72e2908a36

---

## 14. CCTPTransceiver (Optimism Mainnet) - Non-Upgradeable ✅

**Command:**
```bash
source .env && forge create --broadcast \
  --rpc-url $OPTIMISM_MAINNET_RPC_URL \
  --private-key $PROD_DEPLOYER_KEY \
  "src/suites/mainnet-ready/utilities/cctp-transceiver.sol:CCTPTransceiver" \
  --constructor-args 0x2B4069517957735bE00ceE0fadAE88a26365528f 0x4D41f22c5a0e5c74090899E5a8Fb597a8842b3e8 0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85
```

**Constructor Args:**
- `_tokenMessenger`: `0x2B4069517957735bE00ceE0fadAE88a26365528f` (Circle CCTP V2 - Domain 2)
- `_messageTransmitter`: `0x4D41f22c5a0e5c74090899E5a8Fb597a8842b3e8` (Circle CCTP V2 - Domain 2)
- `_usdc`: `0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85` (Circle USDC on Optimism)

**Output:**
```
Deployer: 0x7a2B7feAB9b0e30A5368d3CC4CB8279c9606384C
Deployed to: 0x00c70838cA0de7F1Eb192Bd7a11A7F2e14407510
Transaction hash: 0x18429b4d65013d16daeb4c400adf38c6ef12a6c0f73b33ad070786786b3bb349
```

**Optimistic Etherscan:** https://optimistic.etherscan.io/address/0x00c70838cA0de7F1Eb192Bd7a11A7F2e14407510

---

## 15. LocalOpenWorkJobContract (LOWJC) Implementation (Optimism Mainnet) ✅

**Command:**
```bash
source .env && forge create --broadcast \
  --rpc-url $OPTIMISM_MAINNET_RPC_URL \
  --private-key $PROD_DEPLOYER_KEY \
  "src/suites/mainnet-ready/local/local-openwork-job-contract.sol:LocalOpenWorkJobContract"
```

**Output:**
```
Deployer: 0x7a2B7feAB9b0e30A5368d3CC4CB8279c9606384C
Deployed to: 0x20Fa268106A3C532cF9F733005Ab48624105c42F
```

**Optimistic Etherscan:** https://optimistic.etherscan.io/address/0x20Fa268106A3C532cF9F733005Ab48624105c42F

---

## 16. LocalAthena Implementation (Optimism Mainnet) ✅

**Command:**
```bash
source .env && forge create --broadcast \
  --rpc-url $OPTIMISM_MAINNET_RPC_URL \
  --private-key $PROD_DEPLOYER_KEY \
  "src/suites/mainnet-ready/local/local-athena.sol:LocalAthena"
```

**Output:**
```
Deployer: 0x7a2B7feAB9b0e30A5368d3CC4CB8279c9606384C
Deployed to: 0xF78B688846673C3f6b93184BeC230d982c0db0c9
Transaction hash: 0x63a795185880b3ddef3b57d31d4cf445c41dcb1059521553b71f7b4d90434cf6
```

**Optimistic Etherscan:** https://optimistic.etherscan.io/address/0xF78B688846673C3f6b93184BeC230d982c0db0c9

---

## 17. LOWJC Proxy (Optimism Mainnet) ✅

**Initialize Parameters:**
- `_owner`: `0x7a2B7feAB9b0e30A5368d3CC4CB8279c9606384C`
- `_usdcToken`: `0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85`
- `_chainId`: `2` (CCTP Domain for Optimism)
- `_bridge`: `0x74566644782e98c87a12E8Fc6f7c4c72e2908a36`
- `_cctpSender`: `0x00c70838cA0de7F1Eb192Bd7a11A7F2e14407510`

**Command:**
```bash
source .env && forge create --broadcast \
  --rpc-url $OPTIMISM_MAINNET_RPC_URL \
  --private-key $PROD_DEPLOYER_KEY \
  "src/suites/mainnet-ready/utilities/proxy.sol:UUPSProxy" \
  --constructor-args 0x20Fa268106A3C532cF9F733005Ab48624105c42F $(cast calldata "initialize(address,address,uint32,address,address)" 0x7a2B7feAB9b0e30A5368d3CC4CB8279c9606384C 0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85 2 0x74566644782e98c87a12E8Fc6f7c4c72e2908a36 0x00c70838cA0de7F1Eb192Bd7a11A7F2e14407510)
```

**Output:**
```
Deployer: 0x7a2B7feAB9b0e30A5368d3CC4CB8279c9606384C
Deployed to: 0x5cF21bFb944B6851048F9ac18a8C84F6323a8ce7
Transaction hash: 0xdbd39ad404f5c813f20befc20b638b6c3619f6c1804977ad0d0b0c3687ecbc18
```

**Optimistic Etherscan:** https://optimistic.etherscan.io/address/0x5cF21bFb944B6851048F9ac18a8C84F6323a8ce7

---

## 18. LocalAthena Proxy (Optimism Mainnet) ✅

**Initialize Parameters:**
- `_owner`: `0x7a2B7feAB9b0e30A5368d3CC4CB8279c9606384C`
- `_usdcToken`: `0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85`
- `_chainId`: `2` (CCTP Domain for Optimism)
- `_bridge`: `0x74566644782e98c87a12E8Fc6f7c4c72e2908a36`
- `_cctpSender`: `0x00c70838cA0de7F1Eb192Bd7a11A7F2e14407510`
- `_nativeAthenaRecipient`: `0xE6B9d996b56162cD7eDec3a83aE72943ee7C46Bf` (Athena on Arbitrum)

**Command:**
```bash
source .env && forge create --broadcast \
  --rpc-url $OPTIMISM_MAINNET_RPC_URL \
  --private-key $PROD_DEPLOYER_KEY \
  "src/suites/mainnet-ready/utilities/proxy.sol:UUPSProxy" \
  --constructor-args 0xF78B688846673C3f6b93184BeC230d982c0db0c9 $(cast calldata "initialize(address,address,uint32,address,address,address)" 0x7a2B7feAB9b0e30A5368d3CC4CB8279c9606384C 0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85 2 0x74566644782e98c87a12E8Fc6f7c4c72e2908a36 0x00c70838cA0de7F1Eb192Bd7a11A7F2e14407510 0xE6B9d996b56162cD7eDec3a83aE72943ee7C46Bf)
```

**Output:**
```
Deployer: 0x7a2B7feAB9b0e30A5368d3CC4CB8279c9606384C
Deployed to: 0x4756294bE516f73e8D1984E7a94E4ABaffA94c4d
Transaction hash: 0xd69e2d708040fe5ffa787185a7dd98f88bb8cf21123ff79d0ad755c310505286
```

**Optimistic Etherscan:** https://optimistic.etherscan.io/address/0x4756294bE516f73e8D1984E7a94E4ABaffA94c4d

---

## Optimism Deployment Complete ✅

All 6 Optimism (Local Chain) contracts deployed:

| Contract | Address | Type |
|----------|---------|------|
| LocalLZOpenworkBridge | `0x74566644782e98c87a12E8Fc6f7c4c72e2908a36` | Non-Upgradeable |
| CCTPTransceiver | `0x00c70838cA0de7F1Eb192Bd7a11A7F2e14407510` | Non-Upgradeable |
| LOWJC Impl | `0x20Fa268106A3C532cF9F733005Ab48624105c42F` | Implementation |
| LocalAthena Impl | `0xF78B688846673C3f6b93184BeC230d982c0db0c9` | Implementation |
| LOWJC Proxy | `0x5cF21bFb944B6851048F9ac18a8C84F6323a8ce7` | Proxy |
| LocalAthena Proxy | `0x4756294bE516f73e8D1984E7a94E4ABaffA94c4d` | Proxy |

---

## 19. Optimism Configuration

### 19.1 Bridge: Set Contract References ✅

```bash
# Set LOWJC
source .env && cast send --rpc-url $OPTIMISM_MAINNET_RPC_URL --private-key $PROD_DEPLOYER_KEY \
  0x74566644782e98c87a12E8Fc6f7c4c72e2908a36 \
  "setLowjcContract(address)" \
  0x5cF21bFb944B6851048F9ac18a8C84F6323a8ce7

# Set LocalAthena
source .env && cast send --rpc-url $OPTIMISM_MAINNET_RPC_URL --private-key $PROD_DEPLOYER_KEY \
  0x74566644782e98c87a12E8Fc6f7c4c72e2908a36 \
  "setAthenaClientContract(address)" \
  0x4756294bE516f73e8D1984E7a94E4ABaffA94c4d
```

**TX (setLowjcContract):** `0x48ba12cd3dd496920c60525d49cacff4ed18fbca1bd44d9a00629af7c0065227`
**TX (setAthenaClientContract):** `0xa1833781b856b6524869f9c8b653e2cb1ff32555d1353650f57965dbace35300`

### 19.2 LayerZero Peer Configuration (Optimism → Arbitrum) ✅

```bash
# Set peer on Optimism Bridge pointing to Arbitrum Bridge
source .env && cast send --rpc-url $OPTIMISM_MAINNET_RPC_URL --private-key $PROD_DEPLOYER_KEY \
  0x74566644782e98c87a12E8Fc6f7c4c72e2908a36 \
  "setPeer(uint32,bytes32)" \
  30110 \
  $(cast --to-bytes32 0xF78B688846673C3f6b93184BeC230d982c0db0c9)
```

**TX:** `0xf617b4a305cdb357ad6af1eed4db8a07a115cbc63a0d8d35c0173604298ace92`

### 19.3 LayerZero Peer Configuration (Arbitrum → Optimism) ✅

```bash
# Set peer on Arbitrum Bridge pointing to Optimism Bridge
source .env && cast send --rpc-url "https://arb1.arbitrum.io/rpc" --private-key $PROD_DEPLOYER_KEY \
  0xF78B688846673C3f6b93184BeC230d982c0db0c9 \
  "setPeer(uint32,bytes32)" \
  30111 \
  $(cast --to-bytes32 0x74566644782e98c87a12E8Fc6f7c4c72e2908a36)
```

**TX:** `0x5e26c3f00b115c832e57541084ff496191732fe5df6110f1eb0c98c750d46e84`

---

## Optimism Configuration Complete ✅

Cross-chain peer connections established:
- Optimism Bridge → Arbitrum Bridge (EID 30110)
- Arbitrum Bridge → Optimism Bridge (EID 30111)

---

## Notes

- Using `PROD_DEPLOYER_KEY` environment variable (not committed to repo)
- All contracts from `src/suites/mainnet-ready/` folder
- Rewards contracts are intentionally non-upgradeable for security
- CCTPTransceiver is permissionless (anyone can relay USDC transfers)
- Bridge peer configuration needed when deploying to other chains (Optimism, Ethereum)

---

# ETHEREUM MAINNET (ETH CHAIN) DEPLOYMENT

## Network Info

- **Chain ID:** 1
- **LayerZero EID:** 30101
- **CCTP Domain:** 0

## External Dependencies (Ethereum Mainnet)

| Contract | Address | Source |
|----------|---------|--------|
| LZ Endpoint V2 | `0x1a44076050125825900e736c501f859c50fE728c` | LayerZero |

---

## 20. ETHLZOpenworkBridge (Ethereum Mainnet) - Non-Upgradeable ✅

**Command:**
```bash
source .env && forge create --broadcast \
  --rpc-url $ETHEREUM_MAINNET_RPC_URL \
  --private-key $PROD_DEPLOYER_KEY \
  "src/suites/mainnet-ready/eth/eth-lz-openwork-bridge.sol:ETHLZOpenworkBridge" \
  --constructor-args 0x1a44076050125825900e736c501f859c50fE728c 0x7a2B7feAB9b0e30A5368d3CC4CB8279c9606384C 30110
```

**Constructor Args:**
- `_endpoint`: `0x1a44076050125825900e736c501f859c50fE728c` (LayerZero V2 Endpoint - Ethereum)
- `_owner`: `0x7a2B7feAB9b0e30A5368d3CC4CB8279c9606384C`
- `_nativeChainEid`: `30110` (Arbitrum One)

**Output:**
```
Deployer: 0x7a2B7feAB9b0e30A5368d3CC4CB8279c9606384C
Deployed to: 0x20Fa268106A3C532cF9F733005Ab48624105c42F
Transaction hash: 0x1c6675bcc2ec7ba7145d2b2b8f0df7baa49821be90e27e17e7a03328b84898c1
```

**Etherscan:** https://etherscan.io/address/0x20Fa268106A3C532cF9F733005Ab48624105c42F

---

## 21. ETHOpenworkDAO Implementation (Ethereum Mainnet) ✅

**Command:**
```bash
source .env && forge create --broadcast \
  --rpc-url $ETHEREUM_MAINNET_RPC_URL \
  --private-key $PROD_DEPLOYER_KEY \
  "src/suites/mainnet-ready/eth/eth-openwork-dao.sol:ETHOpenworkDAO"
```

**Output:**
```
Deployer: 0x7a2B7feAB9b0e30A5368d3CC4CB8279c9606384C
Deployed to: 0xF78B688846673C3f6b93184BeC230d982c0db0c9
Transaction hash: 0x92c401c5eb4dc48282fe907b9e49aea3c3d46a8107319b489f42351f47df38eb
```

**Etherscan:** https://etherscan.io/address/0xF78B688846673C3f6b93184BeC230d982c0db0c9

---

## 22. LayerZero Peer Configuration

### 22.1 ETH Bridge → Arbitrum Bridge ✅

```bash
source .env && cast send --rpc-url $ETHEREUM_MAINNET_RPC_URL --private-key $PROD_DEPLOYER_KEY \
  0x20Fa268106A3C532cF9F733005Ab48624105c42F \
  "setPeer(uint32,bytes32)" \
  30110 \
  $(cast --to-bytes32 0xF78B688846673C3f6b93184BeC230d982c0db0c9)
```

**TX:** `0x6e20501b67e40e612b71e142d2ee399a1fe84d8fdc6a3f099501d051adb2e91c`

### 22.2 Arbitrum Bridge → ETH Bridge ✅

```bash
source .env && cast send --rpc-url "https://arb1.arbitrum.io/rpc" --private-key $PROD_DEPLOYER_KEY \
  0xF78B688846673C3f6b93184BeC230d982c0db0c9 \
  "setPeer(uint32,bytes32)" \
  30101 \
  $(cast --to-bytes32 0x20Fa268106A3C532cF9F733005Ab48624105c42F)
```

**TX:** `0x25b524f4365882e0c1149e64ccd456c014958095445f0f66f7058db271cb19e5`

---

## Ethereum Partial Deployment Complete ✅

**Deployed (No Token Dependency):**
| Contract | Address | Type |
|----------|---------|------|
| ETHLZOpenworkBridge | `0x20Fa268106A3C532cF9F733005Ab48624105c42F` | Non-Upgradeable |
| ETHOpenworkDAO Impl | `0xF78B688846673C3f6b93184BeC230d982c0db0c9` | Implementation |

**Cross-Chain Peers Configured:**
- ETH Bridge → Arbitrum Bridge (EID 30110) ✅
- Arbitrum Bridge → ETH Bridge (EID 30101) ✅

**Pending (Waiting for Token):**
- ETHOpenworkDAO Proxy
- ETHRewardsContract
- OpenworkToken
- All contract configuration

---

## 23. NativeContractRegistry (Arbitrum Mainnet) - Non-Upgradeable ✅

**Command:**
```bash
source .env && forge create --broadcast \
  --rpc-url $ARBITRUM_MAINNET_RPC_URL \
  --private-key $PROD_DEPLOYER_KEY \
  "src/suites/mainnet-ready/native/native-contract-registry.sol:NativeContractRegistry"
```

**Output:**
```
Deployer: 0x7a2B7feAB9b0e30A5368d3CC4CB8279c9606384C
Deployed to: 0x29D61B1a9E2837ABC0810925429Df641CBed58c3
Transaction hash: 0xb534cdf97a75ca70fbb254ebb49e7f89b3dbf41c581dafa99b50edd55bd0f047
```

**Arbiscan:** https://arbiscan.io/address/0x29D61B1a9E2837ABC0810925429Df641CBed58c3

**Key Features:**
- On-chain registry for all deployed contracts
- Admin-controlled via owner/DAO
- Tracks contract name, address, chain, and deployer
