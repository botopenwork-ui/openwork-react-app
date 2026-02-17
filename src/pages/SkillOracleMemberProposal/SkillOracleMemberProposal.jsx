import React from "react";
import { useNavigate } from "react-router-dom";
import BackButton from "../../components/BackButton/BackButton";
import "./SkillOracleMemberProposal.css";

export default function SkillOracleProposal() {
    const navigate = useNavigate();

    const options = [
        {
            id: 1,
            icon: "/recruit-member-icon.svg",
            name: "Recruit a member to a Skill Oracle",
            route: "/skilloraclerecruitmentstep2"
        },
        {
            id: 2,
            icon: "/remove-member-skill-oracle-icon.svg",
            name: "Remove a member from a Skill Oracle",
            route: "/skilloraclememberremovalstep2"
        }
    ];

    const handleOptionClick = (route) => {
        navigate(route);
    };

    return (
        <div className="skill-oracle-proposal-container">
            <div className="skill-oracle-proposal-card">
                <div className="skill-oracle-proposal-header">
                    <BackButton to="/new-proposal" title="Select an option" />
                </div>

                <div className="skill-oracle-proposal-content">
                    <p className="skill-oracle-proposal-description">
                        Select an aspect from the OpenWork DAO Smart Contract you wish to propose a change for
                    </p>

                    <div className="options-list">
                        {options.map((option) => (
                            <button
                                key={option.id}
                                className="option-item"
                                onClick={() => handleOptionClick(option.route)}
                            >
                                <div className="option-item-content">
                                    <div className="option-icon-wrapper">
                                        <img 
                                            src={option.icon} 
                                            alt={option.name} 
                                            className="option-icon"
                                        />
                                    </div>
                                    <span className="option-name">{option.name}</span>
                                </div>
                                <img 
                                    src="/chevron-right.svg" 
                                    alt="Select" 
                                    className="option-arrow"
                                />
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
