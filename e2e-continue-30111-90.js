/**
 * OpenWork E2E - Continue job 30111-90
 * 
 * Job 30111-90 is Open on LOWJC (OP mainnet).
 * This script picks up from step 2: apply → startJob → releasePaymentCrossChain
 * 
 * Root cause of previous failure: job ID prefix should be LZ EID (30111), not CCTP domain (2).
 */

'use strict';

const ethers = require('/data/.openclaw/workspace/openwork/backend/node_modules/ethers');
const https = require('https');
const fs = require('fs');

const OPTIMISM_RPC = 'https://opt-mainnet.g.alchemy.com/v2/ECvjGU_6M0Jrw6wlFkPo2ZbonbfW5oIZ';
const BACKEND_URL = 'https://openwork-823072243332.us-central1.run.app';
const JOB_ID = '30111-90';

const CONTRACTS = {
  LOWJC:        '0x620205A4Ff0E652fF03a890d2A677de878a1dB63',
  USDC:         '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
  LOCAL_BRIDGE: '0x74566644782e98c87a12E8Fc6f7c4c72e2908a36',
};

const CCTP_DOMAIN_ARBITRUM = 3;
const LZ_OPTIONS = '0x0003010011010000000000000000000000000007a120';

const WALLET1_PK = process.env.WALLET1_PRIVATE_KEY;
const WALLET2_PK = process.env.WALLET2_PRIVATE_KEY;

const LOWJC_ABI = [
  'function applyToJob(string _jobId, string _appHash, string[] _descriptions, uint256[] _amounts, uint32 _preferredChainDomain, bytes _nativeOptions) payable',
  'function startJob(string _jobId, uint256 _appId, bool _useAppMilestones, bytes _nativeOptions) payable',
  'function releasePaymentCrossChain(string _jobId, uint32 _targetChainDomain, address _targetRecipient, bytes _nativeOptions) payable',
  'event JobApplication(string indexed jobId, uint256 indexed applicationId, address indexed applicant, string applicationHash)',
  'event JobStarted(string indexed jobId, uint256 indexed applicationId, address indexed selectedApplicant, bool useApplicantMilestones)',
  'event PaymentReleased(string indexed jobId, address indexed jobGiver, address indexed applicant, uint256 amount, uint256 milestone)',
];

const BRIDGE_ABI = ['function quoteNativeChain(bytes _payload, bytes _options) view returns (uint256)'];
const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
];

function log(label, data) {
  console.log(`\n[${new Date().toISOString()}] === ${label} ===`);
  for (const [k, v] of Object.entries(data)) console.log(`  ${k}: ${v}`);
}
function info(msg) { console.log(`  [INFO] ${msg}`); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname, path: u.pathname + u.search,
      method: options.method || 'GET',
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (options.body) req.write(JSON.stringify(options.body));
    req.end();
  });
}

async function quoteLzFee(bridge, operation, addr) {
  const payload = ethers.AbiCoder.defaultAbiCoder().encode(['string', 'address'], [operation, addr]);
  const raw = await bridge.quoteNativeChain(payload, LZ_OPTIONS);
  const buf = (raw * 130n) / 100n;
  info(`LZ fee ${operation}: ${ethers.formatEther(raw)} ETH → +30% = ${ethers.formatEther(buf)} ETH`);
  return buf;
}

