# Membership & Governance

OpenWork governance uses the OWORK token on Ethereum. Members stake tokens to gain voting power, create proposals, and vote on protocol changes. Governance actions are synced cross-chain to Arbitrum to unlock reward tokens.

## Contract Addresses

| Contract | Chain | Address |
|----------|-------|---------|
| ETHOpenworkDAO | Ethereum | `0xE8f7963fF3cE9f7dB129e3f619abd71cBB5Bb294` |
| OWORK Token | Ethereum | `0x765D70496Ef775F6ba1cB7465c2e0B296eB50d87` |

## OWORK Token

| Property | Value |
|----------|-------|
| Name | OpenWorkToken |
| Symbol | OWORK |
| Total supply | 1,000,000,000 (1 billion) |
| Decimals | 18 |
| Standard | ERC20 + ERC20Permit + ERC20Votes |

**Distribution:**
- 750,000,000 (75%) → ETHRewardsContract (earned through jobs)
- 250,000,000 (25%) → ETHOpenworkDAO (governance treasury)

## Staking

Stake OWORK tokens to gain voting power and participate in governance.

```solidity
function stake(
    uint256 amount,
    uint256 durationYears,      // 1, 2, or 3
    bytes calldata _options      // LZ options for cross-chain sync
) external payable nonReentrant
```

### Requirements

| Parameter | Value |
|-----------|-------|
| Minimum stake | 100 OWORK (100 * 10^18) |
| Duration options | 1, 2, or 3 years |
| Lock period | `durationYears * 365 days` |
| Limit | One active stake per user |

### Voting Power from Staking

```
votingPower = stakeAmount * durationYears
```

Example: Staking 1000 OWORK for 3 years = 3000 voting power.

### Before Staking

Approve OWORK tokens first:
```solidity
OWORK.approve(ETHOpenworkDAO_ADDRESS, amount)
```

## Unstaking

Unstaking is a **two-step process** with a cooldown:

```solidity
function unstake(bytes calldata _options) external payable nonReentrant
```

1. **First call** (after lock period expires) → sets `unstakeRequestTime`
2. **Second call** (after 7-day delay) → returns tokens to user

| Parameter | Test Value | Production Value |
|-----------|-----------|-----------------|
| Unstake delay | 24 hours | 7 days |

## Slashing

Governance can slash a staker's tokens:

```solidity
function removeStake(
    address staker,
    uint256 removeAmount,
    bytes calldata _options
) external payable onlyGovernance
```

## Voting Power

Total voting power combines three sources:

```
totalVotingPower = (stakeAmount * durationYears)
                 + userTotalRewards (synced from Arbitrum)
                 + delegatedVotingPower
```

## Delegation

Delegate your voting power to another address:

```solidity
function delegate(address delegatee) external
```

- Your voting power is added to the delegatee's
- Only works if you have an active stake
- You can change delegation at any time

## Proposals

Create a governance proposal:

```solidity
function propose(
    address[] memory targets,
    uint256[] memory values,
    bytes[] memory calldatas,
    string memory description
) public override returns (uint256)
```

### Governance Parameters

| Parameter | Test Value | Production Value |
|-----------|-----------|-----------------|
| Proposal threshold | 100 OWORK | 100 OWORK |
| Voting threshold | 50 OWORK | 50 OWORK |
| Voting delay | 1 minute | 1 day |
| Voting period | 5 minutes | 7 days |
| Quorum | 50 OWORK | 50 OWORK |

### Proposal Lifecycle

```
Propose → Voting Delay → Active Voting → Succeeded/Defeated → Queue → Execute
```

## Voting

Vote on an active proposal:

```solidity
function castVote(uint256 proposalId, uint8 support) public returns (uint256)
```

| Support Value | Meaning |
|--------------|---------|
| 0 | Against |
| 1 | For |
| 2 | Abstain |

## Cross-Chain Governance Sync

When a user votes or creates a proposal, the action is synced to Arbitrum:

```
ETHOpenworkDAO
  → ETHLZOpenworkBridge
    → [LayerZero]
      → NativeBridge on Arbitrum
        → NOWJC.incrementGovernanceAction(user)
```

This increments the user's governance action count, which **unlocks earned OWORK tokens** in the rewards system. Every governance action you take unlocks more of your earned tokens.

## Common Workflows

### Stake and Start Governing

```
1. Get OWORK tokens on Ethereum
2. OWORK.approve(ETHOpenworkDAO, amount)
3. ETHOpenworkDAO.stake(amount, durationYears, lzOptions, { value: lzFee })
4. Wait for voting delay on proposals
5. ETHOpenworkDAO.castVote(proposalId, 1)  // Vote "For"
```

### Create a Proposal

```
1. Must have >= 100 OWORK voting power
2. ETHOpenworkDAO.propose(targets, values, calldatas, description)
3. Wait for voting delay (1 day in production)
4. Voting period begins (7 days in production)
5. If quorum met and majority votes For → Succeeded
```

### Unstake Tokens

```
1. Wait for lock period to expire (1-3 years)
2. ETHOpenworkDAO.unstake(lzOptions, { value: lzFee })  // Starts cooldown
3. Wait 7 days (production)
4. ETHOpenworkDAO.unstake(lzOptions, { value: lzFee })  // Returns tokens
```
