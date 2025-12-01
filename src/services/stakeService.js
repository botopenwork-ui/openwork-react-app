import Web3 from "web3";

// Contract addresses (Base Sepolia)
const MAIN_DAO_ADDRESS = "0xc3579BDC6eC1fAad8a67B1Dc5542EBcf28456465";
const OW_TOKEN_ADDRESS = "0x5f24747d5e59F9CCe5a9815BC12E2fB5Ae713679";
const BASE_SEPOLIA_RPC = import.meta.env.VITE_BASE_SEPOLIA_RPC_URL;
const LAYERZERO_OPTIONS_VALUE = "0x000301001101000000000000000000000000000aae60";

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

// Main DAO ABI (stake function)
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
  }
];

/**
 * Get user's OW token balance
 */
export async function getTokenBalance(userAddress) {
  try {
    const web3 = new Web3(BASE_SEPOLIA_RPC);
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
    const web3 = new Web3(BASE_SEPOLIA_RPC);
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
    const web3 = new Web3(window.ethereum);
    const accounts = await web3.eth.getAccounts();
    const fromAddress = accounts[0];
    
    const tokenContract = new web3.eth.Contract(ERC20_ABI, OW_TOKEN_ADDRESS);
    
    return new Promise((resolve, reject) => {
      tokenContract.methods
        .approve(MAIN_DAO_ADDRESS, amount)
        .send({ from: fromAddress })
        .on("transactionHash", (hash) => {
          console.log("Approval tx hash:", hash);
          if (onTxHash) onTxHash(hash);
        })
        .on("receipt", (receipt) => {
          console.log("Approval confirmed:", receipt);
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
    const web3 = new Web3(BASE_SEPOLIA_RPC);
    const daoContract = new web3.eth.Contract(MAIN_DAO_ABI, MAIN_DAO_ADDRESS);
    
    const fee = await daoContract.methods.quoteGovernanceNotification(
      userAddress,
      LAYERZERO_OPTIONS_VALUE
    ).call();
    
    console.log("LayerZero fee quote:", fee);
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
    console.log("=== STAKE TRANSACTION PARAMETERS ===");
    console.log("Contract:", MAIN_DAO_ADDRESS);
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
          console.log("✅ Stake tx hash:", hash);
          if (onTxHash) onTxHash(hash);
        })
        .on("receipt", (receipt) => {
          console.log("✅ Stake confirmed:", receipt);
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
    const web3 = new Web3(BASE_SEPOLIA_RPC);
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
