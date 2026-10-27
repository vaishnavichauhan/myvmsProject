const MaintenanceService = require('../services/maintenance.service');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');
const { pool } = require('../config/db');

/**
 * Maintenance Controller
 * Handles HTTP requests for maintenance charges, plans, billing cycles, late penalties, and payments.
 */
class MaintenanceController {
  static async resolveSocietyId(req) {
    let societyId =
      req.query.society_id ||
      req.query.societyId ||
      req.body?.society_id ||
      req.body?.societyId ||
      req.user?.societyId ||
      req.user?.society_id;

    if (!societyId && req.user?.id) {
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
    }

    // Verify if societyId exists in the database
    if (societyId) {
      const [socRows] = await pool.query('SELECT id FROM societies WHERE id = ? LIMIT 1', [Number(societyId)]);
      if (socRows.length > 0) {
        return socRows[0].id;
      }
    }

    // Fallback: pick the latest active society
    const [socs] = await pool.query('SELECT id FROM societies ORDER BY id DESC LIMIT 1');
    return socs[0]?.id || null;
  }

  // ==========================================================================
  // PLANS
  // ==========================================================================

  static async createPlan(req, res, next) {
    try {
      let societyId = await MaintenanceController.resolveSocietyId(req);
      if (!societyId) {
        const [socs] = await pool.query('SELECT id FROM societies ORDER BY id ASC LIMIT 1');
        societyId = socs[0]?.id || null;
      }

      if (!societyId) {
        throw ApiError.badRequest('No society selected. Please create or select a residential society first.');
      }

      const plan = await MaintenanceService.createPlan({
        ...req.body,
        society_id: Number(societyId),
      });

      return ApiResponse.created(res, 'Maintenance plan created successfully', { plan });
    } catch (error) {
      next(error);
    }
  }

