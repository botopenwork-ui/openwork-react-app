/**
 * Local Chain Service
 * 
 * Handles write operations (transactions) to LOWJC and Athena Client contracts
 * on any supported local chain (Optimism on mainnet, OP Sepolia/Ethereum Sepolia on testnet).
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
import { getChainConfig, isChainAllowed, getLocalChains, buildLzOptions, DESTINATION_GAS_ESTIMATES } from "../config/chainConfig";
import LOWJC_ABI from "../ABIs/lowjc-lite_ABI.json";
import ATHENA_CLIENT_ABI from "../ABIs/athena-client_ABI.json";

// Minimal ABI for LocalBridge quoting
const BRIDGE_QUOTE_ABI = [
  {
    inputs: [
      { type: "bytes", name: "_payload" },
      { type: "bytes", name: "_options"  }
    ],
    name: "quoteNativeChain",
    outputs: [{ type: "uint256", name: "fee" }],
    stateMutability: "view",
    type: "function"
  }
];

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
 * Estimate LayerZero fee by calling quoteNativeChain() on the LocalBridge.
 * Adds a 20% buffer on top of the quote for safety.
 *
 * @param {number} chainId       - Source chain ID
 * @param {string} operationKey  - Key from DESTINATION_GAS_ESTIMATES (e.g. "POST_JOB")
 * @param {object} [extraPayload] - Optional extra params to encode into the quote payload
 * @returns {Promise<string>} Fee in wei (with 20% buffer)
 */
export async function estimateLayerZeroFee(chainId, operationKey, extraPayload = {}) {
  // Safe fallback — never let a quote failure block the user
  const FALLBACK_FEE = Web3.utils.toWei("0.001", "ether");

  try {
    const contract  = await getLOWJCContract(chainId);
    const config    = getChainConfig(chainId);
    const web3      = new Web3(window.ethereum);

    // Pick destination gas for this operation
    const destGasKey = operationKey?.toUpperCase().replace(/-/g, '_');
    const destGas    = DESTINATION_GAS_ESTIMATES[destGasKey] ?? DESTINATION_GAS_ESTIMATES.DEFAULT;
    const nativeOptions = buildLzOptions(destGas);

    // Resolve bridge address from LOWJC
    let bridgeAddress;
    try {
      bridgeAddress = await contract.methods.bridge().call();
    } catch {
      console.warn("[LZ quote] Could not read bridge address — using fallback fee");
      return FALLBACK_FEE;
    }

    const bridgeContract = new web3.eth.Contract(BRIDGE_QUOTE_ABI, bridgeAddress);

    // Generic payload — enough to get an accurate quote
    const encodedPayload = web3.eth.abi.encodeParameters(
      ["string", "address"],
      [operationKey || "generic", extraPayload.userAddress || "0x0000000000000000000000000000000000000000"]
    );

    const rawFee = await bridgeContract.methods.quoteNativeChain(encodedPayload, nativeOptions).call();

    // +20% safety buffer
    const feeWithBuffer = (BigInt(rawFee) * BigInt(120)) / BigInt(100);
    console.log(
      `[LZ quote] ${operationKey}: ${web3.utils.fromWei(rawFee.toString(), "ether")} ETH → ` +
      `+20% buffer = ${web3.utils.fromWei(feeWithBuffer.toString(), "ether")} ETH`
    );

    return feeWithBuffer.toString();
  } catch (err) {
    console.warn(`[LZ quote] Estimation failed for ${operationKey}, using fallback:`, err.message);
    return FALLBACK_FEE;
  }
}

// ==================== JOB OPERATIONS ====================

/**
 * Post a new job on the user's connected local chain
 * @param {number}   chainId    - Chain ID where user is connected
 * @param {string}   userAddress
 * @param {object}   jobData    - { jobDetailHash, descriptions, amounts }
 * @param {Function} [onStatus] - Optional callback(message) for UI status updates
 * @returns {Promise<object>} Transaction receipt
 */
export async function postJob(chainId, userAddress, jobData, onStatus) {
  const emit = onStatus || (() => {});
  try {
    emit("Estimating LayerZero fee...");
    const contract = await getLOWJCContract(chainId);
    const config   = getChainConfig(chainId);
    const lzFee    = await estimateLayerZeroFee(chainId, "POST_JOB", { userAddress });
    const nativeOptions = buildLzOptions(DESTINATION_GAS_ESTIMATES.POST_JOB);

    emit(`Submitting job post on ${config.name} — confirm in wallet...`);
    const tx = await contract.methods.postJob(
      jobData.jobDetailHash,
      jobData.descriptions,
      jobData.amounts,
      nativeOptions
    ).send({ from: userAddress, value: lzFee, gas: 600000 });

    emit(`Transaction confirmed: ${tx.transactionHash}`);
    console.log(`[postJob] confirmed on ${config.name}:`, tx.transactionHash);
    return tx;
  } catch (error) {
    console.error("[postJob] error:", error);
    throw error;
  }
}

