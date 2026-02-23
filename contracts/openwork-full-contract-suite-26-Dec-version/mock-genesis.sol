// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

/**
 * @title MockGenesis
 * @notice Minimal Genesis stub for testnet E2E testing.
 * Stores only the job + application state needed by NOWJC-v2.
 * NOT for production — use the real OpenworkGenesis on mainnet.
 */

import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import { UUPSUpgradeable } from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract MockGenesis is Initializable, UUPSUpgradeable {

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
        uint256 currentMilestone;
        address selectedApplicant;
        uint256 selectedApplicationId;
    }

    struct Application {
        uint256 id;
        string jobId;
        address applicant;
        string applicationHash;
        MilestonePayment[] proposedMilestones;
    }

    address public owner;
    mapping(address => bool) public authorizedContracts;

    mapping(string => Job) private _jobs;
    mapping(string => bool) private _jobExists;
    mapping(string => uint256) private _jobAppCount;
    mapping(string => mapping(uint256 => Application)) private _applications;

    uint256 public totalPlatformPayments;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize(address _owner) public initializer {
        __UUPSUpgradeable_init();
        owner = _owner;
        authorizedContracts[_owner] = true;
    }

    function _authorizeUpgrade(address) internal view override {
        require(msg.sender == owner, "Not owner");
    }

    modifier onlyAuthorized() {
        require(authorizedContracts[msg.sender] || msg.sender == owner, "Not authorized");
        _;
    }

    function authorizeContract(address _contract, bool _authorized) external {
        require(msg.sender == owner, "Not owner");
        authorizedContracts[_contract] = _authorized;
    }

    function setJob(
        string memory jobId,
        address jobGiver,
        string memory detailHash,
        string[] memory descs,
        uint256[] memory amounts
    ) external onlyAuthorized {
        Job storage j = _jobs[jobId];
        j.id = jobId;
        j.jobGiver = jobGiver;
        j.jobDetailHash = detailHash;
        j.status = JobStatus.Open;
        delete j.milestonePayments;
        for (uint i = 0; i < descs.length; i++) {
            j.milestonePayments.push(MilestonePayment(descs[i], amounts[i]));
        }
        _jobExists[jobId] = true;
    }

    function addJobApplicant(string memory jobId, address applicant) external onlyAuthorized {
        _jobs[jobId].applicants.push(applicant);
    }

    function setJobApplication(
        string memory jobId,
        uint256 appId,
        address applicant,
        string memory appHash,
        string[] memory descs,
        uint256[] memory amounts,
        uint32 /* domain */,
        address /* _extra */
    ) external onlyAuthorized {
        Application storage a = _applications[jobId][appId];
        a.id = appId;
        a.jobId = jobId;
        a.applicant = applicant;
        a.applicationHash = appHash;
        delete a.proposedMilestones;
        for (uint i = 0; i < descs.length; i++) {
            a.proposedMilestones.push(MilestonePayment(descs[i], amounts[i]));
        }
        if (appId > _jobAppCount[jobId]) _jobAppCount[jobId] = appId;
    }

    function setJobSelectedApplicant(string memory jobId, address applicant, uint256 appId) external onlyAuthorized {
        _jobs[jobId].selectedApplicant = applicant;
        _jobs[jobId].selectedApplicationId = appId;
    }

    function updateJobStatus(string memory jobId, JobStatus status) external onlyAuthorized {
        _jobs[jobId].status = status;
    }

    function setJobCurrentMilestone(string memory jobId, uint256 milestone) external onlyAuthorized {
        _jobs[jobId].currentMilestone = milestone;
    }

    function addJobFinalMilestone(string memory jobId, string memory desc, uint256 amount) external onlyAuthorized {
        _jobs[jobId].finalMilestones.push(MilestonePayment(desc, amount));
    }

    function addWorkSubmission(string memory jobId, string memory hash) external onlyAuthorized {
        _jobs[jobId].workSubmissions.push(hash);
    }

    function updateJobTotalPaid(string memory jobId, uint256 amount) external onlyAuthorized {
        _jobs[jobId].totalPaid += amount;
        totalPlatformPayments += amount;
    }

    function getJob(string memory jobId) external view returns (Job memory) {
        return _jobs[jobId];
    }

    function getJobApplication(string memory jobId, uint256 appId) external view returns (Application memory) {
        return _applications[jobId][appId];
    }

    function jobExists(string memory jobId) external view returns (bool) {
        return _jobExists[jobId];
    }

    function getJobApplicationCount(string memory jobId) external view returns (uint256) {
        return _jobAppCount[jobId];
    }

    // Stub reward functions (no-ops for testnet)
    function incrementUserGovernanceActions(address) external onlyAuthorized {}
    function updateUserClaimData(address, uint256) external onlyAuthorized {}
    function getUserGovernanceActions(address) external pure returns (uint256) { return 0; }
    function getUserGovernanceActionsInBand(address, uint256) external pure returns (uint256) { return 0; }
    function getUserEarnedTokens(address) external pure returns (uint256) { return 0; }
    function getUserRewardInfo(address) external pure returns (uint256, uint256) { return (0, 0); }
    function setJobRating(string memory, address, uint256) external onlyAuthorized {}
    function addPortfolio(address, string memory) external onlyAuthorized {}
    function getProfile(address) external pure returns (
        address userAddress, string memory ipfsHash, address referrerAddress, string[] memory portfolioHashes
    ) {
        string[] memory empty = new string[](0);
        return (address(0), "", address(0), empty);
    }
    function hasProfile(address) external pure returns (bool) { return false; }
}
