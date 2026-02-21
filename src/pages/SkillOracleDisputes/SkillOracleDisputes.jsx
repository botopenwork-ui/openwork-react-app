import React, { useEffect, useMemo, useState } from "react";
import JobsTable from "../../components/JobsTable/JobsTable";
import "./SkillOracleDisputes.css";
import DetailButton from "../../components/DetailButton/DetailButton";
import { fetchAllDisputes } from "../../services/disputeService";
import { formatAddress } from "../../utils/oracleHelpers";

export default function SkillOracleDisputes() {
    const [disputes, setDisputes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const disputesPerPage = 5;

    // Column configuration
    const allColumns = [
        { id: "title", label: "Request Title", required: true },
        { id: "proposedBy", label: "Proposed By", required: false },
        { id: "role", label: "Role", required: false },
        { id: "voteSubmissions", label: "Vote Submissions", required: false },
        { id: "amount", label: "Amount", required: false },
        { id: "actions", label: "", required: true },
    ];

    // Selected columns state
    const [selectedColumns, setSelectedColumns] = useState([
        "title", "proposedBy", "role", "voteSubmissions", "amount", "actions"
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

    // Fetch disputes from blockchain
    useEffect(() => {
        async function loadDisputes() {
            try {
                setLoading(true);
                setError(null);
                
                const disputeData = await fetchAllDisputes();
                setDisputes(disputeData);
                
            } catch (err) {
                console.error("Error loading disputes:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        
        loadDisputes();
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
            title: 'Disputes',
            items: [
                'Oracles',
                'Members',
                'Disputes',
                'Applications',
                'Ask Athena',
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
                'Job Giver',
                'Job Taker',
                'Oracle Member'
            ]
        }
    ] 

    const displayDisputes = disputes;

    const tableData = useMemo(() => {
        return displayDisputes.map((dispute) => {
            const isRealData = dispute.proposedBy && dispute.proposedBy.startsWith('0x');

            // Create all possible column data
            const allColumnData = {
                title: (
                    <div className="dispute-title">
                        <img src="/file-05.svg" alt="File Icon" className="fileIcon" />
                        <span>{dispute.title}</span>
                    </div>
                ),
                proposedBy: (
                    <div className="proposed-by">
                        <span title={dispute.proposedBy}>
                            {isRealData ? formatAddress(dispute.proposedBy) : dispute.proposedBy}
                        </span>
                    </div>
                ),
                role: (
                    <div className="dispute-role">
                        <span>{dispute.role}</span>
                    </div>
                ),
                voteSubmissions: (
                    <div className="vote-progress">
                        <div className="progress-bar-container">
                            <div
                                className="progress-bar-fill"
                                style={{
                                    width: `${dispute.voteSubmissions}%`,
                                    backgroundColor: dispute.color
                                }}
                            />
                        </div>
                        <span className="vote-percentage">{dispute.voteSubmissions}%</span>
                    </div>
                ),
                amount: (
                    <div className="dispute-amount">
                        <span>{dispute.amount}</span>
                        <img src="/usdc.svg" alt="USDC" className="currencyIcon" />
                    </div>
                ),
                actions: (
                    <div className="view-detail">
                        <DetailButton to={`/dispute-view/${dispute.id}`} title={'View'} imgSrc="/view.svg" alt="view"/>
                    </div>
                ),
            };

            // Filter based on selected columns
            return selectedColumns.map(columnId => allColumnData[columnId]);
        });
    }, [displayDisputes, selectedColumns])

    const indexOfLastDispute = currentPage * disputesPerPage;
    const indexOfFirstDispute = indexOfLastDispute - disputesPerPage;
    const currentDisputes = tableData.slice(indexOfFirstDispute, indexOfLastDispute);

    const totalPages = Math.ceil(disputes.length / disputesPerPage);
    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    return (
        <div className="body-container">
            <div className="view-jobs-container">
                    <JobsTable
                        title={`OpenWork Ledger`}
                        backUrl="/governance"
                        tableData={currentDisputes}
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={paginate}
                        headers={headers}
                        titleOptions={titleOptions}
                        filterOptions={filterOptions}
                        applyNow={true}
                        selectedColumns={selectedColumns}
                        onColumnToggle={handleColumnToggle}
                        allColumns={allColumns}
                    />
            </div>
        </div>
    );
}
