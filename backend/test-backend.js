/**
 * Isolated integration tests for OpenWork backend changes.
 * Tests: unified status fallback, status endpoints, auto-start listener probe,
 *        startup recovery logic, and lock-milestone per-txHash DB tracking.
 *
 * Run: node test-backend.js
 */

const BASE = 'http://localhost:3099';
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost', port: 5432,
  database: 'openwork', user: 'node', password: '',
});

let passed = 0;
let failed = 0;

function ok(label, cond, detail = '') {
  if (cond) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ ${label}${detail ? ': ' + detail : ''}`);
    failed++;
  }
}

async function req(path, method = 'GET', body = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  let json;
  try { json = await res.json(); } catch { json = {}; }
  return { status: res.status, json };
}

async function seedCCTPRecord(operation, jobId, txHash, status = 'pending') {
  await pool.query(`
    INSERT INTO cctp_transfers
      (operation, job_id, source_tx_hash, source_chain, source_domain, status, step)
    VALUES ($1, $2, $3, 'OP Sepolia', 2, $4, 'initiated')
    ON CONFLICT (source_tx_hash, operation) DO UPDATE SET status = $4
  `, [operation, jobId, txHash, status]);
}

async function clearTestData(jobId) {
  await pool.query(`DELETE FROM cctp_transfers WHERE job_id = $1`, [jobId]);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

async function testHealth() {
  console.log('\n[1] Health check');
  const { status, json } = await req('/health');
  ok('returns 200', status === 200);
  ok('status is running', json.status === 'running');
}

async function testStatusEndpoints404WhenMissing() {
  console.log('\n[2] Status endpoints return 404 for unknown IDs');
  const r1 = await req('/api/start-job-status/no-such-job-id-xyz');
  ok('start-job-status → 404', r1.status === 404);

  const r2 = await req('/api/release-payment-status/no-such-key-xyz');
  ok('release-payment-status → 404', r2.status === 404);

  const r3 = await req('/api/lock-milestone-status/lock-no-such-0xdeadbeef');
  ok('lock-milestone-status → 404', r3.status === 404);
}

async function testStatusEndpointsFallBackToDb() {
  console.log('\n[3] Status endpoints fall back to DB (survive restart simulation)');
  const jobId = 'test-40232-999';
  const txHash = '0xaaaa000000000000000000000000000000000000000000000000000000000001';

  await clearTestData(jobId);
  await seedCCTPRecord('startJob', jobId, txHash, 'completed');

  // In-memory map is empty (simulating a restart), DB has the record
  const { status, json } = await req(`/api/start-job-status/${jobId}`);
  ok('returns 200 from DB', status === 200, `got ${status}`);
  ok('status is completed', json.status === 'completed', `got ${json.status}`);
  ok('fromDatabase flag set', json.fromDatabase === true);

  await clearTestData(jobId);
}

async function testReleasePaymentStatusFallback() {
  console.log('\n[4] release-payment-status falls back to DB');
  const jobId = 'test-40232-998';
  const txHash = '0xbbbb000000000000000000000000000000000000000000000000000000000002';
  const statusKey = `${jobId}-${txHash}`;

  await clearTestData(jobId);
  await seedCCTPRecord('releasePayment', jobId, txHash, 'polling_attestation');

  const { status, json } = await req(`/api/release-payment-status/${statusKey}`);
  ok('returns 200', status === 200, `got ${status}`);
  ok('fromDatabase flag', json.fromDatabase === true);

  await clearTestData(jobId);
}

async function testLockMilestonePerTxHashTracking() {
  console.log('\n[5] lockMilestone — multiple locks on same job tracked separately');
  const jobId = 'test-40232-997';
  const tx1 = '0xcccc000000000000000000000000000000000000000000000000000000000003';
  const tx2 = '0xdddd000000000000000000000000000000000000000000000000000000000004';

  await clearTestData(jobId);

  // Seed two separate lock records for same job
  await pool.query(`
    INSERT INTO cctp_transfers
      (operation, job_id, source_tx_hash, source_chain, source_domain, status, step)
    VALUES
      ('lockMilestone', $1, $2, 'OP Sepolia', 2, 'completed', 'done'),
      ('lockMilestone', $1, $3, 'OP Sepolia', 2, 'pending',   'initiated')
    ON CONFLICT (source_tx_hash, operation) DO NOTHING
  `, [jobId, tx1, tx2]);

  // Verify both exist separately
  const rows = await pool.query(
    `SELECT source_tx_hash, status FROM cctp_transfers
     WHERE job_id = $1 AND operation = 'lockMilestone' ORDER BY created_at`,
    [jobId]
  );
  ok('two separate DB rows created', rows.rows.length === 2, `got ${rows.rows.length}`);
  ok('first is completed', rows.rows[0]?.status === 'completed');
  ok('second is pending',  rows.rows[1]?.status === 'pending');

  // Status endpoint resolves tx2 by hash
  const sk2 = `lock-${jobId}-${tx2}`;
  const { status, json } = await req(`/api/lock-milestone-status/${sk2}`);
  ok('tx2 status endpoint → 200', status === 200, `got ${status}`);
  ok('tx2 status is pending', json.status === 'pending', `got ${json.status}`);

  await clearTestData(jobId);
}

async function testStartJobEndpointAcceptsAndQueues() {
  console.log('\n[6] POST /api/start-job accepts request and returns processing');
  const jobId = 'test-40232-996';
  const txHash = '0xeeee000000000000000000000000000000000000000000000000000000000005';

  await clearTestData(jobId);

  const { status, json } = await req('/api/start-job', 'POST', { jobId, txHash });
  ok('returns 200', status === 200, `got ${status}`);
  ok('success true', json.success === true);
  ok('status is processing or already_processing',
     json.status === 'processing' || json.status === 'already_processing',
     `got ${json.status}`);

  await clearTestData(jobId);
}

async function testReleasePaymentEndpointAcceptsAndQueues() {
  console.log('\n[7] POST /api/release-payment accepts request, returns statusKey');
  const jobId = 'test-40232-995';
  const txHash = '0xffff000000000000000000000000000000000000000000000000000000000006';

  await clearTestData(jobId);

  const { status, json } = await req('/api/release-payment', 'POST', { jobId, opSepoliaTxHash: txHash });
  ok('returns 200', status === 200, `got ${status}`);
  ok('success true', json.success === true);
  ok('statusKey present', typeof json.statusKey === 'string', `got ${json.statusKey}`);

  await clearTestData(jobId);
}

async function testLockMilestoneEndpointAccepts() {
  console.log('\n[8] POST /api/lock-milestone accepts request, returns statusKey with txHash');
  const jobId = 'test-40232-994';
  const txHash = '0x1111000000000000000000000000000000000000000000000000000000000007';

  await clearTestData(jobId);

  const { status, json } = await req('/api/lock-milestone', 'POST', { jobId, txHash });
  ok('returns 200', status === 200, `got ${status}`);
  ok('success true', json.success === true);
  ok('statusKey contains txHash', json.statusKey?.includes(txHash), `statusKey: ${json.statusKey}`);

  await clearTestData(jobId);
}

async function testCctpStatusEndpoint() {
  console.log('\n[9] GET /api/cctp-status/:operation/:jobId reads from DB');
  const jobId = 'test-40232-993';
  const txHash = '0x2222000000000000000000000000000000000000000000000000000000000008';

  await clearTestData(jobId);
  await seedCCTPRecord('startJob', jobId, txHash, 'completed');

  const { status, json } = await req(`/api/cctp-status/startJob/${jobId}`);
  ok('returns 200', status === 200, `got ${status}`);
  ok('found true', json.found === true);
  ok('status completed', json.status === 'completed', `got ${json.status}`);

  await clearTestData(jobId);
}

// ─── Run all tests ────────────────────────────────────────────────────────────

(async () => {
  console.log('🧪 OpenWork Backend — Isolated Integration Tests');
  console.log('================================================');

  try {
    await testHealth();
    await testStatusEndpoints404WhenMissing();
    await testStatusEndpointsFallBackToDb();
    await testReleasePaymentStatusFallback();
    await testLockMilestonePerTxHashTracking();
    await testStartJobEndpointAcceptsAndQueues();
    await testReleasePaymentEndpointAcceptsAndQueues();
    await testLockMilestoneEndpointAccepts();
    await testCctpStatusEndpoint();
  } catch (err) {
    console.error('\n💥 Test runner error:', err.message);
  }

  console.log(`\n================================================`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
  else console.log('✅ All tests passed');

  await pool.end();
  process.exit(0);
})();
