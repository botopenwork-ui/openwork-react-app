import Web3 from "web3";
import GenesisABI from "../ABIs/genesis_ABI.json";
import NativeAthenaABI from "../ABIs/native-athena_ABI.json";
import NativeDAOABI from "../ABIs/native-dao_ABI.json";

// Contract addresses
const GENESIS_ADDRESS = import.meta.env.VITE_GENESIS_CONTRACT_ADDRESS || "0x1f23683C748fA1AF99B7263dea121eCc5Fe7564C";
const ATHENA_ADDRESS = import.meta.env.VITE_NATIVE_ATHENA_ADDRESS || "0x098E52Aff44AEAd944AFf86F4A5b90dbAF5B86bd";
const DAO_ADDRESS = import.meta.env.VITE_NATIVE_DAO_ADDRESS || "0x21451dCE07Ad3Ab638Ec71299C1D2BD2064b90E5";
const RPC_URL = import.meta.env.VITE_ARBITRUM_SEPOLIA_RPC_URL;

// Cache configuration
const CACHE_DURATION = {
  ORACLE_DATA: 5 * 60 * 1000, // 5 minutes
  MEMBER_DATA: 2 * 60 * 1000, // 2 minutes
  STATISTICS: 3 * 60 * 1000,  // 3 minutes
};

// In-memory cache
const cache = {
  oracleData: null,
  oracleDataTimestamp: 0,
  memberData: new Map(),
  statistics: null,
  statisticsTimestamp: 0,
};

/**
 * Initialize Web3 and contracts
 */
function initializeContracts() {
  if (!RPC_URL) {
    throw new Error("RPC URL not configured. Please set VITE_ARBITRUM_SEPOLIA_RPC_URL in .env");
  }

  const web3 = new Web3(RPC_URL);
  
  const genesisContract = new web3.eth.Contract(GenesisABI, GENESIS_ADDRESS);
  const athenaContract = new web3.eth.Contract(NativeAthenaABI, ATHENA_ADDRESS);
  const daoContract = new web3.eth.Contract(NativeDAOABI, DAO_ADDRESS);

  return { web3, genesisContract, athenaContract, daoContract };
}

/**
 * Check if cached data is still valid
 */
function isCacheValid(timestamp, duration) {
  return Date.now() - timestamp < duration;
}

/**
 * Fetch all oracle names using batch method
 */
async function fetchOracleNames() {
  try {
    console.log("Initializing contracts...");
    console.log("Genesis Address:", GENESIS_ADDRESS);
    console.log("RPC URL:", RPC_URL ? "Set" : "NOT SET");
    
    const { genesisContract } = initializeContracts();
    
    console.log("Calling getOracleCount()...");
    // First, get the total count of oracles
    const oracleCount = await genesisContract.methods.getOracleCount().call();
    console.log(`Oracle count: ${oracleCount}`);
    
    if (Number(oracleCount) === 0) {
      console.log("No oracles found in the system");
      return [];
    }
    
    console.log(`Fetching ${oracleCount} oracle names...`);
    // Fetch all oracle names using batch method
    const oracleNames = await genesisContract.methods.getOracleNamesBatch(0, Number(oracleCount)).call();
    console.log("Oracle names fetched successfully:", oracleNames);
    return oracleNames;
  } catch (error) {
    console.error("DETAILED ERROR in fetchOracleNames:");
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    console.error("Genesis address being used:", GENESIS_ADDRESS);
    console.error("RPC URL being used:", RPC_URL);
    throw new Error(`Failed to fetch oracle names: ${error.message}`);
  }
}

/**
 * Fetch detailed information for a specific oracle
 */
async function fetchOracleDetails(oracleName) {
  try {
    const { genesisContract, athenaContract } = initializeContracts();

    // Fetch oracle data from Genesis
    const oracleData = await genesisContract.methods.getOracle(oracleName).call();
    
    // Fetch active status from Athena
    let isActive = false;
    let activeMemberCount = 0;
    
    try {
      isActive = await athenaContract.methods.isOracleActive(oracleName).call();
      activeMemberCount = await athenaContract.methods.getOracleActiveMemberCount(oracleName).call();
    } catch (error) {
      console.warn(`Could not fetch active status for ${oracleName}:`, error.message);
    }

    return {
      name: oracleData.name,
      members: oracleData.members || [],
      shortDescription: oracleData.shortDescription || "",
      hashOfDetails: oracleData.hashOfDetails || "",
      skillVerifiedAddresses: oracleData.skillVerifiedAddresses || [],
      isActive: isActive,
      activeMemberCount: Number(activeMemberCount),
      totalMembers: oracleData.members ? oracleData.members.length : 0,
    };
  } catch (error) {
    console.error(`Error fetching oracle details for ${oracleName}:`, error);
    throw error;
  }
}

/**
 * Fetch activity threshold configuration from Athena
 */
