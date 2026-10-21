const bcrypt = require('bcryptjs');
const ResidentRepository = require('../repositories/resident.repository');
const HomeRepository = require('../repositories/home.repository');
const UserRepository = require('../repositories/user.repository');
const ApiError = require('../utils/apiError');

/**
 * Resident Management Business Logic Service
 */
class ResidentService {
  /**
   * Register a primary resident for a home
   */
  static async createResident(data) {
    const {
      home_id,
      home_number,
      society_id,
      name,
      full_name,
      phone,
      password,
      resident_type,
      email = null,
      avatar_url = null,
      status = 'ACTIVE',
    } = data;

    const residentName = (name || full_name || '').trim();
    if (!residentName) {
      throw ApiError.badRequest('Resident Name is required.');
    }

    const residentPhone = String(phone || '').trim();
    if (!residentPhone) {
      throw ApiError.badRequest('Resident Phone Number is required for login.');
    }

    if (!password || String(password).length < 6) {
      throw ApiError.badRequest('Password is required and must be at least 6 characters long.');
    }

    const typeUpper = String(resident_type || 'OWNER').toUpperCase();
    if (!['OWNER', 'TENANT'].includes(typeUpper)) {
      throw ApiError.badRequest('Resident Type must be either OWNER or TENANT.');
    }

    // 1. Resolve Home
    let targetHomeId = home_id;
    if (!targetHomeId && (home_number || data.homeNumber)) {
      const hNum = home_number || data.homeNumber;
      // Look up home by society_id and home_number
      const socId = society_id || 1;
      const homes = await HomeRepository.findBySocietyId(socId, { search: hNum });
      const matched = homes.find(
        (h) => String(h.home_number).toLowerCase() === String(hNum).toLowerCase()
      );
      if (!matched) {
        const createdHome = await HomeRepository.create({
          society_id: socId,
          home_number: String(hNum).trim(),
          building_or_wing: data.building_or_wing || 'Wing A',
          floor: data.floor ? parseInt(data.floor, 10) : 1,
          home_type: data.home_type || '2BHK',
          status: 'ACTIVE',
          occupancy_status: 'VACANT',
        });
        targetHomeId = createdHome.id;
      } else {
        targetHomeId = matched.id;
      }
    }

    if (!targetHomeId) {
      throw ApiError.badRequest('Home Number or Home ID is required.');
    }

    const home = await HomeRepository.findById(targetHomeId);
    if (!home) {
      throw ApiError.notFound(`Home with ID ${targetHomeId} not found.`);
    }

    // 2. Business Rule: A home can have only ONE primary active owner/tenant
    if (status === 'ACTIVE') {
      const activePrimary = await ResidentRepository.findActivePrimaryByHomeId(targetHomeId);
      if (activePrimary) {
        throw ApiError.conflict(
          `Home "${home.home_number}" already has an active primary resident: ${activePrimary.full_name} (${activePrimary.resident_type}). Please deactivate or remove the existing resident before assigning a new primary resident.`
        );
      }
    }

    // 3. Hash password securely (never stored plain text)
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Save via repository transaction
    const newResident = await ResidentRepository.createResidentWithUser(
      {
        society_id: home.society_id,
        full_name: residentName,
        email: email ? String(email).trim().toLowerCase() : null,
        phone: residentPhone,
        password: hashedPassword,
        role: typeUpper, // OWNER or TENANT
        avatar_url: avatar_url || null,
        flat_number: home.home_number,
        block_or_tower: home.building_or_wing,
      },
      {
        home_id: targetHomeId,
        resident_type: typeUpper,
        is_primary_contact: true,
        status: status || 'ACTIVE',
      }
    );

    return newResident;
  }

  /**
   * Get all residents with optional filters
   */
  static async getAllResidents(filters) {
    return ResidentRepository.findAll(filters);
  }

  /**
   * Get resident by ID
   */
  static async getResidentById(id) {
    const resident = await ResidentRepository.findById(id);
    if (!resident) {
      throw ApiError.notFound(`Resident with ID ${id} not found.`);
    }
    return resident;
  }

  /**
   * Update resident details
   */
  static async updateResident(id, data) {
    const resident = await ResidentRepository.findById(id);
    if (!resident) {
      throw ApiError.notFound(`Resident with ID ${id} not found.`);
    }

    // If changing to primary active, re-verify single active rule
    if (data.is_primary_contact && data.status === 'ACTIVE') {
      const activePrimary = await ResidentRepository.findActivePrimaryByHomeId(resident.home_id, id);
      if (activePrimary) {
        throw ApiError.conflict(
          `Home already has another active primary resident: ${activePrimary.full_name}.`
        );
      }
    }

    const userData = {};
    const residentData = {};

    if (data.name || data.full_name) {
      userData.full_name = data.name || data.full_name;
    }
    if (data.phone) {
      userData.phone = String(data.phone).trim();
    }
    if (data.email !== undefined) {
      userData.email = data.email ? String(data.email).trim().toLowerCase() : null;
    }
    if (data.avatar_url !== undefined) {
      userData.avatar_url = data.avatar_url;
    }
    if (data.resident_type) {
      const typeUpper = String(data.resident_type).toUpperCase();
      if (!['OWNER', 'TENANT'].includes(typeUpper)) {
        throw ApiError.badRequest('Resident Type must be OWNER or TENANT.');
      }
      residentData.resident_type = typeUpper;
      userData.role = typeUpper;
    }
    if (data.status) {
      residentData.status = data.status;
    }
    if (data.is_primary_contact !== undefined) {
      residentData.is_primary_contact = Boolean(data.is_primary_contact);
    }

    return ResidentRepository.update(id, userData, residentData);
  }

  /**
   * Change resident active/inactive status
   */
  static async changeResidentStatus(id, status) {
    const resident = await ResidentRepository.findById(id);
    if (!resident) {
      throw ApiError.notFound(`Resident with ID ${id} not found.`);
    }

    const validStatus = ['ACTIVE', 'INACTIVE', 'PENDING_VERIFICATION'];
    if (!validStatus.includes(status)) {
      throw ApiError.badRequest(`Status must be one of: ${validStatus.join(', ')}`);
    }

    return ResidentRepository.updateStatus(id, status);
  }

  /**
   * Reset resident password
   */
  static async resetResidentPassword(id, newPassword) {
    if (!newPassword || String(newPassword).length < 6) {
      throw ApiError.badRequest('New password must be at least 6 characters long.');
    }

    const resident = await ResidentRepository.findById(id);
    if (!resident) {
      throw ApiError.notFound(`Resident with ID ${id} not found.`);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await ResidentRepository.resetPassword(resident.user_id, hashedPassword);

    return {
      message: `Password reset successfully for resident ${resident.full_name}.`,
    };
  }

  /**
   * Delete resident
   */
  static async deleteResident(id) {
    const resident = await ResidentRepository.findById(id);
    if (!resident) {
      throw ApiError.notFound(`Resident with ID ${id} not found.`);
    }

    await ResidentRepository.delete(id);
    return {
      message: `Resident ${resident.full_name} deleted successfully.`,
    };
  }
}

module.exports = ResidentService;