/**
 * Apply to a job on the user's connected local chain
 * @param {number}   chainId
 * @param {string}   userAddress
 * @param {object}   applicationData
 * @param {Function} [onStatus]
 */
export async function applyToJob(chainId, userAddress, applicationData, onStatus) {
  const emit = onStatus || (() => {});
  try {
    emit("Estimating LayerZero fee...");
    const contract = await getLOWJCContract(chainId);
    const config   = getChainConfig(chainId);
    const lzFee    = await estimateLayerZeroFee(chainId, "APPLY_JOB", { userAddress });
    const nativeOptions = buildLzOptions(DESTINATION_GAS_ESTIMATES.APPLY_JOB);

    emit(`Submitting application on ${config.name} — confirm in wallet...`);
    const tx = await contract.methods.applyToJob(
      applicationData.jobId,
      applicationData.applicationHash,
      applicationData.descriptions,
      applicationData.amounts,
      applicationData.preferredChainDomain || 3,
      applicationData.preferredPaymentAddress || userAddress,
      nativeOptions
    ).send({ from: userAddress, value: lzFee, gas: 600000 });

    emit(`Application submitted: ${tx.transactionHash}`);
    console.log(`[applyToJob] confirmed on ${config.name}:`, tx.transactionHash);
    return tx;
  } catch (error) {
    console.error("[applyToJob] error:", error);
    throw error;
  }
}

/**
 * Start a job (requires prior USDC approval via approveUSDC)
 * @param {number}   chainId
 * @param {string}   userAddress  - Job giver
 * @param {object}   startData    - { jobId, applicationId, useAppMilestones }
 * @param {Function} [onStatus]
 */
export async function startJob(chainId, userAddress, startData, onStatus) {
  const emit = onStatus || (() => {});
  try {
    emit("Estimating LayerZero fee...");
    const contract = await getLOWJCContract(chainId);
    const config   = getChainConfig(chainId);
    const lzFee    = await estimateLayerZeroFee(chainId, "START_JOB", { userAddress });
    const nativeOptions = buildLzOptions(DESTINATION_GAS_ESTIMATES.START_JOB);

    emit(`Starting job on ${config.name} — confirm in wallet...`);
    const tx = await contract.methods.startJob(
      startData.jobId,
      startData.applicationId,
      startData.useAppMilestones || false,
      nativeOptions
    ).send({ from: userAddress, value: lzFee, gas: 1000000 });

    emit(`Job started: ${tx.transactionHash}`);
    console.log(`[startJob] confirmed on ${config.name}:`, tx.transactionHash);
    return tx;
  } catch (error) {
    console.error("[startJob] error:", error);
    throw error;
  }
}

/**
 * Submit work for a milestone
 * @param {number}   chainId
 * @param {string}   userAddress
 * @param {object}   workData     - { jobId, submissionHash }
 * @param {Function} [onStatus]
 */
export async function submitWork(chainId, userAddress, workData, onStatus) {
  const emit = onStatus || (() => {});
  try {
    emit("Estimating LayerZero fee...");
    const contract = await getLOWJCContract(chainId);
    const config   = getChainConfig(chainId);
    const lzFee    = await estimateLayerZeroFee(chainId, "DEFAULT", { userAddress });
    const nativeOptions = buildLzOptions(DESTINATION_GAS_ESTIMATES.DEFAULT);

    emit(`Submitting work on ${config.name} — confirm in wallet...`);
    const tx = await contract.methods.submitWork(
      workData.jobId,
      workData.submissionHash,
      nativeOptions
    ).send({ from: userAddress, value: lzFee, gas: 600000 });

    emit(`Work submitted: ${tx.transactionHash}`);
    console.log(`[submitWork] confirmed on ${config.name}:`, tx.transactionHash);
    return tx;
  } catch (error) {
    console.error("[submitWork] error:", error);
    throw error;
  }
}

/**
 * Release payment for completed milestone
 * @param {number}   chainId
 * @param {string}   userAddress
 * @param {object}   paymentData  - { jobId, targetChainDomain, targetRecipient }
 * @param {Function} [onStatus]
 */
