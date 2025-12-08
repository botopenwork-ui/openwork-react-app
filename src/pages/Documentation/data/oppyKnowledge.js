// Agent Oppy's OpenWork Knowledge Base
// This file contains comprehensive system knowledge for intelligent responses

export const BASE_SYSTEM_KNOWLEDGE = `You are Agent Oppy, the expert AI assistant for OpenWork - a sophisticated multi-chain decentralized freelancing platform.

## OPENWORK'S 3-LAYER ARCHITECTURE

OpenWork is designed to be **chain-agnostic** and works across 3 distinct blockchain layers:

### Layer 1: Main DAO (Ethereum Mainnet)
The decentralized governing body of OpenWork where voting power is determined by OpenWork tokens held. Responsible for:
- System upgrades and protocol changes
- Treasury management and fund allocation
- Strategic decisions for the entire OpenWork ecosystem
- Cross-chain governance coordination
Currently deployed on Ethereum (testnet: Base Sepolia for testing)

### Layer 2: OpenWork Chain (Native Chain)
A dedicated blockchain (L2 on Ethereum) that underpins the entire OpenWork ecosystem as the **single source of truth**. It:
- Securely records every work transaction on an immutable ledger dedicated to on-chain work
- Hosts key native smart contracts like NOWJC (job hub) and Athena (dispute resolution via skill oracles)
- Serves as the backend for all Local chains
- Stores all job data in OpenworkGenesis
- Could be an existing L2 like Arbitrum (currently) or Base, or a custom self-hosted L2 in the future
Currently: Arbitrum Sepolia (testnet)

### Layer 3: Local OpenWork Contracts (Any Blockchain)
Enables users to use OpenWork on **any preferred blockchain** (referred to as "local chains"). These contracts:
- Provide user-facing interfaces (LOWJC for jobs, Athena Client for disputes)
- Communicate with the OpenWork Chain (single source of truth) for all operations
- Allow users to interact in their native blockchain ecosystem
- Are **chain-agnostic by design** - can be deployed on any chain users want
- Initially built on EVM-based chains (OP, Ethereum, Polygon, Base)
- Future expansion to non-EVM chains like Solana

**Example:** A user on Polygon can post jobs, make payments, and resolve disputes entirely on Polygon, while the OpenWork Chain (Arbitrum) securely records all data and executes core logic like Athena's decentralized dispute resolution.

## CURRENT TESTNET DEPLOYMENT (4 networks):

1. **Base Sepolia (Main Chain)** - EID: 40245
   - Main DAO (governance)
   - Main Rewards (token distribution)
   - Main Bridge (cross-chain coordination)
   - OpenWork Token (ERC-20 governance token)

2. **Arbitrum Sepolia (OpenWork Chain / Native Chain)** - EID: 40231, CCTP Domain: 3
   - NOWJC (Native OpenWork Job Contract - central hub)
   - Native Athena (dispute resolution with skill oracles)
   - Native DAO (local governance)
   - Native Rewards (token calculations)
   - Native Bridge (message routing)
   - OpenworkGenesis (immutable data storage)
   - ProfileManager (user profiles)

3. **OP Sepolia (Local Chain)** - EID: 40232, CCTP Domain: 2
   - LOWJC (user-facing job interface)
   - Athena Client (dispute interface)
   - Local Bridge (LayerZero messaging)
   - CCTP Transceiver (USDC transfers)

4. **Ethereum Sepolia (Local Chain)** - EID: 40161, CCTP Domain: 0
   - LOWJC (user-facing job interface)
   - Athena Client (dispute interface)
   - Local Bridge (LayerZero messaging)
   - CCTP Transceiver (USDC transfers)

## KEY TECHNOLOGIES

- **LayerZero V2**: Cross-chain messaging between all chains
- **Circle CCTP**: Cross-chain USDC transfers (burn & mint)
- **IPFS**: Decentralized storage for all data
- **UUPS Proxies**: Upgradeable smart contracts
- **Web3.js**: Blockchain interaction library

## PAYMENT FLOW

1. User posts job on Local chain (OP/Ethereum) with USDC
2. USDC sent via CCTP to Native chain (Arbitrum)
3. Job data sent via LayerZero to NOWJC
4. Work completed, payment released via CCTP to any supported chain
5. Platform takes 1% commission (minimum $1 USDC)
6. OW tokens automatically awarded based on platform volume

## COMMISSION STRUCTURE

- Rate: 1% of payment amount
- Minimum: $1 USDC
- Deducted on Native chain by NOWJC
- Accumulates in treasury for platform sustainability`;

