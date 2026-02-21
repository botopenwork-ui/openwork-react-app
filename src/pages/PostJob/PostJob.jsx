import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Web3 from "web3";
import JobContractABI from "../../ABIs/lowjc-lite_ABI.json";
import BrowseJobsABI from "../../ABIs/nowjc_ABI.json";
import "./PostJob.css";
import { useWalletConnection } from "../../functions/useWalletConnection";
import { formatWalletAddress } from "../../functions/formatWalletAddress";

import BackButton from "../../components/BackButton/BackButton";
import SkillBox from "../../components/SkillBox/SkillBox";
import DropDown from "../../components/DropDown/DropDown";
import BlueButton from "../../components/BlueButton/BlueButton";
import RadioButton from "../../components/RadioButton/RadioButton";
import Milestone from "../../components/Milestone/Milestone";
import Warning from "../../components/Warning/Warning";
import FileUpload from "../../components/FileUpload/FileUpload";

// Multi-chain support
import { useChainDetection, useWalletAddress } from "../../hooks/useChainDetection";
import { postJob as postJobMultiChain } from "../../services/localChainService";
import { getLocalChains, getNativeChain, isMainnet } from "../../config/chainConfig";

// Cross-chain monitoring
import CrossChainStatus, { buildLZSteps } from "../../components/CrossChainStatus/CrossChainStatus";
import { monitorLZMessage, STATUS, explorerTxUrl } from "../../utils/crossChainMonitor";

// Dynamic network mode functions for cross-chain polling
function getGenesisAddress() {
  const nativeChain = getNativeChain();
  return nativeChain?.contracts?.genesis;
}

function getArbitrumRpc() {
  return isMainnet()
    ? import.meta.env.VITE_ARBITRUM_MAINNET_RPC_URL
    : import.meta.env.VITE_ARBITRUM_SEPOLIA_RPC_URL;
}

// Backend URL for secure API calls
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

