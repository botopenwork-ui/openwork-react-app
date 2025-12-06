const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Ensure db directory exists
const dbDir = path.join(__dirname);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize database
const dbPath = path.join(dbDir, 'deployments.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

// Create deployments table
const createTableSQL = `
  CREATE TABLE IF NOT EXISTS deployments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contract_id TEXT NOT NULL,
    contract_name TEXT NOT NULL,
    address TEXT NOT NULL,
    network_name TEXT NOT NULL,
    chain_id INTEGER NOT NULL,
    deployer_address TEXT NOT NULL,
    transaction_hash TEXT,
    constructor_params TEXT,
    deployment_type TEXT DEFAULT 'standalone',
    is_proxy BOOLEAN DEFAULT 0,
    implementation_address TEXT,
    proxy_address TEXT,
    version TEXT,
    is_current BOOLEAN DEFAULT 1,
    notes TEXT,
    block_explorer_url TEXT,
    deployed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`;

db.exec(createTableSQL);

// Add new columns to existing table if they don't exist
const addColumnsSQL = `
  ALTER TABLE deployments ADD COLUMN deployment_type TEXT DEFAULT 'standalone';
  ALTER TABLE deployments ADD COLUMN is_proxy BOOLEAN DEFAULT 0;
  ALTER TABLE deployments ADD COLUMN implementation_address TEXT;
  ALTER TABLE deployments ADD COLUMN proxy_address TEXT;
  ALTER TABLE deployments ADD COLUMN version TEXT;
  ALTER TABLE deployments ADD COLUMN is_current BOOLEAN DEFAULT 1;
  ALTER TABLE deployments ADD COLUMN notes TEXT;
  ALTER TABLE deployments ADD COLUMN block_explorer_url TEXT;
`;

// Try to add columns (will fail silently if they already exist)
const alterStatements = addColumnsSQL.split(';').filter(s => s.trim());
alterStatements.forEach(statement => {
  try {
    db.exec(statement);
  } catch (error) {
    // Column already exists, ignore
  }
});

// Create indexes for performance
db.exec('CREATE INDEX IF NOT EXISTS idx_contract_id ON deployments(contract_id)');
db.exec('CREATE INDEX IF NOT EXISTS idx_deployed_at ON deployments(deployed_at DESC)');
db.exec('CREATE INDEX IF NOT EXISTS idx_chain_id ON deployments(chain_id)');
db.exec('CREATE INDEX IF NOT EXISTS idx_is_current ON deployments(is_current)');
db.exec('CREATE INDEX IF NOT EXISTS idx_deployment_type ON deployments(deployment_type)');

// Create contract_docs table for editable documentation
const createDocsTableSQL = `
  CREATE TABLE IF NOT EXISTS contract_docs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contract_id TEXT NOT NULL UNIQUE,
    contract_name TEXT NOT NULL,
    documentation TEXT,
    contract_code TEXT,
    proxy_code TEXT,
    full_data JSON,
    updated_by TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`;

db.exec(createDocsTableSQL);

// Add full_data column if it doesn't exist
try {
  db.exec('ALTER TABLE contract_docs ADD COLUMN full_data JSON');
} catch (error) {
  // Column already exists
}

db.exec('CREATE INDEX IF NOT EXISTS idx_docs_contract_id ON contract_docs(contract_id)');

console.log('✅ Database initialized successfully at:', dbPath);

module.exports = db;
