const GateRepository = require('../repositories/gate.repository');
const SecurityRepository = require('../repositories/security.repository');
const UserRepository = require('../repositories/user.repository');
const ApiError = require('../utils/apiError');

/**
 * Gate Management & Security Assignment Service
 */
class GateService {
  /**
   * Create new gate (Admin only)
   * Fields: Gate Name, Gate Number, Location, Status, Gate Type, Is Automated Barrier
   */
  static async createGate(data) {
    const {
      name,
      gate_number,
      location,
      status = 'ACTIVE',
      society_id = 1,
      gate_type = 'MAIN_ENTRY',
      is_automated_barrier = false,
      allows_entry_registration = true,
    } = data;

    if (!name || !name.trim()) {
      throw ApiError.badRequest('Gate Name is required (e.g. Main Gate, Gate 2, Service Gate, Parking Gate).');
    }

    return GateRepository.create({
      society_id,
      name: name.trim(),
      gate_number: gate_number ? String(gate_number).trim() : null,
      location: location ? location.trim() : null,
      status: status || 'ACTIVE',
      gate_type: gate_type || 'MAIN_ENTRY',
      is_automated_barrier: Boolean(is_automated_barrier),
      allows_entry_registration: allows_entry_registration === undefined ? true : Boolean(allows_entry_registration),
    });
  }

  /**
   * Get all gates with role-scoped output
   * - Admin: Complete gate management details & security staff assignment details.
   * - Residents: Gate Name, Gate Number, Location, Status, Assigned Security Name, Shift & Call action.
   */
  static async getAllGates(user, filters = {}) {
    let societyId = user?.societyId;
    if (!societyId && user?.id) {
      const homeDetails = await UserRepository.getUserHomeDetails(user.id, user.role);
      societyId = homeDetails?.society_id;
    }
    if (!societyId && user?.id) {
      const dbUser = await UserRepository.findById(user.id);
      societyId = dbUser?.society_id;
    }
    societyId = societyId || 1;
    const role = user?.role;

    if (role === 'OWNER' || role === 'TENANT' || role === 'FAMILY_MEMBER') {
      return GateRepository.getGatesForResidents(societyId);
    }

    return GateRepository.findAll(societyId, filters);
  }

  /**
   * Get single gate by ID
   */
  static async getGateById(id) {
    const gate = await GateRepository.findById(id);
    if (!gate) {
      throw ApiError.notFound(`Gate with ID ${id} not found.`);
    }
    return gate;
  }

  /**
   * Edit gate (Admin only)
   */
  static async updateGate(id, data) {
    const existing = await GateRepository.findById(id);
    if (!existing) {
      throw ApiError.notFound(`Gate with ID ${id} not found.`);
    }

    return GateRepository.update(id, data);
  }

  /**
   * Delete gate (Admin only)
   */
  static async deleteGate(id) {
    const existing = await GateRepository.findById(id);
    if (!existing) {
      throw ApiError.notFound(`Gate with ID ${id} not found.`);
    }

    await GateRepository.delete(id);
    return { message: `Gate "${existing.name}" deleted successfully.` };
  }

  /**
   * Assign security staff to gate (Admin only)
   * Example: Rakesh, Gate: Main Gate, Shift: Morning
   */
  static async assignSecurityStaff(data) {
    const { security_staff_id, gate_id, shift = 'MORNING', assigned_date } = data;

    if (!security_staff_id) {
      throw ApiError.badRequest('Security Staff ID is required for assignment.');
    }
    if (!gate_id) {
      throw ApiError.badRequest('Gate ID is required for assignment.');
    }

    // Verify gate exists
    const gate = await GateRepository.findById(gate_id);
    if (!gate) {
      throw ApiError.notFound(`Gate with ID ${gate_id} not found.`);
    }

    // Verify security staff exists
    const staff = await SecurityRepository.findById(security_staff_id);
    if (!staff) {
      throw ApiError.notFound(`Security staff with ID ${security_staff_id} not found.`);
    }

    const validShifts = ['MORNING', 'EVENING', 'NIGHT', 'ROTATIONAL'];
    if (!validShifts.includes(shift.toUpperCase())) {
      throw ApiError.badRequest(`Shift must be one of: ${validShifts.join(', ')}`);
    }

    await GateRepository.assignSecurityStaff({
      security_staff_id,
      gate_id,
      shift: shift.toUpperCase(),
      assigned_date: assigned_date || null,
      status: 'ON_DUTY',
    });

    return {
      message: `Assigned guard ${staff.full_name} to ${gate.name} (${shift} shift) successfully.`,
      staff: {
        id: staff.id,
        name: staff.full_name,
        badge: staff.badge_number || staff.employee_id,
      },
      gate: {
        id: gate.id,
        name: gate.name,
      },
      shift: shift.toUpperCase(),
    };
  }

  /**
   * Unassign security staff from gate
   */
  static async unassignSecurityStaff(assignmentId) {
    const success = await GateRepository.unassignSecurityStaff(assignmentId);
    if (!success) {
      throw ApiError.notFound(`Assignment record with ID ${assignmentId} not found.`);
    }
    return { message: 'Security assignment closed.' };
  }

  /**
   * Security guard view: Retrieve assigned gate for the logged-in guard
   * "Security should see their assigned gate."
   */
  static async getMyAssignedGate(user) {
    const assignedGate = await GateRepository.findAssignedGateForSecurity(user.id);
    if (!assignedGate) {
      return {
        has_assignment: false,
        message: 'No active gate assignment found for today. Contact Admin.',
      };
    }

    return {
      has_assignment: true,
      gate: {
        id: assignedGate.gate_id,
        name: assignedGate.gate_name,
        gate_number: assignedGate.gate_number || String(assignedGate.gate_id),
        location: assignedGate.location || 'Society Perimeter',
        status: assignedGate.gate_status,
        allows_entry_registration: Boolean(assignedGate.allows_entry_registration),
        shift: assignedGate.shift,
        assignment_status: assignedGate.assignment_status,
        check_in_time: assignedGate.check_in_time,
      },
    };
  }
}

module.exports = GateService;
