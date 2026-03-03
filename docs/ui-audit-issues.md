# Phase 1 UI Audit — Issue Log
**Date:** 2026-03-03 | **Status:** No-wallet pass complete. Wallet pass pending (Anas).

---

## Issues Found — No-Wallet Pass

| # | Page | Issue | Severity | Notes |
|---|------|-------|----------|-------|
| 1 | Home `/` | Entire page is just a glowing circle with "Hover to get started" — no content, no nav, no explanation of what the app is | 🔴 High | First impression for any new visitor. Completely uninformative without wallet. |
| 2 | Browse Jobs `/browse-jobs` | Table is cut off on the left — job title column starts mid-word ("ob", "g page", "Dev 2"). First column (photo/title) is clipped off-screen | 🔴 High | Critical — real data is hidden. Likely a missing left padding/margin or sidebar pushing content. |
| 3 | Browse Talent `/browse-talent` | Same left-clipping issue — profile names cut off ("ath", "1"). First column invisible | 🔴 High | Same root cause as Browse Jobs. |
| 4 | Browse Jobs & Talent | No sidebar navigation visible on either page — how does user navigate to other sections? | 🟡 Medium | Sidebar may be wallet-gated but should at least show on public pages. |
| 5 | Single Job Details `/job-details/30111-93` | Borat photo still showing as employer avatar on the circular job view | 🔴 High | This is real IPFS data from the service wallet's profile. Needs profile update or fallback for test wallets. |
| 6 | Single Job Details `/job-details/30111-93` | Real woman's photo showing as taker avatar — privacy concern | 🔴 High | Another real IPFS-stored photo. Same issue. |
| 7 | Single Job Details | Job title shows "Untitled Job" | 🟡 Medium | Test data — this specific job has no title stored. May be correct for test jobs. |
| 8 | Job Deep View `/job-deep-view/30111-93` | Profile avatars show as grey silhouettes (both FROM and TO) — IPFS photo not loading on this page | 🟡 Medium | Inconsistent with job-details which loads photos. This page may use a different photo fetch path. |
| 9 | Profile viewer `/profile/:address` | Page renders as an editable form (input fields, textarea, dropdown) for a viewer who isn't the owner | 🔴 High | Viewer should see read-only display. This looks like the owner edit form is shown to everyone. |
| 10 | Profile viewer | Empty username field at top of the About section — blank white box above first/last name | 🟡 Medium | Likely a field with no label that shows as empty input |
| 11 | Profile viewer | "Location", "Languages", "Description", "Email", "Telegram", "Phone" all show as empty input placeholders — not actual values | 🔴 High | Even if data is empty, showing blank editable fields to a viewer is confusing and looks broken. |
| 12 | Profile viewer | "No wallet detected. Please install MetaMask" banner at bottom — shown to a viewer, not the owner | 🟡 Medium | Irrelevant to someone just viewing a profile. Should be hidden on viewer mode. |
| 13 | Profile portfolio `/profile-portfolio` | "Failed to load portfolios" red error — without a wallet address it loads the browser's own wallet (which has no portfolio) | 🟡 Medium | Error message is too technical for end users. Should say "No portfolio items yet." |
| 14 | Profile portfolio | "Contract ID: 0x5a79....9290" shown as header — this is a wallet address, not a contract ID | 🟡 Medium | Label is wrong or confusing. |
| 15 | Work Profile `/view-work-profile/:id` | "Portfolio item not found" — address used has no portfolio items. Bare error message, no back button visible | 🟢 Low | Empty state needs better design — icon + friendly message. |
| 16 | Governance `/governance` | Full page blank — just the glowing circle. No content visible without wallet | 🟡 Medium | Should show at least a description of governance or prompt to connect wallet. |
| 17 | DAO Members `/dao-members` | Left column clipped same as Browse Jobs/Talent — member name/avatar cut off | 🔴 High | Same table layout bug. |
| 18 | DAO Members | "Proposals Created" shows "N/A" — unclear if this is missing data or expected | 🟢 Low | If intentional for this member, fine. If a bug, needs investigation. |
| 19 | Skill Oracles `/skill-oracles` | Left column clipped — oracle name/avatar cut off, same as all other tables | 🔴 High | Systemic table layout bug across all list pages. |
| 20 | Skill Oracles | "test-oracle" showing in production data | 🟡 Medium | Test data visible to real users. |
| 21 | Connect Wallet `/connect-wallet` | Clean and functional ✅ | — | No issues. |
| 22 | Join Now `/join-now` | Shows "Join the UX/UI Skill Oracle" — this is specific to the browser's cached state. Without wallet it says "You're eligible" which may be incorrect | 🟡 Medium | Should show connect wallet prompt or generic join flow, not a specific oracle pre-selected. |
| 23 | About `/about` | Clean and functional ✅ | — | No issues. |
| 24 | Landing `/landing` | Renders fine, content loads ✅ | 🟢 Low | Images are small/compressed in full-page view but likely fine at normal viewport. Worth checking at real screen size. |
| 25 | ALL pages | No visible sidebar/navigation — user has no way to navigate between sections without knowing URLs | 🔴 High | Sidebar may require wallet, but there should be at least a minimal nav for public pages. |

---

## Summary

| Severity | Count |
|----------|-------|
| 🔴 High | 10 |
| 🟡 Medium | 10 |
| 🟢 Low | 3 |
| ✅ No issues | 2 |

---

## Systemic Issues (affect multiple pages)

1. **Table left-clipping** — Browse Jobs, Browse Talent, DAO Members, Skill Oracles all have the same bug. First column is pushed off-screen left. One CSS fix should resolve all 4.
2. **No navigation without wallet** — All pages show header only. Sidebar missing. Users are stranded.
3. **Real person photos in test wallets** — Borat + woman's photo in IPFS profiles. Need profile data cleanup or image fallback for known test addresses.

---

## Pending — Wallet Pass (Anas to screenshot)

Pages that need a connected wallet to audit:
- Post Job
- My Profile (owner view)
- My Work / My Jobs
- Taker Job Details
- Direct Contract
- Payments, Release Payment, Raise Dispute
- Notifications
- Governance (wallet connected)

