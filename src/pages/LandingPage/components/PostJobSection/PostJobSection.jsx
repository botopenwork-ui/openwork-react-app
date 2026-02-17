import React from 'react';
import { useNavigate } from 'react-router-dom';
import './PostJobSection.css';

const PostJobSection = () => {
  const navigate = useNavigate();

  const handlePostJob = () => {
    navigate('/browse-jobs');
  };

  return (
    <section id="lp-4-section" className="lp-section lp-4-section">
      <div className="lp-4-container">
        {/* Left Content */}
        <div className="lp-4-content">
          <h1 className="lp-4-heading">Post a Job or Browse Talent</h1>
          <p className="lp-4-description">
            Whether you're hiring or getting hired, OpenWork makes it easy to post jobs or discover skilled talent—without platform restrictions.
          </p>
          <button 
            className="lp-blue-button"
            onClick={handlePostJob}
          >
            Post Job/Browse Talent
            <img src="/assets/b16a6ff87b2913f8bdc303dda7816c024bd687cb.svg" alt="" className="lp-button-icon" />
          </button>
        </div>

        {/* Right Content - OpenWork Ledger SVG */}
        <div className="lp-4-ledger-container">
          <img src="/assets/open-work ledger.svg" alt="OpenWork Ledger" className="openwork-ledger-image" />
        </div>
      </div>
    </section>
  );
};

export default PostJobSection;
