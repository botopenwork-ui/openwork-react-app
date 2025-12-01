import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import BackButton from "../../components/BackButton/BackButton";
import "./ContractUpdateProposelStep2.css";

// Map contracts to their updatable parameters
const CONTRACT_PARAMETERS = {
  "Main DAO": [
    { name: "Proposal Threshold Amount", func: "updateProposalThreshold" },
    { name: "Voting Threshold Amount", func: "updateVotingThreshold" },
    { name: "Unstake Delay", func: "updateUnstakeDelay" },
    { name: "Bridge Address", func: "setBridge" }
  ],
  "Native DAO": [
    { name: "Proposal Stake Threshold", func: "updateProposalStakeThreshold" },
    { name: "Voting Stake Threshold", func: "updateVotingStakeThreshold" },
    { name: "Proposal Reward Threshold", func: "updateProposalRewardThreshold" },
    { name: "Voting Reward Threshold", func: "updateVotingRewardThreshold" },
    { name: "NOWJ Contract Address", func: "setNOWJContract" },
    { name: "Bridge Address", func: "setBridge" },
    { name: "Genesis Address", func: "setGenesis" }
  ],
  "Native Athena": [
    { name: "Minimum Oracle Members", func: "updateMinOracleMembers" },
    { name: "Voting Period (Minutes)", func: "updateVotingPeriod" },
    { name: "Minimum Stake Required", func: "updateMinStakeRequired" },
    { name: "Member Activity Threshold (Days)", func: "updateMemberActivityThreshold" },
    { name: "Genesis Address", func: "setGenesis" },
    { name: "NOWJ Contract Address", func: "setNOWJContract" },
    { name: "Oracle Manager Address", func: "setOracleManager" },
    { name: "DAO Contract Address", func: "setDAOContract" },
    { name: "USDC Token Address", func: "setUSDCToken" },
    { name: "Bridge Address", func: "setBridge" }
  ],
  "Native Athena Oracle Manager": [
    { name: "Genesis Address", func: "setGenesis" },
    { name: "Native Athena Address", func: "setNativeAthena" },
    { name: "Authorized Caller", func: "setAuthorizedCaller" }
  ],
  "Native OpenWork Job Contract": [
    { name: "Commission Percentage", func: "setCommissionPercentage" },
    { name: "Minimum Commission", func: "setMinCommission" },
    { name: "Treasury Address", func: "setTreasury" },
    { name: "Bridge Address", func: "setBridge" },
    { name: "Genesis Address", func: "setGenesis" },
    { name: "Rewards Contract Address", func: "setRewardsContract" },
    { name: "USDT Token Address", func: "setUSDTToken" },
    { name: "CCTP Receiver Address", func: "setCCTPReceiver" },
    { name: "CCTP Transceiver Address", func: "setCCTPTransceiver" },
    { name: "Native Athena Address", func: "setNativeAthena" }
  ],
  "Local OpenWork Job Contract": [
    { name: "USDT Token Address", func: "setUSDTToken" },
    { name: "Bridge Address", func: "setBridge" },
    { name: "CCTP Sender Address", func: "setCCTPSender" },
    { name: "CCTP Mint Recipient Address", func: "setCCTPMintRecipient" },
    { name: "Athena Client Contract Address", func: "setAthenaClientContract" }
  ],
  "Athena Client": [
    { name: "Minimum Dispute Fee", func: "setMinDisputeFee" },
    { name: "Bridge Address", func: "setBridge" },
    { name: "Job Contract Address", func: "setJobContract" },
    { name: "CCTP Sender Address", func: "setCCTPSender" },
    { name: "Native Athena Recipient Address", func: "setNativeAthenaRecipient" },
    { name: "Native Chain Domain", func: "setNativeChainDomain" }
  ],
  "Main Rewards": [
    { name: "Bridge Address", func: "setBridge" },
    { name: "OpenWork Token Address", func: "setOpenworkToken" },
    { name: "Main DAO Address", func: "setMainDAO" },
    { name: "Authorized Chain", func: "updateAuthorizedChain" }
  ],
  "Native Rewards": [
    { name: "Add Reward Band", func: "addRewardBand" },
    { name: "Update Reward Band", func: "updateRewardBand" },
    { name: "Remove Last Reward Band", func: "removeLastRewardBand" },
    { name: "Job Contract Address", func: "setJobContract" },
    { name: "Genesis Address", func: "setGenesis" },
    { name: "Profile Genesis Address", func: "setProfileGenesis" }
  ],
  "Main Chain Bridge": [
    { name: "Native Chain EID", func: "updateNativeChainEid" },
    { name: "Athena Client Chain EID", func: "updateAthenaClientChainEid" },
    { name: "LOWJC Chain EID", func: "updateLowjcChainEid" },
    { name: "Main DAO Contract Address", func: "setMainDaoContract" },
    { name: "Rewards Contract Address", func: "setRewardsContract" }
  ],
  "Native Bridge": [
    { name: "Main Chain EID", func: "updateMainChainEid" },
    { name: "Add Local Chain", func: "addLocalChain" },
    { name: "Remove Local Chain", func: "removeLocalChain" },
    { name: "Native DAO Contract Address", func: "setNativeDaoContract" },
    { name: "Native Athena Contract Address", func: "setNativeAthenaContract" },
    { name: "NOWJ Contract Address", func: "setNativeOpenWorkJobContract" },
    { name: "Profile Manager Address", func: "setProfileManager" }
  ],
  "Local Bridge": [
    { name: "Native Chain EID", func: "updateNativeChainEid" },
    { name: "Main Chain EID", func: "updateMainChainEid" },
    { name: "This Local Chain EID", func: "updateThisLocalChainEid" },
    { name: "Athena Client Contract Address", func: "setAthenaClientContract" },
    { name: "LOWJC Contract Address", func: "setLowjcContract" }
  ],
  "Profile Manager": [
    { name: "Bridge Address", func: "setBridge" },
    { name: "Genesis Address", func: "setGenesis" }
  ],
  "OpenWork Genesis": [
    { name: "Authorize/Revoke Contract", func: "authorizeContract" },
    { name: "Transfer Ownership", func: "transferOwnership" }
  ],
  "Profile Genesis": [
    { name: "Authorize/Revoke Contract", func: "authorizeContract" },
    { name: "Transfer Ownership", func: "transferOwnership" }
  ]
};

