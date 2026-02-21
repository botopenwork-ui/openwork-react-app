import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import JobsTable from "../../components/JobsTable/JobsTable";
import "./DAO.css";
import DetailButton from "../../components/DetailButton/DetailButton";
import BlueButton from "../../components/BlueButton/BlueButton";
import Loading from "../../components/Loading";
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

    // Column configuration
    const allColumns = [
        { id: "title", label: "Request Title", required: true },
        { id: "proposedBy", label: "Proposed By", required: false },
        { id: "voteSubmissions", label: "Vote Submissions", required: false },
        { id: "type", label: "Type", required: false },
        { id: "timeLeft", label: "Time Left", required: false },
        { id: "actions", label: "", required: true },
    ];

    // Selected columns state - default to all columns
    const [selectedColumns, setSelectedColumns] = useState([
        "title",
        "proposedBy",
        "voteSubmissions",
        "type",
        "timeLeft",
        "actions"
    ]);

    // Generate headers based on selected columns
    const headers = selectedColumns.map(colId => {
        const column = allColumns.find(col => col.id === colId);
        return column ? column.label : "";
    });

    // Column toggle handler
    const handleColumnToggle = (columnId) => {
        setSelectedColumns(prev => {
            const isCurrentlySelected = prev.includes(columnId);
            const column = allColumns.find(col => col.id === columnId);
            
            // Can't toggle required columns
            if (column?.required) return prev;
            
            if (isCurrentlySelected) {
                // Can't deselect if at minimum (4 columns)
                if (prev.length <= 4) return prev;
                return prev.filter(id => id !== columnId);
            } else {
                // Can't select if at maximum (6 columns)
                if (prev.length >= 6) return prev;
                
                // Maintain column order from allColumns
                const allColumnIds = allColumns.map(col => col.id);
                return allColumnIds.filter(id => 
                    prev.includes(id) || id === columnId
                );
            }
        });
    };

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

    // Use blockchain data only
    let displayProposals = proposals;
    
    // Apply filter
    if (selectedFilter !== 'All') {
        displayProposals = displayProposals.filter(proposal => proposal.type === selectedFilter);
    }

    const tableData = useMemo(() => {
        return displayProposals.map((proposal) => {
            // Create all possible column data
            const allColumnData = {
                title: (
                    <div className="proposal-title">
                        <img src="/doc.svg" alt="" className="docIcon" />
                        {proposal.title && <span>{proposal.title}</span>}
                    </div>
                ),
                proposedBy: (
                    <div className="proposed-by">
                        <span>{proposal.proposedBy}</span>
                    </div>
                ),
                voteSubmissions: (
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
                    </div>
                ),
                type: (
                    <div className="proposal-type">{proposal.type}</div>
                ),
                timeLeft: (
                    <div className="time-left">{proposal.timeLeft}</div>
                ),
                actions: (
                    <div className="view-detail">
                        <DetailButton to={proposal.viewUrl} imgSrc="/view.svg" alt="detail" />
                    </div>
                ),
            };

            // Filter based on selected columns
            return selectedColumns.map(columnId => allColumnData[columnId]);
        });
    }, [displayProposals, navigate, selectedColumns]);

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
            icon: '/OWToken.svg',
            title: 'MY OW BALANCE',
            number: daoStats ? daoStats.userTokenBalance : '0'
        },
        {
            icon: '/stakings.svg',
            title: 'MY CURRENT STAKINGS',
            number: daoStats ? daoStats.userStakings : '0',
            subtitle: daoStats && daoStats.unclaimedTokens !== '0'
                ? `+ ${Number(daoStats.unclaimedTokens).toLocaleString()} UNCLAIMED`
                : null
        }
    ];

    const handleReferEarnClick = () => {
        navigate('/refer-earn');
    };

    // Show loading state while fetching blockchain data
    if (loading) {
        return <Loading />;
    }

    return (
        <div className="body-container">
            <div className="view-jobs-container dao-page">
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
                    selectedColumns={selectedColumns}
                    onColumnToggle={handleColumnToggle}
                    allColumns={allColumns}
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
