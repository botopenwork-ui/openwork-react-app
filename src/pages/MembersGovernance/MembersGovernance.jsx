import React, { useEffect, useRef, useState } from "react";
import { Tooltip } from "react-tooltip";
import { useParams } from "react-router-dom";
import { Link } from "react-router-dom";
import Web3 from "web3";
import L1ABI from "../../L1ABI.json"; // Import the L1 contract ABI
import "./MembersGovernance.css";
import MenuItem from "../../components/MenuItem";
import ToolTipContent from "../../components/ToolTipContent/ToolTipContent";
import ToolTipMilestone from "../../components/ToolTipMilestone/ToolTipMilestone";

export default function MembersGovernance() {
  const [buttonFlex2, setButtonFlex2] = useState(false);
  const { jobId } = useParams();
  const [job, setJob] = useState(null);
  const [walletAddress, setWalletAddress] = useState("");
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
        alert("Address copied to clipboard");
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
        const web3 = new Web3("https://erpc.xinfin.network"); // Using the RPC URL
        const contractAddress = "0x00844673a088cBC4d4B4D0d63a24a175A2e2E637"; // Address of the OpenWorkL1 contract
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

        // Log the raw wei values
        console.log("Proposed Amount (raw wei):", proposedAmountWei);
        console.log("Escrow Amount (raw wei):", escrowAmountWei);

        // Convert amounts from USDC units (6 decimals)
        const proposedAmount = web3.utils.fromWei(proposedAmountWei, "mwei");
        const currentEscrowAmount = web3.utils.fromWei(
          escrowAmountWei,
          "mwei"
        );

        const receivedAmount = proposedAmount - currentEscrowAmount;

        setJob({
          jobId,
          employer: jobDetails.employer,
          jobTaker: jobDetails.jobTaker,
          escrowAmount: currentEscrowAmount,
          isJobOpen: jobDetails.isOpen,
          ...ipfsData,
        });

        setAmountPaid(proposedAmount);
        setAmountReceived(receivedAmount);

        setLoading(false); // Stop loading animation after fetching data
        setIsElementReady(true);
        console.log("elements ready!!!!");
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

  const handleNavigation = () => {
    window.open(
      "https://drive.google.com/file/d/1tdpuAM3UqiiP_TKJMa5bFtxOG4bU_6ts/view",
      "_blank"
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
    return <div></div>; // Blank div while loading
  }

  return (
    <main className="container">
      <div className="single-job-details">
        <div className="newTitle">
          <div className="titleTop" style={{gap:75}}>
            <Link className="goBack" to="/browse-jobs">
              <img className="goBackImage" src="/back.svg" alt="Back Button" />
            </Link>
            <div className="titleText">Governance</div>
            <Link className="goBack" to="/browse-jobs" style={{visibility:'hidden'}}>
              <img className="goBackImage" src="/back.svg" alt="Back Button" />
            </Link>
          </div>
          <div className="titleBottom">
            <p>
              {" "}
              molliehall2504{" "}•{" "}
              {formatWalletAddress(
                "0xdEF4B440acB1B11FDb23AF24e099F6cAf3209a8d"
              )}
            </p>
            <img
              src="/copy.svg"
              className="copyImage"
              onClick={() =>
                handleCopyToClipboard(
                  "0xdEF4B440acB1B11FDb23AF24e099F6cAf3209a8d"
                )
              }
            />
          </div>
        </div>

        <div className="radialMenu" id="radialMenu">
          <img src="/RadiantGlow.png" alt="Radiant Glow" id="radiantGlow" />
          <Link
            to={`/voting-history/${job.jobId}`}
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
            <img
              src="/voting-history.svg"
              alt="Info Icon"
              className="buttonIconHover"
            />
            <span className="buttonText">Voting History</span>
          </Link>
          <Link
            to={`/remove-member/${job.jobId}`}
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
              src="/remove-member.svg"
              alt="Disoute Icon"
              className="buttonIconHover"
            />
            <span className="buttonText">Remove Member</span>
          </Link>
          <div
            id="core"
            className="coreContainer"
            ref={coreRef}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            <img src="/core.svg" alt="Core" className="coreImage" />
          </div>
        </div>
      </div>
    </main>
  );
}
