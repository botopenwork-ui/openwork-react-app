import React, { useEffect, useMemo, useState } from "react";
import JobsTable from "../../components/JobsTable/JobsTable";
import "../SkillOracleDisputes/SkillOracleDisputes.css";
import DetailButton from "../../components/DetailButton/DetailButton";
import { formatAddress } from "../../utils/oracleHelpers";
import Web3 from "web3";
import genesisABI from "../../ABIs/genesis_ABI.json";
import { getNativeChain } from "../../config/chainConfig";
import { useWalletConnection } from "../../functions/useWalletConnection";

export default function SkillOracleApplications() {
    const { walletAddress } = useWalletConnection();
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const appsPerPage = 5;

    // Column configuration - reuse dispute table structure
    const allColumns = [
        { id: "title", label: "Oracle / Applicant", required: true },
        { id: "proposedBy", label: "Applicant", required: false },
        { id: "status", label: "Status", required: false },
        { id: "voteSubmissions", label: "Vote Progress", required: false },
        { id: "amount", label: "Fee", required: false },
        { id: "actions", label: "", required: true },
    ];

    const [selectedColumns, setSelectedColumns] = useState([
        "title", "proposedBy", "status", "voteSubmissions", "amount", "actions"
    ]);

    const headers = selectedColumns.map(colId => {
        const column = allColumns.find(col => col.id === colId);
        return column ? column.label : "";
    });

    const handleColumnToggle = (columnId) => {
        setSelectedColumns(prev => {
            const isCurrentlySelected = prev.includes(columnId);
            const column = allColumns.find(col => col.id === columnId);
            if (column?.required) return prev;
            if (isCurrentlySelected) {
                if (prev.length <= 3) return prev;
                return prev.filter(id => id !== columnId);
            } else {
                if (prev.length >= 6) return prev;
                const allColumnIds = allColumns.map(col => col.id);
                return allColumnIds.filter(id => prev.includes(id) || id === columnId);
            }
        });
    };

    // Fetch skill verification applications from Genesis on Arbitrum
    useEffect(() => {
        async function loadApplications() {
            try {
                setLoading(true);
                setError(null);

                const nativeChain = getNativeChain();
                if (!nativeChain) throw new Error("Native chain not configured");

                const web3 = new Web3(nativeChain.rpcUrl);
                const genesisContract = new web3.eth.Contract(genesisABI, nativeChain.contracts.genesis);

                const appCounter = await genesisContract.methods.applicationCounter().call();
                const counter = parseInt(appCounter);
                const apps = [];

                // Fetch all applications (scan backwards, max 100)
                const scanStart = Math.max(0, counter - 100);
                for (let i = counter; i >= scanStart; i--) {
                    try {
                        const app = await genesisContract.methods.getSkillApplication(i).call();
                        if (app.applicant && app.applicant !== "0x0000000000000000000000000000000000000000") {
                            const totalVotes = parseInt(app.votesFor) + parseInt(app.votesAgainst);
                            const votePercent = totalVotes > 0
                                ? Math.round((parseInt(app.votesFor) / totalVotes) * 100)
                                : 0;

                            let color = "#FFA500"; // orange = pending
                            if (app.isFinalized) {
                                color = app.result ? "#00C853" : "#F44336"; // green/red
                            } else if (app.isVotingActive) {
                                color = votePercent >= 75 ? "#00C853" : votePercent >= 50 ? "#FFA500" : "#F44336";
                            }

                            apps.push({
                                id: String(i),
                                title: app.targetOracleName || "Unknown Oracle",
                                proposedBy: app.applicant,
                                status: app.isFinalized
                                    ? (app.result ? "Approved" : "Rejected")
                                    : (app.isVotingActive ? "Voting" : "Pending"),
                                voteSubmissions: votePercent,
                                amount: (parseInt(app.feeAmount) / 1000000).toFixed(2),
                                color,
                            });
                        }
                    } catch (e) {
                        // Application may not exist at this index
                    }
                }

                setApplications(apps);
            } catch (err) {
                console.error("Error loading skill verification applications:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        loadApplications();
    }, []);

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
            title: 'Applications',
            items: [
                'Oracles',
                'Members',
                'Disputes',
                'Applications',
                'Ask Athena',
            ]
        }
    ];

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
                'Voting',
                'Approved',
                'Rejected',
                'Pending'
            ]
        }
    ];

    const [selectedFilter, setSelectedFilter] = useState('All');

    const filteredApplications = useMemo(() => {
        if (selectedFilter === 'All') return applications;
        return applications.filter(app => app.status === selectedFilter);
    }, [applications, selectedFilter]);

    const tableData = useMemo(() => {
        return filteredApplications.map((app) => {
            const allColumnData = {
                title: (
                    <div className="dispute-title">
                        <img src="/file-05.svg" alt="File Icon" className="fileIcon" />
                        <span>{app.title}</span>
                    </div>
                ),
                proposedBy: (
                    <div className="proposed-by">
                        <span title={app.proposedBy}>
                            {formatAddress(app.proposedBy)}
                        </span>
                    </div>
                ),
                status: (
                    <div className="dispute-role">
                        <span>{app.status}</span>
                    </div>
                ),
                voteSubmissions: (
                    <div className="vote-progress">
                        <div className="progress-bar-container">
                            <div
                                className="progress-bar-fill"
                                style={{
                                    width: `${app.voteSubmissions}%`,
                                    backgroundColor: app.color
                                }}
                            />
                        </div>
                        <span className="vote-percentage">{app.voteSubmissions}%</span>
                    </div>
                ),
                amount: (
                    <div className="dispute-amount">
                        <span>{app.amount}</span>
                        <img src="/usdc.svg" alt="USDC" className="currencyIcon" />
                    </div>
                ),
                actions: (
                    <div className="view-detail">
                        <DetailButton to={`/skill-verification-application/${app.id}`} title={'View'} imgSrc="/view.svg" alt="view"/>
                    </div>
                ),
            };

            return selectedColumns.map(columnId => allColumnData[columnId]);
        });
    }, [filteredApplications, selectedColumns]);

    const indexOfLast = currentPage * appsPerPage;
    const indexOfFirst = indexOfLast - appsPerPage;
    const currentApps = tableData.slice(indexOfFirst, indexOfLast);

    const totalPages = Math.ceil(filteredApplications.length / appsPerPage);
    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    return (
        <div className="body-container">
            <div className="view-jobs-container">
                <JobsTable
                    title={`OpenWork Ledger`}
                    backUrl="/governance"
                    tableData={currentApps}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={paginate}
                    headers={headers}
                    titleOptions={titleOptions}
                    filterOptions={filterOptions}
                    applyNow={true}
                    applyNowUrl={walletAddress ? `/skill-verification/${walletAddress}` : '/connect-wallet'}
                    selectedColumns={selectedColumns}
                    onColumnToggle={handleColumnToggle}
                    allColumns={allColumns}
                    selectedFilter={selectedFilter}
                    onFilterChange={setSelectedFilter}
                />
            </div>
        </div>
    );
}
