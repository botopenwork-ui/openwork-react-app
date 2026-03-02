/**
 * E2E Test Route — Full automated cycle test
 * POST /api/e2e-test        → startJob relay test
 * POST /api/e2e-test/release → releasePayment relay test (run after startJob test)
 */

const express = require('express');
const router = express.Router();
const { Web3 } = require('web3');
const config = require('../config');

const LOWJC_OP  = '0x620205A4Ff0E652fF03a890d2A677de878a1dB63';
const USDC_OP   = '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85';
const BRIDGE_OP = '0x74566644782e98c87a12E8Fc6f7c4c72e2908a36';
const NOWJC_ARB = '0x8EfbF240240613803B9c9e716d4b5AD1388aFd99';
const USDC_ARB  = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';

const TAKER   = '0x00A325A66D53A7031d7D79790f4e6461619Ae82B';
const DOMAIN_OP = 2;

const LZ_OPTS_1M  = '0x000301001101000000000000000000000000000f4240'; // startDirectContract
const LZ_OPTS_800K = '0x000301001101000000000000000000000000000c3500'; // releasePaymentCrossChain

const LOWJC_ABI = [
  { name: 'startDirectContract', type: 'function', stateMutability: 'payable',
    inputs: [
      { name: '_jobTaker',           type: 'address'  },
      { name: '_jobDetailHash',      type: 'string'   },
      { name: '_descriptions',       type: 'string[]' },
      { name: '_amounts',            type: 'uint256[]'},
      { name: '_jobTakerChainDomain',type: 'uint32'   },
      { name: '_nativeOptions',      type: 'bytes'    },
    ], outputs: [] },
  { name: 'releasePaymentCrossChain', type: 'function', stateMutability: 'payable',
    inputs: [
      { name: '_jobId',              type: 'string'   },
      { name: '_destinationDomain',  type: 'uint32'   },
      { name: '_recipient',          type: 'address'  },
      { name: '_nativeOptions',      type: 'bytes'    },
    ], outputs: [] },
  { name: 'getJobCount', type: 'function', stateMutability: 'view',
    inputs: [], outputs: [{ type: 'uint256' }] },
];

const BRIDGE_ABI = [
  { name: 'quoteNativeChain', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'payload', type: 'bytes' }, { name: 'options', type: 'bytes' }],
    outputs: [{ name: 'fee', type: 'uint256' }] },
];

const ERC20_ABI = [
  { name: 'balanceOf', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'approve',   type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [{ type: 'bool' }] },
];

function setupAccounts(web3, pk) {
  const account = web3.eth.accounts.privateKeyToAccount(pk);
  web3.eth.accounts.wallet.add(account);
  return account;
}

