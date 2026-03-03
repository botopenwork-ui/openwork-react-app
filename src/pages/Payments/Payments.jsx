import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Link } from "react-router-dom";
import Web3 from "web3";
import "./Payments.css";
import { useWalletConnection } from "../../functions/useWalletConnection";

export default function Payments() {
  const { walletAddress } = useWalletConnection();
  const [buttonFlex2, setButtonFlex2] = useState(false);
  const { jobId } = useParams();
  const [job, setJob] = useState(null);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [loading, setLoading] = useState(true); // State for loading animation
  const [amountPaid, setAmountPaid] = useState(0); // State for amount paid
  const [amountReceived, setAmountReceived] = useState(0); // State for amount received
  const [buttonsVisible, setButtonsVisible] = useState(false);
  const [hovered, setHovered] = useState(false); // State to track hover
  const [payHover, setPayHover] = useState(false);
  const [receiveHover, SetReceiveHover] = useState(false);
  const coreRef = useRef(null); // Create a ref for the element
  const [isElementReady, setIsElementReady] = useState(false); // State to track element readiness

  function formatWalletAddressH(address) {
    if (!address) return "";
    const start = address.substring(0, 4);
    const end = address.substring(address.length - 4);
    return `${start}....${end}`;
  }

  useEffect(() => {
    if (buttonFlex2) {
      console.log("buttonFlex2 is now true");
    }
  }, [buttonFlex2]);

  useEffect(() => {
    if (!isElementReady) return; // Exit if element is not ready

    const coreHome = coreRef.current;

    const handleMouseEnter = () => {
      setButtonFlex2(true);
    };

    const handleMouseLeave = () => {};

    if (coreHome) {
      coreHome.addEventListener("mouseenter", handleMouseEnter);
      coreHome.addEventListener("mouseleave", handleMouseLeave);
    }

    return () => {
      if (coreHome) {
        coreHome.removeEventListener("mouseenter", handleMouseEnter);
        coreHome.removeEventListener("mouseleave", handleMouseLeave);
      }
    };
  }, [isElementReady]);

  const formatAmount = (amount) => {
    if (parseFloat(amount) === 0) return "0"; // Handle zero value without decimal
    const roundedAmount = parseFloat(amount).toFixed(2); // Rounds to 2 decimal places
    return roundedAmount.length > 5 ? roundedAmount.slice(0, 8) : roundedAmount;
  };


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

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        setWalletAddress(accounts[0]);
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
        const GENESIS = '0xE8f7963fF3cE9f7dB129e3f619abd71cBB5Bb294';
        const genesisABI = [
          { "inputs": [{"name":"jobId","type":"string"}], "name": "getJob", "outputs": [{"type":"tuple","components":[{"name":"jobId","type":"string"},{"name":"jobGiver","type":"address"},{"name":"jobDetailHash","type":"string"},{"name":"status","type":"uint8"},{"name":"totalBudget","type":"uint256"},{"name":"currentMilestone","type":"uint256"},{"name":"jobTaker","type":"address"},{"name":"totalPaid","type":"uint256"},{"name":"paymentChainDomain","type":"uint32"},{"name":"paymentAddress","type":"address"},{"name":"takerOriginChainDomain","type":"uint32"}]}], "stateMutability": "view", "type": "function" },
          { "inputs": [{"name":"jobId","type":"string"}], "name": "getEscrowBalance", "outputs": [{"type":"uint256"}], "stateMutability": "view", "type": "function" }
        ];
        const web3 = new Web3(rpcUrl);
        const contract = new web3.eth.Contract(genesisABI, GENESIS);

        const jobData = await contract.methods.getJob(jobId).call();
        const ipfsHash = jobData.jobDetailHash || jobData[2];
        const ipfsData = ipfsHash ? await fetchFromIPFS(ipfsHash) : {};

        let escrowBalance = 0;
        let totalBudget = 0;
        try {
          const rawEscrow = await contract.methods.getEscrowBalance(jobId).call();
          escrowBalance = Number(rawEscrow) / 1e6;
        } catch (_) {}
        totalBudget = Number(jobData.totalBudget || jobData[4] || 0) / 1e6;
        const totalPaid = Number(jobData.totalPaid || jobData[7] || 0) / 1e6;

        setJob({
          jobId,
          employer: jobData.jobGiver || jobData[1],
          jobTaker: jobData.jobTaker || jobData[6],
          escrowAmount: escrowBalance,
          isJobOpen: (jobData.status || jobData[3]) === '0' || (jobData.status || jobData[3]) === 0,
          ...ipfsData,
        });

        setAmountPaid(totalBudget);
        setAmountReceived(totalPaid);

        setLoading(false);
        setIsElementReady(true);
      } catch (error) {
        console.error("Error fetching job details:", error);
        setLoading(false);
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
    window.open(
      "https://drive.google.com/file/d/1tdpuAM3UqiiP_TKJMa5bFtxOG4bU_6ts/view",
      "_blank",
    );
  };

  function formatWalletAddress(address) {
    if (!address) return "";
    const start = address.substring(0, 6);
    const end = address.substring(address.length - 4);
    return `${start}....${end}`;
  }

  if (loading) {
    return (
      <div className="loading-container">
        <img src="/OWIcon.svg" alt="Loading..." className="loading-icon" />
      </div>
    );
  }

  if (!job) {
    return <div style={{ padding: "40px", color: "#6b7280", textAlign: "center" }}>Loading job data...</div>;
  }

  return (
    <main className="container">
      <div className="single-job-details">
        <div className="newTitle">
          <div className="titleTop">
            <Link className="goBack" to="/browse-jobs">
              <img className="goBackImage" src="/back.svg" alt="Back Button" />
            </Link>
            <div className="titleText" style={{fontWeight:'550'}}>{"Payments"}</div>
            <Link className="goBack" to="/browse-jobs" style={{visibility: 'hidden'}}>
              <img className="goBackImage" src="/back.svg" alt="Back Button" />
            </Link>
          </div>
          <div className="titleBottom">
            <p>
              {" "}
              Contract ID:{" "}
              {formatWalletAddress(
                walletAddress,
              )}
            </p>
            <img
              src="/copy.svg"
              className="copyImage"
              onClick={() =>
                handleCopyToClipboard(
                  walletAddress,
                )
              }
            />
          </div>
          <div className="feeContent" style={{fontWeight:'400'}}>
            <>
              <span>Fees:</span>
              <span>5</span>
              <img src="/xdc.svg" alt="" />
            </>
              <img src="/warning.svg" alt="" data-tooltip-id="mileston-tooltip"/>
          </div>
        </div>

        <div className="radialMenu" id="radialMenu">
          <img src="/RadiantGlow.png" alt="Radiant Glow" id="radiantGlow" />

          {/* Links with hover effect */}
          <Link
            to={`/payment-history/${job.jobId}`}
            id="buttonBottomLeftS"
            className={`buttonContainerS ${hovered ? "visible-home" : ""}`}
            style={{ display: buttonFlex2 ? "flex" : "none" }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            <img
              src="/radial-button.svg"
              alt="Button Bottom Left"
              className="buttonImageS"
            />
            <img src="/payment_history.svg" alt="Info Icon" className="buttonIconHover" />
            <span className="buttonText">Payment History</span>
          </Link>
          <Link
            to={`/payment-refund/${job.jobId}`}
            id="buttonBottomRightS"
            className={`buttonContainerS ${hovered ? "visible-home" : ""}`}
            style={{ display: buttonFlex2 ? "flex" : "none" }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            <img
              src="/radial-button.svg"
              alt="Button Bottom Right"
              className="buttonImageS"
            />
            <img
              src="/refund.svg"
              alt="Disoute Icon"
              className="buttonIconHover"
            />
            <span className="buttonText">Refund</span>
          </Link>
          <div
            id="core"
            className="coreContainer"
            ref={coreRef}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            <img src="/core.svg" alt="Core" className="coreImage" />
            <span className="coreText">
              {formatAmount(job.escrowAmount)}{" "}
              <img
                src="/xdc.svg"
                alt="USDC Icon"
                className="usdcIcon"
                id="usdc"
              />
              <br />
              <p id="amount-locked">AMOUNT LOCKED</p>
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}
