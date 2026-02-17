import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./ApplyNow.css";

import BackButton from "../../components/BackButton/BackButton";
import DropDown from "../../components/DropDown/DropDown";
import BlueButton from "../../components/BlueButton/BlueButton";
import Warning from "../../components/Warning/Warning";
import FileUpload from "../../components/FileUpload/FileUpload";
import { fetchAllOracleData } from "../../services/oracleService";
import { createOracleMemberRecruitmentProposal } from "../../services/proposalCreationService";

export default function ApplyNow() {
  const navigate = useNavigate();
  const [jobDescription, setJobDescription] = useState("");
  const [skillOptions, setSkillOptions] = useState([]);
  const [loadingOracles, setLoadingOracles] = useState(true);
  const [selectedOracle, setSelectedOracle] = useState("");
  const [userAddress, setUserAddress] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);

  // Connect wallet on mount
  useEffect(() => {
    const connectWallet = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            setUserAddress(accounts[0]);
          }
        } catch (error) {
          console.error('Error getting wallet:', error);
        }
      }
    };

    connectWallet();

    // Listen for account changes
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        setUserAddress(accounts.length > 0 ? accounts[0] : null);
      });
    }
  }, []);

  // Fetch oracle data on mount
  useEffect(() => {
    async function loadOracles() {
      try {
        const data = await fetchAllOracleData();
        const oracleNames = data.oracles?.map(oracle => oracle.name) || [];
        setSkillOptions(oracleNames);
        // Set default selected oracle to first one
        if (oracleNames.length > 0) {
          setSelectedOracle(oracleNames[0]);
        }
      } catch (error) {
        console.error("Error fetching oracles:", error);
        setSkillOptions(["No oracles available"]);
      } finally {
        setLoadingOracles(false);
      }
    }
    loadOracles();
  }, []);

  // Handle oracle selection
  const handleOracleSelect = (oracle) => {
    setSelectedOracle(oracle);
  };

  // Handle wallet connection
  const connectWallet = async () => {
    if (!window.ethereum) {
      setSubmitError("Please install MetaMask to submit applications");
      return;
    }
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setUserAddress(accounts[0]);
    } catch (error) {
      console.error("Error connecting wallet:", error);
      setSubmitError("Failed to connect wallet");
    }
  };

  // Handle application submission
  const handleSubmit = async () => {
    // Reset status
    setSubmitStatus(null);
    setSubmitError(null);

    // Validate inputs
    if (!selectedOracle || selectedOracle === "No oracles available") {
      setSubmitError("Please select an oracle to join");
      return;
    }

    if (!jobDescription.trim()) {
      setSubmitError("Please provide a reason for your application");
      return;
    }

    // Check wallet connection
    if (!userAddress) {
      await connectWallet();
      if (!userAddress) return;
    }

    try {
      setSubmitting(true);
      setSubmitStatus("Creating proposal on Arbitrum Sepolia...");

      const result = await createOracleMemberRecruitmentProposal({
        oracleName: selectedOracle,
        memberAddress: userAddress,
        emailOrTelegram: "", // Optional - could add a field for this
        reason: jobDescription,
        userAddress: userAddress,
        attachments: uploadedFiles
      });

      if (result.success) {
        setSubmitStatus("Application submitted successfully!");
        // Navigate to proposal view after 2 seconds
        setTimeout(() => {
          navigate(`/proposal-view/${result.proposalId}/Arbitrum`);
        }, 2000);
      }
    } catch (error) {
      console.error("Error submitting application:", error);
      setSubmitError(error.message || "Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <>
      <div className="form-containerDC">
        <div className="form-header">
          <BackButton to="/skill-oracles" title="Skill Oracle Application"/>
        </div>
        <div className="form-body">
          <span id="pDC2">
            Submit a proposal to join an existing Skill Oracle. Your application will be voted on by DAO members.
          </span>
            <DropDown
              label={loadingOracles ? "Loading oracles..." : (selectedOracle || "Select Oracle")}
              options={skillOptions}
              customCSS='form-dropdown skill-oracle-dropdown'
              onOptionSelect={handleOracleSelect}
            />
            <div className="form-groupDC" style={{marginBottom:0}}>

              <textarea
                placeholder="Here's the reason(s) explaining why I deserve to be hired in this particular Skill Oracle"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
              ></textarea>
            </div>
            <div>
              <FileUpload
                onFilesUploaded={setUploadedFiles}
                uploadedFiles={uploadedFiles}
              />
            </div>

            {/* Wallet status */}
            {userAddress && (
              <Warning
                content={`Connected: ${userAddress.substring(0, 6)}...${userAddress.substring(38)}`}
                icon="/check-circle.svg"
              />
            )}

            {/* Status messages */}
            {submitStatus && (
              <Warning content={submitStatus} icon="/orange-warning.svg" />
            )}
            {submitError && (
              <Warning content={submitError} icon="/orange-warning.svg" />
            )}

            <BlueButton
              label={submitting ? "Submitting..." : (userAddress ? "Submit Application" : "Connect Wallet")}
              onClick={userAddress ? handleSubmit : connectWallet}
              style={{
                width: '100%',
                justifyContent: 'center',
                marginTop:'16px',
                opacity: submitting ? 0.7 : 1,
                cursor: submitting ? 'wait' : 'pointer'
              }}
            />
        </div>
      </div>
    </>
  );
}
