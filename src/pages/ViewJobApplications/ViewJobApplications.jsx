import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Web3 from "web3";
import contractABI from "../../ABIs/nowjc_ABI.json";
import JobsTable from "../../components/JobsTable/JobsTable";
import "./ViewJobApplications.css";
import StatusButton from "../../components/StatusButton/StatusButton";
import DetailButton from "../../components/DetailButton/DetailButton";

// NOWJC Contract on Arbitrum Sepolia
const CONTRACT_ADDRESS = import.meta.env.VITE_NOWJC_CONTRACT_ADDRESS || "0x9E39B37275854449782F1a2a4524405cE79d6C1e";
const ARBITRUM_SEPOLIA_RPC = import.meta.env.VITE_ARBITRUM_SEPOLIA_RPC_URL;

// Multi-gateway IPFS fetch function with timeout
const fetchFromIPFS = async (hash, timeout = 5000) => {
    const gateways = [
        `https://ipfs.io/ipfs/${hash}`,
        `https://gateway.pinata.cloud/ipfs/${hash}`,
        `https://cloudflare-ipfs.com/ipfs/${hash}`,
        `https://dweb.link/ipfs/${hash}`
    ];

    const fetchWithTimeout = (url, timeout) => {
        return Promise.race([
            fetch(url),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout')), timeout)
            )
        ]);
    };

    for (const gateway of gateways) {
        try {
            const response = await fetchWithTimeout(gateway, timeout);
            if (response.ok) {
                const data = await response.json();
                return data;
            }
        } catch (error) {
            console.warn(`Failed to fetch from ${gateway}:`, error.message);
            continue;
        }
    }
    
    throw new Error(`Failed to fetch ${hash} from all gateways`);
};

