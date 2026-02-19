import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Web3 from "web3";
import "./ApplyJob.css";
import BlueButton from "../../components/BlueButton/BlueButton";
import Milestone from "../../components/Milestone/Milestone";
import RadioButton from "../../components/RadioButton/RadioButton";
import Warning from "../../components/Warning/Warning";
import FileUpload from "../../components/FileUpload/FileUpload";
import { useChainDetection, useWalletAddress } from "../../hooks/useChainDetection";
import { getLOWJCContract } from "../../services/localChainService";
import { buildLzOptions, DESTINATION_GAS_ESTIMATES, getNativeChain, isMainnet } from "../../config/chainConfig";
import GenesisABI from "../../ABIs/genesis_ABI.json";
import CrossChainStatus, { buildLZSteps } from "../../components/CrossChainStatus/CrossChainStatus";
import { monitorLZMessage, STATUS } from "../../utils/crossChainMonitor";

// Backend URL for secure API calls
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

// Dynamic network mode functions for cross-chain polling
function getGenesisAddress() {
  const nativeChain = getNativeChain();
  return nativeChain?.contracts?.genesis;
}

function getArbitrumRpc() {
  return isMainnet()
    ? import.meta.env.VITE_ARBITRUM_MAINNET_RPC_URL
    : import.meta.env.VITE_ARBITRUM_SEPOLIA_RPC_URL;
}

