const express = require('express');
const router = express.Router();
const SuperAdminController = require('../controllers/superadmin.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { roleMiddleware } = require('../middlewares/role.middleware');
const { ROLES } = require('../constants/roles');

// All Super Admin endpoints strictly require authentication and the SUPER_ADMIN role
router.use(authMiddleware, roleMiddleware(ROLES.SUPER_ADMIN));

// Platform Overview & Statistics
router.get('/overview', SuperAdminController.getOverview);

// Society Management
router.get('/societies', SuperAdminController.getSocieties);
router.post('/societies', SuperAdminController.createSociety);
router.get('/societies/:id', SuperAdminController.getSocietyById);
router.put('/societies/:id', SuperAdminController.updateSociety);
router.post('/societies/:id/suspend', SuperAdminController.suspendSociety);
router.post('/societies/:id/activate', SuperAdminController.activateSociety);

// Society Admins Management
router.get('/admins', SuperAdminController.getSocietyAdmins);
router.post('/admins/:userId/reset-password', SuperAdminController.resetAdminPassword);

// Subscription Plans
router.get('/plans', SuperAdminController.getPlans);
router.post('/plans', SuperAdminController.createPlan);
router.get('/plans/:id', SuperAdminController.getPlanById);
router.put('/plans/:id', SuperAdminController.updatePlan);
router.delete('/plans/:id', SuperAdminController.deletePlan);

// Platform Features
router.get('/features', SuperAdminController.getPlatformFeatures);

// Society Subscriptions
router.get('/subscriptions', SuperAdminController.getSubscriptions);
router.post('/subscriptions/assign', SuperAdminController.assignSubscription);

// Society Limits and Overrides
router.get('/societies/:id/usage', SuperAdminController.getSocietyUsage);
router.post('/societies/:id/limits/override', SuperAdminController.setLimitOverride);
router.post('/societies/:id/features/override', SuperAdminController.setFeatureOverride);

// Subscription Billing and Invoices
router.get('/billing/invoices', SuperAdminController.getInvoices);
router.post('/billing/invoices/:invoiceId/payments', SuperAdminController.recordPayment);

// Platform Audit Logs
router.get('/audit-logs', SuperAdminController.getAuditLogs);

module.exports = router;
