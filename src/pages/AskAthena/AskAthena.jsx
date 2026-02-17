import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Web3 from "web3";
import genesisABI from "../../ABIs/genesis_ABI.json";
import nativeAthenaABI from "../../ABIs/native-athena_ABI.json";
import "../SkillVerification/SkillVerification.css";
import { formatWalletAddress } from "../../functions/formatWalletAddress";
import BlueButton from "../../components/BlueButton/BlueButton";
import Warning from "../../components/Warning/Warning";
import { useChainDetection, useWalletAddress } from "../../hooks/useChainDetection";
import { getNativeChain } from "../../config/chainConfig";
import { getAthenaClientContract } from "../../services/localChainService";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

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
      <label htmlFor="ask-athena-upload">
        <div className="form-fileUpload">
          <img src="/upload.svg" alt="" />
          <span>{selectedFile ? selectedFile.name : "Click here to upload or drop files here"}</span>
        </div>
      </label>
      <input
        id="ask-athena-upload"
        type="file"
        accept="image/*,.pdf,.doc,.docx"
        onChange={handleImageChange}
        style={{ display: 'none' }}
      />
      {preview && (
        <div style={{ marginTop: '10px' }}>
          <img src={preview} alt="Preview" style={{ maxWidth: '200px', borderRadius: '8px' }} />
        </div>
      )}
    </div>
  );
}

