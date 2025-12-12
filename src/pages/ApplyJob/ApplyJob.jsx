import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Web3 from "web3";
import "./ApplyJob.css";
import BlueButton from "../../components/BlueButton/BlueButton";
import Milestone from "../../components/Milestone/Milestone";
import RadioButton from "../../components/RadioButton/RadioButton";
import Warning from "../../components/Warning/Warning";
import contractABI from "../../ABIs/lowjc_ABI.json";

// LOWJC Contract on OP Sepolia
const CONTRACT_ADDRESS = import.meta.env.VITE_LOWJC_CONTRACT_ADDRESS || "0x896a3Bc6ED01f549Fe20bD1F25067951913b793C";
const OP_SEPOLIA_RPC = import.meta.env.VITE_OPTIMISM_SEPOLIA_RPC_URL;

// Backend URL for secure API calls
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

function ImageUpload() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [preview, setPreview] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setSelectedImage(file);
    setPreview(URL.createObjectURL(file)); // For preview display
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

export default function ApplyJob() {
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get('jobId');
  const [jobDescription, setJobDescription] = useState("");
  const [loadingT, setLoadingT] = useState("");
  const [selectedOption, setSelectedOption] = useState('Single Milestone');
  const [walletAddress, setWalletAddress] = useState("");
  const [milestone1Amount, setMilestone1Amount] = useState(1);
  const [milestone2Amount, setMilestone2Amount] = useState(1);
  const [milestone1Title, setMilestone1Title] = useState("Milestone 1");
  const [milestone2Title, setMilestone2Title] = useState("Milestone 2");
  const [milestone1Content, setMilestone1Content] = useState("Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.");
  const [milestone2Content, setMilestone2Content] = useState("Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.");

  // Check wallet connection on component mount
  useEffect(() => {
    const checkWalletConnection = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({
            method: "eth_accounts",
          });
          if (accounts.length > 0) {
            setWalletAddress(accounts[0]);
          }
        } catch (error) {
          console.error("Failed to check wallet connection:", error);
        }
      }
    };

    checkWalletConnection();
  }, []);

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        setWalletAddress(accounts[0]);
      } catch (error) {
        console.error("Failed to connect wallet:", error);
      }
    } else {
      alert("MetaMask is not installed. Please install it to use this app.");
    }
  };

  // Upload milestone data to IPFS (following PostJob pattern)
  const pinMilestoneToIPFS = async (milestone, index) => {
    try {
      const milestoneData = {
        title: milestone.title,
        content: milestone.content,
        amount: milestone.amount,
        type: "proposed_milestone",
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
              name: `proposed-milestone-${index}-${Date.now()}`,
              keyvalues: {
                milestoneTitle: milestone.title,
                milestoneIndex: index.toString(),
                type: "proposed_milestone",
                jobId: jobId,
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

  // Upload application details to IPFS
  const pinApplicationToIPFS = async (applicationDetails) => {
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/ipfs/upload-json`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            pinataContent: applicationDetails,
            pinataMetadata: {
              name: `job-application-${jobId}-${Date.now()}`,
              keyvalues: {
                jobId: jobId,
                applicant: walletAddress,
                type: "job_application",
              },
            },
          }),
        },
      );

      const data = await response.json();
      return data.IpfsHash;
    } catch (error) {
      console.error("Error pinning application to IPFS:", error);
      return null;
    }
  };

  const handleApplyToJob = async () => {
    if (!walletAddress) {
      alert("Please connect your wallet first");
      return;
    }

    if (!jobId) {
      alert("Job ID not found in URL");
      return;
    }

    if (!jobDescription.trim()) {
      alert("Please provide a description for your application");
      return;
    }

    try {
      setLoadingT(true);
      
      // Prepare milestone data
      const milestones = selectedOption === 'Single Milestone' 
        ? [{ title: milestone1Title, content: milestone1Content, amount: milestone1Amount }]
        : [
            { title: milestone1Title, content: milestone1Content, amount: milestone1Amount },
            { title: milestone2Title, content: milestone2Content, amount: milestone2Amount }
          ];

      // Upload each milestone to IPFS and get their hashes
      console.log("Uploading milestones to IPFS...");
      const milestoneHashes = [];
      for (let i = 0; i < milestones.length; i++) {
        const hash = await pinMilestoneToIPFS(milestones[i], i);
        if (!hash) {
          throw new Error(`Failed to upload milestone ${i + 1} to IPFS`);
        }
        milestoneHashes.push(hash);
      }

      // Upload application details to IPFS
      console.log("Uploading application details to IPFS...");
      const applicationDetails = {
        description: jobDescription,
        applicant: walletAddress,
        jobId: jobId,
        milestones: milestones,
        preferredChain: "OP Sepolia",
        timestamp: new Date().toISOString(),
      };

      const applicationHash = await pinApplicationToIPFS(applicationDetails);
      if (!applicationHash) {
        throw new Error("Failed to upload application details to IPFS");
      }

      const web3 = new Web3(window.ethereum);
      const contract = new web3.eth.Contract(contractABI, CONTRACT_ADDRESS);
      
      // Use IPFS hashes as descriptions
      const descriptions = milestoneHashes;
      
      // Convert to USDC units (6 decimals) - use plain numbers, not BigInt
      const amounts = milestones.map(m => Math.floor(m.amount * 1000000));
      
      // OP Sepolia chain domain
      const preferredChainDomain = 2;
      
      // LayerZero options (standard)
      const nativeOptions = "0x0003010011010000000000000000000000000007a120";
      
      // Get LayerZero fee quote from bridge
      console.log("📊 Getting LayerZero fee quote...");
      const bridgeAddress = await contract.methods.bridge().call();
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
      
      // Encode payload matching LOWJC's internal encoding
      // LOWJC sends: abi.encode("applyToJob", msg.sender, _jobId, _appHash, _descriptions, _amounts, _preferredChainDomain)
      const payload = web3.eth.abi.encodeParameters(
        ['string', 'address', 'string', 'string', 'string[]', 'uint256[]', 'uint32'],
        ['applyToJob', walletAddress, jobId, applicationHash, descriptions, amounts, preferredChainDomain]
      );
      
      // Get quote from bridge
      const quotedFee = await bridgeContract.methods.quoteNativeChain(payload, nativeOptions).call();
      console.log("💰 LayerZero quoted fee:", quotedFee.toString(), "wei");
      console.log("💰 LayerZero quoted fee:", web3.utils.fromWei(quotedFee, 'ether'), "ETH");
      
      // Detailed logging for debugging
      console.log("============ APPLY JOB DEBUG INFO ============");
      console.log("1. jobId:", jobId, "| Type:", typeof jobId);
      console.log("2. applicationHash:", applicationHash, "| Type:", typeof applicationHash);
      console.log("3. descriptions:", descriptions);
      console.log("   - Length:", descriptions.length);
      console.log("   - Types:", descriptions.map(d => typeof d));
      console.log("4. amounts:", amounts);
      console.log("   - Length:", amounts.length);
      console.log("   - Types:", amounts.map(a => typeof a));
      console.log("   - Values:", amounts.map(a => a.toString()));
      console.log("5. preferredChainDomain:", preferredChainDomain, "| Type:", typeof preferredChainDomain);
      console.log("6. nativeOptions:", nativeOptions, "| Type:", typeof nativeOptions);
      console.log("7. Using quoted fee:", quotedFee.toString(), "wei");
      console.log("8. From address:", walletAddress);
      console.log("==============================================");
      
      // Call the contract with quoted fee
      const tx = await contract.methods.applyToJob(
        jobId,
        applicationHash,
        descriptions,
        amounts,
        preferredChainDomain,
        nativeOptions
      ).send({
        from: walletAddress,
        value: quotedFee // Use the exact LayerZero quoted fee
      });
      
      console.log("Application submitted successfully:", tx.transactionHash);
      
      // Redirect to job details or success page
      setTimeout(() => {
        window.location.href = `/job-deep-view/${jobId}`;
      }, 2000);
      
    } catch (error) {
      console.error("Error applying to job:", error);
      alert(`Failed to submit application: ${error.message}`);
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
          <h1 id="txText">Submitting Application...</h1>
          <p id="txSubtext">
            Please wait while we process your job application on the blockchain.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
        <div className="newTitle">
            <div className="titleTop">
            <Link className="goBack" to={`/job-deep-view/${jobId || ''}`}><img className="goBackImage" src="/back.svg" alt="Back Button" /></Link>  
            <div className="titleText">Apply to Job {jobId || ''}</div>
            <Link className="goBack" to={`/job-deep-view/${jobId || ''}`} style={{visibility:'hidden'}}><img className="goBackImage" src="/back.svg" alt="Back Button" /></Link>  
            </div>
       </div>
      <div className="form-containerDC" style={{marginTop:'60px'}}>
        <div className="sectionTitle raiseTitle">
            <span id="rel-title">Job Application</span>
        </div>
        <div className="form-body raiseBody">
          <div>
            <div className="form-groupDC warning-form">
              <Warning content={"Please make sure your OpenWork Profile is up to date!"} icon="/triangle_warning.svg"/>
            </div>
            <div className="form-groupDC form-platformFee">
              <div className="platform-fee">
                <span>total compensation</span>
                <img src="/fee.svg" alt="" />
              </div>
              <div className="compensation-amount">
                <span>{selectedOption === 'Single Milestone' ? milestone1Amount : milestone1Amount + milestone2Amount}</span>
                <img src="/xdc.svg" alt="USDC" className="usdc-iconJD" />
              </div>
            </div>
            
            {/* Wallet Connection */}
            {!walletAddress ? (
              <div className="form-groupDC">
                <BlueButton
                  label="Connect Wallet"
                  onClick={connectWallet}
                  style={{ width: "100%", justifyContent: "center", marginBottom: "16px" }}
                />
              </div>
            ) : (
              <div className="form-groupDC" style={{ marginBottom: "16px", padding: "12px", border: "1px solid #e0e0e0", borderRadius: "8px" }}>
                <span style={{ fontSize: "14px", color: "#666" }}>Connected: {walletAddress.substring(0, 6)}...{walletAddress.substring(38)}</span>
              </div>
            )}
            <div className="form-groupDC">
              
              <textarea
                placeholder="Here’s the reason(s) explaining why I deserve to be hired for this particular job"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
              ></textarea>
            </div>
            <div className="form-groupDC">
              <ImageUpload />
            </div>
            <div className="lineDC form-groupDC" style={{margin:'32px 0px'}}></div>
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
                    <Milestone 
                      amount={milestone1Amount} 
                      title={milestone1Title} 
                      content={milestone1Content} 
                      editable={true}
                      onAmountChange={setMilestone1Amount}
                      onTitleChange={setMilestone1Title}
                      onContentChange={setMilestone1Content}
                    />
                    {selectedOption == 'Multiple Milestones' && (
                      <Milestone 
                        amount={milestone2Amount} 
                        title={milestone2Title} 
                        content={milestone2Content} 
                        editable={true}
                        onAmountChange={setMilestone2Amount}
                        onTitleChange={setMilestone2Title}
                        onContentChange={setMilestone2Content}
                      />
                    )}
                </div>
            </div>
            <div className="warning-form">
              <Warning content={"If the Job Giver accepts your application, Milestone 1 amount will be locked"} icon="/triangle_warning.svg"/>
            </div>
            <BlueButton 
              label="Submit Application" 
              onClick={handleApplyToJob}
              style={{width: '100%', justifyContent: 'center', marginTop:'20px', marginBottom:'13px', padding:'10px 14px'}}
            />
          </div>
        </div>
      </div>
    </>
  );
}
