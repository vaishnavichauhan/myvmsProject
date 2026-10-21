const express = require('express');
const router = express.Router();
const CourierDeliveryController = require('../controllers/courier-delivery.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { roleMiddleware } = require('../middlewares/role.middleware');

// All routes require authentication
router.use(authMiddleware);

// 1. Permission check
router.get(
  '/check-permission/:homeId',
  roleMiddleware('SECURITY', 'ADMIN', 'OWNER', 'TENANT', 'FAMILY_MEMBER', 'COMMITTEE_MEMBER'),
  CourierDeliveryController.checkPermission
);

// 2. Security creates entry (Types: COURIER, DELIVERY)
router.post(
  '/',
  roleMiddleware('SECURITY', 'ADMIN'),
  CourierDeliveryController.createEntry
);

// 3. Security initiates Call Resident
router.post(
  '/call-resident',
  roleMiddleware('SECURITY', 'ADMIN'),
  CourierDeliveryController.callResident
);

// 4. Resident approves / rejects
router.patch(
  '/:id/approval',
  roleMiddleware('OWNER', 'TENANT', 'FAMILY_MEMBER', 'ADMIN'),
  CourierDeliveryController.respondToApproval
);

// 5. Security records gate entry
router.patch(
  '/:id/record-entry',
  roleMiddleware('SECURITY', 'ADMIN'),
  CourierDeliveryController.recordEntry
);

// 6. Security records gate exit
router.patch(
  '/:id/record-exit',
  roleMiddleware('SECURITY', 'ADMIN'),
  CourierDeliveryController.recordExit
);

// 7. Complete history & activity logs
router.get(
  '/',
  CourierDeliveryController.getHistory
);

// 8. Single record details
router.get(
  '/:id',
  CourierDeliveryController.getById
);

module.exports = router;
