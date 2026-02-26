/**
 * e2e-mainnet-arch.cjs
 *
 * E2E test for the corrected mainnet-ready contract architecture:
 *   Genesis → NOWJC-v2 → ProfileManager → NativeAthena-v2 → LOWJC-v2 → AthenaClient
 *
 * Tests: F1 (application flow), F2 (direct contract), F3 (portfolio functions), F4 (dispute)
 */
'use strict';

const { ethers } = require('../backend/node_modules/ethers');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const RPC    = 'https://arb-sepolia.g.alchemy.com/v2/ECvjGU_6M0Jrw6wlFkPo2ZbonbfW5oIZ';
const USDC   = '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d';
const SCAN   = 'https://sepolia.arbiscan.io/tx/';
const OUT    = path.join(__dirname, '../contracts/out-minsize');
const CACHE  = path.join(__dirname, '../contracts/deployed-mainnet-arch-addrs.json');
const FORCE  = process.env.FRESH_DEPLOY === '1';

const lnk  = h => `${SCAN}${h}`;
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ─── Helpers ─────────────────────────────────────────────────────────────────
function art(solFile, contractName) {
  const p = path.join(OUT, solFile, `${contractName}.json`);
  if (!fs.existsSync(p)) throw new Error(`Artifact missing: ${p}`);
  return JSON.parse(fs.readFileSync(p));
}

const proxyArt = art('UUPSProxy.sol', 'UUPSProxy');

async function deployProxy(wallet, artifact, initArgs, label) {
  const Impl  = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const Proxy = new ethers.ContractFactory(proxyArt.abi, proxyArt.bytecode, wallet);
  const impl  = await Impl.deploy();
  await impl.deploymentTransaction().wait();
  const iface    = new ethers.Interface(artifact.abi);
  const initData = iface.encodeFunctionData('initialize', initArgs);
  const proxy    = await Proxy.deploy(await impl.getAddress(), initData);
  const pr       = await proxy.deploymentTransaction().wait();
  const addr     = await proxy.getAddress();
  console.log(`    [${label}] proxy: ${addr} tx: ${lnk(pr.hash)}`);
  return addr;
}

async function getKey() {
  if (process.env.BRIDGE_KEY) return process.env.BRIDGE_KEY;
  const r = execSync(
    'gcloud run services describe openwork --region=us-central1 --format=json --project=openwork-480320',
    { env: { ...process.env, PATH: `/home/linuxbrew/.linuxbrew/opt/google-cloud-sdk/bin:${process.env.PATH}` } }
  );
  return JSON.parse(r.toString()).spec.template.spec.containers[0].env?.find(e => e.name === 'WALL2_PRIVATE_KEY')?.value;
}

const results = { tests: [], txLinks: {}, summary: { total: 0, passed: 0, failed: 0 } };
function pass(name, detail = '') { results.tests.push({ name, status: 'PASS', detail }); results.summary.total++; results.summary.passed++; console.log(`  ✅ ${name}${detail ? ' — ' + detail : ''}`); }
function fail(name, detail = '') { results.tests.push({ name, status: 'FAIL', detail }); results.summary.total++; results.summary.failed++; console.error(`  ❌ ${name}${detail ? ' — ' + detail : ''}`); }
function expect(cond, name, detail = '') { cond ? pass(name, detail) : fail(name, detail); }
function tx(key, hash) { results.txLinks[key] = lnk(hash); console.log(`    🔗 ${key}: ${lnk(hash)}`); }

