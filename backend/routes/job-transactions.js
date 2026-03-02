/**
 * Job Transactions Route
 * POST /api/jobs/tx         — save a tx hash for a job action
 * GET  /api/jobs/:jobId/txs — get all tx hashes for a job
 * GET  /api/jobs/wallet/:address/txs — get all txs for a wallet
 */
'use strict';

const express = require('express');
const router  = express.Router();
const db      = require('../db/db');

// In-memory fallback when DB unavailable
const memStore = new Map();

// ── POST /api/jobs/tx ─────────────────────────────────────────────────────────
router.post('/tx', async (req, res) => {
  const { jobId, action, txHash, chainId, walletAddress, metadata } = req.body;
  if (!txHash || !action) return res.status(400).json({ success: false, error: 'txHash and action required' });

  try {
    await db.run(`
      INSERT INTO job_transactions (job_id, action, tx_hash, chain_id, wallet_address, metadata)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (tx_hash) DO NOTHING
    `, jobId || null, action, txHash, chainId || null, walletAddress || null,
       metadata ? JSON.stringify(metadata) : null);
    console.log(`💾 Saved tx: ${action} / ${jobId} → ${txHash}`);
  } catch (err) {
    console.warn('⚠️ DB unavailable for job tx save, using memory:', err.message);
    memStore.set(txHash, { jobId, action, txHash, chainId, walletAddress, metadata, createdAt: new Date().toISOString() });
  }

  res.json({ success: true });
});

// ── GET /api/jobs/:jobId/txs ──────────────────────────────────────────────────
router.get('/:jobId/txs', async (req, res) => {
  const { jobId } = req.params;
  try {
    const rows = await db.all(
      `SELECT action, tx_hash, chain_id, wallet_address, metadata, created_at
       FROM job_transactions WHERE job_id = $1 ORDER BY created_at ASC`,
      jobId
    );
    res.json({ success: true, jobId, transactions: rows });
  } catch (err) {
    console.warn('⚠️ DB unavailable, serving from memory');
    const rows = [...memStore.values()].filter(r => r.jobId === jobId);
    res.json({ success: true, jobId, transactions: rows });
  }
});

// ── GET /api/jobs/wallet/:address/txs ─────────────────────────────────────────
router.get('/wallet/:address/txs', async (req, res) => {
  const { address } = req.params;
  try {
    const rows = await db.all(
      `SELECT job_id, action, tx_hash, chain_id, metadata, created_at
       FROM job_transactions WHERE LOWER(wallet_address) = LOWER($1) ORDER BY created_at DESC LIMIT 100`,
      address
    );
    res.json({ success: true, address, transactions: rows });
  } catch (err) {
    const rows = [...memStore.values()].filter(r => r.walletAddress?.toLowerCase() === address.toLowerCase());
    res.json({ success: true, address, transactions: rows });
  }
});

module.exports = router;
