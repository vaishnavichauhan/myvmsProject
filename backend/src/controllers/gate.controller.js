const GateService = require('../services/gate.service');
const ApiResponse = require('../utils/apiResponse');

/**
 * Gate Management Controller
 */
class GateController {
  /**
   * POST /api/gates (Admin Only)
   * Create a new gate
   */
  static async create(req, res, next) {
    try {
      const society_id = req.body.society_id || req.user?.societyId || 1;
      const gate = await GateService.createGate({ ...req.body, society_id });
      return ApiResponse.created(res, 'Gate created successfully', { gate });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/gates
   * List all gates (Role-scoped for Admin vs Residents)
   */
  static async getAll(req, res, next) {
    try {
      const gates = await GateService.getAllGates(req.user, req.query);
      return ApiResponse.success(res, 'Gates retrieved successfully', { gates });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/gates/:id
   */
  static async getById(req, res, next) {
    try {
      const gate = await GateService.getGateById(req.params.id);
      return ApiResponse.success(res, 'Gate details retrieved', { gate });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PUT /api/gates/:id (Admin Only)
   * Edit gate
   */
  static async update(req, res, next) {
    try {
      const gate = await GateService.updateGate(req.params.id, req.body);
      return ApiResponse.success(res, 'Gate updated successfully', { gate });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/gates/:id (Admin Only)
   * Delete gate
   */
  static async delete(req, res, next) {
    try {
      const result = await GateService.deleteGate(req.params.id);
      return ApiResponse.success(res, result.message, null);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/gates/assign (Admin Only)
   * Assign security staff to gate (Example: Rakesh, Gate: Main Gate, Shift: Morning)
   */
  static async assignStaff(req, res, next) {
    try {
      const result = await GateService.assignSecurityStaff(req.body);
      return ApiResponse.success(res, result.message, result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/gates/assignments/:id (Admin Only)
   * Unassign security staff from gate
   */
  static async unassignStaff(req, res, next) {
    try {
      const result = await GateService.unassignSecurityStaff(req.params.id);
      return ApiResponse.success(res, result.message, null);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/gates/assigned/me (Security Only)
   * Retrieve gate assigned to the current security guard
   */
  static async getMyAssignedGate(req, res, next) {
    try {
      const result = await GateService.getMyAssignedGate(req.user);
      return ApiResponse.success(res, 'Assigned gate retrieved', result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = GateController;
