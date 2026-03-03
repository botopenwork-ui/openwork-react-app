import React, { useEffect, useState } from "react";
import { useWalletConnection } from "../../functions/useWalletConnection";
import { useParams, Link, useNavigate } from "react-router-dom";
import Web3 from "web3";
import "./VotingHistory.css";
import Milestone from "../../components/Milestone/Milestone";
import TransactionItem from "../../components/TransactionItem/TransactionItem";
import VoteItem from "../../components/VoteItem/VoteItem";
import ProgressBar from "../../components/ProgressBar/ProgressBar";

export default function VotingHistory() {
  const { walletAddress } = useWalletConnection();
  const { jobId } = useParams();
  const [job, setJob] = useState(null);
  const [releaseAmount, setReleaseAmount] = useState("");
  const [note, setNote] = useState("");
  const [account, setAccount] = useState(null);
  const navigate = useNavigate();
  const [loadingT, setLoadingT] = useState("");
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
        void 0 /* clipboard copy acknowledged */;
      })
      .catch((err) => {
        console.error("Failed to copy: ", err);
      });
  };

  function formatWalletAddress(address) {
    if (!address) return "";
    const start = address.substring(0, 6);
    const end = address.substring(address.length - 4);
    return `${start}....${end}`;
  }

  const toggleDropdown = () => {
    setDropdownVisible(!dropdownVisible);
  };

  useEffect(() => {
    async function fetchJobDetails() {
      try {
        const rpcUrl = import.meta.env.VITE_ARBITRUM_MAINNET_RPC_URL || 'https://arb1.arbitrum.io/rpc';
        const web3 = new Web3(rpcUrl); // Using the specified RPC endpoint
        const contractAddress = '0xE8f7963fF3cE9f7dB129e3f619abd71cBB5Bb294';
        const genesisABI = [
          { "inputs": [{"name":"jobId","type":"string"}], "name": "getJob", "outputs": [{"type":"tuple","components":[{"name":"jobId","type":"string"},{"name":"jobGiver","type":"address"},{"name":"jobDetailHash","type":"string"},{"name":"status","type":"uint8"},{"name":"totalBudget","type":"uint256"},{"name":"currentMilestone","type":"uint256"},{"name":"jobTaker","type":"address"},{"name":"totalPaid","type":"uint256"},{"name":"paymentChainDomain","type":"uint32"},{"name":"paymentAddress","type":"address"},{"name":"takerOriginChainDomain","type":"uint32"}]}], "stateMutability": "view", "type": "function" }
        ];
        const contract = new web3.eth.Contract(genesisABI, contractAddress);

        // Fetch job details
        const jobDetails = await contract.methods.getJob(jobId).call();
        const ipfsHash = jobDetails[2] || jobDetails.jobDetailHash;
        const ipfsData = await fetchFromIPFS(ipfsHash);

        // Fetch proposed amount using getApplicationProposedAmount
        const proposedAmountWei = (jobDetails[4] || jobDetails.totalBudget || 0);

        // Fetch escrow amount using getJobEscrowAmount
        const escrowAmountWei = (jobDetails[7] || jobDetails.totalPaid || 0);

        // Convert amounts from USDC units (6 decimals)
        const proposedAmount = web3.utils.fromWei(proposedAmountWei, "mwei");
        const currentEscrowAmount = web3.utils.fromWei(escrowAmountWei, "mwei");

        const amountReleased = proposedAmount - currentEscrowAmount;

        setJob({
          jobId,
          employer: jobDetails[1] || jobDetails.jobGiver,
          escrowAmount: currentEscrowAmount,
          isJobOpen: (Number(jobDetails[3] || jobDetails.status) === 0),
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
      const response = await fetch(`/api/ipfs/content/${hash}`);
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
      <div className="newTitle">
         <div className="titleTop">
          <Link className="goBack" to={`/members-governance/${jobId}`}><img className="goBackImage" src="/back.svg" alt="Back Button" /></Link>  
          <div className="titleText">{job.title}</div>
          <Link className="goBack" to={`/members-governance/${jobId}`} style={{visibility:'hidden'}}><img className="goBackImage" src="/back.svg" alt="Back Button" /></Link>  
         </div>
         <div className="titleBottom"><p> formatWalletAddress(walletAddress){" "}•{" "}
         {formatWalletAddress(walletAddress)}
         </p><img src="/copy.svg" className="copyImage" onClick={() =>
                 handleCopyToClipboard(
                   walletAddress
                 )
               }
               /></div>
       </div>

      <div className="release-payment-container" style={{width:536}}>
        <div className="form-container-release">
          <div className="sectionTitle accuracy">
            <span id="rel-title" style={{paddingTop:'0px'}}>Resolution Accuracy</span>
            <ProgressBar percent={70} width={133}/>
          </div>
          <div className="release-payment-body payment-history-body">
            <VoteItem imgSrc={'/user.svg'} name='mollie2504' status={'favour'} date={'7 May, 2024'} content={'I think this person should be removed from the Skill Oracle because they are not at all active!'}/>
            <VoteItem imgSrc={'/user.svg'} name='mollie2504' status={'against'} date={'7 May, 2024'} content={'I think this person should be removed from the Skill Oracle because they are not at all active!'}/>          </div>
        </div>
      </div>
    </>
  );
}
