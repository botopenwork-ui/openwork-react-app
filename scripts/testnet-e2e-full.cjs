/**
 * testnet-e2e-full.cjs
 *
 * Full E2E with postJob → applyToJob → startJob → submitWork → releasePayment
 * Reuses existing MockGenesis + NOWJC-v2 from previous testnet-e2e run.
 * Deploys a fresh NativeArbLOWJC-testnet (has adminSetProfile + no nowjc.createProfile call).
 *
 * Usage: node scripts/testnet-e2e-full.cjs
 */

const { ethers } = require('../backend/node_modules/ethers');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ARB_SEPOLIA_RPC = 'https://arb-sepolia.g.alchemy.com/v2/ECvjGU_6M0Jrw6wlFkPo2ZbonbfW5oIZ';
const USDC_SEPOLIA    = '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d';
const ARBISCAN_BASE   = 'https://sepolia.arbiscan.io/tx/';
const CONTRACTS_OUT   = path.join(__dirname, '../contracts/out');

function link(h) { return `${ARBISCAN_BASE}${h}`; }

function getArtifact(solFile, contractName) {
  const p = path.join(CONTRACTS_OUT, solFile, `${contractName}.json`);
  const a = JSON.parse(fs.readFileSync(p, 'utf8'));
  return { abi: a.abi, bytecode: a.bytecode.object };
}

async function deployProxy(wallet, artifact, initArgs, label) {
  const proxyArtifact = getArtifact('ERC1967Proxy.sol', 'ERC1967Proxy');
  console.log(`\n  Deploying ${label} impl...`);
  const ImplFactory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const impl = await ImplFactory.deploy();
  const implReceipt = await impl.deploymentTransaction().wait();
  console.log(`  impl: ${await impl.getAddress()}  ${link(implReceipt.hash)}`);

  const initData = new ethers.Interface(artifact.abi).encodeFunctionData('initialize', initArgs);
  const ProxyFactory = new ethers.ContractFactory(proxyArtifact.abi, proxyArtifact.bytecode, wallet);
  const proxy = await ProxyFactory.deploy(await impl.getAddress(), initData);
  const proxyReceipt = await proxy.deploymentTransaction().wait();
  const proxyAddr = await proxy.getAddress();
  console.log(`  ✅ ${label} proxy: ${proxyAddr}  ${link(proxyReceipt.hash)}`);
  return proxyAddr;
}

