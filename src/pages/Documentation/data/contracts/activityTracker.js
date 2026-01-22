export const activityTracker = {
  id: 'activityTracker',
  name: 'Activity Tracker',
  chain: 'l2',
  column: 'l2-left',
  order: 4,
  status: 'mainnet-ready',
  version: 'v1.0.0',
  gas: '35K',
  mainnetNetwork: 'Arbitrum One',
  testnetNetwork: 'Arbitrum Sepolia',
  mainnetDeployed: 'Not deployed',
  testnetDeployed: 'Not deployed',
  mainnetAddress: null,
  testnetAddress: null,
  isUUPS: true,
  implementationAddress: null,
  tvl: 'N/A',
  docs: 'Activity Tracker - Tracks oracle member activity and oracle active status. Separated from Genesis due to contract size limits (EIP-170: 24KB). Enables 90-day activity threshold for oracle eligibility.',

  overview: {
    purpose: 'Activity Tracker is a dedicated contract for tracking oracle member participation and oracle active status. It was separated from OpenworkGenesis due to Ethereum\'s contract size limit (EIP-170: 24KB). The contract maintains timestamps of when each oracle member last participated in governance (voting, proposing) and determines whether oracles have enough active members to handle disputes. This ensures disputes are routed only to engaged oracles with recent participation.',
    tier: 'Native Chain (Arbitrum)',
    category: 'Oracle Infrastructure',
    upgradeability: 'UUPS Upgradeable (admin only)'
  },

  features: [
    'Member activity tracking: Records last participation timestamp for each oracle member',
    '90-day activity threshold: Members must participate within 90 days to count as active',
    'Oracle active status: Tracks whether each oracle has sufficient active members',
    'Batch operations: updateMemberActivities() and initializeMemberActivities() for gas efficiency',
    'Authorized caller system: Only NativeAthena, NativeDAO, and OracleManager can update',
    'Emergency overrides: Owner can manually set activity timestamps for corrections',
    'View functions: getMemberActivities() returns multiple timestamps in one call',
    'Separated from Genesis: Due to EIP-170 24KB contract size limit',
    'UUPS Upgradeable: Admin-controlled upgrades for future improvements'
  ],

  systemPosition: {
    description: 'Activity Tracker sits alongside the oracle management system on Arbitrum. When oracle members vote in NativeAthena or participate in governance via NativeDAO, their activity timestamp is updated here. When OracleManager adds new members to oracles, their initial activity is set. NativeAthena queries this contract to determine if oracles are active before routing disputes. This ensures the dispute resolution system remains responsive and engaged.',
    diagram: `
📍 Activity Tracker in Oracle System

┌─────────────────────────────────────────────────────────┐
│  NATIVE CHAIN (Arbitrum) - Oracle Infrastructure        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Native Athena ──> updateMemberActivity()               │
│       │              (on voting)                         │
│       v                                                  │
│  ⭐ Activity Tracker ⭐ (YOU ARE HERE)                  │
│       ↑              ↓                                   │
│       │         getMemberActivities()                   │
│       │              (check active members)             │
│  Native DAO ──> updateMemberActivity()                  │
│       │              (on governance)                     │
│       │                                                  │
│  Oracle Manager ──> initializeMemberActivity()          │
│                        (on member addition)             │
│                                                          │
└─────────────────────────────────────────────────────────┘
`
  },

  dependencies: {
    dependsOn: [],
    requiredBy: ['nativeAthena', 'nativeDAO', 'oracleManager'],
    prerequisites: ['Deploy before NativeAthena, NativeDAO, OracleManager', 'Set as authorized caller on each contract']
  },

  functions: [
    {
      category: 'Authorized Functions',
      description: 'Functions callable only by authorized contracts (NativeAthena, NativeDAO, OracleManager)',
      items: [
        {
          name: 'updateMemberActivity',
          signature: 'updateMemberActivity(address member)',
          whatItDoes: 'Updates a member\'s last activity timestamp to the current block time.',
          whyUse: 'Called when oracle members vote or participate in governance to record their engagement.',
          howItWorks: [
            'Checks caller is authorized or owner',
            'Sets memberLastActivity[member] = block.timestamp',
            'Emits MemberActivityUpdated event'
          ],
          parameters: [
            { name: 'member', type: 'address', description: 'Address of the oracle member' }
          ],
          accessControl: 'Authorized callers only (NativeAthena, NativeDAO, OracleManager)',
          events: ['MemberActivityUpdated(member, timestamp)'],
          gasEstimate: '~25K gas'
        },
        {
          name: 'setOracleActiveStatus',
          signature: 'setOracleActiveStatus(string oracleName, bool isActive)',
          whatItDoes: 'Sets whether an oracle is considered active based on member participation.',
          whyUse: 'NativeAthena calls this after counting active members to mark oracles as eligible for disputes.',
          howItWorks: [
            'Checks caller is authorized',
            'Sets oracleActiveStatus[oracleName] = isActive',
            'Emits OracleActiveStatusUpdated event'
          ],
          parameters: [
            { name: 'oracleName', type: 'string', description: 'Name of the oracle' },
            { name: 'isActive', type: 'bool', description: 'Whether oracle has enough active members' }
          ],
          accessControl: 'Authorized callers only (NativeAthena)',
          events: ['OracleActiveStatusUpdated(oracleName, isActive)'],
          gasEstimate: '~30K gas'
        }
      ]
    },
    {
      category: 'Admin Functions',
      description: 'Owner-only functions for managing authorized callers and admins',
      items: [
        {
          name: 'setAuthorizedCaller',
          signature: 'setAuthorizedCaller(address caller, bool authorized)',
          whatItDoes: 'Adds or removes an address from the authorized callers list.',
          whyUse: 'Owner uses this to authorize NativeAthena, NativeDAO, and OracleManager to update activity data.',
          howItWorks: [
            'Requires caller to be owner',
            'Sets authorizedCallers[caller] = authorized',
            'Emits AuthorizedCallerUpdated event'
          ],
          parameters: [
            { name: 'caller', type: 'address', description: 'Address to authorize or deauthorize' },
            { name: 'authorized', type: 'bool', description: 'True to authorize, false to revoke' }
          ],
          accessControl: 'Owner only',
          events: ['AuthorizedCallerUpdated(caller, authorized)'],
          gasEstimate: '~25K gas'
        }
      ]
    },
    {
      category: 'View Functions',
      description: 'Read-only functions to query activity data',
      items: [
        {
          name: 'getMemberActivities',
          signature: 'getMemberActivities(address[] members) returns (uint256[])',
          whatItDoes: 'Returns activity timestamps for multiple members in a single call.',
          whyUse: 'Gas-efficient way to check activity status of all oracle members at once.',
          howItWorks: [
            'Iterates through members array',
            'Reads memberLastActivity for each',
            'Returns array of timestamps'
          ],
          parameters: [
            { name: 'members', type: 'address[]', description: 'Array of member addresses to query' }
          ],
          accessControl: 'Public view function',
          gasEstimate: '~2K gas per member'
        }
      ]
    }
  ],

  securityConsiderations: [
    'UUPS upgradeable - admin only can upgrade implementation',
    'Authorized caller pattern prevents unauthorized activity updates',
    'Owner can override activity data for corrections/bootstrapping',
    'Separated from Genesis to avoid 24KB contract size limit',
    '90-day activity threshold ensures oracle engagement',
    'NativeDAO integration allows governance-based admin management'
  ],

  code: `// Full implementation: contracts/mainnet-ready/native/native-athena-activity-tracker.sol

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import { UUPSUpgradeable } from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import { OwnableUpgradeable } from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

/**
 * @title ActivityTracker
 * @notice Tracks oracle member activity and oracle active status
 * @dev Separated from Genesis due to contract size limits (EIP-170: 24KB)
 */
contract NativeAthenaActivityTracker is Initializable, OwnableUpgradeable, UUPSUpgradeable {

    // Timestamp of last activity for each oracle member
    mapping(address => uint256) public memberLastActivity;

    // Whether each oracle is considered "active" (has enough active members)
    mapping(string => bool) public oracleActiveStatus;

    // Addresses authorized to update activity data
    mapping(address => bool) public authorizedCallers;

    // Admin addresses for upgrades
    mapping(address => bool) public admins;

    modifier onlyAuthorized() {
        require(authorizedCallers[msg.sender] || msg.sender == owner(), "Not authorized");
        _;
    }

    function initialize(address _owner) public initializer {
        __Ownable_init(_owner);
        __UUPSUpgradeable_init();
        admins[_owner] = true;
    }

    function updateMemberActivity(address member) external onlyAuthorized {
        memberLastActivity[member] = block.timestamp;
        emit MemberActivityUpdated(member, block.timestamp);
    }

    function setOracleActiveStatus(string memory oracleName, bool isActive) external onlyAuthorized {
        oracleActiveStatus[oracleName] = isActive;
        emit OracleActiveStatusUpdated(oracleName, isActive);
    }

    function getMemberActivities(address[] calldata members) external view returns (uint256[] memory) {
        uint256[] memory timestamps = new uint256[](members.length);
        for (uint256 i = 0; i < members.length; i++) {
            timestamps[i] = memberLastActivity[members[i]];
        }
        return timestamps;
    }

    // See full implementation in contracts/mainnet-ready/native/native-athena-activity-tracker.sol
}`
};
