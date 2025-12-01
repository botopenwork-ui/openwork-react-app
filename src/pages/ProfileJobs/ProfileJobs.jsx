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

    const headers = ["Job Title", "From", "To", "Status", "Amount", ""];

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

    const dummyJobs = [
        {
            id: 0,
            title: 'UI for OpenWork',
            from: 'Me',
            to: 'Mllie Hall',
            status: 'Disputed',
            amount: '7624.14'
        },
        {
            id: 1,
            title: 'UI for OpenWork',
            from: 'Me',
            to: 'Mllie Hall',
            status: 'Ongoing',
            amount: '24.14'
        },
        {
            id: 2,
            title: 'UI for OpenWork',
            from: 'Mllie Hall',
            to: 'Me',
            status: 'Disputed',
            amount: '762'
        },
        {
            id: 2,
            title: 'UI for OpenWork',
            from: 'Me',
            to: 'Mllie Hall',
            status: 'Complete',
            amount: '762'
        },
        {
            id: 2,
            title: 'UI for OpenWork',
            from: 'Mllie Hall',
            to: 'Me',
            status: 'Ongoing',
            amount: '762'
        },
        {
            id: 2,
            title: 'UI for OpenWork',
            from: 'Mllie Hall',
            to: 'Me',
            status: 'Disputed',
            amount: '762'
        },
        {
            id: 2,
            title: 'UI for OpenWork',
            from: 'Me',
            to: 'Mllie Hall',
            status: 'Disputed',
            amount: '762'
        },
    ]

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

    // Use blockchain data or fallback to dummy
    const displayJobs = jobs.length > 0 ? jobs : dummyJobs;

    const tableData = useMemo(() => {
        return displayJobs.map((job) => {
            const isRealData = job.jobGiver !== undefined;
            
            return [
                <div>
                    <img src="/doc.svg" alt="Document Icon" className="docIcon" />
                    <span>{isRealData ? job.title : job.title}</span>
                </div>,
                <div className="job-from">
                    <span title={job.jobGiver}>
                        {isRealData ? formatAddress(job.jobGiver) : job.from}
                    </span>
                    <img src="/arrow-circle-right.svg" alt="" />
                </div>,
                <div className="skills-required">
                    <span title={job.selectedApplicant}>
                        {isRealData ? formatAddress(job.selectedApplicant) : job.to}
                    </span>
                </div>,
                <div className="">
                    <JobStatus status={isRealData ? job.status : job.status} />
                </div>,
                <div className="budget">
                    <span>{job.amount}</span>
                    <img src="/xdc.svg" alt="Budget" />
                </div>,
                <div className="view-detail">
                    <DetailButton to={`/view-job-details/${job.id}`} imgSrc="/view.svg" alt="detail"  />
                </div>
            ];
        });
    }, [displayJobs])

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
                    />
            </div>
        </div>
    );
}
