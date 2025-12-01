import Web3 from "web3";
import GenesisHelperABI from "../ABIs/genesis_helper_ABI.json";

// Contract addresses
const GENESIS_HELPER_ADDRESS = import.meta.env.VITE_GENESIS_HELPER_ADDRESS || "0xCcf7Fa75C6b31f58bd43847fA6602258ee46A715";
const RPC_URL = import.meta.env.VITE_ARBITRUM_SEPOLIA_RPC_URL;

// Cache configuration
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

// In-memory cache
let cachedProposals = null;
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

  return { web3, helperContract };
}

/**
 * Check if cached data is still valid
 */
function isCacheValid() {
  return cachedProposals && (Date.now() - cacheTimestamp < CACHE_DURATION);
}

/**
 * Fetch all active proposals (skill verifications + Ask Athena)
 * Uses GenesisReaderHelper for efficient batch retrieval
 */
export async function fetchAllProposals(forceRefresh = false) {
  // Check cache
  if (!forceRefresh && isCacheValid()) {
    console.log("Returning cached proposals");
    return cachedProposals;
  }

  try {
    console.log("Fetching proposals from blockchain...");
    const { helperContract } = initializeContracts();

    // Fetch both types of proposals in parallel
    const [skillApplications, askAthenaApplications] = await Promise.all([
      helperContract.methods.getActiveSkillApplications().call(),
      helperContract.methods.getActiveAskAthenaApplications().call(),
    ]);

    console.log(`Found ${skillApplications.length} skill verifications and ${askAthenaApplications.length} Ask Athena applications`);

    // Format skill verification applications
    const skillProposals = skillApplications.map((app) => {
      const totalVotes = Number(app.votesFor) + Number(app.votesAgainst);
      const votePercent = totalVotes > 0 
        ? Math.round((Number(app.votesFor) / totalVotes) * 100)
        : 0;

      return {
        id: app.id.toString(),
        title: `Skill Verification for ${app.targetOracleName}`,
        submittedBy: app.applicant,
        type: "Skill Verification",
        votePercent: votePercent,
        votesFor: app.votesFor.toString(),
        votesAgainst: app.votesAgainst.toString(),
        isVotingActive: app.isVotingActive,
        isFinalized: app.isFinalized,
        timestamp: Number(app.timeStamp),
        feeAmount: app.feeAmount.toString(),
        hash: app.applicationHash,
        color: getVoteColor(votePercent),
        proposalType: "skillVerification",
      };
    });

    // Format Ask Athena applications
    const athenaProposals = askAthenaApplications.map((app) => {
      const totalVotes = Number(app.votesFor) + Number(app.votesAgainst);
      const votePercent = totalVotes > 0 
        ? Math.round((Number(app.votesFor) / totalVotes) * 100)
        : 0;

      return {
        id: app.id.toString(),
        title: app.description || `Ask Athena for ${app.targetOracle}`,
        submittedBy: app.applicant,
        type: "Ask Athena",
        votePercent: votePercent,
        votesFor: app.votesFor.toString(),
        votesAgainst: app.votesAgainst.toString(),
        isVotingActive: app.isVotingActive,
        isFinalized: app.isFinalized,
        timestamp: Number(app.timeStamp),
        fees: app.fees,
        hash: app.hash,
        color: getVoteColor(votePercent),
        proposalType: "askAthena",
      };
    });

    // Combine all proposals and sort by timestamp (newest first)
    const allProposals = [...skillProposals, ...athenaProposals].sort(
      (a, b) => b.timestamp - a.timestamp
    );

    // Cache the result
    cachedProposals = allProposals;
    cacheTimestamp = Date.now();

    console.log(`Loaded ${allProposals.length} total proposals`);
    return allProposals;

  } catch (error) {
    console.error("Error fetching proposals:", error);
    throw new Error(`Failed to fetch proposals: ${error.message}`);
  }
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
 * Clear cache
 */
export function clearProposalCache() {
  cachedProposals = null;
  cacheTimestamp = 0;
}
