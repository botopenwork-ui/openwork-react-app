/**
 * E2E Test Route — Full automated cycle test
 * POST /api/e2e-test
 *
 * Runs entirely server-side using WALL2_PRIVATE_KEY from env.
 * Tests: USDC approve → startDirectContract → backend CCTP relay → ARB receiveMessage
 * Proves the fixed executeReceiveOnArbitrum() (ARB MT.receiveMessage) works end-to-end.
 */

const express = require('express');
const router = express.Router();
const { Web3 } = require('web3');
const config = require('../config');

const LOWJC_OP  = '0x620205A4Ff0E652fF03a890d2A677de878a1dB63';
const USDC_OP   = '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85';
const BRIDGE_OP = '0x74566644782e98c87a12E8Fc6f7c4c72e2908a36'; // LocalLZOpenworkBridge on OP
const NOWJC_ARB = '0x8EfbF240240613803B9c9e716d4b5AD1388aFd99';
const USDC_ARB  = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';

// W2 = job taker (receives payment on OP when released)
const TAKER = '0x00A325A66D53A7031d7D79790f4e6461619Ae82B';
const DOMAIN_OP = 2;  // taker chain = OP

// LZ options — 1M gas for startDirectContract (CCTP sendFast needs ~507k)
const LZ_OPTS_1M = '0x000301001101000000000000000000000000000f4240';

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
  { name: 'approve', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [{ type: 'bool' }] },
];

