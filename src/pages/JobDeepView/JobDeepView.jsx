import React, { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Web3 from "web3";
import contractABI from "../../ABIs/genesis_ABI.json"; // Use Genesis ABI for job data
import "./JobDeepView.css";
import SkillBox from "../../components/SkillBox/SkillBox";
import Milestone from "../../components/Milestone/Milestone";
import BlueButton from "../../components/BlueButton/BlueButton";
import { getNativeChain, isMainnet } from "../../config/chainConfig";

// Dynamic network mode functions
function getGenesisAddress() {
  const nativeChain = getNativeChain();
  return nativeChain?.contracts?.genesis;
}

function getArbitrumRpc() {
  return isMainnet()
    ? import.meta.env.VITE_ARBITRUM_MAINNET_RPC_URL
    : import.meta.env.VITE_ARBITRUM_SEPOLIA_RPC_URL;
}

// IPFS cache with 1-hour TTL
const ipfsCache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// Multi-gateway IPFS fetch function with caching
const fetchFromIPFS = async (hash, timeout = 5000) => {
    // Check cache first
    const cached = ipfsCache.get(hash);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
        console.log(`✅ Using cached IPFS data for ${hash}`);
        return cached.data;
    }

    const gateways = [
        `https://ipfs.io/ipfs/${hash}`,
        `https://gateway.pinata.cloud/ipfs/${hash}`,
        `https://dweb.link/ipfs/${hash}`,
        `https://w3s.link/ipfs/${hash}`
    ];

    const fetchWithTimeout = (url, timeout) => {
        return Promise.race([
            fetch(url),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout')), timeout)
            )
        ]);
    };

    for (const gateway of gateways) {
        try {
            const response = await fetchWithTimeout(gateway, timeout);
            if (response.ok) {
                const data = await response.json();
                // Cache the result
                ipfsCache.set(hash, {
                    data,
                    timestamp: Date.now()
                });
                console.log(`📦 Cached IPFS data for ${hash}`);
                return data;
            }
        } catch (error) {
            console.warn(`Failed to fetch from ${gateway}:`, error.message);
            continue;
        }
    }
    
    throw new Error(`Failed to fetch ${hash} from all gateways`);
};

function FileUpload() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [preview, setPreview] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setSelectedImage(file);
    setPreview(URL.createObjectURL(file)); // For preview display
  };

  return (
    <div style={{ width: "100%" }}>
      <label htmlFor="image">
        <div className="form-fileUpload">
          <img src="/upload.svg" alt="" />
          <span>Click here to upload or drop files here</span>
        </div>
      </label>
      <input
        id="image"
        type="file"
        accept="image/*"
        onChange={handleImageChange}
        style={{ display: "none" }}
      />
      {preview && <img src={preview} alt="Image preview" width="100" />}
    </div>
  );
}

function ATTACHMENTS({ title, ipfsHash }) {
  const handleClick = () => {
    if (ipfsHash) {
      // Use Pinata's dedicated gateway for files uploaded through Pinata
      window.open(`https://gateway.pinata.cloud/ipfs/${ipfsHash}`, '_blank');
    }
  };

  return (
    <div 
      className="attachment-form" 
      onClick={handleClick}
      style={{ cursor: ipfsHash ? 'pointer' : 'default' }}
    >
      <img src="/attachments.svg" alt="" />
      <span>{title}</span>
    </div>
  );
}

