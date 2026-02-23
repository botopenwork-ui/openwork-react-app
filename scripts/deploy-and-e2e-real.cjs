/**
 * deploy-and-e2e-real.cjs
 *
 * Deploys a full real contract suite on Arb Sepolia (no mocks, no Anas needed):
 *   - NativeOpenworkGenesis (real mainnet-ready source, optimizer_runs=1 to fit EIP-170)
 *   - NativeOpenWorkJobContract v2 (with createProfile stub)
 *   - NativeArbOpenWorkJobContract (LOWJC)
 *   - NativeArbAthenaClient
 *
 * Then runs BOTH flows:
 *   1. Application flow: createProfile → postJob → applyToJob → startJob → submitWork → releasePayment
 *   2. Direct flow:      startDirectContract → submitWork → releasePayment
 *
 * USDC recovered from W2 after each test.
 */

const { ethers }   = require('../backend/node_modules/ethers');
const fs           = require('fs');
const path         = require('path');
const { execSync } = require('child_process');

const RPC      = 'https://arb-sepolia.g.alchemy.com/v2/ECvjGU_6M0Jrw6wlFkPo2ZbonbfW5oIZ';
const USDC     = '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d';
const SCAN     = 'https://sepolia.arbiscan.io/tx/';
// out-minsize = compiled with optimizer_runs=1 to get NativeOpenworkGenesis under 24KB
const OUT      = path.join(__dirname, '../contracts/out-minsize');

const lnk = h => `${SCAN}${h}`;

function art(sol, name) {
  const a = JSON.parse(fs.readFileSync(path.join(OUT, sol, `${name}.json`), 'utf8'));
  return { abi: a.abi, bytecode: a.bytecode.object };
}

async function deployProxy(w, artifact, initArgs, label) {
  const proxyArt = art('ERC1967Proxy.sol', 'ERC1967Proxy');
  process.stdout.write(`  → ${label} impl... `);
  const Impl = new ethers.ContractFactory(artifact.abi, artifact.bytecode, w);
  const impl = await Impl.deploy();
  const ir = await impl.deploymentTransaction().wait();
  process.stdout.write(`${await impl.getAddress()} ${lnk(ir.hash)}\n`);

  const initData = new ethers.Interface(artifact.abi).encodeFunctionData('initialize', initArgs);
  process.stdout.write(`  → ${label} proxy... `);
  const Proxy = new ethers.ContractFactory(proxyArt.abi, proxyArt.bytecode, w);
  const proxy = await Proxy.deploy(await impl.getAddress(), initData);
  const pr = await proxy.deploymentTransaction().wait();
  const addr = await proxy.getAddress();
  process.stdout.write(`${addr} ${lnk(pr.hash)}\n`);
  return addr;
}

