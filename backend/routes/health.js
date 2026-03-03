/**
 * GET /api/health
 * Returns live health status of all critical OpenWork infrastructure.
 * Requires header: x-health-token = HEALTH_SECRET env var
 */

'use strict';

const express  = require('express');
const router   = express.Router();
const fetch    = require('node-fetch');
const { ethers } = require('ethers');

const ARB_RPC  = process.env.ARBITRUM_RPC  || 'https://arb1.arbitrum.io/rpc';
const OP_RPC   = process.env.OPTIMISM_RPC  || 'https://mainnet.optimism.io';
const SERVICE_WALLET = '0xb8dC69937e745Fd02661BC4333f3852166eF2026';
const USDC_ARB = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
const USDC_OP  = '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85';
const LOWJC    = '0xEE57ee10cCAB26f5642d4EbDC15B3881Bb0B5587';
const ERC20    = ['function balanceOf(address) view returns (uint256)'];
const LOWJC_ABI = ['function jobCounter() view returns (uint256)'];

const HEALTH_SECRET = process.env.HEALTH_SECRET || 'ow-health-2026';
const ETH_WARN  = 0.003;  // yellow below this
const ETH_CRIT  = 0.001;  // red below this

function status(value, warn, critical) {
  if (value <= critical) return 'red';
  if (value <= warn)     return 'yellow';
  return 'green';
}

async function checkWallets() {
  const arb = new ethers.JsonRpcProvider(ARB_RPC);
  const op  = new ethers.JsonRpcProvider(OP_RPC);
  const erc20 = (addr, provider) => new ethers.Contract(addr, ERC20, provider);

  const [arbEth, opEth, arbUsdc, opUsdc] = await Promise.all([
    arb.getBalance(SERVICE_WALLET),
    op.getBalance(SERVICE_WALLET),
    erc20(USDC_ARB, arb).balanceOf(SERVICE_WALLET),
    erc20(USDC_OP,  op).balanceOf(SERVICE_WALLET),
  ]);

  const arbEthF = parseFloat(ethers.formatEther(arbEth));
  const opEthF  = parseFloat(ethers.formatEther(opEth));

  return {
    arb_eth:  { value: arbEthF.toFixed(6),  status: status(arbEthF, ETH_WARN, ETH_CRIT) },
    op_eth:   { value: opEthF.toFixed(6),   status: status(opEthF,  ETH_WARN, ETH_CRIT) },
    arb_usdc: { value: parseFloat(ethers.formatUnits(arbUsdc, 6)).toFixed(4), status: 'green' },
    op_usdc:  { value: parseFloat(ethers.formatUnits(opUsdc,  6)).toFixed(4), status: 'green' },
  };
}

async function checkIPFS() {
  const start = Date.now();
  const PINATA_JWT = process.env.PINATA_JWT;
  if (!PINATA_JWT) return { status: 'red', message: 'PINATA_JWT not set', ms: 0 };
  try {
    const resp = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${PINATA_JWT}`, 'Content-Type': 'multipart/form-data' },
      timeout: 8000,
    });
    // Just test auth — even a 400 means Pinata is reachable
    const ms = Date.now() - start;
    return resp.status < 500
      ? { status: 'green', message: 'Pinata reachable', ms }
      : { status: 'red',   message: `Pinata ${resp.status}`, ms };
  } catch (e) {
    return { status: 'red', message: e.message, ms: Date.now() - start };
  }
}

async function checkContracts() {
  try {
    const arb = new ethers.JsonRpcProvider(ARB_RPC);
    const lowjc = new ethers.Contract(LOWJC, LOWJC_ABI, arb);
    const count = await lowjc.jobCounter();
    return { status: 'green', job_count: Number(count) };
  } catch (e) {
    return { status: 'red', message: e.message };
  }
}

async function checkRPC() {
  const results = {};
  for (const [name, url] of [['arb', ARB_RPC], ['op', OP_RPC]]) {
    try {
      const start = Date.now();
      const provider = new ethers.JsonRpcProvider(url);
      const block = await provider.getBlockNumber();
      results[name] = { status: 'green', block, ms: Date.now() - start };
    } catch (e) {
      results[name] = { status: 'red', message: e.message };
    }
  }
  return results;
}

async function checkRelayer(db) {
  try {
    const stuck = await db.all(
      `SELECT COUNT(*) as count FROM cctp_transfers
       WHERE status NOT IN ('completed','failed')
       AND created_at < NOW() - INTERVAL '15 minutes'`
    );
    const last = await db.all(
      `SELECT MAX(updated_at) as last_relay FROM cctp_transfers WHERE status = 'completed'`
    );
    const stuckCount = parseInt(stuck[0]?.count || 0);
    const lastRelay  = last[0]?.last_relay || null;
    return {
      status: stuckCount > 0 ? 'yellow' : 'green',
      stuck_jobs: stuckCount,
      last_completed_relay: lastRelay,
    };
  } catch (e) {
    // DB unavailable — be honest, show unknown not green
    return { status: 'grey', stuck_jobs: '?', last_completed_relay: null, note: 'DB unavailable' };
  }
}

// ── Auth middleware ────────────────────────────────────────────────────────────
router.use((req, res, next) => {
  const token = req.headers['x-health-token'] || req.query.token;
  if (token !== HEALTH_SECRET) return res.status(401).json({ error: 'Unauthorized' });
  next();
});

// ── GET /api/health ────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const db = require('../db/db');
  const start = Date.now();

  const [wallets, ipfs, contracts, rpc, relayer] = await Promise.allSettled([
    checkWallets(),
    checkIPFS(),
    checkContracts(),
    checkRPC(),
    checkRelayer(db),
  ]);

  const get = (r) => r.status === 'fulfilled' ? r.value : { status: 'red', error: r.reason?.message };

  const data = {
    timestamp: new Date().toISOString(),
    elapsed_ms: Date.now() - start,
    wallets:   get(wallets),
    ipfs:      get(ipfs),
    contracts: get(contracts),
    rpc:       get(rpc),
    relayer:   get(relayer),
  };

  // Overall status = worst of all
  const allStatuses = [
    data.wallets.arb_eth?.status,
    data.wallets.op_eth?.status,
    data.ipfs?.status,
    data.contracts?.status,
    data.rpc?.arb?.status,
    data.rpc?.op?.status,
    data.relayer?.status,
  ];
  data.overall = allStatuses.includes('red') ? 'red'
    : allStatuses.includes('yellow') ? 'yellow' : 'green';

  res.json(data);
});

module.exports = router;
