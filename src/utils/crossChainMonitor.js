/**
 * CrossChain Monitor
 *
 * Monitors LayerZero message delivery and Circle CCTP transfer status
 * entirely from the browser — no backend required.
 *
 * Usage:
 *   import { monitorLZMessage, monitorCCTPTransfer, buildStatusUpdate } from './crossChainMonitor';
 *
 *   // Monitor a LayerZero message
 *   const stop = monitorLZMessage(txHash, (update) => {
 *     console.log(update.step, update.message, update.status);
 *   });
 *   // call stop() to cancel polling
 *
 *   // Monitor a CCTP transfer
 *   const stop = monitorCCTPTransfer(txHash, sourceDomain, destChainConfig, (update) => {
 *     ...
 *   });
 */

// ─── Status values ──────────────────────────────────────────────────────────
export const STATUS = {
  PENDING:   'pending',   // Not started / waiting
  ACTIVE:    'active',    // In progress
  SUCCESS:   'success',   // Completed
  FAILED:    'failed',    // Failed / error
  WARNING:   'warning',   // Partial / needs attention
};

// ─── Step IDs (used by the UI component) ────────────────────────────────────
export const STEP = {
  // Generic LZ-only flow
  TX_SUBMITTED:      'tx_submitted',
  LZ_IN_FLIGHT:      'lz_in_flight',
  LZ_DELIVERED:      'lz_delivered',

  // Payment flow (adds CCTP steps)
  USDC_APPROVED:     'usdc_approved',
  CCTP_BURN:         'cctp_burn',
  CCTP_ATTESTATION:  'cctp_attestation',
  CCTP_MINTED:       'cctp_minted',

  COMPLETE:          'complete',
};

// ─── LayerZero scan API ──────────────────────────────────────────────────────
const LZ_SCAN_API = 'https://scan.layerzero-api.com/v1/messages/tx';

/**
 * Fetch LayerZero message status for a given source tx hash.
 * Returns null if not found yet.
 */
