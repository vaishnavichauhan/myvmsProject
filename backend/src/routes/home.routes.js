const { Router } = require('express');
const HomeController = require('../controllers/home.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { roleMiddleware } = require('../middlewares/role.middleware');
const { ROLES } = require('../constants/roles');

const router = Router();

// Get all homes (Admin & Security)
router.get('/', authMiddleware, roleMiddleware(ROLES.ADMIN, ROLES.SECURITY), HomeController.getAll);

// Get home by ID
router.get('/:id', authMiddleware, HomeController.getById);

// Admin-Only home mutation
router.put(
  '/:id',
  authMiddleware,
  roleMiddleware(ROLES.ADMIN),
  HomeController.update
);

router.delete(
  '/:id',
  authMiddleware,
  roleMiddleware(ROLES.ADMIN),
  HomeController.delete
);

module.exports = router;
