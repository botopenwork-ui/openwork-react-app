import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Web3 from "web3";
import contractABI from "../../ABIs/genesis_ABI.json";
import JobsTable from "../../components/JobsTable/JobsTable";
import "./BrowseJobs.css";
import SkillBox from "../../components/SkillBox/SkillBox";
import DetailButton from "../../components/DetailButton/DetailButton";

const CONTRACT_ADDRESS = import.meta.env.VITE_GENESIS_CONTRACT_ADDRESS;
const ARBITRUM_SEPOLIA_RPC = import.meta.env.VITE_ARBITRUM_SEPOLIA_RPC_URL;

// IPFS cache with 1-hour TTL
const ipfsCache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// Multi-gateway IPFS fetch function with caching
const fetchFromIPFS = async (hash, timeout = 5000) => {
    // Check cache first
    const cached = ipfsCache.get(hash);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
        console.log(`✅ Using cached IPFS data for ${hash}`);
        return cached.data;
    }

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
                // Cache the result
                ipfsCache.set(hash, {
                    data,
                    timestamp: Date.now()
                });
                console.log(`📦 Cached IPFS data for ${hash}`);
                return data;
            }
        } catch (error) {
            console.warn(`Failed to fetch from ${gateway}:`, error.message);
            continue;
        }
    }
    
    throw new Error(`Failed to fetch ${hash} from all gateways`);
};

