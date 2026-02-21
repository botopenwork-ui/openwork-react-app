import React, { createContext, useContext, useState, useEffect } from "react";

const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const [walletAddress, setWalletAddressState] = useState(() => {
    // Initialise synchronously from window.ethereum.selectedAddress or localStorage
    if (typeof window !== "undefined") {
      if (window.ethereum && window.ethereum.selectedAddress) {
        return window.ethereum.selectedAddress;
      }
      return localStorage.getItem("ow_wallet_address") || "";
    }
    return "";
  });

  const setWalletAddress = (address) => {
    setWalletAddressState(address);
    if (address) {
      localStorage.setItem("ow_wallet_address", address);
    } else {
      localStorage.removeItem("ow_wallet_address");
    }
  };

  useEffect(() => {
    // If already set (from localStorage or selectedAddress), skip the async check
    if (walletAddress) return;

    const checkWalletConnection = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({
            method: "eth_accounts",
          });
          if (accounts.length > 0) {
            setWalletAddress(accounts[0]);
          }
        } catch (error) {
          console.error("Failed to check wallet connection:", error);
        }
      }
    };

    checkWalletConnection();

    const handleAccountsChanged = (accounts) => {
      if (accounts.length > 0) {
        setWalletAddress(accounts[0]);
      } else {
        setWalletAddress("");
      }
    };

    if (window.ethereum) {
      window.ethereum.on("accountsChanged", handleAccountsChanged);
      return () => {
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      };
    }
  }, []);

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
      alert("MetaMask is not installed.");
    }
  };

  const disconnectWallet = () => {
    setWalletAddress("");
  };

  return (
    <WalletContext.Provider
      value={{ walletAddress, connectWallet, disconnectWallet }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used inside WalletProvider");
  return ctx;
}
