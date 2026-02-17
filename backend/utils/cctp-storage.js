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
    VALUES (?, ?, ?, ?, ?, ?, 'pending', 'initiated')
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
    fields.push('status = ?');
    values.push(updates.status);

    // Set completed_at when status becomes 'completed'
    if (updates.status === 'completed') {
      fields.push('completed_at = CURRENT_TIMESTAMP');
    }
  }

  if (updates.step) { fields.push('step = ?'); values.push(updates.step); }
  if (updates.lastError) { fields.push('last_error = ?'); values.push(updates.lastError); }
  if (updates.completionTxHash) { fields.push('completion_tx_hash = ?'); values.push(updates.completionTxHash); }
  if (updates.attestationMessage) { fields.push('attestation_message = ?'); values.push(updates.attestationMessage); }
  if (updates.attestationSignature) { fields.push('attestation_signature = ?'); values.push(updates.attestationSignature); }
  if (updates.incrementRetry) { fields.push('retry_count = retry_count + 1'); }

  // Always update timestamp
  fields.push('updated_at = CURRENT_TIMESTAMP');

  const result = await db.run(`
    UPDATE cctp_transfers
    SET ${fields.join(', ')}
    WHERE job_id = ? AND operation = ?
  `, ...values, jobId, operation);

  if (result.changes > 0) {
    console.log(`💾 Updated CCTP status for ${operation}/${jobId}:`, Object.keys(updates).join(', '));
  }

  return result;
}

/**
 * Get CCTP transfer status
 * @param {string} jobId - Job ID
 * @param {string} operation - Operation type
 * @returns {object|null} Status record or null
 */
async function getCCTPStatus(jobId, operation) {
  return await db.get(`
    SELECT * FROM cctp_transfers
    WHERE job_id = ? AND operation = ?
    ORDER BY created_at DESC
    LIMIT 1
  `, jobId, operation);
}

/**
 * Get all pending CCTP transfers (for monitoring/cleanup)
 * @returns {array} Array of pending transfer records
 */
async function getPendingTransfers() {
  return await db.all(`
    SELECT * FROM cctp_transfers
    WHERE status = 'pending'
    ORDER BY created_at ASC
  `);
}

/**
 * Get all failed CCTP transfers (for retry queue)
 * @returns {array} Array of failed transfer records
 */
async function getFailedTransfers() {
  return await db.all(`
    SELECT * FROM cctp_transfers
    WHERE status = 'failed'
    ORDER BY created_at ASC
  `);
}

/**
 * Clean up old completed records (older than 7 days)
 * @returns {number} Number of records deleted
 */
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
  updateCCTPStatus,
  getCCTPStatus,
  getPendingTransfers,
  getFailedTransfers,
  cleanupOldRecords
};
