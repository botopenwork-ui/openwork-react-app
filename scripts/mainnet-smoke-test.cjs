#!/usr/bin/env node
/**
 * mainnet-smoke-test.cjs
 *
 * Tests the full job cycle on Arbitrum mainnet using the live contracts.
 * Requires:
 *   - WALL2_PRIVATE_KEY env var (job giver = service wallet)
 *   - TAKER_PRIVATE_KEY env var (job taker = W2 test wallet)
 *   - Enough USDC on ARB for the job giver (≥ 0.01 USDC)
 *   - Enough ETH on ARB for both wallets (gas)
 *   - ProfileManager deployed + wired into LOWJC
 *
 * Usage:
 *   WALL2_PRIVATE_KEY=0x... TAKER_PRIVATE_KEY=0x... node scripts/mainnet-smoke-test.cjs
 */

'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { ethers } = require('../backend/node_modules/ethers');

// ── Addresses ────────────────────────────────────────────────────────────────
const LOWJC_ADDR  = '0xEE57ee10cCAB26f5642d4EbDC15B3881Bb0B5587';
const NOWJC_ADDR  = '0x8EfbF240240613803B9c9e716d4b5AD1388aFd99';
const USDC_ADDR   = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'; // Native USDC on Arb
const ARB_RPC     = process.env.VITE_ARBITRUM_MAINNET_RPC_URL ||
                    'https://arb-mainnet.g.alchemy.com/v2/ECvjGU_6M0Jrw6wlFkPo2ZbonbfW5oIZ';

// ── Setup ─────────────────────────────────────────────────────────────────────
const provider = new ethers.JsonRpcProvider(ARB_RPC);
const w1 = new ethers.Wallet(process.env.WALL2_PRIVATE_KEY, provider);
const w2 = new ethers.Wallet(process.env.TAKER_PRIVATE_KEY, provider);

const SMOKE_AMOUNT = BigInt(10_000); // 0.01 USDC

const erc20Abi = [
  'function balanceOf(address) view returns (uint256)',
  'function approve(address,uint256) returns (bool)',
  'function transfer(address,uint256) returns (bool)',
];

const lowjcAbi = [
  'function createProfile(string,address) returns (bool)',
  'function postJob(string,string[],uint256[]) returns (string)',
  'function applyToJob(string,string,string[],uint256[],uint32) returns (uint256)',
  'function startJob(string,uint256,bool)',
  'function submitWork(string,string)',
  'function releasePayment(string)',
  'function jobCounter() view returns (uint256)',
  'function profileManager() view returns (address)',
];

const profileMgrAbi = ['function hasProfile(address) view returns (bool)'];

// ── Helpers ───────────────────────────────────────────────────────────────────
const results = { passed: 0, failed: 0, tests: [] };
function pass(name, note = '') {
  console.log(`  ✅ ${name}${note ? ' — ' + note : ''}`);
  results.passed++;
  results.tests.push({ name, pass: true, note });
}
function fail(name, note = '') {
  console.log(`  ❌ ${name}${note ? ' — ' + note : ''}`);
  results.failed++;
  results.tests.push({ name, pass: false, note });
}
function tx(label, hash) {
  console.log(`  🔗 ${label}: https://arbiscan.io/tx/${hash}`);
}

