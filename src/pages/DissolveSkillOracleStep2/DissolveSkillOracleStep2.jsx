import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BackButton from '../../components/BackButton/BackButton';
import './DissolveSkillOracleStep2.css';

const DissolveSkillOracleStep2 = () => {
  const navigate = useNavigate();
  const [selectedOracle, setSelectedOracle] = useState('General Skill Oracle');
  const [reason, setReason] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleSubmit = () => {
    // Handle form submission
    console.log({ selectedOracle, reason });
  };

  return (
    <div className="dissolve-skill-oracle-step2-container">
      <div className="dissolve-skill-oracle-step2-card">
        <div className="dissolve-skill-oracle-step2-header">
          <BackButton to="/skill-oracle-proposal" title="Dissolve Skill Oracle" />
        </div>

        <div className="dissolve-skill-oracle-step2-content">
          <div className="dissolve-skill-oracle-step2-dropdown-section">
            <button 
              className="dissolve-skill-oracle-step2-dropdown-button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <span>{selectedOracle}</span>
              <img 
                src="/chevron-down.svg" 
                alt="" 
                className={`dissolve-skill-oracle-step2-chevron ${isDropdownOpen ? 'open' : ''}`}
              />
            </button>

            <div className="dissolve-skill-oracle-step2-info-box">
              <p className="dissolve-skill-oracle-step2-info-label">CURRENT MEMBER COUNT</p>
              <p className="dissolve-skill-oracle-step2-info-value">
                <span className="value-main">34 </span>
                <span className="value-secondary">/ 20</span>
              </p>
            </div>
          </div>

          <textarea
            className="dissolve-skill-oracle-step2-textarea"
            placeholder="Reason explaining why this skill oracle should exist"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />

          <div className="dissolve-skill-oracle-step2-actions">
            <button 
              className="dissolve-skill-oracle-step2-submit"
              onClick={handleSubmit}
            >
              Submit Proposal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DissolveSkillOracleStep2;
