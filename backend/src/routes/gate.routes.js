const express = require('express');
const router = express.Router();
const GateController = require('../controllers/gate.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { roleMiddleware } = require('../middlewares/role.middleware');

// All gate routes require authentication
router.use(authMiddleware);

// --------------------------------------------------------------------------
// 1. Security Self Check-In: Security picks their gate when they start duty
// Security sees all gates, selects one -> records check_in_time
// --------------------------------------------------------------------------
router.post(
  '/self-checkin',
  roleMiddleware('SECURITY'),
  GateController.selfCheckIn
);

// --------------------------------------------------------------------------
// 2. Security Self Check-Out: Security exits gate (called on logout or manual exit)
// Records check_out_time for their active assignment
// --------------------------------------------------------------------------
router.post(
  '/self-checkout',
  roleMiddleware('SECURITY'),
  GateController.selfCheckOut
);

// --------------------------------------------------------------------------
// 3. Security Staff: View My Active Gate Assignment
// --------------------------------------------------------------------------
router.get(
  '/assigned/me',
  roleMiddleware('SECURITY', 'ADMIN'),
  GateController.getMyAssignedGate
);

// --------------------------------------------------------------------------
// 4. Read Gates
// Admin: Management view
// Residents / Security: Available gates view
// --------------------------------------------------------------------------
router.get('/', GateController.getAll);
router.get('/:id', GateController.getById);

// --------------------------------------------------------------------------
// 5. Admin-Only Gate Management: Create, Edit, Delete Gates
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

module.exports = router;
