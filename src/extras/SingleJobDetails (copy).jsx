import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Web3 from "web3";
import L1ABI from "./L1ABI.json"; // Import the L1 contract ABI
import "./SingleJobDetails.css";

export default function SingleJobDetails() {
  const { jobId } = useParams();
  const [job, setJob] = useState(null);
  const [walletAddress, setWalletAddress] = useState("");
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const address = "0x7ad8f34CF39FEf9fEFaE67e5F9eCbc2Cb009254f"; // Ensure the address is defined in the component's scope


  const handleCopyToClipboard = (address) => {
    navigator.clipboard.writeText(address)
      .then(() => {
        alert('Address copied to clipboard');
      })
      .catch((err) => {
        console.error('Failed to copy: ', err);
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
        const web3 = new Web3(window.ethereum);
        const accounts = await web3.eth.getAccounts();
        setWalletAddress(accounts[0]);

        const contractAddress = "0x97c110890e012756eb4924a1993ea49c756ba4c4"; // Address of the OpenWorkL1 contract
        const contract = new web3.eth.Contract(L1ABI, contractAddress);

        // Fetch job details
        const jobDetails = await contract.methods.getJobDetails(jobId).call();
        const ipfsHash = jobDetails.jobDetailHash;
        const ipfsData = await fetchFromIPFS(ipfsHash);

        setJob({
          jobId,
          employer: jobDetails.employer,
          jobTaker: jobDetails.jobTaker, // Assuming jobDetails contains jobTaker info
          escrowAmount: web3.utils.fromWei(jobDetails.escrowAmount, "ether"),
          isJobOpen: jobDetails.isOpen,
          ...ipfsData,
        });
      } catch (error) {
        console.error("Error fetching job details:", error);
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

  function formatWalletAddress(address) {
    if (!address) return "";
    const start = address.substring(0, 6);
    const end = address.substring(address.length - 4);
    return `${start}....${end}`;
  }

  if (!job) {
    return <div>Loading...</div>;
  }

  return (
    <main className="container">
      <header className="headerS">
        <Link to="/" className="logoMark">
          <img src="/OWIcon.svg" alt="OWToken Icon on this page" id="owTokenSingle2" />
        </Link>
        {walletAddress ? (
          <div className="dropdownButtonContainer">
            <div
              className={`dropdownButton ${dropdownVisible ? "clicked" : ""}`}
              onClick={toggleDropdown}
            >
              <img
                src="/dropimage.svg"
                alt="Dropdown Icon"
                className="dropdownIcon"
              />
              <div className="walletAddressText">{walletAddress}</div>
              <img src="/down.svg" alt="Down Icon" className="dropdownIcon" />
            </div>
            {dropdownVisible && (
              <div className="dropdownMenu">
                <div className="dropdownMenuItem">
                  <span
                    className="dropdownMenuItemText"
                    style={{ color: "darkgray" }}
                  >
                    Read Whitepaper
                  </span>
                  <img
                    src="/OWToken.svg"
                    alt="OWToken Icon"
                    className="dropdownMenuItemIcon"
                  />
                </div>
                <div className="dropdownMenuItem" onClick={disconnectWallet}>
                  <span
                    className="dropdownMenuItemText"
                    style={{ color: "firebrick" }}
                  >
                    Disconnect Wallet
                  </span>
                  <img
                    src="/cross.svg"
                    alt="Cross Icon"
                    className="dropdownMenuItemIcon"
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <img
            src="/connect.svg"
            alt="Connect Button"
            id="connectButton"
            className="connectButton"
            onClick={connectWallet}
          />
        )}
      </header>
      <div className="job-details">
        <div className="title-container">
          <div className="flag1">
            <Link to="/view-jobs" id="backButtonS">
              <img src="/back.svg" alt="Back" className="backIconS" />
            </Link>
            <h1>{job.title}</h1>
          </div>
          <div className="flag2">
            <p 
              id="contractID"
              onClick={() => handleCopyToClipboard(address)}
              style={{ cursor: 'pointer' }}
              title="Click to copy"
            >
              Contract Id:{" "}
              {formatWalletAddress(
                "0x7ad8f34CF39FEf9fEFaE67e5F9eCbc2Cb009254f",
              )}{" "}
            </p>
            <img src="/copy.svg" alt="Copy" className="copyIcon" />
          </div>
        </div>
        <div className="radialMenu">
          <img src="/RadiantGlow.png" alt="Radiant Glow" id="radiantGlow" />
          <img src="/Core.png" alt="The Core" id="core" />
          <div className="buttonLeftInfo">
            <div className="amountInfo">
              {job.escrowAmount}
              <img src="/usdc.svg" alt="USDC Icon" className="usdcIcon" />
            </div>
            <div className="amountLabel">AMOUNT PAID</div>
            <div className="address">{formatWalletAddress(job.employer)}</div>
          </div>
          <div id="buttonLeftS" className="buttonContainerS">
            <img src="/Core.png" alt="Button Left" className="buttonImageS" />
            <img src="/person.svg" alt="Person Icon" className="buttonIconPS" />
          </div>
          <div className="buttonRightInfo">
            <div className="amountInfo">
              {job.escrowAmount}
              <img src="/usdc.svg" alt="USDC Icon" className="usdcIcon" />
            </div>
            <div className="amountLabel">AMOUNT RECIEVED</div>
            <div className="address">{formatWalletAddress(job.jobTaker)}</div>
          </div>
          <div id="buttonRightS" className="buttonContainerS">
            <img src="/Core.png" alt="Button Right" className="buttonImageS" />
            <img src="/person.svg" alt="Person Icon" className="buttonIconPS" />
          </div>
          <Link
            to={`/release-payment/${job.jobId}`}
            id="buttonTopS"
            className="buttonContainerS hidden"
          >
            <img src="/Core.png" alt="Button Top" className="buttonImageS" />
            <img src="/pay.svg" alt="Pay Icon" className="buttonIconHover" />
            <span className="buttonText">Pay Now</span>
          </Link>
          <Link
            to={`/job-deep-view/${job.jobId}`}
            id="buttonBottomLeftS"
            className="buttonContainerS hidden"
          >
            <img
              src="/Core.png"
              alt="Button Bottom Left"
              className="buttonImageS"
            />
            <img src="/info.svg" alt="Info Icon" className="buttonIconHover" />
            <span className="buttonText">Job Details</span>
          </Link>
          <Link
            to={`/job-update/${job.jobId}`}
            id="buttonBottomRightS"
            className="buttonContainerS hidden"
          >
            <img
              src="/Core.png"
              alt="Button Bottom Right"
              className="buttonImageS"
            />
            <img src="/update.svg" alt="Update Icon" className="buttonIconHover" />
            <span className="buttonText">Job Update</span>
          </Link>
          <div id="core" className="coreContainer">
            <img src="/Core.png" alt="Core" className="coreImage" />
            <span className="coreText">
              {job.escrowAmount}{" "}
              <img src="/usdc.svg" alt="USDC Icon" className="usdcIcon" id="usdc" />
              <br />
              <p id="amount-locked">AMOUNT LOCKED</p>
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}

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