export default function PostJob() {
  // Multi-chain support - detect user's network
  const { chainId, chainConfig, isAllowed, error: chainError, isLoading: chainLoading } = useChainDetection();
  const { address: userAddress } = useWalletAddress();
  
  const { walletAddress, connectWallet, disconnectWallet } =
    useWalletConnection();
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [jobType, setJobType] = useState("");
  const [jobTaker, setJobTaker] = useState("");
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [loadingT, setLoadingT] = useState("");
  const [selectedOption, setSelectedOption] = useState("Single Milestone");
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [skillInput, setSkillInput] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [transactionStatus, setTransactionStatus] = useState("Job posting requires blockchain transaction fees");
  const [crossChainSteps, setCrossChainSteps] = useState(null); // null = not started
  const [milestones, setMilestones] = useState([
    {
      title: "Milestone 1",
      content: "",
      amount: 1,
    },
  ]);

  const navigate = useNavigate();
  
  // Update transaction status when chain changes
  useEffect(() => {
    if (chainConfig && isAllowed) {
      setTransactionStatus(`Ready to post on ${chainConfig.name}. Job posting requires blockchain transaction fees.`);
    } else if (chainError) {
      setTransactionStatus(`⚠️ ${chainError}`);
    }
  }, [chainId, chainConfig, isAllowed, chainError]);

  // Function to extract job ID from LayerZero logs (MULTI-CHAIN COMPATIBLE)
  const extractJobIdFromLayerZeroLogs = (receipt) => {
    try {
      
      // LayerZero event signature
      const layerZeroSignature = "0x1ab700d4ced0c005b164c0f789fd09fcbb0156d4c2041b8a3bfbcd961cd1567f";
      
      // Find LayerZero message log
      const layerZeroLog = receipt.logs.find(log => 
        log.topics && log.topics[0] === layerZeroSignature
      );
      
      if (!layerZeroLog) {
        return null;
      }
      
      
      // Extract job ID from the log data
      const logData = layerZeroLog.data;
      const dataStr = logData.slice(2); // Remove 0x prefix
      const chunks = dataStr.match(/.{1,64}/g) || []; // Split into 32-byte chunks
      
      // Method 1: Try to decode each chunk and find job ID pattern
      for (const chunk of chunks) {
        try {
          const cleanChunk = chunk.replace(/00+$/, "");
          if (cleanChunk.length > 0) {
            const decoded = Web3.utils.hexToUtf8("0x" + cleanChunk);
            
            // Match EID-jobNumber pattern (e.g., "40161-6", "40232-5")
            // EIDs are 5 digits: 40161 (ETH), 40232 (OP), 40231 (ARB), 40245 (BASE)
            if (decoded.match(/^40\d{3}-\d+$/)) {
              return decoded;
            }
            // Also check for any numeric pattern as fallback
            if (decoded.match(/^\d+-\d+$/)) {
              return decoded;
            }
          }
        } catch (e) {
          continue;
        }
      }
      
      return null;
      
    } catch (error) {
      console.error("❌ Error extracting job ID:", error);
      return null;
    }
  };

  // Function to check if job exists on Arbitrum (Genesis contract - data hub)
  const checkJobExistsOnArbitrum = async (jobId) => {
    try {
      const genesisAddress = getGenesisAddress();
      const arbitrumRpc = getArbitrumRpc();
      const networkMode = isMainnet() ? "mainnet" : "testnet";


      const arbitrumWeb3 = new Web3(arbitrumRpc);
      const browseJobsContract = new arbitrumWeb3.eth.Contract(BrowseJobsABI, genesisAddress);
      
      // Try to get the job data
      const jobData = await browseJobsContract.methods.getJob(jobId).call();
      
      // Check if job exists - jobData.id should match our jobId
      // Also check if jobGiver is not zero address (indicates real job)
      const jobExists = jobData && 
                        jobData.id && 
                        jobData.id !== '' &&  // ID must not be empty
                        (jobData.id === jobId || jobData.id.toString() === jobId) &&
                        jobData.jobGiver && 
                        jobData.jobGiver !== '0x0000000000000000000000000000000000000000';
      
      if (jobExists) {
      } else {
        if (jobData.id === '') console.log("   - Reason: Job ID is empty");
        if (jobData.id !== jobId) console.log(`   - Reason: Job ID mismatch (got: '${jobData.id}', expected: '${jobId}')`);
        if (!jobData.jobGiver || jobData.jobGiver === '0x0000000000000000000000000000000000000000') {
        }
      }
      return jobExists;
    } catch (error) {
      return false;
    }
  };

  // Function to poll for job sync completion
  const pollForJobSync = async (jobId) => {
    setTransactionStatus(`Job posted successfully! Syncing ${jobId} to Arbitrum (15-30 seconds)...`);
    
    // Wait 15 seconds before starting to poll (LayerZero typically takes 10-20s)
    await new Promise(resolve => setTimeout(resolve, 15000));
    setTransactionStatus(`Checking if ${jobId} has synced to Arbitrum...`);
    
    const maxAttempts = 12; // 12 attempts over 60 seconds (after initial 15s wait)
    const pollInterval = 5000; // 5 seconds
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      
      const jobExists = await checkJobExistsOnArbitrum(jobId);
      
      if (jobExists) {
        setTransactionStatus("Job synced! Redirecting...");
        setTimeout(() => navigate(`/job-details/${jobId}`), 1500);
        return;
      }
      
      // Update status with estimated time remaining
      const timeRemaining = Math.max(0, 75 - (15 + (attempt * 5))); // Total time - elapsed time
      setTransactionStatus(`Syncing job across chains... (~${timeRemaining}s remaining)`);
      
      // Wait before next attempt
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }
    
    // If we get here, polling timed out
    setTransactionStatus("Job posted but sync taking longer than expected. Check browse jobs in a few minutes.");
    
    // Redirect to browse jobs page after a delay
    setTimeout(() => {
      navigate('/browse-jobs');
    }, 3000);
  };


  // Update milestones based on selected option
  useEffect(() => {
    if (selectedOption === "Single Milestone") {
      setMilestones([
        {
          title: "Milestone 1",
          content:
            "",
          amount: 1,
        },
      ]);
    } else {
      setMilestones([
        {
          title: "Milestone 1",
          content:
            "",
          amount: 1,
        },
        {
          title: "Milestone 2",
          content:
            "",
          amount: 1,
        },
      ]);
    }
  }, [selectedOption]);

  // Calculate total compensation
  const totalCompensation = milestones.reduce(
    (sum, milestone) => sum + milestone.amount,
    0,
  );

  const handleNavigation = () => {
    window.open(
      "https://drive.google.com/file/d/1tdpuAM3UqiiP_TKJMa5bFtxOG4bU_6ts/view",
      "_blank",
    );
  };

  const toggleDropdown = () => {
    setDropdownVisible(!dropdownVisible);
  };

  const handleMilestoneUpdate = (index, field, value) => {
    const updatedMilestones = [...milestones];
    updatedMilestones[index][field] = value;
    setMilestones(updatedMilestones);
  };

  const handleAddMilestone = () => {
    const newMilestoneNumber = milestones.length + 1;
    const newMilestone = {
      title: `Milestone ${newMilestoneNumber}`,
      content: "",
      amount: 1,
    };
    setMilestones([...milestones, newMilestone]);
  };

  const handleDeleteMilestone = (index) => {
    // Prevent deletion if only 1 milestone remains (for Multiple Milestones mode)
    if (selectedOption === "Multiple Milestones" && milestones.length <= 1) {
      alert("You must have at least one milestone for multiple milestone jobs");
      return;
    }
    
    const updatedMilestones = milestones.filter((_, i) => i !== index);
    
    // Update milestone titles to reflect new numbering
    const renumberedMilestones = updatedMilestones.map((milestone, idx) => ({
      ...milestone,
      title: `Milestone ${idx + 1}`,
    }));
    
    setMilestones(renumberedMilestones);
  };

  // Function to pin individual milestone to IPFS
  const pinMilestoneToIPFS = async (milestone, index) => {
    try {
      const milestoneData = {
        title: milestone.title,
        content: milestone.content,
        amount: milestone.amount,
        index: index,
        timestamp: new Date().toISOString(),
      };

      const response = await fetch(
        `${BACKEND_URL}/api/ipfs/upload-json`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            pinataContent: milestoneData,
            pinataMetadata: {
              name: `milestone-${index}-${Date.now()}`,
              keyvalues: {
                milestoneTitle: milestone.title,
                milestoneIndex: index.toString(),
                type: "milestone",
              },
            },
          }),
        },
      );

      const data = await response.json();
      return data.IpfsHash;
    } catch (error) {
      console.error(`Error pinning milestone ${index} to IPFS:`, error);
      return null;
    }
  };

  const pinJobDetailsToIPFS = async (jobDetails) => {
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/ipfs/upload-json`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            pinataContent: jobDetails,
            pinataMetadata: {
              name: `job-${Date.now()}`,
              keyvalues: {
                jobTitle: jobDetails.title,
                jobGiver: jobDetails.jobGiver,
                type: "job",
              },
            },
          }),
        },
      );

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error pinning to IPFS:", error);
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate required fields
    if (!jobTitle.trim()) {
      alert("Please enter a job title");
      return;
    }

    if (!jobDescription.trim()) {
      alert("Please enter job requirements/description");
      return;
    }

    if (window.ethereum) {
      try {
        setLoadingT(true);
        setTransactionStatus("Preparing transaction...");

        const web3 = new Web3(window.ethereum);
        await window.ethereum.request({ method: "eth_requestAccounts" });
        
        // Multi-chain validation - check if user is on an allowed chain
        if (!isAllowed) {
          alert(`Cannot post jobs on ${chainConfig?.name || 'this network'}.\n\n${chainError}\n\nSupported chains: ${getLocalChains().map(c => c.name).join(', ')}`);
          setLoadingT(false);
          setTransactionStatus(`❌ ${chainError}`);
          return;
        }
        
        
        const accounts = await web3.eth.getAccounts();
        const fromAddress = accounts[0];

        setTransactionStatus("Uploading milestone data to IPFS...");

        // Step 1: Create hashes for each milestone
        const milestoneHashes = [];
        const milestoneAmounts = [];

        for (let i = 0; i < milestones.length; i++) {
          const milestone = milestones[i];

          const milestoneHash = await pinMilestoneToIPFS(milestone, i);
          if (!milestoneHash) {
            throw new Error(`Failed to hash milestone ${i}`);
          }

          milestoneHashes.push(milestoneHash);
          milestoneAmounts.push(milestone.amount * 1000000); // Convert to USDT units (6 decimals)

        }


        // Step 2: Create comprehensive job details object (including milestone hashes)
        
        const jobDetails = {
          title: jobTitle,
          description: jobDescription,
          skills: selectedSkills,
          milestoneType: selectedOption,
          milestones: milestones, // Original milestone data
          milestoneHashes: milestoneHashes, // IPFS hashes of milestones
          attachments: uploadedFiles, // Uploaded files with IPFS hashes
          totalCompensation: totalCompensation,
          jobGiver: fromAddress,
          timestamp: new Date().toISOString(),
        };
        

        // Step 3: Pin comprehensive job details to IPFS
        setTransactionStatus("Uploading job details to IPFS...");
        const jobResponse = await pinJobDetailsToIPFS(jobDetails);

        if (jobResponse && jobResponse.IpfsHash) {
          const jobDetailHash = jobResponse.IpfsHash;

          // Step 4: Prepare contract parameters - USE DETECTED CHAIN CONFIG
          const lowjcAddress = chainConfig.contracts.lowjc;
          const layerzeroOptions = chainConfig.layerzero.options;
          
          const contract = new web3.eth.Contract(
            JobContractABI,
            lowjcAddress,
          );

          // DEBUG: Log all transaction data

          // Step 5: Get LayerZero fee quote
          setTransactionStatus("Getting LayerZero fee quote...");

          const bridgeAddress = await contract.methods.bridge().call();

          const bridgeABI = [{
            "inputs": [
              {"type": "bytes", "name": "_payload"},
              {"type": "bytes", "name": "_options"}
            ],
            "name": "quoteNativeChain",
            "outputs": [{"type": "uint256", "name": "fee"}],
            "stateMutability": "view",
            "type": "function"
          }];
          
          const bridgeContract = new web3.eth.Contract(bridgeABI, bridgeAddress);
          
          // Get current job count to predict next jobId - MUST USE LAYERZERO EID
          const jobCounter = await contract.methods.getJobCount().call();
          const layerZeroEid = chainConfig.layerzero.eid; // Get EID from chain config
          const predictedJobId = `${layerZeroEid}-${Number(jobCounter) + 1}`; // Use LayerZero EID, not chain ID
          
          // Encode payload with predicted jobId
          const payload = web3.eth.abi.encodeParameters(
            ['string', 'string', 'address', 'string', 'string[]', 'uint256[]'],
            ['postJob', predictedJobId, fromAddress, jobDetailHash, milestoneHashes, milestoneAmounts]
          );
          
          const quotedFee = await bridgeContract.methods.quoteNativeChain(payload, layerzeroOptions).call();
          
          // Dynamic fee from LayerZero quote
          const feeToUse = quotedFee;
          
          // Step 6: Call postJob function with milestone hashes as descriptions
          setTransactionStatus(`Sending transaction on ${chainConfig.name}...`);
          
          contract.methods
            .postJob(
              jobDetailHash,
              milestoneHashes,
              milestoneAmounts,
              layerzeroOptions,
            )
            .send({
              from: fromAddress,
              value: feeToUse, // Using fixed 0.001 ETH (switch to quotedFee for dynamic)
              gasPrice: await web3.eth.getGasPrice(),
            })
            .on("receipt", function (receipt) {
              
              // First, try to extract job ID from JobPosted event
              let jobId = null;

              // Look for JobPosted event in the receipt logs
              // Note: jobId is an indexed string, so returnValues.jobId is the keccak256 hash, not the actual ID
              // We use predictedJobId since we know what ID we're posting
              if (receipt.events && receipt.events.JobPosted) {
                jobId = predictedJobId; // Use predicted since indexed strings are hashed
              } else if (receipt.logs && receipt.logs.length > 0) {
                // Try to find JobPosted event by topic signature
                const jobPostedSignature = web3.utils.keccak256("JobPosted(string,address,string)");
                const jobPostedLog = receipt.logs.find(log => 
                  log.topics && log.topics[0] === jobPostedSignature
                );
                
                if (jobPostedLog && jobPostedLog.topics[1]) {
                  // Decode the indexed string parameter (jobId)
                  try {
                    // The jobId is indexed, so we need to decode it from topics
                    const encodedJobId = jobPostedLog.topics[1];
                    // For indexed string parameters, the hash is stored
                    // We'll use the predicted ID as it should match
                    jobId = predictedJobId;
                  } catch (e) {
                  }
                }
              }
              
              // Fallback: try to extract from LayerZero logs
              if (!jobId) {
                jobId = extractJobIdFromLayerZeroLogs(receipt);
                if (jobId) {
                }
              }
              
              // Final fallback: use predicted ID
              if (!jobId) {
                jobId = predictedJobId;
              }
              
              if (jobId) {
                setTransactionStatus("✅ Job posted successfully!");
                setLoadingT(false);
                
                // For testing/debugging: log the job ID we're going to use

                // ── Start cross-chain status tracking ──────────────────
                const sourceTxHash = receipt.transactionHash;
                const lzLink = `https://layerzeroscan.com/tx/${sourceTxHash}`;

                // Set initial steps immediately
                setCrossChainSteps(buildLZSteps({
                  sourceTxHash,
                  sourceChainId: chainId,
                  lzStatus: 'active',
                  lzLink,
                }));

                // Monitor LZ message delivery
                monitorLZMessage(sourceTxHash, (update) => {
                  setCrossChainSteps(prev => buildLZSteps({
                    sourceTxHash,
                    sourceChainId: chainId,
                    lzStatus: update.status === STATUS.SUCCESS ? 'delivered'
                             : update.status === STATUS.FAILED  ? 'failed'
                             : 'active',
                    lzLink: update.lzLink || lzLink,
                    dstTxHash: update.dstTxHash,
                    dstChainId: 42161, // Arbitrum One
                  }));
                  if (update.status === STATUS.FAILED) {
                    setTransactionStatus(`❌ LayerZero delivery failed. TX: ${sourceTxHash}`);
                  }
                });
                // ─────────────────────────────────────────────────────────
                
                // Start polling for cross-chain sync (job visible in browse)
                pollForJobSync(jobId);
              } else {
                setTransactionStatus("✅ Transaction confirmed but job ID extraction failed");
                setLoadingT(false);
              }
            })
            .on("error", function (error) {
              console.error("Error sending transaction:", error);
              setTransactionStatus(`❌ Transaction failed: ${error.message}`);
              setLoadingT(false);
            })
            .on("transactionHash", function (hash) {
              setTransactionStatus(`Transaction sent! Hash: ${hash.substring(0, 10)}...`);
            })
            .catch(function (error) {
              console.error("Transaction was rejected:", error);
              setTransactionStatus(`❌ Transaction rejected: ${error.message}`);
              setLoadingT(false);
            });
        } else {
          console.error("Failed to pin job details to IPFS");
          setTransactionStatus("❌ Failed to upload job details to IPFS");
          setLoadingT(false);
        }
      } catch (error) {
        console.error("Error in handleSubmit:", error);
        setLoadingT(false);
      }
    } else {
      console.error("MetaMask not detected");
      setLoadingT(false);
    }
  };

  if (loadingT) {
    return (
      <div className="loading-containerT">
        <div className="loading-icon">
          <img src="/OWIcon.svg" alt="Loading..." />
        </div>
        <div className="loading-message">
          <h1 id="txText">Posting Job...</h1>
          <p id="txSubtext">
            Your job is being posted to the blockchain. Please wait...
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="form-containerDC form-post">
        <div className="form-header">
          <BackButton to="/work" title="Create a Job" />
        </div>
        <div className="form-body">
          <div
            onSubmit={handleSubmit}
            style={{
              marginTop: "12px",
            }}
          >
            <div className="form-groupDC">
              <input
                type="text"
                placeholder="Job Title"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
              />
            </div>
            <div className="form-groupDC">
              <textarea
                placeholder="Job Requirements"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
              ></textarea>
            </div>
            <div className="form-groupDC skill-box">
              {selectedSkills.map((skill, index) => (
                <SkillBox 
                  key={index} 
                  title={skill} 
                  onRemove={() => {
                    setSelectedSkills(selectedSkills.filter((_, i) => i !== index));
                  }}
                />
              ))}
              <input
                type="text"
                placeholder="Add skills (press Enter to add)"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const trimmedSkill = skillInput.trim();
                    if (trimmedSkill && !selectedSkills.includes(trimmedSkill)) {
                      setSelectedSkills([...selectedSkills, trimmedSkill]);
                      setSkillInput("");
                    }
                  } else if (e.key === 'Backspace' && skillInput === '' && selectedSkills.length > 0) {
                    e.preventDefault();
                    setSelectedSkills(selectedSkills.slice(0, -1));
                  }
                }}
              />
            </div>
            <div className="form-groupDC">
              <FileUpload 
                onFilesUploaded={setUploadedFiles}
                uploadedFiles={uploadedFiles}
              />
            </div>
            <div className="lineDC form-groupDC"></div>
            <div className="form-groupDC">
              <RadioButton
                label="Single Milestone"
                isSelected={selectedOption === "Single Milestone"}
                onChange={() => setSelectedOption("Single Milestone")}
              />
              <RadioButton
                label="Multiple Milestones"
                isSelected={selectedOption === "Multiple Milestones"}
                onChange={() => setSelectedOption("Multiple Milestones")}
              />
            </div>
            <div className="form-groupDC milestone-section">
              <div className="milestone-section-header">
                <span>MILESTONES</span>
              </div>
              <div className="milestone-section-body">
                {milestones.map((milestone, index) => (
                  <Milestone
                    key={index}
                    amount={milestone.amount}
                    title={milestone.title}
                    content={milestone.content}
                    editable={true}
                    onUpdate={(field, value) =>
                      handleMilestoneUpdate(index, field, value)
                    }
                    onDelete={() => handleDeleteMilestone(index)}
                  />
                ))}
              </div>
              {selectedOption === "Multiple Milestones" && (
                <button
                  type="button"
                  onClick={handleAddMilestone}
                  style={{
                    width: "100%",
                    padding: "12px 20px",
                    marginTop: "12px",
                    background: "transparent",
                    border: "2px dashed #007bff",
                    borderRadius: "8px",
                    color: "#007bff",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = "rgba(0, 123, 255, 0.05)";
                    e.target.style.borderColor = "#0056b3";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = "transparent";
                    e.target.style.borderColor = "#007bff";
                  }}
                >
                  <span style={{ fontSize: "20px", lineHeight: "1" }}>+</span>
                  Add Another Milestone
                </button>
              )}
            </div>

            <div className="form-groupDC form-platformFee">
              <div className="platform-fee">
                <span>total compensation</span>
                <img src="/fee.svg" alt="" />
              </div>
              <div className="compensation-amount">
                <span>{totalCompensation}</span>
                <img src="/xdc.svg" alt="USDC" className="usdc-iconJD" />
              </div>
            </div>
            <BlueButton
              label="Post Job"
              style={{ width: "100%", justifyContent: "center" }}
              onClick={handleSubmit}
            />
            <div className="warning-form">
              <Warning content={transactionStatus} />
            </div>
            {crossChainSteps && (
              <CrossChainStatus
                title="Cross-chain status"
                steps={crossChainSteps}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