async function main() {
  console.log(`\n🚀 Continuing job cycle for ${JOB_ID}`);
  console.log(`   Time: ${new Date().toISOString()}`);

  const provider = new ethers.JsonRpcProvider(OPTIMISM_RPC);
  const wallet1 = new ethers.Wallet(WALLET1_PK, provider);
  const wallet2 = new ethers.Wallet(WALLET2_PK, provider);
  const lowjc1 = new ethers.Contract(CONTRACTS.LOWJC, LOWJC_ABI, wallet1);
  const lowjc2 = new ethers.Contract(CONTRACTS.LOWJC, LOWJC_ABI, wallet2);
  const usdc1 = new ethers.Contract(CONTRACTS.USDC, ERC20_ABI, wallet1);
  const bridge = new ethers.Contract(CONTRACTS.LOCAL_BRIDGE, BRIDGE_ABI, provider);

  const JOB_AMOUNT_USDC = ethers.parseUnits('0.1', 6);

  // Balances check
  const [e1, u1, e2, u2] = await Promise.all([
    provider.getBalance(wallet1.address), usdc1.balanceOf(wallet1.address),
    provider.getBalance(wallet2.address),
    new ethers.Contract(CONTRACTS.USDC, ERC20_ABI, provider).balanceOf(wallet2.address),
  ]);
  log('0. Balances', {
    wallet1_ETH: ethers.formatEther(e1), wallet1_USDC: ethers.formatUnits(u1, 6),
    wallet2_ETH: ethers.formatEther(e2), wallet2_USDC: ethers.formatUnits(u2, 6),
  });

  // ── Step 2: Apply to job 30111-90 ──────────────────────────────────────────
  info(`Step 2: Wallet 2 applying to job ${JOB_ID}...`);
  const lzApply = await quoteLzFee(bridge, 'APPLY_JOB', wallet2.address);
  const applyTx = await lowjc2.applyToJob(
    JOB_ID, 'QmE2EApp' + Date.now(),
    ['Complete the E2E test job'], [JOB_AMOUNT_USDC],
    CCTP_DOMAIN_ARBITRUM, LZ_OPTIONS,
    { value: lzApply, gasLimit: 500000 }
  );
  info(`applyToJob tx: ${applyTx.hash}`);
  const applyReceipt = await applyTx.wait();

  let applicationId = 1n;
  const iface = new ethers.Interface(LOWJC_ABI);
  for (const l of applyReceipt.logs) {
    try {
      const p = iface.parseLog(l);
      if (p?.name === 'JobApplication') { applicationId = p.args.applicationId; break; }
    } catch (_) {}
  }
  // Fallback: read jobApplicationCounter from contract
  if (applicationId === 1n) {
    // Use the application ID from event topic if available
    for (const l of applyReceipt.logs) {
      if (l.address.toLowerCase() === CONTRACTS.LOWJC.toLowerCase() && l.topics.length >= 3) {
        // topic[2] is indexed applicationId
        const appIdRaw = l.topics[2];
        if (appIdRaw && appIdRaw !== '0x') {
          applicationId = BigInt(appIdRaw);
          info(`Parsed applicationId from topic: ${applicationId}`);
          break;
        }
      }
    }
  }

  log('2. applyToJob', {
    txHash: applyTx.hash, jobId: JOB_ID,
    applicationId: applicationId.toString(),
    status: applyReceipt.status === 1 ? 'SUCCESS' : 'FAILED',
  });
  if (applyReceipt.status !== 1) throw new Error('applyToJob failed');

  await sleep(3000);

  // ── Step 3: Approve USDC + startJob ────────────────────────────────────────
  const allowance = await usdc1.allowance(wallet1.address, CONTRACTS.LOWJC);
  info(`USDC allowance: ${ethers.formatUnits(allowance, 6)}`);
  if (allowance < JOB_AMOUNT_USDC) {
    info('Approving USDC...');
    const approveTx = await usdc1.approve(CONTRACTS.LOWJC, ethers.MaxUint256, { gasLimit: 100000 });
    await approveTx.wait();
    info(`Approved: ${approveTx.hash}`);
  } else {
    info('USDC already approved ✓');
  }

  await sleep(2000);
  info(`Step 3: Starting job ${JOB_ID} with application ${applicationId}...`);
  const lzStart = await quoteLzFee(bridge, 'START_JOB', wallet1.address);
  const startTx = await lowjc1.startJob(JOB_ID, applicationId, false, LZ_OPTIONS, {
    value: lzStart, gasLimit: 600000,
  });
  info(`startJob tx: ${startTx.hash}`);
  const startReceipt = await startTx.wait();
  log('3. startJob', {
    txHash: startTx.hash, jobId: JOB_ID,
    applicationId: applicationId.toString(),
    status: startReceipt.status === 1 ? 'SUCCESS' : 'FAILED',
  });
  if (startReceipt.status !== 1) throw new Error('startJob failed');

  // Notify backend
  try {
    const r = await fetchJson(`${BACKEND_URL}/api/start-job`, { method: 'POST', body: { jobId: JOB_ID, opSepoliaTxHash: startTx.hash } });
    info(`backend start-job: ${JSON.stringify(r.body)}`);
  } catch (e) { info(`backend notify (non-fatal): ${e.message}`); }

  await sleep(5000);

  // ── Step 4: Release payment ─────────────────────────────────────────────────
  info('Step 4: Releasing payment cross-chain to Arbitrum...');
  const lzRelease = await quoteLzFee(bridge, 'RELEASE_PAYMENT', wallet1.address);
  const releaseValue = lzRelease + ethers.parseEther('0.0003');
  info(`Release value: ${ethers.formatEther(releaseValue)} ETH`);

  const releaseTx = await lowjc1.releasePaymentCrossChain(
    JOB_ID, CCTP_DOMAIN_ARBITRUM, wallet2.address, LZ_OPTIONS,
    { value: releaseValue, gasLimit: 700000 }
  );
  info(`releasePaymentCrossChain tx: ${releaseTx.hash}`);
  const releaseReceipt = await releaseTx.wait();
  log('4. releasePaymentCrossChain', {
    txHash: releaseTx.hash, jobId: JOB_ID,
    targetChain: 'Arbitrum (domain 3)', recipient: wallet2.address,
    status: releaseReceipt.status === 1 ? 'SUCCESS' : 'FAILED',
  });
  if (releaseReceipt.status !== 1) throw new Error('releasePaymentCrossChain failed');

  // Notify backend
  let statusKey = JOB_ID;
  try {
    const r = await fetchJson(`${BACKEND_URL}/api/release-payment`, { method: 'POST', body: { jobId: JOB_ID, opSepoliaTxHash: releaseTx.hash } });
    info(`backend release-payment: ${JSON.stringify(r.body)}`);
    if (r.body?.statusKey) { statusKey = r.body.statusKey; info(`statusKey: ${statusKey}`); }
  } catch (e) { info(`backend notify (non-fatal): ${e.message}`); }

  // ── Step 5: Poll CCTP ───────────────────────────────────────────────────────
  info('Step 5: Polling CCTP bridge status...');
  const pollStart = Date.now();
  const MAX_POLLS = 40; // 20 minutes
  let done = false;

  for (let i = 1; i <= MAX_POLLS && !done; i++) {
    await sleep(30000);
    const elapsed = Math.round((Date.now() - pollStart) / 1000);
    info(`CCTP poll #${i} (${elapsed}s)...`);
    try {
      const resp = await fetchJson(`${BACKEND_URL}/api/release-payment-status/${encodeURIComponent(statusKey)}`);
      const b = resp.body;
      info(`  status=${b.status} step=${b.step || ''} msg=${b.message || ''}`);
      if (b.completionTxHash) info(`  completion tx: ${b.completionTxHash}`);
      if (b.status === 'completed') {
        done = true;
        console.log(`\n✅ CCTP COMPLETED in ${elapsed}s`);
        console.log(`   Completion TX (Arbitrum): ${b.completionTxHash || 'N/A'}`);
      } else if (b.status === 'failed') {
        done = true;
        console.log(`\n❌ CCTP FAILED: ${b.lastError || b.message}`);
      }
    } catch (e) { info(`  poll error: ${e.message}`); }
  }

  if (!done) console.log(`\n⏰ CCTP polling timed out after ${MAX_POLLS * 30}s`);

  // Final wallet2 USDC balance on Arbitrum
  try {
    const arbProvider = new ethers.JsonRpcProvider('https://arb-mainnet.g.alchemy.com/v2/ECvjGU_6M0Jrw6wlFkPo2ZbonbfW5oIZ');
    const usdcArb = new ethers.Contract('0xaf88d065e77c8cC2239327C5EDb3A432268e5831', ERC20_ABI, arbProvider);
    const bal = await usdcArb.balanceOf(wallet2.address);
    console.log(`\n💰 Wallet2 USDC on Arbitrum: ${ethers.formatUnits(bal, 6)}`);
  } catch (e) { info(`Final balance check failed: ${e.message}`); }

  console.log('\n✅ Job cycle complete!');
}

main().catch(err => {
  console.error('\n❌ FAILED:', err.message);
  process.exit(1);
});
