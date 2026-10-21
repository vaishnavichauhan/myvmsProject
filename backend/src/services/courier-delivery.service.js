const CourierDeliveryRepository = require('../repositories/courier-delivery.repository');
const SecurityRepository = require('../repositories/security.repository');
const FamilyMemberService = require('./family-member.service');
const ApiError = require('../utils/apiError');

/**
 * Courier and Delivery Service
 * Implements business logic for Prompt 13:
 * - Types: COURIER, DELIVERY
 * - Permission logic (e.g. Vaishnavi: Courier = YES, Delivery = NO)
 * - Security records: Person/company name, Phone, Home number, Type, Vehicle number, Entry time, Exit time, Status
 * - Call Resident Intercom action
 * - Approval & Rejection workflow
 * - Master Gate Activity / History
 */
class CourierDeliveryService {
  /**
   * Check courier/delivery permission for a home & retrieve resident
   */
  static async checkPermission(homeId, type = 'DELIVERY', targetUserId = null) {
    if (!homeId) {
      throw ApiError.badRequest('Home ID is required.');
    }

    const check = await CourierDeliveryRepository.checkPermission(homeId, type, targetUserId);
    if (!check) {
      throw ApiError.notFound(`Home with ID ${homeId} not found.`);
    }

    return check;
  }

  /**
   * Create Courier / Delivery entry
   */
  static async createEntry(user, data) {
    const {
      company_or_person_name,
      name,
      person_name,
      company_name,
      phone,
      phone_number,
      home_id,
      visiting_home,
      type = 'DELIVERY',
      vehicle_number = null,
      resident_user_id = null,
      gate_id = null,
      record_entry_now = false,
      status,
      notes = null,
    } = data;

    const actualName = (company_or_person_name || name || person_name || company_name || '').trim();
    const actualPhone = (phone || phone_number || '').trim();
    const actualHomeId = Number(home_id || visiting_home);
    const upperType = String(type).toUpperCase();

    if (!actualName) {
      throw ApiError.badRequest('Person or company name is required.');
    }
    if (!actualPhone) {
      throw ApiError.badRequest('Phone number is required.');
    }
    if (!actualHomeId) {
      throw ApiError.badRequest('Home number / Home ID is required.');
    }
    if (upperType !== 'COURIER' && upperType !== 'DELIVERY') {
      throw ApiError.badRequest("Type must be either 'COURIER' or 'DELIVERY'.");
    }

    const societyId = user.societyId || 1;

    // Resolve security staff ID if caller is Security
    let staffId = null;
    if (user.role === 'SECURITY') {
      const staff = await SecurityRepository.findByUserId(user.id);
      staffId = staff ? staff.id : null;
    }

    // Check permission
    const permCheck = await CourierDeliveryRepository.checkPermission(
      actualHomeId,
      upperType,
      resident_user_id
    );

    if (!permCheck) {
      throw ApiError.notFound('Target home not found.');
    }

    const shouldRecordNow = Boolean(record_entry_now || status === 'ENTERED');

    let initialStatus = 'PENDING';
    let message = '';

    if (permCheck.permission_allowed) {
      if (shouldRecordNow) {
        initialStatus = 'ENTERED';
        message = `${upperType} permission allowed. Entry recorded successfully.`;
      } else {
        initialStatus = 'APPROVED';
        message = `${upperType} permission allowed. Ready for gate entry.`;
      }
    } else {
      initialStatus = 'PENDING';
      message = `${upperType === 'COURIER' ? 'Courier' : 'Delivery'} permission = NO. Security must contact resident.`;
    }

    const entry = await CourierDeliveryRepository.create({
      society_id: societyId,
      home_id: permCheck.home.id,
      gate_id: gate_id || null,
      security_staff_id: staffId,
      type: upperType,
      company_or_person_name: actualName,
      phone: actualPhone,
      vehicle_number: vehicle_number ? vehicle_number.trim().toUpperCase() : null,
      status: initialStatus,
      resident_user_id: resident_user_id || permCheck.selected_resident?.user_id || null,
      approved_by_user_id: permCheck.permission_allowed ? user.id : null,
      notes,
    });

    return {
      message,
      permission_allowed: permCheck.permission_allowed,
      requires_approval: permCheck.requires_approval,
      entry,
    };
  }

