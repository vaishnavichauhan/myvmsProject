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
      const societyId = req.query.societyId || req.user?.societyId || null;
      const data = await AdminService.getDashboardData(societyId);
      return ApiResponse.success(res, 'Admin Dashboard data retrieved successfully', data);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/subscription
   * Returns society subscription details and invoice billing history
   */
  static async getSubscriptionBilling(req, res, next) {
    try {
      const societyId = req.query.societyId || req.user?.societyId || req.user?.society_id;
      if (!societyId) {
        return ApiResponse.error(res, 'Society identifier is missing.', 400);
      }
      const SubscriptionRepository = require('../repositories/subscription.repository');
      const data = await SubscriptionRepository.getSocietySubscriptionBilling(societyId);
      return ApiResponse.success(res, 'Society subscription & billing data retrieved', data);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/admin/subscription/invoices/:invoiceId/pay
   * Submit payment information (CASH, CARD, UPI) for Super Admin verification & approval
   */
  static async submitSubscriptionPayment(req, res, next) {
    try {
      const invoiceId = parseInt(req.params.invoiceId, 10);
      const societyId = req.user?.societyId || req.user?.society_id || req.body.societyId;
      if (!societyId) {
        return ApiResponse.error(res, 'Society identifier is missing.', 400);
      }

      const { paymentMethod, transactionRef, amount, notes } = req.body;
      const SubscriptionRepository = require('../repositories/subscription.repository');
      const result = await SubscriptionRepository.submitSubscriptionPayment(
        invoiceId,
        societyId,
        { paymentMethod, transactionRef, amount, notes },
        req.user.id
      );

      return ApiResponse.success(res, 'Payment submitted successfully. Awaiting approval by Super Admin.', result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AdminController;
