import Web3 from "web3";

// Contract Addresses
const MAIN_DAO_ADDRESS = "0xc3579BDC6eC1fAad8a67B1Dc5542EBcf28456465"; // Base Sepolia
const NATIVE_DAO_ADDRESS = "0x21451dCE07Ad3Ab638Ec71299C1D2BD2064b90E5"; // Arbitrum Sepolia
const MAIN_BRIDGE_ADDRESS = "0x70d30e5dAb5005b126C040f1D9b0bDDBc16679b0"; // Base Sepolia

// Backend API URL
const BACKEND_API_URL = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:3001';

// RPC URLs
const BASE_SEPOLIA_RPC = import.meta.env.VITE_BASE_SEPOLIA_RPC_URL;
const ARBITRUM_SEPOLIA_RPC = import.meta.env.VITE_ARBITRUM_SEPOLIA_RPC_URL;

// LayerZero options for Main DAO cross-chain messaging
const LAYERZERO_OPTIONS = "0x000301001101000000000000000000000000000aae60";

/**
 * Calculate proposal ID deterministically (OpenZeppelin Governor formula)
 * proposalId = keccak256(abi.encode(targets, values, calldatas, descriptionHash))
 */
function calculateProposalId(targets, values, calldatas, description) {
  const web3 = new Web3();
  
  // Hash the description
  const descriptionHash = web3.utils.keccak256(description);
  
  // Encode targets, values, calldatas, descriptionHash
  const encoded = web3.eth.abi.encodeParameters(
    ['address[]', 'uint256[]', 'bytes[]', 'bytes32'],
    [targets, values, calldatas, descriptionHash]
  );
  
  // Hash the encoded data to get proposal ID
  const proposalId = web3.utils.keccak256(encoded);
  
  console.log("📊 Calculated Proposal ID:", proposalId);
  console.log("   Targets:", targets);
  console.log("   Values:", values);
  console.log("   Description Hash:", descriptionHash);
  
  return proposalId;
}

/**
 * Save proposal metadata to backend database
 */
