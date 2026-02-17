import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Web3 from "web3";
import L1ABI from "../../L1ABI.json";
import "./RemovalApplication.css";
import Button from "../../components/Button/Button";
import VoteBar from "../../components/VoteBar/VoteBar";
import BackButton from "../../components/BackButton/BackButton";
import StatusButton from "../../components/StatusButton/StatusButton";

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

export default function RemovalApplication() {
  const { jobId } = useParams();
  const [job, setJob] = useState(null);
  const [releaseAmount, setReleaseAmount] = useState("");
  const [note, setNote] = useState("");
  const [account, setAccount] = useState(null);
  const navigate = useNavigate();
  const [loadingT, setLoadingT] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [loading, setLoading] = useState(true); // Initialize loading state

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
    async function fetchJobDetails() {
      try {
        const web3 = new Web3("https://erpc.xinfin.network"); // Using the specified RPC endpoint
        const contractAddress = "0x00844673a088cBC4d4B4D0d63a24a175A2e2E637";
        const contract = new web3.eth.Contract(L1ABI, contractAddress);

        // Fetch job details
        const jobDetails = await contract.methods.getJobDetails(jobId).call();
        const ipfsHash = jobDetails.jobDetailHash;
        const ipfsData = await fetchFromIPFS(ipfsHash);

        // Fetch proposed amount using getApplicationProposedAmount
        const proposedAmountWei = await contract.methods
          .getApplicationProposedAmount(jobId)
          .call();

        // Fetch escrow amount using getJobEscrowAmount
        const escrowAmountWei = await contract.methods
          .getJobEscrowAmount(jobId)
          .call();

        // Convert amounts from USDC units (6 decimals)
        const proposedAmount = web3.utils.fromWei(proposedAmountWei, "mwei");
        const currentEscrowAmount = web3.utils.fromWei(escrowAmountWei, "mwei");

        const amountReleased = proposedAmount - currentEscrowAmount;

        setJob({
          jobId,
          employer: jobDetails.employer,
          escrowAmount: currentEscrowAmount,
          isJobOpen: jobDetails.isOpen,
          totalEscrowAmount: proposedAmount,
          amountLocked: currentEscrowAmount,
          amountReleased: amountReleased,
          ...ipfsData,
        });

        setLoading(false); // Stop loading animation after fetching data
      } catch (error) {
        console.error("Error fetching job details:", error);
        setLoading(false); // Ensure loading stops even if there is an error
      }
    }

    fetchJobDetails();
  }, [jobId]);


  const fetchFromIPFS = async (hash) => {
    try {
      const response = await fetch(`https://gateway.lighthouse.storage/ipfs/${hash}`);
      return await response.json();
    } catch (error) {
      console.error("Error fetching data from IPFS:", error);
      return {};
    }
  };

  const handleNavigation = () => {
    window.open("https://drive.google.com/file/d/1tdpuAM3UqiiP_TKJMa5bFtxOG4bU_6ts/view", "_blank");
  };

  const formatAmount = (amount) => {
    if (parseFloat(amount) === 0) return "0"; // Handle zero value without decimal
    const roundedAmount = parseFloat(amount).toFixed(2); // Rounds to 2 decimal places
    return roundedAmount.length > 5 ? roundedAmount.slice(0, 8) : roundedAmount;
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

  if (!job) {
    return <div>Loading...</div>;
  }

  return (
    <>
      {/* <div className="newTitle">
         <div className="titleTop">
            <Link className="goBack" to={`/job-details/${jobId}`}><img className="goBackImage" src="/back.svg" alt="Back Button" /></Link>  
            <div className="titleText" style={{fontWeight:'550'}}>{job.title}</div>
         </div>
         <div className="titleBottom"><p>  Contract ID:{" "}
         {formatWalletAddress("0xdEF4B440acB1B11FDb23AF24e099F6cAf3209a8d")}
         </p><img src="/copy.svg" className="copyImage" onClick={() =>
                 handleCopyToClipboard(
                   "0xdEF4B440acB1B11FDb23AF24e099F6cAf3209a8d"
                 )
               }
               /></div>
       </div> */}

      <div className="release-payment-container">
        <div className="form-container-release">
        <div className="form-header">
          <BackButton to={`/job-update`} style={{gap: '20px', whiteSpace:'pre'}} title="Member Removal Application"/>
          <StatusButton status={'Failed'} statusCss={'failed-status'} />
        </div>
          <div className="form-body">
            <div>
                <div className="detail-row">
                    <span className="detail-label">PROPOSED BY</span>
                    <div className="detail-profile">
                    <span className="detail-value-address">
                        <img src="/user.png" alt="JobGiver" className="Job" />
                        <p>Mollie Hall</p>
                    </span>
                    <a href="/profile" className="view-profile">
                        <span>View Profile</span>
                        <img src="/view_profile.svg" alt="" />
                    </a>
                    </div>
                </div>
            </div>
            <div>
                <div className="detail-row">
                    <span className="detail-label">REQUEST TO RECRUIT</span>
                    <div className="detail-profile">
                    <span className="detail-value-address">
                        <img src="/user.png" alt="JobGiver" className="Job" />
                        <p>Mollie Hall</p>
                    </span>
                    <a href="/profile" className="view-profile">
                        <span>View Profile</span>
                        <img src="/view_profile.svg" alt="" />
                    </a>
                    </div>
                </div>
            </div>
            <div className="profile-about-item">
                <span>SKILL ORACLE</span>
                <div className="profile-about-content">
                    <span>UX/UI Oracle</span>
                </div>
            </div>
            <div className="detail-row">
                <span className="detail-label">REASON FOR REMOVAL</span>
                <div className="detail-value reason-removal">
                    <p>I think this person should be removed from the Skill Oracle because they are not at all active!</p>
                </div>
            </div>

            <div className="token-section">
               <div className="job-detail-sectionR" style={{width:'100%'}}>
                    <JobdetailItem title="TOKENS IN FAVOUR" amount={'1M'} token={true}/>
               </div>
               <div className="job-detail-sectionR" style={{width:'100%'}}>
                    <JobdetailItem title="TOKENS AGAINST" amount={'250K'} token={true}/>
               </div>
            </div>
            <div style={{marginTop:'32px'}}>
                <VoteBar
                    totalVotes={1}
                    votesInFavor={0.25}
                    votesAgainst={0}
                    threshold={75}
                />
            </div>
            <div className="job-detail-sectionR vote-conditions">
                <div className="vote-conditions-header">
                CONDITIONS TO BE MET BEFORE TIME LOCK PERIOD
                </div>
                <div className="vote-conditions-content">
                    <span>•</span>
                    <span>1M minimum votes</span>
                    <span style={{color:'#767676'}}>(Current: 0.25M votes)</span>
                </div>
                <div className="vote-conditions-content">
                    <span>•</span>
                    <span>75% minimum approval percentage</span>
                    <span style={{color:'#767676'}}>(Current: 0.25M votes)</span>
                </div>
                <a href="/voting-history" className="vote-conditions-history">
                    <span>Vote History</span>
                    <img src="/view-history.svg" alt="" />
                </a>
            </div>
            <div className="job-detail-sectionR">
                <JobdetailItem title="RESOLUTION COMPENSATION" icon={true} amount={'250'}/>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
