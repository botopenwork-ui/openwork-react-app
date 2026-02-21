import { useState, useEffect } from 'react';
import { getChainConfig, isChainAllowed, getBlockedChainMessage } from '../config/chainConfig';

/**
 * Hook to detect and monitor user's connected wallet chain
 * 
 * Returns:
 * - chainId: Current chain ID (number)
 * - chainConfig: Configuration object for current chain
 * - isAllowed: Whether transactions are allowed on current chain
 * - error: Error message if chain is blocked or unsupported
 * - isLoading: Whether chain detection is in progress
 * 
 * Usage:
 * const { chainId, chainConfig, isAllowed, error } = useChainDetection();
 * 
 * if (!isAllowed) {
 *   return <div>Please switch to {error}</div>
 * }
 */
export function useChainDetection() {
  const [chainId, setChainId] = useState(null);
  const [chainConfig, setChainConfig] = useState(null);
  const [isAllowed, setIsAllowed] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function detectChain() {
      if (!window.ethereum) {
        if (mounted) {
          setError("No wallet detected. Please install MetaMask or another Web3 wallet.");
          setIsLoading(false);
        }
        return;
      }

      try {
        // Get current chain ID
        const currentChainId = await window.ethereum.request({ 
          method: 'eth_chainId' 
        });
        const chainIdNum = parseInt(currentChainId, 16);
        
        if (!mounted) return;

        setChainId(chainIdNum);
        
        // Get configuration for this chain
        const config = getChainConfig(chainIdNum);
        setChainConfig(config);
        
        // Check if transactions are allowed
        const allowed = isChainAllowed(chainIdNum);
        setIsAllowed(allowed);
        
        // Set error message if not allowed
        if (!allowed) {
          setError(getBlockedChainMessage(chainIdNum));
        } else {
          setError(null);
        }
        
        setIsLoading(false);
        
      } catch (err) {
        console.error("Chain detection error:", err);
        if (mounted) {
          setError("Failed to detect network. Please check your wallet connection.");
          setIsLoading(false);
        }
      }
    }

    detectChain();

    // Re-run detection if ethereum becomes available after mount (e.g. injected provider)
    const handleEthereumInitialized = () => {
      setIsLoading(true);
      detectChain();
    };
    window.addEventListener('ethereum#initialized', handleEthereumInitialized);

    // Listen for chain changes
    if (window.ethereum) {
      const handleChainChanged = () => {
        setIsLoading(true);
        detectChain();
      };

      window.ethereum.on('chainChanged', handleChainChanged);

      // Also listen for account changes (might affect chain)
      const handleAccountsChanged = (accounts) => {
        if (accounts.length > 0) {
          detectChain();
        }
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);

      // Cleanup
      return () => {
        mounted = false;
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener('chainChanged', handleChainChanged);
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        }
      };
    }

    return () => {
      mounted = false;
    };
  }, []);

  return { 
    chainId, 
    chainConfig, 
    isAllowed, 
    error, 
    isLoading 
  };
}

/**
 * Hook to get user's wallet address
 * 
 * Returns:
 * - address: User's wallet address
 * - isConnected: Whether wallet is connected
 * - connect: Function to request wallet connection
 */
export function useWalletAddress() {
  const [address, setAddress] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkConnection() {
      if (!window.ethereum) return;

      try {
        const accounts = await window.ethereum.request({ 
          method: 'eth_accounts' 
        });
        
        if (mounted && accounts.length > 0) {
          setAddress(accounts[0]);
          setIsConnected(true);
        }
      } catch (err) {
        console.error("Failed to get accounts:", err);
      }
    }

    checkConnection();

    // Listen for account changes
    if (window.ethereum) {
      const handleAccountsChanged = (accounts) => {
        if (mounted) {
          if (accounts.length > 0) {
            setAddress(accounts[0]);
            setIsConnected(true);
          } else {
            setAddress(null);
            setIsConnected(false);
          }
        }
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);

      return () => {
        mounted = false;
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        }
      };
    }

    return () => {
      mounted = false;
    };
  }, []);

  const connect = async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask or another Web3 wallet.");
      return;
    }

    try {
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      
      if (accounts.length > 0) {
        setAddress(accounts[0]);
        setIsConnected(true);
      }
    } catch (err) {
      console.error("Failed to connect wallet:", err);
      throw err;
    }
  };

  return { address, isConnected, connect };
}

export default useChainDetection;
