import React from "react";
import { useNavigate } from "react-router-dom";
import "./ReferEarnNotEligible.css";
import BackButtonProposal from "../../components/BackButtonProposal/BackButtonProposal";

export default function ReferEarnNotEligible() {
  const navigate = useNavigate();

  return (
    <div className="refer-earn-not-eligible-container">
      <div className="refer-earn-not-eligible-card">
        {/* Card Header */}
        <div className="refer-earn-card-header">
          <div className="refer-earn-header-content">
            <BackButtonProposal onClick={() => navigate(-1)} />
            <h2 className="refer-earn-card-title">Refer & Earn</h2>
          </div>
        </div>

        {/* Content */}
        <div className="refer-earn-content">
          {/* Icon */}
          <div className="refer-earn-icon-wrapper">
            <img 
              src="/assets/refer-earn-icon.svg" 
              alt="Refer & Earn" 
              className="refer-earn-icon"
            />
          </div>

          {/* Message */}
          <div className="refer-earn-message-section">
            <p className="refer-earn-message">
              You can be eligible to refer job givers or takers to OpenWork only if 
              you're part of the DAO or have at least 1 skill verified. For every job 
              either given or taken up by this profile in the future, 1% of the payment 
              will come to you.
            </p>
          </div>

          {/* Earnings Display */}
          <div className="refer-earn-earnings-card">
            <div className="refer-earn-earnings-content">
              <p className="refer-earn-earnings-label">YOUR TOTAL REFERRAL EARNINGS</p>
              <div className="refer-earn-earnings-amount">
                <span className="earnings-value">0</span>
                <div className="openwork-token">
                  <img 
                    src="/assets/openwork-token.svg" 
                    alt="OpenWork Token" 
                    className="token-icon"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
