# Openwork Deployed Contracts Registry

**Last Updated:** January 23, 2026

---

## Network Reference

| Network | Chain ID | LZ EID | Type |
|---------|----------|--------|------|
| Arbitrum Sepolia | 421614 | 40231 | Native (Testnet) |
| Optimism Sepolia | 11155420 | 40232 | Local (Testnet) |
| Ethereum Sepolia | 11155111 | 40161 | ETH (Testnet) |
| Arbitrum One | 42161 | 30110 | Native (Mainnet) |
| Optimism | 10 | 30111 | Local (Mainnet) |
| Ethereum | 1 | 30101 | ETH (Mainnet) |

---

# TESTNET CONTRACTS

## Arbitrum Sepolia (Native Chain) - LZ EID: 40231

### Core Contracts

| Contract | Type | Address | Notes |
|----------|------|---------|-------|
| NativeOpenworkGenesis | Proxy | `0x00Fad82208A77232510cE16CBB63c475A914C95a` | Job/user data storage |
| NativeOpenWorkJobContract (NOWJC) | Proxy | `0x39158a9F92faB84561205B05223929eFF131455e` | Job lifecycle management |
| NativeOpenworkDAO | Proxy | `0x3e0C062DbbC61ec6D7ac8Ab14d9B05F31484C113` | Governance |
| NativeAthena | Proxy | `0x2d9C882C450B5e992C1F5bE5f0594654ae4B4f1f` | Dispute resolution |
| NativeRewardsContract | Standalone | `0xaf2661D3430311b5372fda7ef60d099C1CdaFaf0` | Rewards + voting power (NEW) |
| NativeLZOpenworkBridge | Proxy | `0x4E8A3Cb25BbE74C44fD9b731e214e6A5c5CAF502` | Cross-chain messaging |

### Supporting Contracts

| Contract | Type | Address | Notes |
|----------|------|---------|-------|
| NativeProfileGenesis | Proxy | `0x45468344678D2Af5353fb4b5E825A21b186Fa57a` | Profile data storage |
| ProfileManager | Proxy | `0xbf26f05A4e14f1Cb410424AA5242993eF121c2F7` | Profile management |
| OracleManager | Proxy | `0x24BB11ffA6b68a007297A0132e6D9f71638bA2ce` | Oracle management |
| ActivityTracker | Proxy | `0x7b2cBA5368d5F02Cb86CEbB11a4A4e071545A755` | User activity tracking |
| CCTPTransceiver | Standalone | `0x959d0fc6dD8efCf764BD3B0bbaC191F2D7Dd03f1` | USDC transfers |

### Latest Implementations (8-Jan Version + Fixes)

| Contract | Implementation Address | Version |
|----------|----------------------|---------|
| Genesis | `0x7fb9C7BA38577F71916b776DEb9DD854f8dD0465` | 8-Jan |
| NOWJC | `0x87De81B5659e7416D7C1dfbf5491d920c847406D` | Refactored + applicant fix |
| DAO | `0x93FD21E979B7893eDd3f04aDa75f11b6E9b08541` | Voting power fix |
| Athena | `0x8Cd52D25F1F717912A50Ba4162F42F3AdbD8acDd` | Refactored + voting power fix |
| ProfileGenesis | `0x48b56ae7DB57924b992F6EA7176633D3B5f110A9` | 8-Jan |

### External Dependencies (Arbitrum Sepolia)

| Contract | Address | Source |
|----------|---------|--------|
| USDC | `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d` | Circle |
| LZ Endpoint V2 | `0x6EDCE65403992e310A62460808c4b910D972f10f` | LayerZero |
| TokenMessengerV2 | `0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA` | Circle CCTP |
| MessageTransmitterV2 | `0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275` | Circle CCTP |

---

## Optimism Sepolia (Local Chain) - LZ EID: 40232

### Core Contracts

