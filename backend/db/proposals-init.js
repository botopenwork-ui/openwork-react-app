const Database = require('better-sqlite3');
const path = require('path');

// Use the same database file
const dbPath = path.join(__dirname, 'deployments.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

// Create proposals table
const createProposalsTableSQL = `
  CREATE TABLE IF NOT EXISTS proposals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proposal_id TEXT NOT NULL UNIQUE,
    chain TEXT NOT NULL,
    proposal_type TEXT NOT NULL,
    title TEXT,
    description TEXT,
    proposer_address TEXT NOT NULL,
    recipient_address TEXT,
    amount TEXT,
    transaction_hash TEXT NOT NULL,
    block_number INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    metadata TEXT,
    UNIQUE(proposal_id, chain)
  )
`;

db.exec(createProposalsTableSQL);

// Create indexes for performance
db.exec('CREATE INDEX IF NOT EXISTS idx_proposal_id ON proposals(proposal_id)');
db.exec('CREATE INDEX IF NOT EXISTS idx_chain ON proposals(chain)');
db.exec('CREATE INDEX IF NOT EXISTS idx_proposal_type ON proposals(proposal_type)');
db.exec('CREATE INDEX IF NOT EXISTS idx_created_at ON proposals(created_at DESC)');
db.exec('CREATE INDEX IF NOT EXISTS idx_proposer ON proposals(proposer_address)');

console.log('✅ Proposals table initialized successfully');

module.exports = db;
