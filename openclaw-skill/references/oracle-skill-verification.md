# Oracle & Skill Verification (Athena)

NativeAthena is OpenWork's decentralized oracle system on Arbitrum. It handles skill verification for freelancers, job dispute resolution, and general "Ask Athena" queries. LocalAthena on Optimism is the user-facing client that forwards requests.

## Contract Addresses

| Contract | Chain | Address |
|----------|-------|---------|
| NativeAthena | Arbitrum | `0xE6B9d996b56162cD7eDec3a83aE72943ee7C46Bf` |
| LocalAthena | Optimism | `0x4756294bE516f73e8D1984E7a94E4ABaffA94c4d` |
| NativeAthenaOracleManager | Arbitrum | `0xEdF3Bcf87716bE05e35E12bA7C0Fc6e1879c0f15` |
| NativeAthenaActivityTracker | Arbitrum | `0x8C04840c3f5b5a8c44F9187F9205ca73509690EA` |

## Three Functions of Athena

| Function | Purpose |
|----------|---------|
| **Skill Verification** | Verify a freelancer's skills through oracle voting |
| **Job Disputes** | Resolve disputes between job givers and job takers |
| **Ask Athena** | General queries submitted to oracle members |

## Who Can Vote?

```solidity
function canVote(address _voter) public view returns (bool)
```

A user can vote if they have at least one of:
- Reward-based voting power > 0 (earned through job payments)
- Active stake in the DAO
- Team token allocation > 0

## Skill Verification

### Submit a Skill Verification Application

**Who:** Freelancer
**Chain:** Optimism (via LocalAthena)

```solidity
function submitSkillVerification(
    address _applicant,
    string memory _applicationHash,     // IPFS hash of verification details
    uint256 _feeAmount,                 // USDC fee for the oracle
    string memory _targetOracleName     // Which oracle to submit to
) external
```

**Flow:**
1. User submits on LocalAthena (Optimism), pays USDC fee
2. Fee sent via CCTP to NativeAthena on Arbitrum
3. Oracle members review and vote
4. After voting period, result is finalized

### Vote on Skill Verification

**Who:** Oracle members
**Chain:** Arbitrum (via NativeAthena)

```solidity
function voteOnSkillVerification(
    address _voter,
    uint256 _applicationId,
    bool _voteFor,                      // true = approve, false = reject
    address _claimAddress,              // Where voter wants their fee share
    uint32 _claimChainDomain            // CCTP domain for fee payment
) external
```

### Finalize Skill Verification

**Who:** Anyone (after voting period ends)
**Chain:** Arbitrum

```solidity
function finalizeSkillVerification(uint256 _applicationId) external
```

## Job Disputes

### Raise a Dispute

**Who:** Either party in a job (job giver or job taker)
**Chain:** Optimism (via LocalAthena)

```solidity
function raiseDispute(
    address _disputeRaiser,
    string memory _jobId,
    string memory _disputeHash,         // IPFS hash of dispute details
    uint256 _disputeFee                 // USDC fee
) external
```

**Flow:**
1. User raises dispute on LocalAthena, pays USDC fee
2. Fee sent via CCTP to NativeAthena on Arbitrum
3. Oracle members vote on the outcome
4. After voting period, dispute is finalized
5. Winner receives the disputed escrow funds

### Vote on a Dispute

**Who:** Oracle members
**Chain:** Arbitrum

```solidity
function voteOnDispute(
    address _voter,
    string memory _disputeId,
    bool _voteFor,                      // true = in favor of dispute raiser
    address _claimAddress,
    uint32 _claimChainDomain
) external
```

### Finalize a Dispute

**Who:** Anyone (after voting period)
**Chain:** Arbitrum

```solidity
function finalizeDispute(string memory _disputeId) external
```

**After finalization:**
- Result sent back to LocalAthena via LayerZero
- Winner receives disputed funds via `NOWJC.releaseDisputedFunds()`
- Oracle voters who voted with the majority receive their share of the fee

## Ask Athena

General queries submitted to oracle members for answers.

### Submit a Query

```solidity
function askAthena(
    address _applicant,
    string memory _description,
    string memory _hash,                // IPFS hash of query details
    string memory _targetOracle,        // Which oracle to ask
    string memory _fees                 // Fee structure
) external
```

### Vote on Ask Athena

```solidity
function voteOnAskAthena(
    address _voter,
    uint256 _athenaId,
    bool _voteFor,
    address _claimAddress,
    uint32 _claimChainDomain
) external
```

### Finalize Ask Athena

```solidity
function finalizeAskAthena(uint256 _athenaId) external
```

## Oracle Management

Oracles are groups of qualified members who vote on verifications and disputes.

### Create an Oracle

```solidity
function addSingleOracle(
    string memory _name,
    address[] memory _members,
    string memory _shortDescription,
    string memory _hashOfDetails,           // IPFS hash of oracle details
    address[] memory _skillVerifiedAddresses
) external
```

### Add Members to an Oracle

```solidity
function addMembers(address[] memory _members, string memory _oracleName) external
```

### Remove a Member

```solidity
function removeMemberFromOracle(string memory _oracleName, address _memberToRemove) external
```

## Activity Tracking

The NativeAthenaActivityTracker monitors oracle member activity:

- Tracks `memberLastActivity` timestamps
- **90-day threshold** — members inactive for 90+ days lose active status
- Activity updated when members vote or perform oracle actions

## Dispute Resolution Flow (Complete)

```
1. User calls raiseDispute() on LocalAthena (Optimism)
   → Pays USDC dispute fee
   → Fee sent via CCTP to NativeAthena (Arbitrum)

2. Oracle members call voteOnDispute() on NativeAthena (Arbitrum)
   → Vote for or against the dispute raiser

3. Anyone calls finalizeDispute() after voting period (Arbitrum)
   → Counts votes, determines outcome

4. Result sent back to LocalAthena via LayerZero

5. Winner receives disputed funds:
   → NOWJC.releaseDisputedFunds() sends USDC via CCTP to winner's chain

6. Oracle voters on winning side receive fee share
```
