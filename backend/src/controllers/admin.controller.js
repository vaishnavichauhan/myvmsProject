const AdminService = require('../services/admin.service');
const ApiResponse = require('../utils/apiResponse');

/**
 * Controller for Society Admin Dashboard
 */
class AdminController {
  /**
   * GET /api/admin/dashboard
   * Returns complete metrics, occupancy charts, and recent activity audit logs
   */
  static async getDashboard(req, res, next) {
    try {
      const societyId = req.user?.societyId || null;
      const data = await AdminService.getDashboardData(societyId);
      return ApiResponse.success(res, 'Admin Dashboard data retrieved successfully', data);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AdminController;
