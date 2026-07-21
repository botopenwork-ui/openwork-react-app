# Archived Registry Copy — Do Not Use as Live Source

This application-repository copy is retained for historical links only and is stale. The canonical live registry, including NativeAthena V8 and the verified XDC deployment, is maintained in [`AnasShaikh/openwork-contracts-final`](https://github.com/AnasShaikh/openwork-contracts-final/blob/codex/xdc-mainnet-docs-and-skill/references/logs/imp/live-contract-registry-19-mar-2026.md). See [PR #1](https://github.com/AnasShaikh/openwork-contracts-final/pull/1) and the app-specific [XDC integration record](../docs/xdc-mainnet-app-integration-2026-07-13.md).

# Openwork Live Contract Registry — March 19, 2026

**Deployer:** `0x7a2B7feAB9b0e30A5368d3CC4CB8279c9606384C`
**Snapshot:** `src/suites/snapshot-19-mar-2026/`
**Remote source:** `github.com/botopenwork-ui/openwork-react-app` → `contracts/src/`

---

## Arbitrum One (Native Chain) — Chain ID: 42161 | LZ EID: 30110 | CCTP Domain: 3

### Upgradeable Contracts (UUPS Proxy)

| # | Contract | Proxy | Implementation | Version | Source | Arbiscan | Verified? |
|---|----------|-------|----------------|---------|--------|----------|-----------|
| 1 | NativeOpenworkGenesis | `0xE8f7963fF3cE9f7dB129e3f619abd71cBB5Bb294` | `0x4756294bE516f73e8D1984E7a94E4ABaffA94c4d` | V1 (Jan 18) | [native-openwork-genesis.sol](../../src/suites/current-mainnet/native/native-openwork-genesis.sol) | [proxy](https://arbiscan.io/address/0xE8f7963fF3cE9f7dB129e3f619abd71cBB5Bb294) / [impl](https://arbiscan.io/address/0x4756294bE516f73e8D1984E7a94E4ABaffA94c4d) | YES (impl) |
| 2 | NativeOpenWorkJobContract (NOWJC) | `0x8EfbF240240613803B9c9e716d4b5AD1388aFd99` | `0x95036F8Ad9Dd3c7Fe28744E42D24EfDB15c21528` | V5 (Mar 19) | [native-openwork-job-contract-v4.sol](../../src/suites/current-mainnet/native/native-openwork-job-contract-v4.sol) | [proxy](https://arbiscan.io/address/0x8EfbF240240613803B9c9e716d4b5AD1388aFd99) / [impl](https://arbiscan.io/address/0x95036F8Ad9Dd3c7Fe28744E42D24EfDB15c21528) | YES (impl) |
| 3 | NativeArbOpenWorkJobContract | `0x5727cA7326032a8644a49dECECB8388BEF122bef` | `0x79CE037946B44EDF4f8B2c2EA51C610C2AA6a0f7` | Redeployed (Mar 19) | [native-arb-lowjc-v3.sol](../../src/suites/current-mainnet/native/native-arb-lowjc-v3.sol) | [proxy](https://arbiscan.io/address/0x5727cA7326032a8644a49dECECB8388BEF122bef) / [impl](https://arbiscan.io/address/0x79CE037946B44EDF4f8B2c2EA51C610C2AA6a0f7) | YES (impl) |
| 4 | NativeArbAthenaClient | `0xB5d3F406089236ef9d4aB13306187aFCCA81f099` | `0x9456989F7B9Cb707451d7179Fc1FC401221DE01a` | Redeployed (Mar 19) | [native-arb-athena-client.sol](../../src/suites/current-mainnet/native/native-arb-athena-client.sol) | [proxy](https://arbiscan.io/address/0xB5d3F406089236ef9d4aB13306187aFCCA81f099) / [impl](https://arbiscan.io/address/0x9456989F7B9Cb707451d7179Fc1FC401221DE01a) | YES (impl) |
| 5 | NativeOpenworkDAO | `0x24af98d763724362DC920507b351cC99170a5aa4` | `0x20Fa268106A3C532cF9F733005Ab48624105c42F` | V1 (Jan 18) | [native-openwork-dao.sol](../../src/suites/current-mainnet/native/native-openwork-dao.sol) | [proxy](https://arbiscan.io/address/0x24af98d763724362DC920507b351cC99170a5aa4) / [impl](https://arbiscan.io/address/0x20Fa268106A3C532cF9F733005Ab48624105c42F) | YES (impl) |
| 6 | NativeAthena | `0xE6B9d996b56162cD7eDec3a83aE72943ee7C46Bf` | `0x80AA520dB868dc234ea852fC23Fa7c03e217Dad2` | V5 (Feb 28) | [native-athena-v4.sol](../../src/suites/current-mainnet/native/native-athena-v4.sol) | [proxy](https://arbiscan.io/address/0xE6B9d996b56162cD7eDec3a83aE72943ee7C46Bf) / [impl](https://arbiscan.io/address/0x80AA520dB868dc234ea852fC23Fa7c03e217Dad2) | NO (agent-compiled) |
| 7 | NativeProfileGenesis | `0x794809471215cBa5cE56c7d9F402eDd85F9eBa2E` | `0xae31d7be760D92807B013a71bb51f2cBB132166b` | V1 (Jan 22) | [native-profile-genesis.sol](../../src/suites/current-mainnet/native/native-profile-genesis.sol) | [proxy](https://arbiscan.io/address/0x794809471215cBa5cE56c7d9F402eDd85F9eBa2E) / [impl](https://arbiscan.io/address/0xae31d7be760D92807B013a71bb51f2cBB132166b) | YES (impl) |
| 8 | NativeAthenaActivityTracker | `0x8C04840c3f5b5a8c44F9187F9205ca73509690EA` | `0x9588A78748a8bc82295bf44d87C4b9F924d11AE8` | V1 (Jan 22) | [native-athena-activity-tracker.sol](../../src/suites/current-mainnet/native/native-athena-activity-tracker.sol) | [proxy](https://arbiscan.io/address/0x8C04840c3f5b5a8c44F9187F9205ca73509690EA) / [impl](https://arbiscan.io/address/0x9588A78748a8bc82295bf44d87C4b9F924d11AE8) | YES (impl) |
| 9 | NativeAthenaOracleManager | `0xEdF3Bcf87716bE05e35E12bA7C0Fc6e1879c0f15` | `0xE1e1Cc40897DDaeED44a3194B0e53DFb4171ef59` | V1 (Jan 22) | [native-athena-oracle-manager.sol](../../src/suites/current-mainnet/native/native-athena-oracle-manager.sol) | [proxy](https://arbiscan.io/address/0xEdF3Bcf87716bE05e35E12bA7C0Fc6e1879c0f15) / [impl](https://arbiscan.io/address/0xE1e1Cc40897DDaeED44a3194B0e53DFb4171ef59) | YES (impl) |
| 10 | NativeProfileManager | `0x51285003A01319c2f46BB2954384BCb69AfB1b45` | `0x19E4fBe10C2F2531248e5FfDF150D8c61168702f` | V2 (Feb 28) | [native-profile-manager-v2.sol](../../src/suites/current-mainnet/native/native-profile-manager-v2.sol) | [proxy](https://arbiscan.io/address/0x51285003A01319c2f46BB2954384BCb69AfB1b45) / [impl](https://arbiscan.io/address/0x19E4fBe10C2F2531248e5FfDF150D8c61168702f) | YES (impl) |

### Non-Upgradeable Contracts

| # | Contract | Address | Version | Source | Arbiscan | Verified? |
|---|----------|---------|---------|--------|----------|-----------|
| 11 | NativeLZOpenworkBridge | `0x1bC57d93eC9F9214EDe2e81281A26Ac0E01A9A5F` | V2 (Jan 24) | [native-lz-openwork-bridge.sol](../../src/suites/current-mainnet/native/native-lz-openwork-bridge.sol) | [link](https://arbiscan.io/address/0x1bC57d93eC9F9214EDe2e81281A26Ac0E01A9A5F) | YES |
| 12 | NativeRewardsContract | `0x5E80B57E1C465498F3E0B4360397c79A64A67Ce9` | V2 (Jan 23) | [native-rewards-contract.sol](../../src/suites/current-mainnet/native/native-rewards-contract.sol) | [link](https://arbiscan.io/address/0x5E80B57E1C465498F3E0B4360397c79A64A67Ce9) | YES |
| 13 | CCTPTransceiver | `0x765D70496Ef775F6ba1cB7465c2e0B296eB50d87` | V1 (Jan 18) | [cctp-transceiver.sol](../../src/suites/current-mainnet/utilities/cctp-transceiver.sol) | [link](https://arbiscan.io/address/0x765D70496Ef775F6ba1cB7465c2e0B296eB50d87) | YES |
| 14 | NativeContractRegistry | `0x29D61B1a9E2837ABC0810925429Df641CBed58c3` | V1 (Jan 22) | [native-contract-registry.sol](../../src/suites/current-mainnet/native/native-contract-registry.sol) | [link](https://arbiscan.io/address/0x29D61B1a9E2837ABC0810925429Df641CBed58c3) | YES |
| 15 | NativeGenesisReader | `0x72ee091C288512f0ee9eB42B8C152fbB127Dc782` | V1 (Jan 22) | [native-genesis-reader.sol](../../src/suites/current-mainnet/native/native-genesis-reader.sol) | [link](https://arbiscan.io/address/0x72ee091C288512f0ee9eB42B8C152fbB127Dc782) | YES |

### External Dependencies (Arbitrum One)

| Contract | Address |
|----------|---------|
| USDC | `0xaf88d065e77c8cC2239327C5EDb3A432268e5831` |
| LZ Endpoint V2 | `0x1a44076050125825900e736c501f859c50fE728c` |
| TokenMessengerV2 | `0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d` |
| MessageTransmitterV2 | `0x81D40F21F12A8F0E3252Bccb954D722d4c464B64` |

---

## Optimism (Local Chain) — Chain ID: 10 | LZ EID: 30111 | CCTP Domain: 2

### Upgradeable Contracts (UUPS Proxy)

| # | Contract | Proxy | Implementation | Version | Source | Etherscan | Verified? |
|---|----------|-------|----------------|---------|--------|-----------|-----------|
| 16 | LocalOpenWorkJobContract Lite | `0x620205A4Ff0E652fF03a890d2A677de878a1dB63` | `0x74D6e1aDA0Dae53231298B24DeAf169647fd557d` | Lite V6 (agent upgrade) | [local-openwork-job-contract-lite-v2.sol](../../src/suites/current-mainnet/local/local-openwork-job-contract-lite-v2.sol) | [proxy](https://optimistic.etherscan.io/address/0x620205A4Ff0E652fF03a890d2A677de878a1dB63) / [impl](https://optimistic.etherscan.io/address/0x74D6e1aDA0Dae53231298B24DeAf169647fd557d) | YES (impl) |
| 17 | LocalAthena | `0x4756294bE516f73e8D1984E7a94E4ABaffA94c4d` | `0xF78B688846673C3f6b93184BeC230d982c0db0c9` | V1 (Jan 18) | [local-athena.sol](../../src/suites/current-mainnet/local/local-athena.sol) | [proxy](https://optimistic.etherscan.io/address/0x4756294bE516f73e8D1984E7a94E4ABaffA94c4d) / [impl](https://optimistic.etherscan.io/address/0xF78B688846673C3f6b93184BeC230d982c0db0c9) | YES (impl) |

### Non-Upgradeable Contracts

| # | Contract | Address | Version | Source | Etherscan | Verified? |
|---|----------|---------|---------|--------|-----------|-----------|
| 18 | LocalLZOpenworkBridge | `0x74566644782e98c87a12E8Fc6f7c4c72e2908a36` | V1 (Jan 18) | [local-lz-openwork-bridge.sol](../../src/suites/current-mainnet/local/local-lz-openwork-bridge.sol) | [link](https://optimistic.etherscan.io/address/0x74566644782e98c87a12E8Fc6f7c4c72e2908a36) | YES |
| 19 | CCTPTransceiver V2 | `0x586C700ACFA1D129Ba2C6a6E673c55d586c32f15` | V2 (Jan 23) | [cctp-transceiver.sol](../../src/suites/current-mainnet/utilities/cctp-transceiver.sol) | [link](https://optimistic.etherscan.io/address/0x586C700ACFA1D129Ba2C6a6E673c55d586c32f15) | YES |

### External Dependencies (Optimism)

| Contract | Address |
|----------|---------|
| USDC | `0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85` |
| LZ Endpoint V2 | `0x1a44076050125825900e736c501f859c50fE728c` |
| TokenMessengerV2 | `0x2B4069517957735bE00ceE0fadAE88a26365528f` |
| MessageTransmitterV2 | `0x4D41f22c5a0e5c74090899E5a8Fb597a8842b3e8` |

---

## Ethereum Mainnet — Chain ID: 1 | LZ EID: 30101 | CCTP Domain: 0

### Upgradeable Contracts (UUPS Proxy)

| # | Contract | Proxy | Implementation | Version | Source | Etherscan | Verified? |
|---|----------|-------|----------------|---------|--------|-----------|-----------|
| 20 | ETHOpenworkDAO | `0xE8f7963fF3cE9f7dB129e3f619abd71cBB5Bb294` | `0xAc0D2b744E9A1a347038bEBe6984db6ef47Daa05` | Unknown (agent upgrade) | [eth-openwork-dao.sol](../../src/suites/current-mainnet/eth/eth-openwork-dao.sol) | [proxy](https://etherscan.io/address/0xE8f7963fF3cE9f7dB129e3f619abd71cBB5Bb294) / [impl](https://etherscan.io/address/0xAc0D2b744E9A1a347038bEBe6984db6ef47Daa05) | NO (agent-compiled) |

### Non-Upgradeable Contracts

| # | Contract | Address | Version | Source | Etherscan | Verified? |
|---|----------|---------|---------|--------|-----------|-----------|
| 21 | ETHLZOpenworkBridge | `0x20Fa268106A3C532cF9F733005Ab48624105c42F` | V1 (Jan 18) | [eth-lz-openwork-bridge.sol](../../src/suites/current-mainnet/eth/eth-lz-openwork-bridge.sol) | [link](https://etherscan.io/address/0x20Fa268106A3C532cF9F733005Ab48624105c42F) | YES |
| 22 | ETHRewardsContract | `0x4756294bE516f73e8D1984E7a94E4ABaffA94c4d` | V1 (Jan 22) | [eth-rewards-contract.sol](../../src/suites/current-mainnet/eth/eth-rewards-contract.sol) | [link](https://etherscan.io/address/0x4756294bE516f73e8D1984E7a94E4ABaffA94c4d) | YES |
| 23 | OpenworkToken (OWORK) | `0x765D70496Ef775F6ba1cB7465c2e0B296eB50d87` | V1 (Jan 22) | [openwork-token.sol](../../src/suites/current-mainnet/utilities/openwork-token.sol) | [link](https://etherscan.io/address/0x765D70496Ef775F6ba1cB7465c2e0B296eB50d87) | YES |

### Token Distribution

| Holder | Amount | Percentage |
|--------|--------|------------|
| ETHRewardsContract | 750,000,000 OWORK | 75% |
| ETHOpenworkDAO Proxy | 250,000,000 OWORK | 25% |

### External Dependencies (Ethereum)

| Contract | Address |
|----------|---------|
| LZ Endpoint V2 | `0x1a44076050125825900e736c501f859c50fE728c` |
| TokenMessengerV2 | `0xBd3fa81B58Ba92a82136038B25aDec7066af3155` |
| MessageTransmitterV2 | `0x0a992d191deec32afe36203ad87d7d289a738f81` |

---

## Cross-Chain Peer Configuration

| Source Bridge | Target EID | Target Bridge |
|---------------|------------|---------------|
| Native (Arb) `0x1bC57d93eC9F9214EDe2e81281A26Ac0E01A9A5F` | 30101 (ETH) | `0x20Fa268106A3C532cF9F733005Ab48624105c42F` |
| Native (Arb) `0x1bC57d93eC9F9214EDe2e81281A26Ac0E01A9A5F` | 30111 (OP) | `0x74566644782e98c87a12E8Fc6f7c4c72e2908a36` |
| ETH `0x20Fa268106A3C532cF9F733005Ab48624105c42F` | 30110 (Arb) | `0x1bC57d93eC9F9214EDe2e81281A26Ac0E01A9A5F` |
| Local (OP) `0x74566644782e98c87a12E8Fc6f7c4c72e2908a36` | 30110 (Arb) | `0x1bC57d93eC9F9214EDe2e81281A26Ac0E01A9A5F` |

---

## Verification Summary (Updated Mar 19, 2026)

| Status | Count |
|--------|-------|
| Verified on block explorer | 21 |
| Not verified (agent-compiled bytecode mismatch) | 2 |
| **Total** | **23** |

**Unverified contracts (require verification from agent's compilation environment):**
1. NativeAthena V5 impl `0x80AA520dB868dc234ea852fC23Fa7c03e217Dad2` — deployed by agent Feb 28
2. ETHOpenworkDAO impl `0xAc0D2b744E9A1a347038bEBe6984db6ef47Daa05` — untracked agent upgrade

## On-Chain Slot Verification (ERC1967 impl slot)

All 13 upgradeable proxy implementation slots were read on-chain via `cast storage`. 12/13 match this registry. ETHOpenworkDAO (#20) has an untracked agent upgrade — impl on-chain is `0xAc0D2b74...` not the originally logged `0xF78B6888...`.

---

## Abandoned Contracts (agent wallet key lost)

| Contract | Old Proxy | Old Impl | Reason |
|----------|-----------|----------|--------|
| NativeArbAthenaClient (old) | `0xEC9446A163E74D2fBF3def75324895204415166D` | `0x0688FcF38eA366a7fACe4b056F0eC6b66E6DA06E` | Agent wallet `0xb8dC...` key lost |
| NativeArbOpenWorkJobContract (old) | `0xEE57ee10cCAB26f5642d4EbDC15B3881Bb0B5587` | `0xC14310DE9C057FBF54797E7118abcD5C412BFcD2` | Agent wallet `0xb8dC...` key lost |

---

## Outstanding Actions

- [x] Verify all contracts on block explorers — 21/23 done, 2 need agent environment
- [x] Update webapp with new ArbAthenaClient (`0xB5d3...`) and ArbLOWJC (`0x5727...`) proxy addresses
- [ ] Investigate ETHOpenworkDAO unknown impl `0xAc0D2b74...` — verify from agent repo
- [ ] Verify NativeAthena V5 impl from agent compilation environment
- [ ] Revoke old abandoned proxy addresses from authorizedContracts
- [ ] Run config value audit on active development contracts
- [ ] Transfer any remaining USDC from old ArbLOWJC proxy if applicable
