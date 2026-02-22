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
import { getChainConfig, extractChainIdFromJobId, getNativeChain, isMainnet, buildLzOptions, DESTINATION_GAS_ESTIMATES } from "../../config/chainConfig";
import { switchToChain } from "../../utils/switchNetwork";
import { getLOWJCContract } from "../../services/localChainService";
import CrossChainStatus, { buildPaymentSteps } from "../../components/CrossChainStatus/CrossChainStatus";
import { monitorLZMessage, monitorCCTPTransfer, STATUS } from "../../utils/crossChainMonitor";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

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
  },
  {
    "inputs": [
      {"internalType": "address", "name": "owner", "type": "address"},
      {"internalType": "address", "name": "spender", "type": "address"}
    ],
    "name": "allowance",
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
    `https://gateway.lighthouse.storage/ipfs/${hash}`,
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
  const [crossChainSteps, setCrossChainSteps] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const hasFetchedRef = React.useRef(false);
  const [cctpStatus, setCctpStatus] = useState(null);
  const [useAppMilestones, setUseAppMilestones] = useState(false);

  // Multi-chain hooks
  const { chainId: userChainId, chainConfig: userChainConfig } = useChainDetection();
  const { address: walletAddress, connect: connectWallet } = useWalletAddress();
  
  // Get job posting chain from jobId
  const jobChainId = jobId ? extractChainIdFromJobId(jobId) : null;
  const jobChainConfig = jobChainId ? getChainConfig(jobChainId) : null;

  // Check if job is already started (selectedApplicant is non-zero address)
  const isJobStarted = job?.selectedApplicant && job.selectedApplicant !== '0x0000000000000000000000000000000000000000';
  const isThisApplicationSelected = isJobStarted && job?.selectedApplicationId?.toString() === applicationId;

  // Fetch application data
  useEffect(() => {
    async function fetchApplicationData() {
      if (!jobId || !applicationId) {
        console.error("Missing jobId or applicationId in URL");
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
        console.log("Fetching application data for:", { jobId, applicationId });
        
        // Applications are stored on Arbitrum Genesis (native chain), not on local chain
        const nativeChain = getNativeChain();
        const ARBITRUM_RPC = nativeChain?.rpcUrl;
        const GENESIS_CONTRACT = nativeChain?.contracts?.genesis;

        console.log(`🔗 Using ${isMainnet() ? 'MAINNET' : 'TESTNET'} - Genesis: ${GENESIS_CONTRACT}`);
        console.log("Using RPC:", ARBITRUM_RPC);

        const web3 = new Web3(ARBITRUM_RPC);
        const genesisABI = [{
          "inputs": [
            {"name": "jobId", "type": "string"},
            {"name": "applicationId", "type": "uint256"}
          ],
          "name": "getJobApplication",
          "outputs": [{
            "type": "tuple",
            "components": [
              {"name": "id", "type": "uint256"},
              {"name": "jobId", "type": "string"},
              {"name": "applicant", "type": "address"},
              {"name": "applicationHash", "type": "string"},
              {"name": "proposedMilestones", "type": "tuple[]", "components": [
                {"name": "descriptionHash", "type": "string"},
                {"name": "amount", "type": "uint256"}
              ]},
              {"name": "preferredPaymentChainDomain", "type": "uint32"},
              {"name": "preferredPaymentAddress", "type": "address"},
              {"name": "status", "type": "uint8"}
            ]
          }],
          "stateMutability": "view",
          "type": "function"
        }, {
          "inputs": [{"name": "_jobId", "type": "string"}],
          "name": "getJob",
          "outputs": [{
            "type": "tuple",
            "components": [
              {"name": "id", "type": "string"},
              {"name": "jobGiver", "type": "address"},
              {"name": "applicants", "type": "address[]"},
              {"name": "jobDetailHash", "type": "string"},
              {"name": "status", "type": "uint8"},
              {"name": "workSubmissions", "type": "string[]"},
              {"name": "milestonePayments", "type": "tuple[]", "components": [
                {"name": "descriptionHash", "type": "string"},
                {"name": "amount", "type": "uint256"}
              ]},
              {"name": "finalMilestones", "type": "tuple[]", "components": [
                {"name": "descriptionHash", "type": "string"},
                {"name": "amount", "type": "uint256"}
              ]},
              {"name": "totalPaid", "type": "uint256"},
              {"name": "currentLockedAmount", "type": "uint256"},
              {"name": "currentMilestone", "type": "uint256"},
              {"name": "selectedApplicant", "type": "address"},
              {"name": "selectedApplicationId", "type": "uint256"},
              {"name": "totalEscrowed", "type": "uint256"},
              {"name": "totalReleased", "type": "uint256"}
            ]
          }],
          "stateMutability": "view", 
          "type": "function"
        }, {
          "inputs": [{"name": "jobId", "type": "string"}],
          "name": "getJobApplicationCount",
          "outputs": [{"name": "", "type": "uint256"}],
          "stateMutability": "view",
          "type": "function"
        }];
        
        const contract = new web3.eth.Contract(genesisABI, GENESIS_CONTRACT);

        // Fetch job data
        const jobData = await contract.methods.getJob(jobId).call();
        console.log("Job data:", jobData);
        
        // Check if job exists
        if (!jobData || !jobData.jobGiver || jobData.jobGiver === '0x0000000000000000000000000000000000000000') {
          console.error(`Job ${jobId} not found`);
          setJob(null);
          setLoading(false);
          return;
        }
        
        setJob(jobData);

        // Check application count first
        const appCount = await contract.methods.getJobApplicationCount(jobId).call();
        console.log(`Total applications for job ${jobId}: ${appCount}`);
        
        const appIdNum = parseInt(applicationId);
        if (appIdNum > parseInt(appCount) || appIdNum < 1) {
          console.error(`Application ID ${appIdNum} is out of range. Valid range: 1-${appCount}`);
          setApplication(null);
          setLoading(false);
          return;
        }

        // Fetch application data from Genesis
        const appData = await contract.methods.getJobApplication(jobId, appIdNum).call();
        console.log("Application data:", appData);
        
        // Check if application exists (application ID should be non-zero)
        if (!appData || !appData.applicant || appData.applicant === '0x0000000000000000000000000000000000000000') {
          console.error(`Application ${applicationId} not found for job ${jobId}`);
          setApplication(null);
          setLoading(false);
          return;
        }
        
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

    if ((jobId && applicationId) && !hasFetchedRef.current) {
      fetchApplicationData();
    }
  }, [jobId, applicationId]);

  // Poll CCTP status for this job
  useEffect(() => {
    if (!jobId) return;

    const pollCCTPStatus = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/cctp-status/startJob/${jobId}`);
        const data = await response.json();
        
        if (data.found) {
          setCctpStatus(data);
        }
      } catch (error) {
        console.warn('CCTP status poll error:', error);
      }
    };

    pollCCTPStatus();
    const interval = setInterval(pollCCTPStatus, 5000); // Poll every 5 seconds
    
    return () => clearInterval(interval);
  }, [jobId]);

  // Retry CCTP transfer
  const handleRetryCCTP = async () => {
    try {
      setTransactionStatus('🔄 Retrying CCTP transfer...');
      const response = await fetch(`${BACKEND_URL}/api/cctp-retry/startJob/${jobId}`, {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.success) {
        setTransactionStatus(`✅ Retry initiated (Attempt ${data.retryCount}). Monitoring...`);
      } else {
        setTransactionStatus(`❌ Retry failed: ${data.error}`);
      }
    } catch (error) {
      setTransactionStatus(`❌ Retry error: ${error.message}`);
    }
  };

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

    // Get first milestone amount based on whether we're using applicant's milestones
    let firstMilestoneAmount;
    if (useAppMilestones && milestoneDetails.length > 0) {
      // Use applicant's proposed milestone amount (already in USDC format from IPFS fetch)
      firstMilestoneAmount = parseFloat(milestoneDetails[0].amount);
    } else {
      // Use job giver's original milestone amount
      firstMilestoneAmount = job ? (parseFloat(job.milestonePayments[0]?.amount || 0) / 1000000) : 0;
    }
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

      // ============ STEP 1: CHECK ALLOWANCE & APPROVE IF NEEDED ============
      setTransactionStatus("🔍 Checking USDC allowance...");
      const currentAllowance = await usdcContract.methods.allowance(walletAddress, lowjcAddress).call();
      console.log(`📊 Current allowance: ${parseFloat(currentAllowance) / 1000000} USDC, Required: ${firstMilestoneAmount} USDC`);

      if (BigInt(currentAllowance) < BigInt(amountInUSDCUnits)) {
        setTransactionStatus(`💰 Step 1/3: Approving USDC spending (MaxUint256) - Please confirm in MetaMask`);

        // Approve MaxUint256 so the contract never needs re-approval
        const MAX_UINT256 = "115792089237316195423570985008687907853269984665640564039457584007913129639935";
        const approveTx = await usdcContract.methods.approve(
          lowjcAddress,
          MAX_UINT256
        ).send({ from: walletAddress, gas: 100000 });

        if (!approveTx || !approveTx.transactionHash) {
          throw new Error("Approval transaction failed");
        }

        console.log("✅ USDC approval confirmed:", approveTx.transactionHash);
        setTransactionStatus(`✅ Step 1/3: USDC approval confirmed`);

        // Wait for transaction to be properly mined
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        console.log("✅ Sufficient allowance already exists, skipping approval");
        setTransactionStatus(`✅ Step 1/3: USDC allowance already sufficient`);
      }
      
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

      // Build LZ options with appropriate destination gas for START_JOB
      const destGas = DESTINATION_GAS_ESTIMATES.START_JOB;
      const lzOptions = buildLzOptions(destGas);
      console.log(`⛽ Destination gas (Arbitrum): ${destGas} for START_JOB`);

      // Encode payload matching LOWJC's internal encoding for startJob
      // LOWJC sends: abi.encode("startJob", msg.sender, _jobId, _applicationId, _useAppMilestones)
      const payload = web3.eth.abi.encodeParameters(
        ['string', 'address', 'string', 'uint256', 'bool'],
        ['startJob', walletAddress, jobId, parseInt(applicationId), useAppMilestones]
      );

      // Get quote from bridge and add 30% buffer + CCTP buffer
      const quotedFee = await bridgeContract.methods.quoteNativeChain(payload, lzOptions).call();
      const lzFee = BigInt(quotedFee) * BigInt(130) / BigInt(100); // +30% buffer
      const cctpBuffer = BigInt(web3.utils.toWei('0.0003', 'ether')); // safety buffer for CCTP relay
      const totalFee = lzFee + cctpBuffer;
      console.log(`💰 LayerZero quote: ${web3.utils.fromWei(quotedFee.toString(), 'ether')} ETH`);
      console.log(`💰 Total (LZ+30%+buffer): ${web3.utils.fromWei(totalFee.toString(), 'ether')} ETH`);

      // Get current gas price for EIP-1559
      const gasPrice = await web3.eth.getGasPrice();

      setTransactionStatus(`🔧 Step 2/3: Starting job on ${jobChainConfig.name} - Please confirm in MetaMask`);

      const startJobTx = await lowjcContract.methods.startJob(
        jobId,
        parseInt(applicationId),
        useAppMilestones,
        lzOptions
      ).send({
        from: walletAddress,
        value: totalFee.toString(),
        gas: 1000000, // Higher gas for USDC transfer + LZ + CCTP
        maxPriorityFeePerGas: web3.utils.toWei('0.001', 'gwei'),
        maxFeePerGas: gasPrice
      });
      
      if (!startJobTx || !startJobTx.transactionHash) {
        throw new Error("Start job transaction failed");
      }
      
      console.log(`✅ Job started on ${jobChainConfig.name}:`, startJobTx.transactionHash);
      setTransactionStatus(`✅ Job started on ${jobChainConfig.name}. Tracking cross-chain progress...`);

      // ── Client-side cross-chain monitoring (works even if backend is down) ──
      const srcTxHash  = startJobTx.transactionHash;
      const srcChainId = jobChainId;
      const lzLink     = `https://layerzeroscan.com/tx/${srcTxHash}`;
      const circleLink = `https://iris-api.circle.com/v2/messages/${jobChainConfig?.cctpDomain ?? 2}?transactionHash=${srcTxHash}`;

      setCrossChainSteps(buildPaymentSteps({
        sourceChainId: srcChainId,
        usdcApproved: true,
        sourceTxHash: srcTxHash,
        lzStatus: 'active',
        lzLink,
        circleLink,
      }));

      monitorLZMessage(srcTxHash, (lzUpdate) => {
        setCrossChainSteps(() => buildPaymentSteps({
          sourceChainId: srcChainId,
          usdcApproved: true,
          sourceTxHash: srcTxHash,
          lzStatus:     lzUpdate.status === STATUS.SUCCESS ? 'delivered'
                      : lzUpdate.status === STATUS.FAILED  ? 'failed' : 'active',
          lzLink:       lzUpdate.lzLink || lzLink,
          lzDstTxHash:  lzUpdate.dstTxHash,
          lzDstChainId: 42161,
          cctpBurnTxHash: lzUpdate.dstTxHash,
          cctpSourceDomain: 3,
          circleLink,
        }));
        if (lzUpdate.status === STATUS.SUCCESS && lzUpdate.dstTxHash) {
          monitorCCTPTransfer(lzUpdate.dstTxHash, 3,
            (cu) => setCrossChainSteps(() => buildPaymentSteps({
              sourceChainId: srcChainId, usdcApproved: true, sourceTxHash: srcTxHash,
              lzStatus: 'delivered', lzDstTxHash: lzUpdate.dstTxHash, lzDstChainId: 42161,
              cctpBurnTxHash: lzUpdate.dstTxHash, cctpSourceDomain: 3, lzLink, circleLink,
              cctpAttestationStatus: cu.status === STATUS.SUCCESS ? 'complete'
                                   : cu.message?.includes('slow') ? 'slow' : 'pending',
            })),
            () => setCrossChainSteps(() => buildPaymentSteps({
              sourceChainId: srcChainId, usdcApproved: true, sourceTxHash: srcTxHash,
              lzStatus: 'delivered', lzDstTxHash: lzUpdate.dstTxHash, lzDstChainId: 42161,
              cctpBurnTxHash: lzUpdate.dstTxHash, cctpSourceDomain: 3, lzLink, circleLink,
              cctpAttestationStatus: 'complete',
            }))
          );
        }
      });
      // ──────────────────────────────────────────────────────────────────────

      // Also notify backend for server-side relay (belt + suspenders)
      setTransactionStatus("📡 Monitoring CCTP transfer to Arbitrum...");
      try {
        const backendResponse = await fetch(`${BACKEND_URL}/api/start-job`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId, txHash: srcTxHash })
        });
        if (backendResponse.ok) {
          const backendData = await backendResponse.json();
          console.log("✅ Backend accepted request:", backendData);
        }
      } catch (backendErr) {
        console.warn("⚠️ Backend unavailable, relying on client-side monitoring:", backendErr.message);
        setTransactionStatus("⚠️ Backend offline — tracking via LayerZero & Circle APIs directly. See progress below.");
      }
      
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

  if (!job) {
    return (
      <div className="release-payment-container">
        <div className="form-container-release">
          <div className="form-header" style={{marginTop:'109px'}}>
            <BackButton to="/browse-jobs" style={{gap: '20px'}} title="Job Not Found"/>
          </div>
          <div className="form-body">
            <p>Job {jobId} not found. The job may not exist on the blockchain.</p>
            <p>Please check the job ID and try again.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="release-payment-container">
        <div className="form-container-release">
          <div className="form-header" style={{marginTop:'109px'}}>
            <BackButton to={`/job-deep-view/${jobId}`} style={{gap: '20px'}} title="Application Not Found"/>
          </div>
          <div className="form-body">
            <p>Application #{applicationId} not found for Job {jobId}.</p>
            <p>This could mean:</p>
            <ul style={{ textAlign: 'left', marginTop: '10px' }}>
              <li>The application ID doesn't exist yet</li>
              <li>The application hasn't been submitted to the blockchain</li>
              <li>There's a network sync issue</li>
            </ul>
            <p style={{ marginTop: '15px' }}>Please check the console for more details or try refreshing the page.</p>
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
            {applicationDetails?.attachments && applicationDetails.attachments.length > 0 && (
            <div>
                <div className="detail-row category">
                    <span>ATTACHMENTS</span>
                    <div className="upload-content">
                        {applicationDetails.attachments.map((file, index) => (
                          <a
                            key={index}
                            href={`https://gateway.lighthouse.storage/ipfs/${file.ipfsHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ textDecoration: 'none' }}
                          >
                            <ATTACHMENTS title={file.name}/>
                          </a>
                        ))}
                    </div>
                </div>
            </div>
            )}
            <div className="milestone-section">
                <div className="milestone-section-header">
                    <span>MILESTONES</span>
                </div>
                <div className="milestone-toggle-container">
                    <div className="milestone-toggle-label">
                        <span className="milestone-toggle-title">Accept applicant's milestones</span>
                        <span className="milestone-toggle-desc">Use applicant's proposed milestones instead of original job milestones</span>
                    </div>
                    <label className="milestone-toggle-switch">
                        <input
                            type="checkbox"
                            checked={useAppMilestones}
                            onChange={(e) => setUseAppMilestones(e.target.checked)}
                        />
                        <span className="milestone-toggle-slider"></span>
                    </label>
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
               {/* Show different UI based on whether job is already started */}
               {isJobStarted ? (
                 <>
                   <div className="warning-form">
                     <Warning
                       content={isThisApplicationSelected
                         ? `✅ This application was selected - Job is in progress with ${job?.selectedApplicant?.slice(0, 6)}...${job?.selectedApplicant?.slice(-4)}`
                         : '⚠️ Job already started with a different applicant'
                       }
                     />
                   </div>
                 </>
               ) : (
                 <>
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

                   {/* CCTP Status Warnings */}
                   {cctpStatus?.status === 'pending' && (
                     <div className="warning-form">
                       <Warning
                         content={`⏳ Cross-chain transfer processing: ${cctpStatus.step || 'polling attestation'}...`}
                         icon="/info.svg"
                       />
                     </div>
                   )}

                   {cctpStatus?.status === 'failed' && (
                     <>
                       <div className="warning-form">
                         <Warning
                           content={`⚠️ Transfer incomplete: ${cctpStatus.lastError}. Retry attempts: ${cctpStatus.retryCount}`}
                           icon="/orange-warning.svg"
                         />
                       </div>
                       <div style={{marginTop: '12px'}}>
                         <Button
                           label="Retry CCTP Transfer"
                           buttonCss={'downvote-button upvote-button'}
                           onClick={handleRetryCCTP}
                           style={{ width: '100%' }}
                         />
                       </div>
                     </>
                   )}

                   {jobChainConfig && userChainId !== jobChainId && (
                     <div className="warning-form">
                       <Warning
                         content={`⚠️ StartJob requires ${jobChainConfig.name}. You are on ${userChainConfig?.name || 'unknown chain'}. Please switch networks.`}
                         icon="/triangle_warning.svg"
                       />
                     </div>
                   )}

                   {/* Client-side cross-chain progress tracker */}
                   {crossChainSteps && (
                     <CrossChainStatus
                       title="Start job cross-chain status"
                       steps={crossChainSteps}
                     />
                   )}
                 </>
               )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
