// Agent Oppy's OpenWork Knowledge Base
// Auto-generates contract knowledge from contractsData for always-fresh info
import { contractsData } from './contracts';

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
Currently: Arbitrum (mainnet), Arbitrum Sepolia (testnet)

### Layer 3: Local OpenWork Contracts (Any Blockchain)
Enables users to use OpenWork on **any preferred blockchain** (referred to as "local chains"). These contracts:
- Provide user-facing interfaces (LOWJC for jobs, Athena Client for disputes)
- Communicate with the OpenWork Chain (single source of truth) for all operations
- Allow users to interact in their native blockchain ecosystem
- Are **chain-agnostic by design** - can be deployed on any chain users want
- Initially built on EVM-based chains (OP, Ethereum, Polygon, Base)
- Future expansion to non-EVM chains like Solana

**Example:** A user on Polygon can post jobs, make payments, and resolve disputes entirely on Polygon, while the OpenWork Chain (Arbitrum) securely records all data and executes core logic like Athena's decentralized dispute resolution.

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

// Auto-generate deployment knowledge from contract data
const generateDeploymentKnowledge = () => {
  const chainMap = {
    base: { name: 'Base', mainnet: 'Base Mainnet', testnet: 'Base Sepolia', eid: '40245' },
    l2: { name: 'Arbitrum', mainnet: 'Arbitrum One', testnet: 'Arbitrum Sepolia', eid: '40231', cctpDomain: '3' },
    op: { name: 'OP', mainnet: 'OP Mainnet', testnet: 'OP Sepolia', eid: '40232', cctpDomain: '2' },
    eth: { name: 'Ethereum', mainnet: 'Ethereum Mainnet', testnet: 'Ethereum Sepolia', eid: '40161', cctpDomain: '0' }
  };

  let knowledge = `## DEPLOYMENT STATUS

### MAINNET DEPLOYMENT (Live Production)\n`;

  const chains = ['base', 'l2', 'op', 'eth'];
  for (const chain of chains) {
    const info = chainMap[chain];
    const contracts = Object.values(contractsData).filter(c => c.chain === chain);
    const deployed = contracts.filter(c => c.mainnetAddress && c.mainnetDeployed === 'Deployed');

    if (deployed.length > 0) {
      knowledge += `\n**${info.mainnet}** (EID: ${info.eid}${info.cctpDomain ? `, CCTP Domain: ${info.cctpDomain}` : ''}):\n`;
      for (const c of deployed) {
        knowledge += `- ${c.name} (${c.version}): ${c.mainnetAddress}\n`;
      }
    }
  }

  knowledge += `\n### TESTNET DEPLOYMENT (4 networks):\n`;
  for (const chain of chains) {
    const info = chainMap[chain];
    const contracts = Object.values(contractsData).filter(c => c.chain === chain);
    const deployed = contracts.filter(c => c.testnetAddress && c.testnetDeployed === 'Deployed');

    if (deployed.length > 0) {
      knowledge += `\n**${info.testnet}** (EID: ${info.eid}${info.cctpDomain ? `, CCTP Domain: ${info.cctpDomain}` : ''}):\n`;
      for (const c of deployed) {
        knowledge += `- ${c.name} (${c.version}): ${c.testnetAddress}\n`;
      }
    }
  }

  knowledge += `\n### Networks:\n- OP Sepolia: Chain ID 11155420\n- Arbitrum Sepolia: Chain ID 421614\n- Ethereum Sepolia: Chain ID 11155111\n- Base Sepolia: Chain ID 84532\n- Arbitrum One: Chain ID 42161\n- OP Mainnet: Chain ID 10\n- Base Mainnet: Chain ID 8453\n- Ethereum Mainnet: Chain ID 1`;

  return knowledge;
};

