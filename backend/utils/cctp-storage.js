/**
 * CCTP Storage Utility
 *
 * Database operations for tracking CCTP transfer status.
 * DB is OPTIONAL — all functions degrade gracefully when DB is unavailable.
 * CCTP relay logic continues uninterrupted without a database.
 */

const db = require('../db/db');

// In-memory fallback when DB is unavailable
const memStore = new Map();

function dbWarn(fn, err) {
  console.warn(`⚠️  DB unavailable (${fn}): ${err.message} — continuing without persistence`);
}

async function saveCCTPTransfer(operation, jobId, sourceTxHash, sourceChain, sourceDomain, disputeId = null) {
  try {
    const result = await db.run(`
      INSERT INTO cctp_transfers (operation, job_id, dispute_id, source_tx_hash, source_chain, source_domain, status, step)
      VALUES ($1, $2, $3, $4, $5, $6, 'pending', 'initiated')
    `, operation, jobId, disputeId, sourceTxHash, sourceChain, sourceDomain);
    console.log(`💾 Saved CCTP transfer: ${operation} for ${jobId}`);
    return result;
  } catch (err) {
    dbWarn('saveCCTPTransfer', err);
    memStore.set(`${operation}:${jobId}`, { operation, jobId, sourceTxHash, status: 'pending', step: 'initiated' });
    return { lastInsertRowid: null };
  }
}

async function updateCCTPStatus(jobId, operation, updates) {
  try {
    const fields = [];
    const values = [];
    if (updates.status !== undefined) {
      fields.push(`status = $${values.length + 1}`); values.push(updates.status);
      if (updates.status === 'completed') fields.push(`completed_at = CURRENT_TIMESTAMP`);
    }
    if (updates.step)               { fields.push(`step = $${values.length + 1}`);                values.push(updates.step); }
    if (updates.lastError)          { fields.push(`last_error = $${values.length + 1}`);          values.push(updates.lastError); }
    if (updates.completionTxHash)   { fields.push(`completion_tx_hash = $${values.length + 1}`);  values.push(updates.completionTxHash); }
    if (updates.attestationMessage) { fields.push(`attestation_message = $${values.length + 1}`); values.push(updates.attestationMessage); }
    if (updates.attestationSignature){ fields.push(`attestation_signature = $${values.length+1}`);values.push(updates.attestationSignature); }
    if (updates.incrementRetry)       fields.push(`retry_count = retry_count + 1`);
    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(jobId, operation);
    const result = await db.run(`UPDATE cctp_transfers SET ${fields.join(', ')} WHERE job_id = $${values.length-1} AND operation = $${values.length}`, ...values);
    if (result.changes > 0) console.log(`💾 Updated CCTP status: ${operation}/${jobId} →`, Object.keys(updates).join(', '));
    return result;
  } catch (err) {
    dbWarn('updateCCTPStatus', err);
    const key = `${operation}:${jobId}`;
    memStore.set(key, { ...(memStore.get(key) || {}), ...updates });
    return { changes: 0 };
  }
}

async function getCCTPStatus(jobId, operation) {
  try {
    return await db.get(`SELECT * FROM cctp_transfers WHERE job_id = $1 AND operation = $2 ORDER BY created_at DESC LIMIT 1`, jobId, operation);
  } catch (err) {
    dbWarn('getCCTPStatus', err);
    return memStore.get(`${operation}:${jobId}`) || null;
  }
}

async function getCCTPStatusByTxHash(sourceTxHash) {
  try {
    return await db.get(`SELECT * FROM cctp_transfers WHERE source_tx_hash = $1 ORDER BY created_at DESC LIMIT 1`, sourceTxHash);
  } catch (err) {
    dbWarn('getCCTPStatusByTxHash', err);
    return null;
  }
}

async function saveCCTPTransferByTxHash(operation, jobId, sourceTxHash, sourceChain, sourceDomain, disputeId = null) {
  try {
    const result = await db.run(`
      INSERT INTO cctp_transfers (operation, job_id, dispute_id, source_tx_hash, source_chain, source_domain, status, step)
      VALUES ($1, $2, $3, $4, $5, $6, 'pending', 'initiated')
      ON CONFLICT (source_tx_hash, operation) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
    `, operation, jobId, disputeId, sourceTxHash, sourceChain, sourceDomain);
    console.log(`💾 Saved CCTP transfer (by txHash): ${operation} for ${jobId}`);
    return result;
  } catch (err) {
    dbWarn('saveCCTPTransferByTxHash', err);
    memStore.set(`${operation}:tx:${sourceTxHash}`, { operation, jobId, sourceTxHash, status: 'pending' });
    return { lastInsertRowid: null };
  }
}

async function updateCCTPStatusByTxHash(sourceTxHash, operation, updates) {
  try {
    const fields = [];
    const values = [];
    if (updates.status !== undefined) {
      fields.push(`status = $${values.length + 1}`); values.push(updates.status);
      if (updates.status === 'completed') fields.push(`completed_at = CURRENT_TIMESTAMP`);
    }
    if (updates.step)               { fields.push(`step = $${values.length + 1}`);                values.push(updates.step); }
    if (updates.lastError)          { fields.push(`last_error = $${values.length + 1}`);          values.push(updates.lastError); }
    if (updates.completionTxHash)   { fields.push(`completion_tx_hash = $${values.length + 1}`);  values.push(updates.completionTxHash); }
    if (updates.attestationMessage) { fields.push(`attestation_message = $${values.length + 1}`); values.push(updates.attestationMessage); }
    if (updates.attestationSignature){ fields.push(`attestation_signature = $${values.length+1}`);values.push(updates.attestationSignature); }
    if (updates.incrementRetry)       fields.push(`retry_count = retry_count + 1`);
    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(sourceTxHash, operation);
    return await db.run(`UPDATE cctp_transfers SET ${fields.join(', ')} WHERE source_tx_hash = $${values.length-1} AND operation = $${values.length}`, ...values);
  } catch (err) {
    dbWarn('updateCCTPStatusByTxHash', err);
    const key = `${operation}:tx:${sourceTxHash}`;
    memStore.set(key, { ...(memStore.get(key) || {}), ...updates });
    return { changes: 0 };
  }
}

async function getPendingTransfers() {
  try {
    return await db.all(`SELECT * FROM cctp_transfers WHERE status = 'pending' ORDER BY created_at ASC`);
  } catch (err) {
    dbWarn('getPendingTransfers', err);
    return [];
  }
}

async function getFailedTransfers() {
  try {
    return await db.all(`SELECT * FROM cctp_transfers WHERE status = 'failed' ORDER BY created_at ASC`);
  } catch (err) {
    dbWarn('getFailedTransfers', err);
    return [];
  }
}

async function cleanupOldRecords() {
  try {
    const result = await db.run(`DELETE FROM cctp_transfers WHERE status = 'completed' AND completed_at < NOW() - INTERVAL '7 days'`);
    if (result.changes > 0) console.log(`🧹 Cleaned up ${result.changes} old CCTP records`);
    return result.changes;
  } catch (err) {
    dbWarn('cleanupOldRecords', err);
    return 0;
  }
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
