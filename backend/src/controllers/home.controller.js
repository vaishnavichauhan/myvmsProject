const HomeService = require('../services/home.service');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');

/**
 * Home/Unit Management Controller
 */
class HomeController {
  /**
   * POST /api/societies/:societyId/homes (Admin Only)
   */
  static async create(req, res, next) {
    try {
      let targetSocId = req.params.societyId;
      if (req.user && req.user.role !== 'SUPER_ADMIN') {
        const callerSocId = req.user.society_id || req.user.societyId;
        if (callerSocId && String(targetSocId) !== String(callerSocId)) {
          throw ApiError.forbidden('Access denied. You cannot create homes in another society.');
        }
      }
      const home = await HomeService.createHome(targetSocId, req.body);
      return ApiResponse.created(res, 'Home created successfully', { home });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/societies/:societyId/homes/batch (Admin Only)
   * Rapid generation e.g. Home 1 to Home 100
   */
  static async batchGenerate(req, res, next) {
    try {
      let targetSocId = req.params.societyId;
      if (req.user && req.user.role !== 'SUPER_ADMIN') {
        const callerSocId = req.user.society_id || req.user.societyId;
        if (callerSocId && String(targetSocId) !== String(callerSocId)) {
          throw ApiError.forbidden('Access denied. You cannot generate homes in another society.');
        }
      }
      const result = await HomeService.batchGenerateHomes(targetSocId, req.body);
      return ApiResponse.created(res, result.message, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/homes (Admin & Authorized users list homes)
   */
  static async getAll(req, res, next) {
    try {
      let societyId = req.query.societyId || req.query.society_id;
      if (req.user && req.user.role !== 'SUPER_ADMIN') {
        societyId = req.user.society_id || req.user.societyId;
      }
      const homes = societyId && societyId !== 'ALL'
        ? await HomeService.getHomesBySociety(societyId, req.query)
        : await HomeService.getAllHomes(req.query);
      return ApiResponse.success(res, 'Homes retrieved successfully', { homes });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/societies/:societyId/homes
   */
  static async getAllBySociety(req, res, next) {
    try {
      let targetSocId = req.params.societyId;
      if (req.user && req.user.role !== 'SUPER_ADMIN') {
        const callerSocId = req.user.society_id || req.user.societyId;
        if (callerSocId && String(targetSocId) !== String(callerSocId)) {
          throw ApiError.forbidden('Access denied. You cannot view homes of another society.');
        }
      }
      const homes = await HomeService.getHomesBySociety(targetSocId, req.query);
      return ApiResponse.success(res, 'Homes retrieved successfully', { homes });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/homes/:id
   */
  static async getById(req, res, next) {
    try {
      const home = await HomeService.getHomeById(req.params.id);
      return ApiResponse.success(res, 'Home details retrieved', { home });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/homes/:id (Admin Only)
   */
  static async update(req, res, next) {
    try {
      const home = await HomeService.updateHome(req.params.id, req.body);
      return ApiResponse.success(res, 'Home updated successfully', { home });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/homes/:id (Admin Only)
   */
  static async delete(req, res, next) {
    try {
      const result = await HomeService.deleteHome(req.params.id);
      return ApiResponse.success(res, result.message, null);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = HomeController;
