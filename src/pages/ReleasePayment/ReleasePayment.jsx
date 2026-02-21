import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Web3 from "web3";
import contractABI from "../../ABIs/nowjc_ABI.json";
import lowjcABI from "../../ABIs/lowjc_ABI.json";
import "./ReleasePayment.css";
import PaymentItem from "../../components/PaymentItem/PaymentItem";
import DropDown from "../../components/DropDown/DropDown";
import Warning from "../../components/Warning/Warning";
import Milestone from "../../components/Milestone/Milestone";
import BlueButton from "../../components/BlueButton/BlueButton";
import { useChainDetection, useWalletAddress } from "../../hooks/useChainDetection";
import { getChainConfig, extractChainIdFromJobId, getNativeChain, isMainnet, buildLzOptions, DESTINATION_GAS_ESTIMATES } from "../../config/chainConfig";
import { switchToChain } from "../../utils/switchNetwork";
import { getLOWJCContract } from "../../services/localChainService";
import CrossChainStatus, { buildPaymentSteps } from "../../components/CrossChainStatus/CrossChainStatus";
import { monitorLZMessage, monitorCCTPTransfer, STATUS } from "../../utils/crossChainMonitor";

const OPTIONS = [
  'Milestone 1','Milestone 2','Milestone 3'
]

function JobdetailItem ({title, icon , amount}) {
  return (
    <div className="job-detail-item">
      <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
        <span className="job-detail-item-title">{title}</span>
        {icon && <img src="/fee.svg" alt="" />}
      </div>
      <div id="fetchedAmounts">
          {amount}{" "}
        <img src="/xdc.svg" alt="USDC" className="usdc-iconJD" />
      </div>
    </div>
  )
}