export default function JobInfo() {
  const { jobId } = useParams();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [walletAddress, setWalletAddress] = useState("");
  const [dropdownVisible, setDropdownVisible] = useState(false);

  const handleCopyToClipboard = (address) => {
    navigator.clipboard
      .writeText(address)
      .then(() => {
        alert("Address copied to clipboard");
      })
      .catch((err) => {
        console.error("Failed to copy: ", err);
      });
  };

  // Check if user is already connected to MetaMask
  useEffect(() => {
    const checkWalletConnection = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({
            method: "eth_accounts",
          });
          if (accounts.length > 0) {
            setWalletAddress(accounts[0]);
          }
        } catch (error) {
          console.error("Failed to check wallet connection:", error);
        }
      }
    };

    checkWalletConnection();
  }, []);

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        setWalletAddress(accounts[0]);
      } catch (error) {
        console.error("Failed to connect wallet:", error);
      }
    } else {
      alert("MetaMask is not installed. Please install it to use this app.");
    }
  };

  const toggleDropdown = () => {
    setDropdownVisible(!dropdownVisible);
  };

  const disconnectWallet = () => {
    setWalletAddress("");
    setDropdownVisible(false);
  };

  const hasFetchedRef = useRef(false);

  useEffect(() => {
    async function fetchJobDetails() {
      // Prevent duplicate fetches
      if (hasFetchedRef.current) {
        return;
      }
      hasFetchedRef.current = true;

      try {
        setLoading(true);
        const rpcUrl = getArbitrumRpc();
        const genesisAddress = getGenesisAddress();
        const networkMode = isMainnet() ? "mainnet" : "testnet";

        console.log(`🔧 JobDeepView - RPC: ${rpcUrl} Contract: ${genesisAddress} (${networkMode})`);

        const web3 = new Web3(rpcUrl);
        const contract = new web3.eth.Contract(contractABI, genesisAddress);

        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));

        // Fetch job details from the contract with retry logic
        let jobData;
        let retries = 3;
        while (retries > 0) {
          try {
            jobData = await contract.methods.getJob(jobId).call();
            break;
          } catch (error) {
            if (error.message.includes('429') || error.message.includes('Too Many Requests')) {
              retries--;
              if (retries === 0) throw error;
              console.warn(`Rate limited, retrying in ${3 - retries} seconds...`);
              await new Promise(resolve => setTimeout(resolve, (4 - retries) * 1000));
            } else {
              throw error;
            }
          }
        }
        console.log("🔍 Job data from NOWJC contract (Arbitrum):", jobData);
        console.log("📋 Selected applicant:", jobData.selectedApplicant);
        console.log("🔢 Selected application ID:", jobData.selectedApplicationId);
        console.log("👥 Applicants array:", jobData.applicants);
        console.log("💼 Job status:", jobData.status);
        console.log("⏰ Job created at:", new Date(Number(jobData.createdAt) * 1000).toLocaleString());
        
        // Debug cross-chain state
        const isSelectedApplicantSet = jobData.selectedApplicant && 
          jobData.selectedApplicant !== "0x0000000000000000000000000000000000000000";
        console.log("✅ Is selected applicant set?", isSelectedApplicantSet);
        
        if (!isSelectedApplicantSet) {
          console.warn("⚠️ No selected applicant found - possible cross-chain sync issue");
          console.log("🔄 Try refreshing in a few moments if job was just started");
        }

        // Fetch job details from IPFS
        let jobDetails = {};
        try {
          if (jobData.jobDetailHash) {
            jobDetails = await fetchFromIPFS(jobData.jobDetailHash);
          }
        } catch (ipfsError) {
          console.warn("Failed to fetch IPFS data:", ipfsError);
        }

        // Fetch job giver and job taker profiles
        let jobGiverProfile = null;
        let jobTakerProfile = null;

        try {
          jobGiverProfile = await contract.methods
            .getProfile(jobData.jobGiver)
            .call();
        } catch (error) {
          console.warn("Job giver profile not found");
        }

        if (
          jobData.selectedApplicant &&
          jobData.selectedApplicant !==
            "0x0000000000000000000000000000000000000000"
        ) {
          try {
            jobTakerProfile = await contract.methods
              .getProfile(jobData.selectedApplicant)
              .call();
          } catch (error) {
            console.warn("Job taker profile not found");
          }
        }

        // Calculate total budget from milestones (assuming USDT with 6 decimals)
        const totalBudget = jobData.milestonePayments.reduce(
          (sum, milestone) => {
            return sum + parseFloat(milestone.amount);
          },
          0,
        );
        const formattedTotalBudget = (totalBudget / 1000000).toFixed(2);

        // Process milestones for display
        // currentMilestone is 1-indexed: 1 = working on first, 2 = first completed & working on second, etc.
        const currentMilestoneNum = Number(jobData.currentMilestone);
        const jobStatus = Number(jobData.status); // 0=Open, 1=InProgress, 2=Completed, 3=Cancelled

        console.log("📊 Milestone debug:", { currentMilestoneNum, jobStatus, totalMilestones: jobData.finalMilestones?.length });

        const processedMilestones = [];
        if (jobData.finalMilestones && jobData.finalMilestones.length > 0) {
          for (let i = 0; i < jobData.finalMilestones.length; i++) {
            const milestone = jobData.finalMilestones[i];
            let status = "Pending";

            // Milestone status logic (1-indexed currentMilestone):
            // - currentMilestone = 1 means milestone 1 (index 0) is in progress
            // - Milestones before (currentMilestone - 1) are Completed
            // - Milestone at (currentMilestone - 1) is In Progress
            // - Milestones after are Pending
            if (jobStatus === 2) {
              // Job is completed - all milestones are completed
              status = "Completed";
            } else if (i < currentMilestoneNum - 1) {
              // Milestones before current one are completed
              status = "Completed";
            } else if (i === currentMilestoneNum - 1 && jobStatus === 1) {
              // Current milestone is in progress
              status = "In Progress";
            }

            // Try to fetch milestone details from IPFS
            let milestoneDetails = {
              title: `Milestone ${i + 1}`,
              content: "Milestone description",
            };

            try {
              if (milestone.descriptionHash) {
                const milestoneData = await fetchFromIPFS(milestone.descriptionHash);
                if (milestoneData) {
                  milestoneDetails.title =
                    milestoneData.title || milestoneDetails.title;
                  milestoneDetails.content =
                    milestoneData.content || milestoneDetails.content;
                }
              }
            } catch (error) {
              console.warn(`Failed to fetch milestone ${i} IPFS data:`, error);
            }

            processedMilestones.push({
              ...milestoneDetails,
              amount: (parseFloat(milestone.amount) / 1000000).toFixed(2),
              status: status,
            });
          }
        }

        // Extract skills from job details
        const skills = jobDetails.skills || ["General"];
        const primarySkill = Array.isArray(skills) ? skills[0] : skills;
        const additionalSkillsCount =
          Array.isArray(skills) && skills.length > 1 ? skills.length - 1 : 0;

        // Calculate completed milestones count from processed milestones
        const completedMilestonesCount = processedMilestones.filter(m => m.status === "Completed").length;

        // Set the job state
        setJob({
          jobId: jobData.id,
          title: jobDetails.title || "Untitled Job",
          description: jobDetails.description || "No description available",
          skills: skills,
          primarySkill: primarySkill,
          additionalSkillsCount: additionalSkillsCount,
          jobGiver: jobData.jobGiver,
          selectedApplicant: jobData.selectedApplicant,
          status: jobData.status,
          milestones: processedMilestones,
          currentMilestone: currentMilestoneNum,
          completedMilestones: completedMilestonesCount,
          totalMilestones: jobData.finalMilestones.length,
          totalBudget: formattedTotalBudget,
          jobGiverProfile,
          jobTakerProfile,
          contractId: genesisAddress,
          ...jobDetails,
        });

        setLoading(false);
      } catch (error) {
        console.error("Error fetching job details:", error);
        if (error.message.includes('429') || error.message.includes('Too Many Requests')) {
          console.error("Rate limit exceeded. Please wait a moment and refresh the page.");
        }
        setLoading(false);
        hasFetchedRef.current = false; // Allow retry on error
      }
    }

    if (jobId && !hasFetchedRef.current) {
      fetchJobDetails();
    }

    // Cleanup function
    return () => {
      // Don't reset on unmount to prevent refetch on component remount
    };
  }, [jobId]);


  const handleNavigation = () => {
    window.open(
      "https://drive.google.com/file/d/1tdpuAM3UqiiP_TKJMa5bFtxOG4bU_6ts/view",
      "_blank",
    );
  };

  function formatWalletAddress(address) {
    if (!address) return "";
    const start = address.substring(0, 6);
    const end = address.substring(address.length - 4);
    return `${start}....${end}`;
  }

  if (loading) {
    return (
      <div className="loading-containerT">
        <div className="loading-icon">
          <img src="/OWIcon.svg" alt="Loading..." />
        </div>
        <div className="loading-message">
          <h1 id="txText">Loading Job Details...</h1>
          <p id="txSubtext">
            Fetching detailed job information from the blockchain. Please
            wait...
          </p>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="body-container">
        <div className="view-jobs-container">
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              height: "400px",
              fontSize: "18px",
              color: "#666",
            }}
          >
            <p>Job not found.</p>
            <Link
              to="/browse-jobs"
              style={{
                marginTop: "20px",
                color: "#007bff",
                textDecoration: "none",
              }}
            >
              Back to Browse Jobs
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="info-container">
        <div className="info-content">
          <div className="newTitle">
            <div className="titleTop">
              <Link className="goBack" to={`/job-details/${jobId}`}>
                <img
                  className="goBackImage"
                  src="/back.svg"
                  alt="Back Button"
                />
              </Link>
              <div className="titleText">{job.title}</div>
              <Link
                className="goBack"
                to={`/job-details/${jobId}`}
                style={{ visibility: "hidden" }}
              >
                <img
                  className="goBackImage"
                  src="/back.svg"
                  alt="Back Button"
                />
              </Link>
            </div>
            <div className="titleBottom">
              <p>Contract ID: {formatWalletAddress(job.contractId)}</p>
              <img
                src="/copy.svg"
                className="copyImage"
                onClick={() => handleCopyToClipboard(job.contractId)}
              />
            </div>
          </div>

          <div className="info-cardJ">
            <div className="sectionTitle">Job Details</div>
            <div className="sectionBody">
              <div className="detail-row">
                <span className="detail-label">FROM</span>
                <div className="detail-profile">
                  <span className="detail-value-address">
                    <img src="/user.png" alt="JobGiver" className="Job" />
                    <p>{formatWalletAddress(job.jobGiver)}</p>
                  </span>
                  <a href="/profile" className="view-profile">
                    <span>View Profile</span>
                    <img src="/view_profile.svg" alt="" />
                  </a>
                </div>
              </div>
              <div className="detail-row">
                <span className="detail-label">TO</span>
                <div className="detail-profile">
                  <span
                    className="detail-value-address"
                    style={{ height: "47px" }}
                  >
                    <img src="/user.png" alt="JobTaker" className="Job" />
                    <p>
                      {job.selectedApplicant &&
                      job.selectedApplicant !==
                        "0x0000000000000000000000000000000000000000"
                        ? formatWalletAddress(job.selectedApplicant)
                        : "Not Assigned"}
                    </p>
                  </span>
                  {job.selectedApplicant &&
                  job.selectedApplicant !==
                    "0x0000000000000000000000000000000000000000" ? (
                    <a href="/profile" className="view-profile">
                      <span>View Profile</span>
                      <img src="/view_profile.svg" alt="" />
                    </a>
                  ) : (
                    <Link to={`/view-job-applications/${jobId}`} className="view-profile">
                      <span>View Applications</span>
                      <img src="/view_profile.svg" alt="" />
                    </Link>
                  )}
                </div>
              </div>
              <div className="detail-row">
                <span className="detail-label">COST</span>
                <span className="detail-value" style={{ height: "47px" }}>
                  {job.totalBudget}
                  <img src="/xdc.svg" alt="Info" className="infoIcon" />
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">DESCRIPTION</span>
                <div className="detail-value description-value">
                  <p>{job.description}</p>
                </div>
              </div>
              <div className="category">
                <span>CATEGORY</span>
                <div className="category-box">
                  <SkillBox title={job.primarySkill} />
                  {job.additionalSkillsCount > 0 && (
                    <SkillBox title={`+${job.additionalSkillsCount}`} />
                  )}
                </div>
              </div>
              <div className="category attachments">
                <span>ATTACHMENTS</span>
                <div className="upload-content">
                  {job.attachments && job.attachments.length > 0 ? (
                    job.attachments.map((attachment, index) => (
                      <ATTACHMENTS 
                        key={index}
                        title={attachment.name} 
                        ipfsHash={attachment.ipfsHash}
                      />
                    ))
                  ) : (
                    <div style={{ 
                      padding: "12px", 
                      color: "#666", 
                      fontSize: "14px",
                      fontStyle: "italic" 
                    }}>
                      No attachments
                    </div>
                  )}
                </div>
              </div>
              <div className="milestone-section">
                <div className="milestone-section-header">
                  <span>
                    MILESTONES ({job.completedMilestones} / {job.totalMilestones}{" "}
                    {job.completedMilestones === job.totalMilestones ? "Completed" : "Ongoing"})
                  </span>
                </div>
                <div className="milestone-section-body">
                  {job.milestones && job.milestones.length > 0 ? (
                    job.milestones.map((milestone, index) => (
                      <Milestone
                        key={index}
                        amount={milestone.amount}
                        status={milestone.status}
                        title={milestone.title}
                        content={milestone.content}
                        editable={false}
                      />
                    ))
                  ) : (
                    <div
                      style={{
                        padding: "20px",
                        textAlign: "center",
                        color: "#666",
                      }}
                    >
                      No milestones defined for this job
                    </div>
                  )}
                </div>
              </div>
              
              {/* Apply Now Button - Only show if job is not assigned yet */}
              {(!job.selectedApplicant || 
                job.selectedApplicant === "0x0000000000000000000000000000000000000000") && (
                <div style={{ marginTop: "24px", width: "100%" }}>
                  <BlueButton
                    label="Apply Now"
                    style={{ 
                      width: "100%", 
                      justifyContent: "center",
                      marginTop: "8px"
                    }}
                    onClick={() => {
                      // Navigate to apply page with job ID
                      window.location.href = `/apply-job?jobId=${jobId}`;
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
