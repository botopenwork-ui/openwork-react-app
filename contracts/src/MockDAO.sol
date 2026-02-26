// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title MockDAO — test stub that grants every address active staker status
contract MockDAO {
    function getStakerInfo(address) external pure returns (
        uint256 stakeAmount,
        uint256 startTime,
        uint256 durationMinutes,
        bool isActive
    ) {
        return (1000, 0, 60, true);
    }
}