export default function ApplyJob() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const jobId = searchParams.get('jobId');
  const [jobDescription, setJobDescription] = useState("");
  const [loadingT, setLoadingT] = useState("");
  const [transactionStatus, setTransactionStatus] = useState("");
  const [crossChainSteps, setCrossChainSteps] = useState(null);
  const [selectedOption, setSelectedOption] = useState('Single Milestone');

  // Multi-chain hooks
  const { chainId, chainConfig, isAllowed, error: chainError } = useChainDetection();
  const { address: walletAddress, connect: connectWallet } = useWalletAddress();
  const [milestone1Amount, setMilestone1Amount] = useState(1);
  const [milestone2Amount, setMilestone2Amount] = useState(1);
  const [milestone1Title, setMilestone1Title] = useState("Milestone 1");
  const [milestone2Title, setMilestone2Title] = useState("Milestone 2");
  const [milestone1Content, setMilestone1Content] = useState("Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.");
  const [milestone2Content, setMilestone2Content] = useState("Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.");
  const [uploadedFiles, setUploadedFiles] = useState([]);

  // Function to get application count on Arbitrum (Genesis contract)
  const getApplicationCountOnArbitrum = async (jobId) => {
    try {
      const genesisAddress = getGenesisAddress();
      const arbitrumRpc = getArbitrumRpc();
      const networkMode = isMainnet() ? "mainnet" : "testnet";

      console.log("🔍 Checking application count for job:", jobId);
      console.log("📍 Genesis contract:", genesisAddress);
      console.log("🌐 Using RPC:", arbitrumRpc, `(${networkMode})`);

      const arbitrumWeb3 = new Web3(arbitrumRpc);
      const genesisContract = new arbitrumWeb3.eth.Contract(GenesisABI, genesisAddress);

      const count = await genesisContract.methods.getJobApplicationCount(jobId).call();
      console.log("📊 Application count:", count);
      return Number(count);
    } catch (error) {
      console.log("❌ Error getting application count:", error.message);
      return 0;
    }
  };

  // Function to poll for application sync completion
  const pollForApplicationSync = async (jobId, expectedCount) => {
    console.log("🚀 Starting cross-chain sync polling for application on job:", jobId);
    console.log("📊 Expected application count:", expectedCount);
    setTransactionStatus(`Application submitted! Syncing to Arbitrum (15-30 seconds)...`);

    // Wait 15 seconds before starting to poll (LayerZero typically takes 10-20s)
    console.log("⏳ Waiting 15 seconds for LayerZero to propagate...");
    await new Promise(resolve => setTimeout(resolve, 15000));
    setTransactionStatus(`Checking if application has synced to Arbitrum...`);

    const maxAttempts = 12; // 12 attempts over 60 seconds (after initial 15s wait)
    const pollInterval = 5000; // 5 seconds

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`Polling attempt ${attempt}/${maxAttempts} for application sync`);

      const currentCount = await getApplicationCountOnArbitrum(jobId);

      if (currentCount >= expectedCount) {
        setTransactionStatus("✅ Application synced! Redirecting...");
        setLoadingT(false);
        setTimeout(() => navigate(`/job-deep-view/${jobId}`), 1500);
        return;
      }

      // Update status with estimated time remaining
      const timeRemaining = Math.max(0, 75 - (15 + (attempt * 5)));
      setTransactionStatus(`Syncing application across chains... (~${timeRemaining}s remaining)`);

      // Wait before next attempt
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }

    // If we get here, polling timed out
    setTransactionStatus("Application submitted but sync taking longer than expected. Check the job page in a few minutes.");
    setLoadingT(false);

    // Redirect to job page after a delay
    console.log("⏳ Sync timeout - redirecting to job page");
    setTimeout(() => {
      navigate(`/job-deep-view/${jobId}`);
    }, 3000);
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
    // Validation
    if (!walletAddress) {
      setTransactionStatus("Please connect your wallet first");
      return;
    }

    if (!jobId) {
      setTransactionStatus("Job ID not found in URL");
      return;
    }

    if (!jobDescription.trim()) {
      setTransactionStatus("Please provide a description for your application");
      return;
    }

    // Chain validation
    if (!isAllowed) {
      setTransactionStatus(chainConfig?.reason || "Transactions not allowed on this network. Please switch to OP Sepolia or Ethereum Sepolia.");
      return;
    }

    try {
      setLoadingT(true);
      setTransactionStatus(`Preparing application on ${chainConfig?.name}...`);
      
      // Prepare milestone data
      const milestones = selectedOption === 'Single Milestone' 
        ? [{ title: milestone1Title, content: milestone1Content, amount: milestone1Amount }]
        : [
            { title: milestone1Title, content: milestone1Content, amount: milestone1Amount },
            { title: milestone2Title, content: milestone2Content, amount: milestone2Amount }
          ];

      // Upload each milestone to IPFS and get their hashes
      setTransactionStatus("Uploading milestones to IPFS...");
      const milestoneHashes = [];
      for (let i = 0; i < milestones.length; i++) {
        const hash = await pinMilestoneToIPFS(milestones[i], i);
        if (!hash) {
          throw new Error(`Failed to upload milestone ${i + 1} to IPFS`);
        }
        milestoneHashes.push(hash);
      }

      // Upload application details to IPFS
      setTransactionStatus("Uploading application details to IPFS...");
      const applicationDetails = {
        description: jobDescription,
        applicant: walletAddress,
        jobId: jobId,
        milestones: milestones,
        attachments: uploadedFiles,
        preferredChain: chainConfig?.name,
        appliedFromChain: chainConfig?.name,
        appliedFromChainId: chainId,
        timestamp: new Date().toISOString(),
      };

      const applicationHash = await pinApplicationToIPFS(applicationDetails);
      if (!applicationHash) {
        throw new Error("Failed to upload application details to IPFS");
      }

      // Convert to USDC units (6 decimals)
      const amounts = milestones.map(m => Math.floor(m.amount * 1000000));
      
      // Prepare LayerZero options and fee dynamically
      setTransactionStatus("Getting LayerZero quote...");
      const web3 = new Web3(window.ethereum);
      const contract = await getLOWJCContract(chainId);

      // Build LZ options with appropriate destination gas for this operation
      const destGas = DESTINATION_GAS_ESTIMATES.APPLY_JOB;
      const lzOptions = buildLzOptions(destGas);
      console.log(`⛽ Destination gas (Arbitrum): ${destGas} for APPLY_JOB`);

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

      // Encode payload for accurate quote
      const payload = web3.eth.abi.encodeParameters(
        ['string', 'string', 'address', 'string', 'string[]', 'uint256[]', 'uint32'],
        ['applyToJob', jobId, walletAddress, applicationHash, milestoneHashes, amounts, chainConfig.cctpDomain]
      );

      // Get quote and add 20% buffer
      const quotedFee = await bridgeContract.methods.quoteNativeChain(payload, lzOptions).call();
      const lzFee = BigInt(quotedFee) * BigInt(120) / BigInt(100); // +20% buffer
      console.log(`💰 LayerZero quote: ${web3.utils.fromWei(quotedFee.toString(), 'ether')} ETH`);
      console.log(`💰 With 20% buffer: ${web3.utils.fromWei(lzFee.toString(), 'ether')} ETH`);

      // Get current application count before submitting (to detect when new one syncs)
      setTransactionStatus(`Checking current application count...`);
      const currentAppCount = await getApplicationCountOnArbitrum(jobId);
      const expectedAppCount = currentAppCount + 1;
      console.log(`📊 Current application count: ${currentAppCount}, expecting: ${expectedAppCount}`);

      // Submit application
      setTransactionStatus(`Submitting application on ${chainConfig?.name}...`);

      // Log all transaction parameters for debugging
      console.log('📋 ====== APPLY TO JOB TRANSACTION PARAMS ======');
      console.log('1️⃣ jobId:', jobId);
      console.log('2️⃣ applicationHash:', applicationHash);
      console.log('3️⃣ milestoneHashes:', milestoneHashes);
      console.log('4️⃣ amounts:', amounts, '→', amounts.map(a => `${a / 1000000} USDC`));
      console.log('5️⃣ preferredChainDomain:', chainConfig.cctpDomain);
      console.log('6️⃣ lzOptions:', lzOptions, `(${destGas} destination gas)`);
      console.log('7️⃣ lzFee:', lzFee.toString(), `(${web3.utils.fromWei(lzFee.toString(), 'ether')} ETH)`);
      console.log('📋 =============================================');

      // Get current gas price from network (Optimism L2 is extremely cheap)
      const gasPrice = await web3.eth.getGasPrice();
      console.log(`⛽ Network gas price: ${web3.utils.fromWei(gasPrice, 'gwei')} gwei`);

      const tx = await contract.methods.applyToJob(
        jobId,
        applicationHash,
        milestoneHashes,
        amounts,
        chainConfig.cctpDomain,
        lzOptions
      ).send({
        from: walletAddress,
        value: lzFee.toString(),
        gas: 500000,
        maxPriorityFeePerGas: web3.utils.toWei('0.001', 'gwei'),
        maxFeePerGas: gasPrice
      });

      console.log("✅ Application submitted:", tx.transactionHash);
      setTransactionStatus(`✅ Application submitted on ${chainConfig?.name}. Tracking cross-chain sync...`);

      // ── Client-side LZ monitoring ─────────────────────────────────────────
      const srcTxHash = tx.transactionHash;
      const lzLink    = `https://layerzeroscan.com/tx/${srcTxHash}`;
      setCrossChainSteps(buildLZSteps({
        sourceTxHash: srcTxHash,
        sourceChainId: chainConfig?.chainId,
        lzStatus: 'active',
        lzLink,
      }));
      monitorLZMessage(srcTxHash, (update) => {
        setCrossChainSteps(buildLZSteps({
          sourceTxHash: srcTxHash,
          sourceChainId: chainConfig?.chainId,
          lzStatus: update.status === STATUS.SUCCESS ? 'delivered'
                  : update.status === STATUS.FAILED  ? 'failed' : 'active',
          lzLink:   update.lzLink || lzLink,
          dstTxHash: update.dstTxHash,
          dstChainId: 42161,
        }));
      });
      // ─────────────────────────────────────────────────────────────────────

      await pollForApplicationSync(jobId, expectedAppCount);
      
    } catch (error) {
      console.error("Error applying to job:", error);
      setTransactionStatus(`Failed to submit application: ${error.message}`);
      setLoadingT(false);
    }
  };

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
            {chainError && (
              <div className="form-groupDC warning-form">
                <Warning content={chainError} icon="/triangle_warning.svg"/>
              </div>
            )}
            {!isAllowed && chainConfig?.reason && (
              <div className="form-groupDC warning-form">
                <Warning content={chainConfig.reason} icon="/triangle_warning.svg"/>
              </div>
            )}
            {transactionStatus && (
              <div className="form-groupDC warning-form">
                <Warning content={transactionStatus} icon="/info.svg"/>
              </div>
            )}
            {crossChainSteps && (
              <CrossChainStatus
                title="Application cross-chain status"
                steps={crossChainSteps}
              />
            )}
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
            
            {/* Chain & Wallet Info */}
            {chainConfig && isAllowed && (
              <div className="form-groupDC warning-form">
                <Warning content={`Connected to ${chainConfig.name}`} icon="/info.svg"/>
              </div>
            )}
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
              <FileUpload
                onFilesUploaded={setUploadedFiles}
                uploadedFiles={uploadedFiles}
              />
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
                      onUpdate={(field, value) => {
                        if (field === 'amount') setMilestone1Amount(value);
                        if (field === 'title') setMilestone1Title(value);
                        if (field === 'content') setMilestone1Content(value);
                      }}
                    />
                    {selectedOption == 'Multiple Milestones' && (
                      <Milestone
                        amount={milestone2Amount}
                        title={milestone2Title}
                        content={milestone2Content}
                        editable={true}
                        onUpdate={(field, value) => {
                          if (field === 'amount') setMilestone2Amount(value);
                          if (field === 'title') setMilestone2Title(value);
                          if (field === 'content') setMilestone2Content(value);
                        }}
                      />
                    )}
                </div>
            </div>
            <div className="warning-form">
              <Warning content={"If the Job Giver accepts your application, Milestone 1 amount will be locked"} icon="/triangle_warning.svg"/>
            </div>
            <BlueButton
              label={loadingT ? "Submitting..." : "Submit Application"}
              onClick={handleApplyToJob}
              disabled={!walletAddress || !isAllowed || loadingT}
              style={{width: '100%', justifyContent: 'center', marginTop:'20px', marginBottom:'13px', padding:'10px 14px'}}
            />
          </div>
        </div>
      </div>
    </>
  );
}
