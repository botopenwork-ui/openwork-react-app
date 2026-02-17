const fs = require('fs');
const path = require('path');

// Contract mapping - updated with correct class names from compiled artifacts
const contractMapping = {
  'MainDAO': { fileName: 'MainDAO.sol', className: 'MainDAO' },
  'UUPSProxy': { fileName: 'UUPSProxy.sol', className: 'UUPSProxy' },
  'VotingToken': { fileName: 'VotingToken.sol', className: 'VotingToken' },
  'NOWJC': { fileName: 'NOWJC.sol', className: 'NativeOpenWorkJobContract' },
  'NativeAthena': { fileName: 'NativeAthena.sol', className: 'NativeAthena' },
  'NativeRewards': { fileName: 'NativeRewards.sol', className: 'OpenWorkRewardsContract' },
  'NativeBridge': { fileName: 'NativeBridge.sol', className: 'NativeChainBridge' },
  'NativeDAO': { fileName: 'NativeDAO.sol', className: 'NativeDAO' },
  'OpenworkGenesis': { fileName: 'OpenworkGenesis.sol', className: 'OpenworkGenesis' },
  'ProfileGenesis': { fileName: 'ProfileGenesis.sol', className: 'ProfileGenesis' },
  'ProfileManager': { fileName: 'ProfileManager.sol', className: 'ProfileManager' },
  'OracleManager': { fileName: 'OracleManager.sol', className: 'NativeAthenaOracleManager' },
  'MainBridge': { fileName: 'MainBridge.sol', className: 'ThirdChainBridge' },
  'MainRewards': { fileName: 'MainRewards.sol', className: 'CrossChainRewardsContract' },
  'OpenworkToken': { fileName: 'OpenworkToken.sol', className: 'VotingToken' },
  'LocalBridge': { fileName: 'LocalBridge.sol', className: 'LayerZeroBridge' },
  'LOWJC': { fileName: 'LOWJC.sol', className: 'CrossChainLocalOpenWorkJobContract' },
  'AthenaClient': { fileName: 'AthenaClient.sol', className: 'LocalAthena' },
  'CCTPTransceiver': { fileName: 'CCTPTransceiver.sol', className: 'CCTPv2Transceiver' },
  'ContractRegistry': { fileName: 'ContractRegistry.sol', className: 'OpenWorkContractRegistry' },
  'GenesisReaderHelper': { fileName: 'GenesisReaderHelper.sol', className: 'GenesisReaderHelper' }
};

const contractsDir = path.join(__dirname, '../../contracts');
const outDir = path.join(contractsDir, 'out');
const outputFile = path.join(__dirname, '../data/compiled-artifacts.json');

// Ensure output directory exists
const dataDir = path.dirname(outputFile);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const artifacts = {};
let successCount = 0;
let failCount = 0;

console.log('Extracting contract artifacts...\n');

for (const [contractName, mapping] of Object.entries(contractMapping)) {
  const artifactPath = path.join(outDir, mapping.fileName, `${mapping.className}.json`);

  try {
    if (!fs.existsSync(artifactPath)) {
      console.log(`Warning: Artifact not found for ${contractName}: ${artifactPath}`);
      failCount++;
      continue;
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

    artifacts[contractName] = {
      abi: artifact.abi,
      bytecode: artifact.bytecode.object
    };

    console.log(`OK ${contractName}: ABI (${artifact.abi.length} items), Bytecode (${artifact.bytecode.object.length} chars)`);
    successCount++;
  } catch (error) {
    console.log(`Error processing ${contractName}: ${error.message}`);
    failCount++;
  }
}

// Write combined artifacts
fs.writeFileSync(outputFile, JSON.stringify(artifacts, null, 2));

const fileSizeMB = (fs.statSync(outputFile).size / 1024 / 1024).toFixed(2);

console.log(`\nArtifacts extracted: ${successCount} successful, ${failCount} failed`);
console.log(`Output: ${outputFile}`);
console.log(`File size: ${fileSizeMB} MB`);
