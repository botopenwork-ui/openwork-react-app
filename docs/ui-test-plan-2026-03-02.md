# UI Test Plan — OP→ARB→OP Cross-Chain Cycle
**Date:** 2026-03-02  
**Job ID:** `30111-94` (predicted)  
**Tester:** AI Agent via browser automation  
**App:** https://app.openwork.technology  

---

## Objective
Repeat the confirmed direct-contract cycle (job 30111-93) through the **UI** instead of raw scripts. Validate that every on-chain action the UI triggers matches the working baseline.

---

## Wallets
| Role | Address | Chain | Balance |
|------|---------|-------|---------|
| Job Giver (service wallet) | `0xb8dC69937e745Fd02661BC4333f3852166eF2026` | OP | 0.008951 ETH · 1.657 USDC |
| Job Taker | `0x7a2B7feAB9b0e30A5368d3CC4CB8279c9606384C` | OP | 0.274 USDC |

---

## Test Steps

### Step 1 — Connect Wallet
- Open https://app.openwork.technology
- Connect MetaMask on **Optimism** mainnet (chain ID 10)
- Confirm wallet address shows `0xb8dC...2026`

### Step 2 — Create Direct Contract
- Navigate to **Work → Direct Contract**
- Fill form:
  - Title: `UI Test Job 94`
  - Taker: `0x7a2B7feAB9b0e30A5368d3CC4CB8279c9606384C`
  - Milestone: `M1` = **0.1 USDC**
- Click **Enter Contract**
- MetaMask popup 1: USDC approve → confirm
- MetaMask popup 2: `startDirectContract` (gas: 1,000,000) → confirm
- ✅ Checkpoint: tx confirmed on OP, USDC balance drops by 0.1

### Step 3 — Monitor Cross-Chain Status (UI)
- UI shows `CrossChainStatus` component with steps
- Wait for **LayerZero: DELIVERED** (ARB dst tx appears)
- Wait for **CCTP: complete** (backend relays `ARB MessageTransmitter.receiveMessage()`)
- ✅ Checkpoint: NOWJC on ARB shows +0.1 USDC

### Step 4 — Release Payment
- Navigate to job detail page for `30111-94`
- Click **Release Payment**
- MetaMask popup: `releasePaymentCrossChain` (gas: 800,000, value: LZ fee) → confirm
- ✅ Checkpoint: tx confirmed on OP, LOWJC escrow released

### Step 5 — Monitor Release Cross-Chain (Backend)
- Backend detects `PaymentReleased` event on ARB (via LZ delivery)
- Backend polls Circle API for ARB→OP attestation
- Backend calls `OP CCTPTransceiver.receive()` (selector `0x7376ee1f`)
- ✅ Checkpoint: taker USDC on OP increases by ~0.099987

---

## Pass Criteria
| Check | Expected |
|-------|----------|
| startDirectContract tx status | success (status=1) |
| LZ delivery (OP→ARB) | DELIVERED |
| NOWJC USDC delta | +0.099987 |
| releasePaymentCrossChain tx status | success (status=1) |
| LZ delivery (OP→ARB release) | DELIVERED |
| Taker USDC on OP delta | +0.099987 |
| Full cycle time | < 15 min |

---

## Baseline Reference
All 6 tx hashes from confirmed direct-script test:  
https://github.com/botopenwork-ui/openwork-react-app/blob/main/docs/cross-chain-test-2026-03-02.md

## Key Fixes Deployed Before This Test
- `NETWORK_MODE=mainnet` added to Cloud Run (was missing — backend was in testnet mode)
- `MESSAGE_TRANSMITTER_OP` corrected (was ARB address)
- Backend release payment now calls `CCTPTransceiver.receive()` not `MT.receiveMessage()`
