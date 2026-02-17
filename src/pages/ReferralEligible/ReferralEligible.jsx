import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./ReferralEligible.css";
import BackButtonProposal from "../../components/BackButtonProposal/BackButtonProposal";

export default function ReferralEligible() {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const referralLink = "https://openwork.com/019824091ijbfouwqf-129874ig";

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="referral-eligible-container">
      {/* Header Section with Back Button and Title */}
      <div className="referral-header-section">
        <div className="referral-back-wrapper">
          <BackButtonProposal onClick={() => navigate(-1)} />
          <div className="referral-title-wrapper">
            <h1 className="referral-main-title">UI for OpenWork</h1>
          </div>
        </div>
      </div>

      <div className="referral-eligible-card">
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
              alt="Eligible" 
              className="referral-icon"
            />
          </div>

          {/* Message */}
          <div className="referral-message-section">
            <p className="referral-message">
              Since you're part of the DAO or have at least 1 skill verified, you are 
              eligible to refer job givers or takers to OpenWork. For every job either 
              given or taken up by this profile in the future, 1% of the payment will 
              come to you.
            </p>
          </div>

          {/* Copy Link Section */}
          <div className="referral-link-section">
            <p className="referral-link-label">COPY AND SHARE THIS LINK</p>
            <div className="referral-link-input-wrapper">
              <button 
                className="referral-link-button" 
                onClick={handleCopyLink}
                title={copied ? "Copied!" : "Click to copy"}
              >
                <span className="referral-link-text">{referralLink}</span>
                <img 
                  src="/assets/copy-icon.svg" 
                  alt="Copy" 
                  className="copy-icon"
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
