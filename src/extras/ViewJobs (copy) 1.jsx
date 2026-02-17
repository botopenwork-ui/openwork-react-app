import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Web3 from "web3";
import L1ABI from "./L1ABI.json"; // Import the L1 contract ABI
import "./ViewJobs.css";

export default function ViewJobs() {
  const [jobs, setJobs] = useState([]);
  const [account, setAccount] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const jobsPerPage = 5; // Number of jobs per page

  const [walletAddress, setWalletAddress] = useState("");
  const [dropdownVisible, setDropdownVisible] = useState(false);

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
    async function checkMetaMask() {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({
            method: "eth_requestAccounts",
          });
          setAccount(accounts[0]);
        } catch (error) {
          console.error("MetaMask account access denied", error);
        }
      } else {
        console.error("MetaMask not detected");
      }
    }
    checkMetaMask();
  }, []);

  useEffect(() => {
    async function fetchJobs() {
      if (!account) return;

      try {
        const web3 = new Web3(window.ethereum);
        const contractAddress = "0x97c110890e012756eb4924a1993ea49c756ba4c4"; // Address of the OpenWorkL1 contract
        const contract = new web3.eth.Contract(L1ABI, contractAddress);

        // Fetch all job IDs
        const jobIds = await contract.methods.getAllJobIds().call();

        // Fetch job details for each job ID
        const jobsData = await Promise.all(
          jobIds.map(async (jobId) => {
            const jobDetails = await contract.methods
              .getJobDetails(jobId)
              .call();
            const ipfsHash = jobDetails.jobDetailHash;
            const ipfsData = await fetchFromIPFS(ipfsHash);

            return {
              jobId,
              title: ipfsData.title || null, // Assuming title is fetched from IPFS
              employer: jobDetails.employer,
              escrowAmount: web3.utils.fromWei(
                jobDetails.escrowAmount,
                "ether",
              ),
              isJobOpen: jobDetails.isOpen,
            };
          }),
        );

        setJobs(jobsData);
      } catch (error) {
        console.error("Error fetching job details:", error);
      }
    }

    fetchJobs();
  }, [account]);

  const fetchFromIPFS = async (hash) => {
    try {
      const response = await fetch(`https://gateway.pinata.cloud/ipfs/${hash}`);

      if (!response.ok) {
        throw new Error("Failed to fetch IPFS data");
      }

      const data = await response.json();
      return data; // Assuming IPFS data structure contains a "title" field
    } catch (error) {
      console.error("Error fetching data from IPFS:", error);
      return { title: null }; // Return null if title isn't found
    }
  };

  const truncateAddress = (address) => {
    const start = address.substring(0, 6);
    const end = address.substring(address.length - 4, address.length);
    return `${start}...${end}`;
  };

  // Pagination logic
  const indexOfLastJob = currentPage * jobsPerPage;
  const indexOfFirstJob = indexOfLastJob - jobsPerPage;
  const currentJobs = jobs.slice(indexOfFirstJob, indexOfLastJob);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <>
      <header className="headerVJ">
        <Link to="/" className="logoMark" id="logoVJ">
          <img src="/OWIcon.svg" alt="OWToken Icon" id="owTokenSingle2" />
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

      <div className="view-jobs-container">
        <div className="form-navigation">
          <Link to="/" className="backButton">
            <img src="/back.svg" alt="Back" className="backIcon" />
          </Link>
          <div className="tableTitle">OpenWork Ledger</div>
        </div>
        <div className="tableSubtitle">Initiated Jobs</div>
        <table className="table">
          <thead>
            <tr>
              <th>Job Title</th>
              <th>Employer</th>
              <th>Amount Paid</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {currentJobs.map((job) => (
              <tr key={job.jobId}>
                <td>
                  <img src="/doc.svg" alt="Document Icon" className="docIcon" />
                  {job.title && <span>{job.title}</span>}
                </td>
                <td>{truncateAddress(job.employer)}</td>
                <td className="amount-cell">
                  <span className="amount">{job.escrowAmount}</span>
                </td>
                <td>{job.isJobOpen ? "Open" : "Closed"}</td>
                <td className="view-icon-cell">
                  <Link to={`/job-details/${job.jobId}`}>
                    <img src="/view.svg" alt="View" className="viewIcon" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="pagination">
          {currentPage > 1 && (
            <button
              onClick={() => paginate(currentPage - 1)}
              className="page-link"
            >
              <img src="/back.svg" alt="Back" className="pagination-icon" />
            </button>
          )}
          <div className="page-text">
            <span style={{ color: "#868686" }}>
              Page {currentPage} of {Math.ceil(jobs.length / jobsPerPage)}
            </span>
          </div>
          {currentPage !== Math.ceil(jobs.length / jobsPerPage) && (
            <button
              onClick={() => paginate(currentPage + 1)}
              className="page-link"
            >
              <img src="/front.svg" alt="Forward" className="pagination-icon" />
            </button>
          )}
        </div>
      </div>
    </>
  );
}
