import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import JobsTable from "../../components/JobsTable/JobsTable";
import "./ApplicationJobs.css";
import SkillBox from "../../components/SkillBox/SkillBox";
import DetailButton from "../../components/DetailButton/DetailButton";
import { getAllApplications, fetchJobTitles } from "../../services/jobService";
import { formatAddress } from "../../utils/oracleHelpers";

const OptionItems = [
    'talent1','talent2','talent3',
]

function ApplicationStatus({status}) {
    return (
        <div className={`application-status ${status.toLowerCase()}`}>
            {status}
        </div>
    )
}

export default function ApplicationJobs() {
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const jobsPerPage = 5;

    // Column configuration
    const allColumns = [
        { id: "title", label: "Job Title", required: true },
        { id: "applicant", label: "Applicant", required: false },
        { id: "sentTo", label: "Sent To", required: false },
        { id: "status", label: "Status", required: false },
        { id: "amount", label: "Amount", required: false },
        { id: "actions", label: "", required: true },
    ];

    // Selected columns state
    const [selectedColumns, setSelectedColumns] = useState([
        "title", "applicant", "sentTo", "status", "amount", "actions"
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

    // Fetch all applications from blockchain
    useEffect(() => {
        async function loadApplications() {
            try {
                setLoading(true);
                const appData = await getAllApplications();
                setApplications(appData);
                console.log("Applications loaded successfully!");
                
                // Fetch job titles from IPFS in background
                if (appData.length > 0) {
                    fetchJobTitles(appData).then(appsWithTitles => {
                        setApplications(appsWithTitles);
                        console.log("Application job titles updated from IPFS");
                    }).catch(error => {
                        console.error("Error fetching titles:", error);
                    });
                }
            } catch (error) {
                console.error("Error loading applications:", error);
            } finally {
                setLoading(false);
            }
        }
        
        loadApplications();
    }, []);

    const titleOptions = [
        {
            title: 'Jobs View',
            items: [
                'Jobs View',
                'Skill Oracle View',
                'Talent View',
                'DAO View'
            ]
        },
        {
            title: 'Applications',
            items: [
                'Listings',
                'Initiated',
                'Applications'
            ]
        }
    ]

    const filterOptions = [
        {
            title: 'Table Columns',
            items: [
                'Title',
                'Applicant',
                'Sent To',
                'Status',
                'Amount'
            ]
        },
        {
            title: 'Filter',
            items: [
                'All',
                'Pending',
                'Accepted',
                'Rejected'
            ]
        }
    ] 

    // Use blockchain data only
    const displayApplications = applications;

    const tableData = useMemo(() => {
        return displayApplications.map((application) => {
            const isRealData = application.applicant && application.applicant.startsWith('0x');

            // Create all possible column data
            const allColumnData = {
                title: (
                    <div className="application-title-cell">
                        <img src="/doc.svg" alt="Document Icon" className="docIcon" />
                        <span>{application.title}</span>
                    </div>
                ),
                applicant: (
                    <div className="applicant-cell">
                        <span title={application.applicant}>
                            {isRealData ? formatAddress(application.applicant) : application.applicant}
                        </span>
                        <img src="/arrow-circle-right.svg" alt="" />
                    </div>
                ),
                sentTo: (
                    <div className="sent-to-cell">
                        <span title={application.sentTo}>
                            {isRealData ? formatAddress(application.sentTo) : application.sentTo}
                        </span>
                    </div>
                ),
                status: (
                    <div className="status-cell">
                        <ApplicationStatus status={application.status} />
                    </div>
                ),
                amount: (
                    <div className="amount-cell">
                        <span>{application.amount}</span>
                        <img src="/xdc.svg" alt="XDC" />
                    </div>
                ),
                actions: (
                    <div className="view-detail">
                        <DetailButton to={`/view-job-details/${application.jobId || application.id}`} imgSrc="/view.svg" alt="detail" />
                    </div>
                ),
            };

            // Filter based on selected columns
            return selectedColumns.map(columnId => allColumnData[columnId]);
        });
    }, [displayApplications, selectedColumns])

    const indexOfLastApplication = currentPage * jobsPerPage;
    const indexOfFirstApplication = indexOfLastApplication - jobsPerPage;
    const currentApplications = tableData.slice(indexOfFirstApplication, indexOfLastApplication);

    const totalPages = Math.ceil(displayApplications.length / jobsPerPage);
    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    return (
        <div className="body-container">
            <div className="view-jobs-container">
                    <JobsTable
                        title={"OpenWork Ledger"}
                        tableData={currentApplications}
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
