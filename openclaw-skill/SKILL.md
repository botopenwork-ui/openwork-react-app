---
name: openwork
description: Interact with the OpenWork decentralized freelancing protocol. Use when the user wants to post jobs, apply to jobs, hire freelancers, create direct contracts, make milestone payments, release escrow, manage disputes, vote on governance proposals, stake OWORK tokens, verify skills, manage profiles, check contract state, or perform any operation on the OpenWork multi-chain platform. Supports Arbitrum, Optimism, and Ethereum.
metadata:
  openclaw:
    emoji: "OW"
    homepage: "https://openwork.xyz"
    requires:
      env:
        - OPTIMISM_RPC_URL
        - ARBITRUM_RPC_URL
        - ETHEREUM_RPC_URL
---

# OpenWork

Interact with the OpenWork decentralized freelancing protocol using natural language. OpenWork connects job givers and job takers across multiple blockchains with USDC payments, escrow protection, on-chain reputation, and decentralized governance.

## Overview

OpenWork is a multi-chain decentralized freelancing platform where:

- **Job givers** post jobs, hire applicants, and pay in USDC with milestone-based escrow
- **Job takers** apply, submit work, and receive payments on their preferred chain
- **Oracle members** verify skills and resolve disputes
- **Token holders** govern the protocol by staking OWORK and voting on proposals

All user actions happen on **Optimism** (low gas fees). The system automatically syncs state to **Arbitrum** (source of truth) via LayerZero messaging, and moves USDC cross-chain via Circle CCTP. Governance and the OWORK token live on **Ethereum**.

## Quick Start

### Prerequisites

- A wallet (MetaMask or similar) connected to Optimism
- USDC on Optimism (for posting jobs or paying)
- Small amount of ETH on Optimism (for gas + LayerZero fees, ~0.0005 ETH per operation)
- OWORK tokens on Ethereum (only needed for staking/governance)

### Chain Configuration

| Chain | Chain ID | Role |
|-------|----------|------|
| Optimism | 10 | User-facing — post jobs, apply, pay, dispute |
| Arbitrum One | 42161 | Backend — stores all state, holds escrow |
| Ethereum | 1 | Governance — staking, voting, OWORK token |

### Key Contract (User Entry Point)

| Contract | Chain | Address |
|----------|-------|---------|
| LOWJC (Local Job Contract) | Optimism | `0x620205A4Ff0E652fF03a890d2A677de878a1dB63` |

Most user actions go through LOWJC on Optimism. The system handles cross-chain messaging automatically.

## Core Capabilities

### 1. Post & Manage Jobs

Create jobs with milestone-based payment structures. Applicants propose their own milestones. Job givers select and fund.

**Key actions:** Post job, apply, start job, submit work, release payment, rate

**Reference:** [references/job-creation-management.md](references/job-creation-management.md)

### 2. Direct Contracts

Skip the posting/application flow. Directly create a contract with a specific person, auto-fund and auto-release the first milestone.

**Key actions:** Create direct contract, lock next milestone, release payment

**Reference:** [references/direct-contracts.md](references/direct-contracts.md)

### 3. USDC Payments & Escrow

All payments use USDC with cross-chain escrow. Funds are locked on Arbitrum and released to the job taker's preferred chain. 1% platform commission.

**Key actions:** Fund milestone, release payment, refund, check escrow balance

**Reference:** [references/payment-system.md](references/payment-system.md)

### 4. Governance & Staking

Stake OWORK tokens on Ethereum to gain voting power. Create and vote on proposals that control the protocol.

**Key actions:** Stake, unstake, delegate, propose, vote

**Reference:** [references/membership-governance.md](references/membership-governance.md)

### 5. Oracle & Skill Verification (Athena)

Decentralized oracle system for verifying freelancer skills and resolving job disputes. Oracle members vote on outcomes.

**Key actions:** Submit skill verification, raise dispute, vote on dispute, finalize

**Reference:** [references/oracle-skill-verification.md](references/oracle-skill-verification.md)

### 6. Rewards & OWORK Token

Earn OWORK tokens by completing jobs. Unlock them by participating in governance. Claim on Ethereum.

**Key actions:** Check earned tokens, sync rewards, claim tokens

**Reference:** [references/rewards-system.md](references/rewards-system.md)

### 7. Profile Management

Create and manage on-chain profiles with IPFS-stored data, portfolio items, and ratings.

**Key actions:** Create profile, update profile, add portfolio, rate users

**Reference:** [references/profile-management.md](references/profile-management.md)

## Common Workflows

### Post a Job and Hire Someone

```
1. Post job on Optimism (LOWJC.postJob) — provide IPFS hash, milestone descriptions, amounts
2. Wait for applicants
3. Review applications (read from Genesis on Arbitrum)
4. Start job (LOWJC.startJob) — approve USDC, fund first milestone
5. Wait for work submission
6. Release payment (LOWJC.releasePaymentCrossChain)
7. Lock next milestone if needed (LOWJC.lockNextMilestone)
8. Repeat 5-7 for each milestone
9. Rate the job taker (LOWJC.rate)
```

