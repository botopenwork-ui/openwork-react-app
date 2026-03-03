# OpenWork UI Audit

**Status:** 🔴 In Progress — Collecting errors  
**Last updated:** 2026-03-03  
**Auditor:** OpenSonnet (automated) + Anas (wallet flows)  
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
- Correct empty states (e.g. no jobs = empty list)
- Broken flows that only apply without a connected wallet, if they work correctly with one
- Subjective design preferences (spacing, colors) unless clearly broken
- Mobile layout (no mobile site)

---

## Page Inventory

| # | Route | Page Name | No-Wallet Pass | With-Wallet Pass | Issues Found |
|---|-------|-----------|---------------|-----------------|--------------|
| 1 | `/` | Home / Dashboard | ⬜ Todo | ⬜ Todo | — |
| 2 | `/browse-jobs` | Browse Jobs | ⬜ Todo | ⬜ Todo | — |
| 3 | `/browse-talent` | Browse Talent | ⬜ Todo | ⬜ Todo | — |
| 4 | `/post-job` | Post Job | ⬜ Todo | ⬜ Todo | — |
| 5 | `/profile/:address` | Profile (viewer) | ⬜ Todo | ⬜ Todo | — |
| 6 | `/profile` | Profile (owner) | N/A | ⬜ Todo | — |
| 7 | `/single-job-details/:id` | Single Job Details | ⬜ Todo | ⬜ Todo | — |
| 8 | `/taker-job-details/:id` | Taker Job Details | N/A | ⬜ Todo | — |
| 9 | `/view-jobs` | My Jobs | N/A | ⬜ Todo | — |
| 10 | `/view-work-profile/:id` | Work Profile | ⬜ Todo | ⬜ Todo | — |
| 11 | `/profile-portfolio/:address` | Portfolio (viewer) | ⬜ Todo | ⬜ Todo | — |
| 12 | `/profile-portfolio-owner` | Portfolio (owner) | N/A | ⬜ Todo | — |
| 13 | `/profile-about/:address` | Profile About | ⬜ Todo | ⬜ Todo | — |
| 14 | `/payment-history` | Payment History | N/A | ⬜ Todo | — |
| 15 | `/payments/:jobId` | Payments | N/A | ⬜ Todo | — |
| 16 | `/release-payment/:jobId` | Release Payment | N/A | ⬜ Todo | — |
| 17 | `/payment-refund/:jobId` | Payment Refund | N/A | ⬜ Todo | — |
| 18 | `/raise-dispute/:jobId` | Raise Dispute | N/A | ⬜ Todo | — |
| 19 | `/review-dispute/:jobId` | Review Dispute | N/A | ⬜ Todo | — |
| 20 | `/governance` | Governance | ⬜ Todo | ⬜ Todo | — |
| 21 | `/voting-history` | Voting History | N/A | ⬜ Todo | — |
| 22 | `/members-governance` | Members Governance | ⬜ Todo | ⬜ Todo | — |
| 23 | `/view-job-applications/:id` | Job Applications | N/A | ⬜ Todo | — |
| 24 | `/add-edit-portfolio` | Add/Edit Portfolio | N/A | ⬜ Todo | — |
| 25 | `/job-deep-view/:id` | Job Deep View | ⬜ Todo | ⬜ Todo | — |

---

## Issue Log

> Issues are logged here after each page is reviewed. Nothing is fixed until all pages are done.

### Legend
- 🔴 High — broken, embarrassing, blocks a user
- 🟡 Medium — noticeable but not blocking
- 🟢 Low — minor polish

| # | Page | Issue | Severity | Screenshot | Fixed? |
|---|------|-------|----------|------------|--------|
| — | — | — | — | — | — |

---

## Notes / Open Questions

- With-wallet pages require Anas to screenshot (no wallet in automated browser)
- Routes confirmed from `src/App.jsx` router

