import React, { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Web3 from "web3";
import contractABI from "../../ABIs/nowjc_ABI.json";
import athenaClientABI from "../../ABIs/athena-client_ABI.json";
import genesisABI from "../../ABIs/genesis_ABI.json";
import nativeAthenaABI from "../../ABIs/native-athena_ABI.json";
import "./RaiseDispute.css";
import { useWalletConnection } from "../../functions/useWalletConnection";
import { formatWalletAddress } from "../../functions/formatWalletAddress";

import BackButton from "../../components/BackButton/BackButton";
import SkillBox from "../../components/SkillBox/SkillBox";
import DropDown from "../../components/DropDown/DropDown";
import BlueButton from "../../components/BlueButton/BlueButton";
import Warning from "../../components/Warning/Warning";

const CONTRACT_ADDRESS = import.meta.env.VITE_NOWJC_CONTRACT_ADDRESS;
const GENESIS_CONTRACT_ADDRESS = import.meta.env.VITE_GENESIS_CONTRACT_ADDRESS || "0x1f23683C748fA1AF99B7263dea121eCc5Fe7564C";
const NATIVE_ATHENA_ADDRESS = "0x098E52Aff44AEAd944AFf86F4A5b90dbAF5B86bd";
const ARBITRUM_SEPOLIA_RPC = import.meta.env.VITE_ARBITRUM_SEPOLIA_RPC_URL;

// Athena Client on OP Sepolia
const ATHENA_CLIENT_ADDRESS = "0x45E51B424c87Eb430E705CcE3EcD8e22baD267f7";
const USDC_ADDRESS = "0x5fd84259d66cd46123540766be93dfe6d43130d7";
const OP_SEPOLIA_RPC = import.meta.env.VITE_OPTIMISM_SEPOLIA_RPC_URL;

// LayerZero options
const LZ_OPTIONS = "0x0003010011010000000000000000000000000007a120";

// Backend URL for secure API calls
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

const SKILLOPTIONS = [
  'UX/UI Skill Oracle','Full Stack development','UX/UI Skill Oracle',
]

// Simple ERC20 ABI for USDC approval
const ERC20_ABI = [
  {
    "constant": false,
    "inputs": [
      {"name": "_spender", "type": "address"},
      {"name": "_value", "type": "uint256"}
    ],
    "name": "approve",
    "outputs": [{"name": "", "type": "bool"}],
    "type": "function"
  }
];

// Minimal Native Athena ABI for checking dispute sync
const NATIVE_ATHENA_ABI = [
  {
    "inputs": [{"internalType": "string", "name": "disputeId", "type": "string"}],
    "name": "getDisputeInfo",
    "outputs": [
      {"internalType": "uint256", "name": "totalFees", "type": "uint256"},
      {"internalType": "uint256", "name": "totalVotingPowerFor", "type": "uint256"},
      {"internalType": "uint256", "name": "totalVotingPowerAgainst", "type": "uint256"},
      {"internalType": "bool", "name": "winningSide", "type": "bool"},
      {"internalType": "bool", "name": "isFinalized", "type": "bool"},
      {"internalType": "uint256", "name": "voteCount", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

function ImageUpload({ onFileSelected, selectedFile }) {
  const [preview, setPreview] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      onFileSelected(file);
      setPreview(URL.createObjectURL(file));
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
      {preview && (
        <div style={{ marginTop: '10px' }}>
          <img src={preview} alt="Preview" style={{ maxWidth: '200px', borderRadius: '8px' }} />
          <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
            {selectedFile?.name}
          </div>
        </div>
      )}
    </div>
  );
}

export default function RaiseDispute() {
  const { walletAddress, connectWallet, disconnectWallet } = useWalletConnection();
  const { jobId } = useParams();
  const [job, setJob] = useState(null);
  const [disputeTitle, setDisputeTitle] = useState("");
  const [disputeDescription, setDisputeDescription] = useState("");
  const [disputeAmount, setDisputeAmount] = useState("");
  const [receiverWallet, setReceiverWallet] = useState("");
  const [compensation, setCompensation] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [loadingT, setLoadingT] = useState(false);
  const [loading, setLoading] = useState(true);
  const [transactionStatus, setTransactionStatus] = useState("Dispute submission requires blockchain transaction fees");
  
  // Oracle selection state
  const [oracles, setOracles] = useState([]);
  const [selectedOracle, setSelectedOracle] = useState("");
  const [isOracleDropdownOpen, setIsOracleDropdownOpen] = useState(false);
  const [oraclesLoading, setOraclesLoading] = useState(true);

  const navigate = useNavigate();

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

  // Fetch available oracles from blockchain
  useEffect(() => {
    async function fetchOracles() {
      try {
        setOraclesLoading(true);
        const web3 = new Web3(ARBITRUM_SEPOLIA_RPC);
        const genesisContract = new web3.eth.Contract(genesisABI, GENESIS_CONTRACT_ADDRESS);
        const nativeAthenaContract = new web3.eth.Contract(nativeAthenaABI, NATIVE_ATHENA_ADDRESS);

        // Get all oracle names
        const oracleNames = await genesisContract.methods.getAllOracleNames().call();
        console.log("📋 All oracle names:", oracleNames);

        // Check active status for each oracle
        const oracleDataPromises = oracleNames.map(async (name) => {
          const isActive = await nativeAthenaContract.methods.isOracleActive(name).call();
          const activeMemberCount = await nativeAthenaContract.methods.getOracleActiveMemberCount(name).call();
          return {
            name,
            isActive,
            activeMemberCount: parseInt(activeMemberCount)
          };
        });

        const oracleData = await Promise.all(oracleDataPromises);
        console.log("🏛️ Oracle data with active status:", oracleData);

        setOracles(oracleData);

        // Auto-select first active oracle
        const firstActive = oracleData.find(o => o.isActive);
        if (firstActive) {
          setSelectedOracle(firstActive.name);
          console.log("✅ Auto-selected oracle:", firstActive.name);
        }

        setOraclesLoading(false);
      } catch (error) {
        console.error("Error fetching oracles:", error);
        setOraclesLoading(false);
      }
    }

    fetchOracles();
  }, []);

  useEffect(() => {
    async function fetchJobDetails() {
      try {
        setLoading(true);
        const web3 = new Web3(ARBITRUM_SEPOLIA_RPC);
        const contract = new web3.eth.Contract(contractABI, CONTRACT_ADDRESS);

        const jobData = await contract.methods.getJob(jobId).call();
        console.log("Job data from contract:", jobData);

        let jobDetails = {};
        try {
          if (jobData.jobDetailHash) {
            console.log("Fetching IPFS data from hash:", jobData.jobDetailHash);
            const gateways = [
              `https://ipfs.io/ipfs/${jobData.jobDetailHash}`,
              `https://gateway.pinata.cloud/ipfs/${jobData.jobDetailHash}`,
              `https://cloudflare-ipfs.com/ipfs/${jobData.jobDetailHash}`,
              `https://dweb.link/ipfs/${jobData.jobDetailHash}`
            ];
            
            let ipfsResponse = null;
            for (const gateway of gateways) {
              try {
                ipfsResponse = await fetch(gateway);
                if (ipfsResponse.ok) {
                  break;
                }
              } catch (e) {
                continue;
              }
            }
            if (ipfsResponse && ipfsResponse.ok) {
              jobDetails = await ipfsResponse.json();
              console.log("IPFS jobDetails received:", jobDetails);
            }
          }
        } catch (ipfsError) {
          console.warn("Failed to fetch IPFS data:", ipfsError);
        }

        const totalBudget = jobData.milestonePayments.reduce(
          (sum, milestone) => sum + parseFloat(milestone.amount),
          0,
        );

        const totalPaidAmount = parseFloat(jobData.totalPaid);
        const currentMilestone = parseInt(jobData.currentMilestone);

        let lockedAmount = 0;
        if (currentMilestone <= jobData.finalMilestones.length) {
          for (
            let i = currentMilestone - 1;
            i < jobData.finalMilestones.length;
            i++
          ) {
            if (jobData.finalMilestones[i]) {
              lockedAmount += parseFloat(jobData.finalMilestones[i].amount);
            }
          }
        }

        const formattedTotalBudget = (totalBudget / 1000000).toFixed(2);
        const formattedAmountPaid = (totalPaidAmount / 1000000).toFixed(2);
        const formattedLockedAmount = (lockedAmount / 1000000).toFixed(2);

        setJob({
          jobId: jobData.id,
          title: jobDetails.title || "Untitled Job",
          description: jobDetails.description || "",
          skills: jobDetails.skills || [],
          jobGiver: jobData.jobGiver,
          selectedApplicant: jobData.selectedApplicant,
          status: jobData.status,
          milestones: jobData.finalMilestones,
          currentMilestone: currentMilestone,
          totalMilestones: jobData.milestonePayments.length,
          totalBudget: formattedTotalBudget,
          amountPaid: formattedAmountPaid,
          amountLocked: formattedLockedAmount,
          contractId: CONTRACT_ADDRESS,
          ...jobDetails,
        });

        setLoading(false);
      } catch (error) {
        console.error("Error fetching job details:", error);
        setLoading(false);
      }
    }

    if (jobId) {
      fetchJobDetails();
    }
  }, [jobId]);

  // Upload dispute evidence to IPFS
  const uploadDisputeToIPFS = async () => {
    try {
      const disputeData = {
        jobId: jobId,
        title: disputeTitle,
        description: disputeDescription,
        disputedAmount: disputeAmount,
        receiverWallet: receiverWallet,
        compensation: compensation,
        timestamp: new Date().toISOString(),
        file: selectedFile ? {
          name: selectedFile.name,
          size: selectedFile.size,
          type: selectedFile.type
        } : null
      };

      // If there's a file, upload it first
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);

        const fileResponse = await fetch(
          `${BACKEND_URL}/api/ipfs/upload-file`,
          {
            method: 'POST',
            body: formData,
          }
        );

        if (fileResponse.ok) {
          const fileData = await fileResponse.json();
          disputeData.fileIpfsHash = fileData.IpfsHash;
        }
      }

      // Upload dispute data
      const response = await fetch(
        `${BACKEND_URL}/api/ipfs/upload-json`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            pinataContent: disputeData,
            pinataMetadata: {
              name: `dispute-${jobId}-${Date.now()}`,
              keyvalues: {
                jobId: jobId,
                type: "dispute",
              },
            },
          }),
        },
      );

      const data = await response.json();
      return data.IpfsHash;
    } catch (error) {
      console.error("Error uploading to IPFS:", error);
      throw error;
    }
  };

  // Check if dispute exists on Arbitrum
  const checkDisputeExistsOnArbitrum = async (jobId) => {
    try {
      console.log("🔍 Checking for dispute:", jobId);
      const arbitrumWeb3 = new Web3(ARBITRUM_SEPOLIA_RPC);
      const nativeAthenaContract = new arbitrumWeb3.eth.Contract(
        NATIVE_ATHENA_ABI,
        NATIVE_ATHENA_ADDRESS
      );

      const disputeInfo = await nativeAthenaContract.methods
        .getDisputeInfo(jobId)
        .call();
      
      console.log("📋 Dispute info:", disputeInfo);
      
      // Check if dispute exists (totalFees > 0 means dispute was registered)
      const disputeExists = disputeInfo && parseFloat(disputeInfo.totalFees) > 0;
      console.log("✅ Dispute exists:", disputeExists);
      return disputeExists;
    } catch (error) {
      console.log("❌ Dispute not yet synced:", error.message);
      return false;
    }
  };

  // Poll for dispute sync
  const pollForDisputeSync = async (jobId) => {
    setTransactionStatus("✅ Dispute raised! Cross-chain sync will take 15-30 seconds...");
    
    await new Promise(resolve => setTimeout(resolve, 10000));
    setTransactionStatus("Checking for cross-chain sync...");
    
    const maxAttempts = 8;
    const pollInterval = 5000;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`Polling attempt ${attempt}/${maxAttempts} for dispute ${jobId}`);
      
      const disputeExists = await checkDisputeExistsOnArbitrum(jobId);
      
      if (disputeExists) {
        setTransactionStatus("Dispute synced! Redirecting...");
        setTimeout(() => navigate(`/job-details/${jobId}`), 1500);
        return;
      }
      
      const timeRemaining = Math.max(0, 45 - (10 + (attempt * 5)));
      setTransactionStatus(`Syncing dispute across chains... (~${timeRemaining}s remaining)`);
      
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }
    
    setTransactionStatus("Dispute raised but sync taking longer than expected. Check job details in a few minutes.");
    setTimeout(() => navigate(`/job-details/${jobId}`), 3000);
  };

  const formatAmount = (amount) => {
    if (parseFloat(amount) === 0) return "0";
    const roundedAmount = parseFloat(amount).toFixed(2);
    return roundedAmount.length > 5 ? roundedAmount.slice(0, 8) : roundedAmount;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!disputeTitle.trim()) {
      alert("Please enter a dispute title");
      return;
    }
    if (!disputeDescription.trim()) {
      alert("Please enter a dispute explanation");
      return;
    }
    if (!disputeAmount || parseFloat(disputeAmount) <= 0) {
      alert("Please enter a valid disputed amount");
      return;
    }
    if (!compensation || parseFloat(compensation) <= 0) {
      alert("Please enter a valid compensation amount");
      return;
    }

    if (window.ethereum) {
      try {
        setLoadingT(true);
        setTransactionStatus("Preparing transaction...");

        const web3 = new Web3(window.ethereum);
        await window.ethereum.request({ method: "eth_requestAccounts" });
        
        // Check if user is on OP Sepolia
        const chainId = await web3.eth.getChainId();
        const OP_SEPOLIA_CHAIN_ID = 11155420;
        
        if (Number(chainId) !== OP_SEPOLIA_CHAIN_ID) {
          alert(`Please switch to OP Sepolia network. Current chain ID: ${chainId}, Required: ${OP_SEPOLIA_CHAIN_ID}`);
          setLoadingT(false);
          setTransactionStatus("❌ Wrong network - please switch to OP Sepolia");
          return;
        }
        
        const accounts = await web3.eth.getAccounts();
        const fromAddress = accounts[0];

        // Step 1: Upload dispute evidence to IPFS
        setTransactionStatus("Uploading dispute evidence to IPFS...");
        const disputeHash = await uploadDisputeToIPFS();
        console.log("📦 Dispute IPFS hash:", disputeHash);

        // Step 2: Approve USDC
        setTransactionStatus("Approving USDC...");
        const usdcContract = new web3.eth.Contract(ERC20_ABI, USDC_ADDRESS);
        const compensationAmount = Math.floor(parseFloat(compensation) * 1000000); // Convert to 6 decimals
        
        await usdcContract.methods
          .approve(ATHENA_CLIENT_ADDRESS, compensationAmount)
          .send({ from: fromAddress });
        
        console.log("✅ USDC approved");

        // Step 3: Raise dispute
        setTransactionStatus("Raising dispute on blockchain...");
        const athenaContract = new web3.eth.Contract(athenaClientABI, ATHENA_CLIENT_ADDRESS);
        const disputedAmountUnits = Math.floor(parseFloat(disputeAmount) * 1000000);

        // Validate oracle selection
        if (!selectedOracle) {
          alert("Please select an oracle for dispute resolution");
          setLoadingT(false);
          return;
        }

        const receipt = await athenaContract.methods
          .raiseDispute(
            jobId,
            disputeHash,
            selectedOracle, // Use dynamically selected oracle
            compensationAmount,
            disputedAmountUnits,
            LZ_OPTIONS
          )
          .send({
            from: fromAddress,
            value: web3.utils.toWei("0.001", "ether"),
            gasPrice: await web3.eth.getGasPrice(),
          });

        console.log("✅ Dispute raised! Receipt:", receipt);
        setLoadingT(false);
        
        // Start polling for cross-chain sync
        await pollForDisputeSync(jobId);

      } catch (error) {
        console.error("Error submitting dispute:", error);
        setTransactionStatus(`❌ ${error.message || "Transaction failed"}`);
        setLoadingT(false);
      }
    } else {
      console.error("MetaMask not detected");
      alert("Please install MetaMask to raise a dispute");
      setLoadingT(false);
    }
  };

  if (loadingT) {
    return (
      <div className="loading-containerT">
        <div className="loading-icon"><img src="/OWIcon.svg" alt="Loading..."/></div>
        <div className="loading-message">
          <h1 id="txText">Processing Dispute</h1>
          <p id="txSubtext">Your dispute is being submitted to the blockchain...</p>
        </div>
      </div>
    );
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
            Fetching job information from the blockchain. Please wait...
          </p>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="loading-containerT">
        <div className="loading-message">
          <h1 id="txText">Job Not Found</h1>
          <p id="txSubtext">
            The requested job could not be found.
          </p>
          <Link to="/browse-jobs" style={{ marginTop: "20px", color: "#007bff" }}>
            Back to Browse Jobs
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="newTitle">
        <div className="titleTop">
          <Link className="goBack" to={`/job-details/${jobId}`}>
            <img className="goBackImage" src="/back.svg" alt="Back Button" />
          </Link>  
          <div className="titleText">{job.title}</div>
          <Link className="goBack" to={`/job-details/${jobId}`} style={{visibility:'hidden'}}>
            <img className="goBackImage" src="/back.svg" alt="Back Button" />
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
      <div className="form-containerDC" style={{marginTop: '48px'}}>
        <div className="sectionTitle raiseTitle">
          <span id="rel-title">Raise Dispute</span>
        </div>
        <div className="form-body raiseBody">
          <span id="pDC2">
            If you need to receive some or all of the locked amount in your address due to a dispute, please raise it here. Incentivise the oracle with a fee you pay them to give a fair judgement.
          </span>
          <form onSubmit={handleSubmit}>
            <div className="form-groupDC">
              <input
                type="text"
                placeholder="Dispute Title"
                value={disputeTitle}
                onChange={(e) => setDisputeTitle(e.target.value)}
                required
              />
            </div>
            <div className="form-groupDC">
              <textarea
                placeholder="Dispute Explanation"
                value={disputeDescription}
                onChange={(e) => setDisputeDescription(e.target.value)}
                required
              ></textarea>
            </div>
            <div className="form-groupDC amountDC">
              <input
                id="amountInput"
                type="number"
                step="0.01"
                placeholder="Amount"
                value={disputeAmount}
                onChange={(e) => setDisputeAmount(e.target.value)}
                required
              />
            </div>
            <div className="form-groupDC ">
              <input
                type="text"
                placeholder="Enter Wallet ID of the disputed fund receiver"
                value={receiverWallet}
                onChange={(e) => setReceiverWallet(e.target.value)}
              />
              <div className="dispute-description">
                <img src="/dispute-description.svg" alt="" />
                <span>When the dispute is resolved, the above entered wallet would receive the funds</span>
              </div>
            </div>
            <div className="form-groupDC">
              <ImageUpload onFileSelected={setSelectedFile} selectedFile={selectedFile} />
            </div>
            <div className="form-groupDC form-platformFee">
              <div className="platform-fee">
                <span>SELECT ORACLE FOR DISPUTE RESOLUTION</span>
                <img src="/fee.svg" alt="" />
              </div>
              <div className="oracle-dropdown-container">
                <div 
                  className="oracle-dropdown-button"
                  onClick={() => setIsOracleDropdownOpen(!isOracleDropdownOpen)}
                >
                  <span>
                    {oraclesLoading ? "Loading oracles..." : selectedOracle || "Select an oracle"}
                  </span>
                  <img 
                    src="/chevron-down.svg" 
                    alt="Dropdown" 
                    className={`oracle-dropdown-icon ${isOracleDropdownOpen ? 'open' : ''}`}
                  />
                </div>
                {isOracleDropdownOpen && oracles.length > 0 && (
                  <div className="oracle-dropdown-menu">
                    {oracles.map((oracle, index) => (
                      <div
                        key={index}
                        className={`oracle-dropdown-item ${!oracle.isActive ? 'inactive' : ''}`}
                        onClick={() => {
                          if (oracle.isActive) {
                            setSelectedOracle(oracle.name);
                            setIsOracleDropdownOpen(false);
                          }
                        }}
                        style={{
                          opacity: oracle.isActive ? 1 : 0.4,
                          cursor: oracle.isActive ? 'pointer' : 'not-allowed'
                        }}
                      >
                        <span>{oracle.name}</span>
                        {oracle.isActive && (
                          <span style={{ fontSize: '12px', color: '#767676' }}>
                            {oracle.activeMemberCount} active members
                          </span>
                        )}
                        {!oracle.isActive && (
                          <span style={{ fontSize: '12px', color: '#999' }}>(Inactive)</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="form-groupDC compensation">
              <span>COMPENSATION FOR RESOLUTION</span>
              <div className="amountDC">
                <input
                  id="amountInput"
                  type="number"
                  step="0.01"
                  placeholder="Amount"
                  value={compensation}
                  onChange={(e) => setCompensation(e.target.value)}
                  required
                />
              </div>
              <div className="dispute-description">
                <img src="/dispute-description.svg" alt="" />
                <span>This is the compensation that you're willing to pay to members of the Skill Oracle for their efforts in helping you resolve this dispute</span>
              </div>
            </div>
            <BlueButton 
              label="Raise Dispute" 
              style={{width: '100%', justifyContent: 'center'}}
              onClick={handleSubmit}
            />
            <div className="warning-form" style={{ marginTop: '16px' }}>
              <Warning content={transactionStatus} />
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
