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

    // Automated Subscription Recurring Bill Generator
    try {
      const SubscriptionRepository = require('./src/repositories/subscription.repository');
      const autoInvs = await SubscriptionRepository.autoGenerateRecurringInvoices();
      if (autoInvs && autoInvs.length > 0) {
        console.log(`✓ [Billing Engine] Generated ${autoInvs.length} recurring subscription invoice(s).`);
      }
    } catch (billErr) {
      console.warn('⚠️ [Billing Engine Warning]:', billErr.message);
    }
  } else {
    console.warn('⚠️ WARNING: Database connection failed. Backend running in degraded mode.');
    console.warn(`   Error details: ${dbStatus.message}`);
  }

  // Periodic recurring billing check (every 6 hours)
  const billingTimer = setInterval(async () => {
    try {
      const SubscriptionRepository = require('./src/repositories/subscription.repository');
      await SubscriptionRepository.autoGenerateRecurringInvoices();
    } catch (e) {
      console.error('[Billing Engine Auto-Gen Error]:', e.message);
    }
  }, 6 * 60 * 60 * 1000);
  billingTimer.unref();

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
