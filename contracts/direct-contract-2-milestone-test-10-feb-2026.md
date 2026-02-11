# Direct Contract 2-Milestone Test Session

**Date**: February 10, 2026
**Network**: Mainnet (Optimism + Arbitrum One)
**Objective**: Test `startDirectContract` with 2 milestones, investigate release flow and CCTP completion

---

## Contract Addresses

| Contract | Chain | Address |
|----------|-------|---------|
| LOWJC Proxy | Optimism | `0x620205A4Ff0E652fF03a890d2A677de878a1dB63` |
| LocalLZOpenworkBridge | Optimism | `0x74566644782e98c87a12E8Fc6f7c4c72e2908a36` |
| CCTPTransceiver | Optimism | `0x586C700ACFA1D129Ba2C6a6E673c55d586c32f15` |
| USDC | Optimism | `0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85` |
| NOWJC Proxy | Arbitrum | `0x8EfbF240240613803B9c9e716d4b5AD1388aFd99` |
| NativeLZOpenworkBridge | Arbitrum | `0x1bC57d93eC9F9214EDe2e81281A26Ac0E01A9A5F` |
| CCTPTransceiver | Arbitrum | `0x765D70496Ef775F6ba1cB7465c2e0B296eB50d87` |
| USDC | Arbitrum | `0xaf88d065e77c8cC2239327C5EDb3A432268e5831` |

## Wallet Addresses

| Role | Address |
|------|---------|
| Caller / Job Giver | `0x7a2B7feAB9b0e30A5368d3CC4CB8279c9606384C` |
| Job Taker | `0x93514040f43aB16D52faAe7A3f380c4089D844F9` |

## Job Parameters

| Parameter | Value |
|-----------|-------|
| Job ID | `30111-27` (chainId=30111, counter incremented from 26 to 27) |
| Milestones | 2 |
| Milestone 1 | 0.1 USDC (100,000 raw) |
| Milestone 2 | 0.1 USDC (100,000 raw) |
| Job Taker Chain Domain | 2 (Optimism) |
| Job Detail Hash | `test-direct-2ms` |

---

## Step 1: Approve USDC for LOWJC

**Command**:
```bash
source .env && cast send 0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85 \
  "approve(address,uint256)" \
  0x620205A4Ff0E652fF03a890d2A677de878a1dB63 \
  100000 \
  --rpc-url $OPTIMISM_MAINNET_RPC_URL \
  --private-key <KEY>
```

**Status**: Success

---

## Step 2: Call `startDirectContract` on LOWJC (Optimism)

**Command**:
```bash
source .env && cast send 0x620205A4Ff0E652fF03a890d2A677de878a1dB63 \
  "startDirectContract(address,string,string[],uint256[],uint32,bytes)" \
  0x93514040f43aB16D52faAe7A3f380c4089D844F9 \
  "test-direct-2ms" \
  "[\"milestone-1\",\"milestone-2\"]" \
  "[100000,100000]" \
  2 \
  0x000301001101000000000000000000000000000f4240 \
  --value 0.0005ether \
  --rpc-url $OPTIMISM_MAINNET_RPC_URL \
  --private-key <KEY>
```

**OP TX**: `0x6759a71b6c723fc71565c8e4492478be487f7b579859dc5afb758b9e33cb78e6`
**Status**: Success

**What this does**:
1. Creates job `30111-27` on LOWJC with 2 milestones
2. Locks first milestone (0.1 USDC) - sends via CCTP from OP to Arb (cctpMintRecipient = NOWJC proxy)
3. Sends LayerZero message to NativeLZOpenworkBridge on Arbitrum with `startDirectContract` payload
4. LZ options: 1,000,000 gas for `handleStartDirectContract` on Arb

**LZ Options breakdown**: `0x000301001101000000000000000000000000000f4240`
- `0003` = Options Type 3
- `01` = Worker ID (Executor)
- `0011` = Option length (17 bytes)
- `01` = lzReceive option type
- `000000000000000000000000000f4240` = 1,000,000 gas (uint128)

