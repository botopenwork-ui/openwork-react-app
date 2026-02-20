/**
 * CCTP Storage Utility
 *
 * Database operations for tracking CCTP transfer status.
 * Provides persistent storage for monitoring cross-chain transfers.
 */

const db = require('../db/db');

/**
 * Save a new CCTP transfer record
 * @param {string} operation - 'startJob' | 'releasePayment' | 'settleDispute'
 * @param {string} jobId - Job ID (e.g., '40161-4')
 * @param {string} sourceTxHash - Original blockchain transaction hash
 * @param {string} sourceChain - Source chain name (e.g., 'Ethereum Sepolia')
 * @param {number} sourceDomain - CCTP domain (0, 2, or 3)
 * @param {string} disputeId - Optional dispute ID for settle operations
 * @returns {object} Insert result with lastInsertRowid
 */
async function saveCCTPTransfer(operation, jobId, sourceTxHash, sourceChain, sourceDomain, disputeId = null) {
  const result = await db.run(`
    INSERT INTO cctp_transfers (
      operation, job_id, dispute_id, source_tx_hash, source_chain, source_domain, status, step
    )
    VALUES ($1, $2, $3, $4, $5, $6, 'pending', 'initiated')
  `, operation, jobId, disputeId, sourceTxHash, sourceChain, sourceDomain);

  console.log(`💾 Saved CCTP transfer to DB: ${operation} for ${jobId} (ID: ${result.lastInsertRowid})`);

  return result;
}

/**
 * Update CCTP transfer status
 * @param {string} jobId - Job ID
 * @param {string} operation - Operation type
 * @param {object} updates - Fields to update
 * @returns {object} Update result
 */
async function updateCCTPStatus(jobId, operation, updates) {
  const fields = [];
  const values = [];

  if (updates.status !== undefined) {
    fields.push(`status = $${values.length + 1}`);
    values.push(updates.status);
    if (updates.status === 'completed') fields.push(`completed_at = CURRENT_TIMESTAMP`);
  }
  if (updates.step)              { fields.push(`step = $${values.length + 1}`);               values.push(updates.step); }
  if (updates.lastError)         { fields.push(`last_error = $${values.length + 1}`);         values.push(updates.lastError); }
  if (updates.completionTxHash)  { fields.push(`completion_tx_hash = $${values.length + 1}`); values.push(updates.completionTxHash); }
  if (updates.attestationMessage){ fields.push(`attestation_message = $${values.length + 1}`);values.push(updates.attestationMessage); }
  if (updates.attestationSignature){fields.push(`attestation_signature = $${values.length+1}`);values.push(updates.attestationSignature); }
  if (updates.incrementRetry)      fields.push(`retry_count = retry_count + 1`);

  fields.push(`updated_at = CURRENT_TIMESTAMP`);

  values.push(jobId, operation);
  const result = await db.run(`
    UPDATE cctp_transfers
    SET ${fields.join(', ')}
    WHERE job_id = $${values.length - 1} AND operation = $${values.length}
  `, ...values);

  if (result.changes > 0) {
    console.log(`💾 Updated CCTP status for ${operation}/${jobId}:`, Object.keys(updates).join(', '));
  }

  return result;
}

/**
 * Get CCTP transfer status by jobId + operation
 * @param {string} jobId - Job ID
 * @param {string} operation - Operation type
 * @returns {object|null} Status record or null
 */
async function getCCTPStatus(jobId, operation) {
  return await db.get(`
    SELECT * FROM cctp_transfers
    WHERE job_id = $1 AND operation = $2
    ORDER BY created_at DESC
    LIMIT 1
  `, jobId, operation);
}

/**
 * Get CCTP transfer status by source tx hash (for lockMilestone per-tx tracking)
 * @param {string} sourceTxHash - Source transaction hash
 * @returns {object|null} Status record or null
 */
