import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import Web3 from "web3";
import contractABI from "../../ABIs/lowjc_ABI.json";
import nowjcABI from "../../ABIs/nowjc_ABI.json";
import "./ViewReceivedApplication.css";
import Button from "../../components/Button/Button";
import VoteBar from "../../components/VoteBar/VoteBar";
import BackButton from "../../components/BackButton/BackButton";
import StatusButton from "../../components/StatusButton/StatusButton";
import Milestone from "../../components/Milestone/Milestone";
import Warning from "../../components/Warning/Warning";
import Collapse from "../../components/Collapse/Collapse";
import SkillBox from "../../components/SkillBox/SkillBox";
import { useChainDetection, useWalletAddress } from "../../hooks/useChainDetection";
import { getChainConfig, extractChainIdFromJobId } from "../../config/chainConfig";
import { switchToChain } from "../../utils/switchNetwork";
import { getLOWJCContract } from "../../services/localChainService";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";

// IPFS cache with 1-hour TTL
const ipfsCache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// USDC ERC20 ABI (minimal required functions)
const ERC20_ABI = [
  {
    "inputs": [
      {"internalType": "address", "name": "spender", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "approve",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "owner", "type": "address"}
    ],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
];

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
    `https://cloudflare-ipfs.com/ipfs/${hash}`,
    `https://dweb.link/ipfs/${hash}`
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



function JobdetailItem ({title, icon , amount, token}) {
  return (
    <div className="job-detail-item">
      <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
        <span className="job-detail-item-title">{title}</span>
        {icon && <img src="/fee.svg" alt="" />}
      </div>
      <div id="fetchedAmounts">
          {amount}{" "}
        <img src={token?"/token.svg":"/xdc.svg"} alt="USDC" className="usdc-iconJD" />
      </div>
    </div>
  )
}

function ATTACHMENTS({title}) {
    return (
      <div className="attachment-form">
        <img src="/attachments.svg" alt="" />
        <span>{title}</span>
      </div>
    )
  }

export default function ViewReceivedApplication() {
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get('jobId');
  const applicationId = searchParams.get('applicationId');
  
  const [application, setApplication] = useState(null);
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applicationDetails, setApplicationDetails] = useState(null);
  const [jobDetails, setJobDetails] = useState(null);
  const [milestoneDetails, setMilestoneDetails] = useState([]);
  const [transactionStatus, setTransactionStatus] = useState("Start job requires USDC approval and blockchain transaction fees");
  const [isProcessing, setIsProcessing] = useState(false);
  const hasFetchedRef = React.useRef(false);

  // Multi-chain hooks
  const { chainId: userChainId, chainConfig: userChainConfig } = useChainDetection();
  const { address: walletAddress, connect: connectWallet } = useWalletAddress();
  
  // Get job posting chain from jobId
  const jobChainId = jobId ? extractChainIdFromJobId(jobId) : null;
  const jobChainConfig = jobChainId ? getChainConfig(jobChainId) : null;

  // Fetch application data
  useEffect(() => {
    async function fetchApplicationData() {
      if (!jobId || !applicationId) {
        console.error("Missing jobId or applicationId in URL");
        setLoading(false);
        return;
      }

      if (!jobChainConfig) {
        console.error("Could not determine job posting chain");
        setLoading(false);
        return;
      }

      // Prevent duplicate fetches
      if (hasFetchedRef.current) {
        return;
      }
      hasFetchedRef.current = true;

      try {
        setLoading(true);
        const web3 = new Web3(jobChainConfig.rpcUrl);
        const contract = new web3.eth.Contract(contractABI, jobChainConfig.contracts.lowjc);

        // Fetch job data
        const jobData = await contract.methods.getJob(jobId).call();
        console.log("Job data:", jobData);
        setJob(jobData);

        // Fetch application data
        const appData = await contract.methods.getApplication(jobId, applicationId).call();
        console.log("Application data:", appData);
        setApplication(appData);

        // Fetch job details from IPFS
        if (jobData.jobDetailHash) {
          try {
            const jobDetailsData = await fetchFromIPFS(jobData.jobDetailHash);
            setJobDetails(jobDetailsData);
          } catch (error) {
            console.warn("Failed to fetch job details from IPFS:", error);
          }
        }

        // Fetch application details from IPFS
        if (appData.applicationHash) {
          try {
            const appDetails = await fetchFromIPFS(appData.applicationHash);
            setApplicationDetails(appDetails);
          } catch (error) {
            console.warn("Failed to fetch application details from IPFS:", error);
          }
        }

        // Fetch milestone details from IPFS
        if (appData.proposedMilestones && appData.proposedMilestones.length > 0) {
          const milestonePromises = appData.proposedMilestones.map(async (milestone, index) => {
            if (milestone.descriptionHash) {
              try {
                const milestoneData = await fetchFromIPFS(milestone.descriptionHash);
                return {
                  ...milestoneData,
                  amount: (parseFloat(milestone.amount) / 1000000).toFixed(2), // Convert from USDC units
                  index
                };
              } catch (error) {
                console.warn(`Failed to fetch milestone ${index} from IPFS:`, error);
                return {
                  title: `Milestone ${index + 1}`,
                  content: "Failed to load milestone details",
                  amount: (parseFloat(milestone.amount) / 1000000).toFixed(2),
                  index
                };
              }
            }
            return {
              title: `Milestone ${index + 1}`,
              content: "No description available",
              amount: (parseFloat(milestone.amount) / 1000000).toFixed(2),
              index
            };
          });

          const milestones = await Promise.all(milestonePromises);
          setMilestoneDetails(milestones);
        }

        setLoading(false);
      } catch (error) {
        console.error("Error fetching application data:", error);
        setLoading(false);
        hasFetchedRef.current = false; // Allow retry on error
      }
    }

    if ((jobId && applicationId && jobChainConfig) && !hasFetchedRef.current) {
      fetchApplicationData();
    }
  }, [jobId, applicationId, jobChainConfig]);

  const formatWalletAddress = (address) => {
    if (!address) return "Unknown";
    return `${address.substring(0, 6)}...${address.substring(38)}`;
  };

  const getTotalAmount = () => {
    return milestoneDetails.reduce((sum, milestone) => sum + parseFloat(milestone.amount), 0).toFixed(2);
  };

  const handleStartJob = async () => {
    // Comprehensive validation before starting
    if (!walletAddress) {
      setTransactionStatus("❌ Please connect your wallet first");
      return;
    }

    // Validate that the connected wallet is the job giver
    if (job && job.jobGiver && walletAddress.toLowerCase() !== job.jobGiver.toLowerCase()) {
      setTransactionStatus("❌ Only the job poster can start this job");
      return;
    }

    if (!jobId) {
      setTransactionStatus("❌ Job ID not found");
      return;
    }

    if (!applicationId) {
      setTransactionStatus("❌ Application ID not found");
      return;
    }

    if (!milestoneDetails || milestoneDetails.length === 0) {
      setTransactionStatus("❌ No milestone data available - cannot calculate funding amount");
      return;
    }

    // Get first milestone amount from job's original milestones (since useAppMilestones = false)
    const firstMilestoneAmount = job ? (parseFloat(job.milestonePayments[0]?.amount || 0) / 1000000) : 0;
    if (firstMilestoneAmount <= 0) {
      setTransactionStatus("❌ Invalid milestone amount - must be greater than 0");
      return;
    }

    // CRITICAL: Validate user is on POSTING chain
    if (!jobChainId || !jobChainConfig) {
      setTransactionStatus("❌ Could not determine job posting chain from job ID");
      return;
    }

    if (userChainId !== jobChainId) {
      setTransactionStatus(`⚠️ Please switch to ${jobChainConfig.name} to start this job. StartJob must be called from the posting chain.`);
      try {
        await switchToChain(jobChainId);
        setTransactionStatus(`Switched to ${jobChainConfig.name}. Please try again.`);
      } catch (switchError) {
        setTransactionStatus(`❌ Failed to switch to ${jobChainConfig.name}: ${switchError.message}`);
      }
      return;
    }

    try {
      setIsProcessing(true);
      setTransactionStatus(`🔄 Validating requirements on ${jobChainConfig.name}...`);
      console.log("🚀 Starting job flow:", { jobId, applicationId, firstMilestoneAmount, chain: jobChainConfig.name });
      
      // Initialize Web3
      const web3 = new Web3(window.ethereum);
      
      // Get chain-specific contract addresses
      const usdcTokenAddress = jobChainConfig.contracts.usdc;
      const lowjcAddress = jobChainConfig.contracts.lowjc;
      
      if (!usdcTokenAddress || !lowjcAddress) {
        throw new Error(`Contract addresses not configured for ${jobChainConfig.name}`);
      }
      
      // Initialize contracts
      const usdcContract = new web3.eth.Contract(ERC20_ABI, usdcTokenAddress);
      const lowjcContract = await getLOWJCContract(jobChainId);
      
      // Calculate amount in USDC units (6 decimals)
      const amountInUSDCUnits = Math.floor(firstMilestoneAmount * 1000000);
      
      // Check user's USDC balance before approval
      setTransactionStatus("🔍 Checking USDC balance...");
      const userBalance = await usdcContract.methods.balanceOf(walletAddress).call();
      const balanceInUSDC = parseFloat(userBalance) / 1000000;
      
      if (parseFloat(userBalance) < amountInUSDCUnits) {
        throw new Error(`Insufficient USDC balance. Required: ${firstMilestoneAmount} USDC, Available: ${balanceInUSDC.toFixed(2)} USDC`);
      }
      
      console.log(`✅ USDC balance check passed: ${balanceInUSDC.toFixed(2)} USDC available`);
      
      // ============ STEP 1: USDC APPROVAL ============
      setTransactionStatus(`💰 Step 1/3: Approving ${firstMilestoneAmount} USDC spending - Please confirm in MetaMask`);
      
      const approveTx = await usdcContract.methods.approve(
        lowjcAddress, 
        amountInUSDCUnits.toString()
      ).send({ from: walletAddress });
      
      if (!approveTx || !approveTx.transactionHash) {
        throw new Error("Approval transaction failed");
      }
      
      console.log("✅ USDC approval confirmed:", approveTx.transactionHash);
      setTransactionStatus(`✅ Step 1/3: USDC approval confirmed`);
      
      // Wait for transaction to be properly mined
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // ============ STEP 2: START JOB ON POSTING CHAIN ============
      setTransactionStatus(`🔧 Step 2/3: Getting LayerZero fee quote on ${jobChainConfig.name}...`);
      
      // Get LayerZero fee quote from bridge
      const bridgeAddress = await lowjcContract.methods.bridge().call();
      console.log("Bridge address:", bridgeAddress);
      
      // Bridge ABI for quoteNativeChain function
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
      
      // LayerZero options from config
      const nativeOptions = jobChainConfig.layerzero.options;
      
      // Encode payload matching LOWJC's internal encoding for startJob
      // LOWJC sends: abi.encode("startJob", msg.sender, _jobId, _applicationId, _useAppMilestones)
      const payload = web3.eth.abi.encodeParameters(
        ['string', 'address', 'string', 'uint256', 'bool'],
        ['startJob', walletAddress, jobId, parseInt(applicationId), false]
      );
      
      // Get quote from bridge
      const quotedFee = await bridgeContract.methods.quoteNativeChain(payload, nativeOptions).call();
      console.log(`💰 LayerZero quoted fee: ${web3.utils.fromWei(quotedFee, 'ether')} ETH`);
      
      setTransactionStatus(`🔧 Step 2/3: Starting job on ${jobChainConfig.name} - Please confirm in MetaMask`);
      
      const startJobTx = await lowjcContract.methods.startJob(
        jobId,
        parseInt(applicationId), 
        false, // useAppMilestones
        nativeOptions
      ).send({
        from: walletAddress,
        value: quotedFee // Use the exact LayerZero quoted fee
      });
      
      if (!startJobTx || !startJobTx.transactionHash) {
        throw new Error("Start job transaction failed");
      }
      
      console.log(`✅ Job started on ${jobChainConfig.name}:`, startJobTx.transactionHash);
      setTransactionStatus(`✅ Step 2/3: Job started on ${jobChainConfig.name}`);
      
      // ============ STEP 3: SEND TO BACKEND & POLL FOR STATUS ============
      setTransactionStatus("📡 Step 3/3: Backend processing CCTP transfer...");
      console.log("📡 Sending tx hash to backend for CCTP processing");
      
      // Send to backend
      const backendResponse = await fetch(`${BACKEND_URL}/api/start-job`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          jobId, 
          txHash: startJobTx.transactionHash 
        })
      });
      
      if (!backendResponse.ok) {
        throw new Error('Backend failed to accept request');
      }
      
      const backendData = await backendResponse.json();
      console.log("✅ Backend accepted request:", backendData);
      
      // Poll backend for status updates
      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await fetch(`${BACKEND_URL}/api/start-job-status/${jobId}`);
          
          if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            console.log("📊 Backend status:", statusData);
            
            // Update UI based on status
            if (statusData.status === 'polling_attestation') {
              setTransactionStatus("⏳ Backend: Polling Circle API for CCTP attestation...");
            } else if (statusData.status === 'executing_receive') {
              setTransactionStatus("🔗 Backend: Executing receive() on Arbitrum...");
            } else if (statusData.status === 'completed') {
              clearInterval(pollInterval);
              setTransactionStatus("🎉 Cross-chain transfer completed! Redirecting...");
              console.log("✅ Job fully synchronized across chains");
              
              setTimeout(() => {
                window.location.href = `/job-deep-view/${jobId}`;
              }, 2000);
            } else if (statusData.status === 'failed') {
              clearInterval(pollInterval);
              throw new Error(statusData.error || 'Backend processing failed');
            }
          }
        } catch (pollError) {
          console.warn("Status poll error:", pollError);
        }
      }, 3000); // Poll every 3 seconds
      
      // Set a timeout to stop polling after 10 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        setTransactionStatus("⏰ Backend processing is taking longer than expected. You can check the job status later.");
        setIsProcessing(false);
      }, 600000);
      
    } catch (error) {
      console.error("❌ Start job error:", error);
      
      let errorMessage = error.message;
      if (error.code === 4001) {
        errorMessage = "Transaction cancelled by user";
      } else if (error.message.includes("insufficient funds")) {
        errorMessage = "Insufficient ETH for gas fees";
      } else if (error.message.includes("execution reverted")) {
        errorMessage = "Transaction failed - contract requirements not met";
      }
      
      setTransactionStatus(`❌ Error: ${errorMessage}`);
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-containerT">
        <div className="loading-icon">
          <img src="/OWIcon.svg" alt="Loading..." />
        </div>
        <div className="loading-message">
          <h1 id="txText">Loading Application...</h1>
          <p id="txSubtext">
            Fetching application details from the blockchain and IPFS.
          </p>
        </div>
      </div>
    );
  }

  if (!application || !job) {
    return (
      <div className="release-payment-container">
        <div className="form-container-release">
          <div className="form-header" style={{marginTop:'109px'}}>
            <BackButton to={`/job-deep-view/${jobId}`} style={{gap: '20px'}} title="Application Not Found"/>
          </div>
          <div className="form-body">
            <p>Application not found. Please check the URL parameters.</p>
            <p>Expected: /view-received-application?jobId={jobId}&applicationId={applicationId}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="release-payment-container">
        <div className="form-container-release">
        <div className="form-header" style={{marginTop:'109px'}}>
          <BackButton to={`/job-deep-view/${jobId}`} style={{gap: '20px'}} title={`Application for Job ${jobId}`}/>
          <StatusButton status={'Pending'} statusCss={'pending-status'}/>
        </div>
          <div className="form-body">
            <Collapse 
              title={jobDetails?.title || `Job ${jobId}`}
              content={
                <div style={{ padding: '10px 0' }}>
                  <p style={{ marginBottom: '10px', lineHeight: '1.6' }}>
                    {jobDetails?.description || "Loading job details..."}
                  </p>
                  {jobDetails?.skills && jobDetails.skills.length > 0 && (
                    <div>
                      <strong>Required Skills:</strong>
                      <div className="skills-required" style={{ marginTop: '8px' }}>
                        {jobDetails.skills.map((skill, idx) => (
                          <SkillBox key={idx} title={skill} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              }
            />
            <div>
                <div className="detail-row">
                    <span className="detail-label">APPLICATION SUBMITTED BY</span>
                    <div className="detail-profile">
                    <span className="detail-value-address">
                        <img src="/person.svg" alt="Applicant" className="Job" />
                        <p>{formatWalletAddress(application.applicant)}</p>
                    </span>
                    </div>
                </div>
            </div>
            <div>
                <div className="detail-row">
                    <span className="detail-label">DESCRIPTION</span>
                    <div className="detail-value description-value">
                        <p>{applicationDetails?.description || "No description available"}</p>
                    </div>
                </div>
            </div>
            <div>
                <div className="detail-row category">
                    <span>ATTACHMENTS</span>
                    <div className="upload-content">
                        <ATTACHMENTS title={'Scope of work.pdf'}/>
                        <ATTACHMENTS title={'Reference 1.png'}/>
                    </div>
                </div>
            </div>
            <div className="milestone-section">
                <div className="milestone-section-header">
                    <span>MILESTONES</span>
                </div>
                <div className="milestone-section-body">
                    {milestoneDetails.length > 0 ? (
                      milestoneDetails.map((milestone, index) => (
                        <Milestone 
                          key={index}
                          amount={milestone.amount} 
                          title={milestone.title} 
                          content={milestone.content} 
                          editable={false}
                        />
                      ))
                    ) : (
                      <div style={{ padding: "20px", textAlign: "center", color: "#666" }}>
                        No milestones defined for this application
                      </div>
                    )}
                </div>
            </div>
            <div className="form-platformFee">
              <div className="platform-fee">
                <span>REVISED COST</span>
                <img src="/fee.svg" alt="" />
              </div>
              <div className="compensation-amount">
                <span>{getTotalAmount()}</span>
                <img src="/xdc.svg" alt="USDC" className="usdc-iconJD" />
              </div>
            </div>
            <div>
               <div className="vote-button-section">
                    <Button 
                      label={isProcessing ? 'Processing Multi-Chain Transaction...' : 'Start Job (Cross-Chain Process)'} 
                      buttonCss={'downvote-button upvote-button'}
                      onClick={handleStartJob}
                      style={{ 
                        width: '100%',
                        opacity: isProcessing ? 0.7 : 1,
                        cursor: isProcessing ? 'not-allowed' : 'pointer'
                      }}
                      disabled={isProcessing}
                    />
               </div>
               <div className="warning-form">
                 <Warning content={transactionStatus} />
               </div>
               {jobChainConfig && userChainId !== jobChainId && (
                 <div className="warning-form">
                   <Warning 
                     content={`⚠️ StartJob requires ${jobChainConfig.name}. You are on ${userChainConfig?.name || 'unknown chain'}. Please switch networks.`} 
                     icon="/triangle_warning.svg"
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
