import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BackButtonProposal from '../../components/BackButtonProposal/BackButtonProposal';
import './ContractUpgradeProposalView.css';

const ContractUpgradeProposalView = () => {
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
      <div className="viewContractLink" onClick={() => window.open('/contract-link', '_blank')}>
        <span>View contract</span>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M5 11L11 5M11 5H7M11 5V9" stroke="#1246FF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      {/* Card Container */}
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
              <span className="proposerName">Brijesh Pandey</span>
            </div>
            <button className="viewProfileButton" onClick={() => navigate('/profile')}>
              <span>View Profile</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 11L11 5M11 5H7M11 5V9" stroke="#1246FF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Proposal Content */}
        <div className="proposalContent">
          <span className="sectionLabel">PROPOSAL DETAILS</span>
          <div className="codeSnippetBox">
            <div className="codeSnippetSidebar">
              <span>1</span>
              <span>2</span>
              <span>3</span>
              <span>4</span>
              <span>5</span>
              <span>6</span>
              <span>7</span>
              <span>8</span>
              <span>9</span>
              <span>10</span>
              <span>11</span>
              <span>12</span>
              <span>13</span>
              <span>14</span>
              <span>15</span>
              <span>16</span>
              <span>17</span>
              <span>18</span>
              <span>19</span>
              <span>20</span>
              <span>21</span>
            </div>
            <div className="codeSnippetContent">
              <div className="codeLine comment">// Imports</div>
              <div className="codeLine"><span className="keyword">import</span> <span className="variable">mongoose</span>{`, { `}<span className="variable">Schema</span>{` } `}<span className="keyword">from</span>{` 'untitled'`}</div>
              <div className="codeLine">&nbsp;</div>
              <div className="codeLine comment">// Collection name</div>
              <div className="codeLine"><span className="keyword">export const</span> <span className="variable">collection</span>{` = 'Design'|`}</div>
              <div className="codeLine">&nbsp;</div>
              <div className="codeLine comment">// Schema</div>
              <div className="codeLine"><span className="keyword">const</span> <span className="variable">schema</span>{` = `}<span className="keyword">new</span>{` Schema({`}</div>
              <div className="codeLine">  <span className="variable">name</span>{`: {`}</div>
              <div className="codeLine">    <span className="variable">type</span>: String,</div>
              <div className="codeLine">    <span className="variable">required</span>: true</div>
              <div className="codeLine">{`  },`}</div>
              <div className="codeLine">&nbsp;</div>
              <div className="codeLine">  <span className="variable">description</span>{`: {`}</div>
              <div className="codeLine">    <span className="variable">type</span>: String</div>
              <div className="codeLine">{`  }`}</div>
              <div className="codeLine">{`}, {`}<span className="variable">timestamps</span>{`: true})`}</div>
              <div className="codeLine">&nbsp;</div>
              <div className="codeLine comment">// Model</div>
              <div className="codeLine"><span className="keyword">export default</span>{` untitled.model(`}<span className="variable">collection</span>{`, `}<span className="variable">schema</span>{`, `}<span className="variable">collection</span>)</div>
              <div className="codeLine">&nbsp;</div>
            </div>
          </div>
          <div className="reasonBox">
            <p>
              Reasons explaining how and why this contract could be upgraded go here
            </p>
          </div>
        </div>

        {/* Voting Section */}
        <div className="votingSection">
          <div className="tokensRow">
            <div className="tokensBox">
              <span className="tokensLabel">TOKENS IN FAVOUR</span>
              <div className="tokensValue">
                <span>1M</span>
                <div className="openworkToken">
                  <img src="/token-bg-circle.svg" alt="" className="tokenBgCircle" />
                  <img src="/openwork-logomark.svg" alt="OpenWork Token" className="tokenLogomark" />
                </div>
              </div>
            </div>
            <div className="tokensBox">
              <span className="tokensLabel">TOKENS AGAINST</span>
              <div className="tokensValue">
                <span>250K</span>
                <div className="openworkToken">
                  <img src="/token-bg-circle.svg" alt="" className="tokenBgCircle" />
                  <img src="/openwork-logomark.svg" alt="OpenWork Token" className="tokenLogomark" />
                </div>
              </div>
            </div>
          </div>

          <div className="progressSection">
            <div className="progressBarWrapper">
              <div className="progressHeader">
                <span className="thresholdLabel">MIN. THRESHOLD 75%</span>
              </div>
              <div className="progressBarContainer">
                <div className="progressBarGreen"></div>
                <div className="progressBarRed">
                  <div className="progressBarRedFill"></div>
                </div>
                <div className="thresholdLine"></div>
              </div>
              <div className="voteStats">
                <span className="totalVotes">0.25M TOTAL VOTES</span>
                <div className="voteLegend">
                  <div className="legendItem">
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="4" cy="4" r="4" fill="#17B26A"/>
                    </svg>
                    <span>0.25M IN FAVOUR</span>
                  </div>
                  <div className="legendItem">
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="4" cy="4" r="4" fill="#B42318"/>
                    </svg>
                    <span>0 AGAINST</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Conditions Box */}
        <div className="conditionsBox">
          <span className="conditionsTitle">CONDITIONS TO BE MET BEFORE TIME LOCK PERIOD</span>
          <div className="conditionsList">
            <ul>
              <li><span>1M minimum votes </span><span className="currentValue">(Current: 0.25M votes)</span></li>
              <li><span>75% minimum approval percentage </span><span className="currentValue">(Current: 40%)</span></li>
            </ul>
          </div>
          <button className="voteHistoryButton" onClick={() => navigate('/vote-history')}>
            <span>Vote History</span>
            <img src="/chevron-up.svg" alt="" className="chevronRight" />
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

export default ContractUpgradeProposalView;
