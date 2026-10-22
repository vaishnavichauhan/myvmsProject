const { Router } = require('express');
const SocietyController = require('../controllers/society.controller');
const HomeController = require('../controllers/home.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { roleMiddleware } = require('../middlewares/role.middleware');
const { ROLES } = require('../constants/roles');

const router = Router();

// ==========================================
// Society Routes
// ==========================================

// Read access for Society Directory (All authenticated users: Admin, Security, Resident, Family Member)
router.get('/', authMiddleware, SocietyController.getAll);
router.get('/:id', authMiddleware, SocietyController.getById);

// Admin-Only mutation access (Only ADMIN can create/edit/delete society)
router.post(
  '/',
  authMiddleware,
  roleMiddleware(ROLES.ADMIN),
  SocietyController.create
);

router.put(
  '/:id',
  authMiddleware,
  roleMiddleware(ROLES.ADMIN),
  SocietyController.update
);

router.delete(
  '/:id',
  authMiddleware,
  roleMiddleware(ROLES.ADMIN),
  SocietyController.delete
);

// ==========================================
// Nested Home Routes within Society
// ==========================================

// Get all homes in a society
router.get('/:societyId/homes', authMiddleware, HomeController.getAllBySociety);

// Admin-Only: Create single home in a society
router.post(
  '/:societyId/homes',
  authMiddleware,
  roleMiddleware(ROLES.ADMIN),
  HomeController.create
);

// Admin-Only: Batch generate homes (e.g. Home 1 to Home 100)
router.post(
  '/:societyId/homes/batch',
  authMiddleware,
  roleMiddleware(ROLES.ADMIN),
  HomeController.batchGenerate
);

module.exports = router;
