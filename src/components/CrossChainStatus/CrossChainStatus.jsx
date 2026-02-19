/**
 * CrossChainStatus Component
 *
 * Renders a transparent step-by-step progress tracker for cross-chain transactions.
 * Works for both LZ-only flows (postJob, applyToJob, etc.) and full payment flows
 * (startJob, releasePayment, lockMilestone) that also involve CCTP.
 *
 * Props:
 *   steps    — Array of step objects: { id, label, status, message, txHash, chainId, lzLink, circleLink }
 *   compact  — Boolean, renders a smaller inline version
 */

import React from 'react';
import { STATUS, STEP } from '../../utils/crossChainMonitor';
import { explorerTxUrl, shortHash } from '../../utils/crossChainMonitor';
import './CrossChainStatus.css';

// ─── Icons ────────────────────────────────────────────────────────────────────
function StepIcon({ status }) {
  if (status === STATUS.SUCCESS)  return <span className="ccs-icon ccs-success">✓</span>;
  if (status === STATUS.FAILED)   return <span className="ccs-icon ccs-failed">✕</span>;
  if (status === STATUS.WARNING)  return <span className="ccs-icon ccs-warning">⚠</span>;
  if (status === STATUS.ACTIVE)   return <span className="ccs-icon ccs-active ccs-spin">◌</span>;
  return                                 <span className="ccs-icon ccs-pending">○</span>;
}

