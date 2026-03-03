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
- Correct empty states (no jobs = empty list is fine)
- Things that only look broken without a wallet if they work correctly with one
- Subjective design preferences unless clearly broken
- Mobile layout (no mobile site)

---

## Phase 1 — Likely Visited Pages (audit first)

These are pages any real user will land on during a normal session.

| # | Route | Page Name | No-Wallet | With-Wallet | Issues |
|---|-------|-----------|-----------|-------------|--------|
| 1 | `/` | Home | ⬜ | ⬜ | — |
| 2 | `/browse-jobs` | Browse Jobs | ⬜ | ⬜ | — |
| 3 | `/browse-talent` | Browse Talent | ⬜ | ⬜ | — |
| 4 | `/job-details/:jobId` | Single Job Details | ⬜ | ⬜ | — |
| 5 | `/job-deep-view/:jobId` | Job Deep View | ⬜ | ⬜ | — |
| 6 | `/post-job` | Post Job | N/A | ⬜ | — |
| 7 | `/profile` | My Profile (owner) | N/A | ⬜ | — |
| 8 | `/profile/:address` | Profile (viewer) | ⬜ | ⬜ | — |
| 9 | `/profile-portfolio` | Portfolio | ⬜ | ⬜ | — |
| 10 | `/view-work-profile/:id` | Work Profile | ⬜ | ⬜ | — |
| 11 | `/direct-contract` | Direct Contract | N/A | ⬜ | — |
| 12 | `/work` | My Work | N/A | ⬜ | — |
| 13 | `/view-jobs` | My Jobs | N/A | ⬜ | — |
| 14 | `/job-taker-details/:jobId` | Taker Job Details | N/A | ⬜ | — |
| 15 | `/payments/:jobId` | Payments | N/A | ⬜ | — |
| 16 | `/release-payment/:jobId` | Release Payment | N/A | ⬜ | — |
| 17 | `/raise-dispute/:jobId` | Raise Dispute | N/A | ⬜ | — |
| 18 | `/governance` | Governance | ⬜ | ⬜ | — |
| 19 | `/dao-members` | DAO Members | ⬜ | ⬜ | — |
| 20 | `/skill-oracles` | Skill Oracles | ⬜ | ⬜ | — |
| 21 | `/notifications` | Notifications | N/A | ⬜ | — |
| 22 | `/connect-wallet` | Connect Wallet | ⬜ | N/A | — |
| 23 | `/join-now` | Join Now | ⬜ | ⬜ | — |
| 24 | `/landing` | Landing Page | ⬜ | N/A | — |
| 25 | `/about` | About | ⬜ | N/A | — |

---

## Phase 2 — Less Likely / Child Pages (audit after Phase 1)

These are deeper flows most users reach only after Phase 1 pages.

### Profile sub-pages
| # | Route | Page Name | No-Wallet | With-Wallet | Issues |
|---|-------|-----------|-----------|-------------|--------|
| 26 | `/profile-about` | Profile About | N/A | ⬜ | — |
| 27 | `/profile-jobs` | Profile Jobs | N/A | ⬜ | — |
| 28 | `/edit-picture` | Edit Picture | N/A | ⬜ | — |
| 29 | `/add-portfolio` | Add Portfolio | N/A | ⬜ | — |
| 30 | `/edit-portfolio/:id` | Edit Portfolio | N/A | ⬜ | — |
| 31 | `/profile-packages` | Packages | N/A | ⬜ | — |
| 32 | `/create-package` | Create Package | N/A | ⬜ | — |
| 33 | `/view-package/:packageId` | View Package | ⬜ | ⬜ | — |
| 34 | `/skill-verification/:address` | Skill Verification | ⬜ | ⬜ | — |
| 35 | `/skill-verification-page` | Skill Verification Page | ⬜ | ⬜ | — |