// ── POST /api/e2e-test — startJob relay ───────────────────────────────────────
router.post('/', async (req, res) => {
  const log = [];
  const step = (msg) => { log.push(`[${new Date().toISOString()}] ${msg}`); console.log('🧪 E2E:', msg); };
  const fail = (msg, extra = {}) => res.json({ success: false, error: msg, log, ...extra });

  step('=== E2E startJob TEST START ===');
  if (!config.WALL2_PRIVATE_KEY) return fail('WALL2_PRIVATE_KEY not set');
  if (!config.isMainnet()) return fail('NETWORK_MODE must be mainnet');

  const opWeb3  = new Web3(config.OPTIMISM_RPC);
  const arbWeb3 = new Web3(config.ARBITRUM_RPC);
  const pk = config.WALL2_PRIVATE_KEY.startsWith('0x') ? config.WALL2_PRIVATE_KEY : '0x' + config.WALL2_PRIVATE_KEY;
  const account = setupAccounts(opWeb3, pk);
  const GIVER = account.address;

  try {
    const usdc   = new opWeb3.eth.Contract(ERC20_ABI, USDC_OP);
    const lowjc  = new opWeb3.eth.Contract(LOWJC_ABI, LOWJC_OP);
    const bridge = new opWeb3.eth.Contract(BRIDGE_ABI, BRIDGE_OP);
    const arbUsdc = new arbWeb3.eth.Contract(ERC20_ABI, USDC_ARB);

    const [giverUsdcRaw, giverEthRaw, nowjcBefore] = await Promise.all([
      usdc.methods.balanceOf(GIVER).call(),
      opWeb3.eth.getBalance(GIVER),
      arbUsdc.methods.balanceOf(NOWJC_ARB).call(),
    ]);
    step(`Giver USDC: ${parseFloat(giverUsdcRaw)/1e6} | ETH: ${parseFloat(opWeb3.utils.fromWei(giverEthRaw,'ether')).toFixed(6)}`);
    step(`NOWJC USDC before: ${parseFloat(nowjcBefore)/1e6}`);
    if (parseFloat(giverUsdcRaw)/1e6 < 0.1) return fail('Not enough USDC');

    const jobCount = await lowjc.methods.getJobCount().call();
    const jobId = `30111-${parseInt(jobCount)+1}`;
    step(`Predicted Job ID: ${jobId}`);

    const jobDetailHash = `e2e-auto-${Date.now()}`;
    const TEST_AMOUNT = '100000';
    const quotePayload = opWeb3.eth.abi.encodeParameters(
      ['string','address','address','string','string','string[]','uint256[]','uint32'],
      ['startDirectContract', GIVER, TAKER, 'quote', jobDetailHash, ['E2E Milestone'], [TEST_AMOUNT], DOMAIN_OP]
    );
    const quotedFee = await bridge.methods.quoteNativeChain(quotePayload, LZ_OPTS_1M).call();
    const lzFee = (BigInt(quotedFee) * 130n / 100n).toString();
    step(`LZ fee: ${opWeb3.utils.fromWei(lzFee,'ether')} ETH`);

    step('Approving USDC...');
    const approveTx = await usdc.methods.approve(LOWJC_OP, '300000').send({ from: GIVER, gas: 100000 });
    step(`Approve: ${approveTx.transactionHash}`);

    step('Calling startDirectContract...');
    const directTx = await lowjc.methods.startDirectContract(
      TAKER, jobDetailHash, ['E2E Milestone'], [TEST_AMOUNT], DOMAIN_OP, LZ_OPTS_1M
    ).send({ from: GIVER, value: lzFee, gas: 1000000 });
    const srcTxHash = directTx.transactionHash;
    step(`startDirectContract TX: ${srcTxHash} (gas: ${directTx.gasUsed})`);

    const fetch = require('node-fetch');
    const backendUrl = 'https://openwork-823072243332.us-central1.run.app';
    await fetch(`${backendUrl}/api/start-job`, {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ jobId, txHash: srcTxHash }),
    });
    step('Relay triggered — polling status...');

    const deadline = Date.now() + 5*60*1000;
    let done = null;
    while (Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 10000));
      const s = await (await fetch(`${backendUrl}/api/start-job-status/${jobId}`)).json();
      step(`Status: ${s.status}`);
      if (s.status === 'completed') { done = s; break; }
      if (s.status === 'failed') return fail(`Relay failed: ${s.message}`, { log });
    }
    if (!done) return fail('Timeout', { log });

    const nowjcAfter = await arbUsdc.methods.balanceOf(NOWJC_ARB).call();
    const delta = ((parseFloat(nowjcAfter) - parseFloat(nowjcBefore))/1e6).toFixed(6);
    step(`NOWJC delta: +${delta} USDC ← ${parseFloat(delta) >= 0.099 ? '✅ CONFIRMED' : '⚠️ unexpected'}`);
    step('=== startJob TEST COMPLETE ===');
    return res.json({ success: true, jobId, srcTxHash, delta, log });

  } catch (err) { step(`Exception: ${err.message}`); return fail(err.message, { log }); }
});

