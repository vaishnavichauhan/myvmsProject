const { pool } = require('../config/db');

/**
 * User Repository
 * Encapsulates all SQL database operations for users.
 * Keeps controllers and route handlers decoupled from raw SQL.
 */
class UserRepository {
  /**
   * Find a user by phone number (includes password hash for auth)
   */
  static async findByPhone(phone) {
    const cleanPhone = phone.trim();
    // Match exact or with/without leading +91 or spaces
    const query = `
      SELECT id, society_id, full_name, email, password, phone, role, avatar_url, flat_number, block_or_tower, status, created_at, updated_at
      FROM users
      WHERE phone = ? OR REPLACE(phone, ' ', '') = REPLACE(?, ' ', '') OR phone = CONCAT('+91 ', ?) OR phone = CONCAT('+91', ?)
      LIMIT 1
    `;
    const [rows] = await pool.query(query, [cleanPhone, cleanPhone, cleanPhone, cleanPhone]);
    return rows[0] || null;
  }

  /**
   * Find a user by email address (includes password hash for auth)
   */
  static async findByEmail(email) {
    const query = `
      SELECT id, society_id, full_name, email, password, phone, role, avatar_url, flat_number, block_or_tower, status, created_at, updated_at
      FROM users
      WHERE email = ?
      LIMIT 1
    `;
    const [rows] = await pool.query(query, [email.toLowerCase().trim()]);
    return rows[0] || null;
  }

  /**
   * Find user by phone or email
   */
  static async findByPhoneOrEmail(identifier) {
    if (!identifier) return null;
    const clean = identifier.trim();
    if (clean.includes('@')) {
      return this.findByEmail(clean);
    }
    return this.findByPhone(clean);
  }

  /**
   * Find a user by ID (excludes password)
   */
  static async findById(id) {
    const query = `
      SELECT id, society_id, full_name, email, phone, role, avatar_url, flat_number, block_or_tower, status, created_at, updated_at
      FROM users
      WHERE id = ?
      LIMIT 1
    `;
    const [rows] = await pool.query(query, [id]);
    return rows[0] || null;
  }

  /**
   * Find a user by ID including password (for change-password verification)
   */
  static async findByIdWithPassword(id) {
    const query = `
      SELECT id, society_id, full_name, email, password, phone, role, avatar_url, flat_number, block_or_tower, status, created_at, updated_at
      FROM users
      WHERE id = ?
      LIMIT 1
    `;
    const [rows] = await pool.query(query, [id]);
    return rows[0] || null;
  }

  /**
   * Update user's password
   */
  static async updatePassword(id, hashedPassword) {
    const query = `
      UPDATE users
      SET password = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    const [result] = await pool.query(query, [hashedPassword, id]);
    return result.affectedRows > 0;
  }

  /**
   * Update basic profile info (name, email, avatar_url, phone)
   */
  static async updateProfile(id, updates = {}) {
    const fields = [];
    const values = [];

    if (updates.full_name !== undefined) {
      fields.push('full_name = ?');
      values.push(updates.full_name.trim());
    }
    if (updates.email !== undefined) {
      fields.push('email = ?');
      values.push(updates.email ? updates.email.toLowerCase().trim() : null);
    }
    if (updates.phone !== undefined) {
      fields.push('phone = ?');
      values.push(updates.phone.trim());
    }
    if (updates.avatar_url !== undefined) {
      fields.push('avatar_url = ?');
      values.push(updates.avatar_url);
    }

    if (fields.length === 0) return true;

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const query = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
    const [result] = await pool.query(query, values);
    return result.affectedRows > 0;
  }

  /**
   * Create a new user
   */
  static async create(userData) {
    const {
      society_id = null,
      full_name,
      email,
      password,
      phone,
      role = 'OWNER',
      flat_number = null,
      block_or_tower = null,
      status = 'ACTIVE',
    } = userData;

    const query = `
      INSERT INTO users (society_id, full_name, email, password, phone, role, flat_number, block_or_tower, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await pool.query(query, [
      society_id,
      full_name.trim(),
      email.toLowerCase().trim(),
      password,
      phone,
      role,
      flat_number,
      block_or_tower,
      status,
    ]);

    return { id: result.insertId, society_id, full_name, email, phone, role, flat_number, block_or_tower, status };
  }

  /**
   * Get all users (with optional role/status filter)
   */
  static async findAll(filters = {}) {
    let query = `
      SELECT id, society_id, full_name, email, phone, role, flat_number, block_or_tower, status, created_at
      FROM users
      WHERE 1=1
    `;
    const params = [];

    if (filters.role) {
      query += ' AND role = ?';
      params.push(filters.role);
    }

    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters.society_id) {
      query += ' AND society_id = ?';
      params.push(filters.society_id);
    }

    query += ' ORDER BY created_at DESC';

    const [rows] = await pool.query(query, params);
    return rows;
  }

  /**
   * Count total registered users
   */
  static async count() {
    const [rows] = await pool.query('SELECT COUNT(*) as total FROM users');
    return rows[0]?.total || 0;
  }

  /**
   * Retrieve associated home details for a user based on role
   */
  static async getUserHomeDetails(userId, role) {
    if (role === 'OWNER' || role === 'TENANT') {
      const query = `
        SELECT r.id AS resident_id, r.home_id, r.resident_type,
               h.home_number, h.building_or_wing, h.floor, h.home_type,
               s.id AS society_id, s.name AS society_name
        FROM residents r
        JOIN homes h ON r.home_id = h.id
        JOIN societies s ON h.society_id = s.id
        WHERE r.user_id = ? AND r.status = 'ACTIVE'
        LIMIT 1
      `;
      const [rows] = await pool.query(query, [userId]);
      return rows[0] || null;
    } else if (role === 'FAMILY_MEMBER') {
      const query = `
        SELECT fm.id AS family_member_id, fm.home_id, fm.relationship,
               h.home_number, h.building_or_wing, h.floor, h.home_type,
               s.id AS society_id, s.name AS society_name,
               r.id AS primary_resident_id
        FROM family_members fm
        JOIN homes h ON fm.home_id = h.id
        JOIN societies s ON h.society_id = s.id
        LEFT JOIN residents r ON fm.resident_id = r.id
        WHERE fm.user_id = ? AND fm.status = 'ACTIVE'
        LIMIT 1
      `;
      const [rows] = await pool.query(query, [userId]);
      return rows[0] || null;
    }
    return null;
  }
}

module.exports = UserRepository;
