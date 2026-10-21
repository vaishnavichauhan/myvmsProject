const express = require('express');
const router = express.Router();
const GateController = require('../controllers/gate.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { roleMiddleware } = require('../middlewares/role.middleware');

// All gate routes require authentication
router.use(authMiddleware);

// --------------------------------------------------------------------------
// 1. Security Staff: View My Assigned Gate
// "Security should see their assigned gate."
// --------------------------------------------------------------------------
router.get(
  '/assigned/me',
  roleMiddleware('SECURITY', 'ADMIN'),
  GateController.getMyAssignedGate
);

// --------------------------------------------------------------------------
// 2. Read Gates
// Admin: Management view
// Residents: Available gates & assigned guard with Call action
// --------------------------------------------------------------------------
router.get('/', GateController.getAll);
router.get('/:id', GateController.getById);

// --------------------------------------------------------------------------
// 3. Admin-Only Gate Management
// Create, Edit, Delete Gates
// --------------------------------------------------------------------------
router.post(
  '/',
  roleMiddleware('ADMIN'),
  GateController.create
);

router.put(
  '/:id',
  roleMiddleware('ADMIN'),
  GateController.update
);

router.delete(
  '/:id',
  roleMiddleware('ADMIN'),
  GateController.delete
);

// --------------------------------------------------------------------------
// 4. Admin-Only Security Staff Assignment to Gate
// "Admin can assign security staff to gates (e.g. Rakesh, Gate: Main Gate, Shift: Morning)"
// --------------------------------------------------------------------------
router.post(
  '/assign',
  roleMiddleware('ADMIN'),
  GateController.assignStaff
);

router.delete(
  '/assignments/:id',
  roleMiddleware('ADMIN'),
  GateController.unassignStaff
);

module.exports = router;
