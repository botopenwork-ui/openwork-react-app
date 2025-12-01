import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Web3 from "web3";
import BackButton from "../../components/BackButton/BackButton";
import Warning from "../../components/Warning/Warning";
import { 
    createMainDAOProposal, 
    checkMainDAOEligibility,
    estimateMainDAOFee 
} from "../../services/proposalCreationService";
import "./TreasuryProposal.css";

export default function TreasuryProposal() {
    const navigate = useNavigate();
    const [selectedWallet, setSelectedWallet] = useState("Treasury Wallet 1");
    const [amount, setAmount] = useState("");
    const [receiverWallet, setReceiverWallet] = useState("");
    const [description, setDescription] = useState("");
    const [file, setFile] = useState(null);
    const [isWalletDropdownOpen, setIsWalletDropdownOpen] = useState(false);
    
    // Wallet and eligibility states
    const [userAddress, setUserAddress] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [eligibility, setEligibility] = useState(null);
    const [estimatedFee, setEstimatedFee] = useState(null);
    
    // Transaction states
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [transactionStatus, setTransactionStatus] = useState(null);
    const [error, setError] = useState(null);

    const wallets = [
        "Treasury Wallet 1",
        "Treasury Wallet 2",
        "Treasury Wallet 3"
    ];

    // Connect wallet and check eligibility on mount
    useEffect(() => {
        const connectWallet = async () => {
            if (window.ethereum) {
                try {
                    const accounts = await window.ethereum.request({ 
                        method: 'eth_requestAccounts' 
                    });
                    
                    if (accounts.length > 0) {
                        const address = accounts[0];
                        setUserAddress(address);
                        setIsConnected(true);
                        
                        // Check eligibility on Main DAO
                        const eligibilityData = await checkMainDAOEligibility(address);
                        setEligibility(eligibilityData);
                        
                        // Estimate LayerZero fee
                        const fee = await estimateMainDAOFee(address);
                        setEstimatedFee(fee);
                    }
                } catch (error) {
                    console.error("Error connecting wallet:", error);
                    setError("Failed to connect wallet");
                }
            }
        };
        
        connectWallet();
        
        // Listen for account changes
        if (window.ethereum) {
            window.ethereum.on('accountsChanged', (accounts) => {
                if (accounts.length > 0) {
                    setUserAddress(accounts[0]);
                    connectWallet();
                } else {
                    setIsConnected(false);
                    setUserAddress(null);
                    setEligibility(null);
                }
            });
        }
    }, []);

    const handleFileUpload = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleSubmit = async () => {
        setError(null);
        setTransactionStatus(null);
        
        // Validation
        if (!isConnected || !userAddress) {
            setError("Please connect your wallet");
            return;
        }
        
        if (!eligibility?.canPropose) {
            setError("You need at least 100 OW tokens (staked or earned) to create a proposal");
            return;
        }
        
        if (!receiverWallet || !receiverWallet.startsWith('0x')) {
            setError("Please enter a valid receiver wallet address");
            return;
        }
        
        if (!amount || parseFloat(amount) <= 0) {
            setError("Please enter a valid amount");
            return;
        }
        
        if (!description || description.trim().length < 10) {
            setError("Please enter a description (at least 10 characters)");
            return;
        }
        
        try {
            setIsSubmitting(true);
            setTransactionStatus("Preparing transaction...");
            
            // Convert amount to wei (18 decimals for OW token)
            const web3 = new Web3();
            const amountInWei = web3.utils.toWei(amount, 'ether');
            
            setTransactionStatus("Awaiting wallet confirmation...");
            
            // Create proposal on Main DAO - this waits for blockchain confirmation
            const result = await createMainDAOProposal({
                recipientAddress: receiverWallet,
                amount: amountInWei,
                description: description,
                userAddress: userAddress
            });
            
            // Display success message and redirect
            if (result.success) {
                console.log("✅ Proposal creation result:", result);
                console.log("   Proposal ID:", result.proposalId);
                console.log("   Transaction Hash:", result.transactionHash);
                
                if (!result.proposalId) {
                    console.error("⚠️ Warning: Proposal ID not found in result");
                    setTransactionStatus("✅ Success! Proposal created but ID not found. Check DAO page.");
                    setError(null);
                } else {
                    setTransactionStatus("✅ Success! Proposal created successfully. Redirecting...");
                    setError(null);
                    
                    // Redirect to proposal view after 2 seconds
                    setTimeout(() => {
                        console.log("🔄 Redirecting to:", `/proposal-view/${result.proposalId}/Base`);
                        navigate(`/proposal-view/${result.proposalId}/Base`);
                    }, 2000);
                }
            } else {
                setError("Transaction completed but success status is false");
            }
        } catch (error) {
            console.error("Error creating proposal:", error);
            setError(error.message || "Failed to create proposal");
            setTransactionStatus(null);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="treasury-proposal-container">
            <div className="treasury-proposal-card">
                <div className="treasury-proposal-header">
                    <BackButton to="/new-proposal" title="Treasury Proposal" />
                </div>

                <div className="treasury-proposal-content">
                    <div className="form-section">
                        <div className="form-fields">
                            {/* Treasury Wallet Dropdown */}
                            <div className="dropdown-field">
                                <button 
                                    className="dropdown-button"
                                    onClick={() => setIsWalletDropdownOpen(!isWalletDropdownOpen)}
                                >
                                    <span>{selectedWallet}</span>
                                    <img 
                                        src="/chevron-down.svg" 
                                        alt="Dropdown" 
                                        className={`dropdown-icon ${isWalletDropdownOpen ? 'open' : ''}`}
                                    />
                                </button>
                                {isWalletDropdownOpen && (
                                    <div className="dropdown-menu">
                                        {wallets.map((wallet, index) => (
                                            <div 
                                                key={index}
                                                className="dropdown-item"
                                                onClick={() => {
                                                    setSelectedWallet(wallet);
                                                    setIsWalletDropdownOpen(false);
                                                }}
                                            >
                                                {wallet}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Wallet Balance Display */}
                            <div className="info-box">
                                <div className="info-content">
                                    <p className="info-label">WALLET BALANCE</p>
                                    <div className="info-value">
                                        <span className="balance-amount">100,000,000</span>
                                        <img src="/ow-token-icon.png" alt="OW Token" className="token-icon" />
                                    </div>
                                </div>
                            </div>

                            {/* Amount Input */}
                            <div className="input-field">
                                <input
                                    type="text"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="Enter amount"
                                    className="amount-input"
                                />
                                <img src="/ow-token-icon.png" alt="OW Token" className="token-icon-input" />
                            </div>

                            {/* Receiver Wallet Input */}
                            <div className="input-field">
                                <input
                                    type="text"
                                    value={receiverWallet}
                                    onChange={(e) => setReceiverWallet(e.target.value)}
                                    placeholder="Enter receiver wallet address (0x...)"
                                    className="amount-input"
                                />
                            </div>
                        </div>

                        {/* Job Details Section */}
                        <div className="job-details-section">
                            <p className="section-label">JOB DETAILS</p>
                            <div className="job-details-content">
                                <textarea
                                    className="description-textarea"
                                    placeholder="Enter proposal description..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={5}
                                />
                                
                                <label className="file-upload-box">
                                    <input 
                                        type="file" 
                                        onChange={handleFileUpload}
                                        style={{ display: 'none' }}
                                    />
                                    <div className="file-upload-content">
                                        <img src="/upload-icon.svg" alt="Upload" className="upload-icon" />
                                        <p className="upload-text">
                                            {file ? file.name : 'click here to upload a file if relevant'}
                                        </p>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button 
                        className="submit-button" 
                        onClick={handleSubmit}
                        disabled={isSubmitting || !isConnected || !eligibility?.canPropose}
                        style={{
                            opacity: (isSubmitting || !isConnected || !eligibility?.canPropose) ? 0.5 : 1,
                            cursor: (isSubmitting || !isConnected || !eligibility?.canPropose) ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {isSubmitting ? 'Creating Proposal...' : 'Submit Proposal'}
                    </button>
                    
                    {/* Status/Error Message using Warning component */}
                    <div className="warning-form">
                        <Warning content={error || transactionStatus || "Proposal creation requires blockchain transaction fees"} />
                    </div>
                </div>
            </div>
        </div>
    );
}
