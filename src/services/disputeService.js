import Web3 from "web3";
import GenesisHelperABI from "../ABIs/genesis_helper_ABI.json";
import GenesisABI from "../ABIs/genesis_ABI.json";

// Contract addresses
const GENESIS_HELPER_ADDRESS = import.meta.env.VITE_GENESIS_HELPER_ADDRESS || "0xCcf7Fa75C6b31f58bd43847fA6602258ee46A715";
const GENESIS_ADDRESS = import.meta.env.VITE_GENESIS_CONTRACT_ADDRESS || "0x1f23683C748fA1AF99B7263dea121eCc5Fe7564C";
const RPC_URL = import.meta.env.VITE_ARBITRUM_SEPOLIA_RPC_URL;

// Cache configuration
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

// In-memory cache
let cachedDisputes = null;
let cacheTimestamp = 0;

/**
 * Initialize Web3 and contracts
 */
function initializeContracts() {
  if (!RPC_URL) {
    throw new Error("RPC URL not configured. Please set VITE_ARBITRUM_SEPOLIA_RPC_URL in .env");
  }

  const web3 = new Web3(RPC_URL);
  
  const helperContract = new web3.eth.Contract(GenesisHelperABI, GENESIS_HELPER_ADDRESS);
  const genesisContract = new web3.eth.Contract(GenesisABI, GENESIS_ADDRESS);

  return { web3, helperContract, genesisContract };
}

/**
 * Check if cached data is still valid
 */
function isCacheValid() {
  return cachedDisputes && (Date.now() - cacheTimestamp < CACHE_DURATION);
}

/**
 * Fetch all active disputes from blockchain
 * Uses GenesisReaderHelper for efficient batch retrieval
 */
export async function fetchAllDisputes(forceRefresh = false) {
  // Check cache
  if (!forceRefresh && isCacheValid()) {
    console.log("Returning cached disputes");
    return cachedDisputes;
  }

  try {
    console.log("Fetching disputes from blockchain...");
    const { helperContract, genesisContract } = initializeContracts();

    // Get all active disputes in one call
    const activeDisputes = await helperContract.methods.getActiveDisputes().call();
    console.log(`Found ${activeDisputes.length} active disputes`);

    // Format disputes for UI
    const formattedDisputes = await Promise.all(
      activeDisputes.map(async (dispute) => {
        // Determine role (job giver vs job taker)
        let role = "Unknown";
        try {
          const jobId = extractJobId(dispute.jobId);
          const job = await genesisContract.methods.getJob(jobId).call();
          
          if (dispute.disputeRaiserAddress.toLowerCase() === job.jobGiver.toLowerCase()) {
            role = "Job Giver";
          } else if (dispute.disputeRaiserAddress.toLowerCase() === job.selectedApplicant.toLowerCase()) {
            role = "Job Taker";
          }
        } catch (error) {
          console.warn(`Could not determine role for dispute ${dispute.jobId}:`, error.message);
        }

        // Calculate vote completion percentage
        const totalVotes = Number(dispute.votesFor) + Number(dispute.votesAgainst);
        const votePercent = totalVotes > 0 
          ? Math.round((Number(dispute.votesFor) / totalVotes) * 100)
          : 0;

        // Format amount
        const amount = Web3.utils.fromWei(dispute.disputedAmount.toString(), 'mwei'); // USDC has 6 decimals

        return {
          id: dispute.jobId,
          title: `Dispute for Job ${extractJobId(dispute.jobId)}`,
          proposedBy: dispute.disputeRaiserAddress,
          role: role,
          voteSubmissions: votePercent,
          votesFor: dispute.votesFor.toString(),
          votesAgainst: dispute.votesAgainst.toString(),
          amount: amount,
          isVotingActive: dispute.isVotingActive,
          isFinalized: dispute.isFinalized,
          timestamp: Number(dispute.timeStamp),
          fees: dispute.fees.toString(),
          hash: dispute.hash,
          color: getVoteColor(votePercent),
        };
      })
    );

    // Cache the result
    cachedDisputes = formattedDisputes;
    cacheTimestamp = Date.now();

    console.log(`Loaded ${formattedDisputes.length} disputes`);
    return formattedDisputes;

  } catch (error) {
    console.error("Error fetching disputes:", error);
    throw new Error(`Failed to fetch disputes: ${error.message}`);
  }
}

/**
 * Extract job ID from dispute ID
 * Dispute IDs are in format: "jobId-disputeNumber" (e.g., "40232-243-1")
 */
function extractJobId(disputeId) {
  const parts = disputeId.split('-');
  if (parts.length >= 2) {
    // Return jobId part (e.g., "40232-243")
    return parts.slice(0, -1).join('-');
  }
  return disputeId;
}

/**
 * Get color based on vote percentage
 */
function getVoteColor(percentage) {
  if (percentage >= 70) {
    return "#00C853"; // Green
  } else if (percentage >= 50) {
    return "#FFA500"; // Orange
  } else {
    return "#F44336"; // Red
  }
}

/**
 * Get all dispute IDs (for reference)
 */
export async function getAllDisputeIds() {
  try {
    const { helperContract } = initializeContracts();
    const disputeIds = await helperContract.methods.getAllDisputeIds().call();
    return disputeIds;
  } catch (error) {
    console.error("Error fetching dispute IDs:", error);
    return [];
  }
}

/**
 * Clear cache
 */
export function clearDisputeCache() {
  cachedDisputes = null;
  cacheTimestamp = 0;
}
