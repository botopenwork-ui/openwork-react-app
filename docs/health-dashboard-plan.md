# OpenWork Health Dashboard — Plan

_Created: 2026-03-03 | Status: PLANNING (no code changes)_

---

## Purpose

A single internal dashboard that shows the live health of all critical OpenWork infrastructure at a glance. Operators (Armand, Anas) can open it and immediately know if something needs attention.

---

## Key Health Points to Monitor

### 1. Service Wallet Balances
- **ARB ETH** — must stay > 0.003 (relay gas)
- **OP ETH** — must stay > 0.003 (relay gas)
- **ARB USDC** — informational (job escrow pool)
- **OP USDC** — informational
- Alert threshold: < 0.003 ETH → 🔴

### 2. IPFS / Pinata
- Ping `POST /api/ipfs/upload-json` with a tiny test payload
- Check response is `{ success: true, IpfsHash: "Qm..." }`
- Alert if: non-200, timeout > 8s, or `success: false`

### 3. Auto-Relayer
- Check backend relay queue: any jobs stuck in `polling_attestation` > 15 min
- Check last successful relay timestamp
- Alert if: no successful relay in last 24h AND jobs are pending

### 4. Backend API
- `GET /api/health` (or a lightweight ping endpoint)
- Response time < 2s = green, > 5s = yellow, timeout = red
- Check Cloud Run revision is current (no stale deploy)

### 5. Contracts (read-only sanity checks)
- LOWJC: call `jobCounter()` — confirms RPC is reachable and contract responds
- ProfileManager: call `hasProfile(serviceWallet)` — sanity check
- Alert if: RPC call fails or reverts unexpectedly

### 6. RPC Endpoints
- Arbitrum: `https://arb-mainnet.g.alchemy.com/...`
- Optimism: `https://opt-mainnet.g.alchemy.com/...`
- Check: `eth_blockNumber` returns a recent block (within last 30s)
- Alert if: stale block or timeout

### 7. CCTP Circle API
- `GET https://iris-api.circle.com/v2/messages/10?transactionHash=<recent_tx>`
- Confirms Circle's attestation service is reachable
- Alert if: timeout or 5xx

---

## Dashboard UI Design

### Layout
```
┌─────────────────────────────────────────────────────┐
│  OpenWork Health Dashboard          Last: 2 min ago  │
├──────────────┬──────────────┬───────────────────────┤
│ SERVICE WALLET              │ BACKEND                │
│  ARB: 0.005 ETH  ✅        │  API: ✅ 180ms         │
│  OP:  0.0058 ETH ✅        │  IPFS: ✅ Pinata       │
│  ARB USDC: 3.79  ✅        │  Revision: 00142-sr4   │
├──────────────┬──────────────┼───────────────────────┤
│ RELAYER                     │ RPC NODES              │
│  Last relay: 12 min ago ✅  │  ARB: ✅ block 312xxx  │
│  Pending: 0 jobs            │  OP:  ✅ block 131xxx  │
│  Status: idle ✅            │                        │
├──────────────┬──────────────┼───────────────────────┤
│ CONTRACTS                   │ CIRCLE CCTP API        │
│  LOWJC jobs: 97 ✅          │  Status: ✅ reachable  │
│  PM: responding ✅          │                        │
└─────────────────────────────┴───────────────────────┘
```

### Status Colors
- ✅ Green: all good
- 🟡 Yellow: degraded / approaching threshold
- 🔴 Red: action required

---

## Implementation Options (to discuss)

### Option A — Backend-only `/api/health` endpoint
- Add a single `GET /api/health` route to the existing backend
- Returns JSON with all health metrics
- Can be consumed by any frontend or monitoring tool
- **Pros:** no new infrastructure, deploys with normal code
- **Cons:** no live UI until someone builds it

### Option B — Dedicated static HTML page at `/health`
- Single self-contained HTML file served by Express
- Fetches `/api/health` on load and auto-refreshes every 60s
- No build step, no framework
- **Pros:** instant, zero dependencies, shareable URL
- **Cons:** basic styling only

### Option C — Standalone Cloud Run service
- Separate service (`openwork-dashboard`) with its own URL
- Full React UI with charts (Recharts), historical trends
- **Pros:** clean separation, can add auth, full charting
- **Cons:** more infra, separate deploy pipeline

### Recommendation
**Option B first** — ship a `/health` page in the existing backend within one session. Gives Armand and Anas a real URL to bookmark immediately. Can upgrade to Option C later if we want historical charts.

---

## Alert Strategy

### Short-term (available now)
- Heartbeat already monitors wallet balances and notifies Armand via Telegram
- Threshold: ETH < 0.003 → alert once per drop event

### Long-term (to build)
- Dashboard page sends Telegram alert if any metric goes red
- Could POST to `/api/alert` → Telegram bot → group chat
- PagerDuty / Uptime Robot for uptime monitoring of the app URL

---

## Data Sources Summary

| Metric | Source | How |
|--------|--------|-----|
| Wallet ETH/USDC | Alchemy RPC | `eth_getBalance` + ERC20 `balanceOf` |
| IPFS health | Pinata API | `POST /pinning/pinFileToIPFS` test |
| Relayer queue | Backend DB | `SELECT * FROM cctp_transfers WHERE status != 'completed'` |
| Last relay time | Backend DB | `SELECT MAX(updated_at) FROM cctp_transfers WHERE status = 'completed'` |
| API health | Self | response time of `/api/health` |
| Contract sanity | Alchemy RPC | `eth_call` on `jobCounter()` |
| RPC liveness | Alchemy RPC | `eth_blockNumber` |
| Circle API | iris-api.circle.com | GET recent attestation |

---

## Files to Create (when we build)

```
backend/routes/health.js          ← health check endpoint
backend/routes/health.test.js     ← smoke test for the endpoint  
public/health.html                ← dashboard UI (Option B)
docs/health-dashboard.md          ← this file (already done)
```

---

## Open Questions for Discussion

1. **Auth?** Should `/health` be public or require a secret header?
2. **History?** Do we want to store health snapshots over time (e.g. last 7 days of wallet balance)?
3. **Alerts?** Which Telegram chat should receive dashboard alerts — this group or Armand direct?
4. **Refresh rate?** How often should the dashboard auto-poll — every 60s? 5 min?
5. **Option B vs C?** Quick static page now, or full React dashboard?
