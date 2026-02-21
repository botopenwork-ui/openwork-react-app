/**
 * OpenWork E2E Mainnet Test
 * 
 * Tests the full job lifecycle on Optimism mainnet:
 * 1. postJob (Wallet 1)
 * 2. applyToJob (Wallet 2)
 * 3. startJob (Wallet 1) — locks USDC in escrow
 * 4. releasePaymentCrossChain (Wallet 1) — sends USDC to Arbitrum via CCTP
 * 5. Polls backend for CCTP bridge status
 */

'use strict';

const ethers = require('/data/.openclaw/workspace/openwork/backend/node_modules/ethers');
const https = require('https');
const fs = require('fs');

// ─── Config ───────────────────────────────────────────────────────────────────
const OPTIMISM_RPC = 'https://mainnet.optimism.io';
const BACKEND_URL = 'https://openwork-823072243332.us-central1.run.app';
const RESULTS_FILE = '/data/.openclaw/workspace/e2e-test-results.md';

// Contract addresses (Optimism mainnet)
const CONTRACTS = {
  LOWJC:       '0x620205A4Ff0E652fF03a890d2A677de878a1dB63', // V4 Proxy
  USDC:        '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
  LOCAL_BRIDGE:'0x74566644782e98c87a12E8Fc6f7c4c72e2908a36',
  CCTP_SENDER: '0x586C700ACFA1D129Ba2C6a6E673c55d586c32f15', // CCTP V2
};

// CCTP domains
const CCTP_DOMAIN_OPTIMISM = 2;
const CCTP_DOMAIN_ARBITRUM = 3;

// LayerZero options (500k gas dest)
const LZ_OPTIONS = '0x0003010011010000000000000000000000000007a120';

// Private keys (from backend/.env)
const WALLET1_PK = '0xREDACTED_W1_PRIVATE_KEY';
const WALLET2_PK = '0xREDACTED_W2_PRIVATE_KEY';

// ─── ABIs ─────────────────────────────────────────────────────────────────────
const LOWJC_ABI = [
  'function jobCounter() view returns (uint256)',
  'function bridge() view returns (address)',
  'function chainId() view returns (uint32)',
  'function postJob(string _jobDetailHash, string[] _descriptions, uint256[] _amounts, bytes _nativeOptions) payable',
  'function applyToJob(string _jobId, string _appHash, string[] _descriptions, uint256[] _amounts, uint32 _preferredChainDomain, bytes _nativeOptions) payable',
  'function startJob(string _jobId, uint256 _appId, bool _useAppMilestones, bytes _nativeOptions) payable',
  'function releasePaymentCrossChain(string _jobId, uint32 _targetChainDomain, address _targetRecipient, bytes _nativeOptions) payable',
  'function getJob(string _jobId) view returns (tuple(string id, address jobGiver, address[] applicants, string jobDetailHash, uint8 status, string[] workSubmissions, tuple(string descriptionHash, uint256 amount)[] milestonePayments, tuple(string descriptionHash, uint256 amount)[] finalMilestones, uint256 totalPaid, uint256 currentLockedAmount, uint256 currentMilestone, address selectedApplicant, uint256 selectedApplicationId, uint256 totalEscrowed, uint256 totalReleased))',
  'function getJobStatus(string _jobId) view returns (uint8)',
  'event JobPosted(string indexed jobId, address indexed jobGiver, string jobDetailHash)',
  'event JobApplication(string indexed jobId, uint256 indexed applicationId, address indexed applicant, string applicationHash)',
  'event JobStarted(string indexed jobId, uint256 indexed applicationId, address indexed selectedApplicant, bool useApplicantMilestones)',
  'event PaymentReleased(string indexed jobId, address indexed jobGiver, address indexed applicant, uint256 amount, uint256 milestone)',
  'event FundsSent(string indexed jobId, address indexed jobGiver, uint256 amount)',
];

const BRIDGE_ABI = [
  'function quoteNativeChain(bytes _payload, bytes _options) view returns (uint256)',
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
];

