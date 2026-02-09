# Openwork Deployed Contracts Registry

**Last Updated:** February 9, 2026

---

## Network Reference

| Network | Chain ID | LZ EID | CCTP Domain | Type |
|---------|----------|--------|-------------|------|
| Arbitrum One | 42161 | 30110 | 3 | Native (Mainnet) |
| Optimism | 10 | 30111 | 2 | Local (Mainnet) |
| Ethereum | 1 | 30101 | 0 | ETH (Mainnet) |
| Arbitrum Sepolia | 421614 | 40231 | 3 | Native (Testnet) |
| Optimism Sepolia | 11155420 | 40232 | 2 | Local (Testnet) |
| Ethereum Sepolia | 11155111 | 40161 | 0 | ETH (Testnet) |

---

# MAINNET - ACTIVE CONTRACTS

**Deployer:** `0x7a2B7feAB9b0e30A5368d3CC4CB8279c9606384C`

---

## Arbitrum One (Native Chain) - LZ EID: 30110

### Upgradeable Contracts (UUPS Proxy)

| Contract | Proxy | Latest Implementation | Version |
|----------|-------|-----------------------|---------|
| NativeOpenworkGenesis | `0xE8f7963fF3cE9f7dB129e3f619abd71cBB5Bb294` | `0x4756294bE516f73e8D1984E7a94E4ABaffA94c4d` | Jan 18 |
| NativeOpenWorkJobContract (NOWJC) | `0x8EfbF240240613803B9c9e716d4b5AD1388aFd99` | `0x8F7f3E9376963691CE568843afad7E1977730fBA` | V2 - Balance fix (Jan 27) |
| NativeOpenworkDAO | `0x24af98d763724362DC920507b351cC99170a5aa4` | `0x20Fa268106A3C532cF9F733005Ab48624105c42F` | Jan 18 |
| NativeAthena | `0xE6B9d996b56162cD7eDec3a83aE72943ee7C46Bf` | `0x45747a4A5c78F8D480203d1E81b4c9c7AbaDE018` | V3 - Dynamic EID + fee fix (Feb 9) |
| NativeProfileGenesis | `0x794809471215cBa5cE56c7d9F402eDd85F9eBa2E` | `0xae31d7be760D92807B013a71bb51f2cBB132166b` | Jan 22 |
| NativeAthenaActivityTracker | `0x8C04840c3f5b5a8c44F9187F9205ca73509690EA` | `0x9588A78748a8bc82295bf44d87C4b9F924d11AE8` | Jan 22 |
| NativeAthenaOracleManager | `0xEdF3Bcf87716bE05e35E12bA7C0Fc6e1879c0f15` | `0xE1e1Cc40897DDaeED44a3194B0e53DFb4171ef59` | Jan 22 |
| NativeProfileManager | `0x51285003A01319c2f46BB2954384BCb69AfB1b45` | `0xf82D59Cf9339D500C1b35C87D02dE422223812f6` | Jan 22 |

### Non-Upgradeable Contracts

| Contract | Address | Version |
|----------|---------|---------|
| NativeLZOpenworkBridge | `0x1bC57d93eC9F9214EDe2e81281A26Ac0E01A9A5F` | V2 - Refund fix (Jan 24) |
| NativeRewardsContract | `0x5E80B57E1C465498F3E0B4360397c79A64A67Ce9` | V2 - Graceful referrer (Jan 23) |
| CCTPTransceiver | `0x765D70496Ef775F6ba1cB7465c2e0B296eB50d87` | Jan 18 |
| NativeContractRegistry | `0x29D61B1a9E2837ABC0810925429Df641CBed58c3` | Jan 22 |
| NativeGenesisReader | `0x72ee091C288512f0ee9eB42B8C152fbB127Dc782` | Jan 22 |

### External Dependencies (Arbitrum One)

| Contract | Address | Source |
|----------|---------|--------|
| USDC | `0xaf88d065e77c8cC2239327C5EDb3A432268e5831` | Circle |
| LZ Endpoint V2 | `0x1a44076050125825900e736c501f859c50fE728c` | LayerZero |
| TokenMessengerV2 | `0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d` | Circle CCTP V2 (Domain 3) |
| MessageTransmitterV2 | `0x81D40F21F12A8F0E3252Bccb954D722d4c464B64` | Circle CCTP V2 (Domain 3) |

---

## Optimism (Local Chain) - LZ EID: 30111

### Upgradeable Contracts (UUPS Proxy)

