import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BackButton from '../../components/BackButton/BackButton';
import Warning from '../../components/Warning/Warning';
import './SkillOracleRecruitmentStep2.css';
import { 
  createOracleMemberRecruitmentProposal, 
  checkNativeDAOEligibility 
} from '../../services/proposalCreationService';
import { fetchAllOracleData } from '../../services/oracleService';

const SkillOracleRecruitmentStep2 = () => {
  const navigate = useNavigate();
  const [selectedOracle, setSelectedOracle] = useState(null);
  const [walletAddress, setWalletAddress] = useState('');
  const [emailOrTelegram, setEmailOrTelegram] = useState('');
  const [reason, setReason] = useState('');
  const [isOracleDropdownOpen, setIsOracleDropdownOpen] = useState(false);

  // Oracle data states
  const [oracleList, setOracleList] = useState([]);
  const [loadingOracles, setLoadingOracles] = useState(true);

  // Wallet and eligibility states
  const [userAddress, setUserAddress] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [eligibility, setEligibility] = useState(null);
  
  // Transaction states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState(null);
  const [error, setError] = useState(null);

  // Fetch oracles on mount
  useEffect(() => {
    const loadOracles = async () => {
      try {
        setLoadingOracles(true);
        console.log("Fetching oracle data...");
        
        const data = await fetchAllOracleData();
        
        // Filter oracles with less than 20 members
        const eligibleOracles = data.oracles.filter(oracle => oracle.totalMembers < 20);
        
        setOracleList(eligibleOracles);
        
        // Set first oracle as default if available
        if (eligibleOracles.length > 0) {
          setSelectedOracle(eligibleOracles[0]);
        }
        
        console.log(`Loaded ${eligibleOracles.length} eligible oracles`);
      } catch (error) {
        console.error("Error loading oracles:", error);
        setError("Failed to load oracles from blockchain");
      } finally {
        setLoadingOracles(false);
      }
    };
    
    loadOracles();
  }, []);

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
    
    if (!walletAddress || walletAddress.trim().length < 42) {
      setError("Please enter a valid wallet address (0x...)");
      return;
    }
    
    // Basic ethereum address validation
    if (!walletAddress.startsWith('0x') || walletAddress.length !== 42) {
      setError("Invalid Ethereum address format");
      return;
    }
    
    if (!emailOrTelegram || emailOrTelegram.trim().length < 3) {
      setError("Please enter an email ID or Telegram ID");
      return;
    }
    
    if (!reason || reason.trim().length < 10) {
      setError("Please provide a reason (at least 10 characters)");
      return;
    }
    
    try {
      setIsSubmitting(true);
      setTransactionStatus("Preparing transaction...");
      
      setTransactionStatus("Awaiting wallet confirmation...");
      
      // Create member recruitment proposal on Native DAO
      const result = await createOracleMemberRecruitmentProposal({
        oracleName: selectedOracle.name,
        memberAddress: walletAddress,
        emailOrTelegram: emailOrTelegram,
        reason: reason,
        userAddress: userAddress
      });
      
      if (result.success) {
        console.log("✅ Member recruitment proposal creation result:", result);
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
      console.error("Error creating member recruitment proposal:", error);
      setError(error.message || "Failed to create recruitment proposal");
      setTransactionStatus(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="skill-oracle-recruitment-step2-container">
      <div className="skill-oracle-recruitment-step2-card">
        <div className="skill-oracle-recruitment-step2-header">
          <BackButton to="/skill-oracle-member-proposal" title="Skill Oracle Recruitment Proposal" />
        </div>

        <div className="skill-oracle-recruitment-step2-content">
          <div className="skill-oracle-recruitment-step2-dropdown-section">
            <div className="skill-oracle-recruitment-step2-dropdown-wrapper">
              <button 
                className="skill-oracle-recruitment-step2-dropdown-button"
                onClick={() => setIsOracleDropdownOpen(!isOracleDropdownOpen)}
                disabled={loadingOracles}
              >
                <span>
                  {loadingOracles 
                    ? 'Loading oracles...' 
                    : selectedOracle 
                      ? selectedOracle.name 
                      : 'Select an oracle'
                  }
                </span>
                <img 
                  src="/chevron-down.svg" 
                  alt="" 
                  className={`skill-oracle-recruitment-step2-chevron ${isOracleDropdownOpen ? 'open' : ''}`}
                />
              </button>

              {/* Dropdown menu */}
              {isOracleDropdownOpen && oracleList.length > 0 && (
                <div className="skill-oracle-recruitment-step2-dropdown-menu">
                  {oracleList.map((oracle, index) => (
                    <div
                      key={index}
                      className={`skill-oracle-recruitment-step2-dropdown-item ${selectedOracle?.name === oracle.name ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedOracle(oracle);
                        setIsOracleDropdownOpen(false);
                      }}
                    >
                      <div className="skill-oracle-recruitment-step2-dropdown-item-name">
                        {oracle.name}
                      </div>
                      <div className="skill-oracle-recruitment-step2-dropdown-item-count">
                        {oracle.totalMembers} / 20 members
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="skill-oracle-recruitment-step2-info-box">
              <p className="skill-oracle-recruitment-step2-info-label">CURRENT MEMBER COUNT</p>
              <p className="skill-oracle-recruitment-step2-info-value">
                <span className="value-main">{selectedOracle?.totalMembers || 0} </span>
                <span className="value-secondary">/ 20</span>
              </p>
            </div>
          </div>

          <input
            type="text"
            className="skill-oracle-recruitment-step2-input"
            placeholder="0xDEAF...fB8B"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
          />

          <input
            type="text"
            className="skill-oracle-recruitment-step2-input"
            placeholder="Email ID / Telegram ID of this person"
            value={emailOrTelegram}
            onChange={(e) => setEmailOrTelegram(e.target.value)}
          />

          <textarea
            className="skill-oracle-recruitment-step2-textarea"
            placeholder="Reason explaining why this person should be recruited"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />

          <div className="skill-oracle-recruitment-step2-actions">
            <button 
              className="skill-oracle-recruitment-step2-submit"
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
            <Warning content={error || transactionStatus || "Member recruitment proposal requires blockchain transaction and 100+ OW tokens"} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SkillOracleRecruitmentStep2;