### Apply to a Job and Get Paid

```
1. Browse open jobs (read from Genesis)
2. Apply (LOWJC.applyToJob) — provide application hash, proposed milestones, preferred payment chain
3. If selected, submit work (LOWJC.submitWork)
4. Receive USDC on your preferred chain after job giver releases payment
5. Rate the job giver (LOWJC.rate)
```

### Create a Direct Contract

```
1. Approve USDC for first milestone amount
2. Call LOWJC.startDirectContract — specify job taker, milestones, amounts
3. First milestone auto-releases to job taker
4. For subsequent milestones: lockNextMilestone → releasePaymentCrossChain
```

### Stake and Vote on Governance

```
1. Get OWORK tokens on Ethereum
2. Approve OWORK for staking amount
3. Stake (ETHOpenworkDAO.stake) — choose 1-3 year duration
4. Create proposals or vote on existing ones
5. Each governance action unlocks earned reward tokens
```

### Raise a Dispute

```
1. Approve USDC for dispute fee on Optimism
2. Call LocalAthena.raiseDispute — provide job ID and dispute details
3. Oracle members vote on the dispute
4. After voting period, anyone calls finalizeDispute
5. Winner receives the disputed funds
```

## Cross-Chain Architecture

```
User (Optimism)
  ├── LOWJC ──── LayerZero ────→ NOWJC (Arbitrum) ──→ Genesis (state storage)
  ├── USDC ───── Circle CCTP ──→ NOWJC (escrow)
  └── LocalAthena ── LayerZero → NativeAthena (Arbitrum)

Governance (Ethereum)
  ├── ETHOpenworkDAO ── LayerZero ──→ NOWJC (sync governance actions)
  └── ETHRewardsContract ←── LayerZero ── NOWJC (sync claimable rewards)
```

**Reference:** [references/cross-chain-architecture.md](references/cross-chain-architecture.md)

## Key Constants

| Parameter | Value |
|-----------|-------|
| Platform commission | 1% |
| USDC decimals | 6 |
| LayerZero fee per operation | ~0.0005 ETH |
| Minimum stake | 100 OWORK |
| Staking duration | 1-3 years |
| Voting period | 7 days |
| OWORK total supply | 1,000,000,000 |
| Dispute voting period | Set per oracle |

## Contract Addresses

**Reference:** [references/contract-registry.md](references/contract-registry.md)

### Quick Reference (Mainnet)

| Contract | Chain | Address |
|----------|-------|---------|
| LOWJC (user entry) | Optimism | `0x620205A4Ff0E652fF03a890d2A677de878a1dB63` |
| NOWJC (state + escrow) | Arbitrum | `0x8EfbF240240613803B9c9e716d4b5AD1388aFd99` |
| Genesis (storage) | Arbitrum | `0xE8f7963fF3cE9f7dB129e3f619abd71cBB5Bb294` |
| NativeAthena | Arbitrum | `0xE6B9d996b56162cD7eDec3a83aE72943ee7C46Bf` |
| LocalAthena | Optimism | `0x4756294bE516f73e8D1984E7a94E4ABaffA94c4d` |
| ETHOpenworkDAO | Ethereum | `0xE8f7963fF3cE9f7dB129e3f619abd71cBB5Bb294` |
| OWORK Token | Ethereum | `0x765D70496Ef775F6ba1cB7465c2e0B296eB50d87` |
| USDC | Optimism | `0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85` |
| USDC | Arbitrum | `0xaf88d065e77c8cC2239327C5EDb3A432268e5831` |

## Error Handling

Common issues and solutions:

- **"Not job giver"** — Only the job creator can release payments or start jobs
- **"CCTP send failed"** — USDC approval may be insufficient, or CCTPTransceiver issue
- **"Previous not released"** — Must release current milestone before locking the next one
- **"Insufficient balance after CCTP fees"** — CCTP fee deducted more than 0.01% tolerance
- **LayerZero message not delivered** — Check status at `https://scan.layerzero-api.com/v1/messages/tx/{txHash}`

**Reference:** [references/error-reference.md](references/error-reference.md)

## Tips

- Always approve USDC before calling functions that move funds (startJob, lockNextMilestone, startDirectContract)
- Include ~0.0005 ETH as `msg.value` for LayerZero fees on every cross-chain call
- CCTP transfers need a manual `receive()` call on the destination chain to complete — check Circle's attestation API
- Job IDs follow the format `"{lzEid}-{counter}"` (e.g., `"30111-44"` for Optimism job #44)
- All USDC amounts use 6 decimals (e.g., 100 USDC = `100000000`)

## Resources

- Website: https://openwork.xyz
- Contract Registry: [references/contract-registry.md](references/contract-registry.md)
- Full Error Reference: [references/error-reference.md](references/error-reference.md)
