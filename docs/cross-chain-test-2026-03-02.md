# Cross-Chain CCTP Test Log — 2026-03-02
## Job 30111-93 | OP → ARB → OP | Full Cycle Confirmed ✅

**Date:** 2026-03-02  
**Tester:** AI Agent (service wallet `0xb8dC69937e745Fd02661BC4333f3852166eF2026`)  
**Job ID:** `30111-93`  
**Result:** ✅ Full OP→ARB→OP CCTP + LayerZero cycle confirmed on mainnet

---

## Contract Addresses

| Contract | Chain | Address |
|----------|-------|---------|
| OP LOWJC Proxy | Optimism | `0x620205A4Ff0E652fF03a890d2A677de878a1dB63` |
| OP LocalLZOpenworkBridge | Optimism | `0x74566644782e98c87a12E8Fc6f7c4c72e2908a36` |
| OP CCTPTransceiver V2 | Optimism | `0x586C700ACFA1D129Ba2C6a6E673c55d586c32f15` |
| OP USDC | Optimism | `0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85` |
| OP MessageTransmitter V2 | Optimism | `0x4D41f22c5a0e5c74090899E5a8Fb597a8842b3e8` |
| OP TokenMessenger V2 | Optimism | `0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d` |
| ARB NOWJC Proxy | Arbitrum | `0x8EfbF240240613803B9c9e716d4b5AD1388aFd99` |
| ARB Genesis | Arbitrum | `0xE8f7963fF3cE9f7dB129e3f619abd71cBB5Bb294` |
| ARB CCTPTransceiver | Arbitrum | `0x765D70496Ef775F6ba1cB7465c2e0B296eB50d87` |
| ARB MessageTransmitter V2 | Arbitrum | `0x81D40F21F12A8F0E3252Bccb954D722d4c464B64` |
| ARB USDC | Arbitrum | `0xaf88d065e77c8cC2239327C5EDb3A432268e5831` |

---

## Transaction Log (All 6 Txs)

### Tx 1 — USDC Approve (OP)
**Action:** `USDC.approve(LOWJC, 100000)` — allow LOWJC to spend 0.1 USDC  
**Chain:** Optimism  
**Hash:** `0x44277baa1e82a0c730c6d4bece0d4abf363b331e843c2265290d7646b6e8e09a`  
**Explorer:** https://optimistic.etherscan.io/tx/0x44277baa1e82a0c730c6d4bece0d4abf363b331e843c2265290d7646b6e8e09a  
**Result:** ✅ Success

```js
// ethers.js
const usdc = new ethers.Contract(OP_USDC, ['function approve(address,uint256)'], wallet);
await usdc.approve(OP_LOWJC, 100000n);
```

---

### Tx 2 — startDirectContract (OP) — CCTP Burn
**Action:** `LOWJC.startDirectContract(taker, jobId, milestones, amounts, targetDomain, lzOpts)`  
**Chain:** Optimism  
**Hash:** `0xe91f82c008315c10e990eb3cfe3aad7a87c8e27072561744abcc40b184a33887`  
**Explorer:** https://optimistic.etherscan.io/tx/0xe91f82c008315c10e990eb3cfe3aad7a87c8e27072561744abcc40b184a33887  
**Result:** ✅ 0.1 USDC burned on OP via CCTP; LZ message sent to ARB  
**Effect:** SW USDC: 1.757 → 1.657 USDC

```js
const TAKER   = '0x7a2B7feAB9b0e30A5368d3CC4CB8279c9606384C'; // Anas deployer
const JOB_ID  = '30111-93';
const LZ_OPTS = '0x000301001101000000000000000000000000000f4240'; // 1M gas
const LZ_FEE  = ethers.parseEther('0.0001'); // actual: ~0.000066 ETH

const lowjc = new ethers.Contract(OP_LOWJC, LOWJC_ABI, wallet);
await lowjc.startDirectContract(
  TAKER,
  JOB_ID,
  ['M1'],      // milestone names
  [100000n],   // amounts (0.1 USDC in raw)
  2,           // CCTP target domain: 2 = Optimism (cctpMintRecipient = ARB NOWJC)
  LZ_OPTS,
  { value: LZ_FEE, gasLimit: 1_000_000 }  // 1M gas required; 500k reverts
);
```

---

### Tx 3 — CCTP Receive on ARB (mint USDC at NOWJC)
**Action:** `ARB MessageTransmitter.receiveMessage(message, attestation)`  
**Chain:** Arbitrum  
**Hash:** `0xfc8f9aa3817841b9259de1074f3ca20693c2e9ba599782370aa1e09d0e6a383a`  
**Explorer:** https://arbiscan.io/tx/0xfc8f9aa3817841b9259de1074f3ca20693c2e9ba599782370aa1e09d0e6a383a  
**Result:** ✅ +0.099987 USDC minted at NOWJC on ARB  
**CCTP Attestation Source:** `https://iris-api.circle.com/v2/messages/2?transactionHash=<Tx2_OP_hash>`  
**Note:** ARB→OP direction uses MessageTransmitter directly (no CCTPTransceiver needed)

