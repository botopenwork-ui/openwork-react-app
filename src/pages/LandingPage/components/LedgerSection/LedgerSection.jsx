import React from 'react';
import { useNavigate } from 'react-router-dom';
import './LedgerSection.css';

const LedgerSection = () => {
  const navigate = useNavigate();

  const handleShowLedger = () => {
    navigate('/browse-jobs');
  };

  return (
    <section id="lp-3-section" className="lp-section lp-3-section">
      <div className="lp-3-container">
        {/* Left Content */}
        <div className="lp-3-content">
          <h1 className="lp-3-heading">Added to the Ledger - Forever Yours</h1>
          <p className="lp-3-description">
            Every job, update, and review is logged immutably in the OpenWork Ledger (OWL), giving you a permanent and transparent work history.
          </p>
          <button 
            className="lp-blue-button"
            onClick={handleShowLedger}
          >
            Show Ledger
            <img src="/assets/b16a6ff87b2913f8bdc303dda7816c024bd687cb.svg" alt="" className="lp-button-icon" />
          </button>
        </div>

        {/* Right Content - OpenWork Ledger SVG */}
        <div className="lp-3-ledger-container">
          <img src="/assets/open-work ledger.svg" alt="OpenWork Ledger" className="openwork-ledger-image" />
        </div>
      </div>
    </section>
  );
};

export default LedgerSection;
