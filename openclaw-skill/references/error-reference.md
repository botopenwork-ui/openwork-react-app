# Error Reference

Common errors across OpenWork contracts, what causes them, and how to fix them.

## LOWJC Errors (Optimism)

| Error | Cause | Fix |
|-------|-------|-----|
| "Not job giver" | Caller is not the job's creator | Only the original job poster can start, release, or lock milestones |
| "Not in progress" | Job status is not InProgress | Job must be started before submitting work or releasing payment |
| "No funds locked" | `currentLockedAmount` is 0 | Lock a milestone first using `lockNextMilestone()` |
| "Previous not released" | Trying to lock next milestone before releasing current | Call `releasePaymentCrossChain()` first |
| "All complete" | All milestones already finished | No more milestones to lock or release |
| "CCTP send failed" | CCTPTransceiver.sendFast() failed | Check USDC approval and balance; verify CCTPTransceiver is functional |

## NOWJC Errors (Arbitrum)

| Error | Cause | Fix |
|-------|-------|-----|
| "Auth" | Caller not in `authorizedContracts` | Only bridge contracts can call NOWJC directly |
| "Insufficient balance after CCTP fees" | USDC balance < 99.99% of expected | CCTP fee exceeded 0.01% tolerance — rare, may need to retry |
| "Transceiver not set" | `cctpTransceiver` address is zero | Admin configuration issue |
| "Invalid recipient" | Target recipient is zero address | Provide a valid payment address |
| "No applicant" | Job has no selected applicant | Start the job first to select an applicant |
| "Job not in progress" | Job status != InProgress | Job must be in InProgress state |
| "Amount insufficient for commission" | Payment too small to cover 1% commission | Increase the milestone amount |
| "Invalid milestone" | `currentMilestone` out of range | Check milestone count and current progress |
| "All completed" | No more milestones to lock | All milestones have been processed |

## ETHOpenworkDAO Errors (Ethereum)

| Error | Cause | Fix |
|-------|-------|-----|
| "Minimum stake is 100 tokens" | Stake amount < 100 OWORK | Stake at least 100 OWORK (100 * 10^18) |
| "Already staking" | User already has an active stake | Only one stake per user — unstake first if needed |
| "Stake still locked" | Lock period hasn't elapsed | Wait for the staking duration to expire (1-3 years) |
| "Unstake delay not met" | Cooldown period hasn't passed | Wait 7 days (production) after first unstake call |
| "No stake found" | User has no active stake | Must stake before unstaking |
| "Already delegated to this address" | Trying to delegate to current delegatee | Choose a different delegate or skip |

## CCTP Transfer Issues

| Status | Meaning | Action |
|--------|---------|--------|
| `pending_confirmations` | Waiting for source chain finality | Wait — typically a few minutes |
| `complete` | Attestation ready | Call `CCTPTransceiver.receive(message, attestation)` on destination chain |
| `delayReason: "insufficient_fee"` | maxFee too low for fast path | Transfer will complete via slow path (~15-20 min) |

### Check CCTP Status

```
GET https://iris-api.circle.com/v2/messages/{sourceDomain}?transactionHash={txHash}
```

- `sourceDomain`: 2 = Optimism, 3 = Arbitrum, 0 = Ethereum

## LayerZero Message Issues

### Check LZ Message Status

```
GET https://scan.layerzero-api.com/v1/messages/tx/{txHash}
```

### Common LZ Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| Message not delivered | Insufficient gas in `_nativeOptions` | Use recommended 500,000 gas: `0x0003010011010000000000000000000000000007a120` |
| Insufficient `msg.value` | Not enough ETH sent for LZ fee | Send at least 0.0005 ETH as `msg.value` |
| Peer not set | Bridge contract doesn't have peer configured | Admin must call `setPeer()` on the bridge |

## Transaction Troubleshooting

### "Transaction reverted"

1. **Check USDC approval** — Did you approve enough USDC to the LOWJC contract?
2. **Check USDC balance** — Do you have enough USDC on Optimism?
3. **Check ETH balance** — Do you have ETH for gas + LZ fee on Optimism?
4. **Check job status** — Is the job in the correct state for the operation?
5. **Check caller** — Are you the job giver (for payment operations)?

### "Out of gas"

- Increase gas limit in your transaction
- Cross-chain operations need sufficient gas on both source and destination chains
- The `_nativeOptions` parameter controls destination chain gas

### Payment Not Received

1. Check if the LZ message was delivered (LayerZero scan)
2. Check if the CCTP transfer was sent (check NOWJC events on Arbitrum)
3. Check CCTP attestation status (Circle API)
4. If attestation is `complete`, call `receive()` on destination CCTPTransceiver
5. If `pending_confirmations`, wait for finality

## Diagnostic Commands

### Check Job State

```bash
# Job counter on LOWJC
cast call 0x620205A4Ff0E652fF03a890d2A677de878a1dB63 "jobCounter()(uint256)" --rpc-url $OPTIMISM_RPC

# NOWJC USDC balance (escrow)
cast call 0xaf88d065e77c8cC2239327C5EDb3A432268e5831 "balanceOf(address)(uint256)" 0x8EfbF240240613803B9c9e716d4b5AD1388aFd99 --rpc-url $ARBITRUM_RPC
```

### Check LZ Message

```bash
curl -s "https://scan.layerzero-api.com/v1/messages/tx/{txHash}" | jq '.'
```

### Check CCTP Transfer

```bash
curl -s "https://iris-api.circle.com/v2/messages/{sourceDomain}?transactionHash={txHash}" | jq '.'
```

### Verify Proxy Implementation

```bash
cast storage <PROXY> 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc --rpc-url <RPC>
```
