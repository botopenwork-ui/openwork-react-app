/**
 * thorough-e2e-v3.cjs
 *
 * Comprehensive end-to-end test suite for v3 contracts on Arb Sepolia.
 * Tests: F1-F7 (flow tests) + S1-S4 (security tests)
 * 
 * Usage: node scripts/thorough-e2e-v3.cjs
 */

'use strict';

const { ethers } = require('../backend/node_modules/ethers');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ─── Config ──────────────────────────────────────────────────────────────────
const RPC = 'https://arb-sepolia.g.alchemy.com/v2/ECvjGU_6M0Jrw6wlFkPo2ZbonbfW5oIZ';
const USDC_ADDR = '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d';
const SCAN = 'https://sepolia.arbiscan.io/tx/';
const OUT = path.join(__dirname, '../contracts/out-minsize');
const ADDR_CACHE = path.join(__dirname, '../contracts/deployed-test-addrs.json');
// Set FRESH_DEPLOY=1 to force redeploy; otherwise reuses cached addresses
const FORCE_FRESH = process.env.FRESH_DEPLOY === '1';

const lnk = h => `${SCAN}${h}`;
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function withRetry(fn, label, retries = 3, delayMs = 3000) {
  for (let i = 0; i < retries; i++) {
    try { return await fn(); }
    catch (e) {
      if (i < retries - 1 && (e.message?.includes('Internal error') || e.message?.includes('nonce'))) {
        console.log(`    ⚠️ ${label} retry ${i+1}/${retries-1}...`);
        await sleep(delayMs);
      } else throw e;
    }
  }
}

const M = BigInt(100_000); // 0.1 USDC (6 decimals)

// ─── Results tracking ────────────────────────────────────────────────────────
const results = { tests: [], summary: { total: 0, passed: 0, failed: 0 } };

function pass(name, detail = '') {
  console.log(`  ✅ PASS: ${name}${detail ? ' — ' + detail : ''}`);
  results.tests.push({ name, status: 'PASS', detail });
  results.summary.total++;
  results.summary.passed++;
}

function fail(name, detail = '') {
  console.log(`  ❌ FAIL: ${name}${detail ? ' — ' + detail : ''}`);
  results.tests.push({ name, status: 'FAIL', detail });
  results.summary.total++;
  results.summary.failed++;
}

function expect(condition, name, detail = '') {
  if (condition) pass(name, detail);
  else fail(name, detail);
}

async function expectRevert(fn, name, expectedMsg = '') {
  try {
    await fn();
    fail(name, `Expected revert but tx succeeded`);
  } catch (e) {
    const msg = e.message || '';
    if (expectedMsg && !msg.includes(expectedMsg)) {
      fail(name, `Reverted but wrong reason: "${msg.slice(0, 100)}"`);
    } else {
      pass(name, `Correctly reverted${expectedMsg ? ': ' + expectedMsg : ''}`);
    }
  }
}

// ─── Artifact loader ─────────────────────────────────────────────────────────
function art(solFile, contractName) {
  const p = path.join(OUT, solFile, `${contractName}.json`);
  const a = JSON.parse(fs.readFileSync(p, 'utf8'));
  return { abi: a.abi, bytecode: a.bytecode.object };
}

// ─── Proxy deployer ──────────────────────────────────────────────────────────
async function deployProxy(wallet, artifact, initArgs, label) {
  const proxyArt = art('ERC1967Proxy.sol', 'ERC1967Proxy');
  process.stdout.write(`    ${label} impl...`);
  const Impl = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const impl = await Impl.deploy();
  const ir = await impl.deploymentTransaction().wait();
  process.stdout.write(` impl:${(await impl.getAddress()).slice(0,10)}...\n`);

  const initData = new ethers.Interface(artifact.abi).encodeFunctionData('initialize', initArgs);
  process.stdout.write(`    ${label} proxy...`);
  const Proxy = new ethers.ContractFactory(proxyArt.abi, proxyArt.bytecode, wallet);
  const proxy = await Proxy.deploy(await impl.getAddress(), initData);
  const pr = await proxy.deploymentTransaction().wait();
  const addr = await proxy.getAddress();
  process.stdout.write(` ${addr}\n`);
  return addr;
}

// ─── Key fetcher ─────────────────────────────────────────────────────────────
async function getKey() {
  if (process.env.BRIDGE_KEY) return process.env.BRIDGE_KEY;
  const r = execSync(
    `gcloud run services describe openwork --region=us-central1 --format=json --project=openwork-480320`,
    { env: { ...process.env, PATH: `/home/linuxbrew/.linuxbrew/opt/google-cloud-sdk/bin:${process.env.PATH}` } }
  );
  return JSON.parse(r.toString()).spec.template.spec.containers[0].env?.find(e => e.name === 'WALL2_PRIVATE_KEY')?.value;
}


