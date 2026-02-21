import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, Link, useParams } from "react-router-dom";
import JobsTable from "../../components/JobsTable/JobsTable";
import "./ProfileJobs.css";
import SkillBox from "../../components/SkillBox/SkillBox";
import DetailButton from "../../components/DetailButton/DetailButton";
import { getInProgressJobs, getUserJobs, fetchJobTitles } from "../../services/jobService";
import { formatAddress } from "../../utils/oracleHelpers";

const OptionItems = [
    'talent1','talent2','talent3',
]

function JobStatus({status}) {
    return (
        <div className={`job-status ${status}`}>
            {status}
        </div>
    )
}

export default function ProfileJobs() {
    const { address } = useParams();
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const jobsPerPage = 5;

    // Column configuration
    const allColumns = [
        { id: "title", label: "Job Title", required: true },
        { id: "from", label: "From", required: false },
        { id: "to", label: "To", required: false },
        { id: "status", label: "Status", required: false },
        { id: "amount", label: "Amount", required: false },
        { id: "actions", label: "", required: true },
    ];

    // Selected columns state
    const [selectedColumns, setSelectedColumns] = useState([
        "title", "from", "to", "status", "amount", "actions"
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

    // Fetch jobs from blockchain (filtered by user if address provided)
    useEffect(() => {
        async function loadJobs() {
            try {
                setLoading(true);
                
                // If address provided, get user-specific jobs; otherwise get all
                const jobData = address 
                    ? await getUserJobs(address)
                    : await getInProgressJobs();
                    
                setJobs(jobData);
                console.log(`Jobs loaded successfully! (${address ? 'user-filtered' : 'all'})`);
                
                // Fetch titles from IPFS in background (progressive enhancement)
                if (jobData.length > 0) {
                    fetchJobTitles(jobData).then(jobsWithTitles => {
                        setJobs(jobsWithTitles);
                        console.log("Job titles updated from IPFS");
                    }).catch(error => {
                        console.error("Error fetching titles:", error);
                    });
                }
            } catch (error) {
                console.error("Error loading jobs:", error);
            } finally {
                setLoading(false);
            }
        }
        
        loadJobs();
    }, [address]);

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
            title: 'Initiated',
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
                'From',
                'To',
                'Status',
                'Amount'
            ]
        },
        {
            title: 'Filter',
            items: [
                'All',
                'Active',
                'Completed'
            ]
        }
    ] 

    // Use blockchain data only
    const displayJobs = jobs;

    const tableData = useMemo(() => {
        return displayJobs.map((job) => {
            const isRealData = job.jobGiver !== undefined;

            // Create all possible column data
            const allColumnData = {
                title: (
                    <div>
                        <img src="/doc.svg" alt="Document Icon" className="docIcon" />
                        <span>{job.title}</span>
                    </div>
                ),
                from: (
                    <div className="job-from">
                        <span title={job.jobGiver}>
                            {isRealData ? formatAddress(job.jobGiver) : job.from}
                        </span>
                        <img src="/arrow-circle-right.svg" alt="" />
                    </div>
                ),
                to: (
                    <div className="skills-required">
                        <span title={job.selectedApplicant}>
                            {isRealData ? formatAddress(job.selectedApplicant) : job.to}
                        </span>
                    </div>
                ),
                status: (
                    <div className="">
                        <JobStatus status={job.status} />
                    </div>
                ),
                amount: (
                    <div className="budget">
                        <span>{job.amount}</span>
                        <img src="/xdc.svg" alt="Budget" />
                    </div>
                ),
                actions: (
                    <div className="view-detail">
                        <DetailButton to={`/view-job-details/${job.id}`} imgSrc="/view.svg" alt="detail" />
                    </div>
                ),
            };

            // Filter based on selected columns
            return selectedColumns.map(columnId => allColumnData[columnId]);
        });
    }, [displayJobs, selectedColumns])

    const indexOfLastJob = currentPage * jobsPerPage;
    const indexOfFirstJob = indexOfLastJob - jobsPerPage;
    const currentJobs = tableData.slice(indexOfFirstJob, indexOfLastJob);

    const totalPages = Math.ceil(displayJobs.length / jobsPerPage);
    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    return (
        <div className="body-container">
            <div className="view-jobs-container">
                    <JobsTable
                        title={"OpenWork Ledger"}
                        tableData={currentJobs}
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
