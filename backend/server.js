const app = require('./src/app');
const config = require('./src/config/env');
const { testConnection, pool } = require('./src/config/db');
const migrate = require('./src/database/migrate');

const startServer = async () => {
  console.log('====================================================');
  console.log('  Starting MYVMS Backend Service...                 ');
  console.log('====================================================');

  // Verify MySQL database connection
  const dbStatus = await testConnection();
  if (dbStatus.success) {
    // Run migration/seeder check
    await migrate();
  } else {
    console.warn('⚠️ WARNING: Database connection failed. Backend running in degraded mode.');
    console.warn(`   Error details: ${dbStatus.message}`);
  }

  const server = app.listen(config.port, () => {
    console.log(`✓ Server running in [${config.nodeEnv}] mode on port ${config.port}`);
    console.log(`✓ Base API: http://localhost:${config.port}/api/v1`);
    console.log(`✓ Health Check: http://localhost:${config.port}/api/v1/health`);
    console.log('====================================================\n');
  });

  // Graceful shutdown
  const shutdown = async (signal) => {
    console.log(`\n[Shutdown] Received ${signal}. Closing HTTP server...`);
    server.close(async () => {
      console.log('[Shutdown] HTTP server closed.');
      try {
        await pool.end();
        console.log('[Shutdown] Database connection pool drained.');
      } catch (err) {
        console.error('[Shutdown Error] Failed to close database pool:', err.message);
      }
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

startServer();