export default function BrowseJobs() {
    const [jobs, setJobs] = useState([]);
    const [account, setAccount] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const jobsPerPage = 5;
    const [walletAddress, setWalletAddress] = useState("");
    const [loading, setLoading] = useState(true);
    const [web3, setWeb3] = useState(null);
    const [contract, setContract] = useState(null);
    const hasFetchedRef = React.useRef(false);
    const navigate = useNavigate();

    // Column configuration
    const allColumns = [
        { id: "title", label: "Job Title", required: true },
        { id: "postedBy", label: "Posted by", required: false },
        { id: "skills", label: "Skills Required", required: false },
        { id: "timeline", label: "Timeline", required: false },
        { id: "budget", label: "Budget", required: false },
        { id: "status", label: "Job Status", required: false },
        { id: "applicants", label: "Applicants", required: false },
        { id: "milestones", label: "Milestones", required: false },
        { id: "actions", label: "", required: true },
    ];

    // Selected columns state - default to first 6 columns
    const [selectedColumns, setSelectedColumns] = useState([
        "title",
        "postedBy", 
        "skills",
        "timeline",
        "budget",
        "actions"
    ]);

    // Generate headers based on selected columns
    const headers = selectedColumns.map(colId => {
        const column = allColumns.find(col => col.id === colId);
        return column ? column.label : "";
    });

    const titleOptions = [
        {
            title: "Jobs View",
            items: [
                "Jobs View",
                "Skill Oracle View", 
                "Talent View",
                "DAO View"
            ],
        },
        {
            title: "Listings",
            items: [
                "Listings",
                "Initiated",
                "Applications"
            ],
        },
    ];

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

    const filterOptions = [
        {
            title: "Table Columns",
            items: [
                "Title",
                "Posted by",
                "Budget",
                "Deadline",
                "Status"
            ],
        },
        {
            title: "Filter",
            items: [
                "All",
                "Active",
                "Completed"
            ],
        },
    ];

    // Initialize Web3 and contract
    useEffect(() => {
        const initWeb3 = async () => {
            try {
                const web3Instance = new Web3(ARBITRUM_SEPOLIA_RPC);
                const contractInstance = new web3Instance.eth.Contract(
                    contractABI,
                    CONTRACT_ADDRESS,
                );

                setWeb3(web3Instance);
                setContract(contractInstance);
            } catch (error) {
                console.error("Error initializing Web3:", error);
                setLoading(false);
            }
        };

        initWeb3();
    }, []);

    // Fetch job data from contract
    useEffect(() => {
        const fetchJobs = async () => {
            if (!contract) return;
            
            // Prevent duplicate fetches
            if (hasFetchedRef.current) {
                return;
            }
            hasFetchedRef.current = true;

            try {
                setLoading(true);

                // Get all job IDs
                const jobIds = await contract.methods.getAllJobIds().call();
                console.log("🔍 BrowseJobs Debug - Job IDs:", jobIds);
                console.log("🔍 BrowseJobs Debug - Contract Address:", CONTRACT_ADDRESS);
                console.log("🔍 BrowseJobs Debug - RPC:", ARBITRUM_SEPOLIA_RPC);

                if (jobIds.length === 0) {
                    console.log("❌ No job IDs found");
                    setJobs([]);
                    setLoading(false);
                    return;
                }

                // Fetch detailed data for each job
                const jobPromises = jobIds.map(async (jobId) => {
                    try {
                        const jobData = await contract.methods
                            .getJob(jobId)
                            .call();

                        // Fetch job poster profile
                        let posterProfile = null;
                        try {
                            posterProfile = await contract.methods
                                .getProfile(jobData.jobGiver)
                                .call();
                        } catch (profileError) {
                            console.warn(
                                `Profile not found for ${jobData.jobGiver}:`,
                                profileError,
                            );
                        }

                        // Fetch and parse IPFS data for job details with multi-gateway support
                        let jobDetails = null;
                        try {
                            if (jobData.jobDetailHash) {
                                jobDetails = await fetchFromIPFS(jobData.jobDetailHash);
                            }
                        } catch (ipfsError) {
                            console.warn(
                                `Failed to fetch IPFS data for job ${jobId}:`,
                                ipfsError,
                            );
                        }

                        // Calculate total budget from milestones
                        const totalBudget = jobData.milestonePayments.reduce(
                            (sum, milestone) => {
                                return sum + parseFloat(milestone.amount);
                            },
                            0,
                        );

                        // Format budget (assuming USDT with 6 decimals)
                        const formattedBudget = (totalBudget / 1000000).toFixed(
                            2,
                        );

                        // Extract poster name (truncate address if no profile)
                        let posterName =
                            jobData.jobGiver.slice(0, 6) +
                            "..." +
                            jobData.jobGiver.slice(-4);
                        if (posterProfile && posterProfile.ipfsHash) {
                            try {
                                const profileData = await fetchFromIPFS(posterProfile.ipfsHash);
                                if (profileData) {
                                    posterName = profileData.name || posterName;
                                }
                            } catch (profileError) {
                                console.warn(
                                    "Failed to fetch profile IPFS data:",
                                    profileError,
                                );
                            }
                        }

                        // Extract skills and timeline from job details
                        const skills = jobDetails?.skills || ["General"];
                        const timeline = jobDetails?.timeline || "TBD";

                        return {
                            id: jobId,
                            title: jobDetails?.title || "Untitled Job",
                            postedBy: posterName,
                            jobGiver: jobData.jobGiver,
                            skills: Array.isArray(skills) ? skills : [skills],
                            timeline: timeline,
                            budget: formattedBudget,
                            status: jobData.status,
                            milestoneCount: jobData.milestonePayments.length,
                            applicantCount: jobData.applicants.length,
                            rawJobData: jobData,
                            jobDetails: jobDetails,
                        };
                    } catch (jobError) {
                        console.error(`Error fetching job ${jobId}:`, jobError);
                        return null;
                    }
                });

                const resolvedJobs = await Promise.all(jobPromises);
                const validJobs = resolvedJobs.filter((job) => 
                    job !== null && job.title && job.title !== "Untitled Job"
                );

                // Sort by newest first (assuming job IDs are sequential)
                validJobs.sort((a, b) => b.id.localeCompare(a.id));

                setJobs(validJobs);
            } catch (error) {
                console.error("Error fetching jobs:", error);
                hasFetchedRef.current = false; // Allow retry on error
            } finally {
                setLoading(false);
            }
        };

        if (contract && !hasFetchedRef.current) {
            fetchJobs();
        }
    }, [contract]);

    // Transform job data for table display
    const tableData = useMemo(() => {
        // Status mapping
        const statusLabels = {
            0: "Open",
            1: "In Progress",
            2: "Completed",
            3: "Cancelled",
            4: "Disputed"
        };

        return jobs.map((job) => {
            const primarySkill =
                job.skills && job.skills.length > 0 ? job.skills[0] : "General";
            const additionalSkillsCount =
                job.skills && job.skills.length > 1 ? job.skills.length - 1 : 0;

            // Create all possible column data
            const allColumnData = {
                title: (
                    <div
                        style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: "8px",
                        }}
                    >
                        <img
                            src="/doc.svg"
                            alt="Document Icon"
                            className="docIcon"
                            style={{ marginTop: "2px", flexShrink: 0 }}
                        />
                        {job.title && (
                            <span
                                style={{
                                    lineHeight: "1.4",
                                    wordBreak: "break-word",
                                    hyphens: "auto",
                                    maxWidth: "200px",
                                    display: "-webkit-box",
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: "vertical",
                                    overflow: "hidden",
                                }}
                                title={job.title}
                            >
                                {job.title}
                            </span>
                        )}
                    </div>
                ),
                postedBy: <div title={job.jobGiver}>{job.postedBy}</div>,
                skills: (
                    <div className="skills-required">
                        <SkillBox title={primarySkill} />
                        {additionalSkillsCount > 0 && (
                            <SkillBox title={`+${additionalSkillsCount}`} />
                        )}
                    </div>
                ),
                timeline: (
                    <div>
                        {typeof job.timeline === "string"
                            ? job.timeline
                            : `${job.timeline} Weeks`}
                    </div>
                ),
                budget: (
                    <div className="budget">
                        <span>{job.budget}</span>
                        <img src="/xdc.svg" alt="Budget" />
                    </div>
                ),
                status: <div>{statusLabels[job.status] || "Unknown"}</div>,
                applicants: <div>{job.applicantCount}</div>,
                milestones: <div>{job.milestoneCount}</div>,
                actions: (
                    <div className="view-detail">
                        <DetailButton
                            to={`/job-details/${job.id}`}
                            imgSrc="/view.svg"
                            alt="detail"
                        />
                    </div>
                ),
            };

            // Filter based on selected columns
            return selectedColumns.map(columnId => allColumnData[columnId]);
        });
    }, [jobs, selectedColumns]);

    const indexOfLastJob = currentPage * jobsPerPage;
    const indexOfFirstJob = indexOfLastJob - jobsPerPage;
    const currentJobs = tableData.slice(indexOfFirstJob, indexOfLastJob);

    const totalPages = Math.ceil(jobs.length / jobsPerPage);
    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    if (loading) {
        return (
            <div className="loading-containerT">
                <div className="loading-icon">
                    <img src="/OWIcon.svg" alt="Loading..." />
                </div>
                <div className="loading-message">
                    <h1 id="txText">Loading Jobs...</h1>
                    <p id="txSubtext">
                        Fetching job data from the blockchain. Please wait...
                    </p>
                </div>
            </div>
        );
    }

    if (!loading && jobs.length === 0) {
        return (
            <div className="body-container">
                <div className="view-jobs-container">
                    <JobsTable
                        title={"OpenWork Ledger"}
                        tableData={[]}
                        currentPage={1}
                        totalPages={1}
                        onPageChange={() => {}}
                        headers={headers}
                        titleOptions={titleOptions}
                        filterOptions={filterOptions}
                        selectedColumns={selectedColumns}
                        onColumnToggle={handleColumnToggle}
                        allColumns={allColumns}
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
                        <p>No jobs found on the blockchain.</p>
                        <Link
                            to="/post-job"
                            style={{
                                marginTop: "15px",
                                color: "#007bff",
                                textDecoration: "none",
                                fontWeight: "500",
                            }}
                        >
                            Be the first to post a job!
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
