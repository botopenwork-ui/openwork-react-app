import React from "react";
import ReactDOM from "react-dom";
import { useWalletConnection } from "../../functions/useWalletConnection";
import { useDropdown } from "../../functions/useDropdown";
import { formatWalletAddress } from "../../functions/formatWalletAddress";
import RadialMenu from "../RadialMenu/RadialMenu";

const Header = () => {
  const [showRadialMenu, setShowRadialMenu] = React.useState(false);

  // Access wallet connection state and functions
  const { walletAddress, connectWallet, disconnectWallet } = useWalletConnection();

  // Access dropdown visibility and toggling
  const { dropdownVisible, toggleDropdown } = useDropdown();

  // Function to handle navigation to the whitepaper or other pages
  const handleNavigation = () => {
    window.open(
      "https://drive.google.com/file/d/1tdpuAM3UqiiP_TKJMa5bFtxOG4bU_6ts/view",
      "_blank",
    );
  };

  const handleCLick = () => {
    location.pathname = '/connect-wallet'
  }

  const goNotification = () => {
    location.pathname = '/notifications'
  }

  const goHome = () => {
    location.pathname = '/'
  }

  const goToMyProfile = () => {
    if (walletAddress) {
      location.pathname = `/profile`
    }
  }

  return (
    <>
      {/* Unified hover area that includes both icon and radial menu */}
      <div 
        onMouseEnter={() => setShowRadialMenu(true)}
        onMouseLeave={() => setShowRadialMenu(false)}
        style={{ 
          position: 'absolute', 
          left: '50%', 
          transform: 'translateX(-50%)', 
          top: 0, 
          width: '600px',
          height: '600px',
          zIndex: 10000,
          pointerEvents: showRadialMenu ? 'auto' : 'none'
        }}
      >
        {/* Icon - always visible, always hoverable */}
        <img
          src="/OWIcon.svg"
          alt="OWToken Icon"
          id="owToken-home"
          className={walletAddress ? "visible-home" : ""}
          onClick={goHome}
          style={{ 
            position: 'absolute', 
            left: '50%', 
            transform: 'translateX(-50%)', 
            top: '20px', 
            cursor: 'pointer',
            pointerEvents: 'auto',
            width: '40px',
            height: '40px'
          }}
        />
        
        {/* RadialMenu rendered via portal when hovering */}
        {showRadialMenu && ReactDOM.createPortal(
          <div style={{ pointerEvents: 'auto' }}>
            <RadialMenu />
          </div>,
          document.body
        )}
      </div>

      <header className="header-home">
        <img
          src="/Logo.jpg"
          alt="Openwork Logo"
          id="logo-home"
          className={`logo-home ${walletAddress ? "hidden-home" : "visible-home"}`}
        />

      <div className="right-header">
        {walletAddress ? (
          <>
            <div className="alarm" onClick={goNotification}>
              <img src="/alarm.svg" alt="Alarm" />
              <span className="alarm-badge">2</span>
            </div>
            <div className="dropdownButtonContainer-home">
              <div
                className={`dropdownButton-home ${dropdownVisible ? "clicked-home" : ""}`}
                onClick={toggleDropdown}
              >
                <img src="/dropimage.svg" alt="Dropdown Icon" className="dropdownIcon-home" />
                <div className="walletAddressText-home">
                  {formatWalletAddress(walletAddress)}
                </div>
                <img src="/down.svg" alt="Down Icon" className="dropdownIcon-home" />
              </div>
              {dropdownVisible && (
                <div className="dropdownMenu-home">
                  <div className="dropdownMenuItem-home" onClick={goToMyProfile}>
                    <span className="dropdownMenuItemText-home" style={{ color: "#868686" }}>
                      My Profile
                    </span>
                    <div className="dropdownMenuItem-icon">
                      <img src="/profile.svg" alt="Profile Icon" className="dropdownMenuItemIcon-home" />
                    </div>
                  </div>
                  <span className="dropdownButton-bottom"></span>
                  {/* <div className="dropdownMenuItem-home" onClick={handleNavigation}>
                    <span className="dropdownMenuItemText-home" style={{ color: "#868686" }}>
                      Refer & Earn
                    </span>
                    <img src="/refer.svg" alt="Refer Icon" className="dropdownMenuItemIcon-home" />
                  </div>
                  <span className="dropdownButton-bottom"></span> */}
                  <div className="dropdownMenuItem-home" onClick={disconnectWallet}>
                    <span className="dropdownMenuItemText-home" style={{ color: "firebrick" }}>
                      Disconnect Wallet
                    </span>
                    <div className="dropdownMenuItem-icon">
                      <img src="/cross.svg" alt="Disconnect Icon" className="dropdownMenuItemIcon-home" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <img
            src="/connect.svg"
            alt="Connect Button"
            id="connectButton-home"
            className="connectButton-home"
            onClick={handleCLick}
          />
        )}
      </div>
    </header>
    </>
  );
};

export default Header;
