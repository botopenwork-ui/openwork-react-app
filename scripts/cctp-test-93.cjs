#!/usr/bin/env node
'use strict';
/**
 * CCTP HYPOTHESIS TEST — Job 30111-93
 * Proves: OP→ARB USDC escrow via CCTPTransceiver V2
 *
 * Addresses (verified against deployment logs):
 *   OP LOWJC V4 proxy:   0x620205A4Ff0E652fF03a890d2A677de878a1dB63  (impl V3, Jan 23)
 *   OP LocalLZBridge:    0x74566644782e98c87a12E8Fc6f7c4c72e2908a36
 *   OP CCTPTransceiver:  0x586C700ACFA1D129Ba2C6a6E673c55d586c32f15  (V2, CCTP V2 TM)
 *   OP USDC:             0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85
 *   ARB NOWJC:           0x8EfbF240240613803B9c9e716d4b5AD1388aFd99
 *   ARB USDC:            0xaf88d065e77c8cC2239327C5EDb3A432268e5831
 *   ARB Genesis:         0xE8f7963fF3cE9f7dB129e3f619abd71cBB5Bb294
 *
 * LZ options: 0x000301001101000000000000000000000000000f4240
 *   type3 | executor | 17 bytes | lzReceive | 1,000,000 gas
 *   (confirmed working in Feb 10 test log)
 *
 * Function sig: startDirectContract(address,string,string[],uint256[],uint32,bytes)
 *   _jobTaker:         0x7a2B7feAB9b0e30A5368d3CC4CB8279c9606384C  (Anas deployer ≠ giver)
 *   _jobDetailHash:    "cctp-test-93"
 *   _descriptions:     ["CCTP-TEST-MILESTONE"]
 *   _amounts:          [100000]  (0.1 USDC raw)
 *   _jobTakerDomain:   2  (OP CCTP domain)
 *   _nativeOptions:    LZ_OPTS
 */

const { ethers } = require('../backend/node_modules/ethers');
const { execSync } = require('child_process');

// ── Config ──────────────────────────────────────────────────────────────────
const OP_RPC  = 'https://opt-mainnet.g.alchemy.com/v2/ECvjGU_6M0Jrw6wlFkPo2ZbonbfW5oIZ';
const ARB_RPC = 'https://arb-mainnet.g.alchemy.com/v2/ECvjGU_6M0Jrw6wlFkPo2ZbonbfW5oIZ';

const OP_LOWJC   = '0x620205A4Ff0E652fF03a890d2A677de878a1dB63';
const OP_BRIDGE  = '0x74566644782e98c87a12E8Fc6f7c4c72e2908a36';
const OP_USDC    = '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85';
const ARB_NOWJC  = '0x8EfbF240240613803B9c9e716d4b5AD1388aFd99';
const ARB_USDC   = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
const ARB_GENESIS = '0xE8f7963fF3cE9f7dB129e3f619abd71cBB5Bb294';

// Taker must differ from giver — using Anas deployer wallet
const TAKER      = '0x7a2B7feAB9b0e30A5368d3CC4CB8279c9606384C';
const AMT        = 100000n;  // 0.1 USDC
const TAKER_DOMAIN = 2;      // OP CCTP domain

// LZ options: type3, executor, lzReceive 1_000_000 gas (matches Feb10 working test)
const LZ_OPTS = '0x000301001101000000000000000000000000000f4240';

// ── ABIs ────────────────────────────────────────────────────────────────────
const LOWJC_ABI = [
  'function startDirectContract(address,string,string[],uint256[],uint32,bytes) payable',
  'function jobCounter() view returns (uint256)',
  'function getEscrowBalance(string) view returns (uint256,uint256,uint256)',
];
const BRIDGE_ABI = ['function quoteNativeChain(bytes,bytes) view returns (uint256)'];
const ERC20_ABI  = [
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address,address) view returns (uint256)',
  'function approve(address,uint256) returns (bool)',
];
const GENESIS_ABI = [
  'function getJob(string) view returns (string,address,address[],string,uint8,string[],uint256,uint256,address,uint256)',
];

// ── Helpers ──────────────────────────────────────────────────────────────────
const log  = (s) => console.log('  ✅', s);
const warn = (s) => console.log('  ⚠️ ', s);
const fail = (s) => { console.log('  ❌', s); process.exit(1); };
const sep  = (s) => console.log('\n── ' + s + ' ──');

