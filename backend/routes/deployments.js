const express = require('express');
const router = express.Router();
const db = require('../db/init');

// POST /api/deployments - Save a new deployment
router.post('/', (req, res) => {
  try {
    const {
      contractId,
      contractName,
      address,
      networkName,
      chainId,
      deployerAddress,
      transactionHash,
      constructorParams
    } = req.body;

    // Validate required fields
    if (!contractId || !contractName || !address || !networkName || !chainId || !deployerAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Validate address format (basic check)
    if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid contract address format'
      });
    }

    // Insert deployment (NOT marked as current by default - admin must set it)
    const insert = db.prepare(`
      INSERT INTO deployments (
        contract_id, contract_name, address, network_name, 
        chain_id, deployer_address, transaction_hash, constructor_params,
        deployment_type, is_current
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'standalone', 0)
    `);

    const result = insert.run(
      contractId,
      contractName,
      address,
      networkName,
      chainId,
      deployerAddress,
      transactionHash || null,
      constructorParams ? JSON.stringify(constructorParams) : null
    );

    console.log(`✅ Saved deployment: ${contractName} at ${address} on ${networkName}`);

    res.json({
      success: true,
      deploymentId: result.lastInsertRowid,
      message: 'Deployment saved successfully'
    });
  } catch (error) {
    console.error('Error saving deployment:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/deployments/:contractId - Get deployment history for a contract
router.get('/:contractId', (req, res) => {
  try {
    const { contractId } = req.params;

    const query = db.prepare(`
      SELECT 
        id,
        contract_id,
        contract_name,
        address,
        network_name,
        chain_id,
        deployer_address,
        transaction_hash,
        constructor_params,
        deployed_at,
        created_at
      FROM deployments
      WHERE contract_id = ?
      ORDER BY deployed_at DESC
      LIMIT 50
    `);

    const deployments = query.all(contractId);

    // Parse constructor params
    const parsed = deployments.map(d => ({
      ...d,
      constructor_params: d.constructor_params ? JSON.parse(d.constructor_params) : null
    }));

    res.json({
      success: true,
      contractId,
      count: parsed.length,
      deployments: parsed
    });
  } catch (error) {
    console.error('Error fetching deployment history:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/deployments/:contractId/current - Get most recent deployment
router.get('/:contractId/current', (req, res) => {
  try {
    const { contractId } = req.params;

    const query = db.prepare(`
      SELECT 
        id,
        contract_id,
        contract_name,
        address,
        network_name,
        chain_id,
        deployer_address,
        transaction_hash,
        constructor_params,
        deployed_at,
        created_at
      FROM deployments
      WHERE contract_id = ?
      ORDER BY deployed_at DESC
      LIMIT 1
    `);

    const deployment = query.get(contractId);

    if (!deployment) {
      return res.status(404).json({
        success: false,
        error: 'No deployments found for this contract'
      });
    }

    // Parse constructor params
    if (deployment.constructor_params) {
      deployment.constructor_params = JSON.parse(deployment.constructor_params);
    }

    res.json({
      success: true,
      deployment
    });
  } catch (error) {
    console.error('Error fetching current deployment:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// DELETE /api/deployments/:id - Delete a deployment (optional cleanup feature)
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;

    const deleteStmt = db.prepare('DELETE FROM deployments WHERE id = ?');
    const result = deleteStmt.run(id);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        error: 'Deployment not found'
      });
    }

    console.log(`🗑️  Deleted deployment ID: ${id}`);

    res.json({
      success: true,
      message: 'Deployment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting deployment:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
