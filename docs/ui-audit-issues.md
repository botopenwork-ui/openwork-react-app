# UI Audit — Issue Tracker
**Last updated:** 2026-03-03 | **Current revision:** `openwork-00168-tkb`

---

## ⚠️ BASELINE RULE — NON-NEGOTIABLE
> All on-chain flows (postJob, applyToJob, startJob, submitWork, releasePayment, CCTP cross-chain) must keep working.
> Every fix committed and pushed before moving on. Regression = immediate revert.

---

## ✅ FIXED ISSUES

| # | Page | Issue | Fix | Revision |
|---|------|-------|-----|----------|
| 1 | Browse Jobs, Browse Talent, DAO, DAO Members, Skill Oracle pages | Table/title left-clipping — first column cut off screen | 3-layer fix: Layout overflowX, JobsTable wrapper div, body-container justify-content flex-start in all CSS files | 00160 |
| 2 | Multiple pages | Sepolia RPC used instead of ARB mainnet | Replaced with `VITE_ARBITRUM_MAINNET_RPC_URL \|\| 'https://arb1.arbitrum.io/rpc'` in Profile, ProfileOwnerView, DirectContractForm, ApplyJob, ReleasePayment | 00160 |
| 3 | PostJob, AddEditPortfolio | "No wallet detected" banner shown when wallet IS connected | Suppress banner when walletAddress exists in context | 00160 |
| 4 | ApplyNow, ReviewDispute | Hardcoded "Arbitrum Sepolia" / "OP Sepolia" testnet names in UI | Removed testnet strings | 00160 |
| 5 | EditPicture, ProfilePackages, ProfileAbout | Blank page crash (ReferenceError: walletAddress undefined) | Added useWalletConnection import + declaration | 00160 |
| 6 | DAO, DAO Members, Skill Oracle, Skill Oracle Proposals, Skill Oracle Disputes, Browse Talent | Title/table clipping on secondary pages | Added `justify-content: flex-start` to body-container in 6 CSS files | 00161 |
| 7 | ChainSelector (all pages) | "Connect Wallet" text shown when wallet IS connected but chain not detected | Changed to "Switch Network" | 00161 |
| 8 | 24 files | Raw `alert()` popups — clipboard copy and MetaMask not installed | Clipboard alerts → `void 0`; MetaMask alerts → `console.warn` | 00161 |
| 9 | 5 files | Production `console.log` leaks | Removed from RaiseDispute, ViewReceivedApplication, ReviewDispute, DirectContractForm, SingleJobDetails | 00161 |
| 10 | AskAthena | "Connect your wallet" shown despite wallet being connected | Switched from `useWalletAddress` (reads window.ethereum) to `useWalletConnection` (reads localStorage) | 00161 |
| 11 | ViewJobs | Infinite spinner — was pointing at XinFin legacy network | Full rewrite: ARB mainnet genesis `0xE8f7...` via `getJobsByPoster(walletAddress)` | 00163 |
| 12 | DirectContractForm | `'quote-placeholder'` literal sent as IPFS hash to contract | Replaced with real `jobDetailHash` (already uploaded to IPFS) | 00162 |
| 13 | GetSkillsVerified | Infinite spinner | Timeout guard: stops loading after 8s | 00162 |
| 14 | DAO | Stat card "MY OW BALAN..." truncated | Label shortened to "MY BALANCE"; added text-overflow ellipsis | 00162 |
| 15 | JobsTable (all table pages) | "Page 1 of 0" shown on empty results | Shows "No results found" when totalPages === 0 | 00162 |
| 16 | UserReferralSignIn | "Unknown referrer" label | Changed to "No referrer" | 00162 |
| 17 | JoinDAO | 3 raw `alert()` popups for validation errors | Replaced with inline error div above button | 00162 |
| 18 | ProfileOwnerView | Editable form shown to all visitors — no isOwner check working | Root cause: wallet came from `useWalletAddress` (window.ethereum) not localStorage; switched to `useWalletConnection` — isOwner now works, fields are readOnly for non-owners | 00164 |
| 19 | Payments | Page completely blank | Rewrote data fetch: XinFin legacy → ARB mainnet genesis; wallet source fixed | 00164 |
| 20 | PaymentHistory, TakerJobDetails, VotingHistory, ProfileAbout | XinFin legacy RPC, wrong contract, wrong method names | Migrated to ARB mainnet genesis `0xE8f7`; `getJobDetails` → `getJob`; field access updated | 00164 |
| 21 | MembersGovernance, RemoveMember | XinFin job-fetch code present | Dead code — `job` state was never used in JSX; entire useEffect deleted | 00165 |
| 22 | RemovalApplication, RecruitmentApplication, JoineeApplication | Dead `getApplicationProposedAmount` + `getJobEscrowAmount` calls (don't exist on genesis) | Removed; `getJob` fetch kept since `job.title` + `job.employer` are rendered | 00165 |
| 23 | GetSkillsVerified, RemovalApplication, PaymentRefund + 4 more | XinFin legacy RPC remnants | Migrated to ARB mainnet genesis | 00164/165 |
| 24 | DAO, VotingHistory, PaymentHistory, TakerJobDetails, RemovalApplication, RecruitmentApplication, JoineeApplication, ViewReceivedApplication | window.ethereum wallet reads (not signing) | Replaced with `useWalletConnection` | 00166 |
| 25 | GetSkillsVerified, ProfileAbout, ApplyNow, GenericProposalView, JobDeepView, MembersGovernance, RemoveMember, Payments, PaymentRefund | window.ethereum wallet reads (not signing) | Replaced with `useWalletConnection` | 00167 |
| 26 | SkillVerification, AddEditPortfolio, AddUpdate | `useWalletAddress` for wallet address on signing pages | Switched address source to `useWalletConnection`; kept `window.ethereum` for Web3 signing | 00167 |
| 27 | ViewJobs | Status showed "Unknown" for legacy jobs | Added status 64 ("Closed") and 96 ("Released") to status map | 00168 |

---

## 🔴 PENDING — HIGH PRIORITY

| # | Page | Issue | Notes |
|---|------|-------|-------|


---

## 🟡 PENDING — MEDIUM PRIORITY

| # | Page | Issue | Notes |
|---|------|-------|-------|
| P6 | DAO stat card | "MY OW BALAN..." still slightly clipped on some screens | CSS fix committed but may need viewport check |
| P7 | Profile portfolio | "Failed to load portfolios" error — too technical | Should say "No portfolio items yet" |
| P8 | Profile portfolio | "Contract ID: 0x5a79..." label — wrong, it's a wallet address | Mislabelled field |
| P9 | Join Now | Shows oracle-specific content without wallet connected | Should show generic prompt |
| P10 | BrowseTalent | Profile link destination — needs verification it goes to correct route | Quick check needed |
| P11 | AskAthena | Athena contract address — needs verification against deployed contracts doc | Quick check |
| P12 | SkillVerificationApplication, ReferEarn | window.ethereum wallet reads still present | Low risk — ReferEarn also signs txs |

---

## 🟢 PENDING — LOW PRIORITY

| # | Page | Issue | Notes |
|---|------|-------|-------|
| P13 | Work Profile | "Portfolio item not found" bare error — no back button | Empty state needs friendly design |
| P14 | DAO Members | "Proposals Created" shows N/A | May be intentional |
| P15 | Skill Oracles | "test-oracle" visible in production data | Test data — not a code issue |

---

## Fixes by Revision

| Revision | Summary |
|----------|---------|
| `00160-mh6` | 5 fixes: table clipping root cause, Sepolia RPC, wallet banner, testnet names, blank page crashes |
| `00161-vbj` | 5 fixes: DAO/Skill Oracle clipping, Switch Network label, 24 alert() removals, console.log cleanup, AskAthena wallet |
| `00162-vwc` | 7 fixes: quote-placeholder, GetSkillsVerified timeout, DAO stat label, Page-1-of-0, referrer label, JoinDAO inline errors |
| `00163-cf5` | ViewJobs rewritten for ARB mainnet (wrong genesis address hotfix) |
| `00164-v7s` | ProfileOwnerView isOwner fix; Payments + 10 pages off XinFin |
| `00165-4q5` | Dead XinFin code removed cleanly — 151 lines deleted |
| `00166-s2n` | 8 pages wallet reads → useWalletConnection (251 lines deleted) |
| `00167-4f5` | 12 more pages wallet source fixed |
| `00168-tkb` | ViewJobs legacy status labels |
| `00169-kcc` | P3 fixed: real person photos replaced with user.svg; P1+P2 removed (design decisions); P4 confirmed not broken (correct MetaMask signing flow) |
