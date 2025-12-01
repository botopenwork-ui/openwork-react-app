import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Web3 from "web3";
import MenuItem from "../../components/MenuItem";

// Importing custom hooks and utility functions to modularize the logic for better separation of concerns
import { useWalletConnection } from "../../functions/useWalletConnection";
import { useDropdown } from "../../functions/useDropdown"; // Manages dropdown visibility and toggling
import { useHoverEffect } from "../../functions/useHoverEffect"; // Manages hover states for radial buttons
import { useMobileDetection } from "../../functions/useMobileDetection"; // Detects if the user is on a mobile device
import { useButtonHover } from "../../functions/useButtonHover"; // Custom hook for handling button hover events
import ProfileGenesisABI from "../../ABIs/profile-genesis_ABI.json";

import './Profile.css';

export default function Profile() {
    // Get address from URL params
    const { address } = useParams();

    // State for profile data
    const [profilePhotoHash, setProfilePhotoHash] = useState("");

    // Using the useWalletConnection hook to handle wallet-related state and logic
    const { walletAddress, connectWallet, disconnectWallet } =
      useWalletConnection();
    
    // Use address from URL or fallback to connected wallet
    const displayAddress = address || walletAddress;
  
    // Using the useDropdown hook to manage dropdown visibility state
    const { dropdownVisible, toggleDropdown } = useDropdown();
  
    // Using the useHoverEffect hook to manage the button hover effects
    const {
      hovering,
      setHovering,
      buttonsVisible,
      setButtonsVisible,
      buttonFlex,
    } = useHoverEffect();
  
    // Detects if the user is on a mobile device
    const isMobile = useMobileDetection();
  
    // State to track if the core element is being hovered over
    const [coreHovered, setCoreHovered] = useState(false);
  
    // Hook from react-router-dom to handle navigation between pages
    const navigate = useNavigate();
  
    // Initializing hover effect logic for buttons using a custom hook
    useButtonHover();
  
    // Function to handle navigation to the whitepaper when selected in the dropdown menu
    const handleNavigation = () => {
      window.open(
        "https://drive.google.com/file/d/1tdpuAM3UqiiP_TKJMa5bFtxOG4bU_6ts/view",
        "_blank",
      );
    };

    // Fetch profile data from blockchain and IPFS
    useEffect(() => {
      async function fetchProfileData() {
        if (!displayAddress) return;
        
        try {
          console.log("Fetching profile data for:", displayAddress);
          
          // Get profile from ProfileGenesis contract on Arbitrum Sepolia
          const web3 = new Web3(import.meta.env.VITE_ARBITRUM_SEPOLIA_RPC_URL);
          const contractAddress = import.meta.env.VITE_PROFILE_GENESIS_ADDRESS;
          const contract = new web3.eth.Contract(ProfileGenesisABI, contractAddress);
          
          // Check if profile exists
          const profileExists = await contract.methods.hasProfile(displayAddress).call();
          
          if (!profileExists) {
            console.log("No profile found for this address");
            return;
          }
          
          const profile = await contract.methods.getProfile(displayAddress).call();
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
          
          // Update profile photo
          if (profileData.profilePhotoHash) {
            setProfilePhotoHash(profileData.profilePhotoHash);
          }
          
        } catch (error) {
          console.error("Error fetching profile data:", error);
        }
      }
      
      fetchProfileData();
    }, [displayAddress]);
  
    return (
      <main className="container-home">
        {/* Conditional rendering of the mobile warning if the user is on a mobile device */}
        {isMobile && (
          <div
            className="mobile-warning"
            style={{
              height: "1000px",
              width: "100%",
              fontFamily: "Satoshi",
              fontSize: "25px",
            }}
          >
            {/* Header section for the mobile warning */}
            <div
              style={{
                height: "64px",
                width: "100%",
                borderBottom: "2px solid whitesmoke",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <img
                style={{ height: "25px", width: "180px" }}
                src="/Logo.jpg"
                alt="Openwork Logo"
                id="logo-home"
              />
            </div>
            <div id="warning-body">
              <img
                style={{ height: "80px", width: "80px" }}
                src="/screen.svg"
                alt="Openwork Logo"
                id="logo-home"
              />
              <h1 id="mobile-heading">Desktop Only Feature</h1>
              <p id="mobile-sub">
                This feature is currently not supported on mobile devices
              </p>
            </div>
          </div>
        )}
  
        {/* Radial menu section */}
        <div className="theCircle-home">
          <img src="/RadiantGlow.png" alt="Radiant Glow" id="radiantGlow-home" />
  
          {/* Core element with hover effects */}
          <div
            id="core-home"
            onMouseEnter={() => {
              setButtonsVisible(true);
              setCoreHovered(true);
            }}
            onMouseLeave={() => {
              setButtonsVisible(false);
              setCoreHovered(false);
            }}
          >
            <img src="/core.svg" alt="The Core" className="core-image" />
            <img
              src="/core-hovered2.svg"
              alt="The Core Hovered"
              className="core-image core-hovered-image"
            />
          </div>
  
          {/* Top button - About */}
          <MenuItem
            to={`/profile/${displayAddress}`}
            id="buttonTop-home"
            buttonsVisible={buttonsVisible}
            buttonFlex={buttonFlex}
            onMouseEnter={() => setButtonsVisible(true)} // Show buttons on hover
            onMouseLeave={() => setButtonsVisible(false)} // Hide buttons on hover out
            imgSrc="/radial-button.svg"
            iconSrc="/menu-profile-icon.svg"
            text="About"
          />

          {/* Left button - Portfolio */}
          <MenuItem
            to="/profile-portfolio"
            id="buttonLeft-home"
            buttonsVisible={buttonsVisible}
            buttonFlex={buttonFlex}
            onMouseEnter={() => setButtonsVisible(true)}
            onMouseLeave={() => setButtonsVisible(false)}
            imgSrc="/radial-button.svg"
            iconSrc="/menu-work-icon.svg"
            text="Portfolio"
          />
  
          {/* Right button - Work */}
          <MenuItem
            to={`/profile/${displayAddress}/jobs`}
            id="buttonRight-home"
            buttonsVisible={buttonsVisible}
            buttonFlex={buttonFlex}
            onMouseEnter={() => setButtonsVisible(true)}
            onMouseLeave={() => setButtonsVisible(false)}
            imgSrc='/radial-button.svg'
            iconSrc='/menu-work-icon.svg'
            text='Work' 
          />

          {/* Bottom button - Packages */}
          <MenuItem
            to="/profile-packages"
            id="buttonBottom-home"
            buttonsVisible={buttonsVisible}
            buttonFlex={buttonFlex}
            onMouseEnter={() => setButtonsVisible(true)}
            onMouseLeave={() => setButtonsVisible(false)}
            imgSrc="/radial-button.svg"
            iconSrc="/menu-jobs-icon.svg"
            text="Packages"
          />
  
          {/* Hover text prompting user to hover over the radial menu */}
          {/* <div
            id="hoverText-home"
            style={{ display: buttonFlex ? "none" : "flex" }}
          >
            Hover to get started
          </div> */}
          <div className="core-profile">
            <img 
              src={profilePhotoHash 
                ? `https://gateway.pinata.cloud/ipfs/${profilePhotoHash}` 
                : "/user.png"
              } 
              alt="Profile"
            />
            <div className="profile-point">
                <span>4.9</span>
                <img src="/star.svg" alt="" />
            </div>
          </div>
        </div>
      </main>
    );
  }
