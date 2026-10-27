const { Router } = require('express');
const SpecialChargeController = require('../controllers/special-charge.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { requireFeature } = require('../middlewares/entitlement.middleware');

const router = Router();

// Authentication and SOCIETY_FINANCE module required for all endpoints
router.use(authMiddleware, requireFeature('SOCIETY_FINANCE'));

// Statistics & Overview
router.get('/stats', SpecialChargeController.getStats);

// Resident specific charges
router.get('/my-charges', SpecialChargeController.getResidentCharges);

// Payments & Receipts (MUST be before /:id)
router.get('/payments', SpecialChargeController.getAllPayments);
router.post('/payments', SpecialChargeController.recordPayment);
router.post('/payments/:id/approve', SpecialChargeController.approvePayment);
router.post('/payments/:id/reject', SpecialChargeController.rejectPayment);

// Special charges CRUD
router.get('/', SpecialChargeController.getAllCharges);
router.post('/', SpecialChargeController.createCharge);
router.get('/:id', SpecialChargeController.getChargeById);
router.put('/:id', SpecialChargeController.updateCharge);
router.delete('/:id', SpecialChargeController.deleteCharge);

// Home assignments for a charge
router.get('/:id/assignments', SpecialChargeController.getAssignmentsByCharge);

module.exports = router;
