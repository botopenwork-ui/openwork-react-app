import Web3 from "web3";
import NativeDAOABI from "../ABIs/native-dao_ABI.json";
import MainDAOABI from "../ABIs/main-dao_ABI.json";
import GenesisABI from "../ABIs/genesis_ABI.json";

// Contract addresses
const NATIVE_DAO_ADDRESS = "0x21451dCE07Ad3Ab638Ec71299C1D2BD2064b90E5"; // Arbitrum Sepolia
const MAIN_DAO_ADDRESS = "0xc3579BDC6eC1fAad8a67B1Dc5542EBcf28456465"; // Base Sepolia
const GENESIS_ADDRESS = "0x1f23683C748fA1AF99B7263dea121eCc5Fe7564C"; // Arbitrum Sepolia

// Backend API URL
const BACKEND_API_URL = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:3001';

// RPC URLs
const ARBITRUM_RPC = import.meta.env.VITE_ARBITRUM_SEPOLIA_RPC_URL;
const BASE_RPC = import.meta.env.VITE_BASE_SEPOLIA_RPC_URL;

// Cache configuration
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes
let cache = {
  stats: null,
  statsTimestamp: 0,
  proposals: null,
  proposalsTimestamp: 0
};

/**
 * Get DAO statistics (oracle count, member count, user stakes)
 */
export async function getDAOStats(userAddress, forceRefresh = false) {
  // Check cache
  if (!forceRefresh && cache.stats && (Date.now() - cache.statsTimestamp < CACHE_DURATION)) {
    return cache.stats;
  }

  try {
    console.log("Fetching DAO stats from both chains...");

    // Initialize contracts
    const arbWeb3 = new Web3(ARBITRUM_RPC);
    const baseWeb3 = new Web3(BASE_RPC);

    const genesisContract = new arbWeb3.eth.Contract(GenesisABI, GENESIS_ADDRESS);
    const nativeDAOContract = new arbWeb3.eth.Contract(NativeDAOABI, NATIVE_DAO_ADDRESS);
    const mainDAOContract = new baseWeb3.eth.Contract(MainDAOABI, MAIN_DAO_ADDRESS);

    // Fetch data in parallel
    const [oracleCount, nativeStakers, mainStakers, userMainStake] = await Promise.all([
      genesisContract.methods.getOracleCount().call(),
      nativeDAOContract.methods.getAllStakers().call(),
      mainDAOContract.methods.getAllStakers().call(),
      userAddress ? mainDAOContract.methods.getStakerInfo(userAddress).call() : Promise.resolve({ amount: "0", hasStake: false })
    ]);

    // Combine member counts
    const totalMembers = new Set([...nativeStakers, ...mainStakers]).size;

    // User's current stakings (from Main DAO on Base)
    const userStakeAmount = userMainStake.hasStake 
      ? Web3.utils.fromWei(userMainStake.amount, 'ether')
      : "0";

    const stats = {
      skillOracleCount: Number(oracleCount),
      totalMembers,
      userStakings: parseFloat(userStakeAmount).toFixed(0),
      nativeMemberCount: nativeStakers.length,
      mainMemberCount: mainStakers.length
    };

    // Cache result
    cache.stats = stats;
    cache.statsTimestamp = Date.now();

    console.log("DAO stats loaded:", stats);
    return stats;

  } catch (error) {
    console.error("Error fetching DAO stats:", error);
    return {
      skillOracleCount: 0,
      totalMembers: 0,
      userStakings: "0",
      nativeMemberCount: 0,
      mainMemberCount: 0
    };
  }
}

/**
 * Fetch proposals from both Native and Main DAOs
 */
