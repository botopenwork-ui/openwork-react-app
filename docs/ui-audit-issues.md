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


---

## Issues Found — Code Analysis Pass (wallet-gated pages)

| # | Page | Issue | Severity | Notes |
|---|------|-------|----------|-------|
| 26 | Profile `/profile/:address` | Still uses `VITE_ARBITRUM_SEPOLIA_RPC_URL` — same testnet bug as BrowseTalent had | 🔴 High | Will fail to load profile data from mainnet |
| 27 | Profile `/profile/:address` | No owner vs viewer distinction — same editable form shown to everyone | 🔴 High | Need `isOwner = address === walletAddress` check and separate read-only view |
| 28 | ProfileOwnerView | Also uses `VITE_ARBITRUM_SEPOLIA_RPC_URL` in two places | 🔴 High | Profile owner view won't load real mainnet data |
| 29 | DirectContractForm | Uses `VITE_ARBITRUM_SEPOLIA_RPC_URL` as fallback RPC | 🔴 High | Cross-chain form may read wrong chain data |
| 30 | ApplyJob | Uses `VITE_ARBITRUM_SEPOLIA_RPC_URL` as fallback RPC | 🔴 High | Apply flow may read from testnet |
| 31 | ReleasePayment | Uses `VITE_ARBITRUM_SEPOLIA_RPC_URL` as fallback RPC | 🔴 High | Payment release could read from testnet |
| 32 | DirectContractForm | 5x raw `alert()` calls for validation errors (title, requirements, taker address, milestone, chain switch) | 🟡 Medium | `alert()` is a jarring native browser popup — should be inline form validation or toast |
| 33 | DirectContractForm | `'quote-placeholder'` hardcoded as argument to `startDirectContract` | 🔴 High | Literal string "quote-placeholder" sent to contract — likely a dev stub that was never replaced |
| 34 | ViewJobs / Payments / GetSkillsVerified / RemovalApplication | Raw `alert("MetaMask is not installed...")` — native browser popup | 🟡 Medium | Should be styled in-app message |
| 35 | All above pages | Multiple `alert("Address copied to clipboard")` calls | 🟢 Low | Minor — should be a toast notification, not native alert |
| 36 | RaiseDispute / ViewReceivedApplication / ReviewDispute | 8-21 `console.log` statements left in production code | 🟢 Low | Not visible to users but leaks implementation details in DevTools |
| 37 | ApplyNow | Shows "Creating proposal on Arbitrum Sepolia..." status message to user | 🔴 High | Hardcoded testnet name shown in UI — users on mainnet will see wrong chain name |
| 38 | ALL list pages (Browse Jobs, Browse Talent, DAO Members, Skill Oracles) | Left column completely clipped — root cause likely a shared table CSS class | 🔴 High | One CSS fix should resolve all 4 |

---

## Updated Summary

| Severity | Count |
|----------|-------|
| 🔴 High | 19 |
| 🟡 Medium | 13 |
| 🟢 Low | 6 |
| ✅ No issues | 2 |

**Total: 38 issues across Phase 1 pages**

---

## Priority Fix Order (before wallet pass)

1. **Sepolia RPC in Profile.jsx, ProfileOwnerView, DirectContractForm, ApplyJob, ReleasePayment** — mainnet data won't load
2. **`quote-placeholder` in DirectContractForm** — bad data sent to contract
3. **Table left-clipping** — affects 4 public pages, single CSS fix
4. **Profile viewer shows edit form** — confusing to all visitors
5. **`alert()` → inline validation** — UX polish on key flows
6. **"Arbitrum Sepolia" text in ApplyNow** — wrong chain name shown to users

---

## Issues Found — Simulated Wallet Pass

