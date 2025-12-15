const Database = require('better-sqlite3');
const path = require('path');

// Use same database as deployments
const dbPath = path.join(__dirname, 'deployments.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

// Create cctp_transfers table for tracking cross-chain transfer status
const createCCTPTableSQL = `
  CREATE TABLE IF NOT EXISTS cctp_transfers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    operation TEXT NOT NULL,           -- 'startJob' | 'releasePayment' | 'settleDispute'
    job_id TEXT NOT NULL,              -- '40161-4'
    dispute_id TEXT,                   -- For settle disputes
    
    -- Transaction details
    source_tx_hash TEXT NOT NULL,      -- Original blockchain tx
    source_chain TEXT NOT NULL,        -- 'Ethereum Sepolia', 'OP Sepolia'
    source_domain INTEGER NOT NULL,    -- 0, 2, or 3
    
    -- Status tracking
    status TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'completed' | 'failed'
    step TEXT,                         -- 'polling_attestation' | 'executing_receive'
    last_error TEXT,                   -- Error message if failed
    retry_count INTEGER DEFAULT 0,
    
    -- CCTP details
    attestation_message TEXT,          -- Attestation message from Circle API
    attestation_signature TEXT,        -- Attestation signature
    completion_tx_hash TEXT,           -- Final receive() tx hash
    
    -- Timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME
  )
`;

// Execute table creation
db.exec(createCCTPTableSQL);

// Create indexes for performance
db.exec('CREATE INDEX IF NOT EXISTS idx_cctp_job_operation ON cctp_transfers(job_id, operation)');
db.exec('CREATE INDEX IF NOT EXISTS idx_cctp_status ON cctp_transfers(status)');
db.exec('CREATE INDEX IF NOT EXISTS idx_cctp_created ON cctp_transfers(created_at DESC)');

console.log('✅ CCTP transfers table initialized in database');

module.exports = db;