// Auto-generate per-contract knowledge from the rich contract data files
const generateContractKnowledge = (contract) => {
  let knowledge = `## ${contract.name} (${contract.id})

**Chain**: ${contract.mainnetNetwork || contract.testnetNetwork}
**Status**: ${contract.status} | **Version**: ${contract.version}
**Type**: ${contract.isUUPS ? 'UUPS Upgradeable' : 'Standard'}`;

  if (contract.mainnetAddress) {
    knowledge += `\n**Mainnet Address**: ${contract.mainnetAddress}`;
  }
  if (contract.testnetAddress) {
    knowledge += `\n**Testnet Address**: ${contract.testnetAddress}`;
  }

  if (contract.overview?.purpose) {
    knowledge += `\n\n### Purpose:\n${contract.overview.purpose}`;
  }

  if (contract.features && contract.features.length > 0) {
    knowledge += `\n\n### Key Features:`;
    for (const f of contract.features) {
      knowledge += `\n- ${f}`;
    }
  }

  if (contract.systemPosition?.description) {
    knowledge += `\n\n### System Position:\n${contract.systemPosition.description}`;
  }

  if (contract.dependencies?.dependsOn && contract.dependencies.dependsOn.length > 0) {
    knowledge += `\n\n### Dependencies:`;
    for (const dep of contract.dependencies.dependsOn) {
      knowledge += `\n- ${dep.name}: ${dep.reason}`;
    }
  }

  if (contract.functions && contract.functions.length > 0) {
    knowledge += `\n\n### Functions:`;
    for (const category of contract.functions) {
      knowledge += `\n**${category.category}**:`;
      if (category.items) {
        for (const fn of category.items) {
          knowledge += `\n- ${fn.signature || fn.name}${fn.whatItDoes ? ' - ' + fn.whatItDoes : ''}`;
        }
      }
    }
  }

  return knowledge;
};

// Pre-generate all contract knowledge
const ALL_CONTRACT_KNOWLEDGE = {};
for (const [key, contract] of Object.entries(contractsData)) {
  ALL_CONTRACT_KNOWLEDGE[key] = generateContractKnowledge(contract);
}