*Mock wallet: `0x93514040f43aB16D52faAe7A3f380c4089D844F9` (Anas's address, ARB mainnet)*

| # | Page | Issue | Severity | Notes |
|---|------|-------|----------|-------|
| 39 | Post Job `/post-job` | "No wallet detected. Please install MetaMask" warning banner shows even though wallet IS connected in header | 🔴 High | Banner reads `window.ethereum` directly but connected state isn't propagating — same wallet detection bug as Profile viewer |
| 40 | Post Job | Milestone default shows "1 🔵" — USDC icon looks like a blue dot at small size | 🟢 Low | Minor icon sizing issue |
| 41 | Post Job | No chain selector visible — user can't choose OP vs ARB before posting | 🟡 Medium | Chain selection exists in code but may not show until user action |
| 42 | View Jobs `/view-jobs` | Stuck on "Loading your jobs..." indefinitely — never resolves or shows empty state | 🔴 High | Likely reading from wrong chain (Sepolia), or RPC call failing silently |
| 43 | View Jobs | Sidebar cut off — "Ope..." showing at top right, same left-clip issue | 🔴 High | Systemic table/layout bug |
| 44 | Direct Contract `/direct-contract` | Form looks clean and functional ✅ but "Enter Contract" button text is generic — should be "Start Direct Contract" or similar | 🟢 Low | Minor copy issue |
| 45 | Direct Contract | No chain indicator shown — user doesn't know which chain the contract will be on | 🟡 Medium | Important for cross-chain UX |
| 46 | Notifications `/notifications` | Clean and functional ✅ — "No notifications yet" empty state is clear | — | No issues |
| 47 | Payments `/payments/30111-93` | Blank white page — nothing renders at all | 🔴 High | Completely broken — likely component crash or wrong data loading |
| 48 | Work `/work` | Just the glowing circle — same radial hover menu as Home and Governance | 🟡 Medium | Need to hover to see options — not intuitive, especially for new users |
| 49 | ALL pages | Header still says "Connect Wallet" even when wallet IS connected (mock) | 🔴 High | WalletContext not being read correctly by the header component — major UX bug |

---

## Final Summary (all passes complete)

| Severity | Count |
|----------|-------|
| 🔴 High | 24 |
| 🟡 Medium | 16 |
| 🟢 Low | 8 |
| ✅ No issues | 3 |

**Total: 49 issues across Phase 1 pages**

---

## Top 5 to Fix First

1. **Header "Connect Wallet" bug** — shows even when wallet connected. Affects every page.
2. **Table left-clipping** — Browse Jobs, Browse Talent, DAO Members, Skill Oracles, View Jobs. One CSS fix.
3. **Sepolia RPC in Profile, ProfileOwnerView, DirectContractForm, ApplyJob, ReleasePayment** — reading testnet data.
4. **Payments page blank** — completely broken.
5. **View Jobs stuck loading** — infinite spinner, never resolves.

---

## Phase 2 — Issue Log (Child / Secondary Pages)

*Mix of screenshots + code analysis. Mock wallet active for wallet-gated pages.*

| # | Page | Issue | Severity | Method |
|---|------|-------|----------|--------|
| 50 | Profile About `/profile-about` | Completely blank white page — renders nothing | 🔴 High | Screenshot |
| 51 | Profile Packages `/profile-packages` | Completely blank white page — renders nothing | 🔴 High | Screenshot |
| 52 | Edit Picture `/edit-picture` | Completely blank white page — renders nothing | 🔴 High | Screenshot |
| 53 | Add Portfolio `/add-portfolio` | "No wallet detected" banner while wallet IS connected. Same detection bug as Phase 1 | 🔴 High | Screenshot |
| 54 | Add Portfolio | "Contract ID: 0xfd08...024a" shown in header — wrong label, should say "Job ID" or "Contract Address" | 🟡 Medium | Screenshot |
| 55 | Add Portfolio | Pre-filled with "Project Name", "UX Design", "UI Design" placeholder data — not cleared | 🟡 Medium | Screenshot |
| 56 | Skill Verification Page | Stuck on "Loading Skill Verification... Fetching data from blockchain. Please wait..." — never resolves | 🔴 High | Screenshot |
| 57 | DAO `/dao` | "Work DAO" title clipped — first letter cut off, shows "ork DAO" | 🔴 High | Screenshot |
| 58 | DAO | Stats row clipped right side — third stat card half-visible | 🟡 Medium | Screenshot |
| 59 | DAO | Proposal table — first column (proposal ID) clipped off left edge. Same systemic table bug | 🔴 High | Screenshot |
| 60 | DAO | "Ledger" heading clipped — shows "edger" | 🔴 High | Screenshot |
| 61 | Skill Oracle Proposals | Page title "penWork Ledger" — first letter "O" clipped off | 🔴 High | Screenshot |
| 62 | Skill Oracle Proposals | Proposal table first column clipped — same systemic table bug | 🔴 High | Screenshot |
| 63 | Skill Oracle Proposals | "Page 1 of 0" — empty state with no friendly message | 🟢 Low | Screenshot |
| 64 | Ask Athena `/ask-athena/:address` | "Connect your wallet to submit an Ask Athena inquiry" shown even though wallet IS connected — same detection bug | 🔴 High | Screenshot |
| 65 | User Referral Sign In | "Unknown referrer" shown — acceptable for direct navigation, but should say "No referrer" more clearly | 🟢 Low | Screenshot |
| 66 | Agent Oppy `/oppy` | Clean and functional ✅ | — | Screenshot |
| 67 | ApplyJob | Uses `VITE_ARBITRUM_SEPOLIA_RPC_URL` as fallback — testnet reads | 🔴 High | Code |
| 68 | ReviewDispute | "🎉 Dispute settled and funds delivered to winner on OP Sepolia!" — testnet chain name hardcoded in success message | 🔴 High | Code |
| 69 | ReviewDispute | Raw `alert("MetaMask is not installed")` + `alert("Address copied")` | 🟡 Medium | Code |
| 70 | JoinDAO | 3x raw `alert()` for validation: wallet not connected, already a member, validation errors | 🟡 Medium | Code |
| 71 | All step 2/3 pages (ContractUpgradeStep2, ContractUpdateStep3, NewGeneralOracleStep2, etc.) | Navigate to these directly = blank white page — no fallback, no redirect | 🟡 Medium | Code |
| 72 | All proposal views without context | Accessing `/proposal-view/:id/:chain` without a real ID likely crashes silently | 🟡 Medium | Code |
| 73 | ProfilePortfolioOwner | Error state shows raw message: "Failed to load portfolios" — no icon, no retry button | 🟢 Low | Code |
| 74 | SkillOracleDisputes | Error state exposes raw `err.message` to users | 🟡 Medium | Code |

---

## Phase 2 Summary

| Severity | Count |
|----------|-------|
| 🔴 High | 12 |
| 🟡 Medium | 8 |
| 🟢 Low | 3 |
| ✅ No issues | 1 |

---

## GRAND TOTAL (Phase 1 + Phase 2)

| Severity | Count |
|----------|-------|
| 🔴 High | 36 |
| 🟡 Medium | 24 |
| 🟢 Low | 11 |
| ✅ Clean | 4 |
| **Total** | **75 issues** |

---

## Systemic Issues Summary (fix once, resolves many)

| Root Cause | Pages Affected | Issues Fixed |
|------------|----------------|--------------|
| Wallet detection bug — "No wallet detected" despite connection | PostJob, AddPortfolio, AskAthena, Profile | #39, #53, #64 |
| Table left-clipping CSS | Browse Jobs, Browse Talent, DAO Members, Skill Oracles, DAO, Skill Oracle Proposals, ViewJobs | #2, #3, #17, #19, #43, #59, #61, #62 |
| Sepolia RPC fallback | Profile, ProfileOwnerView, DirectContractForm, ApplyJob, ReleasePayment | #26, #28, #29, #30, #31, #67 |
| Testnet name in UI strings | ApplyNow, ReviewDispute | #37, #68 |
| Raw `alert()` calls | 8+ pages | #32-35, #69-70 |
| Blank pages (no wallet guard / no content) | ProfileAbout, ProfilePackages, EditPicture, SkillVerificationPage | #50-52, #56 |
