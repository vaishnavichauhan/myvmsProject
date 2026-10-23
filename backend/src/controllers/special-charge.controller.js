const SpecialChargeService = require('../services/special-charge.service');

class SpecialChargeController {
  static async createCharge(req, res, next) {
    try {
      const charge = await SpecialChargeService.createCharge(req.body, req.user);
      return res.status(201).json({
        success: true,
        message: 'Special charge created and applied to all society homes successfully',
        data: charge,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getAllCharges(req, res, next) {
    try {
      const societyId = req.query.society_id || req.user.societyId || null;
      const charges = await SpecialChargeService.getAllCharges(societyId, req.query, req.user);
      return res.status(200).json({
        success: true,
        data: charges,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getChargeById(req, res, next) {
    try {
      const charge = await SpecialChargeService.getChargeById(req.params.id);
      return res.status(200).json({
        success: true,
        data: charge,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getAssignmentsByCharge(req, res, next) {
    try {
      const assignments = await SpecialChargeService.getAssignmentsByCharge(req.params.id, req.query);
      return res.status(200).json({
        success: true,
        data: assignments,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getResidentCharges(req, res, next) {
    try {
      const societyId = req.query.society_id || req.user.societyId || null;
      const charges = await SpecialChargeService.getResidentCharges(req.user, societyId);
      return res.status(200).json({
        success: true,
        data: charges,
      });
    } catch (err) {
      next(err);
    }
  }

  static async recordPayment(req, res, next) {
    try {
      const payment = await SpecialChargeService.recordPayment(req.body, req.user);
      return res.status(201).json({
        success: true,
        message: 'Payment recorded and receipt generated successfully',
        data: payment,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getAllPayments(req, res, next) {
    try {
      const societyId = req.query.society_id || req.user.societyId || null;
      const payments = await SpecialChargeService.getAllPayments(societyId, req.query);
      return res.status(200).json({
        success: true,
        data: payments,
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateCharge(req, res, next) {
    try {
      const updated = await SpecialChargeService.updateCharge(req.params.id, req.body);
      return res.status(200).json({
        success: true,
        message: 'Special charge updated successfully',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  static async deleteCharge(req, res, next) {
    try {
      const result = await SpecialChargeService.deleteCharge(req.params.id);
      return res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getStats(req, res, next) {
    try {
      const societyId = req.query.society_id || req.user.societyId || null;
      const stats = await SpecialChargeService.getStats(societyId, req.user);
      return res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = SpecialChargeController;
