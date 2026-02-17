import React from 'react';
import { useNavigate } from 'react-router-dom';
import './GovernanceSection.css';

const GovernanceSection = () => {
  const navigate = useNavigate();

  return (
    <section id="lp-9-section" className="lp-section lp-9-section">
      <div className="lp-9-container">
        <div className="lp-9-content">
          <h1 className="lp-9-heading">Governed by its community of OWORK Token holders</h1>
          <p className="lp-9-description">
            OpenWork is governed by its community. Propose upgrades, manage funds, and vote on key decisions with real stake in the system.
          </p>
          <button 
            className="lp-blue-button"
            onClick={() => navigate('/documentation')}
          >
            View Documentation
            <img src="/assets/lp7-arrow-icon.svg" alt="" className="lp-button-icon" />
          </button>
        </div>

        <div className="lp-9-circle-container">
          <div className="lp-9-governance-circle-group">
            {/* Ellipse Background and Avatars Container (rotates together) */}
            <div className="lp-9-outer-ring-container">
              {/* Ellipse Background */}
              <img src="/assets/lp9-ellipse-bg.svg" alt="" className="lp-9-ellipse-bg" />

              {/* Community Avatars */}
              <div className="lp-9-avatar lp-9-avatar-top">
                <img src="/assets/lp7-oracle-1.png" alt="Member" className="lp-9-avatar-img" />
              </div>

              <div className="lp-9-avatar lp-9-avatar-left">
                <img src="/assets/lp7-oracle-2.png" alt="Member" className="lp-9-avatar-img" />
              </div>

              <div className="lp-9-avatar lp-9-avatar-bottom-left">
                <img src="/assets/lp7-oracle-3.png" alt="Member" className="lp-9-avatar-img" />
              </div>

              <div className="lp-9-avatar lp-9-avatar-bottom-right">
                <img src="/assets/lp7-oracle-4.png" alt="Member" className="lp-9-avatar-img" />
              </div>

              <div className="lp-9-avatar lp-9-avatar-right">
                <img src="/assets/lp7-oracle-5.png" alt="Member" className="lp-9-avatar-img" />
              </div>
            </div>

            {/* Radiant Glow */}
            <div className="lp-9-radiant-glow"></div>

            {/* Core Circle */}
            <div className="lp-9-core-circle">
              <img src="/assets/lp7-core-circle.svg" alt="" className="lp-9-core-bg" />
            </div>

            {/* Center Governance Icon */}
            <div className="lp-9-center-icon">
              <img src="/assets/lp9-governance-icon.svg" alt="Governance" className="lp-9-governance-img" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default GovernanceSection;
