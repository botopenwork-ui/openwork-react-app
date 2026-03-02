/**
 * ARB Mainnet Smoke Test Route
 * POST /api/e2e-test/arb-smoke
 *
 * Runs full job cycle on Arbitrum mainnet:
 *   createProfile → postJob → applyToJob → startJob → submitWork → releasePayment
 *
 * Uses WALL2_PRIVATE_KEY (giver) and TAKER_PRIVATE_KEY (taker) from env.
 * Auto-funds taker with ETH for gas if needed.
 */

'use strict';

const express  = require('express');
const router   = express.Router();
const { ethers } = require('ethers');
const config   = require('../config');

const ARB_RPC      = config.ARBITRUM_RPC || 'https://arb-mainnet.g.alchemy.com/v2/ECvjGU_6M0Jrw6wlFkPo2ZbonbfW5oIZ';
const LOWJC_ADDR   = '0xEE57ee10cCAB26f5642d4EbDC15B3881Bb0B5587';
const USDC_ADDR    = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
const SMOKE_AMOUNT = BigInt(10_000); // 0.01 USDC
const GAS_FUND     = ethers.parseEther('0.0003');
const MIN_GAS      = ethers.parseEther('0.0001');

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function approve(address,uint256) returns (bool)',
];

const LOWJC_ABI = [
  'function createProfile(string,address) returns (bool)',
  'function postJob(string,string[],uint256[]) returns (string)',
  'function applyToJob(string,string,string[],uint256[],uint32) returns (uint256)',
  'function startJob(string,uint256,bool)',
  'function submitWork(string,string)',
  'function releasePayment(string)',
  'function jobCounter() view returns (uint256)',
  'function profileManager() view returns (address)',
];

const PM_ABI = ['function hasProfile(address) view returns (bool)'];

