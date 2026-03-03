# OpenWork UI Audit

**Status:** 🔴 In Progress — Collecting errors  
**Last updated:** 2026-03-03  
**Auditor:** OpenSonnet (automated no-wallet pass) + Anas (wallet-required flows)  
**Goal:** Document all visible UI issues before fixing anything

---

## Heuristic — What counts as an issue?

An issue is flagged if ANY of the following are true:

1. **Broken layout** — clipped text, overflow, overlapping elements, misaligned columns
2. **Missing content** — images not loading, empty areas that should have content, broken icons
3. **Wrong data** — placeholder text visible to real users, test data showing, stale labels
4. **Confusing UX** — editable-looking fields on a read-only view, buttons that lead nowhere, misleading error messages
5. **Inconsistency** — same component looks/behaves differently on two pages
6. **Grant embarrassment test** — would this make us look unfinished to an Arbitrum grant reviewer?

**Not flagged:**
- Correct empty states (e.g. no jobs = empty list is fine)
- Things that only look broken without a wallet, if they work correctly with one
- Subjective design preferences (spacing, colors) unless clearly broken
- Mobile layout (no mobile site)

---

## Page Inventory

### Core / Public
| # | Route | Page Name | No-Wallet | With-Wallet | Issues |
|---|-------|-----------|-----------|-------------|--------|
| 1 | `/` | Home / Main | ⬜ | ⬜ | — |
| 2 | `/landing` | Landing Page | ⬜ | N/A | — |
| 3 | `/browse-jobs` | Browse Jobs | ⬜ | ⬜ | — |
| 4 | `/browse-talent` | Browse Talent | ⬜ | ⬜ | — |
| 5 | `/job-details/:jobId` | Single Job Details | ⬜ | ⬜ | — |
| 6 | `/job-deep-view/:jobId` | Job Deep View | ⬜ | ⬜ | — |
| 7 | `/about` | About | ⬜ | N/A | — |
| 8 | `/docs` | Docs | ⬜ | N/A | — |

### Profile
| # | Route | Page Name | No-Wallet | With-Wallet | Issues |
|---|-------|-----------|-----------|-------------|--------|
| 9 | `/profile` | My Profile (owner) | N/A | ⬜ | — |
| 10 | `/profile/:address` | Profile (viewer) | ⬜ | ⬜ | — |
| 11 | `/profile-about` | Profile About | N/A | ⬜ | — |
| 12 | `/profile-jobs` | Profile Jobs | N/A | ⬜ | — |
| 13 | `/profile-portfolio` | Portfolio (viewer) | ⬜ | ⬜ | — |
| 14 | `/profile-portfolio-owner` | Portfolio (owner) | N/A | ⬜ | — |
| 15 | `/add-portfolio` | Add Portfolio | N/A | ⬜ | — |
| 16 | `/edit-portfolio/:id` | Edit Portfolio | N/A | ⬜ | — |
| 17 | `/profile-packages` | Packages | N/A | ⬜ | — |
| 18 | `/create-package` | Create Package | N/A | ⬜ | — |
| 19 | `/view-package/:packageId` | View Package | ⬜ | ⬜ | — |
| 20 | `/edit-picture` | Edit Picture | N/A | ⬜ | — |
| 21 | `/view-work-profile/:id` | Work Profile | ⬜ | ⬜ | — |
| 22 | `/skill-verification/:address` | Skill Verification | ⬜ | ⬜ | — |

### Jobs & Work
| # | Route | Page Name | No-Wallet | With-Wallet | Issues |
|---|-------|-----------|-----------|-------------|--------|
| 23 | `/post-job` | Post Job | N/A | ⬜ | — |
| 24 | `/view-jobs` | My Jobs | N/A | ⬜ | — |
| 25 | `/work` | Work | N/A | ⬜ | — |
| 26 | `view-work/:jobId` | View Work | N/A | ⬜ | — |
| 27 | `/job-taker-details/:jobId` | Taker Job Details | N/A | ⬜ | — |
| 28 | `/job-update/:jobId` | Job Update | N/A | ⬜ | — |
| 29 | `/add-update/:jobId` | Add Update | N/A | ⬜ | — |
| 30 | `/view-job-applications/:jobId` | Job Applications | N/A | ⬜ | — |
| 31 | `/view-received-application` | Received Application | N/A | ⬜ | — |
| 32 | `/view-any-application` | Any Application | N/A | ⬜ | — |
| 33 | `/view-job-details/:jobId` | Job Details (alt) | ⬜ | ⬜ | — |
| 34 | `/direct-contract` | Direct Contract | N/A | ⬜ | — |
| 35 | `/project-complete` | Project Complete | N/A | ⬜ | — |
| 36 | `/apply-now` | Apply Now | N/A | ⬜ | — |
| 37 | `/apply-job` | Apply to Job | N/A | ⬜ | — |
| 38 | `/application-jobs` | Application Jobs | N/A | ⬜ | — |

