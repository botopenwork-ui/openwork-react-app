/**
 * e2e-proper.cjs
 *
 * Full E2E using REAL Arb Sepolia testnet contracts (no mocks).
 * Run AFTER Anas calls addAuthorizedContract on NOWJC.
 *
 * Flow: createProfile → postJob → applyToJob → startJob → submitWork → releasePayment
 */

const { ethers }   = require('../backend/node_modules/ethers');
const fs           = require('fs');
const path         = require('path');
const { execSync } = require('child_process');

const ARB_SEPOLIA_RPC = 'https://arb-sepolia.g.alchemy.com/v2/ECvjGU_6M0Jrw6wlFkPo2ZbonbfW5oIZ';
const USDC_ADDR       = '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d';
const NOWJC_ADDR      = '0x39158a9F92faB84561205B05223929eFF131455e';
const ARBISCAN        = 'https://sepolia.arbiscan.io/tx/';
const OUT             = path.join(__dirname, '../contracts/out');

function getArtifact(sol, name) {
  const a = JSON.parse(fs.readFileSync(path.join(OUT, sol, `${name}.json`), 'utf8'));
  return { abi: a.abi, bytecode: a.bytecode.object };
}
function link(h) { return `${ARBISCAN}${h}`; }

async function main() {
  // Load addresses from deploy step
  const addrs = JSON.parse(fs.readFileSync(path.join(__dirname, 'testnet-proper-addresses.json'), 'utf8'));
  const LOWJC_PROXY = addrs.lowjcProxy;
  console.log('Using NativeArbLOWJC:', LOWJC_PROXY);

  let key = process.env.BRIDGE_KEY;
  if (!key) {
    const r = execSync(`gcloud run services describe openwork --region=us-central1 --format=json --project=openwork-480320`,
      { env: { ...process.env, PATH: `/home/linuxbrew/.linuxbrew/opt/google-cloud-sdk/bin:${process.env.PATH}` } });
    key = JSON.parse(r.toString()).spec.template.spec.containers[0].env?.find(e => e.name === 'WALL2_PRIVATE_KEY')?.value;
  }
  if (!key) throw new Error('No key');

  const provider = new ethers.JsonRpcProvider(ARB_SEPOLIA_RPC);
  const w1 = new ethers.Wallet(key, provider);
  const w2 = ethers.Wallet.createRandom().connect(provider);
  console.log('W1 (job giver):', w1.address);
  console.log('W2 (job taker):', w2.address);

  // Check authorization
  const nowjcAbi = ['function authorizedContracts(address) view returns (bool)'];
  const isAuth = await new ethers.Contract(NOWJC_ADDR, nowjcAbi, provider).authorizedContracts(LOWJC_PROXY);
  if (!isAuth) {
    console.error('\n❌ LOWJC not yet authorized on NOWJC.');
    console.error(`Anas must call: addAuthorizedContract("${LOWJC_PROXY}") on ${NOWJC_ADDR}`);
    process.exit(1);
  }
  console.log('✅ LOWJC is authorized on NOWJC');

  const lowjcArtifact = getArtifact('native-arb-lowjc.sol', 'NativeArbOpenWorkJobContract');
  const lowjc = new ethers.Contract(LOWJC_PROXY, lowjcArtifact.abi, w1);
  const lowjcW2 = lowjc.connect(w2);

  const usdcAbi = ['function balanceOf(address) view returns (uint256)', 'function approve(address,uint256) returns (bool)'];
  const usdc = new ethers.Contract(USDC_ADDR, usdcAbi, w1);
  const usdcRO = new ethers.Contract(USDC_ADDR, usdcAbi, provider);

  console.log('W1 ETH :', ethers.formatEther(await provider.getBalance(w1.address)));
  console.log('W1 USDC:', ethers.formatUnits(await usdc.balanceOf(w1.address), 6));

  // Fund W2 for gas
  console.log('\n[0] Funding W2 with 0.001 ETH...');
  const fundTx = await (await w1.sendTransaction({ to: w2.address, value: ethers.parseEther('0.001') })).wait();
  console.log(`  ✅ ${link(fundTx.hash)}`);

  const links = {};
  const MILESTONE = ethers.parseUnits('1', 6); // 1 USDC

  // createProfile for W1
  console.log('\n[1] W1 createProfile...');
  const w1HasProfile = await lowjc.hasProfile(w1.address);
  if (w1HasProfile) {
    console.log('  (W1 already has profile, skipping)');
  } else {
    const cpTx = await (await lowjc.createProfile('ipfs://testnet-w1-profile', ethers.ZeroAddress)).wait();
    links.createProfileW1 = link(cpTx.hash);
    console.log(`  ✅ ${links.createProfileW1}`);
  }

  // createProfile for W2
  console.log('\n[2] W2 createProfile...');
  const w2HasProfile = await lowjc.hasProfile(w2.address);
  if (w2HasProfile) {
    console.log('  (W2 already has profile, skipping)');
  } else {
    const cp2Tx = await (await lowjcW2.createProfile('ipfs://testnet-w2-profile', ethers.ZeroAddress)).wait();
    links.createProfileW2 = link(cp2Tx.hash);
    console.log(`  ✅ ${links.createProfileW2}`);
  }

  // postJob
  console.log('\n[3] W1 postJob...');
  const counterBefore = await lowjc.jobCounter();
  const chainId = (await provider.getNetwork()).chainId;
  const jobId = `${chainId}-${Number(counterBefore) + 1}`;
  console.log(`  Expected job ID: ${jobId}`);
  const postTx = await (await lowjc.postJob(
    'ipfs://testnet-proper-e2e-job',
    ['Milestone 1 - Full proper test'],
    [MILESTONE]
  )).wait();
  links.postJob = link(postTx.hash);
  console.log(`  ✅ Job posted: ${links.postJob}`);

  // applyToJob (W2)
  console.log('\n[4] W2 applyToJob...');
  const applyTx = await (await lowjcW2.applyToJob(
    jobId,
    'ipfs://testnet-application-proper',
    ['Milestone 1 - My proper proposal'],
    [MILESTONE],
    3  // Arb domain → direct USDC transfer
  )).wait();
  links.applyToJob = link(applyTx.hash);
  console.log(`  ✅ Applied: ${links.applyToJob}`);

  // startJob (W1 — approves + starts)
  console.log('\n[5] W1 startJob (1 USDC → NOWJC)...');
  await (await usdc.approve(LOWJC_PROXY, MILESTONE)).wait();
  const w1Before = await usdc.balanceOf(w1.address);
  const nowjcBefore = await usdcRO.balanceOf(NOWJC_ADDR);
  const startTx = await (await lowjc.startJob(jobId, 1, false)).wait();
  links.startJob = link(startTx.hash);
  const w1After = await usdc.balanceOf(w1.address);
  const nowjcAfter = await usdcRO.balanceOf(NOWJC_ADDR);
  console.log(`  ✅ Job started: ${links.startJob}`);
  console.log(`  W1 spent: ${ethers.formatUnits(w1Before - w1After, 6)} USDC`);
  console.log(`  NOWJC received: ${ethers.formatUnits(nowjcAfter - nowjcBefore, 6)} USDC`);

  // submitWork (W2)
  console.log('\n[6] W2 submitWork...');
  const submitTx = await (await lowjcW2.submitWork(jobId, 'ipfs://testnet-proper-submission')).wait();
  links.submitWork = link(submitTx.hash);
  console.log(`  ✅ Work submitted: ${links.submitWork}`);

  // releasePayment (W1)
  console.log('\n[7] W1 releasePayment...');
  const w2Before = await usdcRO.balanceOf(w2.address);
  const releaseTx = await (await lowjc.releasePayment(jobId)).wait();
  links.releasePayment = link(releaseTx.hash);
  const w2After = await usdcRO.balanceOf(w2.address);
  const received = w2After - w2Before;
  console.log(`  ✅ Payment released: ${links.releasePayment}`);
  console.log(`  W2 received: ${ethers.formatUnits(received, 6)} USDC`);

  if (w2After <= w2Before) throw new Error('W2 did not receive USDC!');

  console.log('\n════════════════════════════════════════════════════════');
  console.log('✅ FULL PROPER E2E — createProfile → postJob → applyToJob → startJob → submitWork → releasePayment');
  console.log('════════════════════════════════════════════════════════');
  console.log('\nContracts used:');
  console.log('  NOWJC (real testnet)       :', NOWJC_ADDR);
  console.log('  NativeArbLOWJC (new)       :', LOWJC_PROXY);
  console.log('\nJob ID:', jobId);
  console.log('\nArbiscan TX links:');
  for (const [k, v] of Object.entries(links)) console.log(`  ${k.padEnd(20)}: ${v}`);
  console.log(`\n  W1 → NOWJC (startJob):     ${ethers.formatUnits(w1Before - w1After, 6)} USDC ✅`);
  console.log(`  NOWJC → W2 (release):      ${ethers.formatUnits(received, 6)} USDC ✅`);
}

main().catch(e => { console.error('\n❌ FAILED:', e.message); if (e.info?.error) console.error(JSON.stringify(e.info.error)); process.exit(1); });
