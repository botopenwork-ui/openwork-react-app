export const token = {
  id: 'token',
  name: 'OpenWork Token',
  chain: 'base',
  column: 'base-main',
  order: 0,
  status: 'testnet',
  version: 'v1.0.0',
  gas: '2.1M',
  mainnetNetwork: 'Ethereum Mainnet',
  testnetNetwork: 'Base Sepolia',
  mainnetDeployed: 'Not deployed',
  testnetDeployed: 'Deployed',
  mainnetAddress: null,
  testnetAddress: '0x5f24747d5e59F9CCe5a9815BC12E2fB5Ae713679',
  tvl: 'N/A',
  totalSupply: '1B tokens',
  holders: 'N/A',
  docs: 'OpenWork Token (OWORK) - ERC20 governance token with voting capabilities, delegation, and permit functionality. Serves as the foundation for OpenWork protocol governance and rewards distribution. Initial supply must be distributed to Main Rewards contract to enable user claims.',
  
  overview: {
    purpose: 'OpenWork Token (OWORK) is the ERC20 governance token at the heart of OpenWork protocol. It combines standard token functionality with advanced governance features including vote delegation, checkpoints, and gasless approvals via ERC20Permit. Token holders participate in protocol governance through Main DAO by voting on proposals. Users earn OWORK tokens through platform activity, which are distributed via Main Rewards contract. The token uses OpenZeppelin\'s battle-tested ERC20Votes implementation, making it compatible with Governor contracts and standard governance tools. Important: After deployment, the initial 1 billion token supply must be distributed to Main Rewards and other contracts to enable the rewards system. Note: Currently deployed on Base Sepolia for testing; production deployment will be on Ethereum mainnet.',
    tier: 'Main Chain (Base Sepolia testnet / Ethereum mainnet)',
    category: 'Governance Token - Protocol Foundation',
    upgradeability: 'Non-upgradeable ERC20'
  },
  
  features: [
    'Standard ERC20: Transfer, approve, transferFrom, balanceOf, totalSupply',
    'ERC20Permit: Gasless approvals via signatures (no approval transaction needed)',
    'ERC20Votes: Delegation, checkpoints, voting power tracking for governance',
    'Minting: Owner can mint new tokens to increase supply',
    'Burning: Token holders can burn their own tokens',
    'BurnFrom: Burn tokens from another account (requires allowance)',
    'Vote delegation: Users delegate voting power without transferring tokens',
    'Historical balances: Track voting power at specific block numbers',
    'Nonces: Per-user nonces for permit signatures',
    'Initial supply: 1 billion tokens minted to owner at deployment',
    'Governor compatible: Works with OpenZeppelin Governor contracts',
    'Ownable: Owner controls minting and administrative functions'
  ],
  
  systemPosition: {
    description: 'OpenWork Token is the foundational asset of the entire OpenWork ecosystem. It serves three critical roles: (1) Governance - token holders vote on protocol changes through Main DAO, (2) Rewards - users earn OWORK for completing jobs and contributing to the platform, distributed through Main Rewards, and (3) Staking - users stake OWORK in Main DAO to increase voting power and earn additional rewards. The token is deployed on Base Sepolia (testnet) or Base Mainnet (production) as a standard ERC20 with governance extensions. All other contracts in the system interact with this token for payments, rewards, voting, and staking.',
    diagram: `
📍 OpenWork Token in Protocol Architecture

┌─────────────────────────────────────────────────────────┐
│  OPENWORK TOKEN (OWORK)                                  │
│  Foundation of Protocol Economics & Governance           │
│  Initial Supply: 1 Billion Tokens                       │
└─────────────────┬───────────────────────────────────────┘
                  │
    ┌─────────────┼─────────────┐
    │             │             │
    ↓             ↓             ↓
┌─────────┐  ┌──────────┐  ┌──────────────┐
│ Main DAO │  │  Main    │  │ Users/Market │
│          │  │ Rewards  │  │              │
└─────────┘  └──────────┘  └──────────────┘

Key Relationships:

1. Governance Flow:
   Users → delegate() → Voting Power
   → Main DAO uses votes for proposals
   → Protocol changes executed

2. Rewards Flow:
   Owner → transfer() → Main Rewards (funding)
   Users earn on platform
   → Main Rewards → transfer() → Users (claims)

3. Staking Flow:
   Users → approve() → Main DAO
   → Main DAO → transferFrom() → Lock tokens
   → Voting power increases
   → Earn staking rewards

4. Trading Flow:
   Users → transfer() → Other users
   DEX liquidity pools
   CEX listings

Token Distribution:
├─ Initial Owner: 1B tokens
├─ Main Rewards: X tokens (for user claims)
├─ Main DAO Treasury: Y tokens (for governance)
├─ Team/Advisors: Z tokens (vested)
└─ Liquidity: W tokens (DEX/CEX)`
  },
  
  dependencies: {
    dependsOn: [
      { 
        name: 'OpenZeppelin ERC20', 
        reason: 'Base token implementation providing standard transfer and approval logic.',
        type: 'Library'
      },
      { 
        name: 'OpenZeppelin ERC20Permit', 
        reason: 'Enables gasless approvals via EIP-2612 signatures.',
        type: 'Library'
      },
      { 
        name: 'OpenZeppelin ERC20Votes', 
        reason: 'Provides delegation and checkpoint functionality for governance.',
        type: 'Library'
      },
      { 
        name: 'OpenZeppelin Ownable', 
        reason: 'Access control for minting and administrative functions.',
        type: 'Library'
      }
    ],
    requiredBy: [
      { 
        name: 'Main DAO', 
        reason: 'Uses OWORK for voting power calculation and staking. Requires token approval.',
        type: 'Governance'
      },
      { 
        name: 'Main Rewards', 
        reason: 'Distributes OWORK to users. Must hold token balance to enable claims.',
        type: 'Token Distribution'
      },
      { 
        name: 'Users', 
        reason: 'Hold, transfer, stake, and vote with OWORK tokens.',
        type: 'Frontend'
      },
      { 
        name: 'DEX/CEX', 
        reason: 'Token tradable on exchanges for price discovery and liquidity.',
        type: 'Market'
      }
    ],
    prerequisites: [
      'Ethereum wallet with ETH for gas (Base Sepolia or Base Mainnet)',
      'Owner address configured at deployment',
      'Initial supply distributed to Main Rewards for user claims',
      'Token approval granted to Main DAO for staking',
      'Delegation setup for users who want to vote',
      'DEX liquidity pools created for trading'
    ]
  },
  
  functions: [
    {
      category: 'Standard ERC20 Functions',
      description: 'Basic token operations inherited from ERC20',
      items: [
        {
          name: 'transfer',
          signature: 'transfer(address to, uint256 amount) returns (bool)',
          whatItDoes: 'Transfer tokens from sender to recipient.',
          whyUse: 'Send OWORK to other users, contracts, or wallets.',
          howItWorks: [
            'Validates sender has sufficient balance',
            'Deducts amount from sender',
            'Credits amount to recipient',
            'Updates voting checkpoints (ERC20Votes)',
            'Emits Transfer event',
            'Returns true on success'
          ],
          parameters: [
            { name: 'to', type: 'address', description: 'Recipient address' },
            { name: 'amount', type: 'uint256', description: 'Amount to transfer (18 decimals)' }
          ],
          accessControl: 'Public - any token holder',
          events: ['Transfer(from, to, amount)'],
          gasEstimate: '~65K gas (includes checkpoint updates)',
          example: `// Transfer 100 OWORK to another user
await owToken.transfer(recipientAddress, ethers.parseEther("100"));

// Transfer to Main Rewards for funding
await owToken.transfer(mainRewardsAddress, ethers.parseEther("100000"));`,
          relatedFunctions: ['transferFrom', 'balanceOf']
        },
        {
          name: 'approve',
          signature: 'approve(address spender, uint256 amount) returns (bool)',
          whatItDoes: 'Allow spender to transfer tokens on your behalf.',
          whyUse: 'Enable contracts like Main DAO to move your tokens (e.g., for staking).',
          howItWorks: [
            'Sets allowance[owner][spender] = amount',
            'Emits Approval event',
            'Spender can later call transferFrom()',
            'Returns true on success'
          ],
          parameters: [
            { name: 'spender', type: 'address', description: 'Address to grant allowance' },
            { name: 'amount', type: 'uint256', description: 'Maximum amount spender can transfer' }
          ],
          accessControl: 'Public - any token holder',
          events: ['Approval(owner, spender, amount)'],
          gasEstimate: '~45K gas',
          example: `// Approve Main DAO to stake 500 OWORK
await owToken.approve(mainDAOAddress, ethers.parseEther("500"));

// Check allowance
const allowance = await owToken.allowance(userAddress, mainDAOAddress);
console.log('Allowance:', ethers.formatEther(allowance));`,
          relatedFunctions: ['transferFrom', 'permit', 'increaseAllowance']
        },
        {
          name: 'transferFrom',
          signature: 'transferFrom(address from, address to, uint256 amount) returns (bool)',
          whatItDoes: 'Transfer tokens from one account to another using allowance.',
          whyUse: 'Contracts like Main DAO use this to move tokens during staking.',
          howItWorks: [
            'Validates allowance[from][msg.sender] >= amount',
            'Deducts from allowance',
            'Transfers tokens from → to',
            'Updates voting checkpoints',
            'Emits Transfer and Approval events'
          ],
          parameters: [
            { name: 'from', type: 'address', description: 'Source address' },
            { name: 'to', type: 'address', description: 'Destination address' },
            { name: 'amount', type: 'uint256', description: 'Amount to transfer' }
          ],
          accessControl: 'Public - requires allowance',
          events: ['Transfer(from, to, amount)', 'Approval(from, spender, newAllowance)'],
          gasEstimate: '~70K gas',
          example: `// Main DAO stakes user's tokens
// User already approved Main DAO
await mainDAO.stake(amount); // Internally calls owToken.transferFrom()`,
          relatedFunctions: ['approve', 'transfer']
        },
        {
          name: 'balanceOf',
          signature: 'balanceOf(address account) view returns (uint256)',
          whatItDoes: 'Get token balance of an address.',
          whyUse: 'Check how many OWORK tokens an address holds.',
          howItWorks: [
            'Returns balances[account]',
            'View function, no gas cost',
            'Real-time balance (not checkpoint)'
          ],
          parameters: [
            { name: 'account', type: 'address', description: 'Address to query' }
          ],
          accessControl: 'Public view',
          events: ['None (view)'],
          gasEstimate: 'N/A (view)',
          example: `const balance = await owToken.balanceOf(userAddress);
console.log('Balance:', ethers.formatEther(balance), 'OWORK');`,
          relatedFunctions: ['totalSupply', 'getVotes']
        },
        {
          name: 'totalSupply',
          signature: 'totalSupply() view returns (uint256)',
          whatItDoes: 'Get total token supply in circulation.',
          whyUse: 'Check current supply (increases with minting, decreases with burning).',
          howItWorks: [
            'Returns _totalSupply',
            'Initially 1 billion tokens',
            'Changes with mint() and burn()'
          ],
          parameters: [],
          accessControl: 'Public view',
          events: ['None (view)'],
          gasEstimate: 'N/A (view)',
          example: `const supply = await owToken.totalSupply();
console.log('Total Supply:', ethers.formatEther(supply), 'OWORK');`,
          relatedFunctions: ['balanceOf', 'mint', 'burn']
        },
        {
          name: 'allowance',
          signature: 'allowance(address owner, address spender) view returns (uint256)',
          whatItDoes: 'Get remaining allowance spender can use from owner.',
          whyUse: 'Check if approval is sufficient before transferFrom.',
          howItWorks: [
            'Returns _allowances[owner][spender]',
            'Decreases when spender calls transferFrom()',
            'Must be >= transfer amount'
          ],
          parameters: [
            { name: 'owner', type: 'address', description: 'Token owner' },
            { name: 'spender', type: 'address', description: 'Approved spender' }
          ],
          accessControl: 'Public view',
          events: ['None (view)'],
          gasEstimate: 'N/A (view)',
          example: `const allowance = await owToken.allowance(userAddress, mainDAOAddress);
if (allowance < stakeAmount) {
  await owToken.approve(mainDAOAddress, stakeAmount);
}`,
          relatedFunctions: ['approve', 'transferFrom']
        }
      ]
    },
    {
      category: 'Governance Functions (ERC20Votes)',
      description: 'Delegation and voting power for governance participation',
      items: [
        {
          name: 'delegate',
          signature: 'delegate(address delegatee)',
          whatItDoes: 'Delegate your voting power to another address.',
          whyUse: 'Participate in governance without voting directly, or consolidate voting power.',
          howItWorks: [
            'Transfers voting power to delegatee',
            'Does NOT transfer tokens (you keep ownership)',
            'Creates checkpoint for voting power',
            'Self-delegation (delegate to self) enables your own voting',
            'Emits DelegateChanged and DelegateVotesChanged events'
          ],
          parameters: [
            { name: 'delegatee', type: 'address', description: 'Address to receive voting power' }
          ],
          accessControl: 'Public - any token holder',
          events: ['DelegateChanged(delegator, fromDelegate, toDelegate)', 'DelegateVotesChanged(delegate, previousBalance, newBalance)'],
          gasEstimate: '~80K gas',
          example: `// Self-delegate to enable your own voting
await owToken.delegate(userAddress);

// Delegate to another user
await owToken.delegate(trustedDelegateAddress);

// Check current delegate
const currentDelegate = await owToken.delegates(userAddress);`,
          relatedFunctions: ['delegates', 'getVotes', 'getPastVotes']
        },
        {
          name: 'delegates',
          signature: 'delegates(address account) view returns (address)',
          whatItDoes: 'Get who an address has delegated their voting power to.',
          whyUse: 'Check current delegation status.',
          howItWorks: [
            'Returns _delegates[account]',
            'Returns zero address if not delegated',
            'Account must self-delegate to vote with their own tokens'
          ],
          parameters: [
            { name: 'account', type: 'address', description: 'Address to query' }
          ],
          accessControl: 'Public view',
          events: ['None (view)'],
          gasEstimate: 'N/A (view)',
          example: `const delegate = await owToken.delegates(userAddress);
if (delegate === ethers.ZeroAddress) {
  console.log('Not delegated - cannot vote');
} else if (delegate === userAddress) {
  console.log('Self-delegated - can vote');
} else {
  console.log('Delegated to:', delegate);
}`,
          relatedFunctions: ['delegate', 'getVotes']
        },
        {
          name: 'getVotes',
          signature: 'getVotes(address account) view returns (uint256)',
          whatItDoes: 'Get current voting power of an address.',
          whyUse: 'Check how many votes an address controls right now.',
          howItWorks: [
            'Returns voting power at current block',
            'Includes delegated votes',
            'Used by Governor to check proposal creation threshold',
            'Updates when delegation or balances change'
          ],
          parameters: [
            { name: 'account', type: 'address', description: 'Address to query' }
          ],
          accessControl: 'Public view',
          events: ['None (view)'],
          gasEstimate: 'N/A (view)',
          example: `const votes = await owToken.getVotes(userAddress);
console.log('Current voting power:', ethers.formatEther(votes));

// Check if user can create proposal
const threshold = await governor.proposalThreshold();
if (votes >= threshold) {
  console.log('Can create proposals');
}`,
          relatedFunctions: ['getPastVotes', 'delegate']
        },
        {
          name: 'getPastVotes',
          signature: 'getPastVotes(address account, uint256 blockNumber) view returns (uint256)',
          whatItDoes: 'Get voting power at a specific past block number.',
          whyUse: 'Governor contracts check voting power at proposal creation block.',
          howItWorks: [
            'Returns checkpoint at specified block',
            'Block must be in the past',
            'Used to prevent flash loan attacks on voting',
            'Immutable once block is finalized'
          ],
          parameters: [
            { name: 'account', type: 'address', description: 'Address to query' },
            { name: 'blockNumber', type: 'uint256', description: 'Historical block number' }
          ],
          accessControl: 'Public view',
          events: ['None (view)'],
          gasEstimate: 'N/A (view)',
          example: `// Governor checks voting power at proposal snapshot
const proposalBlock = await governor.proposalSnapshot(proposalId);
const historicalVotes = await owToken.getPastVotes(voter, proposalBlock);
console.log('Votes at snapshot:', ethers.formatEther(historicalVotes));`,
          relatedFunctions: ['getVotes', 'getPastTotalSupply']
        },
        {
          name: 'getPastTotalSupply',
          signature: 'getPastTotalSupply(uint256 blockNumber) view returns (uint256)',
          whatItDoes: 'Get total supply at a specific past block.',
          whyUse: 'Calculate quorum and vote percentages at proposal snapshot.',
          howItWorks: [
            'Returns total supply checkpoint at block',
            'Used by Governor for quorum calculation',
            'Block must be in the past'
          ],
          parameters: [
            { name: 'blockNumber', type: 'uint256', description: 'Historical block number' }
          ],
          accessControl: 'Public view',
          events: ['None (view)'],
          gasEstimate: 'N/A (view)',
          example: `const snapshotSupply = await owToken.getPastTotalSupply(proposalBlock);
const quorum = snapshotSupply * 4n / 100n; // 4% quorum
console.log('Quorum needed:', ethers.formatEther(quorum));`,
          relatedFunctions: ['totalSupply', 'getPastVotes']
        }
      ]
    },
    {
      category: 'Permit Functions (ERC20Permit)',
      description: 'Gasless approvals via signatures',
      items: [
        {
          name: 'permit',
          signature: 'permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s)',
          whatItDoes: 'Approve spender using a signature instead of transaction.',
          whyUse: 'Gasless approvals - user signs off-chain, relayer submits on-chain.',
          howItWorks: [
            'Validates signature via ECDSA recovery',
            'Checks deadline not expired',
            'Verifies nonce to prevent replay',
            'Sets allowance[owner][spender] = value',
            'Increments nonce',
            'Emits Approval event'
          ],
          parameters: [
            { name: 'owner', type: 'address', description: 'Token owner' },
            { name: 'spender', type: 'address', description: 'Address to approve' },
            { name: 'value', type: 'uint256', description: 'Approval amount' },
            { name: 'deadline', type: 'uint256', description: 'Signature expiry timestamp' },
            { name: 'v', type: 'uint8', description: 'Signature parameter' },
            { name: 'r', type: 'bytes32', description: 'Signature parameter' },
            { name: 's', type: 'bytes32', description: 'Signature parameter' }
          ],
          accessControl: 'Public - requires valid signature',
          events: ['Approval(owner, spender, value)'],
          gasEstimate: '~75K gas',
          example: `// User signs permit off-chain
const domain = {
  name: await owToken.name(),
  version: '1',
  chainId: await provider.getNetwork().then(n => n.chainId),
  verifyingContract: await owToken.getAddress()
};

const types = {
  Permit: [
    { name: 'owner', type: 'address' },
    { name: 'spender', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' }
  ]
};

const value = {
  owner: userAddress,
  spender: mainDAOAddress,
  value: ethers.parseEther("500"),
  nonce: await owToken.nonces(userAddress),
  deadline: Math.floor(Date.now() / 1000) + 3600
};

const signature = await signer.signTypedData(domain, types, value);
const { v, r, s } = ethers.Signature.from(signature);

// Relayer submits permit on-chain (user pays no gas)
await owToken.permit(
  value.owner,
  value.spender,
  value.value,
  value.deadline,
  v, r, s
);`,
          relatedFunctions: ['nonces', 'DOMAIN_SEPARATOR', 'approve']
        },
        {
          name: 'nonces',
          signature: 'nonces(address owner) view returns (uint256)',
          whatItDoes: 'Get current nonce for permit signatures.',
          whyUse: 'Required when creating permit signatures to prevent replay attacks.',
          howItWorks: [
            'Returns _nonces[owner]',
            'Increments by 1 after each permit',
            'Prevents reusing old signatures'
          ],
          parameters: [
            { name: 'owner', type: 'address', description: 'Address to query' }
          ],
          accessControl: 'Public view',
          events: ['None (view)'],
          gasEstimate: 'N/A (view)',
          example: `const nonce = await owToken.nonces(userAddress);
console.log('Current nonce:', nonce.toString());
// Use in permit signature`,
          relatedFunctions: ['permit', 'DOMAIN_SEPARATOR']
        },
        {
          name: 'DOMAIN_SEPARATOR',
          signature: 'DOMAIN_SEPARATOR() view returns (bytes32)',
          whatItDoes: 'Get EIP-712 domain separator for permit signatures.',
          whyUse: 'Required when creating typed data for permit.',
          howItWorks: [
            'Returns domain separator hash',
            'Includes contract address, chain ID, name, version',
            'Prevents cross-chain/cross-contract replay'
          ],
          parameters: [],
          accessControl: 'Public view',
          events: ['None (view)'],
          gasEstimate: 'N/A (view)',
          example: `const domainSeparator = await owToken.DOMAIN_SEPARATOR();
console.log('Domain separator:', domainSeparator);`,
          relatedFunctions: ['permit', 'nonces']
        }
      ]
    },
    {
      category: 'Admin Functions',
      description: 'Owner-only minting and burning operations',
      items: [
        {
          name: 'mint',
          signature: 'mint(address to, uint256 amount)',
          whatItDoes: 'Create new tokens and assign to address.',
          whyUse: 'Increase supply for rewards, airdrops, or ecosystem growth.',
          howItWorks: [
            'Validates caller is owner',
            'Creates new tokens',
            'Assigns to recipient',
            'Updates total supply',
            'Updates voting checkpoints',
            'Emits Transfer event (from zero address)'
          ],
          parameters: [
            { name: 'to', type: 'address', description: 'Recipient address' },
            { name: 'amount', type: 'uint256', description: 'Amount to mint' }
          ],
          accessControl: 'onlyOwner',
          events: ['Transfer(address(0), to, amount)'],
          gasEstimate: '~75K gas',
          example: `// Owner mints 100K OWORK for rewards pool
await owToken.mint(mainRewardsAddress, ethers.parseEther("100000"));

const newSupply = await owToken.totalSupply();
console.log('New supply:', ethers.formatEther(newSupply));`,
          relatedFunctions: ['burn', 'totalSupply']
        },
        {
          name: 'burn',
          signature: 'burn(uint256 amount)',
          whatItDoes: 'Destroy tokens from caller\'s balance.',
          whyUse: 'Reduce supply, increase scarcity, or implement deflationary mechanics.',
          howItWorks: [
            'Validates caller has sufficient balance',
            'Destroys tokens',
            'Reduces total supply',
            'Updates voting checkpoints',
            'Emits Transfer event (to zero address)'
          ],
          parameters: [
            { name: 'amount', type: 'uint256', description: 'Amount to burn' }
          ],
          accessControl: 'Public - any token holder',
          events: ['Transfer(caller, address(0), amount)'],
          gasEstimate: '~60K gas',
          example: `// User burns 50 OWORK
await owToken.burn(ethers.parseEther("50"));

const balance = await owToken.balanceOf(userAddress);
console.log('Remaining balance:', ethers.formatEther(balance));`,
          relatedFunctions: ['burnFrom', 'mint']
        },
        {
          name: 'burnFrom',
          signature: 'burnFrom(address from, uint256 amount)',
          whatItDoes: 'Burn tokens from another address using allowance.',
          whyUse: 'Contracts can burn user tokens (with approval) for specific mechanisms.',
          howItWorks: [
            'Validates allowance[from][caller] >= amount',
            'Spends allowance',
            'Burns tokens from target address',
            'Reduces total supply',
            'Updates checkpoints',
            'Emits Transfer and Approval events'
          ],
          parameters: [
            { name: 'from', type: 'address', description: 'Address to burn from' },
            { name: 'amount', type: 'uint256', description: 'Amount to burn' }
          ],
          accessControl: 'Public - requires allowance',
          events: ['Transfer(from, address(0), amount)', 'Approval(from, caller, newAllowance)'],
          gasEstimate: '~70K gas',
          example: `// User approves burn contract
await owToken.approve(burnContractAddress, ethers.parseEther("100"));

// Burn contract calls burnFrom
await burnContract.executeBurn(userAddress, ethers.parseEther("100"));`,
          relatedFunctions: ['burn', 'approve']
        }
      ]
    }
  ],
  
  dataFlows: [
    {
      title: 'Token Distribution Flow',
      description: 'Initial deployment and distribution to system contracts',
      steps: [
        { chain: 'Base', action: '1. Deploy OpenWork Token' },
        { chain: 'Base', action: '2. 1 billion OWORK minted to owner' },
        { chain: 'Base', action: '3. Owner transfers X tokens → Main Rewards' },
        { chain: 'Base', action: '4. Owner transfers Y tokens → Main DAO Treasury' },
        { chain: 'Base', action: '5. Owner transfers Z tokens → Team/Advisors' },
        { chain: 'Base', action: '6. Owner transfers W tokens → DEX liquidity' },
        { chain: 'Base', action: '7. System ready for user operations' }
      ]
    },
    {
      title: 'Governance Participation Flow',
      description: 'User delegates and participates in DAO voting',
      steps: [
        { chain: 'Base', action: '1. User holds OWORK tokens' },
        { chain: 'Base', action: '2. User calls delegate(self) to enable voting' },
        { chain: 'Base', action: '3. Voting power recorded in checkpoint' },
        { chain: 'Base', action: '4. User creates proposal in Main DAO' },
        { chain: 'Base', action: '5. Main DAO checks getPastVotes() at snapshot' },
        { chain: 'Base', action: '6. Users vote for/against proposal' },
        { chain: 'Base', action: '7. Proposal executes if passed' }
      ]
    },
    {
      title: 'Staking Flow',
      description: 'User stakes tokens in Main DAO',
      steps: [
        { chain: 'Base', action: '1. User holds OWORK tokens' },
        { chain: 'Base', action: '2. User approves Main DAO' },
        { chain: 'Base', action: '3. User calls Main DAO.stake()' },
        { chain: 'Base', action: '4. Main DAO calls owToken.transferFrom()' },
        { chain: 'Base', action: '5. Tokens locked in Main DAO' },
        { chain: 'Base', action: '6. Voting power increases' },
        { chain: 'Base', action: '7. Stake duration rewards earned' }
      ]
    },
    {
      title: 'Rewards Claim Flow',
      description: 'User claims earned rewards from Main Rewards',
      steps: [
        { chain: 'Base', action: '1. User earns OWORK on platform' },
        { chain: 'Base', action: '2. Balance synced to Main Rewards' },
        { chain: 'Base', action: '3. User calls Main Rewards.claimRewards()' },
        { chain: 'Base', action: '4. Main Rewards calls owToken.transfer()' },
        { chain: 'Base', action: '5. OWORK tokens sent to user wallet' },
        { chain: 'Base', action: '6. User can stake, vote, or trade' }
      ]
    }
  ],
  
  integrationGuide: {
    example: `// OpenWork Token Integration Guide
const { ethers } = require('ethers');

// 1. Setup
const owToken = new ethers.Contract(owTokenAddress, erc20ABI, signer);

// 2. Check balance
const balance = await owToken.balanceOf(userAddress);
console.log('Balance:', ethers.formatEther(balance), 'OWORK');

// 3. Transfer tokens
await owToken.transfer(recipientAddress, ethers.parseEther("100"));

// 4. Approve Main DAO for staking
await owToken.approve(mainDAOAddress, ethers.parseEther("500"));
const allowance = await owToken.allowance(userAddress, mainDAOAddress);
console.log('Approved:', ethers.formatEther(allowance));

// 5. Self-delegate for voting
await owToken.delegate(userAddress);
const votes = await owToken.getVotes(userAddress);
console.log('Voting power:', ethers.formatEther(votes));

// 6. Check historical voting power
const block = await provider.getBlockNumber() - 100;
const pastVotes = await owToken.getPastVotes(userAddress, block);
console.log('Past voting power:', ethers.formatEther(pastVotes));

// 7. Gasless approval with permit
const nonce = await owToken.nonces(userAddress);
const deadline = Math.floor(Date.now() / 1000) + 3600;

const domain = {
  name: 'OpenWorkToken',
  version: '1',
  chainId: (await provider.getNetwork()).chainId,
  verifyingContract: owTokenAddress
};

const types = {
  Permit: [
    { name: 'owner', type: 'address' },
    { name: 'spender', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' }
  ]
};

const value = {
  owner: userAddress,
  spender: mainDAOAddress,
  value: ethers.parseEther("500"),
  nonce,
  deadline
};

const signature = await signer.signTypedData(domain, types, value);
const { v, r, s } = ethers.Signature.from(signature);

await owToken.permit(userAddress, mainDAOAddress, value.value, deadline, v, r, s);

// 8. Owner operations (if you're the owner)
// Mint new tokens
await owToken.mint(recipientAddress, ethers.parseEther("10000"));

// Fund Main Rewards
await owToken.transfer(mainRewardsAddress, ethers.parseEther("100000"));
console.log('Main Rewards funded');

// 9. Burn tokens
await owToken.burn(ethers.parseEther("50"));
const newBalance = await owToken.balanceOf(userAddress);
console.log('Balance after burn:', ethers.formatEther(newBalance));`,
    tips: [
      'OWORK is the foundation token - all governance and rewards flow through it',
      'Must self-delegate (delegate to own address) to vote with your tokens',
      'Approve Main DAO before staking tokens',
      'Transfer initial supply to Main Rewards after deployment for user claims',
      'Use permit() for gasless approvals (better UX)',
      'Voting power tracked via checkpoints - not real-time balance',
      'getPastVotes() prevents flash loan attacks on governance',
      'Minting increases supply, burning decreases it',
      'Token includes ERC20Votes for Governor compatibility',
      'Initial supply: 1 billion tokens to owner',
      'Delegation does not transfer ownership',
      'burnFrom requires approval like transferFrom',
      'Check totalSupply() to track inflation/deflation',
      'Owner can mint - consider timelock or DAO control',
      'Tokens must be distributed before system goes live'
    ]
  },
  
  securityConsiderations: [
    'Non-upgradeable: Standard ERC20, cannot be upgraded',
    'Owner minting: Owner can mint unlimited tokens (consider DAO ownership)',
    'ERC20Votes security: Checkpoint system prevents flash loan voting attacks',
    'ERC20Permit security: Uses EIP-712 signatures, prevents replay attacks',
    'Delegation security: Delegation does not transfer ownership',
    'Nonce tracking: Prevents permit signature replay',
    'Deadline validation: Permit signatures expire after deadline',
    'OpenZeppelin audited: Uses audited OpenZeppelin implementations',
    'Self-delegation required: Must delegate to self to vote',
    'Voting power lag: Checkpoint-based, not real-time balance',
    'Burn protection: No accidental burns, explicit burn() calls only',
    'Allowance security: Standard ERC20 allowance attack vectors apply',
    'Owner responsibility: Owner controls minting, must be trusted',
    'Initial distribution: Must distribute to contracts for system to work',
    'No transfer restrictions: Standard ERC20, tokens freely transferable'
  ],
  
  code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title VotingToken
 * @dev ERC-20 token with voting capabilities compatible with OpenZeppelin Governor
 * 
 * Features:
 * - Standard ERC-20 functionality
 * - ERC20Permit for gasless approvals
 * - ERC20Votes for governance voting (checkpoints, delegation)
 * - Ownable for administrative functions
 */
contract VotingToken is ERC20, ERC20Permit, ERC20Votes, Ownable {
    
    // Initial supply of tokens (adjust as needed)
    uint256 public constant INITIAL_SUPPLY = 1_000_000_000 * 10**18; // 1 billion tokens

    /**
     * @dev Constructor that sets up the token with initial parameters
     * @param initialOwner Address that will own the contract
     */
    constructor(address initialOwner) 
        ERC20("OpenWorkToken", "OWORK")
        ERC20Permit("DAOToken")
        Ownable(initialOwner)
    {
        // Mint initial supply to the owner
        _mint(initialOwner, INITIAL_SUPPLY);
    }
    
    /**
     * @dev Mint new tokens (only owner can call this)
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
    
    /**
     * @dev Burn tokens from caller's balance
     * @param amount Amount of tokens to burn
     */
    function burn(uint256 amount) public {
        _burn(_msgSender(), amount);
    }
    
    /**
     * @dev Burn tokens from specified account (requires allowance)
     * @param from Address to burn tokens from
     * @param amount Amount of tokens to burn
     */
    function burnFrom(address from, uint256 amount) public {
        _spendAllowance(from, _msgSender(), amount);
        _burn(from, amount);
    }
    
    // The following functions are overrides required by Solidity due to multiple inheritance
    
    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Votes)
    {
        super._update(from, to, value);
    }
    
    function nonces(address owner)
        public
        view
        override(ERC20Permit, Nonces)
        returns (uint256)
    {
        return super.nonces(owner);
    }
}`,

  deployConfig: {
    type: 'standard',
    constructor: [
      { 
        name: 'initialOwner',
        type: 'address',
        description: 'Address that will own the token contract and can mint tokens',
        placeholder: '0x...'
      }
    ],
    networks: {
      testnet: {
        name: 'Base Sepolia',
        chainId: 84532,
        rpcUrl: 'https://sepolia.base.org',
        explorer: 'https://sepolia.basescan.org',
        currency: 'ETH'
      },
      mainnet: {
        name: 'Base Mainnet',
        chainId: 8453,
        rpcUrl: 'https://mainnet.base.org',
        explorer: 'https://basescan.org',
        currency: 'ETH'
      }
    },
    estimatedGas: '2.1M',
    postDeploy: {
      message: 'Standard deployment complete! Initial supply of 1B OWORK minted to owner.',
      nextSteps: [
        '1. Deploy VotingToken (OpenWork Token) with constructor parameter:',
        '   - Initial Owner: your admin wallet address',
        '2. ⚠️ CRITICAL: Distribute initial 1B token supply:',
        '   - Transfer 100,000+ OWORK → Main Rewards (for user claims)',
        '   - Transfer X OWORK → Main DAO treasury (for governance)',
        '   - Transfer Y OWORK → Team/Advisors wallets (vested)',
        '   - Transfer Z OWORK → DEX liquidity pools',
        '   - Keep remainder for future needs',
        '3. Verify token contract on Basescan/Etherscan',
        '4. Add token to block explorer as verified ERC20',
        '5. Configure Main DAO with token address:',
        '   - MainDAO.setOpenworkToken(tokenAddress) [during init]',
        '6. Configure Main Rewards with token address:',
        '   - MainRewards.setOpenworkToken(tokenAddress) [during init]',
        '7. Test token operations:',
        '   - Transfer to test address',
        '   - Approve and transferFrom',
        '   - Self-delegate and check voting power',
        '8. Optional: Create DEX liquidity pair (OWORK/ETH)',
        '9. Add token to MetaMask for users:',
        '   - Symbol: OWORK',
        '   - Decimals: 18',
        '   - Address: deployed contract address',
        '10. IMPORTANT: Main Rewards MUST be funded before users can claim',
        '11. Consider transferring ownership to Main DAO after distribution'
      ]
    }
  }
};
