const db = require('./db');

/**
 * Initialize all database tables (PostgreSQL).
 * Consolidates deployments, contract_docs, cctp_transfers, and proposals.
 */
async function initDatabase() {
  // Create deployments table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS deployments (
      id SERIAL PRIMARY KEY,
      contract_id TEXT NOT NULL,
      contract_name TEXT NOT NULL,
      address TEXT NOT NULL,
      network_name TEXT NOT NULL,
      chain_id INTEGER NOT NULL,
      deployer_address TEXT NOT NULL,
      transaction_hash TEXT,
      constructor_params TEXT,
      deployment_type TEXT DEFAULT 'standalone',
      is_proxy BOOLEAN DEFAULT FALSE,
      implementation_address TEXT,
      proxy_address TEXT,
      version TEXT,
      is_current BOOLEAN DEFAULT TRUE,
      notes TEXT,
      block_explorer_url TEXT,
      deployed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.exec('CREATE INDEX IF NOT EXISTS idx_contract_id ON deployments(contract_id)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_deployed_at ON deployments(deployed_at DESC)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_chain_id ON deployments(chain_id)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_is_current ON deployments(is_current)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_deployment_type ON deployments(deployment_type)');

  // Create contract_docs table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS contract_docs (
      id SERIAL PRIMARY KEY,
      contract_id TEXT NOT NULL UNIQUE,
      contract_name TEXT NOT NULL,
      documentation TEXT,
      contract_code TEXT,
      proxy_code TEXT,
      full_data JSONB,
      updated_by TEXT,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.exec('CREATE INDEX IF NOT EXISTS idx_docs_contract_id ON contract_docs(contract_id)');

  // Create cctp_transfers table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS cctp_transfers (
      id SERIAL PRIMARY KEY,
      operation TEXT NOT NULL,
      job_id TEXT NOT NULL,
      dispute_id TEXT,
      source_tx_hash TEXT NOT NULL,
      source_chain TEXT NOT NULL,
      source_domain INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      step TEXT,
      last_error TEXT,
      retry_count INTEGER DEFAULT 0,
      attestation_message TEXT,
      attestation_signature TEXT,
      completion_tx_hash TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      completed_at TIMESTAMPTZ
    )
  `);

  await db.exec('CREATE INDEX IF NOT EXISTS idx_cctp_job_operation ON cctp_transfers(job_id, operation)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_cctp_status ON cctp_transfers(status)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_cctp_created ON cctp_transfers(created_at DESC)');

  // Create proposals table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS proposals (
      id SERIAL PRIMARY KEY,
      proposal_id TEXT NOT NULL,
      chain TEXT NOT NULL,
      proposal_type TEXT NOT NULL,
      title TEXT,
      description TEXT,
      proposer_address TEXT NOT NULL,
      recipient_address TEXT,
      amount TEXT,
      transaction_hash TEXT NOT NULL,
      block_number INTEGER,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      metadata TEXT,
      UNIQUE(proposal_id, chain)
    )
  `);

  await db.exec('CREATE INDEX IF NOT EXISTS idx_proposal_id ON proposals(proposal_id)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_chain ON proposals(chain)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_proposal_type ON proposals(proposal_type)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_created_at ON proposals(created_at DESC)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_proposer ON proposals(proposer_address)');

  console.log('✅ Database initialized successfully (PostgreSQL)');
}

module.exports = { initDatabase };