let _nonce;
async function send(label, wallet, contract, method, args, value = 0n, gasLimit = 800000) {
  if (_nonce === undefined) _nonce = await wallet.provider.getTransactionCount(wallet.address, 'latest');
  process.stdout.write(`  🔗 ${label}: `);
  try {
    const tx = await contract[method](...args, { nonce: _nonce++, value, gasLimit });
    const r  = await tx.wait();
    if (r.status !== 1) { _nonce--; fail(`${label} reverted`); }
    const chain = (await wallet.provider.getNetwork()).chainId === 10n ? 'optimistic' : 'arbiscan';
    console.log(`https://${chain}.etherscan.io/tx/${r.hash}`);
    return r;
  } catch(e) {
    _nonce--;
    fail(`${label}: ${e.shortMessage || e.reason || e.message?.slice(0,120)}`);
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  // Get key from Cloud Run
  const gcloud = '/home/linuxbrew/.linuxbrew/opt/google-cloud-sdk/bin/gcloud';
  const svc = JSON.parse(execSync(`${gcloud} run services describe openwork --region=us-central1 --format=json 2>/dev/null`).toString());
  const key = svc.spec.template.spec.containers[0].env?.find(e => e.name === 'WALL2_PRIVATE_KEY')?.value;
  if (!key) fail('WALL2_PRIVATE_KEY not found in Cloud Run');

  const opP  = new ethers.JsonRpcProvider(OP_RPC);
  const arbP = new ethers.JsonRpcProvider(ARB_RPC);
  const wallet = new ethers.Wallet(key, opP);

  const lowjc  = new ethers.Contract(OP_LOWJC, LOWJC_ABI, wallet);
  const bridge  = new ethers.Contract(OP_BRIDGE, BRIDGE_ABI, opP);
  const usdcOp  = new ethers.Contract(OP_USDC,  ERC20_ABI, wallet);
  const usdcArb = new ethers.Contract(ARB_USDC, ERC20_ABI, arbP);
  const genesis = new ethers.Contract(ARB_GENESIS, GENESIS_ABI, arbP);

  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║  CCTP HYPOTHESIS TEST — OP → ARB (Job 30111-93)  ║');
  console.log('╚══════════════════════════════════════════════════╝\n');
  console.log('  Giver:', wallet.address);
  console.log('  Taker:', TAKER);

  // ── Pre-flight ────────────────────────────────────────────────────────────
  sep('Pre-flight');

  const [ethBal, usdcBal, nowjcBefore, jobCounter] = await Promise.all([
    opP.getBalance(wallet.address),
    usdcOp.balanceOf(wallet.address),
    usdcArb.balanceOf(ARB_NOWJC),
    lowjc.jobCounter(),
  ]);
  console.log('  SW ETH  (OP):', ethers.formatEther(ethBal));
  console.log('  SW USDC (OP):', ethers.formatUnits(usdcBal, 6));
  console.log('  NOWJC USDC (ARB) before:', ethers.formatUnits(nowjcBefore, 6));
  console.log('  jobCounter:', jobCounter.toString(), '→ next job: 30111-' + (jobCounter + 1n));

  if (usdcBal < AMT) fail('Insufficient USDC on OP (need 0.1)');

  // Dynamic LZ fee quote
  const payload = ethers.AbiCoder.defaultAbiCoder().encode(
    ['string','address','address','string','string[]','uint256[]','uint32'],
    ['startDirectContract', wallet.address, TAKER, 'cctp-test-93', ['CCTP-TEST-MILESTONE'], [AMT], TAKER_DOMAIN]
  );
  const quotedFee = await bridge.quoteNativeChain(payload, LZ_OPTS);
  const lzFee = quotedFee * 120n / 100n; // +20% buffer
  console.log('  LZ fee quoted:', ethers.formatEther(quotedFee), '→ using', ethers.formatEther(lzFee), 'ETH (+20%)');

  if (ethBal < lzFee + ethers.parseEther('0.0001')) fail('Insufficient ETH for LZ fee + gas');

  // Check USDC allowance
  const allowance = await usdcOp.allowance(wallet.address, OP_LOWJC);
  console.log('  USDC allowance:', ethers.formatUnits(allowance, 6));

  // ── Tx 1: USDC Approve ────────────────────────────────────────────────────
  sep('Tx 1: USDC Approve');
  if (allowance < AMT) {
    await send('approve USDC', wallet, usdcOp, 'approve', [OP_LOWJC, AMT]);
    log('Approved 0.1 USDC for LOWJC');
  } else {
    log('Allowance already sufficient — skipping approve');
  }

  // ── Tx 2: startDirectContract ─────────────────────────────────────────────
  sep('Tx 2: startDirectContract (THE KEY TEST)');
  console.log('  Amount: 0.1 USDC (100000 raw)');
  console.log('  Taker domain: 2 (OP CCTP domain)');
  console.log('  LZ value:', ethers.formatEther(lzFee), 'ETH');
  console.log('  Expected: USDC burns on OP → mints at NOWJC on ARB via CCTP V2');

  const nowjcBefore2 = await usdcArb.balanceOf(ARB_NOWJC);
  const usdcBefore2  = await usdcOp.balanceOf(wallet.address);

  const r = await send(
    'startDirectContract',
    wallet, lowjc, 'startDirectContract',
    [TAKER, 'cctp-test-93', ['CCTP-TEST-MILESTONE'], [AMT], TAKER_DOMAIN, LZ_OPTS],
    lzFee
  );
  const txHash = r.hash;

  const newCounter = await lowjc.jobCounter();
  const jobId = `30111-${newCounter}`;
  console.log('  Job ID:', jobId);

  const usdcAfter = await usdcOp.balanceOf(wallet.address);
  const usdcBurned = usdcBefore2 - usdcAfter;
  console.log('  USDC before:', ethers.formatUnits(usdcBefore2, 6));
  console.log('  USDC after:', ethers.formatUnits(usdcAfter, 6));
  console.log('  USDC burned on OP:', ethers.formatUnits(usdcBurned, 6),
    usdcBurned === AMT ? '✅ CCTP FIRE CONFIRMED' : usdcBurned === 0n ? '❌ NO BURN' : '⚠️  partial: ' + usdcBurned);

  // ── Monitor LZ delivery ───────────────────────────────────────────────────
  sep('Monitoring LZ + CCTP delivery to ARB (up to 3 min)');
  console.log('  LZ scan:', `https://layerzeroscan.com/tx/${txHash}`);

  let delivered = false;
  for (let i = 1; i <= 18; i++) {
    await new Promise(r => setTimeout(r, 10000));
    const nowjcNow = await usdcArb.balanceOf(ARB_NOWJC);
    const delta = nowjcNow - nowjcBefore2;

    let genesisStatus = '?';
    try {
      const job = await genesis.getJob(jobId);
      genesisStatus = job[4].toString(); // status field
    } catch(e) {}

    process.stdout.write(`  [${i*10}s] NOWJC USDC: ${ethers.formatUnits(nowjcNow, 6)} (Δ ${ethers.formatUnits(delta >= 0n ? delta : -delta, 6)}) | Genesis status: ${genesisStatus}    \r`);

    if (genesisStatus === '2') { // InProgress
      console.log(`\n  [${i*10}s] ✅ GENESIS: InProgress — LZ DELIVERED`);
      if (nowjcNow > nowjcBefore2) {
        console.log(`  NOWJC received USDC from CCTP: +${ethers.formatUnits(nowjcNow - nowjcBefore2, 6)} USDC`);
      }
      delivered = true;
      break;
    }
  }

  // ── Final state ───────────────────────────────────────────────────────────
  sep('Final State');
  const [nowjcFinal, swFinal] = await Promise.all([
    usdcArb.balanceOf(ARB_NOWJC),
    usdcOp.balanceOf(wallet.address),
  ]);
  const escrow = await lowjc.getEscrowBalance(jobId).catch(() => [0n,0n,0n]);

  console.log('  NOWJC USDC (ARB):', ethers.formatUnits(nowjcFinal, 6), `(was ${ethers.formatUnits(nowjcBefore, 6)})`);
  console.log('  SW USDC (OP):', ethers.formatUnits(swFinal, 6));
  console.log('  LOWJC escrow (escrowed/released/remaining):', escrow.map(v=>v.toString()).join(' / '));

  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║  RESULT                                           ║');
  if (usdcBurned === AMT && delivered) {
    console.log('║  ✅ CCTP WORKS — OP→ARB USDC CONFIRMED            ║');
  } else if (usdcBurned === AMT && !delivered) {
    console.log('║  🟡 USDC BURNED ON OP — LZ still in flight        ║');
  } else {
    console.log('║  ❌ CCTP DID NOT FIRE — check startDirectContract  ║');
  }
  console.log('╚══════════════════════════════════════════════════╝\n');
}

main().catch(e => { console.error('\nFatal:', e.shortMessage || e.message); process.exit(1); });