router.post('/', async (req, res) => {
  const log = [];
  const step = (msg) => { log.push(`[${new Date().toISOString()}] ${msg}`); console.log('🧪 ARB-SMOKE:', msg); };
  const txLink = (label, hash) => { const url = `https://arbiscan.io/tx/${hash}`; log.push(`  🔗 ${label}: ${url}`); console.log(`  🔗 ${label}:`, url); };
  const abort  = (msg) => res.json({ success: false, error: msg, log });

  step('=== ARB MAINNET SMOKE TEST START ===');

  if (!config.WALL2_PRIVATE_KEY || config.WALL2_PRIVATE_KEY === 'STORED_IN_CLOUD_RUN')
    return abort('WALL2_PRIVATE_KEY not configured');
  if (!process.env.TAKER_PRIVATE_KEY)
    return abort('TAKER_PRIVATE_KEY not configured');
  if (!config.isMainnet())
    return abort('NETWORK_MODE must be mainnet');

  const provider = new ethers.JsonRpcProvider(ARB_RPC);
  const giverKey = config.WALL2_PRIVATE_KEY.startsWith('0x') ? config.WALL2_PRIVATE_KEY : '0x' + config.WALL2_PRIVATE_KEY;
  const takerKey = process.env.TAKER_PRIVATE_KEY.startsWith('0x') ? process.env.TAKER_PRIVATE_KEY : '0x' + process.env.TAKER_PRIVATE_KEY;

  const w1 = new ethers.Wallet(giverKey, provider); // giver
  const w2 = new ethers.Wallet(takerKey, provider); // taker

  step(`Giver: ${w1.address}`);
  step(`Taker: ${w2.address}`);

  try {
    const chainId = (await provider.getNetwork()).chainId;

    // ── Check & fund taker ETH for gas ────────────────────────────────────
    const takerEth = await provider.getBalance(w2.address);
    step(`Taker ETH: ${ethers.formatEther(takerEth)}`);
    if (takerEth < MIN_GAS) {
      step(`Funding taker with ${ethers.formatEther(GAS_FUND)} ETH for gas...`);
      const fundTx = await w1.sendTransaction({ to: w2.address, value: GAS_FUND });
      await fundTx.wait();
      txLink('fund-taker-gas', fundTx.hash);
      step('Taker funded ✅');
    }

    const usdc   = new ethers.Contract(USDC_ADDR, ERC20_ABI, provider);
    const lowjc  = new ethers.Contract(LOWJC_ADDR, LOWJC_ABI, w1);
    const lowjcW2 = lowjc.connect(w2);

    const pmAddr   = await lowjc.profileManager();
    const profileMgr = new ethers.Contract(pmAddr, PM_ABI, provider);

    // ── Step 1: Profiles ───────────────────────────────────────────────────
    step('Step 1: Profiles');
    if (!(await profileMgr.hasProfile(w1.address))) {
      const r = await (await lowjc.createProfile('ipfs://smoke-w1', ethers.ZeroAddress)).wait();
      txLink('createProfile-W1', r.hash); step('W1 profile created ✅');
    } else { step('W1 profile already exists ✅'); }

    if (!(await profileMgr.hasProfile(w2.address))) {
      const r = await (await lowjcW2.createProfile('ipfs://smoke-w2', ethers.ZeroAddress)).wait();
      txLink('createProfile-W2', r.hash); step('W2 profile created ✅');
    } else { step('W2 profile already exists ✅'); }

    // ── Step 2: Post Job ───────────────────────────────────────────────────
    step('Step 2: Post Job');
    const giverUsdcBal = await usdc.balanceOf(w1.address);
    step(`Giver USDC balance: ${ethers.formatUnits(giverUsdcBal, 6)}`);
    if (giverUsdcBal < SMOKE_AMOUNT) return abort(`Giver has insufficient USDC: ${ethers.formatUnits(giverUsdcBal, 6)}`);

    await (await usdc.connect(w1).approve(LOWJC_ADDR, SMOKE_AMOUNT)).wait();
    const postTx = await (await lowjc.postJob('ipfs://smoke-job', ['Smoke test milestone'], [SMOKE_AMOUNT])).wait();
    txLink('postJob', postTx.hash);
    const jobId = `${chainId}-${Number(await lowjc.jobCounter())}`;
    step(`Job ID: ${jobId} ✅`);

    // ── Step 3: Apply ──────────────────────────────────────────────────────
    step('Step 3: Apply');
    const applyTx = await (await lowjcW2.applyToJob(jobId, 'ipfs://app-smoke', ['Milestone'], [SMOKE_AMOUNT], 3)).wait();
    txLink('applyToJob', applyTx.hash);
    step('Applied ✅');

    // ── Step 4: Start Job ──────────────────────────────────────────────────
    step('Step 4: Start Job');
    const startTx = await (await lowjc.startJob(jobId, 1, false)).wait();
    txLink('startJob', startTx.hash);
    step('Job started ✅');

    // ── Step 5: Submit Work ────────────────────────────────────────────────
    step('Step 5: Submit Work');
    const submitTx = await (await lowjcW2.submitWork(jobId, 'ipfs://work-smoke')).wait();
    txLink('submitWork', submitTx.hash);
    step('Work submitted ✅');

    // ── Step 6: Release Payment ────────────────────────────────────────────
    step('Step 6: Release Payment');
    const w2Before = await usdc.balanceOf(w2.address);
    const releaseTx = await (await lowjc.releasePayment(jobId)).wait();
    txLink('releasePayment', releaseTx.hash);
    const w2After = await usdc.balanceOf(w2.address);
    const received = w2After - w2Before;
    step(`W2 received ${ethers.formatUnits(received, 6)} USDC ✅`);

    step('=== SMOKE TEST PASSED 6/6 ✅ ===');
    res.json({ success: true, jobId, received: ethers.formatUnits(received, 6), log });

  } catch (err) {
    step(`ERROR: ${err.message}`);
    console.error(err);
    res.status(500).json({ success: false, error: err.message, log });
  }
});

module.exports = router;
