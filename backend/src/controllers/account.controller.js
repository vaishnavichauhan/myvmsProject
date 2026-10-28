const AccountRepository = require('../repositories/account.repository');
const ApiResponse = require('../utils/apiResponse');
const { pool } = require('../config/db');

class AccountController {
  /**
   * Robust helper to determine society_id based on query, headers, user payload or database fallback.
   */
  static async resolveSocietyId(req) {
    let societyId =
      req.query?.society_id ||
      req.query?.societyId ||
      req.headers?.['x-society-id'] ||
      req.user?.society_id ||
      req.user?.societyId;

    if (['SUPER_ADMIN'].includes(req.user?.role) && societyId) {
      return Number(societyId);
    }

    if (!societyId && req.user?.id) {
      try {
        const [userRows] = await pool.query(
          `SELECT u.society_id, r.society_id AS resident_society_id, h.society_id AS home_society_id
           FROM users u
           LEFT JOIN residents r ON r.user_id = u.id AND r.status = 'ACTIVE'
           LEFT JOIN homes h ON r.home_id = h.id
           WHERE u.id = ? LIMIT 1`,
          [req.user.id]
        );
        if (userRows.length > 0) {
          societyId = userRows[0].society_id || userRows[0].resident_society_id || userRows[0].home_society_id;
        }
      } catch (err) {
        console.error('Error resolving user society in AccountController:', err.message);
      }
    }

    // Fallback to active society
    if (!societyId) {
      try {
        const [socs] = await pool.query('SELECT id FROM societies WHERE status = "ACTIVE" ORDER BY id ASC LIMIT 1');
        societyId = socs[0]?.id || null;
      } catch (err) {
        console.error('Error fallback society in AccountController:', err.message);
      }
    }

    return societyId ? Number(societyId) : null;
  }

  /**
   * GET /api/v1/accounts/overview
   * Returns total amounts for Maintenance, Special Charges, Amenity Bookings, and Subscription Billing,
   * along with grand totals and collection rate.
   */
  static async getOverview(req, res, next) {
    try {
      const societyId = await AccountController.resolveSocietyId(req);
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
      const societyId = await AccountController.resolveSocietyId(req);
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
      const societyId = await AccountController.resolveSocietyId(req);
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
