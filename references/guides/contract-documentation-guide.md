# OpenWork Contract Documentation Guide

**Version**: 1.0  
**Created**: March 11, 2025  
**Purpose**: Standard process for documenting OpenWork smart contracts

---

## Table of Contents

1. [Overview](#overview)
2. [Documentation Standards](#documentation-standards)
3. [Step-by-Step Documentation Process](#step-by-step-documentation-process)
4. [Documentation Template](#documentation-template)
5. [Research Checklist](#research-checklist)
6. [Examples & References](#examples--references)
7. [Best Practices & Common Pitfalls](#best-practices--common-pitfalls)

---

## Overview

### Purpose

This guide provides a standardized methodology for documenting OpenWork smart contracts to ensure:
- **Consistency**: All contracts documented with the same structure and depth
- **Completeness**: Every important aspect of a contract is captured
- **Clarity**: Developers can understand contract purpose and usage quickly
- **Maintainability**: Documentation can be easily updated as contracts evolve

### Target Audience

- Developers documenting new contracts
- Developers updating existing documentation
- Technical writers contributing to the project

### Expected Outcome

After following this guide, you will produce comprehensive contract documentation that includes:
- Clear explanation of contract purpose and system role
- Detailed function documentation with examples
- Cross-chain interaction flows
- Integration guidance for developers
- Security considerations

---

## Documentation Standards

### Writing Style

**Tone**: Professional, clear, and developer-friendly
- Use active voice ("This function releases payment" not "Payment is released by this function")
- Be direct and concise
- Avoid jargon unless it's standard in the blockchain space
- Explain complex concepts with analogies when helpful

**Technical Accuracy**:
- All function signatures must match the source code exactly
- Gas estimates should be based on actual testing
- Parameter types and descriptions must be precise
- Access control information must be accurate

**Code Examples**:
- Use realistic scenarios
- Include comments explaining each step
- Show both success and error cases when relevant
- Use consistent variable naming

### Required Detail Levels

**High Detail** (critical sections):
- Function signatures and parameters
- How functions work (step-by-step)
- Cross-chain interactions
- Access control and security

**Medium Detail**:
- Events emitted
- Integration examples
- Data flow diagrams

**Low Detail** (can be brief):
- View functions with obvious purposes
- Standard getter/setter patterns

---

## Step-by-Step Documentation Process

### Phase 1: Contract Selection

**Choose the next logical contract to document based on:**

1. **Dependency Order**: Document dependencies before dependents
   - Example: Document Genesis contracts before contracts that use them
   - Example: Document NOWJC before documenting LOWJC

2. **System Tier**: Follow the architecture hierarchy
   - Native Chain core contracts (NOWJC, Native Athena, etc.)
   - Bridge contracts (Native Bridge, Local Bridges)
   - Local Chain contracts (LOWJC, Athena Client)
   - Storage contracts (Genesis contracts)
   - Supporting contracts (Profile Manager, Registry)

3. **Functional Grouping**: Document related contracts together
   - Job management system (NOWJC → LOWJC)
   - Dispute resolution system (Native Athena → Oracle Manager → Athena Client)
   - Rewards system (Native Rewards → Main Rewards)
   - Governance system (Native DAO → Main DAO)

**Priority Order Recommendation:**
1. Core data storage (OpenworkGenesis, ProfileGenesis)
2. Central logic contracts (NOWJC, Native Athena)
3. Bridge infrastructure (Native Bridge, Local Bridges, CCTP Transceiver)
4. Management contracts (Oracle Manager, Profile Manager)
5. Local chain interfaces (LOWJC, Athena Client)
6. Governance & rewards (DAOs, Rewards contracts)

---

### Phase 2: Read the Contract

**What to look for:**

1. **Contract Purpose** (from comments and code structure)
   - What problem does this contract solve?
   - What is its role in the overall system?

2. **State Variables**
   - What data does it store?
   - What are the key mappings and structures?
   - Does it use external storage (Genesis)?

3. **Functions** (catalog all functions)
   - Public/external functions (user/contract-facing)
   - Internal/private functions (helper functions)
   - View functions (read-only)
   - Modifiers (access control patterns)

4. **Events**
   - What events are emitted?
   - What data do they contain?
   - When are they triggered?

5. **External Calls**
   - What other contracts does it call?
   - What are the dependencies?
   - Are there any cross-chain interactions?

6. **Access Control**
   - Who can call each function?
   - What modifiers are used (onlyOwner, onlyBridge, etc.)?
   - Are there authorization checks?

7. **Upgradeability**
   - Is it a UUPS upgradeable contract?
   - Who can authorize upgrades?
   - What is the upgrade process?

**Create a Contract Analysis Document** (for your reference):
```markdown
# [Contract Name] Analysis

## Basic Info
- File: contracts/path/to/contract.sol
- Chain: Native/Local/Main
- Upgradeability: UUPS/Immutable
- Dependencies: [List contracts it depends on]

## Key State Variables
- variable1: purpose
- variable2: purpose

## Function Categories
1. Category 1 (e.g., Job Management)
   - function1(): brief description
   - function2(): brief description

2. Category 2 (e.g., Cross-Chain Sync)
   - function3(): brief description

## Cross-Chain Interactions
- Sends to: [chain/contract]
- Receives from: [chain/contract]
- Uses CCTP: Yes/No
- Uses LayerZero: Yes/No

## Notes & Questions
- [Any unclear aspects to research further]
```

---

### Phase 3: Read Associated Contracts

**Identify all associated contracts:**

1. **Direct Dependencies**: Contracts this contract calls
   - Example: NOWJC calls OpenworkGenesis, Native Rewards, CCTP Transceiver

2. **Reverse Dependencies**: Contracts that call this contract
   - Example: NOWJC is called by Native Bridge, Native Athena

3. **Bridge Connections**: Cross-chain counterparts
   - Example: NOWJC ↔ LOWJC (via bridges)

4. **Storage Contracts**: Where data is stored
   - Example: Most contracts use OpenworkGenesis or ProfileGenesis

**For each associated contract, document:**
- Its purpose
- How it interacts with the contract you're documenting
- What data flows between them
- In what scenarios they communicate

---

### Phase 4: Read System Overview

**Study the system architecture document:**

Location: `references/guides/openwork-system-architecture-complete.md`

**Key sections to review:**

1. **Architecture Principles**
   - Understand the three-tier chain architecture
   - Review separation of concerns
   - Study cross-chain communication patterns

2. **Contract Catalog**
   - Find your contract in the catalog
   - Read its entry in the system overview
   - Note how it's described in relation to others

3. **Data Flow Patterns**
   - Identify which patterns involve your contract
   - Understand the complete flow from start to finish
   - Note the order of operations

4. **User Journeys**
   - See how users interact with your contract
   - Understand the business context
   - Identify key use cases

**Create a System Position Summary:**
```markdown
# [Contract Name] System Position

## Role in Architecture
- Tier: Native/Local/Main
- Category: Job Management/Dispute/Governance/etc.
- Position: Entry point/Logic layer/Storage/Bridge

## Upstream (Calls this contract)
- Contract 1: Why it calls this
- Contract 2: Why it calls this

## Downstream (This contract calls)
- Contract 1: Why we call it
- Contract 2: Why we call it

## Data Flows Involving This Contract
1. Flow Name: Brief description
2. Flow Name: Brief description
```

---

### Phase 5: Read Existing Documentation

**Study already-documented contracts:**

Location: `src/pages/Documentation/OpenworkDocs.jsx`

**What to learn from existing docs:**

1. **Structure & Format**
   - How sections are organized
   - Level of detail in each section
   - How functions are documented
   - How examples are presented

2. **Writing Style**
   - Tone and voice
   - How to explain complex concepts
   - How to structure explanations

3. **Similar Contracts**
   - If documenting a Local chain contract, study other Local contracts
   - If documenting a bridge, study other bridges
   - Learn from contracts with similar complexity

**Reference Contracts (well-documented examples):**
- **Oracle Manager**: Excellent example of management contract documentation
- **NOWJC**: Great example for core logic contracts
- **Native Athena**: Good example of complex voting/dispute logic
- **CCTP Transceiver**: Good example of bridge/infrastructure documentation

**Note patterns like:**
- How dependencies are explained
- How cross-chain flows are diagrammed
- How function examples are structured
- How integration guides are written

---

### Phase 6: Create the Documentation

**Follow the Documentation Template** (see next section)

**Start with high-level sections:**
1. Overview
2. Features
3. System Position

**Then add detailed sections:**
4. Dependencies
5. Functions (most time-consuming)
6. Data Flows
7. Integration Guide
8. Security Considerations

**Tips for efficiency:**
- Write the overview first to clarify your understanding
- Group functions by category before documenting individually
- Use existing examples as templates for similar functions
- Document public/external functions first, internal functions if critical
- Write integration examples as you go

---

## Documentation Template

### Complete Template Structure

```javascript
contractName: {
  id: 'contractName',
  name: 'Display Name',
  chain: 'base|l2|op|eth',
  column: 'base-main|l2-left|l2-center|l2-right|op-main|eth-main',
  order: 0, // vertical position in column
  status: 'testnet|mainnet|local',
  version: 'v1.0.0',
  gas: '45K', // typical gas cost
  mainnetNetwork: 'Network Name',
  testnetNetwork: 'Network Name',
  mainnetDeployed: 'Deployed|Not deployed',
  testnetDeployed: 'Deployed|Not deployed',
  mainnetAddress: '0x...' or null,
  testnetAddress: '0x...',
  isUUPS: true|false,
  implementationAddress: '0x...' or undefined,
  tvl: 'N/A or amount',
  docs: 'Brief one-line description',
  
  // DETAILED DOCUMENTATION SECTIONS BELOW
  
  overview: {
    purpose: 'Detailed explanation of what this contract does and why it exists',
    tier: 'Native Chain (Arbitrum)|Local Chain|Main Chain',
    category: 'Job Management|Dispute Resolution|Governance|etc.',
    upgradeability: 'UUPS Upgradeable|Non-Upgradeable|Immutable'
  },
  
  features: [
    'Key feature 1',
    'Key feature 2',
    'Key feature 3',
    // 5-10 bullet points highlighting main capabilities
  ],
  
  systemPosition: {
    description: 'Narrative explanation of where this contract sits in the architecture and how it relates to other contracts',
    diagram: `
ASCII diagram showing:
- What calls this contract
- What this contract calls
- Data flow direction
- Key operations

Example format:
Native DAO Governance
  └─> Proposal: "Create AI/ML Oracle"
      └─> Oracle Manager ⭐ (You are here)
          ├─> Validate: Check Native Athena.canVote()
          └─> Store: Genesis.setOracle()
    `
  },
  
  dependencies: {
    dependsOn: [
      {
        name: 'Contract Name',
        reason: 'Why this contract depends on it',
        type: 'Storage|Bridge|Logic|etc.'
      }
    ],
    requiredBy: [
      {
        name: 'Contract Name',
        reason: 'Why that contract needs this one',
        type: 'Storage|Bridge|Logic|etc.'
      }
    ],
    prerequisites: [
      'Prerequisite 1: Must be deployed first',
      'Prerequisite 2: Must be configured',
      'Prerequisite 3: Access must be granted'
    ]
  },
  
  functions: [
    {
      category: 'Category Name',
      description: 'What this category of functions does',
      items: [
        {
          name: 'functionName',
          signature: 'functionName(param1Type param1Name, param2Type param2Name) returns (returnType)',
          
          whatItDoes: 'Clear, concise explanation of what this function does',
          
          whyUse: 'When and why a developer would call this function',
          
          howItWorks: [
            'Step 1: What happens first',
            'Step 2: Next operation',
            'Step 3: Final result',
            // Be detailed and sequential
          ],
          
          parameters: [
            {
              name: 'param1Name',
              type: 'param1Type',
              description: 'What this parameter represents and any constraints'
            }
          ],
          
          accessControl: 'Who can call this: Public|Owner-only|Bridge-only|Authorized contracts',
          
          events: [
            'EventName(param1, param2)',
            'AnotherEvent(param1)'
          ],
          
          gasEstimate: '~45K gas|N/A (view)',
          
          example: `// Complete, runnable example
// Show realistic usage scenario

await contract.functionName(
  param1,
  param2,
  { value: fee }
);

// Explain what happens next
// Show expected results`,
          
          relatedFunctions: ['relatedFunc1', 'relatedFunc2']
        }
      ]
    }
  ],
  
  dataFlows: [
    {
      title: 'Flow Name',
      description: 'What this flow accomplishes end-to-end',
      steps: [
        {
          chain: 'Local Chain|Native Chain|Main Chain',
          action: 'Description of what happens at this step'
        }
      ]
    }
  ],
  
  integrationGuide: {
    example: `// Complete integration example
// Show realistic multi-step scenario
// Include all necessary imports, setup, and error handling

// 1. Setup
const contract = new ethers.Contract(address, abi, signer);

// 2. Check prerequisites
const eligible = await contract.checkEligibility(user);

// 3. Execute operation
const tx = await contract.mainFunction(
  param1,
  param2,
  { value: fee }
);

// 4. Wait and verify
await tx.wait();
console.log("Operation successful");`,
    
    tips: [
      'Practical tip 1 for using this contract',
      'Common gotcha to avoid',
      'Performance consideration',
      'Security best practice',
      // 5-10 practical tips
    ]
  },
  
  securityConsiderations: [
    'Security aspect 1 (e.g., UUPS upgradeable - owner can upgrade)',
    'Security aspect 2 (e.g., Bridge-only access control)',
    'Security aspect 3 (e.g., Time-locked operations)',
    // List all relevant security considerations
  ]
}
```

---

## Research Checklist

Use this checklist for each contract you document:

### Basic Information
- [ ] Contract file location identified
- [ ] Deployment chains identified (Native/Local/Main)
- [ ] Current deployment addresses found
- [ ] Upgradeability pattern determined (UUPS/Immutable)
- [ ] Version number identified

### Code Analysis
- [ ] All public/external functions cataloged
- [ ] All events identified
- [ ] All modifiers documented
- [ ] Access control patterns understood
- [ ] State variables reviewed

### Dependencies
- [ ] Direct dependencies listed (contracts it calls)
- [ ] Reverse dependencies listed (contracts that call it)
- [ ] Storage contracts identified
- [ ] Bridge connections mapped

### Cross-Chain Interactions
- [ ] LayerZero messages identified (if any)
- [ ] CCTP transfers identified (if any)
- [ ] Source and destination chains confirmed
- [ ] Message routing logic understood

### Function Documentation
- [ ] Each public function has full documentation
- [ ] Parameters explained with types and constraints
- [ ] Return values documented
- [ ] Access control specified
- [ ] Events emitted listed
- [ ] Gas estimates provided (from testing if possible)
- [ ] Example usage written
- [ ] Related functions linked

### Integration & Examples
- [ ] Complete integration example written
- [ ] Common use cases covered
- [ ] Error handling shown
- [ ] Tips and best practices listed

### Data Flows
- [ ] At least 1-2 complete data flows documented
- [ ] Each step clearly explained
- [ ] Chain transitions shown
- [ ] End-to-end user journeys illustrated

### Security
- [ ] Access control mechanisms documented
- [ ] Upgrade authorization explained
- [ ] Economic security aspects covered
- [ ] Known risks or considerations listed

### Quality Check
- [ ] All function signatures match source code
- [ ] All addresses verified
- [ ] All examples tested (if possible)
- [ ] Writing is clear and consistent
- [ ] No typos or formatting errors
- [ ] Follows template structure exactly

---

## Examples & References

### Example 1: Simple View Function

```javascript
{
  name: 'canVote',
  signature: 'canVote(address account) view returns (bool)',
  
  whatItDoes: 'Checks if an address is eligible to vote on disputes based on staked or earned tokens.',
  
  whyUse: 'Validate voting eligibility before allowing participation in disputes or governance.',
  
  howItWorks: [
    'Queries Native DAO for active stake ≥ minStakeRequired',
    'If sufficient stake: returns true',
    'If no stake: checks NOWJC for earned tokens ≥ minStakeRequired',
    'Returns true if either condition met'
  ],
  
  parameters: [
    {
      name: 'account',
      type: 'address',
      description: 'Address to check eligibility'
    }
  ],
  
  accessControl: 'Public view function',
  
  events: ['None (view function)'],
  
  gasEstimate: 'N/A (view)',
  
  example: `// Check if user can vote
const eligible = await nativeAthena.canVote(userAddress);

// Case 1: Active staker
// - Staked: 500 OW (≥ 100 minimum)
// - Result: true

// Case 2: No stake but earned tokens
// - Staked: 0 OW
// - Earned: 200 OW (≥ 100 minimum)  
// - Result: true`,
  
  relatedFunctions: ['getUserVotingPower', 'vote']
}
```

### Example 2: Complex State-Changing Function

```javascript
{
  name: 'releasePaymentCrossChain',
  signature: 'releasePaymentCrossChain(address jobGiver, string jobId, uint256 amount, uint32 targetChainDomain, address targetRecipient)',
  
  whatItDoes: 'Releases escrowed USDC payment to freelancer on any supported chain via CCTP.',
  
  whyUse: 'This is the core payment function. Job giver uses this after reviewing submitted work. It calculates commission, sends USDC via CCTP to freelancer\'s preferred chain, awards OW tokens, and moves to next milestone or completes the job.',
  
  howItWorks: [
    'Validates job status is InProgress',
    'Validates amount matches current milestone exactly',
    'Calculates commission: max(1% of amount, $1 USDC)',
    'Deducts commission, calculates net payment',
    'Approves CCTP Transceiver to spend USDC',
    'Calls CCTP sendFast() to transfer USDC cross-chain',
    'Calls Native Rewards to process and award OW tokens',
    'Updates total paid in Genesis',
    'Increments milestone counter',
    'If final milestone, marks job as Completed',
    'Emits PaymentReleased and CommissionDeducted events'
  ],
  
  parameters: [
    { name: 'jobGiver', type: 'address', description: 'Address initiating payment' },
    { name: 'jobId', type: 'string', description: 'Job identifier' },
    { name: 'amount', type: 'uint256', description: 'Gross payment amount (before commission, must match milestone)' },
    { name: 'targetChainDomain', type: 'uint32', description: 'CCTP domain: 0=Ethereum, 2=Optimism, 3=Arbitrum' },
    { name: 'targetRecipient', type: 'address', description: 'Freelancer address on target chain' }
  ],
  
  accessControl: 'Bridge-only for cross-chain calls, but also callable by job giver on Native chain',
  
  events: [
    'CommissionDeducted(jobId, grossAmount, commission, netAmount)',
    'PaymentReleased(jobId, jobGiver, targetRecipient, netAmount, milestone)',
    'JobStatusChanged(jobId, Completed) [if final milestone]'
  ],
  
  gasEstimate: '~78K gas',
  
  example: `// Release 1000 USDC to freelancer on Optimism
await nowjc.releasePaymentCrossChain(
  jobGiverAddress,
  "40232-57",
  1000_000_000,     // 1000 USDC (6 decimals)
  2,                // Optimism domain
  freelancerAddress,
  lzOptions,
  { value: lzFee }
);

// Commission: 10 USDC (1%)
// Freelancer receives: 990 USDC on Optimism
// OW tokens awarded to participants automatically`,
  
  relatedFunctions: ['calculateCommission', 'releaseDisputedFunds', 'processJobPayment']
}
```

### Example 3: Data Flow Documentation

```javascript
{
  title: 'Cross-Chain Payment Flow',
  description: 'How payments are released across different chains',
  steps: [
    { chain: 'Local Chain', action: 'Job giver calls LOWJC.releasePaymentCrossChain()' },
    { chain: 'Local Chain', action: 'Local Bridge sends LayerZero message' },
    { chain: 'Native Chain', action: 'Native Bridge calls NOWJC.releasePaymentCrossChain()' },
    { chain: 'Native Chain', action: 'NOWJC calculates commission (1% or $1 min)' },
    { chain: 'Native Chain', action: 'NOWJC approves CCTP Transceiver for USDC' },
    { chain: 'Native Chain', action: 'CCTP burns USDC on Native chain' },
    { chain: 'Target Chain', action: 'CCTP mints USDC for freelancer' },
    { chain: 'Native Chain', action: 'Native Rewards calculates OW token awards' },
    { chain: 'Native Chain', action: 'OpenworkGenesis updated with payment' }
  ]
}
```

---

## Best Practices & Common Pitfalls

### Best Practices

**1. Start Simple, Then Add Detail**
- Write the overview and features first
- This helps clarify your understanding
- Then fill in detailed sections

**2. Use Consistent Terminology**
- Use the same names as the source code
- Be consistent with other documentation
- Define technical terms on first use

**3. Focus on Developer Needs**
- What does a developer need to integrate with this contract?
- What are common use cases?
- What mistakes should they avoid?

**4. Verify Everything**
- Check function signatures match source code
- Verify contract addresses are correct
- Test examples if possible
- Cross-reference with system architecture doc

**5. Link Related Information**
- Reference related functions
- Link to dependency documentation
- Point to relevant system architecture sections

**6. Keep Examples Realistic**
- Use actual token amounts (1000 USDC not 100000000000)
- Show real chain domains
- Include error handling where relevant
- Comment complex steps

**7. Update Cross-References**
- When documenting a new contract, update related contracts' documentation
- Add the new contract to system position diagrams
- Update data flow diagrams that involve it

### Common Pitfalls to Avoid

**❌ Don't: Copy-paste without adapting**
- Each contract is unique
- Adapt examples to the specific contract
- Don't leave placeholder text

**❌ Don't: Assume reader knowledge**
- Explain what parameters are used for
- Clarify chain domains and identifiers
- Define acronyms (CCTP, UUPS, etc.)

**❌ Don't: Skip error cases**
- Show what happens when conditions aren't met
- Explain access control failures
- Document reverts and their reasons

**❌ Don't: Document internal implementation details**
- Focus on public/external interface
- Internal functions only if critical to understanding
- Avoid over-explaining obvious code

**❌ Don't: Forget cross-chain context**
- Always specify which chain a function is called on
- Show the complete cross-chain flow
- Explain LayerZero vs CCTP usage

**❌ Don't: Use inconsistent formatting**
- Follow the template exactly
- Match the style of existing docs
- Use consistent code formatting

**❌ Don't: Write unclear examples**
- Always include context (what you're trying to achieve)
- Show the complete flow, not just one function call
- Include expected results

### Documentation Quality Checklist

Before submitting documentation, verify:

✅ **Completeness**
- All template sections filled in
- All public functions documented
- All cross-chain interactions explained

✅ **Accuracy**
- Function signatures match source code
- Contract addresses are correct
- Access control is accurate
- Gas estimates are reasonable

✅ **Clarity**
- Explanations are clear and concise
- Examples are realistic and helpful
- Technical terms are defined
- Flow diagrams are easy to follow

✅ **Consistency**
- Follows template structure
- Matches style of existing docs
- Uses consistent terminology
- Formatting is correct

✅ **Usefulness**
- Addresses developer needs
- Provides practical integration guidance
- Includes helpful tips
- Shows common use cases

---

## Getting Help

**If you're stuck:**

1. **Review similar contracts**: Look at how similar contracts are documented
2. **Check the architecture doc**: The system overview often clarifies confusion
3. **Ask questions**: Better to clarify than to document incorrectly
4. **Start with what you know**: Document the clear parts first
5. **Iterate**: First draft doesn't need to be perfect

**Resources:**
- System Architecture: `references/guides/openwork-system-architecture-complete.md`
- Existing Documentation: `src/pages/Documentation/OpenworkDocs.jsx`
- Contract Source Code: `contracts/` directory

---

## Conclusion

High-quality documentation is crucial for:
- Developer onboarding
- System maintenance
- Security audits
- Community understanding

By following this guide, you ensure that every contract is documented to the same high standard, making the entire OpenWork system more accessible and maintainable.

**Remember**: Good documentation is an investment in the project's future. Take the time to do it right!

---

**Guide Version**: 1.0  
**Last Updated**: March 11, 2025  
**Maintained By**: OpenWork Documentation Team
