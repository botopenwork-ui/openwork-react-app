/**
 * OpenWork Full E2E Test — Mainnet
 * ================================
 * Tests the complete payment flow post commit 13cb83e fix:
 * 1. Pre-flight checks (balances, backend health)
 * 2. USDC approval on Optimism
 * 3. startDirectContract on LOWJC (OP) — triggers full cross-chain flow
 * 4. Monitor LayerZero message delivery to Arbitrum
 * 5. Monitor PaymentReleased event on NOWJC (Arbitrum) ← THE FIXED PART
 * 6. Poll Circle API for CCTP attestation
 * 7. Execute receiveMessage() on destination chain
 * 8. Verify USDC balance change in job taker wallet
 *
 * Run: WALL2_PRIVATE_KEY=<key> node e2e-test.js
 */

'use strict';

const { Web3 } = require('web3');
const fetch = require('node-fetch');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// ─── Config ────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = process.env.WALL2_PRIVATE_KEY
  ? (process.env.WALL2_PRIVATE_KEY.startsWith('0x')
      ? process.env.WALL2_PRIVATE_KEY
      : '0x' + process.env.WALL2_PRIVATE_KEY)
  : null;

const OP_RPC   = process.env.OPTIMISM_MAINNET_RPC_URL  || 'https://opt-mainnet.g.alchemy.com/v2/ECvjGU_6M0Jrw6wlFkPo2ZbonbfW5oIZ';
const ARB_RPC  = process.env.ARBITRUM_MAINNET_RPC_URL  || 'https://arb-mainnet.g.alchemy.com/v2/ECvjGU_6M0Jrw6wlFkPo2ZbonbfW5oIZ';

const CONTRACTS = {
  LOWJC_OP:             '0x620205A4Ff0E652fF03a890d2A677de878a1dB63',
  NOWJC_ARB:            '0x8EfbF240240613803B9c9e716d4b5AD1388aFd99',
  USDC_OP:              '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
  USDC_ARB:             '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  MSG_TRANSMITTER_OP:   '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
  MSG_TRANSMITTER_ARB:  '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
  CCTP_TRANSCEIVER_ARB: '0x765D70496Ef775F6ba1cB7465c2e0B296eB50d87',
};

// Service wallet = the signer (WALL2_PRIVATE_KEY controls this address)
const SERVICE_WALLET = '0x93514040f43aB16D52faAe7A3f380c4089D844F9';
// wallet2 = job taker (receives the USDC payment)
const WALLET2 = '0x00A325A66D53A7031d7D79790f4e6461619Ae82B';

// LZ options: type3, executor worker, 1,000,000 gas
const LZ_OPTIONS = '0x000301001101000000000000000000000000000f4240';

// Test amount: 0.1 USDC (100,000 raw with 6 decimals)
const TEST_AMOUNT_RAW    = 100000n;
const TEST_AMOUNT_DISPLAY = '0.1 USDC';
// Approval buffer: approve more to cover CCTP fees / platform commission
const APPROVE_AMOUNT_RAW = 300000n; // 0.3 USDC — safe headroom

// CCTP domains
const DOMAIN_OP  = 2;
const DOMAIN_ARB = 3;

// Backend URL (live Cloud Run service)
const BACKEND_URL = 'https://openwork-823072243332.us-central1.run.app';

// Circle attestation API
const CIRCLE_API = 'https://iris-api.circle.com/v2/messages';

// Timeouts
const LZ_POLL_INTERVAL_MS   = 10_000;
const LZ_TIMEOUT_MS         = 300_000; // 5 min
const EVENT_POLL_INTERVAL   = 5_000;
const EVENT_TIMEOUT_MS      = 300_000;
const CCTP_POLL_INTERVAL    = 15_000;
const CCTP_TIMEOUT_MS       = 600_000; // 10 min

// ─── ABIs ──────────────────────────────────────────────────────────────────────

