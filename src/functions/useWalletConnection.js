import { useState, useEffect } from "react";

const STORAGE_KEY = "ow_wallet_address";

export function useWalletConnection() {
  const [walletAddress, setWalletAddressState] = useState(
    () => localStorage.getItem(STORAGE_KEY) || ""
  );

  const setWalletAddress = (address) => {
    setWalletAddressState(address);
    if (address) {
      localStorage.setItem(STORAGE_KEY, address);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  useEffect(() => {
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

    // Only check on-chain if we don't already have a stored address
    if (!localStorage.getItem(STORAGE_KEY)) {
      checkWalletConnection();
    }

    // Listen for account changes
    const handleAccountsChanged = (accounts) => {
      if (accounts.length > 0) {
        setWalletAddress(accounts[0]);
      } else {
        setWalletAddress("");
      }
    };

    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      
      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
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

  return { walletAddress, connectWallet, disconnectWallet };
}
