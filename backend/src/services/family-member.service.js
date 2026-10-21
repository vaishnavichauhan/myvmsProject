const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const FamilyMemberRepository = require('../repositories/family-member.repository');
const UserRepository = require('../repositories/user.repository');
const ResidentRepository = require('../repositories/resident.repository');
const ApiError = require('../utils/apiError');

/**
 * Family Member Business Logic Service
 * Enforces ownership rules, home scoping, password hashing, and role authorization.
 */
class FamilyMemberService {
  /**
   * Helper: Resolve home and resident ID for current authenticated user
   */
  static async resolveUserHome(user) {
    const homeDetails = await UserRepository.getUserHomeDetails(user.id, user.role);
    if (!homeDetails && user.role !== 'ADMIN') {
      throw ApiError.forbidden('Your account is not mapped to an active home.');
    }
    return homeDetails;
  }

  /**
   * Get family members for a home (Strictly scoped)
   */
  static async getFamilyMembers(user, targetHomeId = null) {
    let effectiveHomeId = targetHomeId;

    if (user.role === 'OWNER' || user.role === 'TENANT') {
      const userHome = await this.resolveUserHome(user);
      if (targetHomeId && parseInt(targetHomeId, 10) !== userHome.home_id) {
        throw ApiError.forbidden('You can only view family members for your own home.');
      }
      effectiveHomeId = userHome.home_id;
    } else if (user.role === 'FAMILY_MEMBER') {
      const userHome = await this.resolveUserHome(user);
      effectiveHomeId = userHome.home_id;
    } else if (user.role === 'ADMIN') {
      if (!effectiveHomeId) {
        effectiveHomeId = targetHomeId || 1;
      }
    } else {
      throw ApiError.forbidden('You do not have access to family members.');
    }

    const members = await FamilyMemberRepository.findByHomeId(effectiveHomeId);

    // Fetch primary resident / owner details for this home
    const [residentRows] = await pool.query(
      `SELECT r.id, r.user_id, r.resident_type, r.is_primary_contact, r.status,
              u.full_name, u.phone, u.email, u.avatar_url,
              h.home_number, h.building_or_wing, s.name AS society_name
       FROM residents r
       JOIN users u ON r.user_id = u.id
       JOIN homes h ON r.home_id = h.id
       JOIN societies s ON h.society_id = s.id
       WHERE r.home_id = ? AND r.status = 'ACTIVE'
       ORDER BY r.is_primary_contact DESC, (r.resident_type = 'OWNER') DESC, r.id ASC
       LIMIT 1`,
      [effectiveHomeId]
    );

    const primaryResident = residentRows[0] || null;

    return {
      familyMembers: members,
      owner: primaryResident,
      home: members[0] ? {
        home_number: members[0].home_number,
        building_or_wing: members[0].building_or_wing,
        society_name: members[0].society_name,
      } : (primaryResident ? {
        home_number: primaryResident.home_number,
        building_or_wing: primaryResident.building_or_wing,
        society_name: primaryResident.society_name,
      } : null),
    };
  }

  /**
   * Get family member by ID
   */
  static async getFamilyMemberById(user, id) {
    const familyMember = await FamilyMemberRepository.findById(id);
    if (!familyMember) {
      throw ApiError.notFound(`Family member with ID ${id} not found.`);
    }

    // Authorization: User must belong to the same home (unless ADMIN)
    if (user.role !== 'ADMIN') {
      const userHome = await this.resolveUserHome(user);
      if (familyMember.home_id !== userHome.home_id) {
        throw ApiError.forbidden('You can only access family members from your own home.');
      }
    }

    return familyMember;
  }