async function fetchActivityThreshold() {
  try {
    const { athenaContract } = initializeContracts();
    
    const thresholdDays = await athenaContract.methods.memberActivityThresholdDays().call();
    const minOracleMembers = await athenaContract.methods.minOracleMembers().call();
    
    return {
      thresholdDays: Number(thresholdDays),
      minOracleMembers: Number(minOracleMembers),
      thresholdSeconds: Number(thresholdDays) * 24 * 60 * 60,
    };
  } catch (error) {
    console.error("Error fetching activity threshold:", error);
    // Return defaults if fetch fails
    return {
      thresholdDays: 90,
      minOracleMembers: 3,
      thresholdSeconds: 90 * 24 * 60 * 60,
    };
  }
}

/**
 * Fetch member activity status
 */
async function fetchMemberActivity(memberAddress) {
  try {
    const { genesisContract } = initializeContracts();
    
    const lastActivity = await genesisContract.methods.memberLastActivity(memberAddress).call();
    
    return {
      lastActivityTimestamp: Number(lastActivity),
      lastActivityDate: lastActivity > 0 ? new Date(Number(lastActivity) * 1000) : null,
    };
  } catch (error) {
    console.error(`Error fetching activity for ${memberAddress}:`, error);
    return {
      lastActivityTimestamp: 0,
      lastActivityDate: null,
    };
  }
}

/**
 * Fetch member voting power from Athena
 */
async function fetchMemberVotingPower(memberAddress) {
  try {
    const { athenaContract } = initializeContracts();
    
    const votingPower = await athenaContract.methods.getUserVotingPower(memberAddress).call();
    const canVote = await athenaContract.methods.canVote(memberAddress).call();
    
    return {
      votingPower: votingPower.toString(),
      canVote: canVote,
    };
  } catch (error) {
    console.error(`Error fetching voting power for ${memberAddress}:`, error);
    return {
      votingPower: "0",
      canVote: false,
    };
  }
}

/**
 * Fetch member stake information from DAO
 */
async function fetchMemberStake(memberAddress) {
  try {
    const { daoContract } = initializeContracts();
    
    const stakeInfo = await daoContract.methods.getStakerInfo(memberAddress).call();
    
    return {
      stakeAmount: stakeInfo.amount.toString(),
      unlockTime: Number(stakeInfo.unlockTime),
      durationMinutes: Number(stakeInfo.durationMinutes),
      isActiveStaker: stakeInfo.isActive,
    };
  } catch (error) {
    console.error(`Error fetching stake info for ${memberAddress}:`, error);
    return {
      stakeAmount: "0",
      unlockTime: 0,
      durationMinutes: 0,
      isActiveStaker: false,
    };
  }
}

/**
 * Calculate resolution accuracy for a member
 * Based on their voting history on disputes and skill verifications
 */
async function calculateResolutionAccuracy(memberAddress) {
  try {
    const { genesisContract } = initializeContracts();
    
    let totalVotes = 0;
    let winningVotes = 0;

    // Get skill verification application count
    const applicationCounter = await genesisContract.methods.applicationCounter().call();
    
    // Check skill verification votes (sample recent ones to avoid timeout)
    const maxApplicationsToCheck = 50;
    const startIndex = Math.max(0, Number(applicationCounter) - maxApplicationsToCheck);
    
    for (let i = startIndex; i < Number(applicationCounter); i++) {
      try {
        const voters = await genesisContract.methods.getSkillVerificationVoters(i).call();
        const application = await genesisContract.methods.getSkillApplication(i).call();
        
        const memberVote = voters.find(v => v.voter.toLowerCase() === memberAddress.toLowerCase());
        
        if (memberVote) {
          totalVotes++;
          
          // Check if finalized and if member voted on winning side
          if (application.isFinalized) {
            const winningSide = application.result;
            if (memberVote.voteFor === winningSide) {
              winningVotes++;
            }
          }
        }
      } catch (error) {
        // Skip if application doesn't exist or has no voters
        continue;
      }
    }

    // Calculate accuracy
    if (totalVotes === 0) {
      return {
        accuracy: 0,
        totalVotes: 0,
        winningVotes: 0,
        hasVotingHistory: false,
      };
    }

    const accuracy = Math.round((winningVotes / totalVotes) * 100);

    return {
      accuracy,
      totalVotes,
      winningVotes,
      hasVotingHistory: true,
    };
  } catch (error) {
    console.error(`Error calculating resolution accuracy for ${memberAddress}:`, error);
    return {
      accuracy: 0,
      totalVotes: 0,
      winningVotes: 0,
      hasVotingHistory: false,
    };
  }
}

/**
 * Fetch comprehensive member details
 */