---

## Step 3: Check LayerZero Message Delivery

**Command**:
```bash
curl -s "https://scan.layerzero-api.com/v1/messages/tx/0x6759a71b6c723fc71565c8e4492478be487f7b579859dc5afb758b9e33cb78e6" | jq '{
  status: .data[0].status.name,
  source: .data[0].source.status,
  destination: .data[0].destination.status,
  dst_tx: .data[0].destination.tx.txHash
}'
```

**Result**:
```json
{
  "status": "DELIVERED",
  "source": "SUCCEEDED",
  "destination": "SUCCEEDED",
  "dst_tx": "0x8996cb399b0ea10d375a1facced14f643bd42e49664e48c276434b411579fa9a"
}
```

**Arbitrum Destination TX**: `0x8996cb399b0ea10d375a1facced14f643bd42e49664e48c276434b411579fa9a`

---

## Step 4: Check CCTP Attestation Status

The NOWJC Arb tx triggered a CCTP transfer from Arb → OP (releasing USDC to the job taker).

**Command**:
```bash
curl -s "https://iris-api.circle.com/v2/messages/3?transactionHash=0x8996cb399b0ea10d375a1facced14f643bd42e49664e48c276434b411579fa9a" | jq '.'
```

**Key**: Domain = `3` (Arbitrum = source chain for this CCTP transfer)

**Result**: Status = `complete`

**CCTP Transfer Details**:
| Field | Value |
|-------|-------|
| Source Domain | 3 (Arbitrum) |
| Destination Domain | 2 (Optimism) |
| Burn Token | `0xaf88d065e77c8cc2239327c5edb3a432268e5831` (USDC on Arb) |
| Mint Recipient | `0x93514040f43ab16d52faae7a3f380c4089d844f9` (Job Taker) |
| Amount | 100,000 (0.1 USDC) |
| Message Sender | `0x765d70496ef775f6ba1cb7465c2e0b296eb50d87` (CCTPTransceiver on Arb) |
| Max Fee | 1,000 |
| Fee Executed | 13 |

**CCTP Message**: `0x000000010000000300000002f2e322dfc9b41761903ca60db54768a89076a632c1feea3cf643147f89de04cf00000000000000000000000028b5a0e9c621a5badaa536219b3a228c8168cf5d00000000000000000000000028b5a0e9c621a5badaa536219b3a228c8168cf5d0000000000000000000000000000000000000000000000000000000000000000000003e8000003e800000001000000000000000000000000af88d065e77c8cc2239327c5edb3a432268e583100000000000000000000000093514040f43ab16d52faae7a3f380c4089d844f900000000000000000000000000000000000000000000000000000000000186a0000000000000000000000000765d70496ef775f6ba1cb7465c2e0b296eb50d8700000000000000000000000000000000000000000000000000000000000003e8000000000000000000000000000000000000000000000000000000000000000d0000000000000000000000000000000000000000000000000000000008cc48d5`

**CCTP Attestation**: `0x74d6a1eeceb5c00f9ccd15c3b0913e94ce9f72b89b1384e34e9f00996fd0a0092c5144f1b947113928079193dcf045356ec60cd3ac2601eaa07f781c13d4a1811b159ef07a0ef5fe1eb63d5ee46d91e0d85b5c2e1cd4ac254720efb2998e2c07e44de5061bb1c5cec77aa75a1df5bf8a508b4f4aef5d0c4f4f774d94c5e0952d9f1c`

---

## Step 5: Complete CCTP Receive on Optimism

