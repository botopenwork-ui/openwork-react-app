const express = require('express');
const router = express.Router();
const db = require('../db/db');

// GET /api/registry - Get all deployments grouped by contract
router.get('/', async (req, res) => {
  try {
    const { network, search } = req.query;

    let query = `
      SELECT
        id,
        contract_id,
        contract_name,
        address,
        network_name,
        chain_id,
        deployer_address,
        transaction_hash,
        deployment_type,
        is_proxy,
        implementation_address,
        proxy_address,
        version,
        is_current,
        notes,
        block_explorer_url,
        deployed_at,
        created_at
      FROM deployments
      WHERE 1=1
    `;

    const params = [];

    // Filter by network if specified
    if (network && network !== 'all') {
      query += ' AND network_name = ?';
      params.push(network);
    }

    // Search filter
    if (search) {
      query += ' AND (contract_name LIKE ? OR address LIKE ? OR contract_id LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY contract_name, deployed_at DESC';

    const deployments = await db.all(query, ...params);

    // Group by contract_id
    const grouped = {};
    deployments.forEach(d => {
      if (!grouped[d.contract_id]) {
        grouped[d.contract_id] = {
          contract_id: d.contract_id,
          contract_name: d.contract_name,
          current: null,
          history: []
        };
      }

      if (d.is_current) {
        grouped[d.contract_id].current = d;
      }
      grouped[d.contract_id].history.push(d);
    });

    // Convert to array
    const contracts = Object.values(grouped);

    // Get network counts
    const networkCounts = await db.all(`
      SELECT network_name, COUNT(DISTINCT contract_id) as count
      FROM deployments
      WHERE is_current = true
      GROUP BY network_name
    `);

    const totalCount = await db.get(`
      SELECT COUNT(DISTINCT contract_id) as count
      FROM deployments
      WHERE is_current = true
    `);

    res.json({
      success: true,
      contracts,
      totalCount: totalCount.count,
      networkCounts
    });
  } catch (error) {
    console.error('Error fetching registry:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/registry/:contractId/history - Get version history for a contract
router.get('/:contractId/history', async (req, res) => {
  try {
    const { contractId } = req.params;

    const history = await db.all(`
      SELECT
        id,
        contract_id,
        contract_name,
        address,
        network_name,
        chain_id,
        deployer_address,
        transaction_hash,
        deployment_type,
        is_proxy,
        implementation_address,
        proxy_address,
        version,
        is_current,
        notes,
        block_explorer_url,
        deployed_at,
        created_at
      FROM deployments
      WHERE contract_id = ?
      ORDER BY deployed_at DESC
    `, contractId);

    if (history.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Contract not found'
      });
    }

    res.json({
      success: true,
      contractId,
      contractName: history[0].contract_name,
      history
    });
  } catch (error) {
    console.error('Error fetching contract history:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/registry/import - Manually add a deployment (for existing contracts)
router.post('/import', async (req, res) => {
  try {
    const {
      contractId,
      contractName,
      address,
      networkName,
      chainId,
      deployerAddress,
      transactionHash,
      deploymentType,
      isProxy,
      implementationAddress,
      proxyAddress,
      version,
      notes,
      blockExplorerUrl,
      deployedAt
    } = req.body;

    // Validate required fields
    if (!contractId || !contractName || !address || !networkName || !chainId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: contractId, contractName, address, networkName, chainId'
      });
    }

    // Validate address format
    if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid address format'
      });
    }

    // Mark other deployments of this contract as not current
    await db.run(`
      UPDATE deployments
      SET is_current = false
      WHERE contract_id = ? AND network_name = ?
    `, contractId, networkName);

    // Insert new deployment
    const result = await db.run(`
      INSERT INTO deployments (
        contract_id, contract_name, address, network_name,
        chain_id, deployer_address, transaction_hash,
        deployment_type, is_proxy, implementation_address, proxy_address,
        version, is_current, notes, block_explorer_url, deployed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, true, ?, ?, ?)
    `,
      contractId,
      contractName,
      address,
      networkName,
      chainId,
      deployerAddress || null,
      transactionHash || null,
      deploymentType || 'standalone',
      isProxy ? true : false,
      implementationAddress || null,
      proxyAddress || null,
      version || null,
      notes || null,
      blockExplorerUrl || null,
      deployedAt || new Date().toISOString()
    );

    console.log(`✅ Imported deployment: ${contractName} at ${address} on ${networkName}`);

    res.json({
      success: true,
      deploymentId: result.lastInsertRowid,
      message: 'Deployment imported successfully'
    });
  } catch (error) {
    console.error('Error importing deployment:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/registry/bulk-import - Bulk import multiple deployments
router.post('/bulk-import', async (req, res) => {
  try {
    const { deployments } = req.body;

    if (!Array.isArray(deployments) || deployments.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid deployments array'
      });
    }

    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    for (let index = 0; index < deployments.length; index++) {
      const dep = deployments[index];
      try {
        // Mark other deployments as not current
        await db.run(`
          UPDATE deployments
          SET is_current = false
          WHERE contract_id = ? AND network_name = ?
        `, dep.contractId, dep.networkName);

        await db.run(`
          INSERT INTO deployments (
            contract_id, contract_name, address, network_name,
            chain_id, deployer_address, transaction_hash,
            deployment_type, is_proxy, implementation_address, proxy_address,
            version, is_current, notes, block_explorer_url, deployed_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
          dep.contractId,
          dep.contractName,
          dep.address,
          dep.networkName,
          dep.chainId,
          dep.deployerAddress || null,
          dep.transactionHash || null,
          dep.deploymentType || 'standalone',
          dep.isProxy ? true : false,
          dep.implementationAddress || null,
          dep.proxyAddress || null,
          dep.version || null,
          true, // is_current
          dep.notes || null,
          dep.blockExplorerUrl || null,
          dep.deployedAt || new Date().toISOString()
        );

        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          index,
          contract: dep.contractName,
          error: error.message
        });
      }
    }

    console.log(`✅ Bulk import complete: ${results.success} succeeded, ${results.failed} failed`);

    res.json({
      success: true,
      results
    });
  } catch (error) {
    console.error('Error in bulk import:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// PUT /api/registry/:id - Update deployment info
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      version,
      notes,
      isCurrent
    } = req.body;

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

    if (isCurrent !== undefined) {
      updates.push('is_current = ?');
      params.push(isCurrent ? true : false);
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

module.exports = router;
