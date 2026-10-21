const { pool } = require('../config/db');

/**
 * Home Repository
 * Encapsulates all SQL database operations for Homes/Units within societies.
 */
class HomeRepository {
  /**
   * Create a new home
   */
  static async create(data) {
    const {
      society_id,
      home_number,
      building_or_wing = null,
      floor = null,
      home_type = '2BHK',
      status = 'ACTIVE',
      occupancy_status = 'VACANT',
    } = data;

    const query = `
      INSERT INTO homes (
        society_id, home_number, flat_number, building_or_wing, block_or_tower,
        floor, floor_number, home_type, status, occupancy_status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await pool.query(query, [
      society_id,
      home_number.trim(),
      home_number.trim(), // fallback to flat_number
      building_or_wing,
      building_or_wing, // fallback to block_or_tower
      floor,
      floor, // fallback to floor_number
      home_type,
      status,
      occupancy_status,
    ]);

    return this.findById(result.insertId);
  }

  /**
   * Batch insert homes (e.g. Home 1 to Home 100)
   */
  static async bulkCreate(society_id, homesList) {
    if (!homesList || homesList.length === 0) return [];

    const values = [];
    const placeholders = [];

    for (const h of homesList) {
      placeholders.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
      values.push(
        society_id,
        h.home_number.trim(),
        h.home_number.trim(),
        h.building_or_wing || null,
        h.building_or_wing || null,
        h.floor || null,
        h.floor || null,
        h.home_type || '2BHK',
        h.status || 'ACTIVE',
        h.occupancy_status || 'VACANT'
      );
    }

    const query = `
      INSERT INTO homes (
        society_id, home_number, flat_number, building_or_wing, block_or_tower,
        floor, floor_number, home_type, status, occupancy_status
      )
      VALUES ${placeholders.join(', ')}
    `;

    await pool.query(query, values);
    return this.findBySocietyId(society_id);
  }

  /**
   * Find a home by ID
   */
  static async findById(id) {
    const query = `
      SELECT 
        h.id, h.society_id,
        COALESCE(h.home_number, h.flat_number) AS home_number,
        COALESCE(h.building_or_wing, h.block_or_tower) AS building_or_wing,
        COALESCE(h.floor, h.floor_number) AS floor,
        h.home_type, h.status, h.occupancy_status, h.created_at, h.updated_at,
        s.name AS society_name, s.society_type
      FROM homes h
      JOIN societies s ON h.society_id = s.id
      WHERE h.id = ?
      LIMIT 1
    `;
    const [rows] = await pool.query(query, [id]);
    return rows[0] || null;
  }

  /**
   * Find all homes belonging to a society
   */
  static async findBySocietyId(societyId, filters = {}) {
    let query = `
      SELECT 
        h.id, h.society_id,
        COALESCE(h.home_number, h.flat_number) AS home_number,
        COALESCE(h.building_or_wing, h.block_or_tower) AS building_or_wing,
        COALESCE(h.floor, h.floor_number) AS floor,
        h.home_type, h.status, h.occupancy_status, h.created_at, h.updated_at,
        s.name AS society_name, s.code AS society_code
      FROM homes h
      LEFT JOIN societies s ON h.society_id = s.id
      WHERE h.society_id = ?
    `;
    const params = [societyId];

    if (filters.status) {
      query += ' AND h.status = ?';
      params.push(filters.status);
    }

    if (filters.home_type) {
      query += ' AND h.home_type = ?';
      params.push(filters.home_type);
    }

    if (filters.building_or_wing) {
      query += ' AND (h.building_or_wing = ? OR h.block_or_tower = ?)';
      params.push(filters.building_or_wing, filters.building_or_wing);
    }

    if (filters.search) {
      query += ' AND (h.home_number LIKE ? OR h.flat_number LIKE ?)';
      const term = `%${filters.search}%`;
      params.push(term, term);
    }

    query += ' ORDER BY h.id ASC';

    const [rows] = await pool.query(query, params);
    return rows;
  }

  /**
   * Find all homes across all societies (or filtered by society/search)
   */
  static async findAll(filters = {}) {
    let query = `
      SELECT 
        h.id, h.society_id,
        COALESCE(h.home_number, h.flat_number) AS home_number,
        COALESCE(h.building_or_wing, h.block_or_tower) AS building_or_wing,
        COALESCE(h.floor, h.floor_number) AS floor,
        h.home_type, h.status, h.occupancy_status, h.created_at, h.updated_at,
        s.name AS society_name, s.code AS society_code
      FROM homes h
      LEFT JOIN societies s ON h.society_id = s.id
      WHERE 1=1
    `;
    const params = [];

    const targetSocId = filters.society_id || filters.societyId;
    if (targetSocId && targetSocId !== 'ALL') {
      query += ' AND h.society_id = ?';
      params.push(targetSocId);
    }

    if (filters.status) {
      query += ' AND h.status = ?';
      params.push(filters.status);
    }

    if (filters.home_type) {
      query += ' AND h.home_type = ?';
      params.push(filters.home_type);
    }

    if (filters.building_or_wing) {
      query += ' AND (h.building_or_wing = ? OR h.block_or_tower = ?)';
      params.push(filters.building_or_wing, filters.building_or_wing);
    }

    if (filters.search) {
      query += ' AND (h.home_number LIKE ? OR h.flat_number LIKE ? OR s.name LIKE ?)';
      const term = `%${filters.search}%`;
      params.push(term, term, term);
    }

    query += ' ORDER BY h.society_id ASC, h.id ASC';

    const [rows] = await pool.query(query, params);
    return rows;
  }

  /**
   * Check if home number already exists in society
   */
  static async checkExists(societyId, homeNumber, buildingOrWing = null, excludeId = null) {
    let query = `
      SELECT id FROM homes 
      WHERE society_id = ? AND (home_number = ? OR flat_number = ?)
    `;
    const params = [societyId, homeNumber.trim(), homeNumber.trim()];

    if (buildingOrWing) {
      query += ' AND (building_or_wing = ? OR block_or_tower = ?)';
      params.push(buildingOrWing, buildingOrWing);
    }

    if (excludeId) {
      query += ' AND id != ?';
      params.push(excludeId);
    }

    const [rows] = await pool.query(query, params);
    return rows.length > 0;
  }

  /**
   * Update home
   */
  static async update(id, data) {
    const fields = [];
    const params = [];

    if (data.home_number !== undefined) {
      fields.push('home_number = ?, flat_number = ?');
      params.push(data.home_number.trim(), data.home_number.trim());
    }
    if (data.building_or_wing !== undefined) {
      fields.push('building_or_wing = ?, block_or_tower = ?');
      params.push(data.building_or_wing, data.building_or_wing);
    }
    if (data.floor !== undefined) {
      fields.push('floor = ?, floor_number = ?');
      params.push(data.floor, data.floor);
    }
    if (data.home_type !== undefined) {
      fields.push('home_type = ?');
      params.push(data.home_type);
    }
    if (data.status !== undefined) {
      fields.push('status = ?');
      params.push(data.status);
    }
    if (data.occupancy_status !== undefined) {
      fields.push('occupancy_status = ?');
      params.push(data.occupancy_status);
    }

    if (fields.length === 0) return this.findById(id);

    fields.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    const query = `UPDATE homes SET ${fields.join(', ')} WHERE id = ?`;
    await pool.query(query, params);

    return this.findById(id);
  }

  /**
   * Delete home
   */
  static async delete(id) {
    const query = 'DELETE FROM homes WHERE id = ?';
    const [result] = await pool.query(query, [id]);
    return result.affectedRows > 0;
  }

  /**
   * Count homes by society
   */
  static async countBySociety(societyId) {
    const query = 'SELECT COUNT(*) as count FROM homes WHERE society_id = ?';
    const [rows] = await pool.query(query, [societyId]);
    return rows[0]?.count || 0;
  }
}

module.exports = HomeRepository;
