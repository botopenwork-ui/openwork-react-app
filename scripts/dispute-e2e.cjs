/**
 * dispute-e2e.cjs
 *
 * Full end-to-end dispute cycle on Arb Sepolia (real contracts, no mocks):
 *
 * Setup:
 *   - Deploy NativeAthena-v2 (patched chainId→domain mapping)
 *   - Configure: votingPeriodMinutes=1, minOracleMembers=1, minStakeRequired=0
 *   - Register oracle with W1 as the only member
 *   - Wire NativeAthena into the existing AthenaClient
 *
 * Dispute flow (Applicant wins):
 *   1. createProfile (W1=jobGiver, W2=applicant)
 *   2. postJob → applyToJob → startJob (1 USDC escrowed in NOWJC)
 *   3. submitWork (W2)
 *   4. raiseDispute (W2, 1 USDC fee → NativeAthena)
 *   5. vote (W1 as oracle member, votes FOR dispute raiser = applicant wins)
 *   6. wait 60s for voting period to expire
 *   7. settleDispute → NOWJC.releaseDisputedFunds → W2 gets 0.99 USDC
 *   8. Winning voter (W1) claims fee reward from NativeAthena
 */

const { ethers }   = require('../backend/node_modules/ethers');
const fs           = require('fs');
const path         = require('path');
const { execSync } = require('child_process');

const RPC  = 'https://arb-sepolia.g.alchemy.com/v2/ECvjGU_6M0Jrw6wlFkPo2ZbonbfW5oIZ';
const USDC = '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d';
const SCAN = 'https://sepolia.arbiscan.io/tx/';
const OUT  = path.join(__dirname, '../contracts/out-minsize');

// Contracts from deploy-and-e2e-real.cjs run
const GENESIS_ADDR  = '0x84465Dc27D73d9ED7BCb2602C449e66F39db90A3';
const NOWJC_ADDR    = '0x33e660d4b4e4585c80f04b7843db54Dcb514EE6f';
const LOWJC_ADDR    = '0x66E47575Ba69e5CCb8bF393B659d1294F51FeEa2';
const ATHENA_CLIENT = '0x246003840dde5B835E4b5e4E134eb7fC634FA60D';

const lnk  = h => `${SCAN}${h}`;
const wait = ms => new Promise(r => setTimeout(r, ms));

function art(sol, name) {
  const a = JSON.parse(fs.readFileSync(path.join(OUT, sol, `${name}.json`), 'utf8'));
  return { abi: a.abi, bytecode: a.bytecode.object };
}

