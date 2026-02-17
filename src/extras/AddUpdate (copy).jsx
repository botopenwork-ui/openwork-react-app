import React, { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom"; // Use useNavigate instead of useHistory
import Web3 from "web3";
import JobContractABI from "./JobContractABI.json";
import "./AddUpdate.css";

const pinataApiKey = "44d5fb3f1681a0c9a9d7";
const pinataSecretApiKey = "REDACTED_PINATA_SECRET";
const contractAddress = "0xc2871b49565020e66E8dEa4a8763ee4924a6819b";

export default function AddUpdate() {
  const { jobId } = useParams();
  const [updateText, setUpdateText] = useState("");
  const navigate = useNavigate(); // Use navigate instead of useHistory

  const handleUpdateChange = (e) => {
    setUpdateText(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const web3 = new Web3(window.ethereum);
      await window.ethereum.request({ method: "eth_requestAccounts" });

      const accounts = await web3.eth.getAccounts();
      const fromAddress = accounts[0];

      const updateDetails = {
        jobId,
        jobTaker: fromAddress,
        jobUpdate: updateText,
        jobGiver: fromAddress, // Replace with the actual job giver's address if available
      };

      // Pin update details to IPFS
      const response = await pinUpdateDetailsToIPFS(updateDetails);

      if (response && response.IpfsHash) {
        const updateHash = response.IpfsHash;
        console.log("IPFS Hash:", updateHash);

        const contract = new web3.eth.Contract(JobContractABI, contractAddress);

        // Call the submitWork function from the JobContract
        await contract.methods
          .submitWork(jobId, updateHash)
          .send({ from: fromAddress });

        console.log("Transaction successful");
        navigate(`/job-update/${jobId}`);
      } else {
        console.error("Failed to pin update details to IPFS");
      }
    } catch (error) {
      console.error("Error submitting update:", error);
    }
  };

  const pinUpdateDetailsToIPFS = async (updateDetails) => {
    const url = `https://api.pinata.cloud/pinning/pinJSONToIPFS`;
    const headers = {
      "Content-Type": "application/json",
      pinata_api_key: pinataApiKey,
      pinata_secret_api_key: pinataSecretApiKey,
    };

    const body = JSON.stringify({
      pinataOptions: { cidVersion: 1 },
      pinataMetadata: { name: `job-update-${jobId}.json` },
      pinataContent: updateDetails,
    });

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: headers,
        body: body,
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error pinning to IPFS:", error);
      return null;
    }
  };

  return (
    <div className="add-update-container">
      <header className="header">
        <img src="/Logo.jpg" alt="Openwork Logo" id="logo" />
        <img src="/connect.svg" alt="Connect Button" id="connectButton" />
      </header>
      <Link to={`/job-update/${jobId}`} className="backButton">
        <img src="/back.svg" alt="Back" className="backIcon" />
      </Link>
      <div className="add-update-header">
        <h1>Add New Update</h1>
      </div>
      <form className="add-update-form" onSubmit={handleSubmit}>
        <textarea
          placeholder="Add your update here..."
          value={updateText}
          onChange={handleUpdateChange}
          required
        ></textarea>
        <button type="submit" className="submit-update-button">
          Submit Update
        </button>
      </form>
    </div>
  );
}
