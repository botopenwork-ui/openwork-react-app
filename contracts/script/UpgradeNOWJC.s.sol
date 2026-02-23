// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

/**
 * @title UpgradeNOWJC
 * @notice Upgrades the NOWJC proxy to nowjc-v2 AND registers native Arb contracts —
 *         all in a single transaction for the proxy owner (Anas).
 *
 * ─── HOW IT WORKS ────────────────────────────────────────────────────────────
 *  Pre-condition: Agent has already deployed NativeArbLOWJC + NativeArbAthenaClient
 *                 using the service wallet. Those addresses are passed via env vars.
 *
 *  What this script does (1 tx):
 *    1. Deploy nowjc-v2 implementation
 *    2. upgradeToAndCall(newImpl, batchAddAuthorizedContracts([lowjc, athena]))
 *       → upgrades proxy + registers both contracts atomically
 *
 * ─── USAGE ───────────────────────────────────────────────────────────────────
 *   forge script script/UpgradeNOWJC.s.sol \
 *     --rpc-url $ARBITRUM_RPC \
 *     --private-key $DEPLOYER_PRIVATE_KEY \
 *     --broadcast \
 *     --verify \
 *     --etherscan-api-key $ARBISCAN_API_KEY
 *
 * ─── ENV VARS ────────────────────────────────────────────────────────────────
 *   ARBITRUM_RPC                 - Arbitrum mainnet RPC URL
 *   DEPLOYER_PRIVATE_KEY         - Owner of the NOWJC proxy (without 0x)
 *   NATIVE_ARB_LOWJC_ADDRESS     - Pre-deployed NativeArbLOWJC address
 *   NATIVE_ARB_ATHENA_ADDRESS    - Pre-deployed NativeArbAthenaClient address
 *   ARBISCAN_API_KEY             - For contract verification (optional)
 */

import {Script, console} from "forge-std/Script.sol";

interface IUUPSProxy {
    function upgradeToAndCall(address newImplementation, bytes calldata data) external;
    function owner() external view returns (address);
}

contract UpgradeNOWJC is Script {

    // ── Deployed proxy (DO NOT CHANGE — this is the live contract) ──
    address constant NOWJC_PROXY = 0x8EfbF240240613803B9c9e716d4b5AD1388aFd99;

    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        address nativeLOWJC  = vm.envAddress("NATIVE_ARB_LOWJC_ADDRESS");
        address nativeAthena = vm.envAddress("NATIVE_ARB_ATHENA_ADDRESS");

        console.log("Deployer              :", deployer);
        console.log("NOWJC proxy           :", NOWJC_PROXY);
        console.log("NativeArbLOWJC        :", nativeLOWJC);
        console.log("NativeArbAthenaClient :", nativeAthena);

        require(nativeLOWJC  != address(0), "Set NATIVE_ARB_LOWJC_ADDRESS");
        require(nativeAthena != address(0), "Set NATIVE_ARB_ATHENA_ADDRESS");

        // Sanity check — deployer must be owner
        address proxyOwner = IUUPSProxy(NOWJC_PROXY).owner();
        require(deployer == proxyOwner, "Deployer is not proxy owner");
        console.log("Proxy owner check     : OK");

        vm.startBroadcast(deployerKey);

        // 1. Deploy new implementation (nowjc-v2)
        bytes memory implBytecode = abi.encodePacked(
            vm.getCode("nowjc-v2.sol:NativeOpenWorkJobContract")
        );
        address newImpl;
        assembly {
            newImpl := create(0, add(implBytecode, 0x20), mload(implBytecode))
        }
        require(newImpl != address(0), "Implementation deploy failed");
        console.log("New implementation    :", newImpl);

        // 2. Encode batchAddAuthorizedContracts([nativeLOWJC, nativeAthena])
        //    This is called on the upgraded proxy immediately after the upgrade,
        //    so both contracts are registered in the SAME transaction.
        address[] memory toAuthorize = new address[](2);
        toAuthorize[0] = nativeLOWJC;
        toAuthorize[1] = nativeAthena;
        bytes memory initData = abi.encodeWithSignature(
            "batchAddAuthorizedContracts(address[])",
            toAuthorize
        );

        // 3. Upgrade proxy + register contracts atomically (1 tx)
        IUUPSProxy(NOWJC_PROXY).upgradeToAndCall(newImpl, initData);
        console.log("Proxy upgraded to v2 + both contracts authorized in 1 tx");

        vm.stopBroadcast();

        console.log("=== DONE ===");
        console.log("NOWJC v2 is live. Native Arb flow is ready.");
        console.log("Agent: set VITE_NATIVE_ARB_LOWJC_ADDRESS + VITE_NATIVE_ARB_ATHENA_ADDRESS in Cloud Run and redeploy frontend.");
    }
}
