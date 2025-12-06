const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Compile a Solidity contract using Foundry
 * @param {string} contractName - Name of the contract (e.g., 'VotingToken')
 * @returns {Promise<{abi: Array, bytecode: string}>}
 */
async function compileContract(contractName) {
  try {
    console.log(`📦 Compiling contract: ${contractName}...`);
    
    // Path to contracts directory
    const contractsDir = path.join(__dirname, '../../contracts');
    
    // Map contract names to their actual file names and paths
    const contractMapping = {
      // Test/Example contracts
      'MainDAO': {
        fileName: 'MainDAO.sol',
        className: 'MainDAO',
        subDir: null
      },
      'UUPSProxy': {
        fileName: 'UUPSProxy.sol',
        className: 'UUPSProxy',
        subDir: null
      },
      'VotingToken': {
        fileName: 'VotingToken.sol',
        className: 'VotingToken',
        subDir: null
      },
      
      // Native Chain Contracts (Arbitrum)
      'NOWJC': {
        fileName: 'NOWJC.sol',
        className: 'NativeOpenWorkJobContract',
        subDir: null
      },
      'NativeAthena': {
        fileName: 'NativeAthena.sol',
        className: 'NativeAthena',
        subDir: null
      },
      'NativeRewards': {
        fileName: 'NativeRewards.sol',
        className: 'OpenWorkRewards',
        subDir: null
      },
      'NativeBridge': {
        fileName: 'NativeBridge.sol',
        className: 'NativeBridge',
        subDir: null
      },
      'NativeDAO': {
        fileName: 'NativeDAO.sol',
        className: 'NativeDAO',
        subDir: null
      },
      'OpenworkGenesis': {
        fileName: 'OpenworkGenesis.sol',
        className: 'OpenworkGenesis',
        subDir: null
      },
      'ProfileGenesis': {
        fileName: 'ProfileGenesis.sol',
        className: 'ProfileGenesis',
        subDir: null
      },
      'ProfileManager': {
        fileName: 'ProfileManager.sol',
        className: 'ProfileManager',
        subDir: null
      },
      'OracleManager': {
        fileName: 'OracleManager.sol',
        className: 'OracleManager',
        subDir: null
      },
      
      // Main Chain Contracts (Base/Ethereum)
      'MainBridge': {
        fileName: 'MainBridge.sol',
        className: 'MainBridge',
        subDir: null
      },
      'MainRewards': {
        fileName: 'MainRewards.sol',
        className: 'MainRewards',
        subDir: null
      },
      'OpenworkToken': {
        fileName: 'OpenworkToken.sol',
        className: 'OpenWorkToken',
        subDir: null
      },
      
      // Local Chain Contracts (OP/ETH)
      'LocalBridge': {
        fileName: 'LocalBridge.sol',
        className: 'LocalBridge',
        subDir: null
      },
      'LOWJC': {
        fileName: 'LOWJC.sol',
        className: 'LocalOpenWorkJobContract',
        subDir: null
      },
      'AthenaClient': {
        fileName: 'AthenaClient.sol',
        className: 'AthenaClient',
        subDir: null
      },
      
      // Infrastructure Contracts
      'CCTPTransceiver': {
        fileName: 'CCTPTransceiver.sol',
        className: 'CCTPTransceiver',
        subDir: null
      },
      'ContractRegistry': {
        fileName: 'ContractRegistry.sol',
        className: 'OpenWorkContractRegistry',
        subDir: null
      },
      'GenesisReaderHelper': {
        fileName: 'GenesisReaderHelper.sol',
        className: 'GenesisReaderHelper',
        subDir: null
      }
    };
    
    const mapping = contractMapping[contractName];
    if (!mapping) {
      throw new Error(`Unknown contract: ${contractName}. Add mapping in compiler.js`);
    }
    
    // Run forge build
    execSync('forge build', { 
      cwd: contractsDir,
      stdio: 'pipe'
    });
    
    console.log('✅ Compilation successful');
    
    // Determine artifact path - always use className from mapping
    const artifactPath = path.join(
      contractsDir,
      'out',
      mapping.fileName,
      `${mapping.className}.json`
    );
    
    console.log(`📂 Looking for artifact at: ${artifactPath}`);
    
    if (!fs.existsSync(artifactPath)) {
      throw new Error(`Artifact not found: ${artifactPath}`);
    }
    
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    
    // Extract ABI and bytecode
    const abi = artifact.abi;
    const bytecode = artifact.bytecode.object;
    
    if (!bytecode || bytecode === '0x') {
      throw new Error('No bytecode generated. Contract may be abstract or have errors.');
    }
    
    console.log(`✅ Extracted ABI (${abi.length} items) and bytecode (${bytecode.length} chars)`);
    
    return {
      abi,
      bytecode
    };
    
  } catch (error) {
    console.error('❌ Compilation failed:', error.message);
    throw error;
  }
}

module.exports = {
  compileContract
};
