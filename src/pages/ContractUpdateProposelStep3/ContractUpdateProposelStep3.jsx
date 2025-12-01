import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Web3 from 'web3';
import BackButtonProposal from '../../components/BackButtonProposal/BackButtonProposal';
import Warning from '../../components/Warning/Warning';
import { 
  createGenericMainDAOProposal,
  createNativeDAOProposal,
  checkMainDAOEligibility,
  checkNativeDAOEligibility,
  encodeFunctionCall
} from '../../services/proposalCreationService';
import './ContractUpdateProposelStep3.css';

// Function parameter definitions
const FUNCTION_PARAMETERS = {
  // Batch 1: Main DAO
  "updateProposalThreshold": {
    inputs: [{ name: "newThreshold", type: "uint256", label: "New Value (in wei)", placeholder: "100000000000000000000" }]
  },
  "updateVotingThreshold": {
    inputs: [{ name: "newThreshold", type: "uint256", label: "New Value (in wei)", placeholder: "50000000000000000000" }]
  },
  "updateUnstakeDelay": {
    inputs: [{ name: "newDelay", type: "uint256", label: "New Value (in seconds)", placeholder: "86400" }]
  },
  
  // Batch 2: Native DAO
  "updateProposalStakeThreshold": {
    inputs: [{ name: "newThreshold", type: "uint256", label: "New Value (in wei)", placeholder: "100000000000000000000" }]
  },
  "updateVotingStakeThreshold": {
    inputs: [{ name: "newThreshold", type: "uint256", label: "New Value (in wei)", placeholder: "50000000000000000000" }]
  },
  "updateProposalRewardThreshold": {
    inputs: [{ name: "newThreshold", type: "uint256", label: "New Value (in wei)", placeholder: "100000000000000000000" }]
  },
  "updateVotingRewardThreshold": {
    inputs: [{ name: "newThreshold", type: "uint256", label: "New Value (in wei)", placeholder: "100000000000000000000" }]
  },
  "setNOWJContract": {
    inputs: [{ name: "_nowjContract", type: "address", label: "New Value (address)", placeholder: "0x..." }]
  },
  "setBridge": {
    inputs: [{ name: "_bridge", type: "address", label: "New Value (address)", placeholder: "0x..." }]
  },
  "setGenesis": {
    inputs: [{ name: "_genesis", type: "address", label: "New Value (address)", placeholder: "0x..." }]
  },
  
  // Batch 3: Native Athena
  "updateMinOracleMembers": {
    inputs: [{ name: "_newMinMembers", type: "uint256", label: "New Value (number)", placeholder: "3" }]
  },
  "updateVotingPeriod": {
    inputs: [{ name: "_newPeriodMinutes", type: "uint256", label: "New Value (minutes)", placeholder: "60" }]
  },
  "updateMinStakeRequired": {
    inputs: [{ name: "_newMinStake", type: "uint256", label: "New Value (in wei)", placeholder: "100000000000000000000" }]
  },
  "updateMemberActivityThreshold": {
    inputs: [{ name: "_newThresholdDays", type: "uint256", label: "New Value (days)", placeholder: "90" }]
  },
  "setOracleManager": {
    inputs: [{ name: "_oracleManager", type: "address", label: "New Value (address)", placeholder: "0x..." }]
  },
  "setDAOContract": {
    inputs: [{ name: "_daoContract", type: "address", label: "New Value (address)", placeholder: "0x..." }]
  },
  "setUSDCToken": {
    inputs: [{ name: "_usdcToken", type: "address", label: "New Value (address)", placeholder: "0x..." }]
  },
  
  // Batch 4: NOWJC  
  "setRewardsContract": {
    inputs: [{ name: "_rewardsContract", type: "address", label: "New Value (address)", placeholder: "0x..." }]
  },
  "setUSDTToken": {
    inputs: [{ name: "_newToken", type: "address", label: "New Value (address)", placeholder: "0x..." }]
  },
  "setCCTPReceiver": {
    inputs: [{ name: "_cctpReceiver", type: "address", label: "New Value (address)", placeholder: "0x..." }]
  },
  "setCCTPTransceiver": {
    inputs: [{ name: "_cctpTransceiver", type: "address", label: "New Value (address)", placeholder: "0x..." }]
  },
  "setNativeAthenaForNOWJC": {
    inputs: [{ name: "_nativeAthena", type: "address", label: "New Value (address)", placeholder: "0x..." }]
  },
  "setTreasury": {
    inputs: [{ name: "_treasury", type: "address", label: "New Value (address)", placeholder: "0x..." }]
  },
  "setCommissionPercentage": {
    inputs: [{ name: "_percentage", type: "uint256", label: "New Value (basis points)", placeholder: "100" }]
  },
  "setMinCommission": {
    inputs: [{ name: "_minCommission", type: "uint256", label: "New Value (USDC wei)", placeholder: "1000000" }]
  },
  
  // Batch 5: Remaining contracts - similar address setters
  "setOpenworkToken": {
    inputs: [{ name: "_token", type: "address", label: "New Value (address)", placeholder: "0x..." }]
  },
  "setMainDAO": {
    inputs: [{ name: "_mainDAO", type: "address", label: "New Value (address)", placeholder: "0x..." }]
  },
  "setNativeAthena": {
    inputs: [{ name: "_nativeAthena", type: "address", label: "New Value (address)", placeholder: "0x..." }]
  },
  "setJobContract": {
    inputs: [{ name: "_jobContract", type: "address", label: "New Value (address)", placeholder: "0x..." }]
  },
  "setProfileGenesis": {
    inputs: [{ name: "_profileGenesis", type: "address", label: "New Value (address)", placeholder: "0x..." }]
  },
  "setAthenaClientContract": {
    inputs: [{ name: "_athenaClient", type: "address", label: "New Value (address)", placeholder: "0x..." }]
  },
  "setLowjcContract": {
    inputs: [{ name: "_lowjc", type: "address", label: "New Value (address)", placeholder: "0x..." }]
  },
  "setCCTPSender": {
    inputs: [{ name: "_cctpSender", type: "address", label: "New Value (address)", placeholder: "0x..." }]
  },
  "setCCTPMintRecipient": {
    inputs: [{ name: "_recipient", type: "address", label: "New Value (address)", placeholder: "0x..." }]
  },
  "setMinDisputeFee": {
    inputs: [{ name: "_minFee", type: "uint256", label: "New Value (USDC wei)", placeholder: "1000000" }]
  },
  "setNativeAthenaRecipient": {
    inputs: [{ name: "_recipient", type: "address", label: "New Value (address)", placeholder: "0x..." }]
  },
  "setNativeChainDomain": {
    inputs: [{ name: "_domain", type: "uint32", label: "New Value (domain)", placeholder: "3" }]
  },
  "updateNativeChainEid": {
    inputs: [{ name: "_eid", type: "uint32", label: "New Value (EID)", placeholder: "40231" }]
  },
  "updateMainChainEid": {
    inputs: [{ name: "_eid", type: "uint32", label: "New Value (EID)", placeholder: "40245" }]
  },
  "updateThisLocalChainEid": {
    inputs: [{ name: "_eid", type: "uint32", label: "New Value (EID)", placeholder: "40232" }]
  },
  "updateAthenaClientChainEid": {
    inputs: [{ name: "_eid", type: "uint32", label: "New Value (EID)", placeholder: "40232" }]
  },
  "updateLowjcChainEid": {
    inputs: [{ name: "_eid", type: "uint32", label: "New Value (EID)", placeholder: "40232" }]
  },
  "setMainDaoContract": {
    inputs: [{ name: "_mainDao", type: "address", label: "New Value (address)", placeholder: "0x..." }]
  },
  "setRewardsForBridge": {
    inputs: [{ name: "_rewards", type: "address", label: "New Value (address)", placeholder: "0x..." }]
  },
  "setNativeDaoContract": {
    inputs: [{ name: "_nativeDao", type: "address", label: "New Value (address)", placeholder: "0x..." }]
  },
  "setNativeAthenaContract": {
    inputs: [{ name: "_nativeAthena", type: "address", label: "New Value (address)", placeholder: "0x..." }]
  },
  "setNativeOpenWorkJobContract": {
    inputs: [{ name: "_nowjc", type: "address", label: "New Value (address)", placeholder: "0x..." }]
  },
  "setProfileManager": {
    inputs: [{ name: "_profileManager", type: "address", label: "New Value (address)", placeholder: "0x..." }]
  },
  "setAuthorizedCaller": {
    inputs: [
      { name: "_caller", type: "address", label: "Caller Address", placeholder: "0x..." }
    ]
  },
  "authorizeContract": {
    inputs: [
      { name: "_contract", type: "address", label: "Contract Address", placeholder: "0x..." }
    ]
  },
  "transferOwnership": {
    inputs: [{ name: "newOwner", type: "address", label: "New Owner Address", placeholder: "0x..." }]
  }
};

