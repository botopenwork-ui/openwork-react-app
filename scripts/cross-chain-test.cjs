#!/usr/bin/env node
'use strict';
const { ethers } = require('../backend/node_modules/ethers');

const OP_RPC  = 'https://opt-mainnet.g.alchemy.com/v2/ECvjGU_6M0Jrw6wlFkPo2ZbonbfW5oIZ';
const ARB_RPC = 'https://arb-mainnet.g.alchemy.com/v2/ECvjGU_6M0Jrw6wlFkPo2ZbonbfW5oIZ';
const KEY1 = process.env.WALL2_PRIVATE_KEY;
const KEY2 = process.env.TAKER_PRIVATE_KEY;

const OP_LOWJC  = '0x5cF21bFb944B6851048F9ac18a8C84F6323a8ce7'; // Jan 18 deployment
const OP_USDC   = '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85';
const OP_BRIDGE = '0x74566644782e98c87a12E8Fc6f7c4c72e2908a36';
const NOWJC     = '0x8EfbF240240613803B9c9e716d4b5AD1388aFd99';
const ARB_USDC  = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
const GENESIS   = '0xE8f7963fF3cE9f7dB129e3f619abd71cBB5Bb294';

const AMT = 100000n; // 0.1 USDC

// LZ v2 options: type3, executor gas 200000
const LZ_OPTIONS = '0x00030100110100000000000000000000000000030d40';

const LOWJC_ABI = [
  'function hasProfile(address) view returns (bool)',
  'function createProfile(string,address,bytes) payable',
  'function postJob(string,string[],uint256[],bytes) payable',
  'function applyToJob(string,string,string[],uint256[],uint32,bytes) payable',
  'function startJob(string,uint256,bool,bytes) payable',
  'function submitWork(string,string,bytes) payable',
  'function releasePaymentCrossChain(string,uint32,address,bytes) payable',
  'function jobCounter() view returns (uint256)',
  'function getJob(string) view returns (tuple(string id,address jobGiver,address[] applicants,string jobDetailHash,uint8 status,string[] workSubmissions,tuple(string,uint256)[] milestonePayments,tuple(string,uint256)[] finalMilestones,uint256 totalPaid,uint256 currentLockedAmount,uint256 currentMilestone,address selectedApplicant,uint256 selectedApplicationId,uint256 totalEscrowed,uint256 totalReleased))',
];
const BRIDGE_ABI = ['function quoteNativeChain(bytes,bytes) view returns (uint256)'];
const ERC20_ABI  = ['function balanceOf(address) view returns (uint256)', 'function approve(address,uint256)'];

const ok   = s => console.log('  ✅', s);
const fail = s => { console.log('  ❌', s); process.exit(1); };

const nonces = {};
async function send(label, wallet, contract, method, args, value = 0n) {
  const addr = wallet.address;
  if (nonces[addr] === undefined) nonces[addr] = await wallet.provider.getTransactionCount(addr, 'latest');
  const nonce = nonces[addr]++;
  process.stdout.write(`  🔗 ${label}: `);
  const t = await contract[method](...args, { nonce, value });
  const r = await t.wait();
  if (r.status !== 1) fail(`${label} reverted`);
  console.log(`https://optimistic.etherscan.io/tx/${r.hash}`);
  return r;
}

async function quoteLZ(bridge, payload) {
  return await bridge.quoteNativeChain(payload, LZ_OPTIONS);
}

