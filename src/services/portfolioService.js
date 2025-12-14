import Web3 from 'web3';
import ProfileGenesisABI from '../ABIs/profile-genesis_ABI.json';

/**
 * Portfolio Service for blockchain and IPFS operations
 */

// IPFS Gateways for fetching (with fallback)
const IPFS_GATEWAYS = [
  'https://gateway.pinata.cloud/ipfs/',
  'https://ipfs.io/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://dweb.link/ipfs/'
];

/**
 * Fetch data from IPFS with multiple gateway fallback
 */
export const fetchFromIPFS = async (hash, timeout = 5000) => {
  if (!hash || hash === '') {
    console.warn('Empty IPFS hash provided');
    return null;
  }

  for (const gateway of IPFS_GATEWAYS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(`${gateway}${hash}`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Fetched from ${gateway}${hash}`);
        return data;
      }
    } catch (error) {
      console.warn(`Failed to fetch from ${gateway}:`, error.message);
    }
  }
  
  throw new Error(`Failed to fetch IPFS data from all gateways for hash: ${hash}`);
};

/**
 * Upload file to IPFS via backend (avoids CORS and exposes API keys)
 */
export const uploadFileToIPFS = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
    const response = await fetch(`${BACKEND_URL}/api/ipfs/upload-file`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error('Failed to upload file to IPFS');
    }

    const data = await response.json();
    console.log('✅ File uploaded to IPFS:', data.IpfsHash);
    return data.IpfsHash;
  } catch (error) {
    console.error('Error uploading file to IPFS:', error);
    throw error;
  }
};

/**
 * Upload JSON to IPFS via backend (avoids CORS and exposes API keys)
 */
export const uploadJSONToIPFS = async (jsonData, filename = 'data.json') => {
  try {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
    const response = await fetch(`${BACKEND_URL}/api/ipfs/upload-json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        pinataContent: jsonData,
        pinataMetadata: {
          name: filename
        }
      })
    });

    if (!response.ok) {
      throw new Error('Failed to upload JSON to IPFS');
    }

    const data = await response.json();
    console.log('✅ JSON uploaded to IPFS:', data.IpfsHash);
    return data.IpfsHash;
  } catch (error) {
    console.error('Error uploading JSON to IPFS:', error);
    throw error;
  }
};

/**
 * Get ProfileGenesis contract instance
 */
const getProfileGenesisContract = (web3) => {
  const contractAddress = import.meta.env.VITE_PROFILE_GENESIS_ADDRESS;
  return new web3.eth.Contract(ProfileGenesisABI, contractAddress);
};

/**
 * Fetch all portfolio items for a user from blockchain
 */
export const fetchUserPortfolios = async (userAddress) => {
  try {
    if (!userAddress) {
      console.warn('❌ No user address provided');
      return [];
    }

    console.log('🔍 Fetching portfolios for:', userAddress);
    console.log('📍 Using RPC:', import.meta.env.VITE_ARBITRUM_SEPOLIA_RPC_URL);
    console.log('📍 ProfileGenesis:', import.meta.env.VITE_PROFILE_GENESIS_ADDRESS);

    const web3 = new Web3(import.meta.env.VITE_ARBITRUM_SEPOLIA_RPC_URL);
    const contract = getProfileGenesisContract(web3);

    // Check if profile exists
    console.log('🔍 Checking if profile exists...');
    const hasProfile = await contract.methods.hasProfile(userAddress).call();
    console.log('📊 Has profile:', hasProfile);
    
    if (!hasProfile) {
      console.log('ℹ️  User has no profile on Arbitrum yet');
      return [];
    }

    // Get profile data
    console.log('📥 Fetching profile data...');
    const profile = await contract.methods.getProfile(userAddress).call();
    console.log('📊 Profile data:', profile);
    
    const portfolioHashes = profile.portfolioHashes || profile[3] || []; // Try both property name and index
    console.log(`📋 Found ${portfolioHashes.length} portfolio hashes:`, portfolioHashes);

    // Fetch each portfolio's data from IPFS
    const portfolios = [];
    for (let i = 0; i < portfolioHashes.length; i++) {
      try {
        const hash = portfolioHashes[i];
        console.log(`📥 Fetching portfolio ${i} from IPFS: ${hash}`);
        const portfolioData = await fetchFromIPFS(hash);
        console.log(`✅ Portfolio ${i} loaded:`, portfolioData);
        portfolios.push({
          id: i,
          ipfsHash: hash,
          ...portfolioData
        });
      } catch (error) {
        console.error(`❌ Failed to fetch portfolio ${i}:`, error);
        // Add placeholder for failed fetch
        portfolios.push({
          id: i,
          ipfsHash: portfolioHashes[i],
          title: 'Failed to load',
          description: 'Error loading portfolio data',
          skills: [],
          images: []
        });
      }
    }

    console.log(`✅ Successfully loaded ${portfolios.length} portfolios`);
    return portfolios;
  } catch (error) {
    console.error('❌ Error fetching user portfolios:', error);
    throw error;
  }
};

