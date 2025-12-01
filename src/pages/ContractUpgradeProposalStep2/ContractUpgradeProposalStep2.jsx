import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Web3 from 'web3';
import './ContractUpgradeProposalStep2.css';
import BackButtonProposal from '../../components/BackButtonProposal/BackButtonProposal';
import Warning from '../../components/Warning/Warning';
import { 
  createUpgradeProposal, 
  checkMainDAOEligibility,
  estimateMainDAOFee 
} from '../../services/proposalCreationService';

// Contract proxy addresses and chain mappings
const CONTRACT_INFO = {
  "Main DAO": {
    chainId: 40245,
    proxies: [{ address: "0xc3579BDC6eC1fAad8a67B1Dc5542EBcf28456465", label: "Base Sepolia" }]
  },
  "Native DAO": {
    chainId: 40231,
    proxies: [{ address: "0x21451dCE07Ad3Ab638Ec71299C1D2BD2064b90E5", label: "Arbitrum Sepolia" }]
  },
  "OpenWork Token": {
    chainId: 40245,
    proxies: [{ address: "0x5f24747d5e59F9CCe5a9815BC12E2fB5Ae713679", label: "Base Sepolia" }]
  },
  "Native OpenWork Job Contract": {
    chainId: 40231,
    proxies: [{ address: "0x9E39B37275854449782F1a2a4524405cE79d6C1e", label: "Arbitrum Sepolia" }]
  },
  "Local OpenWork Job Contract": {
    chainId: 40232,
    proxies: [
      { address: "0x896a3Bc6ED01f549Fe20bD1F25067951913b793C", label: "OP Sepolia" },
      { address: "0x3b4cE6441aB77437e306F396c83779A2BC8E5134", label: "Ethereum Sepolia" }
    ]
  },
  "Native Athena": {
    chainId: 40231,
    proxies: [{ address: "0x098E52Aff44AEAd944AFf86F4A5b90dbAF5B86bd", label: "Arbitrum Sepolia" }]
  },
  "Native Athena Oracle Manager": {
    chainId: 40231,
    proxies: [{ address: "0x70F6fa515120efeA3e404234C318b7745D23ADD4", label: "Arbitrum Sepolia" }]
  },
  "Athena Client": {
    chainId: 40232,
    proxies: [
      { address: "0x45E51B424c87Eb430E705CcE3EcD8e22baD267f7", label: "OP Sepolia" },
      { address: "0xA08a6E73397EaE0A3Df9eb528d9118ae4AF80fcf", label: "Ethereum Sepolia" }
    ]
  },
  "Main Rewards": {
    chainId: 40245,
    proxies: [{ address: "0xd6bE0C187408155be99C4e9d6f860eDDa27b056B", label: "Base Sepolia" }]
  },
  "Native Rewards": {
    chainId: 40231,
    proxies: [{ address: "0x947cAd64a26Eae5F82aF68b7Dbf8b457a8f492De", label: "Arbitrum Sepolia" }]
  },
  "OpenWork Genesis": {
    chainId: 40231,
    proxies: [{ address: "0x1f23683C748fA1AF99B7263dea121eCc5Fe7564C", label: "Arbitrum Sepolia" }]
  },
  "Profile Genesis": {
    chainId: 40231,
    proxies: [{ address: "0xC37A9dFbb57837F74725AAbEe068f07A1155c394", label: "Arbitrum Sepolia" }]
  },
  "Profile Manager": {
    chainId: 40231,
    proxies: [{ address: "0xFc4dA60Ea9D88B81a894CfbD5941b7d0E3fEe401", label: "Arbitrum Sepolia" }]
  },
  "Contract Registry": {
    chainId: 40231,
    proxies: [{ address: "0x8AbC0E626A8fC723ec6f27FE8a4157A186D5767D", label: "Arbitrum Sepolia" }]
  }
};

