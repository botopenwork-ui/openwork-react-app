# Direct Contracts

Direct contracts let a job giver create a contract with a specific job taker instantly, skipping the posting and application process. The first milestone is auto-funded and auto-released.

## When to Use

- You already know who you want to hire
- You want to skip the job posting and application flow
- You want to pay someone immediately for the first milestone

## Contract Address

| Contract | Chain | Address |
|----------|-------|---------|
| LOWJC | Optimism | `0x620205A4Ff0E652fF03a890d2A677de878a1dB63` |

## Function Signature

**Who:** Job giver
**Chain:** Optimism
**Prerequisites:** USDC approval for first milestone amount + ETH for gas/LZ fee

```solidity
function startDirectContract(
    address _jobTaker,
    string memory _jobDetailHash,
    string[] memory _descriptions,
    uint256[] memory _amounts,
    uint32 _jobTakerChainDomain,      // CCTP domain where taker wants payment (2=OP, 3=Arb)
    bytes calldata _nativeOptions
) external payable nonReentrant
```

## What Happens

### Single Milestone Direct Contract

For a contract with one milestone of 500 USDC:

| Step | What Happens | Chain |
|------|-------------|-------|
| 1 | Job giver calls `startDirectContract()` | Optimism |
| 2 | USDC transferred from job giver, sent via CCTP to Arbitrum | OP → Arb |
| 3 | CCTP `receive()` called to complete USDC transfer | Arbitrum |
| 4 | NOWJC creates job, selects taker, auto-releases milestone 1 | Arbitrum |
| 5 | USDC sent via CCTP to job taker's preferred chain | Arb → OP/Arb |
| 6 | CCTP `receive()` called to deliver payment | Destination |
| 7 | Job marked Completed | Arbitrum |

### Multi-Milestone Direct Contract

For a contract with milestones [100 USDC, 100 USDC]:

| Step | Action | Chain | Who |
|------|--------|-------|-----|
| 1 | `startDirectContract()` | Optimism | Job giver |
| 2 | CCTP receive (escrow milestone 1) | Arbitrum | Anyone |
| 3 | Auto-release milestone 1 via CCTP | Arb → OP | Automatic |
| 4 | CCTP receive (milestone 1 payment to taker) | Optimism | Anyone |
| 5 | `lockNextMilestone()` | Optimism | Job giver |
| 6 | CCTP receive (escrow milestone 2) | Arbitrum | Anyone |
| 7 | `releasePaymentCrossChain()` | Optimism | Job giver |
| 8 | CCTP receive (milestone 2 payment to taker) | Destination | Anyone |

## Example

Create a direct contract with 2 milestones of 100 USDC each:

```
// Step 1: Approve USDC on Optimism
USDC.approve(LOWJC_ADDRESS, 100000000)  // 100 USDC for first milestone

// Step 2: Create direct contract
LOWJC.startDirectContract(
    _jobTaker: "0xJobTakerAddress",
    _jobDetailHash: "QmIpfsHash...",
    _descriptions: ["Design work", "Development work"],
    _amounts: [100000000, 100000000],       // 100 USDC each
    _jobTakerChainDomain: 2,                // Pay on Optimism
    _nativeOptions: 0x0003010011010000000000000000000000000007a120,
    { value: 0.0005 ETH }                   // LZ fee
)

// Step 3: Wait for CCTP transfers to complete, then for milestone 2:
USDC.approve(LOWJC_ADDRESS, 100000000)
LOWJC.lockNextMilestone(_jobId, _nativeOptions, { value: 0.0005 ETH })

// Step 4: After work is done, release milestone 2:
LOWJC.releasePaymentCrossChain(_jobId, 2, takerAddress, _nativeOptions, { value: 0.0005 ETH })
```

## Key Details

- First milestone is **auto-released** — the job taker receives payment immediately
- For single-milestone contracts, the job is **auto-completed**
- The job giver only needs to approve USDC for the **first milestone** when creating the contract
- Subsequent milestones require separate `lockNextMilestone()` and `releasePaymentCrossChain()` calls
- Two CCTP transfers happen on creation: one for escrow (OP → Arb) and one for auto-release (Arb → destination)
- 1% platform commission is deducted from each payment release

## CCTP Note

Each CCTP transfer requires a manual `receive()` call on the destination chain once Circle's attestation is ready. Check attestation status at:

```
GET https://iris-api.circle.com/v2/messages/{sourceDomain}?transactionHash={txHash}
```
