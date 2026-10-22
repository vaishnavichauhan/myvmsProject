const VisitorRepository = require('../repositories/visitor.repository');
const SecurityRepository = require('../repositories/security.repository');
const GateRepository = require('../repositories/gate.repository');
const FamilyMemberService = require('./family-member.service');
const ApiError = require('../utils/apiError');

/**
 * Visitor Management Service
 * Implements full flow:
 * Visitor arrives -> Search Home -> See resident names -> Backend checks visitor permission ->
 * If allowed: continue / If requires approval: contact resident & resident approves/rejects ->
 * Security records entry -> Security records exit -> Complete visitor history.
 */
class VisitorService {
  /**
   * Check visitor permission for a home & retrieve resident roster
   */
  static async checkHomePermission(homeId, targetUserId = null) {
    if (!homeId) {
      throw ApiError.badRequest('Home ID is required.');
    }

    const check = await VisitorRepository.checkHomePermission(homeId, targetUserId);
    if (!check) {
      throw ApiError.notFound(`Home with ID ${homeId} not found.`);
    }

    return check;
  }

  /**
   * Security creates visitor entry
   * Visitor fields:
   * - Visitor Name, Phone Number, Visiting Home, Purpose, Photo, Vehicle Number, Entry Time, Exit Time, Status
   */
  static async createVisitorEntry(user, data) {
    // 0. Authorization: Admin cannot create gate entries; Security must be stationed at a gate with entry registration enabled
    if (user.role === 'ADMIN') {
      throw ApiError.forbidden('Administrators cannot create gate visitor entries directly. Entries must be registered by authorized Security Officers.');
    }

    let staffId = null;
    let gateId = data.gate_id || null;

    if (user.role === 'SECURITY') {
      const staff = await SecurityRepository.findByUserId(user.id);
      staffId = staff ? staff.id : null;

      const assignedGate = await GateRepository.findAssignedGateForSecurity(user.id);
      if (!assignedGate) {
        throw ApiError.forbidden('You are not currently assigned to any gate checkpoint. Only security officers stationed at a gate with Entry Registration enabled can register entries.');
      }
      if (!assignedGate.allows_entry_registration) {
        throw ApiError.forbidden(`Your assigned checkpoint "${assignedGate.gate_name}" does not have Gate Entry Registration enabled. You can only view entry history.`);
      }
      gateId = gateId || assignedGate.gate_id;
    }

    const {
      name,
      visitor_name,
      phone,
      phone_number,
      home_id,
      visiting_home,
      purpose = 'Personal Visit',
      visitor_type = 'GUEST',
      vehicle_number = null,
      photo_url = null,
      resident_user_id = null,
      record_entry_now = false,
      status,
    } = data;

    const shouldRecordNow = Boolean(record_entry_now || status === 'ENTERED');

    const actualName = (name || visitor_name || '').trim();
    const actualPhone = (phone || phone_number || '').trim();
    const actualHomeId = Number(home_id || visiting_home);

    if (!actualName) {
      throw ApiError.badRequest('Visitor Name is required.');
    }
    if (!actualPhone) {
      throw ApiError.badRequest('Phone Number is required.');
    }
    if (!actualHomeId) {
      throw ApiError.badRequest('Visiting Home is required.');
    }

    const societyId = user.societyId || 1;

    // 2. Check visitor permission for this home
    const permCheck = await VisitorRepository.checkHomePermission(actualHomeId, resident_user_id);
    if (!permCheck) {
      throw ApiError.notFound('Visiting home not found.');
    }

    let initialStatus = 'PENDING';
    let approvalStatus = 'PENDING';
    let approvedBy = null;
    let message = '';

    if (permCheck.permission_allowed) {
      // Permission allows entry according to society rules
      if (shouldRecordNow) {
        initialStatus = 'ENTERED';
        approvalStatus = 'AUTO_APPROVED';
        message = 'Visitor permission allowed. Entry recorded successfully.';
      } else {
        initialStatus = 'APPROVED';
        approvalStatus = 'AUTO_APPROVED';
        message = 'Visitor permission allowed. Ready for gate entry.';
      }
    } else {
      // Permission requires resident approval
      initialStatus = 'PENDING';
      approvalStatus = 'PENDING';
      message = 'Visitor permission requires resident approval. Pending resident confirmation.';
    }

    // 3. Create entry record
    const entry = await VisitorRepository.createVisitorEntry({
      society_id: permCheck.home.society_id || societyId || 1,
      home_id: permCheck.home.id,
      name: actualName,
      phone: actualPhone,
      purpose,
      visitor_type,
      vehicle_number: vehicle_number ? vehicle_number.trim().toUpperCase() : null,
      photo_url: photo_url || null,
      gate_id: gateId || null,
      security_staff_id: staffId,
      resident_user_id: resident_user_id || permCheck.selected_resident?.user_id || null,
      approved_by_user_id: approvedBy,
      initial_status: initialStatus,
      approval_status: approvalStatus,
      entry_type: 'GATE_REQUESTED',
    });

    return {
      message,
      permission_allowed: permCheck.permission_allowed,
      requires_approval: permCheck.requires_approval,
      entry,
    };
  }

