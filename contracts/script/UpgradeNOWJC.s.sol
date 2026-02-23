// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

/**
 * @title UpgradeNOWJC
 * @notice Upgrades the NOWJC proxy to nowjc-v2 implementation.
 *
 * Usage:
 *   forge script script/UpgradeNOWJC.s.sol \
 *     --rpc-url $ARBITRUM_RPC \
 *     --private-key $DEPLOYER_PRIVATE_KEY \
 *     --broadcast \
 *     --verify \
 *     --etherscan-api-key $ARBISCAN_API_KEY
 *
 * Env vars required:
 *   ARBITRUM_RPC            - Arbitrum mainnet RPC URL
 *   DEPLOYER_PRIVATE_KEY    - Owner of the NOWJC proxy (without 0x)
 *   ARBISCAN_API_KEY        - For contract verification (optional)
 */

import {Script, console} from "forge-std/Script.sol";

interface IUUPSProxy {
    function upgradeToAndCall(address newImplementation, bytes calldata data) external;
    function owner() external view returns (address);
}

// Minimal interface to deploy the new implementation
// We import via a path relative to the contracts root
interface INowjcV2 {}

contract UpgradeNOWJC is Script {

    // ── Deployed proxy (DO NOT CHANGE — this is the live contract) ──
    address constant NOWJC_PROXY = 0x8EfbF240240613803B9c9e716d4b5AD1388aFd99;

    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        console.log("Deployer         :", deployer);
        console.log("NOWJC proxy      :", NOWJC_PROXY);

        // Sanity check — deployer must be owner
        address proxyOwner = IUUPSProxy(NOWJC_PROXY).owner();
        require(deployer == proxyOwner, "Deployer is not proxy owner");
        console.log("Proxy owner check: OK");

        vm.startBroadcast(deployerKey);

        // 1. Deploy new implementation (nowjc-v2)
        //    NOTE: Using raw bytecode deploy via forge — the contract is compiled
        //    from contracts/openwork-full-contract-suite-26-Dec-version/nowjc-v2.sol
        //    Make sure foundry.toml src path includes that directory.
        bytes memory implBytecode = abi.encodePacked(
            vm.getCode("nowjc-v2.sol:NativeOpenWorkJobContract")
        );
        address newImpl;
        assembly {
            newImpl := create(0, add(implBytecode, 0x20), mload(implBytecode))
        }
        require(newImpl != address(0), "Implementation deploy failed");
        console.log("New implementation:", newImpl);

        // 2. Upgrade proxy to new implementation (no init call needed — storage compatible)
        IUUPSProxy(NOWJC_PROXY).upgradeToAndCall(newImpl, "");
        console.log("Proxy upgraded to v2 successfully");

        vm.stopBroadcast();

        console.log("=== NEXT STEPS ===");
        console.log("1. Call NOWJC.addAuthorizedContract(NATIVE_ARB_LOWJC_ADDRESS)");
        console.log("2. Call NOWJC.addAuthorizedContract(NATIVE_ARB_ATHENA_ADDRESS)");
        console.log("3. Update frontend: chainConfig.js with native Arb LOWJC address");
    }
}
