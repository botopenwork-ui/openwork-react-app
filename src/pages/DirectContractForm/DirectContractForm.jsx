import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Web3 from "web3";
import JobContractABI from "../../ABIs/lowjc_ABI.json";
import BrowseJobsABI from "../../ABIs/nowjc_ABI.json";
import "./DirectContractForm.css";
import { useWalletConnection } from "../../functions/useWalletConnection";
import { formatWalletAddress } from "../../functions/formatWalletAddress";

import BackButton from "../../components/BackButton/BackButton";
import SkillBox from "../../components/SkillBox/SkillBox";
import DropDown from "../../components/DropDown/DropDown";
import BlueButton from "../../components/BlueButton/BlueButton";
import Milestone from "../../components/Milestone/Milestone";
import RadioButton from "../../components/RadioButton/RadioButton";
import Warning from "../../components/Warning/Warning";
import { getLocalChains, getChainConfig, getNativeChain, isMainnet } from "../../config/chainConfig";
import CrossChainStatus, { buildPaymentSteps } from "../../components/CrossChainStatus/CrossChainStatus";
import { monitorLZMessage, monitorCCTPTransfer, STATUS } from "../../utils/crossChainMonitor";

const SKILLOPTIONS = [
  'UX/UI Skill Oracle','Full Stack development','UX/UI Skill Oracle',
]

const LAYERZERO_OPTIONS_VALUE = import.meta.env.VITE_LAYERZERO_OPTIONS_VALUE;

// Dynamic network-aware functions for cross-chain polling
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

