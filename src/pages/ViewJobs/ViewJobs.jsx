import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Web3 from "web3";
import genesisABI from "../../ABIs/genesis_ABI.json";
import "./ViewJobs.css";
import { useWalletConnection } from "../../functions/useWalletConnection";
import { getNativeChain } from "../../config/chainConfig";

const STATUS_LABELS = { 0: "Open", 1: "In Progress", 2: "Completed", 3: "Disputed", 4: "Cancelled" };
const STATUS_COLORS = { 0: "#22c55e", 1: "#3b82f6", 2: "#6366f1", 3: "#ef4444", 4: "#9ca3af" };

export default function ViewJobs() {
  const { walletAddress } = useWalletConnection();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const jobsPerPage = 10;
  const navigate = useNavigate();

  useEffect(() => {
    if (!walletAddress) return;

    async function fetchJobs() {
      try {
        setLoading(true);
        setError(null);

        const nativeChain = getNativeChain();
        const rpcUrl = import.meta.env.VITE_ARBITRUM_MAINNET_RPC_URL || 'https://arb1.arbitrum.io/rpc';
        const contractAddress = nativeChain?.contracts?.genesis || '0xE8f7963fF3cE9f7dB129e3f619abd71cBB5Bb294';

        const web3 = new Web3(rpcUrl);
        const contract = new web3.eth.Contract(genesisABI, contractAddress);

        // Fetch job IDs posted by this wallet
        const jobIds = await contract.methods.getJobsByPoster(walletAddress).call();

        if (!jobIds || jobIds.length === 0) {
          setJobs([]);
          setLoading(false);
          return;
        }

        // Fetch details for each job in parallel
        const jobsData = await Promise.all(
          jobIds.map(async (jobId) => {
            try {
              const jobData = await contract.methods.getJob(jobId).call();
              const ipfsHash = jobData[2] || jobData.jobDetailHash;
              let title = jobId;
              let budget = '—';

              if (ipfsHash && !ipfsHash.includes('placeholder') && ipfsHash.length > 10) {
                try {
                  const res = await fetch(`/api/ipfs/content/${ipfsHash}`);
                  if (res.ok) {
                    const data = await res.json();
                    title = data.title || data.jobTitle || jobId;
                  }
                } catch (_) {}
              }

              // Status: index 3, totalBudget: index 4
              const statusIndex = Number(jobData[3] ?? jobData.status ?? 0);
              const totalBudget = jobData[4] ?? jobData.totalBudget;
              if (totalBudget) {
                const budgetNum = Number(totalBudget) / 1e6;
                budget = budgetNum.toFixed(2);
              }

              return { jobId, title, status: statusIndex, budget };
            } catch (e) {
              return { jobId, title: jobId, status: 0, budget: '—' };
            }
          })
        );

        setJobs(jobsData);
      } catch (err) {
        console.error("Error fetching jobs:", err);
        setError("Failed to load jobs. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    fetchJobs();
  }, [walletAddress]);

  const indexOfLast = currentPage * jobsPerPage;
  const indexOfFirst = indexOfLast - jobsPerPage;
  const currentJobs = jobs.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(jobs.length / jobsPerPage);

  if (!walletAddress) {
    return (
      <div className="body-container" style={{ padding: '40px' }}>
        <p>Please connect your wallet to view your jobs.</p>
      </div>
    );
  }

  return (
    <div className="body-container">
      <div className="view-jobs-container">
        <div className="newTitle">
          <div className="titleTop">
            <Link className="goBack" to="/"><img className="goBackImage" src="/back.svg" alt="Back" /></Link>
            <div className="titleText">My Jobs</div>
          </div>
        </div>

        {loading && (
          <div className="loading-containerT" style={{ textAlign: 'center', padding: '40px' }}>
            <img src="/OWIcon.svg" alt="Loading" className="loading-icon" style={{ width: '40px', animation: 'spin 1s linear infinite' }} />
            <p style={{ marginTop: '12px', color: '#6b7280' }}>Loading your jobs from blockchain...</p>
          </div>
        )}

        {error && (
          <div style={{ padding: '24px', color: '#ef4444' }}>{error}</div>
        )}

        {!loading && !error && jobs.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
            <p>No jobs posted yet.</p>
            <Link to="/post-job" style={{ color: '#3b82f6', marginTop: '8px', display: 'inline-block' }}>
              Post your first job →
            </Link>
          </div>
        )}

        {!loading && !error && jobs.length > 0 && (
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Job Title</th>
                  <th>Status</th>
                  <th>Budget (USDC)</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {currentJobs.map((job) => (
                  <tr key={job.jobId} style={{ cursor: 'pointer' }}>
                    <td>{job.title}</td>
                    <td>
                      <span style={{ color: STATUS_COLORS[job.status] || '#6b7280', fontWeight: 500 }}>
                        {STATUS_LABELS[job.status] || 'Unknown'}
                      </span>
                    </td>
                    <td>{job.budget}</td>
                    <td>
                      <button
                        onClick={() => navigate(`/single-job-details/${job.jobId}`)}
                        style={{ background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', padding: '6px 14px', cursor: 'pointer' }}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className="pagination">
                {currentPage > 1 && (
                  <button onClick={() => setCurrentPage(p => p - 1)} className="page-link">
                    <img src="/back.svg" alt="Back" className="pagination-icon" />
                  </button>
                )}
                <span className="page-info">Page {currentPage} of {totalPages}</span>
                {currentPage < totalPages && (
                  <button onClick={() => setCurrentPage(p => p + 1)} className="page-link">
                    <img src="/next.svg" alt="Next" className="pagination-icon" />
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
