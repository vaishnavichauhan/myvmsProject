const express = require('express');
const router = express.Router();
const PermissionController = require('../controllers/permission.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { roleMiddleware } = require('../middlewares/role.middleware');
const { requirePermission } = require('../middlewares/permission.middleware');

// All permission routes require authentication
router.use(authMiddleware);

/**
 * GET /api/permissions
 * Get home-wise permissions
 */
router.get(
  '/',
  roleMiddleware('OWNER', 'TENANT', 'FAMILY_MEMBER', 'ADMIN'),
  PermissionController.getHomePermissions
);

/**
 * PUT /api/permissions/home/:id
 * PUT /api/permissions/:id
 * Owner, Tenant, Family Member or Admin manages permissions for the home
 */
router.put(
  '/home/:id',
  roleMiddleware('OWNER', 'TENANT', 'FAMILY_MEMBER', 'ADMIN'),
  PermissionController.updatePermissions
);

router.put(
  '/:id',
  roleMiddleware('OWNER', 'TENANT', 'FAMILY_MEMBER', 'ADMIN'),
  PermissionController.updatePermissions
);

/**
 * GET /api/permissions/check/:type
 * Check caller's home permission
 */
router.get(
  '/check/:type',
  roleMiddleware('OWNER', 'TENANT', 'FAMILY_MEMBER', 'ADMIN'),
  PermissionController.checkPermission
);

/**
 * Node.js Backend Enforcement Actions:
 * These actions strictly verify home permissions on the backend!
 */
router.post(
  '/actions/approve-courier',
  requirePermission('COURIER'),
  PermissionController.executeCourierAction
);

router.post(
  '/actions/approve-delivery',
  requirePermission('DELIVERY'),
  PermissionController.executeDeliveryAction
);

router.post(
  '/actions/approve-visitor',
  requirePermission('VISITOR'),
  PermissionController.executeVisitorAction
);

router.post(
  '/actions/manage-worker',
  requirePermission('WORKER'),
  PermissionController.executeWorkerAction
);

module.exports = router;