function FileUpload({ onFilesUploaded, uploadedFiles }) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeUploadedFile = (index) => {
    const newFiles = uploadedFiles.filter((_, i) => i !== index);
    onFilesUploaded(newFiles);
  };

  const uploadFilesToIPFS = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    const newUploadedFiles = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      setUploadProgress(prev => ({ ...prev, [i]: 'Uploading...' }));

      try {
        const formData = new FormData();
        formData.append('file', file);

        const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';
        const response = await fetch(
          `${BACKEND_URL}/api/ipfs/upload-file`,
          {
            method: 'POST',
            body: formData,
          }
        );

        if (response.ok) {
          const data = await response.json();
          newUploadedFiles.push({
            name: file.name,
            size: file.size,
            type: file.type,
            ipfsHash: data.IpfsHash,
            timestamp: new Date().toISOString(),
          });
          setUploadProgress(prev => ({ ...prev, [i]: 'Done ✓' }));
        } else {
          setUploadProgress(prev => ({ ...prev, [i]: 'Failed ✗' }));
        }
      } catch (error) {
        console.error(`Error uploading file ${file.name}:`, error);
        setUploadProgress(prev => ({ ...prev, [i]: 'Failed ✗' }));
      }
    }

    onFilesUploaded([...uploadedFiles, ...newUploadedFiles]);
    setSelectedFiles([]);
    setUploadProgress({});
    setUploading(false);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div style={{ width: '100%' }}>
      <label htmlFor="files">
        <div className="form-fileUpload" style={{ cursor: 'pointer' }}>
          <img src="/upload.svg" alt="" />
          <span>Click here to upload or drop files here</span>
        </div>
      </label>
      <input
        id="files"
        type="file"
        multiple
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      
      {/* Selected files (not yet uploaded) */}
      {selectedFiles.length > 0 && (
        <div style={{ marginTop: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <strong>Selected Files ({selectedFiles.length})</strong>
            <button
              onClick={uploadFilesToIPFS}
              disabled={uploading}
              style={{
                background: uploading ? '#ccc' : '#007bff',
                color: 'white',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '4px',
                cursor: uploading ? 'not-allowed' : 'pointer',
                fontSize: '12px',
                fontWeight: 'bold'
              }}
            >
              {uploading ? 'Uploading...' : 'Upload to IPFS'}
            </button>
          </div>
          {selectedFiles.map((file, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px',
                background: '#f5f5f5',
                borderRadius: '4px',
                marginBottom: '4px',
                fontSize: '13px'
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold' }}>{file.name}</div>
                <div style={{ color: '#666', fontSize: '11px' }}>
                  {formatFileSize(file.size)} • {file.type || 'Unknown type'}
                </div>
              </div>
              {uploadProgress[index] && (
                <span style={{ marginRight: '10px', fontSize: '11px', color: '#666' }}>
                  {uploadProgress[index]}
                </span>
              )}
              {!uploading && (
                <button
                  onClick={() => removeFile(index)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#dc3545',
                    cursor: 'pointer',
                    fontSize: '18px',
                    padding: '0 8px'
                  }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Uploaded files (on IPFS) */}
      {uploadedFiles && uploadedFiles.length > 0 && (
        <div style={{ marginTop: '15px' }}>
          <strong>Uploaded Files ({uploadedFiles.length})</strong>
          {uploadedFiles.map((file, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px',
                background: '#e8f5e9',
                borderRadius: '4px',
                marginTop: '4px',
                fontSize: '13px'
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold' }}>✓ {file.name}</div>
                <div style={{ color: '#666', fontSize: '11px' }}>
                  {formatFileSize(file.size)} • IPFS: {file.ipfsHash.substring(0, 10)}...
                </div>
              </div>
              <button
                onClick={() => removeUploadedFile(index)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#dc3545',
                  cursor: 'pointer',
                  fontSize: '18px',
                  padding: '0 8px'
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DirectContractForm() {
  const { walletAddress, connectWallet, disconnectWallet } = useWalletConnection();
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [jobType, setJobType] = useState("");
  const [jobTaker, setJobTaker] = useState("");
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [loadingT, setLoadingT] = useState("");
  const [selectedOption, setSelectedOption] = useState('Single Milestone');
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [skillInput, setSkillInput] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [transactionStatus, setTransactionStatus] = useState("Direct contract creation requires blockchain transaction fees");
  const [crossChainSteps, setCrossChainSteps] = useState(null);
  const [platformFee, setPlatformFee] = useState(null);
  const [milestones, setMilestones] = useState([
    {
      title: "Milestone 1",
      content: "",
      amount: 1,
    },
  ]);

  const navigate = useNavigate();

  // Update milestones based on selected option
  useEffect(() => {
    if (selectedOption === "Single Milestone") {
      setMilestones([
        {
          title: "Milestone 1",
          content: "",
          amount: 1,
        },
      ]);
    } else {
      setMilestones([
        {
          title: "Milestone 1",
          content: "",
          amount: 1,
        },
        {
          title: "Milestone 2",
          content: "",
          amount: 1,
        },
      ]);
    }
  }, [selectedOption]);

  // Fetch platform fee from NOWJC contract on Arbitrum
  useEffect(() => {
    async function fetchCommission() {
      try {
        const nativeChain = getNativeChain();
        if (!nativeChain) return;
        const web3 = new Web3(nativeChain.rpcUrl);
        const nowjcABI = [{
          "inputs": [],
          "name": "commissionPercentage",
          "outputs": [{"type": "uint256", "name": ""}],
          "stateMutability": "view",
          "type": "function"
        }];
        const nowjcContract = new web3.eth.Contract(nowjcABI, nativeChain.contracts.nowjc);
        const basisPoints = await nowjcContract.methods.commissionPercentage().call();
        setPlatformFee(Number(basisPoints) / 100); // basis points to percentage
      } catch (err) {
        console.warn("Could not fetch commission rate:", err.message);
      }
    }
    fetchCommission();
  }, []);

  // Calculate total compensation
  const totalCompensation = milestones.reduce((sum, milestone) => sum + milestone.amount, 0);

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
    if (selectedOption === "Multiple Milestones" && milestones.length <= 1) {
      alert("You must have at least one milestone");
      return;
    }
    const updatedMilestones = milestones.filter((_, i) => i !== index);
    const renumberedMilestones = updatedMilestones.map((milestone, idx) => ({
      ...milestone,
      title: `Milestone ${idx + 1}`,
    }));
    setMilestones(renumberedMilestones);
  };

 
  const handleNavigation = () => {
    window.open(  "https://drive.google.com/file/d/1tdpuAM3UqiiP_TKJMa5bFtxOG4bU_6ts/view",
      "_blank",
    );
  };

  const toggleDropdown = () => {
    setDropdownVisible(!dropdownVisible);
  };


  // Function to extract job ID from LayerZero logs
  const extractJobIdFromLayerZeroLogs = (receipt) => {
    try {
      
      const layerZeroSignature = "0x1ab700d4ced0c005b164c0f789fd09fcbb0156d4c2041b8a3bfbcd961cd1567f";
      
      const layerZeroLog = receipt.logs.find(log => 
        log.topics && log.topics[0] === layerZeroSignature
      );
      
      if (!layerZeroLog) {
        return null;
      }
      
      
      const logData = layerZeroLog.data;
      const dataStr = logData.slice(2);
      const chunks = dataStr.match(/.{1,64}/g) || [];
      
      for (const chunk of chunks) {
        try {
          const cleanChunk = chunk.replace(/00+$/, "");
          if (cleanChunk.length > 0) {
            const decoded = Web3.utils.hexToUtf8("0x" + cleanChunk);
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

  // Function to check if job exists on Arbitrum (Genesis contract)
  const checkJobExistsOnArbitrum = async (jobId) => {
    try {
      const genesisAddress = getGenesisAddress();
      const arbitrumRpc = getArbitrumRpc();
      const networkMode = isMainnet() ? "mainnet" : "testnet";


      const arbitrumWeb3 = new Web3(arbitrumRpc);

      // Test RPC connection
      try {
        const blockNumber = await arbitrumWeb3.eth.getBlockNumber();
      } catch (rpcError) {
        console.error("  ❌ RPC connection failed:", rpcError);
        return false;
      }

      const browseJobsContract = new arbitrumWeb3.eth.Contract(
        BrowseJobsABI,
        genesisAddress
      );

      // Try to call getJob
      const jobData = await browseJobsContract.methods.getJob(jobId).call();

      const jobExists = jobData && jobData.id && jobData.id === jobId;

      return jobExists;
    } catch (error) {
      console.error("\n❌ ========== POLLING ERROR ==========");
      console.error("  Job ID:", jobId);
      console.error("  Error type:", error.constructor.name);
      console.error("  Error message:", error.message);
      console.error("  Full error:", error);
      console.error("=====================================\n");
      return false;
    }
  };

  // Function to poll for job sync completion
  const pollForJobSync = async (jobId) => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || '';
    const maxAttempts = 40; // 40 x 5s = ~3.5 minutes max
    const pollInterval = 5000;
    let jobSynced = false;
    let cctpCompleted = false;

    setTransactionStatus("Step 1/2: Waiting for LayerZero message to sync job on Arbitrum...");
    await new Promise(resolve => setTimeout(resolve, 10000));

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {

      // Check LZ sync (job exists on Arbitrum)
      if (!jobSynced) {
        const jobExists = await checkJobExistsOnArbitrum(jobId);
        if (jobExists) {
          jobSynced = true;
        }
      }

      // Check CCTP relay status from backend
      if (!cctpCompleted) {
        try {
          const res = await fetch(`${backendUrl}/api/start-job-status/${jobId}`);
          if (res.ok) {
            const status = await res.json();

            if (status.status === 'completed') {
              cctpCompleted = true;
            } else if (status.status === 'failed') {
              setTransactionStatus(`Step 2/2: CCTP relay failed: ${status.error || status.message}. USDC may need manual relay.`);
              // Still redirect if job is synced — user can see the job but release won't work until CCTP is fixed
              if (jobSynced) {
                setTimeout(() => navigate(`/job-details/${jobId}`), 3000);
              }
              return;
            } else if (status.status === 'polling_attestation') {
              if (jobSynced) {
                setTransactionStatus("Step 2/2: Job synced! Polling Circle API for CCTP attestation...");
              }
            } else if (status.status === 'executing_receive') {
              setTransactionStatus("Step 2/2: Executing CCTP receive on Arbitrum...");
            }
          }
        } catch (err) {
          console.warn("CCTP status check failed:", err.message);
        }
      }

      // Both done — redirect
      if (jobSynced && cctpCompleted) {
        setTransactionStatus("Contract synced and USDC received! Redirecting...");
        setTimeout(() => navigate(`/job-details/${jobId}`), 1500);
        return;
      }

      // Update status message based on what's still pending
      if (!jobSynced && !cctpCompleted) {
        setTransactionStatus("Step 1/2: Waiting for LayerZero sync and CCTP relay...");
      } else if (jobSynced && !cctpCompleted) {
        setTransactionStatus("Step 2/2: Job synced! Waiting for CCTP relay to deliver USDC to Arbitrum...");
      } else if (!jobSynced && cctpCompleted) {
        setTransactionStatus("Step 1/2: CCTP complete! Waiting for LayerZero sync...");
      }

      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }

    // Timeout — redirect if job at least synced
    if (jobSynced) {
      setTransactionStatus("Contract synced but CCTP relay still processing. Redirecting...");
      setTimeout(() => navigate(`/job-details/${jobId}`), 2000);
    } else {
      setTransactionStatus("Contract created but sync taking longer than expected. Check browse jobs in a few minutes.");
    }
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

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    // Validate required fields
    if (!jobTitle.trim()) {
      alert("Please enter a job title");
      return;
    }

    if (!jobDescription.trim()) {
      alert("Please enter job requirements");
      return;
    }

    if (!jobTaker.trim()) {
      alert("Please enter job taker address");
      return;
    }

    if (window.ethereum) {
      try {
        setLoadingT(true);

        const web3 = new Web3(window.ethereum);
        await window.ethereum.request({ method: "eth_requestAccounts" });
        
        // Check if user is connected to a supported local chain
        const chainId = await web3.eth.getChainId();
        const localChains = getLocalChains();
        const allowedChainIds = localChains.map(c => c.chainId);

        if (!allowedChainIds.includes(Number(chainId))) {
          const chainNames = localChains.map(c => c.name).join(' or ');
          alert(`Please switch to ${chainNames}. Current chain ID: ${chainId}`);
          setLoadingT(false);
          return;
        }

        const currentChainConfig = getChainConfig(Number(chainId));
        const contractAddress = currentChainConfig.contracts.lowjc;

        const accounts = await web3.eth.getAccounts();
        const fromAddress = accounts[0];


        // Step 1: Upload milestones to IPFS
        const milestoneHashes = [];
        const milestoneAmounts = [];

        for (let i = 0; i < milestones.length; i++) {
          const milestone = milestones[i];

          const milestoneHash = await pinMilestoneToIPFS(milestone, i);
          if (!milestoneHash) {
            throw new Error(`Failed to upload milestone ${i}`);
          }

          milestoneHashes.push(milestoneHash);
          milestoneAmounts.push(milestone.amount * 1000000); // Convert to USDT units (6 decimals)

        }


        // Step 2: Create job details object
        const jobDetails = {
          title: jobTitle,
          description: jobDescription,
          milestoneType: selectedOption,
          milestones: milestones,
          milestoneHashes: milestoneHashes,
          attachments: uploadedFiles,
          totalCompensation: totalCompensation,
          jobGiver: fromAddress,
          jobTaker: jobTaker,
          timestamp: new Date().toISOString(),
        };

        // Step 3: Upload job details to IPFS
        const jobResponse = await pinJobDetailsToIPFS(jobDetails);

        if (jobResponse && jobResponse.IpfsHash) {
          const jobDetailHash = jobResponse.IpfsHash;

          // Step 4: Prepare contract call
          const contract = new web3.eth.Contract(
            JobContractABI,
            contractAddress,
          );

          // Job taker chain domain - use CCTP domain (not chain ID)
          // CCTP domains: 0=Ethereum, 2=Optimism, 3=Arbitrum, 6=Base
          const jobTakerChainDomain = currentChainConfig.cctpDomain;

          // Step 5: Approve USDC spending (total of all milestones)
          setTransactionStatus("💰 Approving USDC spending - Please confirm in MetaMask");
          
          const USDC_ADDRESS = currentChainConfig.contracts.usdc;
          const firstMilestoneUSDC = milestones[0].amount * 1000000; // Only first milestone - contract locks one at a time

          
          const usdcABI = [{
            "inputs": [
              {"internalType": "address", "name": "spender", "type": "address"},
              {"internalType": "uint256", "name": "amount", "type": "uint256"}
            ],
            "name": "approve",
            "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
            "stateMutability": "nonpayable",
            "type": "function"
          }];
          
          const usdcContract = new web3.eth.Contract(usdcABI, USDC_ADDRESS);
          
          try {
            await usdcContract.methods.approve(
              contractAddress,
              firstMilestoneUSDC.toString()
            ).send({ from: fromAddress });
            
          } catch (approvalError) {
            console.error("❌ USDC approval failed:", approvalError);
            setTransactionStatus("❌ USDC approval failed - Please try again");
            setLoadingT(false);
            return;
          }

          // Step 6: Get dynamic LayerZero quote
          setTransactionStatus("Getting LayerZero quote...");

          // DirectContract needs more destination gas than PostJob due to extra parameters
          const DIRECT_CONTRACT_OPTIONS = '0x00030100110100000000000000000000000000186A00';

          // Get bridge contract for quoting
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

          // Encode payload matching the contract's abi.encode for startDirectContract
          const quotePayload = web3.eth.abi.encodeParameters(
            ['string', 'address', 'address', 'string', 'string', 'string[]', 'uint256[]', 'uint32'],
            ['startDirectContract', fromAddress, jobTaker, 'quote-placeholder', jobDetailHash, milestoneHashes, milestoneAmounts, jobTakerChainDomain]
          );

          // Get quote and add 20% buffer
          const quotedFee = await bridgeContract.methods.quoteNativeChain(quotePayload, DIRECT_CONTRACT_OPTIONS).call();
          const feeToUse = (BigInt(quotedFee) * BigInt(120) / BigInt(100)).toString();

          // Get current job count to predict next jobId
          const jobCounter = await contract.methods.getJobCount().call();
          const layerZeroEid = currentChainConfig.layerzero.eid;
          const predictedJobId = `${layerZeroEid}-${Number(jobCounter) + 1}`;


          // Step 6: Call startDirectContract with higher gas options
          setTransactionStatus("Sending transaction to blockchain...");

          contract.methods
            .startDirectContract(
              jobTaker,
              jobDetailHash,
              milestoneHashes,
              milestoneAmounts,
              jobTakerChainDomain,
              DIRECT_CONTRACT_OPTIONS
            )
            .send({
              from: fromAddress,
              value: feeToUse,
              gasPrice: await web3.eth.getGasPrice(),
            })
            .on("receipt", function (receipt) {

              // Try to extract job ID from LayerZero logs first
              let jobId = extractJobIdFromLayerZeroLogs(receipt);

              // Fallback: use predicted job ID
              if (!jobId) {
                jobId = predictedJobId;
              }

              if (jobId) {
                setTransactionStatus("✅ Contract created! Tracking cross-chain progress...");
                setLoadingT(false);

                // ── Client-side cross-chain monitoring ────────────────────
                const srcTxHash  = receipt.transactionHash;
                const srcChainId = Number(chainId);
                const lzLink     = `https://layerzeroscan.com/tx/${srcTxHash}`;
                const circleLink = `https://iris-api.circle.com/v2/messages/${currentChainConfig?.cctpDomain ?? 2}?transactionHash=${srcTxHash}`;

                setCrossChainSteps(buildPaymentSteps({
                  sourceChainId: srcChainId,
                  usdcApproved: true,
                  sourceTxHash: srcTxHash,
                  lzStatus: 'active',
                  lzLink,
                  circleLink,
                }));

                monitorLZMessage(srcTxHash, (lzUpdate) => {
                  setCrossChainSteps(prev => buildPaymentSteps({
                    ...prev,
                    lzStatus:    lzUpdate.status === STATUS.SUCCESS ? 'delivered'
                               : lzUpdate.status === STATUS.FAILED  ? 'failed' : 'active',
                    lzLink:      lzUpdate.lzLink || lzLink,
                    lzDstTxHash: lzUpdate.dstTxHash,
                    lzDstChainId: 42161,
                    cctpBurnTxHash: lzUpdate.dstTxHash,
                    cctpSourceDomain: 3,
                    sourceChainId: srcChainId,
                    usdcApproved: true,
                    sourceTxHash: srcTxHash,
                    circleLink,
                  }));
                  if (lzUpdate.status === STATUS.SUCCESS && lzUpdate.dstTxHash) {
                    monitorCCTPTransfer(lzUpdate.dstTxHash, 3,
                      (cctpUpdate) => setCrossChainSteps(prev => buildPaymentSteps({
                        ...prev,
                        cctpAttestationStatus: cctpUpdate.status === STATUS.SUCCESS ? 'complete'
                                             : cctpUpdate.message?.includes('slow') ? 'slow' : 'pending',
                      })),
                      () => setCrossChainSteps(prev => buildPaymentSteps({ ...prev, cctpAttestationStatus: 'complete' }))
                    );
                  }
                });
                // ─────────────────────────────────────────────────────────

                // Trigger backend CCTP relay (belt + suspenders)
                const backendUrl = import.meta.env.VITE_BACKEND_URL || '';
                fetch(`${backendUrl}/api/start-job`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ jobId, txHash: srcTxHash })
                }).then(res => res.json()).then(result => {
                }).catch(err => {
                  console.warn("⚠️ Backend unavailable, client-side monitor handling:", err.message);
                  setTransactionStatus("⚠️ Backend offline — tracking cross-chain status directly. Check progress below.");
                });

                // Also poll Genesis for job sync visibility
                pollForJobSync(jobId);
              } else {
                setTransactionStatus("✅ Transaction confirmed but job ID extraction failed. Check browse jobs manually.");
                setLoadingT(false);
              }
            })
            .on("error", function (error) {
              console.error("❌ Error sending transaction:", error);
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
          <h1 id="txText">Transaction in Progress</h1>
          <p id="txSubtext">
            If the transaction goes through, we'll redirect you to your contract
          </p>
        </div>
      </div>
    );
  }

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
              name: `direct-contract-job-${Date.now()}`,
              keyvalues: {
                type: "direct-contract-job",
                jobTitle: jobDetails.title,
                timestamp: new Date().toISOString(),
              },
            },
          }),
        }
      );

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error pinning job details to IPFS:', error);
      return null;
    }
  };

  // Helper function to calculate LayerZero gas based on milestone count
  const calculateLayerZeroGas = (milestoneCount) => {
    // Base gas for function call overhead and basic operations
    const BASE_GAS = 500000;
    
    // Per-milestone gas cost (storage operations, array processing, events)
    // DirectContract has extra parameters (jobTaker address, chainDomain) so needs more gas per milestone
    const GAS_PER_MILESTONE = 300000;
    
    // Calculate total gas needed
    const totalGas = BASE_GAS + (milestoneCount * GAS_PER_MILESTONE);
    
    // Add 20% buffer for safety margin
    const gasWithBuffer = Math.floor(totalGas * 1.2);
    
    
    return gasWithBuffer;
  };

  // Helper function to build LayerZero options with custom gas limit
  const buildLayerZeroOptions = (gasLimit) => {
    // Convert gas limit to hex and pad to 24 characters (12 bytes)
    const gasHex = gasLimit.toString(16).padStart(24, '0');
    
    // Construct the full options value
    // 0x0003 = options type/version
    // 01001101 = configuration flags
    // gasHex = custom gas limit
    const optionsValue = '0x000301001101' + gasHex;
    
    
    return optionsValue;
  };


  return (
    <>
      <div className="form-containerDC">
        <div className="form-header">
          <BackButton to="/work" title="Create a Direct Contract"  style={{gap: '20px', fontSize: '20px'}}/>
        </div>
        <div className="form-body">
          <span id="pDC2">
            Enter in a contract directly with someone you know here. This gives
            access to OpenWork's dispute resolution and helps build profile
            strength for both parties.
          </span>
          <div style={{ marginTop: "12px" }}>
            <div className="form-groupDC">
              <input
                type="text"
                placeholder="Job Title"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
              />
            </div>
            <div className="form-groupDC">
              <input
                type="text"
                placeholder="Job Taker Address (0x...)"
                value={jobTaker}
                onChange={(e) => setJobTaker(e.target.value)}
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
                isSelected={selectedOption === 'Single Milestone'}
                onChange={() => setSelectedOption('Single Milestone')}
              />
              <RadioButton
                label="Multiple Milestones"
                isSelected={selectedOption === 'Multiple Milestones'}
                onChange={() => setSelectedOption('Multiple Milestones')}
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
                        onUpdate={(field, value) => handleMilestoneUpdate(index, field, value)}
                        onDelete={() => handleDeleteMilestone(index)}
                      />
                    ))}
                </div>
                {selectedOption === 'Multiple Milestones' && (
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
            <div className="form-groupDC form-platformFee">
              <div className="platform-fee">
                <span>platform fees</span>
                <img src="/fee.svg" alt="" />
              </div>
              <span>{platformFee !== null ? `${platformFee}%` : '...'}</span>
            </div>
            <BlueButton 
              label="Enter Contract" 
              style={{width: '100%', justifyContent: 'center'}}
              onClick={handleSubmit}
            />
            <div className="warning-form">
              <Warning content={transactionStatus} />
            </div>
            {crossChainSteps && (
              <CrossChainStatus
                title="Contract cross-chain status"
                steps={crossChainSteps}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
