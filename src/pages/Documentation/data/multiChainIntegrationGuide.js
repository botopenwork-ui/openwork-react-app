// Multi-Chain Integration Guide for OpenWork Developers

export const multiChainIntegrationGuide = {
  'add-new-chain': {
    id: 'add-new-chain',
    title: 'Adding a New Chain to OpenWork',
    category: 'Multi-Chain Development',
    description: 'Complete guide to integrating a new blockchain into OpenWork\'s multi-chain architecture. Enable users to post jobs, apply, and interact from any blockchain.',
    icon: '🌐',
    complexity: 'High',
    estimatedTime: '~2 hours',
    prerequisites: [
      'Smart contracts deployed on target chain (LOWJC, Athena Client, Local Bridge)',
      'Chain added to LayerZero network configuration',
      'USDC availability on target chain',
      'Chain logo image (24x24px, PNG format)',
      'Access to OpenWork React app codebase'
    ],
    steps: [
      {
        step: 1,
        category: 'Contract Deployment',
        title: 'Deploy Core Contracts on New Chain',
        description: 'Deploy LOWJC (Local OpenWork Job Contract), Athena Client, and Local Bridge contracts on your target blockchain.',
        details: [
          'Use latest contract versions from contracts repository',
          'Deploy LOWJC proxy + implementation',
          'Deploy Athena Client proxy + implementation',
          'Deploy Local Bridge',
          'Configure all contracts to point to each other',
          'Set peer connection to Arbitrum Native Bridge'
        ],
        codeSnippet: `// Example: Deploying on Polygon
forge create --rpc-url $POLYGON_RPC \\
  --private-key $DEPLOYER_KEY \\
  src/lowjc.sol:CrossChainLocalOpenWorkJobContract

// Record deployed addresses:
// LOWJC Proxy: 0x...
// Athena Client Proxy: 0x...
// Local Bridge: 0x...

// Configure contracts
cast send $LOWJC_PROXY "setBridge(address)" $LOCAL_BRIDGE \\
  --rpc-url $POLYGON_RPC --private-key $KEY

cast send $LOWJC_PROXY "setAthenaClientContract(address)" $ATHENA_CLIENT \\
  --rpc-url $POLYGON_RPC --private-key $KEY`,
        notes: [
          '⚠️ Keep deployer key secure',
          '📋 Document all deployed addresses',
          '✅ Verify contracts on block explorer',
          '🔗 Configure peer connections to Arbitrum'
        ],
        icon: '📜'
      },
      {
        step: 2,
        category: 'LayerZero Configuration',
        title: 'Configure LayerZero Endpoints',
        description: 'Set up LayerZero cross-chain messaging between new chain and Arbitrum.',
        details: [
          'Get LayerZero Endpoint ID (EID) for your chain',
          'Configure peer on new chain\'s Local Bridge',
          'Configure peer on Arbitrum\'s Native Bridge',
          'Test message sending with quote functions'
        ],
        codeSnippet: `// Get your chain's LayerZero EID from LayerZero docs
// Polygon Mainnet EID: 30109
// Polygon Testnet EID: 40109

// Set peer on Local Bridge (Polygon → Arbitrum)
cast send $LOCAL_BRIDGE_POLYGON \\
  "setPeer(uint32,bytes32)" \\
  40231 \\ // Arbitrum Sepolia EID
  0x0000000000000000000000003b2AC1d1281cA4a1188d9F09A5Af9a9E6a114D6c \\
  --rpc-url $POLYGON_RPC --private-key $KEY

// Set peer on Native Bridge (Arbitrum → Polygon)  
cast send $NATIVE_BRIDGE_ARBITRUM \\
  "setPeer(uint32,bytes32)" \\
  40109 \\ // Polygon Testnet EID
  0x000000000000000000000000$LOCAL_BRIDGE_POLYGON \\
  --rpc-url $ARBITRUM_RPC --private-key $KEY`,
        notes: [
          '🔍 Find EIDs at docs.layerzero.network',
          '🔗 Peer must be set on BOTH sides',
          '✅ Test with quoteSingleChain() before live use',
          '⚡ LayerZero fees vary by chain - test first'
        ],
        icon: '⚡'
      },
      {
        step: 3,
        category: 'Frontend Configuration',
        title: 'Add Chain to chainConfig.js',
        description: 'Update the React app\'s chain configuration with your new chain\'s contract addresses and network details.',
        details: [
          'Open src/config/chainConfig.js',
          'Add new chain entry to CHAIN_CONFIG object',
          'Include all contract addresses from Step 1',
          'Set LayerZero EID and options',
          'Add to EID_TO_CHAIN_ID mapping'
        ],
        codeSnippet: `// src/config/chainConfig.js

export const CHAIN_CONFIG = {
  // ... existing chains ...
  
  // Polygon Mainnet - NEW
  137: {
    name: "Polygon",
    type: CHAIN_TYPES.LOCAL,
    allowed: true,
    isTestnet: false,
    nativeCurrency: {
      name: "MATIC",
      symbol: "MATIC",
      decimals: 18
    },
    rpcUrl: import.meta.env.VITE_POLYGON_RPC_URL,
    blockExplorer: "https://polygonscan.com",
    contracts: {
      lowjc: "0x...",           // From Step 1
      athenaClient: "0x...",    // From Step 1
      localBridge: "0x...",     // From Step 1
      usdc: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174" // Polygon USDC
    },
    layerzero: {
      eid: 30109,              // Polygon Mainnet EID
      options: "0x0003010011010000000000000000000000000007a120"
    }
  }
};

// Add EID mapping for job ID extraction
const EID_TO_CHAIN_ID = {
  // ... existing mappings ...
  30109: 137  // Polygon Mainnet
};`,
        notes: [
          '📝 Get USDC address from Circle docs',
          '🔧 LayerZero options: 0x0003010011010000...07a120 = 500K gas',
          '✅ Verify EID is correct for mainnet vs testnet',
          '🎨 RPC URL should be added to .env file'
        ],
        icon: '⚙️'
      },
      {
        step: 4,
        category: 'Environment Variables',
        title: 'Add RPC URL to .env',
        description: 'Add your chain\'s RPC endpoint to the environment configuration.',
        details: [
          'Add RPC URL with VITE_ prefix for frontend access',
          'Can use Alchemy, Infura, or public RPC',
          'Test RPC connectivity before going live'
        ],
        codeSnippet: `// .env
VITE_POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY

// Or use public RPC
VITE_POLYGON_RPC_URL=https://polygon-rpc.com`,
        notes: [
          '⚠️ VITE_ prefix required for frontend access',
          '🔑 Keep API keys in backend .env (no VITE_ prefix)',
          '🌐 Use reliable RPC providers (Alchemy/Infura recommended)',
          '📊 Monitor RPC rate limits'
        ],
        icon: '🔐'
      },
      {
        step: 5,
        category: 'Visual Assets',
        title: 'Add Chain Logo',
        description: 'Add chain logo image to public folder for visual identification in UI.',
        details: [
          'Logo should be 24x24px for table display',
          'Use PNG format with transparent background',
          'Follow naming convention: chainname-chain.png',
          'Place in /public folder'
        ],
        codeSnippet: `// Logo naming convention:
// polygon-chain.png
// avalanche-chain.png
// fantom-chain.png

// Add logo to public folder:
cp polygon-chain.png /public/

// Logo will be automatically picked up by getChainLogo()`,
        notes: [
          '🎨 Maintain consistent 24x24px size',
          '🖼️ Transparent background preferred',
          '📁 Must be in /public folder (not /src)',
          '✨ Test logo displays correctly in browse jobs table'
        ],
        icon: '🎨'
      },
      {
        step: 6,
        category: 'Testing',
        title: 'Test Multi-Chain Functionality',
        description: 'Thoroughly test job posting, application, and cross-chain sync on the new chain.',
        details: [
          'Connect wallet to new chain',
          'Post a test job',
          'Wait 30-60s for LayerZero sync to Arbitrum',
          'Verify job appears in browse jobs with correct chain logo',
          'Test applying to jobs',
          'Test dispute raising (if applicable)'
        ],
        codeSnippet: `// Testing checklist:

// 1. Connect to Polygon
// 2. Navigate to /post-job
// 3. Warning should say: "Ready to post on Polygon..."
// 4. Post job
// 5. Check console: "✅ Posting job on Polygon (Chain ID: 137)"
// 6. Wait for sync
// 7. Check /browse-jobs
// 8. New job should show Polygon logo in Chain column
// 9. Click job → verify all details correct
// 10. Try applying from Polygon
// 11. Try applying from different chain to same job`,
        notes: [
          '⏱️ LayerZero sync takes 30-60 seconds',
          '🔍 Check browser console for errors',
          '✅ Test both posting AND applying',
          '🌐 Test cross-chain applies (Polygon → Ethereum job)',
          '💰 Verify USDC transfers via CCTP work correctly'
        ],
        icon: '🧪'
      },
      {
        step: 7,
        category: 'Documentation',
        title: 'Update Contract Address Registry',
        description: 'Document all deployed contract addresses in the contract registry file.',
        details: [
          'Add new chain section to openwork-contracts-current-addresses.md',
          'List all deployed contract addresses',
          'Include deployment date and deployer',
          'Mark contracts as verified on block explorer'
        ],
        codeSnippet: `// contracts/openwork-contracts-current-addresses.md

## Polygon Mainnet (Local Chain)

**Latest Deployment**: December 16, 2025  
**Deployer**: WALL2 (\`0xfD08836eeE6242092a9c869237a8d122275b024A\`)

### **Active Contracts**

| Contract | Address | Verified |
|----------|---------|----------|
| **LOWJC** (Proxy) | \`0x...\` | ✅ |
| **Athena Client** (Proxy) | \`0x...\` | ✅ |
| **Local Bridge** | \`0x...\` | ✅ |
| **USDC Token** | \`0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174\` | ✅ |`,
        notes: [
          '📋 Keep addresses updated',
          '✅ Mark verification status',
          '🕐 Include deployment dates',
          '👤 Note deployer address'
        ],
        icon: '📚'
      },
      {
        step: 8,
        category: 'Going Live',
        title: '🚀 Launch & Monitor',
        description: 'Deploy to production and monitor for issues. Your new chain is now fully integrated!',
        details: [
          'Merge feature branch to main',
          'Deploy frontend updates',
          'Monitor first transactions closely',
          'Be ready to provide support for early users',
          'Watch for LayerZero message delivery',
          'Monitor CCTP attestations and completions'
        ],
        codeSnippet: `// Deployment checklist:

✅ All tests passing
✅ Chain logo displays correctly  
✅ Jobs posting successfully
✅ LayerZero sync confirmed
✅ CCTP transfers working
✅ Documentation updated
✅ Team notified

// Deploy
git checkout main
git merge feature/add-polygon-chain
git push

// Monitor
// - Check first few transactions in block explorer
// - Monitor LayerZero message delivery
// - Watch for any user reports
// - Keep RPC endpoints healthy`,
        notes: [
          '🎉 Announce new chain to community',
          '👀 Monitor first 24 hours closely',
          '📊 Track transaction volumes',
          '🐛 Be ready for quick fixes if needed',
          '💬 Collect user feedback'
        ],
        icon: '🚀'
      }
    ],
    keyTakeaways: [
      '✨ Adding a new chain requires just 6 lines of config code',
      '🔗 Contracts must be deployed and configured first',
      '⚡ LayerZero peer connections are bidirectional',
      '🎨 Chain logo must be in /public folder',
      '✅ Always test on testnet before mainnet',
      '📖 Keep documentation updated',
      '🌐 Users can immediately post jobs on new chain once live'
    ],
    multiChainLifecycleRules: {
      title: 'Multi-Chain Lifecycle & Chain Restrictions',
      description: 'Understanding which actions can be performed from any chain vs. specific chains',
      rules: [
        {
          category: 'Actions from ANY Chain',
          icon: '🌐',
          description: 'These actions can be performed from any supported local chain',
          actions: [
            { name: 'Post Job', description: 'Users can post jobs from OP Sepolia, Ethereum Sepolia, or any future local chain' },
            { name: 'Apply to Job', description: 'Freelancers can apply to ANY job from ANY chain (cross-chain applications fully supported)' },
            { name: 'Create Profile', description: 'Users can create their profile from any local chain' },
            { name: 'Add Portfolio', description: 'Portfolio items can be added from any local chain' },
            { name: 'Raise Dispute', description: 'Disputes can be raised from any local chain (fees route to Arbitrum)' }
          ]
        },
        {
          category: 'Actions from POSTING Chain',
          icon: '🔒',
          description: 'Job giver MUST be on the chain where the job was originally posted',
          actions: [
            { name: 'Start Job', description: 'Must connect to posting chain. Job ID reveals posting chain (e.g., 40232-1 = OP Sepolia)' },
            { name: 'Release Payment', description: 'Must be on posting chain to release milestone payments' },
            { name: 'Lock Next Milestone', description: 'Must be on posting chain to escrow next milestone funds' },
            { name: 'Cancel Job', description: 'Must be on posting chain to cancel and refund' }
          ],
          warning: 'Job givers should bookmark/remember which chain they posted from. UI should show posting chain clearly and prompt to switch if needed.'
        },
        {
          category: 'Actions from APPLICATION Chain',
          icon: '🎯',
          description: 'Job taker MUST be on the chain they applied from',
          actions: [
            { name: 'Submit Work', description: 'Must connect to application chain to submit milestone deliverables' }
          ],
          warning: 'Freelancers should remember which chain they applied from. Application data stores this info.'
        }
      ],
      implementationGuidance: [
        '📌 Extract posting chain from job ID: job.id.split("-")[0] gives EID, map to chain ID',
        '📌 Store application chain when user applies (track in local state or derive from application ID)',
        '📌 Before startJob/releasePayment: check user is on posting chain, prompt to switch if not',
        '📌 Before submitWork: check user is on application chain',
        '📌 Use Warning component to show: "This action requires {chainName}. Please switch networks."',
        '📌 Use switchToChain() utility to help users switch automatically'
      ],
      exampleCode: `// Example: Validate chain before startJob
const jobChainId = extractChainIdFromJobId(jobId); // Get posting chain
const { chainId: userChainId } = useChainDetection();

if (userChainId !== jobChainId) {
  const jobChainName = getChainConfig(jobChainId)?.name;
  alert(\`Please switch to \${jobChainName} to start this job.\`);
  await switchToChain(jobChainId);
  return;
}

// Proceed with startJob...
await startJob(jobChainId, userAddress, startData);`
    },
    commonIssues: [
      {
        issue: 'Jobs not syncing to Arbitrum',
        solution: 'Check LayerZero peer connections are set on BOTH chains. Verify LayerZero fee is sufficient.',
        debug: 'Check browser console for "LayerZero message sent" event'
      },
      {
        issue: 'Chain logo shows broken image',
        solution: 'Verify logo file is in /public folder. Check EID_TO_CHAIN_ID mapping is correct. Logo must match naming convention.',
        debug: 'Console will show: "chainId: X, logo: /chain-name.png"'
      },
      {
        issue: 'Transaction reverts with "Chain not allowed"',
        solution: 'Ensure chain config has allowed: true. Check user is connected to correct network.',
        debug: 'Warning component will show reason for block'
      },
      {
        issue: 'USDC transfers failing',
        solution: 'Verify USDC address is correct for chain. Check CCTP is configured with proper TokenMessenger address (0x8FE6B999...).',
        debug: 'Test CCTP directly before blaming contract code'
      }
    ],
    exampleChains: {
      testnet: {
        name: 'Polygon Mumbai (Example)',
        chainId: 80001,
        eid: 40109,
        usdc: '0x...',
        rpcUrl: 'https://rpc-mumbai.maticvigil.com'
      },
      mainnet: {
        name: 'Polygon Mainnet (Example)',
        chainId: 137,
        eid: 30109,
        usdc: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
        rpcUrl: 'https://polygon-rpc.com'
      }
    },
    supportedChains: [
      { name: 'OP Sepolia', chainId: 11155420, eid: 40232, status: '✅ Live' },
      { name: 'Ethereum Sepolia', chainId: 11155111, eid: 40161, status: '✅ Live' },
      { name: 'Arbitrum Sepolia', chainId: 421614, eid: 40231, status: '🔒 Read-Only (Native Chain)' },
      { name: 'Base Sepolia', chainId: 84532, eid: 40245, status: '🔒 Governance Only (Main Chain)' },
      { name: 'Polygon', chainId: 137, eid: 30109, status: '⏳ Ready to Add' },
      { name: 'Avalanche', chainId: 43114, eid: 30106, status: '⏳ Ready to Add' },
      { name: 'Any EVM Chain', chainId: 'Any', eid: 'See LayerZero docs', status: '💡 Supported' }
    ]
  }
};

export default multiChainIntegrationGuide;