const ContractUpgradeProposalStep2 = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const contractName = location.state?.contractName || "OpenWork DAO Smart Contract";
  const [selectedProxy, setSelectedProxy] = useState('');
  const [isProxyDropdownOpen, setIsProxyDropdownOpen] = useState(false);
  const [implementationAddress, setImplementationAddress] = useState('');
  const [reason, setReason] = useState('');
  const [availableProxies, setAvailableProxies] = useState([]);
  
  // Wallet and eligibility states
  const [userAddress, setUserAddress] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [eligibility, setEligibility] = useState(null);
  
  // Transaction states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState(null);
  const [error, setError] = useState(null);

  // Connect wallet on mount
  useEffect(() => {
    const connectWallet = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
          if (accounts.length > 0) {
            const address = accounts[0];
            setUserAddress(address);
            setIsConnected(true);
            
            const eligibilityData = await checkMainDAOEligibility(address);
            setEligibility(eligibilityData);
          }
        } catch (error) {
          console.error("Error connecting wallet:", error);
          setError("Failed to connect wallet");
        }
      }
    };
    connectWallet();
  }, []);

  useEffect(() => {
    // Get proxy addresses for selected contract
    const contractInfo = CONTRACT_INFO[contractName];
    if (contractInfo && contractInfo.proxies.length > 0) {
      setAvailableProxies(contractInfo.proxies);
      setSelectedProxy(contractInfo.proxies[0].address);
    }
  }, [contractName]);

  // Get block scanner URL based on chain
  const getBlockScannerUrl = (proxyAddress) => {
    const proxy = availableProxies.find(p => p.address === proxyAddress);
    if (!proxy) return '#';
    
    const scanners = {
      'Base Sepolia': `https://sepolia.basescan.org/address/${proxyAddress}`,
      'Arbitrum Sepolia': `https://sepolia.arbiscan.io/address/${proxyAddress}`,
      'OP Sepolia': `https://sepolia-optimism.etherscan.io/address/${proxyAddress}`,
      'Ethereum Sepolia': `https://sepolia.etherscan.io/address/${proxyAddress}`
    };
    
    return scanners[proxy.label] || '#';
  };

  const handleSubmit = async () => {
    setError(null);
    setTransactionStatus(null);
    
    // Validation
    if (!isConnected || !userAddress) {
      setError("Please connect your wallet");
      return;
    }
    
    if (!eligibility?.canPropose) {
      setError("You need at least 100 OW tokens (staked or earned) to create a proposal");
      return;
    }
    
    if (!selectedProxy) {
      setError("Please select a proxy address");
      return;
    }
    
    if (!implementationAddress || !implementationAddress.startsWith('0x')) {
      setError("Please enter a valid implementation address");
      return;
    }
    
    if (!reason || reason.trim().length < 10) {
      setError("Please enter a description (at least 10 characters)");
      return;
    }
    
    try {
      setIsSubmitting(true);
      setTransactionStatus("Preparing transaction...");
      
      const contractInfo = CONTRACT_INFO[contractName];
      
      setTransactionStatus("Awaiting wallet confirmation...");
      
      // Create upgrade proposal on Main DAO
      const result = await createUpgradeProposal({
        contractName: contractName,
        targetChainId: contractInfo.chainId,
        targetProxy: selectedProxy,
        newImplementation: implementationAddress,
        description: reason,
        userAddress: userAddress
      });
      
      if (result.success) {
        console.log("✅ Upgrade proposal creation result:", result);
        console.log("   Proposal ID:", result.proposalId);
        console.log("   Transaction Hash:", result.transactionHash);
        
        if (!result.proposalId) {
          setTransactionStatus("✅ Success! Proposal created but ID not found. Check DAO page.");
          setError(null);
        } else {
          setTransactionStatus("✅ Success! Proposal created successfully. Redirecting...");
          setError(null);
          
          // Redirect to proposal view after 2 seconds
          setTimeout(() => {
            console.log("🔄 Redirecting to:", `/proposal-view/${result.proposalId}/Base`);
            navigate(`/proposal-view/${result.proposalId}/Base`);
          }, 2000);
        }
      } else {
        setError("Transaction completed but success status is false");
      }
    } catch (error) {
      console.error("Error creating upgrade proposal:", error);
      setError(error.message || "Failed to create upgrade proposal");
      setTransactionStatus(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="upgradeProposalStep2Container">
      {/* Header Section with Back Button and Title */}
      <div className="proposalHeaderSection">
        <div className="back">
          <BackButtonProposal to="/contract-upgrade-proposal" />
          <div className="proposalMainTitleWrapper">
            <h1 className="proposalMainTitle">{contractName}</h1>
          </div>
        </div>
      </div>

      {/* View Contract Link */}
      {selectedProxy && (
        <div className="viewContractLink" onClick={() => window.open(getBlockScannerUrl(selectedProxy), '_blank')}>
          <span>View contract</span>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 11L11 5M11 5H7M11 5V9" stroke="#1246FF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      )}

      <div className="upgradeProposalStep2Card">
        <div className="cardHeader">
          <h2 className="cardHeaderTitle">Contract Details</h2>
        </div>

        <div className="cardContent">
          <p className="contentLabel">Suggest how you'd want this contract to be upgraded</p>

          {/* Proxy Address Dropdown */}
          {availableProxies.length > 0 && (
            <div className="proxy-dropdown-field">
              <label className="field-label">SELECT PROXY ADDRESS</label>
              <div className="dropdown-container">
                <button 
                  className="dropdown-button"
                  onClick={() => setIsProxyDropdownOpen(!isProxyDropdownOpen)}
                  type="button"
                >
                  <span>{selectedProxy ? `${selectedProxy.substring(0, 6)}...${selectedProxy.substring(38)} (${availableProxies.find(p => p.address === selectedProxy)?.label})` : 'Select proxy'}</span>
                  <img 
                    src="/chevron-down.svg" 
                    alt="Dropdown" 
                    className={`dropdown-icon ${isProxyDropdownOpen ? 'open' : ''}`}
                  />
                </button>
                {isProxyDropdownOpen && (
                  <div className="dropdown-menu">
                    {availableProxies.map((proxy, index) => (
                      <div 
                        key={index}
                        className="dropdown-item"
                        onClick={() => {
                          setSelectedProxy(proxy.address);
                          setIsProxyDropdownOpen(false);
                        }}
                      >
                        <div>{proxy.address}</div>
                        <div style={{fontSize: '12px', color: '#999'}}>{proxy.label}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="codeSnippetSection">
            <div className="codeSnippetBox">
              <div className="codeSnippetSidebar">
                <div className="lineNumbers">
                  <p>1</p>
                  <p>2</p>
                  <p>3</p>
                  <p>4</p>
                  <p>5</p>
                  <p>6</p>
                  <p>7</p>
                  <p>8</p>
                  <p>9</p>
                  <p>10</p>
                  <p>11</p>
                  <p>12</p>
                  <p>13</p>
                  <p>14</p>
                  <p>15</p>
                  <p>16</p>
                  <p>17</p>
                  <p>18</p>
                  <p>19</p>
                  <p>20</p>
                  <p>21</p>
                </div>
              </div>
              <div className="codeSnippetContent">
                <p className="codeComment">// Imports</p>
                <p><span className="codeKeyword">import</span> <span className="codeProperty">mongoose</span>{`, { `}<span className="codeProperty">Schema</span>{` } `}<span className="codeKeyword">from</span>{` 'untitled'`}</p>
                <p>&nbsp;</p>
                <p className="codeComment">// Collection name</p>
                <p><span className="codeKeyword">export const</span> <span className="codeProperty">collection</span>{` = 'Design'|`}</p>
                <p>&nbsp;</p>
                <p className="codeComment">// Schema</p>
                <p><span className="codeKeyword">const</span> <span className="codeProperty">schema</span>{` = `}<span className="codeKeyword">new</span>{` Schema({`}</p>
                <p className="codeIndent">  <span className="codeProperty">name</span>{`: {`}</p>
                <p className="codeIndent">    <span className="codeProperty">type</span>: String,</p>
                <p className="codeIndent">    <span className="codeProperty">required</span>: true</p>
                <p className="codeIndent">{`  },`}</p>
                <p>&nbsp;</p>
                <p className="codeIndent">  <span className="codeProperty">description</span>{`: {`}</p>
                <p className="codeIndent">    <span className="codeProperty">type</span>: String</p>
                <p className="codeIndent">{`  }`}</p>
                <p><span>{`}, {`}</span><span className="codeProperty">timestamps</span><span>{`: true})`}</span></p>
                <p>&nbsp;</p>
                <p className="codeComment">// Model</p>
                <p><span className="codeKeyword">export default</span><span>{` untitled.model(`}</span><span className="codeProperty">collection</span><span>{`, `}</span><span className="codeProperty">schema</span><span>{`, `}</span><span className="codeProperty">collection</span>)</p>
                <p>&nbsp;</p>
              </div>
            </div>
          </div>

          {/* New Implementation Address Input */}
          <div className="input-field">
            <input
              type="text"
              value={implementationAddress}
              onChange={(e) => setImplementationAddress(e.target.value)}
              placeholder="Enter new implementation address (0x...)"
              className="address-input"
            />
          </div>

          <div className="reasonTextArea">
            <textarea
              className="reasonInput"
              placeholder="Reasons explaining how and why this contract could be upgraded go here"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>

        <button 
          className="submitProposalButton" 
          onClick={handleSubmit}
          disabled={isSubmitting || !isConnected || !eligibility?.canPropose}
          style={{
            opacity: (isSubmitting || !isConnected || !eligibility?.canPropose) ? 0.5 : 1,
            cursor: (isSubmitting || !isConnected || !eligibility?.canPropose) ? 'not-allowed' : 'pointer'
          }}
        >
          {isSubmitting ? 'Creating Proposal...' : 'Submit Proposal'}
        </button>
        
        {/* Status/Error Message using Warning component */}
        <div style={{ padding: '0 32px 32px 32px' }}>
          <Warning content={error || transactionStatus || "Contract upgrade proposal requires blockchain transaction fees"} />
        </div>
      </div>
    </div>
  );
};

export default ContractUpgradeProposalStep2;
