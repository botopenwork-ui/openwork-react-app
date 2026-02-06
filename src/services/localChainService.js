/**
 * Local Chain Service
 * 
 * Handles write operations (transactions) to LOWJC and Athena Client contracts
 * on any supported local chain (OP Sepolia, Ethereum Sepolia, future chains).
 * 
 * Architecture:
 * - Detects user's connected chain
 * - Routes transactions to appropriate LOWJC/Athena Client contract
 * - Transactions auto-sync to Arbitrum (Native Chain) via LayerZero
 * - Job data becomes visible on Arbitrum Genesis for all users
 * 
 * Usage:
 * import { postJob, applyToJob, raiseDispute } from './localChainService';
 * await postJob(chainId, userAddress, jobData);
 */

import Web3 from "web3";
import { getChainConfig, isChainAllowed } from "../config/chainConfig";
import LOWJC_ABI from "../ABIs/lowjc-lite_ABI.json";
import ATHENA_CLIENT_ABI from "../ABIs/athena-client_ABI.json";

/**
 * Get LOWJC contract instance for a specific chain
 * @param {number} chainId - Chain ID
 * @returns {object} Web3 contract instance
 * @throws {Error} If chain not allowed or contracts not found
 */
export async function getLOWJCContract(chainId) {
  if (!isChainAllowed(chainId)) {
    const config = getChainConfig(chainId);
    throw new Error(config?.reason || "Transactions not allowed on this chain");
  }
  
  const config = getChainConfig(chainId);
  if (!config || !config.contracts.lowjc) {
    throw new Error(`LOWJC contract not configured for chain ${chainId}`);
  }
  
  const web3 = new Web3(window.ethereum);
  return new web3.eth.Contract(LOWJC_ABI, config.contracts.lowjc);
}

/**
 * Get Athena Client contract instance for a specific chain
 * @param {number} chainId - Chain ID
 * @returns {object} Web3 contract instance
 */
export async function getAthenaClientContract(chainId) {
  if (!isChainAllowed(chainId)) {
    const config = getChainConfig(chainId);
    throw new Error(config?.reason || "Transactions not allowed on this chain");
  }
  
  const config = getChainConfig(chainId);
  if (!config || !config.contracts.athenaClient) {
    throw new Error(`Athena Client contract not configured for chain ${chainId}`);
  }
  
  const web3 = new Web3(window.ethereum);
  return new web3.eth.Contract(ATHENA_CLIENT_ABI, config.contracts.athenaClient);
}

/**
 * Estimate LayerZero fee for cross-chain message
 * @param {number} chainId - Source chain ID
 * @param {string} functionName - Function name (e.g., "postJob")
 * @param {object} payload - Encoded payload
 * @returns {string} Fee in wei
 */
export async function estimateLayerZeroFee(chainId, functionName, payload) {
  try {
    const contract = await getLOWJCContract(chainId);
    const config = getChainConfig(chainId);
    
    // Use quoteSingleChain or similar function if available
    // For now, return a default safe value
    return Web3.utils.toWei("0.001", "ether");
  } catch (error) {
    console.warn("Fee estimation failed, using default:", error);
    return Web3.utils.toWei("0.001", "ether");
  }
}

// ==================== JOB OPERATIONS ====================

/**
 * Post a new job on the user's connected local chain
 * @param {number} chainId - Chain ID where user is connected
 * @param {string} userAddress - User's wallet address
 * @param {object} jobData - Job details
 * @param {string} jobData.jobDetailHash - IPFS hash of job details
 * @param {Array<string>} jobData.descriptions - Milestone descriptions
 * @param {Array<string>} jobData.amounts - Milestone amounts (in USDC units, not wei)
 * @returns {Promise<object>} Transaction receipt
 */
export async function postJob(chainId, userAddress, jobData) {
  try {
    console.log(`Posting job on chain ${chainId} from ${userAddress}`);
    
    const contract = await getLOWJCContract(chainId);
    const config = getChainConfig(chainId);
    
    // Get LayerZero options from config
    const lzOptions = config.layerzero.options;
    const lzFee = await estimateLayerZeroFee(chainId, "postJob", jobData);
    
    // Call LOWJC.postJob()
    const tx = await contract.methods.postJob(
      jobData.jobDetailHash,
      jobData.descriptions,
      jobData.amounts,
      lzOptions
    ).send({
      from: userAddress,
      value: lzFee
    });
    
    console.log(`Job posted successfully on ${config.name}:`, tx.transactionHash);
    console.log("Job will sync to Arbitrum Genesis via LayerZero (~30-60 seconds)");
    
    return tx;
  } catch (error) {
    console.error("Post job error:", error);
    throw error;
  }
}