  /**
   * Add a family member to home (OWNER or TENANT can add to their own home)
   */
  static async addFamilyMember(user, data) {
    // Only OWNER, TENANT, or ADMIN can add family members
    if (!['OWNER', 'TENANT', 'ADMIN'].includes(user.role)) {
      throw ApiError.forbidden('Only the primary Owner or Tenant can add family members.');
    }

    const {
      name,
      full_name,
      phone,
      relationship,
      password,
      avatar_url = null,
      is_minor = false,
      status = 'ACTIVE',
      home_id,
    } = data;

    const memberName = (name || full_name || '').trim();
    if (!memberName) {
      throw ApiError.badRequest('Family member name is required.');
    }

    const cleanPhone = String(phone || '').trim();
    if (!cleanPhone || cleanPhone.length < 10) {
      throw ApiError.badRequest('A valid 10-digit Phone Number is required for independent login.');
    }

    const cleanRelationship = (relationship || '').trim();
    if (!cleanRelationship) {
      throw ApiError.badRequest('Relationship (e.g. Daughter, Son, Spouse, Mother, Father) is required.');
    }

    if (!password || String(password).length < 6) {
      throw ApiError.badRequest('Password is required and must be at least 6 characters long.');
    }

    // Resolve Home ID and Primary Resident ID
    let targetHomeId;
    let residentId;

    if (user.role === 'OWNER' || user.role === 'TENANT') {
      const userHome = await this.resolveUserHome(user);
      targetHomeId = userHome.home_id;
      residentId = userHome.resident_id;
    } else if (user.role === 'ADMIN') {
      if (!home_id) {
        throw ApiError.badRequest('Home ID is required when registering family member as Admin.');
      }
      targetHomeId = home_id;
      const primaryResident = await ResidentRepository.findActivePrimaryByHomeId(targetHomeId);
      residentId = primaryResident ? primaryResident.id : null;
      if (!residentId) {
        throw ApiError.badRequest('Selected home does not have a primary resident registered yet.');
      }
    }

    // Hash password with bcrypt
    const hashedPassword = await bcrypt.hash(password, 10);

    // Call Repository to create User and Family Member
    const createdMember = await FamilyMemberRepository.createFamilyMember(targetHomeId, residentId, {
      full_name: memberName,
      phone: cleanPhone,
      relationship: cleanRelationship,
      password: hashedPassword,
      avatar_url,
      is_minor: Boolean(is_minor),
      status: status || 'ACTIVE',
    });

    return createdMember;
  }

  /**
   * Update family member details
   */
  static async updateFamilyMember(user, id, data) {
    if (!['OWNER', 'TENANT', 'ADMIN'].includes(user.role)) {
      throw ApiError.forbidden('Only the primary Owner or Tenant can edit family members.');
    }

    const familyMember = await FamilyMemberRepository.findById(id);
    if (!familyMember) {
      throw ApiError.notFound(`Family member with ID ${id} not found.`);
    }

    // Verify user owns this home
    if (user.role !== 'ADMIN') {
      const userHome = await this.resolveUserHome(user);
      if (familyMember.home_id !== userHome.home_id) {
        throw ApiError.forbidden('You can only edit family members in your own home.');
      }
    }

    return FamilyMemberRepository.updateFamilyMember(id, data);
  }

  /**
   * Delete family member from home
   */
  static async deleteFamilyMember(user, id) {
    if (!['OWNER', 'TENANT', 'ADMIN'].includes(user.role)) {
      throw ApiError.forbidden('Only the primary Owner or Tenant can delete family members.');
    }

    const familyMember = await FamilyMemberRepository.findById(id);
    if (!familyMember) {
      throw ApiError.notFound(`Family member with ID ${id} not found.`);
    }

    // Verify user owns this home
    if (user.role !== 'ADMIN') {
      const userHome = await this.resolveUserHome(user);
      if (familyMember.home_id !== userHome.home_id) {
        throw ApiError.forbidden('You can only delete family members from your own home.');
      }
    }

    const result = await FamilyMemberRepository.deleteFamilyMember(id);
    return {
      message: `Family member ${result.full_name} removed successfully.`,
    };
  }

  /**
   * Get the complete Home Portal dashboard for a resident or family member
   * Strictly isolated to their own home's data
   */
  static async getMyHomeDashboard(user, requestedHomeId = null) {
    let effectiveHomeId;

    if (user.role === 'OWNER' || user.role === 'TENANT' || user.role === 'FAMILY_MEMBER') {
      const userHome = await this.resolveUserHome(user);
      effectiveHomeId = userHome.home_id;
    } else if (user.role === 'ADMIN') {
      effectiveHomeId = requestedHomeId || 1;
    } else {
      throw ApiError.forbidden('Access denied to Home Portal.');
    }

    const dashboard = await FamilyMemberRepository.getHomePortalData(effectiveHomeId);
    if (!dashboard) {
      throw ApiError.notFound('Home data not found.');
    }

    return dashboard;
  }
}

module.exports = FamilyMemberService;
