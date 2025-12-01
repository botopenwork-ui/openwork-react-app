import React from "react";
import { useNavigate } from "react-router-dom";
import BackButton from "../../components/BackButton/BackButton";
import "./ContractUpgradeProposal.css";

export default function ContractUpgradeProposal() {
    const navigate = useNavigate();

    const contracts = [
        { id: 1, name: "Main DAO" },
        { id: 2, name: "Native DAO" },
        { id: 3, name: "OpenWork Token" },
        { id: 4, name: "Native OpenWork Job Contract" },
        { id: 5, name: "Local OpenWork Job Contract" },
        { id: 6, name: "Native Athena" },
        { id: 7, name: "Native Athena Oracle Manager" },
        { id: 8, name: "Athena Client" },
        { id: 9, name: "Main Rewards" },
        { id: 10, name: "Native Rewards" },
        { id: 11, name: "OpenWork Genesis" },
        { id: 12, name: "Profile Genesis" },
        { id: 13, name: "Profile Manager" },
        { id: 14, name: "Contract Registry" }
    ];

    const handleContractClick = (contractName) => {
        navigate('/contract-upgrade-proposal-step2', { state: { contractName } });
    };

    return (
        <div className="contract-upgrade-container">
            <div className="contract-upgrade-card">
                <div className="contract-upgrade-header">
                    <BackButton to="/new-proposal" title="Contract Upgrade Proposal" />
                </div>

                <div className="contract-upgrade-content">
                    <p className="contract-upgrade-description">
                        Select the contract you wish to propose a change for
                    </p>

                    <div className="contracts-list">
                        {contracts.map((contract) => (
                            <button
                                key={contract.id}
                                className="contract-item"
                                onClick={() => handleContractClick(contract.name)}
                            >
                                <div className="contract-item-content">
                                    <img 
                                        src="/file-icon.svg" 
                                        alt="Contract" 
                                        className="contract-icon"
                                    />
                                    <span className="contract-name">{contract.name}</span>
                                </div>
                                <img 
                                    src="/chevron-right.svg" 
                                    alt="Arrow" 
                                    className="contract-arrow"
                                />
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
