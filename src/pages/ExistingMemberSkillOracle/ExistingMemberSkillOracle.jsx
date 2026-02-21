import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Web3 from "web3";
import JobsTable from "../../components/JobsTable/JobsTable";
import SkillBox from "../../components/SkillBox/SkillBox";
import DetailButton from "../../components/DetailButton/DetailButton";
import ProgressBar from "../../components/ProgressBar/ProgressBar";

export default function ExistingMemberSkillOracle() {
    const [currentPage, setCurrentPage] = useState(1);
    const usersPerPage = 5; // Number of jobs per page

    const headers = ["Member Name", "Rating", "Skills", "Experience", "Resolution Accuracy", ""];

    const users = [];

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
                'Proposals/Applications'
            ]
        }
    ];

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
            items: [
                'All',
                'Active',
                'Inactive'
            ]
        }
    ];

    const tableData = useMemo(() => {
        if (users.length === 0) {
            return [[
                <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                    No members found in this oracle.
                </div>
            ]];
        }
        return users.map((user) => {
            return [
                <div className="user">
                    <img src="/user.png" alt="User Icon" className="userIcon" />
                    {user.name && <span>{user.name}</span>}
                </div>,
                <div className="rating">
                    <span>{user.rating}</span>
                    <img src="/star.svg" alt="" />
                </div>,
                <div className="skills-required">
                    <SkillBox title={user.skills} />
                    <SkillBox title="+2" />
                </div>,
                <div className="experience">{user.experience + " Years"}</div>,
                <div className="hourly-rate experience-percent">
                    <ProgressBar percent={user.prcent} />
                </div>,
                <div className="view-detail">
                    <DetailButton to={`/profile`} imgSrc="/view.svg" alt="detail" />
                </div>
            ];
        });
    }, [users]);

    // Calculate indices for pagination
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
                    tableData={currentUsers} // Pass only the current page's data
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={paginate}
                    headers={headers}
                    titleOptions={titleOptions}
                    filterOptions={filterOptions}
                    applyNow={true}
                    boxSection={true}
                />
            </div>
        </div>
    );
}
