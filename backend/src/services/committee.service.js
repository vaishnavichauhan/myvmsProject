const bcrypt = require('bcryptjs');
const CommitteeRepository = require('../repositories/committee.repository');
const UserRepository = require('../repositories/user.repository');
const HomeRepository = require('../repositories/home.repository');
const SocietyRepository = require('../repositories/society.repository');
const ApiError = require('../utils/apiError');
const { ROLES } = require('../constants/roles');

/**
 * Committee Management Service
 * Manages Committees (e.g. Festival, Electricity, etc.) and assigned Resident Members.
 */
class CommitteeService {
  /**
   * ==========================================
   * 1. COMMITTEES (Entities)
   * ==========================================
   */

  /**
   * Create new committee (Admin only)
   * e.g. "Festival & Celebration Committee", "Electricity Management Committee"
   */
  static async createCommittee(data) {
    const { name, description = null, status = 'ACTIVE', society_id = 1 } = data;

    if (!name || !name.trim()) {
      throw ApiError.badRequest('Committee Name is required (e.g. Festival & Celebration Committee, Electricity Management Committee).');
    }

    return CommitteeRepository.createCommittee({
      society_id,
      name: name.trim(),
      description,
      status: status || 'ACTIVE',
    });
  }

  /**
   * List all committees in a society (or all societies)
   */
  static async getAllCommittees(societyId = null) {
    return CommitteeRepository.findAllCommittees(societyId);
  }

  /**
   * Update committee
   */
  static async updateCommittee(id, data) {
    const existing = await CommitteeRepository.findCommitteeById(id);
    if (!existing) {
      throw ApiError.notFound(`Committee with ID ${id} not found.`);
    }
    return CommitteeRepository.updateCommittee(id, data);
  }

  /**
   * Delete committee
   */
  static async deleteCommittee(id) {
    const existing = await CommitteeRepository.findCommitteeById(id);
    if (!existing) {
      throw ApiError.notFound(`Committee with ID ${id} not found.`);
    }
    await CommitteeRepository.deleteCommittee(id);
    return { message: `Committee "${existing.name}" deleted successfully.` };
  }

  /**
   * ==========================================
   * 2. OCCUPANTS BY HOME
   * "when create committee member first select home no, after show member name, position, status"
   * "this committee member is always our resident user"
   * ==========================================
   */
  static async getHomeOccupants(homeId) {
    if (!homeId) {
      throw ApiError.badRequest('Home ID is required to fetch occupants.');
    }

    const occupants = await CommitteeRepository.findOccupantsByHome(homeId);
    return occupants.map((o) => ({
      userId: o.user_id,
      user_id: o.user_id,
      name: o.full_name,
      full_name: o.full_name,
      phone: o.phone,
      email: o.email,
      roleType: o.role_type,
      role_type: o.role_type,
      relation: o.relation,
      homeId: o.home_id,
      home_id: o.home_id,
      homeNumber: o.home_number,
      home_number: o.home_number,
      buildingOrWing: o.building_or_wing,
      label: `${o.full_name} (${o.role_type === 'OWNER' ? 'Owner' : o.role_type === 'TENANT' ? 'Tenant' : `Family Member - ${o.relation}`})`,
    }));
  }

  /**
   * ==========================================
   * 3. COMMITTEE MEMBERS (Roster & Assignments)
   * ==========================================
   */

