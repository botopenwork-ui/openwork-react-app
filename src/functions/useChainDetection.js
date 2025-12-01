import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for reliable chain detection and switching
 * Single source of truth for all chain-related state and operations
 */
export function useChainDetection(walletAddress) {
  const [currentChainId, setCurrentChainId] = useState(null);
  const [isDetecting, setIsDetecting] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);

  // Supported chains configuration
  const SUPPORTED_CHAINS = {
    421614: { name: 'Arbitrum', icon: '/arbitrum-chain.png', fullName: 'Arbitrum Sepolia' },
    11155111: { name: 'Ethereum', icon: '/ethereum-chain.png', fullName: 'Ethereum Sepolia' },
    80002: { name: 'Polygon', icon: '/polygon-chain.png', fullName: 'Polygon Amoy' },
    11155420: { name: 'Optimism', icon: '/optimism-chain.png', fullName: 'OP Sepolia' },
    84532: { name: 'Base', icon: '/base-chain.png', fullName: 'Base Sepolia' }
  };

  // Get chain config for adding to MetaMask
  const getChainConfig = useCallback((chainId) => {
    const configs = {
      421614: {
        chainId: `0x${chainId.toString(16)}`,
        chainName: 'Arbitrum Sepolia',
        nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
        rpcUrls: ['https://sepolia-rollup.arbitrum.io/rpc'],
        blockExplorerUrls: ['https://sepolia.arbiscan.io']
      },
      11155111: {
        chainId: `0x${chainId.toString(16)}`,
        chainName: 'Ethereum Sepolia',
        nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
        rpcUrls: ['https://rpc.sepolia.org'],
        blockExplorerUrls: ['https://sepolia.etherscan.io']
      },
      80002: {
        chainId: `0x${chainId.toString(16)}`,
        chainName: 'Polygon Amoy',
        nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
        rpcUrls: ['https://rpc-amoy.polygon.technology'],
        blockExplorerUrls: ['https://amoy.polygonscan.com']
      },
      11155420: {
        chainId: `0x${chainId.toString(16)}`,
        chainName: 'OP Sepolia',
        nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
        rpcUrls: ['https://sepolia.optimism.io'],
        blockExplorerUrls: ['https://sepolia-optimism.etherscan.io']
      },
      84532: {
        chainId: `0x${chainId.toString(16)}`,
        chainName: 'Base Sepolia',
        nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
        rpcUrls: ['https://sepolia.base.org'],
        blockExplorerUrls: ['https://sepolia.basescan.org']
      }
    };
    return configs[chainId];
  }, []);

  // Core detection function
  const detectCurrentChain = useCallback(async () => {
    if (!window.ethereum) {
      console.log('🔴 MetaMask not installed');
      setIsDetecting(false);
      return null;
    }

    try {
      // Step 1: Verify wallet is connected
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (!accounts || accounts.length === 0) {
        console.log('⚠️ No wallet connected');
        setCurrentChainId(null);
        setIsDetecting(false);
        return null;
      }

      // Step 2: Get current chain ID
      const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
      const chainId = parseInt(chainIdHex, 16);
      
      console.log('🔍 Detected Chain ID:', chainId);
      
      // Step 3: Update state
      setCurrentChainId(chainId);
      setIsDetecting(false);
      return chainId;
    } catch (error) {
      console.error('🔴 Error detecting chain:', error);
      setIsDetecting(false);
      return null;
    }
  }, []);

  // Switch to a different chain
  const switchToChain = useCallback(async (targetChainId) => {
    console.trace('⚠️ switchToChain called with:', targetChainId, '- Call stack:');
    
    if (!window.ethereum) {
      alert('Please install MetaMask');
      return false;
    }

    // Verify wallet is connected
    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (!accounts || accounts.length === 0) {
        alert('Please connect your wallet first');
        return false;
      }
    } catch (error) {
      console.error('Error checking connection:', error);
      return false;
    }

    setIsSwitching(true);
    const chainIdHex = `0x${targetChainId.toString(16)}`;

    try {
      console.log('🔄 Switching to chain:', targetChainId);
      
      // Try to switch
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainIdHex }]
      });
      
      console.log('✅ Successfully switched to chain:', targetChainId);
      setIsSwitching(false);
      return true;
      
    } catch (switchError) {
      // Chain not added to MetaMask
      if (switchError.code === 4902) {
        console.log('📝 Chain not found, adding...');
        
        try {
          const config = getChainConfig(targetChainId);
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [config]
          });
          
          console.log('✅ Successfully added and switched to chain:', targetChainId);
          setIsSwitching(false);
          return true;
          
        } catch (addError) {
          console.error('🔴 Error adding chain:', addError);
          alert(`Failed to add network. Please add it manually in MetaMask.`);
          setIsSwitching(false);
          return false;
        }
      } 
      // User rejected
      else if (switchError.code === 4001) {
        console.log('❌ User rejected network switch');
        setIsSwitching(false);
        return false;
      }
      // Other errors
      else {
        console.error('🔴 Error switching chain:', switchError);
        alert(`Failed to switch network: ${switchError.message}`);
        setIsSwitching(false);
        return false;
      }
    }
  }, [getChainConfig]);

  // Effect: Detect chain when wallet connects
  useEffect(() => {
    if (walletAddress) {
      console.log('🚀 Wallet connected, detecting chain...');
      setIsDetecting(true);
      
      // Small delay to ensure wallet state is settled
      const timer = setTimeout(() => {
        detectCurrentChain();
      }, 150);
      
      return () => clearTimeout(timer);
    } else {
      console.log('⚠️ Wallet disconnected');
      setCurrentChainId(null);
      setIsDetecting(false);
    }
  }, [walletAddress, detectCurrentChain]);

  // Effect: Listen to chain changes
  useEffect(() => {
    if (!window.ethereum) return;

    const handleChainChanged = (chainIdHex) => {
      const chainId = parseInt(chainIdHex, 16);
      console.log('🔄 Chain changed to:', chainId);
      setCurrentChainId(chainId);
      setIsSwitching(false);
    };

    const handleAccountsChanged = (accounts) => {
      console.log('👤 Accounts changed');
      if (accounts.length > 0) {
        // Re-detect chain when account changes
        detectCurrentChain();
      } else {
        setCurrentChainId(null);
      }
    };

    window.ethereum.on('chainChanged', handleChainChanged);
    window.ethereum.on('accountsChanged', handleAccountsChanged);

    return () => {
      if (window.ethereum.removeListener) {
        window.ethereum.removeListener('chainChanged', handleChainChanged);
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      }
    };
  }, [detectCurrentChain]);

  return {
    currentChainId,
    isDetecting,
    isSwitching,
    switchToChain,
    supportedChains: SUPPORTED_CHAINS
  };
}
