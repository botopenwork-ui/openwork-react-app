import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Web3 from "web3";
import GenesisABI from "../../ABIs/genesis_ABI.json";
import NativeAthenaABI from "../../ABIs/native-athena_ABI.json";
import "./ReviewDispute.css";
import Button from "../../components/Button/Button";
import VoteBar from "../../components/VoteBar/VoteBar";
import Warning from "../../components/Warning/Warning";
import { formatAddress } from "../../utils/oracleHelpers";

// Native Athena contract address on Arbitrum Sepolia
const NATIVE_ATHENA_ADDRESS = "0x098E52Aff44AEAd944AFf86F4A5b90dbAF5B86bd";

function JobdetailItem ({title, icon , amount, token}) {
  return (
    <div className="job-detail-item">
      <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
        <span className="job-detail-item-title">{title}</span>
        {icon && <img src="/fee.svg" alt="" />}
      </div>
      <div id="fetchedAmounts">
          {amount}{" "}
        <img src={token?"/token.svg":"/xdc.svg"} alt="USDC" className="usdc-iconJD" />
      </div>
    </div>
  )
}

function ATTACHMENTS({title}) {
    return (
      <div className="attachment-form">
        <img src="/attachments.svg" alt="" />
        <span>{title}</span>
      </div>
    )
  }

