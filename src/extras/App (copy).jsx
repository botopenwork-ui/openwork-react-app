import React, { useState } from "react";
import { Routes, Route, Link } from "react-router-dom";
import "./App.css";
import DirectContractForm from "./DirectContractForm";
import ViewJobs from "./ViewJobs";
import SingleJobDetails from "./SingleJobDetails";
import JobDeepView from "./JobDeepView";
import JobInfo from "./JobInfo";
import ReleasePayment from "./ReleasePayment";
import JobUpdate from "./JobUpdate";
import AddUpdate from "./AddUpdate";

function MainPage() {
  const [walletAddress, setWalletAddress] = useState("");
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [buttonsVisible, setButtonsVisible] = useState(false);

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

  return (
    <main className="container-home">
      <header className="header-home">
        <img
          src="/Logo.jpg"
          alt="Openwork Logo"
          id="logo-home"
          className={`logo-home ${hovering ? "hidden-home" : "visible-home"}`}
        />
        <img
          src="/OWIcon.svg"
          alt="OWToken Icon"
          id="owToken-home"
          className={hovering ? "visible-home" : ""}
        />
        {walletAddress ? (
          <div className="dropdownButtonContainer-home">
            <div
              className={`dropdownButton-home ${dropdownVisible ? "clicked-home" : ""}`}
              onClick={toggleDropdown}
            >
              <img
                src="/dropimage.svg"
                alt="Dropdown Icon"
                className="dropdownIcon-home"
              />
              <div className="walletAddressText-home">{walletAddress}</div>
              <img src="/down.svg" alt="Down Icon" className="dropdownIcon-home" />
            </div>
            {dropdownVisible && (
              <div className="dropdownMenu-home">
                <div className="dropdownMenuItem-home" onClick={disconnectWallet}>
                  <span
                    className="dropdownMenuItemText-home"
                    style={{ color: "firebrick" }}
                  >
                    Disconnect Wallet
                  </span>
                  <img
                    src="/cross.svg"
                    alt="Cross Icon"
                    className="dropdownMenuItemIcon-home"
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <img
            src="/connect.svg"
            alt="Connect Button"
            id="connectButton-home"
            className="connectButton-home"
            onClick={connectWallet}
          />
        )}
      </header>
      <img src="/RadiantGlow.png" alt="Radiant Glow" id="radiantGlow-home" />
      <img
        src="/Core.png"
        alt="The Core"
        id="core-home"
        onMouseEnter={() => setButtonsVisible(true)}
        onMouseLeave={() => setButtonsVisible(false)}
      />
      <div id="hoverText-home">Hover to get started</div>
      <Link
        to="/direct-contract"
        id="buttonLeft-home"
        className={`buttonContainer-home ${buttonsVisible ? "visible-home" : ""}`}
        onMouseEnter={() => setButtonsVisible(true)}
        onMouseLeave={() => setButtonsVisible(false)}
      >
        <img src="/Core.png" alt="Button Left" className="buttonImage-home" />
        <img src="/dc.svg" alt="Icon" className="buttonIcon-home" />
        <span className="buttonText-home">Direct Contract</span>
      </Link>
      <Link
        to="/view-jobs"
        id="buttonRight-home"
        className={`buttonContainer-home ${buttonsVisible ? "visible-home" : ""}`}
        onMouseEnter={() => setButtonsVisible(true)}
        onMouseLeave={() => setButtonsVisible(false)}
      >
        <img src="/Core.png" alt="Button Right" className="buttonImage-home" />
        <img src="/jobs.svg" alt="Icon" className="buttonIcon-home" />
        <span className="buttonText-home">View Jobs</span>
      </Link>
    </main>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<MainPage />} />
      <Route path="/direct-contract" element={<DirectContractForm />} />
      <Route path="/view-jobs" element={<ViewJobs />} />
      <Route path="/job-details/:jobId" element={<SingleJobDetails />} />
      <Route path="/job-deep-view/:jobId" element={<JobDeepView />} />
      <Route path="/release-payment/:jobId" element={<ReleasePayment />} />
      <Route path="/job-update/:jobId" element={<JobUpdate />} />
      <Route path="/add-update/:jobId" element={<AddUpdate />} />
    </Routes>
  );
}