// ─── Individual step row ─────────────────────────────────────────────────────
function StepRow({ step }) {
  const txUrl    = step.txHash  ? explorerTxUrl(step.txHash,  step.chainId)    : null;
  const dstUrl   = step.dstTxHash ? explorerTxUrl(step.dstTxHash, step.dstChainId) : null;

  return (
    <div className={`ccs-step ccs-step--${step.status || STATUS.PENDING}`}>
      <div className="ccs-step-left">
        <StepIcon status={step.status} />
        <div className="ccs-step-connector" />
      </div>
      <div className="ccs-step-right">
        <div className="ccs-step-label">{step.label}</div>
        {step.message && (
          <div className="ccs-step-message">{step.message}</div>
        )}
        <div className="ccs-step-links">
          {txUrl && (
            <a href={txUrl} target="_blank" rel="noopener noreferrer" className="ccs-link">
              Tx {shortHash(step.txHash)} ↗
            </a>
          )}
          {dstUrl && (
            <a href={dstUrl} target="_blank" rel="noopener noreferrer" className="ccs-link">
              Dst Tx {shortHash(step.dstTxHash)} ↗
            </a>
          )}
          {step.lzLink && (
            <a href={step.lzLink} target="_blank" rel="noopener noreferrer" className="ccs-link ccs-link--subtle">
              LayerZero scan ↗
            </a>
          )}
          {step.circleLink && (
            <a href={step.circleLink} target="_blank" rel="noopener noreferrer" className="ccs-link ccs-link--subtle">
              Circle API ↗
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function CrossChainStatus({ steps = [], compact = false, title }) {
  if (!steps || steps.length === 0) return null;

  // Overall status — derive from steps
  const hasFailure = steps.some(s => s.status === STATUS.FAILED);
  const hasWarning = steps.some(s => s.status === STATUS.WARNING);
  const allDone    = steps.every(s => s.status === STATUS.SUCCESS);
  const overallCls = hasFailure ? 'ccs--failed' : hasWarning ? 'ccs--warning' : allDone ? 'ccs--success' : 'ccs--active';

  return (
    <div className={`ccs ${overallCls} ${compact ? 'ccs--compact' : ''}`}>
      {title && <div className="ccs-title">{title}</div>}
      <div className="ccs-steps">
        {steps.map((step, i) => (
          <StepRow key={step.id || i} step={step} />
        ))}
      </div>
      {hasFailure && (
        <div className="ccs-footer ccs-footer--error">
          ⚠ One or more steps failed. Use the links above to inspect on-chain state and debug.
        </div>
      )}
      {allDone && (
        <div className="ccs-footer ccs-footer--success">
          ✓ All cross-chain steps completed successfully.
        </div>
      )}
    </div>
  );
}

// ─── Helper: build step array from a simple status string ────────────────────
/**
 * Produces a standard steps array for LZ-only flows (postJob, applyToJob, submitWork, etc.)
 * Call this and pass the result to <CrossChainStatus steps={steps} />.
 *
 * @param {object} state  - { sourceTxHash, sourceChainId, lzStatus, lzLink, dstTxHash, dstChainId }
 * @returns {Array}
 */
export function buildLZSteps(state = {}) {
  const { sourceTxHash, sourceChainId, lzStatus, lzLink, dstTxHash, dstChainId } = state;

  const txSubmitted = {
    id:      STEP.TX_SUBMITTED,
    label:   'Transaction submitted',
    status:  sourceTxHash ? STATUS.SUCCESS : STATUS.PENDING,
    txHash:  sourceTxHash,
    chainId: sourceChainId,
  };

  const lzInFlight = {
    id:      STEP.LZ_IN_FLIGHT,
    label:   'LayerZero message in flight',
    status:  !sourceTxHash                          ? STATUS.PENDING
           : lzStatus === 'delivered'               ? STATUS.SUCCESS
           : lzStatus === 'failed'                  ? STATUS.FAILED
           : lzStatus === 'active'                  ? STATUS.ACTIVE
           : sourceTxHash                           ? STATUS.ACTIVE
           :                                          STATUS.PENDING,
    message: lzStatus === 'failed' ? 'Message delivery failed — check LayerZero scan.' : undefined,
    lzLink,
    dstTxHash,
    dstChainId,
  };

  const lzDelivered = {
    id:      STEP.LZ_DELIVERED,
    label:   'Delivered to Arbitrum',
    status:  dstTxHash ? STATUS.SUCCESS : STATUS.PENDING,
    dstTxHash,
    dstChainId,
  };

  return [txSubmitted, lzInFlight, lzDelivered];
}

/**
 * Produces a full steps array for payment flows that include CCTP.
 *
 * @param {object} state - Extended state including CCTP fields
 * @returns {Array}
 */
export function buildPaymentSteps(state = {}) {
  const {
    // Shared
    sourceChainId,
    // USDC approval (optional — only for startJob / lockMilestone)
    usdcApproved,
    // Source tx (LOWJC call)
    sourceTxHash,
    // LZ
    lzStatus, lzLink, lzDstTxHash, lzDstChainId,
    // CCTP burn (part of source tx, same hash typically)
    cctpBurnTxHash,
    cctpSourceDomain,
    // CCTP attestation
    cctpAttestationStatus,  // 'pending' | 'complete' | 'slow'
    circleLink,
    // CCTP mint / receive
    cctpMintTxHash,
    destChainId,
  } = state;

  const steps = [];

  // USDC approval — only include if the caller signals it's needed
  if (usdcApproved !== undefined) {
    steps.push({
      id:      STEP.USDC_APPROVED,
      label:   'USDC approved',
      status:  usdcApproved ? STATUS.SUCCESS : sourceTxHash ? STATUS.SUCCESS : STATUS.PENDING,
    });
  }

  // Source tx
  steps.push({
    id:      STEP.TX_SUBMITTED,
    label:   'Transaction submitted on source chain',
    status:  sourceTxHash ? STATUS.SUCCESS : STATUS.PENDING,
    txHash:  sourceTxHash,
    chainId: sourceChainId,
  });

  // LayerZero message
  steps.push({
    id:      STEP.LZ_IN_FLIGHT,
    label:   'LayerZero message → Arbitrum',
    status:  !sourceTxHash                              ? STATUS.PENDING
           : lzStatus === 'delivered'                   ? STATUS.SUCCESS
           : lzStatus === 'failed'                      ? STATUS.FAILED
           : sourceTxHash                               ? STATUS.ACTIVE
           :                                              STATUS.PENDING,
    lzLink,
    dstTxHash: lzDstTxHash,
    dstChainId: lzDstChainId,
  });

  // CCTP burn confirmation
  steps.push({
    id:      STEP.CCTP_BURN,
    label:   'USDC sent via Circle CCTP',
    status:  !lzDstTxHash && lzStatus !== 'delivered' ? STATUS.PENDING
           : cctpBurnTxHash                            ? STATUS.SUCCESS
           : lzStatus === 'delivered'                  ? STATUS.ACTIVE
           :                                             STATUS.PENDING,
    txHash:  cctpBurnTxHash || lzDstTxHash,
    chainId: lzDstChainId || 42161,
    message: !cctpBurnTxHash && lzStatus === 'delivered' ? 'NOWJC received LZ message, initiating CCTP burn...' : undefined,
  });

  // Circle attestation
  steps.push({
    id:      STEP.CCTP_ATTESTATION,
    label:   'Circle attestation',
    status:  !cctpBurnTxHash                             ? STATUS.PENDING
           : cctpAttestationStatus === 'complete'        ? STATUS.SUCCESS
           : cctpAttestationStatus === 'slow'            ? STATUS.WARNING
           : cctpBurnTxHash                              ? STATUS.ACTIVE
           :                                               STATUS.PENDING,
    message: cctpAttestationStatus === 'slow'
      ? 'Slow path active (~15-20 min). Monitoring...'
      : cctpAttestationStatus === 'complete'
      ? 'Attestation received ✓'
      : undefined,
    circleLink,
  });

  // CCTP mint / receive on destination
  steps.push({
    id:      STEP.CCTP_MINTED,
    label:   'USDC delivered to recipient',
    status:  cctpMintTxHash ? STATUS.SUCCESS
           : cctpAttestationStatus === 'complete' ? STATUS.ACTIVE
           : STATUS.PENDING,
    txHash:  cctpMintTxHash,
    chainId: destChainId,
    message: cctpAttestationStatus === 'complete' && !cctpMintTxHash
      ? 'Executing receive() on destination chain...'
      : undefined,
  });

  return steps;
}
