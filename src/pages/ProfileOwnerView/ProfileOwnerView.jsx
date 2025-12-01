import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Web3 from "web3";
import "./ProfileOwnerView.css";
import SkillBox from "../../components/SkillBox/SkillBox";
import DropDown from "../../components/DropDown/DropDown";
import Button from "../../components/Button/Button";
import BlueButton from "../../components/BlueButton/BlueButton";
import Warning from "../../components/Warning/Warning";
import { useWalletConnection } from "../../functions/useWalletConnection";
import ProfileGenesisABI from "../../ABIs/profile-genesis_ABI.json";
import LOWJCABI from "../../ABIs/lowjc_ABI.json";

const COUNTRYITEMS = [
    {
        img: '/AU.svg',
        label: 'Melbourne, Australia'
    },
    {
        img: '/AU.svg',
        label: 'Melbourne, Australia'
    },
    {
        img: '/AU.svg',
        label: 'Melbourne, Australia'
    },
]

const EXPERIENCEITEMS = [
    '4 Years','5 Years','3 Years','3 Years',
]

function ReferInfo() {
    return (
        <div className="profile-item refer-info">
            <div className="refer-info-user">
                <img src="/refer-user.svg" alt="" />
                <span>Referrer Info</span>
            </div>
            <span className="refer-line"/>
            <div className="refer-content">
            Enter the wallet address of the person who referred you to use the OpenWork Platform
            </div>
            <div className="profile-item">
            019824091ijbfouwqf-129874ig
            </div>
            <div className="refer-submit">
                <Button label={'Submit'} buttonCss={'refer-submit-button'}/>
            </div>
        </div>
    )
}


