// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import { UUPSUpgradeable } from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import { OwnableUpgradeable } from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import { ReentrancyGuardUpgradeable } from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/// @title LocalOpenWorkJobContract (Lite)
/// @notice Gas-optimized version - removes redundant storage that exists on native chain
/// @dev Only stores security-critical job state (auth, funds, milestones). All other data lives in NOWJC/Genesis.
/// @dev Uses calldata everywhere possible and removes nonReentrant from pure forwarding functions

interface ILayerZeroBridge {
    function sendToNativeChain(
        string calldata _functionName,
        bytes calldata _payload,
        bytes calldata _options
    ) external payable;
}

contract LocalOpenWorkJobContractLite is
    Initializable,
    ReentrancyGuardUpgradeable,
    OwnableUpgradeable,
    UUPSUpgradeable
{
    using SafeERC20 for IERC20;

    enum JobStatus { Open, InProgress, Completed, Cancelled }

    /// @notice Minimal job struct - only security-critical fields
    struct Job {
        address jobGiver;           // For auth checks
        JobStatus status;           // For state validation
        uint256 currentLockedAmount;// For double-spend prevention
        uint256 currentMilestone;   // For payment tracking
        uint256[] milestoneAmounts; // For payment amounts (no descriptions needed locally)
        uint256 totalEscrowed;      // Track total sent to native
        uint256 totalReleased;      // Track total released
    }

    // ==================== STATE VARIABLES ====================

    mapping(string => Job) public jobs;
    uint256 public jobCounter;

    IERC20 public usdcToken;
    uint32 public chainId;
    ILayerZeroBridge public bridge;
    address public cctpSender;
    address public cctpMintRecipient;
    address public athenaClientContract;

    mapping(address => bool) public admins;

    uint256[50] private __gap;

    // ==================== EVENTS (Minimal - no string params to save gas) ====================

    event ProfileCreated(address indexed user);
    event JobPosted(string indexed jobId, address indexed jobGiver);
    event JobApplication(string indexed jobId, address indexed applicant);
    event JobStarted(string indexed jobId);
    event WorkSubmitted(string indexed jobId, address indexed applicant);
    event PaymentReleased(string indexed jobId, uint256 amount, uint256 milestone);
    event MilestoneLocked(string indexed jobId, uint256 milestone, uint256 amount);
    event FundsSent(string indexed jobId, uint256 amount);
    event JobStatusChanged(string indexed jobId, JobStatus newStatus);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _owner,
        address _usdcToken,
        uint32 _chainId,
        address _bridge,
        address _cctpSender
    ) public initializer {
        __ReentrancyGuard_init();
        __Ownable_init(_owner);
        __UUPSUpgradeable_init();

        admins[_owner] = true;
        usdcToken = IERC20(_usdcToken);
        chainId = _chainId;
        bridge = ILayerZeroBridge(_bridge);
        cctpSender = _cctpSender;
        cctpMintRecipient = 0x9E39B37275854449782F1a2a4524405cE79d6C1e;
    }

    function _authorizeUpgrade(address) internal view override {
        require(owner() == _msgSender() || address(bridge) == _msgSender(), "Unauthorized");
    }

    function setAdmin(address _admin, bool _status) external onlyOwner {
        admins[_admin] = _status;
    }

    function setBridge(address _bridge) external onlyOwner {
        bridge = ILayerZeroBridge(_bridge);
    }

    function setCCTPSender(address _cctpSender) external onlyOwner {
        require(_cctpSender != address(0), "Zero address");
        cctpSender = _cctpSender;
    }

    function setCCTPMintRecipient(address _mintRecipient) external onlyOwner {
        require(_mintRecipient != address(0), "Zero address");
        cctpMintRecipient = _mintRecipient;
    }

    function setUsdcToken(address _newToken) external onlyOwner {
        require(_newToken != address(0), "Zero address");
        usdcToken = IERC20(_newToken);
    }

    function setAthenaClientContract(address _athenaClient) external onlyOwner {
        require(_athenaClient != address(0), "Zero address");
        athenaClientContract = _athenaClient;
    }

    function setChainId(uint32 _chainId) external onlyOwner {
        require(_chainId != 0, "Zero chainId");
        chainId = _chainId;
    }

    /// @notice Set job counter to sync with native chain after upgrades
    /// @param _jobCounter The job counter value to set
    function setJobCounter(uint256 _jobCounter) external onlyOwner {
        jobCounter = _jobCounter;
    }

    // ==================== INTERNAL ====================

    function _sendFunds(string memory _jobId, uint256 _amount) internal {
        require(cctpSender != address(0), "CCTP not set");

        usdcToken.safeTransferFrom(msg.sender, address(this), _amount);
        usdcToken.approve(cctpSender, _amount);

        bytes32 mintRecipient = bytes32(uint256(uint160(cctpMintRecipient)));
        (bool success, ) = cctpSender.call(
            abi.encodeWithSignature("sendFast(uint256,uint32,bytes32,uint256)", _amount, 3, mintRecipient, 1000)
        );
        require(success, "CCTP failed");

        emit FundsSent(_jobId, _amount);
    }

    // ==================== PROFILE (NO LOCAL STORAGE) ====================

    /// @notice Create profile - pure forward, no local state changes
    /// @dev No reentrancy guard needed - only external call is bridge.sendToNativeChain
    function createProfile(
        string calldata _ipfsHash,
        address _referrerAddress,
        bytes calldata _nativeOptions
    ) external payable {
        bridge.sendToNativeChain{value: msg.value}(
            "createProfile",
            abi.encode("createProfile", msg.sender, _ipfsHash, _referrerAddress),
            _nativeOptions
        );
        emit ProfileCreated(msg.sender);
    }

    function updateProfile(
        string calldata _newIpfsHash,
        bytes calldata _nativeOptions
    ) external payable {
        bridge.sendToNativeChain{value: msg.value}(
            "updateProfile",
            abi.encode("updateProfile", msg.sender, _newIpfsHash),
            _nativeOptions
        );
    }

    function addPortfolio(
        string calldata _portfolioHash,
        bytes calldata _nativeOptions
    ) external payable {
        bridge.sendToNativeChain{value: msg.value}(
            "addPortfolio",
            abi.encode("addPortfolio", msg.sender, _portfolioHash),
            _nativeOptions
        );
    }

    // ==================== JOB POSTING ====================

    /// @notice Post job - stores minimal local state for payment tracking
    /// @dev Gas saved: ~84,200 (removed jobDetailHash, applicants[], workSubmissions[], etc.)
    function postJob(
        string memory _jobDetailHash,
        string[] memory _descriptions,
        uint256[] memory _amounts,
        bytes calldata _nativeOptions
    ) external payable nonReentrant {
        string memory jobId = string(abi.encodePacked(Strings.toString(chainId), "-", Strings.toString(++jobCounter)));

        // Store minimal local state
        Job storage job = jobs[jobId];
        job.jobGiver = msg.sender;
        job.status = JobStatus.Open;

        // Only store amounts (not descriptions - those live on native chain)
        for (uint i = 0; i < _amounts.length; i++) {
            job.milestoneAmounts.push(_amounts[i]);
        }

        // Send full data to native chain
        bytes memory payload = abi.encode("postJob", jobId, msg.sender, _jobDetailHash, _descriptions, _amounts);
        bridge.sendToNativeChain{value: msg.value}("postJob", payload, _nativeOptions);

        emit JobPosted(jobId, msg.sender);
        emit JobStatusChanged(jobId, JobStatus.Open);
    }

    // ==================== APPLICATION (NO LOCAL STORAGE) ====================

    /// @notice Apply to job - pure forward, no local state changes
    /// @dev No reentrancy guard needed - validation happens on native chain
    function applyToJob(
        string calldata _jobId,
        string calldata _appHash,
        string[] calldata _descriptions,
        uint256[] calldata _amounts,
        uint32 _preferredChainDomain,
        bytes calldata _nativeOptions
    ) external payable {
        bytes memory payload = abi.encode(
            "applyToJob", msg.sender, _jobId, _appHash, _descriptions, _amounts, _preferredChainDomain
        );
        bridge.sendToNativeChain{value: msg.value}("applyToJob", payload, _nativeOptions);
        emit JobApplication(_jobId, msg.sender);
    }

    // ==================== JOB START ====================

    /// @notice Start direct contract - stores minimal state + sends funds
    function startDirectContract(
        address _jobTaker,
        string memory _jobDetailHash,
        string[] memory _descriptions,
        uint256[] memory _amounts,
        uint32 _jobTakerChainDomain,
        bytes calldata _nativeOptions
    ) external payable nonReentrant {
        require(_jobTaker != address(0), "Invalid job taker");

        string memory jobId = string(abi.encodePacked(Strings.toString(chainId), "-", Strings.toString(++jobCounter)));

        // Store minimal local state
        Job storage job = jobs[jobId];
        job.jobGiver = msg.sender;
        job.status = JobStatus.InProgress;
        job.currentMilestone = 1;

        for (uint i = 0; i < _amounts.length; i++) {
            job.milestoneAmounts.push(_amounts[i]);
        }

        // Lock first milestone
        uint256 firstAmount = _amounts[0];
        _sendFunds(jobId, firstAmount);
        job.currentLockedAmount = firstAmount;
        job.totalEscrowed = firstAmount;

        // Send to native chain
        bytes memory payload = abi.encode(
            "startDirectContract",
            msg.sender,
            _jobTaker,
            jobId,
            _jobDetailHash,
            _descriptions,
            _amounts,
            _jobTakerChainDomain
        );
        bridge.sendToNativeChain{value: msg.value}("startDirectContract", payload, _nativeOptions);

        emit JobPosted(jobId, msg.sender);
        emit JobStarted(jobId);
        emit JobStatusChanged(jobId, JobStatus.InProgress);
    }

    /// @notice Start job with selected applicant
    function startJob(
        string memory _jobId,
        uint256 _appId,
        bool _useAppMilestones,
        bytes calldata _nativeOptions
    ) external payable nonReentrant {
        Job storage job = jobs[_jobId];
        require(job.jobGiver == msg.sender, "Not job giver");
        require(job.status == JobStatus.Open, "Not open");

        job.status = JobStatus.InProgress;
        job.currentMilestone = 1;

        // Lock first milestone
        uint256 firstAmount = job.milestoneAmounts[0];
        _sendFunds(_jobId, firstAmount);
        job.currentLockedAmount = firstAmount;
        job.totalEscrowed = firstAmount;

        bytes memory payload = abi.encode("startJob", msg.sender, _jobId, _appId, _useAppMilestones);
        bridge.sendToNativeChain{value: msg.value}("startJob", payload, _nativeOptions);

        emit JobStarted(_jobId);
        emit JobStatusChanged(_jobId, JobStatus.InProgress);
    }

    // ==================== WORK SUBMISSION (NO LOCAL STORAGE) ====================

    /// @notice Submit work - pure forward, no local state changes
    /// @dev No reentrancy guard needed - only external call is bridge.sendToNativeChain
    function submitWork(
        string calldata _jobId,
        string calldata _submissionHash,
        bytes calldata _nativeOptions
    ) external payable {
        bridge.sendToNativeChain{value: msg.value}(
            "submitWork",
            abi.encode("submitWork", msg.sender, _jobId, _submissionHash),
            _nativeOptions
        );
        emit WorkSubmitted(_jobId, msg.sender);
    }

    // ==================== PAYMENT FUNCTIONS ====================

    /// @notice Release payment cross-chain
    function releasePaymentCrossChain(
        string memory _jobId,
        uint32 _targetChainDomain,
        address _targetRecipient,
        bytes calldata _nativeOptions
    ) external payable nonReentrant {
        Job storage job = jobs[_jobId];
        require(job.jobGiver == msg.sender, "Not job giver");
        require(job.status == JobStatus.InProgress, "Not in progress");
        require(job.currentLockedAmount > 0, "No funds locked");
        require(_targetRecipient != address(0), "Invalid recipient");

        uint256 amount = job.currentLockedAmount;

        // Update local state
        job.currentLockedAmount = 0;
        job.totalReleased += amount;

        // Check if job complete
        if (job.currentMilestone >= job.milestoneAmounts.length) {
            job.status = JobStatus.Completed;
            emit JobStatusChanged(_jobId, JobStatus.Completed);
        }

        bytes memory payload = abi.encode(
            "releasePaymentCrossChain",
            msg.sender,
            _jobId,
            amount,
            _targetChainDomain,
            _targetRecipient
        );
        bridge.sendToNativeChain{value: msg.value}("releasePaymentCrossChain", payload, _nativeOptions);

        emit PaymentReleased(_jobId, amount, job.currentMilestone);
    }

    /// @notice Lock next milestone
    function lockNextMilestone(
        string memory _jobId,
        bytes calldata _nativeOptions
    ) external payable nonReentrant {
        Job storage job = jobs[_jobId];
        require(job.jobGiver == msg.sender, "Not job giver");
        require(job.status == JobStatus.InProgress, "Not in progress");
        require(job.currentLockedAmount == 0, "Previous not released");
        require(job.currentMilestone < job.milestoneAmounts.length, "All complete");

        job.currentMilestone++;
        uint256 nextAmount = job.milestoneAmounts[job.currentMilestone - 1];

        _sendFunds(_jobId, nextAmount);
        job.currentLockedAmount = nextAmount;
        job.totalEscrowed += nextAmount;

        bytes memory payload = abi.encode("lockNextMilestone", msg.sender, _jobId, nextAmount);
        bridge.sendToNativeChain{value: msg.value}("lockNextMilestone", payload, _nativeOptions);

        emit MilestoneLocked(_jobId, job.currentMilestone, nextAmount);
    }

    /// @notice Release current + lock next in one tx
    /// @dev Payment goes to applicant's stored preferred chain domain (set when they applied)
    function releaseAndLockNext(
        string memory _jobId,
        bytes calldata _nativeOptions
    ) external payable nonReentrant {
        Job storage job = jobs[_jobId];
        require(job.jobGiver == msg.sender, "Not job giver");
        require(job.status == JobStatus.InProgress, "Not in progress");
        require(job.currentLockedAmount > 0, "No funds locked");

        uint256 releaseAmount = job.currentLockedAmount;
        job.totalReleased += releaseAmount;

        job.currentMilestone++;

        uint256 nextAmount = 0;
        if (job.currentMilestone <= job.milestoneAmounts.length) {
            nextAmount = job.milestoneAmounts[job.currentMilestone - 1];
            _sendFunds(_jobId, nextAmount);
            job.currentLockedAmount = nextAmount;
            job.totalEscrowed += nextAmount;
        } else {
            job.currentLockedAmount = 0;
            job.status = JobStatus.Completed;
            emit JobStatusChanged(_jobId, JobStatus.Completed);
        }

        bytes memory payload = abi.encode(
            "releasePaymentAndLockNext",
            msg.sender,
            _jobId,
            releaseAmount,
            nextAmount
        );
        bridge.sendToNativeChain{value: msg.value}("releaseAndLockNext", payload, _nativeOptions);

        emit PaymentReleased(_jobId, releaseAmount, job.currentMilestone - 1);
        if (nextAmount > 0) {
            emit MilestoneLocked(_jobId, job.currentMilestone, nextAmount);
        }
    }

    // ==================== RATING (NO LOCAL STORAGE) ====================

    /// @notice Rate user - pure forward, validation on native chain
    /// @dev No reentrancy guard needed - only external call is bridge.sendToNativeChain
    function rate(
        string calldata _jobId,
        address _userToRate,
        uint256 _rating,
        bytes calldata _nativeOptions
    ) external payable {
        bridge.sendToNativeChain{value: msg.value}(
            "rate",
            abi.encode("rate", msg.sender, _jobId, _userToRate, _rating),
            _nativeOptions
        );
    }

    // ==================== DISPUTE RESOLUTION ====================

    function resolveDispute(string memory _jobId, bool _jobGiverWins) external {
        require(msg.sender == athenaClientContract, "Only Athena");

        Job storage job = jobs[_jobId];
        require(job.jobGiver != address(0), "Job not found");
        require(job.status == JobStatus.InProgress, "Not in progress");
        require(job.currentLockedAmount > 0, "No funds");

        job.currentLockedAmount = 0;
        job.status = JobStatus.Completed;

        emit JobStatusChanged(_jobId, JobStatus.Completed);
    }

    // ==================== VIEW FUNCTIONS ====================

    function getJob(string memory _jobId) external view returns (Job memory) {
        return jobs[_jobId];
    }

    function getJobCount() external view returns (uint256) {
        return jobCounter;
    }

    function getEscrowBalance(string memory _jobId) external view returns (
        uint256 escrowed,
        uint256 released,
        uint256 locked
    ) {
        Job storage job = jobs[_jobId];
        return (job.totalEscrowed, job.totalReleased, job.currentLockedAmount);
    }

    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance");
        payable(owner()).transfer(balance);
    }
}
