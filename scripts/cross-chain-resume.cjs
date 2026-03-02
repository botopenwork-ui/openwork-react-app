#!/usr/bin/env node
'use strict';
const { ethers } = require('../backend/node_modules/ethers');

const OP_RPC  = 'https://opt-mainnet.g.alchemy.com/v2/ECvjGU_6M0Jrw6wlFkPo2ZbonbfW5oIZ';
const ARB_RPC = 'https://arb-mainnet.g.alchemy.com/v2/ECvjGU_6M0Jrw6wlFkPo2ZbonbfW5oIZ';
const KEY1 = process.env.WALL2_PRIVATE_KEY;
const KEY2 = process.env.TAKER_PRIVATE_KEY;

const OP_LOWJC  = '0x620205A4Ff0E652fF03a890d2A677de878a1dB63';
const OP_USDC   = '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85';
const NOWJC     = '0x8EfbF240240613803B9c9e716d4b5AD1388aFd99';
const ARB_USDC  = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
const GENESIS   = '0xE8f7963fF3cE9f7dB129e3f619abd71cBB5Bb294';

const AMT = 100000n;
const LZ_OPTS = '0x000301001101000000000000000000000000000f4240';
const LZ_OPTS_500K = '0x0003010011010000000000000000000000000007a120';

const LOWJC_ABI = [
  'function applyToJob(string,string,string[],uint256[],uint32,bytes) payable',
  'function startJob(string,uint256,bool,bytes) payable',
  'function submitWork(string,string,bytes) payable',
  'function releasePaymentCrossChain(string,uint32,address,bytes) payable',
];
const ERC20_ABI = ['function balanceOf(address) view returns (uint256)', 'function approve(address,uint256)'];
const GENESIS_ABI = ['function getJob(string) view returns (tuple(string id, address jobGiver, address[] applicants, string jobDetailHash, uint8 status, string[] workSubmissions, uint256 totalPaid, uint256 currentMilestone, address selectedApplicant, uint256 selectedApplicationId))'];

const JOB_ID = process.argv[2] || '30111-92';
const START_STEP = parseInt(process.argv[3] || '3');

const nonces = {};
async function send(label, wallet, contract, method, args, value = 0n) {
  const addr = wallet.address;
  if (nonces[addr] === undefined) nonces[addr] = await wallet.provider.getTransactionCount(addr, 'latest');
  const nonce = nonces[addr]++;
  process.stdout.write(`  🔗 ${label}: `);
  const t = await contract[method](...args, { nonce, value, gasLimit: 500000 });
  const r = await t.wait();
  if (r.status !== 1) fail(`${label} reverted`);
  console.log(`https://optimistic.etherscan.io/tx/${r.hash}`);
  return r;
}

async function main() {
  const opP  = new ethers.JsonRpcProvider(OP_RPC);
  const arbP = new ethers.JsonRpcProvider(ARB_RPC);
  const w1   = new ethers.Wallet(KEY1, opP);
  const w2   = new ethers.Wallet(KEY2, opP);
  const lowjc1 = new ethers.Contract(OP_LOWJC, LOWJC_ABI, w1);
  const lowjc2 = new ethers.Contract(OP_LOWJC, LOWJC_ABI, w2);
  const usdc1  = new ethers.Contract(OP_USDC, ERC20_ABI, w1);
  const usdcArb = new ethers.Contract(ARB_USDC, ERC20_ABI, arbP);
  const genesis = new ethers.Contract(GENESIS, GENESIS_ABI, arbP);
  const lzValue = ethers.parseEther('0.0002');

  console.log(`\nResuming cross-chain test — Job ${JOB_ID} from step ${START_STEP}\n`);

  if (START_STEP <= 3) {
    console.log('── Step 3: Apply ──');
    await send('applyToJob', w2, lowjc2, 'applyToJob', [JOB_ID, 'QmAppHash', ['Milestone1'], [AMT], 2, LZ_OPTS], lzValue);
    console.log('  ✅ applyToJob');
  }

  if (START_STEP <= 4) {
    console.log('\n── Step 4: Start Job ──');
    await send('approve-USDC', w1, usdc1, 'approve', [OP_LOWJC, AMT]);
    await send('startJob', w1, lowjc1, 'startJob', [JOB_ID, 1, false, LZ_OPTS], lzValue);
    console.log('  ✅ startJob — USDC sent via CCTP');
  }

  if (START_STEP <= 5) {
    console.log('\n── Step 5: Wait for LZ + CCTP ──');
    for (let i = 1; i <= 30; i++) {
      await new Promise(r => setTimeout(r, 10000));
      try {
        const job = await genesis.getJob(JOB_ID);
        if (job.status >= 2) {
          const bal = await usdcArb.balanceOf(NOWJC);
          console.log(`  [${i*10}s] Job ${JOB_ID} registered! status=${job.status} NOWJC: ${ethers.formatUnits(bal,6)}`);
          break;
        }
      } catch(e) {}
      if (i % 3 === 0) process.stdout.write(`  [${i*10}s] waiting...\n`);
    }
  }

  if (START_STEP <= 6) {
    console.log('\n── Step 6: Submit Work ──');
    await send('submitWork', w2, lowjc2, 'submitWork', [JOB_ID, 'QmWorkHash', LZ_OPTS], lzValue);
    console.log('  ✅ submitWork');
  }

  if (START_STEP <= 7) {
    console.log('\n── Step 7: Release Payment Cross-Chain ──');
    const nowjcPre = await usdcArb.balanceOf(NOWJC);
    console.log('  NOWJC USDC:', ethers.formatUnits(nowjcPre, 6));
    console.log('  Milestone: 0.1 USDC | Check: bal <= 0.2?', Number(nowjcPre) <= 200000 ? '✅' : '❌ WILL REVERT ON ARB');
    
    await send('releasePayment', w1, lowjc1, 'releasePaymentCrossChain', [JOB_ID, 2, w2.address, LZ_OPTS_500K], lzValue);
    console.log('  ✅ OP tx sent. Waiting for ARB execution...');
    
    for (let i = 1; i <= 18; i++) {
      await new Promise(r => setTimeout(r, 10000));
      const bal = await usdcArb.balanceOf(NOWJC);
      const w2u = await new ethers.Contract(OP_USDC, ERC20_ABI, opP).balanceOf(w2.address);
      console.log(`  [${i*10}s] NOWJC: ${ethers.formatUnits(bal,6)} | W2 OP: ${ethers.formatUnits(w2u,6)}`);
    }
  }

  console.log('\n── Final ──');
  const [nf, w2f] = await Promise.all([usdcArb.balanceOf(NOWJC), new ethers.Contract(OP_USDC, ERC20_ABI, opP).balanceOf(w2.address)]);
  console.log('  NOWJC USDC:', ethers.formatUnits(nf,6));
  console.log('  W2 USDC (OP):', ethers.formatUnits(w2f,6));
  try { const j = await genesis.getJob(JOB_ID); console.log('  Job status:', j.status); } catch(e) {}
  console.log('\n  DONE');
}

main().catch(e => { console.error('Fatal:', e.shortMessage || e.message); process.exit(1); });