  static async getAllPlans(req, res, next) {
    try {
      const societyId = await MaintenanceController.resolveSocietyId(req);
      const plans = await MaintenanceService.getAllPlans(societyId, req.query);

      return ApiResponse.success(res, 'Maintenance plans retrieved successfully', {
        plans,
        total: plans.length,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getPlanById(req, res, next) {
    try {
      const plan = await MaintenanceService.getPlanById(req.params.id);
      return ApiResponse.success(res, 'Maintenance plan retrieved', { plan });
    } catch (error) {
      next(error);
    }
  }

  static async updatePlan(req, res, next) {
    try {
      const plan = await MaintenanceService.updatePlan(req.params.id, req.body);
      return ApiResponse.success(res, 'Maintenance plan updated successfully', { plan });
    } catch (error) {
      next(error);
    }
  }

  static async deletePlan(req, res, next) {
    try {
      await MaintenanceService.deletePlan(req.params.id);
      return ApiResponse.success(res, 'Maintenance plan removed successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getUserHomeId(userId) {
    if (!userId) return null;
    const [userHomes] = await pool.query(
      `SELECT r.home_id FROM residents r WHERE r.user_id = ? AND r.status = 'ACTIVE' LIMIT 1`,
      [userId]
    );
    if (userHomes.length > 0) return userHomes[0].home_id;

    const [famHomes] = await pool.query(
      `SELECT fm.home_id FROM family_members fm WHERE fm.user_id = ? AND fm.status = 'ACTIVE' LIMIT 1`,
      [userId]
    );
    return famHomes[0]?.home_id || null;
  }

  // ==========================================================================
  // BILLS / INVOICES
  // ==========================================================================

  static async getAllBills(req, res, next) {
    try {
      const societyId = await MaintenanceController.resolveSocietyId(req);
      const userRole = String(req.user?.role || '').toUpperCase();
      const isAdminOrCommittee = ['ADMIN', 'SUPER_ADMIN', 'RESIDENTIAL_ADMIN', 'COMMITTEE_MEMBER'].includes(userRole);

      const filters = { ...req.query };
      if (!isAdminOrCommittee && req.user?.id) {
        const homeId = await MaintenanceController.getUserHomeId(req.user.id);
        if (homeId) {
          filters.home_id = homeId;
        } else {
          filters.resident_id = req.user.id;
        }
      }

      const bills = await MaintenanceService.getAllBills(societyId, filters);

      return ApiResponse.success(res, 'Maintenance invoices retrieved successfully', {
        bills,
        total: bills.length,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getBillById(req, res, next) {
    try {
      const bill = await MaintenanceService.getBillById(req.params.id);
      return ApiResponse.success(res, 'Maintenance invoice retrieved', { bill });
    } catch (error) {
      next(error);
    }
  }

  static async createCustomBill(req, res, next) {
    try {
      let societyId = await MaintenanceController.resolveSocietyId(req);
      if (!societyId) {
        const [socs] = await pool.query('SELECT id FROM societies ORDER BY id ASC LIMIT 1');
        societyId = socs[0]?.id || null;
      }

      const bill = await MaintenanceService.createCustomBill({
        ...req.body,
        society_id: Number(societyId),
      });

      return ApiResponse.created(res, 'Maintenance invoice generated successfully', { bill });
    } catch (error) {
      next(error);
    }
  }

  static async generateBatchBills(req, res, next) {
    try {
      let societyId = await MaintenanceController.resolveSocietyId(req);
      if (!societyId) {
        const [socs] = await pool.query('SELECT id FROM societies ORDER BY id ASC LIMIT 1');
        societyId = socs[0]?.id || null;
      }

      if (!societyId) {
        throw ApiError.badRequest('Please select a society to generate invoices for');
      }

      const result = await MaintenanceService.generateBatchBills(Number(societyId), req.body);

      return ApiResponse.success(res, 'Batch invoices processed', result);
    } catch (error) {
      next(error);
    }
  }

  static async selectResidentPlan(req, res, next) {
    try {
      if (!req.user?.id) {
        throw ApiError.unauthorized('Authentication required');
      }
      const planId = req.body?.plan_id || req.body?.planId;
      const requestedPeriod = req.body?.billing_period || req.body?.billingPeriod || null;
      const bill = await MaintenanceService.selectResidentPlan(req.user.id, planId, requestedPeriod);

      return ApiResponse.success(res, 'Maintenance plan selected successfully', { bill });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================================================
  // PAYMENTS
  // ==========================================================================

  static async recordPayment(req, res, next) {
    try {
      const payment = await MaintenanceService.recordPayment(req.body, req.user);
      const isPending = payment.status === 'PENDING_APPROVAL';
      const msg = isPending
        ? 'Payment submitted successfully! Waiting for Admin verification and approval.'
        : 'Payment recorded and approved successfully.';
      return ApiResponse.created(res, msg, { payment });
    } catch (error) {
      next(error);
    }
  }

  static async approvePayment(req, res, next) {
    try {
      const id = Number(req.params.id);
      if (!id || isNaN(id) || id <= 0) {
        throw ApiError.badRequest('Invalid payment ID provided for approval');
      }
      const { remarks } = req.body || {};
      const result = await MaintenanceService.approvePayment(id, req.user, remarks);
      return ApiResponse.success(res, 'Payment verified and approved successfully by admin.', {
        payment: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async rejectPayment(req, res, next) {
    try {
      const id = Number(req.params.id);
      if (!id || isNaN(id) || id <= 0) {
        throw ApiError.badRequest('Invalid payment ID provided for rejection');
      }
      const { reason } = req.body || {};
      const result = await MaintenanceService.rejectPayment(id, req.user, reason);
      return ApiResponse.success(res, 'Payment rejected by admin.', {
        payment: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAllPayments(req, res, next) {
    try {
      const societyId = await MaintenanceController.resolveSocietyId(req);
      const userRole = String(req.user?.role || '').toUpperCase();
      const isAdminOrCommittee = ['ADMIN', 'SUPER_ADMIN', 'RESIDENTIAL_ADMIN', 'COMMITTEE_MEMBER'].includes(userRole);

      const filters = { ...req.query };
      if (!isAdminOrCommittee && req.user?.id) {
        const homeId = await MaintenanceController.getUserHomeId(req.user.id);
        if (homeId) {
          filters.home_id = homeId;
        } else {
          filters.paid_by_user_id = req.user.id;
        }
      }

      const payments = await MaintenanceService.getAllPayments(societyId, filters);

      return ApiResponse.success(res, 'Payments history retrieved successfully', {
        payments,
        total: payments.length,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================================================
  // STATS
  // ==========================================================================

  static async getStats(req, res, next) {
    try {
      const societyId = await MaintenanceController.resolveSocietyId(req);
      const userRole = String(req.user?.role || '').toUpperCase();
      const isAdminOrCommittee = ['ADMIN', 'SUPER_ADMIN', 'RESIDENTIAL_ADMIN', 'COMMITTEE_MEMBER'].includes(userRole);

      let userHomeId = null;
      if (!isAdminOrCommittee && req.user?.id) {
        userHomeId = await MaintenanceController.getUserHomeId(req.user.id);
      }

      const stats = await MaintenanceService.getStats(societyId, userHomeId);

      return ApiResponse.success(res, 'Maintenance statistics retrieved', { stats });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = MaintenanceController;
