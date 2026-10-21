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

    const validTypes = ['BUNGALOW', 'FLAT'];
    const typeUpper = (society_type || 'FLAT').toUpperCase();
    if (!validTypes.includes(typeUpper)) {
      throw ApiError.badRequest(`Invalid Society Type. Must be one of: ${validTypes.join(', ')}`);
    }

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
      society_type: typeUpper,
      total_homes: parseInt(total_homes, 10) || 0,
      address: address.trim(),
      contact_number: contact_number ? String(contact_number).trim() : null,
      emergency_number: emergency_number ? String(emergency_number).trim() : null,
      status: status || 'ACTIVE',
    });

    return newSociety;
  }

  /**
   * Retrieve all societies with search/filters
   */
  static async getAllSocieties(filters) {
    return SocietyRepository.findAll(filters);
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
  static async updateSociety(id, data) {
    const existing = await SocietyRepository.findById(id);
    if (!existing) {
      throw ApiError.notFound(`Society with ID ${id} not found.`);
    }

    if (data.society_type) {
      const typeUpper = data.society_type.toUpperCase();
      if (!['BUNGALOW', 'FLAT'].includes(typeUpper)) {
        throw ApiError.badRequest('Invalid Society Type. Must be BUNGALOW or FLAT.');
      }
      data.society_type = typeUpper;
    }

    return SocietyRepository.update(id, data);
  }

  /**
   * Delete or deactivate society
   */
  static async deleteSociety(id, hardDelete = false) {
    const existing = await SocietyRepository.findById(id);
    if (!existing) {
      throw ApiError.notFound(`Society with ID ${id} not found.`);
    }

    if (hardDelete) {
      await SocietyRepository.delete(id);
      return { message: 'Society deleted permanently.' };
    }

    // Default: Soft deactivate
    await SocietyRepository.updateStatus(id, 'INACTIVE');
    return { message: 'Society deactivated successfully.' };
  }
}

module.exports = SocietyService;
