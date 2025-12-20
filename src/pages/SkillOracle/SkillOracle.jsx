import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import JobsTable from "../../components/JobsTable/JobsTable";
import "./SkillOracle.css";
import SkillBox from "../../components/SkillBox/SkillBox";
import DetailButton from "../../components/DetailButton/DetailButton";
import { fetchAllOracleData, getOracleStatistics, clearCache } from "../../services/oracleService";
import {
    formatAddress,
    formatDaysSinceActivity,
    formatVotingPower,
    formatStakeAmount,
    getActivityStatus,
    getAccuracyColor,
    sortMembers,
    filterMembers,
    exportToCSV,
    downloadCSV,
} from "../../utils/oracleHelpers";

export default function SkillOracle() {
    const [oracleData, setOracleData] = useState({ oracles: [], members: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);

    const membersPerPage = 5;

    // Column configuration
    const allColumns = [
        { id: "memberName", label: "Member Name", required: true },
        { id: "rating", label: "Rating", required: false },
        { id: "skills", label: "Skills", required: false },
        { id: "experience", label: "Experience", required: false },
        { id: "votingPower", label: "Voting Power", required: false },
        { id: "stake", label: "Stake + Earned", required: false },
        { id: "votesCast", label: "Votes Cast", required: false },
        { id: "status", label: "Status", required: false },
        { id: "accuracy", label: "Resolution Accuracy", required: false },
        { id: "actions", label: "", required: true },
    ];

    // Selected columns state - rating and accuracy hidden by default
    const [selectedColumns, setSelectedColumns] = useState([
        "memberName",
        "skills",
        "votingPower",
        "stake",
        "status",
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

    // Fetch oracle data from blockchain
    useEffect(() => {
        async function loadOracleData() {
            try {
                setLoading(true);
                setError(null);

                console.log("Loading oracle data...");
                
                // Fetch all oracle data with member details
                const data = await fetchAllOracleData();
                setOracleData(data);

                console.log("Oracle data loaded successfully!");

            } catch (err) {
                console.error("Error loading oracle data:", err);
                setError(err.message || "Failed to load oracle data. Please check your RPC connection.");
            } finally {
                setLoading(false);
            }
        }

        loadOracleData();
    }, []);

    // Original titleOptions
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
            title: 'Oracles',
            items: [
                'Oracles',
                'Members',
                'Disputes',
                // 'Proposals' // TODO: Re-enable when DAO proposals integration is ready
            ]
        }
    ];

    // Generate filter options from actual data
    const filterOptions = useMemo(() => {
        // Get unique oracle names from the data
        const oracleNames = [...new Set(
            oracleData.oracles?.map(oracle => oracle.name) || []
        )];

        return [
            {
                title: 'Table Columns',
                items: allColumns
                    .filter(col => !col.required && col.label) // Exclude required and empty label columns
                    .map(col => col.label)
            },
            {
                title: 'Filter',
                items: oracleNames.length > 0 ? oracleNames : ['All Oracles']
            }
        ];
    }, [oracleData.oracles, allColumns]);

    // Generate table data with real blockchain information in original format
    const tableData = useMemo(() => {
        const members = oracleData.members || [];

        return members.map((member) => {
            const accuracyColor = getAccuracyColor(member.accuracy);

            // Create all possible column data
            const allColumnData = {
                memberName: (
                    <div className="user">
                        <img src="/user.png" alt="User Icon" className="userIcon" />
                        <span title={member.address}>{formatAddress(member.address)}</span>
                    </div>
                ),
                rating: (
                    <div className="rating">
                        <span>N/A</span>
                        <img src="/star.svg" alt="" />
                    </div>
                ),
                skills: (
                    <div className="skills-required">
                        <SkillBox title={member.allOracles?.[0] || member.oracle} />
                        {member.allOracles?.length > 1 && (
                            <SkillBox title={`+${member.allOracles.length - 1}`} />
                        )}
                    </div>
                ),
                experience: (
                    <div className="experience">
                        {member.daysSinceActivity >= 0 ? `${Math.floor(member.daysSinceActivity / 365)} Years` : "N/A"}
                    </div>
                ),
                votingPower: (
                    <div className="voting-power">
                        <span>{formatVotingPower(member.votingPower)}</span>
                    </div>
                ),
                stake: (
                    <div className="stake" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <img src="/xdc.svg" alt="OW" style={{ width: "16px", height: "16px" }} />
                        <span>
                            {formatStakeAmount(
                                (BigInt(member.stakeAmount || "0") + BigInt(member.earnedTokens || "0")).toString()
                            )}
                        </span>
                    </div>
                ),
                votesCast: (
                    <div className="votes-cast">
                        <span>{member.totalVotes || 0}</span>
                    </div>
                ),
                status: (
                    <div className={`status-badge ${member.isActive ? 'active' : 'inactive'}`}>
                        <span>{member.isActive ? 'Active' : 'Inactive'}</span>
                    </div>
                ),
                accuracy: (
                    <div className="vote-progress">
                        <div className="progress-bar-container">
                            <div
                                className="progress-bar-fill"
                                style={{
                                    width: `${member.accuracy}%`,
                                    backgroundColor: accuracyColor
                                }}
                            />
                        </div>
                        <span className="vote-percentage">{member.accuracy}%</span>
                    </div>
                ),
                actions: (
                    <div className="view-detail">
                        <DetailButton to={`/profile/${member.address}`} imgSrc="/view.svg" alt="detail" />
                    </div>
                ),
            };

            // Filter based on selected columns
            return selectedColumns.map(columnId => allColumnData[columnId]);
        });
    }, [oracleData.members, selectedColumns]);

    // Calculate indices for pagination
    const indexOfLastUser = currentPage * membersPerPage;
    const indexOfFirstUser = indexOfLastUser - membersPerPage;
    const currentUsers = tableData.slice(indexOfFirstUser, indexOfLastUser);

    const totalPages = Math.ceil((oracleData.members?.length || 0) / membersPerPage);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    return (
        <div className="body-container">
            <div className="view-jobs-container">
                <JobsTable
                    title={`OpenWork Ledger`}
                    backUrl="/governance"
                    tableData={currentUsers}
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
