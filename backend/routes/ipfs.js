const express = require('express');
const router = express.Router();
const multer = require('multer');
const FormData = require('form-data');
const fetch = require('node-fetch');

// Configure multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

/**
 * Upload a file to IPFS.
 *
 * Strategy (in priority order):
 *   1. Pinata REST API         — if PINATA_JWT is set (preferred, no infra needed)
 *   2. Self-hosted IPFS proxy  — if IPFS_API_URL + IPFS_PROXY_SECRET are set
 *   3. Error                   — neither configured
 *
 * Response format: { success: true, IpfsHash: "Qm...", PinSize: 12345, Timestamp: "..." }
 */
async function uploadToIPFS(buffer, filename) {
  const PINATA_JWT   = process.env.PINATA_JWT;
  const IPFS_API_URL = process.env.IPFS_API_URL;
  const IPFS_SECRET  = process.env.IPFS_PROXY_SECRET;

  // ── Strategy 1: Pinata REST API ───────────────────────────────────────────
  if (PINATA_JWT && !PINATA_JWT.startsWith('dummy')) {
    const form = new FormData();
    form.append('file', buffer, { filename: filename || 'upload' });
    const resp = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${PINATA_JWT}`, ...form.getHeaders() },
      body: form
    });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Pinata error ${resp.status}: ${text}`);
    }
    const data = await resp.json();
    return { IpfsHash: data.IpfsHash, PinSize: data.PinSize || 0 };
  }

  // ── Strategy 2: Self-hosted IPFS proxy (tunnel) ───────────────────────────
  if (IPFS_API_URL && IPFS_SECRET) {
    const form = new FormData();
    form.append('file', buffer, { filename: filename || 'upload' });
    const resp = await fetch(`${IPFS_API_URL}/api/v0/add`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${IPFS_SECRET}`, ...form.getHeaders() },
      body: form
    });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`IPFS proxy error ${resp.status}: ${text}`);
    }
    const data = await resp.json();
    return { IpfsHash: data.Hash, PinSize: parseInt(data.Size) || 0 };
  }

  throw new Error('No IPFS provider configured (set PINATA_JWT or IPFS_API_URL+IPFS_PROXY_SECRET)');
}

async function uploadTextToIPFS(content, name) {
  const buf = Buffer.from(typeof content === 'string' ? content : JSON.stringify(content));
  return uploadToIPFS(buf, name || `json-${Date.now()}.json`);
}

// ── POST /api/ipfs/upload-file ────────────────────────────────────────────────
router.post('/upload-file', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file provided' });
    const result = await uploadToIPFS(req.file.buffer, req.file.originalname);
    res.json({ success: true, ...result, Timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('IPFS upload-file error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── POST /api/ipfs/upload-json ────────────────────────────────────────────────
// Accepts Pinata-format body for backwards compatibility
router.post('/upload-json', async (req, res) => {
  try {
    const content  = req.body.pinataContent || req.body;
    const metadata = req.body.pinataMetadata || {};
    const name     = (metadata.name || `json-${Date.now()}`) + '.json';
    const result   = await uploadTextToIPFS(JSON.stringify(content), name);
    res.json({ success: true, ...result, Timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('IPFS upload-json error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

// ── GET /api/ipfs/content/:hash ───────────────────────────────────────────────
// Proxy IPFS reads through the local node. Returns 404 cleanly if not found.
router.get('/content/:hash', async (req, res) => {
  const { hash } = req.params;
  if (!hash || hash.includes('<') || hash.length < 10) {
    return res.status(400).json({ error: 'Invalid hash' });
  }

  const tryGateways = [
    IPFS_API_URL ? `${IPFS_API_URL}/api/v0/cat?arg=${hash}` : null,
    `https://ipfs.io/ipfs/${hash}`,
  ].filter(Boolean);

  for (const url of tryGateways) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const method = url.includes('/api/v0/cat') ? 'POST' : 'GET';
      const headers = url.includes(IPFS_API_URL) ? { 'Authorization': `Bearer ${IPFS_SECRET}` } : {};
      const response = await fetch(url, { method, headers, signal: controller.signal });
      clearTimeout(timeout);
      if (response.ok) {
        const ct = response.headers.get('content-type') || 'application/json';
        const text = await response.text();
        res.setHeader('Content-Type', ct);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.send(text);
      }
    } catch (e) { /* try next */ }
  }
  res.status(404).json({ error: 'Content not found on IPFS', hash });
});
