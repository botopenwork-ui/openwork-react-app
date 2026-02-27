// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

/**
 * @title UpgradeLOWJC
 * @notice Upgrades the NativeArbLOWJC proxy to a new implementation
 *         that fixes startJob() — sets job.selectedApplicant from the
 *         jobApplications mapping so that rate() auth check passes.
 *
 * ─── FIX ────────────────────────────────────────────────────────────────────
 *  OLD: startJob() sets job.selectedApplicationId but NOT job.selectedApplicant
 *       → rate() checks _userToRate == job.selectedApplicant == address(0) → always reverts
 *  NEW: startJob() also sets job.selectedApplicant = jobApplications[jobId][appId].applicant
 *
 * ─── USAGE ──────────────────────────────────────────────────────────────────
 *  FOUNDRY_PROFILE=minsize forge script script/UpgradeLOWJC.s.sol \
 *    --rpc-url $ARBITRUM_MAINNET_RPC_URL \
 *    --private-key $WALL2_PRIVATE_KEY \
 *    --broadcast
 *
 * ─── ENV VARS ───────────────────────────────────────────────────────────────
 *  ARBITRUM_MAINNET_RPC_URL  - Arbitrum mainnet RPC
 *  WALL2_PRIVATE_KEY         - Owner of LOWJC proxy (service wallet 0xb8dC...)
 */

import {Script, console} from "forge-std/Script.sol";

interface IUUPSProxy {
    function upgradeToAndCall(address newImplementation, bytes calldata data) external;
    function owner() external view returns (address);
}

contract UpgradeLOWJC is Script {

    // ── Live proxy — DO NOT CHANGE ──
    address constant LOWJC_PROXY = 0xEE57ee10cCAB26f5642d4EbDC15B3881Bb0B5587;

    function run() external {
        uint256 deployerKey = vm.envUint("WALL2_PRIVATE_KEY");
        address deployer    = vm.addr(deployerKey);

        console.log("Deployer      :", deployer);
        console.log("LOWJC proxy   :", LOWJC_PROXY);

        address proxyOwner = IUUPSProxy(LOWJC_PROXY).owner();
        require(deployer == proxyOwner, "Not proxy owner");
        console.log("Ownership     : OK");

        vm.startBroadcast(deployerKey);

        // Deploy new implementation (src/native-arb-lowjc-v2.sol — selectedApplicant fix applied)
        bytes memory bytecode = abi.encodePacked(
            vm.getCode("native-arb-lowjc-v2.sol:NativeArbOpenWorkJobContract")
        );
        address newImpl;
        assembly { newImpl := create(0, add(bytecode, 0x20), mload(bytecode)) }
        require(newImpl != address(0), "Implementation deploy failed");
        console.log("New impl      :", newImpl);

        // Upgrade proxy — no re-initialisation needed, state carries over
        IUUPSProxy(LOWJC_PROXY).upgradeToAndCall(newImpl, "");
        console.log("Proxy upgraded: startJob() now sets selectedApplicant");

        vm.stopBroadcast();

        console.log("");
        console.log("=== DONE ===");
        console.log("LOWJC upgraded. Ratings after job completion will now work.");
    }
}