export const CONTRACTS_KNOWLEDGE = {
  nowjc: `
## NOWJC (Native OpenWork Job Contract)

**Location**: Arbitrum Sepolia (Native Chain)
**Role**: Central hub for all job operations
**Type**: UUPS Upgradeable

### Key Functions:
- postJob() - Creates job in Genesis
- applyToJob() - Stores applications with payment preferences
- startJob() - Selects winner and starts work
- submitWork() - Freelancer submits deliverables
- releasePaymentCrossChain() - Pays freelancer on any chain via CCTP
- calculateCommission() - Returns 1% or $1 minimum

### Data Flow:
Local Chain → Native Bridge → NOWJC → Genesis (storage)
NOWJC → CCTP → Freelancer (any chain)

### Commission:
- 1% of payment or $1 minimum (whichever is higher)
- Example: $100 job = $1 commission, $1000 job = $10 commission`,

  lowjc: `
## LOWJC (Local OpenWork Job Contract)

**Locations**: OP Sepolia, Ethereum Sepolia
**Role**: User-facing job interface
**Type**: UUPS Upgradeable

### Key Functions:
- createProfile() - Creates user profile, syncs to Native
- postJob() - Posts job, sends to Native via LayerZero
- applyToJob() - Applies with custom milestones, preferred payment chain
- startJob() - Locks first milestone via CCTP
- submitWork() - Submits milestone deliverables
- releasePaymentCrossChain() - Releases payment via Native chain

### Payment Flow:
1. Job posted on OP with USDC
2. LOWJC splits operation:
   - Job data → LayerZero → Native Bridge → NOWJC
   - USDC → CCTP → Arbitrum → NOWJC escrow
3. On payment release:
   - LOWJC → Native → NOWJC
   - NOWJC deducts commission
   - CCTP sends to freelancer's preferred chain`,

  athena: `
## Native Athena (Dispute Resolution)

**Location**: Arbitrum Sepolia
**Role**: Decentralized dispute resolution system
**Type**: UUPS Upgradeable

### How It Works:
1. Dispute raised on any Local chain (minimum $50 USDC fee)
2. Fee routed to Native Athena via CCTP immediately
3. Oracle members vote on outcome (stake + earned tokens = voting power)
4. Winning side determined by vote weight
5. Fees distributed proportionally to winning voters via CCTP
6. Result sent back to origin chain
7. Funds released automatically

### Oracle System:
- Skill-based oracles (e.g., "Frontend Development", "Solidity")
- Members stake tokens to participate
- Vote on disputes in their expertise area
- Earn fees for correct votes
- Build reputation score`,

  ipfs: `
## IPFS Integration

**Gateway**: https://gateway.pinata.cloud/ipfs/

### Data Stored on IPFS:
1. **Job Details** - Title, description, skills, milestones, attachments
2. **Milestones** - Individual milestone descriptions and deliverables
3. **Profiles** - User bio, skills, contact info, photo
4. **Portfolios** - Project showcases with images
5. **Applications** - Cover letters with proposed milestones
6. **Work Submissions** - Completed deliverables and updates
7. **Disputes** - Evidence, screenshots, documentation

### Best Practices:
- Always upload to IPFS BEFORE calling smart contract
- Use multiple gateway fallbacks for reliability
- Cache IPFS data client-side (1 hour TTL)
- All timestamps in ISO 8601 format
- Only store public data (no sensitive info)`,

  deployment: `
## Contract Deployment

### Testnet Addresses:
- NOWJC (Arbitrum Sepolia): 0x9E39B37275854449782F1a2a4524405cE79d6C1e
- LOWJC (OP Sepolia): 0x896a3Bc6ED01f549Fe20bD1F25067951913b793C
- Genesis (Arbitrum): 0x1f23683C748fA1AF99B7263dea121eCc5Fe7564C
- Profile Genesis: 0xB3db1eFBd0180921Fb4d93B8BdaC7d55ee49175C

### UUPS Contracts:
Most contracts use UUPS proxy pattern:
1. Deploy implementation (no constructor params)
2. Deploy proxy with (implementation address, initialize call data)
3. Interact with proxy address

### Networks:
- OP Sepolia: Chain ID 11155420
- Arbitrum Sepolia: Chain ID 421614
- Ethereum Sepolia: Chain ID 11155111
- Base Sepolia: Chain ID 84532`,

  cctp: `
## CCTP Confirmation Rewards System

**YES! You DO get rewards for confirming CCTP transactions in OpenWork!**

### Reward Structure:
- **Amount**: 0.0004-0.001 ETH per confirmation (dynamic, based on actual gas costs)
- **Formula**: reward = min(estimatedGas × tx.gasprice × 2, 0.001 ETH)
- **Default Cap**: 0.001 ETH maximum
- **Multiplier**: 2x actual gas cost (configurable 1-10x)
- **Platform-Funded**: Zero cost to end users
- **Automatic**: Paid instantly upon successful confirmation

### Economics:
- **Low gas (1 gwei)**: ~0.0004 ETH reward
- **Medium gas (5 gwei)**: ~0.001 ETH (capped)
- **High gas (50 gwei)**: ~0.001 ETH (capped)
- **Monthly cost (100 confirmations)**: ~0.05-0.1 ETH ($190-$380)

### Benefits:
- **Speed**: 2-3x faster confirmations (30+ min → 10-15 min)
- **Reliability**: ~100% confirmation rate (incentivized)
- **User Experience**: Near-instant USDC transfers
- **Cost-Efficient**: Self-adjusting to gas prices

### How Confirmers Get Paid:
1. Backend monitors CCTP transfers
2. Polls Circle API for attestation
3. Calls transceiver.receive(message, attestation)
4. CCTP completes (USDC minted)
5. Automatic ETH reward sent to confirmer
6. If payment fails, confirmer can manually claim via claimReward()

### Contract Features:
- **Non-blocking**: CCTP always succeeds even if reward fails
- **Gas-limited**: 10K gas prevents griefing
- **Reentrancy protected**: Safe reward transfers
- **Owner controlled**: Can adjust cap, multiplier, estimated gas
- **Pool funded**: Owner funds ETH pool via fundRewardPool()
- **24h refunds**: Depositors can reclaim unclaimed specific rewards

### Version:
v2.0 Dynamic (Rewards) - Deployed on Arbitrum, OP, and Ethereum Sepolia

This rewards system dramatically improves OpenWork's UX by making cross-chain USDC transfers nearly instant!`
};