| Contract | Type | Address | Notes |
|----------|------|---------|-------|
| LocalOpenWorkJobContract (LOWJC) | Proxy | `0x36aAEAbF2C04F1BecD520CF34Ef62783a9A446Db` | Local job management |
| LocalAthena | Proxy | `0xed81395eb69ac568f92188948C1CC1adfD595361` | Local dispute handling |
| LocalLZOpenworkBridge | Standalone | `0xc0a7B2a893Be5Fd4E4Fee8485744bF7AA321F28b` | Cross-chain messaging |
| CCTPTransceiver | Standalone | `0x3c820FE16F7B85BA193527E5ca64dd3193F6ABB3` | USDC transfers |

### Latest Implementations

| Contract | Implementation Address | Version |
|----------|----------------------|---------|
| LOWJC | `0x6fB881b4830EBBb82da920Eca29fED05AeB88e44` | 8-Jan |
| LocalAthena | `0x850b5f7C9Fd286a3C73251F101fCFa83E1be887d` | 8-Jan |

### External Dependencies (Optimism Sepolia)

| Contract | Address | Source |
|----------|---------|--------|
| USDC | `0x5fd84259d66Cd46123540766Be93DFE6D43130D7` | Circle |
| LZ Endpoint V2 | `0x6EDCE65403992e310A62460808c4b910D972f10f` | LayerZero |
| TokenMessengerV2 | `0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA` | Circle CCTP |
| MessageTransmitterV2 | `0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275` | Circle CCTP |

---

## Ethereum Sepolia (ETH Chain) - LZ EID: 40161

### Core Contracts

| Contract | Type | Address | Notes |
|----------|------|---------|-------|
| OpenworkToken (OWORK) | Standalone | `0xd8Ba6A37Ba9ee222593e6CbF005273897dd06c98` | Governance token |
| ETHOpenworkDAO | Proxy | `0x5F046980A58acC24530b5BBf483e844A518936FD` | Main chain DAO |
| ETHRewardsContract | Standalone | `0x5081183C6812C8066D6Ec6cCdc974e6Ce830596D` | Token distribution |
| ETHLZOpenworkBridge | Standalone | `0xdA4f8BE0A233972eDcdC43eaf39ED828B75C89e8` | Cross-chain messaging |

### Token Distribution

| Holder | Amount | Percentage |
|--------|--------|------------|
| ETHRewardsContract | 750,000,000 OWORK | 75% |
| ETHOpenworkDAO | 250,000,000 OWORK | 25% |

### Latest Implementations

| Contract | Implementation Address | Version |
|----------|----------------------|---------|
| ETHOpenworkDAO | `0xD3bB6936cBe67942Dd1D438490c5698063FFb09C` | 8-Jan |

### External Dependencies (Ethereum Sepolia)

| Contract | Address | Source |
|----------|---------|--------|
| LZ Endpoint V2 | `0x6EDCE65403992e310A62460808c4b910D972f10f` | LayerZero |

---

## Cross-Chain Peer Configuration (Testnet)

| Source Chain | Target Chain | Peer Address |
|--------------|--------------|--------------|
| Native (40231) | ETH (40161) | `0xdA4f8BE0A233972eDcdC43eaf39ED828B75C89e8` |
| Native (40231) | Local (40232) | `0xc0a7B2a893Be5Fd4E4Fee8485744bF7AA321F28b` |
| ETH (40161) | Native (40231) | `0x4E8A3Cb25BbE74C44fD9b731e214e6A5c5CAF502` |
| Local (40232) | Native (40231) | `0x4E8A3Cb25BbE74C44fD9b731e214e6A5c5CAF502` |

---

# MAINNET CONTRACTS

## Arbitrum One (Native Chain) - LZ EID: 30110

**Deployer:** `0x7a2B7feAB9b0e30A5368d3CC4CB8279c9606384C`

### Implementations Deployed

