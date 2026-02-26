// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

/**
 * @title NativeArbOpenWorkJobContract
 * @notice Native Arbitrum version of LOWJC.
 *
 * Unlike the OP LOWJC (which bridges every action via LayerZero + CCTP), this contract
 * is deployed on Arbitrum — the same chain as NOWJC. Every action is a direct
 * function call to NOWJC, and USDC is transferred directly (no CCTP hop needed).
 *
 * Key differences from lowjc.sol:
 *  - No LayerZero bridge dependency
 *  - No CCTP — USDC goes user → NOWJC directly via safeTransferFrom
 *  - No `bytes calldata _nativeOptions` params, no `payable` on user-facing functions
 *  - Job IDs use block.chainid (42161 on Arb mainnet, 421614 on Arb Sepolia)
 *  - All cross-chain "send" calls replaced with direct INativeNOWJC calls
 *  - releasePayment calls the new unified NOWJC.releasePayment() which auto-routes
 *    same-chain vs cross-chain based on applicant's registered preferred domain
 *
 * Deployment checklist:
 *  1. Deploy this contract (owner, usdcToken, nowjcAddress)
 *  2. Call NOWJC.addAuthorizedContract(address(this))
 *  3. Fund NOWJC with initial USDC allowance (or rely on per-tx approvals — handled here)
 */

import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import { UUPSUpgradeable } from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import { OwnableUpgradeable } from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import { ReentrancyGuardUpgradeable } from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

// ==================== INTERFACES ====================

interface INativeNOWJC {
    // Profile management
    function createProfile(address _user, string memory _ipfsHash, address _referrerAddress) external;
    function updateProfile(address _user, string memory _newIpfsHash) external;
    function addPortfolioItem(address _user, string memory _portfolioHash) external;

    // Job lifecycle
    function postJob(
        string memory _jobId,
        address _jobGiver,
        string memory _jobDetailHash,
        string[] memory _descriptions,
        uint256[] memory _amounts
    ) external;

    function applyToJob(
        address _applicant,
        string memory _jobId,
        string memory _applicationHash,
        string[] memory _descriptions,
        uint256[] memory _amounts,
        uint32 _preferredChainDomain
    ) external;

    function handleStartDirectContract(
        address _jobGiver,
        address _jobTaker,
        string memory _jobId,
        string memory _jobDetailHash,
        string[] memory _descriptions,
        uint256[] memory _amounts,
        uint32 _jobTakerChainDomain
    ) external;

    function startJob(
        address _jobGiver,
        string memory _jobId,
        uint256 _appId,
        bool _useApplicantMilestones
    ) external;

    function submitWork(
        address _applicant,
        string memory _jobId,
        string memory _submissionHash
    ) external;

    // Payment — unified routing (same-chain or cross-chain determined by NOWJC)
    function releasePayment(string memory _jobId) external;

    function lockNextMilestone(
        address _caller,
        string memory _jobId,
        uint256 _lockedAmount
    ) external;

    function releasePaymentAndLockNext(
        address _jobGiver,
        string memory _jobId,
        uint256 _releasedAmount,
        uint256 _lockedAmount
    ) external;

    // Rating
    function rate(
        address _rater,
        string memory _jobId,
        address _userToRate,
        uint256 _rating
    ) external;

    // Reads (used for milestone amounts)
    function getJob(string memory _jobId) external view returns (
        string memory id,
        address jobGiver,
        address[] memory applicants,
        string memory jobDetailHash,
        uint8 status,
        string[] memory workSubmissions,
        uint256 totalPaid,
        uint256 currentMilestone,
        address selectedApplicant,
        uint256 selectedApplicationId
    );
}

// ==================== CONTRACT ====================