export default function ProfileOwnerView() {
    const { address } = useParams();
    const navigate = useNavigate();
    const { walletAddress } = useWalletConnection();
    const [hasProfile, setHasProfile] = useState(false);
    const [profileLoading, setProfileLoading] = useState(true);
    const [transactionStatus, setTransactionStatus] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    
    // Profile field states - initialize with empty values
    const [username, setUsername] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [description, setDescription] = useState("");
    const [email, setEmail] = useState("");
    const [telegram, setTelegram] = useState("");
    const [phone, setPhone] = useState("");
    const [languages, setLanguages] = useState("");
    const [location, setLocation] = useState("");
    const [profilePhotoHash, setProfilePhotoHash] = useState("");
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    
    // Reference for hidden file input
    const fileInputRef = React.useRef(null);
    
    // Check if the connected wallet is the owner of this profile
    const isOwner = walletAddress && address && 
                    walletAddress.toLowerCase() === address.toLowerCase();

    // Function to upload photo to IPFS
    const uploadPhotoToIPFS = async (file) => {
        try {
            setUploadingPhoto(true);
            const formData = new FormData();
            formData.append("file", file);

            const response = await fetch(
                "https://api.pinata.cloud/pinning/pinFileToIPFS",
                {
                    method: "POST",
                    headers: {
                        'Authorization': `Bearer ${import.meta.env.VITE_PINATA_API_KEY}`
                    },
                    body: formData,
                }
            );

            if (!response.ok) {
                throw new Error("Failed to upload photo to IPFS");
            }

            const data = await response.json();
            console.log("Photo uploaded to IPFS:", data);
            setProfilePhotoHash(data.IpfsHash);
            setUploadingPhoto(false);
            return data.IpfsHash;
        } catch (error) {
            console.error("Error uploading photo to IPFS:", error);
            setUploadingPhoto(false);
            throw error;
        }
    };

    // Handle file selection
    const handlePhotoChange = async (event) => {
        const file = event.target.files?.[0];
        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                alert('Please select an image file');
                return;
            }
            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                alert('Image size should be less than 5MB');
                return;
            }
            try {
                await uploadPhotoToIPFS(file);
            } catch (error) {
                alert('Failed to upload photo. Please try again.');
            }
        }
    };

    // Trigger file input click
    const handleEditPictureClick = () => {
        fileInputRef.current?.click();
    };

    // Function to pin profile data to IPFS
    const pinProfileToIPFS = async (profileData) => {
        try {
            const response = await fetch(
                "https://api.pinata.cloud/pinning/pinJSONToIPFS",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${import.meta.env.VITE_PINATA_API_KEY}`
                    },
                    body: JSON.stringify({
                        pinataContent: profileData,
                        pinataMetadata: {
                            name: `profile-${walletAddress}-${Date.now()}`,
                        },
                    }),
                }
            );

            if (!response.ok) {
                throw new Error("Failed to pin to IPFS");
            }

            const data = await response.json();
            console.log("Profile pinned to IPFS:", data);
            return data;
        } catch (error) {
            console.error("Error pinning profile to IPFS:", error);
            throw error;
        }
    };

    // Function to handle save/create profile
    const handleSaveChanges = async () => {
        if (!walletAddress) {
            alert("Please connect your wallet first");
            return;
        }

        setIsSaving(true);
        setTransactionStatus("Collecting profile data...");

        try {
            // Collect profile data from the form (using state values)
            const profileData = {
                username: username,
                firstName: firstName,
                lastName: lastName,
                skills: SKILLITEMS.map(item => ({
                    title: item.title,
                    verified: item.verified
                })),
                location: location,
                languages: languages,
                experience: EXPERIENCEITEMS[0],
                description: description,
                email: email,
                telegram: telegram,
                phone: phone,
                profilePhotoHash: profilePhotoHash || "", // Include IPFS hash of uploaded photo
                profilePhoto: profilePhotoHash 
                    ? `https://gateway.pinata.cloud/ipfs/${profilePhotoHash}` 
                    : "/user.png"
            };

            // Step 1: Pin to IPFS
            setTransactionStatus("Uploading profile data to IPFS...");
            const ipfsResponse = await pinProfileToIPFS(profileData);
            const ipfsHash = ipfsResponse.IpfsHash;
            console.log("IPFS Hash:", ipfsHash);

            // Step 2: Connect to LOWJC contract on OP Sepolia
            setTransactionStatus("Connecting to blockchain...");
            const web3 = new Web3(window.ethereum);
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            
            const lowjcAddress = import.meta.env.VITE_LOWJC_CONTRACT_ADDRESS;
            const contract = new web3.eth.Contract(LOWJCABI, lowjcAddress);

            // Native options for LayerZero (gas settings)
            const nativeOptions = import.meta.env.VITE_LAYERZERO_OPTIONS_VALUE || "0x000301001101000000000000000000000000000F4240";

            // Step 3: Get LayerZero fee quote
            setTransactionStatus("Getting LayerZero fee quote...");
            const bridgeAddress = await contract.methods.bridge().call();
            
            // Bridge ABI for quoteNativeChain function
            const bridgeABI = [{
                "inputs": [
                    {"type": "bytes", "name": "payload"},
                    {"type": "bytes", "name": "options"}
                ],
                "name": "quoteNativeChain",
                "outputs": [{"type": "uint256", "name": "fee"}],
                "stateMutability": "view",
                "type": "function"
            }];
            
            const bridgeContract = new web3.eth.Contract(bridgeABI, bridgeAddress);
            
            // Encode proper payload based on create vs update
            let payload;
            if (hasProfile) {
                // For updateProfile: encode (functionName, userAddress, ipfsHash)
                payload = web3.eth.abi.encodeParameters(
                    ['string', 'address', 'string'],
                    ['updateProfile', walletAddress, ipfsHash]
                );
            } else {
                // For createProfile: encode (functionName, userAddress, ipfsHash, referrerAddress)
                const referrerAddress = "0x0000000000000000000000000000000000000000";
                payload = web3.eth.abi.encodeParameters(
                    ['string', 'address', 'string', 'address'],
                    ['createProfile', walletAddress, ipfsHash, referrerAddress]
                );
            }
            
            const quotedFee = await bridgeContract.methods.quoteNativeChain(payload, nativeOptions).call();
            
            console.log("💰 LayerZero quoted fee:", web3.utils.fromWei(quotedFee, 'ether'), "ETH");

            // Step 4: Call appropriate contract function with quoted fee
            if (hasProfile) {
                // Update existing profile
                setTransactionStatus("Updating profile on blockchain...");
                await contract.methods
                    .updateProfile(ipfsHash, nativeOptions)
                    .send({ 
                        from: walletAddress,
                        value: quotedFee // Use the quoted fee
                    });
                setTransactionStatus("✅ Profile updated successfully!");
            } else {
                // Create new profile
                setTransactionStatus("Creating profile on blockchain...");
                const referrerAddress = "0x0000000000000000000000000000000000000000"; // Zero address for no referrer
                await contract.methods
                    .createProfile(ipfsHash, referrerAddress, nativeOptions)
                    .send({ 
                        from: walletAddress,
                        value: quotedFee // Use the quoted fee
                    });
                setTransactionStatus("✅ Profile created successfully!");
                setHasProfile(true);
            }

            setTimeout(() => {
                setTransactionStatus("");
                setIsSaving(false);
            }, 3000);

        } catch (error) {
            console.error("Error saving profile:", error);
            setTransactionStatus(`❌ Error: ${error.message}`);
            setTimeout(() => {
                setTransactionStatus("");
                setIsSaving(false);
            }, 5000);
        }
    };

    // Check if profile exists on contract
    useEffect(() => {
        async function checkProfileExists() {
            if (!address) return;
            
            try {
                const web3 = new Web3(import.meta.env.VITE_ARBITRUM_SEPOLIA_RPC_URL);
                const contractAddress = import.meta.env.VITE_PROFILE_GENESIS_ADDRESS;
                const contract = new web3.eth.Contract(ProfileGenesisABI, contractAddress);
                
                const profileExists = await contract.methods.hasProfile(address).call();
                setHasProfile(profileExists);
            } catch (error) {
                console.error("Error checking profile existence:", error);
                setHasProfile(false);
            } finally {
                setProfileLoading(false);
            }
        }
        
        checkProfileExists();
    }, [address]);

    // Fetch profile data from blockchain and IPFS
    useEffect(() => {
        async function fetchProfileData() {
            if (!address || !hasProfile) return;
            
            try {
                console.log("Fetching profile data for:", address);
                
                // Get profile from ProfileGenesis contract on Arbitrum Sepolia
                const web3 = new Web3(import.meta.env.VITE_ARBITRUM_SEPOLIA_RPC_URL);
                const contractAddress = import.meta.env.VITE_PROFILE_GENESIS_ADDRESS;
                const contract = new web3.eth.Contract(ProfileGenesisABI, contractAddress);
                
                const profile = await contract.methods.getProfile(address).call();
                const ipfsHash = profile.ipfsHash;
                
                console.log("Profile IPFS hash:", ipfsHash);
                
                if (!ipfsHash || ipfsHash === "") {
                    console.log("No IPFS hash found for profile");
                    return;
                }
                
                // Fetch profile data from IPFS
                const response = await fetch(`https://gateway.pinata.cloud/ipfs/${ipfsHash}`);
                if (!response.ok) {
                    throw new Error("Failed to fetch profile data from IPFS");
                }
                
                const profileData = await response.json();
                console.log("Fetched profile data:", profileData);
                
                // Update all state variables with fetched data
                if (profileData.username) setUsername(profileData.username);
                if (profileData.firstName) setFirstName(profileData.firstName);
                if (profileData.lastName) setLastName(profileData.lastName);
                if (profileData.description) setDescription(profileData.description);
                if (profileData.email) setEmail(profileData.email);
                if (profileData.telegram) setTelegram(profileData.telegram);
                if (profileData.phone) setPhone(profileData.phone);
                if (profileData.languages) setLanguages(profileData.languages);
                if (profileData.location) setLocation(profileData.location);
                if (profileData.profilePhotoHash) setProfilePhotoHash(profileData.profilePhotoHash);
                
            } catch (error) {
                console.error("Error fetching profile data:", error);
            }
        }
        
        fetchProfileData();
    }, [address, hasProfile]);
  
    const handleCopyToClipboard = (addr) => {
      navigator.clipboard
        .writeText(addr)
        .then(() => {
          alert("Address copied to clipboard");
        })
        .catch((err) => {
          console.error("Failed to copy: ", err);
        });
    };

    function goSkillVerification() {
        navigate(`/skill-verification/${address}`);
    }
  
    function formatWalletAddress(addr) {
      if (!addr) return "";
      const start = addr.substring(0, 6);
      const end = addr.substring(addr.length - 4);
      return `${start}....${end}`;
    }

    const SKILLITEMS = [
        {
            title: 'UX Design',
            verified: true
        },
        {
            title: 'UI Design',
            verified: false
        },
        {
            title: 'Webflow',
            verified: false
        }
    ]

    return (
        <>
            <div className="newTitle">
                <div className="titleTop">
                <div className="goBack" onClick={() => navigate(`/profile`)} style={{ cursor: 'pointer' }}>
                    <img className="goBackImage" src="/back.svg" alt="Back Button" />
                </div>
                <div className="titleText">{username || "Loading..."}</div>
                </div>
                <div className="titleBottom"><p>  Wallet ID:{" "}
                {formatWalletAddress(address)}
                </p><img src="/copy.svg" className="copyImage" onClick={() =>
                        handleCopyToClipboard(address)
                    }
                    /></div>
            </div>
            <div className="form-containerDC" style={{marginTop: '0px'}}>
                <div className="form-container-release">
                    <div className="sectionTitle">
                        <span>About</span>
                    </div>
                    <div className="release-payment-body profile-owner-body">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoChange}
                            style={{ display: 'none' }}
                        />
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '24px'
                        }}>
                            <div style={{
                                width: '80px',
                                height: '80px',
                                minWidth: '80px',
                                minHeight: '80px',
                                maxWidth: '80px',
                                maxHeight: '80px',
                                position: 'relative',
                                overflow: 'hidden',
                                borderRadius: '50%',
                                flexShrink: 0
                            }}>
                                <img 
                                    src={profilePhotoHash 
                                        ? `https://gateway.pinata.cloud/ipfs/${profilePhotoHash}` 
                                        : "/user.png"
                                    } 
                                    alt="Profile"
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                        opacity: uploadingPhoto ? 0.5 : 1,
                                        transition: 'opacity 0.3s',
                                        display: 'block'
                                    }}
                                />
                                {uploadingPhoto && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '50%',
                                        left: '50%',
                                        transform: 'translate(-50%, -50%)',
                                        color: '#fff',
                                        fontSize: '14px',
                                        fontWeight: 'bold'
                                    }}>
                                        Uploading...
                                    </div>
                                )}
                            </div>
                            {isOwner && (
                                <Button 
                                    label={uploadingPhoto ? "Uploading..." : "Edit picture"} 
                                    icon={'/edit_picture.svg'} 
                                    buttonCss={'edit_picture'}
                                    onClick={handleEditPictureClick}
                                    disabled={uploadingPhoto}
                                />
                            )}
                        </div>
                        <div className="profile-item">
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                readOnly={!isOwner}
                                style={{
                                    border: 'none',
                                    background: 'transparent',
                                    width: '100%',
                                    outline: 'none',
                                    cursor: isOwner ? 'text' : 'default'
                                }}
                            />
                        </div>
                        <div className="profile-name">
                            <div className="profile-item">
                                <input
                                    type="text"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    readOnly={!isOwner}
                                    placeholder="First Name"
                                    style={{
                                        border: 'none',
                                        background: 'transparent',
                                        width: '100%',
                                        outline: 'none',
                                        cursor: isOwner ? 'text' : 'default'
                                    }}
                                />
                            </div>
                            <div className="profile-item">
                                <input
                                    type="text"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    readOnly={!isOwner}
                                    placeholder="Last Name"
                                    style={{
                                        border: 'none',
                                        background: 'transparent',
                                        width: '100%',
                                        outline: 'none',
                                        cursor: isOwner ? 'text' : 'default'
                                    }}
                                />
                            </div>
                        </div>
                        <div className="profile-skill-box">
                            <div className="profile-skill">
                                {SKILLITEMS.map((item, index) => (
                                    <SkillBox key={index} title={item.title} verified={item.verified} />
                                ))}
                            </div>
                        </div>
                        <div className="profile-item">
                            <input
                                type="text"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                readOnly={!isOwner}
                                placeholder="Location"
                                style={{
                                    border: 'none',
                                    background: 'transparent',
                                    width: '100%',
                                    outline: 'none',
                                    cursor: isOwner ? 'text' : 'default'
                                }}
                            />
                        </div>
                        <div className="profile-item">
                            <input
                                type="text"
                                value={languages}
                                onChange={(e) => setLanguages(e.target.value)}
                                readOnly={!isOwner}
                                placeholder="Languages"
                                style={{
                                    border: 'none',
                                    background: 'transparent',
                                    width: '100%',
                                    outline: 'none',
                                    cursor: isOwner ? 'text' : 'default'
                                }}
                            />
                        </div>
                        <DropDown label={EXPERIENCEITEMS[0]} options={EXPERIENCEITEMS} customCSS={'form-dropdown profile-dropdown'} disabled={!isOwner}/>
                        <div className="profile-item profile-description">
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                readOnly={!isOwner}
                                placeholder="Description"
                                style={{
                                    border: 'none',
                                    background: 'transparent',
                                    width: '100%',
                                    outline: 'none',
                                    resize: 'vertical',
                                    minHeight: '100px',
                                    cursor: isOwner ? 'text' : 'default',
                                    fontFamily: 'inherit',
                                    fontSize: 'inherit',
                                    lineHeight: 'inherit'
                                }}
                            />
                        </div>
                        <div className="profile-item">
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                readOnly={!isOwner}
                                placeholder="Email"
                                style={{
                                    border: 'none',
                                    background: 'transparent',
                                    width: '100%',
                                    outline: 'none',
                                    cursor: isOwner ? 'text' : 'default'
                                }}
                            />
                        </div>
                        <div className="profile-item">
                            <input
                                type="text"
                                value={telegram}
                                onChange={(e) => setTelegram(e.target.value)}
                                readOnly={!isOwner}
                                placeholder="Telegram"
                                style={{
                                    border: 'none',
                                    background: 'transparent',
                                    width: '100%',
                                    outline: 'none',
                                    cursor: isOwner ? 'text' : 'default'
                                }}
                            />
                        </div>
                        <div className="profile-item">
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                readOnly={!isOwner}
                                placeholder="Phone"
                                style={{
                                    border: 'none',
                                    background: 'transparent',
                                    width: '100%',
                                    outline: 'none',
                                    cursor: isOwner ? 'text' : 'default'
                                }}
                            />
                        </div>
                        {/* <ReferInfo/> */}
                        {transactionStatus && (
                            <div className="warning-form">
                                <Warning content={transactionStatus} />
                            </div>
                        )}
                        {isOwner && !profileLoading && (
                            <div className="form-groupDC" style={{display:'flex', alignItems:'center', gap:'16px'}}>
                                <Button label='Get Skills Verified' buttonCss={'verified-button'} onClick={goSkillVerification}/>
                                <BlueButton 
                                    label={isSaving ? 'Processing...' : (hasProfile ? 'Save Changes' : 'Create Profile')} 
                                    onClick={handleSaveChanges}
                                    disabled={isSaving}
                                    style={{
                                        width: '-webkit-fill-available', 
                                        justifyContent:'center', 
                                        padding: '12px 16px',
                                        opacity: isSaving ? 0.6 : 1,
                                        cursor: isSaving ? 'not-allowed' : 'pointer'
                                    }}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    )
}