```js
// 1. Get attestation from Circle after Tx 2 confirms on-chain
const OP_TX = '0xe91f82c0...';
const resp = await fetch(`https://iris-api.circle.com/v2/messages/2?transactionHash=${OP_TX}`);
const { message, attestation } = (await resp.json()).messages[0];
// status must be "complete" before proceeding

// 2. Call ARB MessageTransmitter directly
const MT_ARB = '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64';
const mt = new ethers.Contract(MT_ARB, ['function receiveMessage(bytes,bytes) returns (bool)'], arbWallet);
await mt.receiveMessage(message, attestation, { gasLimit: 500000 });
```

---

### Tx 4 — releasePaymentCrossChain (OP) — LZ to ARB
**Action:** `LOWJC.releasePaymentCrossChain(jobId, targetDomain, recipient, lzOpts)`  
**Chain:** Optimism  
**Hash:** `0x7d3f7fff39666057fc08f73a8742039d171406d7925cc73044cb0080cedce6f9`  
**Explorer:** https://optimistic.etherscan.io/tx/0x7d3f7fff39666057fc08f73a8742039d171406d7925cc73044cb0080cedce6f9  
**Result:** ✅ LZ message sent; LOWJC escrow marked released (100000/100000/0)  
**Note:** submitWork was skipped — LOWJC has no submitWork requirement before release

```js
const LZ_OPTS_500K = '0x0003010011010000000000000000000000000007a120'; // 500k gas for release
const lzFee = quotedFee * 120n / 100n; // +20% buffer over dynamic quote

// Dynamic fee quote:
const bridge = new ethers.Contract(OP_BRIDGE, ['function quoteNativeChain(bytes,bytes) view returns (uint256)'], provider);
const quoted = await bridge.quoteNativeChain(encodedPayload, LZ_OPTS_500K);

await lowjc.releasePaymentCrossChain(
  '30111-93',
  2,          // targetChainDomain: 2 = Optimism (taker receives on OP)
  TAKER,      // recipient on destination chain
  LZ_OPTS_500K,
  { value: lzFee, gasLimit: 800000 }
);
```

---

### Tx 5 — LZ Delivery: NOWJC handleRelease + CCTP Burn (ARB)
**Action:** LayerZero executor delivers message → NOWJC `handleReleasePaymentCrossChain` → burns 0.1 USDC via ARB CCTPTransceiver  
**Chain:** Arbitrum  
**Hash:** `0x73f7abe3fb10d2d9815823ae0fd44bd211ce2a32ade2cb53f12d32d1ebcede8f`  
**Explorer:** https://arbiscan.io/tx/0x73f7abe3fb10d2d9815823ae0fd44bd211ce2a32ade2cb53f12d32d1ebcede8f  
**Result:** ✅ LZ delivered; NOWJC fired PaymentReleased; 0.1 USDC burned via CCTP  
**LZ Scan:** https://layerzeroscan.com/tx/0x7d3f7fff39666057fc08f73a8742039d171406d7925cc73044cb0080cedce6f9  
**LZ Delivery Time:** ~8 min (INFLIGHT → WAITING → DELIVERED)

**NOWJC events emitted:**
```
JobStatusChanged    → status: 2 (InProgress — Genesis NOT auto-updated to Completed)
CommissionDeducted  → gross: 0.1 USDC | commission: 0.0 | net: 0.1 USDC
PaymentReleased     → jobGiver: 0xb8dC...2026 | applicant: 0x7a2B...384C | milestone: 1
```

**CCTP token flow in ARB tx:**
```
NOWJC (0x8EfbF...) → ARB CCTPTransceiver (0x765D...) → TokenMessenger (0xfd78...) → BURN (0x0000...)
FastTransferSent: 0.1 USDC → domain 2 (OP) → 0x7a2B...384C
```

**Monitoring LZ delivery:**
```js
const scan = await fetch(`https://scan.layerzero-api.com/v1/messages/tx/${TX_HASH}`);
const { status, destination } = (await scan.json()).data[0];
// poll until status.name === 'DELIVERED'
// then get destination.tx.txHash for the ARB receipt
```

---

### Tx 6 — CCTP Receive on OP (mint USDC at taker)
**Action:** `OP CCTPTransceiver.receive(message, attestation)` via selector `0x7376ee1f`  
**Chain:** Optimism  
**Hash:** `0x14b989d0800a7809755c5ece1cfaf327aef595b0703e6a1b58071076da79d175`  
**Explorer:** https://optimistic.etherscan.io/tx/0x14b989d0800a7809755c5ece1cfaf327aef595b0703e6a1b58071076da79d175  
**Result:** ✅ +0.099987 USDC minted at taker on OP  
**Taker balance:** 0.174375 → 0.274362 USDC  
**CCTP Attestation Source:** `https://iris-api.circle.com/v2/messages/3?transactionHash=<ARB_DST_TX>`  
**⚠️ CRITICAL:** Must call `CCTPTransceiver.receive()`, NOT `MessageTransmitter.receiveMessage()` directly  
— Direct MT call fails with `"Invalid signature: not attester"` (attester set mismatch)

