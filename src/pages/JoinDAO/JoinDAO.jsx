import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import Web3 from "web3";
import BackButton from "../../components/BackButton/BackButton";
import Warning from "../../components/Warning/Warning";
import "./JoinDAO.css";
import {
    getTokenBalance,
    checkAllowance,
    approveTokens,
    quoteLZFees,
    executeStake,
    getUserStakeInfo,
    validateStake
} from "../../services/stakeService";

export default function JoinDAO() {
    const navigate = useNavigate();
    const [walletAddress, setWalletAddress] = useState("");
    const [stakeAmount, setStakeAmount] = useState("100");
    const [duration, setDuration] = useState(1);
    const [userBalance, setUserBalance] = useState("0");
    const [isProcessing, setIsProcessing] = useState(false);
    const [transactionStatus, setTransactionStatus] = useState("Joining DAO requires 2 blockchain transactions");
    const [alreadyStaked, setAlreadyStaked] = useState(false);
    const [wrongNetwork, setWrongNetwork] = useState(false);

    // Check wallet connection and network
    useEffect(() => {
        const checkWallet = async () => {
            if (window.ethereum) {
                try {
                    const accounts = await window.ethereum.request({
                        method: "eth_accounts",
                    });
                    if (accounts.length > 0) {
                        setWalletAddress(accounts[0]);
                        
                        // Check network
                        const web3 = new Web3(window.ethereum);
                        const chainId = await web3.eth.getChainId();
                        const BASE_SEPOLIA_CHAIN_ID = 84532;
                        
                        if (Number(chainId) !== BASE_SEPOLIA_CHAIN_ID) {
                            setWrongNetwork(true);
                            setTransactionStatus(`❌ Wrong network! Please switch to Base Sepolia. Current: ${chainId}, Required: ${BASE_SEPOLIA_CHAIN_ID}`);
                            return;
                        }
                        
                        setWrongNetwork(false);
                        
                        // Fetch balance
                        const balance = await getTokenBalance(accounts[0]);
                        setUserBalance(balance);
                        
                        // Check if user already staked
                        const stakeInfo = await getUserStakeInfo(accounts[0]);
                        if (stakeInfo.hasStake) {
                            setAlreadyStaked(true);
                            setTransactionStatus("You are already a DAO member!");
                        }
                    }
                } catch (error) {
                    console.error("Failed to check wallet:", error);
                }
            }
        };
        
        checkWallet();
    }, []);

    // Format balance for display
    const displayBalance = () => {
        try {
            const balanceInTokens = Web3.utils.fromWei(userBalance, 'ether');
            return parseFloat(balanceInTokens).toFixed(2);
        } catch {
            return "0.00";
        }
    };

    // Handle Join DAO (2-step transaction)
    const handleJoinDAO = async () => {
        if (!walletAddress) {
            alert("Please connect your wallet first");
            return;
        }

        // Check network BEFORE starting
        const web3 = new Web3(window.ethereum);
        const chainId = await web3.eth.getChainId();
        const BASE_SEPOLIA_CHAIN_ID = 84532;
        
        if (Number(chainId) !== BASE_SEPOLIA_CHAIN_ID) {
            alert(`Wrong network! Please switch to Base Sepolia.\n\nCurrent Chain ID: ${chainId}\nRequired: ${BASE_SEPOLIA_CHAIN_ID}`);
            setTransactionStatus(`❌ Please switch to Base Sepolia network (Chain ID: ${BASE_SEPOLIA_CHAIN_ID})`);
            return;
        }

        if (alreadyStaked) {
            alert("You are already a DAO member!");
            return;
        }

        // Validate inputs
        const amountInWei = Web3.utils.toWei(stakeAmount, 'ether');
        const validation = validateStake(amountInWei, duration, userBalance);
        
        if (!validation.isValid) {
            alert(validation.errors.join('\n'));
            return;
        }

        try {
            setIsProcessing(true);

            // Check if already approved
            const hasAllowance = await checkAllowance(walletAddress, amountInWei);
            
            if (!hasAllowance) {
                // STEP 1: Token Approval
                setTransactionStatus("⏳ Step 1/2: Requesting token approval...");
                
                await approveTokens(
                    amountInWei,
                    (hash) => {
                        setTransactionStatus(`⏳ Approval transaction sent: ${hash.substring(0, 10)}...`);
                    },
                    (receipt) => {
                        setTransactionStatus("✅ Token approval confirmed!");
                    }
                );
            } else {
                setTransactionStatus("✅ Tokens already approved, proceeding to stake...");
            }

            // Wait a moment before next step
            await new Promise(resolve => setTimeout(resolve, 1000));

            // STEP 2: Quote LayerZero fees
            setTransactionStatus("⏳ Step 2/2: Calculating LayerZero fees...");
            const lzFee = await quoteLZFees(walletAddress);
            const feeInEth = Web3.utils.fromWei(lzFee, 'ether');
            console.log("LayerZero fee:", feeInEth, "ETH");

            // STEP 3: Execute Stake
            setTransactionStatus(`⏳ Step 2/2: Staking ${stakeAmount} OW tokens (Fee: ${parseFloat(feeInEth).toFixed(4)} ETH)...`);
            
            try {
                await executeStake(
                    amountInWei,
                    duration,
                    lzFee,
                    (hash) => {
                        setTransactionStatus(`⏳ Stake transaction sent: ${hash.substring(0, 10)}...`);
                    },
                    (receipt) => {
                        setTransactionStatus("✅ Stake confirmed!");
                    }
                );

                // STEP 4: Wait for cross-chain sync (only if stake succeeded)
                setTransactionStatus("⏳ Syncing stake data to Arbitrum (15-20 seconds)...");
                await new Promise(resolve => setTimeout(resolve, 15000));

                // Success!
                setTransactionStatus("🎉 Successfully joined the DAO! Redirecting...");
                setTimeout(() => {
                    navigate("/dao");
                }, 2000);
                
            } catch (stakeError) {
                // Stake transaction failed - stop here, don't sync or redirect
                console.error("Stake transaction error:", stakeError);
                setTransactionStatus(`❌ Stake failed: ${stakeError.message || "Transaction rejected or reverted"}`);
                setIsProcessing(false);
                return; // Exit early, don't continue to sync/redirect
            }

        } catch (error) {
            // Outer catch for approval or other errors
            console.error("Error in join DAO flow:", error);
            setTransactionStatus(`❌ Failed: ${error.message}`);
            setIsProcessing(false);
        }
    };

    return (
        <div className="join-dao-container">
            <div className="join-dao-card">
                <div className="join-dao-header">
                    <BackButton to="/dao" title="Join the DAO" />
                </div>

                <div className="join-dao-content">
                    <div className="dao-content-wrapper">
                        <div className="dao-icon-wrapper">
                            <img src="/dao.svg" alt="DAO Icon" className="dao-icon" />
                        </div>

                        <div className="dao-info-section">
                            <p className="dao-description">
                                OpenWork token holders govern the OpenWork DAO, which in turn governs the smart contracts, treasury and Athena's Skill Oracles. Read the OpenWork Paper to understand how it all works
                            </p>

                            <Link to="/about" className="dao-paper-link">
                                <span>Read the OpenWork Paper</span>
                                <img src="/arrowRight.svg" alt="Arrow" className="arrow-icon" />
                            </Link>
                        </div>
                    </div>

                    <div className="dao-staking-section">
                        {/* Grey boxes - Read-only information */}
                        <div className="staking-box">
                            <div className="staking-box-row">
                                <span className="staking-label">MINIMUM STAKING AMOUNT</span>
                                <div className="staking-value">
                                    <span className="value-text">100</span>
                                    <img src="/OWToken.svg" alt="OW Token" className="token-icon" />
                                </div>
                            </div>
                            <div className="staking-box-row" style={{ marginTop: '16px' }}>
                                <span className="staking-label">STAKED AMOUNT</span>
                                <div className="staking-value">
                                    <span className="value-text">
                                        {alreadyStaked ? displayBalance() : "0"}
                                    </span>
                                    <img src="/OWToken.svg" alt="OW Token" className="token-icon" />
                                </div>
                            </div>
                        </div>

                        {/* Editable input box - Amount to stake */}
                        <div className="balance-box">
                            <input
                                type="number"
                                min="100"
                                step="1"
                                value={stakeAmount}
                                onChange={(e) => setStakeAmount(e.target.value)}
                                disabled={isProcessing}
                                placeholder="0.00"
                                className="balance-input"
                            />
                            <img src="/OWToken.svg" alt="OW Token" className="token-icon" />
                        </div>

                        {/* Duration dropdown */}
                        <select
                            value={duration}
                            onChange={(e) => setDuration(Number(e.target.value))}
                            disabled={isProcessing}
                            className="duration-select"
                        >
                            <option value={1}>1 Minute</option>
                            <option value={2}>2 Minutes</option>
                            <option value={3}>3 Minutes</option>
                        </select>

                        <button 
                            className="join-dao-button"
                            onClick={handleJoinDAO}
                            disabled={isProcessing || alreadyStaked || !walletAddress || wrongNetwork}
                            style={{
                                opacity: (isProcessing || alreadyStaked || !walletAddress || wrongNetwork) ? 0.6 : 1,
                                cursor: (isProcessing || alreadyStaked || !walletAddress || wrongNetwork) ? 'not-allowed' : 'pointer'
                            }}
                        >
                            <span>
                                {wrongNetwork ? "Wrong Network" : (alreadyStaked ? "Already DAO Member" : (isProcessing ? "Processing..." : "Join DAO"))}
                            </span>
                        </button>

                        <div className="warning-form">
                            <Warning content={transactionStatus} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
