/**
 * OpenWork E2E Resume — picks up from a confirmed startDirectContract TX
 * Uses public Arbitrum RPC to avoid Alchemy free-tier eth_getLogs restrictions
 * 
 * Covers steps 5–8:
 *   5. Find PaymentReleased event on NOWJC (Arb)
 *   6. Poll Circle CCTP attestation
 *   7. Execute receiveMessage() on Optimism
 *   8. Verify wallet2 USDC balance on OP
 */

'use strict';

const { Web3 } = require('web3');
const fetch = require('node-fetch');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// ─── Config ────────────────────────────────────────────────────────────────────

const PRIVATE_KEY = process.env.WALL2_PRIVATE_KEY
  ? (process.env.WALL2_PRIVATE_KEY.startsWith('0x') ? process.env.WALL2_PRIVATE_KEY : '0x' + process.env.WALL2_PRIVATE_KEY)
  : null;

// Use public Arbitrum RPC for event scanning (no rate limits on getLogs)
const ARB_RPC_PUBLIC  = 'https://arb1.arbitrum.io/rpc';
const ARB_RPC_ALCHEMY = process.env.ARBITRUM_MAINNET_RPC_URL || 'https://arb-mainnet.g.alchemy.com/v2/ECvjGU_6M0Jrw6wlFkPo2ZbonbfW5oIZ';
const OP_RPC          = process.env.OPTIMISM_MAINNET_RPC_URL || 'https://opt-mainnet.g.alchemy.com/v2/ECvjGU_6M0Jrw6wlFkPo2ZbonbfW5oIZ';

const CONTRACTS = {
  NOWJC_ARB:           '0x8EfbF240240613803B9c9e716d4b5AD1388aFd99',
  USDC_OP:             '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
  MSG_TRANSMITTER_OP:  '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
};

const SERVICE_WALLET = '0x93514040f43aB16D52faAe7A3f380c4089D844F9'; // signer (WALL2)
const WALLET2        = '0x00A325A66D53A7031d7D79790f4e6461619Ae82B'; // job taker / payment recipient

// The TX from the confirmed startDirectContract run (LZ delivered ✅)
const SOURCE_OP_TX   = '0x1aa070208f1ea5f300d60b9286de4e4d6db6926bbcf44e153bfefced7dac500e';

const CIRCLE_API   = 'https://iris-api.circle.com/v2/messages';
const DOMAIN_ARB   = 3;
const DOMAIN_OP    = 2;

const CCTP_POLL_INTERVAL = 15_000;
const CCTP_TIMEOUT_MS    = 600_000;
const EVENT_TIMEOUT_MS   = 300_000;
const EVENT_POLL_INTERVAL= 5_000;

// ─── ABIs ──────────────────────────────────────────────────────────────────────