// ─── State ────────────────────────────────────────────────────────────────────
const log = [];
const results = {
  startTime: new Date().toISOString(),
  network: 'Optimism Mainnet',
  steps: [],
};

function logStep(step, data) {
  const entry = { timestamp: new Date().toISOString(), step, ...data };
  log.push(entry);
  results.steps.push(entry);
  console.log(`\n[${entry.timestamp}] === ${step} ===`);
  for (const [k, v] of Object.entries(data)) {
    console.log(`  ${k}: ${v}`);
  }
}

function logInfo(msg) {
  console.log(`  [INFO] ${msg}`);
}

async function fetchJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const reqOptions = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: { 'Content-Type': 'application/json', ...options.headers },
    };
    const req = https.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function quoteLzFee(bridge, operation, userAddress) {
  const payload = ethers.AbiCoder.defaultAbiCoder().encode(
    ['string', 'address'],
    [operation, userAddress]
  );
  const rawFee = await bridge.quoteNativeChain(payload, LZ_OPTIONS);
  const withBuffer = (rawFee * 130n) / 100n; // +30% buffer
  logInfo(`LZ fee for ${operation}: ${ethers.formatEther(rawFee)} ETH → +30% = ${ethers.formatEther(withBuffer)} ETH`);
  return withBuffer;
}

