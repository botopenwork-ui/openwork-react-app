/**
 * deploy-native-arb.js
 * 
 * Deploys NativeArbOpenWorkJobContract + NativeArbAthenaClient on Arbitrum mainnet.
 * 
 * Usage:
 *   cd /data/.openclaw/workspace/openwork
 *   BRIDGE_KEY=<private_key> node scripts/deploy-native-arb.js
 * 
 * The service wallet private key is fetched from Cloud Run env vars automatically
 * if BRIDGE_KEY is not set.
 */

const { ethers } = require('./backend/node_modules/ethers');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ─── Config ───────────────────────────────────────────────────────────────────
const ARB_RPC = 'https://arb-mainnet.g.alchemy.com/v2/ECvjGU_6M0Jrw6wlFkPo2ZbonbfW5oIZ';
const NOWJC_PROXY       = '0x8EfbF240240613803B9c9e716d4b5AD1388aFd99';
const NATIVE_ATHENA     = '0xE6B9d996b56162cD7eDec3a83aE72943ee7C46Bf';
const USDC_ARB          = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';

// ─── Load artifacts ───────────────────────────────────────────────────────────
const CONTRACTS_OUT = path.join(__dirname, '../contracts/out');

function getBytecode(file, contractName) {
  const p = path.join(CONTRACTS_OUT, file, `${contractName}.json`);
  const artifact = JSON.parse(fs.readFileSync(p, 'utf8'));
  return artifact.bytecode.object; // hex with 0x prefix
}

function getABI(file, contractName) {
  const p = path.join(CONTRACTS_OUT, file, `${contractName}.json`);
  const artifact = JSON.parse(fs.readFileSync(p, 'utf8'));
  return artifact.abi;
}

// ─── Deploy helper ────────────────────────────────────────────────────────────
async function deployProxy(wallet, implBytecode, implABI, initCalldata) {
  const provider = wallet.provider;

  // 1. Deploy implementation
  console.log('  Deploying implementation...');
  const implFactory = new ethers.ContractFactory(implABI, implBytecode, wallet);
  const impl = await implFactory.deploy();
  await impl.waitForDeployment();
  const implAddr = await impl.getAddress();
  console.log('  Impl:', implAddr);

  // 2. Deploy ERC1967Proxy(impl, initCalldata)
  console.log('  Deploying proxy...');
  const proxyBytecode = getBytecode('ERC1967Proxy.sol', 'ERC1967Proxy');
  const proxyABI = getABI('ERC1967Proxy.sol', 'ERC1967Proxy');
  const proxyFactory = new ethers.ContractFactory(proxyABI, proxyBytecode, wallet);
  const proxy = await proxyFactory.deploy(implAddr, initCalldata);
  await proxy.waitForDeployment();
  const proxyAddr = await proxy.getAddress();
  console.log('  Proxy:', proxyAddr);

  return proxyAddr;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  // Get private key
  let privateKey = process.env.BRIDGE_KEY;
  if (!privateKey) {
    console.log('Fetching key from Cloud Run...');
    try {
      const result = execSync(
        `gcloud run services describe openwork --region=us-central1 --format=json --project=openwork-480320`,
        { env: { ...process.env, PATH: `/home/linuxbrew/.linuxbrew/opt/google-cloud-sdk/bin:${process.env.PATH}` } }
      );
      const svc = JSON.parse(result.toString());
      const envs = svc.spec.template.spec.containers[0].env || [];
      const keyEnv = envs.find(e => e.name === 'WALL2_PRIVATE_KEY');
      if (keyEnv) privateKey = keyEnv.value;
    } catch(e) {
      console.error('Failed to fetch from Cloud Run:', e.message);
    }
  }
  if (!privateKey) throw new Error('No private key available. Set BRIDGE_KEY env var.');

  const provider = new ethers.JsonRpcProvider(ARB_RPC);
  const wallet = new ethers.Wallet(privateKey, provider);
  const deployer = wallet.address;

  const balance = await provider.getBalance(deployer);
  console.log(`Deployer: ${deployer}`);
  console.log(`Balance:  ${ethers.formatEther(balance)} ETH`);
  if (balance < ethers.parseEther('0.001')) {
    throw new Error(`Insufficient ETH for deployment. Need at least 0.001 ETH on ARB.`);
  }

  // ─── 1. Deploy NativeArbOpenWorkJobContract ────────────────────────────────
  console.log('\n[1/3] Deploying NativeArbOpenWorkJobContract...');
  const lowjcBytecode = getBytecode('native-arb-lowjc.sol', 'NativeArbOpenWorkJobContract');
  const lowjcABI = getABI('native-arb-lowjc.sol', 'NativeArbOpenWorkJobContract');
  const lowjcInitData = new ethers.Interface(lowjcABI).encodeFunctionData('initialize', [
    deployer,        // owner
    USDC_ARB,
    NOWJC_PROXY
  ]);
  const lowjcProxy = await deployProxy(wallet, lowjcBytecode, lowjcABI, lowjcInitData);
  console.log('✅ NativeArbLOWJC proxy:', lowjcProxy);

  // ─── 2. Deploy NativeArbAthenaClient ──────────────────────────────────────
  console.log('\n[2/3] Deploying NativeArbAthenaClient...');
  const athenaBytecode = getBytecode('native-arb-athena-client.sol', 'NativeArbAthenaClient');
  const athenaABI = getABI('native-arb-athena-client.sol', 'NativeArbAthenaClient');
  const athenaInitData = new ethers.Interface(athenaABI).encodeFunctionData('initialize', [
    deployer,        // owner
    USDC_ARB,
    NATIVE_ATHENA,
    lowjcProxy       // job contract for dispute checks
  ]);
  const athenaProxy = await deployProxy(wallet, athenaBytecode, athenaABI, athenaInitData);
  console.log('✅ NativeArbAthenaClient proxy:', athenaProxy);

  // ─── 3. Register AthenaClient on LOWJC ────────────────────────────────────
  console.log('\n[3/3] Registering AthenaClient on NativeArbLOWJC...');
  const lowjcContract = new ethers.Contract(lowjcProxy, lowjcABI, wallet);
  const tx = await lowjcContract.setAthenaClientContract(athenaProxy);
  await tx.wait();
  console.log('✅ AthenaClient registered on LOWJC');

  // ─── Summary ──────────────────────────────────────────────────────────────
  console.log('\n════════════════════════════════════════════════════════');
  console.log('DEPLOYMENT COMPLETE');
  console.log('════════════════════════════════════════════════════════');
  console.log(`NativeArbLOWJC  : ${lowjcProxy}`);
  console.log(`NativeArbAthena : ${athenaProxy}`);
  console.log('');
  console.log('NEXT: Tell Anas to run UpgradeNOWJC.s.sol with:');
  console.log(`  NATIVE_ARB_LOWJC_ADDRESS=${lowjcProxy}`);
  console.log(`  NATIVE_ARB_ATHENA_ADDRESS=${athenaProxy}`);
  console.log('');
  console.log('After Anas upgrades: run set-cloud-run-env.sh to enable native Arb frontend');

  // Write addresses to file for reference
  const output = { lowjcProxy, athenaProxy, deployedAt: new Date().toISOString(), deployer };
  fs.writeFileSync(path.join(__dirname, 'native-arb-addresses.json'), JSON.stringify(output, null, 2));
  console.log('\nAddresses saved to scripts/native-arb-addresses.json');
}

main().catch(e => { console.error('DEPLOY FAILED:', e.message); process.exit(1); });
