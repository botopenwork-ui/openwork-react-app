import React from "react";
import { useNavigate } from "react-router-dom";
import BackButton from "../../components/BackButton/BackButton";
import "./ContractUpdateProposel.css";

export default function ContractUpdateProposel() {
  const navigate = useNavigate();

  const contracts = [
    { id: 1, name: "Main DAO" },
    { id: 2, name: "Native DAO" },
    { id: 3, name: "Native Athena" },
    { id: 4, name: "Native Athena Oracle Manager" },
    { id: 5, name: "Native OpenWork Job Contract" },
    { id: 6, name: "Local OpenWork Job Contract" },
    { id: 7, name: "Athena Client" },
    { id: 8, name: "Main Rewards" },
    { id: 9, name: "Native Rewards" },
    { id: 10, name: "Main Chain Bridge" },
    { id: 11, name: "Native Bridge" },
    { id: 12, name: "Local Bridge" },
    { id: 13, name: "Profile Manager" },
    { id: 14, name: "OpenWork Genesis" },
    { id: 15, name: "Profile Genesis" }
  ];

  const handleContractClick = (contractName) => {
    navigate('/contract-update-step2', { state: { contractName } });
  };

  return (
    <div className="contract-update-container">
      <div className="contract-update-card">
        <div className="contract-update-header">
          <BackButton to="/new-proposal" title="Contract Update Proposal" />
        </div>

        <div className="contract-update-content">
          <p className="contract-update-description">
            Select the contract you wish to propose a change for
          </p>

          <div className="contract-update-list">
            {contracts.map((contract) => (
              <button
                key={contract.id}
                className="contract-update-item"
                onClick={() => handleContractClick(contract.name)}
              >
                <div className="contract-update-item-content">
                  <img src="/file-icon.svg" alt="" className="contract-file-icon" />
                  <span className="contract-name">{contract.name}</span>
                </div>
                <img src="/chevron-right.svg" alt="" className="contract-arrow" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