export default function ViewJobApplications() {
    const { jobId } = useParams();
    const [applications, setApplications] = useState([]);
    const [job, setJob] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const applicationsPerPage = 5;
    const [loading, setLoading] = useState(true);

    const headers = [
        "Job Title",
        "Applicant", 
        "Sent To",
        "Status",
        "Amount",
        "",
    ];

    const titleOptions = [
        {
            title: "Jobs View",
            items: ["view1", "view2"],
        },
        {
            title: "Applications",
            items: ["all", "pending", "accepted", "rejected"],
        },
    ];

    const filterOptions = [
        {
            title: "Listings",
            items: ["all applications", "recent applications"],
        },
        {
            title: "Table Columns",
            items: ["default view", "compact view"],
        },
    ];

    // Initialize Web3 and fetch data
    useEffect(() => {
        const fetchApplicationsData = async () => {
            if (!jobId) {
                console.error("No jobId provided");
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                const web3 = new Web3(ARBITRUM_SEPOLIA_RPC);
                const contract = new web3.eth.Contract(contractABI, CONTRACT_ADDRESS);

                // Fetch job data first
                const jobData = await contract.methods.getJob(jobId).call();
                console.log("🏢 Job data from NOWJC (Arbitrum):", jobData);
                setJob(jobData);

                // Get job title from IPFS if available
                let jobTitle = `Job ${jobId}`;
                if (jobData.jobDetailHash) {
                    try {
                        const jobDetails = await fetchFromIPFS(jobData.jobDetailHash);
                        jobTitle = jobDetails.title || jobTitle;
                    } catch (error) {
                        console.warn("Failed to fetch job details from IPFS:", error);
                    }
                }

                // Debug: Log job data structure to understand how to fetch applications
                console.log("🔍 NOWJC Job data structure:", jobData);
                console.log("🔍 Selected applicant:", jobData.selectedApplicant);
                console.log("🔍 Selected application ID:", jobData.selectedApplicationId);
                console.log("🔍 Job applicants array:", jobData.applicants);
                console.log("🔍 Number of applicants:", jobData.applicants?.length || 0);

                // Fetch all applications for this job
                const applicationPromises = [];
                
                // Use the applicants array from job data
                const applicantAddresses = jobData.applicants || [];
                console.log("📋 Known applicants from job data:", applicantAddresses.length);
                
                // If no applicants in the job data, show empty state
                if (applicantAddresses.length === 0) {
                    console.log("No applicants found for this job");
                    setApplications([]);
                    setLoading(false);
                    return;
                }
                
                // Try sequential application IDs (1 to 100) and match against known applicants
                // We'll stop early once we've found applications for all known applicants
                const maxApplicationId = 100;
                const foundApplicants = new Set();
                
                for (let appId = 1; appId <= maxApplicationId && foundApplicants.size < applicantAddresses.length; appId++) {
                    applicationPromises.push(
                        contract.methods.getApplication(jobId, appId).call()
                            .then(async (appData) => {
                                // Check if this applicant is in our known applicants list
                                const applicantLower = appData.applicant?.toLowerCase();
                                const isKnownApplicant = applicantAddresses.some(
                                    addr => addr.toLowerCase() === applicantLower
                                );
                                
                                if (!isKnownApplicant) {
                                    console.log(`📋 Application ${appId} - Applicant not in known list, skipping`);
                                    return null;
                                }
                                
                                console.log(`📋 Application ${appId} data from NOWJC:`, appData);
                                console.log(`🔍 Available fields:`, Object.keys(appData));
                                console.log(`📊 Status field:`, appData.status, typeof appData.status);
                                
                                // Track that we found this applicant
                                foundApplicants.add(applicantLower);
                                
                                let applicationDetails = null;

                                // Fetch application details from IPFS
                                if (appData.applicationHash) {
                                    try {
                                        applicationDetails = await fetchFromIPFS(appData.applicationHash);
                                    } catch (error) {
                                        console.warn(`Failed to fetch application ${appId} details from IPFS:`, error);
                                    }
                                }

                                // Calculate total amount from proposed milestones
                                let totalAmount = 0;
                                if (appData.proposedMilestones && appData.proposedMilestones.length > 0) {
                                    totalAmount = appData.proposedMilestones.reduce((sum, milestone) => {
                                        return sum + parseFloat(milestone.amount);
                                    }, 0);
                                }

                                return {
                                    id: appId,
                                    applicationId: appId,
                                    jobTitle: jobTitle,
                                    applicant: appData.applicant,
                                    sentTo: jobData.jobGiver,
                                    status: appData.status,
                                    amount: (totalAmount / 1000000).toFixed(2), // Convert from USDC units
                                    applicationDetails,
                                    rawData: appData
                                };
                            })
                            .catch(error => {
                                // Silently ignore errors for non-existent application IDs
                                if (!error.message.includes("Application does not exist")) {
                                    console.error(`Error fetching application ${appId}:`, error.message);
                                }
                                return null;
                            })
                    );
                }

                const resolvedApplications = await Promise.all(applicationPromises);
                const validApplications = resolvedApplications.filter(app => app !== null);
                
                console.log(`✅ Found ${validApplications.length} valid applications out of ${applicantAddresses.length} known applicants`);

                setApplications(validApplications);
            } catch (error) {
                console.error("Error fetching applications data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchApplicationsData();
    }, [jobId]);

    // Helper function to format wallet addresses
    const formatWalletAddress = (address) => {
        if (!address) return "Unknown";
        return `${address.substring(0, 6)}...${address.substring(38)}`;
    };

    // Helper function to get status display
    const getStatusDisplay = (status) => {
        console.log("🔍 Application status value:", status, "type:", typeof status);
        switch (parseInt(status)) {
            case 0: return { text: "In Review", css: "pending-status" };
            case 1: return { text: "Selected", css: "accepted-status" };
            case 2: return { text: "Rejected", css: "rejected-status" };
            default: 
                console.warn("Unknown status value:", status);
                return { text: "In Review", css: "pending-status" };
        }
    };

    // Transform applications data for table display
    const tableData = useMemo(() => {
        return applications.map((application) => {
            const statusInfo = getStatusDisplay(application.status);

            return [
                <div className="job-title-container">
                    <img
                        src="/doc.svg"
                        alt="Document Icon"
                        className="docIcon"
                    />
                    <span
                        className="job-title-text"
                        title={application.jobTitle}
                    >
                        {application.jobTitle}
                    </span>
                </div>,
                <div title={application.applicant}>
                    {formatWalletAddress(application.applicant)}
                </div>,
                <div title={application.sentTo}>
                    {formatWalletAddress(application.sentTo)}
                </div>,
                <div className="status-column">
                    <StatusButton status={statusInfo.text} statusCss={statusInfo.css} />
                </div>,
                <div className="budget">
                    <span>{application.amount}</span>
                    <img src="/xdc.svg" alt="Budget" />
                </div>,
                <div className="view-detail">
                    <DetailButton
                        to={`/view-received-application?jobId=${jobId}&applicationId=${application.applicationId}`}
                        imgSrc="/view.svg"
                        alt="detail"
                    />
                </div>,
            ];
        });
    }, [applications, jobId]);

    const indexOfLastApplication = currentPage * applicationsPerPage;
    const indexOfFirstApplication = indexOfLastApplication - applicationsPerPage;
    const currentApplications = tableData.slice(indexOfFirstApplication, indexOfLastApplication);

    const totalPages = Math.ceil(applications.length / applicationsPerPage);
    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    if (loading) {
        return (
            <div className="loading-containerT">
                <div className="loading-icon">
                    <img src="/OWIcon.svg" alt="Loading..." />
                </div>
                <div className="loading-message">
                    <h1 id="txText">Loading Applications...</h1>
                    <p id="txSubtext">
                        Fetching application data from the blockchain. Please wait...
                    </p>
                </div>
            </div>
        );
    }

    if (!loading && applications.length === 0) {
        return (
            <div className="body-container">
                <div className="view-jobs-container">
                    <JobsTable
                        title={`Applications for Job ${jobId}`}
                        tableData={[]}
                        currentPage={1}
                        totalPages={1}
                        onPageChange={() => {}}
                        headers={headers}
                        titleOptions={titleOptions}
                        filterOptions={filterOptions}
                        backUrl={`/job-deep-view/${jobId}`}
                        applyNow={true}
                        applyJobId={jobId}
                    />
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            alignItems: "center",
                            height: "200px",
                            fontSize: "16px",
                            color: "#666",
                            marginTop: "20px",
                        }}
                    >
                        <p>No applications found for this job.</p>
                        <Link
                            to={`/job-deep-view/${jobId}`}
                            style={{
                                marginTop: "15px",
                                color: "#007bff",
                                textDecoration: "none",
                                fontWeight: "500",
                            }}
                        >
                            Back to Job Details
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="body-container">
            <div className="view-jobs-container">
                <JobsTable
                    title={`Applications for Job ID: ${jobId}`}
                    tableData={currentApplications}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={paginate}
                    headers={headers}
                    titleOptions={titleOptions}
                    filterOptions={filterOptions}
                    backUrl={`/job-deep-view/${jobId}`}
                    applyNow={true}
                    applyJobId={jobId}
                />
            </div>
        </div>
    );
}
