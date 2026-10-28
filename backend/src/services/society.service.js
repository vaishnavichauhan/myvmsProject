const SocietyRepository = require('../repositories/society.repository');
const ApiError = require('../utils/apiError');

/**
 * Society Management Business Logic Service
 */
class SocietyService {
  /**
   * Create a new residential society
   */
  static async createSociety(data) {
    // Single society constraint: Only one society can be registered in the system
    const existingSocieties = await SocietyRepository.findAll();
    if (existingSocieties && existingSocieties.length >= 1) {
      throw ApiError.badRequest('Only one society can be registered in the system. Please edit the existing society instead.');
    }

    const { name, address, society_type, total_homes, contact_number, emergency_number, status } = data;

    if (!name || !name.trim()) {
      throw ApiError.badRequest('Society Name is required.');
    }

    if (!address || !address.trim()) {
      throw ApiError.badRequest('Society Address is required.');
    }

    const validTypes = ['BUNGALOW', 'FLAT', 'GATED_COMMUNITY', 'APARTMENT', 'COMMERCIAL', 'OTHER'];
    const typeUpper = (society_type || 'FLAT').toUpperCase();
    if (!validTypes.includes(typeUpper)) {
      throw ApiError.badRequest(`Invalid Society Type. Must be one of: ${validTypes.join(', ')}`);
    }

    const validConfigs = ['1BHK', '2BHK', '3BHK', '4BHK', 'PENTHOUSE'];
    let rawConfigs = [];
    if (Array.isArray(data.property_configuration)) {
      rawConfigs = data.property_configuration;
    } else if (typeof data.property_configuration === 'string') {
      rawConfigs = data.property_configuration.split(/[,/]+/).map((s) => s.trim());
    }
    const cleanedConfigs = rawConfigs
      .map((c) => {
        let u = c.toUpperCase().trim();
        if (u === 'PANTHOUSE') u = 'PENTHOUSE';
        return u;
      })
      .filter((c) => validConfigs.includes(c));

    const finalConfig = cleanedConfigs.length > 0 ? Array.from(new Set(cleanedConfigs)).join(', ') : '2BHK';

    // Generate unique society code e.g. EMERALD-492
    const codeBase = name
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 6)
      .toUpperCase();
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const code = `${codeBase || 'SOC'}-${randomSuffix}`;

    const newSociety = await SocietyRepository.create({
      name: name.trim(),
      code,
      registration_number: data.registration_number ? String(data.registration_number).trim() : null,
      contact_email: data.contact_email ? String(data.contact_email).trim() : null,
      society_type: typeUpper,
      property_configuration: finalConfig,
      total_homes: parseInt(total_homes, 10) || 10,
      address: address.trim(),
      contact_number: contact_number ? String(contact_number).trim() : null,
      emergency_number: emergency_number ? String(emergency_number).trim() : null,
      status: status || 'ACTIVE',
    });

    // Auto-generate unit records based on society type & total units
    const totalUnits = parseInt(total_homes, 10) || 10;
    const unitDefaultConfig = cleanedConfigs[0] || '2BHK';
    const unitsToCreate = [];

    if (typeUpper === 'BUNGALOW') {
      const startNo = parseInt(data.bungalow_start_no, 10) || 1;
      for (let i = 0; i < totalUnits; i++) {
        unitsToCreate.push({
          home_number: String(startNo + i),
          building_or_wing: null,
          floor: null,
          home_type: unitDefaultConfig,
          occupancy_status: 'VACANT',
          status: 'ACTIVE',
        });
      }
    } else {
      // FLAT: Check if dynamic towers list was sent
      if (Array.isArray(data.towers) && data.towers.length > 0) {
        for (const t of data.towers) {
          const tName = (t.name || 'A').toString().trim();
          const tFloor = t.floor !== undefined && t.floor !== '' ? Number(t.floor) : 1;
          const tStart = parseInt(t.startNo, 10) || 1;
          const tCount = Math.max(1, parseInt(t.count, 10) || 5);

          for (let i = 0; i < tCount; i++) {
            unitsToCreate.push({
              home_number: `${tName}-${tStart + i}`,
              building_or_wing: tName,
              floor: tFloor,
              home_type: unitDefaultConfig,
              occupancy_status: 'VACANT',
              status: 'ACTIVE',
            });
          }
        }
      } else {
        // Fallback: tower A (default 1 to 5), tower B (default 6 to 10)
        const towerACount = Math.ceil(totalUnits / 2);
        const towerBCount = totalUnits - towerACount;

        const towerAName = (data.tower_a_name || 'A').toString().trim();
        const towerAFloor = data.tower_a_floor !== undefined && data.tower_a_floor !== '' ? Number(data.tower_a_floor) : 1;
        const towerAStart = parseInt(data.tower_a_start, 10) || 1;

        const towerBName = (data.tower_b_name || 'B').toString().trim();
        const towerBFloor = data.tower_b_floor !== undefined && data.tower_b_floor !== '' ? Number(data.tower_b_floor) : 1;
        const towerBStart = parseInt(data.tower_b_start, 10) || (towerAStart + towerACount);

        for (let i = 0; i < towerACount; i++) {
          unitsToCreate.push({
            home_number: `${towerAName}-${towerAStart + i}`,
            building_or_wing: towerAName,
            floor: towerAFloor,
            home_type: unitDefaultConfig,
            occupancy_status: 'VACANT',
            status: 'ACTIVE',
          });
        }
        for (let i = 0; i < towerBCount; i++) {
          unitsToCreate.push({
            home_number: `${towerBName}-${towerBStart + i}`,
            building_or_wing: towerBName,
            floor: towerBFloor,
            home_type: unitDefaultConfig,
            occupancy_status: 'VACANT',
            status: 'ACTIVE',
          });
        }
      }
    }

