import React from "react";
import { useNavigate } from "react-router-dom";
import "./ReferralNotEligible.css";
import BackButtonProposal from "../../components/BackButtonProposal/BackButtonProposal";

export default function ReferralNotEligible() {
  const navigate = useNavigate();

  return (
    <div className="referral-not-eligible-container">
      {/* Header Section with Back Button and Title */}
      <div className="referral-header-section">
        <div className="referral-back-wrapper">
          <BackButtonProposal onClick={() => navigate(-1)} />
          <div className="referral-title-wrapper">
            <h1 className="referral-main-title">UI for OpenWork</h1>
          </div>
        </div>
      </div>

      <div className="referral-not-eligible-card">
        {/* Card Header */}
        <div className="referral-card-header">
          <h2 className="referral-card-title">Refer someone</h2>
        </div>

        {/* Content */}
        <div className="referral-content">
          {/* Icon */}
          <div className="referral-icon-wrapper">
            <img 
              src="/assets/user-not-eligible-icon.svg" 
              alt="Not Eligible" 
              className="referral-icon"
            />
          </div>

          {/* Message */}
          <div className="referral-message-section">
            <p className="referral-message">
              You can be eligible to refer job givers or takers to OpenWork only if 
              you're part of the DAO or have at least 1 skill verified. For every job 
              either given or taken up by this profile in the future, 1% of the payment 
              will come to you.
            </p>
          </div>

          {/* Earnings Display */}
          <div className="referral-earnings-card">
            <div className="referral-earnings-content">
              <p className="referral-earnings-label">YOUR TOTAL REFERRAL EARNINGS</p>
              <div className="referral-earnings-amount">
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
