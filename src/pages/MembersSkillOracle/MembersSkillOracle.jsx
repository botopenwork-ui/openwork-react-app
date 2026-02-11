import React, { useEffect, useMemo, useState } from "react";
import JobsTable from "../../components/JobsTable/JobsTable";
import "./MembersSkillOracle.css";
import SkillBox from "../../components/SkillBox/SkillBox";
import DetailButton from "../../components/DetailButton/DetailButton";
import { fetchAllOracleData } from "../../services/oracleService";
import { formatAddress, getAccuracyColor } from "../../utils/oracleHelpers";

export default function MembersSkillOracle() {
    const [oracleData, setOracleData] = useState({ oracles: [], members: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const usersPerPage = 5;

    // Column configuration
    const allColumns = [
        { id: "memberName", label: "Member Name", required: true },
        { id: "rating", label: "Rating", required: false },
        { id: "skills", label: "Skills", required: false },
        { id: "experience", label: "Experience", required: false },
        { id: "accuracy", label: "Resolution Accuracy", required: false },
        { id: "actions", label: "", required: true },
    ];

    // Selected columns state
    const [selectedColumns, setSelectedColumns] = useState([
        "memberName", "rating", "skills", "experience", "accuracy", "actions"
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

    // Fetch oracle members from blockchain
    useEffect(() => {
        async function loadMemberData() {
            try {
                setLoading(true);
                setError(null);
                
                const data = await fetchAllOracleData();
                setOracleData(data);
                
                console.log("Member data loaded successfully!");
            } catch (err) {
                console.error("Error loading member data:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        
        loadMemberData();
    }, []);

    const users = oracleData.members.length > 0 ? oracleData.members : [
        {
            id: 0,
            name: 'Mollie Hall',
            rating: '4.9',
            skills: 'UX Design',
            experience: '4',
            prcent: 70,
            color: '#FFA500'
        },
        {
            id: 1,
            name: 'Mollie Hall',
            rating: '4.9',
            skills: 'UX Design',
            experience: '4',
            prcent: 90,
            color: '#00C853'
        },
        {
            id: 2,
            name: 'Mollie Hall',
            rating: '4.9',
            skills: 'UX Design',
            experience: '4',
            prcent: 40,
            color: '#F44336'
        },
        {
            id: 3,
            name: 'Mollie Hall',
            rating: '4.9',
            skills: 'UX Design',
            experience: '4',
            prcent: 60,
            color: '#FFA500'
        },
        {
            id: 4,
            name: 'Mollie Hall',
            rating: '4.9',
            skills: 'UX Design',
            experience: '4',
            prcent: 20,
            color: '#F44336'
        },
        {
            id: 5,
            name: 'Mollie Hall',
            rating: '4.9',
            skills: 'UX Design',
            experience: '4',
            prcent: 80,
            color: '#00C853'
        },
        {
            id: 0,
            name: 'Mollie Hall',
            rating: '4.9',
            skills: 'UX Design',
            experience: '4',
            prcent: '20'
        },
    ]

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
            title: 'Members',
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
                'Active',
                'Inactive'
            ]
        }
    ] 

    const tableData = useMemo(() => {
        return users.map((user) => {
            // Handle both real blockchain data and dummy data
            const isRealData = user.address !== undefined;
            const accuracyColor = isRealData ? getAccuracyColor(user.accuracy) : (user.color || '#FFA500');

            // Create all possible column data
            const allColumnData = {
                memberName: (
                    <div className="user">
                        <img src="/user.png" alt="User Icon" className="userIcon" />
                        <span title={user.address}>
                            {isRealData ? formatAddress(user.address) : user.name}
                        </span>
                    </div>
                ),
                rating: (
                    <div className="rating">
                        <span>{user.rating || 'N/A'}</span>
                        <img src="/star.svg" alt="" />
                    </div>
                ),
                skills: (
                    <div className="skills-required">
                        <SkillBox title={isRealData ? user.oracle : user.skills}/>
                        {user.additionalSkills > 0 && <SkillBox title={`+${user.additionalSkills}`}/>}
                    </div>
                ),
                experience: (
                    <div className="experience">
                        {isRealData
                            ? (user.daysSinceActivity >= 0 ? `${Math.floor(user.daysSinceActivity / 365)} Years` : "N/A")
                            : (user.experience + " Years")
                        }
                    </div>
                ),
                accuracy: (
                    <div className="vote-progress">
                        <div className="progress-bar-container">
                            <div
                                className="progress-bar-fill"
                                style={{
                                    width: `${isRealData ? user.accuracy : user.prcent}%`,
                                    backgroundColor: accuracyColor
                                }}
                            />
                        </div>
                        <span className="vote-percentage">
                            {isRealData ? user.accuracy : user.prcent}%
                        </span>
                    </div>
                ),
                actions: (
                    <div className="view-detail">
                        <DetailButton
                            to={isRealData ? `/profile/${user.address}` : `/members-governance/0`}
                            title={'Governance'}
                            imgSrc="/view.svg"
                            alt="detail"
                        />
                    </div>
                ),
            };

            // Filter based on selected columns
            return selectedColumns.map(columnId => allColumnData[columnId]);
        });
    }, [users, selectedColumns])

    const indexOfLastUser = currentPage * usersPerPage;
    const indexOfFirstUser = indexOfLastUser - usersPerPage;
    const currentUsers = tableData.slice(indexOfFirstUser, indexOfLastUser);

    const totalPages = Math.ceil(users.length / usersPerPage);
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
                        addMember={true}
                        selectedColumns={selectedColumns}
                        onColumnToggle={handleColumnToggle}
                        allColumns={allColumns}
                    />
            </div>
        </div>
    );
}
