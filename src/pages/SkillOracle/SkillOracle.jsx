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

    // Original headers
    const headers = ["Member Name", "Rating", "Skills", "Experience", "Resolution Accuracy", ""];

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
                'Proposals'
            ]
        }
    ];

    // Original filterOptions
    const filterOptions = [
        {
            title: 'Table Columns',
            items: [
                'Name',
                'Rating',
                'Skills',
                'Experience',
                'Completion Rate'
            ]
        },
        {
            title: 'Filter',
            items: ['UX/UI Oracle', 'Web Dev Oracle', 'React Oracle', 'UX Design', 'Webflow']
        }
    ];

    // Generate table data with real blockchain information in original format
    const tableData = useMemo(() => {
        const members = oracleData.members || [];
        
        return members.map((member) => {
            const accuracyColor = getAccuracyColor(member.accuracy);
            
            return [
                <div className="user">
                    <img src="/user.png" alt="User Icon" className="userIcon" />
                    <span title={member.address}>{formatAddress(member.address)}</span>
                </div>,
                <div className="rating">
                    <span>N/A</span>
                    <img src="/star.svg" alt="" />
                </div>,
                <div className="skills-required">
                    <SkillBox title={member.oracle} />
                    <SkillBox title="+0" />
                </div>,
                <div className="experience">
                    {member.daysSinceActivity >= 0 ? `${Math.floor(member.daysSinceActivity / 365)} Years` : "N/A"}
                </div>,
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
                </div>,
                <div className="view-detail">
                    <DetailButton to={`/profile/${member.address}`} imgSrc="/view.svg" alt="detail" />
                </div>
            ];
        });
    }, [oracleData.members]);

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
                />
            </div>
        </div>
    );
}
