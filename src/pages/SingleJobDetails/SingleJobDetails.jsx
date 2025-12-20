import React, { useEffect, useRef, useState } from "react";
import { Tooltip } from "react-tooltip";
import { useParams } from "react-router-dom";
import { Link } from "react-router-dom";
import Web3 from "web3";
import contractABI from "../../ABIs/nowjc_ABI.json"; // Updated to use the correct ABI
import "./SingleJobDetails.css";
import MenuItem from "../../components/MenuItem";
import ToolTipContent from "../../components/ToolTipContent/ToolTipContent";
import ToolTipMilestone from "../../components/ToolTipMilestone/ToolTipMilestone";

const CONTRACT_ADDRESS = import.meta.env.VITE_NOWJC_CONTRACT_ADDRESS;
const ARBITRUM_SEPOLIA_RPC = import.meta.env.VITE_ARBITRUM_SEPOLIA_RPC_URL;

const MILESTONETOOLTIPITEMS = [
  {
    title: "MILESTONE 1",
    amount: "25",
  },
  {
    title: "MILESTONE 2",
    amount: "25",
  },
  {
    title: "MILESTONE 3",
    amount: "25",
  },
  {
    title: "PLATFORM FEES",
    amount: "5",
  },
  {
    title: "TOTAL COMPENSATION",
    amount: "75",
  },
];

