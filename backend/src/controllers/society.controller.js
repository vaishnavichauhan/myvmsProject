const SocietyService = require('../services/society.service');
const ApiResponse = require('../utils/apiResponse');

/**
 * Society Management Controller
 */
class SocietyController {
  /**
   * POST /api/societies (Admin Only)
   */
  static async create(req, res, next) {
    try {
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
      const societies = await SocietyService.getAllSocieties(req.query);
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
      const society = await SocietyService.updateSociety(req.params.id, req.body);
      return ApiResponse.success(res, 'Society updated successfully', { society });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/societies/:id (Admin Only)
   */
  static async delete(req, res, next) {
    try {
      const hardDelete = req.query.permanent === 'true';
      const result = await SocietyService.deleteSociety(req.params.id, hardDelete);
      return ApiResponse.success(res, result.message, null);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = SocietyController;