export default function ContractUpdateProposelStep2() {
  const navigate = useNavigate();
  const location = useLocation();
  const contractName = location.state?.contractName || "OpenWork DAO Smart Contract";
  const [aspects, setAspects] = useState([]);

  useEffect(() => {
    // Get parameters for selected contract
    const params = CONTRACT_PARAMETERS[contractName] || [];
    const formattedParams = params.map((param, index) => ({
      id: index + 1,
      name: param.name,
      func: param.func
    }));
    setAspects(formattedParams);
  }, [contractName]);

  const handleAspectClick = (parameter) => {
    navigate('/contractupdateproposelstep3', { 
      state: { 
        contractName,
        parameterName: parameter.name,
        functionName: parameter.func
      } 
    });
  };

  return (
    <div className="contract-update-step2-container">
      <div className="contract-update-step2-card">
        <div className="contract-update-step2-header">
          <BackButton to="/contractupdateproposel" title="Select an aspect" />
        </div>

        <div className="contract-update-step2-content">
          <p className="contract-update-step2-description">
            Select an aspect from the {contractName} you wish to propose a change for
          </p>

          <div className="contract-update-step2-list">
            {aspects.map((aspect) => (
              <button
                key={aspect.id}
                className="contract-update-step2-item"
                onClick={() => handleAspectClick(aspect)}
              >
                <div className="contract-update-step2-item-content">
                  <img src="/file-icon.svg" alt="" className="aspect-file-icon" />
                  <span className="aspect-name">{aspect.name}</span>
                </div>
                <img src="/chevron-right.svg" alt="" className="aspect-arrow" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
