# Oracle Membership & Voting Specification

## Overview
This document specifies how oracle members are added and how voting works differently for ACTIVE vs INACTIVE skill oracles in the OpenWork system.

---

## Key Definitions

### Active Oracle
An oracle with **20 or more active members** (configurable via `minOracleMembers` parameter, currently defaulted to 3 but should be 20).

### Inactive Oracle
An oracle with **fewer than 20 active members**.

### Active Member
A member who has performed governance or work actions within a specified timeframe. ⚠️ **NOT YET IMPLEMENTED** - Currently, all members in the oracle's member array are considered active.

### Skill Verification
The process where an applicant pays a fee and submits an application to prove they possess a particular skill. Oracle members (if active) or DAO members (if inactive) vote on whether the applicant truly has the skill.

### Eligibility to Join Oracle
Requirements to apply for oracle membership:
1. Has 100k+ staked tokens OR 100k+ earned tokens
2. Is skill-verified for that oracle's skill

---

## Current Implementation Status

### ✅ Currently Implemented

1. **Voting Eligibility Check** (`canVote()` function)
   - Anyone with 100k+ staked OR 100k+ earned tokens can vote
   - Located in: `native-athena.sol`

2. **Oracle Creation** 
   - DAO can create oracles through proposals
   - Oracle Manager handles the actual creation

3. **Member Addition**
   - DAO proposals can add members to ANY oracle
   - Members must meet 100k stake/earned token requirement
   - Function: `addMembers()` with `onlyDAO` modifier

4. **Skill Verification Process**
   - Applicants can submit skill verification applications
   - Anyone with voting eligibility can vote
   - Winning voters receive fee distribution

### ❌ NOT Yet Implemented

1. **Active Member Tracking**
   - No mechanism to determine if a member is "active"
   - No tracking of last governance or work activity
   - All members in the array are treated as active

2. **Oracle-Specific Voting for Active Oracles**
   - Currently, ANY DAO member can vote on membership for ANY oracle
   - Should be: Only oracle members vote when oracle is active (20+ members)

3. **Restricted Skill Verification Voting**
   - Currently, ANY eligible voter can vote on skill verification
   - Should be: Only oracle members vote when oracle is active

4. **Automatic Role Transition at 20 Members**
   - No logic to automatically change voting rules when oracle reaches 20 active members

---

## Required Implementation: Active vs Inactive Oracle Voting

### Scenario 1: INACTIVE Oracle (<20 Active Members)

#### Adding New Members to Inactive Oracle

**Current Flow (✅ Working):**
```
1. Applicant stakes 100k tokens (if not already staked)
2. Applicant applies for skill verification
3. ALL DAO members (100k+ staked/earned) can vote on skill verification
4. If approved → Applicant added to oracle's skillVerifiedAddresses
5. DAO member creates proposal to add applicant to oracle
6. ALL DAO members vote on membership proposal
7. If approved → Anyone calls execute() → Member added to oracle
```

**Who Can Vote:**
- ✅ Any address with 100k+ staked OR earned tokens
- ✅ Voting power = (stakeAmount × stakeDuration) + earnedTokens

---

### Scenario 2: ACTIVE Oracle (20+ Active Members)

#### Adding New Members to Active Oracle

**Required Flow (❌ NOT IMPLEMENTED):**
```
1. Applicant stakes 100k tokens (if not already staked)
2. Applicant applies for skill verification
3. ONLY ORACLE MEMBERS can vote on skill verification ⚠️ NEW
4. If approved → Applicant added to oracle's skillVerifiedAddresses
5. Oracle member creates proposal to add applicant to oracle ⚠️ NEW
6. ONLY ORACLE MEMBERS vote on membership proposal ⚠️ NEW
7. If approved → Anyone calls execute() → Member added to oracle
```

**Who Can Vote:**
- ⚠️ NEW: Only members of that specific oracle
- ✅ Must still meet 100k+ stake/earned requirement
- ✅ Same voting power calculation

---

## Technical Implementation Requirements

### 1. Oracle Status Check Function

**Need to Add:**
```solidity
function isOracleActive(string memory _oracleName) public view returns (bool) {
    IOpenworkGenesis.Oracle memory oracle = genesis.getOracle(_oracleName);
    
    // TODO: Count ACTIVE members, not just total members
    // Currently: oracle.members.length
    // Should: count members with recent activity
    
    return oracle.members.length >= minOracleMembers;
}
```

### 2. Oracle Member Check Function

**Need to Add:**
```solidity
function isOracleMember(address _account, string memory _oracleName) public view returns (bool) {
    address[] memory members = genesis.getOracleMembers(_oracleName);
    for (uint256 i = 0; i < members.length; i++) {
        if (members[i] == _account) {
            return true;
        }
    }
    return false;
}
```

### 3. Modified Voting Eligibility for Skill Verification

