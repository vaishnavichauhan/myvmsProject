const PermissionRepository = require('../repositories/permission.repository');
const UserRepository = require('../repositories/user.repository');
const HomeRepository = require('../repositories/home.repository');
const ApiError = require('../utils/apiError');

const VALID_PERMISSION_TYPES = ['COURIER', 'DELIVERY', 'VISITOR', 'WORKER'];

/**
 * Resident Permission Business Logic Service
 * Enforces Home-wise common permissions.
 * Owner, Tenant, and Family Members of that home all have rights to view, toggle, and update home permissions.
 */
class PermissionService {
  /**
   * Helper: Resolve caller's home
   */
  static async resolveCallerHome(user, requestedHomeId = null) {
    if (user.role === 'ADMIN') {
      if (requestedHomeId) {
        const home = await HomeRepository.findById(requestedHomeId);
        if (!home) throw ApiError.notFound(`Home ${requestedHomeId} not found.`);
        return {
          home_id: home.id,
          society_id: home.society_id,
          home_number: home.home_number,
        };
      }
      return null;
    }

    const homeDetails = await UserRepository.getUserHomeDetails(user.id, user.role);
    if (!homeDetails) {
      throw ApiError.forbidden('Your account is not mapped to an active home.');
    }

    if (requestedHomeId && parseInt(requestedHomeId, 10) !== homeDetails.home_id) {
      throw ApiError.forbidden('You can only view or manage permissions for your own home.');
    }

    return homeDetails;
  }

  /**
   * Get home-wise permissions
   * - ADMIN: returns all homes (or requested home)
   * - RESIDENTS (Owner, Tenant, Family Member): returns their home's permissions
   */
  static async getHomePermissions(user, requestedHomeId = null) {
    if (user.role === 'ADMIN') {
      if (requestedHomeId) {
        const singleHome = await PermissionRepository.findByHomeId(parseInt(requestedHomeId, 10));
        return singleHome ? [singleHome] : [];
      }
      return PermissionRepository.findAllHomes();
    }

    const callerHome = await this.resolveCallerHome(user, requestedHomeId);
    const homeId = callerHome.home_id;

    // Ensure a permission record exists for this home (default to YES / true)
    const existing = await PermissionRepository.findByHomeId(homeId);
    if (!existing || !existing.permission_id) {
      await PermissionRepository.upsertPermission({
        home_id: homeId,
        user_id: user.id,
        courier_permission: true,
        delivery_permission: true,
        visitor_permission: true,
        worker_permission: true,
      });
    }

    const updated = await PermissionRepository.findByHomeId(homeId);
    return updated ? [updated] : [];
  }

  /**
   * Update home permissions
   * - OWNER, TENANT, and FAMILY_MEMBER can all update their home's permissions.
   * - ADMIN can update any home's permissions.
   */
  static async updateResidentPermissions(user, targetHomeOrUserId, data = {}) {
    let targetHomeId = null;

    if (data.home_id) {
      targetHomeId = parseInt(data.home_id, 10);
    } else if (targetHomeOrUserId) {
      const cleanId = parseInt(targetHomeOrUserId, 10);
      // Check if targetId is a valid home_id
      const home = await HomeRepository.findById(cleanId);
      if (home) {
        targetHomeId = home.id;
      } else {
        // Fallback: check if cleanId is a user id
        const userHome = await UserRepository.getUserHomeDetails(cleanId, user.role);
        if (userHome) {
          targetHomeId = userHome.home_id;
        }
      }
    }

    // If still not resolved, resolve from caller's own home
    if (!targetHomeId) {
      const callerHome = await this.resolveCallerHome(user);
      if (!callerHome) {
        throw ApiError.badRequest('Please provide a valid home_id to update permissions.');
      }
      targetHomeId = callerHome.home_id;
    }

    // Authorization verification
    if (user.role === 'ADMIN') {
      // Admin has full authorization
    } else if (['OWNER', 'TENANT', 'FAMILY_MEMBER'].includes(user.role)) {
      const isMember = await PermissionRepository.isUserMemberOfHome(user.id, targetHomeId);
      if (!isMember) {
        throw ApiError.forbidden('You can only update permissions for your own home.');
      }
    } else {
      throw ApiError.forbidden('Only authorized residents (Owner, Tenant, Family Member) or Admin can update home permissions.');
    }

    const {
      courier_permission,
      delivery_permission,
      visitor_permission,
      worker_permission,
    } = data;

    const currentPerm = await PermissionRepository.findByHomeId(targetHomeId);

    const updatedRecord = await PermissionRepository.upsertPermission({
      home_id: targetHomeId,
      user_id: user.id, // Record the resident who made the change
      courier_permission: courier_permission !== undefined ? Boolean(courier_permission) : (currentPerm ? currentPerm.courier_permission : true),
      delivery_permission: delivery_permission !== undefined ? Boolean(delivery_permission) : (currentPerm ? currentPerm.delivery_permission : true),
      visitor_permission: visitor_permission !== undefined ? Boolean(visitor_permission) : (currentPerm ? currentPerm.visitor_permission : true),
      worker_permission: worker_permission !== undefined ? Boolean(worker_permission) : (currentPerm ? currentPerm.worker_permission : true),
    });

    return updatedRecord;
  }

  /**
   * Verify if a user/home has a specific permission for backend enforcement
   */
  static async verifyUserPermission(user, permissionType) {
    const typeUpper = permissionType.toUpperCase();
    if (!VALID_PERMISSION_TYPES.includes(typeUpper)) {
      throw ApiError.badRequest(
        `Invalid permission type: ${permissionType}. Must be one of: ${VALID_PERMISSION_TYPES.join(', ')}`
      );
    }

    // Admins always have all permissions
    if (user.role === 'ADMIN') {
      return { allowed: true, reason: 'ADMIN_BYPASS' };
    }

    const callerHome = await this.resolveCallerHome(user);
    if (!callerHome) {
      throw ApiError.forbidden('Action denied. No home associated with account.');
    }

    const hasPerm = await PermissionRepository.hasPermission(callerHome.home_id, typeUpper);

    if (!hasPerm) {
      throw ApiError.forbidden(
        `Action denied. Home ${callerHome.home_number} has '${typeUpper}' permission set to NO.`
      );
    }

    return { allowed: true, permissionType: typeUpper, homeId: callerHome.home_id };
  }
}

module.exports = PermissionService;
