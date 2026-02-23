import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Web3 from "web3";
import "./AddUpdate.css";
import { formatWalletAddress } from "../../functions/formatWalletAddress";
import { useWalletConnection } from "../../functions/useWalletConnection";
import { useMobileDetection } from "../../functions/useMobileDetection";
import BackButton from "../../components/BackButton/BackButton";
import BlueButton from "../../components/BlueButton/BlueButton";
import Warning from "../../components/Warning/Warning";
import FileUpload from "../../components/FileUpload/FileUpload";
import { useChainDetection, useWalletAddress } from "../../hooks/useChainDetection";
import { getChainConfig, extractChainIdFromJobId } from "../../config/chainConfig";
import { switchToChain } from "../../utils/switchNetwork";
import { getLOWJCContract } from "../../services/localChainService";
import CrossChainStatus, { buildLZSteps } from "../../components/CrossChainStatus/CrossChainStatus";
import { monitorLZMessage, STATUS } from "../../utils/crossChainMonitor";
import genesisABI from "../../ABIs/genesis_ABI.json";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

// Maps LayerZero EIDs to EVM chain IDs (mirrors EID_TO_CHAIN_ID in chainConfig)
const LZ_EID_TO_CHAIN_ID = {
  40232: 11155420, // OP Sepolia
  40161: 11155111, // ETH Sepolia
  40231: 421614,   // ARB Sepolia
  40245: 84532,    // Base Sepolia
  30111: 10,       // OP Mainnet
  30110: 42161,    // ARB Mainnet
  30101: 1,        // ETH Mainnet
  30184: 8453,     // Base Mainnet
};