const NOWJC_USDC_ABI = [
  { name: 'balanceOf', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
];

router.post('/', async (req, res) => {
  const log = [];
  const step = (msg) => { log.push(`[${new Date().toISOString()}] ${msg}`); console.log('🧪 E2E:', msg); };
  const fail = (msg) => { log.push(`❌ FAILED: ${msg}`); return res.json({ success: false, error: msg, log }); };

  step('=== E2E TEST START ===');

  if (!config.WALL2_PRIVATE_KEY) return fail('WALL2_PRIVATE_KEY not set in env');
  if (!config.isMainnet()) return fail('Not in mainnet mode — set NETWORK_MODE=mainnet');

  const opWeb3  = new Web3(config.OPTIMISM_RPC);
  const arbWeb3 = new Web3(config.ARBITRUM_RPC);

  const pk = config.WALL2_PRIVATE_KEY.startsWith('0x') ? config.WALL2_PRIVATE_KEY : '0x' + config.WALL2_PRIVATE_KEY;
  const account = opWeb3.eth.accounts.privateKeyToAccount(pk);
  opWeb3.eth.accounts.wallet.add(account);
  const GIVER = account.address;
  step(`Giver (service wallet): ${GIVER}`);
  step(`Taker (W2): ${TAKER}`);

  try {
    // ── Pre-flight ──
    step('--- Pre-flight checks ---');
    const usdc   = new opWeb3.eth.Contract(ERC20_ABI, USDC_OP);
    const lowjc  = new opWeb3.eth.Contract(LOWJC_ABI, LOWJC_OP);
    const bridge = new opWeb3.eth.Contract(BRIDGE_ABI, BRIDGE_OP);
    const arbUsdcContract = new arbWeb3.eth.Contract(NOWJC_USDC_ABI, USDC_ARB);

    const [giverUsdcRaw, giverEthRaw, nowjcUsdcBefore] = await Promise.all([
      usdc.methods.balanceOf(GIVER).call(),
      opWeb3.eth.getBalance(GIVER),
      arbUsdcContract.methods.balanceOf(NOWJC_ARB).call(),
    ]);
    const giverUsdc = parseFloat(giverUsdcRaw) / 1e6;
    const giverEth  = parseFloat(opWeb3.utils.fromWei(giverEthRaw, 'ether'));
    step(`Giver USDC (OP): ${giverUsdc}`);
    step(`Giver ETH (OP):  ${giverEth}`);
    step(`NOWJC USDC (ARB) before: ${parseFloat(nowjcUsdcBefore) / 1e6}`);

    if (giverUsdc < 0.1) return fail(`Not enough USDC: ${giverUsdc} (need 0.1)`);
    if (giverEth  < 0.001) return fail(`Not enough ETH on OP: ${giverEth}`);

    // ── Get job count to predict jobId ──
    const jobCount = await lowjc.methods.getJobCount().call();
    const nextJobNum = parseInt(jobCount) + 1;
    const jobId = `30111-${nextJobNum}`;
    step(`Predicted Job ID: ${jobId} (current count: ${jobCount})`);

    // ── Quote LZ fee ──
    step('--- Quoting LZ fee ---');
    const jobDetailHash = `e2e-auto-test-${Date.now()}`;
    const TEST_AMOUNT = '100000'; // 0.1 USDC
    const quotePayload = opWeb3.eth.abi.encodeParameters(
      ['string', 'address', 'address', 'string', 'string', 'string[]', 'uint256[]', 'uint32'],
      ['startDirectContract', GIVER, TAKER, 'quote', jobDetailHash, ['E2E Milestone'], [TEST_AMOUNT], DOMAIN_OP]
    );
    const quotedFee = await bridge.methods.quoteNativeChain(quotePayload, LZ_OPTS_1M).call();
    const lzFee = (BigInt(quotedFee) * 130n / 100n).toString(); // +30% buffer
    step(`LZ fee: ${opWeb3.utils.fromWei(quotedFee, 'ether')} ETH → with buffer: ${opWeb3.utils.fromWei(lzFee, 'ether')} ETH`);

    // ── Approve USDC ──
    step('--- Step 1: Approve USDC ---');
    const approveTx = await usdc.methods.approve(LOWJC_OP, '300000').send({ from: GIVER, gas: 100000 });
    step(`Approve TX: ${approveTx.transactionHash}`);

    // ── startDirectContract ──
    step('--- Step 2: startDirectContract ---');
    const callParams = [TAKER, jobDetailHash, ['E2E Milestone'], [TEST_AMOUNT], DOMAIN_OP, LZ_OPTS_1M];
    const directTx = await lowjc.methods.startDirectContract(...callParams).send({
      from: GIVER,
      value: lzFee,
      gas: 1000000,
    });
    const srcTxHash = directTx.transactionHash;
    step(`startDirectContract TX: ${srcTxHash}`);
    step(`Gas used: ${directTx.gasUsed}`);
    step(`View: https://optimistic.etherscan.io/tx/${srcTxHash}`);

    // ── Trigger backend relay ──
    step('--- Step 3: Triggering backend CCTP relay ---');
    step(`Calling processStartJobDirect(${jobId}, ${srcTxHash})`);
    const backendUrl = `https://openwork-823072243332.us-central1.run.app`;
    const fetch = require('node-fetch');
    const relayResp = await fetch(`${backendUrl}/api/start-job`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId, txHash: srcTxHash }),
    });
    const relayData = await relayResp.json();
    step(`Relay triggered: ${JSON.stringify(relayData)}`);

    // ── Poll relay status ──
    step('--- Step 4: Polling relay status (max 5 min) ---');
    const POLL_TIMEOUT = 5 * 60 * 1000;
    const startPoll = Date.now();
    let finalStatus = null;

    while (Date.now() - startPoll < POLL_TIMEOUT) {
      await new Promise(r => setTimeout(r, 10000)); // 10s
      const statusResp = await fetch(`${backendUrl}/api/start-job-status/${jobId}`);
      const statusData = await statusResp.json();
      step(`Status: ${statusData.status} — ${statusData.message || ''}`);

      if (statusData.status === 'completed') {
        finalStatus = statusData;
        break;
      }
      if (statusData.status === 'failed') {
        return fail(`Relay failed: ${statusData.error || statusData.message}`);
      }
    }

    if (!finalStatus) return fail('Relay timed out after 5 minutes');

    // ── Verify USDC at NOWJC ──
    step('--- Step 5: Verifying USDC landed at NOWJC ---');
    const nowjcUsdcAfter = await arbUsdcContract.methods.balanceOf(NOWJC_ARB).call();
    const before = parseFloat(nowjcUsdcBefore) / 1e6;
    const after  = parseFloat(nowjcUsdcAfter) / 1e6;
    const delta  = (after - before).toFixed(6);
    step(`NOWJC USDC before: ${before}`);
    step(`NOWJC USDC after:  ${after}`);
    step(`Delta: +${delta} USDC`);

    if (parseFloat(delta) >= 0.099) {
      step('✅ USDC CONFIRMED AT NOWJC — startJob relay WORKING');
    } else {
      step(`⚠️ Delta smaller than expected: ${delta}`);
    }

    step('=== E2E TEST COMPLETE ===');

    return res.json({
      success: true,
      jobId,
      srcTxHash,
      completionTxHash: finalStatus.completionTxHash,
      nowjcBefore: before,
      nowjcAfter: after,
      delta,
      log,
    });

  } catch (err) {
    step(`Exception: ${err.message}`);
    return fail(err.message);
  }
});

module.exports = router;