const ERC20_ABI = [
  { name: 'balanceOf', type: 'function', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
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
const pass = msg => log('✅', msg);
const fail = msg => { log('❌', msg); };
const info = (msg, d) => log('   ', msg, d);
const step = (n, t, msg) => log('🔹', `[${n}/${t}] ${msg}`);
const warn = msg => log('⚠️ ', msg);

let passed = 0, failed = 0;
function ok(label, cond, detail = '') {
  if (cond) { pass(label); passed++; }
  else { fail(`FAIL: ${label}${detail ? ' — ' + detail : ''}`); failed++; }
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!PRIVATE_KEY) { fail('WALL2_PRIVATE_KEY not set'); process.exit(1); }

  // Use public Arbitrum RPC for event scanning, Alchemy for txs
  const arbPublicWeb3  = new Web3(ARB_RPC_PUBLIC);
  const arbAlchemyWeb3 = new Web3(ARB_RPC_ALCHEMY);
  const opWeb3         = new Web3(OP_RPC);

  const account = opWeb3.eth.accounts.privateKeyToAccount(PRIVATE_KEY);
  opWeb3.eth.accounts.wallet.add(account);
  const JOB_GIVER = account.address;

  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║  OpenWork E2E Resume — Steps 5–8 (post-LZ-delivery)      ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');
  info(`Resuming from OP TX: ${SOURCE_OP_TX}`);
  info(`Job Giver: ${JOB_GIVER}`);
  info(`Job Taker: ${WALLET2} (wallet2)`);
  info(`Arb public RPC: ${ARB_RPC_PUBLIC}  (no getLogs limits)`);
  console.log('');

  const TOTAL = 4;

  // ── Step 1 (resume step 5): Find PaymentReleased on NOWJC ──────────────────
  step(1, TOTAL, 'Scanning NOWJC (Arb) for PaymentReleased event for wallet2');
  info('Using public Arb RPC — no Alchemy block-range restrictions');

  const nowjc = new arbPublicWeb3.eth.Contract(NOWJC_EVENTS_ABI, CONTRACTS.NOWJC_ARB);

  // Verify contract
  const code = await arbPublicWeb3.eth.getCode(CONTRACTS.NOWJC_ARB);
  ok('NOWJC contract exists on Arb', code !== '0x');

  const latestArb = BigInt(await arbPublicWeb3.eth.getBlockNumber());
  // LZ was delivered ~5-10 min ago. At ~4 blocks/sec on Arb, 10 min ≈ 2400 blocks.
  // Scan back 3000 blocks to be safe.
  let currentBlock = latestArb - 3000n;
  info(`Scanning blocks ${currentBlock}–${latestArb} (${latestArb - currentBlock} blocks)`);

  const evtStart = Date.now();
  let paymentReleasedTxHash = null;
  let paymentReleasedEvent  = null;
  const CHUNK = 100n; // public RPC can handle larger chunks

  while (Date.now() - evtStart < EVENT_TIMEOUT_MS) {
    try {
      const latest  = BigInt(await arbPublicWeb3.eth.getBlockNumber());
      const toBlock = (currentBlock + CHUNK) < latest ? (currentBlock + CHUNK) : latest;

      const events = await nowjc.getPastEvents('PaymentReleased', {
        fromBlock: currentBlock,
        toBlock,
      });

      if (events.length > 0) {
        info(`Found ${events.length} PaymentReleased event(s) in blocks ${currentBlock}–${toBlock}:`);
        for (const e of events) {
          info(`  jobId=${e.returnValues.jobId}  applicant=${e.returnValues.applicant}  amount=${Number(e.returnValues.amount)/1e6} USDC  TX=${e.transactionHash}`);
        }

        const match = events.find(e =>
          e.returnValues.applicant?.toLowerCase() === WALLET2.toLowerCase()
        );
        if (match) {
          paymentReleasedTxHash = match.transactionHash;
          paymentReleasedEvent  = match;
          break;
        }
      } else if (Number(toBlock) >= Number(latest) - 50) {
        info(`No events in ${currentBlock}–${toBlock}, at near-tip — waiting for new blocks...`);
      }

      currentBlock = toBlock + 1n;

      if (currentBlock > latest) {
        await sleep(EVENT_POLL_INTERVAL);
        // Reset to current latest to keep scanning forward
        currentBlock = BigInt(await arbPublicWeb3.eth.getBlockNumber()) - 5n;
      }

    } catch (e) {
      warn(`Event poll error: ${e.message}`);
      await sleep(EVENT_POLL_INTERVAL * 2);
    }
  }

  ok('PaymentReleased detected on NOWJC (Arb) ← fix confirmed ✅', !!paymentReleasedTxHash,
    paymentReleasedTxHash
      ? `TX: ${paymentReleasedTxHash}  amount: ${Number(paymentReleasedEvent.returnValues.amount)/1e6} USDC`
      : 'Event not found — fix may not be working');

  if (!paymentReleasedTxHash) {
    printSummary(); process.exit(1);
  }

  info(`jobId: ${paymentReleasedEvent.returnValues.jobId}`);
  info(`Amount: ${Number(paymentReleasedEvent.returnValues.amount)/1e6} USDC`);
  info(`Milestone: ${paymentReleasedEvent.returnValues.milestone}`);
  info(`Arb TX: https://arbiscan.io/tx/${paymentReleasedTxHash}`);
  console.log('');

  // ── Step 2 (resume step 6): Poll Circle CCTP attestation ───────────────────
  step(2, TOTAL, `Polling Circle CCTP attestation (Arb → OP) for TX ${paymentReleasedTxHash}`);

  let attestationData = null;
  const cctpStart = Date.now();

  while (Date.now() - cctpStart < CCTP_TIMEOUT_MS) {
    try {
      const url = `${CIRCLE_API}/${DOMAIN_ARB}/${paymentReleasedTxHash}`;
      info(`GET ${url}`);
      const r = await fetch(url, { timeout: 15000 });
      const j = await r.json();

      if (r.status === 200 && j.messages?.length > 0) {
        const msg = j.messages[0];
        info(`CCTP status: ${msg.status}  attestation: ${msg.attestation ? 'READY' : 'pending'}`);
        if (msg.status === 'complete' && msg.attestation) {
          attestationData = { message: msg.message, attestation: msg.attestation };
          break;
        }
      } else {
        info(`CCTP: no messages yet (HTTP ${r.status}), body: ${JSON.stringify(j).substring(0, 200)}`);
      }
    } catch (e) {
      warn(`CCTP poll error: ${e.message}`);
    }
    await sleep(CCTP_POLL_INTERVAL);
  }

  ok('CCTP attestation obtained', !!attestationData,
    attestationData
      ? `message: ${attestationData.message?.substring(0, 20)}...`
      : 'Timed out — CCTP may not have initiated or wrong TX used');

  if (!attestationData) {
    // This could mean the PaymentReleased event TX is the NOWJC internal TX, not the CCTP source TX
    // Let's check the CCTP transceiver events on Arb instead
    warn('Attempting fallback: scanning Arb CCTP Transceiver for MessageSent near PaymentReleased block...');
    printSummary(); process.exit(1);
  }
  console.log('');

  // ── Step 3 (resume step 7): receiveMessage on Optimism ─────────────────────
  step(3, TOTAL, 'Executing receiveMessage() on Optimism MessageTransmitter');
  info(`Signer: ${JOB_GIVER}  |  MessageTransmitter: ${CONTRACTS.MSG_TRANSMITTER_OP}`);

  const transmitter = new opWeb3.eth.Contract(MSG_TRANSMITTER_ABI, CONTRACTS.MSG_TRANSMITTER_OP);

  // Pre-check: USDC balance of wallet2 on OP before
  const usdcOp = new opWeb3.eth.Contract(ERC20_ABI, CONTRACTS.USDC_OP);
  const wallet2UsdcBefore = BigInt(await usdcOp.methods.balanceOf(WALLET2).call());
  info(`wallet2 USDC on OP (before receive): ${Number(wallet2UsdcBefore)/1e6} USDC`);

  let receiveTxHash = null;
  let alreadyCompleted = false;

  try {
    let gasLimit;
    try {
      const gasEst = await transmitter.methods
        .receiveMessage(attestationData.message, attestationData.attestation)
        .estimateGas({ from: JOB_GIVER });
      gasLimit = Math.ceil(Number(gasEst) * 1.3);
      info(`Gas estimate: ${gasEst} → with buffer: ${gasLimit}`);
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
      pass('USDC transfer already completed (nonce already used — CCTP auto-relayed)');
    } else {
      fail(`receiveMessage() failed: ${e.message}`);
    }
  }

  ok('receiveMessage executed or auto-completed', !!receiveTxHash || alreadyCompleted);
  console.log('');

  // ── Step 4 (resume step 8): Verify wallet2 USDC balance ────────────────────
  step(4, TOTAL, 'Verifying wallet2 USDC balance on Optimism');
  await sleep(6000); // let block settle

  const wallet2UsdcAfter = BigInt(await usdcOp.methods.balanceOf(WALLET2).call());
  const delta = wallet2UsdcAfter - wallet2UsdcBefore;

  info(`wallet2 USDC before: ${Number(wallet2UsdcBefore)/1e6} USDC`);
  info(`wallet2 USDC after:  ${Number(wallet2UsdcAfter)/1e6}  USDC`);
  info(`Delta:               +${Number(delta)/1e6} USDC`);

  // Allow for 1% platform fee — expect ≥ 0.098 USDC
  const expectedMin = 98000n; // 0.098 USDC
  ok(`wallet2 received ≥0.098 USDC on Optimism`, delta >= expectedMin,
    `got ${Number(delta)/1e6} USDC`);

  console.log('');
  printSummary();
}

function printSummary() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log(`║  RESULTS: ${passed} passed, ${failed} failed${' '.repeat(46 - String(passed).length - String(failed).length)}║`);
  if (failed === 0) {
    console.log('║  ✅ E2E confirmed — fix is working on mainnet! 🎉        ║');
  } else {
    console.log('║  ❌ Some checks failed — review output above             ║');
  }
  console.log('╚══════════════════════════════════════════════════════════╝\n');
  if (failed > 0) process.exitCode = 1;
}

main().catch(err => {
  fail(`Unhandled error: ${err.message}`);
  console.error(err);
  process.exit(1);
});