| Contract | Type | Address | TX | Status |
|----------|------|---------|-----|--------|
| NativeOpenWorkJobContract (NOWJC) | Implementation | `0x74566644782e98c87a12E8Fc6f7c4c72e2908a36` | `0xc741bad...` | ✅ Deployed |
| NativeAthena | Implementation | `0x00c70838cA0de7F1Eb192Bd7a11A7F2e14407510` | `0x71e9e00...` | ✅ Deployed |
| NativeOpenworkDAO | Implementation | `0x20Fa268106A3C532cF9F733005Ab48624105c42F` | `0x51de1b9...` | ✅ Deployed |
| NativeLZOpenworkBridge V2 | Non-Upgradeable | `0x1bC57d93eC9F9214EDe2e81281A26Ac0E01A9A5F` | `0x6fc89c5...` | ✅ **ACTIVE** (Jan 24) - User refund address fix |
| NativeLZOpenworkBridge V1 | Non-Upgradeable | `0xF78B688846673C3f6b93184BeC230d982c0db0c9` | `0xe5576bb...` | ⚠️ DEPRECATED - refund to non-payable contract |
| NativeRewardsContract V2 | Non-Upgradeable | `0x5E80B57E1C465498F3E0B4360397c79A64A67Ce9` | `0x1185676...` | ✅ **ACTIVE** (Jan 23) - Graceful referrer fix |
| NativeRewardsContract V1 | Non-Upgradeable | `0x5cF21bFb944B6851048F9ac18a8C84F6323a8ce7` | `0x5a1982e...` | ⚠️ DEPRECATED - reverts on missing profile |
| NativeOpenworkGenesis | Implementation | `0x4756294bE516f73e8D1984E7a94E4ABaffA94c4d` | `0x6f7bcca...` | ✅ Deployed |
| CCTPTransceiver | Non-Upgradeable | `0x765D70496Ef775F6ba1cB7465c2e0B296eB50d87` | `0x1824333...` | ✅ Deployed |

### Proxies

| Contract | Type | Address | Status |
|----------|------|---------|--------|
| Genesis Proxy | Proxy | `0xE8f7963fF3cE9f7dB129e3f619abd71cBB5Bb294` | ✅ Deployed |
| NOWJC Proxy | Proxy | `0x8EfbF240240613803B9c9e716d4b5AD1388aFd99` | ✅ Deployed |
| DAO Proxy | Proxy | `0x24af98d763724362DC920507b351cC99170a5aa4` | ✅ Deployed |
| Athena Proxy | Proxy | `0xE6B9d996b56162cD7eDec3a83aE72943ee7C46Bf` | ✅ Deployed |

### Supporting Contracts (Jan 22, 2026)

| Contract | Implementation | Proxy | Status |
|----------|---------------|-------|--------|
| NativeProfileGenesis | `0xae31d7be760D92807B013a71bb51f2cBB132166b` | `0x794809471215cBa5cE56c7d9F402eDd85F9eBa2E` | ✅ Verified |
| NativeAthenaActivityTracker | `0x9588A78748a8bc82295bf44d87C4b9F924d11AE8` | `0x8C04840c3f5b5a8c44F9187F9205ca73509690EA` | ✅ Verified |
| NativeAthenaOracleManager | `0xE1e1Cc40897DDaeED44a3194B0e53DFb4171ef59` | `0xEdF3Bcf87716bE05e35E12bA7C0Fc6e1879c0f15` | ✅ Verified |
| NativeProfileManager | `0xf82D59Cf9339D500C1b35C87D02dE422223812f6` | `0x51285003A01319c2f46BB2954384BCb69AfB1b45` | ✅ Verified |
| NativeContractRegistry | `0x29D61B1a9E2837ABC0810925429Df641CBed58c3` | N/A (Non-Upgradeable) | ✅ Verified |
| NativeGenesisReader | `0x72ee091C288512f0ee9eB42B8C152fbB127Dc782` | N/A (Non-Upgradeable) | ✅ Verified |

### External Dependencies (Arbitrum One)

**Sources:**
- USDC: https://developers.circle.com/stablecoins/usdc-contract-addresses
- CCTP V2: https://developers.circle.com/cctp/references/contract-addresses
- LayerZero: https://docs.layerzero.network/v2/developers/evm/technical-reference/deployed-contracts