export default function AskAthena() {
  const { address } = useParams();
  const navigate = useNavigate();

  const { chainId, chainConfig, isAllowed, error: chainError } = useChainDetection();
  const { address: walletAddress } = useWalletAddress();

  const isOwner = walletAddress && address &&
    walletAddress.toLowerCase() === address.toLowerCase();

  const [loading, setLoading] = useState(true);
  const [loadingT, setLoadingT] = useState(false);

  const [previousInquiries, setPreviousInquiries] = useState([]);
  const [oracles, setOracles] = useState([]);

  const [selectedOracle, setSelectedOracle] = useState("");
  const [isOracleDropdownOpen, setIsOracleDropdownOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [feeAmount, setFeeAmount] = useState("");
  const [transactionStatus, setTransactionStatus] = useState(
    "Ask Athena requires USDC approval and blockchain transaction fees"
  );

  const handleCopyToClipboard = (addr) => {
    navigator.clipboard.writeText(addr).then(() => {
      alert("Address copied to clipboard");
    }).catch((err) => {
      console.error("Failed to copy: ", err);
    });
  };

  // Fetch all blockchain data on mount
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        const nativeChain = getNativeChain();
        if (!nativeChain) {
          console.error("Native chain not configured");
          setLoading(false);
          return;
        }

        const web3 = new Web3(nativeChain.rpcUrl);
        const genesisContract = new web3.eth.Contract(genesisABI, nativeChain.contracts.genesis);
        const nativeAthenaContract = new web3.eth.Contract(nativeAthenaABI, nativeChain.contracts.nativeAthena);

        // Fetch all oracles and check active status
        const oracleNames = await genesisContract.methods.getAllOracleNames().call();

        const oracleDataPromises = oracleNames.map(async (name) => {
          try {
            const oracle = await genesisContract.methods.getOracle(name).call();
            const isActive = await nativeAthenaContract.methods.isOracleActive(name).call();
            const activeMemberCount = await nativeAthenaContract.methods.getOracleActiveMemberCount(name).call();

            return {
              name,
              isActive,
              activeMemberCount: parseInt(activeMemberCount),
              members: oracle.members,
              shortDescription: oracle.shortDescription,
            };
          } catch (e) {
            console.error(`Error fetching oracle ${name}:`, e);
            return { name, isActive: false, activeMemberCount: 0, members: [] };
          }
        });

        const oracleData = await Promise.all(oracleDataPromises);
        setOracles(oracleData);

        // Auto-select first active oracle
        const firstActive = oracleData.find((o) => o.isActive);
        if (firstActive) {
          setSelectedOracle(firstActive.name);
        }

        // Fetch previous AskAthena inquiries for this address
        try {
          const appCounter = await genesisContract.methods.askAthenaCounter().call();
          const counter = parseInt(appCounter);
          const inquiries = [];

          const scanStart = Math.max(0, counter - 50);
          for (let i = counter; i >= scanStart; i--) {
            try {
              const app = await genesisContract.methods.getAskAthenaApplication(i).call();
              if (app.applicant.toLowerCase() === address.toLowerCase()) {
                // fees is a STRING in AskAthena
                const feeVal = app.fees ? parseInt(app.fees) : 0;
                inquiries.push({
                  id: parseInt(app.id),
                  applicant: app.applicant,
                  description: app.description || "",
                  hash: app.hash || "",
                  feeAmount: feeVal,
                  targetOracle: app.targetOracle,
                  votesFor: parseInt(app.votesFor),
                  votesAgainst: parseInt(app.votesAgainst),
                  isVotingActive: app.isVotingActive,
                  timeStamp: parseInt(app.timeStamp),
                  result: app.result,
                  isFinalized: app.isFinalized,
                });
              }
            } catch (e) {
              // Application may not exist at this index
            }
          }

          setPreviousInquiries(inquiries);
        } catch (e) {
          console.error("Error fetching AskAthena applications:", e);
        }

        setLoading(false);
      } catch (error) {
        console.error("Error fetching Ask Athena data:", error);
        setLoading(false);
      }
    }

    if (address) {
      fetchData();
    }
  }, [address]);

  // Upload evidence to IPFS
  const uploadToIPFS = async () => {
    try {
      const inquiryData = {
        address: address,
        oracle: selectedOracle,
        description: description,
        timestamp: new Date().toISOString(),
        file: selectedFile
          ? { name: selectedFile.name, size: selectedFile.size, type: selectedFile.type }
          : null,
      };

      if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);

        const fileResponse = await fetch(`${BACKEND_URL}/api/ipfs/upload-file`, {
          method: "POST",
          body: formData,
        });

        if (fileResponse.ok) {
          const fileData = await fileResponse.json();
          inquiryData.fileIpfsHash = fileData.IpfsHash;
        }
      }

      const response = await fetch(`${BACKEND_URL}/api/ipfs/upload-json`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pinataContent: inquiryData,
          pinataMetadata: {
            name: `ask-athena-${address}-${Date.now()}`,
            keyvalues: {
              address: address,
              oracle: selectedOracle,
              type: "ask-athena",
            },
          },
        }),
      });

      const data = await response.json();
      return data.IpfsHash;
    } catch (error) {
      console.error("Error uploading to IPFS:", error);
      throw error;
    }
  };

  // Poll for AskAthena sync on Arbitrum
  const pollForSync = async (previousCounter) => {
    setTransactionStatus("Ask Athena submitted! Cross-chain sync will take 15-30 seconds...");

    await new Promise((resolve) => setTimeout(resolve, 10000));
    setTransactionStatus("Checking for cross-chain sync...");

    const nativeChain = getNativeChain();
    const web3 = new Web3(nativeChain.rpcUrl);
    const genesisContract = new web3.eth.Contract(genesisABI, nativeChain.contracts.genesis);

    const maxAttempts = 8;
    const pollInterval = 5000;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const currentCounter = parseInt(
          await genesisContract.methods.askAthenaCounter().call()
        );

        if (currentCounter > previousCounter) {
          const app = await genesisContract.methods.getAskAthenaApplication(currentCounter).call();
          if (app.applicant.toLowerCase() === address.toLowerCase()) {
            setTransactionStatus("Ask Athena inquiry synced to Arbitrum!");
            setTimeout(() => window.location.reload(), 1500);
            return;
          }
        }
      } catch (e) {
        console.log(`Polling attempt ${attempt}/${maxAttempts}:`, e.message);
      }

      const timeRemaining = Math.max(0, 45 - (10 + attempt * 5));
      setTransactionStatus(`Syncing across chains... (~${timeRemaining}s remaining)`);

      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
      }
    }

    setTransactionStatus(
      "Inquiry submitted but sync taking longer than expected. Check back in a few minutes."
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!walletAddress) {
      setTransactionStatus("Please connect your wallet first");
      return;
    }

    if (!isAllowed) {
      setTransactionStatus(
        chainConfig?.reason ||
          "Transactions not allowed on this network. Please switch to a supported local chain."
      );
      return;
    }

    if (!selectedOracle) {
      setTransactionStatus("Please select a target oracle");
      return;
    }

    if (!description.trim()) {
      setTransactionStatus("Please enter your question or inquiry");
      return;
    }

    if (!feeAmount || parseFloat(feeAmount) <= 0) {
      setTransactionStatus("Please enter a valid fee amount (USDC)");
      return;
    }

    try {
      setLoadingT(true);
      setTransactionStatus(`Validating requirements on ${chainConfig?.name}...`);

      const web3 = new Web3(window.ethereum);
      const feeInUnits = Math.floor(parseFloat(feeAmount) * 1000000);

      const usdcAddress = chainConfig.contracts.usdc;
      const athenaClientAddress = chainConfig.contracts.athenaClient;

      if (!usdcAddress || !athenaClientAddress) {
        throw new Error(`Contracts not configured for ${chainConfig.name}`);
      }

      const usdcContract = new web3.eth.Contract(ERC20_ABI, usdcAddress);

      // Check USDC balance
      setTransactionStatus("Checking USDC balance...");
      const userBalance = await usdcContract.methods.balanceOf(walletAddress).call();
      const balanceInUSDC = parseFloat(userBalance) / 1000000;

      if (parseFloat(userBalance) < feeInUnits) {
        throw new Error(
          `Insufficient USDC balance. Required: ${feeAmount} USDC, Available: ${balanceInUSDC.toFixed(2)} USDC`
        );
      }

      // Step 1: Check allowance & approve if needed
      setTransactionStatus("Checking USDC allowance...");
      const currentAllowance = await usdcContract.methods
        .allowance(walletAddress, athenaClientAddress)
        .call();

      if (BigInt(currentAllowance) < BigInt(feeInUnits)) {
        setTransactionStatus(
          `Step 1/3: Approving ${feeAmount} USDC spending - Please confirm in MetaMask`
        );

        const approveTx = await usdcContract.methods
          .approve(athenaClientAddress, feeInUnits.toString())
          .send({ from: walletAddress });

        if (!approveTx || !approveTx.transactionHash) {
          throw new Error("Approval transaction failed");
        }

        setTransactionStatus("Step 1/3: USDC approval confirmed");
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } else {
        setTransactionStatus("Step 1/3: USDC allowance already sufficient");
      }

      // Step 2: Upload evidence to IPFS
      setTransactionStatus("Step 2/3: Uploading evidence to IPFS...");
      const applicationHash = await uploadToIPFS();
      setTransactionStatus("Step 2/3: Evidence uploaded to IPFS");

      // Step 3: Submit on-chain
      setTransactionStatus(
        `Step 3/3: Submitting Ask Athena on ${chainConfig.name} - Please confirm in MetaMask`
      );

      // Get previous counter for sync polling
      const nativeChain = getNativeChain();
      const arbitrumWeb3 = new Web3(nativeChain.rpcUrl);
      const genesisContract = new arbitrumWeb3.eth.Contract(
        genesisABI,
        nativeChain.contracts.genesis
      );
      const previousCounter = parseInt(
        await genesisContract.methods.askAthenaCounter().call()
      );

      const athenaContract = await getAthenaClientContract(chainId);
      const lzOptions = chainConfig.layerzero.options;
      const gasPrice = await web3.eth.getGasPrice();

      // Quote actual LayerZero fee
      setTransactionStatus("Step 3/3: Getting LayerZero fee quote...");
      const payload = web3.eth.abi.encodeParameters(
        ['string', 'address', 'string', 'string', 'uint256', 'string'],
        ['askAthena', walletAddress, description, applicationHash, feeInUnits, selectedOracle]
      );
      let lzFee;
      try {
        const quotedFee = await athenaContract.methods
          .quoteSingleChain("askAthena", payload, lzOptions)
          .call();
        lzFee = (BigInt(quotedFee) * BigInt(120) / BigInt(100)).toString();
        console.log(`LayerZero quoted fee: ${web3.utils.fromWei(quotedFee, 'ether')} ETH (+20% buffer)`);
      } catch (quoteErr) {
        console.warn("Fee quote failed, using fallback:", quoteErr.message);
        lzFee = web3.utils.toWei("0.0005", "ether");
      }

      setTransactionStatus(
        `Step 3/3: Submitting Ask Athena on ${chainConfig.name} - Please confirm in MetaMask`
      );

      // askAthena(string description, string hash, string targetOracle, uint256 feeAmount, bytes nativeOptions)
      const receipt = await athenaContract.methods
        .askAthena(description, applicationHash, selectedOracle, feeInUnits, lzOptions)
        .send({
          from: walletAddress,
          value: lzFee,
          gas: 800000,
          maxPriorityFeePerGas: web3.utils.toWei("0.001", "gwei"),
          maxFeePerGas: gasPrice,
        });

      if (!receipt || !receipt.transactionHash) {
        throw new Error("Ask Athena transaction failed");
      }

      console.log(`Ask Athena submitted on ${chainConfig.name}!`, receipt.transactionHash);
      setTransactionStatus(
        `Step 3/3: Ask Athena submitted on ${chainConfig.name}! Syncing to Arbitrum...`
      );
      setLoadingT(false);

      await pollForSync(previousCounter);
    } catch (error) {
      console.error("Ask Athena error:", error);

      let errorMessage = error.message;
      if (error.code === 4001) {
        errorMessage = "Transaction cancelled by user";
      } else if (error.message?.includes("insufficient funds")) {
        errorMessage = "Insufficient ETH for gas fees";
      } else if (error.message?.includes("execution reverted")) {
        errorMessage = "Transaction failed - contract requirements not met";
      }

      setTransactionStatus(`Error: ${errorMessage}`);
      setLoadingT(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "Unknown";
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getApplicationStatus = (app) => {
    if (app.isFinalized) {
      return app.result ? "Approved" : "Rejected";
    }
    if (app.isVotingActive) {
      return "Voting Active";
    }
    return "Pending";
  };

  const getStatusClass = (app) => {
    if (app.isFinalized) {
      return app.result ? "status-approved" : "status-rejected";
    }
    return "status-pending";
  };

  if (loadingT) {
    return (
      <div className="loading-containerT">
        <div className="loading-icon">
          <img src="/OWIcon.svg" alt="Loading..." />
        </div>
        <div className="loading-message">
          <h1 id="txText">Processing Ask Athena</h1>
          <p id="txSubtext">
            Your inquiry is being submitted to the blockchain...
          </p>
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
          <h1 id="txText">Loading Ask Athena</h1>
          <p id="txSubtext">
            Fetching data from the blockchain. Please wait...
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="newTitle">
        <div className="titleTop">
          <div className="goBack" onClick={() => navigate(-1)}>
            <img className="goBackImage" src="/back.svg" alt="Back Button" />
          </div>
          <div className="titleText">Ask Athena</div>
          <div className="goBack" style={{ visibility: "hidden" }}>
            <img className="goBackImage" src="/back.svg" alt="Back Button" />
          </div>
        </div>
        <div className="titleBottom">
          <p>{formatWalletAddress(address)}</p>
          <img
            src="/copy.svg"
            className="copyImage"
            onClick={() => handleCopyToClipboard(address)}
          />
        </div>
      </div>

      <div className="sv-page-container">
        {/* Previous Inquiries */}
        {previousInquiries.length > 0 && (
          <div className="sv-card">
            <div className="sv-card-header">
              <span className="sv-card-title">Previous Inquiries</span>
              <span className="sv-card-count">{previousInquiries.length}</span>
            </div>
            <div className="sv-card-body">
              {previousInquiries.map((app) => (
                <div key={app.id} className="sv-application-item">
                  <div className="sv-application-top">
                    <div className="sv-application-info">
                      <span className="sv-application-oracle">{app.targetOracle}</span>
                      <span className="sv-application-id">#{app.id}</span>
                    </div>
                    <span className={`sv-application-status ${getStatusClass(app)}`}>
                      {getApplicationStatus(app)}
                    </span>
                  </div>
                  {app.description && (
                    <div style={{ padding: '8px 0', fontSize: '13px', color: '#555' }}>
                      {app.description.length > 100
                        ? app.description.substring(0, 100) + "..."
                        : app.description}
                    </div>
                  )}
                  <div className="sv-application-details">
                    <div className="sv-application-detail">
                      <span className="sv-detail-label">Fee</span>
                      <span className="sv-detail-value">
                        {(app.feeAmount / 1000000).toFixed(2)} USDC
                      </span>
                    </div>
                    <div className="sv-application-detail">
                      <span className="sv-detail-label">Votes For</span>
                      <span className="sv-detail-value">{app.votesFor}</span>
                    </div>
                    <div className="sv-application-detail">
                      <span className="sv-detail-label">Votes Against</span>
                      <span className="sv-detail-value">{app.votesAgainst}</span>
                    </div>
                    <div className="sv-application-detail">
                      <span className="sv-detail-label">Submitted</span>
                      <span className="sv-detail-value">{formatDate(app.timeStamp)}</span>
                    </div>
                  </div>
                  {app.isVotingActive && (
                    <div className="sv-application-voting-bar">
                      <div
                        className="sv-voting-bar-fill"
                        style={{
                          width:
                            app.votesFor + app.votesAgainst > 0
                              ? `${(app.votesFor / (app.votesFor + app.votesAgainst)) * 100}%`
                              : "50%",
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Submit New Inquiry (Owner Only) */}
        {isOwner && (
          <div className="sv-card">
            <div className="sv-card-header">
              <span className="sv-card-title">Ask Athena</span>
            </div>
            <div className="sv-card-body">
              <span className="sv-form-description">
                Submit a question or inquiry to an oracle. Oracle members will review your
                question and vote on it. The fee you set is the compensation paid to
                oracle members for their review.
              </span>
              <form onSubmit={handleSubmit}>
                {/* Oracle Selection */}
                <div className="sv-form-group">
                  <span className="sv-form-label">SELECT ORACLE</span>
                  <div className="oracle-dropdown-container">
                    <div
                      className="oracle-dropdown-button"
                      onClick={() => setIsOracleDropdownOpen(!isOracleDropdownOpen)}
                    >
                      <span>
                        {selectedOracle || "Select an oracle"}
                      </span>
                      <img
                        src="/chevron-down.svg"
                        alt="Dropdown"
                        className={`oracle-dropdown-icon ${isOracleDropdownOpen ? "open" : ""}`}
                      />
                    </div>
                    {isOracleDropdownOpen && oracles.length > 0 && (
                      <div className="oracle-dropdown-menu">
                        {oracles.map((oracle, index) => (
                          <div
                            key={index}
                            className={`oracle-dropdown-item ${!oracle.isActive ? "inactive" : ""}`}
                            onClick={() => {
                              if (oracle.isActive) {
                                setSelectedOracle(oracle.name);
                                setIsOracleDropdownOpen(false);
                              }
                            }}
                            style={{
                              opacity: oracle.isActive ? 1 : 0.4,
                              cursor: oracle.isActive ? "pointer" : "not-allowed",
                            }}
                          >
                            <span>{oracle.name}</span>
                            {oracle.isActive ? (
                              <span style={{ fontSize: "12px", color: "#767676" }}>
                                {oracle.activeMemberCount} active members
                              </span>
                            ) : (
                              <span style={{ fontSize: "12px", color: "#999" }}>(Inactive)</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Question / Description */}
                <div className="sv-form-group">
                  <span className="sv-form-label">YOUR QUESTION / INQUIRY</span>
                  <textarea
                    className="sv-textarea"
                    placeholder="Describe your question or inquiry for the oracle..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={5}
                    required
                  />
                </div>

                {/* File Upload */}
                <div className="sv-form-group">
                  <span className="sv-form-label">UPLOAD EVIDENCE (OPTIONAL)</span>
                  <ImageUpload onFileSelected={setSelectedFile} selectedFile={selectedFile} />
                </div>

                {/* Fee Amount */}
                <div className="sv-form-group">
                  <span className="sv-form-label">INQUIRY FEE (USDC)</span>
                  <div className="sv-amount-input">
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="Amount in USDC"
                      value={feeAmount}
                      onChange={(e) => setFeeAmount(e.target.value)}
                      required
                    />
                  </div>
                  <div className="sv-fee-description">
                    <img src="/dispute-description.svg" alt="" />
                    <span>
                      This is the compensation paid to oracle members for reviewing your
                      inquiry. Higher fees may incentivize faster reviews.
                    </span>
                  </div>
                </div>

                {/* Chain Warnings */}
                {chainError && (
                  <div className="warning-form">
                    <Warning content={chainError} icon="/triangle_warning.svg" />
                  </div>
                )}
                {!isAllowed && chainConfig?.reason && (
                  <div className="warning-form">
                    <Warning content={chainConfig.reason} icon="/triangle_warning.svg" />
                  </div>
                )}
                {chainConfig && isAllowed && (
                  <div className="warning-form">
                    <Warning content={`Connected to ${chainConfig.name}`} icon="/info.svg" />
                  </div>
                )}

                {/* Submit Button */}
                <BlueButton
                  label="Submit Inquiry"
                  disabled={!walletAddress || !isAllowed}
                  style={{ width: "100%", justifyContent: "center" }}
                  onClick={handleSubmit}
                />

                {/* Transaction Status */}
                <div className="warning-form" style={{ marginTop: "16px" }}>
                  <Warning content={transactionStatus} />
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Non-owner message */}
        {!isOwner && walletAddress && (
          <div className="sv-card">
            <div className="sv-card-body">
              <div className="sv-empty-state">
                <span>Connect the wallet that matches this address to submit an Ask Athena inquiry.</span>
              </div>
            </div>
          </div>
        )}

        {!walletAddress && (
          <div className="sv-card">
            <div className="sv-card-body">
              <div className="sv-empty-state">
                <span>Connect your wallet to submit an Ask Athena inquiry.</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
