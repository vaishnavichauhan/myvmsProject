const AccountRepository = require('../repositories/account.repository');
const ApiResponse = require('../utils/apiResponse');

class AccountController {
  /**
   * Helper to determine society_id based on user role and query.
   */
  static getSocietyId(req) {
    if (['SUPER_ADMIN'].includes(req.user.role)) {
      return req.query.society_id || req.user.society_id || null;
    }
    return req.user.society_id;
  }

  /**
   * GET /api/v1/accounts/overview
   * Returns total amounts for Maintenance, Special Charges, Amenity Bookings, and Subscription Billing,
   * along with grand totals and collection rate.
   */
  static async getOverview(req, res, next) {
    try {
      const societyId = AccountController.getSocietyId(req);
      if (!societyId) {
        return ApiResponse.error(res, 'Society ID is required', 400);
      }

      const { year } = req.query;
      const data = await AccountRepository.getOverview(societyId, { year });

      return ApiResponse.success(res, 'Financial account overview retrieved successfully', data);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/accounts/monthly
   * Returns month-wise total payment (collected) and pending amount across all 4 modules.
   */
  static async getMonthly(req, res, next) {
    try {
      const societyId = AccountController.getSocietyId(req);
      if (!societyId) {
        return ApiResponse.error(res, 'Society ID is required', 400);
      }

      const { year } = req.query;
      const data = await AccountRepository.getMonthWiseBreakdown(societyId, { year });

      return ApiResponse.success(res, 'Month-wise financial breakdown retrieved successfully', {
        months: data,
        count: data.length,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/accounts/transactions
   * Returns unified financial transactions across all 4 categories.
   */
  static async getTransactions(req, res, next) {
    try {
      const societyId = AccountController.getSocietyId(req);
      if (!societyId) {
        return ApiResponse.error(res, 'Society ID is required', 400);
      }

      const { category, limit } = req.query;
      const data = await AccountRepository.getTransactions(societyId, { category, limit });

      return ApiResponse.success(res, 'Account transactions retrieved successfully', {
        transactions: data,
        count: data.length,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = AccountController;