### Payments & Disputes
| # | Route | Page Name | No-Wallet | With-Wallet | Issues |
|---|-------|-----------|-----------|-------------|--------|
| 39 | `/payments/:jobId` | Payments | N/A | ⬜ | — |
| 40 | `/payment-history/:jobId` | Payment History | N/A | ⬜ | — |
| 41 | `/payment-refund/:jobId` | Payment Refund | N/A | ⬜ | — |
| 42 | `/release-payment/:jobId` | Release Payment | N/A | ⬜ | — |
| 43 | `/raise-dispute/:jobId` | Raise Dispute | N/A | ⬜ | — |
| 44 | `/review-dispute/:jobId` | Review Dispute | N/A | ⬜ | — |
| 45 | `/dispute-view/:disputeId` | Dispute View | N/A | ⬜ | — |

### Governance & DAO
| # | Route | Page Name | No-Wallet | With-Wallet | Issues |
|---|-------|-----------|-----------|-------------|--------|
| 46 | `/governance` | Governance | ⬜ | ⬜ | — |
| 47 | `/dao` | DAO | ⬜ | ⬜ | — |
| 48 | `/dao-members` | DAO Members | ⬜ | ⬜ | — |
| 49 | `/join-dao` | Join DAO | N/A | ⬜ | — |
| 50 | `/members-governance/:jobId` | Members Governance | N/A | ⬜ | — |
| 51 | `/remove-member/:jobId` | Remove Member | N/A | ⬜ | — |
| 52 | `/voting-history/:jobId` | Voting History | N/A | ⬜ | — |
| 53 | `/new-proposal` | New Proposal | N/A | ⬜ | — |
| 54 | `/proposal-view/:proposalId/:chain` | Proposal View | ⬜ | ⬜ | — |
| 55 | `/vote-proposal` | Vote Proposal | N/A | ⬜ | — |
| 56 | `/vote-submission` | Vote Submission | N/A | ⬜ | — |
| 57 | `/treasury-proposal` | Treasury Proposal | N/A | ⬜ | — |
| 58 | `/treasury-proposal-view/:proposalId/:chain` | Treasury Proposal View | ⬜ | ⬜ | — |
| 59 | `/contract-upgrade-proposal` | Contract Upgrade Proposal | N/A | ⬜ | — |
| 60 | `/contract-upgrade-proposal-step2` | Contract Upgrade Step 2 | N/A | ⬜ | — |
| 61 | `/contract-upgrade-proposal-view` | Contract Upgrade View | ⬜ | ⬜ | — |
| 62 | `/contract-update-proposal-view` | Contract Update View | ⬜ | ⬜ | — |
| 63 | `/contractupdateproposel` | Contract Update Proposal | N/A | ⬜ | — |
| 64 | `/contractupdateproposelstep3` | Contract Update Step 3 | N/A | ⬜ | — |
| 65 | `/contract-update-step2` | Contract Update Step 2 | N/A | ⬜ | — |
| 66 | `/dao-staking-update-form` | DAO Staking Update | N/A | ⬜ | — |
| 67 | `/dao-votes-update-form` | DAO Votes Update | N/A | ⬜ | — |

