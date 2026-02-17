# OpenWork Multi-Chain System - Complete Architecture Guide

**Version**: 2.0 (November 2024)  
**Last Updated**: February 11, 2025

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Principles](#architecture-principles)
3. [Chain Deployment Strategy](#chain-deployment-strategy)
4. [Contract Catalog](#contract-catalog)
5. [Data Flow Patterns](#data-flow-patterns)
6. [User Journeys](#user-journeys)
7. [Security & Upgradeability](#security--upgradeability)

---

## System Overview

OpenWork is a decentralized freelance platform operating across multiple blockchain networks, enabling:

- **Cross-chain job posting and completion**
- **Decentralized dispute resolution via Skill Oracles**
- **Token-based rewards for platform participation**
- **Multi-chain DAO governance**
- **Fast cross-chain USDC payments via CCTP**

### Core Technologies

- **LayerZero V2**: Cross-chain message passing for data synchronization
- **Circle CCTP V2**: Fast USDC transfers for payments and fees
- **UUPS Proxy Pattern**: Upgradeable smart contracts
- **OpenZeppelin Governor**: DAO governance framework

---

## Architecture Principles

### 1. Three-Tier Chain Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    NATIVE CHAIN (Arbitrum)                  │
│                   Central Data & Logic Hub                  │
│  ┌────────────┐  ┌──────────┐  ┌─────────────┐            │
│  │   NOWJC    │  │  Native  │  │   Genesis   │            │
│  │            │  │  Athena  │  │   Storage   │            │
│  └────────────┘  └──────────┘  └─────────────┘            │
└─────────────────────────────────────────────────────────────┘
                           ▲
                           │ LayerZero + CCTP
          ┌────────────────┴────────────────┐
          │                                  │
┌─────────▼─────────┐              ┌────────▼────────┐
│  LOCAL CHAINS     │              │  MAIN/REWARDS   │
│  (ETH, OP, etc)   │              │   CHAIN         │
│  ┌──────────┐     │              │  ┌──────────┐  │
│  │  LOWJC   │     │              │  │ Main DAO │  │
│  │  Athena  │     │              │  │ Rewards  │  │
│  │  Client  │     │              │  └──────────┘  │
│  └──────────┘     │              └─────────────────┘
└───────────────────┘
```

### 2. Separation of Concerns

- **Storage Contracts** (Genesis): Pure data storage, no business logic
- **Logic Contracts** (Managers): Business rules and state transitions
- **Bridge Contracts**: Cross-chain communication orchestration
- **Interface Contracts** (Clients): User-facing entry points on local chains

### 3. Cross-Chain Communication Patterns

**LayerZero**: For data synchronization (job creation, applications, governance)  
**CCTP**: For USDC transfers (payments, dispute fees, rewards)

---

## Chain Deployment Strategy

### Native Chain (Arbitrum Sepolia)
**Purpose**: Central hub for all data and core logic

**Deployed Contracts**:
- Native OpenWork Job Contract (NOWJC)
- Native Athena (dispute resolution)
- Native Athena Oracle Manager
- Native DAO
- Native Rewards
- Native Bridge
- OpenworkGenesis (main data storage)
- ProfileGenesis (profile data storage)
- Profile Manager
- OpenWork Token (OW)

### Local Chains (Ethereum, Optimism, Base, Polygon, etc.)
**Purpose**: User interaction layer, reduce gas costs

**Deployed Contracts**:
- Local OpenWork Job Contract (LOWJC)
- Athena Client
- Local Bridge
- CCTP Transceiver

### Main/Rewards Chain (Could be same as Native or separate)
**Purpose**: DAO governance and rewards token claiming

**Deployed Contracts**:
- Main DAO
- Main Rewards
- Main Chain Bridge
- OpenWork Token (OW)

---

## Contract Catalog

### 1. Job Management Contracts

#### 1.1 LOWJC (Local OpenWork Job Contract)
**Location**: Local Chains (ETH, OP, etc.)  
**File**: `lowjc.sol`

**Purpose**: 
User-facing contract for job posting, applications, and local tracking on each chain.

**Key Responsibilities**:
- Accept job postings with milestones and budgets
- Manage job applications from freelancers
- Handle escrow funding via CCTP (sends USDC to Native chain)
- Track local job state for UI display
- Forward all actions to Native chain via LayerZero

**Key Functions**:
- `postJob()`: Create new job listing
- `applyToJob()`: Submit application with proposed milestones
- `startJob()`: Accept applicant and begin work
- `startDirectContract()`: Create job with pre-selected freelancer
- `submitWork()`: Freelancer submits completed work
- `releasePaymentCrossChain()`: Release payment to any chain
- `releaseAndLockNext()`: Release current milestone, lock next
- `raiseDispute()`: Initiate dispute resolution (via Athena Client)

**Cross-Chain Integration**:
- Sends job data to NOWJC via Local Bridge + LayerZero
- Sends USDC escrow to NOWJC via CCTP Transceiver
- Receives dispute resolutions from Athena Client

**State Storage**: 
Maintains minimal local state, delegates to OpenworkGenesis on Native chain

---

#### 1.2 NOWJC (Native OpenWork Job Contract)
**Location**: Native Chain (Arbitrum)  
**File**: `nowjc.sol`

**Purpose**:
Central job contract that holds all job data and executes core business logic.

**Key Responsibilities**:
- Receive and store all job data from Local chains
- Hold USDC escrow received via CCTP
- Execute payment releases via CCTP to any chain
- Process commission deductions (1% or min $1 USDC)
- Track platform-wide payment totals for rewards calculation
- Integrate with Native Rewards for token distribution
- Handle dispute fund releases from Native Athena

**Key Functions**:
- `postJob()`: Store job from Local chain
- `applyToJob()`: Store application
- `handleStartDirectContract()`: Process direct contracts
- `startJob()`: Activate job with selected applicant
- `releasePaymentCrossChain()`: Execute cross-chain payment via CCTP
- `releaseDisputedFunds()`: Release escrowed funds after dispute resolution
- `incrementGovernanceAction()`: Track user governance participation
- `syncRewardsData()`: Send user rewards to Main chain
- `syncVotingPower()`: Send voting power to Main DAO

**Cross-Chain Integration**:
- Receives job actions via Native Bridge + LayerZero
- Sends USDC payments via CCTP Transceiver
- Coordinates with Native Rewards for token calculations
- Integrates with Native Athena for dispute resolutions

**State Storage**:
Delegates all storage to OpenworkGenesis contract

**Commission System**:
- Calculates 1% commission or minimum $1 USDC per payment
- Accumulates commission in `accumulatedCommission`
- Treasury can withdraw via `withdrawCommission()`

---

### 2. Cross-Chain Bridge Contracts

#### 2.1 Local Bridge (LayerZero OApp)
**Location**: Local Chains  
**File**: `local-bridge.sol`

**Purpose**:
Handles all LayerZero messaging from Local chains to Native and Main chains.

**Key Responsibilities**:
- Send job actions to Native chain
- Send governance actions to Main chain
- Receive dispute resolutions from Native chain
- Receive upgrade commands from Main DAO
- Route messages to correct destination contracts

**Key Functions**:
- `sendToNativeChain()`: Send message to Native chain
- `sendToMainChain()`: Send message to Main/Rewards chain
- `sendToTwoChains()`: Batch send to both destinations
- `quoteNativeChain()`: Get LayerZero fee estimate
- `_lzReceive()`: Process incoming LayerZero messages

**Message Routing**:
- Decodes function name from payload
- Routes to appropriate local contract (Athena Client, LOWJC, etc.)
- Handles upgrade commands from DAO

**Authorization**:
Only authorized contracts can send messages via the bridge

---

#### 2.2 Native Bridge (LayerZero OApp)
**Location**: Native Chain  
**File**: `native-bridge.sol`

**Purpose**:
Central bridge on Native chain for coordinating all cross-chain communications.

**Key Responsibilities**:
- Receive job actions from all Local chains
- Receive governance data from Main chain
- Send dispute resolutions to Local chains
- Send rewards sync to Main chain
- Support multiple Local chain connections

**Key Functions**:
- `sendToMainChain()`: Send to Main/Rewards chain
- `sendToLocalChain()`: Send to specific Local chain (auto-routes by job ID)
- `sendSyncRewardsData()`: Sync user rewards to Main chain
- `sendSyncVotingPower()`: Sync voting power to Main DAO
- `_lzReceive()`: Process incoming messages

**Dynamic Routing**:
- `extractEidFromJobId()`: Parses chain ID from job ID format (e.g., "40232-57")
- `addLocalChain()` / `removeLocalChain()`: Manage supported chains

**Message Handling**:
Routes incoming messages to:
- NOWJC (job actions)
- Native Athena (disputes)
- Native DAO (stake updates)
- Profile Manager (profile updates)

---

#### 2.3 Main Chain Bridge (LayerZero OApp)
**Location**: Main/Rewards Chain  
**File**: `main-chain-bridge.sol`

**Purpose**:
Handles messaging for DAO governance and rewards on the Main chain.

**Key Responsibilities**:
- Send upgrade commands to all chains
- Receive rewards sync from Native chain
- Receive voting power sync from Native chain
- Route to Main DAO and Main Rewards contracts

**Key Functions**:
- `sendUpgradeCommand()`: Execute DAO-approved upgrades
- `sendToNativeChain()`: Send messages to Native chain
- `_lzReceive()`: Process incoming sync messages

**Upgrade Mechanism**:
Main DAO can upgrade contracts on any chain by sending upgrade commands through this bridge

---

#### 2.4 CCTP Transceiver (USDC Transfer)
**Location**: All chains with CCTP support  
**File**: `cctp-v2-ft-transceiver.sol`

**Purpose**:
Fast cross-chain USDC transfers using Circle's CCTP V2 protocol.

**Key Responsibilities**:
- Send USDC to other chains (escrow, payments)
- Use CCTP "fast" mode (finality threshold ≤ 1000)
- Convert addresses to bytes32 for CCTP

**Key Functions**:
- `sendFast()`: Send USDC to destination chain
  - Parameters: amount, destinationDomain, mintRecipient, maxFee
  - Uses `depositForBurn()` under the hood
- `receive()`: Receive USDC from other chains
- `addressToBytes32()`: Helper for address conversion

**CCTP Domain Mapping**:
- 0: Ethereum Sepolia
- 2: Optimism Sepolia
- 3: Arbitrum Sepolia
- (Add more as supported)

**Integration Pattern**:
1. Contract approves CCTP Transceiver to spend USDC
2. Calls `sendFast()` with target domain and recipient
3. CCTP burns USDC on source chain
4. CCTP mints USDC on destination chain

---

### 3. Dispute Resolution (Athena System)

#### 3.1 Athena Client (Local Chains)
**Location**: Local Chains  
**File**: `athena-client.sol`

**Purpose**:
Local entry point for dispute-related actions, routes to Native Athena.

**Key Responsibilities**:
- Accept dispute fees in USDC
- Route disputes to Native Athena via LayerZero
- Route fees to Native Athena via CCTP
- Receive dispute finalization with voter data
- Auto-resolve disputes in LOWJC

**Key Functions**:
- `raiseDispute()`: Initiate dispute
  - Validates job involvement (job giver or applicant)
  - Collects fee in USDC
  - Routes fee via CCTP to Native Athena
  - Sends dispute data via LayerZero
  
- `submitSkillVerification()`: Request skill verification
  - For freelancers to prove skills
  - Requires fee payment
  - Routed to Native Athena
  
- `askAthena()`: General oracle query
  - Ask oracle members questions
  - Requires fee payment

- `handleFinalizeDisputeWithVotes()`: Receive resolution
  - Called by Local Bridge
  - Contains all voter data for fee distribution
  - Auto-resolves in LOWJC

**Fee Routing**:
All fees are routed to Native Athena via CCTP, where they're distributed to voters

---

#### 3.2 Native Athena (Central Dispute Resolution)
**Location**: Native Chain  
**File**: `native-athena.sol`

**Purpose**:
Core dispute resolution logic, oracle management, and voting coordination.

**Key Responsibilities**:
- Create disputes, skill verifications, and oracle queries
- Manage oracle membership and skill verification
- Process votes from eligible voters
- Calculate voting outcomes
- Distribute fees to winning voters
- Trigger fund releases in NOWJC

**Key Functions**:
- `handleRaiseDispute()`: Create dispute from Local chain
  - Stores dispute in OpenworkGenesis
  - Activates voting period
  
- `vote()`: Cast vote on dispute/verification/query
  - Checks voting eligibility (stake or earned tokens)
  - Calculates voting power (stake * duration + earned tokens)
  - Records vote in OpenworkGenesis
  
- `settleDispute()`: Finalize dispute after voting period
  - Determines winner (job giver or applicant)
  - Distributes fees to winning voters via USDC
  - Triggers fund release in NOWJC
  - Sends resolution to Local chain via bridge

- `canVote()`: Check if user eligible to vote
  - Requires active stake ≥ minStakeRequired OR
  - Earned tokens ≥ minStakeRequired
  
- `getUserVotingPower()`: Calculate total voting power
  - Stake amount * duration + earned tokens

**Oracle Management**:
Delegates to Native Athena Oracle Manager for:
- Creating oracles
- Adding/removing members
- Validating oracle requirements

**Voting Eligibility**:
- Active stake in Native DAO, OR
- Sufficient earned tokens from completed jobs
- Voting power = stake + earned tokens

**Fee Distribution**:
- Collect USDC fees from disputes
- After voting, distribute to winning voters
- Proportional to voting power
- If no votes, refund to dispute raiser

---

#### 3.3 Native Athena Oracle Manager
**Location**: Native Chain  
**File**: `native-athena-oracle-manager.sol`

**Purpose**:
Manages skill oracle creation, membership, and validation.

**Key Responsibilities**:
- Create and configure skill oracles
- Add/remove oracle members
- Validate member eligibility
- Store oracle data in OpenworkGenesis

**Key Functions**:
- `addOrUpdateOracle()`: Batch create/update oracles
- `addSingleOracle()`: Create single oracle
  - Requires minimum member count
  - Validates all members meet voting requirements
  
- `addMembers()`: Add members to existing oracle
  - Validates voting eligibility
  
- `removeMemberFromOracle()`: Remove oracle member
- `removeOracle()`: Delete oracle

**Oracle Structure**:
- Name
- Members (addresses)
- Short description
- Detail hash (IPFS)
- Skill-verified addresses

**Integration**:
Authorized by Native Athena, stores all data in OpenworkGenesis

---

### 4. Governance (DAO) Contracts

#### 4.1 Main DAO
**Location**: Main/Rewards Chain  
**File**: `main-dao.sol`

**Purpose**:
Primary governance contract using OpenZeppelin Governor framework.

**Key Responsibilities**:
- Manage OW token staking for governance
- Process proposals and voting
- Sync governance data to Native chain
- Send upgrade commands across all chains
- Track cross-chain voting power (stake + rewards)

**Key Functions**:
- `stake()`: Stake OW tokens for governance
  - Min: 100 OW tokens
  - Duration: 1-3 minutes (testnet)
  - Syncs to Native DAO via bridge
  
- `unstake()`: Withdraw staked tokens
  - Requires unlock time passed
  - Has delay period (24 hours)
  - Syncs removal to Native DAO
  
- `propose()`: Create governance proposal
  - Requires proposalThreshold (100 OW)
  - Increments governance action in NOWJC
  - Uses OpenZeppelin Governor
  
- `castVote()`: Vote on proposal
  - Requires votingThreshold (50 OW)
  - Increments governance action in NOWJC
  - Voting power = stake + rewards
  
- `delegate()`: Delegate voting power
  - Transfer voting power to another address
  
- `upgradeContract()`: Execute upgrade
  - Owner-only function
  - Can upgrade any contract on any chain
  - Routes through Main Chain Bridge

**Voting Power Calculation**:
```
Total = (Stake Amount × Duration) + Delegated + Earned Rewards
```

**Cross-Chain Integration**:
- Receives synced voting power from Native chain
- Sends stake updates to Native DAO
- Sends governance notifications to NOWJC

---

#### 4.2 Native DAO
**Location**: Native Chain  
**File**: `native-dao.sol`

**Purpose**:
Mirror of Main DAO on Native chain for local governance coordination.

**Key Responsibilities**:
- Store stake data from Main DAO
- Calculate combined voting power (stake + rewards)
- Enable governance on Native chain if needed
- Track governance actions locally

**Key Functions**:
- `updateStakeData()`: Receive stake updates from Main DAO
- `canPropose()` / `canVote()`: Check eligibility
- `getUserGovernancePower()`: Get voting power
- `propose()` / `castVote()`: Native governance functions
- `delegate()`: Native delegation

**Data Storage**:
All stake data stored in OpenworkGenesis

**Voting Power Sources**:
1. Stake from Main DAO (synced via bridge)
2. Earned rewards from NOWJC (local)

---

### 5. Rewards System

#### 5.1 Main Rewards
**Location**: Main/Rewards Chain  
**File**: `main-rewards.sol`

**Purpose**:
Holds OW tokens and processes reward claims from users.

**Key Responsibilities**:
- Receive rewards sync from Native chain
- Hold claimable token balances
- Process token claims
- Sync claim data back to Native chain

**Key Functions**:
- `handleSyncClaimableRewards()`: Receive sync from Native
  - Updates user's claimable balance
  - Called by Main Chain Bridge
  
- `claimRewards()`: User claims OW tokens
  - Transfers tokens from contract to user
  - Syncs claim data to Native chain
  - Updates claimed totals
  
- `handleCreateProfile()`: Create user profile for rewards

**Profile Support**:
- Tracks user referrers
- Stores profile in Genesis (if set)
- Uses ProfileGenesis as primary source

**Cross-Chain Flow**:
1. User earns rewards on Native chain (via jobs)
2. User syncs rewards to Main chain
3. User claims OW tokens on Main chain
4. Claim data synced back to Native chain

---

#### 5.2 Native Rewards
**Location**: Native Chain  
**File**: `native-rewards.sol`

**Purpose**:
Calculates reward tokens earned from platform activity.

**Key Responsibilities**:
- Track platform payment volume
- Manage 20 reward bands with decreasing rates
- Calculate tokens earned per payment
- Track governance actions for unlock
- Calculate claimable tokens

**Key Functions**:
- `processJobPayment()`: Calculate rewards for payment
  - Called by NOWJC after payment release
  - Calculates tokens based on current band
  - Applies referral bonuses (10% each)
  - Returns tokens awarded
  
- `recordGovernanceAction()`: Track user participation
  - Called by NOWJC when user votes/proposes
  - Increments band-specific counter
  - Unlocks proportional tokens
  
- `getUserTotalClaimableTokens()`: Calculate claimable amount
  - Earned tokens
  - Minus already claimed
  - Limited by governance actions
  
- `markTokensClaimed()`: Update after claim
  - Called by NOWJC after cross-chain claim

**Reward Band System**:
20 bands, each distributing 30M OW tokens:
- Band 1: $0-$100k @ 300 OW/USDT
- Band 2: $100k-$200k @ 300 OW/USDT
- Band 3: $200k-$400k @ 150 OW/USDT
- Band 4-20: Progressively decreasing rates

**Governance Unlock Mechanism**:
- Earned tokens are locked initially
- Each governance action unlocks proportional amount
- Unlock rate = current band OW rate per action
- Prevents gaming the system

**Referral Bonuses**:
- Job giver's referrer: 10% of payment value
- Job taker's referrer: 10% of payment value
- Deducted from job giver's reward allocation

---

### 6. Storage Contracts

#### 6.1 OpenworkGenesis (Main Data Storage)
**Location**: Native Chain  
**File**: `openwork-genesis.sol`

**Purpose**:
Centralized storage for all platform data - no business logic.

**Data Categories**:
- **Jobs**: All job data, milestones, status
- **Applications**: Freelancer applications with milestones
- **Disputes**: Dispute data, votes, outcomes
- **Oracles**: Skill oracle configurations
- **Skill Verifications**: Verification applications and votes
- **Ask Athena**: Oracle query applications
- **DAO Stakes**: Stake data from Main DAO
- **Voter Data**: Complete voting records with claim addresses
- **Rewards**: Token totals and governance actions

**Key Design**:
- Pure storage, no logic
- Authorized contracts only
- Owner can authorize contracts
- All getters are read-only views

**Authorization**:
- NOWJC
- Native Athena
- Native DAO
- Native Rewards
- Native Athena Oracle Manager
- Profile Manager

**Voter Data Structure**:
```solidity
struct VoterData {
    address voter;           // Who voted
    address claimAddress;    // Where to send fee rewards
    uint256 votingPower;     // Weight of vote
    bool voteFor;            // Vote direction
}
```
Stored per dispute/verification for fee distribution

---

#### 6.2 ProfileGenesis (Profile Data Storage)
**Location**: Native Chain  
**File**: `profile-genesis.sol`

**Purpose**:
Dedicated storage for user profiles, portfolios, and ratings.

**Data Stored**:
- **Profiles**: IPFS hash, referrer, portfolio items
- **Ratings**: Job-specific ratings, average ratings
- **Referrals**: User referrer relationships

**Separation Rationale**:
- Profile data frequently updated independently
- Reduces load on main Genesis contract
- Easier to migrate or upgrade profile features

**Key Functions**:
- `setProfile()`: Create/update profile
- `addPortfolio()`: Add portfolio item
- `updateProfileIpfsHash()`: Update profile data
- `updatePortfolioItem()`: Edit portfolio
- `removePortfolioItem()`: Delete portfolio
- `setJobRating()`: Store rating

---

### 7. Profile Management

#### 7.1 Profile Manager
**Location**: Native Chain  
**File**: `profile-manager.sol`

**Purpose**:
Business logic layer for profile operations.

**Key Responsibilities**:
- Create user profiles from cross-chain requests
- Manage portfolio items
- Process rating submissions
- Validate profile operations
- Store in ProfileGenesis

**Key Functions**:
- `createProfile()`: Create user profile
  - Called by Native Bridge from Local chains
  - Validates uniqueness
  - Stores in ProfileGenesis
  
- `addPortfolio()`: Add portfolio item
- `updateProfile()`: Update profile IPFS hash
- `updatePortfolioItem()`: Edit portfolio
- `removePortfolioItem()`: Delete portfolio
- `rate()`: Submit job rating
  - Validates job exists
  - Verifies authorization (job participants)
  - Stores in ProfileGenesis

**Authorization**:
Only Native Bridge can call these functions

---

### 8. Infrastructure Contracts

#### 8.1 OpenWork Token (OW)
**Location**: Main/Rewards Chain  
**File**: `openwork-token.sol`

**Purpose**:
ERC-20 governance and rewards token.

**Features**:
- Standard ERC-20 functionality
- ERC-20 Permit (gasless approvals)
- ERC-20 Votes (governance checkpoints)
- Mintable by owner
- Burnable by holders

**Token Details**:
- Name: OpenWorkToken
- Symbol: OWORK
- Initial Supply: 1,000,000,000 (1 billion)
- Decimals: 18

**Governance Integration**:
- Automatic checkpoint tracking
- Delegation support
- Compatible with OpenZeppelin Governor

---

#### 8.2 Contract Registry
**Location**: Any chain (typically Native)  
**File**: `openwork-contract-registry.sol`

**Purpose**:
On-chain directory of all contract addresses across all chains.

**Data Stored**:
- Contract name
- Contract address
- Chain name
- Deployer address

**Key Functions**:
- `addContract()`: Register new contract
- `updateContract()`: Update existing entry
- `removeContract()`: Remove entry
- `getContract()`: Retrieve contract info
- `getAllContracts()`: List all contracts

**Use Cases**:
- Contract discovery
- Deployment tracking
- Frontend configuration
- Audit trail

---

#### 8.3 UUPS Proxy
**Location**: All chains (for upgradeable contracts)  
**File**: `proxy.sol`

**Purpose**:
Upgradeable proxy pattern for all major contracts.

**Features**:
- ERC-1967 standard storage
- UUPS upgrade mechanism
- Initialization support
- Deterministic deployment via factory

**Upgrade Authorization**:
Each contract implements `_authorizeUpgrade()`:
- Typically owner-only
- Some allow bridge (for DAO upgrades)

**Deployment Pattern**:
1. Deploy implementation contract
2. Deploy proxy pointing to implementation
3. Call initialize via proxy
4. Use proxy address for all interactions

---

## Data Flow Patterns

### Pattern 1: Job Creation & Completion

```
1. Job Creation
   User (Local Chain)
   └─> LOWJC.postJob()
       ├─> Local Bridge (LayerZero)
       └─> Native Bridge
           └─> NOWJC.postJob()
               └─> OpenworkGenesis.setJob()

2. Job Application
   Freelancer (Any Chain)
   └─> LOWJC.applyToJob()
       ├─> Local Bridge (LayerZero)
       └─> Native Bridge
           └─> NOWJC.applyToJob()
               └─> OpenworkGenesis.setJobApplication()

3. Job Start & Escrow
   Job Giver (Local Chain)
   └─> LOWJC.startJob()
       ├─> Local Bridge (LayerZero) → Job start message
       ├─> CCTP Transceiver → USDC to Native
       └─> Native Bridge
           └─> NOWJC.startJob()
               └─> OpenworkGenesis (update status)

4. Payment Release
   Job Giver (Local Chain)
   └─> LOWJC.releasePaymentCrossChain()
       └─> Local Bridge (LayerZero)
           └─> Native Bridge
               └─> NOWJC.releasePaymentCrossChain()
                   ├─> CCTP Transceiver → USDC to target chain
                   ├─> Native Rewards.processJobPayment()
                   └─> OpenworkGenesis (update payment)
```

### Pattern 2: Dispute Resolution

```
1. Raise Dispute
   User (Local Chain)
   └─> Athena Client.raiseDispute()
       ├─> CCTP Transceiver → Fee to Native Athena
       └─> Local Bridge (LayerZero)
           └─> Native Bridge
               └─> Native Athena.handleRaiseDispute()
                   └─> OpenworkGenesis.setDispute()

2. Vote on Dispute
   Oracle Member (Native Chain)
   └─> Native Athena.vote()
       ├─> Check eligibility (stake or earned tokens)
       ├─> Calculate voting power
       └─> OpenworkGenesis.addDisputeVoter()

3. Settle Dispute
   Anyone (Native Chain)
   └─> Native Athena.settleDispute()
       ├─> Determine winner
       ├─> NOWJC.releaseDisputedFunds() → CCTP to winner
       ├─> Distribute fees to voters (USDC)
       └─> Native Bridge → Local Bridge
           └─> Athena Client.handleFinalizeDisputeWithVotes()
               └─> LOWJC.resolveDispute()
```

### Pattern 3: Rewards Sync & Claim

```
1. Earn Rewards (Automatic)
   NOWJC.releasePaymentCrossChain()
   └─> Native Rewards.processJobPayment()
       ├─> Calculate tokens based on band
       ├─> Apply referral bonuses
       └─> Update user earned tokens

2. Sync to Main Chain
   User (Native Chain)
   └─> NOWJC.syncRewardsData()
       └─> Native Bridge (LayerZero)
           └─> Main Chain Bridge
               └─> Main Rewards.handleSyncClaimableRewards()
                   └─> Update claimable balance

3. Claim Tokens
   User (Main Chain)
   └─> Main Rewards.claimRewards()
       ├─> Transfer OW tokens
       └─> Main Chain Bridge (LayerZero)
           └─> Native Bridge
               └─> NOWJC.handleUpdateUserClaimData()
                   └─> Native Rewards.markTokensClaimed()
```

### Pattern 4: Governance Cycle

```
1. Stake for Governance
   User (Main Chain)
   └─> Main DAO.stake()
       ├─> Escrow OW tokens
       └─> Main Chain Bridge (LayerZero)
           └─> Native Bridge
               └─> Native DAO.updateStakeData()
                   └─> OpenworkGenesis.setStake()

2. Create Proposal
   User (Main Chain)
   └─> Main DAO.propose()
       ├─> Check proposalThreshold (stake + rewards)
       ├─> Create proposal (OpenZeppelin Governor)
       └─> Main Chain Bridge (LayerZero)
           └─> Native Bridge
               └─> NOWJC.incrementGovernanceAction()
                   └─> Native Rewards.recordGovernanceAction()

3. Vote on Proposal
   User (Main Chain)
   └─> Main DAO.castVote()
       ├─> Check votingThreshold (stake + rewards)
       ├─> Record vote (OpenZeppelin Governor)
       └─> Main Chain Bridge (LayerZero)
           └─> Native Bridge
               └─> NOWJC.incrementGovernanceAction()
                   └─> Native Rewards.recordGovernanceAction()
```

---

## User Journeys

### Journey 1: Post Job and Hire Freelancer

**Actors**: Job Giver, Freelancer

**Steps**:

1. **Create Profile** (Both parties, one-time)
   - Call `LOWJC.createProfile()` on any Local chain
   - Data synced to Native chain
   - Stored in ProfileGenesis

2. **Post Job** (Job Giver)
   - Call `LOWJC.postJob()` with milestones and amounts
   - Pay LayerZero fee for message
   - Job created on Native chain
   - Visible on all chains

3. **Apply to Job** (Freelancer)
   - Browse jobs on any Local chain
   - Call `LOWJC.applyToJob()` with proposed milestones
   - Can specify preferred payment chain
   - Pay LayerZero fee
   - Application stored on Native chain

4. **Accept Application** (Job Giver)
   - Review applications
   - Call `LOWJC.startJob()` with selected application
   - Transfer USDC for first milestone
   - USDC sent via CCTP to Native chain
   - Job status: In Progress

5. **Complete Milestone** (Freelancer)
   - Submit work via `LOWJC.submitWork()`
   - Provide IPFS hash of deliverables
   - Synced to Native chain

6. **Release Payment** (Job Giver)
   - Review submitted work
   - Call `LOWJC.releasePaymentCrossChain()`
   - USDC sent via CCTP to freelancer's chosen chain
   - Rewards calculated automatically
   - Job Giver and referrers earn OW tokens

7. **Continue or Complete**
   - Repeat steps 5-6 for each milestone
   - Final milestone completion marks job as Complete

8. **Rate Each Other**
   - Call `LOWJC.rate()` to rate counterparty
   - Ratings synced to Native chain
   - Visible in profiles

---

### Journey 2: Dispute Resolution

**Actors**: Job Giver, Freelancer, Oracle Members

**Steps**:

1. **Raise Dispute**
   - Either party calls `Athena Client.raiseDispute()`
   - Pay dispute fee (min 50 USDT)
   - Specify oracle to judge dispute
   - Fee and data routed to Native Athena

2. **Oracle Members Vote**
   - Oracle members notified of new dispute
   - Call `Native Athena.vote()` with decision
   - Must have stake or earned tokens
   - Voting power = stake + earned tokens
   - Voting period: 60 minutes

3. **Settle Dispute**
   - After voting period, anyone can call `settleDispute()`
   - Winner determined by majority vote
   - Escrowed USDC released to winner
   - Dispute fees distributed to winning voters
   - Resolution synced back to Local chain

4. **Claim Fee Share** (Winning Voters)
   - USDC automatically distributed
   - Proportional to voting power
   - Sent to specified claim address

---

### Journey 3: Earn and Claim Rewards

**Actors**: Platform User

**Steps**:

1. **Earn Tokens Through Activity**
   - **From Jobs**: Complete jobs to earn based on payment amount
   - **From Referrals**: Refer users, earn 10% of their job rewards
   - **From Governance**: Vote/propose to unlock earned tokens
   - All automatically tracked by Native Rewards

2. **Check Claimable Balance**
   - View on Native chain via `Native Rewards.getUserTotalClaimableTokens()`
   - Shows earned tokens unlocked by governance actions
   - Band-specific calculation

3. **Sync Rewards to Main Chain**
   - Call `NOWJC.syncRewardsData()`
   - Pay LayerZero fee
   - Claimable balance sent to Main Rewards

4. **Claim OW Tokens**
   - Switch to Main/Rewards chain
   - Call `Main Rewards.claimRewards()`
   - OW tokens transferred to wallet
   - Claim data synced back to Native chain

5. **Use Tokens**
   - Hold for governance voting power
   - Trade on DEXes
   - Stake for additional governance power

---

### Journey 4: Participate in Governance

**Actors**: DAO Member

**Steps**:

1. **Acquire Voting Power**
   - **Option A - Stake**: Stake OW tokens on Main DAO
   - **Option B - Earn**: Complete jobs to earn OW tokens
   - Voting power = stake + earned tokens

2. **Create Proposal**
   - Requires 100 OW voting power
   - Call `Main DAO.propose()` with:
     - Target contracts
     - Encoded function calls
     - Description
   - Pay LayerZero fee
   - Proposal created
   - Governance action incremented

3. **Vote on Proposal**
   - Requires 50 OW voting power
   - Call `Main DAO.castVote()` during voting period
   - Vote weight = current voting power
   - Options: For, Against, Abstain
   - Governance action incremented

4. **Execute Proposal** (If Passed)
   - After voting period, if passed and queued
   - Anyone can call `execute()`
   - Changes applied on-chain
   - Can trigger cross-chain upgrades

5. **Earn Rewards**
   - Governance actions unlock earned tokens
   - Each vote/proposal = unlock quota
   - Incentivizes active participation

---

## Security & Upgradeability

### UUPS Upgrade Pattern

**All major contracts use UUPS (Universal Upgradeable Proxy Standard)**:

**Deployment**:
1. Deploy implementation contract
2. Deploy proxy pointing to implementation
3. Initialize via proxy
4. Users interact with proxy address

**Upgrade Process**:
1. Deploy new implementation
2. Call `upgradeToAndCall()` on proxy
3. Authorization checked via `_authorizeUpgrade()`
4. Proxy points to new implementation
5. State preserved in proxy

**Authorization Levels**:
- **Owner**: Direct upgrades (emergency)
- **DAO**: Governance-approved upgrades
- **Bridge**: Cross-chain DAO upgrades

### Cross-Chain Upgrade Mechanism

```
1. Proposal Created
   DAO Member (Main Chain)
   └─> Main DAO.propose()
       └─> "upgradeContract(chainId, proxy, newImpl)"

2. Voting Period
   DAO Members vote on proposal

3. Execute Upgrade (If Passed)
   Anyone (Main Chain)
   └─> Main DAO.execute()
       └─> Main DAO.upgradeContract()
           └─> Main Chain Bridge.sendUpgradeCommand()
               └─> Target Chain Bridge
                   └─> Target Contract.upgradeFromDAO()
                       └─> Proxy upgrade complete
```

### Security Considerations

**Access Control**:
- Multi-signature owners for critical contracts
- Bridge-only functions for cross-chain operations
- Authorized contracts only for storage writes
- Time-delayed upgrades via DAO governance

**Cross-Chain Security**:
- LayerZero trusted endpoints only
- CCTP official contracts only
- Message signature validation
- Nonce tracking for replay protection

**Economic Security**:
- Minimum stake requirements for governance
- Dispute fee minimums
- Commission system for sustainability
- Reward band economics

**Audit Recommendations**:
- Bridge message routing logic
- CCTP integration patterns
- Reward calculation accuracy
- Governance power calculation
- Dispute resolution fairness

---

## Integration Examples

### Example 1: Post Job from Frontend

```javascript
// 1. Get LayerZero fee quote
const payload = ethers.utils.defaultAbiCoder.encode(
  ["string", "string", "address", "string", "string[]", "uint256[]"],
  ["postJob", jobId, jobGiver, jobDetailHash, descriptions, amounts]
);

const lzFee = await localBridge.quoteNativeChain(
  payload,
  lzOptions
);

// 2. Post job with LayerZero fee
await lowjc.postJob(
  jobDetailHash,
  descriptions,
  amounts,
  lzOptions,
  { value: lzFee }
);
```

### Example 2: Release Cross-Chain Payment

```javascript
// 1. Calculate commission
const payment = 1000_000_000; // 1000 USDC (6 decimals)
const commission = await nowjc.calculateCommission(payment);
const netAmount = payment - commission;

// 2. Get LayerZero fee
const lzFee = await nativeBridge.quoteLocalChain(
  jobId,
  payload,
  lzOptions
);

// 3. Release payment
await nowjc.releasePaymentCrossChain(
  jobGiver,
  jobId,
  payment,
  targetChainDomain, // 2 for OP, 3 for Arb
  recipientAddress,
  lzOptions,
  { value: lzFee }
);

// USDC sent via CCTP to recipient
// Rewards calculated automatically
```

### Example 3: Sync and Claim Rewards

```javascript
// 1. Check claimable on Native chain
const claimable = await nativeRewards.getUserTotalClaimableTokens(
  userAddress
);

// 2. Sync to Main chain
const lzFee = await nativeBridge.quoteSyncRewardsData(
  userAddress,
  claimable,
  lzOptions
);

await nowjc.syncRewardsData(
  lzOptions,
  { value: lzFee }
);

// 3. Wait for cross-chain message (1-2 minutes)

// 4. Claim on Main chain
await mainRewards.claimRewards(lzOptions);

// OW tokens transferred to wallet
```

---

## Contract Addresses Reference

**Track all deployments in the Contract Registry on Native chain.**

To retrieve addresses:
```solidity
IContractRegistry registry = IContractRegistry(REGISTRY_ADDRESS);
ContractInfo memory nowjc = registry.getContract("NOWJC");
// nowjc.contractAddress = 0x...
// nowjc.chain = "Arbitrum Sepolia"
```

---

## Conclusion

OpenWork's multi-chain architecture provides:

✅ **Scalability**: Deploy on multiple chains for lower gas costs  
✅ **Flexibility**: Users choose their preferred chains  
✅ **Security**: Decentralized dispute resolution via skill oracles  
✅ **Incentives**: Token rewards for all platform activity  
✅ **Governance**: Democratic control via DAO  
✅ **Upgradeability**: UUPS pattern allows improvements  

The system balances decentralization, security, and user experience by:
- Centralizing data on Native chain for consistency
- Distributing user interfaces across Local chains for accessibility
- Using established cross-chain protocols (LayerZero, CCTP)
- Implementing economic incentives for participation
- Enabling community governance of the protocol

---

**Document Version**: 2.0  
**For Questions**: Refer to contract source code and inline documentation  
**Updates**: This document reflects the November 2024 contract suite
