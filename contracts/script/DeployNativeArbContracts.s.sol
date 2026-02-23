// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

/**
 * @title DeployNativeArbContracts
 * @notice Deploys NativeArbOpenWorkJobContract and NativeArbAthenaClient on Arbitrum,
 *         then registers them as authorized contracts on NOWJC (v2).
 *
 * Run AFTER UpgradeNOWJC.s.sol has been executed.
 *
 * Usage:
 *   forge script script/DeployNativeArbContracts.s.sol \
 *     --rpc-url $ARBITRUM_RPC \
 *     --private-key $DEPLOYER_PRIVATE_KEY \
 *     --broadcast \
 *     --verify \
 *     --etherscan-api-key $ARBISCAN_API_KEY
 *
 * Env vars required:
 *   ARBITRUM_RPC            - Arbitrum mainnet RPC URL
 *   DEPLOYER_PRIVATE_KEY    - Deployer (must also be owner of NOWJC proxy)
 *   ARBISCAN_API_KEY        - For contract verification (optional)
 */

import {Script, console} from "forge-std/Script.sol";

interface INowjcV2Auth {
    function addAuthorizedContract(address contractAddress) external;
    function owner() external view returns (address);
}

interface IProxy {
    function initialize(bytes calldata data) external;
}

contract DeployNativeArbContracts is Script {

    // ── Existing deployed contracts (DO NOT CHANGE) ──
    address constant NOWJC_PROXY       = 0x8EfbF240240613803B9c9e716d4b5AD1388aFd99;
    address constant NATIVE_ATHENA     = 0xE6B9d996b56162cD7eDec3a83aE72943ee7C46Bf;
    address constant USDC_ARB_MAINNET  = 0xaf88d065e77c8cC2239327C5EDb3A432268e5831;

    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer    = vm.addr(deployerKey);

        console.log("Deployer:", deployer);

        vm.startBroadcast(deployerKey);

        // ── 1. Deploy NativeArbOpenWorkJobContract (UUPS proxy pattern) ──

        // Deploy implementation
        bytes memory lowjcImplCode = abi.encodePacked(
            vm.getCode("native-arb-lowjc.sol:NativeArbOpenWorkJobContract")
        );
        address lowjcImpl;
        assembly { lowjcImpl := create(0, add(lowjcImplCode, 0x20), mload(lowjcImplCode)) }
        require(lowjcImpl != address(0), "NativeArbLOWJC impl deploy failed");
        console.log("NativeArbLOWJC impl:", lowjcImpl);

        // Deploy ERC1967 proxy
        bytes memory lowjcInitData = abi.encodeWithSignature(
            "initialize(address,address,address)",
            deployer,       // owner
            USDC_ARB_MAINNET,
            NOWJC_PROXY
        );
        address lowjcProxy = deployProxy(lowjcImpl, lowjcInitData);
        console.log("NativeArbLOWJC proxy:", lowjcProxy);

        // ── 2. Deploy NativeArbAthenaClient (UUPS proxy pattern) ──

        bytes memory athenaImplCode = abi.encodePacked(
            vm.getCode("native-arb-athena-client.sol:NativeArbAthenaClient")
        );
        address athenaImpl;
        assembly { athenaImpl := create(0, add(athenaImplCode, 0x20), mload(athenaImplCode)) }
        require(athenaImpl != address(0), "NativeArbAthena impl deploy failed");
        console.log("NativeArbAthena impl:", athenaImpl);

        bytes memory athenaInitData = abi.encodeWithSignature(
            "initialize(address,address,address,address)",
            deployer,         // owner
            USDC_ARB_MAINNET,
            NATIVE_ATHENA,    // NativeAthena on Arb
            lowjcProxy        // NativeArbLOWJC (job contract for dispute checks)
        );
        address athenaProxy = deployProxy(athenaImpl, athenaInitData);
        console.log("NativeArbAthena proxy:", athenaProxy);

        // ── 3. Register both as authorized on NOWJC-v2 ──
        INowjcV2Auth nowjc = INowjcV2Auth(NOWJC_PROXY);
        nowjc.addAuthorizedContract(lowjcProxy);
        console.log("Registered NativeArbLOWJC on NOWJC");

        nowjc.addAuthorizedContract(athenaProxy);
        console.log("Registered NativeArbAthena on NOWJC");

        // ── 4. Also register NativeArbAthena on the LOWJC ──
        // So it can call resolveDispute
        (bool ok,) = lowjcProxy.call(
            abi.encodeWithSignature("setAthenaClientContract(address)", athenaProxy)
        );
        require(ok, "setAthenaClientContract failed");
        console.log("AthenaClient set on NativeArbLOWJC");

        vm.stopBroadcast();

        console.log("\n=== DEPLOYMENT COMPLETE ===");
        console.log("NativeArbLOWJC  :", lowjcProxy);
        console.log("NativeArbAthena :", athenaProxy);
        console.log("\n=== FRONTEND CONFIG ===");
        console.log("Update chainConfig.js chain 42161:");
        console.log("  lowjc        :", lowjcProxy);
        console.log("  athenaClient :", athenaProxy);
        console.log("  allowed      : true");
        console.log("  type         : LOCAL_NATIVE");
    }

    /// @dev Deploy an ERC1967 transparent proxy pointing to `impl` with `initData`
    function deployProxy(address impl, bytes memory initData) internal returns (address proxy) {
        // ERC1967Proxy constructor: (address logic, bytes memory data)
        bytes memory proxyCode = abi.encodePacked(
            vm.getCode("lib/openzeppelin-contracts/contracts/proxy/ERC1967/ERC1967Proxy.sol:ERC1967Proxy"),
            abi.encode(impl, initData)
        );
        assembly { proxy := create(0, add(proxyCode, 0x20), mload(proxyCode)) }
        require(proxy != address(0), "Proxy deploy failed");
    }
}
