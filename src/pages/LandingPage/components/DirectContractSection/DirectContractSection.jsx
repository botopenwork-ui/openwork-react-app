import React from 'react';
import { useNavigate } from 'react-router-dom';
import './DirectContractSection.css';

const DirectContractSection = () => {
  const navigate = useNavigate();

  const handleCreateContract = () => {
    navigate('/browse-jobs');
  };

  return (
    <section id="lp-5-section" className="lp-section lp-5-section">
      <div className="lp-5-container">
        <div className="lp-5-content">
          <h1 className="lp-5-heading">Create Direct Job Contract</h1>
          <p className="lp-5-description">
            Set your own terms and use smart contracts to lock payments in escrow. No third parties. Just code, transparency, and control.
          </p>
          <button 
            className="lp-blue-button"
            onClick={handleCreateContract}
          >
            Create Direct Contract
            <img src="/assets/b16a6ff87b2913f8bdc303dda7816c024bd687cb.svg" alt="" className="lp-button-icon" />
          </button>
        </div>

        <div className="contract-circle-section">
          <div className="contract-circle-group">
            <div className="contract-radiant-glow">
              <img src="/assets/lp5-glow-1.svg" alt="" />
              <img src="/assets/lp5-glow-2.svg" alt="" className="glow-overlay" />
            </div>
            
            <img 
              src="/assets/lp5-circle-bg.svg" 
              alt="" 
              className="contract-circle-bg"
            />

            <div className="contract-avatar contract-avatar-left">
              <img src="/assets/3d90d978da202913302b7c506fa777f428500cc6.png" alt="Jollie Hall" />
            </div>

            <div className="contract-avatar contract-avatar-right">
              <img src="/assets/mollie-avatar.png" alt="Mollie Hall" />
            </div>

            <div className="contract-center-info">
              <div className="contract-amount">
                <span className="amount-value">45</span>
                <img src="/assets/usdc-icon.png" alt="USDC" className="usdc-icon" />
              </div>
              <span className="amount-label">AMOUNT LOCKED</span>
            </div>

            <div className="contract-info contract-info-left">
              <div className="contract-amount">
                <span className="amount-value">100</span>
                <img src="/assets/usdc-icon.png" alt="USDC" className="usdc-icon" />
              </div>
              <span className="amount-label">AMOUNT PAID</span>
              <span className="user-name">Jollie Hall</span>
            </div>

            <div className="contract-info contract-info-right">
              <div className="contract-amount">
                <span className="amount-value">50</span>
                <img src="/assets/usdc-icon.png" alt="USDC" className="usdc-icon" />
              </div>
              <span className="amount-label">AMOUNT RECEIVED</span>
              <span className="user-name">Mollie Hall</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DirectContractSection;
