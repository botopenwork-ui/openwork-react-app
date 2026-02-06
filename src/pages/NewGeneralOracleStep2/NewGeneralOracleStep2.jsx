import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BackButton from '../../components/BackButton/BackButton';
import Warning from '../../components/Warning/Warning';
import './NewGeneralOracleStep2.css';
import {
  createOracleProposal,
  checkNativeDAOEligibility
} from '../../services/proposalCreationService';
import Web3 from 'web3';

// Backend URL for IPFS pinning
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

const NewGeneralOracleStep2 = () => {
  const navigate = useNavigate();
  const [oracleName, setOracleName] = useState('');
  const [description, setDescription] = useState('');
  const [reason, setReason] = useState('');
  const [membersInput, setMembersInput] = useState('');
  const [skillVerifiedInput, setSkillVerifiedInput] = useState('');

  // Wallet and eligibility states
  const [userAddress, setUserAddress] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [eligibility, setEligibility] = useState(null);

  // Transaction states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState(null);
  const [error, setError] = useState(null);

  // Connect wallet on mount
  useEffect(() => {
    const connectWallet = async () => {
      if (!window.ethereum) {
        setError("Please install MetaMask");
        return;
      }

      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts.length > 0) {
          const address = accounts[0];
          setUserAddress(address);
          setIsConnected(true);

          // Check eligibility separately - don't fail if this errors
          try {
            console.log("Checking eligibility for address:", address);
            const eligibilityData = await checkNativeDAOEligibility(address);
            console.log("Eligibility data:", eligibilityData);
            setEligibility(eligibilityData);
          } catch (eligibilityError) {
            console.error("Error checking eligibility:", eligibilityError.message);
            console.error("Full error:", eligibilityError);
            // Allow user to proceed - actual eligibility will be checked when submitting
            setEligibility({ canPropose: true, canVote: true, error: false });
          }
        }
      } catch (walletError) {
        console.error("Error connecting wallet:", walletError);
        setError("Failed to connect wallet. Please try again.");
      }
    };
    connectWallet();
  }, []);

  // Helper to validate Ethereum address
  const isValidAddress = (address) => {
    return Web3.utils.isAddress(address);
  };

  // Parse comma-separated addresses
  const parseAddresses = (input) => {
    if (!input.trim()) return [];
    return input
      .split(',')
      .map(addr => addr.trim())
      .filter(addr => addr.length > 0);
  };

  // Pin oracle details to IPFS
  const pinOracleDetailsToIPFS = async (oracleDetails) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/ipfs/upload-json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pinataContent: oracleDetails,
          pinataMetadata: {
            name: `oracle-${oracleDetails.name}-${Date.now()}`,
            keyvalues: {
              oracleName: oracleDetails.name,
              type: 'oracle_details',
              memberCount: oracleDetails.members.length.toString(),
            },
          },
        }),
      });

      const data = await response.json();
      if (data.IpfsHash) {
        console.log('Oracle details pinned to IPFS:', data.IpfsHash);
        return data.IpfsHash;
      }
      throw new Error('No IPFS hash returned');
    } catch (error) {
      console.error('Error pinning oracle details to IPFS:', error);
      throw error;
    }
  };

  const handleSubmit = async () => {
    setError(null);
    setTransactionStatus(null);

    // Validation
    if (!isConnected || !userAddress) {
      setError("Please connect your wallet");
      return;
    }

    if (!eligibility?.canPropose) {
      setError("You need at least 100 OW tokens (staked or earned) to create a proposal");
      return;
    }

    if (!oracleName || oracleName.trim().length < 3) {
      setError("Please enter an oracle name (at least 3 characters)");
      return;
    }

    if (!description || description.trim().length < 10) {
      setError("Please enter a description (at least 10 characters)");
      return;
    }

    if (!reason || reason.trim().length < 10) {
      setError("Please enter a reason for creating this oracle (at least 10 characters)");
      return;
    }

    // Parse and validate members
    const members = parseAddresses(membersInput);
    if (members.length < 3) {
      setError("Please enter at least 3 member addresses (comma-separated)");
      return;
    }

    const invalidMembers = members.filter(addr => !isValidAddress(addr));
    if (invalidMembers.length > 0) {
      setError(`Invalid address(es): ${invalidMembers.join(', ')}`);
      return;
    }

    // Parse and validate skill verified addresses
    const skillVerified = parseAddresses(skillVerifiedInput);
    const invalidSkillVerified = skillVerified.filter(addr => !isValidAddress(addr));
    if (invalidSkillVerified.length > 0) {
      setError(`Invalid skill verified address(es): ${invalidSkillVerified.join(', ')}`);
      return;
    }

    // Skill verified must be subset of members
    const membersLower = members.map(m => m.toLowerCase());
    const notInMembers = skillVerified.filter(addr => !membersLower.includes(addr.toLowerCase()));
    if (notInMembers.length > 0) {
      setError(`Skill verified addresses must be members: ${notInMembers.join(', ')}`);
      return;
    }

    try {
      setIsSubmitting(true);
      setTransactionStatus("Uploading oracle details to IPFS...");

      // Pin oracle details to IPFS
      const oracleDetails = {
        name: oracleName,
        description: description,
        reason: reason,
        members: members,
        skillVerifiedAddresses: skillVerified,
        proposer: userAddress,
        timestamp: new Date().toISOString(),
      };

      const detailsHash = await pinOracleDetailsToIPFS(oracleDetails);
      console.log('Oracle details hash:', detailsHash);

      setTransactionStatus("Awaiting wallet confirmation...");

      // Create oracle proposal on Native DAO with members
      const result = await createOracleProposal({
        oracleName: oracleName,
        shortDescription: description,
        detailsHash: detailsHash,
        members: members,
        skillVerifiedAddresses: skillVerified,
        proposalDescription: reason,
        userAddress: userAddress
      });

      if (result.success) {
        console.log("General Oracle proposal creation result:", result);
        console.log("   Proposal ID:", result.proposalId);
        console.log("   Transaction Hash:", result.transactionHash);

        if (!result.proposalId) {
          setTransactionStatus("Success! Proposal created. Check DAO page for details.");
          setError(null);
        } else {
          // Show proposal ID in status (truncated for readability)
          const shortId = result.proposalId.slice(0, 10) + "..." + result.proposalId.slice(-8);
          setTransactionStatus(`Success! Proposal ID: ${shortId}. Redirecting...`);
          setError(null);

          // Redirect to proposal view after 3 seconds (longer to see ID)
          setTimeout(() => {
            console.log("Redirecting to:", `/proposal-view/${result.proposalId}/Arbitrum`);
            navigate(`/proposal-view/${result.proposalId}/Arbitrum`);
          }, 3000);
        }
      } else {
        setError("Transaction completed but success status is false");
      }
    } catch (error) {
      console.error("Error creating general oracle proposal:", error);
      setError(error.message || "Failed to create oracle proposal");
      setTransactionStatus(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="new-skill-oracle-step2-container">
      <div className="new-skill-oracle-step2-card">
        <div className="new-skill-oracle-step2-header">
          <BackButton to="/skill-oracle-proposal" title="New Skill Oracle" />
        </div>

        <div className="new-skill-oracle-step2-content">
          <div className="new-skill-oracle-step2-field">
            <input
              type="text"
              className="new-skill-oracle-step2-input"
              placeholder="Oracle Name"
              value={oracleName}
              onChange={(e) => setOracleName(e.target.value)}
            />
          </div>

          <textarea
            className="new-skill-oracle-step2-textarea"
            placeholder="Description of the General Oracle"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <textarea
            className="new-skill-oracle-step2-textarea"
            placeholder="Reason explaining why this general oracle should exist"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />

          <textarea
            className="new-skill-oracle-step2-textarea"
            placeholder="Member addresses (comma-separated, minimum 3)&#10;e.g. 0xabc..., 0xdef..., 0x123..."
            value={membersInput}
            onChange={(e) => setMembersInput(e.target.value)}
          />

          <textarea
            className="new-skill-oracle-step2-textarea"
            placeholder="Skill verified addresses (comma-separated, optional)&#10;Must be from the members list above"
            value={skillVerifiedInput}
            onChange={(e) => setSkillVerifiedInput(e.target.value)}
          />

          <div className="new-skill-oracle-step2-actions">
            <button
              className="new-skill-oracle-step2-submit"
              onClick={handleSubmit}
              disabled={isSubmitting || !isConnected || !eligibility?.canPropose}
              style={{
                opacity: (isSubmitting || !isConnected || !eligibility?.canPropose) ? 0.5 : 1,
                cursor: (isSubmitting || !isConnected || !eligibility?.canPropose) ? 'not-allowed' : 'pointer'
              }}
            >
              {isSubmitting ? 'Creating Proposal...' : 'Submit Proposal'}
            </button>
          </div>

          {/* Status/Error Message using Warning component */}
          <div style={{ marginTop: '16px' }}>
            <Warning content={
              error ||
              transactionStatus ||
              (!isConnected ? "Please connect your wallet to continue" :
               eligibility === null ? "Checking eligibility..." :
               eligibility?.error ? "Could not check eligibility. Please ensure you're on Arbitrum network." :
               !eligibility?.canPropose ? "You need at least 100 OW tokens (staked or earned) to create proposals" :
               "Oracle requires minimum 3 members. You are eligible to propose.")
            } />
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewGeneralOracleStep2;
