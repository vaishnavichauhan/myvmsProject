const { pool } = require('../config/db');

/**
 * Society Repository
 * Encapsulates all SQL database operations for Societies.
 */
class SocietyRepository {
  /**
   * Create a new residential society
   */
  static async create(data) {
    const {
      name,
      code,
      registration_number = null,
      contact_email = null,
      society_type = 'FLAT',
      property_configuration = '2BHK',
      total_homes = 0,
      address,
      contact_number = null,
      emergency_number = null,
      status = 'ACTIVE',
    } = data;

    const query = `
      INSERT INTO societies (
        name, code, registration_number, contact_email, society_type, property_configuration, total_homes,
        address, address_line1, contact_number, contact_phone, emergency_number, status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await pool.query(query, [
      name.trim(),
      code.trim().toUpperCase(),
      registration_number,
      contact_email,
      society_type,
      property_configuration || '2BHK',
      total_homes,
      address,
      address, // fallback to address_line1
      contact_number,
      contact_number,
      emergency_number,
      status,
    ]);

    return this.findById(result.insertId);
  }

  /**
   * Find society by ID
   */
  static async findById(id) {
    const query = `
      SELECT 
        s.id, s.name, s.code, s.registration_number, s.contact_email, s.society_type, s.property_configuration, s.total_homes,
        s.max_units, s.subscription_plan_id, s.subscription_status,
        COALESCE(s.address, s.address_line1) AS address,
        COALESCE(s.contact_number, s.contact_phone) AS contact_number,
        s.emergency_number, s.status, s.created_at, s.updated_at,
        (SELECT COUNT(*) FROM homes h WHERE h.society_id = s.id) AS actual_homes_count,
        (SELECT COUNT(*) FROM homes h WHERE h.society_id = s.id AND h.occupancy_status IN ('OCCUPIED_BY_OWNER', 'OCCUPIED_BY_TENANT')) AS occupied_homes_count,
        GREATEST(0, s.total_homes - (SELECT COUNT(*) FROM homes h WHERE h.society_id = s.id AND h.occupancy_status IN ('OCCUPIED_BY_OWNER', 'OCCUPIED_BY_TENANT'))) AS vacant_homes_count
      FROM societies s
      WHERE s.id = ?
      LIMIT 1
    `;
    const [rows] = await pool.query(query, [id]);
    return rows[0] || null;
  }

  /**
   * Find society by code
   */
  static async findByCode(code) {
    const query = 'SELECT id, name, code FROM societies WHERE code = ? LIMIT 1';
    const [rows] = await pool.query(query, [code.trim().toUpperCase()]);
    return rows[0] || null;
  }

  /**
   * Find all societies with optional status filter (supports multi-tenant scoping)
   */
  static async findAll(filters = {}, callerSocietyId = null, callerUserId = null) {
    let query = `
      SELECT 
        s.id, s.name, s.code, s.registration_number, s.contact_email, s.society_type, s.property_configuration, s.total_homes,
        s.max_units, s.subscription_plan_id, s.subscription_status,
        COALESCE(s.address, s.address_line1) AS address,
        COALESCE(s.contact_number, s.contact_phone) AS contact_number,
        s.emergency_number, s.status, s.created_at, s.updated_at,
        (SELECT COUNT(*) FROM homes h WHERE h.society_id = s.id) AS actual_homes_count,
        (SELECT COUNT(*) FROM homes h WHERE h.society_id = s.id AND h.occupancy_status IN ('OCCUPIED_BY_OWNER', 'OCCUPIED_BY_TENANT')) AS occupied_homes_count,
        GREATEST(0, s.total_homes - (SELECT COUNT(*) FROM homes h WHERE h.society_id = s.id AND h.occupancy_status IN ('OCCUPIED_BY_OWNER', 'OCCUPIED_BY_TENANT'))) AS vacant_homes_count
      FROM societies s
      WHERE 1=1
    `;
    const params = [];

    // Multi-tenant scoping: regular Admin only sees their own assigned society
    if (callerSocietyId || callerUserId) {
      query += ' AND (s.id = ? OR s.admin_user_id = ?)';
      params.push(callerSocietyId || 0, callerUserId || 0);
    }

    if (filters.status) {
      query += ' AND s.status = ?';
      params.push(filters.status);
    }

    if (filters.society_type) {
      query += ' AND s.society_type = ?';
      params.push(filters.society_type);
    }

    if (filters.search) {
      query += ' AND (s.name LIKE ? OR s.code LIKE ? OR s.address LIKE ?)';
      const term = `%${filters.search}%`;
      params.push(term, term, term);
    }

    query += ' ORDER BY s.created_at DESC';

    const [rows] = await pool.query(query, params);
    return rows;
  }

  /**
   * Update society details
   */
  static async update(id, data) {
    const fields = [];
    const params = [];

    if (data.name !== undefined) {
      fields.push('name = ?');
      params.push(data.name.trim());
    }
    if (data.registration_number !== undefined) {
      fields.push('registration_number = ?');
      params.push(data.registration_number ? String(data.registration_number).trim() : null);
    }
    if (data.contact_email !== undefined) {
      fields.push('contact_email = ?');
      params.push(data.contact_email ? String(data.contact_email).trim() : null);
    }
    if (data.society_type !== undefined) {
      fields.push('society_type = ?');
      params.push(data.society_type);
    }
    if (data.property_configuration !== undefined) {
      fields.push('property_configuration = ?');
      params.push(data.property_configuration);
    }
    if (data.total_homes !== undefined) {
      fields.push('total_homes = ?');
      params.push(data.total_homes);
    }
    if (data.max_units !== undefined) {
      fields.push('max_units = ?');
      params.push(data.max_units);
    }
    if (data.address !== undefined) {
      fields.push('address = ?, address_line1 = ?');
      params.push(data.address, data.address);
    }
    if (data.contact_number !== undefined) {
      fields.push('contact_number = ?, contact_phone = ?');
      params.push(data.contact_number, data.contact_number);
    }
    if (data.emergency_number !== undefined) {
      fields.push('emergency_number = ?');
      params.push(data.emergency_number);
    }
    if (data.status !== undefined) {
      fields.push('status = ?');
      params.push(data.status);
    }

    if (fields.length === 0) return this.findById(id);

    fields.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    const query = `UPDATE societies SET ${fields.join(', ')} WHERE id = ?`;
    await pool.query(query, params);

    return this.findById(id);
  }

  /**
   * Deactivate or Delete society
   */
  static async updateStatus(id, status = 'INACTIVE') {
    const query = 'UPDATE societies SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    const [result] = await pool.query(query, [status, id]);
    return result.affectedRows > 0;
  }

  /**
   * Hard delete society (cascades to related tables)
   */
  static async delete(id) {
    const query = 'DELETE FROM societies WHERE id = ?';
    const [result] = await pool.query(query, [id]);
    return result.affectedRows > 0;
  }
}

module.exports = SocietyRepository;