  /**
   * Create / Assign a Committee Member (Admin only)
   * Flow:
   * 1. Select Committee Name (e.g. Festival & Celebration Committee)
   * 2. Select Home No (e.g. Home 2)
   * 3. Select Resident (e.g. tanmay - Owner, or abc - Family Member)
   * 4. Assign Position (e.g. Head, Convener, Secretary, Member)
   * 5. Set Status (ACTIVE / INACTIVE)
   */
  static async createCommitteeMember(data) {
    const {
      committee_id,
      committee_name,
      home_id,
      home_number,
      flat_number,
      user_id,
      name,
      full_name,
      phone,
      position,
      designation,
      photo,
      photo_url,
      avatar_url,
      status = 'ACTIVE',
      can_create_announcements = true,
      responsibilities = null,
      term_start = null,
      term_end = null,
      society_id,
    } = data;

    const memberName = (name || full_name || '').trim();
    if (!memberName) {
      throw ApiError.badRequest('Committee Member Name is required.');
    }

    let cleanPhone = String(phone || '').trim();
    if ((!cleanPhone || cleanPhone.length < 8) && user_id) {
      const u = await UserRepository.findById(user_id);
      if (u?.phone) {
        cleanPhone = u.phone;
      }
    }
    if ((!cleanPhone || cleanPhone.length < 8) && home_id) {
      const occupants = await CommitteeRepository.findOccupantsByHome(home_id);
      const matched = occupants.find((o) => (String(o.user_id) === String(user_id) || String(o.userId) === String(user_id)) && o.phone) || occupants.find((o) => o.phone);
      if (matched?.phone) {
        cleanPhone = matched.phone;
      }
    }
    if (!cleanPhone || cleanPhone.length < 8) {
      cleanPhone = '9800000000';
    }

    const rawPosition = (position || designation || 'COMMITTEE_MEMBER').trim();
    const photoVal = (photo || photo_url || avatar_url || '').trim() || null;
    const cleanStatus = ['ACTIVE', 'INACTIVE'].includes(status) ? status : 'ACTIVE';

    // Resolve society ID
    let targetSocietyId = society_id;
    if (!targetSocietyId) {
      const societies = await SocietyRepository.findAll();
      targetSocietyId = societies[0]?.id || 1;
    }

    // Resolve committee details
    let resolvedCommitteeId = committee_id || null;
    let resolvedCommitteeName = committee_name || null;

    if (resolvedCommitteeId && !resolvedCommitteeName) {
      const comm = await CommitteeRepository.findCommitteeById(resolvedCommitteeId);
      if (comm) {
        resolvedCommitteeName = comm.name;
      }
    }

    // Resolve home details
    let resolvedHomeId = home_id || null;
    let resolvedHomeNumber = home_number || flat_number || null;

    if (resolvedHomeId && !resolvedHomeNumber) {
      const home = await HomeRepository.findById(resolvedHomeId);
      if (home) {
        resolvedHomeNumber = home.home_number;
      }
    }

    // Resolve User ID
    let resolvedUserId = user_id || null;
    if (!resolvedUserId) {
      const existingUser = await UserRepository.findByPhone(cleanPhone);
      if (existingUser) {
        resolvedUserId = existingUser.id;
      } else {
        const defaultPasswordHash = await bcrypt.hash('Committee@123', 10);
        const newUser = await UserRepository.create({
          society_id: targetSocietyId,
          full_name: memberName,
          phone: cleanPhone,
          password: defaultPasswordHash,
          role: ROLES.COMMITTEE_MEMBER,
          avatar_url: photoVal,
          flat_number: resolvedHomeNumber,
          status: cleanStatus === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
        });
        resolvedUserId = newUser.id;
      }
    }

    const created = await CommitteeRepository.create({
      society_id: targetSocietyId,
      committee_id: resolvedCommitteeId,
      committee_name: resolvedCommitteeName,
      home_id: resolvedHomeId,
      user_id: resolvedUserId,
      name: memberName,
      phone: cleanPhone,
      designation: rawPosition,
      home_number: resolvedHomeNumber,
      photo_url: photoVal,
      responsibilities:
        responsibilities ||
        (resolvedCommitteeName
          ? `${resolvedCommitteeName} - ${rawPosition}`
          : `Society ${rawPosition} office bearer`),
      status: cleanStatus,
      can_create_announcements: Boolean(can_create_announcements),
      term_start: term_start || new Date().toISOString().slice(0, 10),
      term_end: term_end || null,
    });

    if (created && created.password) {
      delete created.password;
    }

    return created;
  }

  /**
   * List all committee members (Available to Residents & Admins)
   */
  static async getAllCommitteeMembers(societyId = null, filters = {}) {
    return CommitteeRepository.findAll(societyId, filters);
  }

  /**
   * Get single committee member by ID
   */
  static async getCommitteeMemberById(id) {
    const member = await CommitteeRepository.findById(id);
    if (!member) {
      throw ApiError.notFound(`Committee member with ID ${id} not found.`);
    }
    return member;
  }

  /**
   * Update committee member
   */
  static async updateCommitteeMember(id, data) {
    const existing = await CommitteeRepository.findById(id);
    if (!existing) {
      throw ApiError.notFound(`Committee member with ID ${id} not found.`);
    }
    return CommitteeRepository.update(id, data);
  }

  /**
   * Delete committee member
   */
  static async deleteCommitteeMember(id) {
    const existing = await CommitteeRepository.findById(id);
    if (!existing) {
      throw ApiError.notFound(`Committee member with ID ${id} not found.`);
    }
    return CommitteeRepository.delete(id);
  }

  /**
   * Check if user is an active committee member with announcement permissions
   */
  static async checkAnnouncementPermission(userId, societyId = null) {
    const member = await CommitteeRepository.findByUserId(userId, societyId);
    if (!member) return false;
    return Boolean(member.can_create_announcements);
  }

  /**
   * Get all active committee names a user belongs to
   */
  static async getUserCommittees(userId, societyId = null) {
    return CommitteeRepository.findAllUserCommittees(userId, societyId);
  }
}

module.exports = CommitteeService;