async function fetchMemberDetails(memberAddress, oracleName) {
  // Check cache
  const cacheKey = `${memberAddress}-${oracleName}`;
  const cachedData = cache.memberData.get(cacheKey);
  
  if (cachedData && isCacheValid(cachedData.timestamp, CACHE_DURATION.MEMBER_DATA)) {
    return cachedData.data;
  }

  try {
    // Fetch all member data in parallel
    const [activity, votingPower, stake, accuracy, threshold] = await Promise.all([
      fetchMemberActivity(memberAddress),
      fetchMemberVotingPower(memberAddress),
      fetchMemberStake(memberAddress),
      calculateResolutionAccuracy(memberAddress),
      fetchActivityThreshold(),
    ]);

    // Calculate activity status
    const now = Math.floor(Date.now() / 1000);
    const daysSinceActivity = activity.lastActivityTimestamp > 0
      ? Math.floor((now - activity.lastActivityTimestamp) / (24 * 60 * 60))
      : -1;

    const isActive = activity.lastActivityTimestamp > 0 
      && (now - activity.lastActivityTimestamp) <= threshold.thresholdSeconds;

    const memberDetails = {
      address: memberAddress,
      oracle: oracleName,
      ...activity,
      ...votingPower,
      ...stake,
      ...accuracy,
      daysSinceActivity,
      isActive,
      activityThreshold: threshold.thresholdDays,
    };

    // Cache the result
    cache.memberData.set(cacheKey, {
      data: memberDetails,
      timestamp: Date.now(),
    });

    return memberDetails;
  } catch (error) {
    console.error(`Error fetching member details for ${memberAddress}:`, error);
    throw error;
  }
}

/**
 * Fetch all oracle data with member details
 * Main function to get complete oracle information
 */
export async function fetchAllOracleData(forceRefresh = false) {
  // Check cache
  if (!forceRefresh && cache.oracleData && isCacheValid(cache.oracleDataTimestamp, CACHE_DURATION.ORACLE_DATA)) {
    return cache.oracleData;
  }

  try {
    console.log("Fetching oracle data from blockchain...");
    
    // Step 1: Get all oracle names
    const oracleNames = await fetchOracleNames();
    console.log(`Found ${oracleNames.length} oracles:`, oracleNames);

    // Step 2: Fetch details for each oracle
    const oracleDataPromises = oracleNames.map(async (oracleName) => {
      try {
        const oracleDetails = await fetchOracleDetails(oracleName);
        return oracleDetails;
      } catch (error) {
        console.error(`Failed to fetch details for oracle ${oracleName}:`, error);
        return null;
      }
    });

    const oracleData = (await Promise.all(oracleDataPromises)).filter(Boolean);

    // Step 3: Fetch member details for all members
    const allMembersWithDetails = [];
    
    for (const oracle of oracleData) {
      if (oracle.members && oracle.members.length > 0) {
        const memberPromises = oracle.members.map(memberAddress =>
          fetchMemberDetails(memberAddress, oracle.name)
        );
        
        try {
          const members = await Promise.all(memberPromises);
          allMembersWithDetails.push(...members);
        } catch (error) {
          console.error(`Error fetching member details for oracle ${oracle.name}:`, error);
        }
      }
    }

    const result = {
      oracles: oracleData,
      members: allMembersWithDetails,
      timestamp: Date.now(),
    };

    // Cache the result
    cache.oracleData = result;
    cache.oracleDataTimestamp = Date.now();

    console.log(`Loaded ${oracleData.length} oracles with ${allMembersWithDetails.length} members`);

    return result;
  } catch (error) {
    console.error("Error fetching all oracle data:", error);
    throw new Error(`Failed to fetch oracle data: ${error.message}`);
  }
}

/**
 * Get statistics for all oracles
 */
export async function getOracleStatistics(forceRefresh = false) {
  // Check cache
  if (!forceRefresh && cache.statistics && isCacheValid(cache.statisticsTimestamp, CACHE_DURATION.STATISTICS)) {
    return cache.statistics;
  }

  try {
    const data = await fetchAllOracleData(forceRefresh);
    
    const totalOracles = data.oracles.length;
    const activeOracles = data.oracles.filter(o => o.isActive).length;
    const totalMembers = data.members.length;
    const activeMembers = data.members.filter(m => m.isActive).length;
    
    // Calculate average accuracy (only for members with voting history)
    const membersWithHistory = data.members.filter(m => m.hasVotingHistory);
    const averageAccuracy = membersWithHistory.length > 0
      ? Math.round(membersWithHistory.reduce((sum, m) => sum + m.accuracy, 0) / membersWithHistory.length)
      : 0;
    
    // Calculate total votes cast
    const totalVotes = data.members.reduce((sum, m) => sum + m.totalVotes, 0);

    const statistics = {
      totalOracles,
      activeOracles,
      totalMembers,
      activeMembers,
      inactiveMembers: totalMembers - activeMembers,
      averageAccuracy,
      totalVotes,
      membersWithVotingHistory: membersWithHistory.length,
    };

    // Cache the result
    cache.statistics = statistics;
    cache.statisticsTimestamp = Date.now();

    return statistics;
  } catch (error) {
    console.error("Error calculating oracle statistics:", error);
    throw error;
  }
}

/**
 * Clear all caches
 */
export function clearCache() {
  cache.oracleData = null;
  cache.oracleDataTimestamp = 0;
  cache.memberData.clear();
  cache.statistics = null;
  cache.statisticsTimestamp = 0;
}

/**
 * Get cache status (for debugging)
 */
export function getCacheStatus() {
  return {
    oracleDataCached: cache.oracleData !== null,
    oracleDataAge: Date.now() - cache.oracleDataTimestamp,
    memberDataEntries: cache.memberData.size,
    statisticsCached: cache.statistics !== null,
    statisticsAge: Date.now() - cache.statisticsTimestamp,
  };
}