const ERC20_ABI = [
  { name: 'balanceOf',  type: 'function', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { name: 'approve',    type: 'function', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'nonpayable' },
  { name: 'decimals',   type: 'function', inputs: [], outputs: [{ name: '', type: 'uint8' }], stateMutability: 'view' },
  { name: 'allowance',  type: 'function', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
];

const LOWJC_ABI = [
  {
    name: 'startDirectContract',
    type: 'function',
    inputs: [
      { name: '_jobTaker',           type: 'address'   },
      { name: '_jobDetailHash',      type: 'string'    },
      { name: '_descriptions',       type: 'string[]'  },
      { name: '_amounts',            type: 'uint256[]' },
      { name: '_jobTakerChainDomain',type: 'uint32'    },
      { name: '_nativeOptions',      type: 'bytes'     },
    ],
    outputs: [],
    stateMutability: 'payable',
  },
];

const NOWJC_EVENTS_ABI = [
  {
    anonymous: false,
    inputs: [
      { indexed: true,  name: 'jobId',       type: 'string'  },
      { indexed: true,  name: 'jobGiver',    type: 'address' },
      { indexed: true,  name: 'applicant',   type: 'address' },
      { indexed: false, name: 'amount',      type: 'uint256' },
      { indexed: false, name: 'milestone',   type: 'uint256' },
    ],
    name: 'PaymentReleased',
    type: 'event',
  },
];

const MSG_TRANSMITTER_ABI = [
  {
    name: 'receiveMessage',
    type: 'function',
    inputs: [
      { name: 'message',     type: 'bytes' },
      { name: 'attestation', type: 'bytes' },
    ],
    outputs: [{ name: 'success', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

const sleep = ms => new Promise(r => setTimeout(r, ms));

function log(icon, msg, detail = '') {
  const ts = new Date().toISOString().replace('T', ' ').split('.')[0];
  console.log(`[${ts}] ${icon} ${msg}${detail ? '\n       ' + detail : ''}`);
}

function pass(msg) { log('✅', msg); }
function fail(msg) { log('❌', msg); process.exitCode = 1; }
function info(msg, detail) { log('   ', msg, detail); }
function step(n, total, msg) { log('🔹', `[${n}/${total}] ${msg}`); }
function warn(msg) { log('⚠️ ', msg); }

let passed = 0, failed = 0;
function ok(label, cond, detail = '') {
  if (cond) { pass(label); passed++; }
  else { fail(`FAIL: ${label}${detail ? ' — ' + detail : ''}`); failed++; }
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!PRIVATE_KEY) {
    fail('WALL2_PRIVATE_KEY not set. Export it before running.');
    process.exit(1);
  }

  const opWeb3  = new Web3(OP_RPC);
  const arbWeb3 = new Web3(ARB_RPC);

  const account = opWeb3.eth.accounts.privateKeyToAccount(PRIVATE_KEY);
  opWeb3.eth.accounts.wallet.add(account);
  arbWeb3.eth.accounts.wallet.add(arbWeb3.eth.accounts.privateKeyToAccount(PRIVATE_KEY));

  const JOB_GIVER = account.address;

  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║      OpenWork Full E2E Test — Mainnet                    ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');
  info(`Job Giver:  ${JOB_GIVER}`);
  info(`Job Taker:  ${WALLET2}  (wallet2 — payment recipient)`);
  info(`Amount:     ${TEST_AMOUNT_DISPLAY}`);
  info(`Taker Chain: Optimism (domain ${DOMAIN_OP}) — payment lands on OP`);
  console.log('');

  const TOTAL_STEPS = 8;

  // ── Step 1: Pre-flight checks ───────────────────────────────────────────────
  step(1, TOTAL_STEPS, 'Pre-flight checks');

  // Backend health
  try {
    const r = await fetch(`${BACKEND_URL}/health`, { timeout: 10000 });
    const j = await r.json();
    ok('Backend health', r.status === 200 && j.status === 'running', `status=${j.status}`);
    info(`Backend response: ${JSON.stringify(j)}`);
  } catch (e) {
    ok('Backend health', false, e.message);
  }

  // ETH balance on OP (job giver needs gas)
  const opEthBalance = BigInt(await opWeb3.eth.getBalance(JOB_GIVER));
  const opEthFloat   = Number(opEthBalance) / 1e18;
  ok('Job giver ETH on OP ≥ 0.002', opEthFloat >= 0.002, `${opEthFloat.toFixed(6)} ETH`);
  info(`Job giver OP ETH: ${opEthFloat.toFixed(6)} ETH`);

  // ETH balance on OP for service wallet (needs to call receive())
  const svcEthOp = Number(BigInt(await opWeb3.eth.getBalance(SERVICE_WALLET))) / 1e18;
  ok('Service wallet ETH on OP ≥ 0.001', svcEthOp >= 0.001, `${svcEthOp.toFixed(6)} ETH`);
  info(`Service wallet OP ETH: ${svcEthOp.toFixed(6)} ETH`);

  // ETH balance on Arb for service wallet
  const svcEthArb = Number(BigInt(await arbWeb3.eth.getBalance(SERVICE_WALLET))) / 1e18;
  ok('Service wallet ETH on Arb ≥ 0.001', svcEthArb >= 0.001, `${svcEthArb.toFixed(6)} ETH`);
  info(`Service wallet Arb ETH: ${svcEthArb.toFixed(6)} ETH`);

  // USDC balances (before)
  const usdcOp  = new opWeb3.eth.Contract(ERC20_ABI, CONTRACTS.USDC_OP);
  const usdcArb = new arbWeb3.eth.Contract(ERC20_ABI, CONTRACTS.USDC_ARB);

  const giverUsdcBefore  = BigInt(await usdcOp.methods.balanceOf(JOB_GIVER).call());
  const takerUsdcBefore  = BigInt(await usdcOp.methods.balanceOf(WALLET2).call()); // wallet2 receives on OP // taker receives on OP
  info(`Job giver USDC on OP (before): ${Number(giverUsdcBefore) / 1e6} USDC`);
  info(`Job taker USDC on OP (before): ${Number(takerUsdcBefore) / 1e6} USDC`);

  ok('Job giver has enough USDC on OP', giverUsdcBefore >= TEST_AMOUNT_RAW,
     `has ${Number(giverUsdcBefore) / 1e6}, need ${Number(TEST_AMOUNT_RAW) / 1e6}`);

  if (failed > 0) {
    fail('Pre-flight failed. Aborting to avoid burning funds.');
    process.exit(1);
  }

  console.log('');

  // ── Step 2: USDC Approval ───────────────────────────────────────────────────
  step(2, TOTAL_STEPS, 'Approving USDC for LOWJC on Optimism');

  const allowanceBefore = BigInt(await usdcOp.methods.allowance(JOB_GIVER, CONTRACTS.LOWJC_OP).call());
  info(`Current allowance: ${Number(allowanceBefore) / 1e6} USDC`);

  let approveTxHash;
  if (allowanceBefore >= APPROVE_AMOUNT_RAW) {
    info(`Allowance already sufficient (${Number(allowanceBefore)/1e6} USDC), skipping approve tx`);
    approveTxHash = 'skipped';
  } else {
    try {
      info(`Approving ${Number(APPROVE_AMOUNT_RAW)/1e6} USDC (buffer for CCTP fees)`);
      const gasEst = await usdcOp.methods.approve(CONTRACTS.LOWJC_OP, APPROVE_AMOUNT_RAW).estimateGas({ from: JOB_GIVER });
      const approveTx = await usdcOp.methods.approve(CONTRACTS.LOWJC_OP, APPROVE_AMOUNT_RAW).send({
        from: JOB_GIVER,
        gas: Math.ceil(Number(gasEst) * 1.3),
      });
      approveTxHash = approveTx.transactionHash;
      pass(`USDC approved — TX: ${approveTxHash}`);
    } catch (e) {
      fail(`Approve failed: ${e.message}`);
      process.exit(1);
    }
  }

  console.log('');

  // ── Step 3: startDirectContract ────────────────────────────────────────────
  step(3, TOTAL_STEPS, 'Calling startDirectContract on LOWJC (Optimism)');

  const lowjc = new opWeb3.eth.Contract(LOWJC_ABI, CONTRACTS.LOWJC_OP);

  // Generate a deterministic job detail hash for this test run
  const testJobHash = `e2e-test-${Date.now()}`;
  info(`Job detail hash: ${testJobHash}`);
  info(`Job taker (wallet2): ${WALLET2}`);
  info(`Amount: ${TEST_AMOUNT_DISPLAY} on OP (domain ${DOMAIN_OP})`);

  let directContractTxHash;
  let opTxBlock;

  try {
    const callParams = [
      WALLET2,                     // _jobTaker
      testJobHash,                 // _jobDetailHash
      ['E2E Test Milestone'],      // _descriptions
      [TEST_AMOUNT_RAW.toString()],// _amounts
      DOMAIN_OP,                   // _jobTakerChainDomain (Optimism = 2)
      LZ_OPTIONS,                  // _nativeOptions
    ];

    const gasEst = await lowjc.methods.startDirectContract(...callParams).estimateGas({
      from: JOB_GIVER,
      value: opWeb3.utils.toWei('0.0005', 'ether'),
    });
    info(`Gas estimate: ${gasEst} → with 30% buffer: ${Math.ceil(Number(gasEst) * 1.3)}`);

    const tx = await lowjc.methods.startDirectContract(...callParams).send({
      from: JOB_GIVER,
      value: opWeb3.utils.toWei('0.0005', 'ether'),
      gas: Math.ceil(Number(gasEst) * 1.3),
    });

    directContractTxHash = tx.transactionHash;
    opTxBlock = tx.blockNumber;
    pass(`startDirectContract TX: ${directContractTxHash}`);
    info(`Block: ${opTxBlock}`);
    info(`View: https://optimistic.etherscan.io/tx/${directContractTxHash}`);

    // Extract job ID from logs (LOWJC emits an event with jobId)
    info(`Gas used: ${tx.gasUsed}`);
  } catch (e) {
    fail(`startDirectContract failed: ${e.message}`);
    console.error(e);
    process.exit(1);
  }

  console.log('');

  // ── Step 4: LayerZero message monitoring ────────────────────────────────────
  step(4, TOTAL_STEPS, 'Checking LayerZero message delivery (OP → Arb)');

  let lzStatus = 'unknown';
  const lzStart = Date.now();
  let lzDelivered = false;

  while (Date.now() - lzStart < LZ_TIMEOUT_MS) {
    try {
      const r = await fetch(
        `https://scan.layerzero-api.com/v1/messages/tx/${directContractTxHash}`,
        { timeout: 15000 }
      );
      const j = await r.json();
      const msg = j?.data?.[0];
      if (msg) {
        lzStatus = msg.status?.name || 'unknown';
        const srcStatus  = msg.source?.status || '';
        const dstStatus  = msg.destination?.status || '';
        info(`LZ status: ${lzStatus} | src: ${srcStatus} | dst: ${dstStatus}`);
        if (lzStatus === 'DELIVERED' || dstStatus === 'SUCCESS' || dstStatus === 'DELIVERED') {
          lzDelivered = true;
          break;
        }
      } else {
        info('LZ: no messages found yet, waiting...');
      }
    } catch (e) {
      info(`LZ poll error: ${e.message}`);
    }
    await sleep(LZ_POLL_INTERVAL_MS);
  }

  ok('LayerZero message delivered', lzDelivered, `final status: ${lzStatus}`);
  if (!lzDelivered) warn('LZ not confirmed delivered, but proceeding to check PaymentReleased event anyway...');

  console.log('');

  // ── Step 5: PaymentReleased event on NOWJC (Arbitrum) ──────────────────────
  step(5, TOTAL_STEPS, 'Monitoring NOWJC (Arb) for PaymentReleased event ← THE KEY TEST');
  info('This confirms the event listener fix (commit 13cb83e) is working on mainnet');

  const nowjc = new arbWeb3.eth.Contract(NOWJC_EVENTS_ABI, CONTRACTS.NOWJC_ARB);

  // Verify contract exists
  const nowjcCode = await arbWeb3.eth.getCode(CONTRACTS.NOWJC_ARB);
  ok('NOWJC contract code exists on Arb', nowjcCode !== '0x');

  const arbLatest    = await arbWeb3.eth.getBlockNumber();
  let currentBlock   = BigInt(arbLatest) - 15n; // start just 15 blocks back — Alchemy free tier only allows recent blocks
  const evtStart     = Date.now();
  let paymentReleasedTxHash = null;
  let paymentReleasedEvent  = null;

  info(`Scanning from block ${currentBlock} (latest: ${arbLatest}) | network: Arbitrum One`);
  info(`Waiting 5s for LZ message to fully process on Arb before scanning...`);
  await sleep(5000);

  while (Date.now() - evtStart < EVENT_TIMEOUT_MS) {
    try {
      const latest   = BigInt(await arbWeb3.eth.getBlockNumber());
      const toBlock  = latest < currentBlock + 10n ? latest : currentBlock + 10n;

      if (toBlock >= currentBlock) {
        const events = await nowjc.getPastEvents('PaymentReleased', {
          fromBlock: currentBlock,
          toBlock,
        });

        if (events.length > 0) {
          info(`Found ${events.length} PaymentReleased event(s) in blocks ${currentBlock}–${toBlock}:`);
          for (const e of events) {
            info(`  jobId=${e.returnValues.jobId} amount=${Number(e.returnValues.amount)/1e6} USDC applicant=${e.returnValues.applicant} TX=${e.transactionHash}`);
          }

          // Look for event matching our job taker
          const match = events.find(e =>
            e.returnValues.applicant?.toLowerCase() === WALLET2.toLowerCase()
          );

          if (match) {
            paymentReleasedTxHash = match.transactionHash;
            paymentReleasedEvent  = match;
            break;
          } else {
            info(`  None match our job taker (${WALLET2}), continuing...`);
          }
        }

        currentBlock = toBlock + 1n;
      }

      if (toBlock >= latest) {
        await sleep(EVENT_POLL_INTERVAL);
      }
    } catch (e) {
      warn(`Event poll error: ${e.message}`);
      await sleep(EVENT_POLL_INTERVAL * 2);
    }
  }

  ok('PaymentReleased detected on NOWJC (Arb)', !!paymentReleasedTxHash,
     paymentReleasedTxHash
       ? `TX: ${paymentReleasedTxHash}`
       : 'Event not found within timeout — fix may not be working');

  if (paymentReleasedTxHash) {
    info(`Amount: ${Number(paymentReleasedEvent.returnValues.amount) / 1e6} USDC`);
    info(`Milestone: ${paymentReleasedEvent.returnValues.milestone}`);
    info(`View: https://arbiscan.io/tx/${paymentReleasedTxHash}`);
  }

  console.log('');

  if (!paymentReleasedTxHash) {
    fail('Cannot proceed to CCTP step without PaymentReleased event TX');
    printSummary();
    process.exit(1);
  }

  // ── Step 6: CCTP Attestation polling ───────────────────────────────────────
  step(6, TOTAL_STEPS, 'Polling Circle CCTP for attestation (Arb → OP)');
  info(`Source TX: ${paymentReleasedTxHash}`);

  let attestationData = null;
  const cctpStart = Date.now();

  while (Date.now() - cctpStart < CCTP_TIMEOUT_MS) {
    try {
      // Circle V2 API: query by source TX hash
      const url = `${CIRCLE_API}/${DOMAIN_ARB}/${paymentReleasedTxHash}`;
      info(`Polling: ${url}`);
      const r = await fetch(url, { timeout: 15000 });
      const j = await r.json();

      if (r.status === 200 && j.messages?.length > 0) {
        const msg = j.messages[0];
        info(`CCTP status: ${msg.status} | attestation: ${msg.attestation ? 'present' : 'pending'}`);

        if (msg.status === 'complete' && msg.attestation) {
          attestationData = {
            message:     msg.message,
            attestation: msg.attestation,
          };
          break;
        }
      } else {
        info(`CCTP: no messages yet (status ${r.status}), waiting...`);
      }
    } catch (e) {
      info(`CCTP poll error: ${e.message}`);
    }
    await sleep(CCTP_POLL_INTERVAL);
  }

  ok('CCTP attestation obtained', !!attestationData,
     attestationData ? `message length: ${attestationData.message?.length}` : 'timed out');

  if (!attestationData) {
    fail('No attestation. Cannot complete USDC transfer.');
    printSummary();
    process.exit(1);
  }

  console.log('');

  // ── Step 7: Execute receiveMessage on Optimism ─────────────────────────────
  step(7, TOTAL_STEPS, 'Executing receiveMessage() on Optimism MessageTransmitter');
  info(`MessageTransmitter: ${CONTRACTS.MSG_TRANSMITTER_OP}`);

  // Use service wallet to call receive (it has ETH on OP)
  const svcAccount = opWeb3.eth.accounts.privateKeyToAccount(PRIVATE_KEY);
  opWeb3.eth.accounts.wallet.add(svcAccount);

  const transmitter = new opWeb3.eth.Contract(MSG_TRANSMITTER_ABI, CONTRACTS.MSG_TRANSMITTER_OP);
  let receiveTxHash = null;
  let alreadyCompleted = false;

  try {
    let gasLimit;
    try {
      const gasEst = await transmitter.methods
        .receiveMessage(attestationData.message, attestationData.attestation)
        .estimateGas({ from: JOB_GIVER });
      gasLimit = Math.ceil(Number(gasEst) * 1.3);
      info(`Gas estimate: ${gasEst} → ${gasLimit}`);
    } catch (e) {
      warn(`Gas estimation failed (${e.message}), using 300000`);
      gasLimit = 300000;
    }

    const receiveTx = await transmitter.methods
      .receiveMessage(attestationData.message, attestationData.attestation)
      .send({ from: JOB_GIVER, gas: gasLimit });

    receiveTxHash = receiveTx.transactionHash;
    pass(`receiveMessage() TX: ${receiveTxHash}`);
    info(`Gas used: ${receiveTx.gasUsed}`);
    info(`View: https://optimistic.etherscan.io/tx/${receiveTxHash}`);
  } catch (e) {
    if (e.message.includes('Nonce already used')) {
      alreadyCompleted = true;
      pass('USDC already completed (nonce already used — CCTP auto-relayed)');
    } else {
      fail(`receiveMessage() failed: ${e.message}`);
    }
  }

  ok('receiveMessage executed (or auto-completed)', !!receiveTxHash || alreadyCompleted);

  console.log('');

  // ── Step 8: Verify USDC balance ─────────────────────────────────────────────
  step(8, TOTAL_STEPS, 'Verifying USDC balance change on Optimism');
  await sleep(5000); // let the block settle

  const takerUsdcAfter = BigInt(await usdcOp.methods.balanceOf(WALLET2).call());
  const delta = takerUsdcAfter - takerUsdcBefore;

  info(`Job taker USDC before: ${Number(takerUsdcBefore) / 1e6} USDC`);
  info(`Job taker USDC after:  ${Number(takerUsdcAfter)  / 1e6} USDC`);
  info(`Delta: +${Number(delta) / 1e6} USDC`);

  // Platform takes 1% fee, so taker receives 99% of TEST_AMOUNT_RAW
  const expectedMin = TEST_AMOUNT_RAW * 98n / 100n; // allow slight variance
  ok(`Job taker received ≈${TEST_AMOUNT_DISPLAY} on OP`, delta >= expectedMin,
     `delta=${Number(delta)/1e6}, expected≥${Number(expectedMin)/1e6}`);

  const giverUsdcAfter = BigInt(await usdcOp.methods.balanceOf(JOB_GIVER).call());
  info(`Job giver USDC after:  ${Number(giverUsdcAfter) / 1e6} USDC`);
  info(`Job giver USDC delta:  ${Number(giverUsdcAfter - giverUsdcBefore) / 1e6} USDC`);

  console.log('');
  printSummary();
}

function printSummary() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log(`║  RESULTS: ${passed} passed, ${failed} failed${' '.repeat(46 - String(passed).length - String(failed).length)}║`);
  if (failed === 0) {
    console.log('║  ✅ All tests passed — fix confirmed working on mainnet! ║');
  } else {
    console.log('║  ❌ Some tests failed — review output above              ║');
  }
  console.log('╚══════════════════════════════════════════════════════════╝\n');
  if (failed > 0) process.exitCode = 1;
}

main().catch(err => {
  fail(`Unhandled error: ${err.message}`);
  console.error(err);
  process.exit(1);
});
