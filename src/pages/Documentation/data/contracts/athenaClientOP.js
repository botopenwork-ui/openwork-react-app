export const athenaClientOP = {
  id: 'athenaClientOP',
  name: 'Athena Client',
  chain: 'op',
  column: 'op-main',
  order: 1,
  status: 'testnet',
  version: 'v1.0.0',
  gas: '45K',
  mainnetNetwork: 'Optimism',
  testnetNetwork: 'OP Sepolia',
  mainnetDeployed: 'Not deployed',
  testnetDeployed: 'Deployed',
  mainnetAddress: null,
  testnetAddress: '0x45E51B424c87Eb430E705CcE3EcD8e22baD267f7',
  isUUPS: true,
  tvl: 'N/A',
  docs: 'Local dispute interface on OP Sepolia - Enables cross-chain dispute initiation, skill verification, and oracle queries. Routes all USDC fees to Native Athena on Arbitrum via CCTP while sending dispute data via LayerZero for unified dispute resolution.',
  
  overview: {
    purpose: 'Athena Client on OP Sepolia serves as the local entry point for all dispute resolution and oracle services in the OpenWork ecosystem. Users on OP can raise disputes, submit skill verifications, or ask oracles questions by paying USDC fees. The contract implements a dual-channel architecture: (1) USDC fees are immediately routed to Native Athena on Arbitrum via CCTP for centralized fee management and reward distribution, and (2) dispute/oracle data is sent via LayerZero for processing. After Native Athena processes votes, it sends resolution results back to Athena Client, which automatically resolves the dispute in LOWJC.',
    tier: 'Local Chain (OP Sepolia)',
    category: 'Dispute Resolution - User Gateway',
    upgradeability: 'UUPS Upgradeable (owner or bridge authorized)'
  },
  
  features: [
    'Cross-chain dispute initiation with USDC fees',
    'Skill verification submission and oracle queries',
    'Automatic fee routing to Native Athena via CCTP',
    'Dispute resolution auto-execution in LOWJC',
    'Minimum dispute fee enforcement (configurable)',
    'Vote recording and fee distribution tracking',
    'Job participation validation for disputes',
    'LayerZero fee quoting for cross-chain messages',
    'Emergency USDC recovery mechanisms',
    'DAO-authorized upgrades via bridge',
    'ReentrancyGuard for all fee operations',
    'UUPS proxy pattern for future improvements',
    'Same contract deployed on all Local chains',
    'Integration with LOWJC for dispute resolution'
  ],
  
  systemPosition: {
    description: 'Athena Client sits on Local chains as the dispute/oracle interface for users. When disputes are raised, the client immediately routes USDC fees to Native Athena via CCTP (burn on OP, mint on Arbitrum) while sending dispute details via LayerZero. Native Athena coordinates oracle voting, calculates rewards, and sends results back. Upon receiving finalization, Athena Client automatically calls LOWJC.resolveDispute() to execute the outcome. This architecture centralizes all fee management and oracle coordination on Arbitrum while allowing users on any chain to access dispute services.',
    diagram: `
📍 Athena Client (OP) in OpenWork Architecture

┌─────────────────────────────────────────────────────────┐
│  LOCAL CHAIN: OP SEPOLIA ⭐ (YOU ARE HERE)              │
│  Dispute & Oracle Interface                             │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ⭐ Athena Client (Local Dispute Interface)            │
│     ├─> raiseDispute() - Initiate dispute              │
│     ├─> submitSkillVerification() - Skill check        │
│     ├─> askAthena() - Query oracles                    │
│     └─> handleFinalizeDisputeWithVotes() - Resolve     │
│                                                          │
│  Dependencies on OP:                                     │
│  ├─> Local Bridge (LayerZero messaging)                │
│  ├─> CCTP Transceiver (USDC fee routing)               │
│  ├─> LOWJC (dispute execution target)                  │
│  └─> USDC Token (dispute/oracle fees)                  │
│                                                          │
└─────────────┬───────────────────┬───────────────────────┘
              │                   │
    (1) Dispute Data      (2) USDC Fees
    LayerZero             CCTP Protocol
              │                   │
              ↓                   ↓
┌─────────────────────────────────────────────────────────┐
│  NATIVE CHAIN: ARBITRUM SEPOLIA                         │
│  Central Dispute Processing Hub                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ├─> Native Bridge (receives LayerZero messages)       │
│  │    └─> Routes to Native Athena                      │
│  │                                                      │
│  ├─> CCTP Transceiver (receives USDC fee mints)        │
│  │    └─> Mints USDC to Native Athena                  │
│  │                                                      │
│  ⭐ Native Athena (Dispute Coordinator)                │
│     ├─> Receives dispute from all chains               │
│     ├─> Coordinates oracle voting                       │
│     ├─> Manages fee pools and rewards                   │
│     ├─> Calculates vote outcomes                        │
│     └─> Sends resolution back to origin chain          │
│                                                          │
│  ├─> Native Athena Oracle Manager                       │
│  ├─> OpenworkGenesis (dispute storage)                 │
│  └─> Native Rewards (OW token distribution)            │
│                                                          │
└─────────────────────────────────────────────────────────┘

Complete Dispute Flow:

1. User on OP → Athena Client.raiseDispute(50 USDC)
   
2. Athena Client splits into TWO parallel operations:

   A. DISPUTE DATA PATH (LayerZero):
      Athena Client → Local Bridge.sendToNativeChain()
      → Native Bridge._lzReceive()
      → Native Athena.raiseDispute()
      → Stores in Genesis, initiates voting ✓

   B. USDC FEE PATH (CCTP):
      Athena Client.routeFeeToNative()
      → CCTP Transceiver (OP).sendFast()
      → Burns 50 USDC on OP
      → Circle generates attestation
      → Backend polls Circle API
      → CCTP Transceiver (Arb).receive()
      → Mints 50 USDC to Native Athena ✓

3. Native Athena:
   - Oracle members vote on dispute
   - Native Athena calculates outcome
   - Distributes fees to winning voters
   - Sends resolution back via LayerZero

4. Athena Client receives finalization:
   - Records vote data locally
   - Automatically calls LOWJC.resolveDispute()
   - Job resolved, funds distributed

Key Benefits:
✓ Raise disputes from any chain
✓ Centralized fee management on Arbitrum
✓ Unified oracle voting system
✓ Automatic dispute execution in LOWJC
✓ Native USDC (no wrapped tokens)
✓ Cross-chain skill verification
✓ Oracle query capabilities`
  },
  
  dependencies: {
    dependsOn: [
      { 
        name: 'Local Bridge (OP)', 
        reason: 'Sends dispute data, skill verifications, and oracle queries to Native Chain via LayerZero.',
        type: 'Bridge Infrastructure'
      },
      { 
        name: 'CCTP Transceiver (OP)', 
        reason: 'Burns USDC fees on OP and initiates mints on Arbitrum for Native Athena.',
        type: 'Payment Infrastructure'
      },
      { 
        name: 'USDC Token', 
        reason: 'Payment currency for dispute fees, skill verification, and oracle queries.',
        type: 'Token'
      },
      { 
        name: 'LOWJC (OP)', 
        reason: 'Target contract for dispute resolution. Athena Client calls resolveDispute() after finalization.',
        type: 'Job Management'
      }
    ],
    requiredBy: [
      { 
        name: 'Native Athena (Arbitrum)', 
        reason: 'Receives disputes, skill verifications, and oracle queries from Athena Client.',
        type: 'Dispute Resolution'
      },
      { 
        name: 'Frontend dApp', 
        reason: 'Users interact with Athena Client to raise disputes and query oracles.',
        type: 'Application Layer'
      }
    ],
    prerequisites: [
      'UUPS Proxy deployed on OP Sepolia',
      'Implementation contract deployed',
      'Local Bridge address configured',
      'CCTP Transceiver address configured',
      'USDC token address configured',
      'LOWJC address configured',
      'Native Athena recipient address (Arbitrum) configured',
      'Native chain domain set (3 for Arbitrum)',
      'Minimum dispute fee set (default 50 USDC)',
      'LayerZero V2 Endpoint active on OP'
    ]
  },
  
  functions: [
    {
      category: 'Dispute Management',
      description: 'Raise and finalize disputes with cross-chain coordination',
      items: [
        {
          name: 'raiseDispute',
          signature: 'raiseDispute(string _jobId, string _disputeHash, string _oracleName, uint256 _feeAmount, uint256 _disputedAmount, bytes _nativeOptions) payable',
          whatItDoes: 'Initiates dispute on OP, routes USDC fee to Native Athena, sends dispute data via LayerZero.',
          whyUse: 'Job participants use this when work quality is contested or payment is unfair.',
          howItWorks: [
            '1. Validates fee amount > 0',
            '2. Transfers USDC from caller to contract',
            '3. Routes fee to Native Athena via CCTP immediately',
            '4. Initializes local dispute tracking',
            '5. Sends dispute details to Native Athena via LayerZero',
            '6. Native Athena initiates oracle voting',
            '7. Emits DisputeRaised event'
          ],
          parameters: [
            { name: '_jobId', type: 'string', description: 'Job ID to dispute (can be from any chain)' },
            { name: '_disputeHash', type: 'string', description: 'IPFS hash with dispute details, evidence, reasoning' },
            { name: '_oracleName', type: 'string', description: 'Target skill oracle name for voting' },
            { name: '_feeAmount', type: 'uint256', description: 'USDC dispute fee (6 decimals, min 50 USDC)' },
            { name: '_disputedAmount', type: 'uint256', description: 'Amount in dispute (for context)' },
            { name: '_nativeOptions', type: 'bytes', description: 'LayerZero options for Native Chain message' }
          ],
          accessControl: 'Public (requires USDC approval)',
          events: ['DisputeRaised(caller, jobId, feeAmount)', 'FeeRoutedToNative(feeAmount, nativeRecipient)'],
          gasEstimate: '~120K gas + LayerZero fee',
          example: `const jobId = "10232-1"; // Job to dispute
const disputeEvidence = "QmDispute..."; // IPFS with evidence
const oracleName = "Frontend Development"; // Target oracle
const disputeFee = ethers.parseUnits("50", 6); // 50 USDC
const disputedAmount = ethers.parseUnits("500", 6); // 500 USDC job
const lzOptions = ethers.solidityPacked(["uint16", "uint256"], [1, 200000]);

// Approve USDC first
await usdc.approve(athenaClientAddress, disputeFee);

await athenaClient.raiseDispute(
  jobId,
  disputeEvidence,
  oracleName,
  disputeFee,
  disputedAmount,
  lzOptions,
  { value: ethers.parseEther("0.001") } // LayerZero fee
);

// Flow:
// 1. 50 USDC burned on OP → minted to Native Athena on Arbitrum
// 2. Dispute data sent to Native Athena via LayerZero
// 3. Native Athena initiates oracle voting
// 4. After voting, sends result back
// 5. Athena Client auto-resolves in LOWJC`,
          relatedFunctions: ['handleFinalizeDisputeWithVotes', 'routeFeeToNative']
        },
        {
          name: 'handleFinalizeDisputeWithVotes',
          signature: 'handleFinalizeDisputeWithVotes(string disputeId, bool winningSide, uint256 votesFor, uint256 votesAgainst, address[] voters, address[] claimAddresses, uint256[] votingPowers, bool[] voteDirections)',
          whatItDoes: 'Receives dispute resolution from Native Athena and auto-executes in LOWJC.',
          whyUse: 'Native Athena calls this after oracle voting completes to finalize dispute on origin chain.',
          howItWorks: [
            '1. Only callable by bridge (Native Athena)',
            '2. Validates dispute exists and not finalized',
            '3. Records winning side and vote totals',
            '4. Stores all voter records locally',
            '5. Routes fees to Native Athena for distribution',
            '6. Sends fee payment data via LayerZero',
            '7. Automatically calls LOWJC.resolveDispute()',
            '8. Emits VoteRecorded for each voter',
            '9. Emits DisputeFeesFinalized event'
          ],
          parameters: [
            { name: 'disputeId', type: 'string', description: 'Job ID / dispute identifier' },
            { name: 'winningSide', type: 'bool', description: 'true if job giver wins, false if job taker wins' },
            { name: 'votesFor', type: 'uint256', description: 'Total voting power for job giver' },
            { name: 'votesAgainst', type: 'uint256', description: 'Total voting power for job taker' },
            { name: 'voters', type: 'address[]', description: 'Array of voter addresses' },
            { name: 'claimAddresses', type: 'address[]', description: 'Array of addresses to receive fees' },
            { name: 'votingPowers', type: 'uint256[]', description: 'Array of voting power per voter' },
            { name: 'voteDirections', type: 'bool[]', description: 'Array of vote directions (true=for, false=against)' }
          ],
          accessControl: 'Bridge only (Native Athena)',
          events: ['VoteRecorded(disputeId, voter, claimAddress, votingPower, voteFor)', 'DisputeFeesFinalized(disputeId, winningSide, totalFees)', 'FeeRoutedToNative(feeAmount, nativeRecipient)'],
          gasEstimate: '~150K gas',
          example: `// Called automatically by Native Athena via LayerZero
// NOT called directly by users

// Example: Job giver wins dispute
// Native Athena sends:
await nativeBridge.send(
  athenaClientAddress,
  "handleFinalizeDisputeWithVotes",
  [
    "10232-1", // disputeId
    true, // winningSide (job giver wins)
    75000, // votesFor
    25000, // votesAgainst
    [voter1, voter2, voter3], // voters
    [claim1, claim2, claim3], // claimAddresses
    [50000, 15000, 10000], // votingPowers
    [true, true, true] // voteDirections
  ]
);

// Result:
// - Dispute marked finalized
// - Votes recorded locally
// - Fees sent to Native Athena for distribution
// - LOWJC.resolveDispute() called automatically
// - Funds handled per dispute outcome`,
          relatedFunctions: ['raiseDispute', 'LOWJC.resolveDispute']
        }
      ]
    },
    {
      category: 'Oracle Services',
      description: 'Skill verification and oracle query submission',
      items: [
        {
          name: 'submitSkillVerification',
          signature: 'submitSkillVerification(string _applicationHash, uint256 _feeAmount, string _targetOracleName, bytes _nativeOptions) payable',
          whatItDoes: 'Submits skill verification request to target oracle with USDC fee.',
          whyUse: 'Users verify skills for credibility, oracles vote on legitimacy and earn fees.',
          howItWorks: [
            '1. Validates fee amount > 0',
            '2. Transfers USDC from caller',
            '3. Routes fee to Native Athena via CCTP',
            '4. Sends verification request to Native Athena via LayerZero',
            '5. Native Athena coordinates oracle voting',
            '6. Emits SkillVerificationSubmitted event'
          ],
          parameters: [
            { name: '_applicationHash', type: 'string', description: 'IPFS hash with skill proof, portfolio, credentials' },
            { name: '_feeAmount', type: 'uint256', description: 'USDC fee for verification (6 decimals)' },
            { name: '_targetOracleName', type: 'string', description: 'Skill oracle name to review' },
            { name: '_nativeOptions', type: 'bytes', description: 'LayerZero options' }
          ],
          accessControl: 'Public',
          events: ['SkillVerificationSubmitted(caller, targetOracleName, feeAmount)', 'FeeRoutedToNative(feeAmount, nativeRecipient)'],
          gasEstimate: '~100K gas + LayerZero fee',
          example: `const skillProof = "QmSkillProof..."; // Portfolio, certifications
const fee = ethers.parseUnits("20", 6); // 20 USDC
const oracle = "Solidity Development";

await usdc.approve(athenaClientAddress, fee);

await athenaClient.submitSkillVerification(
  skillProof,
  fee,
  oracle,
  lzOptions,
  { value: lzFee }
);

// Result:
// - Fee sent to Native Athena
// - Oracle members vote on skill legitimacy
// - Verified skills tracked in Genesis`,
          relatedFunctions: ['askAthena', 'routeFeeToNative']
        },
        {
          name: 'askAthena',
          signature: 'askAthena(string _description, string _hash, string _targetOracle, uint256 _feeAmount, bytes _nativeOptions) payable',
          whatItDoes: 'Asks oracle a question with USDC fee for expert opinion.',
          whyUse: 'Get expert advice on technical decisions, architecture, best practices.',
          howItWorks: [
            '1. Validates fee amount > 0',
            '2. Transfers USDC from caller',
            '3. Routes fee to Native Athena via CCTP',
            '4. Converts fee to string for cross-chain call',
            '5. Sends question to Native Athena via LayerZero',
            '6. Oracle provides answer, earns fee',
            '7. Emits AthenaAsked event'
          ],
          parameters: [
            { name: '_description', type: 'string', description: 'Question description' },
            { name: '_hash', type: 'string', description: 'IPFS hash with detailed question, context' },
            { name: '_targetOracle', type: 'string', description: 'Oracle name to answer question' },
            { name: '_feeAmount', type: 'uint256', description: 'USDC fee for oracle (6 decimals)' },
            { name: '_nativeOptions', type: 'bytes', description: 'LayerZero options' }
          ],
          accessControl: 'Public',
          events: ['AthenaAsked(caller, targetOracle, feeAmount)', 'FeeRoutedToNative(feeAmount, nativeRecipient)'],
          gasEstimate: '~95K gas + LayerZero fee',
          example: `const question = "Should I use microservices?";
const details = "QmQuestion..."; // Full context
const oracle = "System Architecture";
const fee = ethers.parseUnits("10", 6); // 10 USDC

await usdc.approve(athenaClientAddress, fee);

await athenaClient.askAthena(
  question,
  details,
  oracle,
  fee,
  lzOptions,
  { value: lzFee }
);`,
          relatedFunctions: ['submitSkillVerification']
        }
      ]
    },
    {
      category: 'CCTP Configuration',
      description: 'Configure CCTP fee routing infrastructure',
      items: [
        {
          name: 'setCCTPSender',
          signature: 'setCCTPSender(address _cctpSender) onlyOwner',
          whatItDoes: 'Sets CCTP Transceiver address for USDC fee routing.',
          parameters: [{ name: '_cctpSender', type: 'address', description: 'CCTP Transceiver contract address' }],
          accessControl: 'Owner only',
          events: ['CCTPSenderSet(cctpSender)'],
          gasEstimate: '~25K gas'
        },
        {
          name: 'setNativeAthenaRecipient',
          signature: 'setNativeAthenaRecipient(address _recipient) onlyOwner',
          whatItDoes: 'Sets Native Athena address as CCTP mint recipient.',
          parameters: [{ name: '_recipient', type: 'address', description: 'Native Athena proxy address on Arbitrum' }],
          accessControl: 'Owner only',
          events: ['NativeAthenaRecipientSet(recipient)'],
          gasEstimate: '~25K gas'
        },
        {
          name: 'setNativeChainDomain',
          signature: 'setNativeChainDomain(uint32 _domain) onlyOwner',
          whatItDoes: 'Sets CCTP domain for Native Chain (3 for Arbitrum Sepolia).',
          parameters: [{ name: '_domain', type: 'uint32', description: 'CCTP domain ID' }],
          accessControl: 'Owner only',
          events: ['NativeChainDomainSet(domain)'],
          gasEstimate: '~25K gas'
        },
        {
          name: 'routeFeeToNative',
          signature: 'routeFeeToNative(uint256 _feeAmount) internal',
          whatItDoes: 'Internal function routing USDC fees to Native Athena via CCTP.',
          whyUse: 'Centralize all fee management on Arbitrum for unified distribution.',
          howItWorks: [
            '1. Validates CCTP sender and recipient configured',
            '2. Approves CCTP Transceiver for USDC amount',
            '3. Converts recipient address to bytes32',
            '4. Calls CCTP Transceiver.sendFast()',
            '5. Burns USDC on OP',
            '6. Circle attestation generated',
            '7. Mints to Native Athena on Arbitrum',
            '8. Emits FeeRoutedToNative event'
          ],
          parameters: [{ name: '_feeAmount', type: 'uint256', description: 'USDC amount to route (6 decimals)' }],
          accessControl: 'Internal only',
          events: ['FeeRoutedToNative(feeAmount, nativeRecipient)'],
          gasEstimate: 'Part of parent function gas'
        }
      ]
    },
    {
      category: 'Admin Functions',
      description: 'Contract configuration and maintenance',
      items: [
        {
          name: 'setBridge',
          signature: 'setBridge(address _bridge) onlyOwner',
          whatItDoes: 'Updates Local Bridge address for LayerZero messaging.',
          parameters: [{ name: '_bridge', type: 'address', description: 'Local Bridge address' }],
          accessControl: 'Owner only',
          events: ['BridgeSet(bridge)'],
          gasEstimate: '~25K gas'
        },
        {
          name: 'setJobContract',
          signature: 'setJobContract(address _jobContract) onlyOwner',
          whatItDoes: 'Sets LOWJC address for dispute execution.',
          parameters: [{ name: '_jobContract', type: 'address', description: 'LOWJC proxy address' }],
          accessControl: 'Owner only',
          events: ['JobContractSet(jobContract)'],
          gasEstimate: '~25K gas'
        },
        {
          name: 'setMinDisputeFee',
          signature: 'setMinDisputeFee(uint256 _minFee) onlyOwner',
          whatItDoes: 'Sets minimum USDC fee required for disputes.',
          parameters: [{ name: '_minFee', type: 'uint256', description: 'Minimum fee in USDC (6 decimals)' }],
          accessControl: 'Owner only',
          events: ['MinDisputeFeeSet(newMinFee)'],
          gasEstimate: '~25K gas'
        },
        {
          name: 'upgradeFromDAO',
          signature: 'upgradeFromDAO(address newImplementation)',
          whatItDoes: 'Upgrades contract implementation via bridge (DAO governance).',
          parameters: [{ name: 'newImplementation', type: 'address', description: 'New implementation contract' }],
          accessControl: 'Bridge only',
          gasEstimate: '~45K gas'
        },
        {
          name: 'withdraw',
          signature: 'withdraw() onlyOwner',
          whatItDoes: 'Withdraws native ETH balance (LayerZero fees).',
          accessControl: 'Owner only',
          gasEstimate: '~30K gas'
        },
        {
          name: 'emergencyWithdrawUSDT',
          signature: 'emergencyWithdrawUSDT() onlyOwner',
          whatItDoes: 'Emergency withdrawal of USDC (should be zero normally).',
          whyUse: 'Recovery mechanism if fees get stuck.',
          accessControl: 'Owner only',
          gasEstimate: '~35K gas'
        }
      ]
    },
    {
      category: 'View Functions',
      description: 'Read contract state',
      items: [
        {
          name: 'getClaimableAmount',
          signature: 'getClaimableAmount(string disputeId, address claimAddress) view returns (uint256)',
          whatItDoes: 'Returns claimable fees for address in dispute.',
          parameters: [
            { name: 'disputeId', type: 'string', description: 'Dispute ID' },
            { name: 'claimAddress', type: 'address', description: 'Address to check' }
          ],
          returns: 'Claimable USDC amount or 0 if claimed',
          accessControl: 'Public view',
          gasEstimate: 'Free (view)'
        },
        {
          name: 'getDisputeInfo',
          signature: 'getDisputeInfo(string disputeId) view returns (uint256 totalFees, uint256 totalVotingPowerFor, uint256 totalVotingPowerAgainst, bool winningSide, bool isFinalized, uint256 voteCount)',
          whatItDoes: 'Returns complete dispute information.',
          parameters: [{ name: 'disputeId', type: 'string', description: 'Dispute ID' }],
          returns: 'Dispute details including fees, votes, outcome',
          accessControl: 'Public view',
          gasEstimate: 'Free (view)'
        },
        {
          name: 'isCallerInvolvedInJob',
          signature: 'isCallerInvolvedInJob(string _jobId, address _caller) view returns (bool)',
          whatItDoes: 'Validates if address is involved in job (giver, taker, or applicant).',
          parameters: [
            { name: '_jobId', type: 'string', description: 'Job ID' },
            { name: '_caller', type: 'address', description: 'Address to check' }
          ],
          returns: 'true if involved, false otherwise',
          accessControl: 'Public view',
          gasEstimate: 'Free (view)'
        },
        {
          name: 'quoteSingleChain',
          signature: 'quoteSingleChain(string _functionName, bytes _payload, bytes _options) view returns (uint256 fee)',
          whatItDoes: 'Quotes LayerZero fee for cross-chain message.',
          parameters: [
            { name: '_functionName', type: 'string', description: 'Function name (not used in quote)' },
            { name: '_payload', type: 'bytes', description: 'Encoded message payload' },
            { name: '_options', type: 'bytes', description: 'LayerZero options' }
          ],
          returns: 'Required ETH fee for LayerZero message',
          accessControl: 'Public view',
          gasEstimate: 'Free (view)'
        },
        {
          name: 'getContractBalance',
          signature: 'getContractBalance() view returns (uint256)',
          whatItDoes: 'Returns USDC balance of contract (should be ~0).',
          returns: 'USDC balance (6 decimals)',
          accessControl: 'Public view',
          gasEstimate: 'Free (view)'
        }
      ]
    },
    {
      category: 'Utility Functions',
      description: 'Helper functions',
      items: [
        {
          name: 'uint2str',
          signature: 'uint2str(uint256 _i) pure returns (string)',
          whatItDoes: 'Converts uint to string for cross-chain calls.',
          parameters: [{ name: '_i', type: 'uint256', description: 'Number to convert' }],
          returns: 'String representation of number',
          accessControl: 'Internal pure',
          gasEstimate: 'Negligible'
        }
      ]
    }
  ],
  
  integrationGuide: {
    example: `// Athena Client (OP) Integration Example
const { ethers } = require('ethers');

// 1. Setup contracts
const athenaClient = new ethers.Contract(athenaClientAddress, athenaClientABI, signer);
const usdc = new ethers.Contract(usdcAddress, usdcABI, signer);
const localBridge = new ethers.Contract(localBridgeAddress, localBridgeABI, provider);

// 2. Helper: Get LayerZero fee quote
async function quoteLzFee(payload) {
  const lzOptions = ethers.solidityPacked(["uint16", "uint256"], [1, 200000]);
  return await athenaClient.quoteSingleChain("", payload, lzOptions);
}

// 3. Raise Dispute
const jobId = "10232-1";
const disputeHash = "QmDisputeEvidence...";
const oracleName = "Frontend Development";
const disputeFee = ethers.parseUnits("50", 6); // 50 USDC
const disputedAmount = ethers.parseUnits("500", 6);

const disputePayload = ethers.AbiCoder.defaultAbiCoder().encode(
  ["string", "string", "string", "string", "uint256", "uint256", "address"],
  ["raiseDispute", jobId, disputeHash, oracleName, disputeFee, disputedAmount, signer.address]
);
const disputeLzFee = await quoteLzFee(disputePayload);

// Approve USDC
await usdc.approve(athenaClientAddress, disputeFee);

// Raise dispute
await athenaClient.raiseDispute(
  jobId,
  disputeHash,
  oracleName,
  disputeFee,
  disputedAmount,
  ethers.solidityPacked(["uint16", "uint256"], [1, 200000]),
  { value: disputeLzFee }
);

// 4. Submit Skill Verification
const skillProof = "QmSkillProof...";
const verificationFee = ethers.parseUnits("20", 6);
const skillOracle = "Solidity Development";

await usdc.approve(athenaClientAddress, verificationFee);

await athenaClient.submitSkillVerification(
  skillProof,
  verificationFee,
  skillOracle,
  ethers.solidityPacked(["uint16", "uint256"], [1, 200000]),
  { value: disputeLzFee }
);

// 5. Ask Athena
const question = "Should I use microservices?";
const questionHash = "QmQuestion...";
const architectureOracle = "System Architecture";
const queryFee = ethers.parseUnits("10", 6);

await usdc.approve(athenaClientAddress, queryFee);

await athenaClient.askAthena(
  question,
  questionHash,
  architectureOracle,
  queryFee,
  ethers.solidityPacked(["uint16", "uint256"], [1, 200000]),
  { value: disputeLzFee }
);

// 6. View Dispute Info
const disputeInfo = await athenaClient.getDisputeInfo(jobId);
console.log("Total Fees:", ethers.formatUnits(disputeInfo.totalFees, 6));
console.log("Votes For:", disputeInfo.totalVotingPowerFor.toString());
console.log("Votes Against:", disputeInfo.totalVotingPowerAgainst.toString());
console.log("Winning Side:", disputeInfo.winningSide ? "Job Giver" : "Job Taker");
console.log("Is Finalized:", disputeInfo.isFinalized);`,
    tips: [
      'Athena Client is dispute/oracle entry point on Local chains',
      'ALL fees immediately routed to Native Athena via CCTP',
      'Dispute data sent via LayerZero for processing',
      'Native Athena coordinates all oracle voting',
      'Finalization auto-resolves dispute in LOWJC',
      'Same contract on OP, Ethereum, Polygon, Base',
      'Always approve USDC before calling fee functions',
      'Quote LayerZero fees before transactions',
      'Minimum dispute fee: 50 USDC (configurable)',
      'Disputes can be raised for jobs from any chain',
      'Skill verification builds reputation system',
      'Oracle queries provide expert advice',
      'Fee distribution handled on Native Chain',
      'USDC balance should always be ~0 (fees routed immediately)',
      'Monitor DisputeRaised and DisputeFeesFinalized events'
    ]
  },
  
  deployConfig: {
    type: 'uups',
    constructor: [
      {
        name: '_owner',
        type: 'address',
        description: 'Contract owner address (admin who can upgrade and configure)',
        placeholder: '0x...'
      },
      {
        name: '_bridge',
        type: 'address',
        description: 'Local Bridge contract address (for LayerZero messaging)',
        placeholder: '0x...'
      },
      {
        name: '_usdtToken',
        type: 'address',
        description: 'USDC token address on OP Sepolia (Circle USDC)',
        placeholder: '0x5fd84259d66Cd46123540766Be93DFE6D43130D7'
      },
      {
        name: '_chainId',
        type: 'uint32',
        description: 'Chain ID for tracking (OP Sepolia: 10232)',
        placeholder: '10232'
      },
      {
        name: '_cctpSender',
        type: 'address',
        description: 'CCTP Transceiver address on OP (for USDC fee routing)',
        placeholder: '0x...'
      },
      {
        name: '_nativeAthenaRecipient',
        type: 'address',
        description: 'Native Athena proxy address on Arbitrum (receives fee mints)',
        placeholder: '0x...'
      },
      {
        name: '_nativeChainDomain',
        type: 'uint32',
        description: 'CCTP domain for Native Chain (Arbitrum: 3)',
        placeholder: '3'
      }
    ],
    networks: {
      testnet: {
        name: 'OP Sepolia',
        chainId: 11155420,
        rpcUrl: 'https://sepolia.optimism.io',
        explorer: 'https://sepolia-optimism.etherscan.io',
        currency: 'ETH'
      },
      mainnet: {
        name: 'OP Mainnet',
        chainId: 10,
        rpcUrl: 'https://mainnet.optimism.io',
        explorer: 'https://optimistic.etherscan.io',
        currency: 'ETH'
      }
    },
    estimatedGas: '3.5M',
    postDeploy: {
      message: 'UUPS deployment complete! Next: Initialize and configure Athena Client.',
      nextSteps: [
        '1. Deploy AthenaClient implementation contract (no constructor params)',
        '2. Deploy UUPSProxy with implementation address',
        '3. Call initialize() on proxy via block scanner with:',
        '   - Owner address (your admin wallet)',
        '   - Local Bridge address on OP',
        '   - USDC token address (Circle USDC on OP)',
        '   - Chain ID: 10232',
        '   - CCTP Transceiver address on OP',
        '   - Native Athena proxy address on Arbitrum',
        '   - Native Chain Domain: 3 (Arbitrum)',
        '4. Set LOWJC address: setJobContract(lowjcOPAddress)',
        '5. Set minimum dispute fee: setMinDisputeFee(50 USDC) [default]',
        '6. Configure LOWJC with Athena Client:',
        '   - LOWJC.setAthenaClientContract(athenaClientAddress)',
        '7. Test dispute raising flow',
        '8. Test skill verification submission',
        '9. Test dispute finalization from Native',
        '10. Verify both implementation and proxy on OP Sepolia Etherscan',
        '11. IMPORTANT: Same contract deploys on all Local Chains with different params'
      ]
    }
  },
  
  securityConsiderations: [
    'UUPS upgradeable: Owner or bridge can upgrade implementation',
    'Dual authorization: Owner or bridge for upgrades',
    'ReentrancyGuard: Protects all fee operations',
    'USDC approval required: Users must approve before fee operations',
    'Immediate fee routing: No local fee holding reduces risk',
    'LayerZero dependency: Cross-chain messages rely on LayerZero security',
    'CCTP dependency: Fee routing relies on Circle attestation service',
    'Bridge-only finalization: Only bridge can call handleFinalizeDisputeWithVotes',
    'Auto-resolution: Automatically calls LOWJC.resolveDispute() after finalization',
    'Minimum fee enforcement: Configurable minimum prevents spam',
    'Cross-chain disputes: Can dispute jobs from any chain',
    'Job participation validation: isCallerInvolvedInJob checks authorization',
    'Emergency withdrawal: Owner can recover stuck USDC',
    'ETH withdrawal: Owner can recover LayerZero fees',
    'No local fee distribution: All distribution handled on Native Chain',
    'Vote recording: Local tracking for transparency',
    'Event logging: Complete audit trail of disputes and oracle activity'
  ],
  
  code: `// Same implementation as athenaClientETH - see: contracts/openwork-full-contract-suite-layerzero+CCTP 2 Dec/athena-client.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

contract LocalAthena is Initializable, ReentrancyGuardUpgradeable, OwnableUpgradeable, UUPSUpgradeable {
    using SafeERC20 for IERC20;
    
    IERC20 public usdtToken;
    ILocalOpenWorkJobContract public jobContract;
    ILayerZeroBridge public bridge;
    uint32 public chainId;
    address public cctpSender;
    address public nativeAthenaRecipient;
    uint32 public nativeChainDomain;
    
    mapping(string => DisputeFees) public disputeFees;
    uint256 public minDisputeFee;

    function raiseDispute(
        string memory _jobId,
        string memory _disputeHash,
        string memory _oracleName,
        uint256 _feeAmount,
        uint256 _disputedAmount,
        bytes calldata _nativeOptions
    ) external payable nonReentrant {
        // Transfer fee from user
        usdtToken.transferFrom(msg.sender, address(this), _feeAmount);
        
        // Route fee to Native Athena via CCTP
        routeFeeToNative(_feeAmount);
        
        // Send dispute data to Native Athena via LayerZero
        bytes memory payload = abi.encode("raiseDispute", _jobId, _disputeHash, _oracleName, _feeAmount, _disputedAmount, msg.sender);
        bridge.sendToNativeChain{value: msg.value}("raiseDispute", payload, _nativeOptions);
        
        emit DisputeRaised(msg.sender, _jobId, _feeAmount);
    }

    function handleFinalizeDisputeWithVotes(
        string memory disputeId, 
        bool winningSide, 
        uint256 votesFor, 
        uint256 votesAgainst,
        address[] memory voters,
        address[] memory claimAddresses,
        uint256[] memory votingPowers,
        bool[] memory voteDirections
    ) external {
        require(msg.sender == address(bridge), "Only bridge");
        
        DisputeFees storage dispute = disputeFees[disputeId];
        dispute.winningSide = winningSide;
        dispute.isFinalized = true;
        
        // Auto-resolve in LOWJC
        if (address(jobContract) != address(0)) {
            jobContract.resolveDispute(disputeId, winningSide);
        }
        
        emit DisputeFeesFinalized(disputeId, winningSide, dispute.totalFees);
    }
    
    // ... Additional functions - see full implementation
}`
};