export async function getAllProposals(forceRefresh = false) {
  // Check cache
  if (!forceRefresh && cache.proposals && (Date.now() - cache.proposalsTimestamp < CACHE_DURATION)) {
    return cache.proposals;
  }

  try {
    console.log("Fetching proposals from both chains and database...");

    const arbWeb3 = new Web3(ARBITRUM_RPC);
    const baseWeb3 = new Web3(BASE_RPC);

    const nativeDAOContract = new arbWeb3.eth.Contract(NativeDAOABI, NATIVE_DAO_ADDRESS);
    const mainDAOContract = new baseWeb3.eth.Contract(MainDAOABI, MAIN_DAO_ADDRESS);

    // Fetch from both blockchain and database in parallel
    const [nativeProposals, mainProposals, dbProposalsResponse] = await Promise.all([
      nativeDAOContract.methods.getAllProposalIds().call(),
      mainDAOContract.methods.getAllProposalIds().call(),
      fetch(`${BACKEND_API_URL}/api/proposals`).then(res => res.ok ? res.json() : { proposals: [] }).catch(() => ({ proposals: [] }))
    ]);

    // Create a map of database proposals for quick lookup
    const dbProposalsMap = new Map();
    if (dbProposalsResponse.proposals) {
      dbProposalsResponse.proposals.forEach(dbProposal => {
        const key = `${dbProposal.proposal_id}-${dbProposal.chain}`;
        dbProposalsMap.set(key, dbProposal);
      });
      console.log(`📊 Found ${dbProposalsMap.size} proposals in database`);
    }

    // Format proposals
    const formattedProposals = [];

    // Add Native DAO proposals with vote data
    if (nativeProposals && nativeProposals.ids) {
      for (let i = 0; i < nativeProposals.ids.length; i++) {
        const proposalId = nativeProposals.ids[i];
        
        // Fetch vote data and deadline for this proposal
        let votePercentage = 0;
        let timeLeft = "Unknown";
        
        try {
          const votes = await nativeDAOContract.methods.proposalVotes(proposalId).call();
          const forVotes = BigInt(votes.forVotes);
          const againstVotes = BigInt(votes.againstVotes);
          const abstainVotes = BigInt(votes.abstainVotes);
          const totalVotes = forVotes + againstVotes + abstainVotes;
          
          if (totalVotes > 0n) {
            votePercentage = Math.round((Number(forVotes) / Number(totalVotes)) * 100);
          }
        } catch (error) {
          console.log(`Could not fetch votes for proposal ${proposalId}`);
        }
        
        try {
          const deadline = await nativeDAOContract.methods.proposalDeadline(proposalId).call();
          const now = Math.floor(Date.now() / 1000);
          const secondsLeft = Number(deadline) - now;
          
          if (secondsLeft > 0) {
            const days = Math.floor(secondsLeft / 86400);
            const hours = Math.floor((secondsLeft % 86400) / 3600);
            const minutes = Math.floor((secondsLeft % 3600) / 60);
            
            if (days > 0) timeLeft = `${days}d ${hours}h`;
            else if (hours > 0) timeLeft = `${hours}h ${minutes}m`;
            else if (minutes > 0) timeLeft = `${minutes}m`;
            else timeLeft = "Ended";
          } else {
            timeLeft = "Ended";
          }
        } catch (error) {
          console.log(`Could not fetch deadline for proposal ${proposalId}`);
        }
        
        // Check if this proposal has database metadata
        const dbKey = `${proposalId.toString()}-Arbitrum`;
        const dbData = dbProposalsMap.get(dbKey);
        
        formattedProposals.push({
          id: proposalId.toString(),
          chain: "Arbitrum",
          state: Number(nativeProposals.states[i]),
          title: dbData?.title || `Proposal ${proposalId.toString().substring(0, 8)}...`,
          proposedBy: dbData?.proposer_address ? `${dbData.proposer_address.substring(0, 6)}...${dbData.proposer_address.substring(38)}` : "Native DAO",
          voteSubmissions: votePercentage,
          type: dbData?.proposal_type || getProposalType(Number(nativeProposals.states[i])),
          timeLeft: timeLeft,
          color: getStateColor(Number(nativeProposals.states[i])),
          viewUrl: `/proposal-view/${proposalId.toString()}/Arbitrum`,
          hasMetadata: !!dbData
        });
      }
    }

    // Add Main DAO proposals with vote data
    if (mainProposals && mainProposals.ids) {
      for (let i = 0; i < mainProposals.ids.length; i++) {
        const proposalId = mainProposals.ids[i];
        
        // Fetch vote data and deadline for this proposal
        let votePercentage = 0;
        let timeLeft = "Unknown";
        
        try {
          const votes = await mainDAOContract.methods.proposalVotes(proposalId).call();
          const forVotes = BigInt(votes.forVotes);
          const againstVotes = BigInt(votes.againstVotes);
          const abstainVotes = BigInt(votes.abstainVotes);
          const totalVotes = forVotes + againstVotes + abstainVotes;
          
          if (totalVotes > 0n) {
            votePercentage = Math.round((Number(forVotes) / Number(totalVotes)) * 100);
          }
        } catch (error) {
          console.log(`Could not fetch votes for proposal ${proposalId}`);
        }
        
        try {
          const deadline = await mainDAOContract.methods.proposalDeadline(proposalId).call();
          const now = Math.floor(Date.now() / 1000);
          const secondsLeft = Number(deadline) - now;
          
          if (secondsLeft > 0) {
            const days = Math.floor(secondsLeft / 86400);
            const hours = Math.floor((secondsLeft % 86400) / 3600);
            const minutes = Math.floor((secondsLeft % 3600) / 60);
            
            if (days > 0) timeLeft = `${days}d ${hours}h`;
            else if (hours > 0) timeLeft = `${hours}h ${minutes}m`;
            else if (minutes > 0) timeLeft = `${minutes}m`;
            else timeLeft = "Ended";
          } else {
            timeLeft = "Ended";
          }
        } catch (error) {
          console.log(`Could not fetch deadline for proposal ${proposalId}`);
        }
        
        // Check if this proposal has database metadata
        const dbKey = `${proposalId.toString()}-Base`;
        const dbData = dbProposalsMap.get(dbKey);
        
        formattedProposals.push({
          id: proposalId.toString(),
          chain: "Base",
          state: Number(mainProposals.states[i]),
          title: dbData?.title || `Proposal ${proposalId.toString().substring(0, 8)}...`,
          proposedBy: dbData?.proposer_address ? `${dbData.proposer_address.substring(0, 6)}...${dbData.proposer_address.substring(38)}` : "Main DAO",
          voteSubmissions: votePercentage,
          type: dbData?.proposal_type || getProposalType(Number(mainProposals.states[i])),
          timeLeft: timeLeft,
          color: getStateColor(Number(mainProposals.states[i])),
          viewUrl: `/proposal-view/${proposalId.toString()}/Base`,
          hasMetadata: !!dbData
        });
      }
    }

    // Sort by newest first
    formattedProposals.sort((a, b) => {
      const aId = BigInt(a.id);
      const bId = BigInt(b.id);
      return aId > bId ? -1 : 1;
    });

    // Cache result
    cache.proposals = formattedProposals;
    cache.proposalsTimestamp = Date.now();

    console.log(`Loaded ${formattedProposals.length} proposals`);
    return formattedProposals;

  } catch (error) {
    console.error("Error fetching proposals:", error);
    return [];
  }
}

