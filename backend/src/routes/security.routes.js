const express = require('express');
const router = express.Router();
const SecurityController = require('../controllers/security.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { roleMiddleware } = require('../middlewares/role.middleware');

// All security routes require authentication
router.use(authMiddleware);

// --------------------------------------------------------------------------
// GATE CONSOLE ROUTES (Security Watchman & Admin)
// "Security must only access information required for gate management."
// --------------------------------------------------------------------------
router.get(
  '/gate/dashboard',
  roleMiddleware('SECURITY', 'ADMIN'),
  SecurityController.getGateDashboard
);

router.get(
  '/gate/search-homes',
  roleMiddleware('SECURITY', 'ADMIN'),
  SecurityController.searchHomes
);

router.post(
  '/gate/entry',
  roleMiddleware('SECURITY', 'ADMIN'),
  SecurityController.recordGateEntry
);

router.patch(
  '/gate/exit/:id',
  roleMiddleware('SECURITY', 'ADMIN'),
  SecurityController.recordGateExit
);

router.post(
  '/gate/contact-resident',
  roleMiddleware('SECURITY', 'ADMIN'),
  SecurityController.contactResident
);

// --------------------------------------------------------------------------
// ADMIN SECURITY STAFF MANAGEMENT ROUTES (Admin Only)
// --------------------------------------------------------------------------
router.post(
  '/',
  roleMiddleware('ADMIN'),
  SecurityController.createSecurity
);

router.get(
  '/',
  roleMiddleware('ADMIN'),
  SecurityController.getAll
);

router.get(
  '/:id',
  roleMiddleware('ADMIN'),
  SecurityController.getById
);

router.put(
  '/:id',
  roleMiddleware('ADMIN'),
  SecurityController.update
);

router.patch(
  '/:id/status',
  roleMiddleware('ADMIN'),
  SecurityController.updateStatus
);

router.post(
  '/:id/reset-password',
  roleMiddleware('ADMIN'),
  SecurityController.resetPassword
);

router.delete(
  '/:id',
  roleMiddleware('ADMIN'),
  SecurityController.delete
);

module.exports = router;