// ── POST /api/e2e-test/release — releasePayment relay ─────────────────────────
router.post('/release', async (req, res) => {
  const { jobId } = req.body;
  const log = [];
  const step = (msg) => { log.push(`[${new Date().toISOString()}] ${msg}`); console.log('🧪 E2E-Release:', msg); };
  const fail = (msg) => res.json({ success: false, error: msg, log });

  const targetJob = jobId || '30111-95';
  step(`=== E2E releasePayment TEST — Job ${targetJob} ===`);
  if (!config.WALL2_PRIVATE_KEY) return fail('WALL2_PRIVATE_KEY not set');

  const opWeb3  = new Web3(config.OPTIMISM_RPC);
  const arbWeb3 = new Web3(config.ARBITRUM_RPC);
  const pk = config.WALL2_PRIVATE_KEY.startsWith('0x') ? config.WALL2_PRIVATE_KEY : '0x' + config.WALL2_PRIVATE_KEY;
  const account = setupAccounts(opWeb3, pk);
  const GIVER = account.address;

  try {
    const opUsdc  = new opWeb3.eth.Contract(ERC20_ABI, USDC_OP);
    const arbUsdc = new arbWeb3.eth.Contract(ERC20_ABI, USDC_ARB);
    const bridge  = new opWeb3.eth.Contract(BRIDGE_ABI, BRIDGE_OP);
    const lowjc   = new opWeb3.eth.Contract(LOWJC_ABI, LOWJC_OP);

    const [takerBefore, nowjcBefore, giverEth] = await Promise.all([
      opUsdc.methods.balanceOf(TAKER).call(),
      arbUsdc.methods.balanceOf(NOWJC_ARB).call(),
      opWeb3.eth.getBalance(GIVER),
    ]);
    step(`Taker USDC (OP) before: ${parseFloat(takerBefore)/1e6}`);
    step(`NOWJC USDC (ARB) before: ${parseFloat(nowjcBefore)/1e6}`);
    step(`Giver ETH (OP): ${parseFloat(opWeb3.utils.fromWei(giverEth,'ether')).toFixed(6)}`);

    // Quote LZ fee for release
    const releasePayload = opWeb3.eth.abi.encodeParameters(
      ['string','address','address','string','string','string[]','uint256[]','uint32'],
      ['releasePaymentCrossChain', GIVER, TAKER, 'quote', targetJob, ['release'], ['100000'], DOMAIN_OP]
    );
    const quotedFee = await bridge.methods.quoteNativeChain(releasePayload, LZ_OPTS_800K).call();
    const lzFee = (BigInt(quotedFee) * 130n / 100n).toString();
    step(`LZ fee: ${opWeb3.utils.fromWei(lzFee,'ether')} ETH`);

    step('Calling releasePaymentCrossChain...');
    const releaseTx = await lowjc.methods.releasePaymentCrossChain(
      targetJob, DOMAIN_OP, TAKER, LZ_OPTS_800K
    ).send({ from: GIVER, value: lzFee, gas: 500000 });
    const releaseTxHash = releaseTx.transactionHash;
    step(`releasePaymentCrossChain TX: ${releaseTxHash} (gas: ${releaseTx.gasUsed})`);
    step(`View: https://optimistic.etherscan.io/tx/${releaseTxHash}`);

    const fetch = require('node-fetch');
    const backendUrl = 'https://openwork-823072243332.us-central1.run.app';
    const statusKey = `${targetJob}-${releaseTxHash}`;
    await fetch(`${backendUrl}/api/release-payment`, {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ jobId: targetJob, opSepoliaTxHash: releaseTxHash }),
    });
    step(`Relay triggered — status key: ${statusKey}`);
    step('Polling (LZ takes ~20-40s + 30s backend delay + Circle attestation ~30s)...');

    const deadline = Date.now() + 8*60*1000; // 8 min
    let done = null;
    while (Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 15000));
      const s = await (await fetch(`${backendUrl}/api/release-payment-status/${statusKey}`)).json();
      step(`Status: ${s.status || 'unknown'} — ${s.message || ''}`);
      if (s.status === 'completed') { done = s; break; }
      if (s.status === 'failed') return fail(`Relay failed: ${s.message || s.error}`, { log });
      if (!s.success && s.error === `Payment status not found`) {
        step('  (status not yet available, still processing...)');
      }
    }
    if (!done) return fail('Timeout after 8 min', { log });

    const [takerAfter, nowjcAfter] = await Promise.all([
      opUsdc.methods.balanceOf(TAKER).call(),
      arbUsdc.methods.balanceOf(NOWJC_ARB).call(),
    ]);
    const takerDelta  = ((parseFloat(takerAfter)  - parseFloat(takerBefore))/1e6).toFixed(6);
    const nowjcDelta  = ((parseFloat(nowjcAfter)  - parseFloat(nowjcBefore))/1e6).toFixed(6);
    step(`Taker USDC delta: ${takerDelta >= 0 ? '+' : ''}${takerDelta} ${parseFloat(takerDelta) >= 0.099 ? '✅' : '⚠️'}`);
    step(`NOWJC USDC delta: ${nowjcDelta}`);
    step('=== releasePayment TEST COMPLETE ===');

    return res.json({
      success: true, jobId: targetJob, releaseTxHash,
      takerBefore: parseFloat(takerBefore)/1e6,
      takerAfter:  parseFloat(takerAfter)/1e6,
      takerDelta, nowjcDelta,
      completionTxHash: done.completionTxHash,
      log,
    });

  } catch (err) { step(`Exception: ${err.message}`); return fail(err.message); }
});


module.exports = router;