    if (unitsToCreate.length > 0) {
      const HomeRepository = require('../repositories/home.repository');
      try {
        await HomeRepository.bulkCreate(newSociety.id, unitsToCreate);
        await SocietyRepository.update(newSociety.id, { total_homes: unitsToCreate.length });
        newSociety.total_homes = unitsToCreate.length;
      } catch (err) {
        console.error('Failed to auto-create homes for new society:', err);
      }
    }

    // Auto-create default 12-month maintenance cycle from society creation month
    try {
      const MaintenanceService = require('./maintenance.service');
      await MaintenanceService.ensureDefaultCycle(newSociety.id);
    } catch (cycleErr) {
      console.warn('Failed to auto-create default maintenance cycle for new society:', cycleErr.message);
    }

    return newSociety;
  }

  /**
   * Retrieve all societies with search/filters (Scoped to caller's society if Admin)
   */
  static async getAllSocieties(filters, user = null) {
    const isSuperAdmin = user && user.role === 'SUPER_ADMIN';
    const callerSocietyId = !isSuperAdmin && user ? (user.society_id || user.societyId) : null;
    const callerUserId = !isSuperAdmin && user ? user.id : null;
    return SocietyRepository.findAll(filters, callerSocietyId, callerUserId);
  }

  /**
   * Retrieve society details by ID
   */
  static async getSocietyById(id) {
    const society = await SocietyRepository.findById(id);
    if (!society) {
      throw ApiError.notFound(`Society with ID ${id} not found.`);
    }
    return society;
  }

  /**
   * Update society information
   */
  static async updateSociety(id, data, user = null) {
    const existing = await SocietyRepository.findById(id);
    if (!existing) {
      throw ApiError.notFound(`Society with ID ${id} not found.`);
    }

    // Non-superadmin (Society Admin) cannot modify name, code, society structure type, or status
    if (user && user.role !== 'SUPER_ADMIN') {
      delete data.name;
      delete data.code;
      delete data.society_type;
      delete data.status;
    }

    if (data.name && !String(data.name).trim()) {
      throw ApiError.badRequest('Society Name cannot be empty.');
    }

    if (data.code) {
      const codeUpper = String(data.code).trim().toUpperCase();
      if (codeUpper !== existing.code) {
        const withCode = await SocietyRepository.findByCode(codeUpper);
        if (withCode && withCode.id !== Number(id)) {
          throw ApiError.conflict(`Society code "${codeUpper}" is already in use by another society.`);
        }
      }
      data.code = codeUpper;
    }

    if (data.society_type) {
      const validTypes = ['BUNGALOW', 'FLAT', 'GATED_COMMUNITY', 'APARTMENT', 'COMMERCIAL', 'PENTHOUSE', 'OTHER'];
      const typeUpper = data.society_type.toUpperCase();
      if (!validTypes.includes(typeUpper)) {
        throw ApiError.badRequest(`Invalid Society Type. Must be one of: ${validTypes.join(', ')}`);
      }
      data.society_type = typeUpper;
    }

    if (data.max_units !== undefined) {
      const maxU = parseInt(data.max_units, 10);
      if (!isNaN(maxU) && maxU > 0) {
        data.max_units = maxU;
        data.total_homes = maxU;
      }
    }

    if (data.property_configuration) {
      const validConfigs = ['1BHK', '2BHK', '3BHK', '4BHK', 'PENTHOUSE'];
      let rawConfigs = [];
      if (Array.isArray(data.property_configuration)) {
        rawConfigs = data.property_configuration;
      } else if (typeof data.property_configuration === 'string') {
        rawConfigs = data.property_configuration.split(/[,/]+/).map((s) => s.trim());
      }
      const cleanedConfigs = rawConfigs
        .map((c) => {
          let u = c.toUpperCase().trim();
          if (u === 'PANTHOUSE') u = 'PENTHOUSE';
          return u;
        })
        .filter((c) => validConfigs.includes(c));

      data.property_configuration = cleanedConfigs.length > 0 ? Array.from(new Set(cleanedConfigs)).join(', ') : '2BHK';
    }

    if (data.total_homes !== undefined) {
      const newTotal = parseInt(data.total_homes, 10);
      if (!isNaN(newTotal) && newTotal > 0) {
        // Enforce subscription plan max_units limit if society has a plan
        if (existing.subscription_plan_id) {
          const { pool } = require('../config/db');
          const [planRows] = await pool.query('SELECT name, max_units FROM subscription_plans WHERE id = ?', [existing.subscription_plan_id]);
          if (planRows.length > 0 && planRows[0].max_units) {
            const [overrideRows] = await pool.query('SELECT max_units FROM society_limit_overrides WHERE society_id = ?', [id]);
            const allowedMax = (overrideRows.length > 0 && overrideRows[0].max_units !== null) ? overrideRows[0].max_units : planRows[0].max_units;
            if (newTotal > allowedMax) {
              throw ApiError.badRequest(
                `Total units (${newTotal}) exceeds your subscription plan limit of ${allowedMax} units (${planRows[0].name} Plan). Please upgrade your plan or request a limit override.`
              );
            }
          }
        }

        data.total_homes = newTotal;
        data.max_units = data.max_units !== undefined ? parseInt(data.max_units, 10) : newTotal;
        const HomeRepository = require('../repositories/home.repository');
        const existingHomes = await HomeRepository.findBySocietyId(id);
        const occupiedCount = existingHomes.filter(
          (h) => h.occupancy_status === 'OCCUPIED_BY_OWNER' || h.occupancy_status === 'OCCUPIED_BY_TENANT'
        ).length;

        if (newTotal < occupiedCount) {
          throw ApiError.badRequest(
            `Cannot set Total Units to ${newTotal}. Society currently has ${occupiedCount} occupied units with active residents. Occupied units are determined by registered residents.`
          );
        }

        const existingNums = new Set(existingHomes.map((h) => String(h.home_number)));
        const socType = data.society_type || existing.society_type || 'FLAT';
        const startNo = parseInt(data.bungalow_start_no, 10) || 1;
        const toCreate = [];

        if (existingHomes.length < newTotal) {
          const needed = newTotal - existingHomes.length;
          const isBungalow = socType === 'BUNGALOW';
          for (let i = 0; i < newTotal && toCreate.length < needed; i++) {
            const hNum = isBungalow
              ? String(startNo + i)
              : (existingHomes.length > 0 ? `Unit ${existingHomes.length + toCreate.length + 1}` : String(101 + toCreate.length));
            if (!existingNums.has(hNum)) {
              existingNums.add(hNum);
              toCreate.push({
                home_number: hNum,
                building_or_wing: isBungalow ? null : (data.towers?.[0]?.name ? `Tower ${data.towers[0].name}` : 'Wing A'),
                floor: isBungalow ? null : 1,
                home_type: data.property_configuration || existing.property_configuration || '2BHK',
                occupancy_status: 'VACANT',
                status: 'ACTIVE',
              });
            }
          }
        }
        if (toCreate.length > 0) {
          await HomeRepository.bulkCreate(id, toCreate);
        }
      }
    }

    return SocietyRepository.update(id, data);
  }

  /**
   * Delete or deactivate society
   */
  static async deleteSociety(id, hardDelete = true) {
    const existing = await SocietyRepository.findById(id);
    if (!existing) {
      throw ApiError.notFound(`Society with ID ${id} not found.`);
    }

    if (hardDelete) {
      const { pool } = require('../config/db');
      await pool.query('DELETE FROM homes WHERE society_id = ?', [id]);
      await pool.query('UPDATE users SET society_id = NULL WHERE society_id = ?', [id]);
      await SocietyRepository.delete(id);
      return { message: 'Society deleted permanently.' };
    }

    // Default: Soft deactivate
    await SocietyRepository.updateStatus(id, 'INACTIVE');
    return { message: 'Society deactivated successfully.' };
  }
}

module.exports = SocietyService;