async function saveResults(finalStatus, error = null) {
  results.endTime = new Date().toISOString();
  results.finalStatus = finalStatus;
  if (error) results.error = error.message || String(error);

  const md = [
    '# OpenWork E2E Mainnet Test Results',
    '',
    `**Start:** ${results.startTime}`,
    `**End:** ${results.endTime}`,
    `**Network:** ${results.network}`,
    `**Final Status:** ${finalStatus}`,
    error ? `**Error:** ${results.error}` : '',
    '',
    '## Step-by-Step Results',
    '',
  ];

  for (const step of results.steps) {
    md.push(`### ${step.step}`);
    md.push(`*${step.timestamp}*`);
    for (const [k, v] of Object.entries(step)) {
      if (k !== 'step' && k !== 'timestamp') {
        md.push(`- **${k}:** ${v}`);
      }
    }
    md.push('');
  }

  if (results.cctpBridge) {
    md.push('## CCTP Bridge Tracking');
    md.push('');
    for (const poll of (results.cctpBridge.polls || [])) {
      md.push(`- ${poll.time}: ${poll.status} — ${poll.message || ''}`);
    }
    md.push('');
    md.push(`**CCTP Complete:** ${results.cctpBridge.completed ? 'YES' : 'NO'}`);
    if (results.cctpBridge.completionTxHash) {
      md.push(`**Completion TxHash (Arbitrum):** ${results.cctpBridge.completionTxHash}`);
    }
    if (results.cctpBridge.elapsed) {
      md.push(`**Time to complete:** ${results.cctpBridge.elapsed}`);
    }
  }

  fs.writeFileSync(RESULTS_FILE, md.join('\n'), 'utf8');
  console.log(`\n📝 Results saved to ${RESULTS_FILE}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 OpenWork E2E Mainnet Test Starting...');
  console.log(`   Time: ${new Date().toISOString()}`);

  const provider = new ethers.JsonRpcProvider(OPTIMISM_RPC);
  const wallet1 = new ethers.Wallet(WALLET1_PK, provider);
  const wallet2 = new ethers.Wallet(WALLET2_PK, provider);

  console.log(`\n👛 Wallet 1 (Job Giver):  ${wallet1.address}`);
  console.log(`👛 Wallet 2 (Freelancer): ${wallet2.address}`);

  // Contracts
  const lowjc1 = new ethers.Contract(CONTRACTS.LOWJC, LOWJC_ABI, wallet1);
  const lowjc2 = new ethers.Contract(CONTRACTS.LOWJC, LOWJC_ABI, wallet2);
  const usdc1 = new ethers.Contract(CONTRACTS.USDC, ERC20_ABI, wallet1);
  const bridge = new ethers.Contract(CONTRACTS.LOCAL_BRIDGE, BRIDGE_ABI, provider);

  // ── Step 0: Check balances ──────────────────────────────────────────────────
  logInfo('Checking balances...');
  const [ethBal1, ethBal2, usdcBal1, usdcBal2, jobCount] = await Promise.all([
    provider.getBalance(wallet1.address),
    provider.getBalance(wallet2.address),
    usdc1.balanceOf(wallet1.address),
    new ethers.Contract(CONTRACTS.USDC, ERC20_ABI, provider).balanceOf(wallet2.address),
    lowjc1.jobCounter(),
  ]);

  logStep('0. Initial Balances', {
    wallet1_ETH: ethers.formatEther(ethBal1),
    wallet1_USDC: ethers.formatUnits(usdcBal1, 6),
    wallet2_ETH: ethers.formatEther(ethBal2),
    wallet2_USDC: ethers.formatUnits(usdcBal2, 6),
    current_job_count: jobCount.toString(),
    expected_job_number: (jobCount + 1n).toString(),
  });

  // ── Step 1: Post Job ────────────────────────────────────────────────────────
  logInfo('Step 1: Posting job with 0.1 USDC...');
  
  const JOB_AMOUNT_USDC = ethers.parseUnits('0.1', 6); // 0.1 USDC = 100000
  const jobDetailHash = 'QmE2ETestJob' + Date.now(); // Minimal IPFS-style hash for test
  const descriptions = ['E2E Test Job - Full milestone'];
  const amounts = [JOB_AMOUNT_USDC];

  const lzFeePost = await quoteLzFee(bridge, 'POST_JOB', wallet1.address);

  const step1Start = Date.now();
  const postTx = await lowjc1.postJob(jobDetailHash, descriptions, amounts, LZ_OPTIONS, {
    value: lzFeePost,
    gasLimit: 500000,
  });
  logInfo(`postJob tx sent: ${postTx.hash}`);
  const postReceipt = await postTx.wait();
  const step1Gas = postReceipt.gasUsed * postReceipt.gasPrice;

  // Parse job ID from event
  let jobId = null;
  for (const log_ of postReceipt.logs) {
    try {
      const iface = new ethers.Interface(LOWJC_ABI);
      const parsed = iface.parseLog(log_);
      if (parsed && parsed.name === 'JobPosted') {
        jobId = parsed.args.jobId;
        logInfo(`JobPosted event: jobId = ${jobId}`);
        break;
      }
    } catch (_) {}
  }

  if (!jobId) {
    // Fallback: construct expected ID using LZ EID (30111 for OP mainnet), NOT CCTP domain
    // Contract: string memory jobId = Strings.toString(chainId) + "-" + Strings.toString(++jobCounter)
    // where chainId = LayerZero EID = 30111 (NOT CCTP domain 2)
    const LZ_EID_OPTIMISM = 30111;
    const newCount = jobCount + 1n;
    jobId = `${LZ_EID_OPTIMISM}-${newCount}`;
    logInfo(`Could not parse event — using fallback jobId: ${jobId}`);
  }

  logStep('1. postJob', {
    txHash: postTx.hash,
    blockNumber: postReceipt.blockNumber.toString(),
    jobId,
    amount_USDC: '0.1',
    lzFee_ETH: ethers.formatEther(lzFeePost),
    gasUsed: postReceipt.gasUsed.toString(),
    gasCost_ETH: ethers.formatEther(step1Gas),
    duration_ms: (Date.now() - step1Start).toString(),
    status: postReceipt.status === 1 ? 'SUCCESS' : 'FAILED',
  });

  if (postReceipt.status !== 1) {
    throw new Error('postJob transaction failed');
  }

  // ── Step 2: Apply to Job (Wallet 2) ─────────────────────────────────────────
  logInfo(`Step 2: Wallet 2 applying to job ${jobId}...`);
  await sleep(3000); // Wait for a moment

  const lzFeeApply = await quoteLzFee(bridge, 'APPLY_JOB', wallet2.address);
  const appHash = 'QmE2EApplication' + Date.now();
  const appDescriptions = ['I can complete this E2E test job'];
  const appAmounts = [JOB_AMOUNT_USDC];

  const step2Start = Date.now();
  const applyTx = await lowjc2.applyToJob(
    jobId,
    appHash,
    appDescriptions,
    appAmounts,
    CCTP_DOMAIN_ARBITRUM, // preferred payment on Arbitrum
    LZ_OPTIONS,
    {
      value: lzFeeApply,
      gasLimit: 500000,
    }
  );
  logInfo(`applyToJob tx sent: ${applyTx.hash}`);
  const applyReceipt = await applyTx.wait();
  const step2Gas = applyReceipt.gasUsed * applyReceipt.gasPrice;

  // Parse application ID from event
  // ⚠️ Do NOT parse applicationId from event topics — the event has an indexed string
  // (jobId) before applicationId, which breaks topic alignment in ethers.js parsing.
  // Instead: applicationId = jobApplicationCounter[jobId] after the tx, which is just
  // the count of applications so far. For a fresh job this is always 1.
  // If running multiple cycles on the same job, read it from the contract.
  const APPLICATION_COUNTER_ABI = ['function jobApplicationCounter(string) view returns (uint256)'];
  const counterContract = new ethers.Contract(CONTRACTS.LOWJC, APPLICATION_COUNTER_ABI, provider);
  let applicationId;
  try {
    applicationId = await counterContract.jobApplicationCounter(jobId);
    logInfo(`applicationId from contract counter: ${applicationId}`);
  } catch (_) {
    applicationId = 1n; // safe default for first application
    logInfo(`applicationId fallback to 1 (counter read failed)`);
  }

  logStep('2. applyToJob', {
    txHash: applyTx.hash,
    blockNumber: applyReceipt.blockNumber.toString(),
    jobId,
    applicationId: applicationId.toString(),
    applicant: wallet2.address,
    lzFee_ETH: ethers.formatEther(lzFeeApply),
    gasUsed: applyReceipt.gasUsed.toString(),
    gasCost_ETH: ethers.formatEther(step2Gas),
    duration_ms: (Date.now() - step2Start).toString(),
    status: applyReceipt.status === 1 ? 'SUCCESS' : 'FAILED',
  });

  if (applyReceipt.status !== 1) {
    throw new Error('applyToJob transaction failed');
  }

  // ── Step 3: Approve USDC then startJob ──────────────────────────────────────
  logInfo('Step 3a: Approving USDC for LOWJC contract...');
  await sleep(2000);

  const currentAllowance = await usdc1.allowance(wallet1.address, CONTRACTS.LOWJC);
  logInfo(`Current USDC allowance: ${ethers.formatUnits(currentAllowance, 6)}`);

  let approveTxHash = 'already_approved';
  let approveGasCost = 0n;
  if (currentAllowance < JOB_AMOUNT_USDC) {
    const approveTx = await usdc1.approve(CONTRACTS.LOWJC, ethers.MaxUint256, {
      gasLimit: 100000,
    });
    logInfo(`USDC approve tx sent: ${approveTx.hash}`);
    const approveReceipt = await approveTx.wait();
    approveGasCost = approveReceipt.gasUsed * approveReceipt.gasPrice;
    approveTxHash = approveTx.hash;
    logStep('3a. USDC Approve', {
      txHash: approveTx.hash,
      gasUsed: approveReceipt.gasUsed.toString(),
      gasCost_ETH: ethers.formatEther(approveGasCost),
      status: approveReceipt.status === 1 ? 'SUCCESS' : 'FAILED',
    });
  } else {
    logInfo('USDC already approved, skipping approve tx');
    logStep('3a. USDC Approve', {
      txHash: 'skipped_already_approved',
      note: `Existing allowance: ${ethers.formatUnits(currentAllowance, 6)} USDC`,
    });
  }

  logInfo(`Step 3b: Starting job ${jobId} with application ${applicationId}...`);
  await sleep(2000);

  const lzFeeStart = await quoteLzFee(bridge, 'START_JOB', wallet1.address);

  const step3Start = Date.now();
  const startTx = await lowjc1.startJob(
    jobId,
    applicationId,
    false, // use job giver's milestones
    LZ_OPTIONS,
    {
      value: lzFeeStart,
      gasLimit: 1000000, // ⚠️ Needs 1M — startJob calls CCTP sendFast internally (~507k actual)
    }
  );
  logInfo(`startJob tx sent: ${startTx.hash}`);
  const startReceipt = await startTx.wait();
  const step3Gas = startReceipt.gasUsed * startReceipt.gasPrice;

  logStep('3b. startJob', {
    txHash: startTx.hash,
    blockNumber: startReceipt.blockNumber.toString(),
    jobId,
    applicationId: applicationId.toString(),
    lzFee_ETH: ethers.formatEther(lzFeeStart),
    gasUsed: startReceipt.gasUsed.toString(),
    gasCost_ETH: ethers.formatEther(step3Gas),
    duration_ms: (Date.now() - step3Start).toString(),
    status: startReceipt.status === 1 ? 'SUCCESS' : 'FAILED',
  });

  if (startReceipt.status !== 1) {
    throw new Error('startJob transaction failed');
  }

  // Notify backend about startJob
  logInfo('Notifying backend about startJob...');
  try {
    const startNotify = await fetchJson(`${BACKEND_URL}/api/start-job`, {
      method: 'POST',
      body: { jobId, opSepoliaTxHash: startTx.hash },
    });
    logInfo(`Backend start-job response: ${JSON.stringify(startNotify.body)}`);
  } catch (e) {
    logInfo(`Backend notification failed (non-fatal): ${e.message}`);
  }

  // ── Step 4: Release Payment Cross-Chain ─────────────────────────────────────
  logInfo('Step 4: Releasing payment cross-chain to Arbitrum...');
  await sleep(5000); // Wait a bit after startJob

  // Use a higher fee for releasePaymentCrossChain (includes CCTP fees)
  const lzFeeRelease = await quoteLzFee(bridge, 'RELEASE_PAYMENT', wallet1.address);
  // Add extra buffer for CCTP V2 fees (~0.0003 ETH additional)
  const releaseValue = lzFeeRelease + ethers.parseEther('0.0003');
  logInfo(`Release payment total value: ${ethers.formatEther(releaseValue)} ETH`);

  const step4Start = Date.now();
  const releaseTx = await lowjc1.releasePaymentCrossChain(
    jobId,
    CCTP_DOMAIN_ARBITRUM, // target chain: Arbitrum
    wallet2.address,       // target recipient: Wallet 2 on Arbitrum
    LZ_OPTIONS,
    {
      value: releaseValue,
      gasLimit: 700000,
    }
  );
  logInfo(`releasePaymentCrossChain tx sent: ${releaseTx.hash}`);
  const releaseReceipt = await releaseTx.wait();
  const step4Gas = releaseReceipt.gasUsed * releaseReceipt.gasPrice;

  logStep('4. releasePaymentCrossChain', {
    txHash: releaseTx.hash,
    blockNumber: releaseReceipt.blockNumber.toString(),
    jobId,
    targetChainDomain: CCTP_DOMAIN_ARBITRUM.toString(),
    targetRecipient: wallet2.address,
    lzFee_ETH: ethers.formatEther(lzFeeRelease),
    totalValue_ETH: ethers.formatEther(releaseValue),
    gasUsed: releaseReceipt.gasUsed.toString(),
    gasCost_ETH: ethers.formatEther(step4Gas),
    duration_ms: (Date.now() - step4Start).toString(),
    status: releaseReceipt.status === 1 ? 'SUCCESS' : 'FAILED',
  });

  if (releaseReceipt.status !== 1) {
    throw new Error('releasePaymentCrossChain transaction failed');
  }

  // Notify backend about release payment
  logInfo('Notifying backend about release payment...');
  let statusKey = jobId;
  try {
    const releaseNotify = await fetchJson(`${BACKEND_URL}/api/release-payment`, {
      method: 'POST',
      body: { jobId, opSepoliaTxHash: releaseTx.hash },
    });
    logInfo(`Backend release-payment response: ${JSON.stringify(releaseNotify.body)}`);
    if (releaseNotify.body && releaseNotify.body.statusKey) {
      statusKey = releaseNotify.body.statusKey;
      logInfo(`Status key from backend: ${statusKey}`);
    }
  } catch (e) {
    logInfo(`Backend notification failed (non-fatal): ${e.message}`);
  }

  // ── Step 5: Poll CCTP Bridge Status ─────────────────────────────────────────
  logInfo('Step 5: Polling backend for CCTP bridge status...');
  const cctp = {
    polls: [],
    completed: false,
    completionTxHash: null,
    elapsed: null,
    startTime: Date.now(),
  };
  results.cctpBridge = cctp;

  const MAX_POLLS = 40; // 40 × 30s = 20 minutes max
  let pollCount = 0;
  let cctpDone = false;

  while (pollCount < MAX_POLLS && !cctpDone) {
    await sleep(30000); // 30 second intervals
    pollCount++;

    const elapsed = Math.round((Date.now() - cctp.startTime) / 1000);
    logInfo(`CCTP poll #${pollCount} (${elapsed}s elapsed)...`);

    try {
      const resp = await fetchJson(`${BACKEND_URL}/api/release-payment-status/${encodeURIComponent(statusKey)}`);
      const body = resp.body;

      const pollEntry = {
        time: new Date().toISOString(),
        poll: pollCount,
        elapsed_s: elapsed,
        status: body.status || 'unknown',
        message: body.message || '',
        step: body.step || '',
      };

      if (body.completionTxHash) {
        pollEntry.completionTxHash = body.completionTxHash;
        cctp.completionTxHash = body.completionTxHash;
      }

      cctp.polls.push(pollEntry);
      logInfo(`  Status: ${pollEntry.status} | Step: ${pollEntry.step} | ${pollEntry.message}`);

      if (body.status === 'completed') {
        cctpDone = true;
        cctp.completed = true;
        cctp.elapsed = `${elapsed} seconds`;
        logInfo(`✅ CCTP Bridge COMPLETED in ${elapsed}s`);
        if (body.completionTxHash) {
          logInfo(`   Arbitrum completion tx: ${body.completionTxHash}`);
        }
      } else if (body.status === 'failed') {
        cctpDone = true;
        logInfo(`❌ CCTP Bridge FAILED: ${body.lastError || body.message}`);
      }
    } catch (e) {
      cctp.polls.push({
        time: new Date().toISOString(),
        poll: pollCount,
        elapsed_s: elapsed,
        status: 'poll_error',
        message: e.message,
      });
      logInfo(`  Poll error: ${e.message}`);
    }
  }

  if (!cctpDone) {
    cctp.elapsed = `>${MAX_POLLS * 30} seconds (timed out)`;
    logInfo(`⏰ CCTP polling timed out after ${MAX_POLLS * 30}s`);
  }

  // ── Final Summary ────────────────────────────────────────────────────────────
  const totalGas = step1Gas + step2Gas + approveGasCost + step3Gas + step4Gas;
  const finalStatus = cctp.completed
    ? 'SUCCESS - USDC bridged to Arbitrum'
    : cctpDone
    ? 'PARTIAL - Release tx confirmed, CCTP failed'
    : 'PARTIAL - Release tx confirmed, CCTP timed out';

  logStep('5. Final Summary', {
    jobId,
    total_gas_ETH: ethers.formatEther(totalGas),
    cctp_completed: cctp.completed.toString(),
    cctp_elapsed: cctp.elapsed || 'N/A',
    completion_tx: cctp.completionTxHash || 'pending',
    final_status: finalStatus,
  });

  await saveResults(finalStatus);
  console.log('\n✅ E2E test completed!');
}

main().catch(async (err) => {
  console.error('\n❌ E2E test FAILED:', err.message);
  console.error(err.stack);
  await saveResults('FAILED: ' + err.message, err);
  process.exit(1);
});
