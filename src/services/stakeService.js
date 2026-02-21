import Web3 from "web3";
import { getMainChain, isMainnet } from "../config/chainConfig";

// Get addresses dynamically based on network mode
function getAddresses() {
  const mainChain = getMainChain();
  return {
    MAIN_DAO_ADDRESS: mainChain?.contracts?.mainDAO,
    OW_TOKEN_ADDRESS: mainChain?.contracts?.openworkToken
  };
}

// Get RPC URL dynamically (Ethereum mainnet / Base Sepolia testnet)
function getMainChainRpc() {
  return isMainnet()
    ? import.meta.env.VITE_ETHEREUM_MAINNET_RPC_URL
    : import.meta.env.VITE_BASE_SEPOLIA_RPC_URL;
}

// LayerZero options (from env with fallback)
const LAYERZERO_OPTIONS_VALUE = import.meta.env.VITE_LAYERZERO_OPTIONS_VALUE || "0x000301001101000000000000000000000000000aae60";

// Minimum stake: 100 OW tokens
const MIN_STAKE = "100000000000000000000"; // 100 * 10^18

// ERC20 ABI (minimal for approve and balanceOf)
const ERC20_ABI = [
  {
    "inputs": [{"type": "address", "name": "spender"}, {"type": "uint256", "name": "amount"}],
    "name": "approve",
    "outputs": [{"type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"type": "address", "name": "account"}],
    "name": "balanceOf",
    "outputs": [{"type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"type": "address", "name": "owner"}, {"type": "address", "name": "spender"}],
    "name": "allowance",
    "outputs": [{"type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
];

// Lighter LZ options for unstake cross-chain sync (250k dest gas)
const UNSTAKE_LZ_OPTIONS = "0x0003010011010000000000000000000000000003D090";

// Main DAO ABI (stake + unstake functions)
const MAIN_DAO_ABI = [
  {
    "inputs": [
      {"type": "uint256", "name": "amount"},
      {"type": "uint256", "name": "durationMinutes"},
      {"type": "bytes", "name": "_options"}
    ],
    "name": "stake",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [{"type": "bytes", "name": "_options"}],
    "name": "unstake",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {"type": "address", "name": "account"},
      {"type": "bytes", "name": "_options"}
    ],
    "name": "quoteGovernanceNotification",
    "outputs": [{"type": "uint256", "name": "fee"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"type": "address", "name": "staker"},
      {"type": "bool", "name": "isActive"},
      {"type": "bytes", "name": "_options"}
    ],
    "name": "quoteStakeUpdate",
    "outputs": [{"type": "uint256", "name": "fee"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"type": "address", "name": "staker"}],
    "name": "getStakerInfo",
    "outputs": [
      {"type": "uint256", "name": "amount"},
      {"type": "uint256", "name": "unlockTime"},
      {"type": "uint256", "name": "durationMinutes"},
      {"type": "bool", "name": "hasStake"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"type": "address", "name": "staker"}],
    "name": "getUnstakeAvailableTime",
    "outputs": [{"type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
];

/**
 * Get user's OW token balance
 */
export async function getTokenBalance(userAddress) {
  try {
    const MAIN_CHAIN_RPC = getMainChainRpc();
    const { OW_TOKEN_ADDRESS } = getAddresses();
    const web3 = new Web3(MAIN_CHAIN_RPC);
    const tokenContract = new web3.eth.Contract(ERC20_ABI, OW_TOKEN_ADDRESS);

    const balance = await tokenContract.methods.balanceOf(userAddress).call();
    return balance.toString();
  } catch (error) {
    console.error("Error fetching token balance:", error);
    throw new Error(`Failed to fetch balance: ${error.message}`);
  }
}

/**
 * Check if user has approved enough tokens
 */
export async function checkAllowance(userAddress, amount) {
  try {
    const MAIN_CHAIN_RPC = getMainChainRpc();
    const { OW_TOKEN_ADDRESS, MAIN_DAO_ADDRESS } = getAddresses();
    const web3 = new Web3(MAIN_CHAIN_RPC);
    const tokenContract = new web3.eth.Contract(ERC20_ABI, OW_TOKEN_ADDRESS);

    const allowance = await tokenContract.methods.allowance(userAddress, MAIN_DAO_ADDRESS).call();
    return BigInt(allowance) >= BigInt(amount);
  } catch (error) {
    console.error("Error checking allowance:", error);
    return false;
  }
}

/**
 * Approve tokens for staking
 */
export async function approveTokens(amount, onTxHash, onReceipt) {
  try {
    const { OW_TOKEN_ADDRESS, MAIN_DAO_ADDRESS } = getAddresses();
    const web3 = new Web3(window.ethereum);
    const accounts = await web3.eth.getAccounts();
    const fromAddress = accounts[0];

    const tokenContract = new web3.eth.Contract(ERC20_ABI, OW_TOKEN_ADDRESS);

    return new Promise((resolve, reject) => {
      tokenContract.methods
        .approve(MAIN_DAO_ADDRESS, amount)
        .send({ from: fromAddress })
        .on("transactionHash", (hash) => {
          if (onTxHash) onTxHash(hash);
        })
        .on("receipt", (receipt) => {
          if (onReceipt) onReceipt(receipt);
          resolve(receipt);
        })
        .on("error", (error) => {
          console.error("Approval failed:", error);
          reject(error);
        });
    });
  } catch (error) {
    console.error("Error approving tokens:", error);
    throw new Error(`Token approval failed: ${error.message}`);
  }
}

/**
 * Quote LayerZero fees for staking
 */
export async function quoteLZFees(userAddress) {
  try {
    const MAIN_CHAIN_RPC = getMainChainRpc();
    const { MAIN_DAO_ADDRESS } = getAddresses();
    const web3 = new Web3(MAIN_CHAIN_RPC);
    const daoContract = new web3.eth.Contract(MAIN_DAO_ABI, MAIN_DAO_ADDRESS);

    const fee = await daoContract.methods.quoteGovernanceNotification(
      userAddress,
      LAYERZERO_OPTIONS_VALUE
    ).call();

    return fee.toString();
  } catch (error) {
    console.error("Error quoting LZ fees:", error);
    // Return default fee if quote fails
    return Web3.utils.toWei("0.001", "ether");
  }
}

/**
 * Execute stake transaction
 */
export async function executeStake(amount, durationMinutes, lzFee, onTxHash, onReceipt) {
  try {
    const { MAIN_DAO_ADDRESS } = getAddresses();
    const web3 = new Web3(window.ethereum);
    const accounts = await web3.eth.getAccounts();
    const fromAddress = accounts[0];

    const daoContract = new web3.eth.Contract(MAIN_DAO_ABI, MAIN_DAO_ADDRESS);

    // Convert BigInt to string to avoid Web3.js errors
    const feeValue = typeof lzFee === 'bigint' ? lzFee.toString() : lzFee;

    // Get gas price and convert to string
    const gasPrice = await web3.eth.getGasPrice();
    const gasPriceString = typeof gasPrice === 'bigint' ? gasPrice.toString() : gasPrice;

    // Log all transaction parameters
    console.log("Network:", isMainnet() ? "Ethereum Mainnet" : "Base Sepolia");
    console.log("Amount (wei):", amount);
    console.log("Amount (OW tokens):", Web3.utils.fromWei(amount, 'ether'));
    console.log("Duration (minutes):", durationMinutes);
    console.log("LayerZero Options:", LAYERZERO_OPTIONS_VALUE);
    console.log("LayerZero Fee (wei):", feeValue);
    console.log("LayerZero Fee (ETH):", Web3.utils.fromWei(feeValue, 'ether'));
    console.log("Gas Price:", gasPriceString);
    console.log("From Address:", fromAddress);
    console.log("=====================================");
    
    return new Promise((resolve, reject) => {
      daoContract.methods
        .stake(amount, durationMinutes, LAYERZERO_OPTIONS_VALUE)
        .send({ 
          from: fromAddress,
          value: feeValue,
          gasPrice: gasPriceString
        })
        .on("transactionHash", (hash) => {
          if (onTxHash) onTxHash(hash);
        })
        .on("receipt", (receipt) => {
          if (onReceipt) onReceipt(receipt);
          resolve(receipt);
        })
        .on("error", (error) => {
          console.error("❌ Stake transaction failed:", error);
          reject(error);
        });
    });
  } catch (error) {
    console.error("❌ Error executing stake:", error);
    throw new Error(`Stake transaction failed: ${error.message}`);
  }
}

/**
 * Get user's stake info
 */
export async function getUserStakeInfo(userAddress) {
  try {
    const MAIN_CHAIN_RPC = getMainChainRpc();
    const { MAIN_DAO_ADDRESS } = getAddresses();
    const web3 = new Web3(MAIN_CHAIN_RPC);
    const daoContract = new web3.eth.Contract(MAIN_DAO_ABI, MAIN_DAO_ADDRESS);

    const stakeInfo = await daoContract.methods.getStakerInfo(userAddress).call();
    
    return {
      amount: stakeInfo.amount.toString(),
      unlockTime: Number(stakeInfo.unlockTime),
      durationMinutes: Number(stakeInfo.durationMinutes),
      hasStake: stakeInfo.hasStake
    };
  } catch (error) {
    console.error("Error fetching stake info:", error);
    return {
      amount: "0",
      unlockTime: 0,
      durationMinutes: 0,
      hasStake: false
    };
  }
}

/**
 * Get unstake availability info
 */
export async function getUnstakeInfo(userAddress) {
  try {
    const MAIN_CHAIN_RPC = getMainChainRpc();
    const { MAIN_DAO_ADDRESS } = getAddresses();
    const web3 = new Web3(MAIN_CHAIN_RPC);
    const daoContract = new web3.eth.Contract(MAIN_DAO_ABI, MAIN_DAO_ADDRESS);

    const availableTime = await daoContract.methods.getUnstakeAvailableTime(userAddress).call();
    return {
      requested: Number(availableTime) > 0,
      availableTime: Number(availableTime)
    };
  } catch (error) {
    console.error("Error fetching unstake info:", error);
    return { requested: false, availableTime: 0 };
  }
}

/**
 * Quote LayerZero fee for unstake cross-chain sync
 */
export async function quoteUnstakeFee(userAddress) {
  try {
    const MAIN_CHAIN_RPC = getMainChainRpc();
    const { MAIN_DAO_ADDRESS } = getAddresses();
    const web3 = new Web3(MAIN_CHAIN_RPC);
    const daoContract = new web3.eth.Contract(MAIN_DAO_ABI, MAIN_DAO_ADDRESS);

    const fee = await daoContract.methods.quoteStakeUpdate(
      userAddress,
      false,
      UNSTAKE_LZ_OPTIONS
    ).call();

    return fee.toString();
  } catch (error) {
    console.error("Error quoting unstake fee:", error);
    return Web3.utils.toWei("0.0004", "ether");
  }
}

/**
 * Execute unstake transaction (two-step: first call requests, second call completes)
 */
export async function executeUnstake(lzFee, onTxHash, onReceipt) {
  try {
    const { MAIN_DAO_ADDRESS } = getAddresses();
    const web3 = new Web3(window.ethereum);
    const accounts = await web3.eth.getAccounts();
    const fromAddress = accounts[0];

    const daoContract = new web3.eth.Contract(MAIN_DAO_ABI, MAIN_DAO_ADDRESS);

    const feeValue = typeof lzFee === 'bigint' ? lzFee.toString() : lzFee;

    return new Promise((resolve, reject) => {
      daoContract.methods
        .unstake(UNSTAKE_LZ_OPTIONS)
        .send({
          from: fromAddress,
          value: feeValue
        })
        .on("transactionHash", (hash) => {
          console.log("Unstake tx hash:", hash);
          if (onTxHash) onTxHash(hash);
        })
        .on("receipt", (receipt) => {
          console.log("Unstake confirmed:", receipt);
          if (onReceipt) onReceipt(receipt);
          resolve(receipt);
        })
        .on("error", (error) => {
          console.error("Unstake failed:", error);
          reject(error);
        });
    });
  } catch (error) {
    console.error("Error executing unstake:", error);
    throw new Error(`Unstake transaction failed: ${error.message}`);
  }
}

/**
 * Validate stake parameters
 */
export function validateStake(amount, duration, balance) {
  const errors = [];
  
  const amountBN = BigInt(amount);
  const minStakeBN = BigInt(MIN_STAKE);
  const balanceBN = BigInt(balance);
  
  if (amountBN < minStakeBN) {
    errors.push("Minimum stake is 100 OW tokens");
  }
  
  if (amountBN > balanceBN) {
    errors.push("Insufficient OW token balance");
  }
  
  if (duration < 1 || duration > 3) {
    errors.push("Duration must be between 1 and 3 minutes");
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