export default function AddUpdate() {
  const { jobId } = useParams();
  const [job, setJob] = useState(null);
  const [updateText, setUpdateText] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const navigate = useNavigate();
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [account, setAccount] = useState(null);
  const [loadingT, setLoadingT] = useState("");
  const [transactionStatus, setTransactionStatus] = useState("");
  const [crossChainSteps, setCrossChainSteps] = useState(null);
  const [applicationData, setApplicationData] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [applierOriginChainId, setApplierOriginChainId] = useState(null);
  
  // Multi-chain hooks
  const { chainId: userChainId, chainConfig: userChainConfig } = useChainDetection();
  const { address: walletAddress, connect: connectWallet } = useWalletAddress();
  
  // Get job posting chain
  const jobChainId = jobId ? extractChainIdFromJobId(jobId) : null;
  const isMobile = useMobileDetection();

  const [copiedAddress, setCopiedAddress] = useState(null);

  function formatWalletAddressH(address) {
    if (!address) return "";
    const start = address.substring(0, 4);
    const end = address.substring(address.length - 4);
    return `${start}....${end}`;
  }

 
  const toggleDropdown = () => {
    setDropdownVisible(!dropdownVisible);
  };

  const handleCopyToClipboard = (address) => {
    navigator.clipboard.writeText(address).then(() => {
      setCopiedAddress(address);
      setTimeout(() => setCopiedAddress(null), 2000);
    }).catch(err => console.error("Failed to copy:", err));
  };

  const handleUpdateChange = (e) => {
    setUpdateText(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!walletAddress) {
      setTransactionStatus("❌ Please connect your wallet first");
      return;
    }

    if (!updateText.trim()) {
      setTransactionStatus("❌ Please provide an update description");
      return;
    }

    // Determine the chain for work submission:
    // Prefer the applier's origin chain (stored in Genesis contract) if known.
    // Fall back to the job's posting chain.
    const requiredChainId = applierOriginChainId || jobChainId;
    const requiredChainConfig = requiredChainId ? getChainConfig(requiredChainId) : null;

    if (!requiredChainId || !requiredChainConfig) {
      setTransactionStatus("❌ Could not determine required chain for work submission");
      return;
    }

    // Validate user is on required chain
    if (userChainId !== requiredChainId) {
      setTransactionStatus(`⚠️ Please switch to ${requiredChainConfig.name} to submit work. SubmitWork should be called from your application chain.`);
      try {
        await switchToChain(requiredChainId);
        setTransactionStatus(`Switched to ${requiredChainConfig.name}. Please try again.`);
      } catch (switchError) {
        setTransactionStatus(`❌ Failed to switch to ${requiredChainConfig.name}: ${switchError.message}`);
      }
      return;
    }

    try {
      setLoadingT(true);
      setTransactionStatus(`📝 Preparing work submission on ${requiredChainConfig.name}...`);
      
      const updateDetails = {
        jobId,
        jobTaker: walletAddress,
        jobUpdate: updateText,
        title: jobTitle,
        submittedFromChain: requiredChainConfig.name,
        submittedFromChainId: requiredChainId,
        date: new Date().toISOString(),
        description: 'Completed work deliverable for milestone approval',
        attachments: uploadedFiles
      };

      // Upload to IPFS via backend
      setTransactionStatus("📤 Uploading work details to IPFS...");
      const ipfsResponse = await fetch(`${BACKEND_URL}/api/ipfs/upload-json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pinataContent: updateDetails,
          pinataMetadata: {
            name: `work-submission-${jobId}-${Date.now()}`,
            keyvalues: {
              jobId: jobId,
              submitter: walletAddress,
              type: 'work_submission'
            }
          }
        })
      });

      const ipfsData = await ipfsResponse.json();
      if (!ipfsData.IpfsHash) {
        throw new Error("Failed to upload to IPFS");
      }

      const submissionHash = ipfsData.IpfsHash;

      // Get contract and LayerZero fee
      setTransactionStatus(`💰 Getting LayerZero fee quote on ${requiredChainConfig.name}...`);
      const web3 = new Web3(window.ethereum);
      const lowjcContract = await getLOWJCContract(requiredChainId);
      
      // Validate LayerZero configuration
      const lzOptions = requiredChainConfig.layerzero?.options;
      if (!lzOptions) {
        throw new Error(`LayerZero options not configured for ${requiredChainConfig.name}`);
      }
      
      // Get bridge address and validate
      const bridgeAddress = await lowjcContract.methods.bridge().call();
      if (!bridgeAddress || bridgeAddress === '0x0000000000000000000000000000000000000000') {
        throw new Error("Bridge contract not configured on LOWJC");
      }
      
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
      
      // Encode payload matching LOWJC's internal encoding for submitWork
      const payload = web3.eth.abi.encodeParameters(
        ['string', 'address', 'string', 'string'],
        ['submitWork', walletAddress, jobId, submissionHash]
      );
      
      const quotedFee = await bridgeContract.methods.quoteNativeChain(payload, lzOptions).call();

      // Submit work
      setTransactionStatus(`📝 Submitting work on ${requiredChainConfig.name} - Please confirm in MetaMask`);
      
      const tx = await lowjcContract.methods.submitWork(
        jobId,
        submissionHash,
        lzOptions
      ).send({
        from: walletAddress,
        value: quotedFee, // Use the exact LayerZero quoted fee
        gas: 5000000  // Explicit gas limit
      });

      setTransactionStatus(`✅ Work submitted! Tracking sync to Arbitrum...`);

      // Client-side LZ monitoring
      const srcTxHash = tx.transactionHash;
      const lzLink    = `https://layerzeroscan.com/tx/${srcTxHash}`;
      setCrossChainSteps(buildLZSteps({ sourceTxHash: srcTxHash, sourceChainId: requiredChainConfig?.chainId, lzStatus: 'active', lzLink }));
      monitorLZMessage(srcTxHash, (update) => {
        setCrossChainSteps(buildLZSteps({
          sourceTxHash: srcTxHash,
          sourceChainId: requiredChainConfig?.chainId,
          lzStatus:  update.status === STATUS.SUCCESS ? 'delivered' : update.status === STATUS.FAILED ? 'failed' : 'active',
          lzLink:    update.lzLink || lzLink,
          dstTxHash: update.dstTxHash,
          dstChainId: 42161,
        }));
        if (update.status === STATUS.SUCCESS) {
          setTransactionStatus('✅ Work synced to Arbitrum! Redirecting...');
          setTimeout(() => navigate(`/job-update/${jobId}`), 1500);
        }
      });

      // Fallback redirect if LZ monitor doesn't fire in time
      setTimeout(() => navigate(`/job-update/${jobId}`), 30000);
      
    } catch (error) {
      console.error("❌ Error submitting work:", error);
      
      let errorMessage = error.message;
      if (error.code === 4001) {
        errorMessage = "Transaction cancelled by user";
      } else if (error.message.includes("insufficient funds")) {
        errorMessage = "Insufficient ETH for gas fees";
      }
      
      setTransactionStatus(`❌ Error: ${errorMessage}`);
      setLoadingT(false);
    }
  };

  const handleNavigation = () => {
    window.open(
      "https://drive.google.com/file/d/1tdpuAM3UqiiP_TKJMa5bFtxOG4bU_6ts/view",
      "_blank",
    );
  };

  useEffect(() => {
    async function fetchJobDetails() {
      if (!jobId) return;
      
      try {
        // Fetch from Arbitrum Genesis (read-only) using full ABI for proper decoding
        const ARBITRUM_SEPOLIA_RPC = import.meta.env.VITE_ARBITRUM_SEPOLIA_RPC_URL;
        const NOWJC_CONTRACT = import.meta.env.VITE_NOWJC_CONTRACT_ADDRESS
          || import.meta.env.VITE_ARBITRUM_GENESIS_ADDRESS
          || "0x9E39B37275854449782F1a2a4524405cE79d6C1e";
        
        const web3 = new Web3(ARBITRUM_SEPOLIA_RPC);
        const contract = new web3.eth.Contract(genesisABI, NOWJC_CONTRACT);

        const jobData = await contract.methods.getJob(jobId).call();

        // Extract the applier's origin chain from the job data (set when job is started)
        // applierOriginChainDomain is a LayerZero EID — convert to EVM chain ID
        if (jobData.applierOriginChainDomain && Number(jobData.applierOriginChainDomain) !== 0) {
          const lzEid = Number(jobData.applierOriginChainDomain);
          const mappedChainId = LZ_EID_TO_CHAIN_ID[lzEid];
          if (mappedChainId) {
            setApplierOriginChainId(mappedChainId);
          }
        }
        
        // Fetch job details from IPFS
        let jobDetails = {};
        if (jobData.jobDetailHash) {
          try {
            const response = await fetch(`https://gateway.lighthouse.storage/ipfs/${jobData.jobDetailHash}`);
            jobDetails = await response.json();
          } catch (error) {
            console.warn("Failed to fetch job details from IPFS:", error);
          }
        }

        setJob({
          jobId,
          jobGiver: jobData.jobGiver,
          selectedApplicant: jobData.selectedApplicant,
          title: jobDetails.title || `Job ${jobId}`,
          ...jobDetails
        });
        
      } catch (error) {
        console.error("Error fetching job details:", error);
      }
    }

    fetchJobDetails();
  }, [jobId]);

  if (loadingT) {
    return (
      <div className="loading-containerT">
        <div className="loading-icon">
          <img src="/OWIcon.svg" alt="Loading..." />
        </div>
        <div className="loading-message">
          <h1 id="txText">Transaction in Progress</h1>
          <p id="txSubtext">
            If the transaction goes through, we'll redirect you to your contract
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {job && (
        <div className="newTitle">
          <div className="titleTop">
            <Link className="goBack" to={`/job-update/${jobId}`}>
              <img className="goBackImage" src="/back.svg" alt="Back Button" />
            </Link>
            <div className="titleText">{job.title}</div>
            <Link className="goBack" to={`/job-update/${jobId}`} style={{visibility:'hidden'}}>
              <img className="goBackImage" src="/back.svg" alt="Back Button" />
            </Link>
          </div>
          <div className="titleBottom">
            <p>
              {" "}
              Contract ID:{" "}
              {formatWalletAddress(
                walletAddress,
              )}
            </p>
            <img
              src="/copy.svg"
              className="copyImage"
              onClick={() =>
                handleCopyToClipboard(
                  walletAddress,
                )
              }
            />
            {copiedAddress === walletAddress && (
              <span style={{ fontSize: '12px', color: '#38a169', marginLeft: '4px' }}>Copied!</span>
            )}
          </div>
        </div>
      )}

      <div className="form-containerDC form-post">
        <div className="form-header">
          <BackButton to={`/job-update/${jobId}`} style={{gap: '20px'}} title="Add New Update"/>
        </div>
        <div className="form-body">
          <form onSubmit={handleSubmit}>
            {transactionStatus && (
              <div className="form-groupDC warning-form">
                <Warning content={transactionStatus} icon="/info.svg" />
              </div>
            )}
            {crossChainSteps && (
              <CrossChainStatus title="Work submission cross-chain status" steps={crossChainSteps} />
            )}
            
            {userChainId && jobChainId && userChainId !== jobChainId && (
              <div className="form-groupDC warning-form">
                <Warning 
                  content={`⚠️ SubmitWork should be called from ${getChainConfig(jobChainId)?.name || 'application chain'}. You are on ${userChainConfig?.name || 'unknown chain'}.`}
                  icon="/triangle_warning.svg"
                />
              </div>
            )}
            
            <div className="form-groupDC">
              <FileUpload
                onFilesUploaded={setUploadedFiles}
                uploadedFiles={uploadedFiles}
              />
            </div>
            <div className="form-groupDC">
              <input
                type="text"
                placeholder="Update Title"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
              />
            </div>
            <div className="form-groupDC">
              <textarea
                placeholder="Work Description / Deliverables"
                value={updateText}
                onChange={handleUpdateChange}
              ></textarea>
            </div>
            <BlueButton 
              label={'Submit Work'} 
              disabled={!walletAddress || (userChainId && jobChainId && userChainId !== jobChainId)}
              style={{padding: '8px 16px', width: '100%', justifyContent: 'center'}}
            />
          </form>
        </div>
      </div>
    </>
  );
}
