import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Web3 from "web3";
import L1ABI from "../../L1ABI.json";
import "./PaymentRefund.css";
import BlueButton from "../../components/BlueButton/BlueButton";
import TransactionItem from "../../components/TransactionItem/TransactionItem";

export default function PaymentRefund() {
  const { jobId } = useParams();
  const [job, setJob] = useState(null);
  const [amount, setAmount] = useState("");
  const [refundDescription, setRefundDescription] = useState("");
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
      const response = await fetch(`https://gateway.pinata.cloud/ipfs/${hash}`);
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
          <Link className="goBack" to={`/payments/${jobId}`}><img className="goBackImage" src="/back.svg" alt="Back Button" /></Link>  
          <div className="titleText">{job.title}</div>
          <Link className="goBack" to={`/payments/${jobId}`} style={{visibility:'hidden'}}><img className="goBackImage" src="/back.svg" alt="Back Button" /></Link>  
         </div>
         <div className="titleBottom"><p>  Contract ID:{" "}
         {formatWalletAddress("0xdEF4B440acB1B11FDb23AF24e099F6cAf3209a8d")}
         </p><img src="/copy.svg" className="copyImage" onClick={() =>
                 handleCopyToClipboard(
                   "0xdEF4B440acB1B11FDb23AF24e099F6cAf3209a8d"
                 )
               }
               /></div>
       </div>

      <div className="release-payment-container">
        <div className="form-container-release">
          <div className="sectionTitle">
            <span id="rel-title">Initiate Refund</span>
          </div>
          <div className="release-payment-body">
               <div id="pDC2" className="form-groupDC">
               Some text explaining what the refund process is goes here 
               </div>
               <div className="form-groupDC amountDC">
                    
                    <input
                        id="amountInput"
                        type="number"
                        step="0.01"
                        placeholder="Amount"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                    />
                </div>
                <div className="form-groupDC">
                    
                    <textarea
                        placeholder="Refund Reason"
                        value={refundDescription}
                        onChange={(e) => setRefundDescription(e.target.value)}
                    ></textarea>
                </div>
                <div className="payment-refund-address">
                    <TransactionItem title={'RECEIVER WALLET ADDRESS'} address={'0xDEAF...fB8B'}/>
                    <div className="refund-address-description">
                        <img src="/warning.svg" alt="" />
                        <span>The funds can only be returned to the Job Giver’s wallet address</span>
                    </div>
                </div>
                <BlueButton label="Initiate Refund" style={{width: '100%', justifyContent: 'center', marginTop: '40px'}}/>
          </div>
        </div>
      </div>
    </>
  );
}