export async function releasePaymentCrossChain(chainId, userAddress, paymentData, onStatus) {
  const emit = onStatus || (() => {});
  try {
    emit("Estimating LayerZero fee...");
    const contract = await getLOWJCContract(chainId);
    const config   = getChainConfig(chainId);
    const lzFee    = await estimateLayerZeroFee(chainId, "RELEASE_PAYMENT", { userAddress });
    const nativeOptions = buildLzOptions(DESTINATION_GAS_ESTIMATES.RELEASE_PAYMENT);

    emit(`Releasing payment on ${config.name} — confirm in wallet...`);
    const tx = await contract.methods.releasePaymentCrossChain(
      paymentData.jobId,
      paymentData.targetChainDomain,
      paymentData.targetRecipient,
      nativeOptions
    ).send({ from: userAddress, value: lzFee, gas: 800000 });

    emit(`Payment release confirmed: ${tx.transactionHash}`);
    console.log(`[releasePayment] confirmed on ${config.name}:`, tx.transactionHash);
    return tx;
  } catch (error) {
    console.error("[releasePayment] error:", error);
    throw error;
  }
}

// ==================== DISPUTE OPERATIONS ====================

/**
 * Raise a dispute on the user's connected local chain
 * @param {number}   chainId
 * @param {string}   userAddress
 * @param {object}   disputeData  - { jobId, disputeHash, oracleName, feeAmount, disputedAmount }
 * @param {Function} [onStatus]
 */
export async function raiseDispute(chainId, userAddress, disputeData, onStatus) {
  const emit = onStatus || (() => {});
  try {
    emit("Estimating LayerZero fee...");
    const contract = await getAthenaClientContract(chainId);
    const config   = getChainConfig(chainId);
    const lzFee    = await estimateLayerZeroFee(chainId, "DEFAULT", { userAddress });
    const nativeOptions = buildLzOptions(DESTINATION_GAS_ESTIMATES.DEFAULT);

    emit(`Raising dispute on ${config.name} — confirm in wallet...`);
    const tx = await contract.methods.raiseDispute(
      disputeData.jobId,
      disputeData.disputeHash,
      disputeData.oracleName,
      disputeData.feeAmount,
      disputeData.disputedAmount,
      nativeOptions
    ).send({ from: userAddress, value: lzFee });

    emit(`Dispute submitted: ${tx.transactionHash}`);
    console.log(`[raiseDispute] confirmed on ${config.name}:`, tx.transactionHash);
    return tx;
  } catch (error) {
    console.error("[raiseDispute] error:", error);
    throw error;
  }
}

// ==================== PROFILE OPERATIONS ====================

/**
 * Create user profile on local chain
 * @param {number}   chainId
 * @param {string}   userAddress
 * @param {object}   profileData  - { ipfsHash, referrerAddress }
 * @param {Function} [onStatus]
 */
export async function createProfile(chainId, userAddress, profileData, onStatus) {
  const emit = onStatus || (() => {});
  try {
    emit("Estimating LayerZero fee...");
    const contract = await getLOWJCContract(chainId);
    const config   = getChainConfig(chainId);
    const lzFee    = await estimateLayerZeroFee(chainId, "DEFAULT", { userAddress });
    const nativeOptions = buildLzOptions(DESTINATION_GAS_ESTIMATES.DEFAULT);

    emit(`Creating profile on ${config.name} — confirm in wallet...`);
    const tx = await contract.methods.createProfile(
      profileData.ipfsHash,
      profileData.referrerAddress || "0x0000000000000000000000000000000000000000",
      nativeOptions
    ).send({ from: userAddress, value: lzFee });

    emit(`Profile created: ${tx.transactionHash}`);
    console.log(`[createProfile] confirmed on ${config.name}:`, tx.transactionHash);
    return tx;
  } catch (error) {
    console.error("[createProfile] error:", error);
    throw error;
  }
}

/**
 * Add portfolio item
 * @param {number}   chainId
 * @param {string}   userAddress
 * @param {string}   portfolioHash
 * @param {Function} [onStatus]
 */
export async function addPortfolio(chainId, userAddress, portfolioHash, onStatus) {
  const emit = onStatus || (() => {});
  try {
    emit("Estimating LayerZero fee...");
    const contract = await getLOWJCContract(chainId);
    const config   = getChainConfig(chainId);
    const lzFee    = await estimateLayerZeroFee(chainId, "DEFAULT", { userAddress });
    const nativeOptions = buildLzOptions(DESTINATION_GAS_ESTIMATES.DEFAULT);

    emit(`Adding portfolio on ${config.name} — confirm in wallet...`);
    const tx = await contract.methods.addPortfolio(
      portfolioHash,
      nativeOptions
    ).send({ from: userAddress, value: lzFee });

    emit(`Portfolio added: ${tx.transactionHash}`);
    console.log(`[addPortfolio] confirmed on ${config.name}:`, tx.transactionHash);
    return tx;
  } catch (error) {
    console.error("[addPortfolio] error:", error);
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
      from: userAddress,
      gas: 100000
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
    const localChains = getLocalChains();
    const chainNames = localChains.map(c => c.name).join(' or ');
    return {
      isSupported: false,
      message: `This network is not supported. Please switch to ${chainNames || 'a supported network'}.`
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
