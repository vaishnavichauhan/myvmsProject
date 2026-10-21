const bcrypt = require('bcryptjs');
const SecurityRepository = require('../repositories/security.repository');
const UserRepository = require('../repositories/user.repository');
const SocietyRepository = require('../repositories/society.repository');
const HomeRepository = require('../repositories/home.repository');
const GateRepository = require('../repositories/gate.repository');
const ApiError = require('../utils/apiError');

/**
 * Security/Watchman Management Service
 */
class SecurityService {
  /**
   * Register a new security staff member (Admin only)
   */
  static async createSecurityStaff(data) {
    const {
      name,
      full_name,
      phone,
      password,
      photo,
      avatar_url,
      employee_id,
      badge_number,
      agency_name,
      shift = 'ROTATIONAL',
      status = 'ACTIVE',
      society_id,
    } = data;

    const staffName = (name || full_name || '').trim();
    if (!staffName) {
      throw ApiError.badRequest('Security Staff Name is required.');
    }

    const cleanPhone = String(phone || '').trim();
    if (!cleanPhone || cleanPhone.length < 10) {
      throw ApiError.badRequest('A valid 10-digit Phone Number is required for Security login.');
    }

    if (!password || String(password).length < 6) {
      throw ApiError.badRequest('Password is required and must be at least 6 characters long.');
    }

    const cleanEmployeeId = (employee_id || badge_number || '').trim();
    if (!cleanEmployeeId) {
      throw ApiError.badRequest('Employee ID / Badge Number is required.');
    }

    // Check if phone already registered
    const existingUser = await UserRepository.findByPhone(cleanPhone);
    if (existingUser) {
      throw ApiError.conflict(`A user with phone number "${cleanPhone}" is already registered.`);
    }

    // Resolve society
    let targetSocietyId = society_id;
    if (!targetSocietyId) {
      const societies = await SocietyRepository.findAll();
      targetSocietyId = societies[0]?.id || 1;
    }

    // Hash password securely
    const hashedPassword = await bcrypt.hash(password, 10);

    const createdStaff = await SecurityRepository.createSecurityStaff(
      {
        full_name: staffName,
        phone: cleanPhone,
        password: hashedPassword,
        avatar_url: photo || avatar_url || null,
        status: status || 'ACTIVE',
      },
      {
        society_id: targetSocietyId,
        employee_id: cleanEmployeeId,
        badge_number: cleanEmployeeId,
        agency_name: agency_name || 'In-House Security Staff',
        shift: shift || 'ROTATIONAL',
        status: status || 'ACTIVE',
      }
    );

    return createdStaff;
  }

  /**
   * List all security personnel
   */
  static async getAllSecurityStaff(filters = {}) {
    const rawSocId = filters.society_id || filters.societyId;
    const societyId = (rawSocId && rawSocId !== 'ALL') ? rawSocId : null;
    return SecurityRepository.findAll(societyId, filters);
  }

  /**
   * Get single security staff by ID
   */
  static async getSecurityStaffById(id) {
    const staff = await SecurityRepository.findById(id);
    if (!staff) {
      throw ApiError.notFound(`Security staff member with ID ${id} not found.`);
    }
    return staff;
  }

  /**
   * Edit security staff details (Admin only)
   */
  static async updateSecurityStaff(id, data) {
    const existing = await SecurityRepository.findById(id);
    if (!existing) {
      throw ApiError.notFound(`Security staff member with ID ${id} not found.`);
    }

    const userData = {};
    const staffData = {};

    if (data.name || data.full_name) {
      userData.full_name = data.name || data.full_name;
    }
    if (data.phone) {
      userData.phone = String(data.phone).trim();
    }
    if (data.photo !== undefined || data.avatar_url !== undefined) {
      userData.avatar_url = data.photo || data.avatar_url || null;
    }
    if (data.employee_id || data.badge_number) {
      staffData.employee_id = data.employee_id || data.badge_number;
    }
    if (data.agency_name !== undefined) {
      staffData.agency_name = data.agency_name;
    }
    if (data.shift) {
      staffData.shift = data.shift;
    }
    if (data.status) {
      staffData.status = data.status;
    }
    if (data.society_id || data.societyId) {
      const sId = data.society_id || data.societyId;
      staffData.society_id = sId;
      userData.society_id = sId;
    }

    return SecurityRepository.update(id, userData, staffData);
  }

  /**
   * Activate or deactivate security staff (Admin only)
   */
  static async changeStatus(id, status) {
    const existing = await SecurityRepository.findById(id);
    if (!existing) {
      throw ApiError.notFound(`Security staff member with ID ${id} not found.`);
    }

    const validStatus = ['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED'];
    if (!validStatus.includes(status)) {
      throw ApiError.badRequest(`Status must be one of: ${validStatus.join(', ')}`);
    }

    return SecurityRepository.updateStatus(id, status);
  }