  /**
   * Security records entry (transitions APPROVED -> ENTERED)
   */
  static async recordEntry(user, entryId, gateId = null) {
    const existing = await VisitorRepository.findById(entryId);
    if (!existing) {
      throw ApiError.notFound(`Visitor entry with ID ${entryId} not found.`);
    }

    if (existing.status === 'REJECTED') {
      throw ApiError.badRequest('Cannot record entry: Visitor was rejected by resident.');
    }
    if (existing.status === 'PENDING') {
      throw ApiError.badRequest('Cannot record entry: Resident approval is required first.');
    }
    if (existing.status === 'ENTERED') {
      throw ApiError.badRequest('Visitor has already been marked as ENTERED.');
    }
    if (existing.status === 'EXITED') {
      throw ApiError.badRequest('Visitor has already EXITED.');
    }

    let staffId = null;
    if (user.role === 'SECURITY') {
      const staff = await SecurityRepository.findByUserId(user.id);
      staffId = staff ? staff.id : null;
    }

    const updated = await VisitorRepository.recordEntry(entryId, staffId, gateId);
    return {
      message: `Visitor ${updated.visitor_name} entry recorded successfully.`,
      entry: updated,
    };
  }

  /**
   * Security records exit (transitions ENTERED -> EXITED)
   */
  static async recordExit(user, entryId) {
    const existing = await VisitorRepository.findById(entryId);
    if (!existing) {
      throw ApiError.notFound(`Visitor entry with ID ${entryId} not found.`);
    }

    if (existing.status === 'EXITED') {
      throw ApiError.badRequest('Visitor has already been marked as EXITED.');
    }
    if (existing.status !== 'ENTERED' && existing.status !== 'INSIDE') {
      throw ApiError.badRequest(`Cannot record exit: Current status is ${existing.status}.`);
    }

    const updated = await VisitorRepository.recordExit(entryId);
    return {
      message: `Visitor ${updated.visitor_name} exit recorded successfully.`,
      entry: updated,
    };
  }

  /**
   * Resident approves/rejects visitor request
   */
  static async respondToApproval(user, entryId, decision) {
    let upperDecision = decision ? String(decision).toUpperCase() : '';
    if (upperDecision === 'APPROVE') upperDecision = 'APPROVED';
    if (upperDecision === 'REJECT') upperDecision = 'REJECTED';

    if (upperDecision !== 'APPROVED' && upperDecision !== 'REJECTED') {
      throw ApiError.badRequest("Decision must be either 'APPROVED' or 'REJECTED'.");
    }

    const existing = await VisitorRepository.findById(entryId);
    if (!existing) {
      throw ApiError.notFound(`Visitor entry with ID ${entryId} not found.`);
    }

    // Role verification: Admin or Resident of this home
    if (user.role === 'OWNER' || user.role === 'TENANT' || user.role === 'FAMILY_MEMBER') {
      const userHome = await FamilyMemberService.resolveUserHome(user);
      if (userHome.home_id !== existing.home_id) {
        throw ApiError.forbidden('You are only authorized to approve visitors for your own home.');
      }
    }

    const updated = await VisitorRepository.updateApprovalStatus(entryId, upperDecision, user.id);
    return {
      message: `Visitor request has been ${upperDecision.toLowerCase()} successfully.`,
      entry: updated,
    };
  }

  /**
   * Complete Visitor History with role scoping
   */
  static async getHistory(user, filters = {}) {
    const queryFilters = { ...filters };
    queryFilters.society_id = user.societyId || 1;

    // Scope residents strictly to their own home
    if (user.role === 'OWNER' || user.role === 'TENANT' || user.role === 'FAMILY_MEMBER') {
      const userHome = await FamilyMemberService.resolveUserHome(user);
      queryFilters.home_id = userHome.home_id;
    }

    return VisitorRepository.findAll(queryFilters);
  }

  /**
   * Get single entry details
   */
  static async getById(user, entryId) {
    const entry = await VisitorRepository.findById(entryId);
    if (!entry) {
      throw ApiError.notFound(`Visitor entry with ID ${entryId} not found.`);
    }

    // Privacy guard
    if (user.role === 'OWNER' || user.role === 'TENANT' || user.role === 'FAMILY_MEMBER') {
      const userHome = await FamilyMemberService.resolveUserHome(user);
      if (userHome.home_id !== entry.home_id) {
        throw ApiError.forbidden('Access denied to other home visitor logs.');
      }
    }

    return entry;
  }
}

module.exports = VisitorService;
