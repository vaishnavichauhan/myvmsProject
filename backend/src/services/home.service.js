const HomeRepository = require('../repositories/home.repository');
const SocietyRepository = require('../repositories/society.repository');
const ApiError = require('../utils/apiError');

/**
 * Home Management Business Logic Service
 */
class HomeService {
  /**
   * Create a single home in a society
   */
  static async createHome(societyId, data) {
    const society = await SocietyRepository.findById(societyId);
    if (!society) {
      throw ApiError.notFound(`Society with ID ${societyId} not found.`);
    }

    const homeNumber = data.home_number || data.homeNumber || data.flat_number;
    if (!homeNumber || !String(homeNumber).trim()) {
      throw ApiError.badRequest('Home Number is required (e.g. Home 1, 101, Villa 4).');
    }

    const buildingOrWing = data.building_or_wing || data.buildingOrWing || null;

    // Check duplicate within the same society & wing
    const exists = await HomeRepository.checkExists(societyId, homeNumber, buildingOrWing);
    if (exists) {
      throw ApiError.conflict(
        `Home number "${homeNumber}" already exists ${buildingOrWing ? `in ${buildingOrWing}` : 'in this society'}.`
      );
    }

    const newHome = await HomeRepository.create({
      society_id: societyId,
      home_number: String(homeNumber).trim(),
      building_or_wing: buildingOrWing ? String(buildingOrWing).trim() : null,
      floor: data.floor !== undefined && data.floor !== null && data.floor !== '' ? parseInt(data.floor, 10) : null,
      home_type: data.home_type || data.homeType || '2BHK',
      status: data.status || 'ACTIVE',
      occupancy_status: data.occupancy_status || 'VACANT',
    });

    // Update society total_homes count (only grow capacity, never shrink)
    const totalCount = await HomeRepository.countBySociety(societyId);
    const soc = await SocietyRepository.findById(societyId);
    if (soc && totalCount > (soc.total_homes || 0)) {
      await SocietyRepository.update(societyId, { total_homes: totalCount });
    }

    return newHome;
  }

  /**
   * Batch generate homes (e.g., Home 1 to Home 100)
   */
  static async batchGenerateHomes(societyId, config) {
    const society = await SocietyRepository.findById(societyId);
    if (!society) {
      throw ApiError.notFound(`Society with ID ${societyId} not found.`);
    }

    const count = parseInt(config.count, 10) || 10;
    if (count < 1 || count > 500) {
      throw ApiError.badRequest('Batch count must be between 1 and 500.');
    }

    const startFrom = parseInt(config.startFrom, 10) || 1;
    const prefix = config.prefix || 'Home '; // e.g. "Home " or "Flat " or ""
    const buildingOrWing = config.building_or_wing || config.buildingOrWing || null;
    const homeType = config.home_type || config.homeType || '2BHK';

    const homesToInsert = [];
    for (let i = 0; i < count; i++) {
      const num = startFrom + i;
      const homeNumber = `${prefix}${num}`;
      
      // Skip if already exists
      const exists = await HomeRepository.checkExists(societyId, homeNumber, buildingOrWing);
      if (!exists) {
        homesToInsert.push({
          home_number: homeNumber,
          building_or_wing: buildingOrWing,
          floor: Math.ceil(num / 10), // approximate floor assignment
          home_type: homeType,
          status: 'ACTIVE',
          occupancy_status: 'VACANT',
        });
      }
    }

    if (homesToInsert.length > 0) {
      await HomeRepository.bulkCreate(societyId, homesToInsert);
    }

    // Refresh society total_homes (only grow, do not shrink)
    const totalCount = await HomeRepository.countBySociety(societyId);
    if (totalCount > (society.total_homes || 0)) {
      await SocietyRepository.update(societyId, { total_homes: totalCount });
    }

    return {
      message: `Successfully created ${homesToInsert.length} homes in society.`,
      createdCount: homesToInsert.length,
      totalHomes: totalCount,
    };
  }

  /**
   * Get all homes across all societies (with optional filters)
   */
  static async getAllHomes(filters = {}) {
    return HomeRepository.findAll(filters);
  }

  /**
   * Get all homes in a society
   */
  static async getHomesBySociety(societyId, filters) {
    const society = await SocietyRepository.findById(societyId);
    if (!society) {
      throw ApiError.notFound(`Society with ID ${societyId} not found.`);
    }
    return HomeRepository.findBySocietyId(societyId, filters);
  }

  /**
   * Get single home details
   */
  static async getHomeById(id) {
    const home = await HomeRepository.findById(id);
    if (!home) {
      throw ApiError.notFound(`Home with ID ${id} not found.`);
    }
    return home;
  }

  /**
   * Update home
   */
  static async updateHome(id, data) {
    const existing = await HomeRepository.findById(id);
    if (!existing) {
      throw ApiError.notFound(`Home with ID ${id} not found.`);
    }

    if (data.home_number) {
      const exists = await HomeRepository.checkExists(
        existing.society_id,
        data.home_number,
        data.building_or_wing || existing.building_or_wing,
        id
      );
      if (exists) {
        throw ApiError.conflict(`Home number "${data.home_number}" already exists in this society.`);
      }
    }

    return HomeRepository.update(id, data);
  }

  /**
   * Delete home
   */
  static async deleteHome(id) {
    const existing = await HomeRepository.findById(id);
    if (!existing) {
      throw ApiError.notFound(`Home with ID ${id} not found.`);
    }

    await HomeRepository.delete(id);

    // Refresh society total_homes
    const totalCount = await HomeRepository.countBySociety(existing.society_id);
    await SocietyRepository.update(existing.society_id, { total_homes: totalCount });

    return { message: 'Home deleted successfully.' };
  }
}

module.exports = HomeService;
