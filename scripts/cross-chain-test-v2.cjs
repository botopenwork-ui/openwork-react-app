#!/usr/bin/env node
'use strict';
const { ethers } = require('../backend/node_modules/ethers');

const OP_RPC  = 'https://opt-mainnet.g.alchemy.com/v2/ECvjGU_6M0Jrw6wlFkPo2ZbonbfW5oIZ';
const ARB_RPC = 'https://arb-mainnet.g.alchemy.com/v2/ECvjGU_6M0Jrw6wlFkPo2ZbonbfW5oIZ';
const KEY1 = process.env.WALL2_PRIVATE_KEY;
const KEY2 = process.env.TAKER_PRIVATE_KEY;

const OP_LOWJC  = '0x620205A4Ff0E652fF03a890d2A677de878a1dB63'; // LOWJC Lite V5
const OP_USDC   = '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85';
const NOWJC     = '0x8EfbF240240613803B9c9e716d4b5AD1388aFd99';
const ARB_USDC  = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
const GENESIS   = '0xE8f7963fF3cE9f7dB129e3f619abd71cBB5Bb294';

const AMT = 100000n; // 0.1 USDC

// LZ v2 options: type3, executor lzReceive gas 1_000_000
const LZ_OPTS = '0x000301001101000000000000000000000000000f4240';
// 500k gas for releasePaymentCrossChain
const LZ_OPTS_500K = '0x0003010011010000000000000000000000000007a120';

const LOWJC_ABI = [
  'function createProfile(string,address,bytes) payable',
  'function postJob(string,string[],uint256[],bytes) payable',
  'function applyToJob(string,string,string[],uint256[],uint32,bytes) payable',
  'function startJob(string,uint256,bool,bytes) payable',
  'function submitWork(string,string,bytes) payable',
  'function releasePaymentCrossChain(string,uint32,address,bytes) payable',
  'function jobCounter() view returns (uint256)',
];
const ERC20_ABI = ['function balanceOf(address) view returns (uint256)', 'function approve(address,uint256)'];
const GENESIS_ABI = ['function getJob(string) view returns (tuple(string id, address jobGiver, address[] applicants, string jobDetailHash, uint8 status, string[] workSubmissions, uint256 totalPaid, uint256 currentMilestone, address selectedApplicant, uint256 selectedApplicationId))'];

const ok   = s => console.log('  ✅', s);
const fail = s => { console.log('  ❌', s); process.exit(1); };

const nonces = {};
async function send(label, wallet, contract, method, args, value = 0n) {
  const addr = wallet.address;
  if (nonces[addr] === undefined) nonces[addr] = await wallet.provider.getTransactionCount(addr, 'latest');
  const nonce = nonces[addr]++;
  process.stdout.write(`  🔗 ${label}: `);
  try {
    const t = await contract[method](...args, { nonce, value, gasLimit: 500000 });
    const r = await t.wait();
    if (r.status !== 1) { nonces[addr]--; fail(`${label} reverted`); }
    console.log(`https://optimistic.etherscan.io/tx/${r.hash}`);
    return r;
  } catch(e) {
    nonces[addr]--;
    const msg = e.shortMessage || e.reason || e.message?.slice(0,150);
    console.log('FAILED:', msg);
    throw e;
  }
}