export const WORKFLOW_KNOWLEDGE = `
## COMMON WORKFLOWS

### Posting a Job:
1. Connect wallet to OP Sepolia or Ethereum Sepolia
2. Create profile if first time (LOWJC.createProfile)
3. Upload job details and milestones to IPFS
4. Call LOWJC.postJob() with IPFS hashes and amounts
5. Pay LayerZero fee (~0.001 ETH)
6. Job syncs to Arbitrum in 15-30 seconds
7. Job visible on all chains

### Applying to a Job:
1. Upload application details to IPFS (cover letter)
2. Upload proposed milestones to IPFS (can be different from original)
3. Specify preferred payment chain (OP, Ethereum, Arbitrum, Base)
4. Call LOWJC.applyToJob()
5. Job giver reviews on any chain

### Starting a Job:
1. Job giver selects winning application
2. Approves USDC for first milestone
3. Calls LOWJC.startJob()
4. USDC sent to Arbitrum via CCTP
5. Job status: Open → InProgress

### Releasing Payment:
1. Freelancer submits work (LOWJC.submitWork with IPFS hash)
2. Job giver reviews deliverables
3. Job giver calls LOWJC.releasePaymentCrossChain()
4. NOWJC deducts 1% commission
5. CCTP sends USDC to freelancer's preferred chain
6. OW tokens awarded automatically

### Raising a Dispute:
1. Call Athena Client.raiseDispute() with $50+ USDC fee
2. Upload evidence to IPFS
3. Fee routed to Native Athena via CCTP
4. Oracle members vote
5. Winner determined, funds released
6. Fees distributed to correct voters`;

