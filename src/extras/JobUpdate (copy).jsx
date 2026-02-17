import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Web3 from "web3";
import L1ABI from "./L1ABI.json";
import "./JobUpdate.css";

export default function JobUpdate() {
  const { jobId } = useParams();
  const [updates, setUpdates] = useState([]);
  const [account, setAccount] = useState(null);

  useEffect(() => {
    async function fetchJobUpdates() {
      try {
        const web3 = new Web3(window.ethereum);
        const accounts = await web3.eth.requestAccounts();
        setAccount(accounts[0]);

        const contractAddress = "0x7ad8f34CF39FEf9fEFaE67e5F9eCbc2Cb009254f";
        const contract = new web3.eth.Contract(L1ABI, contractAddress);

        const jobDetails = await contract.methods.getJobDetails(jobId).call();
        const ipfsHash = jobDetails.jobDetailHash;
        const ipfsData = await fetchFromIPFS(ipfsHash);

        const selectedApplicationID = jobDetails.selectedApplicationID;
        const jobTaker = await contract.methods
          .getApplicationApplicant(selectedApplicationID)
          .call();

        // Fetch job updates
        const submissionIDs = await contract.methods
          .getJobSubmissionIDs(jobId)
          .call();
        const jobUpdates = await Promise.all(
          submissionIDs.map(async (submissionID) => {
            const submission = await contract.methods
              .getWorkSubmission(submissionID)
              .call();
            const submissionHash = submission.submissionHash;
            const submissionData = await fetchFromIPFS(submissionHash);
            return {
              ...submission,
              ...submissionData,
            };
          }),
        );

        setUpdates(jobUpdates);
      } catch (error) {
        console.error("Error fetching job updates:", error);
      }
    }

    fetchJobUpdates();
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

  return (
    <div className="job-update-container">
      <header className="header">
        <img src="/Logo.jpg" alt="Openwork Logo" id="logo" />
        <img src="/connect.svg" alt="Connect Button" id="connectButton" />
      </header>
      <Link to="/" className="backButton">
        <img src="/back.svg" alt="Back" className="backIcon" />
      </Link>
      <div className="job-update-header">
        <h1>Job Updates</h1>
        <Link to={`/add-update/${jobId}`} className="add-update-button">
          Add New Update
        </Link>
      </div>
      <div className="job-update-content">
        {updates.length > 0 ? (
          updates.map((update, index) => (
            <div key={index} className="job-update-card">
              <div className="job-update-info">
                <p>
                  <strong>{update.worker}</strong> submitted work!
                </p>
                <p>{new Date(update.timestamp * 1000).toLocaleDateString()}</p>
              </div>
              <div className="job-update-description">
                <p>{update.description}</p>
              </div>
            </div>
          ))
        ) : (
          <p>No updates given yet.</p>
        )}
      </div>
    </div>
  );
}
