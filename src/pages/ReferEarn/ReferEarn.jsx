import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Web3 from "web3";
import "./ReferEarn.css";
import BackButtonProposal from "../../components/BackButtonProposal/BackButtonProposal";
import Warning from "../../components/Warning/Warning";
import NativeRewardsABI from "../../ABIs/native-rewards_ABI.json";
import MainRewardsABI from "../../ABIs/main-rewards_ABI.json";
import NOWJCABI from "../../ABIs/nowjc_ABI.json";

// Contract addresses
const NATIVE_REWARDS_ADDRESS = import.meta.env.VITE_NATIVE_REWARDS_ADDRESS;
const MAIN_REWARDS_ADDRESS = import.meta.env.VITE_MAIN_REWARDS_ADDRESS;
const NOWJC_ADDRESS = import.meta.env.VITE_NOWJC_CONTRACT_ADDRESS;
const ARBITRUM_RPC = import.meta.env.VITE_ARBITRUM_SEPOLIA_RPC_URL;
const BASE_RPC = import.meta.env.VITE_BASE_SEPOLIA_RPC_URL;

// LayerZero options for cross-chain messaging
const LZ_OPTIONS = import.meta.env.VITE_LAYERZERO_OPTIONS_VALUE || "0x000301001101000000000000000000000000000F4240";

// Chain IDs
const ARBITRUM_CHAIN_ID = '0x66eee'; // 421614
const BASE_CHAIN_ID = '0x14a34'; // 84532