```js
// 1. Get attestation from Circle after Tx 5 (ARB dst tx)
const ARB_DST_TX = '0x73f7abe3...';
const raw = execSync(`curl -s 'https://iris-api.circle.com/v2/messages/3?transactionHash=${ARB_DST_TX}'`).toString();
const { message, attestation } = JSON.parse(raw).messages[0];
// status must be "complete"

// 2. ⚠️ Call OP CCTPTransceiver.receive(), NOT MessageTransmitter directly
const CCTP_OP   = '0x586C700ACFA1D129Ba2C6a6E673c55d586c32f15';
const selector  = ethers.id('receive(bytes,bytes)').slice(0, 10); // = 0x7376ee1f
const calldata  = selector + ethers.AbiCoder.defaultAbiCoder().encode(['bytes','bytes'], [message, attestation]).slice(2);

await opWallet.sendTransaction({ to: CCTP_OP, data: calldata, gasLimit: 300000 });
```

---

## Pre-Flight Checks Performed

```js
// 1. Verify CCTP version on OP TokenMessenger
const TM_OP = '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d';
const tm = new ethers.Contract(TM_OP, ['function messageBodyVersion() view returns (uint32)'], opProvider);
console.log(await tm.messageBodyVersion()); // → 1 (V2) ✅

// 2. Check cctpMintRecipient on LOWJC
const lowjc = new ethers.Contract(OP_LOWJC, ['function cctpMintRecipient() view returns (bytes32)'], opProvider);
console.log(await lowjc.cctpMintRecipient());
// → 0x0000...8EfbF240... (= ARB NOWJC) ✅

// 3. Check job counter (to predict next job ID)
const counter = new ethers.Contract(OP_LOWJC, ['function jobCounter() view returns (uint256)'], opProvider);
console.log(await counter.jobCounter()); // → 92 → next job = 30111-93

// 4. Check escrow balance
const escrow = await lowjc.getEscrowBalance('30111-93');
// returns (escrowed, released, remaining)

// 5. LZ fee quote
const bridge = new ethers.Contract(OP_BRIDGE, ['function quoteNativeChain(bytes,bytes) view returns (uint256)'], opProvider);
const fee = await bridge.quoteNativeChain(encodedPayload, LZ_OPTS);
// → ~0.000055 ETH → use 0.000066+ with buffer
```

---

## Key Findings & Rules

### LZ Options
| Gas Limit | Hex Opts | Used For |
|-----------|----------|----------|
| 1,000,000 | `0x000301001101000000000000000000000000000f4240` | startDirectContract, startJob |
| 500,000   | `0x0003010011010000000000000000000000000007a120` | releasePaymentCrossChain |

> ⚠️ startJob with 500k gas **reverts** — always use 1M

### LZ Fee
- Actual fee: ~0.000055–0.000066 ETH per tx  
- Old assumption of 0.0005 ETH was **10x too high**  
- Always use dynamic quote via `bridge.quoteNativeChain()` + 20% buffer

### CCTP Receive Pattern
| Direction | Call | Notes |
|-----------|------|-------|
| OP → ARB | `ARB MessageTransmitter.receiveMessage(msg, att)` | Direct call works ✅ |
| ARB → OP | `OP CCTPTransceiver.receive(msg, att)` selector `0x7376ee1f` | MT direct call fails ❌ |

### Circle Iris API V2
```
OP burns  (domain 2): https://iris-api.circle.com/v2/messages/2?transactionHash=<OP_TX>
ARB burns (domain 3): https://iris-api.circle.com/v2/messages/3?transactionHash=<ARB_TX>
```
- Poll until `messages[0].status === "complete"` before calling receiveMessage
- Uses `curl` not Python urllib (403 Forbidden on urllib)

### NOWJC v2 release amount
- Uses **per-job `_amount`** (not `balanceOf(this)`) ✅  
- Previous note about `balanceOf` bug referred to an older contract version

### Skipping submitWork
- `LOWJC.releasePaymentCrossChain` has **no submitWork prerequisite** — job giver can release directly from InProgress
- `NOWJC.handleReleasePaymentCrossChain` also has no work-submission check

### Genesis status after release
- NOWJC emits `JobStatusChanged(status=2)` — stays InProgress  
- `handleReleasePaymentCrossChain` does **not** update Genesis to Completed  
- Separate call needed to finalize Genesis status

---

## Final State After All 6 Txs

| Item | Before | After |
|------|--------|-------|
| SW USDC (OP) | 1.757188 | 1.657188 |
| SW ETH (OP) | 0.001097 | 0.000951 |
| NOWJC USDC (ARB) | 7.118937 → 7.218937 (after mint) | 7.118937 (after release) |
| LOWJC escrow 30111-93 | 100000 / 0 / 100000 | 100000 / 100000 / 0 ✅ |
| Taker USDC (OP) | 0.174375 | 0.274362 (+0.099987) ✅ |

---

## Script Reference
The test was run via ad-hoc scripts. Full standalone test script saved at:  
`scripts/cctp-test-93.cjs`
