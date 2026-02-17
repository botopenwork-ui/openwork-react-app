# Cross-Chain Architecture

OpenWork operates across three blockchains, each with a specific role. Cross-chain communication uses LayerZero V2 for messaging and Circle CCTP V2 for USDC transfers.

## Chain Roles

| Chain | Role | What Lives Here |
|-------|------|-----------------|
| **Optimism** | Local chain (user-facing) | LOWJC, LocalAthena — where users submit transactions |
| **Arbitrum One** | Native chain (source of truth) | NOWJC, Genesis, NativeAthena, Rewards, Profiles — all state storage and business logic |
| **Ethereum** | Main chain (governance) | ETHOpenworkDAO, ETHRewardsContract, OWORK token |

## Why Three Chains?

- **Optimism** has low gas fees, making it cheap for users to interact
- **Arbitrum** is the single source of truth — all job data, profiles, and escrow live here
- **Ethereum** hosts governance and the OWORK token for maximum security and decentralization

## Data Flow Pattern

```
User on Optimism
  → LOWJC (minimal local state)
    → LayerZero message → NativeBridge on Arbitrum
      → NOWJC (full state in Genesis)
        → CCTP USDC transfer (if payment involved)
```

Users only interact with Optimism. The system handles everything else automatically.

## Chain Identifiers

| Chain | Chain ID | LayerZero EID | CCTP Domain |
|-------|----------|---------------|-------------|
| Arbitrum One | 42161 | 30110 | 3 |
| Optimism | 10 | 30111 | 2 |
| Ethereum | 1 | 30101 | 0 |

### Testnet

| Chain | Chain ID | LayerZero EID | CCTP Domain |
|-------|----------|---------------|-------------|
| Arbitrum Sepolia | 421614 | 40231 | 3 |
| Optimism Sepolia | 11155420 | 40232 | 2 |
| Ethereum Sepolia | 11155111 | 40161 | 0 |

## LayerZero Messaging

LayerZero V2 handles all cross-chain state sync. Bridge contracts on each chain route messages.

### Bridge Contracts (Mainnet)

| Chain | Bridge Contract | Address |
|-------|----------------|---------|
| Arbitrum | NativeLZOpenworkBridge V2 | `0x1bC57d93eC9F9214EDe2e81281A26Ac0E01A9A5F` |
| Optimism | LocalLZOpenworkBridge | `0x74566644782e98c87a12E8Fc6f7c4c72e2908a36` |
| Ethereum | ETHLZOpenworkBridge | `0x20Fa268106A3C532cF9F733005Ab48624105c42F` |

### Message Types (Optimism → Arbitrum)

| Action | Source Function | Destination Handler |
|--------|----------------|---------------------|
| Post job | LOWJC.postJob() | NOWJC.postJob() |
| Apply to job | LOWJC.applyToJob() | NOWJC.applyToJob() |
| Start job | LOWJC.startJob() | NOWJC.startJob() |
| Submit work | LOWJC.submitWork() | NOWJC.submitWork() |
| Release payment | LOWJC.releasePaymentCrossChain() | NOWJC.handleReleasePaymentCrossChain() |
| Lock milestone | LOWJC.lockNextMilestone() | NOWJC.lockNextMilestone() |
| Direct contract | LOWJC.startDirectContract() | NOWJC.handleStartDirectContract() |
| Create profile | LOWJC.createProfile() | ProfileManager.createProfile() |
| Raise dispute | LocalAthena.raiseDispute() | NativeAthena.raiseDispute() |

### Message Types (Arbitrum → Optimism)

| Action | Source | Destination Handler |
|--------|--------|---------------------|
| Finalize dispute | NativeAthena | LocalAthena.handleFinalizeDisputeWithVotes() |

### Message Types (Arbitrum ↔ Ethereum)

| Direction | Action | Purpose |
|-----------|--------|---------|
| Arb → ETH | syncVotingPower | Sync user voting power to DAO |
| Arb → ETH | syncClaimableRewards | Sync claimable OWORK balance |
| ETH → Arb | incrementGovernanceAction | Record DAO votes/proposals |
| ETH → Arb | updateUserClaimData | Mark tokens as claimed |
| ETH → Arb | updateStakeData | Sync stake info to native chain |
| ETH → Any | upgradeFromDAO | Cross-chain contract upgrade |

### LZ Gas Options

Every cross-chain call requires `_nativeOptions` that encode gas for destination execution:

```
0x0003010011010000000000000000000000000007a120
```

This encodes 500,000 gas (0x07a120). Standard for most operations.

### LZ Fee

Typical cost: **~0.0003-0.0005 ETH** sent as `msg.value`.

To estimate fees:
```solidity
// On LocalBridge
function quoteNativeChain(bytes calldata _payload, bytes calldata _options) external view returns (uint256 fee)
```

### Checking LZ Message Status

```
GET https://scan.layerzero-api.com/v1/messages/tx/{txHash}
```

## Circle CCTP (USDC Transfers)

Circle CCTP V2 handles all USDC movement between chains.

### Flow

1. **Send**: Source chain burns USDC via TokenMessengerV2
2. **Attest**: Circle observes and creates attestation
3. **Receive**: Destination chain mints USDC via `CCTPTransceiver.receive(message, attestation)`

### CCTPTransceiver Contracts (Mainnet)

| Chain | Address |
|-------|---------|
| Arbitrum | `0x765D70496Ef775F6ba1cB7465c2e0B296eB50d87` |
| Optimism | `0x586C700ACFA1D129Ba2C6a6E673c55d586c32f15` |

### Checking CCTP Transfer Status

```
GET https://iris-api.circle.com/v2/messages/{sourceDomain}?transactionHash={txHash}
```

- `sourceDomain`: 2 = Optimism, 3 = Arbitrum
- Status: `pending_confirmations` → `complete`
- If `delayReason: "insufficient_fee"` — transfer uses slow path (~15-20 min)

### Completing a CCTP Transfer

Once attestation is `complete`, call `receive()` on the destination CCTPTransceiver:

```solidity
function receive(
    bytes calldata message,       // From Circle API response
    bytes calldata attestation    // From Circle API response
) external nonReentrant
```

### Important Notes

- CCTP transfers require a manual `receive()` call on the destination chain
- Current contracts use `maxFee = 1000` (0.001 USDC) — may result in slow-path transfers
- NOWJC has a 0.01% fee tolerance for received amounts
