/**
 * E2E test for NativeArb contracts on a forked Arb Sepolia.
 * 
 * Strategy: Fork Arb Sepolia at current block, impersonate privileged accounts
 * to fund wallets and set up permissions, then run the full job lifecycle.
 *
 * KNOWN ISSUES FOUND DURING TESTING (reported to Anas):
 * 1. NOWJC-v2 deployed bytecode = 25,668 bytes > EIP-170 limit (24,576 bytes)
 *    → CRITICAL: Cannot deploy nowjc-v2 on mainnet without size reduction
 * 2. Deployed Genesis (0x00Fad82208...) does NOT have hasProfile/setProfile functions
 *    → Profile sync to Genesis will fail after NOWJC upgrade
 *    → createProfile in NOWJC-v2 will always revert
 *    → Workaround for test: directly set hasProfile in LOWJC storage
 */

const { expect } = require("chai");
const path = require("path");
const fs = require("fs");

// ─── Addresses ────────────────────────────────────────────────────────────────
const NOWJC_PROXY       = "0x39158a9F92faB84561205B05223929eFF131455e";
const GENESIS           = "0x00Fad82208A77232510cE16CBB63c475A914C95a";
const NATIVE_ATHENA     = "0x2d9C882C450B5e992C1F5bE5f0594654ae4B4f1f";
const USDC_ARB_SEPOLIA  = "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d";
const USDC_MASTER_MINTER = "0xaec226111db55a838d7cd510b313e2b133ac5285";
const NOWJC_OWNER       = "0xfd08836eee6242092a9c869237a8d122275b024a";

const OUT = path.join(__dirname, "../../contracts/out");

function getArtifact(solFile, contractName) {
  const p = path.join(OUT, solFile, `${contractName}.json`);
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

const USDC_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function configureMinter(address minter, uint256 minterAllowedAmount) returns (bool)",
  "function mint(address _to, uint256 _amount) returns (bool)",
  "function isMinter(address) view returns (bool)",
];

// Only the functions that ARE in the deployed Genesis
const GENESIS_ABI = [
  "function getJob(string memory jobId) external view returns (tuple(string id, address jobGiver, address[] applicants, string jobDetailHash, uint8 status, string[] workSubmissions, tuple(string descriptionHash, uint256 amount)[] milestonePayments, tuple(string descriptionHash, uint256 amount)[] finalMilestones, uint256 totalPaid, uint256 currentMilestone, address selectedApplicant, uint256 selectedApplicationId) memory)",
  "function getJobApplication(string memory jobId, uint256 applicationId) external view returns (tuple(uint256 id, string jobId, address applicant, string applicationHash, tuple(string descriptionHash, uint256 amount)[] proposedMilestones) memory)",
  "function jobExists(string memory jobId) external view returns (bool)",
  "function getJobCount() external view returns (uint256)",
];