### Job sub-flows
| # | Route | Page Name | No-Wallet | With-Wallet | Issues |
|---|-------|-----------|-----------|-------------|--------|
| 36 | `/apply-now` | Apply Now | N/A | ⬜ | — |
| 37 | `/apply-job` | Apply to Job | N/A | ⬜ | — |
| 38 | `/application-jobs` | Application Jobs | N/A | ⬜ | — |
| 39 | `/view-job-applications/:jobId` | Job Applications | N/A | ⬜ | — |
| 40 | `/view-received-application` | Received Application | N/A | ⬜ | — |
| 41 | `/view-any-application` | Any Application | N/A | ⬜ | — |
| 42 | `/job-update/:jobId` | Job Update | N/A | ⬜ | — |
| 43 | `/add-update/:jobId` | Add Update | N/A | ⬜ | — |
| 44 | `view-work/:jobId` | View Work | N/A | ⬜ | — |
| 45 | `/project-complete` | Project Complete | N/A | ⬜ | — |

### Payments sub-flows
| # | Route | Page Name | No-Wallet | With-Wallet | Issues |
|---|-------|-----------|-----------|-------------|--------|
| 46 | `/payment-history/:jobId` | Payment History | N/A | ⬜ | — |
| 47 | `/payment-refund/:jobId` | Payment Refund | N/A | ⬜ | — |
| 48 | `/review-dispute/:jobId` | Review Dispute | N/A | ⬜ | — |
| 49 | `/dispute-view/:disputeId` | Dispute View | N/A | ⬜ | — |

### Governance / DAO sub-flows
| # | Route | Page Name | No-Wallet | With-Wallet | Issues |
|---|-------|-----------|-----------|-------------|--------|
| 50 | `/dao` | DAO | ⬜ | ⬜ | — |
| 51 | `/join-dao` | Join DAO | N/A | ⬜ | — |
| 52 | `/members-governance/:jobId` | Members Governance | N/A | ⬜ | — |
| 53 | `/remove-member/:jobId` | Remove Member | N/A | ⬜ | — |
| 54 | `/voting-history/:jobId` | Voting History | N/A | ⬜ | — |
| 55 | `/new-proposal` | New Proposal | N/A | ⬜ | — |
| 56 | `/proposal-view/:proposalId/:chain` | Proposal View | ⬜ | ⬜ | — |
| 57 | `/vote-proposal` | Vote Proposal | N/A | ⬜ | — |
| 58 | `/vote-submission` | Vote Submission | N/A | ⬜ | — |
| 59 | `/treasury-proposal` | Treasury Proposal | N/A | ⬜ | — |
| 60 | `/treasury-proposal-view/:proposalId/:chain` | Treasury Proposal View | ⬜ | ⬜ | — |
| 61 | `/contract-upgrade-proposal` | Contract Upgrade Proposal | N/A | ⬜ | — |
| 62 | `/contract-upgrade-proposal-view` | Contract Upgrade View | ⬜ | ⬜ | — |
| 63 | `/contract-update-proposal-view` | Contract Update View | ⬜ | ⬜ | — |
| 64 | `/contractupdateproposel` | Contract Update Proposal | N/A | ⬜ | — |
| 65 | `/dao-staking-update-form` | DAO Staking Update | N/A | ⬜ | — |
| 66 | `/dao-votes-update-form` | DAO Votes Update | N/A | ⬜ | — |

