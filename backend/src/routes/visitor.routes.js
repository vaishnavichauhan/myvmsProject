const express = require('express');
const router = express.Router();
const VisitorController = require('../controllers/visitor.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { roleMiddleware } = require('../middlewares/role.middleware');

// All visitor routes require authentication
router.use(authMiddleware);

// --------------------------------------------------------------------------
// 1. Permission Check
// Flow: Visitor arrives -> Security searches Home -> Backend checks visitor permission
// --------------------------------------------------------------------------
router.get(
  '/check-permission/:homeId',
  roleMiddleware('SECURITY', 'ADMIN', 'OWNER', 'TENANT', 'FAMILY_MEMBER', 'COMMITTEE_MEMBER'),
  VisitorController.checkHomePermission
);

// --------------------------------------------------------------------------
// 2. Create Visitor Entry
// Security creates entry with Status: PENDING / APPROVED / ENTERED based on rules
// --------------------------------------------------------------------------
router.post(
  '/entry',
  roleMiddleware('SECURITY', 'ADMIN'),
  VisitorController.createVisitorEntry
);

// --------------------------------------------------------------------------
// 3. Resident Approval / Rejection
// Resident approves/rejects when permission requires approval
// --------------------------------------------------------------------------
router.patch(
  '/entries/:id/approval',
  roleMiddleware('OWNER', 'TENANT', 'FAMILY_MEMBER', 'ADMIN'),
  VisitorController.respondToApproval
);

// --------------------------------------------------------------------------
// 4. Security Records Entry & Exit
// Security records entry when approved/allowed -> Security records exit when leaving
// --------------------------------------------------------------------------
router.patch(
  '/entries/:id/record-entry',
  roleMiddleware('SECURITY', 'ADMIN'),
  VisitorController.recordEntry
);

router.patch(
  '/entries/:id/record-exit',
  roleMiddleware('SECURITY', 'ADMIN'),
  VisitorController.recordExit
);

// --------------------------------------------------------------------------
// 5. Complete Visitor History
// Keep complete visitor history accessible to Security, Residents (own home), & Admin
// --------------------------------------------------------------------------
router.get(
  '/history',
  VisitorController.getHistory
);

router.get(
  '/entries/:id',
  VisitorController.getById
);

module.exports = router;
