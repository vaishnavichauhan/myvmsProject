const PermissionService = require('../services/permission.service');

/**
 * Backend Permission Enforcement Middleware
 * Ensures operations (COURIER, DELIVERY, VISITOR, WORKER) are verified strictly on the Node.js backend.
 * Do not rely only on React UI for security.
 *
 * @param {'COURIER' | 'DELIVERY' | 'VISITOR' | 'WORKER'} permissionType
 */
const requirePermission = (permissionType) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required before permission verification.',
        });
      }

      // Backend verification
      await PermissionService.verifyUserPermission(req.user, permissionType);
      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = {
  requirePermission,
};
