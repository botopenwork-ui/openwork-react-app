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

const SKILLOPTIONS = [
  'UX/UI Skill Oracle','Full Stack development','UX/UI Skill Oracle',
]

const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;
const LAYERZERO_OPTIONS_VALUE = import.meta.env.VITE_LAYERZERO_OPTIONS_VALUE;

// Browse Jobs contract (NOWJC on Arbitrum Sepolia)
const BROWSE_JOBS_CONTRACT = import.meta.env.VITE_NOWJC_CONTRACT_ADDRESS;
const ARBITRUM_SEPOLIA_RPC = import.meta.env.VITE_ARBITRUM_SEPOLIA_RPC_URL;

// Backend URL for secure API calls
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

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

        const response = await fetch(
          'https://api.pinata.cloud/pinning/pinFileToIPFS',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${import.meta.env.VITE_PINATA_API_KEY}`,
            },
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
  const [milestones, setMilestones] = useState([
    {
      title: "Milestone 1",
      content: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
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
          content: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
          amount: 1,
        },
      ]);
    } else {
      setMilestones([
        {
          title: "Milestone 1",
          content: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
          amount: 1,
        },
        {
          title: "Milestone 2",
          content: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
          amount: 1,
        },
      ]);
    }
  }, [selectedOption]);

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
      content: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
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
      console.log("🔍 Searching for LayerZero logs in transaction...");
      
      const layerZeroSignature = "0x1ab700d4ced0c005b164c0f789fd09fcbb0156d4c2041b8a3bfbcd961cd1567f";
      
      const layerZeroLog = receipt.logs.find(log => 
        log.topics && log.topics[0] === layerZeroSignature
      );
      
      if (!layerZeroLog) {
        console.log("❌ LayerZero message log not found");
        return null;
      }
      
      console.log("✅ Found LayerZero log:", layerZeroLog);
      
      const logData = layerZeroLog.data;
      const dataStr = logData.slice(2);
      const chunks = dataStr.match(/.{1,64}/g) || [];
      
      for (const chunk of chunks) {
        try {
          const cleanChunk = chunk.replace(/00+$/, "");
          if (cleanChunk.length > 0) {
            const decoded = Web3.utils.hexToUtf8("0x" + cleanChunk);
            if (decoded.match(/^\d+-\d+$/)) {
              console.log("🎯 Found job ID:", decoded);
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

  // Function to check if job exists on Arbitrum Sepolia
  const checkJobExistsOnArbitrum = async (jobId) => {
    try {
      console.log("\n🔍 ========== POLLING ATTEMPT ==========");
      console.log("  Job ID:", jobId);
      console.log("  Contract:", BROWSE_JOBS_CONTRACT);
      console.log("  RPC:", ARBITRUM_SEPOLIA_RPC);
      
      const arbitrumWeb3 = new Web3(ARBITRUM_SEPOLIA_RPC);
      
      // Test RPC connection
      try {
        const blockNumber = await arbitrumWeb3.eth.getBlockNumber();
        console.log("  ✅ RPC connected, current block:", blockNumber);
      } catch (rpcError) {
        console.error("  ❌ RPC connection failed:", rpcError);
        return false;
      }
      
      const browseJobsContract = new arbitrumWeb3.eth.Contract(
        BrowseJobsABI, 
        BROWSE_JOBS_CONTRACT
      );
      
      // Try to call getJob
      console.log("  📞 Calling getJob('" + jobId + "')...");
      const jobData = await browseJobsContract.methods.getJob(jobId).call();
      console.log("  📊 Job data received:", jobData);
      console.log("  📝 Job ID from data:", jobData.id);
      console.log("  📝 Job Giver:", jobData.jobGiver);
      console.log("  📝 Status:", jobData.status);
      
      const jobExists = jobData && jobData.id && jobData.id === jobId;
      console.log("  " + (jobExists ? "✅" : "❌") + " Job exists:", jobExists);
      console.log("=========================================\n");
      
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
    setTransactionStatus("Direct contract created! Cross-chain sync will take 15-30 seconds...");
    
    await new Promise(resolve => setTimeout(resolve, 10000));
    setTransactionStatus("Checking for cross-chain sync...");
    
    const maxAttempts = 8;
    const pollInterval = 5000;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`Polling attempt ${attempt}/${maxAttempts} for job ${jobId}`);
      
      const jobExists = await checkJobExistsOnArbitrum(jobId);
      
      if (jobExists) {
        setTransactionStatus("Contract synced! Redirecting...");
        setTimeout(() => navigate(`/job-details/${jobId}`), 1500);
        return;
      }
      
      const timeRemaining = Math.max(0, 45 - (10 + (attempt * 5)));
      setTransactionStatus(`Syncing contract across chains... (~${timeRemaining}s remaining)`);
      
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }
    
    setTransactionStatus("Contract created but sync taking longer than expected. Check browse jobs in a few minutes.");
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
        
        // Check if user is connected to OP Sepolia
        const chainId = await web3.eth.getChainId();
        const OP_SEPOLIA_CHAIN_ID = 11155420;
        
        if (Number(chainId) !== OP_SEPOLIA_CHAIN_ID) {
          alert(`Please switch to OP Sepolia network. Current chain ID: ${chainId}, Required: ${OP_SEPOLIA_CHAIN_ID}`);
          setLoadingT(false);
          return;
        }
        
        const accounts = await web3.eth.getAccounts();
        const fromAddress = accounts[0];

        console.log("=== STARTING DIRECT CONTRACT ===");
        console.log("Job Taker:", jobTaker);
        console.log("Milestones:", milestones);

        // Step 1: Upload milestones to IPFS
        const milestoneHashes = [];
        const milestoneAmounts = [];

        for (let i = 0; i < milestones.length; i++) {
          const milestone = milestones[i];
          console.log(`Uploading milestone ${i}:`, milestone);

          const milestoneHash = await pinMilestoneToIPFS(milestone, i);
          if (!milestoneHash) {
            throw new Error(`Failed to upload milestone ${i}`);
          }

          milestoneHashes.push(milestoneHash);
          milestoneAmounts.push(milestone.amount * 1000000); // Convert to USDT units (6 decimals)

          console.log(`Milestone ${i} hash:`, milestoneHash);
        }

        console.log("All milestone hashes:", milestoneHashes);
        console.log("All milestone amounts:", milestoneAmounts);

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
        console.log("Job IPFS Response:", jobResponse);

        if (jobResponse && jobResponse.IpfsHash) {
          const jobDetailHash = jobResponse.IpfsHash;
          console.log("Job IPFS Hash:", jobDetailHash);

          // Step 4: Prepare contract call
          const contract = new web3.eth.Contract(
            JobContractABI,
            contractAddress,
          );

          // Job taker chain domain (OP Sepolia = 11155420)
          const jobTakerChainDomain = 11155420;

          // Step 5: Approve USDC spending (total of all milestones)
          setTransactionStatus("💰 Approving USDC spending - Please confirm in MetaMask");
          
          const USDC_ADDRESS = "0x5fd84259d66Cd46123540766Be93DFE6d43130D7"; // OP Sepolia USDC
          const totalUSDC = milestones.reduce((sum, milestone) => sum + milestone.amount, 0) * 1000000; // Convert to USDC units (6 decimals)
          
          console.log("💰 Approving USDC amount:", totalUSDC, "units (", totalUSDC / 1000000, "USDC)");
          
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
              totalUSDC.toString()
            ).send({ from: fromAddress });
            
            console.log("✅ USDC approval successful");
          } catch (approvalError) {
            console.error("❌ USDC approval failed:", approvalError);
            setTransactionStatus("❌ USDC approval failed - Please try again");
            setLoadingT(false);
            return;
          }

          // Step 6: Use higher gas limit for DirectContract (1.6M gas for destination)
          setTransactionStatus("Preparing LayerZero transaction...");
          
          // DirectContract needs more destination gas than PostJob due to extra parameters
          const DIRECT_CONTRACT_OPTIONS = '0x00030100110100000000000000000000000000186A00';
          
          // FIXED FEE: Use 0.001 ETH
          const fixedFee = web3.utils.toWei('0.001', 'ether');
          const feeToUse = fixedFee;
          console.log("💰 Using fixed LayerZero fee:", web3.utils.fromWei(feeToUse, 'ether'), "ETH");

          console.log("\n=== TRANSACTION PARAMETERS ===");
          console.log("Job Taker:", jobTaker);
          console.log("Job Detail Hash:", jobDetailHash);
          console.log("Milestone Hashes:", milestoneHashes);
          console.log("Milestone Amounts:", milestoneAmounts);
          console.log("Chain Domain:", jobTakerChainDomain);
          console.log("Milestone Count:", milestones.length);
          console.log("LayerZero Options (1.6M gas):", DIRECT_CONTRACT_OPTIONS);

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
              console.log("📄 Transaction receipt:", receipt);
              
              // Extract job ID from LayerZero logs
              const jobId = extractJobIdFromLayerZeroLogs(receipt);
              
              if (jobId) {
                console.log("✅ Extracted Job ID from LayerZero logs:", jobId);
                setTransactionStatus("✅ Contract created successfully!");
                setLoadingT(false);
                
                // Start polling for cross-chain sync
                pollForJobSync(jobId);
              } else {
                console.log("❌ Could not extract job ID from LayerZero logs");
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
              console.log("Transaction hash:", hash);
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
      console.log("Job details pinned to IPFS:", data);
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
    
    console.log(`🔥 Gas calculation for ${milestoneCount} milestone(s):`);
    console.log(`   Base: ${BASE_GAS}, Per-Milestone: ${GAS_PER_MILESTONE}`);
    console.log(`   Total: ${totalGas}, With Buffer: ${gasWithBuffer}`);
    
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
    
    console.log(`⚙️ Built LayerZero options: ${optionsValue}`);
    console.log(`   Gas limit: ${gasLimit} (0x${gasLimit.toString(16)})`);
    
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
              <span>5%</span>
            </div>
            <BlueButton 
              label="Enter Contract" 
              style={{width: '100%', justifyContent: 'center'}}
              onClick={handleSubmit}
            />
            <div className="warning-form">
              <Warning content={transactionStatus} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