async function fetchLZStatus(txHash) {
  try {
    const res = await fetch(`${LZ_SCAN_API}/${txHash}`, {
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) return null;
    const data = await res.json();
    // API returns { data: [ { status, srcTxHash, dstTxHash, ... } ] }
    const messages = data?.data || data?.messages || [];
    return messages.length > 0 ? messages[0] : null;
  } catch {
    return null;
  }
}

/**
 * Monitor a LayerZero message until DELIVERED or FAILED.
 *
 * @param {string}   txHash        - Source chain transaction hash
 * @param {Function} onUpdate      - Callback({ step, status, message, txHash, lzLink, dstTxHash })
 * @param {object}   [options]
 * @param {number}   [options.pollInterval=6000]   - Polling interval in ms
 * @param {number}   [options.maxAttempts=60]       - Max polls before giving up (~6 min)
 * @returns {Function} stop - Call to stop polling
 */
export function monitorLZMessage(txHash, onUpdate, options = {}) {
  const { pollInterval = 6000, maxAttempts = 60 } = options;
  let attempts = 0;
  let stopped = false;

  const lzLink = `https://layerzeroscan.com/tx/${txHash}`;

  onUpdate({
    step: STEP.LZ_IN_FLIGHT,
    status: STATUS.ACTIVE,
    message: 'LayerZero message in flight — waiting for delivery on Arbitrum...',
    txHash,
    lzLink,
  });

  const poll = async () => {
    if (stopped) return;
    if (attempts >= maxAttempts) {
      onUpdate({
        step: STEP.LZ_IN_FLIGHT,
        status: STATUS.WARNING,
        message: `LayerZero message not yet delivered after ${Math.round((maxAttempts * pollInterval) / 60000)} minutes. Check manually.`,
        txHash,
        lzLink,
      });
      return;
    }

    const msg = await fetchLZStatus(txHash);

    if (!msg) {
      // Not indexed yet — normal for first few seconds
      attempts++;
      setTimeout(poll, pollInterval);
      return;
    }

    const lzStatus = msg.status?.name || msg.status || '';

    if (lzStatus === 'DELIVERED' || lzStatus === 'SUCCEEDED') {
      onUpdate({
        step: STEP.LZ_DELIVERED,
        status: STATUS.SUCCESS,
        message: 'LayerZero message delivered to Arbitrum ✓',
        txHash,
        lzLink,
        dstTxHash: msg.dstTxHash,
      });
      return; // Done
    }

    if (lzStatus === 'FAILED' || lzStatus === 'REVERTED') {
      onUpdate({
        step: STEP.LZ_IN_FLIGHT,
        status: STATUS.FAILED,
        message: `LayerZero delivery failed: ${msg.failureReason || lzStatus}. Check LayerZero scan for details.`,
        txHash,
        lzLink,
        dstTxHash: msg.dstTxHash,
      });
      return;
    }

    // Still in-flight — INFLIGHT / CONFIRMING / etc.
    onUpdate({
      step: STEP.LZ_IN_FLIGHT,
      status: STATUS.ACTIVE,
      message: `LayerZero: ${lzStatus || 'confirming'} (${attempts + 1} checks)...`,
      txHash,
      lzLink,
    });

    attempts++;
    setTimeout(poll, pollInterval);
  };

  setTimeout(poll, 3000); // Small initial delay

  return () => { stopped = true; };
}

// ─── Circle CCTP API ─────────────────────────────────────────────────────────
const CIRCLE_API = 'https://iris-api.circle.com/v2/messages';

/**
 * CCTP source domain values:
 *  0 = Ethereum
 *  2 = Optimism
 *  3 = Arbitrum
 *  6 = Base
 */

/**
 * Fetch Circle CCTP attestation status for a given source tx.
 * Returns { status, message, attestation } or null.
 */
async function fetchCCTPStatus(txHash, sourceDomain) {
  try {
    const res = await fetch(`${CIRCLE_API}/${sourceDomain}?transactionHash=${txHash}`, {
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) return null;
    const data = await res.json();
    const messages = data?.messages || [];
    return messages.length > 0 ? messages[0] : null;
  } catch {
    return null;
  }
}

/**
 * Monitor a Circle CCTP transfer from burn to mint.
 * Calls onUpdate at each stage. Calls onAttestation when Circle is ready so
 * the caller can trigger the receive() call on the destination chain.
 *
 * @param {string}   txHash            - Source burn tx hash
 * @param {number}   sourceDomain      - CCTP domain of source chain (0=ETH, 2=OP, 3=ARB)
 * @param {Function} onUpdate          - Status callback
 * @param {Function} onAttestation     - Called with { message, attestation } when ready to mint
 * @param {object}   [options]
 * @returns {Function} stop
 */
export function monitorCCTPTransfer(txHash, sourceDomain, onUpdate, onAttestation, options = {}) {
  const { pollInterval = 8000, maxAttempts = 60 } = options;
  let attempts = 0;
  let stopped = false;

  const circleLink = `https://iris-api.circle.com/v2/messages/${sourceDomain}?transactionHash=${txHash}`;

  onUpdate({
    step: STEP.CCTP_ATTESTATION,
    status: STATUS.ACTIVE,
    message: 'Waiting for Circle attestation of USDC transfer...',
    txHash,
    circleLink,
  });

  const poll = async () => {
    if (stopped) return;
    if (attempts >= maxAttempts) {
      onUpdate({
        step: STEP.CCTP_ATTESTATION,
        status: STATUS.WARNING,
        message: `Circle attestation not ready after ${Math.round((maxAttempts * pollInterval) / 60000)} min. Transfer may use slow path (~15-20 min). Check Circle API.`,
        txHash,
        circleLink,
      });
      return;
    }

    const msg = await fetchCCTPStatus(txHash, sourceDomain);

    if (!msg) {
      attempts++;
      setTimeout(poll, pollInterval);
      return;
    }

    const cctpStatus = msg.status || '';
    const delayReason = msg.delayReason;

    if (cctpStatus === 'complete') {
      onUpdate({
        step: STEP.CCTP_ATTESTATION,
        status: STATUS.SUCCESS,
        message: 'Circle attestation complete — USDC ready to mint on destination ✓',
        txHash,
        circleLink,
      });

      // Notify caller so they can call CCTPTransceiver.receive()
      if (onAttestation) {
        onAttestation({
          message:     msg.message,
          attestation: msg.attestation,
        });
      }
      return;
    }

    if (delayReason === 'insufficient_fee') {
      onUpdate({
        step: STEP.CCTP_ATTESTATION,
        status: STATUS.ACTIVE,
        message: 'Circle using slow transfer path (insufficient fee). Estimated ~15-20 min. Still monitoring...',
        txHash,
        circleLink,
      });
    } else {
      onUpdate({
        step: STEP.CCTP_ATTESTATION,
        status: STATUS.ACTIVE,
        message: `Circle attestation: ${cctpStatus || 'pending_confirmations'} (${attempts + 1} checks)...`,
        txHash,
        circleLink,
      });
    }

    attempts++;
    setTimeout(poll, pollInterval);
  };

  setTimeout(poll, 5000);

  return () => { stopped = true; };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Build a structured status update object — handy for local step tracking.
 */
export function buildStatusUpdate(step, status, message, extras = {}) {
  return { step, status, message, timestamp: Date.now(), ...extras };
}

/**
 * Returns a block explorer URL for a given tx hash + chainId.
 */
export function explorerTxUrl(txHash, chainId) {
  if (!txHash) return null;
  const explorers = {
    1:        'https://etherscan.io/tx',
    10:       'https://optimistic.etherscan.io/tx',
    42161:    'https://arbiscan.io/tx',
    8453:     'https://basescan.org/tx',
    11155111: 'https://sepolia.etherscan.io/tx',
    11155420: 'https://sepolia-optimism.etherscan.io/tx',
    421614:   'https://sepolia.arbiscan.io/tx',
    84532:    'https://sepolia.basescan.org/tx',
  };
  const base = explorers[chainId] || 'https://etherscan.io/tx';
  return `${base}/${txHash}`;
}

/**
 * Shorten a tx hash for display: 0xabcd...1234
 */
export function shortHash(hash, chars = 6) {
  if (!hash) return '';
  return `${hash.slice(0, chars + 2)}...${hash.slice(-4)}`;
}