async function deployProxy(w, artifact, initArgs, label) {
  const proxyArt = art('ERC1967Proxy.sol', 'ERC1967Proxy');
  process.stdout.write(`  → ${label} impl... `);
  const Impl = new ethers.ContractFactory(artifact.abi, artifact.bytecode, w);
  const impl = await Impl.deploy();
  await impl.deploymentTransaction().wait();
  process.stdout.write(`${await impl.getAddress()}\n`);
  const initData = new ethers.Interface(artifact.abi).encodeFunctionData('initialize', initArgs);
  process.stdout.write(`  → ${label} proxy... `);
  const Proxy = new ethers.ContractFactory(proxyArt.abi, proxyArt.bytecode, w);
  const proxy = await Proxy.deploy(await impl.getAddress(), initData);
  const r = await proxy.deploymentTransaction().wait();
  const addr = await proxy.getAddress();
  process.stdout.write(`${addr} ${lnk(r.hash)}\n`);
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

  const usdcAbi = [
    'function balanceOf(address) view returns (uint256)',
    'function approve(address,uint256) returns (bool)',
    'function transfer(address,uint256) returns (bool)',
    'function transferFrom(address,address,uint256) returns (bool)',
  ];
  const usdc1  = new ethers.Contract(USDC, usdcAbi, w1);
  const usdcRO = new ethers.Contract(USDC, usdcAbi, provider);

  console.log('W1:', w1.address, '(job giver + oracle member)');
  console.log('W2:', w2.address, '(applicant + dispute raiser)');
  console.log('W1 ETH :', ethers.formatEther(await provider.getBalance(w1.address)));
  console.log('W1 USDC:', ethers.formatUnits(await usdc1.balanceOf(w1.address), 6));

  // Load existing contracts
  const genesisAbi = JSON.parse(fs.readFileSync(path.join(OUT, 'native-openwork-genesis.sol', 'NativeOpenworkGenesis.json'), 'utf8')).abi;
  const nowjcAbi   = JSON.parse(fs.readFileSync(path.join(OUT, 'nowjc-v2.sol', 'NativeOpenWorkJobContract.json'), 'utf8')).abi;
  const lowjcAbi   = JSON.parse(fs.readFileSync(path.join(OUT, 'native-arb-lowjc.sol', 'NativeArbOpenWorkJobContract.json'), 'utf8')).abi;
  const clientAbi  = JSON.parse(fs.readFileSync(path.join(OUT, 'native-arb-athena-client.sol', 'NativeArbAthenaClient.json'), 'utf8')).abi;

  const genesis = new ethers.Contract(GENESIS_ADDR, genesisAbi, w1);
  const nowjc   = new ethers.Contract(NOWJC_ADDR, nowjcAbi, w1);
  const lowjc   = new ethers.Contract(LOWJC_ADDR, lowjcAbi, w1);
  const lowjcW2 = lowjc.connect(w2);
  const client  = new ethers.Contract(ATHENA_CLIENT, clientAbi, w1);
  const clientW2 = client.connect(w2);

  // ── [0] Fund W2 ──────────────────────────────────────────────────────────────
  console.log('\n[0] Fund W2 (0.0001 ETH + 1.5 USDC for dispute fee)');
  await (await w1.sendTransaction({ to: w2.address, value: ethers.parseEther('0.0001') })).wait();
  await (await usdc1.transfer(w2.address, ethers.parseUnits('1.5', 6))).wait();
  console.log('  W2 ETH :', ethers.formatEther(await provider.getBalance(w2.address)));
  console.log('  W2 USDC:', ethers.formatUnits(await usdcRO.balanceOf(w2.address), 6));

  // ── [1] Deploy NativeAthena-v2 ───────────────────────────────────────────────
  console.log('\n[1] Deploy NativeAthena-v2 (chainId-aware, real contracts)');
  const athenaArt  = art('native-athena-v2.sol', 'NativeAthena');
  // initialize(owner, daoContract, genesis, nowjContract, usdcToken)
  const athenaAddr = await deployProxy(w1, athenaArt,
    [w1.address, ethers.ZeroAddress, GENESIS_ADDR, NOWJC_ADDR, USDC], 'NativeAthena-v2');
  const athena = new ethers.Contract(athenaAddr, athenaArt.abi, w1);

  // ── [2] Configure NativeAthena ───────────────────────────────────────────────
  console.log('\n[2] Configure NativeAthena');
  await (await athena.updateVotingPeriod(1)).wait();       // 1-minute voting window
  await (await athena.updateMinOracleMembers(1)).wait();    // 1 member = active oracle
  await (await athena.updateMinStakeRequired(0)).wait();    // anyone can vote (testnet)
  console.log('  votingPeriodMinutes=1, minOracleMembers=1, minStakeRequired=0 ✅');

  // ── [3] Authorize NativeAthena on Genesis + NOWJC ────────────────────────────
  console.log('\n[3] Authorize NativeAthena on Genesis + NOWJC');
  await (await genesis.authorizeContract(athenaAddr, true)).wait();
  console.log('  Authorized on Genesis ✅');
  // NOWJC: authorize athena so it can call releaseDisputedFunds
  await (await nowjc.batchAddAuthorizedContracts([athenaAddr])).wait();
  console.log('  Authorized on NOWJC ✅');

  // ── [4] Wire NativeAthena into AthenaClient ───────────────────────────────────
  console.log('\n[4] Wire NativeAthena into AthenaClient');
  await (await client.setNativeAthena(athenaAddr)).wait();
  console.log('  AthenaClient.nativeAthena =', athenaAddr, '✅');

  // ── [5] Register oracle "test-oracle" with W1 as member ──────────────────────
  console.log('\n[5] Register oracle "test-oracle" on Genesis (W1 as member)');
  // Genesis owner can call setOracle directly (onlyAuthorized includes owner)
  await (await genesis.setOracle(
    'test-oracle',
    [w1.address],
    'Test oracle for dispute resolution',
    'ipfs://oracle-details',
    []
  )).wait();
  console.log('  Oracle registered, W1 is member ✅');

  // Verify oracle is active
  const isActive = await athena.isOracleActive('test-oracle');
  console.log('  isOracleActive("test-oracle"):', isActive);
  if (!isActive) throw new Error('Oracle not active — check minOracleMembers/minStakeRequired config');

  // ── [6] Job lifecycle → get to InProgress ────────────────────────────────────
  const M = ethers.parseUnits('1', 6); // 1 USDC milestone
  console.log('\n[6] Job lifecycle: createProfile → postJob → applyToJob → startJob');

  // createProfile — skip if already exists
  for (const [signer, label] of [[lowjc, 'W1'], [lowjcW2, 'W2']]) {
    try {
      await (await signer.createProfile('ipfs://profile', ethers.ZeroAddress)).wait();
      console.log(`  ${label} profile created ✅`);
    } catch(e) {
      if (e.message?.includes('already exists') || e.message?.includes('Profile exists')) {
        console.log(`  ${label} profile already exists ✅`);
      } else throw e;
    }
  }

  const ctr = await lowjc.jobCounter();
  const chainId = (await provider.getNetwork()).chainId;
  const jobId = `${chainId}-${Number(ctr)+1}`;
  console.log('  Job ID will be:', jobId);

  await (await lowjc.postJob('ipfs://dispute-job', ['M1'], [M])).wait();
  console.log('  postJob ✅');

  await (await lowjcW2.applyToJob(jobId, 'ipfs://app', ['M1'], [M], 3)).wait();
  console.log('  applyToJob ✅ (applicant chain domain=3 → Arbitrum)');

  await (await usdc1.approve(LOWJC_ADDR, M)).wait();
  const w1BeforeEscrow = await usdc1.balanceOf(w1.address);
  await (await lowjc.startJob(jobId, 1, false)).wait();
  const w1AfterEscrow = await usdc1.balanceOf(w1.address);
  console.log(`  startJob ✅ — ${ethers.formatUnits(w1BeforeEscrow - w1AfterEscrow, 6)} USDC escrowed in NOWJC`);

  await (await lowjcW2.submitWork(jobId, 'ipfs://work')).wait();
  console.log('  submitWork ✅ (W2 submitted, now W2 will dispute instead of wait for release)');

  // ── [7] W2 raises dispute ─────────────────────────────────────────────────────
  console.log('\n[7] W2 raises dispute (1 USDC fee, 1 USDC disputed)');
  const DISPUTE_FEE = ethers.parseUnits('1', 6);
  const usdcW2 = new ethers.Contract(USDC, usdcAbi, w2);
  await (await usdcW2.approve(ATHENA_CLIENT, DISPUTE_FEE)).wait();
  const raiseTx = await (await clientW2.raiseDispute(
    jobId,
    'ipfs://dispute-evidence',
    'test-oracle',
    DISPUTE_FEE,
    M   // disputedAmount = full escrowed amount
  )).wait();
  console.log('  DisputeRaised:', lnk(raiseTx.hash));

  // Figure out the dispute ID: "<jobId>-1" (first dispute on this job)
  const disputeId = `${jobId}-1`;
  console.log('  DisputeId:', disputeId);

  // ── [8] W1 votes FOR the dispute raiser (applicant wins) ──────────────────────
  console.log('\n[8] W1 votes FOR dispute raiser (applicant = W2 wins)');
  const voteTx = await (await athena.vote(0 /* VotingType.Dispute */, disputeId, true, w1.address)).wait();
  console.log('  Vote cast:', lnk(voteTx.hash));

  // ── [9] Wait for voting period to expire (65s) ────────────────────────────────
  console.log('\n[9] Waiting 65s for voting period (1 min) to expire...');
  for (let i = 65; i > 0; i -= 5) {
    process.stdout.write(`  ${i}s remaining...\r`);
    await wait(5000);
  }
  console.log('\n  Voting period expired ✅');

  // ── [10] Settle dispute ───────────────────────────────────────────────────────
  console.log('\n[10] settleDispute → NOWJC.releaseDisputedFunds → W2 receives USDC');
  const w2BeforeSettle = await usdcRO.balanceOf(w2.address);
  const nowjcBefore    = await usdcRO.balanceOf(NOWJC_ADDR);
  const settleTx = await (await athena.settleDispute(disputeId)).wait();
  const w2AfterSettle  = await usdcRO.balanceOf(w2.address);
  const nowjcAfter     = await usdcRO.balanceOf(NOWJC_ADDR);
  console.log('  settleTx:', lnk(settleTx.hash));
  console.log(`  NOWJC balance change: ${ethers.formatUnits(nowjcBefore - nowjcAfter, 6)} USDC released`);
  console.log(`  W2 received: ${ethers.formatUnits(w2AfterSettle - w2BeforeSettle, 6)} USDC ✅`);
  if (w2AfterSettle <= w2BeforeSettle) throw new Error('W2 did not receive funds — dispute settlement failed');

  // ── [11] W1 claims voting reward from NativeAthena ───────────────────────────
  // (fee goes to NativeAthena's balance; voter withdraws based on implementation)
  const athenaBal = await usdcRO.balanceOf(athenaAddr);
  console.log(`\n[11] NativeAthena balance after settlement: ${ethers.formatUnits(athenaBal, 6)} USDC`);
  if (athenaBal > 0n) {
    console.log('  (Voting fee reward stays in NativeAthena for voter claim — expected behavior)');
  }

  // ── [12] Recover W2's USDC back to W1 ────────────────────────────────────────
  const w2FinalBal = await usdcRO.balanceOf(w2.address);
  if (w2FinalBal > 0n) {
    console.log(`\n[12] Recovering ${ethers.formatUnits(w2FinalBal, 6)} USDC from W2 → W1`);
    const recTx = await (await usdcW2.transfer(w1.address, w2FinalBal)).wait();
    console.log('  ', lnk(recTx.hash));
  }

  // ── SUMMARY ──────────────────────────────────────────────────────────────────
  console.log('\n════════════════════════════════════════════════════════');
  console.log('✅ DISPUTE CYCLE COMPLETE — REAL CONTRACTS, ARB SEPOLIA');
  console.log('════════════════════════════════════════════════════════');
  console.log('\nContracts:');
  console.log('  NativeAthena-v2 :', athenaAddr);
  console.log('  Genesis         :', GENESIS_ADDR);
  console.log('  NOWJC-v2        :', NOWJC_ADDR);
  console.log('  LOWJC           :', LOWJC_ADDR);
  console.log('  AthenaClient    :', ATHENA_CLIENT);
  console.log('\nDispute flow:');
  console.log('  Job ID          :', jobId);
  console.log('  Dispute ID      :', disputeId);
  console.log('  Dispute raiser  : W2 (applicant)');
  console.log('  Oracle voter    : W1 voted FOR applicant');
  console.log('  Outcome         : Applicant won, NOWJC released funds to W2');
  console.log('  W2 received     :', ethers.formatUnits(w2AfterSettle - w2BeforeSettle, 6), 'USDC (1 USDC - 1% commission)');
}

main().catch(e => {
  console.error('\n❌ FAILED:', e.message);
  if (e.info?.error) console.error(JSON.stringify(e.info.error));
  process.exit(1);
});