/**
 * Apply to a job on the user's connected local chain
 * @param {number} chainId - Chain ID
 * @param {string} userAddress - Applicant's address
 * @param {object} applicationData - Application details
 */
export async function applyToJob(chainId, userAddress, applicationData) {
  try {
    console.log(`Applying to job ${applicationData.jobId} on chain ${chainId}`);
    
    const contract = await getLOWJCContract(chainId);
    const config = getChainConfig(chainId);
    
    const lzOptions = config.layerzero.options;
    const lzFee = await estimateLayerZeroFee(chainId, "applyToJob", applicationData);
    
    const tx = await contract.methods.applyToJob(
      applicationData.jobId,
      applicationData.applicationHash,
      applicationData.descriptions,
      applicationData.amounts,
      applicationData.preferredChainDomain || 3, // Default to Arbitrum domain
      lzOptions
    ).send({
      from: userAddress,
      value: lzFee
    });
    
    console.log(`Application submitted on ${config.name}:`, tx.transactionHash);
    return tx;
  } catch (error) {
    console.error("Apply to job error:", error);
    throw error;
  }
}

/**
 * Start a job (requires USDC approval first)
 * @param {number} chainId - Chain ID
 * @param {string} userAddress - Job giver's address
 * @param {object} startData - Job start details
 */
export async function startJob(chainId, userAddress, startData) {
  try {
    console.log(`Starting job ${startData.jobId} on chain ${chainId}`);
    
    const contract = await getLOWJCContract(chainId);
    const config = getChainConfig(chainId);
    
    const lzOptions = config.layerzero.options;
    const lzFee = await estimateLayerZeroFee(chainId, "startJob", startData);
    
    const tx = await contract.methods.startJob(
      startData.jobId,
      startData.applicationId,
      startData.useAppMilestones || false,
      lzOptions
    ).send({
      from: userAddress,
      value: lzFee
    });
    
    console.log(`Job started on ${config.name}:`, tx.transactionHash);
    return tx;
  } catch (error) {
    console.error("Start job error:", error);
    throw error;
  }
}

/**
 * Submit work for a milestone
 */
export async function submitWork(chainId, userAddress, workData) {
  try {
    const contract = await getLOWJCContract(chainId);
    const config = getChainConfig(chainId);
    
    const lzOptions = config.layerzero.options;
    const lzFee = await estimateLayerZeroFee(chainId, "submitWork", workData);
    
    const tx = await contract.methods.submitWork(
      workData.jobId,
      workData.submissionHash,
      lzOptions
    ).send({
      from: userAddress,
      value: lzFee
    });
    
    console.log(`Work submitted on ${config.name}:`, tx.transactionHash);
    return tx;
  } catch (error) {
    console.error("Submit work error:", error);
    throw error;
  }
}

/**
 * Release payment for completed milestone
 */
export async function releasePaymentCrossChain(chainId, userAddress, paymentData) {
  try {
    const contract = await getLOWJCContract(chainId);
    const config = getChainConfig(chainId);
    
    const lzOptions = config.layerzero.options;
    const lzFee = await estimateLayerZeroFee(chainId, "releasePaymentCrossChain", paymentData);
    
    const tx = await contract.methods.releasePaymentCrossChain(
      paymentData.jobId,
      paymentData.targetChainDomain,
      paymentData.targetRecipient,
      lzOptions
    ).send({
      from: userAddress,
      value: lzFee
    });
    
    console.log(`Payment released on ${config.name}:`, tx.transactionHash);
    return tx;
  } catch (error) {
    console.error("Release payment error:", error);
    throw error;
  }
}

// ==================== DISPUTE OPERATIONS ====================

/**
 * Raise a dispute on the user's connected local chain
 * @param {number} chainId - Chain ID
 * @param {string} userAddress - Disputer's address
 * @param {object} disputeData - Dispute details
 */
export async function raiseDispute(chainId, userAddress, disputeData) {
  try {
    console.log(`Raising dispute for job ${disputeData.jobId} on chain ${chainId}`);
    
    const contract = await getAthenaClientContract(chainId);
    const config = getChainConfig(chainId);
    
    const lzOptions = config.layerzero.options;
    const lzFee = await estimateLayerZeroFee(chainId, "raiseDispute", disputeData);
    
    const tx = await contract.methods.raiseDispute(
      disputeData.jobId,
      disputeData.disputeHash,
      disputeData.oracleName,
      disputeData.feeAmount,
      disputeData.disputedAmount,
      lzOptions
    ).send({
      from: userAddress,
      value: lzFee
    });
    
    console.log(`Dispute raised on ${config.name}:`, tx.transactionHash);
    console.log("Dispute will sync to Arbitrum Native Athena via LayerZero");
    return tx;
  } catch (error) {
    console.error("Raise dispute error:", error);
    throw error;
  }
}

