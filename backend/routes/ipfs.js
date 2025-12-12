const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

/**
 * Upload file to IPFS via Pinata
 * POST /api/ipfs/upload-file
 * Body: FormData with 'file' field
 */
router.post('/upload-file', async (req, res) => {
  try {
    const PINATA_API_KEY = process.env.PINATA_API_KEY;
    
    if (!PINATA_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'Pinata API key not configured on server'
      });
    }

    // Forward the file upload to Pinata
    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PINATA_API_KEY}`
      },
      body: req.body // Pass through the FormData
    });

    const data = await response.json();
    
    if (response.ok) {
      res.json({
        success: true,
        IpfsHash: data.IpfsHash,
        PinSize: data.PinSize,
        Timestamp: data.Timestamp
      });
    } else {
      res.status(response.status).json({
        success: false,
        error: data.error || 'Pinata upload failed'
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
 * Upload JSON to IPFS via Pinata
 * POST /api/ipfs/upload-json
 * Body: { pinataContent: {}, pinataMetadata: {} }
 */
router.post('/upload-json', async (req, res) => {
  try {
    const PINATA_API_KEY = process.env.PINATA_API_KEY;
    
    if (!PINATA_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'Pinata API key not configured on server'
      });
    }

    const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PINATA_API_KEY}`
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    
    if (response.ok) {
      res.json({
        success: true,
        IpfsHash: data.IpfsHash,
        PinSize: data.PinSize,
        Timestamp: data.Timestamp
      });
    } else {
      res.status(response.status).json({
        success: false,
        error: data.error || 'Pinata JSON upload failed'
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
