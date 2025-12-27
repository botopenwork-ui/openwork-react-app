const fs = require('fs');
const path = require('path');

// Load pre-compiled artifacts
const artifactsPath = path.join(__dirname, '../data/compiled-artifacts.json');
let precompiledArtifacts = null;

function loadArtifacts() {
  if (precompiledArtifacts) return precompiledArtifacts;

  if (!fs.existsSync(artifactsPath)) {
    throw new Error('Pre-compiled artifacts not found. Run: node scripts/extract-artifacts.js');
  }

  precompiledArtifacts = JSON.parse(fs.readFileSync(artifactsPath, 'utf8'));
  console.log(`📦 Loaded ${Object.keys(precompiledArtifacts).length} pre-compiled contracts`);
  return precompiledArtifacts;
}

/**
 * Get pre-compiled contract artifact
 * @param {string} contractName - Name of the contract (e.g., 'VotingToken')
 * @returns {Promise<{abi: Array, bytecode: string}>}
 */
async function compileContract(contractName) {
  try {
    console.log(`📦 Loading pre-compiled artifact: ${contractName}...`);

    const artifacts = loadArtifacts();

    if (!artifacts[contractName]) {
      const available = Object.keys(artifacts).join(', ');
      throw new Error(`Unknown contract: ${contractName}. Available: ${available}`);
    }

    const { abi, bytecode } = artifacts[contractName];

    if (!bytecode || bytecode === '0x') {
      throw new Error('No bytecode in pre-compiled artifact. Contract may be abstract.');
    }

    console.log(`✅ Loaded ABI (${abi.length} items) and bytecode (${bytecode.length} chars)`);

    return { abi, bytecode };

  } catch (error) {
    console.error('❌ Failed to load artifact:', error.message);
    throw error;
  }
}

module.exports = {
  compileContract
};
