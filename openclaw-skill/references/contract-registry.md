# Contract Registry

Complete list of all deployed OpenWork contracts across all chains.

## Mainnet — Arbitrum One (Native Chain)

The source of truth. All state, escrow, and business logic live here.

### Upgradeable (UUPS Proxy)

| Contract | Proxy | Implementation |
|----------|-------|----------------|
| NativeOpenworkGenesis | `0xE8f7963fF3cE9f7dB129e3f619abd71cBB5Bb294` | `0x4756294bE516f73e8D1984E7a94E4ABaffA94c4d` |
| NOWJC (NativeOpenWorkJobContract) | `0x8EfbF240240613803B9c9e716d4b5AD1388aFd99` | `0xe86eD7b58702f55020c8d473f7b9EA7c59bc479A` |
| NativeOpenworkDAO | `0x24af98d763724362DC920507b351cC99170a5aa4` | `0x20Fa268106A3C532cF9F733005Ab48624105c42F` |
| NativeAthena | `0xE6B9d996b56162cD7eDec3a83aE72943ee7C46Bf` | `0x45747a4A5c78F8D480203d1E81b4c9c7AbaDE018` |
| NativeProfileGenesis | `0x794809471215cBa5cE56c7d9F402eDd85F9eBa2E` | `0xae31d7be760D92807B013a71bb51f2cBB132166b` |
| NativeAthenaActivityTracker | `0x8C04840c3f5b5a8c44F9187F9205ca73509690EA` | `0x9588A78748a8bc82295bf44d87C4b9F924d11AE8` |
| NativeAthenaOracleManager | `0xEdF3Bcf87716bE05e35E12bA7C0Fc6e1879c0f15` | `0xE1e1Cc40897DDaeED44a3194B0e53DFb4171ef59` |
| NativeProfileManager | `0x51285003A01319c2f46BB2954384BCb69AfB1b45` | `0xf82D59Cf9339D500C1b35C87D02dE422223812f6` |

### Non-Upgradeable

| Contract | Address |
|----------|---------|
| NativeLZOpenworkBridge V2 | `0x1bC57d93eC9F9214EDe2e81281A26Ac0E01A9A5F` |
| NativeRewardsContract | `0x5E80B57E1C465498F3E0B4360397c79A64A67Ce9` |
| CCTPTransceiver | `0x765D70496Ef775F6ba1cB7465c2e0B296eB50d87` |
| NativeContractRegistry | `0x29D61B1a9E2837ABC0810925429Df641CBed58c3` |
| NativeGenesisReader | `0x72ee091C288512f0ee9eB42B8C152fbB127Dc782` |

## Mainnet — Optimism (Local Chain)

User-facing chain. Low gas fees. Users interact here.

### Upgradeable (UUPS Proxy)

| Contract | Proxy | Implementation |
|----------|-------|----------------|
| LOWJC Lite (LocalOpenWorkJobContract) | `0x620205A4Ff0E652fF03a890d2A677de878a1dB63` | `0x8255A7fa5409194bbC0c85c2Eaa71Cf2f5763Fd3` |

### Non-Upgradeable

| Contract | Address |
|----------|---------|
| LocalLZOpenworkBridge | `0x74566644782e98c87a12E8Fc6f7c4c72e2908a36` |
| CCTPTransceiver | `0x586C700ACFA1D129Ba2C6a6E673c55d586c32f15` |
| LocalAthena | `0x4756294bE516f73e8D1984E7a94E4ABaffA94c4d` (proxy) |

## Mainnet — Ethereum (Main Chain)

Governance and token.

| Contract | Address | Type |
|----------|---------|------|
| ETHOpenworkDAO | `0xE8f7963fF3cE9f7dB129e3f619abd71cBB5Bb294` (proxy) | UUPS Proxy |
| ETHRewardsContract | `0x4756294bE516f73e8D1984E7a94E4ABaffA94c4d` | Non-Upgradeable |
| OWORK Token | `0x765D70496Ef775F6ba1cB7465c2e0B296eB50d87` | ERC20 |
| ETHLZOpenworkBridge | `0x20Fa268106A3C532cF9F733005Ab48624105c42F` | Non-Upgradeable |

## External Dependencies

| Contract | Arbitrum | Optimism | Ethereum |
|----------|----------|----------|----------|
| USDC | `0xaf88d065e77c8cC2239327C5EDb3A432268e5831` | `0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85` | — |
| LZ Endpoint V2 | `0x1a44076050125825900e736c501f859c50fE728c` | `0x1a44076050125825900e736c501f859c50fE728c` | `0x1a44076050125825900e736c501f859c50fE728c` |
| TokenMessengerV2 (CCTP) | `0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d` | `0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d` | `0xBd3fa81B58Ba92a82136038B25aDec7066af3155` |
| MessageTransmitterV2 (CCTP) | `0x81D40F21F12A8F0E3252Bccb954D722d4c464B64` | `0x4D41f22c5a0e5c74090899E5a8Fb597a8842b3e8` | `0x0a992d191deec32afe36203ad87d7d289a738f81` |

## Chain Quick Reference

| Chain | Chain ID | LZ EID | CCTP Domain | Role |
|-------|----------|--------|-------------|------|
| Arbitrum One | 42161 | 30110 | 3 | Native (state + escrow) |
| Optimism | 10 | 30111 | 2 | Local (user-facing) |
| Ethereum | 1 | 30101 | 0 | Main (governance + token) |

## RPC Endpoints

Standard public RPCs:
- Arbitrum: `https://arb1.arbitrum.io/rpc`
- Optimism: `https://mainnet.optimism.io`
- Ethereum: `https://eth.llamarpc.com`

## Deployer

All contracts deployed by: `0x7a2B7feAB9b0e30A5368d3CC4CB8279c9606384C`

## Verifying Proxy Implementations

To check which implementation a proxy is currently pointing to:

```bash
cast storage <PROXY_ADDRESS> 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc --rpc-url <RPC_URL>
```

The result is the implementation contract address (right-padded to 32 bytes).