### Skill Oracles
| # | Route | Page Name | No-Wallet | With-Wallet | Issues |
|---|-------|-----------|-----------|-------------|--------|
| 68 | `/skill-oracles` | Skill Oracles | ⬜ | ⬜ | — |
| 69 | `/members-skill-oracles` | Members Skill Oracles | N/A | ⬜ | — |
| 70 | `/skill-oracle-proposals` | Oracle Proposals | ⬜ | ⬜ | — |
| 71 | `/skill-oracle-disputes` | Oracle Disputes | ⬜ | ⬜ | — |
| 72 | `/skill-oracle-applications` | Oracle Applications | N/A | ⬜ | — |
| 73 | `/skill-oracle-proposal` | Oracle Proposal (create) | N/A | ⬜ | — |
| 74 | `/skill-oracle-member-proposal` | Oracle Member Proposal | N/A | ⬜ | — |
| 75 | `/existing-skill-oracles` | Existing Oracles | ⬜ | ⬜ | — |
| 76 | `/skilloraclerecruitmentstep2` | Oracle Recruitment Step 2 | N/A | ⬜ | — |
| 77 | `/skilloraclememberremovalstep2` | Oracle Member Removal Step 2 | N/A | ⬜ | — |
| 78 | `/dissolveskilloraclestep2` | Dissolve Oracle Step 2 | N/A | ⬜ | — |
| 79 | `/dissolve-oracle-proposal-view` | Dissolve Oracle View | ⬜ | ⬜ | — |
| 80 | `/newgeneraloraclestep2` | New General Oracle Step 2 | N/A | ⬜ | — |
| 81 | `/skill-verification-page` | Skill Verification Page | ⬜ | ⬜ | — |
| 82 | `/skill-verification-application/:jobId` | Skill Verification Application | N/A | ⬜ | — |

### AskAthena
| # | Route | Page Name | No-Wallet | With-Wallet | Issues |
|---|-------|-----------|-----------|-------------|--------|
| 83 | `/ask-athena/:address` | Ask Athena | ⬜ | ⬜ | — |
| 84 | `/ask-athena-applications` | Athena Applications | N/A | ⬜ | — |
| 85 | `/ask-athena-application/:jobId` | Athena Application Detail | N/A | ⬜ | — |

### Membership / Referral
| # | Route | Page Name | No-Wallet | With-Wallet | Issues |
|---|-------|-----------|-----------|-------------|--------|
| 86 | `/join-now` | Join Now | ⬜ | ⬜ | — |
| 87 | `/add-member` | Add Member | N/A | ⬜ | — |
| 88 | `/joinee-application/:jobId` | Joinee Application | N/A | ⬜ | — |
| 89 | `/recruitment-application/:jobId` | Recruitment Application | N/A | ⬜ | — |
| 90 | `/recruitment-proposal-view` | Recruitment Proposal View | ⬜ | ⬜ | — |
| 91 | `/removal-application/:jobId` | Removal Application | N/A | ⬜ | — |
| 92 | `/refer-earn` | Refer & Earn | N/A | ⬜ | — |
| 93 | `/refer-earn-not-eligible` | Refer Not Eligible | N/A | ⬜ | — |
| 94 | `/referral-eligible` | Referral Eligible | N/A | ⬜ | — |
| 95 | `/referral-not-eligible` | Referral Not Eligible | N/A | ⬜ | — |
| 96 | `/user-referral-signin` | Referral Sign In | ⬜ | ⬜ | — |

### Misc
| # | Route | Page Name | No-Wallet | With-Wallet | Issues |
|---|-------|-----------|-----------|-------------|--------|
| 97 | `/notifications` | Notifications | N/A | ⬜ | — |
| 98 | `/connect-wallet` | Connect Wallet | ⬜ | N/A | — |
| 99 | `/chain-switching` | Chain Switching | N/A | ⬜ | — |
| 100 | `/oppy` | Agent Oppy | ⬜ | ⬜ | — |
| 101 | `/dev/timeline` | Dev Timeline | ⬜ | N/A | — |

---

## Issue Log

> Issues are logged here after each page is reviewed. Nothing is fixed until all pages are done.

### Legend
- 🔴 High — broken, embarrassing, blocks a user
- 🟡 Medium — noticeable but not blocking
- 🟢 Low — minor polish

| # | Page | Issue | Severity | Fixed? |
|---|------|-------|----------|--------|
| — | — | — | — | — |

---

## Notes
- Routes sourced from `src/App.jsx`
- With-wallet pages: Anas screenshots these (no wallet in automated browser)
- Some routes (e.g. proposal steps) may redirect without context — note if they 404/redirect
