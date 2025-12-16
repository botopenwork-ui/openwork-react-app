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
import { useChainDetection, useWalletAddress } from "../../hooks/useChainDetection";
import { getChainConfig, extractChainIdFromJobId } from "../../config/chainConfig";
import { switchToChain } from "../../utils/switchNetwork";
import { getLOWJCContract } from "../../services/localChainService";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

function ImageUpload() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [preview, setPreview] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setSelectedImage(file);
    setPreview(URL.createObjectURL(file)); // For preview display
  };

  const handleImageUpload = async () => {
    const formData = new FormData();
    formData.append('image', selectedImage);

    try {
      // Replace 'your-api-endpoint' with the actual upload URL
      const response = await fetch('api-endpoint', {
        method: 'POST',
        body: formData,
      });
      if (response.ok) {
        alert('Image uploaded successfully!');
      } else {
        alert('Upload failed.');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('An error occurred while uploading.');
    }
  };

  return (
    <div>
      <label htmlFor="image">
        <div className="form-fileUpload">
          <img src="/upload.svg" alt="" />
          <span>Click here to upload or drop files here</span>
        </div>
      </label>
      <input id="image" type="file" accept="image/*" onChange={handleImageChange} style={{display:'none'}} />
      {preview && <img src={preview} alt="Image preview" width="100" />}
      {/* <button style={{display: 'none'}} onClick={handleImageUpload} disabled={!selectedImage}>
        Upload Image
      </button> */}
    </div>
  );
}

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
  const [applicationData, setApplicationData] = useState(null);
  
  // Multi-chain hooks
  const { chainId: userChainId, chainConfig: userChainConfig } = useChainDetection();
  const { address: walletAddress, connect: connectWallet } = useWalletAddress();
  
  // Get job posting chain
  const jobChainId = jobId ? extractChainIdFromJobId(jobId) : null;
  const isMobile = useMobileDetection();

  function formatWalletAddressH(address) {
    if (!address) return "";
    const start = address.substring(0, 4);
    const end = address.substring(address.length - 4);
    return `${start}....${end}`;
  }

 
  const toggleDropdown = () => {
    setDropdownVisible(!dropdownVisible);
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

    // CRITICAL: For SubmitWork, we need to check APPLICATION chain
    // For now, we'll use posting chain as a fallback
    // TODO: Retrieve application chain from application data
    const requiredChainId = jobChainId;
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
        description: 'Completed work deliverable for milestone approval'
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
      console.log("✅ IPFS Hash:", submissionHash);

      // Get contract and LayerZero fee
      setTransactionStatus(`💰 Getting LayerZero fee quote on ${requiredChainConfig.name}...`);
      const web3 = new Web3(window.ethereum);
      const lowjcContract = await getLOWJCContract(requiredChainId);
      const lzOptions = requiredChainConfig.layerzero.options;
      
      // Get bridge for fee quote
      const bridgeAddress = await lowjcContract.methods.bridge().call();
      const bridgeABI = [{
        "inputs": [{"type": "bytes"}, {"type": "bytes"}],
        "name": "quoteNativeChain",
        "outputs": [{"type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
      }];
      
      const bridgeContract = new web3.eth.Contract(bridgeABI, bridgeAddress);
      const payload = web3.eth.abi.encodeParameters(
        ['string', 'address', 'string', 'string'],
        ['submitWork', walletAddress, jobId, submissionHash]
      );
      
      const quotedFee = await bridgeContract.methods.quoteNativeChain(payload, lzOptions).call();
      console.log(`💰 LayerZero fee: ${web3.utils.fromWei(quotedFee, 'ether')} ETH`);

      // Submit work
      setTransactionStatus(`📝 Submitting work on ${requiredChainConfig.name} - Please confirm in MetaMask`);
      
      const tx = await lowjcContract.methods.submitWork(
        jobId,
        submissionHash,
        lzOptions
      ).send({
        from: walletAddress,
        value: quotedFee,
        gas: 5000000  // Explicit gas limit
      });

      console.log("✅ Work submitted successfully:", tx.transactionHash);
      setTransactionStatus(`✅ Work submitted on ${requiredChainConfig.name}! Syncing to Arbitrum...`);
      
      setTimeout(() => {
        navigate(`/job-update/${jobId}`);
      }, 2000);
      
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
        // Fetch from Arbitrum Genesis (read-only)
        const ARBITRUM_SEPOLIA_RPC = import.meta.env.VITE_ARBITRUM_SEPOLIA_RPC_URL;
        const NOWJC_CONTRACT = import.meta.env.VITE_NOWJC_CONTRACT_ADDRESS || "0x9E39B37275854449782F1a2a4524405cE79d6C1e";
        
        const web3 = new Web3(ARBITRUM_SEPOLIA_RPC);
        const nowjcABI = [{"inputs": [{"type": "string"}], "name": "getJob", "outputs": [{"type": "tuple"}], "stateMutability": "view", "type": "function"}];
        const contract = new web3.eth.Contract(nowjcABI, NOWJC_CONTRACT);

        const jobData = await contract.methods.getJob(jobId).call();
        
        // Fetch job details from IPFS
        let jobDetails = {};
        if (jobData.jobDetailHash) {
          try {
            const response = await fetch(`https://gateway.pinata.cloud/ipfs/${jobData.jobDetailHash}`);
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
                "0xdEF4B440acB1B11FDb23AF24e099F6cAf3209a8d",
              )}
            </p>
            <img
              src="/copy.svg"
              className="copyImage"
              onClick={() =>
                handleCopyToClipboard(
                  "0xdEF4B440acB1B11FDb23AF24e099F6cAf3209a8d",
                )
              }
            />
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
            
            {userChainId && jobChainId && userChainId !== jobChainId && (
              <div className="form-groupDC warning-form">
                <Warning 
                  content={`⚠️ SubmitWork should be called from ${getChainConfig(jobChainId)?.name || 'application chain'}. You are on ${userChainConfig?.name || 'unknown chain'}.`}
                  icon="/triangle_warning.svg"
                />
              </div>
            )}
            
            <div className="form-groupDC">
              <ImageUpload />
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
