const { Router } = require('express');
const ResidentController = require('../controllers/resident.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { roleMiddleware } = require('../middlewares/role.middleware');
const { ROLES } = require('../constants/roles');

const router = Router();

// ========================================================
// Resident Routes
// All management operations are strictly restricted to ADMIN
// ========================================================

// Read endpoints - Strictly restricted to ADMIN
router.get(
  '/',
  authMiddleware,
  roleMiddleware(ROLES.ADMIN),
  ResidentController.getAll
);
router.get(
  '/:id',
  authMiddleware,
  roleMiddleware(ROLES.ADMIN),
  ResidentController.getById
);

// Admin-Only mutation endpoints
router.post(
  '/',
  authMiddleware,
  roleMiddleware(ROLES.ADMIN),
  ResidentController.create
);

router.put(
  '/:id',
  authMiddleware,
  roleMiddleware(ROLES.ADMIN),
  ResidentController.update
);

router.patch(
  '/:id/status',
  authMiddleware,
  roleMiddleware(ROLES.ADMIN),
  ResidentController.updateStatus
);

router.post(
  '/:id/reset-password',
  authMiddleware,
  roleMiddleware(ROLES.ADMIN),
  ResidentController.resetPassword
);

router.delete(
  '/:id',
  authMiddleware,
  roleMiddleware(ROLES.ADMIN),
  ResidentController.delete
);

module.exports = router;
