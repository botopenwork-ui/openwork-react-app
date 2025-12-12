import React, { useEffect, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Web3 from "web3";
import NOWJCABI from "../../ABIs/nowjc_ABI.json";
import "./ViewJobDetails.css";
import SkillBox from "../../components/SkillBox/SkillBox";
import Milestone from "../../components/Milestone/Milestone";
import Button from "../../components/Button/Button";
import BlueButton from "../../components/BlueButton/BlueButton";
import BackButton from "../../components/BackButton/BackButton";

// NOWJC contract on Arbitrum Sepolia
const NOWJC_ADDRESS = import.meta.env.VITE_NOWJC_CONTRACT_ADDRESS;
const ARBITRUM_RPC = import.meta.env.VITE_ARBITRUM_SEPOLIA_RPC_URL;

function FileUpload() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [preview, setPreview] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setSelectedImage(file);
    setPreview(URL.createObjectURL(file)); // For preview display
  };

  return (
    <div style={{width: '100%'}}>
      <label htmlFor="image">
        <div className="form-fileUpload">
          <img src="/upload.svg" alt="" />
          <span>Click here to upload or drop files here</span>
        </div>
      </label>
      <input id="image" type="file" accept="image/*" onChange={handleImageChange} style={{display:'none'}} />
      {preview && <img src={preview} alt="Image preview" width="100" />}
    </div>
  );
}

function ATTACHMENTS({title}) {
  return (
    <div className="attachment-form">
      <img src="/attachments.svg" alt="" />
      <span>{title}</span>
    </div>
  )
}

export default function ViewJobDetails() {
  const navigate = useNavigate();
  const { jobId } = useParams();
  const [job, setJob] = useState(null);
  const [jobDetails, setJobDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchJobData() {
      if (!jobId) {
        setError("No job ID provided");
        setLoading(false);
        return;
      }

      try {
        console.log("📍 Fetching job:", jobId);
        
        const web3 = new Web3(ARBITRUM_RPC);
        const nowjc = new web3.eth.Contract(NOWJCABI, NOWJC_ADDRESS);

        // Fetch job from NOWJC contract
        const jobData = await nowjc.methods.getJob(jobId).call();
        console.log("📋 Job data from contract:", jobData);

        setJob(jobData);

        // Fetch IPFS data if hash exists - multi-gateway fallback
        if (jobData.jobDetailHash) {
          const gateways = [
            'https://ipfs.io/ipfs/',
            'https://cloudflare-ipfs.com/ipfs/',
            'https://dweb.link/ipfs/'
          ];
          
          let ipfsData = null;
          for (const gateway of gateways) {
            try {
              const response = await fetch(gateway + jobData.jobDetailHash, {
                signal: AbortSignal.timeout(5000) // 5 second timeout
              });
              ipfsData = await response.json();
              console.log("📦 IPFS data loaded from:", gateway);
              break;
            } catch (error) {
              console.log(`Gateway ${gateway} failed, trying next...`);
              continue;
            }
          }
          
          if (ipfsData) {
            setJobDetails(ipfsData);
          } else {
            console.error("Failed to fetch IPFS data from all gateways");
          }
        }

        setLoading(false);
      } catch (err) {
        console.error("Error fetching job:", err);
        setError(err.message);
        setLoading(false);
      }
    }

    fetchJobData();
  }, [jobId]);

  const handleBack = () => {
    navigate(-1);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <img src="/OWIcon.svg" alt="Loading..." className="loading-icon" />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Error Loading Job</h2>
        <p>{error || "Job not found"}</p>
        <button onClick={handleBack}>Go Back</button>
      </div>
    );
  }

  const totalPaid = job.totalPaid ? (Number(job.totalPaid) / 1e6).toFixed(2) : "0.00";

  return (
    <>
      <div className="info-container">
        <div className="info-content">
          <div className="info-cardJ">
            <div className="sectionTitle">
                <div onClick={handleBack} style={{cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '20px'}}>
                  <img src="/back.svg" alt="Back" style={{width: '24px', height: '24px'}} />
                  <span style={{fontSize: '18px', fontWeight: '600'}}>{jobDetails?.title || job.id}</span>
                </div>
            </div>
            <div className="sectionBody">
              <div className="detail-row">
                <span className="detail-label">POSTED BY</span>
                <div className="detail-profile">
                  <span className="detail-value-address">
                    <img src="/user.png" alt="JobGiver" className="Job" />
                    <p title={job.jobGiver}>{job.jobGiver.slice(0, 6)}...{job.jobGiver.slice(-4)}</p>
                  </span>
                  <a href={`/profile/${job.jobGiver}`} className="view-profile">
                    <span>View Profile</span>
                    <img src="/view_profile.svg" alt="" />
                  </a>
                </div>
              </div>
              <div className="detail-row">
                <span className="detail-label">BUDGET</span>
                <span className="detail-value" style={{ height: "47px" }}>
                  {totalPaid}
                  <img src="/xdc.svg" alt="Info" className="infoIcon" />
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">REQUIREMENT(S)</span>
                <div className="detail-value description-value">
                  <p>{jobDetails?.description || "No description available"}</p>
                </div>
              </div>
              {jobDetails?.skills && jobDetails.skills.length > 0 && (
                <div className="category">
                  <span>SKILLS</span>
                  <div className="category-box">
                    {jobDetails.skills.map((skill, idx) => (
                      <SkillBox key={idx} title={skill} />
                    ))}
                  </div>
                </div>
              )}
              <div className="form-groupDC" style={{display:'flex', alignItems:'center', gap:'16px', marginBottom:0, marginTop:8}}>
                <Button label='Refer someone' buttonCss={'verified-button'}/>
                <BlueButton 
                  label='Apply Now' 
                  style={{width: '-webkit-fill-available', justifyContent:'center', padding: '12px 16px'}}
                  onClick={() => navigate(`/apply-job/${jobId}`)}
                />
            </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
