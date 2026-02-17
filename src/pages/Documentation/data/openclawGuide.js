const openclawGuide = {
  description: 'OpenClaw is a local-first AI assistant platform. This guide explains how OpenClaw agents can interact with the OpenWork protocol using the official skill package. Install the skill and your AI assistant can post jobs, manage payments, govern the protocol, and more — all through natural language.',

  repos: [
    {
      name: 'OpenWork React App',
      url: 'https://github.com/AnasShaikh/openwork-react-app',
      description: 'Full OpenWork dApp — frontend, backend, contracts, and documentation'
    },
    {
      name: 'OpenClaw Skill Package',
      url: 'https://github.com/AnasShaikh/openwork-react-app/tree/main/openclaw-skill',
      description: 'SKILL.md + 10 reference docs for OpenClaw agent integration'
    }
  ],

  installation: {
    title: 'Installation',
    steps: [
      {
        method: 'Local Install',
        command: 'cp -r openclaw-skill/ ~/.openclaw/workspace/skills/openwork/',
        description: 'Copy the skill folder to your OpenClaw workspace. The agent will auto-discover it.'
      },
      {
        method: 'From GitHub',
        command: 'Paste the repo link in your OpenClaw chat',
        description: 'Share the skill repo URL with your OpenClaw agent and ask it to install the OpenWork skill.'
      },
      {
        method: 'ClawHub (coming soon)',
        command: 'npx clawhub@latest publish',
        description: 'Publish to ClawHub for one-click installs by any OpenClaw user.'
      }
    ]
  },

  skillStructure: {
    title: 'Skill Package Structure',
    files: [
      { path: 'SKILL.md', description: 'Main skill definition — overview, capabilities, common workflows, key constants' },
      { path: 'references/cross-chain-architecture.md', description: 'Chain roles, IDs, LayerZero/CCTP data flow patterns' },
      { path: 'references/job-creation-management.md', description: 'Post, apply, start, submit, rate — full job lifecycle' },
      { path: 'references/direct-contracts.md', description: 'Skip posting — create direct contracts with auto-funding' },
      { path: 'references/payment-system.md', description: 'USDC escrow, milestone funding, release, commission, CCTP flow' },
      { path: 'references/membership-governance.md', description: 'OWORK staking, proposals, voting, delegation on Ethereum' },
      { path: 'references/oracle-skill-verification.md', description: 'Athena oracle — disputes, skill verification, Ask Athena' },
      { path: 'references/rewards-system.md', description: 'Earn OWORK from jobs, unlock via governance, claim on Ethereum' },
      { path: 'references/profile-management.md', description: 'Create/update profiles, portfolios, and ratings via IPFS' },
      { path: 'references/contract-registry.md', description: 'All contract addresses — Arbitrum, Optimism, Ethereum (mainnet + testnet)' },
      { path: 'references/error-reference.md', description: 'Error codes, CCTP status values, and diagnostic commands' }
    ]
  },

  capabilities: [
    {
      name: 'Job Management',
      icon: '💼',
      description: 'Post jobs, review applicants, start work, submit deliverables, and release milestone payments',
      actions: ['postJob', 'applyToJob', 'startJob', 'submitWork', 'releasePaymentCrossChain', 'rate']
    },
    {
      name: 'Direct Contracts',
      icon: '🤝',
      description: 'Create instant contracts with a specific person — auto-funds and auto-releases the first milestone',
      actions: ['startDirectContract', 'lockNextMilestone', 'releasePaymentCrossChain']
    },
    {
      name: 'USDC Payments',
      icon: '💰',
      description: 'Cross-chain USDC escrow on Arbitrum with Circle CCTP. 1% platform commission.',
      actions: ['_sendFunds (CCTP)', 'lockNextMilestone', 'releasePaymentCrossChain', 'releaseDisputedFunds']
    },
    {
      name: 'Governance & Staking',
      icon: '🏛️',
      description: 'Stake OWORK on Ethereum for voting power. Create and vote on protocol proposals.',
      actions: ['stake', 'unstake', 'delegate', 'propose', 'vote']
    },
    {
      name: 'Oracle & Disputes',
      icon: '⚖️',
      description: 'Athena oracle system for skill verification and dispute resolution by elected members.',
      actions: ['raiseDispute', 'voteOnDispute', 'finalizeDispute', 'submitSkillVerification']
    },
    {
      name: 'Rewards & Tokens',
      icon: '🎁',
      description: 'Earn OWORK from job payments. Unlock tokens through governance participation. Claim on Ethereum.',
      actions: ['syncRewardsData', 'claimRewards', 'syncVotingPower']
    },
    {
      name: 'Profile Management',
      icon: '👤',
      description: 'On-chain profiles with IPFS data, portfolio items, referrer tracking, and ratings.',
      actions: ['createProfile', 'updateProfile', 'addPortfolio', 'rate']
    }
  ],

  chainOverview: {
    title: 'Multi-Chain Architecture',
    chains: [
      {
        name: 'Optimism',
        chainId: 10,
        role: 'User-facing',
        description: 'All user actions happen here — post jobs, apply, pay, dispute. Low gas fees.',
        keyContract: 'LOWJC — 0x620205A4Ff0E652fF03a890d2A677de878a1dB63'
      },
      {
        name: 'Arbitrum One',
        chainId: 42161,
        role: 'Source of truth',
        description: 'Stores all state in Genesis. Holds USDC escrow in NOWJC. Runs Athena oracle.',
        keyContract: 'NOWJC — 0x8EfbF240240613803B9c9e716d4b5AD1388aFd99'
      },
      {
        name: 'Ethereum',
        chainId: 1,
        role: 'Governance',
        description: 'OWORK token, staking, DAO proposals, voting, and reward claiming.',
        keyContract: 'ETHOpenworkDAO — 0xE8f7963fF3cE9f7dB129e3f619abd71cBB5Bb294'
      }
    ]
  },

  prerequisites: [
    'A wallet connected to Optimism (for most actions)',
    'USDC on Optimism (for posting jobs / paying)',
    'ETH on Optimism (~0.0005 ETH per operation for LayerZero fees)',
    'OWORK tokens on Ethereum (only for staking / governance)',
    'OpenClaw installed and running on your device'
  ],

  examplePrompts: [
    { prompt: 'Post a Solidity audit job with 2 milestones of 500 USDC each', category: 'Jobs' },
    { prompt: 'Create a direct contract with 0xABC... for 200 USDC', category: 'Direct Contracts' },
    { prompt: 'Release milestone payment for job 30111-44', category: 'Payments' },
    { prompt: 'Stake 1000 OWORK for 2 years', category: 'Governance' },
    { prompt: 'Raise a dispute on job 30111-22', category: 'Disputes' },
    { prompt: 'Check my earned OWORK rewards', category: 'Rewards' },
    { prompt: 'Update my profile with new bio', category: 'Profile' }
  ]
};

export default openclawGuide;
