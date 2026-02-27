// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

/**
 * @title DeployProfileStack
 * @notice Deploys NativeProfileGenesis + ProfileManager on Arbitrum mainnet
 *         and wires them into the existing LOWJC proxy.
 *
 * ─── WHAT THIS DOES ─────────────────────────────────────────────────────────
 *  1. Deploy NativeProfileGenesis implementation + proxy
 *  2. Deploy ProfileManager implementation + proxy
 *  3. ProfileGenesis: authorize ProfileManager as writer
 *  4. ProfileManager: initialize with (owner, genesis, bridge=LOWJC)
 *  5. LOWJC: setProfileManager(profileManagerProxy)
 *
 * ─── USAGE ──────────────────────────────────────────────────────────────────
 *  From the contracts/ directory:
 *
 *  FOUNDRY_PROFILE=minsize forge script script/DeployProfileStack.s.sol \
 *    --rpc-url $ARBITRUM_MAINNET_RPC_URL \
 *    --private-key $PROD_DEPLOYER_KEY \
 *    --broadcast
 *
 * ─── ENV VARS ───────────────────────────────────────────────────────────────
 *  ARBITRUM_MAINNET_RPC_URL  - Arbitrum mainnet RPC
 *  PROD_DEPLOYER_KEY         - Owner of LOWJC proxy (without 0x)
 */

import {Script, console} from "forge-std/Script.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

interface IProfileGenesis {
    function initialize(address owner) external;
    function authorizeContract(address _contract, bool _authorized) external;
}

interface IProfileManager {
    function initialize(address owner, address bridge, address genesis) external;
}

interface ILOWJCAdmin {
    function setProfileManager(address _profileManager) external;
    function owner() external view returns (address);
}

contract DeployProfileStack is Script {

    // ── Live proxies — DO NOT CHANGE ──
    address constant LOWJC_PROXY = 0xEE57ee10cCAB26f5642d4EbDC15B3881Bb0B5587;

    function run() external {
        uint256 deployerKey = vm.envUint("PROD_DEPLOYER_KEY");
        address deployer    = vm.addr(deployerKey);

        console.log("Deployer    :", deployer);
        console.log("LOWJC proxy :", LOWJC_PROXY);

        // Validate ownership
        require(ILOWJCAdmin(LOWJC_PROXY).owner() == deployer, "Not LOWJC owner");
        console.log("LOWJC ownership: OK");

        vm.startBroadcast(deployerKey);

        // ── 1. Deploy NativeProfileGenesis ──
        bytes memory pgBytecode = abi.encodePacked(
            vm.getCode("native-profile-genesis.sol:NativeProfileGenesis")
        );
        address pgImpl;
        assembly { pgImpl := create(0, add(pgBytecode, 0x20), mload(pgBytecode)) }
        require(pgImpl != address(0), "ProfileGenesis impl deploy failed");

        bytes memory pgInit = abi.encodeWithSelector(IProfileGenesis.initialize.selector, deployer);
        address pgProxy = address(new ERC1967Proxy(pgImpl, pgInit));
        console.log("NativeProfileGenesis proxy  :", pgProxy);

        // ── 2. Deploy ProfileManager ──
        bytes memory pmBytecode = abi.encodePacked(
            vm.getCode("native-profile-manager.sol:NativeProfileManager")
        );
        address pmImpl;
        assembly { pmImpl := create(0, add(pmBytecode, 0x20), mload(pmBytecode)) }
        require(pmImpl != address(0), "ProfileManager impl deploy failed");

        bytes memory pmInit = abi.encodeWithSelector(
            IProfileManager.initialize.selector,
            deployer,
            LOWJC_PROXY,  // bridge = LOWJC
            pgProxy       // genesis = NativeProfileGenesis
        );
        address pmProxy = address(new ERC1967Proxy(pmImpl, pmInit));
        console.log("NativeProfileManager proxy  :", pmProxy);

        // ── 3. Authorize ProfileManager as writer on ProfileGenesis ──
        IProfileGenesis(pgProxy).authorizeContract(pmProxy, true);
        console.log("ProfileGenesis: ProfileManager authorized as writer");

        // ── 4. Wire LOWJC → ProfileManager ──
        ILOWJCAdmin(LOWJC_PROXY).setProfileManager(pmProxy);
        console.log("LOWJC.profileManager set to:", pmProxy);

        vm.stopBroadcast();

        console.log("");
        console.log("=== DONE ===");
        console.log("Profile stack deployed. Set these in Cloud Run + redeploy frontend:");
        console.log("  VITE_PROFILE_MANAGER_ADDRESS =", pmProxy);
        console.log("  VITE_PROFILE_GENESIS_ADDRESS =", pgProxy);
    }
}
