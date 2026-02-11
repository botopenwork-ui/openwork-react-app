# Payment System

All payments in OpenWork use USDC with cross-chain escrow. Funds flow from the job giver on Optimism, through escrow on Arbitrum, and to the job taker on their preferred chain.

## Payment Flow Overview

```
Job Giver (Optimism)
  → Approves USDC
  → LOWJC transfers USDC, sends via CCTP to Arbitrum
  → NOWJC holds USDC in escrow on Arbitrum
  → Job giver releases payment
  → NOWJC deducts 1% commission
  → Sends remaining USDC via CCTP to job taker's preferred chain
```

## USDC Addresses

| Chain | USDC Address |
|-------|-------------|
| Optimism | `0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85` |
| Arbitrum | `0xaf88d065e77c8cC2239327C5EDb3A432268e5831` |

All amounts use **6 decimals**: 100 USDC = `100000000`

## Funding a Milestone

### Approve USDC First

Before any payment operation, the job giver must approve USDC:

```solidity
// On USDC contract (Optimism)
USDC.approve(
    0x620205A4Ff0E652fF03a890d2A677de878a1dB63,  // LOWJC address
    amount                                          // In 6 decimal units
)
```

### How _sendFunds Works (Internal)

When a user calls `startJob()`, `lockNextMilestone()`, or `startDirectContract()`, LOWJC internally:

1. Transfers USDC from the user to itself
2. Approves USDC to the CCTPTransceiver
3. Calls `CCTPTransceiver.sendFast()` to burn USDC and send to Arbitrum
4. USDC minted on Arbitrum to NOWJC's address

```solidity
// Internal function on LOWJC
function _sendFunds(string memory _jobId, uint256 _amount) internal {
    usdcToken.transferFrom(msg.sender, address(this), _amount);
    usdcToken.approve(address(cctpSender), _amount);
    cctpSender.sendFast(_amount, 3, mintRecipient, 1000);  // domain 3 = Arbitrum
}
```

## Releasing Payment

### releasePaymentCrossChain

```solidity
function releasePaymentCrossChain(
    string memory _jobId,
    uint32 _targetChainDomain,     // 2=Optimism, 3=Arbitrum
    address _targetRecipient,
    bytes calldata _nativeOptions
) external payable nonReentrant
```

- Only the job giver can call this
- Clears `currentLockedAmount` on LOWJC
- If all milestones done → status becomes Completed
- Sends LZ message to NOWJC which processes the payment

### On NOWJC (Arbitrum)

When NOWJC receives the release instruction:
1. Calculates 1% commission
2. If recipient is on Arbitrum (domain 3): direct USDC transfer
3. If recipient is on another chain: sends via CCTP

## Locking the Next Milestone

```solidity
function lockNextMilestone(
    string memory _jobId,
    bytes calldata _nativeOptions
) external payable nonReentrant
```

**Requirements:**
- `currentLockedAmount` must be 0 (previous milestone released)
- USDC must be approved for the next milestone amount
- Only the job giver can call

## Commission

| Parameter | Value |
|-----------|-------|
| Commission rate | 1% (100 basis points) |
| Minimum commission | 0.0001 USDC |
| Maximum configurable rate | 10% |

```solidity
function calculateCommission(uint256 amount) public view returns (uint256) {
    uint256 percentCommission = (amount * 100) / 10000;  // 1%
    return percentCommission > 100 ? percentCommission : 100;  // min 0.0001 USDC
}
```

**Example:** For a 1000 USDC milestone:
- Commission: 10 USDC (1%)
- Job taker receives: 990 USDC

## Combined Release + Lock

For multi-milestone jobs, NOWJC supports releasing the current milestone and locking the next one in a single operation:

```solidity
function releasePaymentAndLockNext(
    address _jobGiver,
    string memory _jobId,
    uint256 _releasedAmount,
    uint256 _lockedAmount
) external  // onlyAuthorized
```

## Dispute Resolution Payments

If a job has a dispute, funds can be released by Athena or the DAO:

```solidity
function releaseDisputedFunds(
    address _recipient,
    uint256 _amount,
    uint32 _targetChainDomain
) external  // Only Athena or DAO
```

## CCTP Fee Tolerance

When NOWJC receives USDC via CCTP, the actual balance may be slightly less than expected due to CCTP fees. NOWJC allows a 0.01% tolerance:

```solidity
require(actualBalance >= (_amount * 9999) / 10000, "Insufficient balance after CCTP fees");
```

## Completing CCTP Transfers

CCTP transfers are **not instant**. After sending, you need to:

1. Get the transaction hash from the send operation
2. Check Circle's attestation API:
   ```
   GET https://iris-api.circle.com/v2/messages/{sourceDomain}?transactionHash={txHash}
   ```
3. Wait for status = `complete`
4. Call `CCTPTransceiver.receive(message, attestation)` on the destination chain

### CCTP Status Values

| Status | Meaning |
|--------|---------|
| `pending_confirmations` | Waiting for source chain finality |
| `complete` | Ready — call `receive()` on destination |
| `delayReason: "insufficient_fee"` | Using slow path (~15-20 min) |

## Payment Summary by Operation

| Operation | USDC Required | ETH Required | Who Pays |
|-----------|--------------|-------------|----------|
| Post job | None | ~0.0005 ETH (LZ fee) | Job giver |
| Apply to job | None | ~0.0005 ETH (LZ fee) | Job taker |
| Start job | First milestone amount | ~0.0005 ETH (LZ fee) | Job giver |
| Lock next milestone | Next milestone amount | ~0.0005 ETH (LZ fee) | Job giver |
| Release payment | None | ~0.0005 ETH (LZ fee) | Job giver |
| Submit work | None | ~0.0005 ETH (LZ fee) | Job taker |
| Rate | None | ~0.0005 ETH (LZ fee) | Either party |