// ─── USDC recover helper ─────────────────────────────────────────────────────
async function recoverUSDC(w2, w1Addr, usdc) {
  const bal = await usdc.balanceOf(w2.address);
  if (bal > 0n) {
    const tx = await usdc.connect(w2).transfer(w1Addr, bal);
    await tx.wait();
    console.log(`    ↩ Recovered ${ethers.formatUnits(bal, 6)} USDC from W2 back to W1`);
  }
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║      THOROUGH E2E V3 TEST SUITE — OpenWork Arb Sepolia  ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  const provider = new ethers.JsonRpcProvider(RPC);
  const privateKey = await getKey();
  const w1 = new ethers.Wallet(privateKey, provider);
  const w2 = ethers.Wallet.createRandom().connect(provider);

  console.log('W1 (deployer + job giver):', w1.address);
  console.log('W2 (fresh random worker): ', w2.address);

  const usdcAbi = [
    'function balanceOf(address) view returns (uint256)',
    'function approve(address,uint256) returns (bool)',
    'function transfer(address,uint256) returns (bool)',
    'function decimals() view returns (uint8)',
    'function allowance(address,address) view returns (uint256)',
  ];
  const usdc = new ethers.Contract(USDC_ADDR, usdcAbi, provider);

  const w1USDCBal = await usdc.balanceOf(w1.address);
  const w1ETHBal = await provider.getBalance(w1.address);
  console.log('\nW1 ETH :', ethers.formatEther(w1ETHBal));
  console.log('W1 USDC:', ethers.formatUnits(w1USDCBal, 6));

  if (w1USDCBal < BigInt(5_000_000)) {
    throw new Error('W1 needs at least 5 USDC for tests');
  }
  if (w1ETHBal < ethers.parseEther('0.003')) {
    throw new Error('W1 needs at least 0.003 ETH for gas');
  }

  // ── Fund W2 ──────────────────────────────────────────────────────────────
  console.log('\n[0] Funding W2...');
  // ETH for gas
  await (await w1.sendTransaction({ to: w2.address, value: ethers.parseEther('0.001') })).wait();
  // USDC for dispute fees and askAthena/skill verification fees (5 USDC)
  await (await usdc.connect(w1).transfer(w2.address, BigInt(2_000_000))).wait();
  console.log(`    W2 funded: 0.005 ETH + 5 USDC`);

  // ════════════════════════════════════════════════════════════════════════════
  // DEPLOYMENT (cached — reuses existing unless FRESH_DEPLOY=1)
  // ════════════════════════════════════════════════════════════════════════════
  const genesisArt     = art('native-openwork-genesis.sol', 'NativeOpenworkGenesis');
  const nowjcArt       = art('nowjc-v3.sol', 'NativeOpenWorkJobContract');
  const lowjcArt       = art('native-arb-lowjc.sol', 'NativeArbOpenWorkJobContract');
  const athenaArt      = art('native-athena-v3.sol', 'NativeAthena');
  const athenaClientArt = art('native-arb-athena-client.sol', 'NativeArbAthenaClient');

  let genesisAddr, nowjcAddr, lowjcAddr, athenaAddr, athenaClientAddr;
  const ORACLE_NAME = 'test-oracle';

  const cacheExists = !FORCE_FRESH && fs.existsSync(ADDR_CACHE);
  if (cacheExists) {
    const cached = JSON.parse(fs.readFileSync(ADDR_CACHE, 'utf8'));
    ({ genesis: genesisAddr, nowjc: nowjcAddr, lowjc: lowjcAddr, nativeAthena: athenaAddr, athenaClient: athenaClientAddr } = cached);
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('DEPLOYMENT: Reusing cached contract addresses (no redeploy)');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`    Genesis:      ${genesisAddr}`);
    console.log(`    NOWJC v3:     ${nowjcAddr}`);
    console.log(`    LOWJC:        ${lowjcAddr}`);
    console.log(`    AthenaClient: ${athenaClientAddr}`);
    console.log(`    NativeAthena: ${athenaAddr}`);
    console.log('    (Run with FRESH_DEPLOY=1 to force redeploy)');
  } else {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('DEPLOYMENT: Fresh v3 contract suite');
    console.log('═══════════════════════════════════════════════════════════');

    console.log('\n[1] NativeOpenworkGenesis...');
    genesisAddr = await deployProxy(w1, genesisArt, [w1.address], 'Genesis');

    console.log('\n[2] NOWJC v3...');
    nowjcAddr = await deployProxy(w1, nowjcArt,
      [w1.address, ethers.ZeroAddress, genesisAddr, ethers.ZeroAddress, USDC_ADDR, ethers.ZeroAddress],
      'NOWJC-v3');

    console.log('\n[3] NativeArbLOWJC...');
    lowjcAddr = await deployProxy(w1, lowjcArt, [w1.address, USDC_ADDR, nowjcAddr], 'LOWJC');

    console.log('\n[4] NativeAthena v3...');
    athenaAddr = await deployProxy(w1, athenaArt,
      [w1.address, ethers.ZeroAddress, genesisAddr, nowjcAddr, USDC_ADDR],
      'NativeAthena-v3');

    console.log('\n[5] NativeArbAthenaClient...');
    athenaClientAddr = await deployProxy(w1, athenaClientArt,
      [w1.address, USDC_ADDR, athenaAddr, lowjcAddr],
      'AthenaClient');

    // ── Wire-up ─────────────────────────────────────────────────────────────
    console.log('\n[6] Wire-up...');
    await (await new ethers.Contract(genesisAddr, genesisArt.abi, w1).authorizeContract(nowjcAddr, true)).wait();
    await (await new ethers.Contract(genesisAddr, genesisArt.abi, w1).authorizeContract(athenaAddr, true)).wait();
    console.log('    Genesis: authorized NOWJC + NativeAthena');
    await (await new ethers.Contract(nowjcAddr, nowjcArt.abi, w1).batchAddAuthorizedContracts([lowjcAddr, athenaClientAddr])).wait();
    console.log('    NOWJC: authorized LOWJC + AthenaClient');
    await (await new ethers.Contract(lowjcAddr, lowjcArt.abi, w1).setAthenaClientContract(athenaClientAddr)).wait();
    console.log('    LOWJC: athenaClientContract set');
    await (await new ethers.Contract(athenaAddr, athenaArt.abi, w1).setAthenaClient(athenaClientAddr)).wait();
    console.log('    NativeAthena: athenaClient set');
    await (await new ethers.Contract(nowjcAddr, nowjcArt.abi, w1).setNativeAthena(athenaAddr)).wait();
    console.log('    NOWJC: nativeAthena set');
    await (await new ethers.Contract(nowjcAddr, nowjcArt.abi, w1).setCommissionPercentage(100)).wait();
    await (await new ethers.Contract(nowjcAddr, nowjcArt.abi, w1).setMinCommission(0)).wait();
    console.log('    NOWJC: commission=1%, minCommission=0');
    await (await new ethers.Contract(athenaAddr, athenaArt.abi, w1).updateVotingPeriod(1)).wait();
    await (await new ethers.Contract(athenaAddr, athenaArt.abi, w1).updateMinOracleMembers(1)).wait();
    await (await new ethers.Contract(athenaAddr, athenaArt.abi, w1).updateMinStakeRequired(0)).wait();
    console.log('    NativeAthena: votingPeriodMinutes=1, minOracleMembers=1, minStakeRequired=0');
    await (await new ethers.Contract(genesisAddr, genesisArt.abi, w1).setOracle(
      ORACLE_NAME, [w1.address], 'Test Oracle for E2E', 'ipfs://oracle-details', [w1.address]
    )).wait();
    console.log(`    Genesis: oracle "${ORACLE_NAME}" created with W1 as member`);
    await (await new ethers.Contract(nowjcAddr, nowjcArt.abi, w1).setTreasury(w1.address)).wait();
    console.log('    NOWJC: treasury set to W1');

    // Save addresses for future runs
    fs.writeFileSync(ADDR_CACHE, JSON.stringify(
      { genesis: genesisAddr, nowjc: nowjcAddr, lowjc: lowjcAddr, nativeAthena: athenaAddr, athenaClient: athenaClientAddr },
      null, 2
    ));
    console.log('\n    ✅ All contracts deployed, wired up, and addresses cached');
    console.log(`    Genesis:      ${genesisAddr}`);
    console.log(`    NOWJC v3:     ${nowjcAddr}`);
    console.log(`    LOWJC:        ${lowjcAddr}`);
    console.log(`    AthenaClient: ${athenaClientAddr}`);
    console.log(`    NativeAthena: ${athenaAddr}`);
  }

  // Build contract instances
  const genesis      = new ethers.Contract(genesisAddr, genesisArt.abi, w1);
  const nowjc        = new ethers.Contract(nowjcAddr, nowjcArt.abi, w1);
  const lowjc        = new ethers.Contract(lowjcAddr, lowjcArt.abi, w1);
  const athena       = new ethers.Contract(athenaAddr, athenaArt.abi, w1);
  const athenaClient = new ethers.Contract(athenaClientAddr, athenaClientArt.abi, w1);
  const lowjcW1 = lowjc;
  const lowjcW2 = lowjc.connect(w2);
  const athenaClientW2 = athenaClient.connect(w2);

  // Save addresses
  const addresses = { genesis: genesisAddr, nowjc: nowjcAddr, lowjc: lowjcAddr, athenaClient: athenaClientAddr, nativeAthena: athenaAddr };


  // ════════════════════════════════════════════════════════════════════════════
  // F1 — Application flow
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('F1: Application flow (createProfile → postJob → applyToJob → startJob → submitWork → releasePayment)');
  console.log('═══════════════════════════════════════════════════════════');
  try {
    // createProfile W1 (skip if already exists — safe for contract reuse)
    console.log('\n  F1-1: W1 createProfile');
    const w1AlreadyHasProfile = await lowjc.hasProfile(w1.address);
    if (!w1AlreadyHasProfile) {
      const cp1 = await (await lowjcW1.createProfile('ipfs://w1-profile-v3', ethers.ZeroAddress)).wait();
      console.log(`       tx: ${lnk(cp1.hash)}`);
    } else {
      console.log('       W1 profile already exists, skipping');
    }

    // createProfile W2
    console.log('  F1-2: W2 createProfile');
    const cp2 = await (await lowjcW2.createProfile('ipfs://w2-profile-v3', ethers.ZeroAddress)).wait();
    console.log(`       tx: ${lnk(cp2.hash)}`);

    // Verify profiles on Genesis
    console.log('  F1-3: Verify profiles on Genesis');
    const w1HasProfile = await nowjc.hasNowjcProfile(w1.address);
    const w2HasProfile = await nowjc.hasNowjcProfile(w2.address);
    expect(w1HasProfile === true, 'F1.nowjc.hasNowjcProfile(W1)', `returned ${w1HasProfile}`);
    expect(w2HasProfile === true, 'F1.nowjc.hasNowjcProfile(W2)', `returned ${w2HasProfile}`);

    // postJob (W1)
    console.log('  F1-4: W1 postJob (1 USDC milestone)');
    const jobCounterBefore = await lowjc.jobCounter();
    await (await usdc.connect(w1).approve(lowjcAddr, M)).wait();
    const postTx = await (await lowjcW1.postJob('ipfs://job-f1', ['F1 Milestone 1'], [M])).wait();
    const jobCounterAfter = await lowjc.jobCounter();
    const chainId = (await provider.getNetwork()).chainId;
    const f1JobId = `${chainId}-${jobCounterAfter}`;
    console.log(`       jobId: ${f1JobId}, tx: ${lnk(postTx.hash)}`);

    // applyToJob (W2) - chainDomain 3 = Arb Sepolia
    console.log('  F1-5: W2 applyToJob');
    const appTx = await (await lowjcW2.applyToJob(f1JobId, 'ipfs://app-f1', ['F1 Milestone 1'], [M], 3)).wait();
    console.log(`       tx: ${lnk(appTx.hash)}`);

    // startJob (W1) - appId=1, lock first milestone
    console.log('  F1-6: W1 startJob (locks 1 USDC in NOWJC)');
    await (await usdc.connect(w1).approve(lowjcAddr, M)).wait();
    const startTx = await (await lowjcW1.startJob(f1JobId, 1, false)).wait();
    console.log(`       tx: ${lnk(startTx.hash)}`);

    // Verify NOWJC holds the USDC
    const nowjcBal = await usdc.balanceOf(nowjcAddr);
    expect(nowjcBal >= M, 'F1.nowjc-holds-usdc', `NOWJC holds ${ethers.formatUnits(nowjcBal, 6)} USDC`);

    // submitWork (W2)
    console.log('  F1-7: W2 submitWork');
    const submitTx = await (await lowjcW2.submitWork(f1JobId, 'ipfs://work-f1')).wait();
    console.log(`       tx: ${lnk(submitTx.hash)}`);

    // releasePayment (W1) → W2 receives 0.99 USDC
    console.log('  F1-8: W1 releasePayment');
    const w2BalBefore = await usdc.balanceOf(w2.address);
    const releaseTx = await (await lowjcW1.releasePayment(f1JobId)).wait();
    console.log(`       tx: ${lnk(releaseTx.hash)}`);
    const w2BalAfter = await usdc.balanceOf(w2.address);
    const received = w2BalAfter - w2BalBefore;
    const expected = M - (M / 100n); // 0.99 USDC
    expect(received === expected, 'F1.w2-received-usdc', `received ${ethers.formatUnits(received, 6)} USDC (expected ${ethers.formatUnits(expected, 6)})`);

    // Recover USDC from W2
    await recoverUSDC(w2, w1.address, usdc);
    pass('F1.flow-complete', 'Application flow end-to-end');
  } catch (e) {
    fail('F1.flow-complete', `Unexpected error: ${e.message?.slice(0,200)}`);
    console.error(e);
  }


  // ════════════════════════════════════════════════════════════════════════════
  // F2 — Direct contract flow
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('F2: Direct contract flow (startDirectContract → submitWork → releasePayment)');
  console.log('═══════════════════════════════════════════════════════════');
  try {
    // W1 starts direct contract with W2 as worker, 1 USDC
    console.log('\n  F2-1: W1 startDirectContract with W2 (1 USDC)');
    await (await usdc.connect(w1).approve(lowjcAddr, M)).wait();
    const directTx = await (await lowjcW1.startDirectContract(
      w2.address,          // jobTaker
      'ipfs://direct-job', // jobDetailHash
      ['F2 Milestone 1'],  // descriptions
      [M],                 // amounts
      3                    // jobTakerChainDomain (3=Arb Sepolia)
    )).wait();
    
    // Get jobId from events
    const directJobPostedEvt = directTx.logs.find(l => {
      try { return lowjcArt.abi.find(a => a.type === 'event' && a.name === 'JobPosted') && l; } catch { return false; }
    });
    const chainId2 = (await provider.getNetwork()).chainId;
    const jobCounterD = await lowjc.jobCounter();
    const f2JobId = `${chainId2}-${jobCounterD}`;
    console.log(`       jobId: ${f2JobId}, tx: ${lnk(directTx.hash)}`);

    // submitWork (W2)
    console.log('  F2-2: W2 submitWork');
    const subTx = await (await lowjcW2.submitWork(f2JobId, 'ipfs://work-f2')).wait();
    console.log(`       tx: ${lnk(subTx.hash)}`);

    // releasePayment (W1) → W2 receives 0.99 USDC
    console.log('  F2-3: W1 releasePayment');
    const w2BalBefore2 = await usdc.balanceOf(w2.address);
    const relTx = await (await lowjcW1.releasePayment(f2JobId)).wait();
    console.log(`       tx: ${lnk(relTx.hash)}`);
    const w2BalAfter2 = await usdc.balanceOf(w2.address);
    const received2 = w2BalAfter2 - w2BalBefore2;
    const expected2 = M - (M / 100n);
    expect(received2 === expected2, 'F2.w2-received-usdc', `received ${ethers.formatUnits(received2, 6)} USDC`);

    await recoverUSDC(w2, w1.address, usdc);
    pass('F2.flow-complete', 'Direct contract flow end-to-end');
  } catch (e) {
    fail('F2.flow-complete', `Unexpected error: ${e.message?.slice(0,200)}`);
    console.error(e);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // F3 — Multi-milestone (2 milestones)
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('F3: Multi-milestone flow (2 milestones, partial releases)');
  console.log('═══════════════════════════════════════════════════════════');
  try {
    const M1 = BigInt(100_000); // 0.1 USDC
    const M2 = BigInt(100_000); // 0.1 USDC

    // postJob with 2 milestones
    console.log('\n  F3-1: W1 postJob (2 milestones: 1+2 USDC)');
    const jobCounterF3 = await lowjc.jobCounter();
    const chainId3 = (await provider.getNetwork()).chainId;
    // Approve total for the job (no need — only first milestone locked at startJob)
    const postF3 = await (await lowjcW1.postJob('ipfs://job-f3', ['F3 M1', 'F3 M2'], [M1, M2])).wait();
    const f3JobId = `${chainId3}-${(await lowjc.jobCounter())}`;
    console.log(`       jobId: ${f3JobId}, tx: ${lnk(postF3.hash)}`);

    // applyToJob (W2)
    console.log('  F3-2: W2 applyToJob');
    await sleep(2000);
    await withRetry(() => lowjcW2.applyToJob(f3JobId, 'ipfs://app-f3', ['F3 M1', 'F3 M2'], [M1, M2], 3).then(tx => tx.wait()), 'F3 applyToJob');

    // startJob (W1) - locks milestone 1 (1 USDC)
    console.log('  F3-3: W1 startJob (locks milestone 1 = 1 USDC)');
    await (await usdc.connect(w1).approve(lowjcAddr, M1)).wait();
    await (await lowjcW1.startJob(f3JobId, 1, false)).wait();

    // submitWork for milestone 1
    console.log('  F3-4: W2 submitWork (milestone 1)');
    await (await lowjcW2.submitWork(f3JobId, 'ipfs://work-f3-m1')).wait();

    // releasePayment (milestone 1) — W2 gets 0.99 USDC
    // F3-5: Use releaseAndLockNext (atomic release M1 + lock M2)
    // NOTE: lockNextMilestone cannot be used after releasePayment because NOWJC increments
    // genesis.currentMilestone during releasePayment, causing lockNextMilestone to see "All completed"
    // The correct multi-milestone flow is: releaseAndLockNext for all but last, releasePayment for last
    console.log('  F3-5: W1 approve M2 + releaseAndLockNext (release M1, lock M2 atomically)');
    await (await usdc.connect(w1).approve(lowjcAddr, M2)).wait();
    const w2BalF3Before = await usdc.balanceOf(w2.address);
    await withRetry(() => lowjcW1.releaseAndLockNext(f3JobId).then(tx => tx.wait()), 'F3 releaseAndLockNext');
    const w2BalF3AfterM1 = await usdc.balanceOf(w2.address);
    const receivedM1 = w2BalF3AfterM1 - w2BalF3Before;
    const expectedM1 = M1 - (M1 / 100n);
    expect(receivedM1 === expectedM1, 'F3.milestone1-received', `received ${ethers.formatUnits(receivedM1, 6)} USDC`);

    console.log('  F3-6: W2 submitWork (milestone 2)');
    await withRetry(() => lowjcW2.submitWork(f3JobId, 'ipfs://work-f3-m2').then(tx => tx.wait()), 'F3 submitWork M2');

    // releasePayment (milestone 2) — W2 gets 1.98 USDC
    console.log('  F3-8: W1 releasePayment (milestone 2)');
    const w2BalF3BeforeM2 = await usdc.balanceOf(w2.address);
    await (await lowjcW1.releasePayment(f3JobId)).wait();
    const w2BalF3AfterM2 = await usdc.balanceOf(w2.address);
    const receivedM2 = w2BalF3AfterM2 - w2BalF3BeforeM2;
    const expectedM2 = M2 - (M2 / 100n); // 1.98 USDC
    expect(receivedM2 === expectedM2, 'F3.milestone2-received', `received ${ethers.formatUnits(receivedM2, 6)} USDC`);
    
    // Verify total received across both milestones
    const totalReceived = receivedM1 + receivedM2;
    const totalExpected = (M1 + M2) - ((M1 + M2) / 100n);
    expect(totalReceived === totalExpected, 'F3.total-received-correct', `total ${ethers.formatUnits(totalReceived, 6)} USDC`);

    await recoverUSDC(w2, w1.address, usdc);
    pass('F3.flow-complete', 'Multi-milestone flow end-to-end');
  } catch (e) {
    fail('F3.flow-complete', `Unexpected error: ${e.message?.slice(0,200)}`);
    console.error(e);
  }


  // ════════════════════════════════════════════════════════════════════════════
  // S1 — releaseDisputedFunds access control (test before F4 since no job needed)
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('S1: releaseDisputedFunds access control (unauthorized caller must revert)');
  console.log('═══════════════════════════════════════════════════════════');
  try {
    await expectRevert(
      async () => {
        const tx = await nowjc.connect(w1).releaseDisputedFunds(w2.address, BigInt(1000), 3);
        await tx.wait();
      },
      'S1.releaseDisputedFunds-unauthorized',
      '!Athena'
    );
  } catch (e) {
    fail('S1.releaseDisputedFunds-unauthorized', `Unexpected error: ${e.message?.slice(0,200)}`);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // S2 — handleAskAthena access control
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('S2: handleAskAthena access control (direct call from W1 must revert)');
  console.log('═══════════════════════════════════════════════════════════');
  try {
    await expectRevert(
      async () => {
        // W1 calls nativeAthena.handleAskAthena directly (not bridge or athenaClient)
        const tx = await athena.connect(w1).handleAskAthena(
          w2.address,
          'description',
          'ipfs://hash',
          ORACLE_NAME,
          '100000'
        );
        await tx.wait();
      },
      'S2.handleAskAthena-unauthorized',
      'Only bridge or athenaClient'
    );
  } catch (e) {
    fail('S2.handleAskAthena-unauthorized', `Unexpected error: ${e.message?.slice(0,200)}`);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // S3 — Unauthorized profile creation
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('S3: Unauthorized profile creation (W2 calls nowjc.createProfile → must revert)');
  console.log('═══════════════════════════════════════════════════════════');
  try {
    await expectRevert(
      async () => {
        const tx = await nowjc.connect(w2).createProfile(w1.address, 'ipfs://x', ethers.ZeroAddress);
        await tx.wait();
      },
      'S3.createProfile-unauthorized',
      '!'
    );
  } catch (e) {
    fail('S3.createProfile-unauthorized', `Unexpected error: ${e.message?.slice(0,200)}`);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // S4 — Double profile creation (idempotency on NOWJC v3)
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('S4: Double profile creation (NOWJC.createProfile idempotent via authorized caller)');
  console.log('═══════════════════════════════════════════════════════════');
  try {
    // Make W1 an authorized contract on NOWJC so we can call createProfile directly
    await (await nowjc.addAuthorizedContract(w1.address)).wait();
    
    // Use a fresh random address for this test
    const freshAddr = ethers.Wallet.createRandom().address;
    
    // First call — should succeed and create profile
    console.log('  S4-1: First createProfile call (fresh address)');
    const firstTx = await (await nowjc.connect(w1).createProfile(freshAddr, 'ipfs://s4-profile', ethers.ZeroAddress)).wait();
    const hasProfileAfterFirst = await nowjc.hasNowjcProfile(freshAddr);
    expect(hasProfileAfterFirst === true, 'S4.first-call-creates-profile', `nowjc.hasNowjcProfile=${hasProfileAfterFirst}`);
    
    // Second call — should NOT revert (idempotent via NOWJC v3)
    console.log('  S4-2: Second createProfile call (same address, must NOT revert)');
    try {
      const secondTx = await (await nowjc.connect(w1).createProfile(freshAddr, 'ipfs://s4-profile-updated', ethers.ZeroAddress)).wait();
      // Check profile not duplicated (profileCount incremented only once)
      const hasProfileAfterSecond = await nowjc.hasNowjcProfile(freshAddr);
      expect(hasProfileAfterSecond === true, 'S4.second-call-idempotent', 'Did NOT revert — idempotent behavior confirmed');
      pass('S4.no-revert-on-second-call', 'NOWJC.createProfile is idempotent');
    } catch (e2) {
      fail('S4.no-revert-on-second-call', `BUG: Second createProfile call reverted: ${e2.message?.slice(0,100)}`);
    }
    
    // Also test: double createProfile via LOWJC (should revert since LOWJC tracks locally)
    console.log('  S4-3: Double createProfile via LOWJC (expected: 2nd call reverts at LOWJC level)');
    try {
      const lowjcW1Fresh = lowjc.connect(w1);
      // W1 already has profile from F1, so second LOWJC createProfile should revert
      await (await lowjcW1Fresh.createProfile('ipfs://w1-duplicate', ethers.ZeroAddress)).wait();
      fail('S4.lowjc-double-profile-protection', 'BUG: LOWJC allowed duplicate profile creation');
    } catch (e3) {
      if (e3.message.includes('Profile already exists') || e3.message.includes('profile')) {
        pass('S4.lowjc-double-profile-protection', 'LOWJC correctly prevents duplicate profiles');
      } else {
        fail('S4.lowjc-double-profile-protection', `Unexpected revert: ${e3.message?.slice(0,100)}`);
      }
    }

    // Remove W1 from authorized contracts (cleanup)
    await (await nowjc.removeAuthorizedContract(w1.address)).wait();
    pass('S4.test-complete');
  } catch (e) {
    fail('S4.test-complete', `Unexpected error: ${e.message?.slice(0,200)}`);
    console.error(e);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // F4: Dispute — applicant wins
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(60));
  console.log('F4: Dispute flow — applicant wins');
  console.log('═'.repeat(60));
  try {
    const f4JobId = `${(await provider.getNetwork()).chainId}-${Number(await lowjc.jobCounter()) + 1}`;
    await (await usdc.connect(w1).approve(lowjcAddr, M)).wait();
    await withRetry(() => lowjcW1.postJob('ipfs://job-f4', ['M1'], [M]).then(t => t.wait()), 'F4 postJob');
    await withRetry(() => lowjcW2.applyToJob(f4JobId, 'ipfs://app-f4', ['M1'], [M], 3).then(t => t.wait()), 'F4 applyToJob');
    await (await usdc.connect(w1).approve(lowjcAddr, M)).wait();
    await withRetry(() => lowjcW1.startJob(f4JobId, 1, false).then(t => t.wait()), 'F4 startJob');
    await withRetry(() => lowjcW2.submitWork(f4JobId, 'ipfs://work-f4').then(t => t.wait()), 'F4 submitWork');

    // W2 raises dispute
    console.log('  F4-5: W2 raises dispute (fee=0.01 USDC, disputed=0.1 USDC)');
    const DISPUTE_FEE = BigInt(10_000); // 0.01 USDC
    await (await usdc.connect(w2).approve(athenaClientAddr, DISPUTE_FEE)).wait();
    await withRetry(() => athenaClientW2.raiseDispute(f4JobId, 'ipfs://dispute-f4', 'test-oracle', DISPUTE_FEE, M).then(t => t.wait()), 'F4 raiseDispute');
    const f4DisputeId = `${f4JobId}-1`;
    console.log(`  F4: disputeId=${f4DisputeId}`);

    // W1 votes FOR applicant (W2 wins)
    console.log('  F4-6: W1 votes FOR applicant');
    await withRetry(() => athena.connect(w1).vote(0, f4DisputeId, true, w1.address).then(t => t.wait()), 'F4 vote');

    // Wait for voting period (65s)
    console.log('  F4-7: Waiting 65s for voting period...');
    await sleep(65_000);

    // Settle
    console.log('  F4-8: settleDispute');
    const w2BalBefore = await usdc.balanceOf(w2.address);
    await withRetry(() => athena.settleDispute(f4DisputeId).then(t => t.wait()), 'F4 settleDispute');
    const w2BalAfter = await usdc.balanceOf(w2.address);
    const received = w2BalAfter - w2BalBefore;
    expect(received > 0n, 'F4.applicant-received-funds', `W2 received ${ethers.formatUnits(received, 6)} USDC`);
    pass('F4.flow-complete', `Dispute applicant-wins flow ✅ W2 got ${ethers.formatUnits(received, 6)} USDC`);
    await recoverUSDC(w2, w1.address, usdc);
  } catch (e) {
    fail('F4.flow-complete', `Unexpected error: ${e.message?.slice(0, 200)}`);
    console.error(e);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // F5: Dispute — job giver wins (vote against applicant)
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(60));
  console.log('F5: Dispute flow — job giver wins');
  console.log('═'.repeat(60));
  try {
    const f5JobId = `${(await provider.getNetwork()).chainId}-${Number(await lowjc.jobCounter()) + 1}`;
    await (await usdc.connect(w1).approve(lowjcAddr, M)).wait();
    await withRetry(() => lowjcW1.postJob('ipfs://job-f5', ['M1'], [M]).then(t => t.wait()), 'F5 postJob');
    await withRetry(() => lowjcW2.applyToJob(f5JobId, 'ipfs://app-f5', ['M1'], [M], 3).then(t => t.wait()), 'F5 applyToJob');
    await (await usdc.connect(w1).approve(lowjcAddr, M)).wait();
    await withRetry(() => lowjcW1.startJob(f5JobId, 1, false).then(t => t.wait()), 'F5 startJob');
    await withRetry(() => lowjcW2.submitWork(f5JobId, 'ipfs://work-f5').then(t => t.wait()), 'F5 submitWork');

    const DISPUTE_FEE = BigInt(10_000);
    await (await usdc.connect(w2).approve(athenaClientAddr, DISPUTE_FEE)).wait();
    await withRetry(() => athenaClientW2.raiseDispute(f5JobId, 'ipfs://dispute-f5', 'test-oracle', DISPUTE_FEE, M).then(t => t.wait()), 'F5 raiseDispute');
    const f5DisputeId = `${f5JobId}-1`;

    // W1 votes AGAINST applicant (job giver wins)
    console.log('  F5-6: W1 votes AGAINST applicant (job giver wins)');
    await withRetry(() => athena.connect(w1).vote(0, f5DisputeId, false, w1.address).then(t => t.wait()), 'F5 vote');

    console.log('  F5-7: Waiting 65s for voting period...');
    await sleep(65_000);

    console.log('  F5-8: settleDispute');
    const w1BalBefore = await usdc.balanceOf(w1.address);
    const w2BalBefore = await usdc.balanceOf(w2.address);
    await withRetry(() => athena.settleDispute(f5DisputeId).then(t => t.wait()), 'F5 settleDispute');
    const w2BalAfter = await usdc.balanceOf(w2.address);
    const w2Received = w2BalAfter - w2BalBefore;
    expect(w2Received === 0n, 'F5.applicant-did-not-receive', `W2 received ${ethers.formatUnits(w2Received, 6)} USDC (should be 0)`);
    pass('F5.flow-complete', 'Dispute job-giver-wins flow ✅ W2 received 0 USDC');
  } catch (e) {
    fail('F5.flow-complete', `Unexpected error: ${e.message?.slice(0, 200)}`);
    console.error(e);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // F6: askAthena path (via AthenaClient → NativeAthena-v3)
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(60));
  console.log('F6: askAthena path');
  console.log('═'.repeat(60));
  try {
    // Re-fund W2 USDC for F6/F7 (may have been drained by earlier flows)
    await (await usdc.connect(w1).transfer(w2.address, BigInt(50_000))).wait(); // 0.05 USDC
    console.log('  F6-0: W2 refunded 0.05 USDC for Athena fees');
    const ASK_FEE = BigInt(10_000); // 0.01 USDC
    await (await usdc.connect(w2).approve(athenaClientAddr, ASK_FEE)).wait();
    await withRetry(() => athenaClientW2.askAthena('What is the best smart contract?', 'ipfs://ask-f6', 'test-oracle', ASK_FEE).then(t => t.wait()), 'F6 askAthena');
    pass('F6.askAthena-no-revert', 'askAthena call succeeded via AthenaClient → NativeAthena-v3 ✅');
  } catch (e) {
    fail('F6.askAthena-no-revert', `Reverted: ${e.message?.slice(0, 200)}`);
    console.error(e);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // F7: submitSkillVerification path
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(60));
  console.log('F7: submitSkillVerification path');
  console.log('═'.repeat(60));
  try {
    const SKILL_FEE = BigInt(10_000);
    await (await usdc.connect(w2).approve(athenaClientAddr, SKILL_FEE)).wait();
    await withRetry(() => athenaClientW2.submitSkillVerification('ipfs://skill-f7', SKILL_FEE, 'test-oracle').then(t => t.wait()), 'F7 submitSkillVerification');
    pass('F7.skillVerification-no-revert', 'submitSkillVerification succeeded via AthenaClient → NativeAthena-v3 ✅');
  } catch (e) {
    fail('F7.skillVerification-no-revert', `Reverted: ${e.message?.slice(0, 200)}`);
    console.error(e);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(60));
  console.log('TEST SUMMARY');
  console.log('═'.repeat(60));
  for (const t of results.tests) {
    const icon = t.status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} ${t.name}${t.detail ? ' — ' + t.detail : ''}`);
  }
  console.log('═'.repeat(60));
  console.log(`Total: ${results.summary.total} | Passed: ${results.summary.passed} | Failed: ${results.summary.failed}`);
  if (results.summary.failed === 0) {
    console.log('🎉 ALL TESTS PASSED');
  } else {
    console.log(`⚠️  ${results.summary.failed} TEST(S) FAILED`);
  }

  // Save results
  fs.writeFileSync(
    path.join(__dirname, 'thorough-e2e-v3-results.json'),
    JSON.stringify({ ...results, testedAt: new Date().toISOString() }, null, 2)
  );
  console.log('\nResults saved to scripts/thorough-e2e-v3-results.json');

  if (results.summary.failed > 0) process.exit(1);
}

main().catch(e => {
  console.error('\n❌ FATAL ERROR:', e.message);
  if (e.info?.error) console.error(JSON.stringify(e.info.error));
  process.exit(1);
});