export default function ReferEarn() {
  const navigate = useNavigate();
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);

  // Wallet state
  const [walletAddress, setWalletAddress] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Rewards state - Arbitrum (Native)
  const [earnedTokens, setEarnedTokens] = useState("0");
  const [claimableOnArbitrum, setClaimableOnArbitrum] = useState("0");
  const [loadingArbitrumRewards, setLoadingArbitrumRewards] = useState(false);

  // Rewards state - Base (Synced)
  const [syncedTokensOnBase, setSyncedTokensOnBase] = useState("0");
  const [loadingBaseRewards, setLoadingBaseRewards] = useState(false);

  // Transaction state
  const [currentStep, setCurrentStep] = useState(null); // 'sync' or 'claim'
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Generate referral link based on connected wallet
  const referralLink = walletAddress
    ? `${window.location.origin}/profile/${walletAddress}?ref=${walletAddress}`
    : "Connect wallet to generate your referral link";

  // Connect wallet
  const connectWallet = async () => {
    if (!window.ethereum) {
      setErrorMessage("Please install MetaMask to use this feature");
      return;
    }

    setIsConnecting(true);
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts.length > 0) {
        setWalletAddress(accounts[0]);
      }
    } catch (error) {
      console.error("Error connecting wallet:", error);
      setErrorMessage("Failed to connect wallet");
    } finally {
      setIsConnecting(false);
    }
  };

  // Check for connected wallet on mount
  useEffect(() => {
    const checkWallet = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            setWalletAddress(accounts[0]);
          }
        } catch (error) {
          console.error("Error checking wallet:", error);
        }
      }
    };

    checkWallet();

    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        setWalletAddress(accounts.length > 0 ? accounts[0] : null);
      });
    }
  }, []);

  // Fetch rewards from Arbitrum (Native Rewards)
  useEffect(() => {
    const fetchArbitrumRewards = async () => {
      if (!walletAddress) return;

      setLoadingArbitrumRewards(true);
      try {
        const web3 = new Web3(ARBITRUM_RPC);
        const rewardsContract = new web3.eth.Contract(NativeRewardsABI, NATIVE_REWARDS_ADDRESS);

        const totalEarned = await rewardsContract.methods.getUserTotalTokensEarned(walletAddress).call();
        const claimable = await rewardsContract.methods.getUserTotalClaimableTokens(walletAddress).call();

        const earnedFormatted = web3.utils.fromWei(totalEarned, 'ether');
        const claimableFormatted = web3.utils.fromWei(claimable, 'ether');

        setEarnedTokens(parseFloat(earnedFormatted).toFixed(2));
        setClaimableOnArbitrum(parseFloat(claimableFormatted).toFixed(2));
      } catch (error) {
        console.error("Error fetching Arbitrum rewards:", error);
        setEarnedTokens("0");
        setClaimableOnArbitrum("0");
      } finally {
        setLoadingArbitrumRewards(false);
      }
    };

    fetchArbitrumRewards();
  }, [walletAddress]);

  // Fetch synced rewards from Base (Main Rewards)
  useEffect(() => {
    const fetchBaseRewards = async () => {
      if (!walletAddress) return;

      setLoadingBaseRewards(true);
      try {
        const web3 = new Web3(BASE_RPC);
        const mainRewardsContract = new web3.eth.Contract(MainRewardsABI, MAIN_REWARDS_ADDRESS);

        const claimable = await mainRewardsContract.methods.getClaimableRewards(walletAddress).call();
        const claimableFormatted = web3.utils.fromWei(claimable, 'ether');

        setSyncedTokensOnBase(parseFloat(claimableFormatted).toFixed(2));
      } catch (error) {
        console.error("Error fetching Base rewards:", error);
        setSyncedTokensOnBase("0");
      } finally {
        setLoadingBaseRewards(false);
      }
    };

    fetchBaseRewards();
  }, [walletAddress]);

  // Switch to a specific chain
  const switchToChain = async (chainId, chainName, rpcUrl) => {
    const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
    if (currentChainId !== chainId) {
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId }],
        });
      } catch (switchError) {
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId,
              chainName,
              nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
              rpcUrls: [rpcUrl],
            }],
          });
        } else {
          throw switchError;
        }
      }
    }
  };

  // Step 1: Sync rewards to main chain (Arbitrum → Base)
  const handleSyncToMainChain = async () => {
    if (!walletAddress) {
      await connectWallet();
      return;
    }

    if (parseFloat(claimableOnArbitrum) <= 0) {
      setErrorMessage("No claimable tokens on Arbitrum. Complete governance actions to unlock tokens.");
      return;
    }

    setIsProcessing(true);
    setCurrentStep('sync');
    setErrorMessage("");

    try {
      // Step 1.1: Switch to Arbitrum
      setStatusMessage("Step 1/3: Switching to Arbitrum Sepolia...");
      await switchToChain(ARBITRUM_CHAIN_ID, 'Arbitrum Sepolia', ARBITRUM_RPC);

      // Step 1.2: Get fee quote
      setStatusMessage("Step 2/3: Getting LayerZero fee quote...");
      const web3 = new Web3(window.ethereum);
      const nowjcContract = new web3.eth.Contract(NOWJCABI, NOWJC_ADDRESS);

      // Use fallback fee
      const quotedFee = web3.utils.toWei('0.001', 'ether');
      console.log(`LayerZero fee: ${web3.utils.fromWei(quotedFee, 'ether')} ETH`);

      // Step 1.3: Send sync transaction
      setStatusMessage("Step 3/3: Syncing rewards via LayerZero...");
      const tx = await nowjcContract.methods
        .syncRewardsData(LZ_OPTIONS)
        .send({
          from: walletAddress,
          value: quotedFee,
          gas: 500000
        });

      console.log("Sync transaction:", tx.transactionHash);
      setStatusMessage("Sync complete! Waiting for LayerZero delivery (1-5 min)...");

      // Wait a bit then refresh Base rewards
      setTimeout(async () => {
        setStatusMessage("Checking Base Sepolia for synced tokens...");
        const web3Base = new Web3(BASE_RPC);
        const mainRewardsContract = new web3Base.eth.Contract(MainRewardsABI, MAIN_REWARDS_ADDRESS);
        const claimable = await mainRewardsContract.methods.getClaimableRewards(walletAddress).call();
        const claimableFormatted = web3Base.utils.fromWei(claimable, 'ether');
        setSyncedTokensOnBase(parseFloat(claimableFormatted).toFixed(2));

        if (parseFloat(claimableFormatted) > 0) {
          setStatusMessage("Tokens synced! You can now claim on Base Sepolia.");
        } else {
          setStatusMessage("Sync sent. Check back in a few minutes for tokens to appear.");
        }
        setCurrentStep(null);
        setIsProcessing(false);
      }, 10000);

    } catch (error) {
      console.error("Error syncing rewards:", error);
      setErrorMessage(error.code === 4001 ? "Transaction cancelled" : error.message);
      setStatusMessage("");
      setCurrentStep(null);
      setIsProcessing(false);
    }
  };

  // Step 2: Claim tokens on Base Sepolia
  const handleClaimOnBase = async () => {
    if (!walletAddress) {
      await connectWallet();
      return;
    }

    if (parseFloat(syncedTokensOnBase) <= 0) {
      setErrorMessage("No tokens to claim on Base. Sync your rewards first.");
      return;
    }

    setIsProcessing(true);
    setCurrentStep('claim');
    setErrorMessage("");

    try {
      // Step 2.1: Switch to Base Sepolia
      setStatusMessage("Step 1/3: Switching to Base Sepolia...");
      await switchToChain(BASE_CHAIN_ID, 'Base Sepolia', BASE_RPC);

      // Step 2.2: Get fee quote
      setStatusMessage("Step 2/3: Getting LayerZero fee quote...");
      const web3 = new Web3(window.ethereum);
      const mainRewardsContract = new web3.eth.Contract(MainRewardsABI, MAIN_REWARDS_ADDRESS);

      // Use fallback fee for claim sync back to Arbitrum
      const quotedFee = web3.utils.toWei('0.001', 'ether');
      console.log(`Claim fee: ${web3.utils.fromWei(quotedFee, 'ether')} ETH`);

      // Step 2.3: Claim tokens
      setStatusMessage("Step 3/3: Claiming tokens...");
      const tx = await mainRewardsContract.methods
        .claimRewards(LZ_OPTIONS)
        .send({
          from: walletAddress,
          value: quotedFee,
          gas: 500000
        });

      console.log("Claim transaction:", tx.transactionHash);
      setStatusMessage("Tokens claimed successfully! OpenWork tokens sent to your wallet.");

      // Refresh balances
      setSyncedTokensOnBase("0");

      setTimeout(() => {
        setStatusMessage("");
        setCurrentStep(null);
        setIsProcessing(false);
      }, 5000);

    } catch (error) {
      console.error("Error claiming tokens:", error);
      setErrorMessage(error.code === 4001 ? "Transaction cancelled" : error.message);
      setStatusMessage("");
      setCurrentStep(null);
      setIsProcessing(false);
    }
  };

  const handleCopyLink = () => {
    if (!walletAddress) {
      setErrorMessage("Please connect your wallet first");
      return;
    }
    navigator.clipboard.writeText(referralLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyAddress = () => {
    if (!walletAddress) {
      setErrorMessage("Please connect your wallet first");
      return;
    }
    navigator.clipboard.writeText(walletAddress);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  // Determine which action button to show
  const canSync = parseFloat(claimableOnArbitrum) > 0;
  const canClaim = parseFloat(syncedTokensOnBase) > 0;

  return (
    <div className="refer-earn-container">
      {/* Main Card */}
      <div className="refer-earn-card">
        {/* Card Header */}
        <div className="refer-earn-card-header">
          <div className="refer-earn-header-content">
            <BackButtonProposal onClick={() => navigate(-1)} />
            <h2 className="refer-earn-card-title">Refer & Earn</h2>
          </div>
        </div>

        {/* Content */}
        <div className="refer-earn-content">
          {/* Icon */}
          <div className="refer-earn-icon-wrapper">
            <img
              src="/assets/refer-earn-icon.svg"
              alt="Refer & Earn"
              className="refer-earn-icon"
            />
          </div>

          {/* Main Content */}
          <div className="refer-earn-main-content">
            {/* Message */}
            <div className="refer-earn-message-section">
              <p className="refer-earn-message">
                Since you're part of the DAO or have at least 1 skill verified, you are
                eligible to refer job givers or takers to OpenWork. For every job either
                given or taken up by this profile in the future, 1% of the payment will
                come to you.
              </p>
            </div>

            {/* Wallet Connection Status */}
            {!walletAddress && (
              <Warning
                content="Connect your wallet to see your referral link and earnings"
                icon="/orange-warning.svg"
              />
            )}

            {/* Link Sections */}
            <div className="refer-earn-links-section">
              {/* Copy Link Section */}
              <div className="refer-earn-link-group">
                <p className="refer-earn-link-label">COPY AND SHARE THIS LINK</p>
                <div className="refer-earn-link-button" onClick={handleCopyLink}>
                  <span className="refer-earn-link-text">
                    {walletAddress
                      ? (copiedLink ? "Copied!" : referralLink)
                      : "Connect wallet to generate link"
                    }
                  </span>
                  <img
                    src="/assets/copy-icon.svg"
                    alt="Copy"
                    className="copy-icon"
                    style={{ cursor: 'pointer', opacity: walletAddress ? 1 : 0.5 }}
                  />
                </div>
              </div>

              {/* Copy Address Section */}
              <div className="refer-earn-link-group">
                <p className="refer-earn-link-label">OR THEY CAN ENTER YOUR ADDRESS ON THEIR PROFILE</p>
                <div className="refer-earn-link-button" onClick={handleCopyAddress}>
                  <span className="refer-earn-link-text">
                    {walletAddress
                      ? (copiedAddress ? "Copied!" : walletAddress)
                      : "Connect wallet to see address"
                    }
                  </span>
                  <img
                    src="/assets/copy-icon.svg"
                    alt="Copy"
                    className="copy-icon"
                    style={{ cursor: 'pointer', opacity: walletAddress ? 1 : 0.5 }}
                  />
                </div>
              </div>
            </div>

            {/* Rewards Summary */}
            <div className="refer-earn-earnings-card">
              <div className="refer-earn-earnings-content">
                <p className="refer-earn-earnings-label">TOTAL EARNED ON ARBITRUM</p>
                <div className="refer-earn-earnings-amount">
                  <span className="earnings-value">
                    {loadingArbitrumRewards ? "..." : earnedTokens}
                  </span>
                  <div className="openwork-token">
                    <img
                      src="/assets/openwork-token.svg"
                      alt="OpenWork Token"
                      className="token-icon"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Claimable on Arbitrum (needs sync) */}
            {parseFloat(claimableOnArbitrum) > 0 && (
              <div className="refer-earn-earnings-card">
                <div className="refer-earn-earnings-content">
                  <p className="refer-earn-earnings-label">READY TO SYNC TO BASE</p>
                  <div className="refer-earn-earnings-amount">
                    <span className="earnings-value">{claimableOnArbitrum}</span>
                    <div className="openwork-token">
                      <img
                        src="/assets/openwork-token.svg"
                        alt="OpenWork Token"
                        className="token-icon"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Synced on Base (ready to claim) */}
            {parseFloat(syncedTokensOnBase) > 0 && (
              <div className="refer-earn-earnings-card">
                <div className="refer-earn-earnings-content">
                  <p className="refer-earn-earnings-label">READY TO CLAIM ON BASE</p>
                  <div className="refer-earn-earnings-amount">
                    <span className="earnings-value">{syncedTokensOnBase}</span>
                    <div className="openwork-token">
                      <img
                        src="/assets/openwork-token.svg"
                        alt="OpenWork Token"
                        className="token-icon"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Status Messages */}
            {statusMessage && (
              <Warning content={statusMessage} icon="/orange-warning.svg" />
            )}
            {errorMessage && (
              <Warning content={errorMessage} icon="/orange-warning.svg" />
            )}

            {/* Action Buttons */}
            <div className="refer-earn-actions">
              {!walletAddress ? (
                <button
                  className="claim-tokens-button"
                  onClick={connectWallet}
                  disabled={isConnecting}
                  style={{ opacity: isConnecting ? 0.7 : 1, cursor: isConnecting ? 'wait' : 'pointer' }}
                >
                  {isConnecting ? "Connecting..." : "Connect Wallet"}
                </button>
              ) : canClaim ? (
                <button
                  className="claim-tokens-button"
                  onClick={handleClaimOnBase}
                  disabled={isProcessing}
                  style={{ opacity: isProcessing ? 0.7 : 1, cursor: isProcessing ? 'wait' : 'pointer' }}
                >
                  {isProcessing && currentStep === 'claim' ? "Claiming..." : "Claim Tokens on Base"}
                </button>
              ) : canSync ? (
                <button
                  className="claim-tokens-button"
                  onClick={handleSyncToMainChain}
                  disabled={isProcessing}
                  style={{ opacity: isProcessing ? 0.7 : 1, cursor: isProcessing ? 'wait' : 'pointer' }}
                >
                  {isProcessing && currentStep === 'sync' ? "Syncing..." : "Sync to Main Chain"}
                </button>
              ) : (
                <button
                  className="claim-tokens-button"
                  disabled
                  style={{ opacity: 0.5, cursor: 'not-allowed' }}
                >
                  No Tokens to Claim
                </button>
              )}
            </div>

            {/* How it works info */}
            {walletAddress && !canSync && !canClaim && (
              <Warning
                content="Earn tokens by completing jobs or governance actions. Tokens become claimable after participating in DAO voting."
                icon="/info.svg"
              />
            )}
          </div>
        </div>
      </div>

      {/* Referral History Card */}
      <div className="referral-history-card">
        <div className="referral-history-header">
          <h3 className="referral-history-title">Your Referral History</h3>
        </div>

        <div className="referral-history-content">
          {parseFloat(earnedTokens) > 0 ? (
            <div className="referral-history-item">
              <div className="referral-avatar">
                <img src="/assets/avatar-placeholder.png" alt="User" />
              </div>
              <div className="referral-history-details">
                <div className="referral-history-text">
                  <span className="history-text-normal">Total earned from referrals:</span>
                  <span className="history-amount">{earnedTokens}</span>
                  <div className="history-token-icon">
                    <img
                      src="/assets/openwork-token.svg"
                      alt="Token"
                      className="token-icon"
                    />
                  </div>
                </div>
                <div className="referral-history-meta">
                  <span className="referrer-name">From platform activity</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="referral-history-item">
              <div className="referral-history-details">
                <div className="referral-history-text">
                  <span className="history-text-normal">
                    {walletAddress
                      ? "No referral earnings yet. Share your link to start earning!"
                      : "Connect wallet to see your referral history"
                    }
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
