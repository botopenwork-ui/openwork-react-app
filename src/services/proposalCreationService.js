import Web3 from "web3";
import { getNativeChain, getMainChain, isMainnet } from "../config/chainConfig";

// Get addresses dynamically based on network mode
function getAddresses() {
  const nativeChain = getNativeChain();
  const mainChain = getMainChain();
  return {
    MAIN_DAO_ADDRESS: mainChain?.contracts?.mainDAO,
    NATIVE_DAO_ADDRESS: nativeChain?.contracts?.nativeDAO,
    MAIN_BRIDGE_ADDRESS: mainChain?.contracts?.mainBridge,
    NATIVE_ATHENA_ADDRESS: nativeChain?.contracts?.nativeAthena,
    ORACLE_MANAGER_ADDRESS: nativeChain?.contracts?.oracleManager
  };
}

// Backend API URL
const BACKEND_API_URL = import.meta.env.VITE_BACKEND_API_URL || '';

// Get RPC URLs dynamically based on network mode
function getRpcUrls() {
  if (isMainnet()) {
    return {
      MAIN_CHAIN_RPC: import.meta.env.VITE_ETHEREUM_MAINNET_RPC_URL, // Ethereum on mainnet
      ARBITRUM_RPC: import.meta.env.VITE_ARBITRUM_MAINNET_RPC_URL
    };
  }
  return {
    MAIN_CHAIN_RPC: import.meta.env.VITE_BASE_SEPOLIA_RPC_URL, // Base on testnet
    ARBITRUM_RPC: import.meta.env.VITE_ARBITRUM_SEPOLIA_RPC_URL
  };
}

