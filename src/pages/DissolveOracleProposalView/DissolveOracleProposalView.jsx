import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BackButtonProposal from '../../components/BackButtonProposal/BackButtonProposal';
import './DissolveOracleProposalView.css';

const DissolveOracleProposalView = () => {
  const navigate = useNavigate();

  return (
    <div className="proposalViewContainer">
      {/* Header Section with Back Button and Title */}
      <div className="proposalHeaderSection">
        <div className="back">
          <BackButtonProposal to="/dao" />
          <div className="proposalMainTitleWrapper">
            <h1 className="proposalMainTitle">OpenWork DAO Smart Contract Proposal</h1>
            <div className="proposalStatusBadge">Open</div>
          </div>
        </div>
      </div>

      {/* View Contract Link */}
      <div className="viewContractLink">
        <span>View contract</span>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M5 11L11 5M11 5H7M11 5V9" stroke="#1246FF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      <div className="proposalViewCard">
        <div className="proposalDetailsHeaderSection">
          <div className="proposalDetailsHeader">
            <h2 className="proposalSectionTitle">Proposal Details</h2>
            <span className="timeLeft">2 days left</span>
          </div>
        </div>

        {/* Proposed By Section */}
        <div className="proposedBySection">
          <span className="sectionLabel">PROPOSED BY</span>
          <div className="proposerInfo">
            <div className="proposerLeft">
              <img src="/avatar-profile.png" alt="Proposer" className="proposerAvatar" />
              <span className="proposerName">Mollie Hall</span>
            </div>
            <button className="viewProfileButton">
              <span>View Profile</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 11L11 5M11 5H7M11 5V9" stroke="#1246FF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Proposal Details Section */}
        <div className="proposalContent">
          <span className="sectionLabel">PROPOSAL DETAILS</span>
          
          <div className="detailField">
            <div className="fieldButton">General Skill Oracle</div>
          </div>

          <div className="reasonBox">
            <p className="reasonText">
              Reason explaining why this skill oracle should exist
            </p>
          </div>
        </div>

        {/* Voting Section */}
        <div className="votingSection">
          <div className="tokenCounts">
            <div className="tokenCount">
              <span className="tokenLabel">TOKENS IN FAVOUR</span>
              <div className="tokenValue">
                <span className="tokenNumber">1M</span>
                <div className="openworkToken">
                  <img src="/token-bg-circle.svg" alt="" className="tokenBgCircle" />
                  <img src="/openwork-logomark.svg" alt="" className="tokenLogomark" />
                </div>
              </div>
            </div>
            <div className="tokenCount">
              <span className="tokenLabel">TOKENS AGAINST</span>
              <div className="tokenValue">
                <span className="tokenNumber">250K</span>
                <div className="openworkToken">
                  <img src="/token-bg-circle.svg" alt="" className="tokenBgCircle" />
                  <img src="/openwork-logomark.svg" alt="" className="tokenLogomark" />
                </div>
              </div>
            </div>
          </div>

          <div className="progressBarSection">
            <div className="progressLabels">
              <span className="thresholdLabel">MIN. THRESHOLD 75%</span>
            </div>
            <div className="progressBarContainer">
              <div className="progressBar">
                <div className="progressBarFill favor"></div>
                <div className="progressBarFill against"></div>
              </div>
              <div className="thresholdLine"></div>
            </div>
            <div className="progressLegend">
              <span className="totalVotesLabel">0.25M TOTAL VOTES</span>
              <div className="legendItems">
                <div className="legendItem">
                  <img src="/ellipse-green.svg" alt="In Favor" />
                  <span>0.25M IN FAVOUR</span>
                </div>
                <div className="legendItem">
                  <img src="/ellipse-red.svg" alt="Against" />
                  <span>0 AGAINST</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Conditions Section */}
        <div className="conditionsSection">
          <div className="conditionsHeader">
            <span className="conditionsLabel">CONDITIONS TO BE MET BEFORE TIME LOCK PERIOD</span>
            <div className="conditionsText">
              <ul className="conditionsList">
                <li><span>1M minimum votes </span><span className="currentValue">(Current: 0.25M votes)</span></li>
                <li><span>75% minimum approval percentage </span><span className="currentValue">(Current: 40%)</span></li>
              </ul>
            </div>
          </div>
          <button className="voteHistoryButton">
            <span>Vote History</span>
            <img src="/chevron-up.svg" alt="Arrow" className="chevronRight" />
          </button>
        </div>

        {/* Vote Buttons */}
        <div className="voteButtonsRow">
          <button className="downvoteButton">
            <span>Downvote</span>
            <img src="/downvote.svg" alt="Downvote" className="voteIcon" />
          </button>
          <button className="upvoteButton">
            <span>Upvote</span>
            <img src="/upvote.svg" alt="Upvote" className="voteIcon" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DissolveOracleProposalView;
