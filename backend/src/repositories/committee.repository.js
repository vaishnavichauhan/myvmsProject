const { pool } = require('../config/db');

/**
 * Committee Member & Committees Repository
 * Society Committee governance and elected office-bearers data layer.
 * Password fields are strictly excluded to ensure committee passwords are never exposed.
 */
class CommitteeRepository {
  /**
   * ==========================================
   * 1. COMMITTEES (e.g. Festival, Electricity, etc.)
   * ==========================================
   */

  /**
   * Create a new committee name / entity (Admin only)
   * e.g. "Festival & Celebration Committee", "Electricity Management Committee"
   */
  static async createCommittee(data) {
    const { society_id = 1, name, description = null, status = 'ACTIVE' } = data;

    const [result] = await pool.query(
      `INSERT INTO committees (society_id, name, description, status)
       VALUES (?, ?, ?, ?)`,
      [society_id, name.trim(), description ? description.trim() : null, status || 'ACTIVE']
    );

    return this.findCommitteeById(result.insertId);
  }

  /**
   * List all committees for a society with their active member count
   */
  static async findAllCommittees(societyId = null) {
    let query = `
      SELECT 
        c.id,
        c.society_id,
        s.name AS society_name,
        c.name,
        c.description,
        c.status,
        c.created_at,
        c.updated_at,
        COUNT(cm.id) AS member_count
      FROM committees c
      LEFT JOIN societies s ON c.society_id = s.id
      LEFT JOIN committee_members cm 
        ON cm.committee_id = c.id AND cm.status = 'ACTIVE'
    `;

    const params = [];
    if (societyId && societyId !== 'ALL') {
      query += ` WHERE c.society_id = ?`;
      params.push(societyId);
    }

    query += `
      GROUP BY c.id
      ORDER BY c.id ASC
    `;

    const [rows] = await pool.query(query, params);
    return rows;
  }

  /**
   * Find single committee by ID
   */
  static async findCommitteeById(id) {
    const [rows] = await pool.query(
      `SELECT c.*, COUNT(cm.id) AS member_count
       FROM committees c
       LEFT JOIN committee_members cm ON cm.committee_id = c.id AND cm.status = 'ACTIVE'
       WHERE c.id = ?
       GROUP BY c.id`,
      [id]
    );
    return rows[0] || null;
  }

  /**
   * Update committee
   */
  static async updateCommittee(id, data) {
    const fields = [];
    const values = [];

    if (data.name !== undefined) {
      fields.push('name = ?');
      values.push(data.name.trim());
    }
    if (data.description !== undefined) {
      fields.push('description = ?');
      values.push(data.description ? data.description.trim() : null);
    }
    if (data.status !== undefined) {
      fields.push('status = ?');
      values.push(data.status);
    }

    if (fields.length > 0) {
      values.push(id);
      await pool.query(`UPDATE committees SET ${fields.join(', ')} WHERE id = ?`, values);
    }

    return this.findCommitteeById(id);
  }

