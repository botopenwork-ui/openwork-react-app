import React, { useEffect, useRef, useState } from "react";
import { useWalletConnection } from "../../functions/useWalletConnection";
import { useParams, Link } from "react-router-dom";
import Web3 from "web3";
import "./TakerJobDetails.css";
import SkillBox from "../../components/SkillBox/SkillBox";
import Milestone from "../../components/Milestone/Milestone";

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


export default function TakerJobDetails() {
  const { walletAddress } = useWalletConnection();
  const { jobId } = useParams();
  const [job, setJob] = useState(null);
  const [copiedAddress, setCopiedAddress] = useState(null);
  const [dropdownVisible, setDropdownVisible] = useState(false);


  const handleCopyToClipboard = (address) => {
    navigator.clipboard
      .writeText(address)
      .then(() => {
        setCopiedAddress(address);
        setTimeout(() => setCopiedAddress(null), 2000);
      })
      .catch((err) => {
        console.error("Failed to copy: ", err);
      });
  };

  const toggleDropdown = () => {
    setDropdownVisible(!dropdownVisible);
  };

  useEffect(() => {
    async function fetchJobDetails() {
      try {
        const rpcUrl = import.meta.env.VITE_ARBITRUM_MAINNET_RPC_URL || 'https://arb1.arbitrum.io/rpc';
        const web3 = new Web3(rpcUrl); // Using the RPC URL
        const contractAddress = '0xE8f7963fF3cE9f7dB129e3f619abd71cBB5Bb294';
        const genesisABI = [
          { "inputs": [{"name":"jobId","type":"string"}], "name": "getJob", "outputs": [{"type":"tuple","components":[{"name":"jobId","type":"string"},{"name":"jobGiver","type":"address"},{"name":"jobDetailHash","type":"string"},{"name":"status","type":"uint8"},{"name":"totalBudget","type":"uint256"},{"name":"currentMilestone","type":"uint256"},{"name":"jobTaker","type":"address"},{"name":"totalPaid","type":"uint256"},{"name":"paymentChainDomain","type":"uint32"},{"name":"paymentAddress","type":"address"},{"name":"takerOriginChainDomain","type":"uint32"}]}], "stateMutability": "view", "type": "function" }
        ];
        const contract = new web3.eth.Contract(genesisABI, contractAddress);

        // Fetch job details
        const jobDetails = await contract.methods.getJob(jobId).call();
        const ipfsHash = jobDetails[2] || jobDetails.jobDetailHash;

        // Fetch the job taker's address using the selected application ID
        const selectedApplicationID = jobDetails.selectedApplicationID;
        const jobTaker = await contract.methods
          .getApplicationApplicant(selectedApplicationID)
          .call();

        const ipfsData = await fetchFromIPFS(ipfsHash);

        setJob({
          jobId,
          employer: jobDetails[1] || jobDetails.jobGiver,
          escrowAmount: web3.utils.fromWei(jobDetails.escrowAmount, "mwei"),
          isJobOpen: (Number(jobDetails[3] || jobDetails.status) === 0),
          taker: jobTaker,
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
      const response = await fetch(`/api/ipfs/content/${hash}`);
      return await response.json();
    } catch (error) {
      console.error("Error fetching data from IPFS:", error);
      return {};
    }
  };

  const handleNavigation = () => {
    window.open("https://drive.google.com/file/d/1tdpuAM3UqiiP_TKJMa5bFtxOG4bU_6ts/view", "_blank");
    
  };


  function formatWalletAddress(address) {
    if (!address) return "";
    const start = address.substring(0, 6);
    const end = address.substring(address.length - 4);
    return `${start}....${end}`;
  }

  if (!job) {
    return (
      <div className="loading-container">
        <img src="/OWIcon.svg" alt="Loading..." className="loading-icon" />
      </div>
    );
  }
  return (
    <>
      <div className="info-container">
        <div className="info-content">
          <div className="newTitle">
             <div className="titleTop">
              <Link className="goBack" to={`/job-details/${jobId}`}><img className="goBackImage" src="/back.svg" alt="Back Button" /></Link>  
              <div className="titleText">{job.title}</div>
              <Link className="goBack" to={`/job-details/${jobId}`} style={{visibility:'hidden'}}><img className="goBackImage" src="/back.svg" alt="Back Button" /></Link>  
             </div>
             <div className="titleBottom"><p>  Contract ID:{" "}
             {formatWalletAddress(walletAddress)}
             </p><img src="/copy.svg" className="copyImage" onClick={() =>
                     handleCopyToClipboard(
                       walletAddress
                     )
                   }
                   /></div>
           </div>

          <div className="info-cardJ">
            <div className="sectionTitle">Job Details</div>
            <div className="sectionBody">
              <div className="detail-row">
                <span className="detail-label">FROM</span>
                <div className="detail-profile">
                  <span className="detail-value-address">
                    <img src="/person.svg" alt="JobGiver" className="Job" />
                    <p>{formatWalletAddress(job.employer)}</p>
                  </span>
                  <a href="/profile" className="view-profile">
                    <span>View Profile</span>
                    <img src="/view_profile.svg" alt="" />
                  </a>
                </div>
              </div>
              <div className="detail-row">
                <span className="detail-label">TO</span>
                <div className="detail-profile">
                  <span className="detail-value-address" style={{ height: "47px" }}>
                    <img src="/person.svg" alt="JobTaker" className="Job" />
                    <p>{formatWalletAddress(job.taker)}</p>
                  </span>
                  <a href="/profile" className="view-profile">
                    <span>View Profile</span>
                    <img src="/view_profile.svg" alt="" />
                  </a>
                </div>
              </div>
              <div className="detail-row">
                <span className="detail-label">TOTAL COMPENSATION</span>
                <span className="detail-value" style={{ height: "47px" }}>
                  {job.escrowAmount}
                  <img src="/xdc.svg" alt="Info" className="infoIcon" />
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">DESCRIPTION</span>
                <div className="detail-value description-value">
                  <p>Here's a list of things I need:</p>
                  <ul className="description-list">
                    <p>{job.description}</p>
                  </ul>
                </div>
              </div>
              <div className="category">
                <span>CATEGORY</span>
                <div className="category-box">
                  <SkillBox title="UX Design" />
                  <SkillBox title='+5'/>
                </div>
              </div>
              <div className="category attachments">
                <span>ATTACHMENTS</span>
                <div className="upload-content">
                  <FileUpload/>
                  <FileUpload/>
                </div>
              </div>
              <div className="milestone-section">
                   <div className="milestone-section-header">
                        <span>MILESTONES</span>
                   </div>
                   <div className="milestone-section-body">
                        {job.milestones && job.milestones.length > 0 ? (
                          job.milestones.map((m, i) => (
                            <Milestone key={i} amount={m.amount} title={m.title || `Milestone ${i + 1}`} content={m.content || ""} />
                          ))
                        ) : (
                          <p style={{ color: '#888', padding: '12px 0' }}>No milestone details available.</p>
                        )}
                   </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
