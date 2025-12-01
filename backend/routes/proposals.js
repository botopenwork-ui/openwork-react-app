const express = require('express');
const router = express.Router();
const db = require('../db/proposals-init');

/**
 * Save a new proposal to the database
 * POST /api/proposals
 */
router.post('/', (req, res) => {
  try {
    const {
      proposalId,
      chain,
      proposalType,
      title,
      description,
      proposerAddress,
      recipientAddress,
      amount,
      transactionHash,
      blockNumber,
      metadata
    } = req.body;

    // Validation
    if (!proposalId || !chain || !proposalType || !proposerAddress || !transactionHash) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: proposalId, chain, proposalType, proposerAddress, transactionHash'
      });
    }

    // Prepare metadata as JSON string if it's an object
    const metadataStr = metadata ? JSON.stringify(metadata) : null;

    // Insert into database
    const stmt = db.prepare(`
      INSERT INTO proposals (
        proposal_id, chain, proposal_type, title, description,
        proposer_address, recipient_address, amount,
        transaction_hash, block_number, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      proposalId,
      chain,
      proposalType,
      title,
      description,
      proposerAddress,
      recipientAddress,
      amount,
      transactionHash,
      blockNumber,
      metadataStr
    );

    console.log(`✅ Proposal saved to database: ${proposalId} (${proposalType} on ${chain})`);

    res.json({
      success: true,
      id: result.lastInsertRowid,
      proposalId,
      message: 'Proposal metadata saved successfully'
    });

  } catch (error) {
    console.error('Error saving proposal:', error);
    
    // Handle unique constraint violation
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({
        success: false,
        error: 'Proposal already exists in database'
      });
    }
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get a specific proposal by ID and chain
 * GET /api/proposals/:proposalId/:chain
 */
router.get('/:proposalId/:chain', (req, res) => {
  try {
    const { proposalId, chain } = req.params;

    const stmt = db.prepare(`
      SELECT * FROM proposals 
      WHERE proposal_id = ? AND chain = ?
    `);

    const proposal = stmt.get(proposalId, chain);

    if (!proposal) {
      return res.status(404).json({
        success: false,
        error: 'Proposal not found in database'
      });
    }

    // Parse metadata if it exists
    if (proposal.metadata) {
      try {
        proposal.metadata = JSON.parse(proposal.metadata);
      } catch (e) {
        console.error('Error parsing metadata:', e);
      }
    }

    res.json({
      success: true,
      proposal
    });

  } catch (error) {
    console.error('Error fetching proposal:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get all proposals, optionally filtered by chain or type
 * GET /api/proposals?chain=Base&type=Treasury
 */
router.get('/', (req, res) => {
  try {
    const { chain, type, limit = 100, offset = 0 } = req.query;

    let query = 'SELECT * FROM proposals WHERE 1=1';
    const params = [];

    if (chain) {
      query += ' AND chain = ?';
      params.push(chain);
    }

    if (type) {
      query += ' AND proposal_type = ?';
      params.push(type);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const stmt = db.prepare(query);
    const proposals = stmt.all(...params);

    // Parse metadata for each proposal
    proposals.forEach(proposal => {
      if (proposal.metadata) {
        try {
          proposal.metadata = JSON.parse(proposal.metadata);
        } catch (e) {
          console.error('Error parsing metadata:', e);
        }
      }
    });

    res.json({
      success: true,
      proposals,
      count: proposals.length
    });

  } catch (error) {
    console.error('Error fetching proposals:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Update proposal metadata
 * PATCH /api/proposals/:proposalId/:chain
 */
router.patch('/:proposalId/:chain', (req, res) => {
  try {
    const { proposalId, chain } = req.params;
    const updates = req.body;

    // Build dynamic UPDATE query
    const allowedFields = ['title', 'description', 'metadata'];
    const updateFields = [];
    const params = [];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        params.push(field === 'metadata' ? JSON.stringify(updates[field]) : updates[field]);
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }

    params.push(proposalId, chain);

    const stmt = db.prepare(`
      UPDATE proposals 
      SET ${updateFields.join(', ')}
      WHERE proposal_id = ? AND chain = ?
    `);

    const result = stmt.run(...params);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        error: 'Proposal not found'
      });
    }

    res.json({
      success: true,
      message: 'Proposal updated successfully'
    });

  } catch (error) {
    console.error('Error updating proposal:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
