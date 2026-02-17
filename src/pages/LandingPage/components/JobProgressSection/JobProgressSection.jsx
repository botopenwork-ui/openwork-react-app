import React from 'react';
import { useNavigate } from 'react-router-dom';
import './JobProgressSection.css';

const JobProgressSection = () => {
  const navigate = useNavigate();

  const handleViewJobs = () => {
    navigate('/browse-jobs');
  };

  return (
    <section id="lp-6-section" className="lp-section lp-6-section">
      <div className="lp-6-container">
        {/* Left Content */}
        <div className="lp-6-content">
          <h1 className="lp-6-heading">Job in Progress</h1>
          <p className="lp-6-description">
            Work gets done in milestones. Submit deliverables, leave reviews, and manage everything transparently in real-time.
          </p>
          <button 
            className="lp-blue-button"
            onClick={handleViewJobs}
          >
            View Jobs
            <img src="/assets/b16a6ff87b2913f8bdc303dda7816c024bd687cb.svg" alt="" className="lp-button-icon" />
          </button>
        </div>

        {/* Right Content - Job Details Card (SVG placeholder) */}
        <div className="lp-6-job-card-container">
          <img src="/assets/job-table-LP.svg" alt="Job Details" className="lp-6-job-card-image" />
        </div>
      </div>
    </section>
  );
};

export default JobProgressSection;