/**
 * Get proposal type based on state
 */
function getProposalType(state) {
  const states = {
    0: "Pending",
    1: "Active",
    2: "Canceled",
    3: "Defeated",
    4: "Succeeded",
    5: "Queued",
    6: "Expired",
    7: "Executed"
  };
  return states[state] || "Unknown";
}

/**
 * Get color based on proposal state
 */
function getStateColor(state) {
  if (state === 1) return "#00C853"; // Active - green
  if (state === 4 || state === 7) return "#00C853"; // Succeeded/Executed - green
  if (state === 3 || state === 2 || state === 6) return "#F44336"; // Defeated/Canceled/Expired - red
  return "#FFA500"; // Default - orange
}

/**
 * Fetch all DAO members from both chains with their data
 */
export async function getAllDAOMembers(forceRefresh = false) {
  try {
    console.log("Fetching DAO members from both chains...");

    const arbWeb3 = new Web3(ARBITRUM_RPC);
    const baseWeb3 = new Web3(BASE_RPC);

    const genesisContract = new arbWeb3.eth.Contract(GenesisABI, GENESIS_ADDRESS);
    const nativeDAOContract = new arbWeb3.eth.Contract(NativeDAOABI, NATIVE_DAO_ADDRESS);
    const mainDAOContract = new baseWeb3.eth.Contract(MainDAOABI, MAIN_DAO_ADDRESS);

    // Get all member addresses from both DAOs
    const [nativeStakers, mainStakers] = await Promise.all([
      nativeDAOContract.methods.getAllStakers().call(),
      mainDAOContract.methods.getAllStakers().call()
    ]);

    // Combine and get unique addresses
    const allAddresses = [...new Set([...nativeStakers, ...mainStakers])];
    console.log(`Found ${allAddresses.length} unique DAO members`);

    // Fetch data for each member
    const memberData = await Promise.all(
      allAddresses.map(async (address) => {
        try {
          // Fetch from both chains in parallel
          const [nativeStake, mainStake, governanceActions, lastActivity] = await Promise.all([
            nativeDAOContract.methods.getStakerInfo(address).call().catch(() => ({ amount: "0", hasStake: false })),
            mainDAOContract.methods.getStakerInfo(address).call().catch(() => ({ amount: "0", hasStake: false })),
            genesisContract.methods.getUserGovernanceActions(address).call().catch(() => "0"),
            genesisContract.methods.memberLastActivity(address).call().catch(() => "0")
          ]);

          // Calculate total staked (from both chains)
          const nativeStakeAmount = BigInt(nativeStake.amount || "0");
          const mainStakeAmount = BigInt(mainStake.amount || "0");
          const totalStaked = nativeStakeAmount + mainStakeAmount;

          // Format last activity
          const lastActivityTimestamp = Number(lastActivity);
          const lastActivityDate = lastActivityTimestamp > 0 
            ? formatTimeSince(lastActivityTimestamp)
            : "No activity";

          return {
            address,
            tokensStaked: Web3.utils.fromWei(totalStaked.toString(), 'ether'),
            governanceActions: Number(governanceActions),
            lastActivity: lastActivityDate,
            lastActivityTimestamp,
            nativeStake: Web3.utils.fromWei(nativeStake.amount || "0", 'ether'),
            mainStake: Web3.utils.fromWei(mainStake.amount || "0", 'ether')
          };
        } catch (error) {
          console.error(`Error fetching data for ${address}:`, error);
          return {
            address,
            tokensStaked: "0",
            governanceActions: 0,
            lastActivity: "Unknown",
            lastActivityTimestamp: 0,
            nativeStake: "0",
            mainStake: "0"
          };
        }
      })
    );

    // Sort by tokens staked (highest first)
    memberData.sort((a, b) => {
      const aStake = parseFloat(a.tokensStaked);
      const bStake = parseFloat(b.tokensStaked);
      return bStake - aStake;
    });

    console.log(`Loaded data for ${memberData.length} members`);
    return memberData;

  } catch (error) {
    console.error("Error fetching DAO members:", error);
    return [];
  }
}

