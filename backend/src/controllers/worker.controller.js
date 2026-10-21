const WorkerService = require('../services/worker.service');
const ApiResponse = require('../utils/apiResponse');

/**
 * Worker Management Controller
 * Handles HTTP requests for Home Worker Management module.
 */
class WorkerController {
  /**
   * GET /api/workers
   * Retrieve all workers connected to the caller's home (or all society workers for Admin)
   */
  static async getHomeWorkers(req, res, next) {
    try {
      const workers = await WorkerService.getHomeWorkers(req.user, req.query.homeId, req.query);
      return ApiResponse.success(res, 'Home workers retrieved successfully', { workers });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/workers/search
   * Search existing workers in society (for searchable dropdown)
   */
  static async searchWorkers(req, res, next) {
    try {
      const workers = await WorkerService.searchExistingWorkers(req.user, {
        worker_type: req.query.worker_type || req.query.type,
        search: req.query.search || req.query.q,
        requestedHomeId: req.query.homeId,
        societyId: req.query.societyId,
      });
      return ApiResponse.success(res, 'Workers search results', { workers });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/workers/assign
   * Select an existing worker and link to caller's home
   */
  static async addExistingWorker(req, res, next) {
    try {
      const result = await WorkerService.addExistingWorkerToHome(req.user, req.body);
      return ApiResponse.created(res, result.message, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/workers
   * Add a new worker (or reuse if phone exists). For Admin, creates society worker. For Resident, links to home.
   */
  static async createWorker(req, res, next) {
    try {
      const result = await WorkerService.createWorkerAndAddToHome(req.user, req.body);
      return ApiResponse.created(res, result.message, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/workers/assignments/:id
   * Edit worker relationship / timing / status for caller's home
   */
  static async updateAssignment(req, res, next) {
    try {
      const updated = await WorkerService.editWorkerRelationship(
        req.user,
        req.params.id,
        req.body
      );
      return ApiResponse.success(res, 'Worker relationship updated successfully', { assignment: updated });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/workers/assignments/:id
   * Remove worker from caller's home
   */
  static async removeWorker(req, res, next) {
    try {
      const result = await WorkerService.removeWorkerFromHome(req.user, req.params.id);
      return ApiResponse.success(res, result.message, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/workers/:id
   * Delete worker master record from society (Admin only)
   */
  static async deleteWorker(req, res, next) {
    try {
      const result = await WorkerService.deleteWorker(req.user, req.params.id);
      return ApiResponse.success(res, result.message, result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = WorkerController;
