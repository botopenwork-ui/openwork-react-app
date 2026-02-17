# Rewards System

OpenWork rewards users with OWORK tokens for completing jobs. Tokens are earned on Arbitrum, unlocked through governance participation on Ethereum, and claimed on Ethereum.

## Contract Addresses

| Contract | Chain | Address |
|----------|-------|---------|
| NativeRewardsContract | Arbitrum | `0x5E80B57E1C465498F3E0B4360397c79A64A67Ce9` |
| ETHRewardsContract | Ethereum | `0x4756294bE516f73e8D1984E7a94E4ABaffA94c4d` |
| OWORK Token | Ethereum | `0x765D70496Ef775F6ba1cB7465c2e0B296eB50d87` |

## How Earning Works

When a job payment is released, both the job giver and job taker earn OWORK tokens. The amount depends on which reward band the platform is currently in.

### Band System

There are 20 reward bands. Each band covers a range of cumulative platform revenue. As the platform grows, rewards decrease:

| Band | Platform Revenue Range | OWORK per USDC | OWORK per Gov Action |
|------|----------------------|----------------|---------------------|
| 0 | $0 - $100K | 300 | 10,000 |
| 1 | $100K - $200K | 300 | 5,000 |
| 2 | $200K - $400K | 150 | 2,500 |
| 3 | $400K - $800K | 75 | 1,250 |
| ... | Doubles each band | Halves each band | Halves each band |
| 19 | ~$26B - $52B | Minimal | Minimal |

### Earning Flow

```
Job payment released on NOWJC
  → NOWJC._processRewardsForPayment(jobGiver, jobId, netAmount)
    → NativeRewardsContract.processJobPayment(jobGiver, jobTaker, amount, newPlatformTotal)
      → Calculates OWORK for job giver
      → Calculates OWORK for job taker
      → 10% referrer bonus (each side's referrer gets 10% of their earnings)
      → Stores in userBandRewards[]
```

### Referrer Bonus

If a user has a referrer (set during profile creation), the referrer earns **10% of the referred user's token earnings** as a bonus.

## How Unlocking Works

Earned tokens are **not immediately claimable**. They unlock through governance actions (voting, proposing) on the DAO:

```
User votes on DAO proposal (Ethereum)
  → ETHOpenworkDAO sends LZ message to Arbitrum
    → NOWJC.incrementGovernanceAction(user)
      → NativeRewardsContract.recordGovernanceAction(user)
        → Unlocks tokensPerGovernanceAction tokens per band
```

### Claimable Calculation

```
claimable = min(tokensEarned, tokensUnlockedByGovernance) - tokensClaimed
```

## How Claiming Works

Claiming is a three-step cross-chain process:

### Step 1: Sync Rewards (Arbitrum → Ethereum)

```solidity
// On NOWJC (Arbitrum)
function syncRewardsData() external
```

Sends a LayerZero message to `ETHRewardsContract` with the user's claimable balance.

### Step 2: Claim Tokens (Ethereum)

```solidity
// On ETHRewardsContract (Ethereum)
function claimRewards() external
```

Transfers OWORK tokens to the user.

### Step 3: Confirm Claim (Ethereum → Arbitrum)

A LayerZero message is sent back to Arbitrum to update the user's claim data:
```
ETHRewardsContract → LZ → NOWJC.handleUpdateUserClaimData()
```

## Voting Power from Rewards

Earned rewards contribute to voting power in the DAO:

```solidity
function getRewardBasedVotingPower(address user) external view returns (uint256)
// Returns: userTotalTokensEarned + teamTokensAllocated
```

Voting power is synced to ETH DAO via:
```solidity
function syncVotingPower() external  // Sends LZ message to ETHOpenworkDAO
```

## Team Tokens

A separate pool for team members:

| Parameter | Value |
|-----------|-------|
| Team token pool | 150,000,000 OWORK |
| Unlock per gov action | 150,000 OWORK |

### Allocate Team Tokens

```solidity
function allocateTeamTokens(
    address[] memory members,
    uint256[] memory amounts
) external  // Owner or DAO only
```

- Team allocation counts toward voting power immediately
- Tokens still require governance actions to unlock for claiming

## Token Supply Summary

| Allocation | Amount | Percentage |
|-----------|--------|------------|
| ETHRewardsContract (job rewards) | 750,000,000 OWORK | 75% |
| ETHOpenworkDAO (governance treasury) | 250,000,000 OWORK | 25% |
| **Total** | **1,000,000,000 OWORK** | **100%** |

## Common Workflows

### Check Your Earnings

Query `NativeRewardsContract` on Arbitrum for:
- `userTotalTokensEarned` — Total OWORK earned
- `userTotalTokensClaimed` — Already claimed
- Claimable = earned minus claimed (capped by governance unlocks)

### Claim Your Tokens

```
1. Call NOWJC.syncRewardsData() on Arbitrum (pays LZ fee)
2. Wait for LZ message to reach Ethereum
3. Call ETHRewardsContract.claimRewards() on Ethereum
4. OWORK tokens transferred to your address
```

### Maximize Earnings

- Complete more jobs to earn more tokens (both givers and takers earn)
- Participate in governance (vote, propose) to unlock earned tokens faster
- Refer others — earn 10% of their token earnings
- Stake for longer duration for more voting power per token