  /**
   * Security initiates [ Call Resident ] contact action
   */
  static async callResident(user, data) {
    const {
      home_id,
      resident_user_id,
      type = 'DELIVERY',
      reason = 'Delivery / Courier arrived at gate requesting entry',
    } = data;

    if (!home_id) throw ApiError.badRequest('Home ID is required.');
    if (!resident_user_id) throw ApiError.badRequest('Resident User ID is required.');

    const societyId = user.societyId || 1;
    const result = await SecurityRepository.getResidentContactForAction(
      societyId,
      home_id,
      resident_user_id,
      type.toUpperCase(),
      reason,
      user
    );

    if (!result.success) {
      throw new ApiError(result.status || 400, result.message);
    }

    return result;
  }

  /**
   * Resident approves / rejects
   */
  static async respondToApproval(user, id, decision, notes = null) {
    let upperDecision = decision ? String(decision).toUpperCase() : '';
    if (upperDecision === 'APPROVE') upperDecision = 'APPROVED';
    if (upperDecision === 'REJECT') upperDecision = 'REJECTED';

    if (upperDecision !== 'APPROVED' && upperDecision !== 'REJECTED') {
      throw ApiError.badRequest("Decision must be either 'APPROVED' or 'REJECTED'.");
    }

    const existing = await CourierDeliveryRepository.findById(id);
    if (!existing) {
      throw ApiError.notFound(`Record with ID ${id} not found.`);
    }

    // Role check: Resident of this home or Admin
    if (user.role === 'OWNER' || user.role === 'TENANT' || user.role === 'FAMILY_MEMBER') {
      const userHome = await FamilyMemberService.resolveUserHome(user);
      if (userHome.home_id !== existing.home_id) {
        throw ApiError.forbidden('You are only authorized to respond for your own home.');
      }
    }

    const updated = await CourierDeliveryRepository.respondToApproval(
      id,
      upperDecision,
      user.id,
      notes
    );

    return {
      message:
        upperDecision === 'APPROVED'
          ? `${existing.type} approved by resident. Entry permitted.`
          : `${existing.type} rejected by resident. Entry denied.`,
      entry: updated,
    };
  }

  /**
   * Security records gate entry
   */
  static async recordEntry(user, id, gateId = null) {
    const existing = await CourierDeliveryRepository.findById(id);
    if (!existing) {
      throw ApiError.notFound(`Record with ID ${id} not found.`);
    }

    if (existing.status === 'REJECTED') {
      throw ApiError.badRequest('Cannot record entry: Request was rejected by resident.');
    }
    if (existing.status === 'PENDING') {
      throw ApiError.badRequest('Cannot record entry: Resident approval is required first.');
    }
    if (existing.status === 'ENTERED') {
      throw ApiError.badRequest('Entry has already been recorded for this person.');
    }
    if (existing.status === 'EXITED') {
      throw ApiError.badRequest('Cannot record entry: This person has already exited.');
    }

    const updated = await CourierDeliveryRepository.recordEntry(id, gateId);

    return {
      message: `${existing.type} entry recorded successfully.`,
      entry: updated,
    };
  }

  /**
   * Security records gate exit
   */
  static async recordExit(user, id) {
    const existing = await CourierDeliveryRepository.findById(id);
    if (!existing) {
      throw ApiError.notFound(`Record with ID ${id} not found.`);
    }

    if (existing.status !== 'ENTERED') {
      throw ApiError.badRequest(
        `Cannot record exit: Current status is ${existing.status}. Only ENTERED records can exit.`
      );
    }

    const updated = await CourierDeliveryRepository.recordExit(id);

    return {
      message: `${existing.type} exit recorded successfully.`,
      entry: updated,
    };
  }

  /**
   * Complete History
   */
  static async getHistory(user, query = {}) {
    const societyId = user.societyId || 1;
    let homeIdFilter = query.home_id || null;

    // Scope to resident's home
    if (user.role === 'OWNER' || user.role === 'TENANT' || user.role === 'FAMILY_MEMBER') {
      const userHome = await FamilyMemberService.resolveUserHome(user);
      homeIdFilter = userHome.home_id;
    }

    return CourierDeliveryRepository.getHistory({
      society_id: societyId,
      home_id: homeIdFilter,
      type: query.type || null,
      status: query.status || null,
      search: query.q || query.search || null,
      page: query.page || 1,
      limit: query.limit || 25,
    });
  }

  /**
   * Get single record by ID
   */
  static async getById(user, id) {
    const record = await CourierDeliveryRepository.findById(id);
    if (!record) {
      throw ApiError.notFound(`Record with ID ${id} not found.`);
    }

    if (user.role === 'OWNER' || user.role === 'TENANT' || user.role === 'FAMILY_MEMBER') {
      const userHome = await FamilyMemberService.resolveUserHome(user);
      if (userHome.home_id !== record.home_id) {
        throw ApiError.forbidden('Access denied to this record.');
      }
    }

    return record;
  }
}

module.exports = CourierDeliveryService;