export default function ReviewDispute() {
  const params = useParams();
  const disputeId = params.disputeId || params.jobId; // Support both routes
  
  const [dispute, setDispute] = useState(null);
  const [voters, setVoters] = useState([]);
  const [jobData, setJobData] = useState(null);
  const [account, setAccount] = useState(null);
  const navigate = useNavigate();
  const [loadingT, setLoadingT] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasVoted, setHasVoted] = useState(false);
  const [userVote, setUserVote] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [txHash, setTxHash] = useState("");

  function formatWalletAddressH(address) {
    if (!address) return "";
    const start = address.substring(0, 4);
    const end = address.substring(address.length - 4);
    return `${start}....${end}`;
  }


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

  // Check if user is already connected to MetaMask
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

  function formatWalletAddress(address) {
    if (!address) return "";
    const start = address.substring(0, 6);
    const end = address.substring(address.length - 4);
    return `${start}....${end}`;
  }

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        setWalletAddress(accounts[0]);
        setAccount(accounts[0]); // Set account when wallet is connected
      } catch (error) {
        console.error("Failed to connect wallet:", error);
      }
    } else {
      alert("MetaMask is not installed. Please install it to use this app.");
    }
  };

  const toggleDropdown = () => {
    setDropdownVisible(!dropdownVisible);
  };

  const disconnectWallet = () => {
    setWalletAddress("");
    setDropdownVisible(false);
  };

  // Check if current wallet has voted
  useEffect(() => {
    async function checkUserVoteStatus() {
      if (!disputeId || !walletAddress || !voters.length) return;
      
      const userVoter = voters.find(v => v.voter.toLowerCase() === walletAddress.toLowerCase());
      if (userVoter) {
        setHasVoted(true);
        setUserVote(userVoter.voteFor);
        console.log(`✅ User already voted: ${userVoter.voteFor ? 'FOR' : 'AGAINST'}`);
      }
    }
    
    checkUserVoteStatus();
  }, [disputeId, walletAddress, voters]);

  useEffect(() => {
    async function fetchDisputeDetails() {
      if (!disputeId) {
        setLoading(false);
        return;
      }

      try {
        console.log("Fetching dispute:", disputeId);
        
        const web3 = new Web3(import.meta.env.VITE_ARBITRUM_SEPOLIA_RPC_URL);
        const genesisAddress = import.meta.env.VITE_GENESIS_CONTRACT_ADDRESS;
        const genesisContract = new web3.eth.Contract(GenesisABI, genesisAddress);

        // Fetch dispute data
        const disputeData = await genesisContract.methods.getDispute(disputeId).call();
        
        // Fetch voters
        const votersData = await genesisContract.methods.getDisputeVoters(disputeId).call();
        
        console.log("Dispute data:", disputeData);
        console.log("Voters:", votersData);

        // Calculate vote percentages
        const totalVotes = Number(disputeData.votesFor) + Number(disputeData.votesAgainst);
        const votesForPercent = totalVotes > 0 ? (Number(disputeData.votesFor) / totalVotes) : 0;
        const votesAgainstPercent = totalVotes > 0 ? (Number(disputeData.votesAgainst) / totalVotes) : 0;

        // Format amounts (USDC has 6 decimals)
        const disputedAmount = (Number(disputeData.disputedAmount) / 1e6).toFixed(2);
        const feeAmount = (Number(disputeData.fees) / 1e6).toFixed(2);

        // Fetch voting period from contract
        const nativeAthenaContract = new web3.eth.Contract(NativeAthenaABI, NATIVE_ATHENA_ADDRESS);
        const votingPeriodMinutes = Number(await nativeAthenaContract.methods.votingPeriodMinutes().call());
        
        // Calculate time remaining
        const votingPeriodSeconds = votingPeriodMinutes * 60;
        const now = Math.floor(Date.now() / 1000);
        const elapsed = now - Number(disputeData.timeStamp);
        const remainingSeconds = votingPeriodSeconds - elapsed;
        
        // Format time display
        let timeLeftDisplay = "Expired";
        if (remainingSeconds > 0) {
          const minutes = Math.floor(remainingSeconds / 60);
          const seconds = remainingSeconds % 60;
          timeLeftDisplay = `${minutes}m ${seconds}s left`;
        }

        setDispute(disputeData);
        setVoters(votersData);
        
        // Debug logging for button visibility
        console.log("🔍 Button visibility conditions:");
        console.log("  isVotingActive:", disputeData.isVotingActive);
        console.log("  isFinalized:", disputeData.isFinalized);
        console.log("  remainingSeconds:", remainingSeconds);
        console.log("  Should show vote buttons:", disputeData.isVotingActive && !disputeData.isFinalized);
        console.log("  Should show settle button:", !disputeData.isVotingActive && !disputeData.isFinalized);
        
        setJobData({
          disputeId,
          disputedAmount,
          feeAmount,
          votesFor: disputeData.votesFor.toString(),
          votesAgainst: disputeData.votesAgainst.toString(),
          totalVotes,
          votesForPercent,
          votesAgainstPercent,
          raiser: disputeData.disputeRaiserAddress,
          isVotingActive: disputeData.isVotingActive,
          isFinalized: disputeData.isFinalized,
          timeLeft: timeLeftDisplay,
          remainingSeconds,
          hash: disputeData.hash,
        });

        setLoading(false);
      } catch (error) {
        console.error("Error fetching dispute details:", error);
        setLoading(false);
      }
    }

    fetchDisputeDetails();
  }, [disputeId]);

  const fetchFromIPFS = async (hash) => {
    try {
      const response = await fetch(`https://gateway.pinata.cloud/ipfs/${hash}`);
      return await response.json();
    } catch (error) {
      console.error("Error fetching data from IPFS:", error);
      return {};
    }
  };

  // Handle vote on dispute
  const handleVote = async (voteFor) => {
    // Clear previous messages
    setSuccessMessage("");
    setErrorMessage("");
    setTxHash("");
    
    // Pre-checks
    if (!walletAddress) {
      setErrorMessage("Please connect your wallet first");
      return;
    }

    if (!jobData.isVotingActive) {
      setErrorMessage("Voting period has ended. You can no longer vote on this dispute.");
      return;
    }

    if (jobData.isFinalized) {
      setErrorMessage("Dispute has already been finalized");
      return;
    }

    try {
      setLoadingT("Submitting your vote...");

      const web3 = new Web3(window.ethereum);
      await window.ethereum.request({ method: "eth_requestAccounts" });
      
      // Check if user is on Arbitrum Sepolia
      const chainId = await web3.eth.getChainId();
      const ARBITRUM_SEPOLIA_CHAIN_ID = 421614;
      
      if (Number(chainId) !== ARBITRUM_SEPOLIA_CHAIN_ID) {
        setErrorMessage(`Please switch to Arbitrum Sepolia network. Current Chain ID: ${chainId}, Required: 421614`);
        setLoadingT("");
        return;
      }
      
      const accounts = await web3.eth.getAccounts();
      const fromAddress = accounts[0];

      // Create Native Athena contract instance
      const nativeAthena = new web3.eth.Contract(NativeAthenaABI, NATIVE_ATHENA_ADDRESS);

      // Call vote function: vote(VotingType, disputeId, voteFor, claimAddress)
      // VotingType.Dispute = 0
      const receipt = await nativeAthena.methods
        .vote(0, disputeId, voteFor, fromAddress)
        .send({
          from: fromAddress,
        });

      setLoadingT("");
      setTxHash(receipt.transactionHash);
      setSuccessMessage(`Vote submitted successfully! You voted ${voteFor ? 'FOR' : 'AGAINST'} the dispute.`);
      
      // Refresh dispute data after 2 seconds
      setTimeout(() => window.location.reload(), 2000);

    } catch (error) {
      console.error("Error voting on dispute:", error);
      setLoadingT("");
      
      // Parse specific error messages
      const errorMsg = error.message || "";
      
      if (errorMsg.includes("Voting period has expired")) {
        setErrorMessage("Voting period has ended. Please refresh the page.");
      } else if (errorMsg.includes("Already voted")) {
        setErrorMessage("You have already voted on this dispute");
      } else if (errorMsg.includes("Insufficient stake")) {
        setErrorMessage("You need at least 100 OW tokens (staked or earned) to vote");
      } else if (errorMsg.includes("Voting is not active")) {
        setErrorMessage("Voting is not active for this dispute");
      } else if (errorMsg.includes("Dispute does not exist")) {
        setErrorMessage("Dispute not found. It may have been deleted or doesn't exist.");
      } else if (errorMsg.includes("user rejected")) {
        setErrorMessage("Transaction was rejected in MetaMask");
      } else {
        setErrorMessage("Vote failed: " + errorMsg.substring(0, 150));
      }
    }
  };

  // Handle settle dispute
  const handleSettleDispute = async () => {
    // Pre-checks
    if (!walletAddress) {
      setErrorMessage("Please connect your wallet first");
      return;
    }

    if (jobData.isFinalized) {
      setErrorMessage("Dispute has already been settled");
      return;
    }

    if (jobData.isVotingActive && jobData.remainingSeconds > 0) {
      setErrorMessage("Voting period is still active. Wait for it to end before settling.");
      return;
    }

    try {
      setLoadingT("Settling dispute...");

      const web3 = new Web3(window.ethereum);
      await window.ethereum.request({ method: "eth_requestAccounts" });
      
      // Check if user is on Arbitrum Sepolia
      const chainId = await web3.eth.getChainId();
      const ARBITRUM_SEPOLIA_CHAIN_ID = 421614;
      
      if (Number(chainId) !== ARBITRUM_SEPOLIA_CHAIN_ID) {
        alert(`❌ Please switch to Arbitrum Sepolia network to settle dispute.\n\nCurrent Chain ID: ${chainId}\nRequired: ${ARBITRUM_SEPOLIA_CHAIN_ID} (Arbitrum Sepolia)`);
        setLoadingT("");
        return;
      }
      
      const accounts = await web3.eth.getAccounts();
      const fromAddress = accounts[0];

      // Create Native Athena contract instance
      const nativeAthena = new web3.eth.Contract(NativeAthenaABI, NATIVE_ATHENA_ADDRESS);

      // Call settleDispute function
      await nativeAthena.methods
        .settleDispute(disputeId)
        .send({
          from: fromAddress,
        });

      setLoadingT("");
      alert("✅ Dispute settled successfully! Funds have been distributed according to the vote outcome.");
      
      // Refresh dispute data
      window.location.reload();

    } catch (error) {
      console.error("Error settling dispute:", error);
      setLoadingT("");
      
      // Parse specific error messages
      const errorMsg = error.message || "";
      
      if (errorMsg.includes("Voting period not ended")) {
        alert("❌ Voting period is still active. Please wait for it to end.");
      } else if (errorMsg.includes("does not exist")) {
        alert("❌ Dispute not found. It may have been deleted or doesn't exist.");
      } else if (errorMsg.includes("already finalized")) {
        alert("❌ Dispute was already settled by someone else. Refreshing...");
        window.location.reload();
      } else if (errorMsg.includes("user rejected")) {
        alert("❌ Transaction was rejected in MetaMask");
      } else {
        alert("❌ Settlement failed: " + errorMsg.substring(0, 100));
      }
    }
  };

  const handleReviewDispute = async () => {
      location.pathname = '/project-complete'
    // if (window.ethereum) {
    //   try {
       
    //     setLoadingT(true); // Start loader

    //     const web3 = new Web3(window.ethereum);
    //     await window.ethereum.request({ method: "eth_requestAccounts" });
    //     const accounts = await web3.eth.getAccounts();
    //     const fromAddress = accounts[0];

    //     const jobContractAddress = "0xdEF4B440acB1B11FDb23AF24e099F6cAf3209a8d";
    //     const jobContract = new web3.eth.Contract(
    //       JobContractABI,
    //       jobContractAddress
    //     );

    //     const amountInWei = web3.utils.toWei(releaseAmount, "ether");

    //     jobContract.methods
    //       .releasePartialPayment(jobId, amountInWei)
    //       .send({
    //         from: fromAddress,
    //         gasPrice: await web3.eth.getGasPrice(),
    //       })
    //       .on("receipt", function (receipt) {
    //         console.log("Transaction successful:", receipt);
    //         alert("Payment released successfully!");
    //         navigate(-1);
    //       })
    //       .on("error", function (error) {
    //         console.error("Error releasing payment:", error);
    //         alert("Error releasing payment. Check the console for details.");
    //       })
    //       .finally(() => {
    //         setLoadingT(false); // Stop loader
    //       });
    //   } catch (error) {
    //     console.error("Error releasing payment:", error);
    //     alert("Error releasing payment. Check the console for details.");
    //     setLoadingT(false); // Stop loader on error
    //   }
    // } else {
    //   console.error("MetaMask not detected");
    //   alert("MetaMask is not installed. Please install it to use this app.");
    // }
  };

  if (loadingT) {
    return (
      <div className="loading-containerT">
        <div className="loading-icon"><img src="/OWIcon.svg" alt="Loading..."/></div>
        <div className="loading-message">
          <h1 id="txText">{loadingT}</h1>
          <p id="txSubtext">Please confirm the transaction in MetaMask and wait for blockchain confirmation</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="loading-container">
        <img src="/OWIcon.svg" alt="Loading..." className="loading-icon" />
      </div>
    );
  }

  if (!jobData) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <div className="newTitle">
         <div className="titleTop">
          <Link className="goBack" to="/skill-oracle-disputes"><img className="goBackImage" src="/back.svg" alt="Back Button" /></Link>  
          <div className="titleText" style={{fontWeight:'550'}}>Dispute {disputeId}</div>
          <Link className="goBack" to="/skill-oracle-disputes" style={{visibility:'hidden'}}><img className="goBackImage" src="/back.svg" alt="Back Button" /></Link>  
         </div>
         <div className="titleBottom">
          <a href={`/profile/${jobData.raiser}`} className="view-profile">
                <span>View Raiser Profile</span>
                <img src="/view_profile.svg" alt="" />
            </a>
         </div>
       </div>

      <div className="release-payment-container">
        <div className="form-container-release">
          <div className="sectionTitle reviewTitle">
            <span id="rel-title" style={{paddingTop:'0px'}}>Dispute Details</span>
            <span className="left-days">{jobData.timeLeft}</span>
          </div>
          <div className="release-payment-body">
            {/* Success Banner */}
            {successMessage && (
              <div style={{ 
                background: '#f0fdf4', 
                border: '2px solid #86efac', 
                padding: '16px', 
                borderRadius: '12px',
                marginBottom: '16px'
              }}>
                <p style={{ margin: '0 0 8px', fontSize: '14px', color: '#166534', fontWeight: 600 }}>
                  ✅ {successMessage}
                </p>
                {txHash && (
                  <a 
                    href={`https://sepolia.arbiscan.io/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: '12px', color: '#0047FF', textDecoration: 'underline' }}
                  >
                    View transaction on Arbiscan →
                  </a>
                )}
              </div>
            )}

            {/* Error Banner */}
            {errorMessage && (
              <div style={{ 
                background: '#fef2f2', 
                border: '2px solid #fca5a5', 
                padding: '16px', 
                borderRadius: '12px',
                marginBottom: '16px'
              }}>
                <p style={{ margin: 0, fontSize: '14px', color: '#991b1b', fontWeight: 600 }}>
                  ❌ {errorMessage}
                </p>
              </div>
            )}

            <div className="form-groupDC">
                <div className="detail-row">
                    <span className="detail-label">RAISED BY</span>
                    <div className="detail-profile">
                    <span className="detail-value-address">
                        <img src="/user.png" alt="Dispute Raiser" className="Job" />
                        <p title={jobData.raiser}>{formatAddress(jobData.raiser)}</p>
                    </span>
                    <a href={`/profile/${jobData.raiser}`} className="view-profile">
                        <span>View Profile</span>
                        <img src="/view_profile.svg" alt="" />
                    </a>
                    </div>
                </div>
            </div>
            <div className="form-groupDC job-body">
              <div className="job-detail-sectionR">
                <JobdetailItem title="DISPUTED AMOUNT" amount={jobData.disputedAmount}/>
                <JobdetailItem title="DISPUTE FEE" amount={jobData.feeAmount}/>
                <JobdetailItem title="TOTAL VOTERS" amount={voters.length}/>
              </div>
            </div>
            <div className="form-groupDC">
                <div className="detail-row">
                    <span className="detail-label">EVIDENCE HASH</span>
                    <div className="detail-value description-value">
                        <p>{jobData.hash || "No evidence provided"}</p>
                    </div>
                </div>
            </div>
            <div className="form-groupDC token-section">
               <div className="job-detail-sectionR" style={{width:'100%'}}>
                    <JobdetailItem title="TOKENS IN FAVOUR" amount={Web3.utils.fromWei(jobData.votesFor || '0', 'ether').slice(0, 8)} token={true}/>
               </div>
               <div className="job-detail-sectionR" style={{width:'100%'}}>
                    <JobdetailItem title="TOKENS AGAINST" amount={Web3.utils.fromWei(jobData.votesAgainst || '0', 'ether').slice(0, 8)} token={true}/>
               </div>
            </div>
            <div className="form-groupDC" style={{marginTop:'53px'}}>
                <VoteBar
                    totalVotes={1}
                    votesInFavor={jobData.votesForPercent}
                    votesAgainst={jobData.votesAgainstPercent}
                    threshold={0.5}
                />
            </div>
            <div className="form-groupDC">
               <div className="job-detail-sectionR vote-conditions">
                    <div className="vote-conditions-header">
                    VOTING STATUS
                    </div>
                    <div className="vote-conditions-content">
                        <span>•</span>
                        <span>Total Voters: {voters.length}</span>
                    </div>
                    <div className="vote-conditions-content">
                        <span>•</span>
                        <span>Status: {jobData.isFinalized ? 'Finalized' : (jobData.isVotingActive ? 'Active' : 'Ended')}</span>
                    </div>
                    <a href="/voting-history" className="vote-conditions-history">
                        <span>Vote History ({voters.length} voters)</span>
                        <img src="/view-history.svg" alt="" />
                    </a>
               </div>
            </div>
            <div className="form-groupDC">
               <div className="job-detail-sectionR">
                    <JobdetailItem title="RESOLUTION COMPENSATION" icon={true} amount={jobData.feeAmount}/>
               </div>
            </div>
            {jobData.remainingSeconds > 0 && !jobData.isFinalized && (
              <div className="form-groupDC">
                 <div className="vote-button-section">
                      <Button 
                        label={'Downvote'} 
                        icon='/against.svg' 
                        buttonCss={'downvote-button'}
                        onClick={() => handleVote(false)}
                      />
                      <Button 
                        label={'Upvote'} 
                        icon='/favour.svg' 
                        buttonCss={'downvote-button upvote-button'}
                        onClick={() => handleVote(true)}
                      />
                 </div>
                 {hasVoted && walletAddress && (
                   <div className="warning-form" style={{ marginTop: '16px' }}>
                     <Warning content={`You already voted ${userVote ? 'FOR' : 'AGAINST'} this dispute`} />
                   </div>
                 )}
              </div>
            )}
            
            {jobData.remainingSeconds <= 0 && !jobData.isFinalized && (
              <div className="form-groupDC">
                 <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '16px' }}>
                   <div style={{ width: '300px' }}>
                     <Button 
                       label={'Settle Dispute'} 
                       icon='/release.svg' 
                       buttonCss={'downvote-button upvote-button'}
                       onClick={handleSettleDispute}
                     />
                   </div>
                 </div>
                 <div className="warning-form" style={{ marginTop: '16px' }}>
                   <Warning content="Voting period has ended. Anyone can now settle this dispute." />
                 </div>
              </div>
            )}

            {jobData.isFinalized && (
              <div className="form-groupDC">
                 <div style={{ 
                   background: '#f0fdf4', 
                   border: '1px solid #86efac', 
                   padding: '16px', 
                   borderRadius: '8px',
                   textAlign: 'center'
                 }}>
                   <p style={{ margin: 0, fontSize: '14px', color: '#166534', fontWeight: 600 }}>
                     ✅ Dispute has been settled. Winner: {jobData.votesForPercent > 0.5 ? 'FOR' : 'AGAINST'}
                   </p>
                 </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
