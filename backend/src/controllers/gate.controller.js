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
      const society_id = (req.user?.role !== 'SUPER_ADMIN' ? (req.user?.societyId || req.user?.society_id) : null) || req.body.society_id || 1;
      const gate = await GateService.createGate({ ...req.body, society_id });
      return ApiResponse.created(res, 'Gate created successfully', { gate });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/gates
   * List all gates (Role-scoped for Admin vs Residents) with capacity limit metrics
   */
  static async getAll(req, res, next) {
    try {
      const gates = await GateService.getAllGates(req.user, req.query);
      const societyId = req.user?.societyId || req.user?.society_id || 1;
      const SubscriptionRepository = require('../repositories/subscription.repository');
      const limitInfo = await SubscriptionRepository.checkLimit(societyId, 'GATES', 0).catch(() => null);

      return ApiResponse.success(res, 'Gates retrieved successfully', {
        gates,
        max_gates: limitInfo?.max || 1,
        current_count: gates.length,
        can_add_more: limitInfo ? (limitInfo.current < limitInfo.max) : true,
      });
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
   * POST /api/gates/self-checkin (Security Only)
   * Security staff self-selects a gate when starting duty.
   * The check-in timestamp is recorded automatically.
   * Body: { gate_id: number }
   */
  static async selfCheckIn(req, res, next) {
    try {
      const result = await GateService.securitySelfCheckIn(req.user, req.body.gate_id);
      return ApiResponse.success(res, result.message, result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/gates/self-checkout (Security Only)
   * Security staff exits their active gate (called on logout or manual exit).
   * Records check_out_time.
   */
  static async selfCheckOut(req, res, next) {
    try {
      const result = await GateService.securitySelfCheckOut(req.user);
      return ApiResponse.success(res, result.message, null);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/gates/assigned/me (Security Only)
   * Retrieve active gate check-in for the current security guard
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
