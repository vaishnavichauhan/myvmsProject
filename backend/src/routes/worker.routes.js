const express = require('express');
const router = express.Router();
const WorkerController = require('../controllers/worker.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { roleMiddleware } = require('../middlewares/role.middleware');

// All worker routes require authentication
router.use(authMiddleware);

/**
 * GET /api/workers
 * View workers connected to caller's home
 */
router.get(
  '/',
  roleMiddleware('OWNER', 'TENANT', 'FAMILY_MEMBER', 'ADMIN', 'SECURITY'),
  WorkerController.getHomeWorkers
);

/**
 * GET /api/workers/search
 * Search existing workers in society (for searchable dropdown)
 */
router.get(
  '/search',
  roleMiddleware('OWNER', 'TENANT', 'FAMILY_MEMBER', 'ADMIN', 'SECURITY'),
  WorkerController.searchWorkers
);

/**
 * POST /api/workers/assign
 * Select existing worker from dropdown and assign to caller's home
 */
router.post(
  '/assign',
  roleMiddleware('OWNER', 'TENANT', 'FAMILY_MEMBER', 'ADMIN'),
  WorkerController.addExistingWorker
);

/**
 * POST /api/workers
 * Add a new worker (or reuse existing) and assign to caller's home
 */
router.post(
  '/',
  roleMiddleware('OWNER', 'TENANT', 'FAMILY_MEMBER', 'ADMIN'),
  WorkerController.createWorker
);

/**
 * PUT /api/workers/assignments/:id
 * Edit worker relationship / timing / status for caller's home
 */
router.put(
  '/assignments/:id',
  roleMiddleware('OWNER', 'TENANT', 'FAMILY_MEMBER', 'ADMIN'),
  WorkerController.updateAssignment
);

/**
 * DELETE /api/workers/assignments/:id
 * Remove worker from caller's home
 */
router.delete(
  '/assignments/:id',
  roleMiddleware('OWNER', 'TENANT', 'FAMILY_MEMBER', 'ADMIN'),
  WorkerController.removeWorker
);

/**
 * DELETE /api/workers/:id
 * Delete worker master record from society (Admin only)
 */
router.delete(
  '/:id',
  roleMiddleware('ADMIN'),
  WorkerController.deleteWorker
);

module.exports = router;