**Current Code** (`_voteOnSkillVerification` in native-athena.sol):
```solidity
function _voteOnSkillVerification(
    string memory _disputeId, 
    bool _voteFor, 
    address /* _claimAddress */, 
    uint256 voteWeight
) internal {
    uint256 applicationId = stringToUint(_disputeId);
    IOpenworkGenesis.SkillVerificationApplication memory application = genesis.getSkillApplication(applicationId);
    
    // Current: No oracle-specific check
    genesis.setSkillApplicationVote(applicationId, msg.sender);
    // ... rest of voting logic
}
```

**Required Modification:**
```solidity
function _voteOnSkillVerification(
    string memory _disputeId, 
    bool _voteFor, 
    address /* _claimAddress */, 
    uint256 voteWeight
) internal {
    uint256 applicationId = stringToUint(_disputeId);
    IOpenworkGenesis.SkillVerificationApplication memory application = genesis.getSkillApplication(applicationId);
    
    // NEW: Check if oracle is active
    if (isOracleActive(application.targetOracleName)) {
        // Oracle is active - only oracle members can vote
        require(
            isOracleMember(msg.sender, application.targetOracleName),
            "Only oracle members can vote on active oracle skill verification"
        );
    }
    // If oracle is inactive, existing canVote() check is sufficient
    
    genesis.setSkillApplicationVote(applicationId, msg.sender);
    // ... rest of voting logic
}
```

### 4. Modified addMembers Function

**Current Code** (native-athena.sol):
```solidity
function addMembers(address[] memory _members, string memory _oracleName) external onlyDAO {
    require(address(oracleManager) != address(0), "Oracle manager not set");
    oracleManager.addMembers(_members, _oracleName);
}
```

**Issue:** The `onlyDAO` modifier means ONLY the DAO contract itself can call this. This works for DAO proposals but doesn't distinguish between active/inactive oracles.

**Solution Options:**

#### Option A: Modified Governance Proposal System
Create oracle-specific proposals that route to oracle members when oracle is active:
- Requires changes to DAO contract to support oracle-specific voting
- Complex but most aligned with decentralized governance

#### Option B: Dual Function Approach (Simpler)
```solidity
// For inactive oracles - called by DAO
function addMembers(address[] memory _members, string memory _oracleName) 
    external onlyDAO 
{
    require(address(oracleManager) != address(0), "Oracle manager not set");
    require(!isOracleActive(_oracleName), "Use oracle voting for active oracles");
    oracleManager.addMembers(_members, _oracleName);
}

// For active oracles - separate voting mechanism
function addMembersActiveOracle(address[] memory _members, string memory _oracleName)
    external
{
    require(isOracleActive(_oracleName), "Oracle must be active");
    require(isOracleMember(msg.sender, _oracleName), "Only oracle members can propose");
    
    // Create oracle-specific proposal
    // Oracle members vote
    // Execute if passed
}
```

---

## Active Member Definition (To Be Implemented)

### Proposed Tracking Mechanism

**Storage Needed in Genesis:**
```solidity
mapping(string => mapping(address => uint256)) public oracleMemberLastActivity;
```

**Activity Types to Track:**
1. Voting on skill verification for their oracle
2. Voting on member addition proposals for their oracle
3. Completing work as an oracle member
4. Participating in dispute resolution

**Active Definition:**
- Last activity within X days (e.g., 30 days)
- Configurable threshold via governance

**Implementation Functions:**
```solidity
function updateMemberActivity(string memory _oracleName, address _member) internal {
    oracleMemberLastActivity[_oracleName][_member] = block.timestamp;
}

function isMemberActive(string memory _oracleName, address _member) 
    public view returns (bool) 
{
    uint256 lastActivity = oracleMemberLastActivity[_oracleName][_member];
    uint256 activityThreshold = 30 days; // Configurable
    return (block.timestamp - lastActivity) <= activityThreshold;
}

function getActiveMemb erCount(string memory _oracleName) 
    public view returns (uint256) 
{
    address[] memory members = genesis.getOracleMembers(_oracleName);
    uint256 activeCount = 0;
    for (uint256 i = 0; i < members.length; i++) {
        if (isMemberActive(_oracleName, members[i])) {
            activeCount++;
        }
    }
    return activeCount;
}
```

---

## Complete Flow Diagrams

### Flow A: Joining an Inactive Oracle

```
┌─────────────────────────────────────────────────────────────────┐
│                    INACTIVE ORACLE FLOW                         │
│                    (< 20 Active Members)                        │
└─────────────────────────────────────────────────────────────────┘

Aspiring Member
      │
      ├─ Check: Has 100k staked/earned?
      │    ├─ No → Stake 100k tokens first
      │    └─ Yes → Continue
      │
      ├─ Submit Skill Verification Application (pay fee)
      │
      ├─ ALL DAO Members (100k+) vote on skill
      │    ├─ Vote on: Does this person have the skill?
      │    └─ Voting power: (stake × duration) + earned tokens
      │
      ├─ Voting period ends → Finalize
      │    ├─ More votes FOR → Approved
      │    │    └─ Added to oracle.skillVerifiedAddresses[]
      │    └─ More votes AGAINST → Rejected
      │
      ├─ If Approved: DAO member creates membership proposal
      │
      ├─ ALL DAO Members vote on membership
      │    └─ Voting power: Same formula
      │
      ├─ If proposal passes:
      │    └─ Anyone (typically the applicant) calls execute()
      │         └─ Member added to oracle.members[]
      │
      └─ Check: Did oracle reach 20 active members?
           └─ Yes → Oracle becomes ACTIVE
```

