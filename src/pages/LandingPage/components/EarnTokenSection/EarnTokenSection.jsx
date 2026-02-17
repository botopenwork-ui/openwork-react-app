import React from 'react';
import { useNavigate } from 'react-router-dom';
import './EarnTokenSection.css';

const EarnTokenSection = () => {
  const navigate = useNavigate();

  return (
    <section id="lp-8-section" className="lp-section lp-8-section">
      <div className="lp-8-container">
        <div className="lp-8-content">
          <h1 className="lp-8-heading">Earn OWORK tokens by doing jobs on OpenWork</h1>
          <p className="lp-8-description">
            100% of OWORK tokens are earned by completing jobs on the platform. No pre-sale. No investors. Just proof of work.
          </p>
          <button 
            className="lp-blue-button"
            onClick={() => navigate('/browse-jobs')}
          >
            Earn OWORK Token
            <img src="/assets/lp8-arrow-icon.svg" alt="" className="lp-button-icon" />
          </button>
        </div>

        <div className="lp-8-circle-container">
          <div className="lp-8-token-circle-group">
            {/* Ellipse Background */}
            <img src="/assets/lp8-ellipse-bg.svg" alt="" className="lp-8-ellipse-bg" />

            {/* Radiant Glow */}
            <div className="lp-8-radiant-glow"></div>

            {/* Core Circle */}
            <div className="lp-8-core-circle">
              <img src="/assets/lp8-core-circle.svg" alt="" className="lp-8-core-bg" />
            </div>

            {/* Center Token */}
            <div className="lp-8-center-token">
              <img src="/assets/lp8-openwork-coin.png" alt="OWORK Token" className="lp-8-token-image" />
            </div>

            {/* Left User Avatar */}
            <div className="lp-8-user-avatar lp-8-user-left">
              <div className="lp-8-user-label lp-8-spend-label">
                <span className="lp-8-label-text">SPEND</span>
                <div className="lp-8-amount-display">
                  <img src="/assets/lp8-usdc-icon.png" alt="USDC" className="lp-8-currency-icon" />
                  <span className="lp-8-amount-text">$10K</span>
                </div>
              </div>
              <div className="lp-8-user-button">
                <img src="/assets/lp8-user-1.png" alt="User" className="lp-8-user-img" />
              </div>
              <div className="lp-8-user-label lp-8-earn-label">
                <span className="lp-8-label-text lp-8-earn-text">EARN</span>
                <div className="lp-8-amount-display">
                  <div className="lp-8-token-icon">
                    <img src="/assets/lp8-owork-token.svg" alt="OWORK" className="lp-8-token-icon-img" />
                  </div>
                  <span className="lp-8-token-amount">50K</span>
                </div>
              </div>
            </div>

            {/* Right User Avatar */}
            <div className="lp-8-user-avatar lp-8-user-right">
              <div className="lp-8-user-label lp-8-earn-label-alt">
                <span className="lp-8-label-text">EARN</span>
                <div className="lp-8-amount-display">
                  <img src="/assets/lp8-usdc-icon.png" alt="USDC" className="lp-8-currency-icon" />
                  <span className="lp-8-amount-text">$10K</span>
                </div>
              </div>
              <div className="lp-8-user-button">
                <img src="/assets/lp8-user-2.png" alt="User" className="lp-8-user-img" />
              </div>
              <div className="lp-8-user-label lp-8-earn-label">
                <span className="lp-8-label-text lp-8-earn-text">EARN</span>
                <div className="lp-8-amount-display">
                  <div className="lp-8-token-icon">
                    <img src="/assets/lp8-owork-token.svg" alt="OWORK" className="lp-8-token-icon-img" />
                  </div>
                  <span className="lp-8-token-amount">50K</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default EarnTokenSection;
