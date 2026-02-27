#!/usr/bin/env node
'use strict';
const { ethers } = require('../backend/node_modules/ethers');

const RPC  = 'https://arb-mainnet.g.alchemy.com/v2/ECvjGU_6M0Jrw6wlFkPo2ZbonbfW5oIZ';
const KEY1 = process.env.WALL2_PRIVATE_KEY;
const KEY2 = process.env.TAKER_PRIVATE_KEY;

const LOWJC  = '0xEE57ee10cCAB26f5642d4EbDC15B3881Bb0B5587';
const ATHENA = '0xE6B9d996b56162cD7eDec3a83aE72943ee7C46Bf';
const AC     = '0xEC9446A163E74D2fBF3def75324895204415166D';
const USDC   = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
const ORACLE = 'test-oracle';
const FEE    = 100000n;   // 0.1 USDC
const AMT    = 10000n;    // 0.01 USDC

const LOWJC_ABI = [
  'function createProfile(string,address)',
  'function postJob(string,string[],uint256[])',
  'function applyToJob(string,string,string[],uint256[],uint32)',
  'function startJob(string,uint256,bool)',
  'function submitWork(string,string)',
  'function jobCounter() view returns (uint256)',
];
const ATHENA_ABI = [
  'function vote(uint8,string,bool,address)',
  'function isOracleActive(string) view returns (bool)',
  'function canVote(address) view returns (bool)',
  'function getUserVotingPower(address) view returns (uint256)',
  'function votingPeriodMinutes() view returns (uint256)',
  'function disputeStartTimes(string) view returns (uint256)',
  'function settleDispute(string)',
];
const AC_ABI    = ['function raiseDispute(string,string,string,uint256,uint256)'];
const ERC20_ABI = ['function balanceOf(address) view returns (uint256)', 'function approve(address,uint256) returns (bool)'];

const ok  = s => console.log('  \u2705', s);
const fail = s => { console.log('  \u274c', s); process.exit(1); };

// Send tx with fresh nonce, wait for receipt
async function send(label, wallet, contract, method, args, extraOpts = {}) {
  const nonce = await wallet.provider.getTransactionCount(wallet.address, 'pending');
  process.stdout.write(`  \uD83D\uDD17 ${label}: `);
  const t = await contract[method](...args, { nonce, ...extraOpts });
  const r = await t.wait();
  if (r.status !== 1) fail(`${label} reverted`);
  console.log(`https://arbiscan.io/tx/${r.hash}`);
  return r;
}

