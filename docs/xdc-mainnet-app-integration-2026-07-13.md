# XDC Mainnet Application Integration — 13 July 2026

## Purpose

This record describes how the OpenWork production application connects to the live XDC contracts. The canonical contract address, source, verification, and cross-chain security record remains the `openwork-contracts-final` live registry; do not treat this application document as a replacement registry.

- Canonical contracts change: [PR #1](https://github.com/AnasShaikh/openwork-contracts-final/pull/1)
- Pinned canonical commit: [`b0a90a5`](https://github.com/AnasShaikh/openwork-contracts-final/commit/b0a90a55950679b12c08d6321141b2826c5a05e1)
- Application runtime manifest: [`src/config/chainConfig.js`](../src/config/chainConfig.js)
- Backend runtime manifest: [`backend/config.js`](../backend/config.js)

## Production constants

| Setting | Value |
|---|---|
| Chain ID | `50` |
| LayerZero EID | `30365` |
| CCTP domain | `18` |
| RPC | `https://rpc.xdc.network` |
| Explorer | `https://xdcscan.com` |
| Native currency | `XDC` |
| LOWJC proxy | `0x5cF21bFb944B6851048F9ac18a8C84F6323a8ce7` |
| LocalAthena proxy | `0x4756294bE516f73e8D1984E7a94E4ABaffA94c4d` |
| Local bridge | `0x74566644782e98c87a12E8Fc6f7c4c72e2908a36` |
| Standard CCTP transceiver | `0x00c70838cA0de7F1Eb192Bd7a11A7F2e14407510` |
| USDC | `0xfA2958CB79b0491CC627c1557F441eF849Ca8eb1` |
| Circle MessageTransmitter V2 | `0x81D40F21F12A8F0E3252Bccb954D722d4c464B64` |

All six OpenWork XDC deployments are explorer-verified. The LOWJC and LocalAthena proxy links are verified and point to implementations `0x20Fa268106A3C532cF9F733005Ab48624105c42F` and `0xF78B688846673C3f6b93184BeC230d982c0db0c9` respectively.

## Supported production route

The application enables XDC as a local job chain. All OpenWork LayerZero messages from XDC route to the Arbitrum native chain at EID `30110`. Job IDs created on XDC use the format `30365-<counter>`.

The XDC ↔ Arbitrum pathway is configured with matching four-DVN send/receive stacks and was proven by delivered test job `30365-1`:

- XDC source transaction: `0xdd20ddebcf87ff3757cbea0c6670d5550abbded96c31d72ad2f10340fa455806`
- Arbitrum destination transaction: `0x36c8d34d4ae92f091a936dadaff5d1fe0282eceb770c9af800974f6b347c42bf`
- LayerZero GUID: `0xc8a64f1d2bfa3da302459ffa3f2c2a248b468019852ced4ddbb9f03b11db1055`

The production webapp then passed the same route with job `30365-2`:

- XDC source transaction: `0xf9b88e09488de62bbb92572492c74268dccf445bea6279d672fc458963a57d09`
- Arbitrum destination transaction: `0xcf5f406e94942db276958e2828c8e5ce9f8271d32209a84610fc24e1202ad6a0`
- LayerZero GUID: `0x6e75481de82c9527faab41f47b5899058906ab1ddd3d05594968b3ac6299aeff`
- Final LayerZero status: `DELIVERED`
- Arbitrum Genesis state: job exists with the correct wallet, IPFS hashes, `0.5 USDC` nominal milestone, and `Open` status

Direct XDC ↔ Ethereum application messaging is intentionally not enabled. Reciprocal peers exist, but the direct DVN/executor pathway is not operational.

## Application behavior

- The wallet selector can add and switch to XDC using chain ID `0x32`.
- Job posting, applications, profiles, work submission, payments, and Athena actions use the existing local-chain ABIs because the XDC proxies use the same deployed LOWJC and LocalAthena sources.
- XDC wallet transactions use legacy `gasPrice` fields for XDC RPC compatibility.
- User-facing native fee labels use `XDC`, not `ETH`.
- LayerZero fees are quoted from the live bridge. XDC does not use the unsafe small ETH fallback when a quote fails.
- XDC CCTP burns use Circle Standard Transfer finality. Backend polling allows at least 30 minutes for domain `18` attestations.
- Backend payment completion uses the CCTP attestation's actual `destinationDomain`. This matters when an applicant's preferred payment chain differs from the job's posting chain.
- CCTP messages destined for XDC are completed through the verified XDC Standard CCTP transceiver.

## Production infrastructure

Required application configuration:

- Frontend build variable: `VITE_XDC_MAINNET_RPC_URL`
- Backend runtime variable: `XDC_MAINNET_RPC_URL`
- App Runner runtime secret mapping: `/openwork/react-app/prod/XDC_MAINNET_RPC_URL`

The frontend also has a public RPC fallback, but production keeps the value explicit in the build and runtime configuration. No XDC private key is embedded in the frontend or image. The existing backend service wallet is used only for CCTP completion transactions and must have enough native gas on the destination chain.

### Relay wallet readiness

The App Runner `WALL2_PRIVATE_KEY` resolves to public address `0x93514040f43aB16D52faAe7A3f380c4089D844F9`. A read-only balance check on 13 July 2026 found `0 XDC`. Therefore:

- frontend XDC operations and XDC → Arbitrum messaging are not blocked;
- the deployed backend is correctly configured to call the XDC Standard CCTP transceiver;
- automatic Arbitrum → XDC CCTP completion will remain pending until this relay wallet receives enough XDC for destination gas;
- funding the relay wallet and running the paid end-to-end test require a separate transaction plan and approval.

## Validation gates

Before publishing:

1. Run backend syntax/configuration checks.
2. Build the frontend in `mainnet` mode.
3. Confirm the compiled bundle contains chain ID `50`, the XDC RPC, and the XDC LOWJC proxy.
4. Confirm live read-only values: LOWJC chain ID `30365`, LOWJC bridge, LocalAthena native domain `3`, and bridge native EID `30110`.
5. Deploy a unique immutable image tag to the existing App Runner service.
6. Verify the production domain, health endpoint, XDC selector, and absence of secrets in the bundle.
7. Obtain separate approval before any paid end-to-end blockchain transaction.

## Status

Deployed and verified on 13 July 2026:

| Item | Result |
|---|---|
| Application commit | `0a063e9c660f6b7f430100758184c290a2e411d7` |
| GitHub review | [PR #4](https://github.com/AnasShaikh/openwork-react-app/pull/4) |
| Production image | `prod-20260713115621` |
| ECR digest | `sha256:679574170ec92317f9c6e2bb47906d293c4b482467925275e02ca905736cce11` |
| CodeBuild | `openwork-react-app-prod-build:1aa82a35-53ae-4ddc-9d37-ed4991df9e87` — succeeded |
| App Runner update | `56e9783742a44435a4688e235df45c22` — succeeded |
| Public verification | production root, `/health`, and job route HTTP 200; live bundle `/assets/index-Bxw5PiP6.js`; XDC RPC, job display, and secret-absence checks passed |

The paid production job-post test subsequently passed as job `30365-2`. Relay-wallet XDC funding remains a separate prerequisite only for automated CCTP completion into XDC.

### Production follow-up repairs

Four follow-up commits were included after the initial XDC application rollout:

| Commit | Change |
|---|---|
| `d671e2fc1414093a52c8bd7398fd1ccdc1e891a5` | Added bounded MetaMask add/switch requests, visible approval status, and recovery from pending wallet requests. |
| `3618ccbdfa9c40fb2b69638d3dca93944269a265` | Guarded managed-runtime database shutdown when the no-database stub has no `end()` method. |
| `9ee391972b30db8093bc38842ecd02259de8fc47` | Routed read-only LayerZero quotes through the configured HTTP RPC, selected XDC's official `https://erpc.xinfin.network` endpoint, and removed the unsafe 30% fee overpayment. |
| `0a063e9c660f6b7f430100758184c290a2e411d7` | Replaced the hard-coded job fee with live NOWJC commission reads and showed remaining job compensation when no milestone is locked. |

The first browser job attempt proved that XDC network addition and switching worked. It then stopped before any blockchain transaction because Pinata was at `503/500` files. The user removed unused pins, reducing the account to `491/500`; the next attempt successfully uploaded the milestone and job metadata, leaving `493/500`, before the wallet-injected provider returned an internal JSON-RPC error during `quoteNativeChain`.

The same read-only LayerZero quote was replayed successfully against the official XDC HTTP RPC:

```text
Destination job ID: 30365-2
Destination execution gas: 500,000
Quoted LayerZero fee: 3.689440924669622025 XDC
```

No XDC transaction was submitted by either failed browser attempt. The production app uses the exact quote because the bridge passes LOWJC as the LayerZero refund address; an application-added buffer would not reliably return to the user's wallet.

### Production webapp transaction result

The user later confirmed the freshly quoted transaction directly in MetaMask. The live LayerZero fee had risen by submission time, demonstrating that the earlier read-only quote was not a durable price commitment.

| Field | Result |
|---|---|
| Job | `30365-2` |
| XDC source transaction | `0xf9b88e09488de62bbb92572492c74268dccf445bea6279d672fc458963a57d09` |
| LayerZero GUID | `0x6e75481de82c9527faab41f47b5899058906ab1ddd3d05594968b3ac6299aeff` |
| Arbitrum destination transaction | `0xcf5f406e94942db276958e2828c8e5ce9f8271d32209a84610fc24e1202ad6a0` |
| Delivery | `DELIVERED` in about 60 seconds |
| LayerZero message value | `4.797152596971259807 XDC` |
| XDC gas | `0.006081487750000000 XDC` |
| Total wallet spend | `4.803234084721259807 XDC` |
| Final XDC wallet balance | `50.383926152756555326 XDC` |

Both Pinata CIDs resolve over the public gateway, and Arbitrum Genesis contains the exact job giver, job CID, milestone CID, `500,000` milestone units, and `Open` status. The screenshot showing “Syncing” was captured about 18 seconds after the source block; LayerZero delivered approximately 42 seconds later, so that screen represented a normal in-flight state.

### Job-details fee and payable-amount correction

The job-details page previously displayed a hard-coded `Fees: 5` and showed only the currently locked milestone amount. The production page now:

- sums `calculateCommission(milestoneAmount)` from live Arbitrum NOWJC for the applicable milestones;
- uses final milestones after a job starts and the original posted milestones before that;
- shows the locked milestone when a positive amount is locked;
- otherwise shows the remaining unpaid milestone budget as `AMOUNT TO BE PAID`.

For job `30365-2`, production renders `0.50 USDC — AMOUNT TO BE PAID`. Live NOWJC readback currently returns `commissionPercentage() == 0`, `minCommission() == 0`, and `calculateCommission(500000) == 0`, so the accurate fee display is `0 USDC`. If a nonzero platform fee is intended, the contract configuration must be changed separately on Arbitrum; the frontend deliberately does not invent a fee that the live payment contract will not charge.