  /**
   * Delete committee
   */
  static async deleteCommittee(id) {
    const [result] = await pool.query('DELETE FROM committees WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  /**
   * ==========================================
   * 2. HOME OCCUPANTS (For assigning resident user to committee)
   * "when create committee member first select home no, after show member name, position, status"
   * "this committee member is always our resident user"
   * ==========================================
   */
  static async findOccupantsByHome(homeId) {
    const query = `
      SELECT 
        u.id AS user_id,
        u.full_name,
        u.phone,
        u.email,
        r.resident_type AS role_type,
        'Resident' AS relation,
        h.id AS home_id,
        COALESCE(h.home_number, h.flat_number) AS home_number,
        COALESCE(h.building_or_wing, h.block_or_tower) AS building_or_wing
      FROM residents r
      JOIN users u ON r.user_id = u.id
      JOIN homes h ON r.home_id = h.id
      WHERE r.home_id = ? AND r.status = 'ACTIVE'

      UNION ALL

      SELECT 
        COALESCE(u.id, fm.user_id) AS user_id,
        COALESCE(fm.full_name, u.full_name) AS full_name,
        COALESCE(fm.phone, u.phone) AS phone,
        u.email,
        'FAMILY_MEMBER' AS role_type,
        COALESCE(fm.relationship, 'Family Member') AS relation,
        h.id AS home_id,
        COALESCE(h.home_number, h.flat_number) AS home_number,
        COALESCE(h.building_or_wing, h.block_or_tower) AS building_or_wing
      FROM family_members fm
      LEFT JOIN users u ON fm.user_id = u.id
      JOIN homes h ON fm.home_id = h.id
      WHERE fm.home_id = ? AND fm.status = 'ACTIVE'
    `;

    const [rows] = await pool.query(query, [homeId, homeId]);
    return rows;
  }

  /**
   * ==========================================
   * 3. COMMITTEE MEMBERS (Roster & Assignments)
   * ==========================================
   */

  /**
   * Find all committee members for a society (or all societies).
   * Excludes all sensitive password data.
   */
  static async findAll(societyId = null, filters = {}) {
    let query = `
      SELECT cm.id,
             cm.society_id,
             s.name AS society_name,
             cm.committee_id,
             COALESCE(c.name, cm.committee_name, 'General Committee') AS committee_name,
             c.description AS committee_description,
             cm.user_id,
             cm.home_id,
             COALESCE(cm.name, u.full_name) AS name,
             COALESCE(cm.phone, u.phone) AS phone,
             cm.designation,
             cm.designation AS position,
             COALESCE(cm.home_number, u.flat_number) AS home_number,
             COALESCE(cm.photo_url, u.avatar_url) AS photo,
             COALESCE(cm.photo_url, u.avatar_url) AS photo_url,
             cm.status,
             cm.can_create_announcements,
             cm.term_start,
             cm.term_end,
             cm.responsibilities,
             cm.created_at,
             cm.updated_at,
             u.email
      FROM committee_members cm
      LEFT JOIN committees c ON cm.committee_id = c.id
      LEFT JOIN users u ON cm.user_id = u.id
      LEFT JOIN societies s ON cm.society_id = s.id
      WHERE 1=1
    `;

    const params = [];

    if (societyId && societyId !== 'ALL') {
      query += ` AND cm.society_id = ?`;
      params.push(societyId);
    }

    if (filters.committee_id) {
      query += ` AND cm.committee_id = ?`;
      params.push(filters.committee_id);
    }

    if (filters.status) {
      query += ` AND cm.status = ?`;
      params.push(filters.status);
    }

    if (filters.position || filters.designation) {
      query += ` AND cm.designation = ?`;
      params.push(filters.position || filters.designation);
    }

    if (filters.search) {
      query += ` AND (cm.name LIKE ? OR u.full_name LIKE ? OR cm.phone LIKE ? OR u.phone LIKE ? OR cm.home_number LIKE ? OR u.flat_number LIKE ? OR c.name LIKE ? OR cm.committee_name LIKE ?)`;
      const term = `%${filters.search}%`;
      params.push(term, term, term, term, term, term, term, term);
    }

    // Rank positions logically
    query += `
      ORDER BY 
        COALESCE(c.name, 'Z') ASC,
        CASE cm.designation
          WHEN 'PRESIDENT' THEN 1
          WHEN 'CHAIRPERSON' THEN 1
          WHEN 'HEAD' THEN 1
          WHEN 'SECRETARY' THEN 2
          WHEN 'TREASURER' THEN 3
          WHEN 'VICE_PRESIDENT' THEN 4
          WHEN 'JOINT_SECRETARY' THEN 5
          WHEN 'COORDINATOR' THEN 6
          WHEN 'COMMITTEE_MEMBER' THEN 7
          ELSE 8
        END ASC,
        cm.id ASC
    `;

    const [rows] = await pool.query(query, params);
    return rows;
  }

  /**
   * Find single committee member by ID without exposing password.
   */
  static async findById(id) {
    const [rows] = await pool.query(
      `SELECT cm.id,
              cm.society_id,
              cm.committee_id,
              COALESCE(c.name, cm.committee_name, 'General Committee') AS committee_name,
              c.description AS committee_description,
              cm.user_id,
              cm.home_id,
              COALESCE(cm.name, u.full_name) AS name,
              COALESCE(cm.phone, u.phone) AS phone,
              cm.designation,
              cm.designation AS position,
              COALESCE(cm.home_number, u.flat_number) AS home_number,
              COALESCE(cm.photo_url, u.avatar_url) AS photo,
              COALESCE(cm.photo_url, u.avatar_url) AS photo_url,
              cm.status,
              cm.can_create_announcements,
              cm.term_start,
              cm.term_end,
              cm.responsibilities,
              cm.created_at,
              cm.updated_at,
              u.email
       FROM committee_members cm
       LEFT JOIN committees c ON cm.committee_id = c.id
       LEFT JOIN users u ON cm.user_id = u.id
       WHERE cm.id = ?`,
      [id]
    );

    return rows[0] || null;
  }

  /**
   * Find committee member by user ID.
   */
  static async findByUserId(userId, societyId = null) {
    let query = `SELECT cm.id,
              cm.society_id,
              cm.committee_id,
              COALESCE(c.name, cm.committee_name, 'General Committee') AS committee_name,
              cm.user_id,
              cm.home_id,
              COALESCE(cm.name, u.full_name) AS name,
              COALESCE(cm.phone, u.phone) AS phone,
              cm.designation,
              cm.designation AS position,
              COALESCE(cm.home_number, u.flat_number) AS home_number,
              COALESCE(cm.photo_url, u.avatar_url) AS photo,
              cm.status,
              cm.can_create_announcements,
              cm.term_start,
              cm.term_end,
              cm.responsibilities
       FROM committee_members cm
       LEFT JOIN committees c ON cm.committee_id = c.id
       LEFT JOIN users u ON cm.user_id = u.id
       WHERE cm.user_id = ? AND cm.status = 'ACTIVE'`;

    const params = [userId];
    if (societyId && societyId !== 'ALL') {
      query += ` AND cm.society_id = ?`;
      params.push(societyId);
    }
    query += ` LIMIT 1`;

    const [rows] = await pool.query(query, params);
    return rows[0] || null;
  }

  /**
   * Find all active committees a user is a member of
   */
  static async findAllUserCommittees(userId, societyId = null) {
    let query = `SELECT cm.id,
              cm.society_id,
              cm.committee_id,
              COALESCE(c.name, cm.committee_name, 'General Committee') AS committee_name,
              cm.designation,
              cm.home_number,
              cm.can_create_announcements
       FROM committee_members cm
       LEFT JOIN committees c ON cm.committee_id = c.id
       WHERE cm.user_id = ? AND cm.status = 'ACTIVE'`;

    const params = [userId];
    if (societyId && societyId !== 'ALL') {
      query += ` AND cm.society_id = ?`;
      params.push(societyId);
    }

    const [rows] = await pool.query(query, params);
    return rows;
  }

  /**
   * Create a new committee member record.
   */
  static async create(data) {
    const {
      society_id = 1,
      committee_id = null,
      committee_name = null,
      home_id = null,
      user_id = null,
      name,
      phone,
      designation,
      home_number,
      photo_url = null,
      responsibilities = null,
      status = 'ACTIVE',
      can_create_announcements = true,
      term_start = null,
      term_end = null,
    } = data;

    const [result] = await pool.query(
      `INSERT INTO committee_members 
        (society_id, committee_id, committee_name, home_id, user_id, name, phone, designation, home_number, photo_url, responsibilities, status, can_create_announcements, term_start, term_end)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_DATE), ?)`,
      [
        society_id,
        committee_id,
        committee_name,
        home_id,
        user_id,
        name,
        phone,
        designation,
        home_number,
        photo_url,
        responsibilities,
        status,
        can_create_announcements ? 1 : 0,
        term_start,
        term_end,
      ]
    );

    return this.findById(result.insertId);
  }

  /**
   * Update an existing committee member.
   */
  static async update(id, data) {
    const fields = [];
    const values = [];

    if (data.committee_id !== undefined) {
      fields.push('committee_id = ?');
      values.push(data.committee_id);
    }
    if (data.committee_name !== undefined) {
      fields.push('committee_name = ?');
      values.push(data.committee_name);
    }
    if (data.home_id !== undefined) {
      fields.push('home_id = ?');
      values.push(data.home_id);
    }
    if (data.name !== undefined) {
      fields.push('name = ?');
      values.push(data.name);
    }
    if (data.phone !== undefined) {
      fields.push('phone = ?');
      values.push(data.phone);
    }
    if (data.designation !== undefined || data.position !== undefined) {
      fields.push('designation = ?');
      values.push(data.designation || data.position);
    }
    if (data.home_number !== undefined) {
      fields.push('home_number = ?');
      values.push(data.home_number);
    }
    if (data.photo_url !== undefined || data.photo !== undefined) {
      fields.push('photo_url = ?');
      values.push(data.photo_url || data.photo);
    }
    if (data.responsibilities !== undefined) {
      fields.push('responsibilities = ?');
      values.push(data.responsibilities);
    }
    if (data.status !== undefined) {
      fields.push('status = ?');
      values.push(data.status);
    }
    if (data.can_create_announcements !== undefined) {
      fields.push('can_create_announcements = ?');
      values.push(data.can_create_announcements ? 1 : 0);
    }
    if (data.term_start !== undefined) {
      fields.push('term_start = ?');
      values.push(data.term_start);
    }
    if (data.term_end !== undefined) {
      fields.push('term_end = ?');
      values.push(data.term_end);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    await pool.query(`UPDATE committee_members SET ${fields.join(', ')} WHERE id = ?`, values);

    return this.findById(id);
  }

  /**
   * Delete a committee member record.
   */
  static async delete(id) {
    const [result] = await pool.query('DELETE FROM committee_members WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }
}

module.exports = CommitteeRepository;