/**
 * Add a new portfolio item to blockchain
 */
export const addPortfolioToBlockchain = async (walletAddress, portfolioHash) => {
  try {
    const web3 = new Web3(window.ethereum);

    // Get LOWJC contract
    const lowjcAddress = import.meta.env.VITE_LOWJC_CONTRACT_ADDRESS;
    const LOWJCABI = (await import('../ABIs/lowjc_ABI.json')).default;
    const lowjcContract = new web3.eth.Contract(LOWJCABI, lowjcAddress);

    // Get LayerZero options from env
    const lzOptions = import.meta.env.VITE_LAYERZERO_OPTIONS_VALUE || '0x000301001101000000000000000000000000000F4240';

    // Estimate gas for the transaction
    const gasEstimate = await lowjcContract.methods.addPortfolio(
      portfolioHash,
      lzOptions
    ).estimateGas({ from: walletAddress, value: web3.utils.toWei('0.01', 'ether') });

    // Send transaction with estimated gas (convert BigInt properly)
    const gasWithBuffer = Math.floor(Number(gasEstimate) * 1.2);
    const tx = await lowjcContract.methods.addPortfolio(
      portfolioHash,
      lzOptions
    ).send({
      from: walletAddress,
      value: web3.utils.toWei('0.01', 'ether'), // LayerZero fee
      gas: gasWithBuffer
    });

    console.log('✅ Portfolio added to blockchain:', tx.transactionHash);
    return tx;
  } catch (error) {
    console.error('Error adding portfolio to blockchain:', error);
    throw error;
  }
};

/**
 * Update an existing portfolio item on blockchain
 */
export const updatePortfolioOnBlockchain = async (walletAddress, index, newPortfolioHash) => {
  try {
    const web3 = new Web3(window.ethereum);

    // Get LOWJC contract
    const lowjcAddress = import.meta.env.VITE_LOWJC_CONTRACT_ADDRESS;
    const LOWJCABI = (await import('../ABIs/lowjc_ABI.json')).default;
    const lowjcContract = new web3.eth.Contract(LOWJCABI, lowjcAddress);

    // Get LayerZero options from env
    const lzOptions = import.meta.env.VITE_LAYERZERO_OPTIONS_VALUE || '0x000301001101000000000000000000000000000F4240';

    // Estimate gas for the transaction
    const gasEstimate = await lowjcContract.methods.updatePortfolioItem(
      index,
      newPortfolioHash,
      lzOptions
    ).estimateGas({ from: walletAddress, value: web3.utils.toWei('0.01', 'ether') });

    // Send transaction (convert BigInt properly)
    const gasWithBuffer = Math.floor(Number(gasEstimate) * 1.2);
    const tx = await lowjcContract.methods.updatePortfolioItem(
      index,
      newPortfolioHash,
      lzOptions
    ).send({
      from: walletAddress,
      value: web3.utils.toWei('0.01', 'ether'), // LayerZero fee
      gas: gasWithBuffer
    });

    console.log('✅ Portfolio updated on blockchain:', tx.transactionHash);
    return tx;
  } catch (error) {
    console.error('Error updating portfolio on blockchain:', error);
    throw error;
  }
};

/**
 * Delete a portfolio item from blockchain
 */
export const deletePortfolioFromBlockchain = async (walletAddress, index) => {
  try {
    const web3 = new Web3(window.ethereum);

    // Get LOWJC contract
    const lowjcAddress = import.meta.env.VITE_LOWJC_CONTRACT_ADDRESS;
    const LOWJCABI = (await import('../ABIs/lowjc_ABI.json')).default;
    const lowjcContract = new web3.eth.Contract(LOWJCABI, lowjcAddress);

    // Get LayerZero options from env
    const lzOptions = import.meta.env.VITE_LAYERZERO_OPTIONS_VALUE || '0x000301001101000000000000000000000000000F4240';

    // Estimate gas for the transaction
    const gasEstimate = await lowjcContract.methods.removePortfolioItem(
      index,
      lzOptions
    ).estimateGas({ from: walletAddress, value: web3.utils.toWei('0.01', 'ether') });

    // Send transaction (convert BigInt properly)
    const gasWithBuffer = Math.floor(Number(gasEstimate) * 1.2);
    const tx = await lowjcContract.methods.removePortfolioItem(
      index,
      lzOptions
    ).send({
      from: walletAddress,
      value: web3.utils.toWei('0.01', 'ether'), // LayerZero fee
      gas: gasWithBuffer
    });

    console.log('✅ Portfolio deleted from blockchain:', tx.transactionHash);
    return tx;
  } catch (error) {
    console.error('Error deleting portfolio from blockchain:', error);
    throw error;
  }
};
