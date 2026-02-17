import React from 'react';
import { useNavigate } from 'react-router-dom';
import './ArchitectureSection.css';

const ArchitectureSection = () => {
  const navigate = useNavigate();

  return (
    <section id="lp-11-section" className="lp-11-section">
      <div className="lp-11-container">
        <div className="lp-11-content">
          <h2 className="lp-11-heading">The OpenWork Architecture</h2>
          <p className="lp-11-description">
            OpenWork's chain-agnostic architecture lets users operate on their preferred chains, like Arbitrum, while all data is securely stored on the OpenWork Chain. This OP-Stack based L2 on Ethereum supports oracles for dispute resolution and key DAO decisions through OpenWork's DAO contracts.
          </p>
          <button 
            className="lp-blue-button"
            onClick={() => navigate('/documentation')}
          >
            View Documentation
            <img src="/assets/lp8-arrow-icon.svg" alt="" className="lp-button-icon" />
          </button>
        </div>

        <div className="lp-11-diagram-container">
          {/* Architecture diagram */}
          <img 
            src="/assets/LP-11 architectecture.svg" 
            alt="OpenWork Architecture Diagram" 
            className="lp-11-architecture-image"
          />
        </div>
      </div>
    </section>
  );
};

export default ArchitectureSection;