/**
 * Format timestamp to human-readable time since
 */
function formatTimeSince(timestamp) {
  const now = Math.floor(Date.now() / 1000);
  const seconds = now - timestamp;
  
  if (seconds < 60) return "Just now";
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hours ago`;
  
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} days ago`;
  
  const months = Math.floor(days / 30);
  return `${months} months ago`;
}

/**
 * Get detailed proposal information
 * @param {string} proposalId - The proposal ID
 * @param {string} chain - The chain name ("Arbitrum" or "Base")
 */
export async function getProposalDetails(proposalId, chain) {
  try {
    console.log(`Fetching proposal ${proposalId} from ${chain}...`);

    // Try to fetch from database first
    let dbProposal = null;
    try {
      const response = await fetch(`${BACKEND_API_URL}/api/proposals/${proposalId}/${chain}`);
      if (response.ok) {
        const data = await response.json();
        dbProposal = data.proposal;
        console.log('✅ Found proposal in database:', dbProposal.proposal_type);
      }
    } catch (dbError) {
      console.log('📡 Proposal not in database, fetching from blockchain only');
    }

    // Determine which contract and RPC to use
    const isArbitrum = chain === "Arbitrum";
    const web3 = new Web3(isArbitrum ? ARBITRUM_RPC : BASE_RPC);
    const contractAddress = isArbitrum ? NATIVE_DAO_ADDRESS : MAIN_DAO_ADDRESS;
    const contractABI = isArbitrum ? NativeDAOABI : MainDAOABI;
    const daoContract = new web3.eth.Contract(contractABI, contractAddress);

    // Fetch proposal data in parallel
    const [votes, deadline, state, proposer] = await Promise.all([
      daoContract.methods.proposalVotes(proposalId).call(),
      daoContract.methods.proposalDeadline(proposalId).call(),
      daoContract.methods.state(proposalId).call(),
      daoContract.methods.proposalProposer(proposalId).call().catch(() => "Unknown")
    ]);

    // Calculate time left
    const now = Math.floor(Date.now() / 1000);
    const secondsLeft = Number(deadline) - now;
    let timeLeft = "Ended";
    
    if (secondsLeft > 0) {
      const days = Math.floor(secondsLeft / 86400);
      const hours = Math.floor((secondsLeft % 86400) / 3600);
      const minutes = Math.floor((secondsLeft % 3600) / 60);
      
      if (days > 0) timeLeft = `${days} days ${hours} hours`;
      else if (hours > 0) timeLeft = `${hours} hours ${minutes} minutes`;
      else if (minutes > 0) timeLeft = `${minutes} minutes`;
      else timeLeft = "Less than 1 minute";
    }

    // Convert votes from wei to ether
    const forVotes = Web3.utils.fromWei(votes.forVotes.toString(), 'ether');
    const againstVotes = Web3.utils.fromWei(votes.againstVotes.toString(), 'ether');
    const abstainVotes = Web3.utils.fromWei(votes.abstainVotes.toString(), 'ether');

    // Calculate total votes and percentages
    const forVotesBigInt = BigInt(votes.forVotes);
    const againstVotesBigInt = BigInt(votes.againstVotes);
    const abstainVotesBigInt = BigInt(votes.abstainVotes);
    const totalVotes = forVotesBigInt + againstVotesBigInt + abstainVotesBigInt;

    let forPercentage = 0;
    let againstPercentage = 0;
    
    if (totalVotes > 0n) {
      forPercentage = Math.round((Number(forVotesBigInt) / Number(totalVotes)) * 100);
      againstPercentage = Math.round((Number(againstVotesBigInt) / Number(totalVotes)) * 100);
    }

    // Combine blockchain data with database data if available
    return {
      id: proposalId,
      chain,
      state: Number(state),
      stateText: getProposalType(Number(state)),
      proposer,
      votes: {
        for: forVotes,
        against: againstVotes,
        abstain: abstainVotes,
        forRaw: votes.forVotes.toString(),
        againstRaw: votes.againstVotes.toString(),
        abstainRaw: votes.abstainVotes.toString()
      },
      percentages: {
        for: forPercentage,
        against: againstPercentage
      },
      deadline: Number(deadline),
      timeLeft,
      color: getStateColor(Number(state)),
      // Add database fields if available
      ...(dbProposal && {
        proposalType: dbProposal.proposal_type,
        title: dbProposal.title,
        description: dbProposal.description,
        recipientAddress: dbProposal.recipient_address,
        amount: dbProposal.amount,
        metadata: dbProposal.metadata,
        hasMetadata: true
      })
    };

  } catch (error) {
    console.error(`Error fetching proposal ${proposalId}:`, error);
    throw error;
  }
}

/**
 * Clear cache
 */
export function clearDAOCache() {
  cache = {
    stats: null,
    statsTimestamp: 0,
    proposals: null,
    proposalsTimestamp: 0
  };
}
