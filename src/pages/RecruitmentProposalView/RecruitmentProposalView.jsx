import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BackButtonProposal from '../../components/BackButtonProposal/BackButtonProposal';
import './RecruitmentProposalView.css';

const RecruitmentProposalView = () => {
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

        {/* Oracle Details Section */}
        <div className="proposalContent">
          <span className="sectionLabel">ORACLE DETAILS</span>
          
          {/* Oracle Dropdown */}
          <div className="oracleDropdownField">
            <span className="oracleLabel">General Skill Oracle</span>
            <img src="/chevron-up.svg" alt="Expand" className="chevronDown" />
          </div>

          {/* Current Member Count */}
          <div className="memberCountField">
            <span className="fieldLabel">CURRENT MEMBER COUNT</span>
            <div className="memberCountValue">
              10 <span className="memberCountGray">/ 20</span>
            </div>
          </div>
        </div>

        {/* Request to Recruit Section */}
        <div className="proposalContent">
          <span className="sectionLabel">REQUEST TO RECRUIT</span>
          
          {/* Wallet Address Field */}
          <div className="walletAddressInput">
            0xDEAF...fB8B
          </div>

          {/* Email/Telegram Field */}
          <div className="emailTelegramInput">
            Email ID / Telegram ID of this person
          </div>

          {/* Reason Box */}
          <div className="reasonTextArea">
            Reason explaining why this person should be recruited
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
            <div className="progressBarHeader">
              <span className="totalVotesLabel">0.25M TOTAL VOTES</span>
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

export default RecruitmentProposalView;
