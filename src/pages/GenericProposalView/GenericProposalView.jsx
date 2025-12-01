import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import BackButtonProposal from '../../components/BackButtonProposal/BackButtonProposal';
import { getProposalDetails } from '../../services/daoService';
import { castMainDAOVote, castNativeDAOVote, executeProposal } from '../../services/proposalCreationService';
import Web3 from 'web3';
import './GenericProposalView.css';

const GenericProposalView = () => {
  const navigate = useNavigate();
  const { proposalId, chain } = useParams();
  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userAddress, setUserAddress] = useState(null);
  const [voting, setVoting] = useState(false);
  const [voteStatus, setVoteStatus] = useState(null);
  const [executing, setExecuting] = useState(false);
  const [executeStatus, setExecuteStatus] = useState(null);

  useEffect(() => {
    async function loadProposal() {
      try {
        setLoading(true);
        setError(null);
        const data = await getProposalDetails(proposalId, chain);
        setProposal(data);
      } catch (err) {
        console.error('Error loading proposal:', err);
        setError('Failed to load proposal details');
      } finally {
        setLoading(false);
      }
    }

    if (proposalId && chain) {
      loadProposal();
    }
  }, [proposalId, chain]);

  // Connect wallet on mount
  useEffect(() => {
    const connectWallet = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            setUserAddress(accounts[0]);
          }
        } catch (error) {
          console.error('Error getting wallet:', error);
        }
      }
    };
    
    connectWallet();
    
    // Listen for account changes
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        setUserAddress(accounts.length > 0 ? accounts[0] : null);
      });
    }
  }, []);

  const handleExecute = async () => {
    if (!userAddress) {
      setExecuteStatus('Please connect your wallet to execute');
      return;
    }

    if (!proposal.hasMetadata || !proposal.metadata) {
      setExecuteStatus('❌ Cannot execute: proposal metadata not available');
      setTimeout(() => setExecuteStatus(null), 5000);
      return;
    }

    try {
      setExecuting(true);
      setExecuteStatus('Executing proposal...');

      const result = await executeProposal({
        proposalId,
        chain,
        targets: proposal.metadata.targets,
        values: proposal.metadata.values,
        calldatas: proposal.metadata.calldatas,
        description: proposal.description,
        userAddress
      });

      if (result.success) {
        setExecuteStatus('✅ Proposal executed successfully! Refreshing...');
        
        // Refresh proposal data after 2 seconds
        setTimeout(async () => {
          const updatedData = await getProposalDetails(proposalId, chain);
          setProposal(updatedData);
          setExecuteStatus(null);
        }, 2000);
      }
    } catch (error) {
      console.error('Error executing proposal:', error);
      setExecuteStatus(`❌ ${error.message}`);
      setTimeout(() => setExecuteStatus(null), 5000);
    } finally {
      setExecuting(false);
    }
  };

  const handleVote = async (support) => {
    if (!userAddress) {
      setVoteStatus('Please connect your wallet to vote');
      return;
    }

    try {
      setVoting(true);
      setVoteStatus(`${support === 1 ? 'Upvoting' : 'Downvoting'}...`);

      // Call appropriate voting function based on chain
      const voteFunction = chain === 'Base' ? castMainDAOVote : castNativeDAOVote;
      
      const result = await voteFunction({
        proposalId,
        support,
        userAddress
      });

      if (result.success) {
        setVoteStatus('✅ Vote cast successfully! Refreshing...');
        
        // Refresh proposal data after 2 seconds
        setTimeout(async () => {
          const updatedData = await getProposalDetails(proposalId, chain);
          setProposal(updatedData);
          setVoteStatus(null);
        }, 2000);
      }
    } catch (error) {
      console.error('Error voting:', error);
      setVoteStatus(`❌ ${error.message}`);
      setTimeout(() => setVoteStatus(null), 5000);
    } finally {
      setVoting(false);
    }
  };

  if (loading) {
    return (
      <div className="genericProposalViewContainer">
        <div className="genericProposalHeaderSection">
          <div className="back">
            <BackButtonProposal to="/dao" />
            <div className="genericProposalMainTitleWrapper">
              <h1 className="genericProposalMainTitle">Loading Proposal...</h1>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="genericProposalViewContainer">
        <div className="genericProposalHeaderSection">
          <div className="back">
            <BackButtonProposal to="/dao" />
            <div className="genericProposalMainTitleWrapper">
              <h1 className="genericProposalMainTitle">Error Loading Proposal</h1>
            </div>
          </div>
        </div>
        <div className="genericProposalViewCard">
          <p>{error || 'Proposal not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="genericProposalViewContainer">
      {/* Header Section with Back Button and Title */}
      <div className="genericProposalHeaderSection">
        <div className="back">
          <BackButtonProposal to="/dao" />
          <div className="genericProposalMainTitleWrapper">
            <h1 className="genericProposalMainTitle">
              Proposal #{proposalId.substring(0, 3)}...{proposalId.substring(proposalId.length - 3)}
            </h1>
            <div className="genericProposalStatusBadge">{proposal.stateText}</div>
          </div>
        </div>
      </div>

      <div className="genericProposalViewCard">
        {/* Proposal Details Header */}
        <div className="genericProposalDetailsHeaderSection">
          <div className="genericProposalDetailsHeader">
            <h2 className="genericProposalSectionTitle">Proposal Details</h2>
            <span className="genericTimeLeft">{proposal.timeLeft}</span>
          </div>
        </div>

        {/* Chain Info */}
        <div className="genericProposedBySection">
          <span className="genericSectionLabel">CHAIN</span>
          <div className="genericChainInfo">
            <span className="genericChainName">{proposal.chain}</span>
          </div>
        </div>

        {/* Proposed By Section */}
        <div className="genericProposedBySection">
          <span className="genericSectionLabel">PROPOSED BY</span>
          <div className="genericProposerInfo">
            <div className="genericProposerLeft">
              <img src="/avatar-profile.png" alt="Proposer" className="genericProposerAvatar" />
              <span className="genericProposerName">
                {proposal.proposer.startsWith('0x') 
                  ? `${proposal.proposer.substring(0, 6)}...${proposal.proposer.substring(38)}`
                  : proposal.proposer
                }
              </span>
            </div>
            <button className="genericViewProfileButton">
              <span>View Profile</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 11L11 5M11 5H7M11 5V9" stroke="#1246FF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Proposal Status Description */}
        <div className="genericProposalContent">
          <span className="genericSectionLabel">PROPOSAL STATUS</span>
          <div className="genericStatusDescriptionBox">
            <p className="genericStatusDescription">
              {getStatusDescription(proposal.state, proposal.timeLeft)}
            </p>
          </div>
        </div>

        {/* Proposal Details from Database (if available) */}
        {proposal.hasMetadata && (
          <div className="genericProposalContent">
            <span className="genericSectionLabel">PROPOSAL DETAILS</span>
            {proposal.title && (
              <div className="genericInfoBox">
                <span className="genericInfoLabel">Title</span>
                <span className="genericInfoValue">{proposal.title}</span>
              </div>
            )}
            {proposal.description && (
              <div className="genericStatusDescriptionBox">
                <p className="genericStatusDescription">{proposal.description}</p>
              </div>
            )}
            {proposal.recipientAddress && (
              <div className="genericInfoBox">
                <span className="genericInfoLabel">Recipient Address</span>
                <span className="genericInfoValue">{proposal.recipientAddress}</span>
              </div>
            )}
            {proposal.amount && (
              <div className="genericInfoBox">
                <span className="genericInfoLabel">Amount</span>
                <span className="genericInfoValue">{Web3.utils.fromWei(proposal.amount, 'ether')} OW</span>
              </div>
            )}
          </div>
        )}

        {/* Proposal ID Section */}
        <div className="genericProposalContent">
          <span className="genericSectionLabel">PROPOSAL INFORMATION</span>
          {proposal.proposalType && (
            <div className="genericInfoBox">
              <span className="genericInfoLabel">Proposal Type</span>
              <span className="genericInfoValue">{proposal.proposalType}</span>
            </div>
          )}
          <div className="genericInfoBox">
            <span className="genericInfoLabel">Full Proposal ID</span>
            <span className="genericInfoValue">{proposalId}</span>
          </div>
        </div>

        {/* Voting Section */}
        <div className="genericVotingSection">
          <div className="genericTokenCounts">
            <div className="genericTokenCount">
              <span className="genericTokenLabel">TOKENS IN FAVOUR</span>
              <div className="genericTokenValue">
                <span className="genericTokenNumber">{parseFloat(proposal.votes.for).toFixed(0)}</span>
                <div className="genericOpenworkToken">
                  <img src="/token-bg-circle.svg" alt="" className="genericTokenBgCircle" />
                  <img src="/openwork-logomark.svg" alt="" className="genericTokenLogomark" />
                </div>
              </div>
            </div>
            <div className="genericTokenCount">
              <span className="genericTokenLabel">TOKENS AGAINST</span>
              <div className="genericTokenValue">
                <span className="genericTokenNumber">{parseFloat(proposal.votes.against).toFixed(0)}</span>
                <div className="genericOpenworkToken">
                  <img src="/token-bg-circle.svg" alt="" className="genericTokenBgCircle" />
                  <img src="/openwork-logomark.svg" alt="" className="genericTokenLogomark" />
                </div>
              </div>
            </div>
          </div>

          <div className="genericProgressBarSection">
            <div className="genericProgressLabels">
              <span className="genericThresholdLabel">VOTING PROGRESS</span>
            </div>
            <div className="genericProgressBarContainer">
              <div className="genericProgressBar">
                <div className="genericProgressBarFill favor" style={{width: `${proposal.percentages.for}%`}}></div>
                <div className="genericProgressBarFill against" style={{width: `${proposal.percentages.against}%`}}></div>
              </div>
              <div className="genericThresholdLine"></div>
            </div>
            <div className="genericProgressLegend">
              <span className="genericTotalVotesLabel">
                {(parseFloat(proposal.votes.for) + parseFloat(proposal.votes.against)).toFixed(0)} TOTAL VOTES
              </span>
              <div className="genericLegendItems">
                <div className="genericLegendItem">
                  <img src="/ellipse-green.svg" alt="In Favor" />
                  <span>{parseFloat(proposal.votes.for).toFixed(0)} IN FAVOUR ({proposal.percentages.for}%)</span>
                </div>
                <div className="genericLegendItem">
                  <img src="/ellipse-red.svg" alt="Against" />
                  <span>{parseFloat(proposal.votes.against).toFixed(0)} AGAINST ({proposal.percentages.against}%)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Execute Status Message */}
        {executeStatus && (
          <div className="genericVoteStatus">
            <p>{executeStatus}</p>
          </div>
        )}

        {/* Vote Status Message */}
        {voteStatus && (
          <div className="genericVoteStatus">
            <p>{voteStatus}</p>
          </div>
        )}

        {/* Execute Button - Show for Succeeded proposals */}
        {proposal.state === 4 && (
          <>
            {console.log('📊 Proposal Debug:', {
              state: proposal.state,
              hasMetadata: proposal.hasMetadata,
              metadata: proposal.metadata,
              description: proposal.description
            })}
            {proposal.hasMetadata ? (
              <button 
                className="genericExecuteButton"
                onClick={handleExecute}
                disabled={executing}
                style={{
                  opacity: executing ? 0.7 : 1,
                  cursor: executing ? 'wait' : 'pointer'
                }}
              >
                <span>{executing ? 'Executing...' : 'Execute Proposal'}</span>
              </button>
            ) : (
              <div className="genericVoteStatus">
                <p>⚠️ Execution requires proposal metadata. This proposal was not created through the UI.</p>
              </div>
            )}
          </>
        )}

        {/* Vote Buttons - Only show for Active proposals */}
        {proposal.state === 1 && (
          <div className="genericVoteButtonsRow">
          <button 
            className="genericDownvoteButton"
            onClick={() => handleVote(0)}
            disabled={voting || !userAddress || proposal.state !== 1}
            style={{
              opacity: (voting || !userAddress || proposal.state !== 1) ? 0.5 : 1,
              cursor: (voting || !userAddress || proposal.state !== 1) ? 'not-allowed' : 'pointer'
            }}
          >
            <span>Downvote</span>
            <img src="/downvote.svg" alt="Downvote" className="genericVoteIcon" />
          </button>
          <button 
            className="genericUpvoteButton"
            onClick={() => handleVote(1)}
            disabled={voting || !userAddress || proposal.state !== 1}
            style={{
              opacity: (voting || !userAddress || proposal.state !== 1) ? 0.5 : 1,
              cursor: (voting || !userAddress || proposal.state !== 1) ? 'not-allowed' : 'pointer'
            }}
          >
            <span>Upvote</span>
            <img src="/upvote.svg" alt="Upvote" className="genericVoteIcon" />
          </button>
        </div>
        )}
      </div>
    </div>
  );
};

// Helper function to get natural language status description
const getStatusDescription = (state, timeLeft) => {
  switch(state) {
    case 0: // Pending
      return "This proposal is pending and waiting for the voting period to begin.";
    case 1: // Active
      return `This proposal is currently active for voting. ${timeLeft !== "Ended" ? `Voting ends in ${timeLeft.toLowerCase()}.` : ""}`;
    case 2: // Canceled
      return "This proposal has been canceled and will not be executed.";
    case 3: // Defeated
      return "This proposal was defeated and did not receive enough votes to pass.";
    case 4: // Succeeded
      return "This proposal has succeeded and is ready to be queued for execution.";
    case 5: // Queued
      return "This proposal has been queued and is waiting for the timelock period to complete before execution.";
    case 6: // Expired
      return "This proposal has expired and can no longer be executed.";
    case 7: // Executed
      return "This proposal has been successfully executed and the changes are now live.";
    default:
      return "Proposal status unknown.";
  }
};

export default GenericProposalView;