  /**
   * Reset security staff password (Admin only)
   */
  static async resetPassword(id, newPassword) {
    if (!newPassword || String(newPassword).length < 6) {
      throw ApiError.badRequest('New password must be at least 6 characters long.');
    }

    const existing = await SecurityRepository.findById(id);
    if (!existing) {
      throw ApiError.notFound(`Security staff member with ID ${id} not found.`);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await SecurityRepository.resetPassword(existing.user_id, hashedPassword);

    return {
      message: `Password reset successfully for security staff ${existing.full_name} (${existing.employee_id}).`,
    };
  }

  /**
   * Delete security staff (Admin only)
   */
  static async deleteSecurityStaff(id) {
    const existing = await SecurityRepository.findById(id);
    if (!existing) {
      throw ApiError.notFound(`Security staff member with ID ${id} not found.`);
    }

    await SecurityRepository.delete(id);
    return {
      message: `Security staff ${existing.full_name} (${existing.employee_id}) deleted successfully.`,
    };
  }

  // --------------------------------------------------------------------------
  // SECURITY WATCHMAN GATE OPERATIONS
  // "Security must only access information required for gate management."
  // --------------------------------------------------------------------------

  /**
   * Get Gate Dashboard data for security personnel
   */
  static async getGateDashboard(user, requestedSocietyId) {
    let societyId = requestedSocietyId;
    if (!societyId || societyId === 'ALL') {
      societyId = user.societyId || 1;
    }
    return SecurityRepository.getGateDashboardData(societyId);
  }

  /**
   * Search homes for arrival confirmation & intercom
   */
  static async searchHomes(user, query, requestedSocietyId) {
    let societyId = requestedSocietyId;
    if (societyId === undefined || societyId === null) {
      societyId = user.societyId || 'ALL';
    }
    return SecurityRepository.searchHomes(societyId, query);
  }

  /**
   * Record gate entry
   */
  static async recordGateEntry(user, data) {
    if (user.role === 'ADMIN') {
      throw ApiError.forbidden('Administrators cannot register gate entries directly. Entries must be registered by authorized Security Officers.');
    }

    let staff = null;
    if (user.role === 'SECURITY') {
      staff = await SecurityRepository.findByUserId(user.id);
      const assignedGate = await GateRepository.findAssignedGateForSecurity(user.id);
      if (!assignedGate) {
        throw ApiError.forbidden('You are not currently assigned to any gate checkpoint. Only security officers stationed at a gate with Entry Registration enabled can register entries.');
      }
      if (!assignedGate.allows_entry_registration) {
        throw ApiError.forbidden(`Your assigned checkpoint "${assignedGate.gate_name}" does not have Gate Entry Registration enabled. You can only view entry history.`);
      }
    }

    let targetSocietyId = user.societyId || 1;
    if (data.home_id) {
      const home = await HomeRepository.findById(data.home_id);
      if (home && home.society_id) {
        targetSocietyId = home.society_id;
      }
    }

    return SecurityRepository.recordVisitorGateEntry({
      society_id: targetSocietyId,
      security_staff_id: staff?.id || 1,
      name: data.name,
      phone: data.phone,
      home_id: data.home_id,
      visitor_type: data.visitor_type || 'GUEST',
      vehicle_number: data.vehicle_number,
      purpose: data.purpose,
      entry_type: data.entry_type || 'VISITOR',
    });
  }

  /**
   * Record gate exit
   */
  static async recordGateExit(entryId) {
    const success = await SecurityRepository.recordVisitorGateExit(entryId);
    if (!success) throw ApiError.notFound('Entry record not found or already exited.');
    return { message: 'Gate exit logged successfully.' };
  }

  /**
   * Minimum Information Contact Action (Strict Privacy Enforced)
   * Discloses contact phone number strictly when a resident's permission is NO
   */
  static async contactResident(user, data) {
    const { home_id, resident_user_id, permission_type = 'DELIVERY', reason } = data;

    if (!home_id) {
      throw ApiError.badRequest('Home ID is required for contact action.');
    }
    if (!resident_user_id) {
      throw ApiError.badRequest('Resident User ID is required.');
    }

    const societyId = user.societyId || 1;
    const result = await SecurityRepository.getResidentContactForAction(
      societyId,
      home_id,
      resident_user_id,
      permission_type,
      reason,
      user
    );

    if (!result.success) {
      if (result.status === 403) throw ApiError.forbidden(result.message);
      if (result.status === 404) throw ApiError.notFound(result.message);
      throw ApiError.badRequest(result.message);
    }

    return result.data;
  }
}

module.exports = SecurityService;
