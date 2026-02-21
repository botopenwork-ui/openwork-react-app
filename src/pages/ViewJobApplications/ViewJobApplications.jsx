import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Web3 from "web3";
import contractABI from "../../ABIs/nowjc_ABI.json";
import genesisABI from "../../ABIs/genesis_ABI.json";
import JobsTable from "../../components/JobsTable/JobsTable";
import "./ViewJobApplications.css";
import StatusButton from "../../components/StatusButton/StatusButton";
import DetailButton from "../../components/DetailButton/DetailButton";

// Mainnet mode detection
const IS_MAINNET = import.meta.env.VITE_NETWORK_MODE === 'mainnet';

// Contracts on Arbitrum (mainnet vs testnet)
const CONTRACT_ADDRESS = IS_MAINNET
    ? "0x8EfbF240240613803B9c9e716d4b5AD1388aFd99"  // Arbitrum Mainnet NOWJC
    : (import.meta.env.VITE_NOWJC_CONTRACT_ADDRESS || "0x9E39B37275854449782F1a2a4524405cE79d6C1e");
const GENESIS_CONTRACT_ADDRESS = IS_MAINNET
    ? "0xE8f7963fF3cE9f7dB129e3f619abd71cBB5Bb294"  // Arbitrum Mainnet Genesis
    : (import.meta.env.VITE_GENESIS_CONTRACT_ADDRESS || "0x1f23683C748fA1AF99B7263dea121eCc5Fe7564C");
const ARBITRUM_RPC = IS_MAINNET
    ? import.meta.env.VITE_ARBITRUM_MAINNET_RPC_URL
    : import.meta.env.VITE_ARBITRUM_SEPOLIA_RPC_URL;

// Multi-gateway IPFS fetch function with timeout
const fetchFromIPFS = async (hash, timeout = 5000) => {
    const gateways = [
        `https://ipfs.io/ipfs/${hash}`,
        `https://gateway.lighthouse.storage/ipfs/${hash}`,
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
                const web3 = new Web3(ARBITRUM_RPC);
                console.log(`🔗 Using ${IS_MAINNET ? 'MAINNET' : 'TESTNET'} - NOWJC: ${CONTRACT_ADDRESS}, Genesis: ${GENESIS_CONTRACT_ADDRESS}`);
                const nowjcContract = new web3.eth.Contract(contractABI, CONTRACT_ADDRESS);
                const genesisContract = new web3.eth.Contract(genesisABI, GENESIS_CONTRACT_ADDRESS);

                // Fetch job data from NOWJC to get job giver and selected application info
                const jobData = await nowjcContract.methods.getJob(jobId).call();
                console.log("🏢 Job data from NOWJC:", jobData);
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

                // Get application count from Genesis contract
                const appCount = await genesisContract.methods.getJobApplicationCount(jobId).call();

                // If no applications, show empty state
                if (appCount == 0) {
                    console.log("No applications found for this job");
                    setApplications([]);
                    setLoading(false);
                    return;
                }

                // Fetch all applications from Genesis (IDs are 1-indexed)
                const applicationPromises = [];
                for (let appId = 1; appId <= appCount; appId++) {
                    applicationPromises.push(
                        genesisContract.methods.getJobApplication(jobId, appId).call()
                            .then(async (appData) => {
                                console.log(`📋 Application ${appId} from Genesis:`, appData);
                                
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

                                // Determine status: Selected if this is the selected application, otherwise In Review
                                const isSelected = jobData.selectedApplicationId && 
                                                 parseInt(jobData.selectedApplicationId) === parseInt(appId);
                                const status = isSelected ? 1 : 0; // 1 = Selected, 0 = In Review

                                return {
                                    id: appId,
                                    applicationId: appId,
                                    jobTitle: jobTitle,
                                    applicant: appData.applicant,
                                    sentTo: jobData.jobGiver,
                                    status: status,
                                    amount: (totalAmount / 1000000).toFixed(2), // Convert from USDC units
                                    applicationDetails,
                                    rawData: appData
                                };
                            })
                            .catch(error => {
                                console.error(`Error fetching application ${appId} from Genesis:`, error);
                                return null;
                            })
                    );
                }

                const resolvedApplications = await Promise.all(applicationPromises);
                const validApplications = resolvedApplications.filter(app => app !== null);
                

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
