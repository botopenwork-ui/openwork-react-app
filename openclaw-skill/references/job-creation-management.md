# Job Creation & Management

Jobs are the core of OpenWork. Job givers post jobs on Optimism, applicants apply, and the system handles milestone-based payments with cross-chain escrow.

## How Jobs Work

- Jobs are created on **Optimism** via the LOWJC contract
- Full job state is stored on **Arbitrum** in the Genesis contract
- LOWJC stores only minimal data (job giver, status, locked amounts)
- All cross-chain messaging is automatic via LayerZero

## Job Lifecycle

```
Post Job → Apply → Start Job (fund) → Submit Work → Release Payment → Rate
                                          ↕ (repeat for each milestone)
```

## Contract Addresses

| Contract | Chain | Address |
|----------|-------|---------|
| LOWJC | Optimism | `0x620205A4Ff0E652fF03a890d2A677de878a1dB63` |
| NOWJC | Arbitrum | `0x8EfbF240240613803B9c9e716d4b5AD1388aFd99` |
| Genesis | Arbitrum | `0xE8f7963fF3cE9f7dB129e3f619abd71cBB5Bb294` |

## Job Statuses

| Status | Meaning |
|--------|---------|
| Open | Job posted, accepting applications |
| InProgress | Applicant selected, work underway |
| Completed | All milestones done |
| Cancelled | Job cancelled |

## Job ID Format

Job IDs follow the pattern `"{lzEid}-{counter}"`:
- `"30111-44"` = Optimism (EID 30111), job #44
- `"40232-12"` = Optimism Sepolia (EID 40232), job #12

## Step 1: Post a Job

**Who:** Job giver
**Chain:** Optimism
**Prerequisites:** ETH for gas + LZ fee (~0.0005 ETH)

```solidity
function postJob(
    string memory _jobDetailHash,      // IPFS hash of job details
    string[] memory _descriptions,      // Milestone description hashes
    uint256[] memory _amounts,          // Milestone amounts in USDC (6 decimals)
    bytes calldata _nativeOptions       // LZ gas options
) external payable
```

**Example:** Post a job with 2 milestones of 500 USDC each:
```
_jobDetailHash: "QmXy..." (IPFS hash)
_descriptions: ["QmDesign...", "QmDevelop..."]
_amounts: [500000000, 500000000]  // 500 USDC each (6 decimals)
_nativeOptions: 0x0003010011010000000000000000000000000007a120
msg.value: 0.0005 ETH
```

**What happens:**
1. LOWJC generates job ID (e.g., `"30111-44"`)
2. Stores minimal local state (jobGiver, status=Open, milestoneAmounts)
3. Sends LayerZero message to NOWJC on Arbitrum
4. NOWJC stores full job data in Genesis

## Step 2: Apply to a Job

**Who:** Job taker
**Chain:** Optimism
**Prerequisites:** ETH for gas + LZ fee

```solidity
function applyToJob(
    string calldata _jobId,
    string calldata _applicationHash,     // IPFS hash of application
    string[] calldata _descriptions,       // Proposed milestone descriptions
    uint256[] calldata _amounts,           // Proposed milestone amounts
    uint32 _preferredPaymentChainDomain,   // CCTP domain (2=OP, 3=Arb)
    address _preferredPaymentAddress,      // Where to receive payment
    bytes calldata _nativeOptions
) external payable
```

**Notes:**
- Applicants can propose different milestones than the job giver posted
- `_preferredPaymentChainDomain`: Use `2` for Optimism, `3` for Arbitrum
- Application is forwarded entirely to Arbitrum (no local state change)
- NOWJC assigns an `applicationId` on Arbitrum

## Step 3: Start a Job (Select Applicant + Fund)

**Who:** Job giver
**Chain:** Optimism
**Prerequisites:** USDC approval for first milestone amount + ETH for gas/LZ

```solidity
function startJob(
    string memory _jobId,
    uint256 _applicationId,
    bool _useApplicantMilestones,    // true = use applicant's proposed milestones
    bytes calldata _nativeOptions
) external payable nonReentrant
```

**What happens:**
1. Requires USDC approval for first milestone amount
2. Transfers USDC from job giver and sends via CCTP to NOWJC on Arbitrum
3. Sets `currentMilestone = 1`, `currentLockedAmount = firstMilestoneAmount`
4. Sends LZ message to NOWJC which selects the applicant and sets status to InProgress

**Important:** The job giver must `approve()` USDC on the USDC contract before calling this.

## Step 4: Submit Work

**Who:** Selected job taker
**Chain:** Optimism

```solidity
function submitWork(
    string calldata _jobId,
    string calldata _submissionHash,    // IPFS hash of work
    bytes calldata _nativeOptions
) external payable
```

Pure forwarding — NOWJC stores the submission hash in Genesis.

## Step 5: Release Payment

**Who:** Job giver
**Chain:** Optimism

```solidity
function releasePaymentCrossChain(
    string memory _jobId,
    uint32 _targetChainDomain,     // Where to send payment (2=OP, 3=Arb)
    address _targetRecipient,      // Job taker's payment address
    bytes calldata _nativeOptions
) external payable nonReentrant
```

**What happens:**
1. Clears `currentLockedAmount` on LOWJC
2. If all milestones done → status = Completed
3. Sends LZ message to NOWJC
4. NOWJC deducts 1% commission and sends remaining USDC via CCTP to the recipient

## Step 6: Lock Next Milestone

**Who:** Job giver (for multi-milestone jobs)
**Chain:** Optimism
**Prerequisites:** Previous milestone must be released, USDC approval for next amount

```solidity
function lockNextMilestone(
    string memory _jobId,
    bytes calldata _nativeOptions
) external payable nonReentrant
```

**Requirements:**
- `currentLockedAmount` must be 0 (previous milestone released)
- USDC approved for next milestone amount
- Increments `currentMilestone` and sends funds via CCTP

## Step 7: Rate

**Who:** Either party (job giver or job taker)
**Chain:** Optimism

```solidity
function rate(
    string calldata _jobId,
    address _userToRate,
    uint256 _rating,              // 1-5
    bytes calldata _nativeOptions
) external payable
```

- Job giver can rate the job taker and vice versa
- Rating stored in NativeProfileManager on Arbitrum

## Combined Operations

### Release and Lock Next Milestone

For efficiency, release current milestone and lock next in one transaction:

```solidity
// Handled internally on NOWJC
function releasePaymentAndLockNext(
    address _jobGiver,
    string memory _jobId,
    uint256 _releasedAmount,
    uint256 _lockedAmount
) external  // onlyAuthorized
```

## Reading Job Data

### From LOWJC (Optimism) — Minimal Data

```solidity
// Get job counter
function jobCounter() external view returns (uint256)

// Get job struct (minimal: jobGiver, status, currentMilestone, lockedAmount, etc.)
function jobs(string memory _jobId) external view returns (Job memory)
```

### From Genesis (Arbitrum) — Full Data

Full job details including applicants, submissions, milestones, and selected applicant are stored in Genesis on Arbitrum. Query Genesis for complete job information.

## USDC Amounts

All amounts use 6 decimals:
- 100 USDC = `100000000`
- 500 USDC = `500000000`
- 1,000 USDC = `1000000000`
- 0.01 USDC = `10000`
