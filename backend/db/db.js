const pool = require('./pg');

/**
 * Convert ? placeholders to $1, $2, ... for PostgreSQL
 * Flattens a single array argument into positional params.
 */
function convertParams(sql, params) {
  let flatParams = params;
  if (params.length === 1 && Array.isArray(params[0])) {
    flatParams = params[0];
  }

  let paramIndex = 0;
  const text = sql.replace(/\?/g, () => `$${++paramIndex}`);

  return { text, values: flatParams };
}

const db = {
  /**
   * Execute raw SQL (for DDL statements).
   */
  async exec(sql) {
    await pool.query(sql);
  },

  /**
   * Run a data-modifying query (INSERT, UPDATE, DELETE).
   * Returns { lastInsertRowid, changes } to match better-sqlite3 API.
   */
  async run(sql, ...params) {
    const { text, values } = convertParams(sql, params);

    // For INSERT queries, add RETURNING id to get lastInsertRowid
    let finalSql = text;
    const isInsert = /^\s*INSERT/i.test(text);
    if (isInsert && !/RETURNING/i.test(text)) {
      finalSql = text + ' RETURNING id';
    }

    const result = await pool.query(finalSql, values);

    return {
      lastInsertRowid: result.rows[0]?.id ?? null,
      changes: result.rowCount,
    };
  },

  /**
   * Get a single row. Returns the row object or undefined.
   */
  async get(sql, ...params) {
    const { text, values } = convertParams(sql, params);
    const result = await pool.query(text, values);
    return result.rows[0] || undefined;
  },

  /**
   * Get all matching rows. Returns an array.
   */
  async all(sql, ...params) {
    const { text, values } = convertParams(sql, params);
    const result = await pool.query(text, values);
    return result.rows;
  },
};

module.exports = db;
