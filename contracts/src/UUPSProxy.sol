// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @title UUPSProxy
 * @notice A UUPS-compatible proxy that uses OpenZeppelin's ERC1967Proxy
 * @dev This proxy is compatible with any UUPS upgradeable contract that inherits from UUPSUpgradeable
 * 
 * Features:
 * - ERC1967 standard storage slots for implementation address
 * - Built-in upgrade mechanism via UUPS pattern
 * - Automatic initialization support
 * - Compatible with OpenZeppelin's upgrade tooling
 * 
 * Usage:
 * 1. Deploy your implementation contract (e.g., NativeAthena)
 * 2. Deploy this proxy with implementation address and initialization data
 * 3. The proxy will automatically delegate all calls to the implementation
 * 4. Upgrades are handled by calling upgradeTo/upgradeToAndCall on the implementation
 */
contract UUPSProxy is ERC1967Proxy {
    /**
     * @notice Constructor to initialize the UUPS proxy
     * @param implementation Address of the implementation contract
     * @param data Initialization data to be passed to the implementation's initialize function
     * 
     * @dev The data parameter should be the encoded call to the initialize function
     * Example for NativeAthena:
     * abi.encodeWithSignature("initialize(address,address,address)", owner, daoContract, bridge)
     */
    constructor(
        address implementation,
        bytes memory data
    ) ERC1967Proxy(implementation, data) {
        // The ERC1967Proxy constructor handles:
        // 1. Setting the implementation address in the correct storage slot
        // 2. Calling the implementation with the initialization data
        // 3. Ensuring the call succeeds or reverting
    }
    
    /**
     * @notice Receive function to handle plain ETH transfers
     * @dev This is required since the contract has a payable fallback
     */
    receive() external payable {}
    
    /**
     * @notice Get the current implementation address
     * @return impl The address of the current implementation contract
     * @dev This function is useful for verification and monitoring
     */
    function getImplementation() external view returns (address impl) {
        return _implementation();
    }
    
    /**
     * @notice Check if the contract supports UUPS upgrades
     * @return bool Always returns true as this is a UUPS proxy
     */
    function supportsUUPS() external pure returns (bool) {
        return true;
    }
}
