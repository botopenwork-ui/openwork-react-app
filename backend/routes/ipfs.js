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
 *   1. Self-hosted IPFS proxy  — if IPFS_API_URL + IPFS_PROXY_SECRET are set
 *   2. Lighthouse SDK          — if LIGHTHOUSE_API_KEY is set
 *   3. Error                   — neither configured
 *
 * Response format identical to the original Pinata integration:
 *   { success: true, IpfsHash: "Qm...", PinSize: 12345, Timestamp: "..." }
 */
async function uploadToIPFS(buffer, filename) {
  const IPFS_API_URL    = process.env.IPFS_API_URL;
  const IPFS_SECRET     = process.env.IPFS_PROXY_SECRET;
  const LIGHTHOUSE_KEY  = process.env.LIGHTHOUSE_API_KEY;

  // ── Strategy 1: Self-hosted IPFS proxy ────────────────────────────────────
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

  // ── Strategy 2: Lighthouse SDK ────────────────────────────────────────────
  if (LIGHTHOUSE_KEY) {
    const lighthouse = require('@lighthouse-web3/sdk');
    const response = await lighthouse.uploadBuffer(buffer, LIGHTHOUSE_KEY, filename);
    if (!response?.data?.Hash) throw new Error('Unexpected Lighthouse response: ' + JSON.stringify(response));
    return { IpfsHash: response.data.Hash, PinSize: parseInt(response.data.Size) || 0 };
  }

  throw new Error('No IPFS provider configured (set IPFS_API_URL+IPFS_PROXY_SECRET or LIGHTHOUSE_API_KEY)');
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
