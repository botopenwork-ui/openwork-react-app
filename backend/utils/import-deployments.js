/**
 * Import Deployment Data from Markdown
 * 
 * This script parses contracts/openwork-contracts-current-addresses 27 nov.md
 * and imports all deployment data into the database
 */

const fs = require('fs');
const path = require('path');

// Chain ID mapping
const CHAIN_IDS = {
  'Arbitrum Sepolia': 421614,
  'OP Sepolia': 11155420,
  'Ethereum Sepolia': 11155111,
  'Base Sepolia': 84532
};

// Block explorer mapping
const EXPLORERS = {
  'Arbitrum Sepolia': 'https://sepolia.arbiscan.io',
  'OP Sepolia': 'https://sepolia-optimism.etherscan.io',
  'Ethereum Sepolia': 'https://sepolia.etherscan.io',
  'Base Sepolia': 'https://sepolia.basescan.org'
};

const DEPLOYER = '0xfD08836eeE6242092a9c869237a8d122275b024A'; // WALL2

/**
 * Parse the markdown file and extract deployment data
 */
function parseMarkdownDeployments() {
  const markdownPath = path.join(__dirname, '../../contracts/openwork-contracts-current-addresses 27 nov.md');
  const content = fs.readFileSync(markdownPath, 'utf8');
  
  const deployments = [];
  
  // Parse Base Sepolia (Main Chain) section
  const baseSection = content.match(/## Base Sepolia \(Main Chain\)([\s\S]*?)(?=##|$)/);
  console.log('Base section found:', !!baseSection);
  if (baseSection) {
    const baseDeps = parseTableSection(baseSection[1], 'Base Sepolia');
    console.log('  Base deployments parsed:', baseDeps.length);
    deployments.push(...baseDeps);
  }
  
  // Parse Arbitrum Sepolia (Native Chain) section
  const arbSection = content.match(/## Arbitrum Sepolia \(Native Chain\)([\s\S]*?)(?=##|$)/);
  console.log('Arbitrum section found:', !!arbSection);
  if (arbSection) {
    const arbDeps = parseTableSection(arbSection[1], 'Arbitrum Sepolia');
    console.log('  Arbitrum deployments parsed:', arbDeps.length);
    deployments.push(...arbDeps);
  }
  
  // Parse OP Sepolia (Local Chain) section
  const opSection = content.match(/## OP Sepolia \(Local Chain\)([\s\S]*?)(?=##|$)/);
  if (opSection) {
    deployments.push(...parseTableSection(opSection[1], 'OP Sepolia'));
  }
  
  // Parse Ethereum Sepolia (Local Chain) section
  const ethSection = content.match(/## Ethereum Sepolia \(Local Chain\)[\s\S]*?NEW DEPLOYMENT([\s\S]*?)(?=##|$)/);
  if (ethSection) {
    deployments.push(...parseTableSection(ethSection[1], 'Ethereum Sepolia'));
  }
  
  return deployments;
}

/**
 * Parse a table section and extract contract data
 */
function parseTableSection(section, network) {
  const deployments = [];
  
  // Match table rows (more flexible pattern)
  const lines = section.split('\n');
  
  lines.forEach(line => {
    // Skip empty lines and section headers
    if (!line.trim() || !line.includes('|')) return;
    
    // Skip header and separator rows
    if (line.includes('Contract') || line.includes('Address') || line.includes('---')) return;
    
    // Skip description/notes lines (not table rows with 4 columns)
    const cells = line.split('|').map(c => c.trim()).filter(c => c);
    if (cells.length < 4) return;
    
    const [contractName, rawAddress, filePath, verified] = cells;
    
    // Clean address (remove backticks and whitespace)
    const address = rawAddress.replace(/`/g, '').trim();
    
    // Skip if no address
    if (!address || address === '-' || !address.match(/^0x[a-fA-F0-9]{40}$/)) return;
    
    // Determine deployment type
    let deploymentType = 'standalone';
    let isProxy = false;
    let version = null;
    
    if (contractName.includes('(Proxy)')) {
      deploymentType = 'proxy';
      isProxy = true;
    } else if (contractName.includes('(Implementation)')) {
      deploymentType = 'implementation';
    }
    
    // Extract version from contract name
    if (contractName.includes('v2')) {
      version = 'v2';
    } else if (contractName.includes('v1')) {
      version = 'v1';
    } else if (contractName.includes('v0')) {
      version = 'v0';
    }
    
    // Determine if this is current version
    const isCurrent = !verified.includes('🔄');
    
    // Clean contract name (remove markdown bold and parenthetical notes)
    const cleanName = contractName
      .replace(/\*\*/g, '') // Remove markdown bold
      .replace(/\(Proxy\)/g, '')
      .replace(/\(Implementation[^)]*\)/g, '')
      .replace(/\(OLD[^)]*\)/g, '')
      .replace(/\(NEW[^)]*\)/g, '')
      .replace(/\(Previous[^)]*\)/g, '')
      .trim();
    
    // Generate contract ID
    const contractId = cleanName.toLowerCase().replace(/\s+/g, '-');
    
    // Build deployment object
    const deployment = {
      contractId,
      contractName: cleanName,
      address,
      networkName: network,
      chainId: CHAIN_IDS[network],
      deployerAddress: DEPLOYER,
      transactionHash: null,
      deploymentType,
      isProxy,
      implementationAddress: null,
      proxyAddress: null,
      version,
      isCurrent,
      notes: contractName.includes('OLD') ? 'Previous version' : null,
      blockExplorerUrl: `${EXPLORERS[network]}/address/${address}`,
      deployedAt: '2025-10-27T00:00:00.000Z' // Default date from filename
    };
    
    deployments.push(deployment);
  });
  
  return deployments;
}

/**
 * Link proxy and implementation addresses
 */
function linkProxyImplementations(deployments) {
  // Group by contract name and network
  const grouped = {};
  
  deployments.forEach(dep => {
    const key = `${dep.contractName}-${dep.networkName}`;
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(dep);
  });
  
  // Link proxies to implementations
  Object.values(grouped).forEach(group => {
    const proxies = group.filter(d => d.deploymentType === 'proxy');
    const implementations = group.filter(d => d.deploymentType === 'implementation');
    
    // If we have both proxy and implementation
    if (proxies.length > 0 && implementations.length > 0) {
      // Find current versions
      const currentProxy = proxies.find(p => p.isCurrent);
      const currentImpl = implementations.find(i => i.isCurrent);
      
      if (currentProxy && currentImpl) {
        // Link them
        currentProxy.implementationAddress = currentImpl.address;
        currentImpl.proxyAddress = currentProxy.address;
      }
    }
  });
  
  return deployments;
}

/**
 * Import deployments into database
 */
async function importToDatabase(deployments) {
  const db = require('../db/init');
  
  console.log(`\n📦 Importing ${deployments.length} deployments...\n`);
  
  const insert = db.prepare(`
    INSERT OR REPLACE INTO deployments (
      contract_id, contract_name, address, network_name, 
      chain_id, deployer_address, transaction_hash,
      deployment_type, is_proxy, implementation_address, proxy_address,
      version, is_current, notes, block_explorer_url, deployed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  let success = 0;
  let failed = 0;
  
  deployments.forEach(dep => {
    try {
      // Mark other deployments of same contract as not current
      if (dep.isCurrent) {
        db.prepare(`
          UPDATE deployments 
          SET is_current = 0 
          WHERE contract_id = ? AND network_name = ? AND address != ?
        `).run(dep.contractId, dep.networkName, dep.address);
      }
      
      insert.run(
        dep.contractId,
        dep.contractName,
        dep.address,
        dep.networkName,
        dep.chainId,
        dep.deployerAddress,
        dep.transactionHash,
        dep.deploymentType,
        dep.isProxy ? 1 : 0,
        dep.implementationAddress,
        dep.proxyAddress,
        dep.version,
        dep.isCurrent ? 1 : 0,
        dep.notes,
        dep.blockExplorerUrl,
        dep.deployedAt
      );
      
      console.log(`✅ ${dep.contractName} on ${dep.networkName}`);
      success++;
    } catch (error) {
      console.error(`❌ Failed to import ${dep.contractName}:`, error.message);
      failed++;
    }
  });
  
  console.log(`\n📊 Import complete: ${success} succeeded, ${failed} failed\n`);
  
  // Show summary by network
  const summary = db.prepare(`
    SELECT network_name, COUNT(*) as count
    FROM deployments
    WHERE is_current = 1
    GROUP BY network_name
  `).all();
  
  console.log('📋 Current Deployments by Network:');
  summary.forEach(row => {
    console.log(`   ${row.network_name}: ${row.count} contracts`);
  });
  
  const total = db.prepare(`
    SELECT COUNT(*) as count FROM deployments WHERE is_current = 1
  `).get();
  console.log(`   Total: ${total.count} contracts\n`);
}

/**
 * Main execution
 */
function main() {
  console.log('🚀 Starting deployment import from markdown...\n');
  
  try {
    // Parse markdown
    console.log('📖 Parsing markdown file...');
    let deployments = parseMarkdownDeployments();
    console.log(`   Found ${deployments.length} deployments\n`);
    
    // Link proxies and implementations
    console.log('🔗 Linking proxies and implementations...');
    deployments = linkProxyImplementations(deployments);
    console.log('   Linked successfully\n');
    
    // Import to database
    importToDatabase(deployments);
    
    console.log('✅ Import completed successfully!\n');
    
  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { parseMarkdownDeployments, importToDatabase };