async function run() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║   OPENWORK MAINNET SMOKE TEST — Arbitrum                   ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  const chainId = (await provider.getNetwork()).chainId;
  console.log('Chain ID:', chainId.toString(), '(Arbitrum mainnet = 42161)');
  if (chainId !== 42161n) {
    console.error('❌ Wrong network! Expected Arbitrum mainnet (42161)');
    process.exit(1);
  }

  console.log('W1 (giver):', w1.address);
  console.log('W2 (taker):', w2.address);

  const usdc  = new ethers.Contract(USDC_ADDR, erc20Abi, provider);
  const lowjc = new ethers.Contract(LOWJC_ADDR, lowjcAbi, w1);
  const lowjcW2 = lowjc.connect(w2);

  // ── Pre-flight checks ─────────────────────────────────────────────────────
  console.log('\n── Pre-flight ──');
  const [w1Eth, w1Usdc, w2Eth, pmAddr] = await Promise.all([
    provider.getBalance(w1.address),
    usdc.balanceOf(w1.address),
    provider.getBalance(w2.address),
    lowjc.profileManager(),
  ]);
  console.log('W1 ETH:', ethers.formatEther(w1Eth), '| USDC:', ethers.formatUnits(w1Usdc, 6));
  console.log('W2 ETH:', ethers.formatEther(w2Eth));
  console.log('ProfileManager:', pmAddr);

  if (pmAddr === ethers.ZeroAddress) {
    console.error('❌ LOWJC.profileManager not set — run DeployProfileStack first!');
    process.exit(1);
  }
  if (w1Usdc < SMOKE_AMOUNT) {
    console.error(`❌ W1 needs ≥ 0.01 USDC on ARB (has ${ethers.formatUnits(w1Usdc, 6)})`);
    process.exit(1);
  }

  const profileMgr = new ethers.Contract(pmAddr, profileMgrAbi, provider);

  // ── STEP 1: Profiles ───────────────────────────────────────────────────────
  console.log('\n── Step 1: Profiles ──');
  if (!(await profileMgr.hasProfile(w1.address))) {
    const r = await (await lowjc.createProfile('ipfs://smoke-w1', ethers.ZeroAddress)).wait();
    tx('createProfile-W1', r.hash); pass('W1-profile');
  } else { pass('W1-profile', 'already exists'); }

  if (!(await profileMgr.hasProfile(w2.address))) {
    const r = await (await lowjcW2.createProfile('ipfs://smoke-w2', ethers.ZeroAddress)).wait();
    tx('createProfile-W2', r.hash); pass('W2-profile');
  } else { pass('W2-profile', 'already exists'); }

  // ── STEP 2: Post Job ───────────────────────────────────────────────────────
  console.log('\n── Step 2: Post Job ──');
  const jobCountBefore = await lowjc.jobCounter();
  await (await usdc.connect(w1).approve(LOWJC_ADDR, SMOKE_AMOUNT)).wait();
  const postTx = await (await lowjc.postJob('ipfs://smoke-job-v1', ['Smoke test milestone'], [SMOKE_AMOUNT])).wait();
  tx('postJob', postTx.hash);
  const jobId = `${chainId}-${Number(await lowjc.jobCounter())}`;
  console.log('  Job ID:', jobId);
  pass('postJob', jobId);

  // ── STEP 3: Apply ──────────────────────────────────────────────────────────
  console.log('\n── Step 3: Apply ──');
  const applyTx = await (await lowjcW2.applyToJob(jobId, 'ipfs://app-smoke', ['Milestone'], [SMOKE_AMOUNT], 3)).wait();
  tx('applyToJob', applyTx.hash);
  pass('applyToJob');

  // ── STEP 4: Start Job ──────────────────────────────────────────────────────
  console.log('\n── Step 4: Start Job ──');
  const startTx = await (await lowjc.startJob(jobId, 1, false)).wait();
  tx('startJob', startTx.hash);
  pass('startJob');

  // ── STEP 5: Submit Work ────────────────────────────────────────────────────
  console.log('\n── Step 5: Submit Work ──');
  const submitTx = await (await lowjcW2.submitWork(jobId, 'ipfs://work-smoke')).wait();
  tx('submitWork', submitTx.hash);
  pass('submitWork');

  // ── STEP 6: Release Payment ────────────────────────────────────────────────
  console.log('\n── Step 6: Release Payment ──');
  const w2UsdcBefore = await usdc.balanceOf(w2.address);
  const releaseTx = await (await lowjc.releasePayment(jobId)).wait();
  tx('releasePayment', releaseTx.hash);
  const w2UsdcAfter = await usdc.balanceOf(w2.address);
  const received = w2UsdcAfter - w2UsdcBefore;
  if (received > 0n) {
    pass('releasePayment', `W2 received ${ethers.formatUnits(received, 6)} USDC`);
  } else {
    fail('releasePayment', 'W2 USDC did not increase');
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('SMOKE TEST SUMMARY');
  console.log('═══════════════════════════════════════════════════════════');
  for (const t of results.tests) {
    console.log(`${t.pass ? '✅' : '❌'} ${t.name}${t.note ? ' — ' + t.note : ''}`);
  }
  console.log(`\nTotal: ${results.passed + results.failed} | Passed: ${results.passed} | Failed: ${results.failed}`);
  if (results.failed === 0) {
    console.log('\n🚀 ALL PASSING — OpenWork job cycle is LIVE on Arbitrum mainnet!');
  } else {
    console.log('\n⚠️  Failures detected. Check logs above.');
  }
}

run().catch(err => {
  console.error('\n💥 Fatal error:', err.message);
  process.exit(1);
});
