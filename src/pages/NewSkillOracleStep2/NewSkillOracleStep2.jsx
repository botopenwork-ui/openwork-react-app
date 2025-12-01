import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BackButton from '../../components/BackButton/BackButton';
import Warning from '../../components/Warning/Warning';
import './NewSkillOracleStep2.css';
import { 
  createOracleProposal, 
  checkNativeDAOEligibility 
} from '../../services/proposalCreationService';

const NewSkillOracleStep2 = () => {
  const navigate = useNavigate();
  const [skillOracleName, setSkillOracleName] = useState('');
  const [description, setDescription] = useState('');
  const [reason, setReason] = useState('');

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
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
          if (accounts.length > 0) {
            const address = accounts[0];
            setUserAddress(address);
            setIsConnected(true);
            
            const eligibilityData = await checkNativeDAOEligibility(address);
            setEligibility(eligibilityData);
          }
        } catch (error) {
          console.error("Error connecting wallet:", error);
          setError("Failed to connect wallet");
        }
      }
    };
    connectWallet();
  }, []);

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
    
    if (!skillOracleName || skillOracleName.trim().length < 3) {
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
    
    try {
      setIsSubmitting(true);
      setTransactionStatus("Preparing transaction...");
      
      // Auto-generate IPFS hash (simplified - can be updated later)
      const detailsHash = `Qm${skillOracleName.replace(/\s+/g, '')}Hash`;
      
      setTransactionStatus("Awaiting wallet confirmation...");
      
      // Create oracle proposal on Native DAO
      const result = await createOracleProposal({
        oracleName: skillOracleName,
        shortDescription: description,
        detailsHash: detailsHash,
        members: [], // Start with empty member array
        skillVerifiedAddresses: [], // Start with empty skill verified array
        proposalDescription: reason,
        userAddress: userAddress
      });
      
      if (result.success) {
        console.log("✅ Oracle proposal creation result:", result);
        console.log("   Proposal ID:", result.proposalId);
        console.log("   Transaction Hash:", result.transactionHash);
        
        if (!result.proposalId) {
          setTransactionStatus("✅ Success! Proposal created but ID not found. Check DAO page.");
          setError(null);
        } else {
          setTransactionStatus("✅ Success! Proposal created successfully. Redirecting...");
          setError(null);
          
          // Redirect to proposal view after 2 seconds
          setTimeout(() => {
            console.log("🔄 Redirecting to:", `/proposal-view/${result.proposalId}/Arbitrum`);
            navigate(`/proposal-view/${result.proposalId}/Arbitrum`);
          }, 2000);
        }
      } else {
        setError("Transaction completed but success status is false");
      }
    } catch (error) {
      console.error("Error creating oracle proposal:", error);
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
              placeholder="General Skill Oracle"
              value={skillOracleName}
              onChange={(e) => setSkillOracleName(e.target.value)}
            />
          </div>

          <textarea
            className="new-skill-oracle-step2-textarea"
            placeholder="Description of the Skill Oracle"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <textarea
            className="new-skill-oracle-step2-textarea"
            placeholder="Reason explaining why this skill oracle should exist"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
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
            <Warning content={error || transactionStatus || "Oracle creation proposal requires blockchain transaction and 100+ OW tokens"} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewSkillOracleStep2;
