import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Web3 from "web3";
import nowjcABI from "../../ABIs/nowjc_ABI.json";
import "./ViewWork.css";
import WorkSubmission from "../../components/WorkSubmission/WorkSubmission";

export default function ViewWork () {
    const { jobId } = useParams();
    const [job, setJob] = useState(null);
    const [workSubmissions, setWorkSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);

    const handleCopyToClipboard = (address) => {
      navigator.clipboard
        .writeText(address)
        .then(() => {
          alert("Job ID copied to clipboard");
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
            title: ipfsData.title || "Job Details",
            ...ipfsData,
          });

          // Get work submissions from the job
          const workSubmissionHashes = jobDetails.workSubmissions || [];

          if (workSubmissionHashes.length > 0) {
            // Fetch each submission from IPFS
            const submissions = await Promise.all(
              workSubmissionHashes.map(async (submissionHash, index) => {
                const submissionData = await fetchFromIPFS(submissionHash);
                // Get first image from attachments if available
                const firstImageAttachment = submissionData.attachments?.find(
                  att => att.type?.startsWith('image/')
                );
                const imageUrl = firstImageAttachment
                  ? `https://gateway.lighthouse.storage/ipfs/${firstImageAttachment.ipfsHash}`
                  : submissionData.image || submissionData.imageUrl || null;
                return {
                  id: index + 1,
                  submissionHash,
                  title: submissionData.title || `Work Submission ${workSubmissionHashes.length - index}`,
                  date: submissionData.date || submissionData.timestamp || new Date().toLocaleDateString(),
                  content: submissionData.content || submissionData.description || submissionData.jobUpdate || "No description provided",
                  image: imageUrl,
                  attachments: submissionData.attachments || [],
                  ...submissionData,
                };
              }),
            );
            // Reverse to show latest first
            setWorkSubmissions(submissions.reverse());
          } else {
            setWorkSubmissions([]);
          }

          setLoading(false);
        } catch (error) {
          console.error("Error fetching job details and work submissions:", error);
          setLoading(false);
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
                        <Link className="goBack" to={`/job-update/${jobId}`}>
                            <img className="goBackImage" src="/back.svg" alt="Back Button" />
                        </Link>
                        <div className="titleText">{job.title}</div>
                        <Link className="goBack" to={`/job-update/${jobId}`} style={{visibility:'hidden'}}>
                            <img className="goBackImage" src="/back.svg" alt="Back Button" />
                        </Link>
                    </div>
                    <div className="titleBottom">
                        <p>Job ID: {jobId}</p>
                        <img
                            src="/copy.svg"
                            className="copyImage"
                            onClick={() => handleCopyToClipboard(jobId)}
                        />
                    </div>
                </div>
            )}
            <div className="work-content">
                {workSubmissions.length > 0 ? (
                    workSubmissions.map((submission, index) => (
                        <WorkSubmission
                            key={index}
                            title={submission.title}
                            date={submission.date}
                            content={submission.content}
                            image={submission.image}
                            attachments={submission.attachments}
                        />
                    ))
                ) : (
                    !loading && (
                        <div className="no-submissions-message">
                            <p>No work submissions have been made for this job yet.</p>
                        </div>
                    )
                )}
            </div>
        </>
    )
}