async function getKey() {
  if (process.env.BRIDGE_KEY) return process.env.BRIDGE_KEY;
  const r = execSync(`gcloud run services describe openwork --region=us-central1 --format=json --project=openwork-480320`,
    { env: { ...process.env, PATH: `/home/linuxbrew/.linuxbrew/opt/google-cloud-sdk/bin:${process.env.PATH}` } });
  return JSON.parse(r.toString()).spec.template.spec.containers[0].env?.find(e => e.name === 'WALL2_PRIVATE_KEY')?.value;
}

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC);
  const w1 = new ethers.Wallet(await getKey(), provider);
  const w2 = ethers.Wallet.createRandom().connect(provider);

  const usdcAbi = ['function balanceOf(address) view returns (uint256)',
                   'function approve(address,uint256) returns (bool)',
                   'function transfer(address,uint256) returns (bool)'];
  const usdc1 = new ethers.Contract(USDC, usdcAbi, w1);
  const usdcRO = new ethers.Contract(USDC, usdcAbi, provider);

  console.log('W1:', w1.address);
  console.log('W2:', w2.address);
  console.log('W1 ETH:', ethers.formatEther(await provider.getBalance(w1.address)));
  console.log('W1 USDC:', ethers.formatUnits(await usdc1.balanceOf(w1.address), 6));

  // ── Fund W2 minimal gas ──────────────────────────────────────────────────────
  console.log('\n[0] Fund W2 (0.0001 ETH)');
  const ft = await (await w1.sendTransaction({ to: w2.address, value: ethers.parseEther('0.0001') })).wait();
  console.log('   ', lnk(ft.hash));

  // ── Deploy Genesis ───────────────────────────────────────────────────────────
  console.log('\n[1] NativeOpenworkGenesis');
  const genesisArt = art('native-openwork-genesis.sol', 'NativeOpenworkGenesis');
  const genesisProxy = await deployProxy(w1, genesisArt, [w1.address], 'Genesis');
  const genesis = new ethers.Contract(genesisProxy, genesisArt.abi, w1);

  // ── Deploy NOWJC-v2 ──────────────────────────────────────────────────────────
  console.log('\n[2] NOWJC-v2');
  const nowjcArt = art('nowjc-v2.sol', 'NativeOpenWorkJobContract');
  // initialize(owner, bridge, genesis, rewardsContract, usdtToken, cctpReceiver)
  const nowjcProxy = await deployProxy(w1, nowjcArt,
    [w1.address, ethers.ZeroAddress, genesisProxy, ethers.ZeroAddress, USDC, ethers.ZeroAddress], 'NOWJC-v2');
  const nowjc = new ethers.Contract(nowjcProxy, nowjcArt.abi, w1);

  // Fix commission (fresh deploy may have stale storage)
  await (await nowjc.setCommissionPercentage(100)).wait();  // 1%
  await (await nowjc.setMinCommission(0)).wait();
  // Authorize NOWJC on Genesis
  await (await genesis.authorizeContract(nowjcProxy, true)).wait();
  console.log('  NOWJC authorized on Genesis ✅  commission=1%');

  // ── Deploy NativeArbLOWJC ────────────────────────────────────────────────────
  console.log('\n[3] NativeArbLOWJC');
  const lowjcArt = art('native-arb-lowjc.sol', 'NativeArbOpenWorkJobContract');
  const lowjcProxy = await deployProxy(w1, lowjcArt, [w1.address, USDC, nowjcProxy], 'LOWJC');
  const lowjc = new ethers.Contract(lowjcProxy, lowjcArt.abi, w1);
  const lowjcW2 = lowjc.connect(w2);

  // ── Deploy NativeArbAthenaClient ─────────────────────────────────────────────
  console.log('\n[4] NativeArbAthenaClient');
  const athenaArt = art('native-arb-athena-client.sol', 'NativeArbAthenaClient');
  const athenaProxy = await deployProxy(w1, athenaArt,
    [w1.address, USDC, ethers.ZeroAddress, lowjcProxy], 'Athena');

  // Wire up
  await (await lowjc.setAthenaClientContract(athenaProxy)).wait();
  await (await nowjc.batchAddAuthorizedContracts([lowjcProxy, athenaProxy])).wait();
  console.log('  AthenaClient registered + LOWJC/Athena authorized on NOWJC ✅');

  const M = ethers.parseUnits('1', 6); // 1 USDC milestone

  // ════════════════════════════════════════════════════════════════════════════
  // FLOW 1: Application flow
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n══════════════════════════════════════════════');
  console.log('FLOW 1: createProfile → postJob → applyToJob → startJob → submitWork → releasePayment');
  console.log('══════════════════════════════════════════════');
  const f1 = {};

  // createProfile W1
  console.log('\n[F1-1] W1 createProfile');
  const cp1 = await (await lowjc.createProfile('ipfs://w1-profile', ethers.ZeroAddress)).wait();
  f1.createProfileW1 = lnk(cp1.hash);
  console.log('  ', f1.createProfileW1);

  // createProfile W2
  console.log('[F1-2] W2 createProfile');
  const cp2 = await (await lowjcW2.createProfile('ipfs://w2-profile', ethers.ZeroAddress)).wait();
  f1.createProfileW2 = lnk(cp2.hash);
  console.log('  ', f1.createProfileW2);

  // postJob
  console.log('[F1-3] W1 postJob');
  const ctr1 = await lowjc.jobCounter();
  const jid1 = `${(await provider.getNetwork()).chainId}-${Number(ctr1)+1}`;
  const postTx = await (await lowjc.postJob('ipfs://job-detail', ['Milestone 1'], [M])).wait();
  f1.postJob = lnk(postTx.hash);
  console.log(`  jobId=${jid1}`, f1.postJob);

  // applyToJob (W2)
  console.log('[F1-4] W2 applyToJob');
  const applyTx = await (await lowjcW2.applyToJob(jid1, 'ipfs://app', ['M1'], [M], 3)).wait();
  f1.applyToJob = lnk(applyTx.hash);
  console.log('  ', f1.applyToJob);

  // startJob (W1 sends USDC → NOWJC)
  console.log('[F1-5] W1 startJob');
  await (await usdc1.approve(lowjcProxy, M)).wait();
  const w1b1 = await usdc1.balanceOf(w1.address);
  const nb1 = await usdcRO.balanceOf(nowjcProxy);
  const startTx = await (await lowjc.startJob(jid1, 1, false)).wait();
  f1.startJob = lnk(startTx.hash);
  const w1a1 = await usdc1.balanceOf(w1.address);
  const na1 = await usdcRO.balanceOf(nowjcProxy);
  console.log(`  W1→NOWJC: ${ethers.formatUnits(w1b1-w1a1,6)} USDC`, f1.startJob);

  // submitWork (W2)
  console.log('[F1-6] W2 submitWork');
  const sub1 = await (await lowjcW2.submitWork(jid1, 'ipfs://work')).wait();
  f1.submitWork = lnk(sub1.hash);
  console.log('  ', f1.submitWork);

  // releasePayment (W1)
  console.log('[F1-7] W1 releasePayment');
  const w2b1 = await usdcRO.balanceOf(w2.address);
  const rel1 = await (await lowjc.releasePayment(jid1)).wait();
  f1.releasePayment = lnk(rel1.hash);
  const w2a1 = await usdcRO.balanceOf(w2.address);
  console.log(`  NOWJC→W2: ${ethers.formatUnits(w2a1-w2b1,6)} USDC`, f1.releasePayment);
  if (w2a1 <= w2b1) throw new Error('F1: W2 did not receive USDC');

  // Recover W2's USDC
  const w2bal1 = await usdcRO.balanceOf(w2.address);
  if (w2bal1 > 0n) {
    const rec1 = await (await new ethers.Contract(USDC, usdcAbi, w2).transfer(w1.address, w2bal1)).wait();
    console.log(`  Recovered ${ethers.formatUnits(w2bal1,6)} USDC from W2`, lnk(rec1.hash));
  }

  // ════════════════════════════════════════════════════════════════════════════
  // FLOW 2: Direct contract flow
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n══════════════════════════════════════════════');
  console.log('FLOW 2: startDirectContract → submitWork → releasePayment');
  console.log('══════════════════════════════════════════════');
  const f2 = {};

  const ctr2 = await lowjc.jobCounter();
  const jid2 = `${(await provider.getNetwork()).chainId}-${Number(ctr2)+1}`;
  console.log(`[F2-1] W1 startDirectContract (jobId=${jid2})`);
  await (await usdc1.approve(lowjcProxy, M)).wait();
  const w1b2 = await usdc1.balanceOf(w1.address);
  const dirTx = await (await lowjc.startDirectContract(
    w2.address, 'ipfs://direct-job', ['Milestone 1'], [M], 3
  )).wait();
  f2.startDirectContract = lnk(dirTx.hash);
  const w1a2 = await usdc1.balanceOf(w1.address);
  console.log(`  W1→NOWJC: ${ethers.formatUnits(w1b2-w1a2,6)} USDC`, f2.startDirectContract);

  console.log('[F2-2] W2 submitWork');
  const sub2 = await (await lowjcW2.submitWork(jid2, 'ipfs://direct-work')).wait();
  f2.submitWork = lnk(sub2.hash);
  console.log('  ', f2.submitWork);

  console.log('[F2-3] W1 releasePayment');
  const w2b2 = await usdcRO.balanceOf(w2.address);
  const rel2 = await (await lowjc.releasePayment(jid2)).wait();
  f2.releasePayment = lnk(rel2.hash);
  const w2a2 = await usdcRO.balanceOf(w2.address);
  console.log(`  NOWJC→W2: ${ethers.formatUnits(w2a2-w2b2,6)} USDC`, f2.releasePayment);
  if (w2a2 <= w2b2) throw new Error('F2: W2 did not receive USDC');

  // Recover W2's USDC
  const w2bal2 = await usdcRO.balanceOf(w2.address);
  if (w2bal2 > 0n) {
    const rec2 = await (await new ethers.Contract(USDC, usdcAbi, w2).transfer(w1.address, w2bal2)).wait();
    console.log(`  Recovered ${ethers.formatUnits(w2bal2,6)} USDC from W2`, lnk(rec2.hash));
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SUMMARY
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n════════════════════════════════════════════════════════');
  console.log('✅ BOTH FLOWS PASSED — REAL CONTRACTS, ARB SEPOLIA');
  console.log('════════════════════════════════════════════════════════');
  console.log('\nContracts deployed:');
  console.log('  NativeOpenworkGenesis :', genesisProxy);
  console.log('  NOWJC-v2              :', nowjcProxy);
  console.log('  NativeArbLOWJC        :', lowjcProxy);
  console.log('  NativeArbAthenaClient :', athenaProxy);
  console.log('\nFlow 1 (Application) — job', jid1);
  for (const [k,v] of Object.entries(f1)) console.log(`  ${k.padEnd(20)}: ${v}`);
  console.log('\nFlow 2 (Direct) — job', jid2);
  for (const [k,v] of Object.entries(f2)) console.log(`  ${k.padEnd(20)}: ${v}`);

  fs.writeFileSync(path.join(__dirname, 'real-e2e-results.json'),
    JSON.stringify({ testedAt: new Date().toISOString(), contracts: { genesisProxy, nowjcProxy, lowjcProxy, athenaProxy }, flow1: { jobId: jid1, ...f1 }, flow2: { jobId: jid2, ...f2 } }, null, 2));
  console.log('\nResults saved to scripts/real-e2e-results.json');
}

main().catch(e => {
  console.error('\n❌ FAILED:', e.message);
  if (e.info?.error) console.error(JSON.stringify(e.info.error));
  process.exit(1);
});
