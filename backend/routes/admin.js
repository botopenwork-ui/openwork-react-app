const express = require('express');
const router = express.Router();
const db = require('../db/init');
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
router.put('/deployments/:id/set-current', requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    
    // Get deployment info
    const deployment = db.prepare('SELECT * FROM deployments WHERE id = ?').get(id);
    
    if (!deployment) {
      return res.status(404).json({
        success: false,
        error: 'Deployment not found'
      });
    }
    
    // Mark all deployments of this contract on this network as not current
    db.prepare(`
      UPDATE deployments 
      SET is_current = 0 
      WHERE contract_id = ? AND network_name = ?
    `).run(deployment.contract_id, deployment.network_name);
    
    // Mark this deployment as current
    db.prepare(`
      UPDATE deployments 
      SET is_current = 1 
      WHERE id = ?
    `).run(id);
    
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
router.put('/deployments/:id', requireAdmin, (req, res) => {
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
    
    const stmt = db.prepare(`
      UPDATE deployments 
      SET ${updates.join(', ')}
      WHERE id = ?
    `);
    
    const result = stmt.run(...params);
    
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
router.delete('/deployments/:id', requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    
    // Get deployment info before deleting
    const deployment = db.prepare('SELECT * FROM deployments WHERE id = ?').get(id);
    
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
    const stmt = db.prepare('DELETE FROM deployments WHERE id = ?');
    stmt.run(id);
    
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
router.get('/stats', requireAdmin, (req, res) => {
  try {
    const totalDeployments = db.prepare('SELECT COUNT(*) as count FROM deployments').get();
    const currentDeployments = db.prepare('SELECT COUNT(*) as count FROM deployments WHERE is_current = 1').get();
    const networkCounts = db.prepare(`
      SELECT network_name, COUNT(*) as count 
      FROM deployments 
      GROUP BY network_name
    `).all();
    
    const contractCounts = db.prepare(`
      SELECT contract_name, COUNT(*) as count 
      FROM deployments 
      GROUP BY contract_name 
      ORDER BY count DESC 
      LIMIT 10
    `).all();
    
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
router.get('/contracts/:contractId/docs', (req, res) => {
  try {
    const { contractId } = req.params;
    
    const query = db.prepare('SELECT * FROM contract_docs WHERE contract_id = ?');
    const docs = query.get(contractId);
    
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
router.put('/contracts/:contractId/docs', requireAdmin, (req, res) => {
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
    const existing = db.prepare('SELECT id FROM contract_docs WHERE contract_id = ?').get(contractId);
    
    if (existing) {
      // Update existing
      const update = db.prepare(`
        UPDATE contract_docs 
        SET documentation = ?, contract_code = ?, proxy_code = ?, full_data = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
        WHERE contract_id = ?
      `);
      
      update.run(
        documentation || null,
        contractCode || null,
        proxyCode || null,
        fullData ? JSON.stringify(fullData) : null,
        req.admin.username,
        contractId
      );
    } else {
      // Insert new
      const insert = db.prepare(`
        INSERT INTO contract_docs (contract_id, contract_name, documentation, contract_code, proxy_code, full_data, updated_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      insert.run(
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

module.exports = router;