async function main() {
  const opP  = new ethers.JsonRpcProvider(OP_RPC);
  const arbP = new ethers.JsonRpcProvider(ARB_RPC);
  const w1   = new ethers.Wallet(KEY1, opP);
  const w2   = new ethers.Wallet(KEY2, opP);

  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║  CROSS-CHAIN JOB CYCLE — OP → ARB → OP     ║');
  console.log('╚════════════════════════════════════════════╝\n');
  console.log('W1 (giver):  ', w1.address, '(on OP)');
  console.log('W2 (taker):  ', w2.address, '(on OP)');

  const lowjc1 = new ethers.Contract(OP_LOWJC, LOWJC_ABI, w1);
  const lowjc2 = new ethers.Contract(OP_LOWJC, LOWJC_ABI, w2);
  const bridge = new ethers.Contract(OP_BRIDGE, BRIDGE_ABI, opP);
  const usdc1  = new ethers.Contract(OP_USDC, ERC20_ABI, w1);
  const usdcArb = new ethers.Contract(ARB_USDC, ERC20_ABI, arbP);
  const nowjc  = new ethers.Contract(NOWJC, ['function balanceOf(address) view returns (uint256)'], arbP);

  // Pre-flight
  console.log('\n-- Pre-flight --');
  const [w1Usdc, w1Eth, nowjcBal] = await Promise.all([
    new ethers.Contract(OP_USDC, ERC20_ABI, opP).balanceOf(w1.address),
    opP.getBalance(w1.address),
    usdcArb.balanceOf(NOWJC),
  ]);
  console.log('  W1 USDC (OP):', ethers.formatUnits(w1Usdc, 6));
  console.log('  W1 ETH (OP): ', ethers.formatEther(w1Eth));
  console.log('  NOWJC USDC (ARB):', ethers.formatUnits(nowjcBal, 6), '← this is the residual');

  // LZ fee estimate
  const samplePayload = ethers.AbiCoder.defaultAbiCoder().encode(['string'], ['postJob']);
  const lzFee = await quoteLZ(bridge, samplePayload);
  console.log('  LZ fee est:', ethers.formatEther(lzFee), 'ETH');
  const lzValue = lzFee * 2n; // 2x safety margin

  // Step 1: Profiles
  console.log('\n-- Step 1: Profiles (OP) --');
  for (const [w, lj, lbl] of [[w1, lowjc1, 'W1'], [w2, lowjc2, 'W2']]) {
    try {
      const has = await lj.hasProfile(w.address);
      if (has) { ok(`${lbl} profile exists on OP`); continue; }
      await send(`createProfile-${lbl}`, w, lj, 'createProfile', ['QmCrossChainTest', ethers.ZeroAddress, LZ_OPTIONS], lzValue);
      ok(`${lbl} profile created`);
    } catch(e) {
      if (e.message?.includes('already') || e.shortMessage?.includes('already')) {
        nonces[w.address]--;
        ok(`${lbl} profile exists`);
      } else throw e;
    }
  }

  // Step 2: Post Job on OP
  console.log('\n-- Step 2: Post Job (OP → ARB via LZ) --');
  await send('postJob', w1, lowjc1, 'postJob', ['QmCrossChainJobHash', ['Milestone1'], [AMT], LZ_OPTIONS], lzValue);
  const counter = await lowjc1.jobCounter();
  // OP LOWJC chainId is 2 (CCTP domain), but job IDs use it
  const jobId = `2-${counter}`;
  console.log('  Job ID:', jobId);
  ok(`postJob — ${jobId}`);

  // Step 3: Apply
  console.log('\n-- Step 3: Apply (OP → ARB via LZ) --');
  await send('applyToJob', w2, lowjc2, 'applyToJob', [jobId, 'QmAppHash', ['Milestone1'], [AMT], 2, LZ_OPTIONS], lzValue);
  ok('applyToJob');

  // Step 4: Start Job (this sends USDC via CCTP to NOWJC on ARB)
  console.log('\n-- Step 4: Start Job (OP → CCTP USDC to ARB + LZ msg) --');
  await send('approve-USDC', w1, usdc1, 'approve', [OP_LOWJC, AMT]);
  await send('startJob', w1, lowjc1, 'startJob', [jobId, 1, false, LZ_OPTIONS], lzValue);
  ok('startJob — USDC sent via CCTP');

  // Wait for CCTP + LZ to deliver
  console.log('\n-- Step 5: Wait for cross-chain delivery --');
  console.log('  Waiting 120s for CCTP attestation + LZ message...');
  for (let i = 0; i < 12; i++) {
    await new Promise(r => setTimeout(r, 10000));
    const bal = await usdcArb.balanceOf(NOWJC);
    process.stdout.write(`  [${(i+1)*10}s] NOWJC bal: ${ethers.formatUnits(bal, 6)} USDC\r`);
  }
  console.log('');
  const nowjcAfter = await usdcArb.balanceOf(NOWJC);
  console.log('  NOWJC USDC after delivery:', ethers.formatUnits(nowjcAfter, 6));

  // Check Genesis to see if the job was registered
  const gen = new ethers.Contract(GENESIS, ['function getJob(string) view returns (tuple(string id,address jobGiver,address[] applicants,string jobDetailHash,uint8 status,string[] workSubmissions,uint256 totalPaid,uint256 currentMilestone,address selectedApplicant,uint256 selectedApplicationId))'], arbP);
  try {
    const job = await gen.getJob(jobId);
    console.log('  Genesis job status:', job.status, '| selectedApplicant:', job.selectedApplicant.slice(0,10));
    ok('Job registered on ARB');
  } catch(e) {
    console.log('  Genesis: job not yet registered (LZ might still be in flight)');
    console.log('  Waiting 60 more seconds...');
    await new Promise(r => setTimeout(r, 60000));
    try {
      const job = await gen.getJob(jobId);
      console.log('  Genesis job status:', job.status);
      ok('Job registered on ARB (delayed)');
    } catch(e2) {
      fail('Job never registered on ARB: ' + e2.shortMessage);
    }
  }

  // Step 6: Submit Work
  console.log('\n-- Step 6: Submit Work (OP → ARB via LZ) --');
  await send('submitWork', w2, lowjc2, 'submitWork', [jobId, 'QmWorkHash', LZ_OPTIONS], lzValue);
  ok('submitWork');

  // Step 7: Release Payment Cross-Chain (THE CRITICAL TEST)
  console.log('\n-- Step 7: Release Payment Cross-Chain (OP → ARB → CCTP back to OP) --');
  console.log('  ⚠️  This is the test — NOWJC has', ethers.formatUnits(nowjcAfter, 6), 'USDC total');
  console.log('  ⚠️  Milestone is 0.1 USDC. Max allowed = 0.2 USDC (2x milestone)');
  console.log('  ⚠️  If balance > 0.2, _validateAndCalculatePayment will REVERT');
  
  try {
    await send('releasePaymentCrossChain', w1, lowjc1, 'releasePaymentCrossChain', [jobId, 2, w2.address, LZ_OPTIONS], lzValue);
    ok('releasePaymentCrossChain TX sent');
    
    // Wait and check if W2 receives USDC on OP
    console.log('  Waiting 120s for CCTP return...');
    await new Promise(r => setTimeout(r, 120000));
    const w2UsdcFinal = await new ethers.Contract(OP_USDC, ERC20_ABI, opP).balanceOf(w2.address);
    console.log('  W2 USDC (OP):', ethers.formatUnits(w2UsdcFinal, 6));
    
  } catch(e) {
    console.log('  Error:', e.shortMessage || e.message?.slice(0,200));
    // Note: the OP tx might succeed (it's just an LZ message), but the ARB side might fail
    console.log('  ⚠️  OP tx may succeed but ARB execution may revert');
  }

  // Final state
  console.log('\n-- Final State --');
  const nowjcFinal = await usdcArb.balanceOf(NOWJC);
  console.log('  NOWJC USDC (ARB):', ethers.formatUnits(nowjcFinal, 6));

  console.log('\n==========================================');
  console.log('  CROSS-CHAIN TEST COMPLETE');
  console.log('==========================================\n');
}

main().catch(e => { console.error('Fatal:', e.shortMessage || e.message); process.exit(1); });
