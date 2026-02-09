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
    validateStake,
    getUnstakeInfo,
    quoteUnstakeFee,
    executeUnstake
} from "../../services/stakeService";
import { getMainChain, getNativeChain, toHexChainId } from "../../config/chainConfig";

const mainChain = getMainChain();
const nativeChain = getNativeChain();
const MAIN_CHAIN_ID = toHexChainId(mainChain.chainId);
const MAIN_RPC = mainChain.rpcUrl;

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

    // Unstake state
    const [stakeInfo, setStakeInfo] = useState(null);
    const [unstakeInfo, setUnstakeInfo] = useState({ requested: false, availableTime: 0 });
    const [unstakeFee, setUnstakeFee] = useState(null);

    // Switch to the main chain if on wrong network
    const switchToMainChain = async () => {
        const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
        if (currentChainId !== MAIN_CHAIN_ID) {
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: MAIN_CHAIN_ID }],
                });
            } catch (switchError) {
                if (switchError.code === 4902) {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [{
                            chainId: MAIN_CHAIN_ID,
                            chainName: mainChain.name,
                            nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                            rpcUrls: [MAIN_RPC],
                        }],
                    });
                } else {
                    throw switchError;
                }
            }
        }
    };

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

                        if (Number(chainId) !== mainChain.chainId) {
                            setWrongNetwork(true);
                            setTransactionStatus(`Wrong network. Please switch to ${mainChain.name}.`);
                            return;
                        }

                        setWrongNetwork(false);

                        // Fetch balance
                        const balance = await getTokenBalance(accounts[0]);
                        setUserBalance(balance);

                        // Check if user already staked
                        const info = await getUserStakeInfo(accounts[0]);
                        if (info.hasStake) {
                            setAlreadyStaked(true);
                            setStakeInfo(info);

                            // Fetch unstake status
                            const uInfo = await getUnstakeInfo(accounts[0]);
                            setUnstakeInfo(uInfo);

                            // Quote unstake fee
                            const fee = await quoteUnstakeFee(accounts[0]);
                            setUnstakeFee(fee);

                            // Determine status message
                            const now = Math.floor(Date.now() / 1000);
                            if (now < info.unlockTime) {
                                setTransactionStatus("Stake is still locked. You can unstake after the lock period expires.");
                            } else if (!uInfo.requested) {
                                setTransactionStatus("Stake is unlocked. You can request to unstake your tokens.");
                            } else if (now < uInfo.availableTime) {
                                setTransactionStatus("Unstake requested. You can complete the unstake after the 24-hour delay.");
                            } else {
                                setTransactionStatus("Unstake delay complete. You can now withdraw your tokens.");
                            }
                        }
                    }
                } catch (error) {
                    console.error("Failed to check wallet:", error);
                }
            }
        };

        checkWallet();

        // Re-check on chain/account changes
        if (window.ethereum) {
            window.ethereum.on('chainChanged', () => window.location.reload());
            window.ethereum.on('accountsChanged', (accounts) => {
                setWalletAddress(accounts.length > 0 ? accounts[0] : "");
            });
        }
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

    // Format staked amount
    const displayStakedAmount = () => {
        if (!stakeInfo) return "0";
        try {
            return parseFloat(Web3.utils.fromWei(stakeInfo.amount, 'ether')).toFixed(0);
        } catch {
            return "0";
        }
    };

    // Format timestamp to readable date
    const formatTime = (timestamp) => {
        if (!timestamp) return "—";
        return new Date(timestamp * 1000).toLocaleString();
    };

    // Get unstake state: 'locked' | 'can_request' | 'waiting' | 'can_complete'
    const getUnstakeState = () => {
        if (!stakeInfo) return 'locked';
        const now = Math.floor(Date.now() / 1000);
        if (now < stakeInfo.unlockTime) return 'locked';
        if (!unstakeInfo.requested) return 'can_request';
        if (now < unstakeInfo.availableTime) return 'waiting';
        return 'can_complete';
    };

    // Handle Join DAO (2-step transaction)
    const handleJoinDAO = async () => {
        if (!walletAddress) {
            alert("Please connect your wallet first");
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

            // Switch to main chain if needed
            setTransactionStatus(`Switching to ${mainChain.name}...`);
            await switchToMainChain();

            // Check if already approved
            const hasAllowance = await checkAllowance(walletAddress, amountInWei);

            if (!hasAllowance) {
                // STEP 1: Token Approval
                setTransactionStatus("Step 1/2: Requesting token approval...");

                await approveTokens(
                    amountInWei,
                    (hash) => {
                        setTransactionStatus(`Approval transaction sent: ${hash.substring(0, 10)}...`);
                    },
                    (receipt) => {
                        setTransactionStatus("Token approval confirmed!");
                    }
                );
            } else {
                setTransactionStatus("Tokens already approved, proceeding to stake...");
            }

            // Wait a moment before next step
            await new Promise(resolve => setTimeout(resolve, 1000));

            // STEP 2: Quote LayerZero fees
            setTransactionStatus("Step 2/2: Calculating LayerZero fees...");
            const lzFee = await quoteLZFees(walletAddress);
            const feeInEth = Web3.utils.fromWei(lzFee, 'ether');
            console.log("LayerZero fee:", feeInEth, "ETH");

            // STEP 3: Execute Stake
            setTransactionStatus(`Step 2/2: Staking ${stakeAmount} OW tokens (Fee: ${parseFloat(feeInEth).toFixed(4)} ETH)...`);

            try {
                await executeStake(
                    amountInWei,
                    duration,
                    lzFee,
                    (hash) => {
                        setTransactionStatus(`Stake transaction sent: ${hash.substring(0, 10)}...`);
                    },
                    (receipt) => {
                        setTransactionStatus("Stake confirmed!");
                    }
                );

                // STEP 4: Wait for cross-chain sync (only if stake succeeded)
                setTransactionStatus(`Syncing stake data to ${nativeChain.name} (15-20 seconds)...`);
                await new Promise(resolve => setTimeout(resolve, 15000));

                // Success!
                setTransactionStatus("Successfully joined the DAO! Redirecting...");
                setTimeout(() => {
                    navigate("/dao");
                }, 2000);

            } catch (stakeError) {
                console.error("Stake transaction error:", stakeError);
                setTransactionStatus(`Stake failed: ${stakeError.message || "Transaction rejected or reverted"}`);
                setIsProcessing(false);
                return;
            }

        } catch (error) {
            console.error("Error in join DAO flow:", error);
            setTransactionStatus(`Failed: ${error.message}`);
            setIsProcessing(false);
        }
    };

    // Handle Unstake (two-step: request → complete after 24h)
    const handleUnstake = async () => {
        if (!walletAddress || !alreadyStaked) return;

        try {
            setIsProcessing(true);

            // Switch to main chain
            setTransactionStatus(`Switching to ${mainChain.name}...`);
            await switchToMainChain();

            const state = getUnstakeState();

            if (state === 'can_request') {
                // First call: request unstake (no LZ fee needed, just starts cooldown)
                setTransactionStatus("Requesting unstake (starts 24-hour cooldown)...");
                await executeUnstake(
                    "0",
                    (hash) => setTransactionStatus(`Unstake request sent: ${hash.substring(0, 10)}...`),
                    () => setTransactionStatus("Unstake requested! 24-hour cooldown started.")
                );

                // Refresh unstake info
                const uInfo = await getUnstakeInfo(walletAddress);
                setUnstakeInfo(uInfo);
                setTransactionStatus("Unstake requested. You can complete the unstake after the 24-hour delay.");
                setIsProcessing(false);

            } else if (state === 'can_complete') {
                // Second call: complete unstake (needs LZ fee for cross-chain sync)
                const feeInEth = unstakeFee ? Web3.utils.fromWei(unstakeFee, 'ether') : '0.0004';
                setTransactionStatus(`Completing unstake (Fee: ~${parseFloat(feeInEth).toFixed(5)} ETH)...`);

                // Add 20% buffer to quoted fee
                const fee = unstakeFee
                    ? (BigInt(unstakeFee) * 120n / 100n).toString()
                    : Web3.utils.toWei('0.0004', 'ether');

                await executeUnstake(
                    fee,
                    (hash) => setTransactionStatus(`Unstake transaction sent: ${hash.substring(0, 10)}...`),
                    () => setTransactionStatus("Unstake complete! Tokens returned to your wallet.")
                );

                setTransactionStatus("Unstake complete! Tokens returned to your wallet. Redirecting...");
                setTimeout(() => {
                    navigate("/dao");
                }, 2000);
            }
        } catch (error) {
            console.error("Error in unstake flow:", error);
            setTransactionStatus(`Unstake failed: ${error.message}`);
            setIsProcessing(false);
        }
    };

    const unstakeState = getUnstakeState();

    return (
        <div className="join-dao-container">
            <div className="join-dao-card">
                <div className="join-dao-header">
                    <BackButton to="/dao" title={alreadyStaked ? "Manage Stake" : "Join the DAO"} />
                </div>

                <div className="join-dao-content">
                    <div className="dao-content-wrapper">
                        <div className="dao-icon-wrapper">
                            <img src="/dao.svg" alt="DAO Icon" className="dao-icon" />
                        </div>

                        <div className="dao-info-section">
                            <p className="dao-description">
                                {alreadyStaked
                                    ? "You are a DAO member. Below you can view your stake details and unstake your tokens when ready."
                                    : "OpenWork token holders govern the OpenWork DAO, which in turn governs the smart contracts, treasury and Athena's Skill Oracles. Read the OpenWork Paper to understand how it all works"
                                }
                            </p>

                            {!alreadyStaked && (
                                <Link to="/about" className="dao-paper-link">
                                    <span>Read the OpenWork Paper</span>
                                    <img src="/arrowRight.svg" alt="Arrow" className="arrow-icon" />
                                </Link>
                            )}
                        </div>
                    </div>

                    <div className="dao-staking-section">
                        {/* Stake info box */}
                        <div className="staking-box">
                            {alreadyStaked ? (
                                <>
                                    <div className="staking-box-row">
                                        <span className="staking-label">STAKED AMOUNT</span>
                                        <div className="staking-value">
                                            <span className="value-text">{displayStakedAmount()}</span>
                                            <img src="/OWToken.svg" alt="OW Token" className="token-icon" />
                                        </div>
                                    </div>
                                    <div className="staking-box-row" style={{ marginTop: '16px' }}>
                                        <span className="staking-label">LOCK EXPIRES</span>
                                        <div className="staking-value">
                                            <span className="value-text">
                                                {stakeInfo && Math.floor(Date.now() / 1000) >= stakeInfo.unlockTime
                                                    ? "Unlocked"
                                                    : formatTime(stakeInfo?.unlockTime)
                                                }
                                            </span>
                                        </div>
                                    </div>
                                    {unstakeInfo.requested && (
                                        <div className="staking-box-row" style={{ marginTop: '16px' }}>
                                            <span className="staking-label">UNSTAKE AVAILABLE</span>
                                            <div className="staking-value">
                                                <span className="value-text">
                                                    {unstakeState === 'can_complete'
                                                        ? "Now"
                                                        : formatTime(unstakeInfo.availableTime)
                                                    }
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <>
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
                                            <span className="value-text">0</span>
                                            <img src="/OWToken.svg" alt="OW Token" className="token-icon" />
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Stake input (only when not staked) */}
                        {!alreadyStaked && (
                            <>
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
                            </>
                        )}

                        {/* Wrong network prompt */}
                        {wrongNetwork && (
                            <button
                                className="join-dao-button"
                                onClick={switchToMainChain}
                                style={{ background: 'linear-gradient(180deg, #868686 0%, #4D4D4D 100%)', borderColor: '#4D4D4D' }}
                            >
                                <span>Switch to {mainChain.name}</span>
                            </button>
                        )}

                        {/* Action buttons */}
                        {!wrongNetwork && !alreadyStaked && (
                            <button
                                className="join-dao-button"
                                onClick={handleJoinDAO}
                                disabled={isProcessing || !walletAddress}
                                style={{
                                    opacity: (isProcessing || !walletAddress) ? 0.6 : 1,
                                    cursor: (isProcessing || !walletAddress) ? 'not-allowed' : 'pointer'
                                }}
                            >
                                <span>{isProcessing ? "Processing..." : "Join DAO"}</span>
                            </button>
                        )}

                        {!wrongNetwork && alreadyStaked && (
                            <>
                                {unstakeState === 'locked' && (
                                    <button
                                        className="join-dao-button"
                                        disabled
                                        style={{ opacity: 0.6, cursor: 'not-allowed' }}
                                    >
                                        <span>Stake Locked</span>
                                    </button>
                                )}

                                {unstakeState === 'can_request' && (
                                    <button
                                        className="join-dao-button"
                                        onClick={handleUnstake}
                                        disabled={isProcessing}
                                        style={{
                                            background: 'linear-gradient(180deg, #868686 0%, #4D4D4D 100%)',
                                            borderColor: '#4D4D4D',
                                            opacity: isProcessing ? 0.6 : 1,
                                            cursor: isProcessing ? 'not-allowed' : 'pointer'
                                        }}
                                    >
                                        <span>{isProcessing ? "Processing..." : "Request Unstake"}</span>
                                    </button>
                                )}

                                {unstakeState === 'waiting' && (
                                    <button
                                        className="join-dao-button"
                                        disabled
                                        style={{
                                            background: 'linear-gradient(180deg, #868686 0%, #4D4D4D 100%)',
                                            borderColor: '#4D4D4D',
                                            opacity: 0.6,
                                            cursor: 'not-allowed'
                                        }}
                                    >
                                        <span>Waiting for 24h Delay</span>
                                    </button>
                                )}

                                {unstakeState === 'can_complete' && (
                                    <button
                                        className="join-dao-button"
                                        onClick={handleUnstake}
                                        disabled={isProcessing}
                                        style={{
                                            opacity: isProcessing ? 0.6 : 1,
                                            cursor: isProcessing ? 'not-allowed' : 'pointer'
                                        }}
                                    >
                                        <span>{isProcessing ? "Processing..." : "Complete Unstake"}</span>
                                    </button>
                                )}
                            </>
                        )}

                        <div className="warning-form">
                            <Warning content={transactionStatus} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
