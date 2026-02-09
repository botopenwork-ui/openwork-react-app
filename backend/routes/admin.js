const express = require('express');
const router = express.Router();
const db = require('../db/db');
const { verifyAdminCredentials, generateAdminToken, requireAdmin } = require('../utils/auth');

// POST /api/admin/login - Admin login
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password required'
      });
    }

    // Verify credentials
    if (!verifyAdminCredentials(username, password)) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Generate token
    const token = generateAdminToken(username);

    console.log(`✅ Admin login successful: ${username}`);

    res.json({
      success: true,
      token,
      username,
      message: 'Login successful'
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/admin/verify - Verify if token is valid
router.post('/verify', requireAdmin, (req, res) => {
  res.json({
    success: true,
    admin: req.admin,
    message: 'Token is valid'
  });
});

// PUT /api/admin/deployments/:id/set-current - Mark deployment as current
router.put('/deployments/:id/set-current', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Get deployment info
    const deployment = await db.get('SELECT * FROM deployments WHERE id = ?', id);

    if (!deployment) {
      return res.status(404).json({
        success: false,
        error: 'Deployment not found'
      });
    }

    // Mark all deployments of this contract on this network as not current
    await db.run(`
      UPDATE deployments
      SET is_current = false
      WHERE contract_id = ? AND network_name = ?
    `, deployment.contract_id, deployment.network_name);

    // Mark this deployment as current
    await db.run(`
      UPDATE deployments
      SET is_current = true
      WHERE id = ?
    `, id);

    console.log(`✅ Admin set deployment as current: ${deployment.contract_name} (${deployment.address})`);

    res.json({
      success: true,
      message: 'Deployment marked as current',
      deployment: {
        id: deployment.id,
        contract_name: deployment.contract_name,
        address: deployment.address,
        network_name: deployment.network_name
      }
    });

  } catch (error) {
    console.error('Error setting current deployment:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// PUT /api/admin/deployments/:id - Update deployment details
router.put('/deployments/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { version, notes } = req.body;

    const updates = [];
    const params = [];

    if (version !== undefined) {
      updates.push('version = ?');
      params.push(version);
    }

    if (notes !== undefined) {
      updates.push('notes = ?');
      params.push(notes);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    params.push(id);

    const result = await db.run(`
      UPDATE deployments
      SET ${updates.join(', ')}
      WHERE id = ?
    `, ...params);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        error: 'Deployment not found'
      });
    }

    console.log(`✅ Admin updated deployment: ID ${id}`);

    res.json({
      success: true,
      message: 'Deployment updated successfully'
    });

  } catch (error) {
    console.error('Error updating deployment:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// DELETE /api/admin/deployments/:id - Delete deployment
router.delete('/deployments/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Get deployment info before deleting
    const deployment = await db.get('SELECT * FROM deployments WHERE id = ?', id);

    if (!deployment) {
      return res.status(404).json({
        success: false,
        error: 'Deployment not found'
      });
    }

    // Don't allow deleting the current deployment
    if (deployment.is_current) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete current deployment. Please set another deployment as current first.'
      });
    }

    // Delete deployment
    await db.run('DELETE FROM deployments WHERE id = ?', id);

    console.log(`✅ Admin deleted deployment: ${deployment.contract_name} (${deployment.address})`);

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

// GET /api/admin/stats - Get admin statistics
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const totalDeployments = await db.get('SELECT COUNT(*) as count FROM deployments');
    const currentDeployments = await db.get('SELECT COUNT(*) as count FROM deployments WHERE is_current = true');
    const networkCounts = await db.all(`
      SELECT network_name, COUNT(*) as count
      FROM deployments
      GROUP BY network_name
    `);

    const contractCounts = await db.all(`
      SELECT contract_name, COUNT(*) as count
      FROM deployments
      GROUP BY contract_name
      ORDER BY count DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      stats: {
        totalDeployments: totalDeployments.count,
        currentDeployments: currentDeployments.count,
        networkCounts,
        topContracts: contractCounts
      }
    });

  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/admin/contracts/:contractId/docs - Get editable docs for a contract
router.get('/contracts/:contractId/docs', async (req, res) => {
  try {
    const { contractId } = req.params;

    const docs = await db.get('SELECT * FROM contract_docs WHERE contract_id = ?', contractId);

    res.json({
      success: true,
      contractId,
      docs: docs || null
    });

  } catch (error) {
    console.error('Error fetching contract docs:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// PUT /api/admin/contracts/:contractId/docs - Update documentation
router.put('/contracts/:contractId/docs', requireAdmin, async (req, res) => {
  try {
    const { contractId } = req.params;
    const { contractName, documentation, contractCode, proxyCode, fullData } = req.body;

    if (!contractId || !contractName) {
      return res.status(400).json({
        success: false,
        error: 'Contract ID and name are required'
      });
    }

    // Check if docs exist
    const existing = await db.get('SELECT id FROM contract_docs WHERE contract_id = ?', contractId);

    if (existing) {
      // Update existing
      await db.run(`
        UPDATE contract_docs
        SET documentation = ?, contract_code = ?, proxy_code = ?, full_data = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
        WHERE contract_id = ?
      `,
        documentation || null,
        contractCode || null,
        proxyCode || null,
        fullData ? JSON.stringify(fullData) : null,
        req.admin.username,
        contractId
      );
    } else {
      // Insert new
      await db.run(`
        INSERT INTO contract_docs (contract_id, contract_name, documentation, contract_code, proxy_code, full_data, updated_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
        contractId,
        contractName,
        documentation || null,
        contractCode || null,
        proxyCode || null,
        fullData ? JSON.stringify(fullData) : null,
        req.admin.username
      );
    }

    console.log(`✅ Admin updated docs for: ${contractName}`);

    res.json({
      success: true,
      message: 'Documentation updated successfully'
    });

  } catch (error) {
    console.error('Error updating contract docs:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/admin/migrate-contract-ids - Fix contract IDs in database
router.post('/migrate-contract-ids', requireAdmin, async (req, res) => {
  try {
    console.log('🔧 Running contract ID migration...');

    const results = [];

    // Simple pattern updates
    const updates = [
      { pattern: '%main-dao%', newId: 'mainDAO' },
      { pattern: '%native-dao%', newId: 'nativeDAO' },
      { pattern: '%native-athena%', newId: 'nativeAthena' },
      { pattern: '%native-bridge%', newId: 'nativeBridge' },
      { pattern: '%main-chain-bridge%', newId: 'mainBridge' },
      { pattern: '%cross-chain-rewards%', newId: 'mainRewards' },
      { pattern: '%oracle-manager%', newId: 'oracleManager' },
      { pattern: '%nowjc%', newId: 'nowjc' },
      { pattern: '%native-rewards%', newId: 'nativeRewards' },
      { pattern: '%cctpv2%', newId: 'cctpTransceiver' },
    ];

    for (const { pattern, newId } of updates) {
      const result = await db.run(`UPDATE deployments SET contract_id = ? WHERE contract_id LIKE ?`, newId, pattern);
      if (result.changes > 0) {
        results.push(`${pattern} → ${newId}: ${result.changes} rows`);
      }
    }

    // Network-specific updates
    const networkUpdates = [
      { pattern: '%athena-client%', network: '%OP%', newId: 'athenaClientOp' },
      { pattern: '%athena-client%', network: '%Ethereum%', newId: 'athenaClientEth' },
      { pattern: '%local-bridge%', network: '%OP%', newId: 'localBridgeOp' },
      { pattern: '%local-bridge%', network: '%Ethereum%', newId: 'localBridgeEth' },
      { pattern: '%lowjc%', network: '%OP%', newId: 'lowjcOp' },
      { pattern: '%lowjc%', network: '%Ethereum%', newId: 'lowjcEth' },
    ];

    for (const { pattern, network, newId } of networkUpdates) {
      const result = await db.run(`UPDATE deployments SET contract_id = ? WHERE contract_id LIKE ? AND network_name LIKE ?`, newId, pattern, network);
      if (result.changes > 0) {
        results.push(`${pattern} (${network}) → ${newId}: ${result.changes} rows`);
      }
    }

    // Clean up contract_name (remove asterisks)
    const cleanNames = await db.run(`UPDATE deployments SET contract_name = REPLACE(REPLACE(contract_name, '**', ''), '*', '')`);
    if (cleanNames.changes > 0) {
      results.push(`Cleaned asterisks from ${cleanNames.changes} contract names`);
    }

    // Get final state
    const finalIds = await db.all('SELECT DISTINCT contract_id FROM deployments ORDER BY contract_id');

    console.log('✅ Migration complete:', results);

    res.json({
      success: true,
      message: 'Migration completed',
      updates: results,
      currentContractIds: finalIds.map(r => r.contract_id)
    });

  } catch (error) {
    console.error('Error running migration:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