// ─── MAIN ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║    MAINNET ARCH E2E — OpenWork Arb Sepolia               ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  const provider  = new ethers.JsonRpcProvider(RPC);
  const key       = await getKey();
  const w1        = new ethers.Wallet(key, provider);
  const w2        = ethers.Wallet.createRandom().connect(provider);
  const usdcAbi   = ['function balanceOf(address) view returns (uint256)', 'function approve(address,uint256) returns (bool)', 'function transfer(address,uint256) returns (bool)', 'function allowance(address,address) view returns (uint256)'];
  const usdc      = new ethers.Contract(USDC, usdcAbi, provider);

  console.log('W1:', w1.address);
  console.log('W2:', w2.address);

  const ethBal  = await provider.getBalance(w1.address);
  const usdcBal = await usdc.balanceOf(w1.address);
  console.log('W1 ETH:', ethers.formatEther(ethBal));
  console.log('W1 USDC:', ethers.formatUnits(usdcBal, 6));

  if (ethBal < ethers.parseEther('0.003')) throw new Error('W1 needs at least 0.003 ETH');
  if (usdcBal < BigInt(400_000)) throw new Error('W1 needs at least 0.4 USDC');

  // ── Fund W2 ──
  await (await w1.sendTransaction({ to: w2.address, value: ethers.parseEther('0.001') })).wait();
  console.log('W2 funded: 0.001 ETH (USDC given per-flow as needed)');

  // ── Load artifacts ──
  const genesisArt        = art('native-openwork-genesis.sol', 'NativeOpenworkGenesis');
  const profileGenesisArt = art('native-profile-genesis.sol', 'NativeProfileGenesis');
  const nowjcArt          = art('native-openwork-job-contract-v2.sol', 'NativeOpenWorkJobContract');
  const profileMgrArt     = art('native-profile-manager.sol', 'NativeProfileManager');
  const athenaArt         = art('native-athena-mainnet-v2.sol', 'NativeAthena');
  const lowjcArt          = art('native-arb-lowjc-v2.sol', 'NativeArbOpenWorkJobContract');
  const athenaClientArt   = art('native-arb-athena-client.sol', 'NativeArbAthenaClient');
  const actTrackerArt     = art('native-athena-activity-tracker.sol', 'NativeAthenaActivityTracker');
  const mockDaoArt        = art('MockDAO.sol', 'MockDAO');

  // ── Deploy or load cache ──
  let genesisAddr, profileGenesisAddr, nowjcAddr, profileMgrAddr, athenaAddr, lowjcAddr, athenaClientAddr;
  let actTrackerAddr, mockDaoAddr;

  if (!FORCE && fs.existsSync(CACHE)) {
    const c = JSON.parse(fs.readFileSync(CACHE, 'utf8'));
    ({ genesis: genesisAddr, profileGenesis: profileGenesisAddr, nowjc: nowjcAddr, profileManager: profileMgrAddr, athena: athenaAddr, lowjc: lowjcAddr, athenaClient: athenaClientAddr,
       activityTracker: actTrackerAddr, mockDao: mockDaoAddr } = c);
    console.log('\n═══ Reusing cached contracts ═══');
    console.log('  Genesis:', genesisAddr);
    console.log('  ProfileGenesis:', profileGenesisAddr);
    console.log('  NOWJC v2:', nowjcAddr);
    console.log('  ProfileManager:', profileMgrAddr);
    console.log('  NativeAthena v2:', athenaAddr);
    console.log('  LOWJC v2:', lowjcAddr);
    console.log('  AthenaClient:', athenaClientAddr);
    console.log('  ActivityTracker:', actTrackerAddr || '(not cached — will deploy)');
    console.log('  MockDAO:', mockDaoAddr || '(not cached — will deploy)');

    // Deploy missing ActivityTracker / MockDAO even when reusing other cached contracts
    if (!actTrackerAddr) {
      console.log('\n[+] Deploying ActivityTracker (not in cache)...');
      actTrackerAddr = await deployProxy(w1, actTrackerArt, [w1.address], 'ActivityTracker');
    }
    if (!mockDaoAddr) {
      console.log('\n[+] Deploying MockDAO (not in cache)...');
      const F = new ethers.ContractFactory(mockDaoArt.abi, mockDaoArt.bytecode.object, w1);
      const c = await F.deploy(); await c.deploymentTransaction().wait();
      mockDaoAddr = await c.getAddress();
      console.log('    MockDAO:', mockDaoAddr);
    }
    // Update cache with new addresses
    { const existing = JSON.parse(fs.readFileSync(CACHE, 'utf8'));
      fs.writeFileSync(CACHE, JSON.stringify({ ...existing, activityTracker: actTrackerAddr, mockDao: mockDaoAddr }, null, 2)); }

    // Wire ActivityTracker + MockDAO into NativeAthena (idempotent)
    { const athena = new ethers.Contract(athenaAddr, athenaArt.abi, w1);
      await (await athena.setActivityTracker(actTrackerAddr)).wait();
      await (await athena.setDAOContract(mockDaoAddr)).wait();
      console.log('    NativeAthena: activityTracker + mockDAO wired'); }

    // Authorize NativeAthena in NOWJC (needed for incrementGovernanceAction during voting)
    { const nowjc = new ethers.Contract(nowjcAddr, nowjcArt.abi, w1);
      await (await nowjc.setAdmin(w1.address, true)).wait();
      await (await nowjc.addAuthorizedContract(athenaAddr)).wait();
      console.log('    NOWJC: NativeAthena authorized'); }

    // Authorize NativeAthena in ActivityTracker
    { const at = new ethers.Contract(actTrackerAddr, actTrackerArt.abi, w1);
      await (await at.setAuthorizedCaller(athenaAddr, true)).wait();
      // Mark oracle active (owner override)
      await (await at.setOracleActiveStatusOverride('test-oracle', true)).wait();
      console.log('    ActivityTracker: NativeAthena authorized, test-oracle active'); }
  } else {
    console.log('\n═══ Deploying fresh contract suite ═══');

    // 1. Genesis (jobs/oracles/disputes)
    console.log('\n[1] NativeOpenworkGenesis...');
    genesisAddr = await deployProxy(w1, genesisArt, [w1.address], 'Genesis');

    // 2. ProfileGenesis (profiles only)
    console.log('\n[2] NativeProfileGenesis...');
    profileGenesisAddr = await deployProxy(w1, profileGenesisArt, [w1.address], 'ProfileGenesis');

    // 3. NOWJC v2 (bridge=0, rewardsContract=0, cctpReceiver=0)
    console.log('\n[3] NOWJC v2...');
    nowjcAddr = await deployProxy(w1, nowjcArt,
      [w1.address, ethers.ZeroAddress, genesisAddr, ethers.ZeroAddress, USDC, ethers.ZeroAddress],
      'NOWJC-v2');

    // 4. ProfileManager (bridge=0 initially, genesis=profileGenesisAddr)
    console.log('\n[4] ProfileManager...');
    profileMgrAddr = await deployProxy(w1, profileMgrArt, [w1.address, ethers.ZeroAddress, profileGenesisAddr], 'ProfileManager');

    // 5. NativeAthena v2 (dao=0)
    console.log('\n[5] NativeAthena v2...');
    athenaAddr = await deployProxy(w1, athenaArt,
      [w1.address, ethers.ZeroAddress, genesisAddr, nowjcAddr, USDC],
      'NativeAthena-v2');

    // 6. LOWJC v2
    console.log('\n[6] LOWJC v2...');
    lowjcAddr = await deployProxy(w1, lowjcArt, [w1.address, USDC, nowjcAddr], 'LOWJC-v2');

    // 7. AthenaClient
    console.log('\n[7] AthenaClient...');
    athenaClientAddr = await deployProxy(w1, athenaClientArt,
      [w1.address, USDC, athenaAddr, lowjcAddr],
      'AthenaClient');

    // ── Wire-up ──
    console.log('\n[8] Wire-up...');
    const genesis        = new ethers.Contract(genesisAddr, genesisArt.abi, w1);
    const profileGenesis = new ethers.Contract(profileGenesisAddr, profileGenesisArt.abi, w1);
    const nowjc          = new ethers.Contract(nowjcAddr, nowjcArt.abi, w1);
    const profileMgr     = new ethers.Contract(profileMgrAddr, profileMgrArt.abi, w1);
    const athena         = new ethers.Contract(athenaAddr, athenaArt.abi, w1);
    const lowjc          = new ethers.Contract(lowjcAddr, lowjcArt.abi, w1);
    const athenaClient   = new ethers.Contract(athenaClientAddr, athenaClientArt.abi, w1);

    // Main Genesis: authorize NOWJC + Athena (NOT ProfileManager — it uses profileGenesis)
    await (await genesis.authorizeContract(nowjcAddr, true)).wait();
    await (await genesis.authorizeContract(athenaAddr, true)).wait();
    console.log('    Genesis: authorized NOWJC + Athena');

    // ProfileGenesis: authorize ProfileManager
    await (await profileGenesis.authorizeContract(profileMgrAddr, true)).wait();
    console.log('    ProfileGenesis: authorized ProfileManager');

    // NOWJC: owner must first grant admin to self (initialize() doesn't set admins[owner])
    await (await nowjc.setAdmin(w1.address, true)).wait();

    // NOWJC authorizations
    await (await nowjc.addAuthorizedContract(lowjcAddr)).wait();
    await (await nowjc.addAuthorizedContract(athenaClientAddr)).wait();
    await (await nowjc.addAuthorizedContract(athenaAddr)).wait(); // needed for incrementGovernanceAction during voting
    await (await nowjc.setNativeAthena(athenaAddr)).wait();
    await (await nowjc.setTreasury(w1.address)).wait();
    await (await nowjc.setCommissionPercentage(100)).wait(); // 1%
    await (await nowjc.setMinCommission(0)).wait();
    console.log('    NOWJC: authorized LOWJC + AthenaClient, nativeAthena set, commission=1%');

    // ProfileManager: set LOWJC as bridge
    await (await profileMgr.setBridge(lowjcAddr)).wait();
    console.log('    ProfileManager: bridge = LOWJC');

    // NativeAthena: set athenaClient + bridge (lowjc as dummy bridge for upgrades)
    await (await athena.setAthenaClient(athenaClientAddr)).wait();
    await (await athena.setBridge(lowjcAddr)).wait(); // dummy so upgrade auth doesn't fail
    await (await athena.updateVotingPeriod(1)).wait();
    await (await athena.updateMinOracleMembers(1)).wait();
    await (await athena.updateMinStakeRequired(0)).wait();
    console.log('    NativeAthena: athenaClient set, votingPeriod=1min');

    // 8b. ActivityTracker (UUPS proxy)
    console.log('\n[8b] ActivityTracker...');
    actTrackerAddr = await deployProxy(w1, actTrackerArt, [w1.address], 'ActivityTracker');

    // 8c. MockDAO (plain deploy — no proxy needed)
    console.log('\n[8c] MockDAO...');
    { const F = new ethers.ContractFactory(mockDaoArt.abi, mockDaoArt.bytecode.object, w1);
      const c = await F.deploy(); await c.deploymentTransaction().wait();
      mockDaoAddr = await c.getAddress();
      console.log('    MockDAO:', mockDaoAddr); }

    // Wire ActivityTracker + MockDAO into NativeAthena
    await (await athena.setActivityTracker(actTrackerAddr)).wait();
    await (await athena.setDAOContract(mockDaoAddr)).wait();
    console.log('    NativeAthena: activityTracker + mockDAO wired');

    // Authorize NativeAthena in ActivityTracker (so it can call updateMemberActivity on votes)
    { const at = new ethers.Contract(actTrackerAddr, actTrackerArt.abi, w1);
      await (await at.setAuthorizedCaller(athenaAddr, true)).wait(); }
    console.log('    ActivityTracker: NativeAthena authorized');

    // LOWJC: set profileManager + athenaClient
    await (await lowjc.setProfileManager(profileMgrAddr)).wait();
    await (await lowjc.setAthenaClientContract(athenaClientAddr)).wait();
    console.log('    LOWJC: profileManager + athenaClientContract set');

    // AthenaClient: lower min dispute fee for testing
    await (await athenaClient.setMinDisputeFee(BigInt(10_000))).wait(); // 0.01 USDC
    console.log('    AthenaClient: minDisputeFee = 0.01 USDC');

    // Genesis oracle
    await (await genesis.setOracle('test-oracle', [w1.address], 'Test Oracle', 'ipfs://test', [w1.address])).wait();
    console.log('    Genesis: oracle "test-oracle" created');

    // Mark oracle active in ActivityTracker (owner override — bypasses activity threshold for tests)
    { const at = new ethers.Contract(actTrackerAddr, actTrackerArt.abi, w1);
      await (await at.setOracleActiveStatusOverride('test-oracle', true)).wait(); }
    console.log('    ActivityTracker: test-oracle marked active');

    // Save cache
    fs.writeFileSync(CACHE, JSON.stringify({ genesis: genesisAddr, profileGenesis: profileGenesisAddr, nowjc: nowjcAddr, profileManager: profileMgrAddr, athena: athenaAddr, lowjc: lowjcAddr, athenaClient: athenaClientAddr, activityTracker: actTrackerAddr, mockDao: mockDaoAddr }, null, 2));
    console.log('\n    ✅ All deployed and wired');
  }

  // ── Contract handles ──
  const genesis      = new ethers.Contract(genesisAddr, genesisArt.abi, w1);
  const nowjc        = new ethers.Contract(nowjcAddr, nowjcArt.abi, w1);
  const profileMgr   = new ethers.Contract(profileMgrAddr, profileMgrArt.abi, w1);
  const athena       = new ethers.Contract(athenaAddr, athenaArt.abi, w1);
  const lowjc        = new ethers.Contract(lowjcAddr, lowjcArt.abi, w1);
  const lowjcW2      = lowjc.connect(w2);
  const athenaClient = new ethers.Contract(athenaClientAddr, athenaClientArt.abi, w1);
  const athenaClientW2 = athenaClient.connect(w2);

  const M = BigInt(100_000); // 0.1 USDC

  // ════════════════════════════════════════════════════════════════════════════
  // F1: Application flow
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(60));
  console.log('F1: Application flow');
  console.log('═'.repeat(60));
  try {
    // createProfile W1
    const w1HasProf = await profileMgr.hasProfile(w1.address);
    if (!w1HasProf) {
      const r = await (await lowjc.createProfile('ipfs://w1-profile', ethers.ZeroAddress)).wait();
      tx('F1.createProfile-W1', r.hash);
      console.log('  F1-1: W1 profile created');
    } else { console.log('  F1-1: W1 profile already exists'); }

    // createProfile W2
    { const r = await (await lowjcW2.createProfile('ipfs://w2-profile', ethers.ZeroAddress)).wait();
      tx('F1.createProfile-W2', r.hash); }
    console.log('  F1-2: W2 profile created');

    // Verify
    const w1p = await profileMgr.hasProfile(w1.address);
    const w2p = await profileMgr.hasProfile(w2.address);
    expect(w1p, 'F1.w1-has-profile');
    expect(w2p, 'F1.w2-has-profile');

    // postJob
    const jobCountBefore = await lowjc.jobCounter();
    const chainId = (await provider.getNetwork()).chainId;
    await (await usdc.connect(w1).approve(lowjcAddr, M)).wait();
    { const r = await (await lowjc.postJob('ipfs://job-f1', ['Milestone 1'], [M])).wait();
      tx('F1.postJob', r.hash); }
    const f1JobId = `${chainId}-${Number(await lowjc.jobCounter())}`;
    console.log('  F1-3: job posted:', f1JobId);
    expect(Number(await lowjc.jobCounter()) === Number(jobCountBefore) + 1, 'F1.job-counter-incremented');

    // applyToJob
    { const r = await (await lowjcW2.applyToJob(f1JobId, 'ipfs://app-f1', ['Milestone 1'], [M], 3)).wait();
      tx('F1.applyToJob', r.hash); }
    console.log('  F1-4: W2 applied');

    // startJob
    await (await usdc.connect(w1).approve(lowjcAddr, M)).wait();
    { const r = await (await lowjc.startJob(f1JobId, 1, false)).wait();
      tx('F1.startJob', r.hash); }
    console.log('  F1-5: job started');

    // submitWork
    { const r = await (await lowjcW2.submitWork(f1JobId, 'ipfs://work-f1')).wait();
      tx('F1.submitWork', r.hash); }
    console.log('  F1-6: work submitted');

    // releasePayment
    const w2Before = await usdc.balanceOf(w2.address);
    { const r = await (await lowjc.releasePayment(f1JobId)).wait();
      tx('F1.releasePayment', r.hash); }
    const w2After = await usdc.balanceOf(w2.address);
    const received = w2After - w2Before;
    expect(received > 0n, 'F1.w2-received-payment', `${ethers.formatUnits(received, 6)} USDC`);
    pass('F1.flow-complete', `W2 received ${ethers.formatUnits(received, 6)} USDC`);

    // Recover W2 USDC
    const w2Bal = await usdc.balanceOf(w2.address);
    if (w2Bal > 0n) await (await usdc.connect(w2).transfer(w1.address, w2Bal)).wait();
  } catch (e) {
    fail('F1.flow-complete', e.message?.slice(0, 200));
    console.error(e);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // F2: Direct contract
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(60));
  console.log('F2: Direct contract flow');
  console.log('═'.repeat(60));
  try {
    const chainId = (await provider.getNetwork()).chainId;
    const jobCountBefore = await lowjc.jobCounter();
    await (await usdc.connect(w1).approve(lowjcAddr, M)).wait();
    { const r = await (await lowjc.startDirectContract(w2.address, 'ipfs://job-f2', ['M1'], [M], 3)).wait();
      tx('F2.startDirectContract', r.hash); }
    const f2JobId = `${chainId}-${Number(await lowjc.jobCounter())}`;
    console.log('  F2-1: direct contract started:', f2JobId);

    { const r = await (await lowjcW2.submitWork(f2JobId, 'ipfs://work-f2')).wait();
      tx('F2.submitWork', r.hash); }
    console.log('  F2-2: work submitted');

    const w2Before = await usdc.balanceOf(w2.address);
    { const r = await (await lowjc.releasePayment(f2JobId)).wait();
      tx('F2.releasePayment', r.hash); }
    const received = (await usdc.balanceOf(w2.address)) - w2Before;
    expect(received > 0n, 'F2.w2-received-payment', `${ethers.formatUnits(received, 6)} USDC`);
    pass('F2.flow-complete', `W2 received ${ethers.formatUnits(received, 6)} USDC`);

    const w2Bal = await usdc.balanceOf(w2.address);
    if (w2Bal > 0n) await (await usdc.connect(w2).transfer(w1.address, w2Bal)).wait();
  } catch (e) {
    fail('F2.flow-complete', e.message?.slice(0, 200));
    console.error(e);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // F3: Portfolio functions
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(60));
  console.log('F3: Portfolio functions');
  console.log('═'.repeat(60));
  try {
    { const r = await (await lowjc.addPortfolio('ipfs://portfolio-1')).wait();
      tx('F3.addPortfolio', r.hash); }
    pass('F3.addPortfolio', 'added without revert');

    { const r = await (await lowjc.updatePortfolioItem(0, 'ipfs://portfolio-1-updated')).wait();
      tx('F3.updatePortfolioItem', r.hash); }
    pass('F3.updatePortfolioItem', 'updated without revert');

    { const r = await (await lowjc.removePortfolioItem(0)).wait();
      tx('F3.removePortfolioItem', r.hash); }
    pass('F3.removePortfolioItem', 'removed without revert');
  } catch (e) {
    fail('F3.portfolio-functions', e.message?.slice(0, 200));
    console.error(e);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // F4: Dispute flow
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(60));
  console.log('F4: Dispute flow');
  console.log('═'.repeat(60));
  try {
    // Refund W2 for dispute fee
    await (await usdc.connect(w1).transfer(w2.address, BigInt(200_000))).wait();

    const chainId = (await provider.getNetwork()).chainId;
    await (await usdc.connect(w1).approve(lowjcAddr, M)).wait();
    { const r = await (await lowjc.postJob('ipfs://job-f4', ['M1'], [M])).wait();
      tx('F4.postJob', r.hash); }
    const f4JobId = `${chainId}-${Number(await lowjc.jobCounter())}`;

    { const r = await (await lowjcW2.applyToJob(f4JobId, 'ipfs://app-f4', ['M1'], [M], 3)).wait();
      tx('F4.applyToJob', r.hash); }
    await (await usdc.connect(w1).approve(lowjcAddr, M)).wait();
    { const r = await (await lowjc.startJob(f4JobId, 1, false)).wait();
      tx('F4.startJob', r.hash); }
    { const r = await (await lowjcW2.submitWork(f4JobId, 'ipfs://work-f4')).wait();
      tx('F4.submitWork', r.hash); }

    // Raise dispute from W2
    const DISPUTE_FEE = BigInt(10_000);
    await (await usdc.connect(w2).approve(athenaClientAddr, DISPUTE_FEE)).wait();
    { const r = await (await athenaClientW2.raiseDispute(f4JobId, 'ipfs://dispute-f4', 'test-oracle', DISPUTE_FEE, M)).wait();
      tx('F4.raiseDispute', r.hash); }
    const f4DisputeId = `${f4JobId}-1`;
    console.log('  F4: dispute raised:', f4DisputeId);

    // Vote FOR applicant (W2 wins)
    { const r = await (await athena.connect(w1).vote(0, f4DisputeId, true, w1.address)).wait();
      tx('F4.voteOnDispute', r.hash); }
    console.log('  F4: voted FOR applicant, waiting 65s...');
    await sleep(65_000);

    const w2Before = await usdc.balanceOf(w2.address);
    { const r = await (await athena.settleDispute(f4DisputeId)).wait();
      tx('F4.settleDispute', r.hash); }
    const received = (await usdc.balanceOf(w2.address)) - w2Before;
    expect(received > 0n, 'F4.applicant-received-funds', `W2 got ${ethers.formatUnits(received, 6)} USDC`);
    pass('F4.dispute-flow-complete', `applicant wins ✅ — W2 received ${ethers.formatUnits(received, 6)} USDC`);

    const w2Bal = await usdc.balanceOf(w2.address);
    if (w2Bal > 0n) await (await usdc.connect(w2).transfer(w1.address, w2Bal)).wait();
  } catch (e) {
    fail('F4.dispute-flow-complete', e.message?.slice(0, 200));
    console.error(e);
  }

  // ── Summary ──
  console.log('\n' + '═'.repeat(60));
  console.log('SUMMARY');
  console.log('═'.repeat(60));
  for (const t of results.tests) {
    console.log(`${t.status === 'PASS' ? '✅' : '❌'} ${t.name}${t.detail ? ' — ' + t.detail : ''}`);
  }
  console.log('═'.repeat(60));
  console.log(`Total: ${results.summary.total} | Passed: ${results.summary.passed} | Failed: ${results.summary.failed}`);
  if (results.summary.failed === 0) console.log('🎉 ALL TESTS PASSED');
  else console.log(`⚠️  ${results.summary.failed} FAILED`);

  fs.writeFileSync(path.join(__dirname, 'e2e-mainnet-arch-results.json'), JSON.stringify({
    ...results,
    contracts: { genesis: genesisAddr, profileGenesis: profileGenesisAddr, nowjc: nowjcAddr, profileManager: profileMgrAddr, athena: athenaAddr, lowjc: lowjcAddr, athenaClient: athenaClientAddr },
    testedAt: new Date().toISOString()
  }, null, 2));
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