| Contract | Proxy | Latest Implementation | Version |
|----------|-------|-----------------------|---------|
| LocalOpenWorkJobContract Lite (LOWJC) | `0x620205A4Ff0E652fF03a890d2A677de878a1dB63` | `0x8255A7fa5409194bbC0c85c2Eaa71Cf2f5763Fd3` | Lite V5 - setJobCounter (Jan 27) |
| LocalAthena | `0x4756294bE516f73e8D1984E7a94E4ABaffA94c4d` | `0xF78B688846673C3f6b93184BeC230d982c0db0c9` | Jan 18 |

### Non-Upgradeable Contracts

| Contract | Address | Version |
|----------|---------|---------|
| LocalLZOpenworkBridge | `0x74566644782e98c87a12E8Fc6f7c4c72e2908a36` | Jan 18 |
| CCTPTransceiver | `0x586C700ACFA1D129Ba2C6a6E673c55d586c32f15` | V2 - CCTP V2 addresses (Jan 23) |

### External Dependencies (Optimism)

| Contract | Address | Source |
|----------|---------|--------|
| USDC | `0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85` | Circle |
| LZ Endpoint V2 | `0x1a44076050125825900e736c501f859c50fE728c` | LayerZero |
| TokenMessengerV2 | `0x2B4069517957735bE00ceE0fadAE88a26365528f` | Circle CCTP V2 (Domain 2) |
| MessageTransmitterV2 | `0x4D41f22c5a0e5c74090899E5a8Fb597a8842b3e8` | Circle CCTP V2 (Domain 2) |

---

## Ethereum Mainnet (ETH Chain) - LZ EID: 30101

### Upgradeable Contracts (UUPS Proxy)

| Contract | Proxy | Latest Implementation | Version |
|----------|-------|-----------------------|---------|
| ETHOpenworkDAO | `0xE8f7963fF3cE9f7dB129e3f619abd71cBB5Bb294` | `0xF78B688846673C3f6b93184BeC230d982c0db0c9` | Jan 18 |

### Non-Upgradeable Contracts

| Contract | Address | Version |
|----------|---------|---------|
| ETHLZOpenworkBridge | `0x20Fa268106A3C532cF9F733005Ab48624105c42F` | Jan 18 |
| ETHRewardsContract | `0x4756294bE516f73e8D1984E7a94E4ABaffA94c4d` | Jan 22 |
| OpenworkToken (OWORK) | `0x765D70496Ef775F6ba1cB7465c2e0B296eB50d87` | Jan 22 - ERC20 + Votes |

### Token Distribution

| Holder | Amount | Percentage |
|--------|--------|------------|
| ETHRewardsContract | 750,000,000 OWORK | 75% |
| ETHOpenworkDAO Proxy | 250,000,000 OWORK | 25% |

### External Dependencies (Ethereum Mainnet)

| Contract | Address | Source |
|----------|---------|--------|
| LZ Endpoint V2 | `0x1a44076050125825900e736c501f859c50fE728c` | LayerZero |
| TokenMessengerV2 | `0xBd3fa81B58Ba92a82136038B25aDec7066af3155` | Circle CCTP V2 (Domain 0) |
| MessageTransmitterV2 | `0x0a992d191deec32afe36203ad87d7d289a738f81` | Circle CCTP V2 (Domain 0) |

---

## Cross-Chain Peer Configuration (Mainnet)

| Source Bridge | Target EID | Target Bridge |
|---------------|------------|---------------|
| Native (Arbitrum) `0x1bC57d93eC9F9214EDe2e81281A26Ac0E01A9A5F` | 30101 (ETH) | `0x20Fa268106A3C532cF9F733005Ab48624105c42F` |
| Native (Arbitrum) `0x1bC57d93eC9F9214EDe2e81281A26Ac0E01A9A5F` | 30111 (OP) | `0x74566644782e98c87a12E8Fc6f7c4c72e2908a36` |
| ETH `0x20Fa268106A3C532cF9F733005Ab48624105c42F` | 30110 (Arb) | `0x1bC57d93eC9F9214EDe2e81281A26Ac0E01A9A5F` |
| Local (OP) `0x74566644782e98c87a12E8Fc6f7c4c72e2908a36` | 30110 (Arb) | `0x1bC57d93eC9F9214EDe2e81281A26Ac0E01A9A5F` |

---

# MAINNET - DEPRECATED CONTRACTS

### Arbitrum One

| Contract | Address | Reason |
|----------|---------|--------|
| NativeRewardsContract V1 | `0x5cF21bFb944B6851048F9ac18a8C84F6323a8ce7` | Reverts on missing profile |
| NativeLZOpenworkBridge V1 | `0xF78B688846673C3f6b93184BeC230d982c0db0c9` | Refund to non-payable contract |
| NOWJC Impl V1 | `0x74566644782e98c87a12E8Fc6f7c4c72e2908a36` | Superseded by V2 balance fix |
| NativeAthena Impl V1 | `0x00c70838cA0de7F1Eb192Bd7a11A7F2e14407510` | Superseded by V3 |
| NativeAthena Impl V2 | `0x562AbdE9F89018b83a428F5d7daD9087d59D5a67` | Superseded by V3 fee fix |