async function getCCTPStatusByTxHash(sourceTxHash) {
  return await db.get(`
    SELECT * FROM cctp_transfers
    WHERE source_tx_hash = $1
    ORDER BY created_at DESC
    LIMIT 1
  `, sourceTxHash);
}

/**
 * Save or update a CCTP transfer using source_tx_hash as the unique key.
 * Use this for lockMilestone to avoid overwriting previous lock records on the same job.
 * @param {string} operation
 * @param {string} jobId
 * @param {string} sourceTxHash
 * @param {string} sourceChain
 * @param {number} sourceDomain
 * @param {string} [disputeId]
 */
async function saveCCTPTransferByTxHash(operation, jobId, sourceTxHash, sourceChain, sourceDomain, disputeId = null) {
  const result = await db.run(`
    INSERT INTO cctp_transfers
      (operation, job_id, dispute_id, source_tx_hash, source_chain, source_domain, status, step)
    VALUES ($1, $2, $3, $4, $5, $6, 'pending', 'initiated')
    ON CONFLICT (source_tx_hash, operation) DO UPDATE SET
      updated_at = CURRENT_TIMESTAMP
  `, operation, jobId, disputeId, sourceTxHash, sourceChain, sourceDomain);

  console.log(`💾 Saved CCTP transfer (by txHash) to DB: ${operation} for ${jobId}`);
  return result;
}

/**
 * Update CCTP transfer status by source tx hash (for lockMilestone per-tx updates)
 */
async function updateCCTPStatusByTxHash(sourceTxHash, operation, updates) {
  const fields = [];
  const values = [];

  if (updates.status !== undefined) {
    fields.push(`status = $${values.length + 1}`);
    values.push(updates.status);
    if (updates.status === 'completed') fields.push(`completed_at = CURRENT_TIMESTAMP`);
  }
  if (updates.step)              { fields.push(`step = $${values.length + 1}`);               values.push(updates.step); }
  if (updates.lastError)         { fields.push(`last_error = $${values.length + 1}`);         values.push(updates.lastError); }
  if (updates.completionTxHash)  { fields.push(`completion_tx_hash = $${values.length + 1}`); values.push(updates.completionTxHash); }
  if (updates.attestationMessage){ fields.push(`attestation_message = $${values.length + 1}`);values.push(updates.attestationMessage); }
  if (updates.attestationSignature){fields.push(`attestation_signature = $${values.length+1}`);values.push(updates.attestationSignature); }
  if (updates.incrementRetry)      fields.push(`retry_count = retry_count + 1`);

  fields.push(`updated_at = CURRENT_TIMESTAMP`);

  values.push(sourceTxHash, operation);
  const result = await db.run(`
    UPDATE cctp_transfers
    SET ${fields.join(', ')}
    WHERE source_tx_hash = $${values.length - 1} AND operation = $${values.length}
  `, ...values);

  return result;
}

async function getPendingTransfers() {
  return await db.all(`
    SELECT * FROM cctp_transfers
    WHERE status = 'pending'
    ORDER BY created_at ASC
  `);
}

async function getFailedTransfers() {
  return await db.all(`
    SELECT * FROM cctp_transfers
    WHERE status = 'failed'
    ORDER BY created_at ASC
  `);
}

async function cleanupOldRecords() {
  const result = await db.run(`
    DELETE FROM cctp_transfers
    WHERE status = 'completed'
    AND completed_at < NOW() - INTERVAL '7 days'
  `);

  if (result.changes > 0) {
    console.log(`🧹 Cleaned up ${result.changes} old CCTP records`);
  }

  return result.changes;
}

module.exports = {
  saveCCTPTransfer,
  saveCCTPTransferByTxHash,
  updateCCTPStatus,
  updateCCTPStatusByTxHash,
  getCCTPStatus,
  getCCTPStatusByTxHash,
  getPendingTransfers,
  getFailedTransfers,
  cleanupOldRecords
};
