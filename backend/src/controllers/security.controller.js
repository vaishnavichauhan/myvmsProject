const SecurityService = require('../services/security.service');
const ApiResponse = require('../utils/apiResponse');

/**
 * Security Management Controller
 */
class SecurityController {
  /**
   * POST /api/security (Admin Only)
   * Register a new security staff member
   */
  static async createSecurity(req, res, next) {
    try {
      const staff = await SecurityService.createSecurityStaff(req.body, req.user);
      return ApiResponse.created(res, 'Security staff registered successfully', { staff });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/security (Admin Only)
   * List all security staff
   */
  static async getAll(req, res, next) {
    try {
      const staffList = await SecurityService.getAllSecurityStaff(req.query, req.user);
      return ApiResponse.success(res, 'Security staff list retrieved', { staffList });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/security/:id
   */
  static async getById(req, res, next) {
    try {
      const staff = await SecurityService.getSecurityStaffById(req.params.id, req.user);
      return ApiResponse.success(res, 'Security staff details retrieved', { staff });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/security/:id (Admin Only)
   * Edit security staff details
   */
  static async update(req, res, next) {
    try {
      const staff = await SecurityService.updateSecurityStaff(req.params.id, req.body, req.user);
      return ApiResponse.success(res, 'Security staff details updated', { staff });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/security/:id/status (Admin Only)
   * Activate / deactivate security staff
   */
  static async updateStatus(req, res, next) {
    try {
      const { status } = req.body;
      const staff = await SecurityService.changeStatus(req.params.id, status, req.user);
      return ApiResponse.success(res, `Security staff status changed to ${status}`, { staff });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/security/:id/reset-password (Admin Only)
   * Reset security staff login password
   */
  static async resetPassword(req, res, next) {
    try {
      const { newPassword } = req.body;
      const result = await SecurityService.resetPassword(req.params.id, newPassword, req.user);
      return ApiResponse.success(res, result.message, null);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/security/:id (Admin Only)
   * Delete security staff
   */
  static async delete(req, res, next) {
    try {
      const result = await SecurityService.deleteSecurityStaff(req.params.id, req.user);
      return ApiResponse.success(res, result.message, null);
    } catch (error) {
      next(error);
    }
  }

  // --------------------------------------------------------------------------
  // GATE MANAGEMENT APIS (Security Watchmen)
  // --------------------------------------------------------------------------

  /**
   * GET /api/security/gate/dashboard (Security & Admin)
   * Gate console summary, visitors, deliveries, couriers, workers
   */
  static async getGateDashboard(req, res, next) {
    try {
      const requestedSocietyId = req.query.society_id || req.query.societyId;
      const dashboard = await SecurityService.getGateDashboard(req.user, requestedSocietyId);
      return ApiResponse.success(res, 'Gate dashboard retrieved successfully', dashboard);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/security/gate/search-homes (Security & Admin)
   * Search home numbers, intercom, and residents
   */
  static async searchHomes(req, res, next) {
    try {
      const requestedSocietyId = req.query.society_id || req.query.societyId;
      const homes = await SecurityService.searchHomes(req.user, req.query.q, requestedSocietyId);
      return ApiResponse.success(res, 'Matching homes found', { homes });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/security/gate/entry (Security & Admin)
   * Record gate entry
   */
  static async recordGateEntry(req, res, next) {
    try {
      const entry = await SecurityService.recordGateEntry(req.user, req.body);
      return ApiResponse.created(res, 'Gate entry recorded successfully', { entry });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/security/gate/exit/:id (Security & Admin)
   * Record gate checkout/exit
   */
  static async recordGateExit(req, res, next) {
    try {
      const result = await SecurityService.recordGateExit(req.params.id);
      return ApiResponse.success(res, result.message, null);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/security/gate/contact-resident (Security & Admin)
   * Minimum Information Contact Action (Strict Privacy Enforced)
   */
  static async contactResident(req, res, next) {
    try {
      const contact = await SecurityService.contactResident(req.user, req.body);
      return ApiResponse.success(res, 'Resident contact action authorized', { contact });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = SecurityController;
