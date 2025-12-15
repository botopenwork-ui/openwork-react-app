import React, { useEffect, useMemo, useState } from "react";
import JobsTable from "../../components/JobsTable/JobsTable";
import "./DAOMembers.css";
import DetailButton from "../../components/DetailButton/DetailButton";
import { getAllDAOMembers } from "../../services/daoService";
import { formatAddress } from "../../utils/oracleHelpers";

export default function DAOMembers() {
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const membersPerPage = 5;

    // Column configuration
    const allColumns = [
        { id: "memberName", label: "Member Name", required: true },
        { id: "proposalsCreated", label: "Proposals Created", required: false },
        { id: "proposalsVoted", label: "Proposals Voted on", required: false },
        { id: "lastActivity", label: "Last Activity", required: false },
        { id: "walletAddress", label: "Wallet Address", required: false },
        { id: "tokensStaked", label: "Tokens Staked", required: false },
    ];

    // Selected columns state - default to all columns
    const [selectedColumns, setSelectedColumns] = useState([
        "memberName",
        "proposalsCreated",
        "proposalsVoted",
        "lastActivity",
        "walletAddress",
        "tokensStaked"
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

    // Fetch DAO members from both chains
    useEffect(() => {
        async function loadMembers() {
            try {
                setLoading(true);
                const memberData = await getAllDAOMembers();
                setMembers(memberData);
                console.log("DAO members loaded successfully!");
            } catch (error) {
                console.error("Error loading DAO members:", error);
            } finally {
                setLoading(false);
            }
        }
        
        loadMembers();
    }, []);

    const dummyMembers = [
        {
            id: 0,
            name: 'Mollie Hall',
            proposalsCreated: 23,
            proposalsVoted: 23,
            lastActivity: '10 days ago',
            walletAddress: '0912412jg...1sg',
            tokensStaked: 129487
        },
        {
            id: 1,
            name: 'Jollie Hall',
            proposalsCreated: 51,
            proposalsVoted: 51,
            lastActivity: '10 days ago',
            walletAddress: '0912412jg...1sg',
            tokensStaked: 5215555
        },
        {
            id: 2,
            name: 'Mollie Hall',
            proposalsCreated: 2,
            proposalsVoted: 2,
            lastActivity: '10 days ago',
            walletAddress: '0912412jg...1sg',
            tokensStaked: 12511111
        },
        {
            id: 3,
            name: 'Jollie Hall',
            proposalsCreated: 5,
            proposalsVoted: 5,
            lastActivity: '10 days ago',
            walletAddress: '0912412jg...1sg',
            tokensStaked: 52512636
        },
        {
            id: 4,
            name: 'Mollie Hall',
            proposalsCreated: 611,
            proposalsVoted: 611,
            lastActivity: '10 days ago',
            walletAddress: '0912412jg...1sg',
            tokensStaked: 216263626
        }
    ]

    const titleOptions = [
        {
            title: 'DAO View',
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
                'Members',
                'Proposals'
            ]
        }
    ]

    const filterOptions = [
        {
            title: 'Table Columns',
            items: [
                'Member Name',
                'Proposals Created',
                'Proposals Voted on',
                'Last Activity',
                'Wallet Address',
                'Tokens Staked'
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
    ] 

    // Use blockchain data or fallback to dummy
    const displayMembers = members.length > 0 ? members : dummyMembers;

    const tableData = useMemo(() => {
        return displayMembers.map((member) => {
            const isRealData = member.address !== undefined;
            
            // Create all possible column data
            const allColumnData = {
                memberName: (
                    <div className="member-name">
                        <img src="/avatar-profile.png" alt="User Icon" className="userIcon" />
                        <span title={member.address}>
                            {isRealData ? formatAddress(member.address) : member.name}
                        </span>
                    </div>
                ),
                proposalsCreated: (
                    <div className="proposals-created">
                        <span>{isRealData ? "N/A" : member.proposalsCreated}</span>
                    </div>
                ),
                proposalsVoted: (
                    <div className="proposals-voted">
                        <span>{isRealData ? member.governanceActions : member.proposalsVoted}</span>
                    </div>
                ),
                lastActivity: (
                    <div className="last-activity">
                        <span>{isRealData ? member.lastActivity : member.lastActivity}</span>
                    </div>
                ),
                walletAddress: (
                    <div className="wallet-address">
                        <span>{isRealData ? formatAddress(member.address) : member.walletAddress}</span>
                    </div>
                ),
                tokensStaked: (
                    <div className="tokens-staked">
                        <span>
                            {isRealData 
                                ? parseFloat(member.tokensStaked).toLocaleString(undefined, {maximumFractionDigits: 0})
                                : member.tokensStaked.toLocaleString()
                            }
                        </span>
                        <img src="/openwork-token.svg" alt="OW Token" className="tokenIcon" />
                    </div>
                ),
            };

            // Filter based on selected columns
            return selectedColumns.map(columnId => allColumnData[columnId]);
        });
    }, [displayMembers, selectedColumns])

    const indexOfLastMember = currentPage * membersPerPage;
    const indexOfFirstMember = indexOfLastMember - membersPerPage;
    const currentMembers = tableData.slice(indexOfFirstMember, indexOfLastMember);

    const totalPages = Math.ceil(displayMembers.length / membersPerPage);
    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    return (
        <div className="body-container">
            <div className="view-jobs-container">
                    <JobsTable
                        title={`OpenWork Ledger`}
                        backUrl="/governance"
                        tableData={currentMembers}
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={paginate}
                        headers={headers}
                        titleOptions={titleOptions}
                        filterOptions={filterOptions}
                        selectedColumns={selectedColumns}
                        onColumnToggle={handleColumnToggle}
                        allColumns={allColumns}
                        addMember={true}
                    />
            </div>
        </div>
    );
}