### Skill Oracle sub-flows
| # | Route | Page Name | No-Wallet | With-Wallet | Issues |
|---|-------|-----------|-----------|-------------|--------|
| 67 | `/members-skill-oracles` | Members Skill Oracles | N/A | ⬜ | — |
| 68 | `/skill-oracle-proposals` | Oracle Proposals | ⬜ | ⬜ | — |
| 69 | `/skill-oracle-disputes` | Oracle Disputes | ⬜ | ⬜ | — |
| 70 | `/skill-oracle-applications` | Oracle Applications | N/A | ⬜ | — |
| 71 | `/skill-oracle-proposal` | Oracle Proposal (create) | N/A | ⬜ | — |
| 72 | `/skill-oracle-member-proposal` | Oracle Member Proposal | N/A | ⬜ | — |
| 73 | `/existing-skill-oracles` | Existing Oracles | ⬜ | ⬜ | — |
| 74 | `/skilloraclerecruitmentstep2` | Oracle Recruitment Step 2 | N/A | ⬜ | — |
| 75 | `/skilloraclememberremovalstep2` | Oracle Removal Step 2 | N/A | ⬜ | — |
| 76 | `/dissolveskilloraclestep2` | Dissolve Oracle Step 2 | N/A | ⬜ | — |
| 77 | `/dissolve-oracle-proposal-view` | Dissolve Oracle View | ⬜ | ⬜ | — |
| 78 | `/newgeneraloraclestep2` | New General Oracle Step 2 | N/A | ⬜ | — |
| 79 | `/skill-verification-application/:jobId` | Skill Verification Application | N/A | ⬜ | — |

### AskAthena
| # | Route | Page Name | No-Wallet | With-Wallet | Issues |
|---|-------|-----------|-----------|-------------|--------|
| 80 | `/ask-athena/:address` | Ask Athena | ⬜ | ⬜ | — |
| 81 | `/ask-athena-applications` | Athena Applications | N/A | ⬜ | — |
| 82 | `/ask-athena-application/:jobId` | Athena Application Detail | N/A | ⬜ | — |

### Membership / Referral
| # | Route | Page Name | No-Wallet | With-Wallet | Issues |
|---|-------|-----------|-----------|-------------|--------|
| 83 | `/add-member` | Add Member | N/A | ⬜ | — |
| 84 | `/joinee-application/:jobId` | Joinee Application | N/A | ⬜ | — |
| 85 | `/recruitment-application/:jobId` | Recruitment Application | N/A | ⬜ | — |
| 86 | `/recruitment-proposal-view` | Recruitment Proposal View | ⬜ | ⬜ | — |
| 87 | `/removal-application/:jobId` | Removal Application | N/A | ⬜ | — |
| 88 | `/refer-earn` | Refer & Earn | N/A | ⬜ | — |
| 89 | `/refer-earn-not-eligible` | Refer Not Eligible | N/A | ⬜ | — |
| 90 | `/referral-eligible` | Referral Eligible | N/A | ⬜ | — |
| 91 | `/referral-not-eligible` | Referral Not Eligible | N/A | ⬜ | — |
| 92 | `/user-referral-signin` | Referral Sign In | ⬜ | ⬜ | — |

### Misc / Dev
| # | Route | Page Name | No-Wallet | With-Wallet | Issues |
|---|-------|-----------|-----------|-------------|--------|
| 93 | `/chain-switching` | Chain Switching | N/A | ⬜ | — |
| 94 | `/oppy` | Agent Oppy | ⬜ | ⬜ | — |
| 95 | `/dev/timeline` | Dev Timeline | ⬜ | N/A | — |
| 96 | `/docs` | Docs | ⬜ | N/A | — |
| 97 | `/contract-upgrade-proposal-step2` | Contract Upgrade Step 2 | N/A | ⬜ | — |
| 98 | `/contract-update-step2` | Contract Update Step 2 | N/A | ⬜ | — |

---

## Issue Log

> Populated during audit. Nothing fixed until all Phase 1 pages are done.

### Legend
- 🔴 High — broken, embarrassing, blocks a user
- 🟡 Medium — noticeable but not blocking
- 🟢 Low — minor polish

| # | Page | Issue | Severity | Fixed? |
|---|------|-------|----------|--------|
| — | — | — | — | — |

---

## Notes
- Routes sourced directly from `src/App.jsx`
- With-wallet pages: Anas screenshots these
- Step 2/3 routes may redirect without prior state — note if they 404 or show blank
