import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import JobsTable from "../../components/JobsTable/JobsTable";
import "./DAO.css";
import DetailButton from "../../components/DetailButton/DetailButton";
import BlueButton from "../../components/BlueButton/BlueButton";
import { getDAOStats, getAllProposals } from "../../services/daoService";

export default function DAO() {
    const navigate = useNavigate();
    const [currentPage, setCurrentPage] = useState(1);
    const proposalsPerPage = 4;
    const [daoStats, setDaoStats] = useState(null);
    const [proposals, setProposals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [walletAddress, setWalletAddress] = useState("");
    const [selectedFilter, setSelectedFilter] = useState('All');

    const headers = ["Request Title", "Proposed By", "Vote Submissions", "Type", "Time Left", ""];

    // Fetch DAO data from both chains
    useEffect(() => {
        async function loadDAOData() {
            try {
                setLoading(true);
                
                // Get wallet address
                let userAddr = "";
                if (window.ethereum) {
                    const accounts = await window.ethereum.request({ method: "eth_accounts" });
                    if (accounts.length > 0) {
                        userAddr = accounts[0];
                        setWalletAddress(userAddr);
                    }
                }
                
                // Fetch stats and proposals
                const [stats, proposalData] = await Promise.all([
                    getDAOStats(userAddr),
                    getAllProposals()
                ]);
                
                setDaoStats(stats);
                setProposals(proposalData);
                
                console.log("DAO data loaded successfully!");
            } catch (error) {
                console.error("Error loading DAO data:", error);
            } finally {
                setLoading(false);
            }
        }
        
        loadDAOData();
    }, []);

    const dummyProposals = [
        {
            id: "0x1234",
            title: "OpenWork Token Contract Upgrade",
            proposedBy: "0xDEAF...f8BB",
            voteSubmissions: 70,
            type: "Upgrade",
            timeLeft: "2 days",
            color: "#FFA500",
            viewUrl: "/contract-upgrade-proposal-view"
        },
        {
            id: "0x2345",
            title: "OpenWork Token Contract Update",
            proposedBy: "0xDEAF...f8BB",
            voteSubmissions: 90,
            type: "Update",
            timeLeft: "5 days",
            color: "#00C853",
            viewUrl: "/contract-update-proposal-view"
        },
        {
            id: "0x3456",
            title: "Treasury Proposal",
            proposedBy: "Jollie Hall",
            voteSubmissions: 40,
            type: "Treasury",
            timeLeft: "1 day",
            color: "#F44336",
            viewUrl: "/treasury-proposal-view"
        },
        {
            id: "0x4567",
            title: "Dissolve General Skill Oracle",
            proposedBy: "0xDEAF...f8BB",
            voteSubmissions: 60,
            type: "Dissolve Oracle",
            timeLeft: "2 hrs",
            color: "#FFA500",
            viewUrl: "/dissolve-oracle-proposal-view"
        },
        {
            id: "0x5678",
            title: "Recruit Member to Skill Oracle",
            proposedBy: "Mollie Hall",
            voteSubmissions: 80,
            type: "Recruitment",
            timeLeft: "3 days",
            color: "#00C853",
            viewUrl: "/recruitment-proposal-view"
        }
    ];

    const titleOptions = [
        {
            title: 'DAO View',
            items: [
                'Jobs View',
                'Skill Oracle View',
                'Talent View',
                'DAO View'
            ]
        },
        {
            title: 'Proposals',
            items: [
                'Members',
                'Proposals'
            ]
        }
    ];

    const filterOptions = [
        {
            title: 'Table Columns',
            items: [
                'Title',
                'Proposed by',
                'Vote Submission',
                'Type',
                'Time Left'
            ]
        },
        {
            title: 'Filter',
            items: [
                'All',
                'Active',
                'Pending',
                'Succeeded',
                'Defeated',
                'Executed',
                'Canceled',
                'Queued',
                'Expired'
            ]
        }
    ];

    // Use blockchain data or fallback to dummy data
    let displayProposals = proposals.length > 0 ? proposals : dummyProposals;
    
    // Apply filter
    if (selectedFilter !== 'All') {
        displayProposals = displayProposals.filter(proposal => proposal.type === selectedFilter);
    }

    const tableData = useMemo(() => {
        return displayProposals.map((proposal) => {
            return [
                <div className="proposal-title">
                    <img src="/doc.svg" alt="" className="docIcon" />
                    {proposal.title && <span>{proposal.title}</span>}
                </div>,
                <div className="proposed-by">
                    <span>{proposal.proposedBy}</span>
                </div>,
                <div className="vote-progress">
                    <div className="progress-bar-container">
                        <div 
                            className="progress-bar-fill" 
                            style={{ 
                                width: `${proposal.voteSubmissions}%`,
                                backgroundColor: proposal.color 
                            }}
                        />
                    </div>
                    <span className="vote-percentage">{proposal.voteSubmissions}%</span>
                </div>,
                <div className="proposal-type">{proposal.type}</div>,
                <div className="time-left">{proposal.timeLeft}</div>,
                <div className="view-detail">
                    <DetailButton to={proposal.viewUrl} imgSrc="/view.svg" alt="detail" />
                </div>
            ];
        });
    }, [displayProposals, navigate]);

    // Calculate indices for pagination
    const indexOfLastProposal = currentPage * proposalsPerPage;
    const indexOfFirstProposal = indexOfLastProposal - proposalsPerPage;
    const currentProposals = tableData.slice(indexOfFirstProposal, indexOfLastProposal);

    const totalPages = Math.ceil(displayProposals.length / proposalsPerPage);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    // Use real data from blockchain or fallback to defaults
    const customBoxItems = [
        {
            icon: '/proposals.svg',
            title: 'SKILL ORACLES',
            number: daoStats ? daoStats.skillOracleCount.toString() : '12'
        },
        {
            icon: '/members.svg',
            title: 'DAO MEMBERS',
            number: daoStats ? daoStats.totalMembers.toString() : '120'
        },
        {
            icon: '/stakings.svg',
            title: 'MY CURRENT STAKINGS',
            number: daoStats ? daoStats.userStakings : '0'
        }
    ];

    const handleReferEarnClick = () => {
        navigate('/refer-earn');
    };

    return (
        <div className="body-container">
            <div className="view-jobs-container">
                <JobsTable
                    title={`OpenWork DAO`}
                    ledgerTitle={`OpenWork Ledger`}
                    backUrl="/governance"
                    tableData={currentProposals}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={paginate}
                    headers={headers}
                    titleOptions={titleOptions}
                    filterOptions={filterOptions}
                    selectedFilter={selectedFilter}
                    onFilterChange={setSelectedFilter}
                    applyNow={false}
                    boxSection={true}
                    customBoxItems={customBoxItems}
                    customButtonLabel="New Proposal"
                    customButtonIcon="/plus.svg"
                    onCustomButtonClick={() => navigate('/new-proposal')}
                    onReferEarnClick={handleReferEarnClick}
                />
            </div>
        </div>
    );
}