**Command**:
```bash
source .env && cast send 0x586C700ACFA1D129Ba2C6a6E673c55d586c32f15 \
  "receive(bytes,bytes)" \
  0x000000010000000300000002f2e322dfc9b41761903ca60db54768a89076a632c1feea3cf643147f89de04cf00000000000000000000000028b5a0e9c621a5badaa536219b3a228c8168cf5d00000000000000000000000028b5a0e9c621a5badaa536219b3a228c8168cf5d0000000000000000000000000000000000000000000000000000000000000000000003e8000003e800000001000000000000000000000000af88d065e77c8cc2239327c5edb3a432268e583100000000000000000000000093514040f43ab16d52faae7a3f380c4089d844f900000000000000000000000000000000000000000000000000000000000186a0000000000000000000000000765d70496ef775f6ba1cb7465c2e0b296eb50d8700000000000000000000000000000000000000000000000000000000000003e8000000000000000000000000000000000000000000000000000000000000000d0000000000000000000000000000000000000000000000000000000008cc48d5 \
  0x74d6a1eeceb5c00f9ccd15c3b0913e94ce9f72b89b1384e34e9f00996fd0a0092c5144f1b947113928079193dcf045356ec60cd3ac2601eaa07f781c13d4a1811b159ef07a0ef5fe1eb63d5ee46d91e0d85b5c2e1cd4ac254720efb2998e2c07e44de5061bb1c5cec77aa75a1df5bf8a508b4f4aef5d0c4f4f774d94c5e0952d9f1c \
  --rpc-url $OPTIMISM_MAINNET_RPC_URL \
  --private-key <KEY>
```

**Contract**: CCTPTransceiver on OP (`0x586C700ACFA1D129Ba2C6a6E673c55d586c32f15`)
**Function**: `receive(bytes message, bytes attestation)`
**Status**: Success

---

## Step 6: Approve USDC for Milestone 2

**Command**:
```bash
source .env && cast send 0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85 \
  "approve(address,uint256)" \
  0x620205A4Ff0E652fF03a890d2A677de878a1dB63 \
  100000 \
  --rpc-url $OPTIMISM_MAINNET_RPC_URL \
  --private-key <KEY>
```

**Status**: Success

---

## Step 7: Call `lockNextMilestone` on LOWJC (Optimism)

**Command**:
```bash
source .env && cast send 0x620205A4Ff0E652fF03a890d2A677de878a1dB63 \
  "lockNextMilestone(string,bytes)" \
  "30111-27" \
  0x000301001101000000000000000000000000000f4240 \
  --value 0.0005ether \
  --rpc-url $OPTIMISM_MAINNET_RPC_URL \
  --private-key <KEY>
```

**OP TX**: `0xee9ac9ff96622c996c95420f072ea476bdb8ad374dd5ae950f51686bb619fb35`
**Status**: Success

**What this does**:
1. Locks milestone 2 (0.1 USDC) on LOWJC
2. Sends USDC via CCTP from OP to Arb (cctpMintRecipient = NOWJC proxy)
3. Sends LayerZero message to NativeLZOpenworkBridge on Arbitrum with `lockNextMilestone` payload
4. LZ options: 1,000,000 gas

---

## Step 8: Call `releasePaymentCrossChain` on LOWJC (Optimism)

**Command**:
```bash
source .env && cast send 0x620205A4Ff0E652fF03a890d2A677de878a1dB63 \
  "releasePaymentCrossChain(string,uint32,address,bytes)" \
  "30111-27" \
  2 \
  0x93514040f43aB16D52faAe7A3f380c4089D844F9 \
  0x0003010011010000000000000000000000000007a120 \
  --value 0.0005ether \
  --rpc-url $OPTIMISM_MAINNET_RPC_URL \
  --private-key <KEY>
```

**OP TX**: `0xb4b0ddf09728f30a54f64e294a55522e4ed054c94e6b5bebc5bac03d37f72e1b`
**Status**: Success

**What this does**:
1. Sends LayerZero message to NOWJC on Arbitrum to release milestone 2 payment
2. NOWJC releases 0.1 USDC via CCTP from Arb to OP (to job taker)
3. LZ options: 500,000 gas (`0x7a120`)
4. Params: jobId=`30111-27`, destDomain=`2` (OP), recipient=job taker