### Flow B: Joining an Active Oracle

```
┌─────────────────────────────────────────────────────────────────┐
│                     ACTIVE ORACLE FLOW                          │
│                    (20+ Active Members)                         │
└─────────────────────────────────────────────────────────────────┘

Aspiring Member
      │
      ├─ Check: Has 100k staked/earned?
      │    ├─ No → Stake 100k tokens first
      │    └─ Yes → Continue
      │
      ├─ Submit Skill Verification Application (pay fee)
      │
      ├─ ONLY ORACLE MEMBERS vote on skill ⚠️ KEY DIFFERENCE
      │    ├─ Voter must be member of THIS oracle
      │    ├─ Voter must still meet 100k requirement
      │    └─ Voting power: (stake × duration) + earned tokens
      │
      ├─ Voting period ends → Finalize
      │    ├─ More votes FOR → Approved
      │    │    └─ Added to oracle.skillVerifiedAddresses[]
      │    └─ More votes AGAINST → Rejected
      │
      ├─ If Approved: Oracle member creates membership proposal
      │
      ├─ ONLY ORACLE MEMBERS vote on membership ⚠️ KEY DIFFERENCE
      │    ├─ Only members of THIS oracle can vote
      │    └─ Voting power: Same formula
      │
      ├─ If proposal passes:
      │    └─ Anyone (typically the applicant) calls execute()
      │         └─ Member added to oracle.members[]
      │
      └─ Oracle remains ACTIVE (still 20+ active members)
```

---

## Edge Cases & Considerations

### 1. Oracle Dropping Below 20 Active Members
**Scenario:** Oracle has 25 total members, but only 18 are active.

**Current Behavior:** Oracle is still considered active (counts all members)

**Intended Behavior:** Should revert to DAO voting when active count < 20

**Implementation:** Requires active member tracking

### 2. First 20 Members Skill Verification
**Problem:** Skill verification requires an active oracle, but oracle isn't active until 20 members.

**Solution (from conversation):** DAO should verify skills of first 20 members as well, not just add them directly.

**Implementation:**
- All members, including first 20, must go through skill verification
- For first 19 members: DAO votes on skill verification
- At 20th member: Oracle becomes active
- From 21st member onwards: Oracle members vote

### 3. Inactive Member Removal
**Scenario:** Member hasn't participated in 6 months.

**Current:** No mechanism to remove inactive members

**Proposed:** 
- DAO or oracle members can propose removal of inactive members
- If member count drops below 20 after removal, oracle becomes inactive

### 4. Oracle-Specific vs General DAO Proposals
**Challenge:** Current Governor pattern (OpenZeppelin) is designed for general DAO voting, not oracle-specific voting.

**Solutions:**
- Option A: Create separate proposal system for oracle-specific decisions
- Option B: Extend Governor with custom voting modules
- Option C: Use off-chain signatures for oracle voting, on-chain execution

---

## Summary of Required Changes

### High Priority (Core Functionality)
1. ✅ Implement `isOracleActive()` function
2. ✅ Implement `isOracleMember()` function
3. ✅ Modify `_voteOnSkillVerification()` to check oracle status
4. ✅ Create oracle-specific member addition mechanism
5. ✅ Implement active member tracking

### Medium Priority (Governance)
1. Extend DAO contract to support oracle-specific proposals
2. Create proposal types for oracle-specific decisions
3. Implement voting delegation within oracles

### Low Priority (Enhancements)
1. Automatic oracle status updates
2. Member inactivity warnings
3. Historical oracle activity tracking
4. Oracle performance metrics

---

## Contract Locations

- **Native Athena**: `contracts/openwork-full-contract-suite-layerzero+CCTP 2 Nov/native-athena.sol`
- **Native Athena Oracle Manager**: `contracts/openwork-full-contract-suite-layerzero+CCTP 2 Nov/native-athena-oracle-manager.sol`
- **Native DAO**: `contracts/openwork-full-contract-suite-layerzero+CCTP 2 Nov/native-dao.sol`
- **Genesis (Storage)**: Reference via IOpenworkGenesis interface

---

## Next Steps

1. **Review & Approve** this specification with stakeholders
2. **Design** the oracle-specific governance mechanism
3. **Implement** active member tracking
4. **Test** transition from inactive to active oracle
5. **Deploy** and monitor first oracle reaching 20 members
6. **Iterate** based on real-world usage

---

*Document Version: 1.0*  
*Last Updated: November 8, 2025*  
*Status: Specification - Awaiting Implementation*
