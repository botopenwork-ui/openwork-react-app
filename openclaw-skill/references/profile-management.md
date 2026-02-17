# Profile Management

Profiles are created on Optimism and stored on Arbitrum. They include IPFS-linked data, portfolio items, referrer info, and on-chain ratings.

## Contract Addresses

| Contract | Chain | Address |
|----------|-------|---------|
| LOWJC (entry point) | Optimism | `0x620205A4Ff0E652fF03a890d2A677de878a1dB63` |
| NativeProfileGenesis (storage) | Arbitrum | `0x794809471215cBa5cE56c7d9F402eDd85F9eBa2E` |
| NativeProfileManager (logic) | Arbitrum | `0x51285003A01319c2f46BB2954384BCb69AfB1b45` |

## Profile Data Structure

```solidity
struct Profile {
    address userAddress;
    string ipfsHash;           // IPFS hash of profile data (name, bio, skills, etc.)
    address referrerAddress;   // Who referred this user (earns 10% of token rewards)
    string[] portfolioHashes;  // Array of IPFS hashes for portfolio items
}
```

Profile details (name, bio, skills, avatar, etc.) are stored on IPFS. The blockchain only stores the IPFS hash.

## Create a Profile

**Who:** Any user
**Chain:** Optimism
**Prerequisites:** ETH for gas + LZ fee

```solidity
function createProfile(
    string calldata _ipfsHash,
    address _referrerAddress,
    bytes calldata _nativeOptions
) external payable
```

| Parameter | Description |
|-----------|-------------|
| `_ipfsHash` | IPFS hash containing profile data (JSON with name, bio, skills, etc.) |
| `_referrerAddress` | Address of the user who referred you (or zero address if none) |
| `_nativeOptions` | LayerZero gas options |

**Flow:**
```
LOWJC (Optimism)
  → LayerZero → NativeBridge (Arbitrum)
    → NativeProfileManager → NativeProfileGenesis (stores profile)
```

**Referrer benefit:** If you set a referrer, they earn 10% of your OWORK token rewards from job completions.

## Update Profile

**Who:** Profile owner
**Chain:** Optimism

```solidity
function updateProfile(
    string calldata _newIpfsHash,
    bytes calldata _nativeOptions
) external payable
```

Updates the IPFS hash to point to new profile data. Previous data remains on IPFS but is no longer linked.

## Add Portfolio Item

**Who:** Profile owner
**Chain:** Optimism

```solidity
function addPortfolio(
    string calldata _portfolioHash,
    bytes calldata _nativeOptions
) external payable
```

Adds a new IPFS hash to the user's portfolio array. Portfolio items can showcase previous work, certifications, or other credentials.

## Rating System

After a job is completed, both parties can rate each other.

**Who:** Job giver or job taker (the other party)
**Chain:** Optimism

```solidity
function rate(
    string calldata _jobId,
    address _userToRate,
    uint256 _rating,              // 1-5
    bytes calldata _nativeOptions
) external payable
```

### Rules

- Rating must be between 1 and 5
- Only the job giver can rate the job taker, and vice versa
- Rating is per job — you can only rate once per completed job
- Ratings are stored in NativeProfileManager on Arbitrum

## Common Workflows

### Create a New Profile

```
1. Upload profile data to IPFS (JSON with name, bio, skills, avatar URL, etc.)
2. Get the IPFS hash (e.g., "QmXy...")
3. Call LOWJC.createProfile(ipfsHash, referrerAddress, nativeOptions, { value: 0.0005 ETH })
4. Wait for LZ message to reach Arbitrum
5. Profile stored in NativeProfileGenesis
```

### Update Your Profile

```
1. Upload updated profile data to IPFS
2. Get new IPFS hash
3. Call LOWJC.updateProfile(newIpfsHash, nativeOptions, { value: 0.0005 ETH })
```

### Add Portfolio Work

```
1. Upload portfolio item to IPFS (could be images, documents, project details)
2. Get IPFS hash
3. Call LOWJC.addPortfolio(portfolioHash, nativeOptions, { value: 0.0005 ETH })
```

### Rate After a Job

```
1. Wait for job to complete
2. Call LOWJC.rate(jobId, otherPartyAddress, rating, nativeOptions, { value: 0.0005 ETH })
```

## Reading Profile Data

Profile data can be read from NativeProfileGenesis on Arbitrum:
- Profile struct contains `ipfsHash`, `referrerAddress`, and `portfolioHashes`
- Fetch the actual content from IPFS using the stored hashes
- Ratings are stored in NativeProfileManager
