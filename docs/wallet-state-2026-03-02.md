# Service Wallet State — 2026-03-02 (16:48 IST)

## Service Wallet
**Address:** `0xb8dC69937e745Fd02661BC4333f3852166eF2026`  
**Key location:** Cloud Run env var `WALL2_PRIVATE_KEY` — never on disk

## Balances

| Chain | ETH | USDC |
|-------|-----|------|
| Ethereum mainnet | 0.010076 ETH | 0.0 |
| **Optimism** | **0.000951 ETH** ⚠️ low | **1.657188 USDC** |
| **Arbitrum** | **0.000559 ETH** ⚠️ low | **3.803601 USDC** |

⚠️ Both OP and ARB ETH below 0.003 threshold — top-up needed before heavy testing

## Contract State

| Contract | Value |
|----------|-------|
| LOWJC job counter (OP) | 93 → next job = `30111-94` |
| NOWJC residual USDC (ARB) | 7.118937 USDC (accumulated from tests) |

## Taker Wallet (Anas deployer)
**Address:** `0x7a2B7feAB9b0e30A5368d3CC4CB8279c9606384C`  
USDC on OP: 0.274362

## Context
- Last confirmed test: Job `30111-93` — full OP→ARB→OP CCTP + LZ cycle ✅
- Doc: https://github.com/botopenwork-ui/openwork-react-app/blob/main/docs/cross-chain-test-2026-03-02.md
- Next action: Repeat the same cycle via the UI (frontend)
