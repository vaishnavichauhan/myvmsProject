const { Router } = require('express');
const ResidentController = require('../controllers/resident.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { roleMiddleware } = require('../middlewares/role.middleware');
const { requireFeature, enforceLimit } = require('../middlewares/entitlement.middleware');
const { ROLES } = require('../constants/roles');

const router = Router();

// ========================================================
// Resident Routes
// All management operations are strictly restricted to ADMIN
// and require the RESIDENTS platform feature
// ========================================================
router.use(authMiddleware, requireFeature('RESIDENTS'));

// Read endpoints - Strictly restricted to ADMIN
router.get(
  '/',
  roleMiddleware(ROLES.ADMIN, ROLES.SUPER_ADMIN),
  ResidentController.getAll
);
router.get(
  '/society-users',
  roleMiddleware(ROLES.ADMIN, ROLES.SUPER_ADMIN),
  ResidentController.getSocietyUsers
);
router.get(
  '/:id',
  roleMiddleware(ROLES.ADMIN, ROLES.SUPER_ADMIN),
  ResidentController.getById
);

// Admin-Only mutation endpoints
router.post(
  '/',
  roleMiddleware(ROLES.ADMIN, ROLES.SUPER_ADMIN),
  enforceLimit('USERS'),
  ResidentController.create
);

router.post(
  '/import-batch',
  roleMiddleware(ROLES.ADMIN, ROLES.SUPER_ADMIN),
  ResidentController.importBatch
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