### Optimism

| Contract | Address | Reason |
|----------|---------|--------|
| CCTPTransceiver V1 | `0x00c70838cA0de7F1Eb192Bd7a11A7F2e14407510` | Wrong CCTP V1 addresses |
| LOWJC Proxy V1 | `0x5cF21bFb944B6851048F9ac18a8C84F6323a8ce7` | Wrong chainId (2) |
| LOWJC Proxy V2 | `0xDae5036a1d9E7C6CE953604FF238E13BD2B83951` | Broken upgrade mechanism |
| LOWJC Proxy V3 | `0xA7D0A8bDa23e556c3ac32a20De6D81E0Ee5c95fC` | Impl slot mismatch |

---

# TESTNET CONTRACTS

## Arbitrum Sepolia (Native Chain) - LZ EID: 40231

### Core Contracts

| Contract | Type | Address |
|----------|------|---------|
| NativeOpenworkGenesis | Proxy | `0x00Fad82208A77232510cE16CBB63c475A914C95a` |
| NativeOpenWorkJobContract (NOWJC) | Proxy | `0x39158a9F92faB84561205B05223929eFF131455e` |
| NativeOpenworkDAO | Proxy | `0x3e0C062DbbC61ec6D7ac8Ab14d9B05F31484C113` |
| NativeAthena | Proxy | `0x2d9C882C450B5e992C1F5bE5f0594654ae4B4f1f` |
| NativeRewardsContract | Standalone | `0xaf2661D3430311b5372fda7ef60d099C1CdaFaf0` |
| NativeLZOpenworkBridge | Proxy | `0x4E8A3Cb25BbE74C44fD9b731e214e6A5c5CAF502` |
| NativeProfileGenesis | Proxy | `0x45468344678D2Af5353fb4b5E825A21b186Fa57a` |
| ProfileManager | Proxy | `0xbf26f05A4e14f1Cb410424AA5242993eF121c2F7` |
| OracleManager | Proxy | `0x24BB11ffA6b68a007297A0132e6D9f71638bA2ce` |
| ActivityTracker | Proxy | `0x7b2cBA5368d5F02Cb86CEbB11a4A4e071545A755` |
| CCTPTransceiver | Standalone | `0x959d0fc6dD8efCf764BD3B0bbaC191F2D7Dd03f1` |

## Optimism Sepolia (Local Chain) - LZ EID: 40232

| Contract | Type | Address |
|----------|------|---------|
| LocalOpenWorkJobContract (LOWJC) | Proxy | `0x36aAEAbF2C04F1BecD520CF34Ef62783a9A446Db` |
| LocalAthena | Proxy | `0xed81395eb69ac568f92188948C1CC1adfD595361` |
| LocalLZOpenworkBridge | Standalone | `0xc0a7B2a893Be5Fd4E4Fee8485744bF7AA321F28b` |
| CCTPTransceiver | Standalone | `0x3c820FE16F7B85BA193527E5ca64dd3193F6ABB3` |

## Ethereum Sepolia (ETH Chain) - LZ EID: 40161

| Contract | Type | Address |
|----------|------|---------|
| OpenworkToken (OWORK) | Standalone | `0xd8Ba6A37Ba9ee222593e6CbF005273897dd06c98` |
| ETHOpenworkDAO | Proxy | `0x5F046980A58acC24530b5BBf483e844A518936FD` |
| ETHRewardsContract | Standalone | `0x5081183C6812C8066D6Ec6cCdc974e6Ce830596D` |
| ETHLZOpenworkBridge | Standalone | `0xdA4f8BE0A233972eDcdC43eaf39ED828B75C89e8` |

---

## Source Files

| Version | Folder |
|---------|--------|
| Current Mainnet | `src/suites/current-mainnet/` |
| Mainnet Ready | `src/suites/mainnet-ready/` |
| 8-Jan Version | `src/suites/openwork-all-contracts-8-Jan-version/` |

## Deployment Logs

| Date | Network | Log File |
|------|---------|----------|
| Jan 2, 2026 | Testnet (All) | `references/logs/imp/deployment-log-testnet-2-jan-26.md` |
| Jan 9, 2026 | Testnet (Fixes) | `references/logs/9-Jan-logs/9-Jan-deployment-log.md` |
| Jan 18, 2026 | Mainnet | `references/logs/imp/deployment-log-mainnet-jan-18-2026.md` |