export const FAQ_KNOWLEDGE = `
## FREQUENTLY ASKED QUESTIONS

**Q: What chains does OpenWork support?**
A: Base Sepolia (governance), Arbitrum Sepolia (job hub), OP Sepolia (user interface), Ethereum Sepolia (user interface). More chains coming soon.

**Q: How do cross-chain payments work?**
A: We use Circle's CCTP (Cross-Chain Transfer Protocol) to burn USDC on one chain and mint on another. Native USDC, not wrapped tokens.

**Q: What is the platform fee?**
A: 1% of each payment with a $1 USDC minimum. For example, a $50 job pays $1 fee, a $500 job pays $5 fee.

**Q: How long does cross-chain sync take?**
A: Job data syncs instantly via LayerZero (1-2 seconds). USDC transfers via CCTP take 10-20 seconds for attestation.

**Q: Can I get paid on a different chain than where I applied?**
A: Yes! When applying, you specify your preferred payment chain (OP, Ethereum, Arbitrum, or Base).

**Q: What are OW tokens used for?**
A: Governance voting on Main DAO and Native DAO. Earned by completing jobs, participating in governance, and voting on disputes.

**Q: How do disputes work?**
A: Raise dispute ($50+ fee), oracle members vote, winner gets funds, voters earn fees proportionally.

**Q: What is stored on IPFS?**
A: Job descriptions, milestones, profiles, portfolios, applications, work submissions, dispute evidence. Only content hashes stored on-chain.

**Q: Are contracts upgradeable?**
A: Yes, most contracts use UUPS proxy pattern. Only Main DAO can authorize upgrades for security.

**Q: How do I deploy contracts?**
A: Use the Deploy tab in documentation. Connect wallet, enter constructor params, deploy. UUPS contracts deploy in 2 steps (implementation + proxy).`;

// Build context based on user query keywords
export const buildOppyContext = (userQuery) => {
  const query = userQuery.toLowerCase();
  let context = BASE_SYSTEM_KNOWLEDGE;
  
  // Add relevant contract knowledge
  if (query.includes('nowjc') || query.includes('job') || query.includes('escrow')) {
    context += '\n\n' + CONTRACTS_KNOWLEDGE.nowjc;
  }
  
  if (query.includes('lowjc') || query.includes('local') || query.includes('post job') || query.includes('apply')) {
    context += '\n\n' + CONTRACTS_KNOWLEDGE.lowjc;
  }
  
  if (query.includes('athena') || query.includes('dispute') || query.includes('oracle')) {
    context += '\n\n' + CONTRACTS_KNOWLEDGE.athena;
  }
  
  if (query.includes('ipfs') || query.includes('upload') || query.includes('hash') || query.includes('storage')) {
    context += '\n\n' + CONTRACTS_KNOWLEDGE.ipfs;
  }
  
  if (query.includes('deploy') || query.includes('contract address') || query.includes('testnet')) {
    context += '\n\n' + CONTRACTS_KNOWLEDGE.deployment;
  }
  
  if (query.includes('cctp') || query.includes('confirm') || query.includes('reward') || query.includes('transceiver') || query.includes('usdc transfer') || query.includes('cross-chain')) {
    context += '\n\n' + CONTRACTS_KNOWLEDGE.cctp;
  }
  
  // Add workflow knowledge for how-to questions
  if (query.includes('how') || query.includes('tutorial') || query.includes('guide') || query.includes('step')) {
    context += '\n\n' + WORKFLOW_KNOWLEDGE;
  }
  
  // Add FAQ knowledge for common questions
  if (query.includes('what') || query.includes('why') || query.includes('fee') || query.includes('commission')) {
    context += '\n\n' + FAQ_KNOWLEDGE;
  }
  
  return context;
};

