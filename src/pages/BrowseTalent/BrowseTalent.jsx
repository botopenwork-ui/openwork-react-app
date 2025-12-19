import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Web3 from "web3";
import ProfileGenesisABI from "../../ABIs/profile-genesis_ABI.json";
import JobsTable from "../../components/JobsTable/JobsTable";
import "./BrowseTalent.css";
import SkillBox from "../../components/SkillBox/SkillBox";
import DetailButton from "../../components/DetailButton/DetailButton";

export default function BrowseTalent() {
    const [profiles, setProfiles] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const usersPerPage = 5;
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Column configuration
    const allColumns = [
        { id: "name", label: "Name", required: true },
        { id: "rating", label: "Rating", required: false },
        { id: "skills", label: "Skills", required: false },
        { id: "experience", label: "Experience", required: false },
        { id: "hourlyRate", label: "Hourly Rate", required: false },
        { id: "actions", label: "", required: true },
    ];

    // Selected columns state
    const [selectedColumns, setSelectedColumns] = useState([
        "name", "rating", "skills", "experience", "hourlyRate", "actions"
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

    // Fetch all profiles from blockchain
    useEffect(() => {
        // Helper function to fetch with timeout
        const fetchWithTimeout = (url, timeout = 5000) => {
            return Promise.race([
                fetch(url),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('IPFS fetch timeout')), timeout)
                )
            ]);
        };

        async function fetchAllProfiles() {
            try {
                setLoading(true);
                setError(null);
                
                const web3 = new Web3(import.meta.env.VITE_ARBITRUM_SEPOLIA_RPC_URL);
                const contractAddress = "0xC37A9dFbb57837F74725AAbEe068f07A1155c394";
                const contract = new web3.eth.Contract(ProfileGenesisABI, contractAddress);
                
                console.log("Fetching all profile addresses...");
                
                // Use the new getAllProfileAddresses() method - instant!
                const userAddresses = await contract.methods.getAllProfileAddresses().call();
                console.log(`Found ${userAddresses.length} profiles`);
                
                // Fetch profile data for each user
                const profilePromises = userAddresses.map(async (address, index) => {
                    try {
                        console.log(`[${index + 1}/${userAddresses.length}] Fetching profile for ${address}...`);
                        
                        const profile = await contract.methods.getProfile(address).call();
                        const ipfsHash = profile.ipfsHash;
                        
                        if (!ipfsHash || ipfsHash === "") {
                            console.warn(`[${index + 1}/${userAddresses.length}] No IPFS hash for ${address}`);
                            return null;
                        }
                        
                        console.log(`[${index + 1}/${userAddresses.length}] Fetching IPFS data: ${ipfsHash}`);
                        
                        // Fetch profile data from IPFS with timeout
                        const response = await fetchWithTimeout(
                            `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
                            8000 // 8 second timeout
                        );
                        
                        if (!response.ok) {
                            console.warn(`[${index + 1}/${userAddresses.length}] Failed to fetch IPFS (${response.status}) for ${address}`);
                            return null;
                        }
                        
                        const profileData = await response.json();
                        console.log(`[${index + 1}/${userAddresses.length}] ✅ Successfully loaded profile for ${address}`);
                        
                        // Get user ratings
                        let averageRating = 0;
                        try {
                            const ratings = await contract.methods.getUserRatings(address).call();
                            if (ratings.length > 0) {
                                const sum = ratings.reduce((acc, rating) => acc + Number(rating), 0);
                                averageRating = (sum / ratings.length / 10).toFixed(1); // Assuming ratings are out of 50, convert to 5
                            }
                        } catch (err) {
                            console.warn(`Could not fetch ratings for ${address}:`, err);
                        }
                        
                        return {
                            address: address,
                            name: `${profileData.firstName || ''} ${profileData.lastName || ''}`.trim() || profileData.username || 'Anonymous',
                            rating: averageRating || '0.0',
                            skills: profileData.skills || [],
                            experience: profileData.experience || 'N/A',
                            location: profileData.location || '',
                            profilePhoto: profileData.profilePhotoHash 
                                ? `https://gateway.pinata.cloud/ipfs/${profileData.profilePhotoHash}`
                                : '/user.png',
                            hourlyRate: '30' // TODO: Add hourly rate to profile data
                        };
                    } catch (err) {
                        console.error(`Error fetching profile for ${address}:`, err);
                        return null;
                    }
                });
                
                const fetchedProfiles = await Promise.all(profilePromises);
                const validProfiles = fetchedProfiles.filter(p => p !== null);
                
                console.log(`Successfully fetched ${validProfiles.length} profiles`);
                setProfiles(validProfiles);
                
            } catch (err) {
                console.error("Error fetching profiles:", err);
                setError("Failed to load profiles. Please try again later.");
            } finally {
                setLoading(false);
            }
        }
        
        fetchAllProfiles();
    }, []);

    const users = profiles.length > 0 ? profiles : [
        {
            id: 0,
            name: 'Mollie Hall',
            rating: '4.9',
            skills: 'UX Design',
            experience: '4',
            hourly_rate: '30'
        },
        {
            id: 1,
            name: 'Mollie Hall',
            rating: '4.9',
            skills: 'UX Design',
            experience: '4',
            hourly_rate: '30'
        },
        {
            id: 0,
            name: 'Mollie Hall',
            rating: '4.9',
            skills: 'UX Design',
            experience: '4',
            hourly_rate: '30'
        },
        {
            id: 0,
            name: 'Mollie Hall',
            rating: '4.9',
            skills: 'UX Design',
            experience: '4',
            hourly_rate: '30'
        },
        {
            id: 0,
            name: 'Mollie Hall',
            rating: '4.9',
            skills: 'UX Design',
            experience: '4',
            hourly_rate: '30'
        },
        {
            id: 0,
            name: 'Mollie Hall',
            rating: '4.9',
            skills: 'UX Design',
            experience: '4',
            hourly_rate: '30'
        },
        {
            id: 0,
            name: 'Mollie Hall',
            rating: '4.9',
            skills: 'UX Design',
            experience: '4',
            hourly_rate: '30'
        },
    ]

    const titleOptions = [
        {
            title: 'Talent View',
            items: [
                'Jobs View',
                'Skill Oracle View',
                'Talent View',
                'DAO View'
            ]
        },
        {
            title: 'People',
            items: [
                'People'
                // 'Packages' // Hidden
            ]
        }
    ]

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
                'Top Rated',
                'Available Now'
            ]
        }
    ] 

    const tableData = useMemo(() => {
        if (loading) {
            return [[
                <div colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>
                    Loading profiles from blockchain...
                </div>
            ]];
        }
        
        if (error) {
            return [[
                <div colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#ff4444' }}>
                    {error}
                </div>
            ]];
        }
        
        if (users.length === 0) {
            return [[
                <div colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>
                    No profiles found. Be the first to create one!
                </div>
            ]];
        }
        
        return users.map((user) => {
            // Handle both new profile structure and old dummy data structure
            const displayName = user.name || 'Anonymous';
            const displayRating = user.rating || '0.0';
            const displaySkills = Array.isArray(user.skills) ? user.skills : [user.skills || 'N/A'];
            const displayExperience = user.experience || 'N/A';
            const displayRate = user.hourlyRate || user.hourly_rate || '30';
            const profilePhoto = user.profilePhoto || '/user.png';
            const userAddress = user.address || '';

            // Create all possible column data
            const allColumnData = {
                name: (
                    <div className="user">
                        <img
                            src={profilePhoto}
                            alt="User Icon"
                            className="userIcon"
                            style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                objectFit: 'cover'
                            }}
                        />
                        <span>{displayName}</span>
                    </div>
                ),
                rating: (
                    <div className="rating">
                        <span>{displayRating}</span>
                        <img src="/star.svg" alt="" />
                    </div>
                ),
                skills: (
                    <div className="skills-required">
                        {displaySkills.slice(0, 1).map((skill, idx) => (
                            <SkillBox
                                key={idx}
                                title={typeof skill === 'string' ? skill : skill.title || 'N/A'}
                            />
                        ))}
                        {displaySkills.length > 1 && (
                            <SkillBox title={`+${displaySkills.length - 1}`}/>
                        )}
                    </div>
                ),
                experience: (
                    <div className="experience">
                        {typeof displayExperience === 'string'
                            ? displayExperience
                            : `${displayExperience} Years`}
                    </div>
                ),
                hourlyRate: (
                    <div className="hourly-rate">
                        <span>{displayRate} / Hr</span>
                        <img src="/xdc.svg" alt="Budget" />
                    </div>
                ),
                actions: (
                    <div className="view-detail">
                        <DetailButton
                            to={userAddress ? `/profile/${userAddress}` : `/profile`}
                            imgSrc="/view.svg"
                            alt="detail"
                            title="Profile"
                        />
                    </div>
                ),
            };

            // Filter based on selected columns
            return selectedColumns.map(columnId => allColumnData[columnId]);
        });
    }, [users, loading, error, selectedColumns])

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
                        tableData={currentUsers}
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
