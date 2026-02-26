// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

/**
 * @title NativeArbAthenaClient
 * @notice Native Arbitrum version of LocalAthena (athena-client.sol).
 *
 * Unlike the OP LocalAthena which routes fees via CCTP and sends dispute/oracle
 * messages via LayerZero, this contract is deployed on Arbitrum — the same chain
 * as NativeAthena. Every action is a direct function call; fees are transferred
 * directly to NativeAthena (no CCTP hop needed).
 *
 * Key differences from athena-client.sol:
 *  - No LayerZero bridge dependency
 *  - No CCTP — fees go user → NativeAthena via direct safeTransferFrom
 *  - No `bytes calldata _nativeOptions` params, no `payable` on user-facing functions
 *  - Direct calls to INativeAthena handler functions
 *
 * Deployment checklist:
 *  1. Deploy with (owner, usdcToken, nativeAthenaAddress, jobContractAddress)
 *  2. No bridge or CCTP config required
 */

import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import { UUPSUpgradeable } from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import { OwnableUpgradeable } from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import { ReentrancyGuardUpgradeable } from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// ==================== INTERFACES ====================

/**
 * @dev Subset of NativeAthena functions callable by this client.
 * Mirrors the existing bridge message handlers — same params, direct external call.
 */
interface INativeAthena {
    function handleRaiseDispute(
        string memory jobId,
        string memory disputeHash,
        string memory oracleName,
        uint256 fee,
        uint256 disputedAmount,
        address disputeRaiser
    ) external;

    function handleSubmitSkillVerification(
        address applicant,
        string memory applicationHash,
        uint256 feeAmount,
        string memory targetOracleName
    ) external;

    function handleAskAthena(
        address applicant,
        string memory description,
        string memory hash,
        string memory targetOracle,
        string memory fees
    ) external;
}

interface ILocalOpenWorkJobContract {
    enum JobStatus { Open, InProgress, Completed, Cancelled }

    struct MilestonePayment {
        string descriptionHash;
        uint256 amount;
    }

    struct Job {
        string id;
        address jobGiver;
        address[] applicants;
        string jobDetailHash;
        JobStatus status;
        string[] workSubmissions;
        MilestonePayment[] milestonePayments;
        MilestonePayment[] finalMilestones;
        uint256 totalPaid;
        uint256 currentLockedAmount;
        uint256 currentMilestone;
        address selectedApplicant;
        uint256 selectedApplicationId;
        uint256 totalEscrowed;
        uint256 totalReleased;
    }

    function getJob(string memory _jobId) external view returns (Job memory);
    function resolveDispute(string memory jobId, bool jobGiverWins) external;
}

// ==================== CONTRACT ====================

