const { Router } = require('express');
const AdminController = require('../controllers/admin.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { roleMiddleware } = require('../middlewares/role.middleware');
const { ROLES } = require('../constants/roles');

const router = Router();

// GET /api/admin/dashboard - High-level metrics, activity feed, and occupancy charts
router.get(
  '/dashboard',
  authMiddleware,
  roleMiddleware(ROLES.ADMIN),
  AdminController.getDashboard
);

// Subscription & Billing for Society Admin
router.get(
  '/subscription',
  authMiddleware,
  roleMiddleware(ROLES.ADMIN),
  AdminController.getSubscriptionBilling
);

router.post(
  '/subscription/invoices/:invoiceId/pay',
  authMiddleware,
  roleMiddleware(ROLES.ADMIN),
  AdminController.submitSubscriptionPayment
);

module.exports = router;
