import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom"; // Import useNavigate
import Web3 from "web3";
import JobContractABI from "../../ABIs/lowjc_ABI.json";
import "./PostJob.css";
import { useWalletConnection } from "../../functions/useWalletConnection"; // Manages wallet connection logic
import { formatWalletAddress } from "../../functions/formatWalletAddress"; // Utility function to format wallet address

import BackButton from "../../components/BackButton/BackButton";
import SkillBox from "../../components/SkillBox/SkillBox";
import DropDown from "../../components/DropDown/DropDown";
import BlueButton from "../../components/BlueButton/BlueButton";
import RadioButton from "../../components/RadioButton/RadioButton";
import Milestone from "../../components/Milestone/Milestone";
import Warning from "../../components/Warning/Warning";

const SKILLOPTIONS = [
  "UX/UI Skill Oracle",
  "Full Stack development",
  "UX/UI Skill Oracle",
];

const contractAddress = "0x2DA650B8DF04717e3E61b137a106C5114ACcdF38";
const OPTIONS_VALUE = "0x0003010011010000000000000000000000000007a120";

function ImageUpload() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [preview, setPreview] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setSelectedImage(file);
    setPreview(URL.createObjectURL(file)); // For preview display
  };

  const handleImageUpload = async () => {
    const formData = new FormData();
    formData.append("image", selectedImage);

    try {
      // Replace 'your-api-endpoint' with the actual upload URL
      const response = await fetch("api-endpoint", {
        method: "POST",
        body: formData,
      });
      if (response.ok) {
        alert("Image uploaded successfully!");
      } else {
        alert("Upload failed.");
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("An error occurred while uploading.");
    }
  };

  return (
    <div>
      <label htmlFor="image">
        <div className="form-fileUpload">
          <img src="/upload.svg" alt="" />
          <span>Click here to upload or drop files here</span>
        </div>
      </label>
      <input
        id="image"
        type="file"
        accept="image/*"
        onChange={handleImageChange}
        style={{ display: "none" }}
      />
      {preview && <img src={preview} alt="Image preview" width="100" />}
      {/* <button style={{display: 'none'}} onClick={handleImageUpload} disabled={!selectedImage}>
        Upload Image
      </button> */}
    </div>
  );
}

