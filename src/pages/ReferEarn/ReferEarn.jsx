import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Web3 from "web3";
import "./ReferEarn.css";
import BackButtonProposal from "../../components/BackButtonProposal/BackButtonProposal";
import Warning from "../../components/Warning/Warning";
import NativeRewardsABI from "../../ABIs/native-rewards_ABI.json";
import MainRewardsABI from "../../ABIs/main-rewards_ABI.json";
import NOWJCABI from "../../ABIs/nowjc_ABI.json";
import { getNativeChain, getMainChain, toHexChainId } from "../../config/chainConfig";

// Get chain config based on current network mode (testnet/mainnet)
const nativeChain = getNativeChain(); // Arbitrum Sepolia or Arbitrum One
const mainChain = getMainChain();     // Base Sepolia or Ethereum Mainnet

// Contract addresses from chain config
const NATIVE_REWARDS_ADDRESS = nativeChain.contracts.nativeRewards;
const MAIN_REWARDS_ADDRESS = mainChain.contracts.mainRewards;
const NOWJC_ADDRESS = nativeChain.contracts.nowjc;
const NATIVE_RPC = nativeChain.rpcUrl;
const MAIN_RPC = mainChain.rpcUrl;

// LayerZero options for cross-chain messaging
// Format: 0x0003 (type3) | 01 (worker1) | 0011 (17 bytes) | 01 (lzReceive gas) | <16-byte gas amount>
const LZ_OPTIONS = import.meta.env.VITE_LAYERZERO_OPTIONS_VALUE || "0x000301001101000000000000000000000000000F4240"; // 1,000,000 dest gas — for sync (Arb→ETH)

// Lighter options for claim callback (ETH→Arb): updateUserClaimData is ~80-120k gas on Arbitrum
// 250,000 dest gas is safe headroom without overpaying the LayerZero fee
const CLAIM_LZ_OPTIONS = "0x0003010011010000000000000000000000000003D090"; // 250,000 dest gas

// Chain IDs (hex) from config
const NATIVE_CHAIN_ID = toHexChainId(nativeChain.chainId);
const MAIN_CHAIN_ID = toHexChainId(mainChain.chainId);

