# OpenWork Job Cycle — Working Runbook

_Last verified: 2026-02-21 mainnet (job `30111-90`)_

---

## Architecture in One Line

```
Wallet1 (OP) → LOWJC (OP) → [LayerZero] → NOWJC (Arb) → [CCTP] → Wallet2 (OP)
```

LOWJC accepts transactions. NOWJC stores state. USDC escrow travels OP → Arb on startJob, then Arb → OP on release.

---

## Key Addresses & Constants

```js
// Contracts (Optimism mainnet)
LOWJC        = '0x620205A4Ff0E652fF03a890d2A677de878a1dB63'  // V4 Proxy
LOCAL_BRIDGE = '0x74566644782e98c87a12E8Fc6f7c4c72e2908a36'
USDC_OP      = '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'

// Contracts (Arbitrum mainnet — read only)
NOWJC        = '0x8EfbF240240613803B9c9e716d4b5AD1388aFd99'
USDC_ARB     = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'

// RPCs
OP_RPC  = 'https://opt-mainnet.g.alchemy.com/v2/ECvjGU_6M0Jrw6wlFkPo2ZbonbfW5oIZ'
ARB_RPC = 'https://arb-mainnet.g.alchemy.com/v2/ECvjGU_6M0Jrw6wlFkPo2ZbonbfW5oIZ'

// Backend
BACKEND = 'https://openwork-823072243332.us-central1.run.app'

// LayerZero
LZ_OPTIONS        = '0x0003010011010000000000000000000000000007a120'  // 500k gas
LZ_EID_OPTIMISM   = 30111   // ← job ID prefix, NOT the CCTP domain
CCTP_DOMAIN_ARB   = 3       // target domain for releasePaymentCrossChain

// Test wallets
WALLET1 = '0x5a79836F82215d4641683d6794A276922eA69290'  // job giver
WALLET2 = '0x00A325A66D53A7031d7D79790f4e6461619Ae82B'  // job taker
```

---

## Job ID Format

```
jobId = `${LZ_EID}-${jobCounter}`
      = `30111-${n}`     // e.g. "30111-90"
```

⚠️ **NOT** `2-N` (CCTP domain). The contract's `chainId` variable = LayerZero EID = `30111`.

---

## Gas Limits (tested mainnet values)

| Function | Gas Limit | Notes |
|----------|-----------|-------|
| `postJob` | 500,000 | ~385k actual |
| `applyToJob` | 500,000 | ~306k actual |
| `startJob` | **1,000,000** | ~507k actual — includes CCTP sendFast internally |
| `releasePaymentCrossChain` | 800,000 | ~331k actual |
| `approve` (USDC) | 100,000 | ~46k actual |

---

## LZ Fee Quoting

```js
async function quoteLzFee(bridge, operation, callerAddress) {
  const payload = ethers.AbiCoder.defaultAbiCoder().encode(
    ['string', 'address'],
    [operation, callerAddress]
  );
  const raw = await bridge.quoteNativeChain(payload, LZ_OPTIONS);
  return (raw * 130n) / 100n;  // +30% buffer
}

// Operations: 'POST_JOB', 'APPLY_JOB', 'START_JOB', 'RELEASE_PAYMENT'
```

releasePaymentCrossChain needs an extra `+0.0003 ETH` for CCTP fees on top of LZ fee.

---

## Step-by-Step Recipe

### Step 0 — Check Balances
Wallet1 needs: ~0.002 ETH + job amount in USDC on OP
Wallet2 needs: ~0.001 ETH on OP (for applyToJob LZ fee)

### Step 1 — postJob (Wallet1)

```js
const JOB_AMOUNT = ethers.parseUnits('0.1', 6);  // 0.1 USDC
const jobDetailHash = 'QmYourIPFSHash';
const descriptions = ['Milestone description'];
const amounts = [JOB_AMOUNT];

const lzFee = await quoteLzFee(bridge, 'POST_JOB', wallet1.address);

const tx = await lowjc1.postJob(
  jobDetailHash, descriptions, amounts, LZ_OPTIONS,
  { value: lzFee, gasLimit: 500000 }
);
const receipt = await tx.wait();

// Predict job ID (don't rely on event parsing — indexed strings hash, not decode)
const jobCounter = await lowjc1.jobCounter();
const jobId = `30111-${jobCounter}`;  // e.g. "30111-90"
```

### Step 2 — applyToJob (Wallet2)

```js
const lzFee = await quoteLzFee(bridge, 'APPLY_JOB', wallet2.address);

const tx = await lowjc2.applyToJob(
  jobId,
  'QmApplicationHash',
  ['I will complete this'],
  [JOB_AMOUNT],
  CCTP_DOMAIN_ARB,   // preferred payment chain
  LZ_OPTIONS,
  { value: lzFee, gasLimit: 500000 }
);
await tx.wait();

const applicationId = 1n;  // first application = 1, second = 2, etc.
// ⚠️ Do NOT parse applicationId from event topics (indexed string breaks the read)
// Use the counter: it's ++jobApplicationCounter[jobId], starts at 1
```

