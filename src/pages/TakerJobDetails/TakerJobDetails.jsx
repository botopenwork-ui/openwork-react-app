import React, { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Web3 from "web3";
import L1ABI from "../../L1ABI.json"; // Import the L1 contract ABI
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
  const { jobId } = useParams();
  const [job, setJob] = useState(null);

  const [walletAddress, setWalletAddress] = useState("");
  const [dropdownVisible, setDropdownVisible] = useState(false);


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

  // Check if user is already connected to MetaMask
  useEffect(() => {
    const checkWalletConnection = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: "eth_accounts" });
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
    async function fetchJobDetails() {
      try {
        const web3 = new Web3("https://erpc.xinfin.network"); // Using the RPC URL
        const contractAddress = "0x00844673a088cBC4d4B4D0d63a24a175A2e2E637"; // Address of the OpenWorkL1 contract
        const contract = new web3.eth.Contract(L1ABI, contractAddress);

        // Fetch job details
        const jobDetails = await contract.methods.getJobDetails(jobId).call();
        const ipfsHash = jobDetails.jobDetailHash;

        // Fetch the job taker's address using the selected application ID
        const selectedApplicationID = jobDetails.selectedApplicationID;
        const jobTaker = await contract.methods
          .getApplicationApplicant(selectedApplicationID)
          .call();

        const ipfsData = await fetchFromIPFS(ipfsHash);

        setJob({
          jobId,
          employer: jobDetails.employer,
          escrowAmount: web3.utils.fromWei(jobDetails.escrowAmount, "mwei"),
          isJobOpen: jobDetails.isOpen,
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
      const response = await fetch(`https://gateway.lighthouse.storage/ipfs/${hash}`);
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
             {formatWalletAddress("0xdEF4B440acB1B11FDb23AF24e099F6cAf3209a8d")}
             </p><img src="/copy.svg" className="copyImage" onClick={() =>
                     handleCopyToClipboard(
                       "0xdEF4B440acB1B11FDb23AF24e099F6cAf3209a8d"
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
                    {/* <p>{formatWalletAddress(job.employer)}</p> */}
                    <p>Mollie Hall</p>
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
                    {/* {formatWalletAddress(job.taker)} */}
                    <p>Jollie Hall</p>
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
                  {/* {job.escrowAmount}{" "} */}
                  50
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
                        <Milestone amount={25} status="Completed" title="Milestone 1" content={"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat."}/>
                        <Milestone amount={25} status="In Progress" title="Milestone 2" content={"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat."}/>
                   </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
