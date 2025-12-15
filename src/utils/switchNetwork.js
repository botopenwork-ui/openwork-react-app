/**
 * Network Switching Utilities
 * 
 * Helps users switch to supported networks and handles network addition.
 */

import { getChainConfig, toHexChainId } from "../config/chainConfig";

/**
 * Request wallet to switch to a specific chain
 * @param {number} chainId - Target chain ID
 * @returns {Promise<boolean>} True if successful
 */
export async function switchToChain(chainId) {
  if (!window.ethereum) {
    throw new Error("No wallet detected. Please install MetaMask.");
  }

  const chainIdHex = toHexChainId(chainId);
  const config = getChainConfig(chainId);

  try {
    // Try to switch to the network
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: chainIdHex }],
    });
    
    console.log(`Switched to ${config?.name || 'chain ' + chainId}`);
    return true;
    
  } catch (error) {
    // Error code 4902 means the chain hasn't been added to MetaMask
    if (error.code === 4902 && config) {
      try {
        await addChainToWallet(chainId);
        return true;
      } catch (addError) {
        console.error("Failed to add network:", addError);
        throw addError;
      }
    } else {
      // User rejected the request or other error
      console.error("Failed to switch network:", error);
      throw error;
    }
  }
}

/**
 * Add a chain to user's wallet
 * @param {number} chainId - Chain ID to add
 * @returns {Promise<void>}
 */
export async function addChainToWallet(chainId) {
  if (!window.ethereum) {
    throw new Error("No wallet detected.");
  }

  const config = getChainConfig(chainId);
  if (!config) {
    throw new Error(`Chain ${chainId} is not configured.`);
  }

  const chainIdHex = toHexChainId(chainId);

  try {
    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [{
        chainId: chainIdHex,
        chainName: config.name,
        nativeCurrency: config.nativeCurrency,
        rpcUrls: [config.rpcUrl],
        blockExplorerUrls: [config.blockExplorer]
      }],
    });
    
    console.log(`${config.name} added to wallet`);
  } catch (error) {
    console.error("Failed to add chain to wallet:", error);
    throw error;
  }
}

/**
 * Prompt user to switch to an allowed chain
 * @param {Array<number>} allowedChainIds - List of allowed chain IDs
 * @param {number} preferredChainId - Preferred chain to switch to (optional)
 * @returns {Promise<boolean>} True if switched successfully
 */
export async function promptSwitchToAllowedChain(allowedChainIds, preferredChainId = null) {
  const targetChainId = preferredChainId || allowedChainIds[0];
  
  if (!targetChainId) {
    throw new Error("No allowed chains specified");
  }

  const config = getChainConfig(targetChainId);
  const confirmSwitch = window.confirm(
    `This action requires ${config?.name || 'a supported network'}. Switch now?`
  );

  if (confirmSwitch) {
    try {
      await switchToChain(targetChainId);
      return true;
    } catch (error) {
      console.error("Network switch failed:", error);
      return false;
    }
  }

  return false;
}

/**
 * Ensure user is on a specific chain before proceeding
 * @param {number} requiredChainId - Required chain ID
 * @param {number} currentChainId - User's current chain ID
 * @returns {Promise<boolean>} True if on correct chain
 */
export async function ensureCorrectChain(requiredChainId, currentChainId) {
  if (currentChainId === requiredChainId) {
    return true; // Already on correct chain
  }

  // Ask user to switch
  return await promptSwitchToAllowedChain([requiredChainId], requiredChainId);
}

/**
 * Get user-friendly network switching instructions
 * @param {number} targetChainId - Target chain ID
 * @returns {string} Instructions text
 */
export function getNetworkSwitchInstructions(targetChainId) {
  const config = getChainConfig(targetChainId);
  const chainName = config?.name || `Chain ${targetChainId}`;
  
  return `Please switch your wallet to ${chainName} to continue. ` +
         `Click the network selector in your wallet (e.g., MetaMask) and choose ${chainName}.`;
}

export default {
  switchToChain,
  addChainToWallet,
  promptSwitchToAllowedChain,
  ensureCorrectChain,
  getNetworkSwitchInstructions
};
