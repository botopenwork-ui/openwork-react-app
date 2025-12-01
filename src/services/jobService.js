import Web3 from "web3";
import GenesisHelperABI from "../ABIs/genesis_helper_ABI.json";

// Contract addresses
const GENESIS_HELPER_V3_ADDRESS = "0x7aE451A29BB3871F05C6C9951EC912EfCdE94a5a"; // Arbitrum Sepolia
const GENESIS_HELPER_V4_ADDRESS = "0x9B16b4211a05912E312541513Ea847d4756f1589"; // Arbitrum Sepolia
const GENESIS_ADDRESS = "0x1f23683C748fA1AF99B7263dea121eCc5Fe7564C"; // Arbitrum Sepolia
const ARBITRUM_RPC = import.meta.env.VITE_ARBITRUM_SEPOLIA_RPC_URL;

// Cache configuration
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes
let cache = {
  inProgressJobs: null,
  timestamp: 0
};

/**
 * Fetch all in-progress jobs
 */
export async function getInProgressJobs(forceRefresh = false) {
  // Check cache
  if (!forceRefresh && cache.inProgressJobs && (Date.now() - cache.timestamp < CACHE_DURATION)) {
    console.log("Returning cached in-progress jobs");
    return cache.inProgressJobs;
  }

  try {
    console.log("Fetching in-progress jobs from blockchain...");
    
    const web3 = new Web3(ARBITRUM_RPC);
    const helperContract = new web3.eth.Contract(GenesisHelperABI, GENESIS_HELPER_V3_ADDRESS);

    // Get all in-progress jobs in one call
    const jobs = await helperContract.methods.getInProgressJobs().call();
    console.log(`Found ${jobs.length} in-progress jobs`);

    // Format jobs for UI
    const formattedJobs = jobs.map((job) => {
      // Parse status enum
      const statusMap = {
        0: "Open",
        1: "InProgress",
        2: "Completed",
        3: "Cancelled"
      };

      return {
        id: job.id,
        title: job.id, // Will use job ID as title for now
        jobGiver: job.jobGiver,
        selectedApplicant: job.selectedApplicant || "Not assigned",
        status: statusMap[Number(job.status)] || "Unknown",
        amount: Web3.utils.fromWei(job.totalPaid || "0", 'mwei'), // USDC has 6 decimals
        jobDetailHash: job.jobDetailHash,
        currentMilestone: Number(job.currentMilestone),
        from: job.jobGiver,
        to: job.selectedApplicant || "Unassigned"
      };
    });

    // Cache result
    cache.inProgressJobs = formattedJobs;
    cache.timestamp = Date.now();

    console.log(`Loaded ${formattedJobs.length} in-progress jobs`);
    return formattedJobs;

  } catch (error) {
    console.error("Error fetching in-progress jobs:", error);
    return [];
  }
}

/**
 * Fetch job title from IPFS
 */
async function fetchJobTitleFromIPFS(jobDetailHash) {
  try {
    const response = await fetch(`https://gateway.pinata.cloud/ipfs/${jobDetailHash}`);
    const data = await response.json();
    return data.title || data.jobTitle || "Untitled Job";
  } catch (error) {
    console.error(`Error fetching IPFS for ${jobDetailHash}:`, error);
    return null;
  }
}

/**
 * Fetch titles for jobs from IPFS (background process)
 */
export async function fetchJobTitles(jobs) {
  console.log(`Fetching titles for ${jobs.length} jobs from IPFS...`);
  
  const updatedJobs = await Promise.all(
    jobs.map(async (job) => {
      if (job.jobDetailHash && job.jobDetailHash !== "") {
        const title = await fetchJobTitleFromIPFS(job.jobDetailHash);
        if (title) {
          return { ...job, title };
        }
      }
      return job;
    })
  );

  console.log("Job titles loaded from IPFS");
  return updatedJobs;
}

/**
 * Get jobs for a specific user (as job giver or worker)
 */
export async function getUserJobs(userAddress) {
  try {
    console.log(`Fetching jobs for user: ${userAddress}`);
    
    // Get all in-progress jobs
    const allJobs = await getInProgressJobs();
    
    // Filter for jobs where user is involved
    const userJobs = allJobs.filter(job => 
      job.jobGiver.toLowerCase() === userAddress.toLowerCase() ||
      job.selectedApplicant.toLowerCase() === userAddress.toLowerCase()
    );
    
    console.log(`Found ${userJobs.length} jobs for user ${userAddress}`);
    return userJobs;
    
  } catch (error) {
    console.error("Error fetching user jobs:", error);
    return [];
  }
}

/**
 * Fetch all job applications
 */
export async function getAllApplications(forceRefresh = false) {
  try {
    console.log("Fetching all applications from blockchain...");
    
    const web3 = new Web3(ARBITRUM_RPC);
    const helperV4 = new web3.eth.Contract(GenesisHelperABI, GENESIS_HELPER_V4_ADDRESS);
    const genesisABI = (await import("../ABIs/genesis_ABI.json")).default;
    const genesis = new web3.eth.Contract(genesisABI, GENESIS_ADDRESS);

    // Get all applications in one call
    const applications = await helperV4.methods.getAllJobApplications().call();
    console.log(`Found ${applications.length} applications`);

    // Format applications with status
    const formattedApps = await Promise.all(
      applications.map(async (app) => {
        try {
          // Get job data to determine status
          const job = await genesis.methods.getJob(app.jobId).call();
          
          // Determine status
          let status;
          if (Number(app.id) === Number(job.selectedApplicationId)) {
            status = "Accepted";
          } else if (Number(job.status) === 0) {
            status = "Pending";
          } else {
            status = "Rejected";
          }

          // Calculate proposed amount from milestones
          let proposedAmount = "0";
          if (app.proposedMilestones && app.proposedMilestones.length > 0) {
            const total = app.proposedMilestones.reduce(
              (sum, milestone) => BigInt(sum) + BigInt(milestone.amount || "0"),
              BigInt(0)
            );
            proposedAmount = Web3.utils.fromWei(total.toString(), 'mwei');
          }

          return {
            id: app.id.toString(),
            jobId: app.jobId,
            title: app.jobId, // Will be replaced by IPFS title
            applicant: app.applicant,
            sentTo: job.jobGiver,
            status,
            amount: proposedAmount,
            jobDetailHash: job.jobDetailHash
          };
        } catch (error) {
          console.error(`Error processing application ${app.id}:`, error);
          return null;
        }
      })
    );

    // Filter out null entries
    const validApps = formattedApps.filter(Boolean);
    
    console.log(`Loaded ${validApps.length} applications`);
    return validApps;

  } catch (error) {
    console.error("Error fetching applications:", error);
    return [];
  }
}

/**
 * Clear cache
 */
export function clearJobCache() {
  cache = {
    inProgressJobs: null,
    timestamp: 0
  };
}
