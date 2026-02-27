const { Pool } = require('pg');

// Detect Cloud Run environment
const isCloudRun = !!process.env.K_SERVICE;

// If in Cloud Run but DB_HOST not configured, skip pool entirely
const dbConfigured = !isCloudRun || !!process.env.DB_HOST;

let pool;

if (!dbConfigured) {
  // Return a stub that rejects immediately — startServer catches this gracefully
  const reject = () => Promise.reject(new Error('DB_HOST not configured in Cloud Run'));
  pool = { query: reject, connect: reject, on: () => {} };
} else {
  const poolConfig = isCloudRun
    ? {
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        host: process.env.DB_HOST, // /cloudsql/openwork-480320:us-central1:openwork-db
      }
    : {
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'openwork',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 5432,
      };

  pool = new Pool({
    ...poolConfig,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  pool.on('error', (err) => {
    console.error('Unexpected PostgreSQL pool error:', err);
  });
}

module.exports = pool;
