/**
 * deploy-testnet-proper.cjs
 *
 * Deploys NativeArbLOWJC + NativeArbAthenaClient on Arb Sepolia
 * pointing to the REAL deployed testnet contracts (no mocks).
 *
 * Real testnet contracts:
 *   NOWJC    : 0x39158a9F92faB84561205B05223929eFF131455e
 *   NativeAthena: 0x2d9C882C450B5e992C1F5bE5f0594654ae4B4f1f
 *   Genesis  : 0x00Fad82208A77232510cE16CBB63c475A914C95a
 *   USDC     : 0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d
 *
 * After deploying, Anas must call on NOWJC:
 *   addAuthorizedContract(<lowjcProxy>)
 * Then run: node scripts/e2e-proper.cjs
 */

const { ethers }    = require('../backend/node_modules/ethers');
const fs            = require('fs');
const path          = require('path');
const { execSync }  = require('child_process');

const ARB_SEPOLIA_RPC = 'https://arb-sepolia.g.alchemy.com/v2/ECvjGU_6M0Jrw6wlFkPo2ZbonbfW5oIZ';
const USDC            = '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d';
const NOWJC           = '0x39158a9F92faB84561205B05223929eFF131455e';
const NATIVE_ATHENA   = '0x2d9C882C450B5e992C1F5bE5f0594654ae4B4f1f';
const ARBISCAN        = 'https://sepolia.arbiscan.io/tx/';
const OUT             = path.join(__dirname, '../contracts/out');

function getArtifact(sol, name) {
  const a = JSON.parse(fs.readFileSync(path.join(OUT, sol, `${name}.json`), 'utf8'));
  return { abi: a.abi, bytecode: a.bytecode.object };
}

async function deployProxy(wallet, artifact, initArgs, label) {
  const proxy = getArtifact('ERC1967Proxy.sol', 'ERC1967Proxy');
  console.log(`\n  Deploying ${label} impl...`);
  const Impl = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const impl = await Impl.deploy();
  const ir = await impl.deploymentTransaction().wait();
  console.log(`  impl: ${await impl.getAddress()}  ${ARBISCAN}${ir.hash}`);

  const initData = new ethers.Interface(artifact.abi).encodeFunctionData('initialize', initArgs);
  const Proxy = new ethers.ContractFactory(proxy.abi, proxy.bytecode, wallet);
  const p = await Proxy.deploy(await impl.getAddress(), initData);
  const pr = await p.deploymentTransaction().wait();
  const addr = await p.getAddress();
  console.log(`  ✅ ${label} proxy: ${addr}  ${ARBISCAN}${pr.hash}`);
  return addr;
}

async function main() {
  let key = process.env.BRIDGE_KEY;
  if (!key) {
    const r = execSync(`gcloud run services describe openwork --region=us-central1 --format=json --project=openwork-480320`,
      { env: { ...process.env, PATH: `/home/linuxbrew/.linuxbrew/opt/google-cloud-sdk/bin:${process.env.PATH}` } });
    const envs = JSON.parse(r.toString()).spec.template.spec.containers[0].env || [];
    key = envs.find(e => e.name === 'WALL2_PRIVATE_KEY')?.value;
  }
  if (!key) throw new Error('No key');

  const provider = new ethers.JsonRpcProvider(ARB_SEPOLIA_RPC);
  const wallet = new ethers.Wallet(key, provider);
  console.log('Deployer:', wallet.address);
  console.log('ETH    :', ethers.formatEther(await provider.getBalance(wallet.address)));

  // Deploy NativeArbLOWJC pointing to REAL NOWJC
  const lowjcArtifact = getArtifact('native-arb-lowjc.sol', 'NativeArbOpenWorkJobContract');
  const lowjcProxy = await deployProxy(wallet, lowjcArtifact,
    [wallet.address, USDC, NOWJC], 'NativeArbLOWJC');

  // Deploy NativeArbAthenaClient pointing to REAL NativeAthena
  const athenaArtifact = getArtifact('native-arb-athena-client.sol', 'NativeArbAthenaClient');
  const athenaProxy = await deployProxy(wallet, athenaArtifact,
    [wallet.address, USDC, NATIVE_ATHENA, lowjcProxy], 'NativeArbAthenaClient');

  // Register Athena on LOWJC
  const lowjc = new ethers.Contract(lowjcProxy, lowjcArtifact.abi, wallet);
  const tx = await (await lowjc.setAthenaClientContract(athenaProxy)).wait();
  console.log(`\n  ✅ AthenaClient registered: ${ARBISCAN}${tx.hash}`);

  console.log('\n════════════════════════════════════════════════════════');
  console.log('DEPLOYED — waiting for Anas authorization');
  console.log('════════════════════════════════════════════════════════');
  console.log('NativeArbLOWJC  :', lowjcProxy);
  console.log('NativeArbAthena :', athenaProxy);
  console.log('\n⚡ ANAS: Run this ONE tx on NOWJC (0x39158a9F92faB84561205B05223929eFF131455e):');
  console.log(`   addAuthorizedContract("${lowjcProxy}")`);
  console.log('\nThen run: node scripts/e2e-proper.cjs');

  fs.writeFileSync(path.join(__dirname, 'testnet-proper-addresses.json'),
    JSON.stringify({ lowjcProxy, athenaProxy, nowjc: NOWJC, usdc: USDC, deployedAt: new Date().toISOString() }, null, 2));
}

main().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