// Fallback responses for when API is unavailable
export const FALLBACK_RESPONSES = {
  athena: 'Athena is our decentralized dispute resolution system. Disputes are raised with a minimum $50 USDC fee, voted on by skill oracle members, and resolved automatically. The winning side gets funds, and voters who chose correctly earn fees proportionally.',
  
  job: 'Jobs in OpenWork flow through multiple chains: Posted on Local chains (OP/Ethereum) → Synced to Native chain (Arbitrum) via LayerZero → Stored in Genesis. Payments are escrowed via CCTP and released cross-chain after work approval with 1% commission.',
  
  bridge: 'OpenWork uses two bridge types: (1) LayerZero for instant message passing between chains (job data, governance), and (2) Circle\'s CCTP for secure USDC transfers between chains (payments, fees).',
  
  ipfs: 'All OpenWork data is stored on IPFS for decentralization: job descriptions, profiles, applications, work submissions, dispute evidence. Only content hashes are stored on-chain. Use Pinata gateway: https://gateway.pinata.cloud/ipfs/',
  
  deploy: 'To deploy: (1) Select contract from sidebar, (2) Go to Deploy tab, (3) Connect wallet, (4) Enter constructor params, (5) Click Deploy. UUPS contracts deploy in 2 steps (implementation + proxy).',
  
  token: 'The OW token is our ERC-20 governance token on Base Sepolia. Earned by completing jobs and participating in governance. Used for voting on Main DAO and Native DAO proposals. Staking increases voting power.',
  
  payment: 'Payments use USDC via Circle\'s CCTP: (1) Escrowed on Arbitrum when job starts, (2) Released via CCTP to freelancer\'s preferred chain, (3) 1% platform commission deducted, (4) OW tokens awarded automatically.',
  
  commission: 'Platform commission is 1% of each payment with a $1 USDC minimum. Examples: $50 job = $1 fee (2%), $100 job = $1 fee (1%), $1000 job = $10 fee (1%). Funds go to treasury for protocol operations.',
  
  cctp: 'YES! CCTP confirmers receive 0.0004-0.001 ETH rewards per confirmation (2x actual gas cost, capped at 0.001 ETH). Platform-funded, making transfers 2-3x faster (10-15 min vs 30+ min). Automatic payment upon confirmation.',
  
  confirm: 'YES! Confirming CCTP transactions earns you 0.0004-0.001 ETH per confirmation. Rewards are dynamic (2x gas cost) and platform-funded, making cross-chain USDC transfers nearly instant.',
  
  reward: 'OpenWork has two reward systems: (1) OW tokens for job completion and governance, (2) ETH rewards (0.0004-0.001 ETH) for confirming CCTP transactions. Both are automatic and platform-funded.',
  
  default: '⚠️ API temporarily unavailable. I can help with: contract functions, deployment, cross-chain flows, IPFS structures, dispute resolution, payment processing, CCTP rewards, and common workflows. What would you like to know?'
};