**LZ Delivery**:
```json
{
  "status": "DELIVERED",
  "source": "SUCCEEDED",
  "destination": "SUCCEEDED",
  "dst_tx": "0x312180efcd3dfcec9ce6092387111425e67fb37d05694559d9013dffb096533b"
}
```

**Arbitrum Destination TX**: `0x312180efcd3dfcec9ce6092387111425e67fb37d05694559d9013dffb096533b`

---

## Step 9: Check CCTP Attestation for Milestone 2

**Command**:
```bash
curl -s "https://iris-api.circle.com/v2/messages/3?transactionHash=0x312180efcd3dfcec9ce6092387111425e67fb37d05694559d9013dffb096533b" | jq '.'
```

**Key**: Domain = `3` (Arbitrum = source chain for this CCTP transfer)

**Result**: Status = `complete`

**CCTP Transfer Details**:
| Field | Value |
|-------|-------|
| Source Domain | 3 (Arbitrum) |
| Destination Domain | 2 (Optimism) |
| Burn Token | `0xaf88d065e77c8cc2239327c5edb3a432268e5831` (USDC on Arb) |
| Mint Recipient | `0x93514040f43ab16d52faae7a3f380c4089d844f9` (Job Taker) |
| Amount | 100,000 (0.1 USDC) |
| Message Sender | `0x765d70496ef775f6ba1cb7465c2e0b296eb50d87` (CCTPTransceiver on Arb) |
| Max Fee | 1,000 |
| Fee Executed | 13 |

**CCTP Message**: `0x0000000100000003000000023294e502264e1aa7fdfa65b11c41601dd9f9575b4cf13c2ee34ab0d25563dac000000000000000000000000028b5a0e9c621a5badaa536219b3a228c8168cf5d00000000000000000000000028b5a0e9c621a5badaa536219b3a228c8168cf5d0000000000000000000000000000000000000000000000000000000000000000000003e8000003e800000001000000000000000000000000af88d065e77c8cc2239327c5edb3a432268e583100000000000000000000000093514040f43ab16d52faae7a3f380c4089d844f900000000000000000000000000000000000000000000000000000000000186a0000000000000000000000000765d70496ef775f6ba1cb7465c2e0b296eb50d8700000000000000000000000000000000000000000000000000000000000003e8000000000000000000000000000000000000000000000000000000000000000d0000000000000000000000000000000000000000000000000000000008cc4b89`

**CCTP Attestation**: `0x36efd545c252bc4318cae293213a56f3a4ea8c31625c0e4777cea0854ef90a2d0bf26e4caf41434b41b0dffbf725545ce7c7888f6497bd13356377f019062ecd1cc78d63c881c403879a449e4b036228f0cb501f71920115938c4f4d98750f17293c9de4283d8d902ae217f1de7bfcefc6761fde77cb0a3ccc6709091331878cb71b`

---

## Step 10: Complete CCTP Receive on Optimism (Milestone 2)

**Command**:
```bash
source .env && cast send 0x586C700ACFA1D129Ba2C6a6E673c55d586c32f15 \
  "receive(bytes,bytes)" \
  0x0000000100000003000000023294e502264e1aa7fdfa65b11c41601dd9f9575b4cf13c2ee34ab0d25563dac000000000000000000000000028b5a0e9c621a5badaa536219b3a228c8168cf5d00000000000000000000000028b5a0e9c621a5badaa536219b3a228c8168cf5d0000000000000000000000000000000000000000000000000000000000000000000003e8000003e800000001000000000000000000000000af88d065e77c8cc2239327c5edb3a432268e583100000000000000000000000093514040f43ab16d52faae7a3f380c4089d844f900000000000000000000000000000000000000000000000000000000000186a0000000000000000000000000765d70496ef775f6ba1cb7465c2e0b296eb50d8700000000000000000000000000000000000000000000000000000000000003e8000000000000000000000000000000000000000000000000000000000000000d0000000000000000000000000000000000000000000000000000000008cc4b89 \
  0x36efd545c252bc4318cae293213a56f3a4ea8c31625c0e4777cea0854ef90a2d0bf26e4caf41434b41b0dffbf725545ce7c7888f6497bd13356377f019062ecd1cc78d63c881c403879a449e4b036228f0cb501f71920115938c4f4d98750f17293c9de4283d8d902ae217f1de7bfcefc6761fde77cb0a3ccc6709091331878cb71b \
  --rpc-url $OPTIMISM_MAINNET_RPC_URL \
  --private-key <KEY>
```

