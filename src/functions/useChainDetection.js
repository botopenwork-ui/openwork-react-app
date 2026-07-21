import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getActiveChainConfig,
  getChainConfig as getConfiguredChain,
  getChainLogo,
  isMainnet,
} from '../config/chainConfig';

const WALLET_REQUEST_TIMEOUT_MS = 45_000;

function getWalletErrorCode(error) {
  const code = error?.code ?? error?.data?.originalError?.code;
  return code === undefined || code === null ? null : Number(code);
}

function isPendingWalletRequest(error) {
  const message = String(error?.message || '').toLowerCase();
  return getWalletErrorCode(error) === -32002 || message.includes('already pending');
}

function requestWithTimeout(request, message) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      const error = new Error(message);
      error.code = 'WALLET_REQUEST_TIMEOUT';
      reject(error);
    }, WALLET_REQUEST_TIMEOUT_MS);
  });

  return Promise.race([request, timeout]).finally(() => clearTimeout(timeoutId));
}

/**
 * Custom hook for reliable chain detection and switching
 * Single source of truth for all chain-related state and operations
 * Supports both testnet and mainnet based on VITE_NETWORK_MODE
 */
export function useChainDetection(walletAddress) {
  const [currentChainId, setCurrentChainId] = useState(null);
  const [isDetecting, setIsDetecting] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);
  const [switchStatus, setSwitchStatus] = useState('');

  // Supported chains configuration - varies by network mode
  const SUPPORTED_CHAINS = useMemo(() => {
    return Object.fromEntries(
      Object.entries(getActiveChainConfig()).map(([chainId, config]) => [
        Number(chainId),
        {
          name: config.shortName || config.name,
          icon: getChainLogo(Number(chainId)),
          fullName: config.name,
        },
      ])
    );
  }, []);

  // Get chain config for adding to MetaMask
  const getWalletChainConfig = useCallback((chainId) => {
    const config = getConfiguredChain(chainId);
    if (!config) return null;

    return {
      chainId: `0x${Number(chainId).toString(16)}`,
      chainName: config.name,
      nativeCurrency: config.nativeCurrency,
      rpcUrls: [config.rpcUrl],
      blockExplorerUrls: [config.blockExplorer],
    };
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

      console.log('🔍 Detected Chain ID:', chainId, isMainnet() ? '(mainnet mode)' : '(testnet mode)');

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
    console.log('🔄 switchToChain called with:', targetChainId, isMainnet() ? '(mainnet)' : '(testnet)');

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
    const walletConfig = getWalletChainConfig(targetChainId);
    const chainName = walletConfig?.chainName || `chain ${targetChainId}`;
    setSwitchStatus(`Switching to ${chainName}…`);

    try {
      console.log('🔄 Switching to chain:', targetChainId);

      // Try to switch
      await requestWithTimeout(
        window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: chainIdHex }]
        }),
        `MetaMask did not finish switching to ${chainName}.`
      );

      console.log('✅ Successfully switched to chain:', targetChainId);
      setCurrentChainId(Number(targetChainId));
      return true;

    } catch (switchError) {
      // Chain not added to MetaMask
      if (getWalletErrorCode(switchError) === 4902) {
        console.log('📝 Chain not found, adding...');
        setSwitchStatus(`Approve ${chainName} in MetaMask…`);

        try {
          if (!walletConfig) {
            alert('Chain configuration not found');
            return false;
          }

          await requestWithTimeout(
            window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [walletConfig]
            }),
            `MetaMask is waiting for approval to add ${chainName}.`
          );

          // Some wallets add a chain without selecting it. Verify the final
          // state explicitly instead of leaving the selector optimistic.
          setSwitchStatus(`Switching to ${chainName}…`);
          await requestWithTimeout(
            window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: chainIdHex }]
            }),
            `MetaMask added ${chainName} but did not finish switching to it.`
          );

          console.log('✅ Successfully added and switched to chain:', targetChainId);
          setCurrentChainId(Number(targetChainId));
          return true;

        } catch (addError) {
          console.error('🔴 Error adding chain:', addError);
          if (addError?.code === 'WALLET_REQUEST_TIMEOUT' || isPendingWalletRequest(addError)) {
            alert(`Open MetaMask and approve the pending ${chainName} network request. The page has stopped waiting and will update automatically after approval.`);
          } else if (getWalletErrorCode(addError) !== 4001) {
            alert(`Failed to add ${chainName}. Please add it manually in MetaMask.`);
          }
          return false;
        }
      }
      // User rejected
      else if (getWalletErrorCode(switchError) === 4001) {
        console.log('❌ User rejected network switch');
        return false;
      }
      // MetaMask already has an unanswered request open.
      else if (isPendingWalletRequest(switchError)) {
        alert(`A MetaMask network request is already pending. Open MetaMask and approve or reject it, then try again.`);
        return false;
      }
      else if (switchError?.code === 'WALLET_REQUEST_TIMEOUT') {
        alert(`Open MetaMask and finish the pending switch to ${chainName}. The page has stopped waiting.`);
        return false;
      }
      // Other errors
      else {
        console.error('🔴 Error switching chain:', switchError);
        alert(`Failed to switch network: ${switchError.message}`);
        return false;
      }
    } finally {
      setIsSwitching(false);
      setSwitchStatus('');
    }
  }, [getWalletChainConfig]);

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
      setSwitchStatus('');
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

  // Effect: Handle late-arriving ethereum provider (MetaMask loads after React, or mock injection)
  useEffect(() => {
    const handleEthereumInitialized = () => {
      if (walletAddress) {
        console.log('🔄 ethereum#initialized — re-detecting chain');
        setIsDetecting(true);
        setTimeout(() => detectCurrentChain(), 100);
      }
    };
    window.addEventListener('ethereum#initialized', handleEthereumInitialized);
    return () => window.removeEventListener('ethereum#initialized', handleEthereumInitialized);
  }, [walletAddress, detectCurrentChain]);

  return {
    currentChainId,
    isDetecting,
    isSwitching,
    switchStatus,
    switchToChain,
    supportedChains: SUPPORTED_CHAINS,
    isMainnetMode: isMainnet()
  };
}
