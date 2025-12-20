import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Web3 from "web3";
import nowjcABI from "../../ABIs/nowjc_ABI.json";
import "./JobUpdate.css";

import JobItem from "../../components/JobItem/JobItem";
import BlueButton from "../../components/BlueButton/BlueButton";

export default function JobUpdate() {
  const { jobId } = useParams();
  const [job, setJob] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  function formatWalletAddressH(address) {
    if (!address) return "";
    const start = address.substring(0, 4);
    const end = address.substring(address.length - 4);
    return `${start}....${end}`;
  }

  function goAddUpdate() {
    navigate(`/add-update/${jobId}`);
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

  useEffect(() => {
    async function fetchJobDetails() {
      try {
        // Get RPC URL from environment or use default Arbitrum Sepolia
        const rpcUrl = import.meta.env.VITE_ARBITRUM_SEPOLIA_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc";
        const web3 = new Web3(new Web3.providers.HttpProvider(rpcUrl));

        // Get NOWJC contract address from environment
        const nowjcAddress = import.meta.env.VITE_NOWJC_CONTRACT_ADDRESS;
        if (!nowjcAddress) {
          throw new Error("NOWJC contract address not configured");
        }

        const contract = new web3.eth.Contract(nowjcABI, nowjcAddress);

        // Fetch job details from nowjc contract
        const jobDetails = await contract.methods.getJob(jobId).call();

        // Fetch job detail hash from IPFS
        const ipfsData = await fetchFromIPFS(jobDetails.jobDetailHash);

        setJob({
          jobId,
          jobGiver: jobDetails.jobGiver,
          selectedApplicant: jobDetails.selectedApplicant,
          status: jobDetails.status,
          title: ipfsData.title || "Job",
          ...ipfsData,
        });

        // Get work submissions from the job
        const workSubmissions = jobDetails.workSubmissions || [];

        if (workSubmissions.length > 0) {
          // Fetch each submission from IPFS
          const jobUpdates = await Promise.all(
            workSubmissions.map(async (submissionHash, index) => {
              const submissionData = await fetchFromIPFS(submissionHash);
              return {
                id: index,
                submissionHash,
                ...submissionData,
              };
            }),
          );
          setUpdates(jobUpdates);
        } else {
          setUpdates([]);
        }

        setLoading(false);
      } catch (error) {
        console.error("Error fetching job details and updates:", error);
        setLoading(false);
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

  if (loading) {
    return (
      <div className="loading-container">
        <img src="/OWIcon.svg" alt="Loading..." className="loading-icon" />
      </div>
    );
  }

  return (
    <>
      {job && (
        <div className="newTitle">
          <div className="titleTop">
            <Link className="goBack" to={`/job-details/${jobId}`}>
              <img className="goBackImage" src="/back.svg" alt="Back Button" />
            </Link>
            <div className="titleText">{job.title}</div>
            <Link className="goBack" to={`/job-details/${jobId}`} style={{visibility:'hidden'}}>
              <img className="goBackImage" src="/back.svg" alt="Back Button" />
            </Link>
          </div>
          <div className="titleBottom">
            <p>
              Job ID: {jobId}
            </p>
            <img
              src="/copy.svg"
              className="copyImage"
              onClick={() => handleCopyToClipboard(jobId)}
            />
          </div>
        </div>
      )}

      <div className="job-update-container">
        <div className="job-update-main">
          <div className="job-update-header">
            <h1>Job Updates</h1>
            {/* {walletAddress.toLowerCase() === job?.jobTaker.toLowerCase() && ( */}
              {/* <Link to={`/add-update/${jobId}`} className="add-update-button">
                <img
                  src="/AddUpdateButton.svg"
                  alt="Add New Update"
                  className="add-update-image"
                />
              </Link> */}
              <BlueButton icon={'/plus.svg'} label={'Add New Update'} style={{padding: '8px 16px'}} onClick={goAddUpdate}/>
            {/* )} */}
          </div>

          <div className="job-update-content">
            {updates.length > 0 ? (
              updates.map((update, index) => (
                <>
                  <JobItem
                    key={index}
                    icon={'user.png'}
                    inform={update.title || update.description || 'Work submission added'}
                    devName={formatWalletAddressH(job?.selectedApplicant || 'Worker')}
                    time={update.timestamp ? Math.floor((Date.now() - new Date(update.timestamp).getTime()) / 60000) : 0}
                    jobId={jobId}
                  />
                  {index !== updates.length - 1 && (<span className="item-line"></span>)}
                </>
              ))
            ) : (
              <div className="no-updates-message">
                <p>No work submissions have been added yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