export default function SingleJobDetails() {
  const [buttonFlex2, setButtonFlex2] = useState(false);
  const { jobId } = useParams();
  const [job, setJob] = useState(null);
  const [walletAddress, setWalletAddress] = useState("");
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [amountPaid, setAmountPaid] = useState(0);
  const [amountReceived, setAmountReceived] = useState(0);
  const [amountLocked, setAmountLocked] = useState(0);
  const [buttonsVisible, setButtonsVisible] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [payHover, setPayHover] = useState(false);
  const [receiveHover, SetReceiveHover] = useState(false);
  const coreRef = useRef(null);
  const [isElementReady, setIsElementReady] = useState(false);
  const [milestoneTooltipItems, setMilestoneTooltipItems] = useState(
    MILESTONETOOLTIPITEMS,
  );

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
    if (!isElementReady) return;

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
    if (parseFloat(amount) === 0) return "0";
    const roundedAmount = parseFloat(amount).toFixed(2);
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
        setLoading(true);
        const web3 = new Web3(ARBITRUM_SEPOLIA_RPC);
        const contract = new web3.eth.Contract(contractABI, CONTRACT_ADDRESS);

        // Fetch job details from the contract
        const jobData = await contract.methods.getJob(jobId).call();
        console.log("Job data from contract:", jobData);

        // Fetch job details from IPFS
        let jobDetails = {};
        try {
          if (jobData.jobDetailHash) {
            console.log("📄 Fetching IPFS data from hash:", jobData.jobDetailHash);
            // Try multiple IPFS gateways in case of rate limiting
            const gateways = [
              `https://ipfs.io/ipfs/${jobData.jobDetailHash}`,
              `https://gateway.pinata.cloud/ipfs/${jobData.jobDetailHash}`,
              `https://cloudflare-ipfs.com/ipfs/${jobData.jobDetailHash}`,
              `https://dweb.link/ipfs/${jobData.jobDetailHash}`
            ];
            
            let ipfsResponse = null;
            for (const gateway of gateways) {
              try {
                console.log("🔗 Trying gateway:", gateway);
                ipfsResponse = await fetch(gateway);
                if (ipfsResponse.ok) {
                  console.log("✅ Gateway successful:", gateway);
                  break;
                }
              } catch (e) {
                console.log("❌ Gateway failed:", gateway, e.message);
                continue;
              }
            }
            if (ipfsResponse.ok) {
              jobDetails = await ipfsResponse.json();
              console.log("📋 IPFS jobDetails received:", jobDetails);
              console.log("📝 Job title from IPFS:", jobDetails.title);
              console.log("📄 Job description from IPFS:", jobDetails.description);
              console.log("💰 Job skills from IPFS:", jobDetails.skills);
            } else {
              console.log("❌ IPFS response not ok:", ipfsResponse.status);
            }
          } else {
            console.log("❌ No jobDetailHash found in contract data");
          }
        } catch (ipfsError) {
          console.warn("❌ Failed to fetch IPFS data:", ipfsError);
        }

        // Fetch job giver and job taker profiles
        let jobGiverProfile = null;
        let jobTakerProfile = null;

        try {
          jobGiverProfile = await contract.methods
            .getProfile(jobData.jobGiver)
            .call();
        } catch (error) {
          console.warn("Job giver profile not found");
        }

        if (
          jobData.selectedApplicant &&
          jobData.selectedApplicant !==
            "0x0000000000000000000000000000000000000000"
        ) {
          try {
            jobTakerProfile = await contract.methods
              .getProfile(jobData.selectedApplicant)
              .call();
          } catch (error) {
            console.warn("Job taker profile not found");
          }
        }

        // Calculate amounts from milestones (assuming USDT with 6 decimals)
        const totalBudget = jobData.milestonePayments.reduce(
          (sum, milestone) => {
            return sum + parseFloat(milestone.amount);
          },
          0,
        );

        const totalPaidAmount = parseFloat(jobData.totalPaid);
        const currentMilestone = parseInt(jobData.currentMilestone);
        const jobStatus = Number(jobData.status); // 0=Open, 1=InProgress, 2=Completed, 3=Cancelled

        // Calculate completed milestones (currentMilestone is 1-indexed: 1 = first in progress)
        // Completed = currentMilestone - 1 (milestones before current one)
        // If job is completed, all milestones are done
        const completedMilestones = jobStatus === 2
          ? jobData.finalMilestones.length
          : Math.max(0, currentMilestone - 1);

        console.log("📊 Milestone status:", { currentMilestone, jobStatus, completedMilestones, total: jobData.finalMilestones?.length });

        // Calculate locked amount (remaining milestones)
        let lockedAmount = 0;
        if (currentMilestone <= jobData.finalMilestones.length) {
          for (
            let i = currentMilestone - 1;
            i < jobData.finalMilestones.length;
            i++
          ) {
            if (jobData.finalMilestones[i]) {
              lockedAmount += parseFloat(jobData.finalMilestones[i].amount);
            }
          }
        }

        // Convert from contract units (6 decimals for USDT) to display units
        const formattedTotalBudget = (totalBudget / 1000000).toFixed(2);
        const formattedAmountPaid = (totalPaidAmount / 1000000).toFixed(2);
        const formattedLockedAmount = (lockedAmount / 1000000).toFixed(2);

        // Update milestone tooltip with actual data
        const updatedTooltipItems = [];
        if (jobData.finalMilestones && jobData.finalMilestones.length > 0) {
          jobData.finalMilestones.forEach((milestone, index) => {
            updatedTooltipItems.push({
              title: `MILESTONE ${index + 1}`,
              amount: (parseFloat(milestone.amount) / 1000000).toFixed(2),
            });
          });
        }
        updatedTooltipItems.push({
          title: "PLATFORM FEES",
          amount: "5", // You might want to calculate this based on actual platform fee
        });
        updatedTooltipItems.push({
          title: "TOTAL COMPENSATION",
          amount: formattedTotalBudget,
        });

        setMilestoneTooltipItems(updatedTooltipItems);

        // Set the job state
        setJob({
          jobId: jobData.id,
          title: jobDetails.title || "Untitled Job",
          description: jobDetails.description || "",
          skills: jobDetails.skills || [],
          jobGiver: jobData.jobGiver,
          selectedApplicant: jobData.selectedApplicant,
          status: jobData.status,
          milestones: jobData.finalMilestones,
          currentMilestone: currentMilestone,
          completedMilestones: completedMilestones,
          totalMilestones: jobData.milestonePayments.length,
          jobGiverProfile,
          jobTakerProfile,
          contractId: CONTRACT_ADDRESS,
          ...jobDetails,
        });

        setAmountPaid(parseFloat(formattedAmountPaid));
        setAmountReceived(parseFloat(formattedAmountPaid)); // In this context, amount received = amount paid
        setAmountLocked(parseFloat(formattedLockedAmount));

        setLoading(false);
        setIsElementReady(true);
        console.log("Job details loaded successfully");
      } catch (error) {
        console.error("Error fetching job details:", error);
        setLoading(false);
      }
    }

    if (jobId) {
      fetchJobDetails();
    }
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
      <div className="loading-containerT">
        <div className="loading-icon">
          <img src="/OWIcon.svg" alt="Loading..." />
        </div>
        <div className="loading-message">
          <h1 id="txText">Loading Job Details...</h1>
          <p id="txSubtext">
            Fetching job information from the blockchain. Please wait...
          </p>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="body-container">
        <div className="view-jobs-container">
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              height: "400px",
              fontSize: "18px",
              color: "#666",
            }}
          >
            <p>Job not found.</p>
            <Link
              to="/browse-jobs"
              style={{
                marginTop: "20px",
                color: "#007bff",
                textDecoration: "none",
              }}
            >
              Back to Browse Jobs
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="container">
      <div className="single-job-details">
        <div className="newTitle">
          <div className="titleTop">
            <Link className="goBack" to="/browse-jobs">
              <img className="goBackImage" src="/back.svg" alt="Back Button" />
            </Link>
            <div className="titleText">{job.title}</div>
            <Link
              className="goBack"
              to="/browse-jobs"
              style={{ visibility: "hidden" }}
            >
              <img className="goBackImage" src="/back.svg" alt="Back Button" />
            </Link>
          </div>
          <div className="titleBottom">
            <p>Contract ID: {formatWalletAddress(job.contractId)}</p>
            <img
              src="/copy.svg"
              className="copyImage"
              onClick={() => handleCopyToClipboard(job.contractId)}
            />
          </div>
          <div className="feeContent" style={{ fontWeight: "400 !important" }}>
            {hovered ? (
              <>
                <span>Fees:</span>
                <span>5</span>
                <img src="/xdc.svg" alt="" />
              </>
            ) : (
              <div className="titleBottom">
                {job.completedMilestones} / {job.totalMilestones} Milestones{" "}
                {job.completedMilestones === job.totalMilestones ? "Completed" : "Ongoing"}
              </div>
            )}
            <img src="/warning.svg" alt="" data-tooltip-id="mileston-tooltip" />
            <Tooltip
              id="mileston-tooltip"
              place="right"
              className="custom-tooltip"
              classNameArrow="custom-tooltip-arrow"
            >
              <div className="tooltip-form" style={{ gap: "8px" }}>
                {milestoneTooltipItems.map((item, index) => (
                  <ToolTipMilestone
                    key={index}
                    title={item.title}
                    address={item.address}
                    amount={item.amount}
                  />
                ))}
              </div>
            </Tooltip>
          </div>
        </div>

        <div className="radialMenu" id="radialMenu">
          <img src="/RadiantGlow.png" alt="Radiant Glow" id="radiantGlow" />

          {/* Display Amount Paid */}
          <div
            className="buttonLeftInfo"
            style={{
              opacity: hovered ? "0" : "1",
              pointerEvents: hovered ? "none" : "auto",
            }}
          >
            <div className="amountInfo">
              {formatAmount(amountPaid)}
              <img src="/xdc.svg" alt="USDC Icon" className="usdcIcon" />
            </div>
            <div id="amountLabelLeft" className="amountLabel">
              AMOUNT PAID
            </div>
            <div
              id="addressLeft"
              className="address"
              style={{ cursor: "pointer" }}
              title="Click to copy"
              onClick={() => handleCopyToClipboard(job.jobGiver)}
            >
              {formatWalletAddress(job.jobGiver)}
            </div>
          </div>
          <div
            id="buttonLeftS"
            className={`buttonContainerS-primary ${
              buttonsVisible || hovered ? "hidden-button" : "visible-button"
            }`}
            style={{
              pointerEvents: hovered ? "none" : "auto",
            }}
            onMouseEnter={() => setPayHover(true)}
            onMouseLeave={() => setPayHover(false)}
            data-tooltip-id="left-tooltip"
          >
            <img
              src="/radial-button.svg"
              alt="Button Left"
              className="buttonImageS"
            />
            <img
              src={`/${payHover ? "user1.png" : "user1.png"}`}
              alt="Person Icon"
              className="buttonIconPS"
            />
          </div>
          {/* tooltip for buttonlefts */}
          <Tooltip
            id="left-tooltip"
            place="left"
            className="custom-tooltip"
            classNameArrow="custom-tooltip-arrow"
          >
            <ToolTipContent
              name="Job Giver"
              role="Giver"
              content="Job posting party"
            />
          </Tooltip>

          {/* Display Amount Received */}
          <div
            className="buttonRightInfo"
            style={{
              opacity: hovered ? "0" : "1",
              pointerEvents: hovered ? "none" : "auto",
            }}
          >
            <div className="amountInfo">
              {formatAmount(amountReceived)}
              <img src="/xdc.svg" alt="USDC Icon" className="usdcIcon" />
            </div>
            <div id="amountLabelRight" className="amountLabel">
              AMOUNT RECEIVED
            </div>
            <div
              id="addressRight"
              className="address"
              style={{ cursor: "pointer" }}
              title="Click to copy"
              onClick={() =>
                handleCopyToClipboard(
                  job.selectedApplicant ||
                    "0x0000000000000000000000000000000000000000",
                )
              }
            >
              {formatWalletAddress(
                job.selectedApplicant ||
                  "0x0000000000000000000000000000000000000000",
              )}
            </div>
          </div>
          <div
            id="buttonRightS"
            className={`buttonContainerS-primary ${
              buttonsVisible || hovered ? "hidden-button" : "visible-button"
            }`}
            style={{
              pointerEvents: hovered ? "none" : "auto",
            }}
            onMouseEnter={() => SetReceiveHover(true)}
            onMouseLeave={() => SetReceiveHover(false)}
            data-tooltip-id="right-tooltip"
          >
            <img
              src="/radial-button.svg"
              alt="Button Right"
              className="buttonImageS"
            />
            <img
              src={`/${receiveHover ? "user.png" : "user.png"}`}
              alt="Person Icon"
              className="buttonIconPS"
            />
          </div>
          {/* tooltip for buttonrights */}
          <Tooltip
            id="right-tooltip"
            place="right"
            className="custom-tooltip"
            classNameArrow="custom-tooltip-arrow"
          >
            <ToolTipContent
              name="Job Taker"
              point="4.9"
              role="Taker"
              content="Selected applicant for this job"
            />
          </Tooltip>

          {/* Links with hover effect */}
          <Link
            to={`/job-deep-view/${job.jobId}`}
            id="buttonTopS"
            className={`buttonContainerS ${hovered ? "visible-home" : ""}`}
            style={{ display: buttonFlex2 ? "flex" : "none" }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            <img
              src="/radial-button.svg"
              alt="Button Top"
              className="buttonImageS"
            />
            <img src="/info.svg" alt="Pay Icon" className="buttonIconHover" />
            <span className="buttonText">Job Details</span>
          </Link>
          <Link
            to={`/release-payment/${job.jobId}`}
            id="buttonBottomS"
            className={`buttonContainerS ${hovered ? "visible-home" : ""}`}
            style={{ display: buttonFlex2 ? "flex" : "none" }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            <img
              src="/radial-button.svg"
              alt="Button Top"
              className="buttonImageS"
            />
            <img src="/pay.svg" alt="Pay Icon" className="buttonIconHover" />
            <span className="buttonText">Pay Now</span>
          </Link>
          <Link
            to={`/job-update/${job.jobId}`}
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
              src="/update.svg"
              alt="Info Icon"
              className="buttonIconHover"
            />
            <span className="buttonText">Job Update</span>
          </Link>
          <Link
            to={`/raise-dispute/${job.jobId}`}
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
              src="/dispute.svg"
              alt="Dispute Icon"
              className="buttonIconHover"
            />
            <span className="buttonText">Raise Dispute</span>
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
              {formatAmount(amountLocked)}
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
