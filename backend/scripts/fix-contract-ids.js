/**
 * Migration script to fix contract IDs in the database
 * Converts kebab-case with asterisks to camelCase
 *
 * Run: node backend/scripts/fix-contract-ids.js
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../db/deployments.db');
const db = new Database(dbPath);

console.log('🔧 Fixing contract IDs in database...\n');

// Show current state
const before = db.prepare('SELECT DISTINCT contract_id FROM deployments ORDER BY contract_id').all();
console.log('Before:', before.map(r => r.contract_id).join(', '));
console.log('');

// Fix contract IDs (remove asterisks and convert to camelCase)
const updates = [
  { pattern: '%main-dao%', newId: 'mainDAO' },
  { pattern: '%native-dao%', newId: 'nativeDAO' },
  { pattern: '%native-athena%', newId: 'nativeAthena' },
  { pattern: '%native-bridge%', newId: 'nativeBridge' },
  { pattern: '%main-chain-bridge%', newId: 'mainBridge' },
  { pattern: '%cross-chain-rewards%', newId: 'mainRewards' },
  { pattern: '%oracle-manager%', newId: 'oracleManager' },
  { pattern: '%nowjc%', newId: 'nowjc' },
];

// Network-specific updates
const networkUpdates = [
  { pattern: '%native-rewards%', newId: 'nativeRewards' },
  { pattern: '%athena-client%', network: '%OP%', newId: 'athenaClientOp' },
  { pattern: '%athena-client%', network: '%Ethereum%', newId: 'athenaClientEth' },
  { pattern: '%local-bridge%', network: '%OP%', newId: 'localBridgeOp' },
  { pattern: '%local-bridge%', network: '%Ethereum%', newId: 'localBridgeEth' },
  { pattern: '%lowjc%', network: '%OP%', newId: 'lowjcOp' },
  { pattern: '%lowjc%', network: '%Ethereum%', newId: 'lowjcEth' },
  { pattern: '%cctpv2%', newId: 'cctpTransceiver' },
];

// Run simple updates
for (const { pattern, newId } of updates) {
  const result = db.prepare(`UPDATE deployments SET contract_id = ? WHERE contract_id LIKE ?`).run(newId, pattern);
  if (result.changes > 0) {
    console.log(`✅ Updated ${result.changes} rows: ${pattern} → ${newId}`);
  }
}

// Run network-specific updates
for (const { pattern, network, newId } of networkUpdates) {
  let result;
  if (network) {
    result = db.prepare(`UPDATE deployments SET contract_id = ? WHERE contract_id LIKE ? AND network_name LIKE ?`).run(newId, pattern, network);
  } else {
    result = db.prepare(`UPDATE deployments SET contract_id = ? WHERE contract_id LIKE ?`).run(newId, pattern);
  }
  if (result.changes > 0) {
    console.log(`✅ Updated ${result.changes} rows: ${pattern}${network ? ` (${network})` : ''} → ${newId}`);
  }
}

// Clean up contract_name (remove asterisks)
const cleanNames = db.prepare(`UPDATE deployments SET contract_name = REPLACE(REPLACE(contract_name, '**', ''), '*', '')`).run();
if (cleanNames.changes > 0) {
  console.log(`✅ Cleaned asterisks from ${cleanNames.changes} contract names`);
}

console.log('');

// Show final state
const after = db.prepare('SELECT DISTINCT contract_id FROM deployments ORDER BY contract_id').all();
console.log('After:', after.map(r => r.contract_id).join(', '));

console.log('\n✅ Migration complete!');