// Map contracts to their addresses and which DAO governs them
const CONTRACT_CONFIG = {
  "Main DAO": { 
    address: "0xc3579BDC6eC1fAad8a67B1Dc5542EBcf28456465", 
    chain: "Base Sepolia",
    chainId: 84532,
    dao: "Main"
  },
  "Native DAO": { 
    address: "0x21451dCE07Ad3Ab638Ec71299C1D2BD2064b90E5", 
    chain: "Arbitrum Sepolia",
    chainId: 421614,
    dao: "Native"
  },
  "Native Athena": { 
    address: "0x098E52Aff44AEAd944AFf86F4A5b90dbAF5B86bd", 
    chain: "Arbitrum Sepolia",
    chainId: 421614,
    dao: "Native"
  },
  "Native Athena Oracle Manager": { 
    address: "0x70F6fa515120efeA3e404234C318b7745D23ADD4", 
    chain: "Arbitrum Sepolia",
    chainId: 421614,
    dao: "Native"
  },
  "Native OpenWork Job Contract": { 
    address: "0x9E39B37275854449782F1a2a4524405cE79d6C1e", 
    chain: "Arbitrum Sepolia",
    chainId: 421614,
    dao: "Native"
  },
  "Main Rewards": { 
    address: "0xd6bE0C187408155be99C4e9d6f860eDDa27b056B", 
    chain: "Base Sepolia",
    chainId: 84532,
    dao: "Main"
  },
  "Native Rewards": { 
    address: "0x947cAd64a26Eae5F82aF68b7Dbf8b457a8f492De", 
    chain: "Arbitrum Sepolia",
    chainId: 421614,
    dao: "Native"
  },
  "Local OpenWork Job Contract": { 
    address: "0x896a3Bc6ED01f549Fe20bD1F25067951913b793C", 
    chain: "OP Sepolia",
    chainId: 11155420,
    dao: "Native"
  },
  "Athena Client": { 
    address: "0x45E51B424c87Eb430E705CcE3EcD8e22baD267f7", 
    chain: "OP Sepolia",
    chainId: 11155420,
    dao: "Native"
  },
  "Main Chain Bridge": { 
    address: "0x70d30e5dAb5005b126C040f1D9b0bDDBc16679b0", 
    chain: "Base Sepolia",
    chainId: 84532,
    dao: "Main"
  },
  "Native Bridge": { 
    address: "0x3b2AC1d1281cA4a1188d9F09A5Af9a9E6a114D6c", 
    chain: "Arbitrum Sepolia",
    chainId: 421614,
    dao: "Native"
  },
  "Local Bridge": { 
    address: "0x6601cF4156160cf43fd024bac30851d3ee0F8668", 
    chain: "OP Sepolia",
    chainId: 11155420,
    dao: "Native"
  },
  "Profile Manager": { 
    address: "0xFc4dA60Ea9D88B81a894CfbD5941b7d0E3fEe401", 
    chain: "Arbitrum Sepolia",
    chainId: 421614,
    dao: "Native"
  },
  "OpenWork Genesis": { 
    address: "0x1f23683C748fA1AF99B7263dea121eCc5Fe7564C", 
    chain: "Arbitrum Sepolia",
    chainId: 421614,
    dao: "Native"
  },
  "Profile Genesis": { 
    address: "0xC37A9dFbb57837F74725AAbEe068f07A1155c394", 
    chain: "Arbitrum Sepolia",
    chainId: 421614,
    dao: "Native"
  }
};