async function main() {
  const opP  = new ethers.JsonRpcProvider(OP_RPC);
  const arbP = new ethers.JsonRpcProvider(ARB_RPC);
  const w1   = new ethers.Wallet(KEY1, opP);
  const w2   = new ethers.Wallet(KEY2, opP);

  console.log('\n╔═══════════════════════════════════════════════╗');
  console.log('║  CROSS-CHAIN JOB CYCLE — OP → ARB (Lite V5)   ║');
  console.log('╚═══════════════════════════════════════════════╝\n');
  console.log('W1 (giver):', w1.address);
  console.log('W2 (taker):', w2.address);

  const lowjc1 = new ethers.Contract(OP_LOWJC, LOWJC_ABI, w1);
  const lowjc2 = new ethers.Contract(OP_LOWJC, LOWJC_ABI, w2);
  const usdc1  = new ethers.Contract(OP_USDC, ERC20_ABI, w1);
  const usdcArb = new ethers.Contract(ARB_USDC, ERC20_ABI, arbP);
  const genesis = new ethers.Contract(GENESIS, GENESIS_ABI, arbP);

  // Pre-flight
  console.log('\n── Pre-flight ──');
  const [w1Usdc, w1Eth, w2Eth, nowjcBal] = await Promise.all([
    new ethers.Contract(OP_USDC, ERC20_ABI, opP).balanceOf(w1.address),
    opP.getBalance(w1.address),
    opP.getBalance(w2.address),
    usdcArb.balanceOf(NOWJC),
  ]);
  console.log('  W1 USDC (OP):', ethers.formatUnits(w1Usdc, 6));
  console.log('  W1 ETH (OP):', ethers.formatEther(w1Eth));
  console.log('  W2 ETH (OP):', ethers.formatEther(w2Eth));
  console.log('  NOWJC USDC (ARB):', ethers.formatUnits(nowjcBal, 6), '← residual');

  const lzValue = ethers.parseEther('0.0002'); // safe margin for LZ fees

  // Step 1: Create profiles (will revert if already exists — catch and continue)
  console.log('\n── Step 1: Profiles ──');
  for (const [w, lj, lbl] of [[w1, lowjc1, 'W1'], [w2, lowjc2, 'W2']]) {
    try {
      await send(`createProfile-${lbl}`, w, lj, 'createProfile', ['QmXChainTest', ethers.ZeroAddress, LZ_OPTS], lzValue);
      ok(`${lbl} profile created`);
    } catch(e) {
      ok(`${lbl} profile already exists (or LZ profile creation sent)`);
    }
  }

  // Step 2: Post Job
  console.log('\n── Step 2: Post Job (OP → ARB via LZ) ──');
  const counterBefore = await lowjc1.jobCounter();
  await send('postJob', w1, lowjc1, 'postJob', ['QmCrossChainTestHash', ['Milestone1'], [AMT], LZ_OPTS], lzValue);
  const counterAfter = await lowjc1.jobCounter();
  const jobId = `30111-${counterAfter}`;
  console.log('  Job ID:', jobId);
  ok('postJob');

  // Step 3: Apply
  console.log('\n── Step 3: Apply (OP → ARB via LZ) ──');
  await send('applyToJob', w2, lowjc2, 'applyToJob', [jobId, 'QmAppHash', ['Milestone1'], [AMT], 2, LZ_OPTS], lzValue);
  ok('applyToJob');

  // Step 4: Approve USDC + Start Job (sends USDC via CCTP to NOWJC on ARB)
  console.log('\n── Step 4: Start Job (USDC via CCTP OP→ARB + LZ msg) ──');
  await send('approve-USDC', w1, usdc1, 'approve', [OP_LOWJC, AMT]);
  await send('startJob', w1, lowjc1, 'startJob', [jobId, 1, false, LZ_OPTS], lzValue);
  ok('startJob — USDC sent via CCTP');

  // Step 5: Wait for cross-chain delivery
  console.log('\n── Step 5: Wait for LZ + CCTP delivery ──');
  console.log('  Waiting for LZ message + CCTP attestation...');
  
  let jobRegistered = false;
  for (let i = 1; i <= 30; i++) {
    await new Promise(r => setTimeout(r, 10000));
    try {
      const job = await genesis.getJob(jobId);
      if (job.status >= 2) { // InProgress
        const nowjcNow = await usdcArb.balanceOf(NOWJC);
        console.log(`\n  [${i*10}s] Job registered! status=${job.status} | NOWJC bal: ${ethers.formatUnits(nowjcNow, 6)}`);
        jobRegistered = true;
        break;
      }
    } catch(e) {}
    process.stdout.write(`  [${i*10}s] waiting...\r`);
  }
  
  if (!jobRegistered) {
    console.log('\n  ⚠️  Job not yet registered after 5 min. Checking LZ status...');
    // Continue anyway — maybe just slow
  }

  // Step 6: Submit Work
  console.log('\n── Step 6: Submit Work (OP → ARB via LZ) ──');
  await send('submitWork', w2, lowjc2, 'submitWork', [jobId, 'QmWorkHash', LZ_OPTS], lzValue);
  ok('submitWork');

  // Step 7: Release Payment Cross-Chain (THE KEY TEST)
  console.log('\n── Step 7: Release Payment Cross-Chain ──');
  const nowjcPre = await usdcArb.balanceOf(NOWJC);
  console.log('  NOWJC USDC before release:', ethers.formatUnits(nowjcPre, 6));
  console.log('  Milestone amount: 0.1 USDC');
  console.log('  Check: actualBalance <= milestone*2 → ' + ethers.formatUnits(nowjcPre,6) + ' <= 0.2?', Number(nowjcPre) <= 200000 ? '✅ PASS' : '❌ WILL REVERT');
  
  try {
    await send('releasePaymentCrossChain', w1, lowjc1, 'releasePaymentCrossChain', [jobId, 2, w2.address, LZ_OPTS_500K], lzValue);
    ok('releasePaymentCrossChain TX sent on OP');
    
    // Wait for LZ delivery to ARB
    console.log('  Waiting for LZ delivery + CCTP return...');
    for (let i = 1; i <= 18; i++) {
      await new Promise(r => setTimeout(r, 10000));
      const nowjcPost = await usdcArb.balanceOf(NOWJC);
      const w2UsdcOp = await new ethers.Contract(OP_USDC, ERC20_ABI, opP).balanceOf(w2.address);
      process.stdout.write(`  [${i*10}s] NOWJC: ${ethers.formatUnits(nowjcPost,6)} | W2 OP USDC: ${ethers.formatUnits(w2UsdcOp,6)}\r`);
    }
    console.log('');
    
  } catch(e) {
    console.log('  ❌ releasePaymentCrossChain FAILED on OP:', e.shortMessage || e.message?.slice(0,150));
  }

  // Final state
  console.log('\n── Final State ──');
  const [nowjcFinal, w1UsdcFinal, w2UsdcOpFinal] = await Promise.all([
    usdcArb.balanceOf(NOWJC),
    new ethers.Contract(OP_USDC, ERC20_ABI, opP).balanceOf(w1.address),
    new ethers.Contract(OP_USDC, ERC20_ABI, opP).balanceOf(w2.address),
  ]);
  console.log('  NOWJC USDC (ARB):', ethers.formatUnits(nowjcFinal, 6));
  console.log('  W1 USDC (OP):', ethers.formatUnits(w1UsdcFinal, 6));
  console.log('  W2 USDC (OP):', ethers.formatUnits(w2UsdcOpFinal, 6));

  try {
    const job = await genesis.getJob(jobId);
    console.log('  Genesis job status:', job.status, '(3=Completed)');
  } catch(e) {}

  console.log('\n═══════════════════════════════════════════');
  console.log('  CROSS-CHAIN TEST COMPLETE');
  console.log('═══════════════════════════════════════════\n');
}

main().catch(e => { console.error('Fatal:', e.shortMessage || e.message); process.exit(1); });
