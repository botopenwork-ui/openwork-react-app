import React, { useState } from "react";
import "./ChainSelector.css";
import { useChainDetection } from "../../functions/useChainDetection";

/**
 * Pure UI component for chain selection
 * All logic is handled by useChainDetection hook
 */
const ChainSelector = ({ walletAddress }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  
  // Get all chain state and functions from the hook
  const {
    currentChainId,
    isDetecting,
    isSwitching,
    switchToChain,
    supportedChains
  } = useChainDetection(walletAddress);

  // Don't render if no wallet connected
  if (!walletAddress) {
    return null;
  }

  // Show loading state while detecting
  if (isDetecting || currentChainId === null) {
    return (
      <div className="chain-selector-wrapper">
        <div className="chain-selector-button">
          <span>Detecting...</span>
        </div>
      </div>
    );
  }

  // Get current chain info (or default to first supported chain if unknown)
  const currentChain = supportedChains[currentChainId] || Object.values(supportedChains)[0];
  const isUnknownChain = !supportedChains[currentChainId];

  // Handle chain selection
  const handleChainClick = async (chainId) => {
    console.log('🎯 handleChainClick called for chain:', chainId);
    setShowDropdown(false);
    await switchToChain(chainId);
  };

  return (
    <div className="chain-selector-wrapper">
      <div
        className="chain-selector-button"
        onClick={() => !isSwitching && setShowDropdown(!showDropdown)}
        style={{ cursor: isSwitching ? 'wait' : 'pointer' }}
      >
        <img
          src={currentChain.icon}
          alt={currentChain.name}
          className="chain-icon"
        />
        <span>
          {isSwitching ? "Switching..." : currentChain.name}
          {isUnknownChain && " (Unknown)"}
        </span>
        <img
          src="/chevron-down-small.svg"
          alt="dropdown"
          className="dropdown-icon"
        />
      </div>

      {/* Chain Dropdown */}
      {showDropdown && !isSwitching && (
        <div className="chain-dropdown-tooltip">
          <div className="tooltip-arrow"></div>
          <div className="tooltip-content">
            <p className="tooltip-title">SELECT CHAIN</p>
            <div className="chain-options">
              {Object.entries(supportedChains).map(([chainId, chain]) => {
                const chainIdNum = parseInt(chainId);
                const isSelected = currentChainId === chainIdNum;
                
                return (
                  <div
                    key={chainId}
                    className="chain-option"
                    onClick={() => handleChainClick(chainIdNum)}
                  >
                    <img
                      src={isSelected ? "/radio-button-checked.svg" : "/radio-button-unchecked.svg"}
                      alt="radio"
                      className="radio-icon"
                    />
                    <img 
                      src={chain.icon} 
                      alt={chain.name} 
                      className="chain-icon" 
                    />
                    <span>{chain.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChainSelector;
