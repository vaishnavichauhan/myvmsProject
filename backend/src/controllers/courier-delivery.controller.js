const CourierDeliveryService = require('../services/courier-delivery.service');
const ApiResponse = require('../utils/apiResponse');

/**
 * Courier and Delivery Controller
 */
class CourierDeliveryController {
  /**
   * GET /api/courier-deliveries/check-permission/:homeId
   */
  static async checkPermission(req, res, next) {
    try {
      const check = await CourierDeliveryService.checkPermission(
        req.params.homeId,
        req.query.type,
        req.query.resident_user_id
      );
      return ApiResponse.success(res, 'Permission check completed', check);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/courier-deliveries
   * Security records Courier / Delivery
   */
  static async createEntry(req, res, next) {
    try {
      const result = await CourierDeliveryService.createEntry(req.user, req.body);
      return ApiResponse.created(res, result.message, result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/courier-deliveries/call-resident
   * Security contacts resident when permission = NO
   */
  static async callResident(req, res, next) {
    try {
      const result = await CourierDeliveryService.callResident(req.user, req.body);
      return ApiResponse.success(res, result.message || 'Resident call action initiated', result.data);
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/courier-deliveries/:id/approval
   * Resident approves / rejects
   */
  static async respondToApproval(req, res, next) {
    try {
      const decision = req.body.decision || req.body.status;
      const notes = req.body.notes || req.body.rejection_reason;
      const result = await CourierDeliveryService.respondToApproval(
        req.user,
        req.params.id,
        decision,
        notes
      );
      return ApiResponse.success(res, result.message, result.entry);
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/courier-deliveries/:id/record-entry
   * Security records gate entry
   */
  static async recordEntry(req, res, next) {
    try {
      const result = await CourierDeliveryService.recordEntry(
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
   * PATCH /api/courier-deliveries/:id/record-exit
   * Security records gate exit
   */
  static async recordExit(req, res, next) {
    try {
      const result = await CourierDeliveryService.recordExit(req.user, req.params.id);
      return ApiResponse.success(res, result.message, result.entry);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/courier-deliveries
   * Full history with filters
   */
  static async getHistory(req, res, next) {
    try {
      const history = await CourierDeliveryService.getHistory(req.user, req.query);
      return ApiResponse.success(res, 'Courier and delivery records retrieved', history);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/courier-deliveries/:id
   */
  static async getById(req, res, next) {
    try {
      const record = await CourierDeliveryService.getById(req.user, req.params.id);
      return ApiResponse.success(res, 'Record retrieved', record);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = CourierDeliveryController;
