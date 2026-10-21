const PermissionService = require('../services/permission.service');
const ApiResponse = require('../utils/apiResponse');

/**
 * Resident Permission Controller (Home-wise)
 */
class PermissionController {
  /**
   * GET /api/permissions
   * Get home-wise permissions
   */
  static async getHomePermissions(req, res, next) {
    try {
      const permissions = await PermissionService.getHomePermissions(
        req.user,
        req.query.homeId
      );
      return ApiResponse.success(res, 'Home permissions retrieved', { permissions });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/permissions/:id
   * Update permissions for a home (Owner, Tenant, Family Member, or Admin)
   */
  static async updatePermissions(req, res, next) {
    try {
      const targetId = req.params.id || req.params.userId || req.body.home_id;
      const updated = await PermissionService.updateResidentPermissions(
        req.user,
        targetId,
        req.body
      );
      return ApiResponse.success(res, 'Home permissions updated successfully', {
        permission: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/permissions/check/:type
   * Check if caller's home has a specific permission (COURIER, DELIVERY, VISITOR, WORKER)
   */
  static async checkPermission(req, res, next) {
    try {
      const result = await PermissionService.verifyUserPermission(
        req.user,
        req.params.type
      );
      return ApiResponse.success(res, `Permission '${req.params.type}' is granted`, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Sample Action Endpoints enforced by requirePermission middleware
   */
  static async executeCourierAction(req, res) {
    return ApiResponse.success(res, 'Courier authorization processed successfully by backend.');
  }

  static async executeDeliveryAction(req, res) {
    return ApiResponse.success(res, 'Delivery entry approved successfully by backend.');
  }

  static async executeVisitorAction(req, res) {
    return ApiResponse.success(res, 'Visitor entry approved successfully by backend.');
  }

  static async executeWorkerAction(req, res) {
    return ApiResponse.success(res, 'Worker management action authorized successfully by backend.');
  }
}

module.exports = PermissionController;
