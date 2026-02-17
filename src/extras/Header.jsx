import React, { useState } from "react";
import styles from "./header.module.css"; // Import the CSS module

export default function Header({ walletAddress, setWalletAddress }) {
  const [dropdownVisible, setDropdownVisible] = useState(false);

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        setWalletAddress(accounts[0]);
      } catch (error) {
        console.error("Failed to connect wallet:", error);
      }
    } else {
      alert("MetaMask is not installed. Please install it to use this app.");
    }
  };

  const toggleDropdown = () => {
    setDropdownVisible(!dropdownVisible);
  };

  const disconnectWallet = () => {
    setWalletAddress("");
    setDropdownVisible(false);
  };

  return (
    <header className={styles.header}>
      <img
        src="/OWIcon.svg"
        alt="OWIcon"
        id="owToken"
        className={dropdownVisible ? styles.visible : ""}
      />
      {walletAddress ? (
        <div className={styles.dropdownButtonContainer}>
          <div
            className={`${styles.dropdownButton} ${dropdownVisible ? styles.clicked : ""}`}
            onClick={toggleDropdown}
          >
            <img
              src="/dropimage.svg"
              alt="Dropdown Icon"
              className={styles.dropdownIcon}
            />
            <div className={styles.walletAddressText}>{walletAddress}</div>
            <img
              src="/down.svg"
              alt="Down Icon"
              className={styles.dropdownIcon}
            />
          </div>
          {dropdownVisible && (
            <div className={styles.dropdownMenu}>
              <div className={styles.dropdownMenuItem}>
                <span
                  className={styles.dropdownMenuItemText}
                  style={{ color: "darkgray" }}
                >
                  Read Whitepaper
                </span>
                <img
                  src="/OWIcon.svg"
                  alt="OWIcon"
                  className={styles.dropdownMenuItemIcon}
                />
              </div>
              <div
                className={styles.dropdownMenuItem}
                onClick={disconnectWallet}
              >
                <span
                  className={styles.dropdownMenuItemText}
                  style={{ color: "red" }}
                >
                  Disconnect Wallet
                </span>
                <img
                  src="/cross.svg"
                  alt="Cross Icon"
                  className={styles.dropdownMenuItemIcon}
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        <img
          src="/connect.svg"
          alt="Connect Button"
          id="connectButton"
          onClick={connectWallet}
          className={styles.connectButton}
        />
      )}
    </header>
  );
}