### Step 3 — Approve USDC (Wallet1, if not already approved)

```js
const allowance = await usdc1.allowance(wallet1.address, LOWJC);
if (allowance < JOB_AMOUNT) {
  const tx = await usdc1.approve(LOWJC, ethers.MaxUint256, { gasLimit: 100000 });
  await tx.wait();
}
// MaxUint256 approval is permanent — only needed once per wallet
```

### Step 4 — startJob (Wallet1)

```js
// ⚠️ Gas limit MUST be 1,000,000 — startJob internally calls CCTP sendFast (~507k actual)
const lzFee = await quoteLzFee(bridge, 'START_JOB', wallet1.address);

const tx = await lowjc1.startJob(
  jobId,
  applicationId,
  false,       // useAppMilestones — false = use job giver's milestones
  LZ_OPTIONS,
  { value: lzFee, gasLimit: 1000000 }
);
await tx.wait();

// Notify backend (non-critical, best effort)
await fetch(`${BACKEND}/api/start-job`, {
  method: 'POST',
  body: JSON.stringify({ jobId, opSepoliaTxHash: tx.hash })
});
```

### Step 5 — releasePaymentCrossChain (Wallet1)

```js
const lzFee = await quoteLzFee(bridge, 'RELEASE_PAYMENT', wallet1.address);
const value = lzFee + ethers.parseEther('0.0003');  // +0.0003 ETH for CCTP

const tx = await lowjc1.releasePaymentCrossChain(
  jobId,
  CCTP_DOMAIN_ARB,     // 3 = Arbitrum
  wallet2.address,     // recipient — payment lands on OP regardless of domain
  LZ_OPTIONS,
  { value, gasLimit: 800000 }
);
await tx.wait();

// Notify backend — get statusKey for polling
const resp = await fetch(`${BACKEND}/api/release-payment`, {
  method: 'POST',
  body: JSON.stringify({ jobId, opSepoliaTxHash: tx.hash })
});
const { statusKey } = await resp.json();
// statusKey format: "30111-90-0xTXHASH"
```

### Step 6 — Poll CCTP Completion

```js
// Poll every 30s, up to 20 minutes (~364s typical)
while (true) {
  await sleep(30000);
  const r = await fetch(`${BACKEND}/api/release-payment-status/${encodeURIComponent(statusKey)}`);
  const body = await r.json();
  console.log(body.status, body.message);

  if (body.status === 'completed') break;   // ✅ done
  if (body.status === 'failed') throw new Error(body.lastError);
}

// Verify: wallet2 receives USDC on Optimism (NOT Arbitrum — always lands on OP)
const bal = await usdcOP.balanceOf(wallet2.address);
console.log('Wallet2 USDC on OP:', ethers.formatUnits(bal, 6));
// Expected: job amount − 0.000013 USDC (CCTP maxFee deduction)
```

---

## Gotchas & Known Quirks

| # | Gotcha | Fix |
|---|--------|-----|
| 1 | Job ID uses LZ EID (`30111`), not CCTP domain (`2`) | Always use `30111-N` format |
| 2 | `startJob` runs out of gas at 600k | Use `gasLimit: 1_000_000` |
| 3 | `applicationId` can't be parsed from event (indexed string breaks topics) | Use `1` for first application; track manually |
| 4 | `getJobStatus` / `getJob` on LOWJC reverts for freshly-created jobs | Job state lives on NOWJC (Arbitrum); query genesis contract there |
| 5 | Payment always lands on **Optimism** regardless of `_targetChainDomain` | Check OP balance, not Arb |
| 6 | `applyToJob` does NOT validate job existence | Applying to a non-existent job won't fail — it just sends a pointless LZ message |
| 7 | Service wallet ETH on OP — monitor threshold 0.002 ETH | Top up via bridge if needed |

---

## Ready-to-Run Script

The canonical script is at:
```
/data/.openclaw/workspace/e2e-test.js
```

All above fixes are applied. To run a fresh end-to-end cycle:
```bash
cd /data/.openclaw/workspace
node e2e-test.js
```

Results saved to: `e2e-test-results.md`

---

## Verified Test Results

| Date | Job | Amount | Duration | Result |
|------|-----|--------|----------|--------|
| 2026-02-21 | `30111-88` | 0.1 USDC | ~363s | ✅ wallet2 got 0.099987 USDC on OP |
| 2026-02-21 | `30111-90` | 0.1 USDC | ~364s | ✅ wallet2 got 0.099987 USDC on OP |