contract NativeArbAthenaClient is
    Initializable,
    ReentrancyGuardUpgradeable,
    OwnableUpgradeable,
    UUPSUpgradeable
{
    using SafeERC20 for IERC20;

    IERC20 public usdcToken;
    INativeAthena public nativeAthena;
    ILocalOpenWorkJobContract public jobContract;

    uint256 public minDisputeFee;

    mapping(string => bool) public jobDisputeExists;

    // ==================== EVENTS ====================

    event DisputeRaised(address indexed caller, string jobId, uint256 feeAmount);
    event SkillVerificationSubmitted(address indexed caller, string targetOracleName, uint256 feeAmount);
    event AthenaAsked(address indexed caller, string targetOracle, uint256 feeAmount);
    event JobContractSet(address indexed jobContract);
    event NativeAthenaSet(address indexed nativeAthena);
    event MinDisputeFeeSet(uint256 newMinFee);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _owner,
        address _usdcToken,
        address _nativeAthena,
        address _jobContract
    ) public initializer {
        __ReentrancyGuard_init();
        __Ownable_init(_owner);
        __UUPSUpgradeable_init();

        usdcToken = IERC20(_usdcToken);
        nativeAthena = INativeAthena(_nativeAthena);
        jobContract = ILocalOpenWorkJobContract(_jobContract);
        minDisputeFee = 50 * 10**6; // 50 USDC (6 decimals)
    }

    function _authorizeUpgrade(address /* newImpl */) internal view override {
        require(owner() == _msgSender(), "Unauthorized upgrade");
    }

    // ==================== ADMIN FUNCTIONS ====================

    function setNativeAthena(address _nativeAthena) external onlyOwner {
        require(_nativeAthena != address(0), "Zero address");
        nativeAthena = INativeAthena(_nativeAthena);
        emit NativeAthenaSet(_nativeAthena);
    }

    function setJobContract(address _jobContract) external onlyOwner {
        require(_jobContract != address(0), "Zero address");
        jobContract = ILocalOpenWorkJobContract(_jobContract);
        emit JobContractSet(_jobContract);
    }

    function setMinDisputeFee(uint256 _minFee) external onlyOwner {
        minDisputeFee = _minFee;
        emit MinDisputeFeeSet(_minFee);
    }

    function setUSDCToken(address _newToken) external onlyOwner {
        require(_newToken != address(0), "Zero address");
        usdcToken = IERC20(_newToken);
    }

    // ==================== MAIN FUNCTIONS ====================

    /**
     * @dev Raise a dispute for a job.
     * Fee is transferred directly from caller to NativeAthena — no CCTP, no bridge.
     * NativeAthena is called directly with the dispute details.
     */
    function raiseDispute(
        string memory _jobId,
        string memory _disputeHash,
        string memory _oracleName,
        uint256 _feeAmount,
        uint256 _disputedAmount
    ) external nonReentrant {
        require(_feeAmount > 0, "Fee must be > 0");
        require(address(jobContract) != address(0), "Job contract not set");

        // Transfer fee directly to NativeAthena — it holds and distributes the fees
        usdcToken.safeTransferFrom(msg.sender, address(nativeAthena), _feeAmount);

        jobDisputeExists[_jobId] = true;

        // Direct call — no LZ, no CCTP overhead
        nativeAthena.handleRaiseDispute(
            _jobId,
            _disputeHash,
            _oracleName,
            _feeAmount,
            _disputedAmount,
            msg.sender
        );

        emit DisputeRaised(msg.sender, _jobId, _feeAmount);
    }

    /**
     * @dev Submit a skill verification request.
     * Fee transferred directly to NativeAthena.
     */
    function submitSkillVerification(
        string memory _applicationHash,
        uint256 _feeAmount,
        string memory _targetOracleName
    ) external nonReentrant {
        require(_feeAmount > 0, "Fee must be > 0");

        usdcToken.safeTransferFrom(msg.sender, address(nativeAthena), _feeAmount);

        nativeAthena.handleSubmitSkillVerification(
            msg.sender,
            _applicationHash,
            _feeAmount,
            _targetOracleName
        );

        emit SkillVerificationSubmitted(msg.sender, _targetOracleName, _feeAmount);
    }

    /**
     * @dev Ask Athena (oracle question/request).
     * Fee transferred directly to NativeAthena.
     */
    function askAthena(
        string memory _description,
        string memory _hash,
        string memory _targetOracle,
        uint256 _feeAmount
    ) external nonReentrant {
        require(_feeAmount > 0, "Fee must be > 0");

        usdcToken.safeTransferFrom(msg.sender, address(nativeAthena), _feeAmount);

        nativeAthena.handleAskAthena(
            msg.sender,
            _description,
            _hash,
            _targetOracle,
            uint2str(_feeAmount)
        );

        emit AthenaAsked(msg.sender, _targetOracle, _feeAmount);
    }

    // ==================== VIEW FUNCTIONS ====================

    function isCallerInvolvedInJob(string memory _jobId, address _caller) external view returns (bool) {
        require(address(jobContract) != address(0), "Job contract not set");

        ILocalOpenWorkJobContract.Job memory job = jobContract.getJob(_jobId);
        if (bytes(job.id).length == 0) return false;

        if (_caller == job.jobGiver || _caller == job.selectedApplicant) return true;

        if (job.status == ILocalOpenWorkJobContract.JobStatus.Open) {
            for (uint i = 0; i < job.applicants.length; i++) {
                if (job.applicants[i] == _caller) return true;
            }
        }

        return false;
    }

    function getContractBalance() external view returns (uint256) {
        return usdcToken.balanceOf(address(this));
    }

    // ==================== UTILITY ====================

    function uint2str(uint256 _i) internal pure returns (string memory) {
        if (_i == 0) return "0";
        uint256 j = _i;
        uint256 len;
        while (j != 0) { len++; j /= 10; }
        bytes memory bstr = new bytes(len);
        uint256 k = len;
        while (_i != 0) {
            k = k - 1;
            bstr[k] = bytes1(uint8(48 + uint8(_i - _i / 10 * 10)));
            _i /= 10;
        }
        return string(bstr);
    }

    // ==================== ADMIN WITHDRAWAL ====================

    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance");
        payable(owner()).transfer(balance);
    }

    function emergencyWithdrawUSDC() external onlyOwner {
        uint256 balance = usdcToken.balanceOf(address(this));
        require(balance > 0, "No USDC balance");
        usdcToken.safeTransfer(owner(), balance);
    }
}