// Polling config for LayerZero delivery
const POLL_INTERVAL_MS = 15000;
const MAX_POLL_DURATION_MS = 300000;

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
  const [claimedOnNative, setClaimedOnNative] = useState("0");
  const [governanceActions, setGovernanceActions] = useState("0");
  const [loadingNativeRewards, setLoadingNativeRewards] = useState(false);

  // Rewards state - Main Chain (Synced)
  const [syncedTokensOnMain, setSyncedTokensOnMain] = useState("0");
  const [totalClaimedOnMain, setTotalClaimedOnMain] = useState("0");
  const [loadingMainRewards, setLoadingMainRewards] = useState(false);

  // Fee state
  const [claimFeeEstimate, setClaimFeeEstimate] = useState(null);

  // Transaction state
  const [currentStep, setCurrentStep] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastTxHash, setLastTxHash] = useState(null);

  // Polling ref
  const pollIntervalRef = useRef(null);
  const pollStartTimeRef = useRef(null);

  // Computed values
  const earned = parseFloat(earnedTokens);
  const claimable = parseFloat(claimableOnArbitrum);
  const claimed = parseFloat(claimedOnNative);
  const synced = parseFloat(syncedTokensOnMain);
  const claimedOnEth = parseFloat(totalClaimedOnMain);
  const totalClaimed = Math.max(claimed, claimedOnEth);
  const locked = Math.max(0, earned - claimable - totalClaimed);
  const loading = loadingNativeRewards || loadingMainRewards;

  const referralLink = walletAddress
    ? `${window.location.origin}/profile/${walletAddress}?ref=${walletAddress}`
    : "Connect wallet to generate your referral link";

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  // Connect wallet
  const connectWallet = async () => {
    if (!window.ethereum) {
      setErrorMessage("Please install MetaMask to use this feature");
      return;
    }

    setIsConnecting(true);
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts.length > 0) setWalletAddress(accounts[0]);
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
          if (accounts.length > 0) setWalletAddress(accounts[0]);
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
  const fetchNativeRewards = useCallback(async () => {
    if (!walletAddress) return;

    setLoadingNativeRewards(true);
    try {
      const web3 = new Web3(NATIVE_RPC);
      const rewardsContract = new web3.eth.Contract(NativeRewardsABI, NATIVE_REWARDS_ADDRESS);

      const [totalEarned, claimableRaw, totalClaimedRaw, govActions] = await Promise.all([
        rewardsContract.methods.getUserTotalTokensEarned(walletAddress).call(),
        rewardsContract.methods.getUserTotalClaimableTokens(walletAddress).call(),
        rewardsContract.methods.getUserTotalTokensClaimed(walletAddress).call(),
        rewardsContract.methods.getUserTotalGovernanceActions(walletAddress).call(),
      ]);

      setEarnedTokens(parseFloat(web3.utils.fromWei(totalEarned, 'ether')).toFixed(2));
      setClaimableOnArbitrum(parseFloat(web3.utils.fromWei(claimableRaw, 'ether')).toFixed(2));
      setClaimedOnNative(parseFloat(web3.utils.fromWei(totalClaimedRaw, 'ether')).toFixed(2));
      setGovernanceActions(govActions.toString());
    } catch (error) {
      console.error("Error fetching Native rewards:", error);
      setEarnedTokens("0");
      setClaimableOnArbitrum("0");
      setClaimedOnNative("0");
      setGovernanceActions("0");
    } finally {
      setLoadingNativeRewards(false);
    }
  }, [walletAddress]);

  // Fetch synced rewards from Main Chain (ETH Rewards)
  const fetchMainRewards = useCallback(async () => {
    if (!walletAddress) return;

    setLoadingMainRewards(true);
    try {
      const web3 = new Web3(MAIN_RPC);
      const mainRewardsContract = new web3.eth.Contract(MainRewardsABI, MAIN_REWARDS_ADDRESS);

      const rewardInfo = await mainRewardsContract.methods.getUserRewardInfo(walletAddress).call();
      const claimableRaw = rewardInfo.claimableAmount || rewardInfo[0];
      const totalClaimedRaw = rewardInfo.totalClaimed || rewardInfo[1];

      const claimableFormatted = parseFloat(web3.utils.fromWei(claimableRaw, 'ether')).toFixed(2);
      const totalClaimedFormatted = parseFloat(web3.utils.fromWei(totalClaimedRaw, 'ether')).toFixed(2);

      setSyncedTokensOnMain(claimableFormatted);
      setTotalClaimedOnMain(totalClaimedFormatted);

      // Get dynamic fee quote for claiming if tokens are available
      if (parseFloat(claimableFormatted) > 0) {
        try {
          const fee = await mainRewardsContract.methods
            .quoteClaimSync(walletAddress, claimableRaw, CLAIM_LZ_OPTIONS)
            .call();
          setClaimFeeEstimate(web3.utils.fromWei(fee, 'ether'));
        } catch (feeError) {
          console.error("Error quoting claim fee:", feeError);
          setClaimFeeEstimate(null);
        }
      }
    } catch (error) {
      console.error("Error fetching Main rewards:", error);
      setSyncedTokensOnMain("0");
      setTotalClaimedOnMain("0");
    } finally {
      setLoadingMainRewards(false);
    }
  }, [walletAddress]);

  useEffect(() => { fetchNativeRewards(); }, [fetchNativeRewards]);
  useEffect(() => { fetchMainRewards(); }, [fetchMainRewards]);

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

  // Start polling for LZ delivery on main chain after sync
  const startPollingMainRewards = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    pollStartTimeRef.current = Date.now();

    const previousSynced = parseFloat(syncedTokensOnMain);

    pollIntervalRef.current = setInterval(async () => {
      const elapsed = Date.now() - pollStartTimeRef.current;

      if (elapsed > MAX_POLL_DURATION_MS) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
        setStatusMessage("Sync sent. LayerZero delivery may still be in progress — check back shortly.");
        setCurrentStep(null);
        setIsProcessing(false);
        return;
      }

      try {
        const web3 = new Web3(MAIN_RPC);
        const mainRewardsContract = new web3.eth.Contract(MainRewardsABI, MAIN_REWARDS_ADDRESS);
        const claimableRaw = await mainRewardsContract.methods.getClaimableRewards(walletAddress).call();
        const claimableFormatted = parseFloat(web3.utils.fromWei(claimableRaw, 'ether')).toFixed(2);

        if (parseFloat(claimableFormatted) > previousSynced) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
          setSyncedTokensOnMain(claimableFormatted);
          setStatusMessage(`Tokens synced to ${mainChain.name}. You can now claim them (Step 2).`);
          setCurrentStep(null);
          setIsProcessing(false);
          fetchNativeRewards();
          fetchMainRewards();
        } else {
          const secs = Math.round(elapsed / 1000);
          setStatusMessage(`Waiting for LayerZero delivery to ${mainChain.name}... (${secs}s)`);
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, POLL_INTERVAL_MS);
  };

  // Step 1: Sync rewards to main chain (Native -> Main via LayerZero)
  const handleSyncToMainChain = async () => {
    if (!walletAddress) { await connectWallet(); return; }

    if (claimable <= 0) {
      setErrorMessage(`No claimable tokens on ${nativeChain.name}. Participate in governance to unlock tokens.`);
      return;
    }

    setIsProcessing(true);
    setCurrentStep('sync');
    setErrorMessage("");
    setLastTxHash(null);

    try {
      setStatusMessage(`Switching to ${nativeChain.name}...`);
      await switchToChain(NATIVE_CHAIN_ID, nativeChain.name, NATIVE_RPC);

      setStatusMessage("Sending sync transaction via LayerZero...");
      const web3 = new Web3(window.ethereum);
      const nowjcContract = new web3.eth.Contract(NOWJCABI, NOWJC_ADDRESS);

      // Hardcoded estimate — excess is refunded by LayerZero
      const quotedFee = web3.utils.toWei('0.0005', 'ether');

      const tx = await nowjcContract.methods
        .syncRewardsData(LZ_OPTIONS)
        .send({ from: walletAddress, value: quotedFee, gas: 500000 });

      setLastTxHash(tx.transactionHash);
      setStatusMessage(`Sync sent. Waiting for LayerZero delivery to ${mainChain.name}...`);
      startPollingMainRewards();
    } catch (error) {
      console.error("Error syncing rewards:", error);
      setErrorMessage(error.code === 4001 ? "Transaction cancelled" : error.message);
      setStatusMessage("");
      setCurrentStep(null);
      setIsProcessing(false);
    }
  };

  // Step 2: Claim tokens on main chain
  const handleClaimOnMain = async () => {
    if (!walletAddress) { await connectWallet(); return; }

    if (synced <= 0) {
      setErrorMessage(`No tokens to claim on ${mainChain.name}. Sync your rewards first (Step 1).`);
      return;
    }

    setIsProcessing(true);
    setCurrentStep('claim');
    setErrorMessage("");
    setLastTxHash(null);

    try {
      setStatusMessage(`Switching to ${mainChain.name}...`);
      await switchToChain(MAIN_CHAIN_ID, mainChain.name, MAIN_RPC);

      setStatusMessage("Claiming tokens...");
      const web3 = new Web3(window.ethereum);
      const mainRewardsContract = new web3.eth.Contract(MainRewardsABI, MAIN_REWARDS_ADDRESS);

      // Dynamic fee quote using lighter CLAIM_LZ_OPTIONS (250k dest gas instead of 1M)
      let fee;
      try {
        const claimableRaw = await mainRewardsContract.methods.getClaimableRewards(walletAddress).call();
        const quotedFee = await mainRewardsContract.methods
          .quoteClaimSync(walletAddress, claimableRaw, CLAIM_LZ_OPTIONS)
          .call();
        // 20% buffer on the quoted fee for gas price fluctuation
        fee = (BigInt(quotedFee) * 120n / 100n).toString();
      } catch {
        fee = web3.utils.toWei('0.0004', 'ether');
      }

      const tx = await mainRewardsContract.methods
        .claimRewards(CLAIM_LZ_OPTIONS)
        .send({ from: walletAddress, value: fee, gas: 300000 });

      setLastTxHash(tx.transactionHash);
      setStatusMessage("Tokens claimed! OpenWork tokens have been sent to your wallet.");
      setSyncedTokensOnMain("0");

      // Refresh both chains after a short delay
      setTimeout(() => {
        fetchNativeRewards();
        fetchMainRewards();
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
    if (!walletAddress) { setErrorMessage("Please connect your wallet first"); return; }
    navigator.clipboard.writeText(referralLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyAddress = () => {
    if (!walletAddress) { setErrorMessage("Please connect your wallet first"); return; }
    navigator.clipboard.writeText(walletAddress);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  // Token amount with icon — reuses .refer-earn-earnings-amount, .earnings-value, .openwork-token
  const TokenAmount = ({ value, dimmed }) => (
    <div className="refer-earn-earnings-amount">
      <span className="earnings-value" style={dimmed ? { color: '#868686' } : undefined}>
        {value}
      </span>
      <div className="openwork-token" style={dimmed ? { opacity: 0.4 } : undefined}>
        <img src="/assets/openwork-token.svg" alt="OW" className="token-icon" />
      </div>
    </div>
  );

  return (
    <div className="refer-earn-container">
      {/* Main Card */}
      <div className="refer-earn-card">
        <div className="refer-earn-card-header">
          <div className="refer-earn-header-content">
            <BackButtonProposal onClick={() => navigate(-1)} />
            <h2 className="refer-earn-card-title">Refer & Earn</h2>
          </div>
        </div>

        <div className="refer-earn-content">
          <div className="refer-earn-icon-wrapper">
            <img src="/assets/refer-earn-icon.svg" alt="Refer & Earn" className="refer-earn-icon" />
          </div>

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

            {!walletAddress && (
              <Warning content="Connect your wallet to see your referral link and earnings" icon="/orange-warning.svg" />
            )}

            {/* Referral Links */}
            <div className="refer-earn-links-section">
              <div className="refer-earn-link-group">
                <p className="refer-earn-link-label">COPY AND SHARE THIS LINK</p>
                <div className="refer-earn-link-button" onClick={handleCopyLink}>
                  <span className="refer-earn-link-text">
                    {walletAddress ? (copiedLink ? "Copied!" : referralLink) : "Connect wallet to generate link"}
                  </span>
                  <img src="/assets/copy-icon.svg" alt="Copy" className="copy-icon" style={{ opacity: walletAddress ? 1 : 0.5 }} />
                </div>
              </div>

              <div className="refer-earn-link-group">
                <p className="refer-earn-link-label">OR THEY CAN ENTER YOUR ADDRESS ON THEIR PROFILE</p>
                <div className="refer-earn-link-button" onClick={handleCopyAddress}>
                  <span className="refer-earn-link-text">
                    {walletAddress ? (copiedAddress ? "Copied!" : walletAddress) : "Connect wallet to see address"}
                  </span>
                  <img src="/assets/copy-icon.svg" alt="Copy" className="copy-icon" style={{ opacity: walletAddress ? 1 : 0.5 }} />
                </div>
              </div>
            </div>

            {/* ═══════════ Rewards Overview ═══════════ */}
            {walletAddress && (
              <>
                <p className="refer-earn-link-label" style={{ marginBottom: 0 }}>REWARDS OVERVIEW</p>

                {/* Total Earned */}
                <div className="refer-earn-earnings-card">
                  <div className="refer-earn-earnings-content">
                    <p className="refer-earn-earnings-label">TOTAL EARNED ON {nativeChain.name.toUpperCase()}</p>
                    <TokenAmount value={loading ? "..." : earnedTokens} />
                  </div>
                </div>

                {/* Governance Actions + Already Claimed — two cards side by side */}
                <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                  <div className="refer-earn-earnings-card" style={{ flex: 1 }}>
                    <div className="refer-earn-earnings-content" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                      <p className="refer-earn-earnings-label">GOVERNANCE ACTIONS</p>
                      <span className="earnings-value">{loading ? "..." : governanceActions}</span>
                    </div>
                  </div>
                  <div className="refer-earn-earnings-card" style={{ flex: 1 }}>
                    <div className="refer-earn-earnings-content" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                      <p className="refer-earn-earnings-label">ALREADY CLAIMED</p>
                      <TokenAmount value={loading ? "..." : totalClaimedOnMain} />
                    </div>
                  </div>
                </div>

                {/* Locked tokens (needs more governance to unlock) */}
                {locked > 0 && (
                  <div className="refer-earn-earnings-card">
                    <div className="refer-earn-earnings-content">
                      <p className="refer-earn-earnings-label">LOCKED (NEEDS GOVERNANCE TO UNLOCK)</p>
                      <TokenAmount value={locked.toFixed(2)} dimmed />
                    </div>
                  </div>
                )}

                {/* ═══════════ Claim Your Tokens ═══════════ */}
                <p className="refer-earn-link-label" style={{ marginBottom: 0, marginTop: '8px' }}>CLAIM YOUR TOKENS</p>

                {/* Step 1: Sync */}
                <div className="refer-earn-earnings-card" style={{ borderLeft: claimable > 0 ? '3px solid #1246FF' : '3px solid #F7F7F7' }}>
                  <div className="refer-earn-earnings-content" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
                    <p className="refer-earn-earnings-label">
                      STEP 1 — SYNC TO {mainChain.name.toUpperCase()}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <TokenAmount value={loading ? "..." : claimableOnArbitrum} />
                      <button
                        className="claim-tokens-button"
                        onClick={handleSyncToMainChain}
                        disabled={isProcessing || claimable <= 0}
                        style={{
                          opacity: isProcessing || claimable <= 0 ? 0.5 : 1,
                          cursor: isProcessing || claimable <= 0 ? 'not-allowed' : 'pointer',
                          fontSize: '12px',
                          padding: '8px 16px',
                        }}
                      >
                        {isProcessing && currentStep === 'sync' ? "Syncing..." : "Sync"}
                      </button>
                    </div>
                    <span className="referrer-name">
                      Sends unlocked tokens to {mainChain.name} via LayerZero (~0.0005 ETH fee, excess refunded)
                    </span>
                  </div>
                </div>

                {/* Step 2: Claim */}
                <div className="refer-earn-earnings-card" style={{ borderLeft: synced > 0 ? '3px solid #1246FF' : '3px solid #F7F7F7' }}>
                  <div className="refer-earn-earnings-content" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
                    <p className="refer-earn-earnings-label">
                      STEP 2 — CLAIM ON {mainChain.name.toUpperCase()}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <TokenAmount value={loading ? "..." : syncedTokensOnMain} />
                      <button
                        className="claim-tokens-button"
                        onClick={handleClaimOnMain}
                        disabled={isProcessing || synced <= 0}
                        style={{
                          opacity: isProcessing || synced <= 0 ? 0.5 : 1,
                          cursor: isProcessing || synced <= 0 ? 'not-allowed' : 'pointer',
                          fontSize: '12px',
                          padding: '8px 16px',
                        }}
                      >
                        {isProcessing && currentStep === 'claim' ? "Claiming..." : "Claim"}
                      </button>
                    </div>
                    <span className="referrer-name">
                      Transfers OW tokens to your wallet
                      {claimFeeEstimate
                        ? ` (~${parseFloat(claimFeeEstimate).toFixed(5)} ETH fee)`
                        : " (~0.0004 ETH fee, excess refunded)"}
                    </span>
                  </div>
                </div>
              </>
            )}

            {/* Status & Error Messages */}
            {statusMessage && <Warning content={statusMessage} icon="/orange-warning.svg" />}
            {errorMessage && <Warning content={errorMessage} icon="/orange-warning.svg" />}
            {lastTxHash && (
              <Warning
                content={`Transaction: ${lastTxHash.slice(0, 10)}...${lastTxHash.slice(-8)}`}
                icon="/info.svg"
              />
            )}

            {/* Connect Wallet Button */}
            {!walletAddress && (
              <div className="refer-earn-actions">
                <button
                  className="claim-tokens-button"
                  onClick={connectWallet}
                  disabled={isConnecting}
                  style={{ opacity: isConnecting ? 0.7 : 1, cursor: isConnecting ? 'wait' : 'pointer' }}
                >
                  {isConnecting ? "Connecting..." : "Connect Wallet"}
                </button>
              </div>
            )}

            {/* Contextual guidance */}
            {walletAddress && earned > 0 && locked > 0 && claimable <= 0 && synced <= 0 && (
              <Warning
                content={`You have ${locked.toFixed(2)} locked tokens. Vote on disputes, skill verifications, or AskAthena questions to unlock them.`}
                icon="/info.svg"
              />
            )}

            {walletAddress && earned <= 0 && (
              <Warning
                content="Earn tokens by completing jobs, hiring through the platform, or receiving referral commissions. Tokens are unlocked by participating in governance (voting)."
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
          {earned > 0 ? (
            <div className="referral-history-item">
              <div className="referral-avatar">
                <img src="/assets/avatar-placeholder.png" alt="User" />
              </div>
              <div className="referral-history-details">
                <div className="referral-history-text">
                  <span className="history-text-normal">Total earned from referrals:</span>
                  <span className="history-amount">{earnedTokens}</span>
                  <div className="history-token-icon">
                    <img src="/assets/openwork-token.svg" alt="Token" className="token-icon" />
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
