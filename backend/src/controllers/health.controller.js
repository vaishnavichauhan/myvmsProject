const { testConnection, pool } = require('../config/db');
const UserRepository = require('../repositories/user.repository');
const ApiResponse = require('../utils/apiResponse');

/**
 * Health & Diagnostics Controller
 */
class HealthController {
  /**
   * GET /api/v1/health
   */
  static async check(req, res, next) {
    try {
      const dbStatus = await testConnection();
      let userCount = 0;
      let tablesCount = 0;
      let societiesCount = 0;
      let homesCount = 0;
      let workersCount = 0;

      if (dbStatus.success) {
        userCount = await UserRepository.count();
        try {
          const [tableRows] = await pool.query(
            "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'myVms'"
          );
          tablesCount = tableRows[0]?.count || 0;

          const [socRows] = await pool.query('SELECT COUNT(*) as count FROM societies');
          societiesCount = socRows[0]?.count || 0;

          const [homeRows] = await pool.query('SELECT COUNT(*) as count FROM homes');
          homesCount = homeRows[0]?.count || 0;

          const [workerRows] = await pool.query('SELECT COUNT(*) as count FROM workers');
          workersCount = workerRows[0]?.count || 0;
        } catch (e) {
          // Schema tables may still be initializing
        }
      }

      const payload = {
        status: dbStatus.success ? 'UP' : 'DEGRADED',
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        database: {
          connected: dbStatus.success,
          host: dbStatus.host,
          port: dbStatus.port,
          databaseName: dbStatus.database,
          responseTimeMs: dbStatus.responseTimeMs || 2,
          message: dbStatus.message,
          totalTables: tablesCount,
          totalRegisteredUsers: userCount,
          totalSocieties: societiesCount,
          totalHomes: homesCount,
          totalWorkers: workersCount,
        },
        service: 'MYVMS Residential Society Management API',
        version: '1.0.0',
      };

      const statusCode = dbStatus.success ? 200 : 503;
      return ApiResponse.success(res, 'System health report', payload, statusCode);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = HealthController;
