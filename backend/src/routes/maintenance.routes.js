const { Router } = require('express');
const MaintenanceController = require('../controllers/maintenance.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { requireFeature } = require('../middlewares/entitlement.middleware');

const router = Router();

// Authentication and SOCIETY_FINANCE module required for all maintenance endpoints
router.use(authMiddleware, requireFeature('SOCIETY_FINANCE'));

// Statistics & Overview KPIs
router.get('/stats', MaintenanceController.getStats);

// Maintenance Plans & Penalty Configurations
router.get('/plans', MaintenanceController.getAllPlans);
router.post('/plans', MaintenanceController.createPlan);
router.get('/plans/:id', MaintenanceController.getPlanById);
router.put('/plans/:id', MaintenanceController.updatePlan);
router.delete('/plans/:id', MaintenanceController.deletePlan);

// Maintenance Invoices (Bills)
router.get('/bills', MaintenanceController.getAllBills);
router.post('/bills/generate', MaintenanceController.generateBatchBills);
router.post('/bills/custom', MaintenanceController.createCustomBill);
router.post('/bills/select-plan', MaintenanceController.selectResidentPlan);
router.get('/bills/:id', MaintenanceController.getBillById);

// Payment Collections & Receipts
router.get('/payments', MaintenanceController.getAllPayments);
router.post('/payments', MaintenanceController.recordPayment);
router.post('/payments/:id/approve', MaintenanceController.approvePayment);
router.post('/payments/:id/reject', MaintenanceController.rejectPayment);

module.exports = router;