const ContractUpdateProposelStep3 = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get data from step2
  const contractName = location.state?.contractName || "Main DAO";
  const parameterName = location.state?.parameterName || "Proposal Threshold Amount";
  const functionName = location.state?.functionName || "updateProposalThreshold";
  
  const [currentValue] = useState(''); // TODO: Fetch from blockchain
  const [proposedValue, setProposedValue] = useState('');
  const [reason, setReason] = useState('');
  
  // Get function parameter schema
  const functionParams = FUNCTION_PARAMETERS[functionName];
  const inputLabel = functionParams?.inputs[0]?.label || "New Value";
  const inputPlaceholder = functionParams?.inputs[0]?.placeholder || "Enter new value";
  const inputType = functionParams?.inputs[0]?.type || "uint256";
  
  // Wallet and transaction states
  const [userAddress, setUserAddress] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [eligibility, setEligibility] = useState(null);
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
            
            // Check eligibility on appropriate DAO
            const config = CONTRACT_CONFIG[contractName];
            if (config?.dao === "Main") {
              const eligibilityData = await checkMainDAOEligibility(address);
              setEligibility(eligibilityData);
            } else {
              const eligibilityData = await checkNativeDAOEligibility(address);
              setEligibility(eligibilityData);
            }
          }
        } catch (error) {
          console.error("Error connecting wallet:", error);
          setError("Failed to connect wallet");
        }
      }
    };
    connectWallet();
  }, [contractName]);

  const handleSubmit = async () => {
    setError(null);
    setTransactionStatus(null);
    
    const config = CONTRACT_CONFIG[contractName];
    if (!config) {
      setError(`Configuration not found for ${contractName}`);
      return;
    }
    
    // Validation
    if (!isConnected || !userAddress) {
      setError("Please connect your wallet");
      return;
    }
    
    if (!eligibility?.canPropose) {
      setError("You need at least 100 OW tokens (staked or earned) to create a proposal");
      return;
    }
    
    if (!proposedValue || proposedValue.trim().length === 0) {
      setError("Please enter a proposed value");
      return;
    }
    
    if (!reason || reason.trim().length < 10) {
      setError("Please enter a description (at least 10 characters)");
      return;
    }
    
    try {
      setIsSubmitting(true);
      setTransactionStatus("Preparing transaction...");
      
      // Check user is on correct chain
      const web3 = new Web3(window.ethereum);
      const chainId = await web3.eth.getChainId();
      
      console.log("=== CHAIN ID DEBUG ===");
      console.log("Detected chainId:", chainId);
      console.log("ChainId type:", typeof chainId);
      console.log("Expected chainId:", config.chainId);
      console.log("Comparison result:", Number(chainId) !== config.chainId);
      
      if (Number(chainId) !== config.chainId) {
        throw new Error(`Please switch to ${config.chain} network (detected: ${Number(chainId)}, expected: ${config.chainId})`);
      }
      
      setTransactionStatus("Awaiting wallet confirmation...");
      
      // Get function parameter schema
      const funcSchema = FUNCTION_PARAMETERS[functionName];
      if (!funcSchema) {
        throw new Error(`Function ${functionName} not yet implemented`);
      }
      
      // Encode the parameter update function call using actual parameter types
      const calldata = encodeFunctionCall(
        {
          name: functionName,
          type: 'function',
          inputs: funcSchema.inputs.map(input => ({ type: input.type, name: input.name }))
        },
        [proposedValue]
      );
      
      console.log("=== UPDATE PROPOSAL PARAMETERS ===");
      console.log("Contract:", contractName);
      console.log("Parameter:", parameterName);
      console.log("Function:", functionName);
      console.log("Current:", currentValue);
      console.log("Proposed:", proposedValue);
      console.log("Target:", config.address);
      console.log("Chain:", config.chain);
      console.log("DAO:", config.dao);
      console.log("Calldata:", calldata);
      
      let result;
      
      if (config.dao === "Main") {
        // Use Main DAO proposal (requires LayerZero fee)
        result = await createGenericMainDAOProposal({
          targets: [config.address],
          values: [0],
          calldatas: [calldata],
          description: `Update ${parameterName}: ${reason}`,
          userAddress: userAddress
        });
      } else {
        // Use Native DAO proposal (no LayerZero)
        result = await createNativeDAOProposal({
          targets: [config.address],
          values: [0],
          calldatas: [calldata],
          description: `Update ${parameterName}: ${reason}`,
          userAddress: userAddress
        });
      }
      
      if (result.success) {
        setTransactionStatus("✅ Success! Update proposal created successfully.");
        setError(null);
      } else {
        setError("Transaction completed but success status is false");
      }
    } catch (error) {
      console.error("Error creating update proposal:", error);
      setError(error.message || "Failed to create update proposal");
      setTransactionStatus(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="contract-update-step3-container">
      {/* Header Section with Back Button and Title */}
      <div className="proposalHeaderSection">
        <div className="back">
          <button 
            onClick={() => navigate(-1)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 0
            }}
          >
            <img src="/button.svg" alt="Back" style={{ width: '40px', height: '40px' }} />
          </button>
          <div className="proposalMainTitleWrapper">
            <h1 className="proposalMainTitle">{contractName}</h1>
          </div>
        </div>
      </div>

      {/* View Contract Link */}
      {CONTRACT_CONFIG[contractName] && (
        <div className="viewContractLink" onClick={() => window.open(`https://sepolia.${CONTRACT_CONFIG[contractName].chain.includes('Base') ? 'basescan.org' : CONTRACT_CONFIG[contractName].chain.includes('Arbitrum') ? 'arbiscan.io' : 'optimism.etherscan.io'}/address/${CONTRACT_CONFIG[contractName].address}`, '_blank')}>
          <span>View contract</span>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 11L11 5M11 5H7M11 5V9" stroke="#1246FF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      )}

      <div className="contract-update-step3-card">
        <div className="contract-update-step3-card-section">
            <h3 className="contract-update-step3-card-title">Contract Details</h3>
        </div>
          <p className="contract-update-step3-description">
            You can propose a new value for the parameter shown below and state your reason for the change
          </p>

          <div className="contract-update-step3-field-section">
            <p className="contract-update-step3-field-label">{parameterName}</p>
            
            <div className="contract-update-step3-values-row">
              <div className="contract-update-step3-value-field">
                <label className="contract-update-step3-input-label">CURRENT VALUE</label>
                <div className="contract-update-step3-input-readonly">
                  <span>{currentValue}</span>
                </div>
              </div>

              <div className="contract-update-step3-value-field">
                <label className="contract-update-step3-input-label">{inputLabel}</label>
                <input
                  type="text"
                  className="contract-update-step3-input"
                  placeholder={inputPlaceholder}
                  value={proposedValue}
                  onChange={(e) => setProposedValue(e.target.value)}
                />
              </div>
            </div>
          </div>

          <textarea
            className="contract-update-step3-textarea"
            placeholder="Reasons explaining why these changes should be made to the contract go here"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />

          <div className="contract-update-step3-actions">
            <button 
              className="contract-update-step3-submit" 
              onClick={handleSubmit}
              disabled={isSubmitting || !isConnected || !eligibility?.canPropose}
              style={{
                opacity: (isSubmitting || !isConnected || !eligibility?.canPropose) ? 0.5 : 1,
                cursor: (isSubmitting || !isConnected || !eligibility?.canPropose) ? 'not-allowed' : 'pointer'
              }}
            >
              {isSubmitting ? 'Creating Proposal...' : 'Submit Proposal'}
            </button>
          </div>
          
          {/* Status/Error Message */}
          <div style={{ padding: '0 32px 32px 32px' }}>
            <Warning content={error || transactionStatus || `Parameter update proposal requires blockchain transaction fees on ${CONTRACT_CONFIG[contractName]?.chain || 'the appropriate chain'}`} />
          </div>
      </div>
    </div>
  );
};

export default ContractUpdateProposelStep3;
