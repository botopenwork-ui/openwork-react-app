// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

/**
 * @title UpgradeNOWJC
 * @notice Upgrades the NOWJC proxy to native-openwork-job-contract-v2 AND
 *         registers NativeArbLOWJC + NativeArbAthenaClient as authorized contracts.
 *
 * ─── WHAT THIS DOES ─────────────────────────────────────────────────────────
 *  1. Deploy native-openwork-job-contract-v2 implementation
 *  2. upgradeToAndCall(newImpl, "") — upgrade proxy, no init needed
 *  3. setAdmin(deployer, true)      — grant deployer admin rights on v2
 *  4. addAuthorizedContract(LOWJC)
 *  5. addAuthorizedContract(AthenaClient)
 *
 * ─── USAGE ──────────────────────────────────────────────────────────────────
 *  From the contracts/ directory:
 *
 *  FOUNDRY_PROFILE=minsize forge script script/UpgradeNOWJC.s.sol \
 *    --rpc-url $ARBITRUM_MAINNET_RPC_URL \
 *    --private-key $PROD_DEPLOYER_KEY \
 *    --broadcast \
 *    --verify \
 *    --etherscan-api-key $ARBISCAN_API_KEY
 *
 * ─── ENV VARS ───────────────────────────────────────────────────────────────
 *  ARBITRUM_MAINNET_RPC_URL       - Arbitrum mainnet RPC
 *  PROD_DEPLOYER_KEY              - Owner of NOWJC proxy (without 0x)
 *  NATIVE_ARB_LOWJC_ADDRESS       - 0xEE57ee10cCAB26f5642d4EbDC15B3881Bb0B5587
 *  NATIVE_ARB_ATHENA_ADDRESS      - 0xEC9446A163E74D2fBF3def75324895204415166D
 *  ARBISCAN_API_KEY               - Optional, for verification
 */

import {Script, console} from "forge-std/Script.sol";

interface IUUPSProxy {
    function upgradeToAndCall(address newImplementation, bytes calldata data) external;
    function owner() external view returns (address);
}

interface INOWJCAdmin {
    function setAdmin(address _admin, bool _status) external;
    function addAuthorizedContract(address contractAddress) external;
}

contract UpgradeNOWJC is Script {

    // ── Live proxy — DO NOT CHANGE ──
    address constant NOWJC_PROXY = 0x8EfbF240240613803B9c9e716d4b5AD1388aFd99;

    function run() external {
        uint256 deployerKey   = vm.envUint("PROD_DEPLOYER_KEY");
        address deployer      = vm.addr(deployerKey);
        address nativeLOWJC   = vm.envAddress("NATIVE_ARB_LOWJC_ADDRESS");
        address nativeAthena  = vm.envAddress("NATIVE_ARB_ATHENA_ADDRESS");

        console.log("Deployer              :", deployer);
        console.log("NOWJC proxy           :", NOWJC_PROXY);
        console.log("NativeArbLOWJC        :", nativeLOWJC);
        console.log("NativeArbAthenaClient :", nativeAthena);

        require(nativeLOWJC  != address(0), "Set NATIVE_ARB_LOWJC_ADDRESS");
        require(nativeAthena != address(0), "Set NATIVE_ARB_ATHENA_ADDRESS");

        // Deployer must be proxy owner
        address proxyOwner = IUUPSProxy(NOWJC_PROXY).owner();
        require(deployer == proxyOwner, "Not proxy owner");
        console.log("Proxy owner check     : OK");

        vm.startBroadcast(deployerKey);

        // 1. Deploy new implementation
        bytes memory bytecode = abi.encodePacked(
            vm.getCode("native-openwork-job-contract-v2.sol:NativeOpenWorkJobContract")
        );
        address newImpl;
        assembly { newImpl := create(0, add(bytecode, 0x20), mload(bytecode)) }
        require(newImpl != address(0), "Impl deploy failed");
        console.log("New implementation    :", newImpl);

        // 2. Upgrade proxy (no init calldata needed — state carries over)
        IUUPSProxy(NOWJC_PROXY).upgradeToAndCall(newImpl, "");
        console.log("Proxy upgraded to v2");

        // 3. Grant deployer admin on the upgraded proxy so we can call addAuthorizedContract
        INOWJCAdmin(NOWJC_PROXY).setAdmin(deployer, true);
        console.log("Admin granted to deployer");

        // 4. Register NativeArbLOWJC
        INOWJCAdmin(NOWJC_PROXY).addAuthorizedContract(nativeLOWJC);
        console.log("NativeArbLOWJC authorized");

        // 5. Register NativeArbAthenaClient
        INOWJCAdmin(NOWJC_PROXY).addAuthorizedContract(nativeAthena);
        console.log("NativeArbAthenaClient authorized");

        vm.stopBroadcast();

        console.log("");
        console.log("=== DONE ===");
        console.log("NOWJC upgraded to v2. Both native Arb contracts authorized.");
        console.log("Agent next: set VITE_NATIVE_ARB_LOWJC_ADDRESS +");
        console.log("            VITE_NATIVE_ARB_ATHENA_ADDRESS in Cloud Run and redeploy.");
    }
}
