import React from 'react';
import { useNavigate } from 'react-router-dom';
import './UserReferralSignIn.css';

const UserReferralSignIn = () => {
  const navigate = useNavigate();

  const handleConnectSignUp = () => {
    // Navigate to wallet connection or sign up process
    console.log('Connect & Sign Up clicked');
  };

  return (
    <div className="user-referral-signin">
      <div className="signin-container">
        <div className="signin-card">
          <div className="signin-content">
            {/* OpenWork Logo */}
            <div className="openwork-logo">
              <div className="logo-mask">
                <img src="/assets/openwork-logo-mask.png" alt="OpenWork" className="logo-mask-img" />
              </div>
              <img src="/assets/openwork-logo-circle.svg" alt="" className="logo-circle" />
              <img src="/assets/openwork-logo-dot.svg" alt="" className="logo-dot logo-dot-left" />
              <img src="/assets/openwork-logo-dot.svg" alt="" className="logo-dot logo-dot-right" />
            </div>

            {/* Main Content */}
            <div className="signin-main">
              <div className="signin-text">
                <h1 className="signin-title">You've been invited</h1>
                <p className="signin-description">
                  You've been invited to join OpenWork. Connect your wallet to give all the benefits to your referrer!
                </p>
              </div>

              {/* Referrer Info */}
              <div className="referrer-info">
                <div className="referrer-label">YOUR REFERRER</div>
                <div className="referrer-address">
                  <img src="/assets/user-swatch.png" alt="" className="referrer-icon" />
                  <span className="referrer-wallet">0xDEAF...fB8B</span>
                </div>
              </div>
            </div>
          </div>

          {/* Connect Button */}
          <button className="connect-signup-button" onClick={handleConnectSignUp}>
            Connect & Sign Up
            <img src="/assets/arrow-up-right-white.svg" alt="" className="button-icon" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserReferralSignIn;
