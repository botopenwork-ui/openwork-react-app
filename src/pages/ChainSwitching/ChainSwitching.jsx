import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import BackButton from "../../components/BackButton/BackButton";
import "./ChainSwitching.css";

const ChainSwitching = () => {
  const navigate = useNavigate();

  return (
    <div className="chain-switching-container">
      {/* Main Content */}
      <div className="chain-switching-main">
        {/* Back Button and Title */}
        <BackButton to="/" title="UI for OpenWork" imgSrc="/chevron-left.svg" />

        {/* Contract Info */}
        <div className="contract-info">
          <div className="contract-id">
            <span>Contract ID: 0xDEAF...fB8B</span>
            <img src="/copy-01.svg" alt="copy" className="copy-icon" />
          </div>
        </div>

        {/* Fees and Chain Info */}
        <div className="job-info">
          <div className="info-item">
            <span className="info-label">Fees:</span>
            <div className="info-value">
              <span>5</span>
              <img src="/ow-token-icon.png" alt="token" className="token-icon" />
            </div>
            <img src="/info.svg" alt="info" className="info-icon" />
          </div>
          <div className="info-item">
            <span className="info-label">Chain:</span>
            <div className="info-value">
              <img src="/ethereum-chain.png" alt="Ethereum" className="chain-icon" />
              <span>Ethereum</span>
            </div>
            <img src="/info.svg" alt="info" className="info-icon" />
          </div>
        </div>

        {/* Circular Milestone Visualization */}
        <div className="milestone-circle">
          {/* Radiant Glow Background */}
          <div className="radiant-glow">
            <img src="/RadiantGlow.svg" alt="glow" className="glow-layer" />
          </div>

          {/* Core Circle with Actions */}
          <div className="core-circle">
            <img src="/core.svg" alt="core" className="core-visual" />

            {/* Center Amount Locked */}
            <div className="center-amount">
              <div className="amount-value">
                <span>50</span>
                <img src="/ow-token-icon.png" alt="token" className="token-icon" />
              </div>
              <p className="amount-label">AMOUNT LOCKED</p>
            </div>
          </div>

          {/* Left Side - Amount Paid */}
          <div className="side-info side-info-left">
            <div className="side-amount">
              <div className="amount-value">
                <span>100</span>
                <img src="/ow-token-icon.png" alt="token" className="token-icon" />
              </div>
              <img src="/info.svg" alt="info" className="info-icon-small" />
            </div>
            <p className="side-label">AMOUNT PAID</p>
            <p className="side-name">Jollie Hall</p>
          </div>

          {/* Left Side Avatar */}
          <div className="side-avatar side-avatar-left">
            <img src="/avatar-profile.png" alt="Jollie Hall" className="avatar-image" />
            <img src="/person.svg" alt="icon" className="avatar-icon" />
          </div>

          {/* Right Side - Amount Received */}
          <div className="side-info side-info-right">
            <div className="side-amount">
              <div className="amount-value">
                <span>50</span>
                <img src="/ow-token-icon.png" alt="token" className="token-icon" />
              </div>
              <img src="/info.svg" alt="info" className="info-icon-small" />
            </div>
            <p className="side-label">AMOUNT RECEIVED</p>
            <p className="side-name">Mollie Hall</p>
          </div>

          {/* Right Side Avatar */}
          <div className="side-avatar side-avatar-right">
            <img src="/avatar-profile.png" alt="Mollie Hall" className="avatar-image" />
            <img src="/person.svg" alt="icon" className="avatar-icon" />
          </div>

          {/* Milestone Progress */}
          <p className="milestone-progress">1/3 MILESTONES COMPLETED</p>
        </div>

        {/* Bottom Instruction */}
        <p className="hover-instruction">Hover to get options</p>
      </div>
    </div>
  );
};

export default ChainSwitching;
