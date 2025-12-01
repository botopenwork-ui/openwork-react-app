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

    const headers = ["Job Title", "Applicant", "Sent To", "Status", "Amount", ""];

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

    const dummyApplications = [
        {
            id: 0,
            title: 'UI for OpenWork',
            applicant: 'Mollie Hall',
            sentTo: '0xDEAF...fB8B',
            status: 'Pending',
            amount: '7624.14'
        },
        {
            id: 1,
            title: 'React WebApp Development',
            applicant: 'John Smith',
            sentTo: '0xDEAF...fB8B',
            status: 'Accepted',
            amount: '24.14'
        },
        {
            id: 2,
            title: 'UI Design Package',
            applicant: 'Sarah Johnson',
            sentTo: 'Mollie Hall',
            status: 'Rejected',
            amount: '762'
        },
        {
            id: 3,
            title: 'UI for OpenWork',
            applicant: 'Mike Davis',
            sentTo: '0xDEAF...fB8B',
            status: 'Pending',
            amount: '762'
        },
        {
            id: 4,
            title: 'Backend Development',
            applicant: 'Alice Brown',
            sentTo: 'Mollie Hall',
            status: 'Accepted',
            amount: '1250'
        },
        {
            id: 5,
            title: 'Mobile App Design',
            applicant: 'Tom Wilson',
            sentTo: '0xDEAF...fB8B',
            status: 'Pending',
            amount: '890'
        },
        {
            id: 6,
            title: 'Smart Contract Audit',
            applicant: 'Emma Garcia',
            sentTo: 'Mollie Hall',
            status: 'Rejected',
            amount: '2500'
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

    // Use blockchain data or fallback to dummy
    const displayApplications = applications.length > 0 ? applications : dummyApplications;

    const tableData = useMemo(() => {
        return displayApplications.map((application) => {
            const isRealData = application.applicant && application.applicant.startsWith('0x');
            
            return [
                <div className="application-title-cell">
                    <img src="/doc.svg" alt="Document Icon" className="docIcon" />
                    <span>{application.title}</span>
                </div>,
                <div className="applicant-cell">
                    <span title={application.applicant}>
                        {isRealData ? formatAddress(application.applicant) : application.applicant}
                    </span>
                </div>,
                <div className="sent-to-cell">
                    <span title={application.sentTo}>
                        {isRealData ? formatAddress(application.sentTo) : application.sentTo}
                    </span>
                    <img src="/arrow-circle-right.svg" alt="" />
                </div>,
                <div className="status-cell">
                    <ApplicationStatus status={application.status} />
                </div>,
                <div className="amount-cell">
                    <span>{application.amount}</span>
                    <img src="/xdc.svg" alt="XDC" />
                </div>,
                <div className="view-detail">
                    <DetailButton to={`/view-job-details/${application.jobId || application.id}`} imgSrc="/view.svg" alt="detail"  />
                </div>
            ];
        });
    }, [displayApplications])

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
                    />
            </div>
        </div>
    );
}