export default function PostJob() {
  const { walletAddress, connectWallet, disconnectWallet } =
    useWalletConnection();
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [jobType, setJobType] = useState("");
  const [jobTaker, setJobTaker] = useState("");
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [loadingT, setLoadingT] = useState("");
  const [selectedOption, setSelectedOption] = useState("Single Milestone");
  const [selectedSkillOracle, setSelectedSkillOracle] = useState(
    SKILLOPTIONS[0],
  );
  const [selectedSkills, setSelectedSkills] = useState([
    "UX Design",
    "Webflow",
  ]);
  const [milestones, setMilestones] = useState([
    {
      title: "Milestone 1",
      content:
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
      amount: 25,
    },
  ]);

  const navigate = useNavigate(); // Initialize useNavigate

  // Update milestones based on selected option
  useEffect(() => {
    if (selectedOption === "Single Milestone") {
      setMilestones([
        {
          title: "Milestone 1",
          content:
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
          amount: 25,
        },
      ]);
    } else {
      setMilestones([
        {
          title: "Milestone 1",
          content:
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
          amount: 25,
        },
        {
          title: "Milestone 2",
          content:
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
          amount: 25,
        },
      ]);
    }
  }, [selectedOption]);

  // Calculate total compensation
  const totalCompensation = milestones.reduce(
    (sum, milestone) => sum + milestone.amount,
    0,
  );

  const handleNavigation = () => {
    window.open(
      "https://drive.google.com/file/d/1tdpuAM3UqiiP_TKJMa5bFtxOG4bU_6ts/view",
      "_blank",
    );
  };

  const toggleDropdown = () => {
    setDropdownVisible(!dropdownVisible);
  };

  const handleMilestoneUpdate = (index, field, value) => {
    const updatedMilestones = [...milestones];
    updatedMilestones[index][field] = value;
    setMilestones(updatedMilestones);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (window.ethereum) {
      try {
        setLoadingT(true); // Start loader

        const web3 = new Web3(window.ethereum);
        await window.ethereum.request({ method: "eth_requestAccounts" });
        const accounts = await web3.eth.getAccounts();
        const fromAddress = accounts[0];

        // Create comprehensive job details object
        const jobDetails = {
          title: jobTitle,
          description: jobDescription,
          skills: selectedSkills,
          skillOracle: selectedSkillOracle,
          milestoneType: selectedOption,
          milestones: milestones,
          totalCompensation: totalCompensation,
          jobGiver: fromAddress,
          timestamp: new Date().toISOString(),
        };

        // Pin job details to IPFS
        const response = await pinJobDetailsToIPFS(jobDetails);
        console.log("IPFS Response:", response);

        if (response && response.IpfsHash) {
          const jobDetailHash = response.IpfsHash;
          console.log("IPFS Hash:", jobDetailHash);

          // Prepare contract parameters
          const contract = new web3.eth.Contract(
            JobContractABI,
            contractAddress,
          );

          // Extract milestone descriptions and amounts
          const descriptions = milestones.map((m) => m.content);
          const amounts = milestones.map((m) => m.amount * 1000000); // Convert to USDT units (6 decimals)

          // DEBUG: Log all transaction data
          console.log("=== TRANSACTION DEBUG ===");
          console.log("Contract Address:", contractAddress);
          console.log("Job Detail Hash:", jobDetailHash);
          console.log("Descriptions:", descriptions);
          console.log("Amounts:", amounts);
          console.log("Options Value:", OPTIONS_VALUE);
          console.log("From Address:", fromAddress);
          console.log(
            "Transaction Value:",
            web3.utils.toWei("0.0001", "ether"),
          );
          console.log("Job Details Object:", jobDetails);
          console.log("Milestones:", milestones);
          console.log("========================");

          // Call postJob function
          contract.methods
            .postJob(jobDetailHash, descriptions, amounts, OPTIONS_VALUE)
            .send({
              from: fromAddress,
              value: web3.utils.toWei("0.0001", "ether"), // Gas fee for cross-chain
              gasPrice: await web3.eth.getGasPrice(),
            })
            .on("receipt", function (receipt) {
              const events = receipt.events.JobPosted;
              if (events && events.returnValues) {
                const jobId = events.returnValues.jobId;
                console.log("Job ID from event:", jobId);

                navigate("/browse-jobs"); // Redirect to browse jobs page
              }
              setLoadingT(false); // Stop loader on success
            })
            .on("error", function (error) {
              console.error("Error sending transaction:", error);
              setLoadingT(false); // Stop loader on error
            })
            .on("transactionHash", function (hash) {
              console.log("Transaction hash:", hash);
            })
            .catch(function (error) {
              console.error("Transaction was rejected:", error);
              setLoadingT(false); // Stop loader when user cancels
            });
        } else {
          console.error("Failed to pin job details to IPFS");
          setLoadingT(false); // Stop loader on error
        }
      } catch (error) {
        console.error("Error sending transaction:", error);
        setLoadingT(false); // Stop loader on error
      }
    } else {
      console.error("MetaMask not detected");
      setLoadingT(false); // Stop loader if MetaMask is not detected
    }
  };

  if (loadingT) {
    return (
      <div className="loading-containerT">
        <div className="loading-icon">
          <img src="/OWIcon.svg" alt="Loading..." />
        </div>
        <div className="loading-message">
          <h1 id="txText">Posting Job...</h1>
          <p id="txSubtext">
            Your job is being posted to the blockchain. Please wait...
          </p>
        </div>
      </div>
    );
  }

  const pinJobDetailsToIPFS = async (jobDetails) => {
    try {
      const response = await fetch(
        "https://api.pinata.cloud/pinning/pinJSONToIPFS",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization:
              "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiI1YTBkNTU1MC1hOTRhLTQ1NmEtOGE0Zi1jMDNjOWFlZGQ4MTUiLCJlbWFpbCI6Im1vaGRhbmFzMjExQGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJwaW5fcG9saWN5Ijp7InJlZ2lvbnMiOlt7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6IkZSQTEifSx7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6Ik5ZQzEifV0sInZlcnNpb24iOjF9LCJtZmFfZW5hYmxlZCI6ZmFsc2UsInN0YXR1cyI6IkFDVElWRSJ9LCJhdXRoZW50aWNhdGlvblR5cGUiOiJzY29wZWRLZXkiLCJzY29wZWRLZXlLZXkiOiJmMmNkZGIxMTU2NjZkZThkMTkwOSIsInNjb3BlZEtleVNlY3JldCI6IjI1NmFlZGY3YjYwYmE5MjY1OTg3NGYwMmUzYmFkNWVmNThmMjIxNjU4YWQxNDkyZWY2M2I0MzYwYTMyZjVjNDQiLCJleHAiOjE3ODUzMjgzODZ9.5VYFX7EdQ07-wjD6twzLPljFi-zGoN7XSuNzgROFPuY",
          },
          body: JSON.stringify({
            pinataContent: jobDetails,
            pinataMetadata: {
              name: `job-${Date.now()}`,
              keyvalues: {
                jobTitle: jobDetails.title,
                jobGiver: jobDetails.jobGiver,
              },
            },
          }),
        },
      );

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error pinning to IPFS:", error);
      return null;
    }
  };

  return (
    <>
      <div className="form-containerDC form-post">
        <div className="form-header">
          <BackButton to="/work" title="Create a Job" />
        </div>
        <div className="form-body">
          <div
            onSubmit={handleSubmit}
            style={{
              marginTop: "12px",
            }}
          >
            <div className="form-groupDC">
              <input
                type="text"
                placeholder="Job Title"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
              />
            </div>
            <div className="form-groupDC">
              <textarea
                placeholder="Job Requirements"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
              ></textarea>
            </div>
            <div className="form-groupDC skill-box">
              {selectedSkills.map((skill, index) => (
                <SkillBox key={index} title={skill} />
              ))}
            </div>
            <div className="form-groupDC">
              <ImageUpload />
            </div>
            <div className="form-groupDC skill-dropdown">
              <span>CHOOSE A SKILL ORACLE FOR DISPUTE RESOLUTION</span>
              <DropDown
                label={selectedSkillOracle}
                options={SKILLOPTIONS}
                customCSS="form-dropdown"
                onSelect={setSelectedSkillOracle}
              />
            </div>
            <div className="lineDC form-groupDC"></div>
            <div className="form-groupDC">
              <RadioButton
                label="Single Milestone"
                isSelected={selectedOption === "Single Milestone"}
                onChange={() => setSelectedOption("Single Milestone")}
              />
              <RadioButton
                label="Multiple Milestones"
                isSelected={selectedOption === "Multiple Milestones"}
                onChange={() => setSelectedOption("Multiple Milestones")}
              />
            </div>
            <div className="form-groupDC milestone-section">
              <div className="milestone-section-header">
                <span>MILESTONES</span>
              </div>
              <div className="milestone-section-body">
                {milestones.map((milestone, index) => (
                  <Milestone
                    key={index}
                    amount={milestone.amount}
                    title={milestone.title}
                    content={milestone.content}
                    editable={true}
                    onUpdate={(field, value) =>
                      handleMilestoneUpdate(index, field, value)
                    }
                  />
                ))}
              </div>
            </div>

            {/* Amount input field is completely hidden */}

            <div className="form-groupDC form-platformFee">
              <div className="platform-fee">
                <span>total compensation</span>
                <img src="/fee.svg" alt="" />
              </div>
              <div className="compensation-amount">
                <span>{totalCompensation}</span>
                <img src="/xdc.svg" alt="USDC" className="usdc-iconJD" />
              </div>
            </div>
            <BlueButton
              label="Post Job"
              style={{ width: "100%", justifyContent: "center" }}
              onClick={handleSubmit}
            />
            <div className="warning-form">
              <Warning content="Job posting requires blockchain transaction fees" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
