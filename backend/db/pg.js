const { Pool } = require('pg');

const LOCAL_DB_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

// Detect managed runtimes where localhost is the app container, not a database.
const isCloudRun = !!process.env.K_SERVICE;
const isAppRunner = !!process.env.AWS_APPRUNNER_SERVICE_ID || process.env.OPENWORK_MANAGED_RUNTIME === 'true';
const isManagedRuntime = isCloudRun || isAppRunner;
const dbHost = process.env.DB_HOST;

// In managed runtimes, skip DB unless an external host is explicitly configured.
const dbConfigured = isManagedRuntime
  ? !!dbHost && !LOCAL_DB_HOSTS.has(dbHost)
  : true;

let pool;

if (!dbConfigured) {
  // Return a stub that rejects immediately — startServer catches this gracefully
  const reject = () => Promise.reject(new Error('DB_HOST not configured for managed runtime'));
  pool = { query: reject, connect: reject, on: () => {} };
} else {
  const poolConfig = isManagedRuntime
    ? {
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        host: dbHost,
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