async function saveProposalToDatabase({
  proposalId,
  chain,
  proposalType,
  title,
  description,
  proposerAddress,
  recipientAddress,
  amount,
  transactionHash,
  blockNumber,
  metadata
}) {
  try {
    const response = await fetch(`${BACKEND_API_URL}/api/proposals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        proposalId,
        chain,
        proposalType,
        title,
        description,
        proposerAddress,
        recipientAddress,
        amount,
        transactionHash,
        blockNumber,
        metadata
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Failed to save proposal to database:', data.error);
      return { success: false, error: data.error };
    }

    console.log('✅ Proposal saved to database:', proposalId);
    return { success: true, data };

  } catch (error) {
    console.error('Error calling backend API:', error);
    return { success: false, error: error.message };
  }
}

// Main DAO ABI (for treasury proposals)
const MAIN_DAO_ABI = [
  {
    inputs: [
      { internalType: "address[]", name: "targets", type: "address[]" },
      { internalType: "uint256[]", name: "values", type: "uint256[]" },
      { internalType: "bytes[]", name: "calldatas", type: "bytes[]" },
      { internalType: "string", name: "description", type: "string" },
      { internalType: "bytes", name: "_options", type: "bytes" }
    ],
    name: "propose",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "payable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "uint256", name: "proposalId", type: "uint256" },
      { internalType: "uint8", name: "support", type: "uint8" },
      { internalType: "bytes", name: "_options", type: "bytes" }
    ],
    name: "castVote",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "payable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "address", name: "account", type: "address" },
      { internalType: "bytes", name: "_options", type: "bytes" }
    ],
    name: "quoteGovernanceNotification",
    outputs: [{ internalType: "uint256", name: "fee", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "getGovernanceEligibility",
    outputs: [
      { internalType: "bool", name: "canPropose", type: "bool" },
      { internalType: "bool", name: "canVote", type: "bool" },
      { internalType: "uint256", name: "stakeAmount", type: "uint256" },
      { internalType: "uint256", name: "rewardTokens", type: "uint256" },
      { internalType: "uint256", name: "combinedPower", type: "uint256" },
      { internalType: "uint256", name: "votingPower", type: "uint256" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "address[]", name: "targets", type: "address[]" },
      { internalType: "uint256[]", name: "values", type: "uint256[]" },
      { internalType: "bytes[]", name: "calldatas", type: "bytes[]" },
      { internalType: "bytes32", name: "descriptionHash", type: "bytes32" }
    ],
    name: "execute",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "payable",
    type: "function"
  }
];

// Native DAO ABI (for operational proposals)
const NATIVE_DAO_ABI = [
  {
    inputs: [
      { internalType: "address[]", name: "targets", type: "address[]" },
      { internalType: "uint256[]", name: "values", type: "uint256[]" },
      { internalType: "bytes[]", name: "calldatas", type: "bytes[]" },
      { internalType: "string", name: "description", type: "string" }
    ],
    name: "propose",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "uint256", name: "proposalId", type: "uint256" },
      { internalType: "uint8", name: "support", type: "uint8" }
    ],
    name: "castVote",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "getGovernanceEligibility",
    outputs: [
      { internalType: "bool", name: "canProposeFlag", type: "bool" },
      { internalType: "bool", name: "canVoteFlag", type: "bool" },
      { internalType: "uint256", name: "stakeAmount", type: "uint256" },
      { internalType: "uint256", name: "rewardTokens", type: "uint256" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "address[]", name: "targets", type: "address[]" },
      { internalType: "uint256[]", name: "values", type: "uint256[]" },
      { internalType: "bytes[]", name: "calldatas", type: "bytes[]" },
      { internalType: "bytes32", name: "descriptionHash", type: "bytes32" }
    ],
    name: "execute",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "payable",
    type: "function"
  }
];

/**
 * Initialize Web3 and Main DAO contract (Base Sepolia)
 */
function initializeMainDAO() {
  const web3 = new Web3(BASE_SEPOLIA_RPC);
  const mainDAOContract = new web3.eth.Contract(MAIN_DAO_ABI, MAIN_DAO_ADDRESS);
  return { web3, mainDAOContract };
}

/**
 * Initialize Web3 and Native DAO contract (Arbitrum Sepolia)
 */
function initializeNativeDAO() {
  const web3 = new Web3(ARBITRUM_SEPOLIA_RPC);
  const nativeDAOContract = new web3.eth.Contract(NATIVE_DAO_ABI, NATIVE_DAO_ADDRESS);
  return { web3, nativeDAOContract };
}

/**
 * Check if user is eligible to propose on Main DAO (Base Sepolia)
 */
export async function checkMainDAOEligibility(userAddress) {
  try {
    const { mainDAOContract } = initializeMainDAO();
    const eligibility = await mainDAOContract.methods.getGovernanceEligibility(userAddress).call();
    
    return {
      canPropose: eligibility.canPropose,
      canVote: eligibility.canVote,
      stakeAmount: eligibility.stakeAmount,
      rewardTokens: eligibility.rewardTokens,
      combinedPower: eligibility.combinedPower,
      votingPower: eligibility.votingPower
    };
  } catch (error) {
    console.error("Error checking Main DAO eligibility:", error);
    throw error;
  }
}

/**
 * Check if user is eligible to propose on Native DAO (Arbitrum Sepolia)
 */
export async function checkNativeDAOEligibility(userAddress) {
  try {
    const { nativeDAOContract } = initializeNativeDAO();
    const eligibility = await nativeDAOContract.methods.getGovernanceEligibility(userAddress).call();
    
    return {
      canPropose: eligibility.canProposeFlag,
      canVote: eligibility.canVoteFlag,
      stakeAmount: eligibility.stakeAmount,
      rewardTokens: eligibility.rewardTokens
    };
  } catch (error) {
    console.error("Error checking Native DAO eligibility:", error);
    throw error;
  }
}

/**
 * Estimate LayerZero fee for Main DAO proposal
 */
export async function estimateMainDAOFee(userAddress) {
  try {
    const { mainDAOContract } = initializeMainDAO();
    const fee = await mainDAOContract.methods
      .quoteGovernanceNotification(userAddress, LAYERZERO_OPTIONS)
      .call();
    
    return fee;
  } catch (error) {
    console.error("Error estimating Main DAO fee:", error);
    throw error;
  }
}

/**
 * Create a treasury proposal on Main DAO (Base Sepolia)
 * Requires LayerZero fee payment for cross-chain messaging
 */
export async function createMainDAOProposal({
  recipientAddress,
  amount,
  description,
  userAddress
}) {
  try {
    if (!window.ethereum) {
      throw new Error("MetaMask not installed");
    }

    const web3 = new Web3(window.ethereum);
    await window.ethereum.request({ method: "eth_requestAccounts" });
    
    const accounts = await web3.eth.getAccounts();
    const fromAddress = accounts[0];
    
    if (fromAddress.toLowerCase() !== userAddress.toLowerCase()) {
      throw new Error("Connected wallet does not match user address");
    }

    // Check user is on Base Sepolia
    const chainId = await web3.eth.getChainId();
    if (Number(chainId) !== 84532) { // Base Sepolia chain ID (handle BigInt)
      throw new Error("Please switch to Base Sepolia network");
    }

    const mainDAOContract = new web3.eth.Contract(MAIN_DAO_ABI, MAIN_DAO_ADDRESS);

    // Estimate LayerZero fee
    const fee = await mainDAOContract.methods
      .quoteGovernanceNotification(fromAddress, LAYERZERO_OPTIONS)
      .call();

    // Encode the transfer function call
    const web3Instance = new Web3();
    const transferCalldata = web3Instance.eth.abi.encodeFunctionCall(
      {
        name: 'transfer',
        type: 'function',
        inputs: [
          { type: 'address', name: 'to' },
          { type: 'uint256', name: 'amount' }
        ]
      },
      [recipientAddress, amount]
    );

    // Prepare proposal parameters
    const targets = [MAIN_DAO_ADDRESS]; // Treasury is held in Main DAO
    const values = [0]; // No ETH transfer
    const calldatas = [transferCalldata];

    console.log("=== MAIN DAO PROPOSAL PARAMETERS ===");
    console.log("Contract:", MAIN_DAO_ADDRESS);
    console.log("Targets:", targets);
    console.log("Values:", values);
    console.log("Calldatas:", calldatas);
    console.log("Description:", description);
    console.log("LayerZero Fee:", web3.utils.fromWei(fee.toString(), 'ether'), "ETH");

    // Calculate proposal ID deterministically (OpenZeppelin standard method)
    const proposalId = calculateProposalId(targets, values, calldatas, description);
    console.log("✅ Calculated Proposal ID (before transaction):", proposalId);

    // Create proposal and wait for confirmation
    return new Promise((resolve, reject) => {
      console.log("[SERVICE TIMING] Creating promise and calling .send():", new Date().toISOString());
      
      mainDAOContract.methods
        .propose(targets, values, calldatas, description, LAYERZERO_OPTIONS)
        .send({
          from: fromAddress,
          value: fee,
          gas: 500000
        })
        .on('transactionHash', (hash) => {
          console.log("[SERVICE TIMING] transactionHash event fired:", new Date().toISOString());
          console.log("Transaction hash:", hash);
        })
        .on('receipt', async (receipt) => {
          console.log("[SERVICE TIMING] receipt event fired:", new Date().toISOString());
          console.log("Transaction receipt:", receipt);
          console.log("Receipt status:", receipt.status);
          
          // Check if transaction was successful (status: 1 or "1")
          if (receipt.status == 1 || receipt.status == "1") {
            console.log("✅ Transaction successful! Using calculated proposal ID:", proposalId);
            
            const result = {
              success: true,
              transactionHash: receipt.transactionHash,
              proposalId
            };
            
            // Save to database
            console.log("💾 Saving proposal to database...");
            await saveProposalToDatabase({
              proposalId: proposalId.toString(),
              chain: 'Base',
              proposalType: 'Treasury',
              title: `Treasury Transfer: ${web3.utils.fromWei(amount, 'ether')} OW`,
              description,
              proposerAddress: fromAddress,
              recipientAddress,
              amount: amount.toString(),
              transactionHash: receipt.transactionHash,
              blockNumber: Number(receipt.blockNumber),
              metadata: {
                targets,
                values: values.map(v => typeof v === 'bigint' ? v.toString() : v),
                calldatas
              }
            });
            
            console.log("[SERVICE TIMING] Transaction SUCCESS - Resolving promise with:", result);
            resolve(result);
          } else {
            // Transaction reverted (status: 0 or "0")
            console.log("[SERVICE TIMING] Transaction REVERTED - Rejecting promise");
            reject(new Error("Transaction reverted by the blockchain"));
          }
        })
        .on('error', (error) => {
          console.log("[SERVICE TIMING] error event fired:", new Date().toISOString());
          console.error("Transaction error:", error);
          reject(error);
        });
    });

  } catch (error) {
    console.error("Error creating Main DAO proposal:", error);
    throw error;
  }
}

/**
 * Create an operational proposal on Native DAO (Arbitrum Sepolia)
 * No LayerZero options needed - local only
 */
export async function createNativeDAOProposal({
  targets,
  values,
  calldatas,
  description,
  userAddress
}) {
  try {
    if (!window.ethereum) {
      throw new Error("MetaMask not installed");
    }

    const web3 = new Web3(window.ethereum);
    await window.ethereum.request({ method: "eth_requestAccounts" });
    
    const accounts = await web3.eth.getAccounts();
    const fromAddress = accounts[0];
    
    if (fromAddress.toLowerCase() !== userAddress.toLowerCase()) {
      throw new Error("Connected wallet does not match user address");
    }

    // Check user is on Arbitrum Sepolia
    const chainId = await web3.eth.getChainId();
    if (Number(chainId) !== 421614) { // Arbitrum Sepolia chain ID (handle BigInt)
      throw new Error("Please switch to Arbitrum Sepolia network");
    }

    const nativeDAOContract = new web3.eth.Contract(NATIVE_DAO_ABI, NATIVE_DAO_ADDRESS);

    console.log("=== NATIVE DAO PROPOSAL PARAMETERS ===");
    console.log("Contract:", NATIVE_DAO_ADDRESS);
    console.log("Targets:", targets);
    console.log("Values:", values);
    console.log("Calldatas:", calldatas);
    console.log("Description:", description);

    // Create proposal (no LayerZero options needed)
    const tx = await nativeDAOContract.methods
      .propose(targets, values, calldatas, description)
      .send({
        from: fromAddress,
        gas: 500000
      });

    console.log("Transaction successful:", tx);
    return {
      success: true,
      transactionHash: tx.transactionHash,
      proposalId: tx.events?.ProposalCreated?.returnValues?.proposalId
    };

  } catch (error) {
    console.error("Error creating Native DAO proposal:", error);
    throw error;
  }
}

/**
 * Create a contract upgrade proposal on Main DAO (Base Sepolia)
 * Proposes calling upgradeContract() to upgrade any contract on any chain
 */
export async function createUpgradeProposal({
  contractName,
  targetChainId,
  targetProxy,
  newImplementation,
  description,
  userAddress
}) {
  try {
    if (!window.ethereum) {
      throw new Error("MetaMask not installed");
    }

    const web3 = new Web3(window.ethereum);
    await window.ethereum.request({ method: "eth_requestAccounts" });
    
    const accounts = await web3.eth.getAccounts();
    const fromAddress = accounts[0];
    
    if (fromAddress.toLowerCase() !== userAddress.toLowerCase()) {
      throw new Error("Connected wallet does not match user address");
    }

    // Check user is on Base Sepolia
    const chainId = await web3.eth.getChainId();
    if (Number(chainId) !== 84532) {
      throw new Error("Please switch to Base Sepolia network");
    }

    const mainDAOContract = new web3.eth.Contract(MAIN_DAO_ABI, MAIN_DAO_ADDRESS);

    // Estimate LayerZero fee
    const fee = await mainDAOContract.methods
      .quoteGovernanceNotification(fromAddress, LAYERZERO_OPTIONS)
      .call();

    // Encode the upgradeContract function call
    const web3Instance = new Web3();
    const upgradeCalldata = web3Instance.eth.abi.encodeFunctionCall(
      {
        name: 'upgradeContract',
        type: 'function',
        inputs: [
          { type: 'uint32', name: 'targetChainId' },
          { type: 'address', name: 'targetProxy' },
          { type: 'address', name: 'newImplementation' },
          { type: 'bytes', name: '_options' }
        ]
      },
      [targetChainId, targetProxy, newImplementation, LAYERZERO_OPTIONS]
    );

    // Prepare proposal parameters
    const targets = [MAIN_DAO_ADDRESS];
    const values = [0];
    const calldatas = [upgradeCalldata];

    console.log("=== CONTRACT UPGRADE PROPOSAL PARAMETERS ===");
    console.log("Contract to Upgrade:", contractName);
    console.log("Target Chain ID:", targetChainId);
    console.log("Target Proxy:", targetProxy);
    console.log("New Implementation:", newImplementation);
    console.log("Main DAO:", MAIN_DAO_ADDRESS);
    console.log("Calldata:", upgradeCalldata);
    console.log("Description:", description);
    console.log("LayerZero Fee:", web3.utils.fromWei(fee.toString(), 'ether'), "ETH");

    // Calculate proposal ID deterministically (OpenZeppelin standard method)
    const proposalId = calculateProposalId(targets, values, calldatas, description);
    console.log("✅ Calculated Proposal ID (before transaction):", proposalId);

    // Create proposal and wait for confirmation
    return new Promise((resolve, reject) => {
      mainDAOContract.methods
        .propose(targets, values, calldatas, description, LAYERZERO_OPTIONS)
        .send({
          from: fromAddress,
          value: fee,
          gas: 500000
        })
        .on('transactionHash', (hash) => {
          console.log("Transaction sent! Hash:", hash);
        })
        .on('receipt', async (receipt) => {
          console.log("Transaction receipt:", receipt);
          
          // Check if transaction was successful
          if (receipt.status == 1 || receipt.status == "1") {
            console.log("✅ Transaction successful! Using calculated proposal ID:", proposalId);
            
            const result = {
              success: true,
              transactionHash: receipt.transactionHash,
              proposalId
            };
            
            // Save to database
            console.log("💾 Saving upgrade proposal to database...");
            const dbSaveResult = await saveProposalToDatabase({
              proposalId: proposalId.toString(),
              chain: 'Base',
              proposalType: 'Contract Upgrade',
              title: `Upgrade ${contractName}`,
              description,
              proposerAddress: fromAddress,
              recipientAddress: targetProxy,
              amount: null,
              transactionHash: receipt.transactionHash,
              blockNumber: Number(receipt.blockNumber),
              metadata: {
                contractName,
                targetChainId,
                targetProxy,
                newImplementation,
                targets,
                values: values.map(v => typeof v === 'bigint' ? v.toString() : v),
                calldatas
              }
            });
            
            if (dbSaveResult.success) {
              console.log("✅ DATABASE SAVE SUCCESSFUL for proposal:", proposalId);
            } else {
              console.error("❌ DATABASE SAVE FAILED:", dbSaveResult.error);
            }
            
            console.log("Upgrade proposal created successfully:", result);
            resolve(result);
          } else {
            console.log("Transaction reverted");
            reject(new Error("Transaction reverted by the blockchain"));
          }
        })
        .on('error', (error) => {
          console.error("Transaction error:", error);
          reject(error);
        });
    });

  } catch (error) {
    console.error("Error creating upgrade proposal:", error);
    throw error;
  }
}

/**
 * Create a generic proposal on Main DAO (Base Sepolia)
 * For any type of proposal with custom targets/calldatas
 */
export async function createGenericMainDAOProposal({
  targets,
  values,
  calldatas,
  description,
  userAddress
}) {
  try {
    if (!window.ethereum) {
      throw new Error("MetaMask not installed");
    }

    const web3 = new Web3(window.ethereum);
    await window.ethereum.request({ method: "eth_requestAccounts" });
    
    const accounts = await web3.eth.getAccounts();
    const fromAddress = accounts[0];
    
    if (fromAddress.toLowerCase() !== userAddress.toLowerCase()) {
      throw new Error("Connected wallet does not match user address");
    }

    // Check user is on Base Sepolia
    const chainId = await web3.eth.getChainId();
    if (Number(chainId) !== 84532) {
      throw new Error("Please switch to Base Sepolia network");
    }

    const mainDAOContract = new web3.eth.Contract(MAIN_DAO_ABI, MAIN_DAO_ADDRESS);

    // Estimate LayerZero fee
    const fee = await mainDAOContract.methods
      .quoteGovernanceNotification(fromAddress, LAYERZERO_OPTIONS)
      .call();

    console.log("=== MAIN DAO GENERIC PROPOSAL ===");
    console.log("Targets:", targets);
    console.log("Values:", values);
    console.log("Calldatas:", calldatas);
    console.log("Description:", description);
    console.log("LayerZero Fee:", web3.utils.fromWei(fee.toString(), 'ether'), "ETH");

    // Create proposal and wait for confirmation
    return new Promise((resolve, reject) => {
      mainDAOContract.methods
        .propose(targets, values, calldatas, description, LAYERZERO_OPTIONS)
        .send({
          from: fromAddress,
          value: fee,
          gas: 500000
        })
        .on('transactionHash', (hash) => {
          console.log("Transaction sent! Hash:", hash);
        })
        .on('receipt', (receipt) => {
          console.log("Transaction receipt:", receipt);
          
          if (receipt.status == 1 || receipt.status == "1") {
            resolve({
              success: true,
              transactionHash: receipt.transactionHash,
              proposalId: receipt.events?.ProposalCreated?.returnValues?.proposalId
            });
          } else {
            reject(new Error("Transaction reverted by the blockchain"));
          }
        })
        .on('error', (error) => {
          console.error("Transaction error:", error);
          reject(error);
        });
    });

  } catch (error) {
    console.error("Error creating Main DAO proposal:", error);
    throw error;
  }
}

/**
 * Helper function to encode function calls for Native DAO proposals
 */
export function encodeFunctionCall(functionAbi, parameters) {
  const web3 = new Web3();
  return web3.eth.abi.encodeFunctionCall(functionAbi, parameters);
}

/**
 * Cast vote on Main DAO proposal (Base Sepolia)
 */
export async function castMainDAOVote({ proposalId, support, userAddress }) {
  try {
    if (!window.ethereum) throw new Error("MetaMask not installed");

    const web3 = new Web3(window.ethereum);
    await window.ethereum.request({ method: "eth_requestAccounts" });
    
    const accounts = await web3.eth.getAccounts();
    const fromAddress = accounts[0];
    
    if (fromAddress.toLowerCase() !== userAddress.toLowerCase()) {
      throw new Error("Connected wallet does not match user address");
    }

    const chainId = await web3.eth.getChainId();
    if (Number(chainId) !== 84532) {
      throw new Error("Please switch to Base Sepolia network");
    }

    const mainDAOContract = new web3.eth.Contract(MAIN_DAO_ABI, MAIN_DAO_ADDRESS);
    const fee = await mainDAOContract.methods.quoteGovernanceNotification(fromAddress, LAYERZERO_OPTIONS).call();

    return new Promise((resolve, reject) => {
      mainDAOContract.methods
        .castVote(proposalId, support, LAYERZERO_OPTIONS)
        .send({ from: fromAddress, value: fee, gas: 500000 })
        .on('receipt', (receipt) => {
          if (receipt.status == 1) resolve({ success: true, transactionHash: receipt.transactionHash });
          else reject(new Error("Transaction reverted"));
        })
        .on('error', reject);
    });
  } catch (error) {
    throw error;
  }
}

/**
 * Execute a succeeded proposal
 */
export async function executeProposal({ 
  proposalId, 
  chain,
  targets, 
  values, 
  calldatas, 
  description,
  userAddress 
}) {
  try {
    if (!window.ethereum) throw new Error("MetaMask not installed");

    const web3 = new Web3(window.ethereum);
    await window.ethereum.request({ method: "eth_requestAccounts" });
    
    const accounts = await web3.eth.getAccounts();
    const fromAddress = accounts[0];
    
    if (fromAddress.toLowerCase() !== userAddress.toLowerCase()) {
      throw new Error("Connected wallet does not match user address");
    }

    const isBase = chain === 'Base';
    const requiredChainId = isBase ? 84532 : 421614;
    const chainId = await web3.eth.getChainId();
    
    if (Number(chainId) !== requiredChainId) {
      throw new Error(`Please switch to ${chain} Sepolia network`);
    }

    // Hash the description
    const descriptionHash = web3.utils.keccak256(description);
    
    const daoContract = new web3.eth.Contract(
      isBase ? MAIN_DAO_ABI : NATIVE_DAO_ABI,
      isBase ? MAIN_DAO_ADDRESS : NATIVE_DAO_ADDRESS
    );

    console.log("=== EXECUTING PROPOSAL ===");
    console.log("Proposal ID:", proposalId);
    console.log("Targets:", targets);
    console.log("Values:", values);
    console.log("Calldatas:", calldatas);
    console.log("Description Hash:", descriptionHash);

    return new Promise((resolve, reject) => {
      daoContract.methods
        .execute(targets, values, calldatas, descriptionHash)
        .send({ from: fromAddress, gas: 500000 })
        .on('receipt', (receipt) => {
          if (receipt.status == 1) {
            console.log("✅ Proposal executed successfully");
            resolve({ success: true, transactionHash: receipt.transactionHash });
          } else {
            reject(new Error("Transaction reverted"));
          }
        })
        .on('error', reject);
    });
  } catch (error) {
    console.error("Error executing proposal:", error);
    throw error;
  }
}

/**
 * Cast vote on Native DAO proposal (Arbitrum Sepolia)
 */
export async function castNativeDAOVote({ proposalId, support, userAddress }) {
  try {
    if (!window.ethereum) throw new Error("MetaMask not installed");

    const web3 = new Web3(window.ethereum);
    await window.ethereum.request({ method: "eth_requestAccounts" });
    
    const accounts = await web3.eth.getAccounts();
    const fromAddress = accounts[0];
    
    if (fromAddress.toLowerCase() !== userAddress.toLowerCase()) {
      throw new Error("Connected wallet does not match user address");
    }

    const chainId = await web3.eth.getChainId();
    if (Number(chainId) !== 421614) {
      throw new Error("Please switch to Arbitrum Sepolia network");
    }

    const nativeDAOContract = new web3.eth.Contract(NATIVE_DAO_ABI, NATIVE_DAO_ADDRESS);

    return new Promise((resolve, reject) => {
      nativeDAOContract.methods
        .castVote(proposalId, support)
        .send({ from: fromAddress, gas: 500000 })
        .on('receipt', (receipt) => {
          if (receipt.status == 1) resolve({ success: true, transactionHash: receipt.transactionHash });
          else reject(new Error("Transaction reverted"));
        })
        .on('error', reject);
    });
  } catch (error) {
    throw error;
  }
}

/**
 * Create an oracle creation proposal on Native DAO (Arbitrum Sepolia)
 * Creates proposal to call addSingleOracle on Native Athena
 */
export async function createOracleProposal({
  oracleName,
  shortDescription,
  detailsHash,
  members = [],
  skillVerifiedAddresses = [],
  proposalDescription,
  userAddress
}) {
  try {
    if (!window.ethereum) {
      throw new Error("MetaMask not installed");
    }

    const web3 = new Web3(window.ethereum);
    await window.ethereum.request({ method: "eth_requestAccounts" });
    
    const accounts = await web3.eth.getAccounts();
    const fromAddress = accounts[0];
    
    if (fromAddress.toLowerCase() !== userAddress.toLowerCase()) {
      throw new Error("Connected wallet does not match user address");
    }

    // Check user is on Arbitrum Sepolia
    const chainId = await web3.eth.getChainId();
    if (Number(chainId) !== 421614) {
      throw new Error("Please switch to Arbitrum Sepolia network");
    }

    const nativeDAOContract = new web3.eth.Contract(NATIVE_DAO_ABI, NATIVE_DAO_ADDRESS);

    // Native Athena address (target contract)
    const NATIVE_ATHENA_ADDRESS = "0x098E52Aff44AEAd944AFf86F4A5b90dbAF5B86bd";

    // Encode the addSingleOracle function call
    const web3Instance = new Web3();
    const oracleCalldata = web3Instance.eth.abi.encodeFunctionCall(
      {
        name: 'addSingleOracle',
        type: 'function',
        inputs: [
          { type: 'string', name: '_name' },
          { type: 'address[]', name: '_members' },
          { type: 'string', name: '_shortDescription' },
          { type: 'string', name: '_hashOfDetails' },
          { type: 'address[]', name: '_skillVerifiedAddresses' }
        ]
      },
      [oracleName, members, shortDescription, detailsHash, skillVerifiedAddresses]
    );

    // Prepare proposal parameters
    const targets = [NATIVE_ATHENA_ADDRESS];
    const values = [0];
    const calldatas = [oracleCalldata];

    console.log("=== ORACLE CREATION PROPOSAL PARAMETERS ===");
    console.log("Oracle Name:", oracleName);
    console.log("Short Description:", shortDescription);
    console.log("Details Hash:", detailsHash);
    console.log("Members:", members);
    console.log("Skill Verified:", skillVerifiedAddresses);
    console.log("Native Athena:", NATIVE_ATHENA_ADDRESS);
    console.log("Native DAO:", NATIVE_DAO_ADDRESS);
    console.log("Calldata:", oracleCalldata);
    console.log("Proposal Description:", proposalDescription);

    // Calculate proposal ID deterministically (OpenZeppelin standard method)
    const proposalId = calculateProposalId(targets, values, calldatas, proposalDescription);
    console.log("✅ Calculated Proposal ID (before transaction):", proposalId);

    // Create proposal and wait for confirmation
    return new Promise((resolve, reject) => {
      console.log("[SERVICE TIMING] Creating oracle proposal:", new Date().toISOString());
      
      nativeDAOContract.methods
        .propose(targets, values, calldatas, proposalDescription)
        .send({
          from: fromAddress,
          gas: 500000
        })
        .on('transactionHash', (hash) => {
          console.log("[SERVICE TIMING] transactionHash event fired:", new Date().toISOString());
          console.log("Transaction hash:", hash);
        })
        .on('receipt', async (receipt) => {
          console.log("[SERVICE TIMING] receipt event fired:", new Date().toISOString());
          console.log("Transaction receipt:", receipt);
          console.log("Receipt status:", receipt.status);
          
          // Check if transaction was successful
          if (receipt.status == 1 || receipt.status == "1") {
            console.log("✅ Transaction successful! Using calculated proposal ID:", proposalId);
            
            const result = {
              success: true,
              transactionHash: receipt.transactionHash,
              proposalId
            };
            
            // Save to database
            console.log("💾 Saving oracle proposal to database...");
            const dbSaveResult = await saveProposalToDatabase({
              proposalId: proposalId.toString(),
              chain: 'Arbitrum',
              proposalType: 'Oracle Creation',
              title: `Create Oracle: ${oracleName}`,
              description: proposalDescription,
              proposerAddress: fromAddress,
              recipientAddress: NATIVE_ATHENA_ADDRESS,
              amount: null,
              transactionHash: receipt.transactionHash,
              blockNumber: Number(receipt.blockNumber),
              metadata: {
                oracleName,
                shortDescription,
                detailsHash,
                members,
                skillVerifiedAddresses,
                targets,
                values: values.map(v => typeof v === 'bigint' ? v.toString() : v),
                calldatas
              }
            });
            
            if (dbSaveResult.success) {
              console.log("✅ DATABASE SAVE SUCCESSFUL for proposal:", proposalId);
            } else {
              console.error("❌ DATABASE SAVE FAILED:", dbSaveResult.error);
            }
            
            console.log("Oracle proposal created successfully:", result);
            resolve(result);
          } else {
            console.log("Transaction reverted");
            reject(new Error("Transaction reverted by the blockchain"));
          }
        })
        .on('error', (error) => {
          console.error("Transaction error:", error);
          reject(error);
        });
    });

  } catch (error) {
    console.error("Error creating oracle proposal:", error);
    throw error;
  }
}

/**
 * Create an oracle member recruitment proposal on Native DAO (Arbitrum Sepolia)
 * Creates proposal to call addMembers on Native Athena
 */
export async function createOracleMemberRecruitmentProposal({
  oracleName,
  memberAddress,
  emailOrTelegram,
  reason,
  userAddress
}) {
  try {
    if (!window.ethereum) {
      throw new Error("MetaMask not installed");
    }

    const web3 = new Web3(window.ethereum);
    await window.ethereum.request({ method: "eth_requestAccounts" });
    
    const accounts = await web3.eth.getAccounts();
    const fromAddress = accounts[0];
    
    if (fromAddress.toLowerCase() !== userAddress.toLowerCase()) {
      throw new Error("Connected wallet does not match user address");
    }

    // Check user is on Arbitrum Sepolia
    const chainId = await web3.eth.getChainId();
    if (Number(chainId) !== 421614) {
      throw new Error("Please switch to Arbitrum Sepolia network");
    }

    const nativeDAOContract = new web3.eth.Contract(NATIVE_DAO_ABI, NATIVE_DAO_ADDRESS);

    // Native Athena address (target contract)
    const NATIVE_ATHENA_ADDRESS = "0x098E52Aff44AEAd944AFf86F4A5b90dbAF5B86bd";

    // Encode the addMembers function call
    const web3Instance = new Web3();
    const addMembersCalldata = web3Instance.eth.abi.encodeFunctionCall(
      {
        name: 'addMembers',
        type: 'function',
        inputs: [
          { type: 'address[]', name: '_members' },
          { type: 'string', name: '_oracleName' }
        ]
      },
      [[memberAddress], oracleName]
    );

    // Prepare proposal parameters
    const targets = [NATIVE_ATHENA_ADDRESS];
    const values = [0];
    const calldatas = [addMembersCalldata];

    // Prepare proposal description
    const proposalDescription = `Recruit new member to ${oracleName}\n\nMember: ${memberAddress}\nContact: ${emailOrTelegram}\n\nReason: ${reason}`;

    console.log("=== ORACLE MEMBER RECRUITMENT PROPOSAL PARAMETERS ===");
    console.log("Oracle Name:", oracleName);
    console.log("New Member:", memberAddress);
    console.log("Contact:", emailOrTelegram);
    console.log("Reason:", reason);
    console.log("Native Athena:", NATIVE_ATHENA_ADDRESS);
    console.log("Native DAO:", NATIVE_DAO_ADDRESS);
    console.log("Calldata:", addMembersCalldata);
    console.log("Proposal Description:", proposalDescription);

    // Calculate proposal ID deterministically
    const proposalId = calculateProposalId(targets, values, calldatas, proposalDescription);
    console.log("✅ Calculated Proposal ID (before transaction):", proposalId);

    // Create proposal and wait for confirmation
    return new Promise((resolve, reject) => {
      console.log("[SERVICE TIMING] Creating member recruitment proposal:", new Date().toISOString());
      
      nativeDAOContract.methods
        .propose(targets, values, calldatas, proposalDescription)
        .send({
          from: fromAddress,
          gas: 500000
        })
        .on('transactionHash', (hash) => {
          console.log("[SERVICE TIMING] transactionHash event fired:", new Date().toISOString());
          console.log("Transaction hash:", hash);
        })
        .on('receipt', async (receipt) => {
          console.log("[SERVICE TIMING] receipt event fired:", new Date().toISOString());
          console.log("Transaction receipt:", receipt);
          console.log("Receipt status:", receipt.status);
          
          // Check if transaction was successful
          if (receipt.status == 1 || receipt.status == "1") {
            console.log("✅ Transaction successful! Using calculated proposal ID:", proposalId);
            
            const result = {
              success: true,
              transactionHash: receipt.transactionHash,
              proposalId
            };
            
            // Save to database
            console.log("💾 Saving member recruitment proposal to database...");
            const dbSaveResult = await saveProposalToDatabase({
              proposalId: proposalId.toString(),
              chain: 'Arbitrum',
              proposalType: 'Oracle Member Recruitment',
              title: `Recruit Member to ${oracleName}`,
              description: proposalDescription,
              proposerAddress: fromAddress,
              recipientAddress: NATIVE_ATHENA_ADDRESS,
              amount: null,
              transactionHash: receipt.transactionHash,
              blockNumber: Number(receipt.blockNumber),
              metadata: {
                oracleName,
                memberAddress,
                emailOrTelegram,
                reason,
                targets,
                values: values.map(v => typeof v === 'bigint' ? v.toString() : v),
                calldatas
              }
            });
            
            if (dbSaveResult.success) {
              console.log("✅ DATABASE SAVE SUCCESSFUL for proposal:", proposalId);
            } else {
              console.error("❌ DATABASE SAVE FAILED:", dbSaveResult.error);
            }
            
            console.log("Member recruitment proposal created successfully:", result);
            resolve(result);
          } else {
            console.log("Transaction reverted");
            reject(new Error("Transaction reverted by the blockchain"));
          }
        })
        .on('error', (error) => {
          console.error("Transaction error:", error);
          reject(error);
        });
    });

  } catch (error) {
    console.error("Error creating member recruitment proposal:", error);
    throw error;
  }
}

/**
 * Create an oracle member removal proposal on Native DAO (Arbitrum Sepolia)
 * Creates proposal to call removeMemberFromOracle on Native Athena
 */
export async function createOracleMemberRemovalProposal({
  oracleName,
  memberAddress,
  reason,
  userAddress
}) {
  try {
    if (!window.ethereum) {
      throw new Error("MetaMask not installed");
    }

    const web3 = new Web3(window.ethereum);
    await window.ethereum.request({ method: "eth_requestAccounts" });
    
    const accounts = await web3.eth.getAccounts();
    const fromAddress = accounts[0];
    
    if (fromAddress.toLowerCase() !== userAddress.toLowerCase()) {
      throw new Error("Connected wallet does not match user address");
    }

    // Check user is on Arbitrum Sepolia
    const chainId = await web3.eth.getChainId();
    if (Number(chainId) !== 421614) {
      throw new Error("Please switch to Arbitrum Sepolia network");
    }

    const nativeDAOContract = new web3.eth.Contract(NATIVE_DAO_ABI, NATIVE_DAO_ADDRESS);

    // Native Athena address (target contract)
    const NATIVE_ATHENA_ADDRESS = "0x098E52Aff44AEAd944AFf86F4A5b90dbAF5B86bd";

    // Encode the removeMemberFromOracle function call
    const web3Instance = new Web3();
    const removeMemberCalldata = web3Instance.eth.abi.encodeFunctionCall(
      {
        name: 'removeMemberFromOracle',
        type: 'function',
        inputs: [
          { type: 'string', name: '_oracleName' },
          { type: 'address', name: '_memberToRemove' }
        ]
      },
      [oracleName, memberAddress]
    );

    // Prepare proposal parameters
    const targets = [NATIVE_ATHENA_ADDRESS];
    const values = [0];
    const calldatas = [removeMemberCalldata];

    // Prepare proposal description
    const proposalDescription = `Remove member from ${oracleName}\n\nMember to Remove: ${memberAddress}\n\nReason: ${reason}`;

    console.log("=== ORACLE MEMBER REMOVAL PROPOSAL PARAMETERS ===");
    console.log("Oracle Name:", oracleName);
    console.log("Member to Remove:", memberAddress);
    console.log("Reason:", reason);
    console.log("Native Athena:", NATIVE_ATHENA_ADDRESS);
    console.log("Native DAO:", NATIVE_DAO_ADDRESS);
    console.log("Calldata:", removeMemberCalldata);
    console.log("Proposal Description:", proposalDescription);

    // Calculate proposal ID deterministically
    const proposalId = calculateProposalId(targets, values, calldatas, proposalDescription);
    console.log("✅ Calculated Proposal ID (before transaction):", proposalId);

    // Create proposal and wait for confirmation
    return new Promise((resolve, reject) => {
      console.log("[SERVICE TIMING] Creating member removal proposal:", new Date().toISOString());
      
      nativeDAOContract.methods
        .propose(targets, values, calldatas, proposalDescription)
        .send({
          from: fromAddress,
          gas: 500000
        })
        .on('transactionHash', (hash) => {
          console.log("[SERVICE TIMING] transactionHash event fired:", new Date().toISOString());
          console.log("Transaction hash:", hash);
        })
        .on('receipt', async (receipt) => {
          console.log("[SERVICE TIMING] receipt event fired:", new Date().toISOString());
          console.log("Transaction receipt:", receipt);
          console.log("Receipt status:", receipt.status);
          
          // Check if transaction was successful
          if (receipt.status == 1 || receipt.status == "1") {
            console.log("✅ Transaction successful! Using calculated proposal ID:", proposalId);
            
            const result = {
              success: true,
              transactionHash: receipt.transactionHash,
              proposalId
            };
            
            // Save to database
            console.log("💾 Saving member removal proposal to database...");
            const dbSaveResult = await saveProposalToDatabase({
              proposalId: proposalId.toString(),
              chain: 'Arbitrum',
              proposalType: 'Oracle Member Removal',
              title: `Remove Member from ${oracleName}`,
              description: proposalDescription,
              proposerAddress: fromAddress,
              recipientAddress: NATIVE_ATHENA_ADDRESS,
              amount: null,
              transactionHash: receipt.transactionHash,
              blockNumber: Number(receipt.blockNumber),
              metadata: {
                oracleName,
                memberAddress,
                reason,
                targets,
                values: values.map(v => typeof v === 'bigint' ? v.toString() : v),
                calldatas
              }
            });
            
            if (dbSaveResult.success) {
              console.log("✅ DATABASE SAVE SUCCESSFUL for proposal:", proposalId);
            } else {
              console.error("❌ DATABASE SAVE FAILED:", dbSaveResult.error);
            }
            
            console.log("Member removal proposal created successfully:", result);
            resolve(result);
          } else {
            console.log("Transaction reverted");
            reject(new Error("Transaction reverted by the blockchain"));
          }
        })
        .on('error', (error) => {
          console.error("Transaction error:", error);
          reject(error);
        });
    });

  } catch (error) {
    console.error("Error creating member removal proposal:", error);
    throw error;
  }
}

export default {
  checkMainDAOEligibility,
  checkNativeDAOEligibility,
  estimateMainDAOFee,
  createMainDAOProposal,
  createNativeDAOProposal,
  createUpgradeProposal,
  createOracleProposal,
  createOracleMemberRecruitmentProposal,
  createOracleMemberRemovalProposal,
  createGenericMainDAOProposal,
  castMainDAOVote,
  castNativeDAOVote,
  executeProposal,
  encodeFunctionCall,
  MAIN_DAO_ADDRESS,
  NATIVE_DAO_ADDRESS
};
