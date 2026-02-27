// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

/**
 * @title UpgradeProfileManager
 * @notice Upgrades the NativeProfileManager proxy to a new implementation
 *         that fixes rate() — removes genesis.getJob() call that reverts
 *         because NativeProfileGenesis is profile-only and has no getJob().
 *
 * ─── FIX ────────────────────────────────────────────────────────────────────
 *  OLD: rate() calls genesis.getJob(_jobId) → always reverts on mainnet
 *  NEW: rate() trusts bridge (LOWJC) auth — bridge already validates caller
 *       is jobGiver or selectedApplicant before calling ProfileManager
 *
 * ─── USAGE ──────────────────────────────────────────────────────────────────
 *  FOUNDRY_PROFILE=minsize forge script script/UpgradeProfileManager.s.sol \
 *    --rpc-url $ARBITRUM_MAINNET_RPC_URL \
 *    --private-key $PROD_DEPLOYER_KEY \
 *    --broadcast
 *
 * ─── ENV VARS ───────────────────────────────────────────────────────────────
 *  ARBITRUM_MAINNET_RPC_URL  - Arbitrum mainnet RPC
 *  PROD_DEPLOYER_KEY         - Owner of ProfileManager proxy (0x7a2B7...)
 */

import {Script, console} from "forge-std/Script.sol";

interface IUUPSProxy {
    function upgradeToAndCall(address newImplementation, bytes calldata data) external;
    function owner() external view returns (address);
}

contract UpgradeProfileManager is Script {

    // ── Live proxy — DO NOT CHANGE ──
    address constant PM_PROXY = 0x51285003A01319c2f46BB2954384BCb69AfB1b45;

    function run() external {
        uint256 deployerKey = vm.envUint("PROD_DEPLOYER_KEY");
        address deployer    = vm.addr(deployerKey);

        console.log("Deployer      :", deployer);
        console.log("PM proxy      :", PM_PROXY);

        address proxyOwner = IUUPSProxy(PM_PROXY).owner();
        require(deployer == proxyOwner, "Not proxy owner");
        console.log("Ownership     : OK");

        vm.startBroadcast(deployerKey);

        // Deploy new implementation (src/native-profile-manager.sol — rate() fix applied)
        bytes memory bytecode = abi.encodePacked(
            vm.getCode("native-profile-manager.sol:NativeProfileManager")
        );
        address newImpl;
        assembly { newImpl := create(0, add(bytecode, 0x20), mload(bytecode)) }
        require(newImpl != address(0), "Implementation deploy failed");
        console.log("New impl      :", newImpl);

        // Upgrade proxy — no re-initialisation needed, state carries over
        IUUPSProxy(PM_PROXY).upgradeToAndCall(newImpl, "");
        console.log("Proxy upgraded: rate() no longer calls genesis.getJob()");

        vm.stopBroadcast();

        console.log("");
        console.log("=== DONE ===");
        console.log("ProfileManager upgraded. Ratings will now work correctly.");
    }
}
