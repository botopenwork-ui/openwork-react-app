# OpenWork Contract Documentation Process Guide

This guide outlines the systematic process for documenting OpenWork smart contracts, based on the methodology used for Native Athena, Native Rewards, and Oracle Manager contracts.

---

## Table of Contents

1. [Overview](#overview)
2. [Pre-Documentation Phase](#pre-documentation-phase)
3. [Analysis Phase](#analysis-phase)
4. [Documentation Phase](#documentation-phase)
5. [Documentation Template](#documentation-template)
6. [Real Examples](#real-examples)
7. [Common Patterns](#common-patterns)
8. [Quality Checklist](#quality-checklist)

---

## Overview

**Goal**: Create comprehensive, accurate, and developer-friendly documentation for each smart contract in the OpenWork ecosystem.

**Audience**: 
- Developers integrating with OpenWork
- Frontend developers building UI
- Auditors reviewing the system
- Community members understanding the architecture

**Key Principle**: Documentation must reflect the ACTUAL contract code, not assumptions or outdated designs.

---

## Pre-Documentation Phase

### Step 1: Locate the Contract

Contracts are stored in:
```
contracts/openwork-full-contract-suite-layerzero+CCTP 2 Nov/
```

### Step 2: Identify Documentation File

Documentation files are stored in:
```
src/pages/Documentation/data/contracts/
```

File naming convention: `camelCase.js` (e.g., `nativeRewards.js`, `oracleManager.js`)

### Step 3: Gather Context

Before starting, understand:
- What user problem does this contract solve?
- Where does it fit in the overall system architecture?
- Are there any special architectural considerations? (e.g., contract size limits, cross-chain requirements)

---

## Analysis Phase

### Step 1: Read the Contract (15-20 minutes)

**Action**: Read the entire `.sol` file from top to bottom

**Focus On**:
- Contract inheritance (Initializable, UUPSUpgradeable, OwnableUpgradeable)
- Interfaces imported (what other contracts does it interact with?)
- State variables (what data does it store?)
- Modifiers (what access control exists?)
- All public/external functions
- Events emitted
- Comments and natspec (if any)

**Note-Taking**:
```markdown
## Quick Notes
- Inherits: Initializable, UUPS, Ownable
- Access control: onlyJobContract modifier
- Key interfaces: INativeAthena, IOpenworkGenesis
- Main purpose: [write 1-2 sentences]
```

### Step 2: Map System Relationships (10-15 minutes)

**Create a relationship map**:

```
This Contract
├─> Calls (Dependencies)
│   ├─> Contract A (why?)
│   └─> Contract B (why?)
│
└─> Called By (Dependents)
    ├─> Contract C (why?)
    └─> Contract D (why?)
```

**Key Questions**:
1. What contracts does this contract CALL? (Check all interface calls)
2. What contracts CALL this contract? (Check modifiers like onlyAuthorized)
3. Are there cross-chain interactions? (LayerZero bridges, CCTP)
4. Is this contract user-facing or internal?

**Example** (Oracle Manager):
```
Oracle Manager (Internal Helper)
├─> Calls:
│   ├─> OpenworkGenesis (storage)
│   └─> Native Athena (validation)
└─> Called By:
    └─> Native Athena ONLY (not user-facing!)
```

### Step 3: Categorize Functions (10 minutes)

**Group functions by purpose**:

1. **Core Business Logic**: Main functions users/contracts interact with
2. **View Functions**: Read-only queries
3. **Admin Functions**: Owner-only configuration
4. **Internal Helpers**: Private/internal functions (note but don't document in detail)

**Create a function inventory**:
```markdown
## Function Inventory
### Core Business Logic
- processJobPayment() - awards tokens after payment
- recordGovernanceAction() - unlocks earned tokens

### View Functions
- getUserTotalClaimableTokens() - get claimable amount
- getCurrentBand() - get active reward band

### Admin Functions
- setGenesis() - update Genesis address
- setAuthorizedCaller() - set authorized contracts
```

### Step 4: Identify Special Patterns (5 minutes)

**Check for**:
- ✓ Cross-chain messaging (LayerZero, CCTP)
- ✓ Governance mechanisms (voting, proposals)
- ✓ Token economics (staking, rewards, bands)
- ✓ Access control patterns (onlyAuthorized, onlyJobContract)
- ✓ Storage vs logic separation (Genesis contracts)
- ✓ Helper contract pattern (extracted for size limits)
- ✓ Upgrade mechanisms (UUPS)

### Step 5: Trace Data Flows (10-15 minutes)

**Identify 3-4 key flows**:

1. **Primary user flow**: What's the main user interaction?
2. **Cross-chain flow**: How do messages move between chains?
3. **Token/payment flow**: How do tokens or payments move?
4. **Validation flow**: How are permissions/eligibility checked?

**Example Flow Template**:
```
Flow: Oracle Creation
1. User submits request via Native Athena
2. Native Athena validates user
3. Native Athena calls Oracle Manager
4. Oracle Manager validates members via Native Athena.canVote()
5. Oracle Manager stores in OpenworkGenesis
6. Event emitted
```

---

## Documentation Phase

### Step 1: Fill Overview Section

```javascript
overview: {
  purpose: '[2-3 sentences explaining WHAT this contract does and WHY it exists]',
  tier: 'Native Chain (Arbitrum Sepolia) or Main Chain (Ethereum Sepolia)',
  category: '[Dispute Resolution / Token Economics / Governance / etc.]',
  upgradeability: 'UUPS Upgradeable (owner only) or Not Upgradeable'
}
```

**Tips**:
- Start with the problem it solves
- Explain key mechanisms (e.g., "20-band progressive reward system")
- Clarify if it's user-facing or internal
- Mention any unique constraints (e.g., "created to solve 24KB size limit")

### Step 2: List Features (8-12 bullet points)

**Format**: `Feature: Brief explanation`

**Examples**:
```javascript
features: [
  'Cross-chain dispute resolution: Bridges dispute data between L1 and L2',
  'Skill Oracle system: Expert panels vote on technical disputes',
  'Governance unlock mechanism: Earned tokens locked until user votes/proposes',
  // ... etc
]
```

**Tips**:
- Lead with the feature name
- Keep explanations concise
- Focus on user-visible benefits
- Include technical mechanisms when relevant

### Step 3: Create System Position Diagram

**ASCII Diagram showing**:
- Where this contract sits in the architecture
- What it calls (arrows down)
- What calls it (arrows up)
- Cross-chain connections (if any)

**Template**:
```
📍 [Contract Category] Architecture

[Chain Name]
    └─> Contract Above
        └─> This Contract ⭐ (You are here)
            ├─> Calls Contract A
            │   └─> Why/what for
            └─> Calls Contract B
                └─> Why/what for
```

**Example** (Native Rewards):
```javascript
systemPosition: {
  description: '[Paragraph explaining the role]',
  diagram: `
📍 Token Economics Architecture

Job Payment Flow:
    NOWJC.releasePaymentCrossChain()
        └─> Native Rewards.processJobPayment() ⭐
            ├─> Calculate tokens based on current band
            ├─> Award to job giver (80-90%)
            └─> Award referral bonuses (10% each)

Governance Unlock Flow:
    User votes/proposes
        └─> NOWJC.incrementGovernanceAction()
            └─> Native Rewards.recordGovernanceAction()
                └─> Unlock earned tokens`
}
```

### Step 4: Document Dependencies

```javascript
dependencies: {
  dependsOn: [
    { 
      name: 'Contract Name', 
      reason: 'Why this contract depends on it',
      type: 'Storage / Validation / Token / etc.'
    }
  ],
  requiredBy: [
    { 
      name: 'Contract Name', 
      reason: 'Why that contract depends on this one',
      type: 'Job Management / Governance / etc.'
    }
  ],
  prerequisites: [
    'Deployment requirement 1',
    'Configuration requirement 2',
    'Minimum threshold requirement 3'
  ]
}
```

### Step 5: Document Functions (Most Time-Intensive)

**For EACH function, provide**:

```javascript
{
  name: 'functionName',
  signature: 'functionName(type param1, type param2) returns (type)',
  whatItDoes: 'One sentence: what this function does',
  whyUse: 'One sentence: when/why you would call this',
  howItWorks: [
    'Step 1: What happens first',
    'Step 2: Then what happens',
    'Step 3: Validation checks',
    'Step 4: State changes',
    'Step 5: Events emitted'
  ],
  parameters: [
    { name: 'param1', type: 'uint256', description: 'What this parameter means' }
  ],
  accessControl: 'Public / onlyOwner / onlyAuthorized / etc.',
  events: ['EventName(params) - when emitted'],
  gasEstimate: '~XXK gas',
  example: `// Real code example showing:
// 1. How to call the function
// 2. What parameters to pass
// 3. What the result looks like
// 4. Common use cases`,
  relatedFunctions: ['otherFunction1', 'otherFunction2']
}
```

**Function Documentation Tips**:
1. **Be precise**: Use exact parameter names and types from contract
2. **Provide context**: Explain WHY someone would call this
3. **Show real examples**: Use ethers.js code that actually works
4. **Explain validations**: What causes reverts?
5. **Note side effects**: What state changes occur?

### Step 6: Create Data Flows (3-4 flows)

```javascript
dataFlows: [
  {
    title: 'Primary User Flow',
    description: 'How the main user interaction works',
    steps: [
      { chain: 'Native Chain', action: '1. First thing happens' },
      { chain: 'Native Chain', action: '2. Then this happens' },
      { chain: 'Main Chain', action: '3. Cross-chain message sent' },
      { chain: 'Main Chain', action: '4. Processed on main chain' },
      { chain: 'Native Chain', action: '5. Confirmation received' }
    ]
  }
]
```

**Flow Selection**:
- Choose flows that illustrate KEY contract behaviors
- Include at least one cross-chain flow (if applicable)
- Show validation/authorization flows
- Demonstrate token/payment movements

### Step 7: Integration Guide

```javascript
integrationGuide: {
  example: `// Complete integration example
const { ethers } = require('ethers');

// 1. Setup contracts
const contract = new ethers.Contract(address, abi, signer);

// 2. Check current state
const state = await contract.viewFunction();

// 3. Perform action
await contract.actionFunction(params);

// 4. Verify result
const result = await contract.viewFunction();`,
  
  tips: [
    'Tip 1: Important consideration',
    'Tip 2: Common pitfall to avoid',
    'Tip 3: Best practice to follow',
    // ... 10-15 tips total
  ]
}
```

### Step 8: Security Considerations

```javascript
securityConsiderations: [
  'Access control: Who can call what functions',
  'Upgrade mechanism: How contract can be upgraded',
  'Cross-chain security: Message validation',
  'Token handling: How tokens are secured',
  'Validation checks: What prevents abuse',
  // ... 10-12 considerations total
]
```

---

## Documentation Template

### Complete Template Structure

```javascript
export const contractName = {
  // Basic Info
  id: 'contractName',
  name: 'Contract Display Name',
  chain: 'l2' or 'l1',
  column: 'l2-left' or 'l2-right' or 'l1-left' or 'l1-right',
  order: 0, // Display order in column
  status: 'testnet' or 'mainnet',
  version: 'v1.0.0',
  gas: '45K', // Average gas cost
  mainnetNetwork: 'Arbitrum One' or 'Ethereum Mainnet',
  testnetNetwork: 'Arbitrum Sepolia' or 'Ethereum Sepolia',
  mainnetDeployed: 'Not deployed' or 'Deployed',
  testnetDeployed: 'Deployed',
  mainnetAddress: null or '0x...',
  testnetAddress: '0x...',
  isUUPS: true or false,
  implementationAddress: '0x...' or null,
  tvl: 'N/A' or '$XXM',
  docs: 'One-line description with key features',
  
  // Main Documentation Sections
  overview: { /* ... */ },
  features: [ /* ... */ ],
  systemPosition: { /* ... */ },
  dependencies: { /* ... */ },
  functions: [ /* ... */ ],
  dataFlows: [ /* ... */ ],
  integrationGuide: { /* ... */ },
  securityConsiderations: [ /* ... */ ]
};
```

---

## Real Examples

### Example 1: Native Rewards (Complex Token Economics)

**Key Characteristics**:
- 20-band progressive reward system
- Governance unlock mechanism
- ONLY callable by NOWJC
- Referral bonus distribution

**Documentation Highlights**:
```javascript
// Clear overview explaining band system
overview: {
  purpose: 'Native Rewards is the token economics calculation engine that determines how many OW tokens users earn from platform activity. It implements a 20-band progressive reward system where token rates decrease as the platform grows (from 300 OW/USDT down to ~0.01 OW/USDT)...'
}

// Detailed function with real calculations
{
  name: 'processJobPayment',
  example: `// Example: $1000 USDT payment in Band 1 (300 OW/USDT)
await nativeRewards.processJobPayment(
  jobGiverAddress,
  jobTakerAddress,
  1000000000, // 1000 USDT (6 decimals)
  5000000000  // New platform total: $5000
);

// Results:
// - Job giver: ~800 OW (80% of 1000 * 300/1000)
// - Job giver's referrer: ~100 OW (10%)
// - Job taker's referrer: ~100 OW (10%)
// All tokens LOCKED until governance participation`
}
```

### Example 2: Oracle Manager (Internal Helper Pattern)

**Key Characteristics**:
- Created to solve 24KB contract size limit
- NOT user-facing
- ONLY callable by Native Athena
- Validation loop pattern

**Documentation Highlights**:
```javascript
// Emphasize internal nature
overview: {
  purpose: 'Oracle Manager is an internal helper contract created to solve Native Athena\'s contract size limit (Ethereum\'s 24KB maximum). This contract is NOT user-facing - users interact with Native Athena, which then delegates oracle operations to this manager...'
}

// Clear authorization diagram
systemPosition: {
  diagram: `
User/UI
  └─> Native Athena (public-facing)
      └─> Oracle Manager ⭐ (Internal helper)
          ├─> Validates via Native Athena
          └─> Stores in OpenworkGenesis

Authorization Flow:
  Native Athena → Oracle Manager (✓ authorized)
  Users → Oracle Manager (✗ not authorized)`
}
```

### Example 3: Native Athena (Cross-Chain Dispute Resolution)

**Key Characteristics**:
- Cross-chain message handling
- Skill Oracle system
- Multiple voting phases
- Complex state management

**Documentation Highlights**:
```javascript
// Clear cross-chain architecture
dataFlows: [
  {
    title: 'Cross-Chain Dispute Resolution',
    steps: [
      { chain: 'Native Chain', action: '1. Dispute created on NOWJC' },
      { chain: 'Native Chain', action: '2. Native Athena assigns to oracle' },
      { chain: 'Native Chain', action: '3. Oracle members vote' },
      { chain: 'Native Chain', action: '4. Verdict reached' },
      { chain: 'Native Chain', action: '5. Bridge message to Main chain' },
      { chain: 'Main Chain', action: '6. Main Athena executes resolution' }
    ]
  }
]
```

---

## Common Patterns

### Pattern 1: UUPS Upgradeability

**What to Document**:
```javascript
upgradeability: 'UUPS Upgradeable (owner only)'

securityConsiderations: [
  'UUPS upgradeable - owner only can upgrade',
  '_authorizeUpgrade requires owner',
  // ...
]
```

### Pattern 2: Cross-Chain Messaging (LayerZero)

**What to Document**:
```javascript
// In functions:
{
  name: 'sendCrossChainMessage',
  howItWorks: [
    'Prepares message payload',
    'Calls LayerZero endpoint',
    'Pays for cross-chain gas',
    'Emits message sent event',
    'Message received on destination chain'
  ]
}

// In data flows:
{
  title: 'Cross-Chain Message Flow',
  steps: [
    { chain: 'Source Chain', action: 'Prepare message' },
    { chain: 'LayerZero', action: 'Route message' },
    { chain: 'Destination Chain', action: 'Receive & process' }
  ]
}
```

### Pattern 3: Access Control (onlyAuthorized, onlyJobContract)

**What to Document**:
```javascript
// In overview:
'Only NOWJC can call state-changing functions'

// In functions:
accessControl: 'onlyJobContract - ONLY NOWJC can call'

// In security:
securityConsiderations: [
  'onlyJobContract modifier: ONLY NOWJC can change state',
  'No direct user calls - prevents gaming'
]
```

### Pattern 4: Storage Separation (Genesis Contracts)

**What to Document**:
```javascript
dependencies: {
  dependsOn: [
    { 
      name: 'OpenworkGenesis', 
      reason: 'Stores all contract data for persistence across upgrades',
      type: 'Storage'
    }
  ]
}

tips: [
  'Storage in OpenworkGenesis allows data persistence across upgrades',
  'Logic contract can be upgraded without losing data'
]
```

### Pattern 5: Band/Tier Systems

**What to Document**:
```javascript
// Explain the system clearly
features: [
  '20 progressive reward bands: Each distributing 30M OW tokens',
  'Decreasing rates: From 300 OW/USDT to ~0.01 OW/USDT'
]

// Provide examples for each tier
example: `// Band rates:
// Band 1:  300 OW/USDT ($0-$100k)
// Band 3:  150 OW/USDT ($200k-$400k)
// Band 5:  37.5 OW/USDT ($800k-$1.6M)`
```

### Pattern 6: Helper Contract for Size Limits

**What to Document**:
```javascript
overview: {
  purpose: 'Created to solve [Main Contract]\'s contract size limit (Ethereum\'s 24KB maximum). Extracts [functionality] into separate contract while maintaining security...'
}

features: [
  'Contract size optimization: Extracts [functions] from [Main Contract]',
  'Internal helper pattern: ONLY callable by [Main Contract]'
]
```

---

## Quality Checklist

### Before Submitting Documentation

**Accuracy** ✓
- [ ] All function signatures match source code exactly
- [ ] Parameter types and names are correct
- [ ] Access control modifiers are accurate
- [ ] Event names and parameters are correct
- [ ] Gas estimates are reasonable (if provided)

**Completeness** ✓
- [ ] All public/external functions documented
- [ ] All admin functions documented
- [ ] Key view functions documented
- [ ] Dependencies clearly listed
- [ ] At least 3 data flows provided
- [ ] Integration guide with code examples
- [ ] Security considerations listed

**Clarity** ✓
- [ ] Overview explains the "why" not just "what"
- [ ] Functions explain "when to use" not just "what it does"
- [ ] Examples are realistic and runnable
- [ ] Diagrams are clear and accurate
- [ ] Tips are actionable and specific

**Consistency** ✓
- [ ] Follows template structure
- [ ] Uses consistent terminology
- [ ] Code examples use ethers.js consistently
- [ ] Formatting matches other documentation

**Special Considerations** ✓
- [ ] Cross-chain flows clearly documented
- [ ] Access control patterns explained
- [ ] Helper contract relationships clear
- [ ] Token economics mechanisms explained
- [ ] Upgrade mechanisms documented

---

## Common Pitfalls to Avoid

### ❌ Don't: Assume or Invent

**Bad**:
```javascript
overview: {
  purpose: 'Users stake tokens for 6 months to get a 3x multiplier...'
}
```

**Good**:
```javascript
overview: {
  purpose: 'Users stake tokens for specified duration. Voting power calculated as: amount × durationMinutes...'
  // ^ Directly from contract code
}
```

### ❌ Don't: Use Vague Descriptions

**Bad**:
```javascript
features: [
  'Has a rewards system',
  'Supports cross-chain operations'
]
```

**Good**:
```javascript
features: [
  '20-band progressive reward system: Each band distributes 30M OW tokens',
  'LayerZero cross-chain messaging: Syncs dispute data between Arbitrum and Ethereum'
]
```

### ❌ Don't: Omit Access Control

**Bad**:
```javascript
{
  name: 'processJobPayment',
  // No mention of who can call
}
```

**Good**:
```javascript
{
  name: 'processJobPayment',
  accessControl: 'onlyJobContract - ONLY NOWJC can call',
  // ...
}
```

### ❌ Don't: Forget Cross-Chain Context

**Bad**:
```javascript
// Just documenting Native Athena without mentioning Main Athena
```

**Good**:
```javascript
systemPosition: {
  description: 'Native Athena handles dispute voting on Arbitrum, then syncs verdicts to Main Athena on Ethereum for enforcement...'
}
```

### ❌ Don't: Skip Integration Examples

**Bad**:
```javascript
integrationGuide: {
  tips: ['Use carefully', 'Check docs']
}
```

**Good**:
```javascript
integrationGuide: {
  example: `// Complete working example
const rewards = new ethers.Contract(address, abi, signer);
const claimable = await rewards.getUserTotalClaimableTokens(userAddress);
console.log('Claimable:', ethers.formatEther(claimable), 'OW');`,
  tips: [
    'Tokens start LOCKED - must participate in governance to unlock',
    'Each governance action unlocks = current band rate',
    // ... specific, actionable tips
  ]
}
```

---

## Documentation Workflow Summary

### Phase 1: Analysis (30-45 minutes)
1. Read contract thoroughly
2. Map system relationships
3. Categorize functions
4. Identify patterns
5. Trace data flows

### Phase 2: Documentation (2-3 hours)
1. Fill overview section
2. List features
3. Create system diagram
4. Document dependencies
5. Document all functions (most time)
6. Create data flows
7. Write integration guide
8. List security considerations

### Phase 3: Review (15-20 minutes)
1. Check against source code
2. Verify all functions covered
3. Test code examples (if possible)
4. Review for clarity
5. Check consistency with other docs

### Total Time per Contract: 3-4 hours

---

## Getting Help

If stuck or unsure:

1. **Check existing documentation**: Native Rewards, Oracle Manager, Native Athena
2. **Reference this guide**: Follow the template structure
3. **Ask specific questions**: "How should I document cross-chain flows?"
4. **Start simple**: Get the basics right first, add details later

---

## Version History

- **v1.0** (2025-03-11): Initial guide based on Native Athena, Native Rewards, and Oracle Manager documentation process

---

*This guide will evolve as we document more contracts and discover new patterns. Always refer to the most recent version.*