// ==================== PROFILE OPERATIONS ====================

/**
 * Create user profile on local chain
 */
export async function createProfile(chainId, userAddress, profileData) {
  try {
    const contract = await getLOWJCContract(chainId);
    const config = getChainConfig(chainId);
    
    const lzOptions = config.layerzero.options;
    const lzFee = await estimateLayerZeroFee(chainId, "createProfile", profileData);
    
    const tx = await contract.methods.createProfile(
      profileData.ipfsHash,
      profileData.referrerAddress || "0x0000000000000000000000000000000000000000",
      lzOptions
    ).send({
      from: userAddress,
      value: lzFee
    });
    
    console.log(`Profile created on ${config.name}:`, tx.transactionHash);
    return tx;
  } catch (error) {
    console.error("Create profile error:", error);
    throw error;
  }
}

/**
 * Add portfolio item
 */
export async function addPortfolio(chainId, userAddress, portfolioHash) {
  try {
    const contract = await getLOWJCContract(chainId);
    const config = getChainConfig(chainId);
    
    const lzOptions = config.layerzero.options;
    const lzFee = await estimateLayerZeroFee(chainId, "addPortfolio", { portfolioHash });
    
    const tx = await contract.methods.addPortfolio(
      portfolioHash,
      lzOptions
    ).send({
      from: userAddress,
      value: lzFee
    });
    
    console.log(`Portfolio added on ${config.name}:`, tx.transactionHash);
    return tx;
  } catch (error) {
    console.error("Add portfolio error:", error);
    throw error;
  }
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Approve USDC for contract spending
 * @param {number} chainId - Chain ID
 * @param {string} userAddress - User's address
 * @param {string} spender - Contract address to approve
 * @param {string} amount - Amount in USDC units (not wei)
 */
export async function approveUSDC(chainId, userAddress, spender, amount) {
  try {
    const config = getChainConfig(chainId);
    if (!config || !config.contracts.usdc) {
      throw new Error("USDC not configured for this chain");
    }
    
    const web3 = new Web3(window.ethereum);
    
    // Standard ERC20 ABI for approve function
    const erc20ABI = [
      {
        "inputs": [
          {"name": "spender", "type": "address"},
          {"name": "amount", "type": "uint256"}
        ],
        "name": "approve",
        "outputs": [{"name": "", "type": "bool"}],
        "stateMutability": "nonpayable",
        "type": "function"
      }
    ];
    
    const usdcContract = new web3.eth.Contract(erc20ABI, config.contracts.usdc);
    
    const tx = await usdcContract.methods.approve(spender, amount).send({
      from: userAddress
    });
    
    console.log(`USDC approved on ${config.name}:`, tx.transactionHash);
    return tx;
  } catch (error) {
    console.error("USDC approval error:", error);
    throw error;
  }
}

/**
 * Check if user is on a supported local chain
 * @param {number} chainId - Chain ID
 * @returns {object} { isSupported, message }
 */
export function validateChain(chainId) {
  const config = getChainConfig(chainId);
  
  if (!config) {
    return {
      isSupported: false,
      message: "This network is not supported. Please switch to OP Sepolia or Ethereum Sepolia."
    };
  }
  
  if (!isChainAllowed(chainId)) {
    return {
      isSupported: false,
      message: config.reason || "Transactions not allowed on this network."
    };
  }
  
  return {
    isSupported: true,
    message: `Connected to ${config.name}`
  };
}

/**
 * Get contract address for current chain
 * @param {number} chainId - Chain ID
 * @param {string} contractType - Contract type ("lowjc", "athenaClient", etc.)
 * @returns {string|null} Contract address or null
 */
export function getContractAddress(chainId, contractType) {
  const config = getChainConfig(chainId);
  return config?.contracts?.[contractType] || null;
}

export default {
  postJob,
  applyToJob,
  startJob,
  submitWork,
  releasePaymentCrossChain,
  raiseDispute,
  createProfile,
  addPortfolio,
  approveUSDC,
  validateChain,
  getContractAddress,
  getLOWJCContract,
  getAthenaClientContract
};