describe("NativeArb E2E Test (Arb Sepolia Fork)", function () {
  this.timeout(300000); // 5 min

  let deployer, w2;
  let lowjcProxy, athenaProxy, nowjcV2Impl;
  let lowjcContract, usdcContract, genesisContract;
  let addresses;
  let jobId;

  before(async function () {
    const hre = require("hardhat");
    const signers = await hre.ethers.getSigners();
    
    deployer = signers[0];
    w2 = signers[1];

    console.log("\n═══════════════════════════════════════════════════════");
    console.log("Setting up Arb Sepolia fork test");
    console.log("═══════════════════════════════════════════════════════");
    console.log("Deployer (W1):", deployer.address);
    console.log("Job Taker (W2):", w2.address);

    const deployerBal = await hre.ethers.provider.getBalance(deployer.address);
    console.log("Deployer ETH:", hre.ethers.formatEther(deployerBal));

    // ─── Mint USDC to deployer via masterMinter impersonation ──────────────
    console.log("\n[Setup] Minting test USDC via masterMinter impersonation...");
    
    await hre.network.provider.send("hardhat_setBalance", [
      USDC_MASTER_MINTER, 
      "0x56BC75E2D63100000"
    ]);
    
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [USDC_MASTER_MINTER],
    });
    const masterMinter = await hre.ethers.getSigner(USDC_MASTER_MINTER);
    const usdcAsMasterMinter = new hre.ethers.Contract(USDC_ARB_SEPOLIA, USDC_ABI, masterMinter);
    
    await usdcAsMasterMinter.configureMinter(deployer.address, hre.ethers.parseUnits("1000000", 6));
    await hre.network.provider.request({ method: "hardhat_stopImpersonatingAccount", params: [USDC_MASTER_MINTER] });
    
    usdcContract = new hre.ethers.Contract(USDC_ARB_SEPOLIA, USDC_ABI, deployer);
    await usdcContract.mint(deployer.address, hre.ethers.parseUnits("1000", 6));
    
    const deployerUsdc = await usdcContract.balanceOf(deployer.address);
    console.log("Deployer USDC balance:", hre.ethers.formatUnits(deployerUsdc, 6));
    expect(deployerUsdc >= hre.ethers.parseUnits("100", 6)).to.be.true;

    genesisContract = new hre.ethers.Contract(GENESIS, GENESIS_ABI, deployer);
  });

  // ════════════════════════════════════════════════════════════════════════════
  // STEP 2: DEPLOY NativeArbLOWJC + AthenaClient
  // ════════════════════════════════════════════════════════════════════════════
  it("Step 2a: Deploy NativeArbLOWJC proxy", async function () {
    const hre = require("hardhat");
    
    const lowjcArtifact = getArtifact("native-arb-lowjc.sol", "NativeArbOpenWorkJobContract");
    const proxyArtifact = getArtifact("ERC1967Proxy.sol", "ERC1967Proxy");

    console.log("\n[2a] Deploying NativeArbLOWJC implementation...");
    const LowjcImpl = new hre.ethers.ContractFactory(lowjcArtifact.abi, lowjcArtifact.bytecode.object, deployer);
    const lowjcImpl = await LowjcImpl.deploy();
    await lowjcImpl.waitForDeployment();
    console.log("  Impl:", await lowjcImpl.getAddress());

    const lowjcIface = new hre.ethers.Interface(lowjcArtifact.abi);
    const initData = lowjcIface.encodeFunctionData("initialize", [
      deployer.address,
      USDC_ARB_SEPOLIA,
      NOWJC_PROXY
    ]);

    const ProxyFactory = new hre.ethers.ContractFactory(proxyArtifact.abi, proxyArtifact.bytecode.object, deployer);
    const proxy = await ProxyFactory.deploy(await lowjcImpl.getAddress(), initData);
    await proxy.waitForDeployment();
    lowjcProxy = await proxy.getAddress();
    console.log("  Proxy:", lowjcProxy);

    lowjcContract = new hre.ethers.Contract(lowjcProxy, lowjcArtifact.abi, deployer);
    
    const owner = await lowjcContract.owner();
    expect(owner.toLowerCase()).to.equal(deployer.address.toLowerCase());
    console.log("✅ NativeArbLOWJC deployed at:", lowjcProxy);
  });

  it("Step 2b: Deploy NativeArbAthenaClient proxy", async function () {
    const hre = require("hardhat");
    
    const athenaArtifact = getArtifact("native-arb-athena-client.sol", "NativeArbAthenaClient");
    const proxyArtifact = getArtifact("ERC1967Proxy.sol", "ERC1967Proxy");

    console.log("\n[2b] Deploying NativeArbAthenaClient...");
    const AthenaImpl = new hre.ethers.ContractFactory(athenaArtifact.abi, athenaArtifact.bytecode.object, deployer);
    const athenaImpl = await AthenaImpl.deploy();
    await athenaImpl.waitForDeployment();

    const athenaIface = new hre.ethers.Interface(athenaArtifact.abi);
    const initData = athenaIface.encodeFunctionData("initialize", [
      deployer.address,
      USDC_ARB_SEPOLIA,
      NATIVE_ATHENA,
      lowjcProxy
    ]);

    const ProxyFactory = new hre.ethers.ContractFactory(proxyArtifact.abi, proxyArtifact.bytecode.object, deployer);
    const proxy = await ProxyFactory.deploy(await athenaImpl.getAddress(), initData);
    await proxy.waitForDeployment();
    athenaProxy = await proxy.getAddress();
    console.log("  AthenaClient proxy:", athenaProxy);

    await lowjcContract.setAthenaClientContract(athenaProxy);
    const stored = await lowjcContract.athenaClientContract();
    expect(stored.toLowerCase()).to.equal(athenaProxy.toLowerCase());
    console.log("✅ AthenaClient registered on LOWJC");
  });

  // ════════════════════════════════════════════════════════════════════════════
  // STEP 3: Upgrade NOWJC to v2 + register native contracts
  // ════════════════════════════════════════════════════════════════════════════
  it("Step 3: Deploy NOWJC-v2 + upgrade proxy + register native contracts", async function () {
    const hre = require("hardhat");
    
    console.log("\n[3] Upgrading NOWJC to v2...");
    console.log("⚠️  NOTE: NOWJC-v2 bytecode is 25,668 bytes (exceeds 24KB EIP-170 limit!)");
    console.log("         Using allowUnlimitedContractSize=true for testing only.");
    console.log("         THIS MUST BE FIXED BEFORE MAINNET DEPLOYMENT.");
    
    const nowjcV2Artifact = getArtifact("nowjc-v2.sol", "NativeOpenWorkJobContract");
    const Nowjcv2Factory = new hre.ethers.ContractFactory(nowjcV2Artifact.abi, nowjcV2Artifact.bytecode.object, deployer);
    const nowjcV2 = await Nowjcv2Factory.deploy();
    await nowjcV2.waitForDeployment();
    nowjcV2Impl = await nowjcV2.getAddress();
    console.log("  NOWJC-v2 impl:", nowjcV2Impl);

    const v2Iface = new hre.ethers.Interface(nowjcV2Artifact.abi);
    const upgradeCalldata = v2Iface.encodeFunctionData("batchAddAuthorizedContracts", [
      [lowjcProxy, athenaProxy]
    ]);

    await hre.network.provider.send("hardhat_setBalance", [
      NOWJC_OWNER, "0x56BC75E2D63100000"
    ]);
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [NOWJC_OWNER],
    });
    const nowjcOwner = await hre.ethers.getSigner(NOWJC_OWNER);
    
    const nowjcProxyContract = new hre.ethers.Contract(NOWJC_PROXY, [
      "function upgradeToAndCall(address newImplementation, bytes calldata data) external payable",
      "function owner() view returns (address)",
    ], nowjcOwner);

    const tx = await nowjcProxyContract.upgradeToAndCall(nowjcV2Impl, upgradeCalldata);
    const receipt = await tx.wait();
    console.log("  Upgrade tx:", receipt.hash);

    // CRITICAL: Fix commission storage collision after upgrade
    // NOWJC v1 slot 10 contains an address that v2 reads as commissionPercentage
    // This causes arithmetic overflow in calculateCommission. Must reset after upgrade.
    console.log("\n  ⚠️  CRITICAL: Fixing commission storage collision after upgrade...");
    const nowjcV2OwnerContract = new hre.ethers.Contract(NOWJC_PROXY, [
      "function setCommissionPercentage(uint256) external",
      "function setMinCommission(uint256) external",
      "function commissionPercentage() view returns (uint256)",
      "function minCommission() view returns (uint256)",
    ], nowjcOwner);
    
    const corruptedCommission = await nowjcV2OwnerContract.commissionPercentage();
    console.log("  Corrupted commissionPercentage after upgrade:", corruptedCommission.toString());
    
    await nowjcV2OwnerContract.setCommissionPercentage(100); // 1% (100 basis points)
    await nowjcV2OwnerContract.setMinCommission(0); // No min commission for testing
    
    const fixedCommission = await nowjcV2OwnerContract.commissionPercentage();
    console.log("  Fixed commissionPercentage:", fixedCommission.toString());
    console.log("  THIS IS A CRITICAL BUG: Mainnet upgrade must include setCommissionPercentage+setMinCommission calls");
    
    await hre.network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [NOWJC_OWNER],
    });

    const nowjcV2Contract = new hre.ethers.Contract(NOWJC_PROXY, [
      "function authorizedContracts(address) view returns (bool)",
    ], deployer);

    const lowjcAuth = await nowjcV2Contract.authorizedContracts(lowjcProxy);
    const athenaAuth = await nowjcV2Contract.authorizedContracts(athenaProxy);
    console.log("  LOWJC authorized:", lowjcAuth);
    console.log("  Athena authorized:", athenaAuth);
    expect(lowjcAuth).to.be.true;
    expect(athenaAuth).to.be.true;
    console.log("✅ NOWJC upgraded to v2, native contracts authorized");

    addresses = {
      network: "arb-sepolia-fork",
      chainId: 421614,
      nowjcProxy: NOWJC_PROXY,
      nowjcV2Impl,
      lowjcProxy,
      athenaProxy,
      usdc: USDC_ARB_SEPOLIA,
      genesis: GENESIS,
      nativeAthena: NATIVE_ATHENA,
      deployer: deployer.address,
      w2: w2.address,
      testedAt: new Date().toISOString()
    };
    
    const outPath = path.join(__dirname, "../../scripts/native-arb-testnet-addresses.json");
    fs.writeFileSync(outPath, JSON.stringify(addresses, null, 2));
    console.log("  Addresses saved to scripts/native-arb-testnet-addresses.json");
  });

  // ════════════════════════════════════════════════════════════════════════════
  // STEP 4: E2E Flow
  // ════════════════════════════════════════════════════════════════════════════

  it("Step 4a: Set up profiles (bypass Genesis incompatibility)", async function () {
    const hre = require("hardhat");
    
    console.log("\n[4a] Setting up user profiles...");
    console.log("⚠️  NOTE: Deployed Genesis does NOT have hasProfile/setProfile functions.");
    console.log("         createProfile() in LOWJC calls nowjc.createProfile() → genesis.hasProfile()");
    console.log("         which REVERTS. This is a compatibility issue between NOWJC-v2 and deployed Genesis.");
    console.log("         Workaround: directly set hasProfile[W1/W2] = true in LOWJC storage.");
    
    // Compute storage slots for hasProfile mapping (slot 1 in LOWJC)
    // keccak256(abi.encode(address, uint256(1)))
    const w1Slot = hre.ethers.keccak256(
      hre.ethers.AbiCoder.defaultAbiCoder().encode(['address', 'uint256'], [deployer.address, 1])
    );
    const w2Slot = hre.ethers.keccak256(
      hre.ethers.AbiCoder.defaultAbiCoder().encode(['address', 'uint256'], [w2.address, 1])
    );
    
    // Set hasProfile = true (stored as 0x01)
    const TRUE_VALUE = "0x0000000000000000000000000000000000000000000000000000000000000001";
    await hre.network.provider.send("hardhat_setStorageAt", [lowjcProxy, w1Slot, TRUE_VALUE]);
    await hre.network.provider.send("hardhat_setStorageAt", [lowjcProxy, w2Slot, TRUE_VALUE]);
    
    const w1HasProfile = await lowjcContract.hasProfile(deployer.address);
    const w2HasProfile = await lowjcContract.hasProfile(w2.address);
    
    expect(w1HasProfile).to.be.true;
    expect(w2HasProfile).to.be.true;
    
    console.log("✅ Step 4a: Profile flags set for W1 and W2 in LOWJC storage");
    console.log("  W1 hasProfile:", w1HasProfile);
    console.log("  W2 hasProfile:", w2HasProfile);
    console.log("  [ISSUE] Genesis profile sync broken — needs Genesis upgrade to add setProfile()");
  });

  it("Step 4b: W1 posts job with 0.01 USDC milestone", async function () {
    const hre = require("hardhat");
    
    const MILESTONE_AMOUNT = hre.ethers.parseUnits("0.01", 6); // 10000 μUSDC
    
    console.log("\n[4b] Posting job...");

    // Get current counter to predict jobId
    const counterBefore = await lowjcContract.jobCounter();
    const expectedJobId = `421614-${(Number(counterBefore) + 1)}`;
    console.log("  Expected job ID:", expectedJobId);

    const tx = await lowjcContract.postJob(
      "ipfs://job-detail-hash-test",
      ["Milestone 1 - Complete the work"],
      [MILESTONE_AMOUNT]
    );
    const receipt = await tx.wait();
    
    jobId = expectedJobId;
    console.log("  Job ID:", jobId);
    
    expect(jobId).to.match(/^421614-\d+$/);

    // Verify in Genesis
    const genesisJob = await genesisContract.getJob(jobId);
    expect(Number(genesisJob.status)).to.equal(0); // Open
    expect(genesisJob.jobGiver.toLowerCase()).to.equal(deployer.address.toLowerCase());
    
    console.log("✅ Step 4b PASS: Job posted, ID =", jobId);
    console.log("  Job ID format: 421614-N ✅");
    console.log("  Genesis status = Open (0) ✅");
    console.log("  Genesis jobGiver =", genesisJob.jobGiver, "✅");
  });

  it("Step 4c: W2 applies to job", async function () {
    const hre = require("hardhat");
    
    console.log("\n[4c] W2 applying to job", jobId, "...");
    
    const MILESTONE_AMOUNT = hre.ethers.parseUnits("0.01", 6);
    const lowjcAsW2 = lowjcContract.connect(w2);
    
    const tx = await lowjcAsW2.applyToJob(
      jobId,
      "ipfs://application-hash-test",
      ["Milestone 1 - My proposal"],
      [MILESTONE_AMOUNT],
      3 // preferredChainDomain = 3 (Arbitrum) → direct USDC transfer
    );
    await tx.wait();

    // Verify in Genesis
    const app = await genesisContract.getJobApplication(jobId, 1);
    expect(app.applicant.toLowerCase()).to.equal(w2.address.toLowerCase());
    
    console.log("✅ Step 4c PASS: Application registered in Genesis");
    console.log("  Applicant:", app.applicant);
    console.log("  Application ID:", app.id.toString());
  });

  it("Step 4d: W1 starts job — USDC moves from W1 to NOWJC", async function () {
    const hre = require("hardhat");
    
    const MILESTONE_AMOUNT = hre.ethers.parseUnits("0.01", 6);
    
    console.log("\n[4d] Starting job...");
    
    // W1 approves LOWJC to spend USDC (LOWJC does safeTransferFrom(W1 → NOWJC))
    await usdcContract.approve(lowjcProxy, MILESTONE_AMOUNT);
    
    const w1BalBefore = await usdcContract.balanceOf(deployer.address);
    const nowjcBalBefore = await usdcContract.balanceOf(NOWJC_PROXY);
    console.log("  W1 USDC before:", hre.ethers.formatUnits(w1BalBefore, 6));
    console.log("  NOWJC USDC before:", hre.ethers.formatUnits(nowjcBalBefore, 6));
    
    const tx = await lowjcContract.startJob(jobId, 1, false);
    await tx.wait();
    
    const w1BalAfter = await usdcContract.balanceOf(deployer.address);
    const nowjcBalAfter = await usdcContract.balanceOf(NOWJC_PROXY);
    console.log("  W1 USDC after:", hre.ethers.formatUnits(w1BalAfter, 6));
    console.log("  NOWJC USDC after:", hre.ethers.formatUnits(nowjcBalAfter, 6));
    
    // Verify USDC moved W1 → NOWJC
    expect((w1BalBefore - w1BalAfter) === MILESTONE_AMOUNT).to.be.true;
    expect((nowjcBalAfter - nowjcBalBefore) === MILESTONE_AMOUNT).to.be.true;
    
    // Genesis status = InProgress
    const genesisJob = await genesisContract.getJob(jobId);
    expect(Number(genesisJob.status)).to.equal(1); // InProgress
    expect(genesisJob.selectedApplicant.toLowerCase()).to.equal(w2.address.toLowerCase());
    
    console.log("✅ Step 4d PASS: USDC moved W1 → NOWJC");
    console.log("  W1 spent:", hre.ethers.formatUnits(w1BalBefore - w1BalAfter, 6), "USDC ✅");
    console.log("  NOWJC received:", hre.ethers.formatUnits(nowjcBalAfter - nowjcBalBefore, 6), "USDC ✅");
    console.log("  Genesis status = InProgress (1) ✅");
    console.log("  Genesis selectedApplicant = W2 ✅");
  });

  it("Step 4e: W2 submits work", async function () {
    const hre = require("hardhat");
    
    console.log("\n[4e] W2 submitting work...");
    
    const lowjcAsW2 = lowjcContract.connect(w2);
    const tx = await lowjcAsW2.submitWork(jobId, "ipfs://work-submission-hash");
    await tx.wait();
    
    // Verify in Genesis
    const genesisJob = await genesisContract.getJob(jobId);
    expect(genesisJob.workSubmissions.length >= 1).to.be.true;
    
    console.log("✅ Step 4e PASS: Work submitted");
    console.log("  Genesis workSubmissions:", genesisJob.workSubmissions.length, "✅");
  });

  it("Step 4f: W1 releases payment — USDC moves from NOWJC to W2", async function () {
    const hre = require("hardhat");
    
    const MILESTONE_AMOUNT = hre.ethers.parseUnits("0.01", 6);
    
    console.log("\n[4f] W1 releasing payment...");
    
    const w2BalBefore = await usdcContract.balanceOf(w2.address);
    const nowjcBalBefore = await usdcContract.balanceOf(NOWJC_PROXY);
    console.log("  W2 USDC before:", hre.ethers.formatUnits(w2BalBefore, 6));
    console.log("  NOWJC USDC before:", hre.ethers.formatUnits(nowjcBalBefore, 6));
    
    const tx = await lowjcContract.releasePayment(jobId);
    await tx.wait();
    
    const w2BalAfter = await usdcContract.balanceOf(w2.address);
    const nowjcBalAfter = await usdcContract.balanceOf(NOWJC_PROXY);
    console.log("  W2 USDC after:", hre.ethers.formatUnits(w2BalAfter, 6));
    console.log("  NOWJC USDC after:", hre.ethers.formatUnits(nowjcBalAfter, 6));
    
    const received = w2BalAfter - w2BalBefore;
    const commission = MILESTONE_AMOUNT - received;
    
    // W2 received payment (net of commission)
    expect(w2BalAfter > w2BalBefore).to.be.true;
    // NOWJC paid out
    expect(nowjcBalAfter < nowjcBalBefore).to.be.true;
    
    // Genesis status = Completed (single milestone done)
    const genesisJob = await genesisContract.getJob(jobId);
    console.log("  Genesis status:", Number(genesisJob.status), "(expected 2 = Completed)");
    expect(Number(genesisJob.status)).to.equal(2); // Completed
    
    console.log("✅ Step 4f PASS: W2 received USDC, job Completed");
    console.log("  W2 received:", hre.ethers.formatUnits(received, 6), "USDC (net of commission) ✅");
    console.log("  Commission deducted:", hre.ethers.formatUnits(commission, 6), "USDC");
    console.log("  Genesis status = Completed (2) ✅");

    console.log("\n════════════════════════════════════════════════════════");
    console.log("ALL E2E STEPS PASSED ✅");
    console.log("════════════════════════════════════════════════════════");
    console.log("  Job ID:", jobId, "(format 421614-N ✅)");
    console.log("  USDC flow: W1 → NOWJC (startJob) → W2 (releasePayment) ✅");
    console.log("  No LayerZero fee required ✅");
    console.log("  No CCTP bridging required ✅");
    console.log("  Genesis updated correctly at each step ✅");
    console.log("  NOWJC v2 upgrade successful ✅");
    console.log("  batchAddAuthorizedContracts works ✅");
    
    console.log("\n────────────────────────────────────────────────────────");
    console.log("CRITICAL ISSUES TO FIX BEFORE MAINNET:");
    console.log("1. NOWJC-v2 bytecode = 25,668 bytes > 24,576 limit");
    console.log("   → Must reduce contract size before mainnet deployment");
    console.log("2. Deployed Genesis missing hasProfile/setProfile functions");
    console.log("   → createProfile via LOWJC will fail after NOWJC upgrade");
    console.log("   → Genesis needs upgrade to add profile functions");
    console.log("3. Job status in LOWJC local state not updated after releasePayment");
    console.log("   (only Genesis reflects Completed; LOWJC.job.status stays InProgress)");
    console.log("   → Minor UX issue, not a blocker");
    console.log("────────────────────────────────────────────────────────");
  });
});