// Static knowledge sections (kept from original)
export const CONTRACTS_KNOWLEDGE = {
  ...ALL_CONTRACT_KNOWLEDGE,
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

  deployment: generateDeploymentKnowledge(),

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
A: Mainnet: Arbitrum One (native hub), OP Mainnet (user interface), Base Mainnet (governance). Testnet: Base Sepolia, Arbitrum Sepolia, OP Sepolia, Ethereum Sepolia. More chains coming soon.

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

**Q: Is OpenWork on mainnet?**
A: Yes! Most contracts are deployed on mainnet across Arbitrum One, OP Mainnet, and Base. The platform supports both testnet and mainnet.`;

// Keyword-to-contract mapping for intelligent context building
const CONTRACT_KEYWORDS = {
  token: ['token', 'ow token', 'erc20', 'governance token', 'openwork token'],
  mainDAO: ['main dao', 'maindao', 'governance', 'voting', 'proposal', 'stake', 'unstake', 'delegate'],
  mainRewards: ['main reward', 'mainreward', 'token distribution', 'reward distribution'],
  mainBridge: ['main bridge', 'mainbridge', 'base bridge'],
  nowjc: ['nowjc', 'native job', 'job contract', 'job hub', 'escrow', 'central hub'],
  nativeAthena: ['athena', 'dispute', 'dispute resolution', 'native athena'],
  nativeDAO: ['native dao', 'nativedao', 'arbitrum dao', 'native governance'],
  nativeRewards: ['native reward', 'nativereward', 'token calculation'],
  nativeBridge: ['native bridge', 'nativebridge', 'arbitrum bridge'],
  cctpTransceiverL2: ['cctp transceiver', 'cctp l2', 'usdc transfer', 'cross-chain usdc', 'cctp arbitrum'],
  oracleManager: ['oracle manager', 'oraclemanager', 'skill oracle', 'oracle member', 'oracle management'],
  openworkGenesis: ['genesis', 'openwork genesis', 'openworkgenesis', 'immutable storage', 'data storage', 'job storage'],
  profileGenesis: ['profile genesis', 'profilegenesis', 'profile storage'],
  profileManager: ['profile manager', 'profilemanager', 'profile', 'create profile', 'user profile', 'portfolio', 'rating'],
  contractRegistry: ['contract registry', 'contractregistry', 'registry'],
  genesisReaderHelper: ['genesis reader', 'reader helper', 'genesisreaderhelper', 'data retrieval'],
  activityTracker: ['activity tracker', 'activitytracker', 'activity', 'member activity', '90-day'],
  lowjcOP: ['lowjc op', 'lowjc', 'local job', 'post job', 'apply job', 'op sepolia job'],
  athenaClientOP: ['athena client op', 'athena op', 'dispute op'],
  localBridgeOP: ['local bridge op', 'bridge op', 'op bridge', 'layerzero op'],
  cctpTransceiverOP: ['cctp op', 'transceiver op', 'usdc op'],
  lowjcETH: ['lowjc eth', 'ethereum job', 'eth job'],
  athenaClientETH: ['athena client eth', 'athena eth', 'dispute eth'],
  localBridgeETH: ['local bridge eth', 'bridge eth', 'eth bridge', 'layerzero eth'],
  cctpTransceiverETH: ['cctp eth', 'transceiver eth', 'usdc eth']
};

// Build context based on user query keywords - expanded to cover ALL contracts
export const buildOppyContext = (userQuery) => {
  const query = userQuery.toLowerCase();
  let context = BASE_SYSTEM_KNOWLEDGE;
  let matchedContracts = new Set();

  // Match specific contracts by keywords
  for (const [contractKey, keywords] of Object.entries(CONTRACT_KEYWORDS)) {
    for (const keyword of keywords) {
      if (query.includes(keyword)) {
        matchedContracts.add(contractKey);
        break;
      }
    }
  }

  // Broad topic matching - add related contracts for general topics
  if (query.includes('job') || query.includes('work') || query.includes('freelanc')) {
    matchedContracts.add('nowjc');
    matchedContracts.add('lowjcOP');
  }

  if (query.includes('dispute') || query.includes('oracle')) {
    matchedContracts.add('nativeAthena');
    matchedContracts.add('oracleManager');
    matchedContracts.add('activityTracker');
  }

  if (query.includes('profile') || query.includes('portfolio') || query.includes('rating')) {
    matchedContracts.add('profileManager');
    matchedContracts.add('profileGenesis');
  }

  if (query.includes('govern') || query.includes('dao') || query.includes('vot') || query.includes('propos') || query.includes('stak')) {
    matchedContracts.add('mainDAO');
    matchedContracts.add('nativeDAO');
    matchedContracts.add('token');
  }

  if (query.includes('bridge') || query.includes('layerzero') || query.includes('cross-chain') || query.includes('cross chain')) {
    matchedContracts.add('mainBridge');
    matchedContracts.add('nativeBridge');
    matchedContracts.add('localBridgeOP');
  }

  if (query.includes('cctp') || query.includes('usdc') || query.includes('transfer') || query.includes('payment')) {
    matchedContracts.add('cctpTransceiverL2');
    context += '\n\n' + CONTRACTS_KNOWLEDGE.cctp;
  }

  if (query.includes('token') || query.includes('ow ') || query.includes('erc20') || query.includes('reward')) {
    matchedContracts.add('token');
    matchedContracts.add('mainRewards');
    matchedContracts.add('nativeRewards');
  }

  if (query.includes('genesis') || query.includes('storage') || query.includes('data')) {
    matchedContracts.add('openworkGenesis');
    matchedContracts.add('profileGenesis');
  }

  // Add matched contract knowledge (limit to 5 most relevant to keep context manageable)
  const contractsToAdd = Array.from(matchedContracts).slice(0, 5);
  for (const key of contractsToAdd) {
    if (CONTRACTS_KNOWLEDGE[key]) {
      context += '\n\n' + CONTRACTS_KNOWLEDGE[key];
    }
  }

  // IPFS
  if (query.includes('ipfs') || query.includes('upload') || query.includes('hash') || query.includes('pinata')) {
    context += '\n\n' + CONTRACTS_KNOWLEDGE.ipfs;
  }

  // Deployment / address questions
  if (query.includes('deploy') || query.includes('address') || query.includes('testnet') || query.includes('mainnet') || query.includes('contract address') || query.includes('where is') || query.includes('chain id')) {
    context += '\n\n' + CONTRACTS_KNOWLEDGE.deployment;
  }

  // List all contracts when asked about "all contracts" or "how many"
  if (query.includes('all contract') || query.includes('how many contract') || query.includes('list contract') || query.includes('every contract')) {
    let contractList = '\n\n## ALL OPENWORK CONTRACTS (' + Object.keys(contractsData).length + ' total):\n';
    for (const [key, c] of Object.entries(contractsData)) {
      contractList += `- **${c.name}** (${c.chain}) - ${c.status} - ${c.version}${c.mainnetAddress ? ' [MAINNET]' : ''}${c.testnetAddress ? ' [TESTNET]' : ''}\n`;
    }
    context += contractList;
  }

  // Add workflow knowledge for how-to questions
  if (query.includes('how') || query.includes('tutorial') || query.includes('guide') || query.includes('step') || query.includes('workflow')) {
    context += '\n\n' + WORKFLOW_KNOWLEDGE;
  }

  // Add FAQ knowledge for common questions
  if (query.includes('what') || query.includes('why') || query.includes('fee') || query.includes('commission') || query.includes('faq')) {
    context += '\n\n' + FAQ_KNOWLEDGE;
  }

  return context;
};

// Fallback responses for when API is unavailable
export const FALLBACK_RESPONSES = {
  athena: 'Athena is our decentralized dispute resolution system on Arbitrum. Disputes are raised with a minimum $50 USDC fee, voted on by skill oracle members, and resolved automatically. The winning side gets funds, and voters who chose correctly earn fees proportionally.',

  job: 'Jobs in OpenWork flow through multiple chains: Posted on Local chains (OP/Ethereum) → Synced to Native chain (Arbitrum) via LayerZero → Stored in Genesis. Payments are escrowed via CCTP and released cross-chain after work approval with 1% commission. NOWJC on Arbitrum is the central job hub.',

  bridge: 'OpenWork uses two bridge types: (1) LayerZero for instant message passing between chains (job data, governance), and (2) Circle\'s CCTP for secure USDC transfers between chains (payments, fees). Bridges connect all 4 chains.',

  ipfs: 'All OpenWork data is stored on IPFS for decentralization: job descriptions, profiles, applications, work submissions, dispute evidence. Only content hashes are stored on-chain. Use Pinata gateway: https://gateway.pinata.cloud/ipfs/',

  deploy: 'OpenWork contracts are deployed on mainnet (Arbitrum One, OP Mainnet, Base) and testnet (Arbitrum Sepolia, OP Sepolia, Ethereum Sepolia, Base Sepolia). Most contracts use UUPS proxy pattern for upgradeability.',

  token: 'The OW token is our ERC-20 governance token on Base. Earned by completing jobs and participating in governance. Used for voting on Main DAO and Native DAO proposals. Staking increases voting power.',

  payment: 'Payments use USDC via Circle\'s CCTP: (1) Escrowed on Arbitrum when job starts, (2) Released via CCTP to freelancer\'s preferred chain, (3) 1% platform commission deducted, (4) OW tokens awarded automatically.',

  commission: 'Platform commission is 1% of each payment with a $1 USDC minimum. Examples: $50 job = $1 fee (2%), $100 job = $1 fee (1%), $1000 job = $10 fee (1%). Funds go to treasury for protocol operations.',

  cctp: 'YES! CCTP confirmers receive 0.0004-0.001 ETH rewards per confirmation (2x actual gas cost, capped at 0.001 ETH). Platform-funded, making transfers 2-3x faster (10-15 min vs 30+ min). Automatic payment upon confirmation.',

  profile: 'User profiles in OpenWork are managed by ProfileManager on Arbitrum, with data stored in ProfileGenesis and IPFS. Profiles include skills, bio, portfolio, ratings, and are synced cross-chain.',

  governance: 'OpenWork governance operates on two levels: Main DAO (Base) for protocol-wide decisions, and Native DAO (Arbitrum) for operational decisions. Voting power comes from staked OW tokens with duration multipliers.',

  oracle: 'Skill Oracles are groups of verified experts who resolve disputes in their domain. Managed by OracleManager, members must maintain 90-day activity (tracked by ActivityTracker) and stake tokens to participate.',

  mainnet: 'Yes! OpenWork has mainnet deployments across Arbitrum One, OP Mainnet, and Base. Most core contracts including NOWJC, Native Athena, ProfileManager, and bridges are deployed and operational.',

  default: 'I can help with: contract details (all 24 contracts), deployment addresses (mainnet & testnet), cross-chain flows, IPFS structures, dispute resolution, payment processing, governance, profiles, CCTP rewards, and workflows. What would you like to know?'
};
