import React, { useState, useRef, useEffect } from "react";
import "./ChainSelector.css";
import { useChainDetection } from "../../functions/useChainDetection";

/**
 * Pure UI component for chain selection
 * All logic is handled by useChainDetection hook
 */
const ChainSelector = ({ walletAddress }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showDropdown]);

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
  if (isDetecting) {
    return (
      <div className="chain-selector-wrapper">
        <div className="chain-selector-button">
          <span>Detecting...</span>
        </div>
      </div>
    );
  }

  // Detection done but no chain found — prompt wallet connection
  if (currentChainId === null) {
    return (
      <div className="chain-selector-wrapper">
        <div
          className="chain-selector-button"
          style={{ cursor: 'pointer' }}
          onClick={async () => {
            try {
              await window.ethereum?.request({ method: 'eth_requestAccounts' });
              window.location.reload();
            } catch (err) {
              console.warn('Wallet connection rejected:', err);
            }
          }}
        >
          <span>Connect Wallet</span>
        </div>
      </div>
    );
  }

  const currentChain = supportedChains[currentChainId] || Object.values(supportedChains)[0];
  const isUnknownChain = !supportedChains[currentChainId];

  const handleChainClick = async (chainId) => {
    setShowDropdown(false);
    await switchToChain(chainId);
  };

  return (
    <div className="chain-selector-wrapper" ref={wrapperRef}>
      <div
        className="chain-selector-button"
        onClick={() => !isSwitching && setShowDropdown(!showDropdown)}
        style={{ cursor: isSwitching ? 'wait' : 'pointer' }}
      >
        <img src={currentChain.icon} alt={currentChain.name} className="chain-icon" />
        <span>
          {isSwitching ? "Switching..." : currentChain.name}
          {isUnknownChain && " (Unknown)"}
        </span>
        <img src="/chevron-down-small.svg" alt="dropdown" className="dropdown-icon" />
      </div>

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
                  <div key={chainId} className="chain-option" onClick={() => handleChainClick(chainIdNum)}>
                    <img
                      src={isSelected ? "/radio-button-checked.svg" : "/radio-button-unchecked.svg"}
                      alt="radio"
                      className="radio-icon"
                    />
                    <img src={chain.icon} alt={chain.name} className="chain-icon" />
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
