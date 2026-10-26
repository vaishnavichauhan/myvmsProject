const ResidentService = require('../services/resident.service');
const ApiResponse = require('../utils/apiResponse');

/**
 * Resident Management Controller
 */
class ResidentController {
  /**
   * POST /api/residents (Admin Only)
   * Register primary resident for a home
   */
  static async create(req, res, next) {
    try {
      const resident = await ResidentService.createResident(req.body, req.user);
      return ApiResponse.created(res, 'Resident registered successfully', { resident });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/residents (Admin / Staff)
   * List all residents with filters
   */
  static async getAll(req, res, next) {
    try {
      const residents = await ResidentService.getAllResidents(req.query, req.user);
      return ApiResponse.success(res, 'Residents retrieved successfully', { residents });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/residents/:id
   */
  static async getById(req, res, next) {
    try {
      const resident = await ResidentService.getResidentById(req.params.id, req.user);
      return ApiResponse.success(res, 'Resident details retrieved', { resident });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/residents/:id (Admin Only)
   * Update resident details
   */
  static async update(req, res, next) {
    try {
      const resident = await ResidentService.updateResident(req.params.id, req.body, req.user);
      return ApiResponse.success(res, 'Resident updated successfully', { resident });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/residents/:id/status (Admin Only)
   * Activate or deactivate resident
   */
  static async updateStatus(req, res, next) {
    try {
      const { status } = req.body;
      const resident = await ResidentService.changeResidentStatus(req.params.id, status, req.user);
      return ApiResponse.success(res, `Resident status updated to ${status}`, { resident });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/residents/:id/reset-password (Admin Only)
   * Reset resident password
   */
  static async resetPassword(req, res, next) {
    try {
      const { newPassword } = req.body;
      const result = await ResidentService.resetResidentPassword(req.params.id, newPassword, req.user);
      return ApiResponse.success(res, result.message, null);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/residents/:id (Admin Only)
   * Delete resident
   */
  static async delete(req, res, next) {
    try {
      const result = await ResidentService.deleteResident(req.params.id, req.user);
      return ApiResponse.success(res, result.message, null);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ResidentController;
