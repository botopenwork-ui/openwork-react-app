/**
 * Payment Store — Lightweight tx hash persistence
 *
 * Stores payment-related tx hashes in memory + a flat JSON file.
 * Zero external dependencies. Works without a database.
 *
 * Purpose: if the backend fails mid-CCTP, the user/operator can
 * call GET /api/payment-log to get the ARB tx hash and manually
 * complete the OP CCTPTransceiver.receive() call.
 *
 * Persistence:
 *   - In-memory Map  → always available within instance lifetime
 *   - /tmp/payment-log.json → survives Cloud Run warm restarts
 *   - GET /api/payment-log → user-visible recovery endpoint
 */

const fs = require('fs');
const path = require('path');

const LOG_FILE = '/tmp/payment-log.json';

// In-memory store: jobId → { ... }
const store = new Map();

// Load from file on startup
function loadFromFile() {
  try {
    if (fs.existsSync(LOG_FILE)) {
      const raw = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
      for (const [k, v] of Object.entries(raw)) store.set(k, v);
      console.log(`💾 Loaded ${store.size} payment records from ${LOG_FILE}`);
    }
  } catch (e) {
    console.warn('⚠️  Could not load payment-log.json:', e.message);
  }
}

function saveToFile() {
  try {
    const obj = Object.fromEntries(store);
    fs.writeFileSync(LOG_FILE, JSON.stringify(obj, null, 2), 'utf8');
  } catch (e) {
    console.warn('⚠️  Could not write payment-log.json:', e.message);
  }
}

/**
 * Record a payment event with its tx hash.
 * Call this as soon as any payment-related tx is detected.
 *
 * @param {string} jobId - e.g. "30111-94"
 * @param {string} event - 'startJob_burn' | 'startJob_mint' | 'release_lz' | 'release_burn' | 'release_mint'
 * @param {string} txHash - on-chain tx hash
 * @param {object} [meta] - extra context (chain, domain, amount, etc.)
 */
function recordTx(jobId, event, txHash, meta = {}) {
  const existing = store.get(jobId) || { jobId, events: [], updatedAt: null };
  existing.events.push({
    event,
    txHash,
    chain: meta.chain || '?',
    timestamp: new Date().toISOString(),
    status: 'pending',
    ...meta
  });
  existing.updatedAt = new Date().toISOString();
  store.set(jobId, existing);
  saveToFile();
  console.log(`📝 Payment tx recorded: [${jobId}] ${event} → ${txHash}`);
}

/**
 * Update the status of the latest event for a job.
 */
function updateTxStatus(jobId, event, status, completionTxHash = null) {
  const rec = store.get(jobId);
  if (!rec) return;
  const evt = [...rec.events].reverse().find(e => e.event === event);
  if (evt) {
    evt.status = status;
    if (completionTxHash) evt.completionTxHash = completionTxHash;
    evt.updatedAt = new Date().toISOString();
  }
  rec.updatedAt = new Date().toISOString();
  store.set(jobId, rec);
  saveToFile();
}

function getRecord(jobId) {
  return store.get(jobId) || null;
}

function getAllRecords() {
  return Object.fromEntries(store);
}

function getPendingRecovery() {
  const pending = [];
  for (const [jobId, rec] of store) {
    const failedOrPending = rec.events.filter(e => e.status === 'pending' || e.status === 'failed');
    if (failedOrPending.length > 0) {
      pending.push({ jobId, events: failedOrPending });
    }
  }
  return pending;
}

// Load on module init
loadFromFile();

module.exports = { recordTx, updateTxStatus, getRecord, getAllRecords, getPendingRecovery };
