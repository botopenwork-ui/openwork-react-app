import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Web3 from "web3";
import JobContractABI from "../../ABIs/lowjc_ABI.json";
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

// Multi-chain support
import { useChainDetection, useWalletAddress } from "../../hooks/useChainDetection";
import { postJob as postJobMultiChain } from "../../services/localChainService";
import { getLocalChains } from "../../config/chainConfig";

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
  const [milestones, setMilestones] = useState([
    {
      title: "Milestone 1",
      content:
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
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

  // Function to extract job ID from LayerZero logs
  const extractJobIdFromLayerZeroLogs = (receipt) => {
    try {
      console.log("🔍 Searching for LayerZero logs in transaction...");
      
      // LayerZero event signature from the documentation
      const layerZeroSignature = "0x1ab700d4ced0c005b164c0f789fd09fcbb0156d4c2041b8a3bfbcd961cd1567f";
      
      // Find LayerZero message log
      const layerZeroLog = receipt.logs.find(log => 
        log.topics && log.topics[0] === layerZeroSignature
      );
      
      if (!layerZeroLog) {
        console.log("❌ LayerZero message log not found");
        console.log("📋 Available logs:", receipt.logs);
        return null;
      }
      
      console.log("✅ Found LayerZero log:", layerZeroLog);
      
      // Extract job ID from the log data
      const logData = layerZeroLog.data;
      console.log("📊 LayerZero log data:", logData);
      
      // Parse the hex data to find job ID pattern (40232-XXX)
      const dataStr = logData.slice(2); // Remove 0x prefix
      const chunks = dataStr.match(/.{1,64}/g) || []; // Split into 32-byte chunks
      
      for (const chunk of chunks) {
        try {
          // Clean chunk (remove trailing zeros)
          const cleanChunk = chunk.replace(/00+$/, "");
          if (cleanChunk.length > 0) {
            const decoded = Web3.utils.hexToUtf8("0x" + cleanChunk);
            console.log("🔤 Decoded chunk:", decoded);
            
            // Check if it matches job ID pattern (numbers-numbers)
            if (decoded.match(/^\d+-\d+$/)) {
              console.log("🎯 Found job ID:", decoded);
              return decoded;
            }
          }
        } catch (e) {
          // Skip invalid UTF8 sequences
          continue;
        }
      }
      
      // Alternative method: Look for specific hex pattern for job IDs starting with 40232
      // "40232-" in hex is "34303233322d"
      const jobIdMatch = dataStr.match(/34303233322d[\da-f]+/i);
      if (jobIdMatch) {
        try {
          const decoded = Web3.utils.hexToUtf8("0x" + jobIdMatch[0]);
          console.log("🎯 Found job ID (pattern match):", decoded);
          
          // Extract just the job ID part (40232-XXX) from the decoded string
          const cleanJobId = decoded.match(/^\d+-\d+/);
          if (cleanJobId) {
            console.log("✨ Cleaned job ID:", cleanJobId[0]);
            return cleanJobId[0];
          }
          
          return decoded;
        } catch (e) {
          console.log("❌ Failed to decode pattern match");
        }
      }
      
      console.log("❌ Job ID not found in LayerZero data");
      return null;
      
    } catch (error) {
      console.error("❌ Error extracting job ID from LayerZero logs:", error);
      return null;
    }
  };

  // Function to check if job exists on Arbitrum Sepolia (browse jobs)
  const checkJobExistsOnArbitrum = async (jobId) => {
    try {
      console.log("🔍 Polling for job ID:", jobId);
      console.log("📍 Checking contract:", BROWSE_JOBS_CONTRACT);
      console.log("🌐 Using RPC:", ARBITRUM_SEPOLIA_RPC);
      
      const arbitrumWeb3 = new Web3(ARBITRUM_SEPOLIA_RPC);
      const browseJobsContract = new arbitrumWeb3.eth.Contract(BrowseJobsABI, BROWSE_JOBS_CONTRACT);
      
      // Try to get the job data
      const jobData = await browseJobsContract.methods.getJob(jobId).call();
      console.log("📋 Job data received:", jobData);
      console.log("🆔 jobData.id:", jobData.id);
      console.log("🔍 Looking for jobId:", jobId);
      
      // Check if job exists - jobData.id should match our jobId
      // Also check if jobGiver is not zero address (indicates real job)
      const jobExists = jobData && 
                        jobData.id && 
                        (jobData.id === jobId || jobData.id.toString() === jobId) &&
                        jobData.jobGiver && 
                        jobData.jobGiver !== '0x0000000000000000000000000000000000000000';
      
      console.log("✅ Job exists on Arbitrum:", jobExists);
      return jobExists;
    } catch (error) {
      console.log("❌ Job not yet synced:", error.message);
      return false;
    }
  };

  // Function to poll for job sync completion
  const pollForJobSync = async (jobId) => {
    setTransactionStatus("Job posted successfully! Cross-chain sync will take 15-30 seconds...");
    
    // Wait 10 seconds before starting to poll
    await new Promise(resolve => setTimeout(resolve, 10000));
    setTransactionStatus("Checking for cross-chain sync...");
    
    const maxAttempts = 8; // 8 attempts over 35 seconds (after initial 10s wait)
    const pollInterval = 5000; // 5 seconds
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`Polling attempt ${attempt}/${maxAttempts} for job ${jobId}`);
      
      const jobExists = await checkJobExistsOnArbitrum(jobId);
      
      if (jobExists) {
        setTransactionStatus("Job synced! Redirecting...");
        setTimeout(() => navigate(`/job-details/${jobId}`), 1500);
        return;
      }
      
      // Update status with estimated time remaining
      const timeRemaining = Math.max(0, 45 - (10 + (attempt * 5))); // Total time - elapsed time
      setTransactionStatus(`Syncing job across chains... (~${timeRemaining}s remaining)`);
      
      // Wait before next attempt
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }
    
    // If we get here, polling timed out
    setTransactionStatus("Job posted but sync taking longer than expected. Check browse jobs in a few minutes.");
  };


  // Update milestones based on selected option
  useEffect(() => {
    if (selectedOption === "Single Milestone") {
      setMilestones([
        {
          title: "Milestone 1",
          content:
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
          amount: 1,
        },
      ]);
    } else {
      setMilestones([
        {
          title: "Milestone 1",
          content:
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
          amount: 1,
        },
        {
          title: "Milestone 2",
          content:
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
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
      content: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
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
        
        console.log(`✅ Posting job on ${chainConfig.name} (Chain ID: ${chainId})`);
        
        const accounts = await web3.eth.getAccounts();
        const fromAddress = accounts[0];

        console.log("=== STARTING MILESTONE HASHING ===");
        setTransactionStatus("Uploading milestone data to IPFS...");

        // Step 1: Create hashes for each milestone
        const milestoneHashes = [];
        const milestoneAmounts = [];

        for (let i = 0; i < milestones.length; i++) {
          const milestone = milestones[i];
          console.log(`Hashing milestone ${i}:`, milestone);

          const milestoneHash = await pinMilestoneToIPFS(milestone, i);
          if (!milestoneHash) {
            throw new Error(`Failed to hash milestone ${i}`);
          }

          milestoneHashes.push(milestoneHash);
          milestoneAmounts.push(milestone.amount * 1000000); // Convert to USDT units (6 decimals)

          console.log(`Milestone ${i} hash:`, milestoneHash);
        }

        console.log("All milestone hashes:", milestoneHashes);
        console.log("All milestone amounts:", milestoneAmounts);

        // Step 2: Create comprehensive job details object (including milestone hashes)
        console.log("📝 Creating job details object with:");
        console.log("📋 Job Title:", jobTitle);
        console.log("📄 Job Description:", jobDescription);
        console.log("🎯 Selected Skills:", selectedSkills);
        console.log("📊 Selected Option:", selectedOption);
        console.log("🎯 Milestones:", milestones);
        console.log("💰 Total Compensation:", totalCompensation);
        console.log("📎 Uploaded Files:", uploadedFiles);
        
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
        
        console.log("📦 Complete jobDetails object:", jobDetails);

        // Step 3: Pin comprehensive job details to IPFS
        setTransactionStatus("Uploading job details to IPFS...");
        const jobResponse = await pinJobDetailsToIPFS(jobDetails);
        console.log("Job IPFS Response:", jobResponse);

        if (jobResponse && jobResponse.IpfsHash) {
          const jobDetailHash = jobResponse.IpfsHash;
          console.log("Job IPFS Hash:", jobDetailHash);

          // Step 4: Prepare contract parameters - USE DETECTED CHAIN CONFIG
          const lowjcAddress = chainConfig.contracts.lowjc;
          const layerzeroOptions = chainConfig.layerzero.options;
          
          const contract = new web3.eth.Contract(
            JobContractABI,
            lowjcAddress,
          );

          // DEBUG: Log all transaction data
          console.log("=== MULTI-CHAIN TRANSACTION DEBUG ===");
          console.log("🌐 Chain:", chainConfig.name, `(${chainId})`);
          console.log("📍 LOWJC Address:", lowjcAddress);
          console.log("📄 Job Detail Hash:", jobDetailHash);
          console.log("📋 Milestone Hashes:", milestoneHashes);
          console.log("💰 Milestone Amounts:", milestoneAmounts);
          console.log("⚡ LayerZero Options:", layerzeroOptions);
          console.log("👤 From Address:", fromAddress);
          console.log("📦 Job Details:", jobDetails);
          console.log("========================================");

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
          
          // Get current job count to predict next jobId - DYNAMIC CHAIN ID
          const jobCounter = await contract.methods.getJobCount().call();
          const nextJobId = `${chainId}-${Number(jobCounter) + 1}`; // Use detected chainId
          console.log("📊 Current job count:", jobCounter);
          console.log("🔮 Predicted next jobId:", nextJobId);
          
          // Encode payload with predicted jobId
          const payload = web3.eth.abi.encodeParameters(
            ['string', 'string', 'address', 'string', 'string[]', 'uint256[]'],
            ['postJob', nextJobId, fromAddress, jobDetailHash, milestoneHashes, milestoneAmounts]
          );
          
          const quotedFee = await bridgeContract.methods.quoteNativeChain(payload, layerzeroOptions).call();
          console.log("💰 LayerZero quoted fee:", web3.utils.fromWei(quotedFee, 'ether'), "ETH");
          
          // FIXED FEE OVERRIDE: Use 0.001 ETH instead of quoted fee
          // To switch back to dynamic quoting: change feeToUse = fixedFee to feeToUse = quotedFee
          const fixedFee = web3.utils.toWei('0.001', 'ether');
          const feeToUse = fixedFee; // Change to: quotedFee for dynamic quoting
          console.log("⚠️ Using fixed fee override:", web3.utils.fromWei(feeToUse, 'ether'), "ETH");
          
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
              console.log("📄 Full transaction receipt:", receipt);
              
              // Extract job ID from LayerZero logs
              const jobId = extractJobIdFromLayerZeroLogs(receipt);
              
              if (jobId) {
                console.log("✅ Extracted Job ID from LayerZero:", jobId);
                setTransactionStatus("✅ Job posted successfully!");
                setLoadingT(false);
                
                // Start polling for cross-chain sync
                pollForJobSync(jobId);
              } else {
                console.log("❌ Could not extract job ID from LayerZero logs");
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
            
            {/* Multi-Chain Indicator */}
            {chainConfig && isAllowed && (
              <div className="form-groupDC" style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '8px',
                padding: '12px 16px',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '18px' }}>📡</span>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '14px' }}>Posting on {chainConfig.name}</div>
                    <div style={{ fontSize: '11px', opacity: 0.9 }}>Job will sync to all chains via LayerZero</div>
                  </div>
                </div>
                <div style={{ 
                  background: 'rgba(255,255,255,0.2)', 
                  padding: '4px 10px', 
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 'bold'
                }}>
                  Chain ID: {chainId}
                </div>
              </div>
            )}
            
            {/* Chain Error Warning */}
            {!isAllowed && chainConfig && (
              <div className="form-groupDC" style={{
                background: '#fff3cd',
                border: '1px solid #ffc107',
                borderRadius: '8px',
                padding: '12px 16px',
                color: '#856404',
                marginBottom: '12px'
              }}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>⚠️ Cannot Post Jobs on {chainConfig.name}</div>
                <div style={{ fontSize: '13px', marginBottom: '8px' }}>{chainError}</div>
                <div style={{ fontSize: '12px', fontWeight: 'bold' }}>Supported chains:</div>
                <ul style={{ margin: '4px 0 0 20px', fontSize: '12px' }}>
                  {getLocalChains().map(chain => (
                    <li key={chain.chainId}>{chain.name}</li>
                  ))}
                </ul>
              </div>
            )}
            
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
          </div>
        </div>
      </div>
    </>
  );
}
