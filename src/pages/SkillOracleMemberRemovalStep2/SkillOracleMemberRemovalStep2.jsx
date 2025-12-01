import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BackButton from '../../components/BackButton/BackButton';
import Warning from '../../components/Warning/Warning';
import './SkillOracleMemberRemovalStep2.css';
import { 
  createOracleMemberRemovalProposal, 
  checkNativeDAOEligibility 
} from '../../services/proposalCreationService';
import { fetchAllOracleData } from '../../services/oracleService';

const SkillOracleMemberRemovalStep2 = () => {
  const navigate = useNavigate();
  const [selectedOracle, setSelectedOracle] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [reason, setReason] = useState('');
  const [isOracleDropdownOpen, setIsOracleDropdownOpen] = useState(false);
  const [isMemberDropdownOpen, setIsMemberDropdownOpen] = useState(false);

  // Oracle data states
  const [oracleList, setOracleList] = useState([]);
  const [memberList, setMemberList] = useState([]);
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
        
        setOracleList(data.oracles);
        
        // Set first oracle as default if available
        if (data.oracles.length > 0) {
          setSelectedOracle(data.oracles[0]);
        }
        
        console.log(`Loaded ${data.oracles.length} oracles`);
      } catch (error) {
        console.error("Error loading oracles:", error);
        setError("Failed to load oracles from blockchain");
      } finally {
        setLoadingOracles(false);
      }
    };
    
    loadOracles();
  }, []);

  // Update member list when oracle changes
  useEffect(() => {
    if (selectedOracle && selectedOracle.members) {
      setMemberList(selectedOracle.members);
      // Auto-select first member if available
      if (selectedOracle.members.length > 0) {
        setSelectedMember(selectedOracle.members[0]);
      } else {
        setSelectedMember(null);
      }
    } else {
      setMemberList([]);
      setSelectedMember(null);
    }
  }, [selectedOracle]);

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

  const formatAddress = (address) => {
    if (!address) return 'Select a member';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
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
    
    if (!selectedOracle) {
      setError("Please select an oracle");
      return;
    }
    
    if (!selectedMember) {
      setError("Please select a member to remove");
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
      
      // Create member removal proposal on Native DAO
      const result = await createOracleMemberRemovalProposal({
        oracleName: selectedOracle.name,
        memberAddress: selectedMember,
        reason: reason,
        userAddress: userAddress
      });
      
      if (result.success) {
        console.log("✅ Member removal proposal creation result:", result);
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
      console.error("Error creating member removal proposal:", error);
      setError(error.message || "Failed to create removal proposal");
      setTransactionStatus(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="skill-oracle-member-removal-step2-container">
      <div className="skill-oracle-member-removal-step2-card">
        <div className="skill-oracle-member-removal-step2-header">
          <BackButton to="/skill-oracle-member-proposal" title="Skill Oracle Member Removal Proposal" />
        </div>

        <div className="skill-oracle-member-removal-step2-content">
          <div className="skill-oracle-member-removal-step2-dropdown-section">
            <div className="skill-oracle-member-removal-step2-dropdown-wrapper">
              <button 
                className="skill-oracle-member-removal-step2-dropdown-button"
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
                  className={`skill-oracle-member-removal-step2-chevron ${isOracleDropdownOpen ? 'open' : ''}`}
                />
              </button>

              {/* Oracle Dropdown menu */}
              {isOracleDropdownOpen && oracleList.length > 0 && (
                <div className="skill-oracle-member-removal-step2-dropdown-menu">
                  {oracleList.map((oracle, index) => (
                    <div
                      key={index}
                      className={`skill-oracle-member-removal-step2-dropdown-item ${selectedOracle?.name === oracle.name ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedOracle(oracle);
                        setIsOracleDropdownOpen(false);
                      }}
                    >
                      <div className="skill-oracle-member-removal-step2-dropdown-item-name">
                        {oracle.name}
                      </div>
                      <div className="skill-oracle-member-removal-step2-dropdown-item-count">
                        {oracle.totalMembers} members
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="skill-oracle-member-removal-step2-info-box">
              <p className="skill-oracle-member-removal-step2-info-label">CURRENT MEMBER COUNT</p>
              <p className="skill-oracle-member-removal-step2-info-value">
                <span className="value-main">{selectedOracle?.totalMembers || 0} </span>
                <span className="value-secondary">/ 20</span>
              </p>
            </div>
          </div>

          <div className="skill-oracle-member-removal-step2-member-dropdown-wrapper">
            <button 
              className="skill-oracle-member-removal-step2-member-dropdown"
              onClick={() => setIsMemberDropdownOpen(!isMemberDropdownOpen)}
              disabled={!selectedOracle || memberList.length === 0}
            >
              <div className="member-dropdown-content">
                <div className="member-avatar"></div>
                <span>
                  {!selectedOracle 
                    ? 'Select an oracle first' 
                    : memberList.length === 0 
                      ? 'No members in this oracle' 
                      : formatAddress(selectedMember)
                  }
                </span>
              </div>
              <img 
                src="/chevron-down.svg" 
                alt="" 
                className={`skill-oracle-member-removal-step2-member-chevron ${isMemberDropdownOpen ? 'open' : ''}`}
              />
            </button>

            {/* Member Dropdown menu */}
            {isMemberDropdownOpen && memberList.length > 0 && (
              <div className="skill-oracle-member-removal-step2-dropdown-menu">
                {memberList.map((member, index) => (
                  <div
                    key={index}
                    className={`skill-oracle-member-removal-step2-member-item ${selectedMember === member ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedMember(member);
                      setIsMemberDropdownOpen(false);
                    }}
                  >
                    <div className="member-avatar"></div>
                    <span className="skill-oracle-member-removal-step2-dropdown-item-name">
                      {formatAddress(member)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <textarea
            className="skill-oracle-member-removal-step2-textarea"
            placeholder="Reason explaining why this person should be removed from the Skill Oracle"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />

          <div className="skill-oracle-member-removal-step2-actions">
            <button 
              className="skill-oracle-member-removal-step2-submit"
              onClick={handleSubmit}
              disabled={isSubmitting || !isConnected || !eligibility?.canPropose || !selectedMember}
              style={{
                opacity: (isSubmitting || !isConnected || !eligibility?.canPropose || !selectedMember) ? 0.5 : 1,
                cursor: (isSubmitting || !isConnected || !eligibility?.canPropose || !selectedMember) ? 'not-allowed' : 'pointer'
              }}
            >
              {isSubmitting ? 'Creating Proposal...' : 'Submit Proposal'}
            </button>
          </div>

          {/* Status/Error Message using Warning component */}
          <div style={{ marginTop: '16px' }}>
            <Warning content={error || transactionStatus || "Member removal proposal requires blockchain transaction and 100+ OW tokens"} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SkillOracleMemberRemovalStep2;