export default function ReleasePayment() {
  const { jobId } = useParams();
  const [job, setJob] = useState(null);
  const [releaseAmount, setReleaseAmount] = useState("");
  const [note, setNote] = useState("");
  const [account, setAccount] = useState(null);
  const navigate = useNavigate();
  const [loadingT, setLoadingT] = useState("");
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [transactionStatus, setTransactionStatus] = useState("Click to release milestone payment");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  const [currentMilestoneNumber, setCurrentMilestoneNumber] = useState(1);
  const [cctpStatus, setCctpStatus] = useState(null);
  // Client-side cross-chain status tracking (fallback when backend is down)
  const [paymentStepState, setPaymentStepState] = useState(null);

  // Multi-chain hooks
  const { chainId: userChainId, chainConfig: userChainConfig } = useChainDetection();
  const { address: walletAddress, connect: connectWallet } = useWalletAddress();
  
  // Get job posting chain from jobId
  const jobChainId = jobId ? extractChainIdFromJobId(jobId) : null;
  const jobChainConfig = jobChainId ? getChainConfig(jobChainId) : null;

  function formatWalletAddressH(address) {
    if (!address) return "";
    const start = address.substring(0, 4);
    const end = address.substring(address.length - 4);
    return `${start}....${end}`;
  }


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

  function formatWalletAddress(address) {
    if (!address) return "";
    const start = address.substring(0, 6);
    const end = address.substring(address.length - 4);
    return `${start}....${end}`;
  }

  const toggleDropdown = () => {
    setDropdownVisible(!dropdownVisible);
  };

  const disconnectWallet = () => {
    setWalletAddress("");
    setDropdownVisible(false);
  };

  useEffect(() => {
    async function fetchJobDetails() {
      try {

        // Use NOWJC contract on Arbitrum (dynamic based on network mode)
        const nativeChain = getNativeChain();
        const rpcUrl = isMainnet()
          ? import.meta.env.VITE_ARBITRUM_MAINNET_RPC_URL
          : import.meta.env.VITE_ARBITRUM_SEPOLIA_RPC_URL;
        const contractAddress = nativeChain.contracts.nowjc;

        console.log(`📡 Network mode: ${isMainnet() ? 'mainnet' : 'testnet'}, NOWJC: ${contractAddress}`);

        const web3 = new Web3(rpcUrl);
        const contract = new web3.eth.Contract(contractABI, contractAddress);

        // Fetch job details from NOWJC contract
        const jobData = await contract.methods.getJob(jobId).call();
        console.log("📋 Job data from NOWJC:", jobData);
        
        // Check if job exists (id should not be empty)
        if (!jobData.id || jobData.id === "") {
          console.warn("Job not found or not synced yet");
          setJob(null);
          setLoading(false);
          return;
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

        // Calculate amounts from milestone payments (USDC with 6 decimals)
        const totalBudget = jobData.milestonePayments.reduce((sum, milestone) => {
          return sum + parseFloat(milestone.amount);
        }, 0);
        
        const totalBudgetUSDC = (totalBudget / 1000000).toFixed(2); // Convert from USDC units

        // Get current milestone information from contract data
        const currentMilestone = jobData.currentMilestone ? Number(jobData.currentMilestone) : 0;
        const totalPaid = jobData.totalPaid || "0";
        
        // Parse milestone payments properly - use finalMilestones if applicant was selected
        const milestonePayments = jobData.finalMilestones && jobData.finalMilestones.length > 0 
          ? jobData.finalMilestones 
          : jobData.milestonePayments;
        
        // Calculate current locked amount based on milestone progress
        // The locked amount is the amount for the current milestone that hasn't been released yet
        let currentLockedAmount = "0";
        
        // Check if we have a current milestone that's been locked
        if (currentMilestone > 0 && currentMilestone <= milestonePayments.length) {
          // Calculate how much should have been paid up to the previous milestone
          const previousMilestonesTotal = milestonePayments
            .slice(0, currentMilestone - 1)
            .reduce((sum, m) => sum + parseFloat(m.amount || 0), 0);
          
          // If total paid equals previous milestones total, current milestone is locked
          // If total paid is less, we might have unreleased previous milestones
          const totalPaidNum = parseFloat(totalPaid);
          if (totalPaidNum >= previousMilestonesTotal) {
            // Current milestone is locked if we haven't paid it yet
            const currentMilestoneAmount = parseFloat(milestonePayments[currentMilestone - 1].amount || 0);
            if (totalPaidNum < previousMilestonesTotal + currentMilestoneAmount) {
              currentLockedAmount = milestonePayments[currentMilestone - 1].amount;
            }
          }
        }
        
        // Calculate releasable amount - it's the currently locked amount
        const releasableAmount = (parseFloat(currentLockedAmount) / 1000000).toFixed(2);

        // Fetch the selected applicant's preferred chain domain (for CCTP payment destination)
        let applicantChainDomain = 2; // Default to Optimism
        if (jobData.selectedApplicant && jobData.selectedApplicant !== '0x0000000000000000000000000000000000000000') {
          try {
            applicantChainDomain = await contract.methods.jobApplicantChainDomain(jobId, jobData.selectedApplicant).call();
            applicantChainDomain = Number(applicantChainDomain);
            console.log(`📍 Selected applicant's preferred chain domain: ${applicantChainDomain}`);
          } catch (err) {
            console.warn('Could not fetch applicant chain domain, defaulting to Optimism (2):', err.message);
          }
        }

        setJob({
          jobId,
          jobGiver: jobData.jobGiver,
          selectedApplicant: jobData.selectedApplicant,
          applicantChainDomain, // Store the applicant's preferred chain domain
          jobStatus: Number(jobData.status), // Convert to number to match the status checks
          totalBudget: totalBudgetUSDC,
          currentMilestone,
          releasableAmount,
          milestonePayments,
          currentLockedAmount,
          totalReleased: totalPaid,
          title: jobDetails.title || `Job #${jobId}`,
          description: jobDetails.description || '',
          ...jobDetails,
        });
        
        // Set the current milestone number (already 1-indexed from contract, 0 means no milestone)
        setCurrentMilestoneNumber(currentMilestone);

        setLoading(false);
      } catch (error) {
        console.error("❌ Error fetching job details:", error);
        setLoading(false);
      }
    }

    if (jobId) {
      fetchJobDetails();
    }
  }, [jobId]);

  // Poll CCTP status for release payment
  useEffect(() => {
    if (!jobId) return;

    const pollCCTPStatus = async () => {
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || '';
        const response = await fetch(`${backendUrl}/api/cctp-status/releasePayment/${jobId}`);
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
      const backendUrl = import.meta.env.VITE_BACKEND_URL || '';
      const response = await fetch(`${backendUrl}/api/cctp-retry/releasePayment/${jobId}`, {
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


  // Multi-gateway IPFS fetch function
  const fetchFromIPFS = async (hash, timeout = 5000) => {
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
          return data;
        }
      } catch (error) {
        console.warn(`Failed to fetch from ${gateway}:`, error.message);
        continue;
      }
    }
    
    throw new Error(`Failed to fetch ${hash} from all gateways`);
  };

  const handleNavigation = () => {
    window.open("https://drive.google.com/file/d/1tdpuAM3UqiiP_TKJMa5bFtxOG4bU_6ts/view", "_blank");
  };

  const formatAmount = (amount) => {
    if (parseFloat(amount) === 0) return "0"; // Handle zero value without decimal
    const roundedAmount = parseFloat(amount).toFixed(2); // Rounds to 2 decimal places
    return roundedAmount.length > 5 ? roundedAmount.slice(0, 8) : roundedAmount;
  };

  // Helper to safely convert BigInt to Number
  const safeNumber = (value) => {
    if (typeof value === 'bigint') return Number(value);
    return parseFloat(value) || 0;
  };

 
  // Simplified payment release flow - backend handles CCTP processing
  const handleReleasePayment = async () => {
    if (!walletAddress) {
      setTransactionStatus("❌ Please connect your wallet first");
      return;
    }

    if (!job) {
      setTransactionStatus("❌ Job data not loaded");
      return;
    }

    // CRITICAL: Validate user is on POSTING chain
    if (!jobChainId || !jobChainConfig) {
      setTransactionStatus("❌ Could not determine job posting chain from job ID");
      return;
    }

    if (userChainId !== jobChainId) {
      setTransactionStatus(`⚠️ Please switch to ${jobChainConfig.name} to release payment. ReleasePayment must be called from the posting chain.`);
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
      setTransactionStatus(`🔄 Step 1/2: Releasing payment on ${jobChainConfig.name}...`);
      
      const web3 = new Web3(window.ethereum);
      const lowjcContract = await getLOWJCContract(jobChainId);
      
      // Get the amount to release - it's the current milestone amount
      let amount = "0";
      if (job.currentMilestone > 0 && job.currentMilestone <= job.milestonePayments.length) {
        amount = job.milestonePayments[job.currentMilestone - 1].amount.toString();
      }
      
      // Build LZ options with appropriate destination gas for RELEASE_PAYMENT
      const destGas = DESTINATION_GAS_ESTIMATES.RELEASE_PAYMENT;
      const nativeOptions = buildLzOptions(destGas);
      console.log(`⛽ Destination gas (Arbitrum): ${destGas} for RELEASE_PAYMENT`);

      // Get the applicant's preferred chain domain (fetched from NOWJC)
      const destinationDomain = job.applicantChainDomain || 2; // Default to Optimism if not set
      console.log(`📍 Destination CCTP domain: ${destinationDomain}`);

      // Get bridge contract for quoting
      setTransactionStatus("💰 Getting LayerZero quote...");
      const bridgeAddress = await lowjcContract.methods.bridge().call();
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

      // Encode payload for accurate quote
      const payload = web3.eth.abi.encodeParameters(
        ['string', 'string', 'address', 'uint32', 'address'],
        ['releasePaymentCrossChain', jobId, walletAddress, destinationDomain, job.selectedApplicant]
      );

      // Get quote and add 20% buffer
      const quotedFee = await bridgeContract.methods.quoteNativeChain(payload, nativeOptions).call();
      const lzFee = BigInt(quotedFee) * BigInt(120) / BigInt(100); // +20% buffer
      console.log(`💰 LayerZero quote: ${web3.utils.fromWei(quotedFee.toString(), 'ether')} ETH`);
      console.log(`💰 With 20% buffer: ${web3.utils.fromWei(lzFee.toString(), 'ether')} ETH`);

      setTransactionStatus(`💰 Releasing payment on ${jobChainConfig.name} - Please confirm in MetaMask`);

      const gasPrice = await web3.eth.getGasPrice();

      const releasePaymentTx = await lowjcContract.methods.releasePaymentCrossChain(
        jobId,
        destinationDomain,
        job.selectedApplicant,
        nativeOptions
      ).send({
        from: walletAddress,
        value: lzFee.toString(),
        gas: 500000,
        maxPriorityFeePerGas: web3.utils.toWei('0.001', 'gwei'),
        maxFeePerGas: gasPrice
      });


      // ── Client-side cross-chain monitoring (no backend needed) ────────────
      const srcTxHash    = releasePaymentTx.transactionHash;
      const srcChainId   = jobChainId;
      const destDomain   = job.applicantChainDomain || 2;
      const lzLink       = `https://layerzeroscan.com/tx/${srcTxHash}`;
      const circleLink   = `https://iris-api.circle.com/v2/messages/${jobChainConfig?.cctpDomain ?? 2}?transactionHash=${srcTxHash}`;

      // Initialise steps immediately so the UI renders right away
      setPaymentStepState({
        sourceChainId: srcChainId,
        sourceTxHash: srcTxHash,
        lzStatus: 'active',
        lzLink,
        circleLink,
      });

      // Monitor LayerZero message → when delivered, start CCTP monitor
      monitorLZMessage(srcTxHash, (lzUpdate) => {
        setPaymentStepState(prev => ({
          ...prev,
          lzStatus:   lzUpdate.status === STATUS.SUCCESS ? 'delivered'
                    : lzUpdate.status === STATUS.FAILED  ? 'failed'
                    : 'active',
          lzLink:     lzUpdate.lzLink || lzLink,
          lzDstTxHash: lzUpdate.dstTxHash,
          lzDstChainId: 42161,
          // Once LZ delivers, the CCTP burn happens on Arbitrum
          cctpBurnTxHash: lzUpdate.dstTxHash || prev?.cctpBurnTxHash,
          cctpSourceDomain: 3, // Arbitrum CCTP domain
        }));

        // When LZ delivers, start watching the CCTP burn on Arbitrum
        if (lzUpdate.status === STATUS.SUCCESS && lzUpdate.dstTxHash) {
          monitorCCTPTransfer(
            lzUpdate.dstTxHash,
            3, // Arbitrum is the CCTP source for the payment leg
            (cctpUpdate) => {
              setPaymentStepState(prev => ({
                ...prev,
                cctpAttestationStatus: cctpUpdate.status === STATUS.SUCCESS ? 'complete'
                                     : cctpUpdate.message?.includes('slow')  ? 'slow'
                                     : 'pending',
                circleLink: cctpUpdate.circleLink || circleLink,
              }));
            },
            (attestation) => {
              // Attestation ready — update final step
              setPaymentStepState(prev => ({ ...prev, cctpAttestationStatus: 'complete' }));
              setTransactionStatus('✅ CCTP attestation complete. USDC being minted on recipient chain...');
            }
          );
        }
      });
      // ─────────────────────────────────────────────────────────────────────

      // Step 2: Also notify backend for server-side CCTP relay (belt + suspenders)
      setTransactionStatus(`🔄 Waiting for LayerZero message to reach Arbitrum...`);

      const backendUrl = import.meta.env.VITE_BACKEND_URL || '';
      try {
        const response = await fetch(`${backendUrl}/api/release-payment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jobId,
            opSepoliaTxHash: srcTxHash
          })
        });
        const result = await response.json();
        if (result.success) {
          const statusKey = result.statusKey || jobId;
          pollPaymentStatus(statusKey, backendUrl);
        }
      } catch (backendErr) {
        // Backend is down — that's OK, client-side monitor is running
        console.warn('⚠️ Backend unavailable, relying on client-side monitoring:', backendErr.message);
        setTransactionStatus('⚠️ Backend offline — tracking cross-chain status directly via LayerZero & Circle APIs');
      }

    } catch (error) {
      console.error("❌ Error releasing payment:", error);
      
      let errorMessage = error.message;
      if (error.code === 4001) {
        errorMessage = "Transaction cancelled by user";
      } else if (error.message.includes("insufficient funds")) {
        errorMessage = "Insufficient ETH for gas fees";
      } else if (error.message.includes("network")) {
        errorMessage = "Network switching failed - please switch to OP Sepolia manually";
      }
      
      setTransactionStatus(`❌ Error: ${errorMessage}`);
      setIsProcessing(false);
    }
  };

  // Poll backend for status updates using unique statusKey per release
  const pollPaymentStatus = async (statusKey, backendUrl, maxAttempts = 60) => {
    let attempts = 0;

    const checkStatus = async () => {
      if (attempts >= maxAttempts) {
        setTransactionStatus("⏱️ Still processing... Check back later");
        setIsProcessing(false);
        return;
      }

      try {
        const response = await fetch(`${backendUrl}/api/release-payment-status/${statusKey}`);
        const status = await response.json();
        
        if (status.status === 'completed') {
          setTransactionStatus("🎉 Milestone payment released successfully to the applicant!");
          setIsProcessing(false);
          return;
        } else if (status.status === 'failed') {
          setTransactionStatus(`❌ Payment failed: ${status.error || status.message || 'Unknown error'}`);
          setIsProcessing(false);
          return;
        } else if (status.error) {
          setTransactionStatus(`❌ Error: ${status.error}`);
          setIsProcessing(false);
          return;
        } else if (status.status === 'waiting_for_event') {
          setTransactionStatus(`⏳ Waiting for LayerZero message to reach Arbitrum...`);
          attempts++;
          setTimeout(checkStatus, 5000);
        } else if (status.status === 'polling_attestation') {
          setTransactionStatus(`🔄 Polling Circle API for CCTP attestation...`);
          attempts++;
          setTimeout(checkStatus, 5000);
        } else if (status.status === 'executing_receive') {
          setTransactionStatus(`🔗 Executing CCTP transfer to recipient's chain...`);
          attempts++;
          setTimeout(checkStatus, 5000);
        } else {
          // Still processing
          setTransactionStatus(`🔄 ${status.message || 'Processing...'}`);
          attempts++;
          setTimeout(checkStatus, 5000);
        }
      } catch (error) {
        console.warn("Status check failed:", error);
        if (attempts > 10) {
          setTransactionStatus(`⚠️ Connection issue: ${error.message}`);
        }
        attempts++;
        setTimeout(checkStatus, 5000);
      }
    };
    
    setTimeout(checkStatus, 5000); // Start checking after 5 seconds
  };

  // Poll backend for lock milestone CCTP relay status
  const pollLockMilestoneStatus = async (statusKey, sourceTxHash, backendUrl) => {
    const maxAttempts = 60; // 60 x 5s = 5 minutes
    let attempts = 0;

    return new Promise((resolve) => {
      const checkStatus = async () => {
        if (attempts >= maxAttempts) {
          setTransactionStatus(`⏱️ CCTP relay still processing. Lock TX: ${sourceTxHash}. Check back later or retry.`);
          resolve();
          return;
        }

        try {
          const response = await fetch(`${backendUrl}/api/lock-milestone-status/${statusKey}`);
          const status = await response.json();

          if (status.status === 'completed') {
            const completionHash = status.completionTxHash && status.completionTxHash !== 'already_completed'
              ? ` CCTP TX: ${status.completionTxHash.substring(0, 10)}...`
              : '';
            setTransactionStatus(`✅ Milestone ${job.currentMilestone + 1} locked and USDC delivered to NOWJC!${completionHash} Reloading...`);
            setTimeout(() => window.location.reload(), 2500);
            resolve();
            return;
          } else if (status.status === 'failed') {
            setTransactionStatus(`⚠️ Milestone locked but CCTP relay failed: ${status.error || 'Unknown error'}. Lock TX: ${sourceTxHash}. USDC may need manual relay.`);
            resolve();
            return;
          } else if (status.status === 'polling_attestation') {
            setTransactionStatus(`🔄 Milestone locked. Polling Circle API for CCTP attestation...`);
          } else if (status.status === 'executing_receive') {
            setTransactionStatus(`🔗 Attestation received. Executing CCTP receive on Arbitrum...`);
          } else {
            setTransactionStatus(`🔄 ${status.message || 'CCTP relay processing...'}`);
          }
        } catch (error) {
          console.warn("Lock milestone status check failed:", error.message);
        }

        attempts++;
        setTimeout(checkStatus, 5000);
      };

      setTimeout(checkStatus, 3000); // Start after 3 seconds
    });
  };

  // Lock next milestone function
  const handleLockNextMilestone = async () => {
    if (!walletAddress) {
      setTransactionStatus("❌ Please connect your wallet first");
      return;
    }

    if (!job) {
      setTransactionStatus("❌ Job data not loaded");
      return;
    }

    // CRITICAL: Validate user is on POSTING chain
    if (!jobChainId || !jobChainConfig) {
      setTransactionStatus("❌ Could not determine job posting chain from job ID");
      return;
    }

    if (userChainId !== jobChainId) {
      setTransactionStatus(`⚠️ Please switch to ${jobChainConfig.name} to lock milestone. LockNextMilestone must be called from the posting chain.`);
      try {
        await switchToChain(jobChainId);
        setTransactionStatus(`Switched to ${jobChainConfig.name}. Please try again.`);
      } catch (switchError) {
        setTransactionStatus(`❌ Failed to switch to ${jobChainConfig.name}: ${switchError.message}`);
      }
      return;
    }

    try {
      setIsLocking(true);
      setTransactionStatus(`🔒 Locking Milestone ${job.currentMilestone + 1} on ${jobChainConfig.name}...`);
      
      const USDC_ADDRESS = jobChainConfig.contracts.usdc;
      const LOWJC_ADDRESS = jobChainConfig.contracts.lowjc;
      const web3 = new Web3(window.ethereum);

      // Get next milestone amount from job data
      const nextMilestoneIndex = job.currentMilestone; // Already 0-indexed from contract
      if (nextMilestoneIndex >= job.milestonePayments.length) {
        setTransactionStatus("❌ No more milestones to lock");
        setIsLocking(false);
        return;
      }

      const nextMilestoneAmount = job.milestonePayments[nextMilestoneIndex].amount;
      
      // Approve USDC spending
      setTransactionStatus("💰 Approving USDC spending - Please confirm in MetaMask");
      const usdcContract = new web3.eth.Contract(
        [{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"}],
        USDC_ADDRESS
      );
      
      await usdcContract.methods.approve(LOWJC_ADDRESS, nextMilestoneAmount).send({
        from: walletAddress,
        gas: 100000 // Set reasonable gas limit for approve
      });

      
      // Prepare LayerZero options and fee for lockNextMilestone
      setTransactionStatus("🔒 Getting LayerZero quote...");
      const lowjcContract = await getLOWJCContract(jobChainId);

      // Build LZ options with appropriate destination gas for LOCK_MILESTONE
      const destGasLock = DESTINATION_GAS_ESTIMATES.LOCK_MILESTONE;
      const nativeOptions = buildLzOptions(destGasLock);
      console.log(`⛽ Destination gas (Arbitrum): ${destGasLock} for LOCK_MILESTONE`);

      // Get bridge contract for quoting
      const bridgeAddressLock = await lowjcContract.methods.bridge().call();
      const bridgeABILock = [{
        "inputs": [
          {"type": "bytes", "name": "_payload"},
          {"type": "bytes", "name": "_options"}
        ],
        "name": "quoteNativeChain",
        "outputs": [{"type": "uint256", "name": "fee"}],
        "stateMutability": "view",
        "type": "function"
      }];
      const bridgeContractLock = new web3.eth.Contract(bridgeABILock, bridgeAddressLock);

      // Encode payload for accurate quote
      const payloadLock = web3.eth.abi.encodeParameters(
        ['string', 'string', 'address', 'uint256'],
        ['lockNextMilestone', jobId, walletAddress, nextMilestoneAmount]
      );

      // Get quote and add 20% buffer
      const quotedFeeLock = await bridgeContractLock.methods.quoteNativeChain(payloadLock, nativeOptions).call();
      const lzFeeLock = BigInt(quotedFeeLock) * BigInt(120) / BigInt(100); // +20% buffer
      console.log(`💰 LayerZero quote: ${web3.utils.fromWei(quotedFeeLock.toString(), 'ether')} ETH`);
      console.log(`💰 With 20% buffer: ${web3.utils.fromWei(lzFeeLock.toString(), 'ether')} ETH`);

      setTransactionStatus("🔒 Locking milestone - Please confirm in MetaMask");

      // Get current gas price from network
      const gasPriceLock = await web3.eth.getGasPrice();

      const lockTx = await lowjcContract.methods.lockNextMilestone(
        jobId,
        nativeOptions
      ).send({
        from: walletAddress,
        value: lzFeeLock.toString(),
        gas: 600000,
        maxPriorityFeePerGas: web3.utils.toWei('0.001', 'gwei'),
        maxFeePerGas: gasPriceLock
      });


      // ── Client-side monitoring for lock milestone ─────────────────────────
      const lockTxHash = lockTx.transactionHash;
      const lockLzLink = `https://layerzeroscan.com/tx/${lockTxHash}`;
      setPaymentStepState({
        sourceChainId: jobChainId,
        usdcApproved: true,
        sourceTxHash: lockTxHash,
        lzStatus: 'active',
        lzLink: lockLzLink,
        circleLink: `https://iris-api.circle.com/v2/messages/${jobChainConfig?.cctpDomain ?? 2}?transactionHash=${lockTxHash}`,
      });

      monitorLZMessage(lockTxHash, (lzUpdate) => {
        setPaymentStepState(prev => ({
          ...prev,
          lzStatus:     lzUpdate.status === STATUS.SUCCESS ? 'delivered'
                      : lzUpdate.status === STATUS.FAILED  ? 'failed'
                      : 'active',
          lzDstTxHash:  lzUpdate.dstTxHash,
          lzDstChainId: 42161,
          cctpBurnTxHash: lzUpdate.dstTxHash || prev?.cctpBurnTxHash,
          cctpSourceDomain: 3,
        }));
        if (lzUpdate.status === STATUS.SUCCESS && lzUpdate.dstTxHash) {
          monitorCCTPTransfer(lzUpdate.dstTxHash, 3,
            (cctpUpdate) => {
              setPaymentStepState(prev => ({
                ...prev,
                cctpAttestationStatus: cctpUpdate.status === STATUS.SUCCESS ? 'complete'
                                     : cctpUpdate.message?.includes('slow')  ? 'slow'
                                     : 'pending',
              }));
            },
            () => setPaymentStepState(prev => ({ ...prev, cctpAttestationStatus: 'complete' }))
          );
        }
      });
      // ─────────────────────────────────────────────────────────────────────

      // Also trigger backend relay (belt + suspenders)
      setTransactionStatus(`🔒 Milestone locked. Monitoring CCTP relay to Arbitrum...`);
      const backendUrl = import.meta.env.VITE_BACKEND_URL || '';
      let lockStatusKey = null;

      try {
        const relayRes = await fetch(`${backendUrl}/api/lock-milestone`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId, txHash: lockTxHash })
        });
        const relayResult = await relayRes.json();
        console.log("📡 Backend CCTP relay started:", relayResult);
        lockStatusKey = relayResult.statusKey;
      } catch (err) {
        console.warn("⚠️ Backend CCTP relay request failed:", err.message);
        // Client-side monitor is still running — don't block the user
      }

      if (lockStatusKey) {
        await pollLockMilestoneStatus(lockStatusKey, lockTxHash, backendUrl);
      } else {
        setTransactionStatus(`🔒 Lock confirmed (${lockTxHash.substring(0,10)}...). Tracking cross-chain progress below.`);
      }
      setIsLocking(false);
      
    } catch (error) {
      console.error("❌ Error locking milestone:", error);
      
      let errorMessage = error.message;
      if (error.code === 4001) {
        errorMessage = "Transaction cancelled by user";
      } else if (error.message.includes("insufficient funds")) {
        errorMessage = "Insufficient funds (need USDC + ETH for gas)";
      } else if (error.message.includes("network")) {
        errorMessage = "Network switching failed - please switch to OP Sepolia manually";
      }
      
      setTransactionStatus(`❌ Error: ${errorMessage}`);
      setIsLocking(false);
    }
  };

  // Loading states
  if (loadingT) {
    return (
      <div className="loading-containerT">
        <div className="loading-icon"><img src="/OWIcon.svg" alt="Loading..."/></div>
        <div className="loading-message">
          <h1 id="txText">Transaction in Progress</h1>
          <p id="txSubtext">If the transaction goes through, we'll redirect you to your contract</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="loading-container">
        <img src="/OWIcon.svg" alt="Loading..." className="loading-icon" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="loading-container">
        <div style={{textAlign: 'center'}}>
          <img src="/OWIcon.svg" alt="OpenWork" className="loading-icon" style={{marginBottom: '20px'}} />
          <h2>Job Not Found</h2>
          <p>Job {jobId} is not available or hasn't synced to Arbitrum yet.</p>
          <p>Please wait a moment for cross-chain sync to complete.</p>
          <Link to="/browse-jobs" style={{color: '#007bff', textDecoration: 'none', marginTop: '20px', display: 'inline-block'}}>
            Browse Jobs →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="newTitle">
         <div className="titleTop">
          <Link className="goBack" to={`/job-details/${jobId}`}><img className="goBackImage" src="/back.svg" alt="Back Button" /></Link>  
          <div className="titleText" style={{fontWeight:'550'}}>{job.title || `Job #${jobId}`}</div>
         </div>
         <div className="titleBottom"><p>  Job ID:{" "}
         {jobId}
         </p><img src="/copy.svg" className="copyImage" onClick={() =>
                 handleCopyToClipboard(
                   jobId
                 )
               }
               /></div>
       </div>

      <div className="release-payment-container">
        <div className="form-container-release">
          <div className="sectionTitle">
            <span id="rel-title">Release Payment</span>
          </div>
          <div className="release-payment-body">
            {/* Job Participants Section */}
            <div className="form-groupDC job-body">
              <div className="job-detail-sectionR">
                <div className="job-detail-item">
                  <span className="job-detail-item-title">JOB GIVER</span>
                  <div>{formatWalletAddressH(job.jobGiver)}</div>
                </div>
                <div className="job-detail-item">
                  <span className="job-detail-item-title">SELECTED APPLICANT</span>
                  <div>{job.selectedApplicant !== '0x0000000000000000000000000000000000000000' 
                    ? formatWalletAddressH(job.selectedApplicant) 
                    : 'Not Selected'}
                  </div>
                </div>
                <div className="job-detail-item">
                  <span className="job-detail-item-title">JOB STATUS</span>
                  <div>{job.jobStatus === 0 ? 'Open' : 
                        job.jobStatus === 1 ? 'In Progress' : 
                        job.jobStatus === 2 ? 'Completed' : 
                        job.jobStatus === 3 ? 'Cancelled' : 
                        `Unknown (${job.jobStatus})`}</div>
                </div>
                <div className="job-detail-item">
                  <span className="job-detail-item-title">POSTING CHAIN</span>
                  <div>{jobChainConfig?.name || 'Unknown'}</div>
                </div>
              </div>
            </div>
            {/* Budget Information */}
            <div className="form-groupDC job-body">
              <div className="job-detail-sectionR">
                <JobdetailItem 
                  title="TOTAL BUDGET" 
                  amount={job.totalBudget}
                />
                <JobdetailItem 
                  title="AMOUNT RELEASED" 
                  amount={formatAmount(safeNumber(job.totalReleased) / 1000000)}
                />
                <JobdetailItem 
                  title="AMOUNT LOCKED (RELEASABLE)" 
                  amount={job.currentLockedAmount && job.currentLockedAmount !== '0' 
                    ? formatAmount(safeNumber(job.currentLockedAmount) / 1000000) 
                    : '0'}
                />
                <JobdetailItem 
                  title={`CURRENT MILESTONE${job.currentMilestone > 0 ? ` (#${job.currentMilestone} of ${job.milestonePayments.length})` : ' (None Locked)'}`} 
                  amount={job.currentMilestone > 0 && job.currentMilestone <= job.milestonePayments.length 
                    ? formatAmount(safeNumber(job.milestonePayments[job.currentMilestone - 1].amount) / 1000000) 
                    : job.currentMilestone === 0 ? 'None' : 'Complete'}
                />
              </div>
            </div>
            <div className="form-groupDC">
              <DropDown 
                label={job.currentMilestone > 0 ? `Milestone ${job.currentMilestone}` : 'Select Milestone'} 
                options={job.milestonePayments.map((_, idx) => `Milestone ${idx + 1}`)} 
                customCSS="form-dropdown" 
                width={true}
              />
            </div>
            <div className="form-groupDC job-body">
              <div className="job-detail-sectionR">
                <JobdetailItem 
                  title={job.currentMilestone > 0 ? `MILESTONE ${job.currentMilestone} AMOUNT` : 'NO MILESTONE LOCKED'} 
                  icon={true} 
                  amount={job.currentMilestone > 0 && job.currentMilestone <= job.milestonePayments.length 
                    ? formatAmount(safeNumber(job.milestonePayments[job.currentMilestone - 1].amount) / 1000000) 
                    : '0'}
                />
                <JobdetailItem 
                  title="NEXT MILESTONE AMOUNT" 
                  icon={true} 
                  amount={job.currentMilestone < job.milestonePayments.length 
                    ? formatAmount(safeNumber(job.milestonePayments[job.currentMilestone].amount) / 1000000) 
                    : 'N/A'}
                />
              </div>
            </div>
            <div className="form-groupDC">
              
              <textarea
                placeholder="Add a note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            {/* <button
              type="button"
              className="release-button"
              onClick={handleReleasePayment}
            >
              Release {releaseAmount}
              <img src="/xdc.svg" alt="USDC" className="usdc-icon" />
            </button> */}
            <div className="form-groupDC" style={{display:'flex', alignItems:'center', gap:'16px'}}>
              <BlueButton 
                label={isProcessing ? 'Processing...' : 'Release'} 
                amount={formatAmount(safeNumber(job.currentLockedAmount) / 1000000)} 
                style={{
                  width: '242px', 
                  justifyContent:'center', 
                  padding: '8px 16px', 
                  borderRadius: '12px',
                  opacity: (isProcessing || job.currentLockedAmount === '0') ? 0.7 : 1,
                  cursor: (isProcessing || job.currentLockedAmount === '0') ? 'not-allowed' : 'pointer'
                }} 
                onClick={handleReleasePayment}
                disabled={isProcessing || job.currentLockedAmount === '0'}
              />
              <BlueButton 
                label={isLocking ? 'Locking...' : 'Lock Next'} 
                amount={job.currentMilestone < job.milestonePayments.length ? formatAmount(safeNumber(job.milestonePayments[job.currentMilestone].amount) / 1000000) : '0'} 
                style={{
                  width: '198px', 
                  justifyContent:'center', 
                  padding: '8px 16px', 
                  borderRadius: '12px',
                  opacity: isLocking ? 0.7 : 1,
                  cursor: isLocking ? 'not-allowed' : 'pointer'
                }}
                onClick={handleLockNextMilestone}
                disabled={isLocking}
              />
            </div>
            <div className="warning-form">
              <Warning content={transactionStatus} />
            </div>
            
            {/* Permission Check */}
            {walletAddress && job.jobGiver && walletAddress.toLowerCase() !== job.jobGiver.toLowerCase() && (
              <div className="warning-form">
                <Warning 
                  content="⚠️ Only the job giver can release payments. You are not the job giver for this job."
                  icon="/orange-warning.svg"
                />
              </div>
            )}
            
            {/* CCTP Status Warnings */}
            {cctpStatus?.status === 'pending' && (
              <div className="warning-form">
                <Warning 
                  content={`⏳ Cross-chain transfer processing: ${cctpStatus.step || 'waiting for event'}...`}
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
                <BlueButton 
                  label="Retry CCTP Transfer"
                  onClick={handleRetryCCTP}
                  style={{width: '100%', justifyContent: 'center', marginTop: '12px'}}
                />
              </>
            )}
            
            {jobChainConfig && userChainId !== jobChainId && (
              <div className="warning-form">
                <Warning 
                  content={`⚠️ Payment operations require ${jobChainConfig.name}. You are on ${userChainConfig?.name || 'unknown chain'}. Please switch networks.`} 
                  icon="/triangle_warning.svg"
                />
              </div>
            )}

            {/* Client-side cross-chain progress tracker */}
            {paymentStepState && (
              <CrossChainStatus
                title="Payment cross-chain status"
                steps={buildPaymentSteps(paymentStepState)}
              />
            )}
          </div>
        </div>
        {/* <PaymentItem title="Payment 2" />
        <PaymentItem title="Payment 1" /> */}
        <div className="milestone-section-body">
            {job.milestonePayments.map((milestone, index) => (
              <Milestone 
                key={index}
                amount={formatAmount(safeNumber(milestone.amount) / 1000000)} 
                title={`Milestone ${index + 1}`} 
                date={milestone.dueDate || 'No due date'} 
                content={milestone.description || `Milestone ${index + 1} deliverables`} 
                editable={false}
                completed={index < job.currentMilestone}
                current={index === job.currentMilestone}
              />
            ))}
        </div>
      </div>
    </>
  );
}
