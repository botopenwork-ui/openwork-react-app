const { ethers } = require('../backend/node_modules/ethers');
const path = require('path');
const fs = require('fs');

const RPC = 'https://arb-sepolia.g.alchemy.com/v2/ECvjGU_6M0Jrw6wlFkPo2ZbonbfW5oIZ';
const USDC = '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d';
const OUT = path.join(__dirname, '../contracts/out-minsize');

// Read latest deployed addresses from last test run
const results = JSON.parse(fs.readFileSync(path.join(__dirname, 'thorough-e2e-v3-results.json')));
const addrs = results.deployedContracts;
console.log('Using contracts:', addrs);

function art(dir, name) {
  const f = path.join(OUT, dir, `${name}.json`);
  return JSON.parse(fs.readFileSync(f));
}

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC);
  const KEY = await new Promise((res, rej) => {
    const { execSync } = require('child_process');
    try {
      const out = execSync(`/home/linuxbrew/.linuxbrew/opt/google-cloud-sdk/bin/gcloud run services describe openwork --region=us-central1 --format=json --project=openwork-480320 2>/dev/null`);
      const d = JSON.parse(out);
      const v = d.spec.template.spec.containers[0].env.find(e => e.name === 'WALL2_PRIVATE_KEY');
      res(v.value);
    } catch(e) { rej(e); }
  });
  const w1 = new ethers.Wallet(KEY, provider);
  const w2 = ethers.Wallet.createRandom().connect(provider);

  const usdcArt = art('native-arb-lowjc.sol', 'NativeArbOpenWorkJobContract'); // just for USDC ABI
  const ERC20_ABI = ['function transfer(address,uint256) returns(bool)','function approve(address,uint256) returns(bool)','function balanceOf(address) view returns(uint256)'];
  const usdc = new ethers.Contract(USDC, ERC20_ABI, w1);

  // Fund W2
  await (await w1.sendTransaction({to: w2.address, value: ethers.parseEther('0.001')})).wait();
  await (await usdc.transfer(w2.address, BigInt(500_000))).wait(); // 0.5 USDC
  console.log('W2 funded');

  const lowjcArt = art('native-arb-lowjc.sol', 'NativeArbOpenWorkJobContract');
  const nowjcArt = art('nowjc-v3.sol', 'NativeOpenWorkJobContract');
  const genesisArt = JSON.parse(require('fs').readFileSync(require('path').join(OUT, 'native-openwork-genesis.sol', 'NativeOpenworkGenesis.json')));
  const proxyArt = JSON.parse(require('fs').readFileSync(require('path').join(OUT, 'ERC1967Proxy.sol', 'ERC1967Proxy.json')));

  async function deployProxy(signer, a, initArgs) {
    const factory = new ethers.ContractFactory(a.abi, a.bytecode.object, signer);
    const impl = await (await factory.deploy()).getAddress();
    const initData = factory.interface.encodeFunctionData('initialize', initArgs);
    const proxyFactory = new ethers.ContractFactory(proxyArt.abi, proxyArt.bytecode.object, signer);
    const proxy = await proxyFactory.deploy(impl, initData);
    await proxy.waitForDeployment();
    return proxy.getAddress();
  }

  // Deploy fresh mini suite just for F3
  console.log('Deploying genesis...');
  const genesisAddr = await deployProxy(w1, genesisArt, [w1.address]);
  console.log('Deploying NOWJC...');
  const nowjcAddr = await deployProxy(w1, nowjcArt, [w1.address, ethers.ZeroAddress, genesisAddr, ethers.ZeroAddress, USDC, ethers.ZeroAddress]);
  console.log('Deploying LOWJC...');
  const lowjcAddr = await deployProxy(w1, lowjcArt, [w1.address, USDC, nowjcAddr]);
  
  const genesis = new ethers.Contract(genesisAddr, genesisArt.abi, w1);
  const nowjc = new ethers.Contract(nowjcAddr, nowjcArt.abi, w1);
  const lowjc = new ethers.Contract(lowjcAddr, lowjcArt.abi, w1);
  const lowjcW1 = lowjc.connect(w1);
  const lowjcW2 = lowjc.connect(w2);

  // Wire
  await (await nowjc.batchAddAuthorizedContracts([lowjcAddr])).wait();
  await (await nowjc.setCommissionPercentage(100)).wait();
  await (await nowjc.setTreasury(w1.address)).wait();
  await (await genesis.authorizeContract(nowjcAddr, true)).wait();
  console.log('Wired up');

  // Create profiles
  await (await usdc.connect(w1).approve(lowjcAddr, BigInt(100_000))).wait();
  await (await lowjcW1.createProfile('ipfs://p1', ethers.ZeroAddress)).wait();
  await (await usdc.connect(w2).approve(lowjcAddr, BigInt(100_000))).wait();
  await (await lowjcW2.createProfile('ipfs://p2', ethers.ZeroAddress)).wait();
  console.log('Profiles created');

  const M = BigInt(100_000); // 0.1 USDC

  // postJob with 2 milestones
  await (await lowjcW1.postJob('ipfs://f3', ['M1','M2'], [M, M])).wait();
  const jobId = `${(await provider.getNetwork()).chainId}-${await lowjc.jobCounter()}`;
  console.log('Job posted:', jobId);

  // applyToJob
  await (await lowjcW2.applyToJob(jobId, 'ipfs://app', ['M1','M2'], [M, M], 3)).wait();
  console.log('Applied');

  // startJob — W1 approves M USDC for LOWJC
  await (await usdc.connect(w1).approve(lowjcAddr, M)).wait();
  await (await lowjcW1.startJob(jobId, 1, false)).wait();
  console.log('Job started');

  // Check state after startJob
  let job = await lowjc.getJob(jobId);
  console.log(`After startJob: currentMilestone=${job.currentMilestone} finalMilestones.length=${job.finalMilestones.length} status=${job.status} locked=${job.currentLockedAmount}`);

  // submitWork M1
  await (await lowjcW2.submitWork(jobId, 'ipfs://work1')).wait();
  console.log('Work submitted M1');

  // releasePayment M1
  await (await lowjcW1.releasePayment(jobId)).wait();
  console.log('Payment released M1');

  // Check state after releasePayment M1
  job = await lowjc.getJob(jobId);
  console.log(`After releaseM1: currentMilestone=${job.currentMilestone} finalMilestones.length=${job.finalMilestones.length} status=${job.status} locked=${job.currentLockedAmount}`);

  // Try lockNextMilestone
  console.log('Calling lockNextMilestone...');
  await (await usdc.connect(w1).approve(lowjcAddr, M)).wait();
  try {
    await (await lowjcW1.lockNextMilestone(jobId)).wait();
    job = await lowjc.getJob(jobId);
    console.log(`✅ lockNextMilestone OK: currentMilestone=${job.currentMilestone} locked=${job.currentLockedAmount}`);
  } catch(e) {
    console.log(`❌ lockNextMilestone FAILED: ${e.shortMessage || e.message?.slice(0,200)}`);
  }
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
// This won't run since we exited, but add to end of main():