| Contract | Address | Source |
|----------|---------|--------|
| USDC | `0xaf88d065e77c8cC2239327C5EDb3A432268e5831` | Circle |
| LZ Endpoint V2 | `0x1a44076050125825900e736c501f859c50fE728c` | LayerZero |
| TokenMessengerV2 | `0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d` | Circle CCTP V2 (Domain 3) |
| MessageTransmitterV2 | `0x81D40F21F12A8F0E3252Bccb954D722d4c464B64` | Circle CCTP V2 (Domain 3) |

---

## Optimism (Local Chain) - LZ EID: 30111

**Deployer:** `0x7a2B7feAB9b0e30A5368d3CC4CB8279c9606384C`

### Infrastructure Contracts

| Contract | Type | Address | Explorer | Notes |
|----------|------|---------|----------|-------|
| LocalLZOpenworkBridge | Non-Upgradeable | `0x74566644782e98c87a12E8Fc6f7c4c72e2908a36` | [OP Etherscan](https://optimistic.etherscan.io/address/0x74566644782e98c87a12E8Fc6f7c4c72e2908a36) | Active |
| CCTPTransceiver V2 | Non-Upgradeable | `0x586C700ACFA1D129Ba2C6a6E673c55d586c32f15` | [OP Etherscan](https://optimistic.etherscan.io/address/0x586C700ACFA1D129Ba2C6a6E673c55d586c32f15) | ✅ **ACTIVE** (Jan 23) - CCTP V2 |
| CCTPTransceiver V1 | Non-Upgradeable | `0x00c70838cA0de7F1Eb192Bd7a11A7F2e14407510` | [OP Etherscan](https://optimistic.etherscan.io/address/0x00c70838cA0de7F1Eb192Bd7a11A7F2e14407510) | ⚠️ DEPRECATED - wrong CCTP V1 addresses |

### Implementations

| Contract | Address | Explorer | Notes |
|----------|---------|----------|-------|
| LOWJC Impl V3 | `0xcC09C58e654D92CBaa5184E000275500b32b2117` | [OP Etherscan](https://optimistic.etherscan.io/address/0xcC09C58e654D92CBaa5184E000275500b32b2117) | **ACTIVE** (Jan 23) - used by V4 Proxy |
| LOWJC Impl V2 | `0xfab6Eb4858f1c9C2445787Ff142582DE291F0dEC` | [OP Etherscan](https://optimistic.etherscan.io/address/0xfab6Eb4858f1c9C2445787Ff142582DE291F0dEC) | ⚠️ DEPRECATED |
| LOWJC Impl V1 | `0x20Fa268106A3C532cF9F733005Ab48624105c42F` | [OP Etherscan](https://optimistic.etherscan.io/address/0x20Fa268106A3C532cF9F733005Ab48624105c42F) | ⚠️ DEPRECATED |
| LocalAthena Impl | `0xF78B688846673C3f6b93184BeC230d982c0db0c9` | [OP Etherscan](https://optimistic.etherscan.io/address/0xF78B688846673C3f6b93184BeC230d982c0db0c9) | Active |

### Proxies

| Contract | Type | Address | Status | Notes |
|----------|------|---------|--------|-------|
| LOWJC Proxy V4 | Proxy | `0x620205A4Ff0E652fF03a890d2A677de878a1dB63` | ✅ **ACTIVE** | chainId=30111, impl=V3 (Jan 23) |
| LOWJC Proxy V3 | Proxy | `0xA7D0A8bDa23e556c3ac32a20De6D81E0Ee5c95fC` | ⚠️ DEPRECATED | impl mismatch issue |
| LOWJC Proxy V2 | Proxy | `0xDae5036a1d9E7C6CE953604FF238E13BD2B83951` | ⚠️ DEPRECATED | chainId=30111 |
| LOWJC Proxy V1 | Proxy | `0x5cF21bFb944B6851048F9ac18a8C84F6323a8ce7` | ⚠️ DEPRECATED | chainId=2 (wrong) |
| LocalAthena Proxy | Proxy | `0x4756294bE516f73e8D1984E7a94E4ABaffA94c4d` | ✅ Deployed |

### External Dependencies (Optimism)

| Contract | Address | Source |
|----------|---------|--------|
| USDC | `0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85` | Circle |
| LZ Endpoint V2 | `0x1a44076050125825900e736c501f859c50fE728c` | LayerZero |
| TokenMessengerV2 | `0x2B4069517957735bE00ceE0fadAE88a26365528f` | Circle CCTP |
| MessageTransmitterV2 | `0x4D41f22c5a0e5c74090899E5a8Fb597a8842b3e8` | Circle CCTP |

---

## Ethereum Mainnet (ETH Chain) - LZ EID: 30101

**Deployer:** `0x7a2B7feAB9b0e30A5368d3CC4CB8279c9606384C`

### Core Contracts

| Contract | Type | Address | Status |
|----------|------|---------|--------|
| ETHLZOpenworkBridge | Non-Upgradeable | `0x20Fa268106A3C532cF9F733005Ab48624105c42F` | ✅ Deployed (Jan 18) |
| ETHOpenworkDAO Impl | Implementation | `0xF78B688846673C3f6b93184BeC230d982c0db0c9` | ✅ Deployed (Jan 18) |
| ETHOpenworkDAO Proxy | Proxy | `0xE8f7963fF3cE9f7dB129e3f619abd71cBB5Bb294` | ✅ Initialized (Jan 22) |
| ETHRewardsContract | Non-Upgradeable | `0x4756294bE516f73e8D1984E7a94E4ABaffA94c4d` | ✅ Token set (Jan 22) |
| OpenworkToken (OWORK) | ERC20 + Votes | `0x765D70496Ef775F6ba1cB7465c2e0B296eB50d87` | ✅ mainDAO set (Jan 22) |

### Token Distribution (After Deployment)

| Holder | Amount | Percentage |
|--------|--------|------------|
| ETHRewardsContract | 750,000,000 OWORK | 75% |
| ETHOpenworkDAO Proxy | 250,000,000 OWORK | 25% |

### Cross-Chain Peers Configured

| From | To | Status |
|------|-----|--------|
| ETH Bridge → Arbitrum Bridge | EID 30110 | ✅ |
| Arbitrum Bridge → ETH Bridge | EID 30101 | ✅ |

### External Dependencies (Ethereum Mainnet)

| Contract | Address | Source |
|----------|---------|--------|
| LZ Endpoint V2 | `0x1a44076050125825900e736c501f859c50fE728c` | LayerZero |
| TokenMessengerV2 | `0xBd3fa81B58Ba92a82136038B25aDec7066af3155` | Circle CCTP |
| MessageTransmitterV2 | `0x0a992d191deec32afe36203ad87d7d289a738f81` | Circle CCTP |

---

# Contract Version History

## January 2026 Security Fixes

| Fix | Description | Contracts Affected |
|-----|-------------|-------------------|
| Voting Power Centralization | All voting power calculated via RewardsContract.getRewardBasedVotingPower() | DAO, Athena, NOWJC, Rewards |
| Team Tokens in Voting | Team token allocations now count toward governance power | RewardsContract |
| Self-Employment Prevention | Job giver cannot apply to own job | NOWJC |
| Non-Upgradeable Rewards | Rewards contracts made non-upgradeable for security | NativeRewards, ETHRewards |

## Source Files

| Version | Folder |
|---------|--------|
| Mainnet Ready | `src/suites/mainnet-ready/` |
| 8-Jan Version | `src/suites/openwork-all-contracts-8-Jan-version/` |
| Refactored (extra) | `src/suites/openwork-all-contracts-8-Jan-version/extra/` |

---

# Deployment Logs

| Date | Network | Log File |
|------|---------|----------|
| Jan 2, 2026 | Testnet (All) | `references/logs/imp/deployment-log-testnet-2-jan-26.md` |
| Jan 9, 2026 | Testnet (Fixes) | `references/logs/9-Jan-logs/9-Jan-deployment-log.md` |
| Jan 18, 2026 | Mainnet | `references/logs/imp/deployment-log-mainnet-jan-18-2026.md` |
