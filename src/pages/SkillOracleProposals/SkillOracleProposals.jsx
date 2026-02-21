import React, { useEffect, useMemo, useState } from "react";
import JobsTable from "../../components/JobsTable/JobsTable";
import "./SkillOracleProposals.css";
import DetailButton from "../../components/DetailButton/DetailButton";
import { fetchAllProposals } from "../../services/proposalService";
import { formatAddress } from "../../utils/oracleHelpers";

export default function SkillOracleProposals() {
    const [proposals, setProposals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const proposalsPerPage = 5;

    // Column configuration
    const allColumns = [
        { id: "title", label: "Request Title", required: true },
        { id: "submittedBy", label: "Submitted By", required: false },
        { id: "type", label: "Type", required: false },
        { id: "voteSubmissions", label: "Vote Submissions", required: false },
        { id: "actions", label: "", required: true },
    ];

    // Selected columns state
    const [selectedColumns, setSelectedColumns] = useState([
        "title", "submittedBy", "type", "voteSubmissions", "actions"
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
                // Can't deselect if at minimum (3 columns)
                if (prev.length <= 3) return prev;
                return prev.filter(id => id !== columnId);
            } else {
                // Can't select if at maximum (5 columns)
                if (prev.length >= 5) return prev;

                // Maintain column order from allColumns
                const allColumnIds = allColumns.map(col => col.id);
                return allColumnIds.filter(id =>
                    prev.includes(id) || id === columnId
                );
            }
        });
    };

    // Fetch proposals from blockchain
    useEffect(() => {
        async function loadProposals() {
            try {
                setLoading(true);
                setError(null);
                
                const proposalData = await fetchAllProposals();
                setProposals(proposalData);
                
                console.log("Proposal data loaded successfully!");
            } catch (err) {
                console.error("Error loading proposals:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        
        loadProposals();
    }, []);

    const titleOptions = [
        {
            title: 'Skill Oracle View',
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
                'Oracles',
                'Members',
                'Disputes',
                // 'Proposals' // TODO: Re-enable when DAO proposals integration is ready
            ]
        }
    ]

    const filterOptions = [
        {
            title: 'Table Columns',
            items: allColumns
                .filter(col => !col.required && col.label)
                .map(col => col.label)
        },
        {
            title: 'Filter',
            items: [
                'All',
                'Eligibility Application',
                'Recruitment Proposal',
                'Removal Proposal',
                'Skill Verification'
            ]
        }
    ] 

    const displayProposals = proposals;

    const tableData = useMemo(() => {
        return displayProposals.map((proposal) => {
            const isRealData = proposal.submittedBy && proposal.submittedBy.startsWith('0x');

            // Create all possible column data
            const allColumnData = {
                title: (
                    <div className="proposal-title">
                        <img src="/file-05.svg" alt="File Icon" className="fileIcon" />
                        <span>{proposal.title}</span>
                    </div>
                ),
                submittedBy: (
                    <div className="submitted-by">
                        <span title={proposal.submittedBy}>
                            {isRealData ? formatAddress(proposal.submittedBy) : proposal.submittedBy}
                        </span>
                    </div>
                ),
                type: (
                    <div className="proposal-type">
                        <span>{proposal.type}</span>
                    </div>
                ),
                voteSubmissions: (
                    <div className="vote-progress">
                        <div className="progress-bar-container">
                            <div
                                className="progress-bar-fill"
                                style={{
                                    width: `${proposal.votePercent}%`,
                                    backgroundColor: proposal.color
                                }}
                            />
                        </div>
                        <span className="vote-percentage">{proposal.votePercent}%</span>
                    </div>
                ),
                actions: (
                    <div className="view-detail">
                        <DetailButton to={`/proposal-review/${proposal.id}`} title={'Review'} imgSrc="/view.svg" alt="review"/>
                    </div>
                ),
            };

            // Filter based on selected columns
            return selectedColumns.map(columnId => allColumnData[columnId]);
        });
    }, [displayProposals, selectedColumns])

    const indexOfLastProposal = currentPage * proposalsPerPage;
    const indexOfFirstProposal = indexOfLastProposal - proposalsPerPage;
    const currentProposals = tableData.slice(indexOfFirstProposal, indexOfLastProposal);

    const totalPages = Math.ceil(displayProposals.length / proposalsPerPage);
    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    return (
        <div className="body-container">
            <div className="view-jobs-container">
                    <JobsTable
                        title={`OpenWork Ledger`}
                        backUrl="/governance"
                        tableData={currentProposals}
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={paginate}
                        headers={headers}
                        titleOptions={titleOptions}
                        filterOptions={filterOptions}
                        selectedColumns={selectedColumns}
                        onColumnToggle={handleColumnToggle}
                        allColumns={allColumns}
                    />
            </div>
        </div>
    );
}
