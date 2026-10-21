const mysql = require('mysql2/promise');
const config = require('./env');

/**
 * Create MySQL connection pool using mysql2 promise-based wrapper.
 */
const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  waitForConnections: true,
  connectionLimit: config.db.connectionLimit,
  queueLimit: 0,
  multipleStatements: true,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  dateStrings: true,
});

/**
 * Test database connectivity and return status details.
 * @returns {Promise<{ success: boolean, host: string, database: string, message: string }>}
 */
const testConnection = async () => {
  const startTime = Date.now();
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT 1 + 1 AS result, DATABASE() as current_db');
    connection.release();

    const responseTimeMs = Date.now() - startTime;
    console.log(
      `[Database] Successfully connected to MySQL at ${config.db.host}:${config.db.port} (DB: ${rows[0]?.current_db || config.db.database}) [${responseTimeMs}ms]`
    );

    return {
      success: true,
      host: config.db.host,
      port: config.db.port,
      database: rows[0]?.current_db || config.db.database,
      responseTimeMs,
      message: 'Database connection established successfully.',
    };
  } catch (error) {
    console.error(`[Database Error] Failed to connect to MySQL: ${error.message}`);
    return {
      success: false,
      host: config.db.host,
      port: config.db.port,
      database: config.db.database,
      message: error.message,
    };
  }
};

module.exports = {
  pool,
  testConnection,
};
