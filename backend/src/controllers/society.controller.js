const SocietyService = require('../services/society.service');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');

/**
 * Society Management Controller
 */
class SocietyController {
  /**
   * POST /api/societies (Super Admin Only)
   */
  static async create(req, res, next) {
    try {
      if (req.user && req.user.role !== 'SUPER_ADMIN') {
        throw ApiError.forbidden('Only Super Admin can register new residential societies.');
      }
      const society = await SocietyService.createSociety(req.body);
      return ApiResponse.created(res, 'Residential Society created successfully', { society });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/societies
   */
  static async getAll(req, res, next) {
    try {
      const societies = await SocietyService.getAllSocieties(req.query, req.user);
      return ApiResponse.success(res, 'Societies retrieved successfully', { societies });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/societies/:id
   */
  static async getById(req, res, next) {
    try {
      if (req.user && req.user.role !== 'SUPER_ADMIN') {
        const callerSocId = req.user.society_id || req.user.societyId;
        if (callerSocId && String(req.params.id) !== String(callerSocId)) {
          throw ApiError.forbidden('Access denied. You can only view your own society.');
        }
      }
      const society = await SocietyService.getSocietyById(req.params.id);
      return ApiResponse.success(res, 'Society details retrieved', { society });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/societies/:id (Admin Only)
   */
  static async update(req, res, next) {
    try {
      if (req.user && req.user.role !== 'SUPER_ADMIN') {
        const callerSocId = req.user.society_id || req.user.societyId;
        if (callerSocId && String(req.params.id) !== String(callerSocId)) {
          throw ApiError.forbidden('Access denied. You can only modify your own society.');
        }
      }
      const society = await SocietyService.updateSociety(req.params.id, req.body, req.user);
      return ApiResponse.success(res, 'Society updated successfully', { society });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/societies/:id (Super Admin Only)
   */
  static async delete(req, res, next) {
    try {
      if (req.user && req.user.role !== 'SUPER_ADMIN') {
        throw ApiError.forbidden('Only Super Admin can delete societies.');
      }
      const hardDelete = req.query.permanent !== 'false';
      const result = await SocietyService.deleteSociety(req.params.id, hardDelete);
      return ApiResponse.success(res, result.message, null);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = SocietyController;
