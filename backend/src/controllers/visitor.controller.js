const VisitorService = require('../services/visitor.service');
const ApiResponse = require('../utils/apiResponse');

/**
 * Visitor Management Controller
 */
class VisitorController {
  /**
   * GET /api/visitors/check-permission/:homeId
   * Security & Admin check home visitor permission & see resident roster
   */
  static async checkHomePermission(req, res, next) {
    try {
      const check = await VisitorService.checkHomePermission(
        req.params.homeId,
        req.query.resident_user_id,
        req.query.visit_type || req.query.type || 'VISITOR'
      );
      return ApiResponse.success(res, 'Home permission check completed', check);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/visitors/entry
   * Security & Admin create visitor entry
   */
  static async createVisitorEntry(req, res, next) {
    try {
      const result = await VisitorService.createVisitorEntry(req.user, req.body);
      return ApiResponse.created(res, result.message, result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/visitors/entries/:id/record-entry
   * Security records gate entry (APPROVED/AUTO -> ENTERED)
   */
  static async recordEntry(req, res, next) {
    try {
      const result = await VisitorService.recordEntry(
        req.user,
        req.params.id,
        req.body?.gate_id
      );
      return ApiResponse.success(res, result.message, result.entry);
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/visitors/entries/:id/record-exit
   * Security records gate exit (ENTERED -> EXITED)
   */
  static async recordExit(req, res, next) {
    try {
      const result = await VisitorService.recordExit(req.user, req.params.id);
      return ApiResponse.success(res, result.message, result.entry);
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/visitors/entries/:id/approval
   * Resident (or Admin) approves or rejects visitor entry request
   */
  static async respondToApproval(req, res, next) {
    try {
      const decision = req.body?.decision || req.body?.status;
      const result = await VisitorService.respondToApproval(
        req.user,
        req.params.id,
        decision
      );
      return ApiResponse.success(res, result.message, result.entry);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/visitors/history
   * Complete Visitor History (Role-scoped)
   */
  static async getHistory(req, res, next) {
    try {
      const history = await VisitorService.getHistory(req.user, req.query);
      return ApiResponse.success(res, 'Visitor history retrieved successfully', {
        entries: history,
        total: history.length,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/visitors/entries/:id
   */
  static async getById(req, res, next) {
    try {
      const entry = await VisitorService.getById(req.user, req.params.id);
      return ApiResponse.success(res, 'Visitor entry details retrieved', { entry });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/visitors/lookup
   * Quick search by phone number or gate pass number for returning visitors
   */
  static async lookupVisitor(req, res, next) {
    try {
      const visitor = await VisitorService.lookupVisitor(req.user, req.query.query || req.query.q);
      return ApiResponse.success(res, 'Visitor lookup completed', { visitor });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = VisitorController;
