const bcrypt = require('bcryptjs');
const ResidentRepository = require('../repositories/resident.repository');
const HomeRepository = require('../repositories/home.repository');
const UserRepository = require('../repositories/user.repository');
const ApiError = require('../utils/apiError');

/**
 * Normalizes any date format (e.g. '10/27/26', '10/27/2026', '27/10/2026', '2026-10-27', Excel serial date)
 * into a valid MySQL 'YYYY-MM-DD' string.
 */
function normalizeToDateString(val) {
  if (!val) return new Date().toISOString().split('T')[0];

  if (val instanceof Date && !isNaN(val.getTime())) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Handle Excel serial date numbers (e.g. 46322)
  if (typeof val === 'number' || (!isNaN(val) && String(val).trim().length === 5 && !String(val).includes('-') && !String(val).includes('/'))) {
    const num = Number(val);
    if (!isNaN(num) && num > 10000 && num < 100000) {
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const targetDate = new Date(excelEpoch.getTime() + num * 86400000);
      if (!isNaN(targetDate.getTime())) {
        return targetDate.toISOString().split('T')[0];
      }
    }
  }

  const str = String(val).trim();
  if (!str) return new Date().toISOString().split('T')[0];

  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  const parts = str.split(/[/.-]/);
  if (parts.length === 3) {
    let [p1, p2, p3] = parts.map((p) => p.trim());

    if (p3.length === 2) {
      const yr = parseInt(p3, 10);
      p3 = yr < 50 ? `20${p3.padStart(2, '0')}` : `19${p3.padStart(2, '0')}`;
    }

    if (p1.length === 4) {
      const y = p1;
      const m = p2.padStart(2, '0');
      const d = p3.padStart(2, '0');
      return `${y}-${m}-${d}`;
    }

    if (p3.length === 4) {
      const num1 = parseInt(p1, 10);
      const num2 = parseInt(p2, 10);
      const year = p3;

      let month, day;
      if (num1 > 12) {
        day = String(num1).padStart(2, '0');
        month = String(num2).padStart(2, '0');
      } else if (num2 > 12) {
        month = String(num1).padStart(2, '0');
        day = String(num2).padStart(2, '0');
      } else {
        month = String(num1).padStart(2, '0');
        day = String(num2).padStart(2, '0');
      }
      return `${year}-${month}-${day}`;
    }
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return new Date().toISOString().split('T')[0];
}

/**
 * Resident Management Business Logic Service
 */
class ResidentService {
  /**
   * Register a primary resident for a home
   */
  static async createResident(data, user = null) {
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

    const callerSocietyId = (user && user.role !== 'SUPER_ADMIN') ? (user.society_id || user.societyId) : null;
    const socId = callerSocietyId || society_id || 1;

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
      const homes = await HomeRepository.findBySocietyId(socId, { search: hNum });
      const matched = homes.find(
        (h) => String(h.home_number).toLowerCase() === String(hNum).toLowerCase()
      );
      if (!matched) {
        const createdHome = await HomeRepository.create({
          society_id: socId,
          home_number: String(hNum).trim(),
          building_or_wing: data.building_or_wing || null,
          floor: data.floor ? parseInt(data.floor, 10) : null,
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

    if (callerSocietyId && String(home.society_id) !== String(callerSocietyId)) {
      throw ApiError.forbidden('You are not authorized to create residents in another society.');
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

    const maxFamilyMembers = data.max_family_members !== undefined ? parseInt(data.max_family_members, 10) : 4;

    // Check society max users limit if applicable
    const [socRows] = await pool.query(
      `SELECT s.max_users, sp.max_users AS plan_max_users 
       FROM societies s 
       LEFT JOIN subscription_plans sp ON s.subscription_plan_id = sp.id 
       WHERE s.id = ? LIMIT 1`,
      [home.society_id]
    );
    if (socRows.length > 0) {
      const allowedMaxUsers = socRows[0].max_users || socRows[0].plan_max_users || 500;
      const [uCount] = await pool.query(
        'SELECT COUNT(*) AS total FROM users WHERE society_id = ? AND status = "ACTIVE"',
        [home.society_id]
      );
      const currentUsers = uCount[0]?.total || 0;
      if (currentUsers + 1 > allowedMaxUsers) {
        throw ApiError.badRequest(
          `Our society max user is ${allowedMaxUsers}. Adding this resident would exceed the maximum user limit.`
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
        max_family_members: maxFamilyMembers,
      }
    );

    return newResident;
  }

  /**
   * Get all residents with optional filters (Scoped to caller's society if Admin)
   */
  static async getAllResidents(filters = {}, user = null) {
    const finalFilters = { ...filters };
    if (user && user.role !== 'SUPER_ADMIN') {
      finalFilters.society_id = user.society_id || user.societyId;
    }
    return ResidentRepository.findAll(finalFilters);
  }

  /**
   * Get all society users (Owners, Tenants, Family Members, Admin)
   */
  static async getSocietyUsers(query = {}, user = null) {
    let socId = query.society_id || query.societyId;
    if (user && user.role !== 'SUPER_ADMIN') {
      socId = user.society_id || user.societyId;
    }
    if (!socId) {
      socId = 1;
    }
    return ResidentRepository.findSocietyUsers(socId);
  }

  /**
   * Get resident by ID
   */
  static async getResidentById(id, user = null) {
    const resident = await ResidentRepository.findById(id);
    if (!resident) {
      throw ApiError.notFound(`Resident with ID ${id} not found.`);
    }
    if (user && user.role !== 'SUPER_ADMIN') {
      const userSocId = user.society_id || user.societyId;
      if (userSocId && resident.society_id && String(resident.society_id) !== String(userSocId)) {
        throw ApiError.forbidden('Access denied. You cannot view residents from another society.');
      }
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

  /**
   * Batch Import Residents and Homes from Excel/CSV
   * Enforces society plan max_units capacity limit:
   * "if max unit 3 so when import and show inside resident management frist 3 user import"
   */
  static async importBatchResidents(payload, user) {
    const rawItems = payload.residents || payload.items || payload.rows || [];
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      throw ApiError.badRequest('No resident records provided for import.');
    }

    const { pool } = require('../config/db');
    const callerSocietyId = (user && user.role !== 'SUPER_ADMIN') ? (user.society_id || user.societyId) : null;
    const socId = callerSocietyId || payload.society_id || payload.societyId || 1;

    // Fetch society to check max_units and max_users limits
    const [socRows] = await pool.query(`
      SELECT s.id, s.name, s.max_units, s.max_users, s.total_homes,
             sp.max_users AS plan_max_users, sp.max_units AS plan_max_units
      FROM societies s 
      LEFT JOIN subscription_plans sp ON s.subscription_plan_id = sp.id
      WHERE s.id = ?
    `, [socId]);

    if (socRows.length === 0) {
      throw ApiError.notFound(`Society with ID ${socId} not found.`);
    }

    const society = socRows[0];
    const maxUnits = society.max_units || society.plan_max_units || society.total_homes || 100;
    const maxUsers = society.max_users || society.plan_max_users;

    // 1. Units Validation: Total home/unit count in Excel vs max_units
    const homeNoTotalCount = rawItems.length;
    if (homeNoTotalCount > maxUnits) {
      throw ApiError.badRequest(
        `Our society max unit is ${maxUnits}. Your Excel sheet contains ${homeNoTotalCount} units. Cannot import file.`
      );
    }

    // 2. Users Validation: Primary home accounts + sum of max family member accounts vs max_users
    const familyMemberAccountTotal = rawItems.reduce(
      (sum, item) => sum + (parseInt(item.max_family_members || item.max_family || 0, 10) || 0),
      0
    );
    const totalAccounts = homeNoTotalCount + familyMemberAccountTotal;

    if (maxUsers && totalAccounts > maxUsers) {
      throw ApiError.badRequest(
        `Our society max user is ${maxUsers}. Total user accounts (Home primary residents: ${homeNoTotalCount} + Max family member accounts: ${familyMemberAccountTotal} = ${totalAccounts}) exceeds our society max user limit of ${maxUsers}. Cannot import file.`
      );
    }

    const allowedItems = rawItems;
    const importedResults = [];
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      for (const item of allowedItems) {
        const homeNo = String(item.home_no || item.home_number || item.unit || '').trim();
        if (!homeNo) continue;

        const homeType = String(item.home_type || 'flat').trim().toLowerCase() === 'bunglow' ? 'BUNGALOW' : 'FLAT';
        const isBung = homeType === 'BUNGALOW';
        const finalTower = isBung ? null : String(item.tower || item.building_or_wing || 'Tower A').trim();
        const finalFloor = isBung ? null : (parseInt(item.floor || item.flor || 1, 10) || 1);
        const propConfig = String(item.property_configuration || item.configuration || '2bhk').trim();
        const rawName = String(item.user_name || item.name || '').trim();
        const userName = rawName || `Resident ${homeNo}`;
        const residentType = String(item.resident_type || 'Owner').trim().toUpperCase() === 'TENANT' ? 'TENANT' : 'OWNER';
        const phone = String(item.phone_number || item.phone || '').trim();
        const email = item.email_id || item.email ? String(item.email_id || item.email).trim().toLowerCase() : null;
        const moveInDate = normalizeToDateString(item.move_in_date);
        const rawPass = String(item.password || '123456');
        const maxFamily = parseInt(item.max_family_members || item.max_family || 0, 10) || 0;

        // 1. Resolve or create Home
        let homeId = null;
        const [existingHome] = await connection.query(
          'SELECT id FROM homes WHERE society_id = ? AND (home_number = ? OR flat_number = ?)',
          [socId, homeNo, homeNo]
        );

        const hasResidentData = Boolean(phone);
        const occStatus = hasResidentData
          ? (residentType === 'TENANT' ? 'OCCUPIED_BY_TENANT' : 'OCCUPIED_BY_OWNER')
          : 'VACANT';

        if (existingHome.length > 0) {
          homeId = existingHome[0].id;
          await connection.query(
            'UPDATE homes SET max_family_members = ?, building_or_wing = COALESCE(?, building_or_wing), floor = COALESCE(?, floor), occupancy_status = ? WHERE id = ?',
            [maxFamily, finalTower, finalFloor, occStatus, homeId]
          );
        } else {
          const [homeInsert] = await connection.query(`
            INSERT INTO homes (
              society_id, home_number, flat_number, building_or_wing, block_or_tower,
              floor, floor_number, home_type, max_family_members, status, occupancy_status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?)
          `, [
            socId,
            homeNo,
            homeNo,
            finalTower,
            finalTower,
            finalFloor,
            finalFloor,
            propConfig,
            maxFamily,
            occStatus,
          ]);
          homeId = homeInsert.insertId;
        }

        // 2. Resolve or create User & Resident if resident phone is provided
        if (hasResidentData) {
          let userId = null;
          const [existingUser] = await connection.query('SELECT id FROM users WHERE phone = ?', [phone]);
          const hashedPassword = await bcrypt.hash(rawPass, 10);

          if (existingUser.length > 0) {
            userId = existingUser[0].id;
            await connection.query(`
              UPDATE users SET society_id = ?, full_name = ?, email = COALESCE(?, email),
                               role = ?, flat_number = ?, block_or_tower = ?
              WHERE id = ?
            `, [socId, userName, email, residentType, homeNo, finalTower, userId]);
          } else {
            const [userInsert] = await connection.query(`
              INSERT INTO users (
                society_id, full_name, email, phone, password, role,
                flat_number, block_or_tower, status
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
            `, [socId, userName, email, phone, hashedPassword, residentType, homeNo, finalTower]);
            userId = userInsert.insertId;
          }

          // 3. Resolve or create Resident link with max_family_members
          const [existingResident] = await connection.query(
            'SELECT id FROM residents WHERE home_id = ? AND user_id = ?',
            [homeId, userId]
          );

          if (existingResident.length === 0) {
            const [resInsert] = await connection.query(`
              INSERT INTO residents (
                home_id, user_id, resident_type, max_family_members, is_primary_contact, move_in_date, status
              ) VALUES (?, ?, ?, ?, 1, ?, 'ACTIVE')
            `, [homeId, userId, residentType, maxFamily, moveInDate]);

            importedResults.push({
              id: resInsert.insertId,
              home_number: homeNo,
              full_name: userName,
              phone,
              resident_type: residentType,
              max_family_members: maxFamily,
            });
          } else {
            await connection.query('UPDATE residents SET max_family_members = ? WHERE id = ?', [maxFamily, existingResident[0].id]);
            importedResults.push({
              id: existingResident[0].id,
              home_number: homeNo,
              full_name: userName,
              phone,
              resident_type: residentType,
              max_family_members: maxFamily,
            });
          }
        } else {
          // Home created without resident
          importedResults.push({
            id: null,
            home_number: homeNo,
            full_name: null,
            phone: null,
            resident_type: null,
            max_family_members: maxFamily,
          });
        }
      }

      await connection.commit();

      const message = `Successfully imported ${importedResults.length} residents and homes! Max family members assigned home-wise.`;

      return {
        importedCount: importedResults.length,
        imported_count: importedResults.length,
        skippedCount: 0,
        skipped_count: 0,
        maxUnits,
        maxUsers,
        totalAccounts,
        familyMemberAccountTotal,
        totalInFile: rawItems.length,
        residents: importedResults,
        message,
      };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }
}

module.exports = ResidentService;
