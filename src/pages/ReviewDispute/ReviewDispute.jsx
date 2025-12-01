import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Web3 from "web3";
import GenesisABI from "../../ABIs/genesis_ABI.json";
import "./ReviewDispute.css";
import Button from "../../components/Button/Button";
import VoteBar from "../../components/VoteBar/VoteBar";
import { formatAddress } from "../../utils/oracleHelpers";

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

        // Calculate time remaining
        const votingPeriodSeconds = 60 * 60; // 60 minutes
        const now = Math.floor(Date.now() / 1000);
        const elapsed = now - Number(disputeData.timeStamp);
        const remaining = votingPeriodSeconds - elapsed;
        const daysLeft = remaining > 0 ? Math.ceil(remaining / (24 * 60 * 60)) : 0;

        setDispute(disputeData);
        setVoters(votersData);
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
          daysLeft,
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
          <h1 id="txText">Transaction in Progress</h1>
          <p id="txSubtext">If the transaction goes through, we'll redirect you to your contract</p>
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
            <span className="left-days">{jobData.daysLeft} days left</span>
          </div>
          <div className="release-payment-body">
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
                        <span>Total Votes: {jobData.totalVotes}</span>
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
            {jobData.isVotingActive && !jobData.isFinalized && (
              <div className="form-groupDC">
                 <div className="vote-button-section">
                      <Button label={'Downvote'} icon='/against.svg' buttonCss={'downvote-button'}/>
                      <Button label={'Upvote'} icon='/favour.svg' buttonCss={'downvote-button upvote-button'}/>
                 </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
