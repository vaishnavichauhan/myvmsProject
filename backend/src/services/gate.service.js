const GateRepository = require('../repositories/gate.repository');
const SecurityRepository = require('../repositories/security.repository');
const UserRepository = require('../repositories/user.repository');
const SubscriptionRepository = require('../repositories/subscription.repository');
const ApiError = require('../utils/apiError');

/**
 * Gate Management & Security Self Check-In Service
 */
class GateService {
  /**
   * Create new gate (Admin only)
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

    if (society_id) {
      const limitCheck = await SubscriptionRepository.checkLimit(society_id, 'GATES', 1);
      if (!limitCheck.allowed) {
        throw ApiError.badRequest(limitCheck.reason);
      }
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
   * - Admin: Complete gate management details.
   * - Security: All society gates (so they can pick which one to check into).
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

    // Security and Admin both get the full gate list (Security needs it to self-select)
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
   * Security Self Check-In:
   * Security guard picks their gate when they start their duty shift.
   * The check-in time is recorded as NOW.
   * This replaces the admin-assign flow.
   *
   * Steps:
   * 1. Validate gate_id exists
   * 2. Look up security_staff record for this user
   * 3. Close any existing active assignment for this guard
   * 4. Insert a new ON_DUTY record with check_in_time = NOW
   */
  static async securitySelfCheckIn(user, gate_id) {
    if (!gate_id) {
      throw ApiError.badRequest('Please select a gate to check in.');
    }

    // Verify gate exists
    const gate = await GateRepository.findById(gate_id);
    if (!gate) {
      throw ApiError.notFound(`Gate with ID ${gate_id} not found.`);
    }
    if (gate.status === 'CLOSED') {
      throw ApiError.badRequest(`Gate "${gate.name}" is currently closed. Please select a different gate.`);
    }

    // Find security_staff record for this user (auto-create if missing)
    let staff = await SecurityRepository.findByUserId(user.id);
    if (!staff) {
      staff = await SecurityRepository.ensureStaffRecord(user);
    }

    // Perform self check-in via repository
    const result = await GateRepository.securitySelfCheckIn({
      security_staff_id: staff.id,
      gate_id: Number(gate_id),
    });

    return {
      message: `Checked in at "${gate.name}" successfully. Your duty has started.`,
      assignment_id: result.assignment_id,
      gate: {
        id: gate.id,
        name: gate.name,
        gate_number: gate.gate_number,
        location: gate.location,
        allows_entry_registration: gate.allows_entry_registration,
      },
      check_in_time: result.check_in_time,
    };
  }

  /**
   * Security Self Check-Out:
   * Security guard exits their active gate assignment.
   * Records check_out_time = NOW and sets status = COMPLETED.
   * Called when security clicks "Exit Gate" or logs out.
   */
  static async securitySelfCheckOut(user) {
    // Find security_staff record for this user
    const staff = await SecurityRepository.findByUserId(user.id);
    if (!staff) {
      // No staff record - silently succeed (they may not have checked in)
      return { message: 'No active gate duty to check out from.' };
    }

    const closed = await GateRepository.securitySelfCheckOut(staff.id);
    if (!closed) {
      return { message: 'No active gate duty found.' };
    }

    return { message: 'Checked out from gate successfully. Duty ended.' };
  }

  /**
   * Security guard view: Retrieve active gate check-in for the logged-in guard
   */
  static async getMyAssignedGate(user) {
    const assignedGate = await GateRepository.findAssignedGateForSecurity(user.id);
    if (!assignedGate) {
      return {
        has_assignment: false,
        message: 'You are not currently checked into any gate. Please select a gate to start your duty.',
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
        assignment_id: assignedGate.assignment_id,
      },
    };
  }
}

module.exports = GateService;
