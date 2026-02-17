import React, { useState, useEffect } from "react";
import Web3 from "web3";

export default function WalletTest() {
  const [walletAddress, setWalletAddress] = useState("");
  const [chainId, setChainId] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);

  // Check for existing connection on page load
  useEffect(() => {
    checkWalletConnection();
    
    // Listen for account changes
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
      
      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, []);

  const checkWalletConnection = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          await getChainId();
        }
      } catch (error) {
        console.error("Error checking wallet connection:", error);
      }
    }
  };

  const getChainId = async () => {
    if (window.ethereum) {
      try {
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        setChainId(parseInt(chainId, 16).toString());
      } catch (error) {
        console.error("Error getting chain ID:", error);
      }
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("MetaMask is not installed!");
      return;
    }

    setIsConnecting(true);
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setWalletAddress(accounts[0]);
      await getChainId();
    } catch (error) {
      console.error("Error connecting wallet:", error);
      alert("Failed to connect wallet");
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setWalletAddress("");
    setChainId("");
  };

  const handleAccountsChanged = (accounts) => {
    if (accounts.length > 0) {
      setWalletAddress(accounts[0]);
      getChainId();
    } else {
      setWalletAddress("");
      setChainId("");
    }
  };

  const handleChainChanged = (chainId) => {
    setChainId(parseInt(chainId, 16).toString());
  };

  const getNetworkName = (chainId) => {
    const networks = {
      "1": "Ethereum Mainnet",
      "11155111": "Sepolia",
      "11155420": "OP Sepolia",
      "10": "Optimism",
      "137": "Polygon",
      "80001": "Mumbai",
      "8453": "Base",
      "84532": "Base Sepolia",
      "42161": "Arbitrum One",
      "421614": "Arbitrum Sepolia"
    };
    return networks[chainId] || `Unknown Network (${chainId})`;
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#f5f5f5",
      fontFamily: "Arial, sans-serif"
    }}>
      <div style={{
        backgroundColor: "white",
        padding: "40px",
        borderRadius: "12px",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        maxWidth: "500px",
        width: "100%"
      }}>
        <h1 style={{
          textAlign: "center",
          marginBottom: "30px",
          color: "#333"
        }}>
          Wallet Connection Test
        </h1>

        {!walletAddress ? (
          <div style={{ textAlign: "center" }}>
            <button
              onClick={connectWallet}
              disabled={isConnecting}
              style={{
                backgroundColor: "#007bff",
                color: "white",
                border: "none",
                padding: "12px 24px",
                borderRadius: "8px",
                fontSize: "16px",
                fontWeight: "bold",
                cursor: isConnecting ? "not-allowed" : "pointer",
                opacity: isConnecting ? 0.7 : 1
              }}
            >
              {isConnecting ? "Connecting..." : "Connect Wallet"}
            </button>
            <p style={{
              marginTop: "20px",
              color: "#666",
              fontSize: "14px"
            }}>
              Click to connect your MetaMask wallet
            </p>
          </div>
        ) : (
          <div>
            <div style={{
              backgroundColor: "#e8f5e8",
              padding: "20px",
              borderRadius: "8px",
              marginBottom: "20px"
            }}>
              <h3 style={{
                margin: "0 0 15px 0",
                color: "#2e7d2e"
              }}>
                ✅ Wallet Connected
              </h3>
              
              <div style={{ marginBottom: "15px" }}>
                <strong>Address:</strong>
                <div style={{
                  backgroundColor: "#f8f9fa",
                  padding: "8px",
                  borderRadius: "4px",
                  fontFamily: "monospace",
                  fontSize: "14px",
                  marginTop: "5px",
                  wordBreak: "break-all"
                }}>
                  {walletAddress}
                </div>
              </div>

              <div style={{ marginBottom: "15px" }}>
                <strong>Chain ID:</strong>
                <div style={{
                  backgroundColor: "#f8f9fa",
                  padding: "8px",
                  borderRadius: "4px",
                  marginTop: "5px"
                }}>
                  {chainId}
                </div>
              </div>

              <div>
                <strong>Network:</strong>
                <div style={{
                  backgroundColor: "#f8f9fa",
                  padding: "8px",
                  borderRadius: "4px",
                  marginTop: "5px"
                }}>
                  {getNetworkName(chainId)}
                </div>
              </div>
            </div>

            <button
              onClick={disconnectWallet}
              style={{
                backgroundColor: "#dc3545",
                color: "white",
                border: "none",
                padding: "10px 20px",
                borderRadius: "6px",
                fontSize: "14px",
                cursor: "pointer",
                width: "100%"
              }}
            >
              Disconnect Wallet
            </button>
          </div>
        )}

        <div style={{
          marginTop: "30px",
          padding: "15px",
          backgroundColor: "#f8f9fa",
          borderRadius: "6px",
          fontSize: "12px",
          color: "#666"
        }}>
          <strong>Debug Info:</strong>
          <div>MetaMask detected: {window.ethereum ? "✅ Yes" : "❌ No"}</div>
          <div>Page URL: {window.location.href}</div>
        </div>
      </div>
    </div>
  );
}