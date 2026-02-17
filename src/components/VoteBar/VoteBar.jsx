import React from 'react';
import './VoteBar.css'; // Add custom styling here

const VoteBar = ({ totalVotes, votesInFavor, votesAgainst, threshold }) => {
  const inFavorPercentage = (votesInFavor / totalVotes) * 100;
  const inAgainstPercentage = (votesAgainst / totalVotes) * 100;
  const thresholdPosition = threshold; // Assuming it's a percentage
  
  // Calculate safe left position (never negative, never overflow right)
  const calculateLeftPosition = () => {
    const basePosition = thresholdPosition - 10; // Offset for centering
    if (basePosition < 0) return '0px';
    if (basePosition > 85) return 'calc(100% - 150px)';
    return `${basePosition}%`;
  };

  return (
    <div className="vote-bar">
      <div className='min-threshold' style={{ left: calculateLeftPosition() }}>
        <span>MIN. THRESHOLD {threshold}%</span>
      </div>

      <div className="progress-container">
        {/* Progress Bar */}
        <div className="progress-bar">
          <div
            className="progress-in-favor"
            style={{ width: `${inFavorPercentage}%` }}
          />
          <div
            className="progress-in-against"
            style={{ width: `${inAgainstPercentage}%` }}
          />
        </div>

        {/* Threshold Marker */}
        <div
          className="threshold-marker"
          style={{ left: `${thresholdPosition}%` }}
        >
        </div>
        {inAgainstPercentage == 0 && <span className='dot red-dot'/>}
      </div>

      {/* Labels */}
      <div className="labels">
        <span>{totalVotes+"M"} TOTAL VOTES</span>
        <span className="in-favor">
          <span className="dot green-dot" /> {votesInFavor+"M"} IN FAVOUR
        </span>
        <span>
          <span className="dot red-dot" /> {votesAgainst+"M"} AGAINST
        </span>
      </div>
    </div>
  );
};

export default VoteBar;