contract NativeArbOpenWorkJobContract is
    Initializable,
    ReentrancyGuardUpgradeable,
    OwnableUpgradeable,
    UUPSUpgradeable
{
    using SafeERC20 for IERC20;

    enum JobStatus { Open, InProgress, Completed, Cancelled }

    struct Profile {
        address userAddress;
        string ipfsHash;
        address referrerAddress;
        string[] portfolioHashes;
    }

    struct MilestonePayment {
        string descriptionHash;
        uint256 amount;
    }

    struct Application {
        uint256 id;
        string jobId;
        address applicant;
        string applicationHash;
        MilestonePayment[] proposedMilestones;
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

    // ==================== STATE VARIABLES ====================

    mapping(address => Profile) public profiles;
    mapping(address => bool) public hasProfile;
    mapping(string => Job) public jobs;
    mapping(string => mapping(uint256 => Application)) public jobApplications;
    mapping(string => uint256) public jobApplicationCounter;
    mapping(string => mapping(address => uint256)) public jobRatings;
    mapping(address => uint256[]) public userRatings;

    uint256 public jobCounter;
    uint256 public totalPlatformPayments;

    IERC20 public usdcToken;
    INativeNOWJC public nowjc;

    address public athenaClientContract;

    // ==================== EVENTS ====================

    event ProfileCreated(address indexed user, string ipfsHash, address referrer);
    event ProfileUpdated(address indexed user, string newIpfsHash);
    event PortfolioAdded(address indexed user, string portfolioHash);
    event JobPosted(string indexed jobId, address indexed jobGiver, string jobDetailHash);
    event JobApplication(string indexed jobId, uint256 indexed applicationId, address indexed applicant, string applicationHash);
    event JobStarted(string indexed jobId, uint256 indexed applicationId, address indexed selectedApplicant, bool useApplicantMilestones);
    event WorkSubmitted(string indexed jobId, address indexed applicant, string submissionHash, uint256 milestone);
    event PaymentReleased(string indexed jobId, address indexed jobGiver, address indexed applicant, uint256 amount, uint256 milestone);
    event MilestoneLocked(string indexed jobId, uint256 newMilestone, uint256 lockedAmount);
    event UserRated(string indexed jobId, address indexed rater, address indexed rated, uint256 rating);
    event FundsSent(string indexed jobId, address indexed jobGiver, uint256 amount);
    event JobStatusChanged(string indexed jobId, JobStatus newStatus);
    event PaymentReleasedAndNextMilestoneLocked(string indexed jobId, uint256 releasedAmount, uint256 lockedAmount, uint256 milestone);
    event PlatformTotalUpdated(uint256 newTotal);
    event DisputeResolved(string indexed jobId, bool jobGiverWins, address winner, uint256 amount);
    event NOWJCSet(address indexed nowjc);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _owner,
        address _usdcToken,
        address _nowjc
    ) public initializer {
        __ReentrancyGuard_init();
        __Ownable_init(_owner);
        __UUPSUpgradeable_init();

        usdcToken = IERC20(_usdcToken);
        nowjc = INativeNOWJC(_nowjc);
    }

    function _authorizeUpgrade(address /* newImpl */) internal view override {
        require(owner() == _msgSender(), "Unauthorized upgrade");
    }

    // ==================== ADMIN FUNCTIONS ====================

    function setNOWJC(address _nowjc) external onlyOwner {
        require(_nowjc != address(0), "Zero address");
        nowjc = INativeNOWJC(_nowjc);
        emit NOWJCSet(_nowjc);
    }

    function setUSDCToken(address _newToken) external onlyOwner {
        require(_newToken != address(0), "Zero address");
        usdcToken = IERC20(_newToken);
    }

    function setAthenaClientContract(address _athenaClient) external onlyOwner {
        require(_athenaClient != address(0), "Zero address");
        athenaClientContract = _athenaClient;
    }

    // ==================== INTERNAL: SEND FUNDS TO NOWJC ====================

    /**
     * @dev Transfer USDC from the job giver directly to NOWJC.
     * No CCTP, no bridge — same chain, direct transfer.
     */
    function _sendFundsToNOWJC(string memory _jobId, uint256 _amount) internal {
        usdcToken.safeTransferFrom(msg.sender, address(nowjc), _amount);
        emit FundsSent(_jobId, msg.sender, _amount);
    }

    // ==================== PROFILE MANAGEMENT ====================

    function createProfile(
        string memory _ipfsHash,
        address _referrerAddress
    ) external nonReentrant {
        require(!hasProfile[msg.sender], "Profile already exists");
        require(bytes(_ipfsHash).length > 0, "IPFS hash cannot be empty");

        profiles[msg.sender] = Profile({
            userAddress: msg.sender,
            ipfsHash: _ipfsHash,
            referrerAddress: _referrerAddress,
            portfolioHashes: new string[](0)
        });
        hasProfile[msg.sender] = true;

        // Sync to NOWJC/Genesis directly — no bridge
        nowjc.createProfile(msg.sender, _ipfsHash, _referrerAddress);

        emit ProfileCreated(msg.sender, _ipfsHash, _referrerAddress);
    }

    function updateProfile(string memory _newIpfsHash) external nonReentrant {
        require(hasProfile[msg.sender], "Profile does not exist");
        require(bytes(_newIpfsHash).length > 0, "IPFS hash cannot be empty");

        profiles[msg.sender].ipfsHash = _newIpfsHash;
        nowjc.updateProfile(msg.sender, _newIpfsHash);

        emit ProfileUpdated(msg.sender, _newIpfsHash);
    }

    function addPortfolio(string memory _portfolioHash) external nonReentrant {
        require(hasProfile[msg.sender], "Profile does not exist");
        require(bytes(_portfolioHash).length > 0, "Portfolio hash cannot be empty");

        profiles[msg.sender].portfolioHashes.push(_portfolioHash);
        nowjc.addPortfolioItem(msg.sender, _portfolioHash);

        emit PortfolioAdded(msg.sender, _portfolioHash);
    }

    function getProfile(address _user) public view returns (Profile memory) {
        require(hasProfile[_user], "Profile does not exist");
        return profiles[_user];
    }

    // ==================== JOB MANAGEMENT ====================

    function postJob(
        string memory _jobDetailHash,
        string[] memory _descriptions,
        uint256[] memory _amounts
    ) external nonReentrant {
        require(_descriptions.length > 0, "Must have at least one milestone");
        require(_descriptions.length == _amounts.length, "Length mismatch");

        uint256 calculatedTotal = 0;
        for (uint i = 0; i < _amounts.length; i++) {
            calculatedTotal += _amounts[i];
        }
        require(calculatedTotal > 0, "Total must be > 0");

        // Job ID uses block.chainid — produces e.g. "42161-1" on Arb mainnet
        string memory jobId = string(
            abi.encodePacked(Strings.toString(block.chainid), "-", Strings.toString(++jobCounter))
        );

        Job storage newJob = jobs[jobId];
        newJob.id = jobId;
        newJob.jobGiver = msg.sender;
        newJob.jobDetailHash = _jobDetailHash;
        newJob.status = JobStatus.Open;

        for (uint i = 0; i < _descriptions.length; i++) {
            newJob.milestonePayments.push(MilestonePayment({
                descriptionHash: _descriptions[i],
                amount: _amounts[i]
            }));
        }

        // Direct call to NOWJC — no bridge, no LZ fee
        nowjc.postJob(jobId, msg.sender, _jobDetailHash, _descriptions, _amounts);

        emit JobPosted(jobId, msg.sender, _jobDetailHash);
        emit JobStatusChanged(jobId, JobStatus.Open);
    }

    function getJob(string memory _jobId) public view returns (Job memory) {
        require(bytes(jobs[_jobId].id).length != 0, "Job does not exist");
        return jobs[_jobId];
    }

    // ==================== APPLICATION MANAGEMENT ====================

    function applyToJob(
        string memory _jobId,
        string memory _appHash,
        string[] memory _descriptions,
        uint256[] memory _amounts,
        uint32 _preferredChainDomain
    ) external nonReentrant {
        require(hasProfile[msg.sender], "Must have profile to apply");
        require(_descriptions.length > 0, "Must propose at least one milestone");
        require(_descriptions.length == _amounts.length, "Length mismatch");

        uint256 appId = ++jobApplicationCounter[_jobId];

        Application storage newApp = jobApplications[_jobId][appId];
        newApp.id = appId;
        newApp.jobId = _jobId;
        newApp.applicant = msg.sender;
        newApp.applicationHash = _appHash;

        for (uint i = 0; i < _descriptions.length; i++) {
            newApp.proposedMilestones.push(MilestonePayment({
                descriptionHash: _descriptions[i],
                amount: _amounts[i]
            }));
        }

        nowjc.applyToJob(msg.sender, _jobId, _appHash, _descriptions, _amounts, _preferredChainDomain);

        emit JobApplication(_jobId, appId, msg.sender, _appHash);
    }

    function getApplication(string memory _jobId, uint256 _appId) public view returns (Application memory) {
        require(jobApplications[_jobId][_appId].id != 0, "Application does not exist");
        return jobApplications[_jobId][_appId];
    }

    // ==================== JOB STARTUP ====================

    function startDirectContract(
        address _jobTaker,
        string memory _jobDetailHash,
        string[] memory _descriptions,
        uint256[] memory _amounts,
        uint32 _jobTakerChainDomain
    ) external nonReentrant {
        require(_jobTaker != address(0), "Invalid job taker address");
        require(_descriptions.length > 0, "Must have at least one milestone");
        require(_descriptions.length == _amounts.length, "Length mismatch");

        uint256 calculatedTotal = 0;
        for (uint i = 0; i < _amounts.length; i++) {
            calculatedTotal += _amounts[i];
        }
        require(calculatedTotal > 0, "Total must be > 0");

        string memory jobId = string(
            abi.encodePacked(Strings.toString(block.chainid), "-", Strings.toString(++jobCounter))
        );

        Job storage newJob = jobs[jobId];
        newJob.id = jobId;
        newJob.jobGiver = msg.sender;
        newJob.jobDetailHash = _jobDetailHash;
        newJob.status = JobStatus.InProgress;
        newJob.selectedApplicant = _jobTaker;
        newJob.selectedApplicationId = 1;
        newJob.currentMilestone = 0;

        for (uint i = 0; i < _descriptions.length; i++) {
            newJob.milestonePayments.push(MilestonePayment({ descriptionHash: _descriptions[i], amount: _amounts[i] }));
            newJob.finalMilestones.push(MilestonePayment({ descriptionHash: _descriptions[i], amount: _amounts[i] }));
        }

        uint256 appId = ++jobApplicationCounter[jobId];
        Application storage newApp = jobApplications[jobId][appId];
        newApp.id = appId;
        newApp.jobId = jobId;
        newApp.applicant = _jobTaker;
        newApp.applicationHash = "direct-contract-auto-application";
        for (uint i = 0; i < _descriptions.length; i++) {
            newApp.proposedMilestones.push(MilestonePayment({ descriptionHash: _descriptions[i], amount: _amounts[i] }));
        }

        // Lock first milestone: transfer USDC from job giver directly to NOWJC
        uint256 firstAmount = _amounts[0];
        _sendFundsToNOWJC(jobId, firstAmount);
        newJob.currentLockedAmount = firstAmount;
        newJob.totalEscrowed += firstAmount;

        // Direct call — NOWJC handles genesis + state
        nowjc.handleStartDirectContract(
            msg.sender,
            _jobTaker,
            jobId,
            _jobDetailHash,
            _descriptions,
            _amounts,
            _jobTakerChainDomain
        );

        emit JobPosted(jobId, msg.sender, _jobDetailHash);
        emit JobApplication(jobId, appId, _jobTaker, "direct-contract-auto-application");
        emit JobStarted(jobId, appId, _jobTaker, false);
        emit JobStatusChanged(jobId, JobStatus.InProgress);
    }

    function startJob(
        string memory _jobId,
        uint256 _appId,
        bool _useAppMilestones
    ) external nonReentrant {
        require(bytes(jobs[_jobId].id).length != 0, "Job does not exist");

        Job storage job = jobs[_jobId];
        require(job.jobGiver == msg.sender, "Only job giver can start job");
        require(job.status == JobStatus.Open, "Job is not open");

        job.selectedApplicationId = _appId;
        job.status = JobStatus.InProgress;
        job.currentMilestone = 0;

        for (uint i = 0; i < job.milestonePayments.length; i++) {
            job.finalMilestones.push(job.milestonePayments[i]);
        }

        uint256 firstAmount = job.finalMilestones[0].amount;
        _sendFundsToNOWJC(_jobId, firstAmount);
        job.currentLockedAmount = firstAmount;
        job.totalEscrowed += firstAmount;

        nowjc.startJob(msg.sender, _jobId, _appId, _useAppMilestones);

        emit JobStarted(_jobId, _appId, address(0), _useAppMilestones);
        emit JobStatusChanged(_jobId, JobStatus.InProgress);
    }

    // ==================== WORK SUBMISSION ====================

    function submitWork(
        string memory _jobId,
        string memory _submissionHash
    ) external nonReentrant {
        require(
            jobs[_jobId].currentMilestone <= jobs[_jobId].finalMilestones.length,
            "All milestones completed"
        );

        jobs[_jobId].workSubmissions.push(_submissionHash);
        nowjc.submitWork(msg.sender, _jobId, _submissionHash);

        emit WorkSubmitted(_jobId, msg.sender, _submissionHash, jobs[_jobId].currentMilestone);
    }

    // ==================== PAYMENT FUNCTIONS ====================

    /**
     * @dev Release current milestone payment.
     * Calls the unified NOWJC.releasePayment() which auto-routes:
     *   - applicant on Arb  →  direct safeTransfer
     *   - applicant on OP/Base/etc  →  CCTP sendFast
     * The job giver does NOT need to specify an amount or target chain — NOWJC reads
     * it from Genesis and routes based on the applicant's registered chain preference.
     */
    function releasePayment(string memory _jobId) external nonReentrant {
        Job storage job = jobs[_jobId];
        require(bytes(job.id).length != 0, "Job does not exist");
        require(job.jobGiver == msg.sender, "Only job giver can release payment");
        require(job.status == JobStatus.InProgress, "Job must be in progress");
        require(job.currentLockedAmount > 0, "No payment locked");

        uint256 amount = job.currentLockedAmount;

        job.totalPaid += amount;
        job.totalReleased += amount;
        job.currentLockedAmount = 0;
        totalPlatformPayments += amount;

        if (job.currentMilestone >= job.finalMilestones.length) {
            job.status = JobStatus.Completed;
            emit JobStatusChanged(_jobId, JobStatus.Completed);
        }

        // NOWJC reads amount from genesis and routes payment autonomously
        nowjc.releasePayment(_jobId);

        emit PaymentReleased(_jobId, msg.sender, job.selectedApplicant, amount, job.currentMilestone);
        emit PlatformTotalUpdated(totalPlatformPayments);
    }

    /**
     * @dev Lock the next milestone's USDC into NOWJC.
     */
    function lockNextMilestone(string memory _jobId) external nonReentrant {
        Job storage job = jobs[_jobId];
        require(bytes(job.id).length != 0, "Job does not exist");
        require(job.jobGiver == msg.sender, "Only job giver");
        require(job.status == JobStatus.InProgress, "Job must be in progress");
        require(job.currentLockedAmount == 0, "Previous payment not released");
        require(job.currentMilestone < job.finalMilestones.length, "All milestones completed");

        job.currentMilestone += 1;
        uint256 nextAmount = job.finalMilestones[job.currentMilestone - 1].amount;

        _sendFundsToNOWJC(_jobId, nextAmount);
        job.currentLockedAmount = nextAmount;
        job.totalEscrowed += nextAmount;

        nowjc.lockNextMilestone(msg.sender, _jobId, nextAmount);

        emit MilestoneLocked(_jobId, job.currentMilestone, nextAmount);
    }

    /**
     * @dev Release current milestone and lock the next one in a single transaction.
     * Transfers the next milestone's USDC from job giver to NOWJC, then triggers release + lock.
     */
    function releaseAndLockNext(string memory _jobId) external nonReentrant {
        Job storage job = jobs[_jobId];
        require(bytes(job.id).length != 0, "Job does not exist");
        require(job.jobGiver == msg.sender, "Only job giver");
        require(job.status == JobStatus.InProgress, "Job must be in progress");
        require(job.currentLockedAmount > 0, "No payment locked");
        require(job.currentMilestone <= job.finalMilestones.length, "All milestones completed");

        uint256 releaseAmount = job.currentLockedAmount;
        job.totalPaid += releaseAmount;
        job.totalReleased += releaseAmount;
        totalPlatformPayments += releaseAmount;

        job.currentMilestone += 1;

        uint256 nextAmount = 0;
        if (job.currentMilestone <= job.finalMilestones.length) {
            nextAmount = job.finalMilestones[job.currentMilestone - 1].amount;
            _sendFundsToNOWJC(_jobId, nextAmount);
            job.currentLockedAmount = nextAmount;
            job.totalEscrowed += nextAmount;
        } else {
            job.currentLockedAmount = 0;
            job.status = JobStatus.Completed;
            emit JobStatusChanged(_jobId, JobStatus.Completed);
        }

        nowjc.releasePaymentAndLockNext(msg.sender, _jobId, releaseAmount, nextAmount);

        emit PaymentReleasedAndNextMilestoneLocked(_jobId, releaseAmount, nextAmount, job.currentMilestone);
        emit PlatformTotalUpdated(totalPlatformPayments);
    }

    // ==================== RATING ====================

    function rate(
        string memory _jobId,
        address _userToRate,
        uint256 _rating
    ) external nonReentrant {
        Job storage job = jobs[_jobId];
        require(bytes(job.id).length != 0, "Job does not exist");
        require(
            job.status == JobStatus.InProgress || job.status == JobStatus.Completed,
            "Job must be started"
        );
        require(_rating >= 1 && _rating <= 5, "Rating must be 1-5");
        require(jobRatings[_jobId][_userToRate] == 0, "Already rated");

        bool isAuth = (msg.sender == job.jobGiver && _userToRate == job.selectedApplicant) ||
                      (msg.sender == job.selectedApplicant && _userToRate == job.jobGiver);
        require(isAuth, "Not authorized to rate");

        jobRatings[_jobId][_userToRate] = _rating;
        userRatings[_userToRate].push(_rating);

        nowjc.rate(msg.sender, _jobId, _userToRate, _rating);

        emit UserRated(_jobId, msg.sender, _userToRate, _rating);
    }

    function getRating(address _user) public view returns (uint256) {
        uint256[] memory ratings = userRatings[_user];
        if (ratings.length == 0) return 0;
        uint256 total = 0;
        for (uint i = 0; i < ratings.length; i++) { total += ratings[i]; }
        return total / ratings.length;
    }

    // ==================== DISPUTE RESOLUTION ====================

    function resolveDispute(string memory _jobId, bool _jobGiverWins) external {
        require(msg.sender == athenaClientContract, "Only Athena Client");

        Job storage job = jobs[_jobId];
        require(bytes(job.id).length != 0, "Job does not exist");
        require(job.status == JobStatus.InProgress, "Job must be in progress");
        require(job.currentLockedAmount > 0, "No funds escrowed");

        address winner = _jobGiverWins ? job.jobGiver : job.selectedApplicant;
        uint256 amount = job.currentLockedAmount;

        if (!_jobGiverWins) {
            totalPlatformPayments += amount;
            job.totalPaid += amount;
            emit PlatformTotalUpdated(totalPlatformPayments);
        }

        job.currentLockedAmount = 0;
        job.totalReleased += amount;
        job.status = JobStatus.Completed;

        emit DisputeResolved(_jobId, _jobGiverWins, winner, amount);
        emit JobStatusChanged(_jobId, JobStatus.Completed);
    }

    // ==================== VIEW FUNCTIONS ====================

    function getJobCount() external view returns (uint256) { return jobCounter; }
    function getJobApplicationCount(string memory _jobId) external view returns (uint256) { return jobApplicationCounter[_jobId]; }
    function isJobOpen(string memory _jobId) external view returns (bool) {
        require(bytes(jobs[_jobId].id).length != 0, "Job does not exist");
        return jobs[_jobId].status == JobStatus.Open;
    }
    function getJobStatus(string memory _jobId) external view returns (JobStatus) {
        require(bytes(jobs[_jobId].id).length != 0, "Job does not exist");
        return jobs[_jobId].status;
    }
    function getEscrowBalance(string memory _jobId) external view returns (uint256 escrowed, uint256 released, uint256 remaining) {
        Job storage job = jobs[_jobId];
        require(bytes(job.id).length != 0, "Job does not exist");
        escrowed = job.totalEscrowed;
        released = job.totalReleased;
        remaining = escrowed - released;
    }
    function getTotalPlatformPayments() external view returns (uint256) { return totalPlatformPayments; }

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
