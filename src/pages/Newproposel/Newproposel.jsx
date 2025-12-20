import React from "react";
import { useNavigate } from "react-router-dom";
import BackButton from "../../components/BackButton/BackButton";
import "./Newproposel.css";

export default function Newproposel() {
    const navigate = useNavigate();

    const proposalTypes = [
        {
            icon: "/treasury-icon.svg",
            title: "Treasury Proposal",
            path: "/treasury-proposal"
        },
        // {
        //     icon: "/openwork-job-icon.svg",
        //     title: "OpenWork Job Proposal",
        //     path: "/openworkjobproposel"
        // },
        {
            icon: "/upgrade-icon.svg",
            title: "Contract Upgrade Proposal",
            path: "/contract-upgrade-proposal"
        },
        {
            icon: "/update-icon.svg",
            title: "Contract Update Proposal",
            path: "/contractupdateproposel"
        },
        {
            icon: "/skill-oracle-icon.svg",
            title: "Skill Oracle Proposal",
            path: "/skill-oracle-proposal"
        },
        {
            icon: "/skill-oracle-member-icon.svg",
            title: "Skill Oracle Member Proposal",
            path: "/skill-oracle-member-proposal"
        }
    ];

    return (
        <div className="new-proposal-container">
            <div className="new-proposal-card">
                <div className="new-proposal-header">
                    <BackButton to="/dao" title="New DAO Proposal" />
                </div>

                <div className="new-proposal-content">
                    <p className="proposal-description">
                        Select the type of proposal you wish to create
                    </p>

                    <div className="proposal-types-list">
                        {proposalTypes.map((proposal, index) => (
                            <button
                                key={index}
                                className="proposal-type-button"
                                onClick={() => navigate(proposal.path)}
                            >
                                <div className="proposal-type-content">
                                    <div className="proposal-icon-wrapper">
                                        <img 
                                            src={proposal.icon} 
                                            alt={proposal.title} 
                                            className="proposal-icon" 
                                        />
                                    </div>
                                    <span className="proposal-type-title">{proposal.title}</span>
                                </div>
                                <div className="proposal-arrow-wrapper">
                                    <img 
                                        src="/chevron-right.svg" 
                                        alt="Arrow" 
                                        className="proposal-arrow" 
                                    />
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
