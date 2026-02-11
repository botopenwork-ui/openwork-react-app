import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import Web3 from "web3";
import L1ABI from "../../L1ABI.json"; // Import the L1 contract ABI
import "./ViewJobs.css";

export default function ViewJobs() {
  const [jobs, setJobs] = useState([]);
  const [account, setAccount] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const jobsPerPage = 5; // Number of jobs per page

  const [walletAddress, setWalletAddress] = useState("");
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [loading, setLoading] = useState(true); // Loading state

  const navigate = useNavigate();

  function formatWalletAddress(address) {
    if (!address) return "";
    const start = address.substring(0, 4);
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
      } catch (error) {
        console.error("Failed to connect wallet:", error);
      }
    } else {
      alert("MetaMask is not installed. Please install it to use this app.");
    }
  };

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

  const toggleDropdown = () => {
    setDropdownVisible(!dropdownVisible);
  };

  const disconnectWallet = () => {
    setWalletAddress("");
    setDropdownVisible(false);
  };

  useEffect(() => {
    async function fetchJobs() {
      try {
        const web3 = new Web3("https://erpc.xinfin.network"); // Replace with the desired RPC URL
        const contractAddress = "0x00844673a088cBC4d4B4D0d63a24a175A2e2E637"; // Address of the OpenWorkL1 contract
        const contract = new web3.eth.Contract(L1ABI, contractAddress);

        const jobIds = await contract.methods.getAllJobIds().call();

        const jobsData = await Promise.all(
          jobIds.map(async (jobId) => {
            const jobDetails = await contract.methods
              .getJobDetails(jobId)
              .call();
            const ipfsHash = jobDetails.jobDetailHash;
            const ipfsData = await fetchFromIPFS(ipfsHash);

            // Fetch the proposed amount using getApplicationProposedAmount
            const proposedAmountWei = await contract.methods
              .getApplicationProposedAmount(jobId)
              .call();

            // Log the raw wei value
            console.log("Proposed Amount (raw wei):", proposedAmountWei);

            // Convert proposed amount from USDC units (6 decimals)
            const escrowAmount = web3.utils.fromWei(proposedAmountWei, "mwei");

            return {
              jobId,
              title: ipfsData.title || null,
              employer: ipfsData.jobGiver || null,
              jobTaker: ipfsData.jobTaker || null,
              escrowAmount: escrowAmount,
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
      return data;
    } catch (error) {
      console.error("Error fetching data from IPFS:", error);
      return { title: null, jobGiver: null, jobTaker: null };
    }
  };

  const handleNavigation = () => {
    window.open(
      "https://drive.google.com/file/d/1tdpuAM3UqiiP_TKJMa5bFtxOG4bU_6ts/view",
      "_blank",
    );
  };

  const truncateAddress = (address) => {
    if (!address) return "";
    const start = address.substring(0, 6);
    const end = address.substring(address.length - 4, address.length);
    return `${start}...${end}`;
  };

  const indexOfLastJob = currentPage * jobsPerPage;
  const indexOfFirstJob = indexOfLastJob - jobsPerPage;
  const currentJobs = jobs.slice(indexOfFirstJob, indexOfLastJob);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // This useEffect will be triggered after the jobs are rendered
  useEffect(() => {
    if (currentJobs.length > 0) {
      // Timeout to allow the DOM to finish rendering
      setTimeout(() => {
        setLoading(false);
      }, 0);
    }
  }, [currentJobs]);

  return (
    <>
      <div className="body-container">
        <div className="view-jobs-container">
          <div className="title-section">
            <Link to="/" className="backButton">
              <img src="/back.svg" alt="Back" className="backIconV" />
            </Link>
            <div className="tableTitleV">OpenWork Ledger</div>
          </div>

          <div className="table-section">
            <div className="tableSubtitle">Initiated Jobs</div>
            {loading ? (
              <div className="loading-animation">
                <img src="/OWIcon.svg" alt="Loading" className="loading-icon" />
              </div>
            ) : (
              <>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Job Title</th>
                      <th>From</th>
                      <th></th>
                      <th>To</th>
                      <th>Amount Paid</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentJobs.map((job) => (
                      <tr key={job.jobId}>
                        <td>
                          <img
                            src="/doc.svg"
                            alt="Document Icon"
                            className="docIcon"
                          />
                          {job.title && <span>{job.title}</span>}
                        </td>
                        <td id="fromAdd">{truncateAddress(job.employer)}</td>
                        <td className="from-to-icon-cell">
                          <img
                            src="/rightarrow.svg"
                            alt="Arrow Icon"
                            className="from-to-icon"
                          />
                        </td>
                        <td id="toAdd">{truncateAddress(job.jobTaker)}</td>
                        <td className="amount-cellVJ">
                          <span className="amountV">{job.escrowAmount}</span>
                        </td>
                        <td>{job.isJobOpen ? "Open" : "Closed"}</td>
                        <td className="view-icon-cell">
                          <Link to={`/view-job-details/${job.jobId}`}>
                            <img
                              src="/view.svg"
                              alt="View"
                              className="viewIcon"
                            />
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
                      <img
                        src="/back.svg"
                        alt="Back"
                        className="pagination-icon"
                      />
                    </button>
                  )}
                  <div className="page-text">
                    <span style={{ color: "#868686" }}>
                      Page {currentPage} of{" "}
                      {Math.ceil(jobs.length / jobsPerPage)}
                    </span>
                  </div>
                  {currentPage !== Math.ceil(jobs.length / jobsPerPage) && (
                    <button
                      onClick={() => paginate(currentPage + 1)}
                      className="page-link"
                    >
                      <img
                        src="/front.svg"
                        alt="Forward"
                        className="pagination-icon"
                      />
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
