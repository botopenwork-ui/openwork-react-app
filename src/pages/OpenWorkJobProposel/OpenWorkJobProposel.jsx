import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import BackButton from "../../components/BackButton/BackButton";
import "./OpenWorkJobProposel.css";

export default function OpenWorkJobProposel() {
    const navigate = useNavigate();
    const [selectedWallet, setSelectedWallet] = useState("Treasury Wallet 1");
    const [isWalletDropdownOpen, setIsWalletDropdownOpen] = useState(false);
    const [amount, setAmount] = useState("");
    const [jobDetails, setJobDetails] = useState("");
    const [walletAddress, setWalletAddress] = useState("");
    const [selectedOracle, setSelectedOracle] = useState("UX/UI Skill Oracle");
    const [isOracleDropdownOpen, setIsOracleDropdownOpen] = useState(false);
    const [file, setFile] = useState(null);

    const wallets = ["Treasury Wallet 1", "Treasury Wallet 2", "Treasury Wallet 3"];
    const oracles = ["UX/UI Skill Oracle", "Blockchain Skill Oracle", "Frontend Skill Oracle"];

    const handleFileUpload = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleSubmit = () => {
        // Handle proposal submission
        console.log({
            selectedWallet,
            amount,
            jobDetails,
            walletAddress,
            selectedOracle,
            file
        });
    };

    return (
        <div className="openwork-job-proposal-container">
            <div className="openwork-job-proposal-card">
                <div className="openwork-job-proposal-header">
                    <BackButton to="/new-proposal" title="OpenWork Job Proposal" />
                </div>

                <div className="openwork-job-proposal-content">
                    <p className="openwork-job-proposal-description">
                        Assign a talent from the OpenWork platform itself to take up the job. If this proposal gets accepted, the DAO will get into a contract with the below mentioned person
                    </p>

                    {/* Treasury Wallet Dropdown */}
                    <div className="openwork-job-proposal-field">
                        <div className="openwork-job-proposal-dropdown-container">
                            <div 
                                className="openwork-job-proposal-dropdown-button"
                                onClick={() => setIsWalletDropdownOpen(!isWalletDropdownOpen)}
                            >
                                <span>{selectedWallet}</span>
                                <img 
                                    src="/chevron-down.svg" 
                                    alt="Dropdown" 
                                    className={`openwork-job-proposal-dropdown-icon ${isWalletDropdownOpen ? 'open' : ''}`}
                                />
                            </div>
                            {isWalletDropdownOpen && (
                                <div className="openwork-job-proposal-dropdown-menu">
                                    {wallets.map((wallet, index) => (
                                        <div
                                            key={index}
                                            className="openwork-job-proposal-dropdown-item"
                                            onClick={() => {
                                                setSelectedWallet(wallet);
                                                setIsWalletDropdownOpen(false);
                                            }}
                                        >
                                            {wallet}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Wallet Balance Info Box */}
                    <div className="openwork-job-proposal-info-box">
                        <span className="openwork-job-proposal-info-label">WALLET BALANCE</span>
                        <div className="openwork-job-proposal-info-value">
                            <span>100,000,000</span>
                            <img src="/ow-token-icon.png" alt="OW Token" className="openwork-job-proposal-token-icon" />
                        </div>
                    </div>

                    {/* Amount Input */}
                    <div className="openwork-job-proposal-field">
                        <div className="openwork-job-proposal-input-field">
                            <input
                                type="text"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="48.81"
                            />
                            <img src="/ow-token-icon.png" alt="OW Token" className="openwork-job-proposal-token-icon" />
                        </div>
                    </div>

                    {/* Job Details Section */}
                    <div className="openwork-job-proposal-section">
                        <span className="openwork-job-proposal-section-label">JOB DETAILS</span>
                        
                        <div className="openwork-job-proposal-textarea-container">
                            <textarea
                                value={jobDetails}
                                onChange={(e) => setJobDetails(e.target.value)}
                                placeholder="I think we should hire the best blockchain developers in the world to build a new contract"
                                rows={4}
                            />
                        </div>

                        {/* File Upload */}
                        <div className="openwork-job-proposal-file-upload" onClick={() => document.getElementById('file-input').click()}>
                            <img src="/upload-icon.svg" alt="Upload" className="openwork-job-proposal-upload-icon" />
                            <span>click here to upload a file if relevant</span>
                            <input
                                id="file-input"
                                type="file"
                                style={{ display: 'none' }}
                                onChange={handleFileUpload}
                            />
                        </div>
                    </div>

                    {/* Job Taker's Wallet Address */}
                    <div className="openwork-job-proposal-section">
                        <span className="openwork-job-proposal-section-label">JOB TAKER'S WALLET ADDRESS</span>
                        <div className="openwork-job-proposal-field">
                            <div className="openwork-job-proposal-input-field">
                                <input
                                    type="text"
                                    value={walletAddress}
                                    onChange={(e) => setWalletAddress(e.target.value)}
                                    placeholder="0xDEAF...fB8B"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Skill Oracle Selection */}
                    <div className="openwork-job-proposal-oracle-section">
                        <span className="openwork-job-proposal-section-label">CHOOSE A SKILL ORACLE FOR DISPUTE RESOLUTION</span>
                        <div className="openwork-job-proposal-dropdown-container">
                            <div 
                                className="openwork-job-proposal-dropdown-button white-bg"
                                onClick={() => setIsOracleDropdownOpen(!isOracleDropdownOpen)}
                            >
                                <span>{selectedOracle}</span>
                                <img 
                                    src="/chevron-down.svg" 
                                    alt="Dropdown" 
                                    className={`openwork-job-proposal-dropdown-icon ${isOracleDropdownOpen ? 'open' : ''}`}
                                />
                            </div>
                            {isOracleDropdownOpen && (
                                <div className="openwork-job-proposal-dropdown-menu">
                                    {oracles.map((oracle, index) => (
                                        <div
                                            key={index}
                                            className="openwork-job-proposal-dropdown-item"
                                            onClick={() => {
                                                setSelectedOracle(oracle);
                                                setIsOracleDropdownOpen(false);
                                            }}
                                        >
                                            {oracle}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button className="openwork-job-proposal-submit-button" onClick={handleSubmit}>
                        Submit Proposal
                    </button>
                </div>
            </div>
        </div>
    );
}