async function main() {
  let privateKey = process.env.BRIDGE_KEY;
  if (!privateKey) {
    const result = execSync(
      `gcloud run services describe openwork --region=us-central1 --format=json --project=openwork-480320`,
      { env: { ...process.env, PATH: `/home/linuxbrew/.linuxbrew/opt/google-cloud-sdk/bin:${process.env.PATH}` } }
    );
    const envs = JSON.parse(result.toString()).spec.template.spec.containers[0].env || [];
    const k = envs.find(e => e.name === 'WALL2_PRIVATE_KEY');
    if (k) privateKey = k.value;
  }
  if (!privateKey) throw new Error('No private key.');

  const provider = new ethers.JsonRpcProvider(ARB_SEPOLIA_RPC);
  const w1 = new ethers.Wallet(privateKey, provider);
  const w2 = ethers.Wallet.createRandom().connect(provider);

  console.log('W1 (deployer + job giver):', w1.address);
  console.log('W2 (job taker)           :', w2.address);

  const usdcAbi = [
    'function balanceOf(address) view returns (uint256)',
    'function approve(address,uint256) returns (bool)',
    'function decimals() view returns (uint8)',
  ];
  const usdc = new ethers.Contract(USDC_SEPOLIA, usdcAbi, w1);
  const dec = await usdc.decimals();
  console.log('W1 ETH :', ethers.formatEther(await provider.getBalance(w1.address)));
  console.log('W1 USDC:', ethers.formatUnits(await usdc.balanceOf(w1.address), dec));

  // Fund W2 for gas
  console.log('\n[0] Funding W2...');
  const fundReceipt = await (await w1.sendTransaction({ to: w2.address, value: ethers.parseEther('0.001') })).wait();
  console.log(`  ✅ ${link(fundReceipt.hash)}`);

  // Deploy fresh MockGenesis
  console.log('\n[1a] Deploying fresh MockGenesis...');
  const genesisArtifact = getArtifact('mock-genesis.sol', 'MockGenesis');
  const mockGenesis = await deployProxy(w1, genesisArtifact, [w1.address], 'MockGenesis');

  // Deploy fresh NOWJC-v2 pointing to new genesis
  console.log('\n[1b] Deploying fresh NOWJC-v2...');
  const nowjcArtifact = getArtifact('nowjc-v2.sol', 'NativeOpenWorkJobContract');
  const nowjcProxy = await deployProxy(w1, nowjcArtifact,
    [w1.address, ethers.ZeroAddress, mockGenesis, ethers.ZeroAddress, USDC_SEPOLIA, ethers.ZeroAddress],
    'NOWJC-v2');
  const nowjc = new ethers.Contract(nowjcProxy, nowjcArtifact.abi, w1);
  // Fix commission
  await (await nowjc.setCommissionPercentage(100)).wait();
  await (await nowjc.setMinCommission(0)).wait();
  // Authorize NOWJC on Genesis
  await (await new ethers.Contract(mockGenesis, genesisArtifact.abi, w1).authorizeContract(nowjcProxy, true)).wait();
  console.log('  NOWJC-v2 setup complete ✅');

  // Deploy testnet LOWJC (has adminSetProfile)
  console.log('\n[1] Deploying NativeArbLOWJC-testnet...');
  const lowjcArtifact = getArtifact('native-arb-lowjc-testnet.sol', 'NativeArbOpenWorkJobContractTestnet');
  const lowjcProxy = await deployProxy(w1, lowjcArtifact, [w1.address, USDC_SEPOLIA, nowjcProxy], 'NativeArbLOWJC-testnet');
  const lowjc = new ethers.Contract(lowjcProxy, lowjcArtifact.abi, w1);

  // Authorize new LOWJC on existing NOWJC-v2
  console.log('\n[2] Authorizing testnet LOWJC on NOWJC-v2...');
  const authTx = await (await nowjc.addAuthorizedContract(lowjcProxy)).wait();
  console.log(`  ✅ Authorized: ${link(authTx.hash)}`);

  // Set profiles for W1 and W2 via adminSetProfile
  console.log('\n[3] Setting profiles for W1 and W2...');
  const profileW1 = await (await lowjc.adminSetProfile(w1.address)).wait();
  const profileW2 = await (await lowjc.adminSetProfile(w2.address)).wait();
  console.log(`  ✅ W1 profile set: ${link(profileW1.hash)}`);
  console.log(`  ✅ W2 profile set: ${link(profileW2.hash)}`);

  const MILESTONE_AMOUNT = ethers.parseUnits('1', 6);
  const links = {};

  // postJob
  console.log('\n[4] W1 postJob...');
  const counterBefore = await lowjc.jobCounter();
  const chainId = (await provider.getNetwork()).chainId;
  const expectedJobId = `${chainId}-${Number(counterBefore) + 1}`;
  console.log(`  Expected job ID: ${expectedJobId}`);
  const postJobTx = await (await lowjc.postJob(
    'ipfs://testnet-full-e2e-job',
    ['Milestone 1 - Full E2E Test'],
    [MILESTONE_AMOUNT]
  )).wait();
  links.postJob = link(postJobTx.hash);
  console.log(`  ✅ Job posted: ${links.postJob}`);

  // applyToJob (W2)
  console.log('\n[5] W2 applyToJob...');
  const lowjcW2 = lowjc.connect(w2);
  const applyTx = await (await lowjcW2.applyToJob(
    expectedJobId,
    'ipfs://testnet-application',
    ['Milestone 1 - I will do it'],
    [MILESTONE_AMOUNT],
    3   // preferredChainDomain = 3 (Arb) → direct USDC
  )).wait();
  links.applyToJob = link(applyTx.hash);
  console.log(`  ✅ Applied: ${links.applyToJob}`);

  // startJob (W1 — approves USDC, starts job, first milestone locked in NOWJC)
  console.log('\n[6] W1 startJob (locks 1 USDC into NOWJC)...');
  await (await usdc.approve(lowjcProxy, MILESTONE_AMOUNT)).wait();
  const w1UsdcBefore = await usdc.balanceOf(w1.address);
  const nowjcUsdcBefore = await new ethers.Contract(USDC_SEPOLIA, usdcAbi, provider).balanceOf(nowjcProxy);
  const startTx = await (await lowjc.startJob(expectedJobId, 1, false)).wait();
  links.startJob = link(startTx.hash);
  const w1UsdcAfter = await usdc.balanceOf(w1.address);
  const nowjcUsdcAfter = await new ethers.Contract(USDC_SEPOLIA, usdcAbi, provider).balanceOf(nowjcProxy);
  console.log(`  ✅ Job started: ${links.startJob}`);
  console.log(`  W1 spent: ${ethers.formatUnits(w1UsdcBefore - w1UsdcAfter, dec)} USDC`);
  console.log(`  NOWJC received: ${ethers.formatUnits(nowjcUsdcAfter - nowjcUsdcBefore, dec)} USDC`);

  // submitWork (W2)
  console.log('\n[7] W2 submitWork...');
  const submitTx = await (await lowjcW2.submitWork(expectedJobId, 'ipfs://testnet-submission')).wait();
  links.submitWork = link(submitTx.hash);
  console.log(`  ✅ Work submitted: ${links.submitWork}`);

  // releasePayment (W1)
  console.log('\n[8] W1 releasePayment...');
  const usdcRO = new ethers.Contract(USDC_SEPOLIA, usdcAbi, provider);
  const w2Before = await usdcRO.balanceOf(w2.address);
  const releaseTx = await (await lowjc.releasePayment(expectedJobId)).wait();
  links.releasePayment = link(releaseTx.hash);
  const w2After = await usdcRO.balanceOf(w2.address);
  const received = w2After - w2Before;
  const commission = MILESTONE_AMOUNT - received;
  console.log(`  ✅ Payment released: ${links.releasePayment}`);
  console.log(`  W2 received: ${ethers.formatUnits(received, dec)} USDC`);
  console.log(`  Commission: ${ethers.formatUnits(commission, dec)} USDC`);

  if (w2After <= w2Before) throw new Error('W2 did not receive USDC!');

  // ── SUMMARY ────────────────────────────────────────────────────────────────
  console.log('\n════════════════════════════════════════════════════════');
  console.log('✅ FULL E2E PASSED — postJob → applyToJob → startJob → submitWork → releasePayment');
  console.log('════════════════════════════════════════════════════════');
  console.log('\nCONTRACTS:');
  console.log(`  MockGenesis (fresh) : ${mockGenesis}`);
  console.log(`  NOWJC-v2 (fresh)    : ${nowjcProxy}`);
  console.log(`  NativeArbLOWJC-test  : ${lowjcProxy}`);
  console.log(`\nJOB ID: ${expectedJobId}`);
  console.log('\nARBISCAN TX LINKS:');
  console.log(`  [1] postJob:          ${links.postJob}`);
  console.log(`  [2] applyToJob:       ${links.applyToJob}`);
  console.log(`  [3] startJob:         ${links.startJob}`);
  console.log(`  [4] submitWork:       ${links.submitWork}`);
  console.log(`  [5] releasePayment:   ${links.releasePayment}`);
  console.log(`\nUSDC FLOW:`);
  console.log(`  W1 → NOWJC (startJob):         ${ethers.formatUnits(w1UsdcBefore - w1UsdcAfter, dec)} USDC ✅`);
  console.log(`  NOWJC → W2 (releasePayment):   ${ethers.formatUnits(received, dec)} USDC ✅`);
  console.log(`  Commission (1%):                ${ethers.formatUnits(commission, dec)} USDC`);

  fs.writeFileSync(
    path.join(__dirname, 'testnet-e2e-full-results.json'),
    JSON.stringify({ testedAt: new Date().toISOString(), contracts: { mockGenesis, nowjcProxy, lowjcProxy }, jobId: expectedJobId, links, wallets: { w1: w1.address, w2: w2.address } }, null, 2)
  );
}

main().catch(e => { console.error('\n❌ FAILED:', e.message); process.exit(1); });
