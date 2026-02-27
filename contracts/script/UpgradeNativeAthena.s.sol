// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

/**
 * @title UpgradeNativeAthena
 * @notice Upgrades the NativeAthena proxy to v2 which adds athenaClient support,
 *         then wires AthenaClient so disputes can be raised via the new arch.
 *
 * --- FIX -------------------------------------------------------------------
 *  NativeAthena v1: handleRaiseDispute/handleCastVote/handleResolveDispute
 *                   only accept msg.sender == bridge (old LZ bridge)
 *  NativeAthena v2: all three handle* functions accept bridge OR athenaClient
 *                   adds setAthenaClient() setter (onlyOwner)
 *
 * Without this upgrade, AthenaClient (0xEC9446...) calls to NativeAthena
 * revert with "Only bridge", making dispute flow completely broken.
 *
 * --- USAGE -----------------------------------------------------------------
 *  FOUNDRY_PROFILE=minsize forge script script/UpgradeNativeAthena.s.sol \
 *    --rpc-url $ARBITRUM_MAINNET_RPC_URL \
 *    --private-key $PROD_DEPLOYER_KEY \
 *    --broadcast
 *
 * --- ENV VARS --------------------------------------------------------------
 *  ARBITRUM_MAINNET_RPC_URL  - Arbitrum mainnet RPC
 *  PROD_DEPLOYER_KEY         - Owner of NativeAthena proxy (0x7a2B7...)
 */

import {Script, console} from "forge-std/Script.sol";

interface IUUPSProxy {
    function upgradeToAndCall(address newImplementation, bytes calldata data) external;
    function owner() external view returns (address);
}

interface INativeAthenaV2 {
    function setAthenaClient(address _athenaClient) external;
    function athenaClient() external view returns (address);
}

contract UpgradeNativeAthena is Script {

    // Live proxies -- DO NOT CHANGE
    address constant NATIVE_ATHENA_PROXY  = 0xE6B9d996b56162cD7eDec3a83aE72943ee7C46Bf;
    address constant ATHENA_CLIENT        = 0xEC9446A163E74D2fBF3def75324895204415166D;

    function run() external {
        uint256 deployerKey = vm.envUint("PROD_DEPLOYER_KEY");
        address deployer    = vm.addr(deployerKey);

        console.log("Deployer            :", deployer);
        console.log("NativeAthena proxy  :", NATIVE_ATHENA_PROXY);
        console.log("AthenaClient        :", ATHENA_CLIENT);

        address proxyOwner = IUUPSProxy(NATIVE_ATHENA_PROXY).owner();
        require(deployer == proxyOwner, "Not proxy owner");
        console.log("Ownership           : OK");

        vm.startBroadcast(deployerKey);

        // 1. Deploy NativeAthena v2 implementation
        bytes memory bytecode = abi.encodePacked(
            vm.getCode("native-athena-mainnet-v2.sol:NativeAthena")
        );
        address newImpl;
        assembly { newImpl := create(0, add(bytecode, 0x20), mload(bytecode)) }
        require(newImpl != address(0), "Implementation deploy failed");
        console.log("New impl            :", newImpl);

        // 2. Upgrade proxy to v2 -- no re-init needed, state carries over
        IUUPSProxy(NATIVE_ATHENA_PROXY).upgradeToAndCall(newImpl, "");
        console.log("Proxy upgraded to v2");

        // 3. Wire AthenaClient so dispute calls are accepted
        INativeAthenaV2(NATIVE_ATHENA_PROXY).setAthenaClient(ATHENA_CLIENT);
        require(
            INativeAthenaV2(NATIVE_ATHENA_PROXY).athenaClient() == ATHENA_CLIENT,
            "AthenaClient wiring failed"
        );
        console.log("AthenaClient wired  : OK");

        vm.stopBroadcast();

        console.log("");
        console.log("=== DONE ===");
        console.log("NativeAthena upgraded. Dispute flow will now work via AthenaClient.");
    }
}