**Contract**: CCTPTransceiver on OP (`0x586C700ACFA1D129Ba2C6a6E673c55d586c32f15`)
**Function**: `receive(bytes message, bytes attestation)`
**Status**: Success

---

## Key Observations

### 1. NOWJC auto-released milestone 1 during `handleStartDirectContract`
The Arbitrum LZ destination tx (`0x8996cb...`) included a CCTP transfer from NOWJC to the job taker. This means the `handleStartDirectContract` execution on NOWJC automatically released the first milestone payment via CCTP to the job taker on OP. This was NOT a separate `releasePaymentCrossChain` call.

### 2. NOWJC used existing balance for the release
NOWJC had ~0.699834 USDC from previous operations. The release of 0.1 USDC (100,000 raw) came from this existing balance, not from the OP→Arb CCTP transfer (which may not have been received yet).

### 3. CCTP fee was minimal
The CCTP V2 fast transfer fee was only 13 units (0.000013 USDC) out of the 1,000 maxFee.

---

## Pre-Test State Checks

| Check | Value |
|-------|-------|
| NOWJC USDC balance (before) | 699,834 (0.699834 USDC) |
| NOWJC accumulatedCommission | 0 |
| cctpMintRecipient balance | 0 |
| LOWJC jobCounter (before) | 26 |
| LOWJC chainId | 30111 |
| LOWJC cctpSender | `0x586C700ACFA1D129Ba2C6a6E673c55d586c32f15` |
| LOWJC cctpMintRecipient | `0x8EfbF240240613803B9c9e716d4b5AD1388aFd99` (= NOWJC proxy) |
| Caller USDC balance | 1,753,614 (1.75 USDC) |
| Caller ETH balance (OP) | ~0.0014 ETH |

---

## Bugs Identified During Code Review

### Bug 1: Double Commission in `releasePaymentCrossChain` (NOWJC)
`accumulatedCommission += commission` appears at line 894 AND inside `_finalizePayment` at line 963. Commission is double-counted.

### Bug 2: No balance check in `releasePaymentAndLockNext` (NOWJC)
Unlike `releasePaymentCrossChain` which checks `actualBalance >= _amount`, `releasePaymentAndLockNext` blindly attempts the transfer.

### Bug 3: Malformed LZ Options caused revert
Initial command used `0x00030100110100000000000000000000000000000f4240` (23 bytes - extra `00` in gas uint128). Correct is `0x000301001101000000000000000000000000000f4240` (22 bytes).

---

## Completed Steps Summary

- [x] Confirm CCTP receive on OP (Step 5) - Milestone 1 delivered to job taker
- [x] Test milestone 2: `lockNextMilestone` (Step 7) + `releasePaymentCrossChain` (Step 8)
- [x] CCTP attestation for milestone 2 (Step 9) - Status: complete
- [x] CCTP receive on OP for milestone 2 (Step 10) - Milestone 2 delivered to job taker

## Remaining Investigation

- [ ] Verify job taker received both 0.1 USDC payments on OP
- [ ] Check NOWJC balance after the full flow
- [ ] Check job state on LOWJC and NOWJC (Genesis)
- [ ] Investigate why `handleStartDirectContract` triggered auto-release (check NOWJC V2 impl)
- [ ] Fix Bug 1: Double commission in `releasePaymentCrossChain`
- [ ] Fix Bug 2: Add balance check in `releasePaymentAndLockNext`
