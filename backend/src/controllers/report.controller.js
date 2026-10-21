const { pool } = require('../config/db');
const ApiResponse = require('../utils/apiResponse');

/**
 * Reports Controller: Comprehensive audit reports strictly for ADMIN
 */
class ReportController {
  /**
   * GET /api/reports/summary
   */
  static async getSummaryReport(req, res, next) {
    try {
      const societyId = req.user?.societyId || 1;

      // 1. Gate Movement Summary
      const [gateStats] = await pool.query(`
        SELECT 
          entry_person_type,
          direction,
          COUNT(*) as count
        FROM gate_entries
        WHERE society_id = ?
        GROUP BY entry_person_type, direction
      `, [societyId]);

      // 2. Visitor Statistics
      const [visitorStats] = await pool.query(`
        SELECT 
          ve.status,
          COUNT(*) as count
        FROM visitor_entries ve
        JOIN homes h ON ve.home_id = h.id
        WHERE h.society_id = ?
        GROUP BY ve.status
      `, [societyId]);

      // 3. Deliveries Log Summary
      const [deliveryStats] = await pool.query(`
        SELECT 
          delivery_company,
          approval_status,
          COUNT(*) as count
        FROM deliveries
        WHERE society_id = ?
        GROUP BY delivery_company, approval_status
      `, [societyId]);

      // 4. Occupancy Summary
      const [occupancyStats] = await pool.query(`
        SELECT 
          occupancy_status,
          home_type,
          COUNT(*) as count
        FROM homes
        WHERE society_id = ?
        GROUP BY occupancy_status, home_type
      `, [societyId]);

      // 5. Recent audit logs
      const [recentGateLogs] = await pool.query(`
        SELECT 
          ge.id,
          ge.entry_person_type,
          ge.person_name,
          ge.person_phone,
          ge.vehicle_type,
          ge.vehicle_number,
          ge.direction,
          ge.status,
          ge.entry_time,
          h.home_number
        FROM gate_entries ge
        LEFT JOIN homes h ON ge.target_home_id = h.id
        WHERE ge.society_id = ?
        ORDER BY ge.created_at DESC
        LIMIT 25
      `, [societyId]);

      return ApiResponse.success(res, 'Reports summary generated successfully', {
        societyId,
        generatedAt: new Date().toISOString(),
        gateStats,
        visitorStats,
        deliveryStats,
        occupancyStats,
        recentGateLogs,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ReportController;
