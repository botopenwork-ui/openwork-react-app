import React from 'react';
import { useNavigate } from 'react-router-dom';
import './RevolutionSection.css';

const RevolutionSection = () => {
  const navigate = useNavigate();

  return (
    <section id="lp-12-section" className="lp-12-section">
      <div className="lp-12-container">
        <div className="lp-12-content">
          <h2 className="lp-12-heading">Join the Work Revolution</h2>
          <p className="lp-12-description">
            Build your profile, discover opportunities, or become a contributor. OpenWork is the internet's future of work—owned by its users.
          </p>
          <button 
            className="lp-blue-button"
            onClick={() => navigate('/home')}
          >
            Launch App
            <img src="/assets/lp12-arrow-icon.svg" alt="" className="lp-button-icon" />
          </button>
        </div>

        <div className="lp-12-circle-container">
          <div className="lp-12-network-group">
            <img src="/assets/lp12-network.svg" alt="Network" className="lp-12-network-bg" />

            <div className="lp-12-center-token">
              <div className="lp-12-token-badge">
                <img src="/assets/lp12-logo.svg" alt="OpenWork" className="lp-12-logo-icon" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default RevolutionSection;
