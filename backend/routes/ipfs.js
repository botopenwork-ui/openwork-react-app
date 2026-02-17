const express = require('express');
const router = express.Router();
const lighthouse = require('@lighthouse-web3/sdk');
const multer = require('multer');

// Configure multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

/**
 * Upload file to IPFS via Lighthouse
 * POST /api/ipfs/upload-file
 * Body: FormData with 'file' field
 *
 * Response format kept identical to previous Pinata integration:
 * { success: true, IpfsHash: "Qm...", PinSize: 12345, Timestamp: "..." }
 */
router.post('/upload-file', upload.single('file'), async (req, res) => {
  try {
    const LIGHTHOUSE_API_KEY = process.env.LIGHTHOUSE_API_KEY;

    if (!LIGHTHOUSE_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'Lighthouse API key not configured on server'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file provided'
      });
    }

    // Upload buffer to Lighthouse
    const response = await lighthouse.uploadBuffer(
      req.file.buffer,
      LIGHTHOUSE_API_KEY,
      req.file.originalname
    );

    if (response && response.data && response.data.Hash) {
      res.json({
        success: true,
        IpfsHash: response.data.Hash,
        PinSize: parseInt(response.data.Size) || 0,
        Timestamp: new Date().toISOString()
      });
    } else {
      console.error('Unexpected Lighthouse response:', response);
      res.status(500).json({
        success: false,
        error: 'Lighthouse upload returned unexpected response'
      });
    }

  } catch (error) {
    console.error('Error uploading to IPFS:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Upload JSON to IPFS via Lighthouse
 * POST /api/ipfs/upload-json
 * Body: { pinataContent: {}, pinataMetadata: {} }
 *
 * Accepts the same body format as the previous Pinata integration
 * so no frontend changes are needed.
 */
router.post('/upload-json', async (req, res) => {
  try {
    const LIGHTHOUSE_API_KEY = process.env.LIGHTHOUSE_API_KEY;

    if (!LIGHTHOUSE_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'Lighthouse API key not configured on server'
      });
    }

    // Extract content from the Pinata-format body (backwards compatible)
    const content = req.body.pinataContent || req.body;
    const metadata = req.body.pinataMetadata || {};
    const name = metadata.name || `json-${Date.now()}`;

    // Serialize JSON and upload as text
    const jsonString = JSON.stringify(content);
    const response = await lighthouse.uploadText(
      jsonString,
      LIGHTHOUSE_API_KEY,
      name
    );

    if (response && response.data && response.data.Hash) {
      res.json({
        success: true,
        IpfsHash: response.data.Hash,
        PinSize: parseInt(response.data.Size) || 0,
        Timestamp: new Date().toISOString()
      });
    } else {
      console.error('Unexpected Lighthouse response:', response);
      res.status(500).json({
        success: false,
        error: 'Lighthouse upload returned unexpected response'
      });
    }

  } catch (error) {
    console.error('Error uploading JSON to IPFS:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
