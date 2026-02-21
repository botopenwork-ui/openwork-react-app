import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import Web3 from "web3";
import "./ProfileOwnerView.css";
import SkillBox from "../../components/SkillBox/SkillBox";
import DropDown from "../../components/DropDown/DropDown";
import Button from "../../components/Button/Button";
import BlueButton from "../../components/BlueButton/BlueButton";
import Warning from "../../components/Warning/Warning";
import ProfileGenesisABI from "../../ABIs/profile-genesis_ABI.json";
import { useChainDetection, useWalletAddress } from "../../hooks/useChainDetection";
import { getLOWJCContract } from "../../services/localChainService";
import { getNativeChain, isMainnet } from "../../config/chainConfig";
import CrossChainStatus, { buildLZSteps } from "../../components/CrossChainStatus/CrossChainStatus";
import { monitorLZMessage, STATUS } from "../../utils/crossChainMonitor";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

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
    const [searchParams] = useSearchParams();

    // Get referrer from URL params (from referral link)
    const referrerFromUrl = searchParams.get('ref');

    // Multi-chain hooks
    const { chainId, chainConfig, isAllowed, error: chainError } = useChainDetection();
    const { address: walletAddress, connect: connectWallet } = useWalletAddress();

    const [hasProfile, setHasProfile] = useState(false);
    const [profileLoading, setProfileLoading] = useState(true);
    const [transactionStatus, setTransactionStatus] = useState("");
    const [crossChainSteps, setCrossChainSteps] = useState(null);
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
    const [skills, setSkills] = useState([]);
    const [skillInput, setSkillInput] = useState("");

    // Referrer address state - initialize from URL param if available
    const [referrerAddress, setReferrerAddress] = useState(referrerFromUrl || "");
    
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
                `${BACKEND_URL}/api/ipfs/upload-file`,
                {
                    method: "POST",
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
                `${BACKEND_URL}/api/ipfs/upload-json`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
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
            setTransactionStatus("❌ Please connect your wallet first");
            return;
        }
        
        if (!isAllowed) {
            setTransactionStatus(chainConfig?.reason || "Transactions not allowed on this network. Please switch to OP Sepolia or Ethereum Sepolia.");
            return;
        }

        setIsSaving(true);
        setTransactionStatus("Collecting profile data...");

        try {
            // Collect profile data from the form
            const profileData = {
                username: username,
                firstName: firstName,
                lastName: lastName,
                skills: skills.map(item => ({
                    title: item.title,
                    verified: item.verified || false
                })),
                location: location,
                languages: languages,
                experience: EXPERIENCEITEMS[0],
                description: description,
                email: email,
                telegram: telegram,
                phone: phone,
                profilePhotoHash: profilePhotoHash || "",
                profilePhoto: profilePhotoHash 
                    ? `https://gateway.lighthouse.storage/ipfs/${profilePhotoHash}` 
                    : "/default-avatar.svg",
                createdFromChain: chainConfig?.name,
                createdFromChainId: chainId
            };

            // Step 1: Pin to IPFS
            setTransactionStatus("📤 Uploading profile data to IPFS...");
            const ipfsResponse = await pinProfileToIPFS(profileData);
            const ipfsHash = ipfsResponse.IpfsHash;

            // Step 2: Get contract for current chain
            setTransactionStatus(`Connecting to ${chainConfig.name}...`);
            const web3 = new Web3(window.ethereum);
            const lowjcContract = await getLOWJCContract(chainId);
            const lzOptions = chainConfig?.layerzero?.options;

            if (!lzOptions) {
                throw new Error("LayerZero options not configured for this chain");
            }

            // Step 3: Get LayerZero fee quote
            setTransactionStatus(`💰 Getting LayerZero fee quote on ${chainConfig.name}...`);
            const bridgeAddress = await lowjcContract.methods.bridge().call();
            console.log("Bridge address:", bridgeAddress);

            const bridgeABI = [{
                "inputs": [
                    {"name": "_payload", "type": "bytes"},
                    {"name": "_options", "type": "bytes"}
                ],
                "name": "quoteNativeChain",
                "outputs": [{"name": "fee", "type": "uint256"}],
                "stateMutability": "view",
                "type": "function"
            }];

            const bridgeContract = new web3.eth.Contract(bridgeABI, bridgeAddress);

            // Encode payload
            let payload;
            // Use referrer from URL param/state, or zero address if not provided
            const referrerForProfile = referrerAddress && web3.utils.isAddress(referrerAddress)
                ? referrerAddress
                : "0x0000000000000000000000000000000000000000";

            if (hasProfile) {
                payload = web3.eth.abi.encodeParameters(
                    ['string', 'address', 'string'],
                    ['updateProfile', walletAddress, ipfsHash]
                );
            } else {
                payload = web3.eth.abi.encodeParameters(
                    ['string', 'address', 'string', 'address'],
                    ['createProfile', walletAddress, ipfsHash, referrerForProfile]
                );
            }

            console.log("Payload:", payload);
            console.log("LZ Options:", lzOptions);

            const quotedFee = await bridgeContract.methods.quoteNativeChain(payload, lzOptions).call();
            // Add 20% buffer to LZ fee (matching release/direct contract pattern)
            const feeWithBuffer = (BigInt(quotedFee) * BigInt(120) / BigInt(100)).toString();
            console.log(`💰 LayerZero fee: ${web3.utils.fromWei(quotedFee.toString(), 'ether')} ETH (with 20% buffer: ${web3.utils.fromWei(feeWithBuffer, 'ether')} ETH)`);

            // Get gas price for EIP-1559 pricing (low priority fee to reduce displayed cost)
            const gasPrice = await web3.eth.getGasPrice();

            // Step 4: Call contract function
            if (hasProfile) {
                setTransactionStatus(`Updating profile on ${chainConfig.name}...`);
                await lowjcContract.methods
                    .updateProfile(ipfsHash, lzOptions)
                    .send({
                        from: walletAddress,
                        value: feeWithBuffer,
                        gas: 500000,
                        maxPriorityFeePerGas: web3.utils.toWei('0.001', 'gwei'),
                        maxFeePerGas: gasPrice
                    });
                setTransactionStatus(`✅ Profile updated on ${chainConfig.name}!`);
                const srcTx = receipt.transactionHash;
                const lzLink = `https://layerzeroscan.com/tx/${srcTx}`;
                setCrossChainSteps(buildLZSteps({ sourceTxHash: srcTx, sourceChainId: chainConfig?.chainId, lzStatus: 'active', lzLink }));
                monitorLZMessage(srcTx, (u) => setCrossChainSteps(buildLZSteps({ sourceTxHash: srcTx, sourceChainId: chainConfig?.chainId, lzStatus: u.status === STATUS.SUCCESS ? 'delivered' : u.status === STATUS.FAILED ? 'failed' : 'active', lzLink: u.lzLink || lzLink, dstTxHash: u.dstTxHash, dstChainId: 42161 })));
            } else {
                setTransactionStatus(`Creating profile on ${chainConfig.name}...`);
                console.log("Creating profile with referrer:", referrerForProfile);
                await lowjcContract.methods
                    .createProfile(ipfsHash, referrerForProfile, lzOptions)
                    .send({
                        from: walletAddress,
                        value: feeWithBuffer,
                        gas: 500000,
                        maxPriorityFeePerGas: web3.utils.toWei('0.001', 'gwei'),
                        maxFeePerGas: gasPrice
                    });
                setTransactionStatus(`✅ Profile created on ${chainConfig.name}!`);
                const srcTx = receipt.transactionHash;
                const lzLink = `https://layerzeroscan.com/tx/${srcTx}`;
                setCrossChainSteps(buildLZSteps({ sourceTxHash: srcTx, sourceChainId: chainConfig?.chainId, lzStatus: 'active', lzLink }));
                monitorLZMessage(srcTx, (u) => setCrossChainSteps(buildLZSteps({ sourceTxHash: srcTx, sourceChainId: chainConfig?.chainId, lzStatus: u.status === STATUS.SUCCESS ? 'delivered' : u.status === STATUS.FAILED ? 'failed' : 'active', lzLink: u.lzLink || lzLink, dstTxHash: u.dstTxHash, dstChainId: 42161 })));
                setHasProfile(true);
            }

            setTimeout(() => {
                setTransactionStatus("");
                setIsSaving(false);
            }, 3000);

        } catch (error) {
            console.error("Error saving profile:", error);
            
            let errorMessage = error.message;
            if (error.code === 4001) {
                errorMessage = "Transaction cancelled by user";
            } else if (error.message?.includes("insufficient funds")) {
                errorMessage = "Insufficient ETH for gas fees";
            }
            
            setTransactionStatus(`❌ ${errorMessage}`);
            setTimeout(() => {
                setIsSaving(false);
            }, 5000);
        }
    };

    // Check if profile exists on contract
    useEffect(() => {
        async function checkProfileExists() {
            if (!address) return;

            try {
                const nativeChain = getNativeChain();
                const rpcUrl = isMainnet()
                    ? import.meta.env.VITE_ARBITRUM_MAINNET_RPC_URL
                    : import.meta.env.VITE_ARBITRUM_SEPOLIA_RPC_URL;
                const web3 = new Web3(rpcUrl);
                const contractAddress = nativeChain?.contracts?.profileGenesis;
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
                
                // Get profile from ProfileGenesis contract on Arbitrum
                const nativeChain = getNativeChain();
                const rpcUrl = isMainnet()
                    ? import.meta.env.VITE_ARBITRUM_MAINNET_RPC_URL
                    : import.meta.env.VITE_ARBITRUM_SEPOLIA_RPC_URL;
                const web3 = new Web3(rpcUrl);
                const contractAddress = nativeChain?.contracts?.profileGenesis;
                const contract = new web3.eth.Contract(ProfileGenesisABI, contractAddress);
                
                const profile = await contract.methods.getProfile(address).call();
                const ipfsHash = profile.ipfsHash;
                
                console.log("Profile IPFS hash:", ipfsHash);
                
                if (!ipfsHash || ipfsHash === "") {
                    console.log("No IPFS hash found for profile");
                    return;
                }
                
                // Fetch profile data from IPFS
                const response = await fetch(`https://gateway.lighthouse.storage/ipfs/${ipfsHash}`);
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
                if (profileData.skills && Array.isArray(profileData.skills)) {
                    setSkills(profileData.skills);
                }
                
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

    const handleAddSkill = () => {
        const trimmed = skillInput.trim();
        if (trimmed && !skills.some(s => s.title.toLowerCase() === trimmed.toLowerCase())) {
            setSkills([...skills, { title: trimmed, verified: false }]);
            setSkillInput("");
        }
    };

    const handleRemoveSkill = (index) => {
        setSkills(skills.filter((_, i) => i !== index));
    };

    return (
        <>
            <div className="newTitle">
                <div className="titleTop">
                <div className="goBack" onClick={() => navigate(`/profile`)} style={{ cursor: 'pointer' }}>
                    <img className="goBackImage" src="/back.svg" alt="Back Button" />
                </div>
                <div className="titleText">{username || `${firstName} ${lastName}`.trim() || formatWalletAddress(address)}</div>
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
                                        ? `https://gateway.lighthouse.storage/ipfs/${profilePhotoHash}` 
                                        : "/default-avatar.svg"
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
                                {skills.map((item, index) => (
                                    <div key={index} style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                                        <SkillBox title={item.title} verified={item.verified} />
                                        {isOwner && (
                                            <span
                                                onClick={() => handleRemoveSkill(index)}
                                                style={{ cursor: 'pointer', color: '#999', fontSize: '14px', lineHeight: '1' }}
                                            >×</span>
                                        )}
                                    </div>
                                ))}
                                {isOwner && (
                                    <input
                                        type="text"
                                        value={skillInput}
                                        onChange={(e) => setSkillInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleAddSkill();
                                            } else if (e.key === 'Backspace' && skillInput === '' && skills.length > 0) {
                                                e.preventDefault();
                                                handleRemoveSkill(skills.length - 1);
                                            }
                                        }}
                                        placeholder="Add skill (Enter to add)"
                                        style={{
                                            border: 'none',
                                            background: 'transparent',
                                            outline: 'none',
                                            fontSize: '12px',
                                            minWidth: '120px',
                                            flex: '1'
                                        }}
                                    />
                                )}
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
                        {/* Referrer Address - only show when creating new profile */}
                        {isOwner && !hasProfile && (
                            <div className="profile-item refer-info">
                                <div className="refer-info-user">
                                    <img src="/refer-user.svg" alt="" />
                                    <span>Referrer Info</span>
                                </div>
                                <span className="refer-line"/>
                                <div className="refer-content">
                                    {referrerFromUrl
                                        ? "Referrer address from your referral link:"
                                        : "Enter the wallet address of the person who referred you to OpenWork (optional):"
                                    }
                                </div>
                                <div className="profile-item">
                                    <input
                                        type="text"
                                        value={referrerAddress}
                                        onChange={(e) => setReferrerAddress(e.target.value)}
                                        placeholder="0x..."
                                        style={{
                                            border: 'none',
                                            background: 'transparent',
                                            width: '100%',
                                            outline: 'none',
                                            fontFamily: 'monospace',
                                            fontSize: '12px'
                                        }}
                                    />
                                </div>
                                {referrerAddress && (
                                    <Warning
                                        content={`Referrer will earn 1% from your platform activities`}
                                        icon="/info.svg"
                                    />
                                )}
                            </div>
                        )}
                        {chainError && (
                            <div className="warning-form">
                                <Warning content={chainError} icon="/triangle_warning.svg" />
                            </div>
                        )}
                        {!isAllowed && chainConfig?.reason && (
                            <div className="warning-form">
                                <Warning content={chainConfig.reason} icon="/triangle_warning.svg" />
                            </div>
                        )}
                        {chainConfig && isAllowed && (
                            <div className="warning-form">
                                <Warning content={`Connected to ${chainConfig.name}`} icon="/info.svg" />
                            </div>
                        )}
                        {transactionStatus && (
                            <div className="warning-form">
                                <Warning content={transactionStatus} />
                            </div>
                        )}
                        {crossChainSteps && (
                            <CrossChainStatus title="Profile sync status" steps={crossChainSteps} />
                        )}
                        {isOwner && !profileLoading && (
                            <div className="form-groupDC" style={{display:'flex', alignItems:'center', gap:'16px'}}>
                                <Button label='Get Skills Verified' buttonCss={'verified-button'} onClick={goSkillVerification}/>
                                <BlueButton 
                                    label={isSaving ? 'Processing...' : (hasProfile ? 'Save Changes' : 'Create Profile')} 
                                    onClick={handleSaveChanges}
                                    disabled={isSaving || !isAllowed}
                                    style={{
                                        width: '-webkit-fill-available', 
                                        justifyContent:'center', 
                                        padding: '12px 16px',
                                        opacity: (isSaving || !isAllowed) ? 0.6 : 1,
                                        cursor: (isSaving || !isAllowed) ? 'not-allowed' : 'pointer'
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