async function main() {
  const p  = new ethers.JsonRpcProvider(RPC);
  const w1 = new ethers.Wallet(KEY1, p);
  const w2 = new ethers.Wallet(KEY2, p);

  console.log('\n\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557');
  console.log('\u2551  OPENWORK DISPUTE CYCLE \u2014 Arbitrum       \u2551');
  console.log('\u255a\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255d\n');
  console.log('W1 (giver/raiser):', w1.address);
  console.log('W2 (taker):       ', w2.address);

  const lowjc1  = new ethers.Contract(LOWJC,  LOWJC_ABI, w1);
  const lowjc2  = new ethers.Contract(LOWJC,  LOWJC_ABI, w2);
  const athena1 = new ethers.Contract(ATHENA, ATHENA_ABI, w1);
  const ac1     = new ethers.Contract(AC,     AC_ABI, w1);
  const usdc1   = new ethers.Contract(USDC,   ERC20_ABI, w1);
  const usdcR   = new ethers.Contract(USDC,   ERC20_ABI, p);

  // Pre-flight
  console.log('\n-- Pre-flight --');
  const w1Usdc = await usdcR.balanceOf(w1.address);
  console.log('W1 USDC:', ethers.formatUnits(w1Usdc, 6));
  if (w1Usdc < AMT + FEE) fail('W1 needs >= ' + ethers.formatUnits(AMT + FEE, 6) + ' USDC');
  if (!(await athena1.isOracleActive(ORACLE))) fail('Oracle not active');
  ok('oracle active, funds ok');

  // Step 1: Profiles
  console.log('\n-- Step 1: Profiles --');
  for (const [w, lj, lbl] of [[w1, lowjc1,'W1'],[w2, lowjc2,'W2']]) {
    try {
      await send(`createProfile-${lbl}`, w, lj, 'createProfile', ['QmDTestProfile', ethers.ZeroAddress]);
      ok(`${lbl} profile created`);
    } catch(e) {
      if (e.message?.includes('already') || e.shortMessage?.includes('already')) {
        ok(`${lbl} profile exists`);
      } else throw e;
    }
  }

  // Step 2: Post Job
  console.log('\n-- Step 2: Post Job --');
  await send('approve-USDC', w1, usdc1, 'approve', [LOWJC, AMT]);
  await send('postJob', w1, lowjc1, 'postJob', ['QmDisputeJobHash', ['Milestone1'], [AMT]]);
  const counter = await lowjc1.jobCounter();
  const chainId = (await p.getNetwork()).chainId;
  const jobId = `${chainId}-${counter}`;
  console.log('  Job ID:', jobId);
  ok(`postJob -- ${jobId}`);

  // Step 3: Apply
  console.log('\n-- Step 3: Apply --');
  await send('applyToJob', w2, lowjc2, 'applyToJob', [jobId, 'QmAppHash', ['Milestone1'], [AMT], 3]);
  ok('applyToJob');

  // Step 4: Start
  console.log('\n-- Step 4: Start Job --');
  await send('startJob', w1, lowjc1, 'startJob', [jobId, 0, false]);
  ok('startJob');

  // Step 5: Submit work
  console.log('\n-- Step 5: Submit Work --');
  await send('submitWork', w2, lowjc2, 'submitWork', [jobId, 'QmWorkHash']);
  ok('submitWork');

  // Step 6: Raise dispute
  console.log('\n-- Step 6: Raise Dispute --');
  await send('approve-fee', w1, usdc1, 'approve', [AC, FEE]);
  await send('raiseDispute', w1, ac1, 'raiseDispute', [jobId, 'QmDisputeHash', ORACLE, FEE, AMT]);
  const disputeId = `${jobId}-1`;
  console.log('  Dispute ID:', disputeId);
  ok(`raiseDispute -- ${disputeId}`);

  // Step 7: Vote (vote AGAINST raiser so no NOWJC fund release needed)
  console.log('\n-- Step 7: Vote --');
  console.log('  canVote:', await athena1.canVote(w1.address));
  console.log('  votingPower:', (await athena1.getUserVotingPower(w1.address)).toString());
  await send('vote', w1, athena1, 'vote', [0, disputeId, false, w1.address]);
  ok('voted against raiser (taker wins)');

  // Step 8: Wait
  console.log('\n-- Step 8: Waiting for voting period --');
  const startTime = Number(await athena1.disputeStartTimes(disputeId));
  const voteMin   = Number(await athena1.votingPeriodMinutes());
  const waitSec   = Math.max(5, (startTime + voteMin * 60 + 5) - Math.floor(Date.now() / 1000));
  console.log(`  Waiting ${waitSec}s...`);
  await new Promise(r => setTimeout(r, waitSec * 1000));
  ok('voting period ended');

  // Step 9: Settle
  console.log('\n-- Step 9: Settle Dispute --');
  await send('settleDispute', w1, athena1, 'settleDispute', [disputeId]);
  ok('settleDispute');

  // Summary
  const w1End = await usdcR.balanceOf(w1.address);
  const w2End = await usdcR.balanceOf(w2.address);
  console.log('\n-- Final Balances --');
  console.log('  W1 USDC:', ethers.formatUnits(w1End, 6));
  console.log('  W2 USDC:', ethers.formatUnits(w2End, 6));

  console.log('\n==========================================');
  console.log('  DISPUTE CYCLE COMPLETE \u2705');
  console.log('==========================================\n');
}

main().catch(e => { console.error('Fatal:', e.message || e); process.exit(1); });