// LayerZero options for Main DAO cross-chain messaging
const LAYERZERO_OPTIONS = import.meta.env.VITE_LAYERZERO_OPTIONS_VALUE || "0x000301001101000000000000000000000000000aae60";

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
    // Mainnet Native DAO uses getUserGovernancePower (not getGovernanceEligibility)
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "getUserGovernancePower",
    outputs: [
      { internalType: "uint256", name: "stakeAmount", type: "uint256" },
      { internalType: "uint256", name: "earnedTokens", type: "uint256" },
      { internalType: "bool", name: "canProposeFlag", type: "bool" },
      { internalType: "bool", name: "canVoteFlag", type: "bool" }
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
 * Initialize Web3 and Main DAO contract (Ethereum mainnet / Base testnet)
 */
function initializeMainDAO() {
  const { MAIN_CHAIN_RPC } = getRpcUrls();
  const { MAIN_DAO_ADDRESS } = getAddresses();
  const web3 = new Web3(MAIN_CHAIN_RPC);
  const mainDAOContract = new web3.eth.Contract(MAIN_DAO_ABI, MAIN_DAO_ADDRESS);
  return { web3, mainDAOContract };
}

/**
 * Initialize Web3 and Native DAO contract (Arbitrum One mainnet / Arbitrum Sepolia testnet)
 */
function initializeNativeDAO() {
  const { ARBITRUM_RPC } = getRpcUrls();
  const { NATIVE_DAO_ADDRESS } = getAddresses();
  const web3 = new Web3(ARBITRUM_RPC);
  const nativeDAOContract = new web3.eth.Contract(NATIVE_DAO_ABI, NATIVE_DAO_ADDRESS);
  return { web3, nativeDAOContract };
}

/**
 * Check if user is eligible to propose on Main DAO
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
 * Check if user is eligible to propose on Native DAO (Arbitrum One mainnet / Arbitrum Sepolia testnet)
 * Note: Mainnet contract uses getUserGovernancePower function
 */
export async function checkNativeDAOEligibility(userAddress) {
  try {
    const { nativeDAOContract } = initializeNativeDAO();
    // Mainnet uses getUserGovernancePower with return order: stakeAmount, earnedTokens, canProposeFlag, canVoteFlag
    const eligibility = await nativeDAOContract.methods.getUserGovernancePower(userAddress).call();

    return {
      canPropose: eligibility.canProposeFlag,
      canVote: eligibility.canVoteFlag,
      stakeAmount: eligibility.stakeAmount,
      rewardTokens: eligibility.earnedTokens
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

    // Check user is on the correct main chain (Ethereum mainnet / Base Sepolia testnet)
    const chainId = await web3.eth.getChainId();
    const expectedMainChainId = isMainnet() ? 1 : 84532; // Ethereum mainnet or Base Sepolia
    const mainChainName = isMainnet() ? "Ethereum" : "Base Sepolia";
    if (Number(chainId) !== expectedMainChainId) {
      throw new Error(`Please switch to ${mainChainName} network`);
    }

    // Get dynamic addresses
    const { MAIN_DAO_ADDRESS } = getAddresses();
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


    // Calculate proposal ID deterministically (OpenZeppelin standard method)
    const proposalId = calculateProposalId(targets, values, calldatas, description);

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
        })
        .on('receipt', async (receipt) => {
          
          // Check if transaction was successful (status: 1 or "1")
          if (receipt.status == 1 || receipt.status == "1") {
            
            const result = {
              success: true,
              transactionHash: receipt.transactionHash,
              proposalId
            };
            
            // Save to database
            await saveProposalToDatabase({
              proposalId: BigInt(proposalId).toString(), // Convert hex to decimal to match blockchain format
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
            
            resolve(result);
          } else {
            // Transaction reverted (status: 0 or "0")
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

    // Check user is on the correct native chain (Arbitrum One mainnet / Arbitrum Sepolia testnet)
    const chainId = await web3.eth.getChainId();
    const expectedNativeChainId = isMainnet() ? 42161 : 421614;
    const nativeChainName = isMainnet() ? "Arbitrum One" : "Arbitrum Sepolia";
    if (Number(chainId) !== expectedNativeChainId) {
      throw new Error(`Please switch to ${nativeChainName} network`);
    }

    // Get dynamic addresses
    const { NATIVE_DAO_ADDRESS } = getAddresses();
    const nativeDAOContract = new web3.eth.Contract(NATIVE_DAO_ABI, NATIVE_DAO_ADDRESS);


    // Create proposal (no LayerZero options needed)
    const tx = await nativeDAOContract.methods
      .propose(targets, values, calldatas, description)
      .send({
        from: fromAddress,
        gas: 500000
      });

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

    // Check user is on the correct main chain (Ethereum mainnet / Base Sepolia testnet)
    const chainId = await web3.eth.getChainId();
    const expectedMainChainId = isMainnet() ? 1 : 84532;
    const mainChainName = isMainnet() ? "Ethereum" : "Base Sepolia";
    if (Number(chainId) !== expectedMainChainId) {
      throw new Error(`Please switch to ${mainChainName} network`);
    }

    // Get dynamic addresses
    const { MAIN_DAO_ADDRESS } = getAddresses();
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


    // Calculate proposal ID deterministically (OpenZeppelin standard method)
    const proposalId = calculateProposalId(targets, values, calldatas, description);

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
        })
        .on('receipt', async (receipt) => {
          
          // Check if transaction was successful
          if (receipt.status == 1 || receipt.status == "1") {
            
            const result = {
              success: true,
              transactionHash: receipt.transactionHash,
              proposalId
            };
            
            // Save to database
            const dbSaveResult = await saveProposalToDatabase({
              proposalId: BigInt(proposalId).toString(), // Convert hex to decimal to match blockchain format
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
            } else {
              console.error("❌ DATABASE SAVE FAILED:", dbSaveResult.error);
            }
            
            resolve(result);
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

    // Check user is on the correct main chain (Ethereum mainnet / Base Sepolia testnet)
    const chainId = await web3.eth.getChainId();
    const expectedMainChainId = isMainnet() ? 1 : 84532;
    const mainChainName = isMainnet() ? "Ethereum" : "Base Sepolia";
    if (Number(chainId) !== expectedMainChainId) {
      throw new Error(`Please switch to ${mainChainName} network`);
    }

    // Get dynamic addresses
    const { MAIN_DAO_ADDRESS } = getAddresses();
    const mainDAOContract = new web3.eth.Contract(MAIN_DAO_ABI, MAIN_DAO_ADDRESS);

    // Estimate LayerZero fee
    const fee = await mainDAOContract.methods
      .quoteGovernanceNotification(fromAddress, LAYERZERO_OPTIONS)
      .call();


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
        })
        .on('receipt', (receipt) => {
          
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

    // Check user is on the correct main chain (Ethereum mainnet / Base Sepolia testnet)
    const chainId = await web3.eth.getChainId();
    const expectedMainChainId = isMainnet() ? 1 : 84532;
    const mainChainName = isMainnet() ? "Ethereum" : "Base Sepolia";
    if (Number(chainId) !== expectedMainChainId) {
      throw new Error(`Please switch to ${mainChainName} network`);
    }

    // Get dynamic addresses
    const { MAIN_DAO_ADDRESS } = getAddresses();
    const mainDAOContract = new web3.eth.Contract(MAIN_DAO_ABI, MAIN_DAO_ADDRESS);
    const fee = await mainDAOContract.methods.quoteGovernanceNotification(fromAddress, LAYERZERO_OPTIONS).call();

    return new Promise((resolve, reject) => {
      let resolved = false;

      const handleError = (error) => {
        if (resolved) return;
        resolved = true;
        console.error("Main DAO vote error:", error);
        if (error.code === 4001 || error.message?.includes('User denied') || error.message?.includes('rejected')) {
          reject(new Error("Transaction rejected by user"));
        } else {
          reject(error);
        }
      };

      mainDAOContract.methods
        .castVote(proposalId, support, LAYERZERO_OPTIONS)
        .send({ from: fromAddress, value: fee, gas: 500000 })
        .on('receipt', (receipt) => {
          if (resolved) return;
          resolved = true;
          if (receipt.status == 1) resolve({ success: true, transactionHash: receipt.transactionHash });
          else reject(new Error("Transaction reverted"));
        })
        .on('error', handleError)
        .catch(handleError);
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

    // Determine chain type and required chain ID
    // On mainnet: Main chain is Ethereum (1), Native chain is Arbitrum (42161)
    // On testnet: Main chain is Base (84532), Native chain is Arbitrum Sepolia (421614)
    const isMainChain = chain === 'Base' || chain === 'Ethereum';
    const requiredChainId = isMainChain
      ? (isMainnet() ? 1 : 84532)
      : (isMainnet() ? 42161 : 421614);
    const chainId = await web3.eth.getChainId();
    const expectedChainName = isMainChain
      ? (isMainnet() ? "Ethereum" : "Base Sepolia")
      : (isMainnet() ? "Arbitrum One" : "Arbitrum Sepolia");

    if (Number(chainId) !== requiredChainId) {
      throw new Error(`Please switch to ${expectedChainName} network`);
    }

    // Hash the description
    const descriptionHash = web3.utils.keccak256(description);

    // Get dynamic addresses
    const { MAIN_DAO_ADDRESS, NATIVE_DAO_ADDRESS } = getAddresses();
    const daoContract = new web3.eth.Contract(
      isMainChain ? MAIN_DAO_ABI : NATIVE_DAO_ABI,
      isMainChain ? MAIN_DAO_ADDRESS : NATIVE_DAO_ADDRESS
    );


    // Estimate gas instead of using hardcoded value
    const executeMethod = daoContract.methods.execute(targets, values, calldatas, descriptionHash);
    const estimatedGas = await executeMethod.estimateGas({ from: fromAddress });
    const gasLimit = Math.ceil(Number(estimatedGas) * 1.2); // Add 20% buffer

    return new Promise((resolve, reject) => {
      let resolved = false;

      const handleError = (error) => {
        if (resolved) return;
        resolved = true;
        console.error("Execute transaction error:", error);
        // Handle user rejection specifically
        if (error.code === 4001 || error.message?.includes('User denied') || error.message?.includes('rejected')) {
          reject(new Error("Transaction rejected by user"));
        } else {
          reject(error);
        }
      };

      executeMethod
        .send({ from: fromAddress, gas: gasLimit })
        .on('receipt', (receipt) => {
          if (resolved) return;
          resolved = true;
          if (receipt.status == 1) {
            resolve({ success: true, transactionHash: receipt.transactionHash });
          } else {
            reject(new Error("Transaction reverted"));
          }
        })
        .on('error', handleError)
        .catch(handleError); // Catch rejections that don't go through .on('error')
    });
  } catch (error) {
    console.error("Error executing proposal:", error);
    throw error;
  }
}

/**
 * Cast vote on Native DAO proposal (Arbitrum One mainnet / Arbitrum Sepolia testnet)
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

    // Check user is on the correct native chain (Arbitrum One mainnet / Arbitrum Sepolia testnet)
    const chainId = await web3.eth.getChainId();
    const expectedChainId = isMainnet() ? 42161 : 421614;
    const networkName = isMainnet() ? "Arbitrum One" : "Arbitrum Sepolia";
    if (Number(chainId) !== expectedChainId) {
      throw new Error(`Please switch to ${networkName} network`);
    }

    // Get dynamic addresses
    const { NATIVE_DAO_ADDRESS } = getAddresses();
    const nativeDAOContract = new web3.eth.Contract(NATIVE_DAO_ABI, NATIVE_DAO_ADDRESS);

    return new Promise((resolve, reject) => {
      let resolved = false;

      const handleError = (error) => {
        if (resolved) return;
        resolved = true;
        console.error("Vote transaction error:", error);
        if (error.code === 4001 || error.message?.includes('User denied') || error.message?.includes('rejected')) {
          reject(new Error("Transaction rejected by user"));
        } else {
          reject(error);
        }
      };

      nativeDAOContract.methods
        .castVote(proposalId, support)
        .send({ from: fromAddress, gas: 500000 })
        .on('receipt', (receipt) => {
          if (resolved) return;
          resolved = true;
          if (receipt.status == 1) resolve({ success: true, transactionHash: receipt.transactionHash });
          else reject(new Error("Transaction reverted"));
        })
        .on('error', handleError)
        .catch(handleError);
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

    // Check user is on the correct native chain (Arbitrum One for mainnet, Arbitrum Sepolia for testnet)
    const chainId = await web3.eth.getChainId();
    const expectedChainId = isMainnet() ? 42161 : 421614;
    const networkName = isMainnet() ? "Arbitrum One" : "Arbitrum Sepolia";
    if (Number(chainId) !== expectedChainId) {
      throw new Error(`Please switch to ${networkName} network`);
    }

    // Get dynamic addresses
    const { NATIVE_DAO_ADDRESS, ORACLE_MANAGER_ADDRESS } = getAddresses();
    const nativeDAOContract = new web3.eth.Contract(NATIVE_DAO_ABI, NATIVE_DAO_ADDRESS);

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

    // Prepare proposal parameters - target OracleManager (NOT NativeAthena)
    const targets = [ORACLE_MANAGER_ADDRESS];
    const values = [0];
    const calldatas = [oracleCalldata];


    // Calculate proposal ID deterministically (OpenZeppelin standard method)
    const proposalId = calculateProposalId(targets, values, calldatas, proposalDescription);

    // Create proposal and wait for confirmation
    return new Promise((resolve, reject) => {

      let txHash = null;
      let resolved = false;

      // Helper function to save and resolve
      const saveAndResolve = async (transactionHash, blockNumber = null) => {
        if (resolved) return;
        resolved = true;

        const result = {
          success: true,
          transactionHash,
          proposalId
        };

        // Save to database
        const dbSaveResult = await saveProposalToDatabase({
          proposalId: BigInt(proposalId).toString(), // Convert hex to decimal to match blockchain format
          chain: 'Arbitrum',
          proposalType: 'Oracle Creation',
          title: `Create Oracle: ${oracleName}`,
          description: proposalDescription,
          proposerAddress: fromAddress,
          recipientAddress: ORACLE_MANAGER_ADDRESS,
          amount: null,
          transactionHash,
          blockNumber: blockNumber ? Number(blockNumber) : null,
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
        } else {
          console.error("❌ DATABASE SAVE FAILED:", dbSaveResult.error);
        }

        resolve(result);
      };

      nativeDAOContract.methods
        .propose(targets, values, calldatas, proposalDescription)
        .send({
          from: fromAddress,
          gas: 500000
        })
        .on('transactionHash', (hash) => {
          txHash = hash;
        })
        .on('receipt', async (receipt) => {

          // Check if transaction was successful
          if (receipt.status == 1 || receipt.status == "1") {
            await saveAndResolve(receipt.transactionHash, receipt.blockNumber);
          } else {
            reject(new Error("Transaction reverted by the blockchain"));
          }
        })
        .on('error', async (error) => {
          console.error("Transaction error:", error);

          // Handle timeout errors - if we have a txHash, the transaction was sent
          // and likely succeeded on-chain even if we timed out waiting for receipt
          if (txHash && (error.message?.includes('timeout') || error.message?.includes('Timeout') || error.name === 'TransactionBlockTimeoutError')) {
            await saveAndResolve(txHash);
          } else {
            reject(error);
          }
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
  userAddress,
  attachments = []
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

    // Check user is on the correct native chain (Arbitrum One for mainnet, Arbitrum Sepolia for testnet)
    const chainId = await web3.eth.getChainId();
    const expectedChainId = isMainnet() ? 42161 : 421614;
    const networkName = isMainnet() ? "Arbitrum One" : "Arbitrum Sepolia";
    if (Number(chainId) !== expectedChainId) {
      throw new Error(`Please switch to ${networkName} network`);
    }

    // Get dynamic addresses
    const { NATIVE_DAO_ADDRESS, ORACLE_MANAGER_ADDRESS } = getAddresses();
    const nativeDAOContract = new web3.eth.Contract(NATIVE_DAO_ABI, NATIVE_DAO_ADDRESS);

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

    // Prepare proposal parameters - target OracleManager (NOT NativeAthena)
    const targets = [ORACLE_MANAGER_ADDRESS];
    const values = [0];
    const calldatas = [addMembersCalldata];

    // Prepare proposal description
    const proposalDescription = `Recruit new member to ${oracleName}\n\nMember: ${memberAddress}\nContact: ${emailOrTelegram}\n\nReason: ${reason}`;


    // Calculate proposal ID deterministically
    const proposalId = calculateProposalId(targets, values, calldatas, proposalDescription);

    // Create proposal and wait for confirmation
    return new Promise((resolve, reject) => {

      let txHash = null;
      let resolved = false;

      // Helper function to save and resolve
      const saveAndResolve = async (transactionHash, blockNumber = null) => {
        if (resolved) return;
        resolved = true;

        const result = {
          success: true,
          transactionHash,
          proposalId
        };

        // Save to database
        const dbSaveResult = await saveProposalToDatabase({
          proposalId: BigInt(proposalId).toString(), // Convert hex to decimal to match blockchain format
          chain: 'Arbitrum',
          proposalType: 'Oracle Member Recruitment',
          title: `Recruit Member to ${oracleName}`,
          description: proposalDescription,
          proposerAddress: fromAddress,
          recipientAddress: ORACLE_MANAGER_ADDRESS,
          amount: null,
          transactionHash,
          blockNumber: blockNumber ? Number(blockNumber) : null,
          metadata: {
            oracleName,
            memberAddress,
            emailOrTelegram,
            reason,
            attachments,
            targets,
            values: values.map(v => typeof v === 'bigint' ? v.toString() : v),
            calldatas
          }
        });

        if (dbSaveResult.success) {
        } else {
          console.error("❌ DATABASE SAVE FAILED:", dbSaveResult.error);
        }

        resolve(result);
      };

      nativeDAOContract.methods
        .propose(targets, values, calldatas, proposalDescription)
        .send({
          from: fromAddress,
          gas: 500000
        })
        .on('transactionHash', (hash) => {
          txHash = hash;
        })
        .on('receipt', async (receipt) => {

          // Check if transaction was successful
          if (receipt.status == 1 || receipt.status == "1") {
            await saveAndResolve(receipt.transactionHash, receipt.blockNumber);
          } else {
            reject(new Error("Transaction reverted by the blockchain"));
          }
        })
        .on('error', async (error) => {
          console.error("Transaction error:", error);

          // Handle timeout errors - if we have a txHash, the transaction was sent
          // and likely succeeded on-chain even if we timed out waiting for receipt
          if (txHash && (error.message?.includes('timeout') || error.message?.includes('Timeout') || error.name === 'TransactionBlockTimeoutError')) {
            await saveAndResolve(txHash);
          } else {
            reject(error);
          }
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

    // Check user is on the correct native chain (Arbitrum One for mainnet, Arbitrum Sepolia for testnet)
    const chainId = await web3.eth.getChainId();
    const expectedChainId = isMainnet() ? 42161 : 421614;
    const networkName = isMainnet() ? "Arbitrum One" : "Arbitrum Sepolia";
    if (Number(chainId) !== expectedChainId) {
      throw new Error(`Please switch to ${networkName} network`);
    }

    // Get dynamic addresses
    const { NATIVE_DAO_ADDRESS, ORACLE_MANAGER_ADDRESS } = getAddresses();
    const nativeDAOContract = new web3.eth.Contract(NATIVE_DAO_ABI, NATIVE_DAO_ADDRESS);

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

    // Prepare proposal parameters - target OracleManager (NOT NativeAthena)
    const targets = [ORACLE_MANAGER_ADDRESS];
    const values = [0];
    const calldatas = [removeMemberCalldata];

    // Prepare proposal description
    const proposalDescription = `Remove member from ${oracleName}\n\nMember to Remove: ${memberAddress}\n\nReason: ${reason}`;


    // Calculate proposal ID deterministically
    const proposalId = calculateProposalId(targets, values, calldatas, proposalDescription);

    // Create proposal and wait for confirmation
    return new Promise((resolve, reject) => {
      
      nativeDAOContract.methods
        .propose(targets, values, calldatas, proposalDescription)
        .send({
          from: fromAddress,
          gas: 500000
        })
        .on('transactionHash', (hash) => {
        })
        .on('receipt', async (receipt) => {
          
          // Check if transaction was successful
          if (receipt.status == 1 || receipt.status == "1") {
            
            const result = {
              success: true,
              transactionHash: receipt.transactionHash,
              proposalId
            };
            
            // Save to database
            const dbSaveResult = await saveProposalToDatabase({
              proposalId: BigInt(proposalId).toString(), // Convert hex to decimal to match blockchain format
              chain: 'Arbitrum',
              proposalType: 'Oracle Member Removal',
              title: `Remove Member from ${oracleName}`,
              description: proposalDescription,
              proposerAddress: fromAddress,
              recipientAddress: ORACLE_MANAGER_ADDRESS,
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
            } else {
              console.error("❌ DATABASE SAVE FAILED:", dbSaveResult.error);
            }
            
            resolve(result);
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
  getAddresses // Export for consumers that need addresses dynamically
};
