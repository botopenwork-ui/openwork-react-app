import React, { useEffect, useState } from "react";
import { useWalletConnection } from "../../functions/useWalletConnection";
import { useParams, Link, useNavigate } from "react-router-dom";
import Web3 from "web3";
import "./GetSkillsVerified.css";
import Milestone from "../../components/Milestone/Milestone";
import TransactionItem from "../../components/TransactionItem/TransactionItem";
import DropDown from "../../components/DropDown/DropDown";
import BlueButton from "../../components/BlueButton/BlueButton";

const SKILLITEMS = [
    'UX/UI Design','UX/UI Design','UX/UI Design'
]

function FileUpload() {
    const [selectedImage, setSelectedImage] = useState(null);
    const [preview, setPreview] = useState(null);
  
    const handleImageChange = (e) => {
      const file = e.target.files[0];
      setSelectedImage(file);
      setPreview(URL.createObjectURL(file)); // For preview display
    };
  
    return (
      <div style={{width: '100%'}}>
        <label htmlFor="image">
          <div className="form-fileUpload">
            <img src="/upload.svg" alt="" />
            <span>Click here to upload or drop files here</span>
          </div>
        </label>
        <input id="image" type="file" accept="image/*" onChange={handleImageChange} style={{display:'none'}} />
        {preview && <img src={preview} alt="Image preview" width="100" />}
      </div>
    );
  }

export default function GetSkillsVerified() {
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

  // Timeout guard: stop infinite spinner after 8s
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 8000);
    return () => clearTimeout(t);
  }, []);

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
      console.warn("MetaMask not installed");
    }
  };

  const toggleDropdown = () => {
    setDropdownVisible(!dropdownVisible);
  };

  useEffect(() => {
    async function fetchJobDetails() {
      try {
        const rpcUrl = import.meta.env.VITE_ARBITRUM_MAINNET_RPC_URL || 'https://arb1.arbitrum.io/rpc';
        const web3 = new Web3(rpcUrl); // Using the specified RPC endpoint
        const contractAddress = '0xE8f7963fF3cE9f7dB129e3f619abd71cBB5Bb294';
        const genesisABI = [{ "inputs": [{"name":"jobId","type":"string"}], "name": "getJob", "outputs": [{"type":"tuple","components":[{"name":"jobId","type":"string"},{"name":"jobGiver","type":"address"},{"name":"jobDetailHash","type":"string"},{"name":"status","type":"uint8"},{"name":"totalBudget","type":"uint256"},{"name":"currentMilestone","type":"uint256"},{"name":"jobTaker","type":"address"},{"name":"totalPaid","type":"uint256"},{"name":"paymentChainDomain","type":"uint32"},{"name":"paymentAddress","type":"address"},{"name":"takerOriginChainDomain","type":"uint32"}]}], "stateMutability": "view", "type": "function" }];
        const contract = new web3.eth.Contract(genesisABI, contractAddress);

        // Fetch job details
        const jobDetails = await contract.methods.getJob(jobId).call();
        const ipfsHash = jobDetails[2] || jobDetails.jobDetailHash;
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
          <Link className="goBack" to={`/profile-owner-view/${jobId}`}><img className="goBackImage" src="/back.svg" alt="Back Button" /></Link>  
          <div className="titleText">{job.title}</div>
          <Link className="goBack" to={`/profile-owner-view/${jobId}`} style={{visibility:'hidden'}}><img className="goBackImage" src="/back.svg" alt="Back Button" /></Link>  
         </div>
         <div className="titleBottom"><p>  Contract ID:{" "}
         {formatWalletAddress(walletAddress)}
         </p><img src="/copy.svg" className="copyImage" onClick={() =>
                 handleCopyToClipboard(
                   walletAddress
                 )
               }
               /></div>
       </div>

      <div className="release-payment-container">
        <div className="form-container-release">
          <div className="sectionTitle">
            <span id="rel-title">Skill Verification</span>
          </div>
          <div className="release-payment-body payment-history-body">
            <DropDown label={SKILLITEMS[0]} options={SKILLITEMS} customCSS={'form-dropdown profile-dropdown'}/>
            <div className="profile-item profile-description">
            I'm a Product Designer based in Melbourne, Australia. I enjoy working on product design, design systems, and Webflow projects, but I don't take myself too seriously.
            I’ve worked with some of the world’s most exciting companies, including Coinbase, Stripe, and Linear. I'm passionate about helping startups grow, improve their UX and customer experience, and to raise venture capital through good design.
            </div>
            <FileUpload/>
            <BlueButton label="Submit" style={{width: '100%', justifyContent: 'center'}}/>
          </div>
        </div>
      </div>
    </>
  );
}
