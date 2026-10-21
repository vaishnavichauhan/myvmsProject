const { pool } = require('../config/db');

/**
 * Announcement Repository
 * Handles all database operations for society announcements, festivals, and emergency alerts.
 */
class AnnouncementRepository {
  /**
   * List announcements for society
   * Returns fields: title, description, type, date, created_by, attachment_url, status, etc.
   */
  static async findAll(societyId = null, filters = {}) {
    let query = `
      SELECT a.id,
             a.society_id,
             s.name AS society_name,
             a.created_by_user_id,
             a.title,
             COALESCE(a.type, 'GENERAL') AS type,
             COALESCE(a.description, a.content) AS description,
             COALESCE(a.date, DATE(a.created_at)) AS date,
             a.content,
             a.category,
             a.priority,
             a.attachment_url,
             a.valid_until,
             a.status,
             a.created_at,
             a.updated_at,
             COALESCE(u.full_name, 'Society Management') AS created_by,
             COALESCE(u.full_name, 'Society Management') AS posted_by,
             u.role AS author_role,
             cm.designation AS committee_position,
             cm.committee_name,
             cm.home_number AS author_home_number
      FROM announcements a
      LEFT JOIN societies s ON a.society_id = s.id
      LEFT JOIN users u ON a.created_by_user_id = u.id
      LEFT JOIN committee_members cm ON cm.user_id = u.id AND cm.status = 'ACTIVE'
    `;

    const params = [];
    if (societyId && String(societyId) !== 'ALL') {
      query += ` WHERE a.society_id = ?`;
      params.push(societyId);
    } else {
      query += ` WHERE 1=1`;
    }

    if (filters.status) {
      query += ` AND a.status = ?`;
      params.push(filters.status);
    } else {
      // By default show active/published announcements
      query += ` AND a.status IN ('ACTIVE', 'PUBLISHED')`;
    }

    if (filters.type && filters.type !== 'ALL') {
      query += ` AND a.type = ?`;
      params.push(filters.type);
    }

    if (filters.category && filters.category !== 'ALL') {
      query += ` AND a.category = ?`;
      params.push(filters.category);
    }

    if (filters.priority) {
      query += ` AND a.priority = ?`;
      params.push(filters.priority);
    }

    if (filters.search) {
      query += ` AND (a.title LIKE ? OR a.description LIKE ? OR a.content LIKE ?)`;
      const term = `%${filters.search}%`;
      params.push(term, term, term);
    }

    // Emergency announcements ranked first, then newest dates
    query += `
      ORDER BY 
        CASE WHEN a.type = 'EMERGENCY' OR a.priority = 'URGENT' THEN 0 ELSE 1 END ASC,
        a.date DESC,
        a.created_at DESC
    `;

    if (filters.limit) {
      query += ` LIMIT ?`;
      params.push(parseInt(filters.limit, 10));
    }

    const [rows] = await pool.query(query, params);
    return rows;
  }

  /**
   * Find single announcement by ID
   */
  static async findById(id) {
    const [rows] = await pool.query(
      `SELECT a.id,
              a.society_id,
              a.created_by_user_id,
              a.title,
              COALESCE(a.type, 'GENERAL') AS type,
              COALESCE(a.description, a.content) AS description,
              COALESCE(a.date, DATE(a.created_at)) AS date,
              a.content,
              a.category,
              a.priority,
              a.attachment_url,
              a.valid_until,
              a.status,
              a.created_at,
              a.updated_at,
              COALESCE(u.full_name, 'Society Management') AS created_by,
              COALESCE(u.full_name, 'Society Management') AS posted_by,
              u.role AS author_role,
              cm.designation AS committee_position,
              cm.committee_name,
              cm.home_number AS author_home_number
       FROM announcements a
       LEFT JOIN users u ON a.created_by_user_id = u.id
       LEFT JOIN committee_members cm ON cm.user_id = u.id AND cm.status = 'ACTIVE'
       WHERE a.id = ?`,
      [id]
    );

    return rows[0] || null;
  }

  /**
   * Create announcement
   * Supports: title, description/content, type, date, attachment_url, status, priority, category
   */
  static async create(data) {
    const {
      society_id = 1,
      created_by_user_id,
      title,
      type = 'GENERAL',
      description,
      content,
      date = null,
      category = null,
      priority = null,
      attachment_url = null,
      valid_until = null,
      status = 'ACTIVE',
    } = data;

    const descVal = (description || content || '').trim();

    // Infer category and priority if not explicitly provided
    let finalCategory = category;
    if (!finalCategory) {
      if (type === 'FESTIVAL') finalCategory = 'EVENT';
      else if (type === 'EMERGENCY') finalCategory = 'EMERGENCY';
      else if (type === 'MAINTENANCE') finalCategory = 'MAINTENANCE';
      else if (type === 'MEETING') finalCategory = 'GENERAL';
      else if (type === 'IMPORTANT') finalCategory = 'RULES';
      else finalCategory = 'GENERAL';
    }

    let finalPriority = priority;
    if (!finalPriority) {
      if (type === 'EMERGENCY') finalPriority = 'URGENT';
      else if (type === 'FESTIVAL' || type === 'IMPORTANT') finalPriority = 'HIGH';
      else finalPriority = 'MEDIUM';
    }

    const [result] = await pool.query(
      `INSERT INTO \`announcements\` 
        (\`society_id\`, \`created_by_user_id\`, \`title\`, \`type\`, \`description\`, \`date\`, \`content\`, \`category\`, \`priority\`, \`attachment_url\`, \`valid_until\`, \`status\`)
       VALUES (?, ?, ?, ?, ?, COALESCE(?, CURRENT_DATE), ?, ?, ?, ?, ?, ?)`,
      [
        society_id,
        created_by_user_id,
        title,
        type,
        descVal,
        date,
        descVal,
        finalCategory,
        finalPriority,
        attachment_url || null,
        valid_until || null,
        status,
      ]
    );

    return this.findById(result.insertId);
  }

  /**
   * Update announcement
   */
  static async update(id, data) {
    const fields = [];
    const values = [];

    if (data.title !== undefined) {
      fields.push('`title` = ?');
      values.push(data.title);
    }
    if (data.type !== undefined) {
      fields.push('`type` = ?');
      values.push(data.type);
    }
    if (data.description !== undefined || data.content !== undefined) {
      const val = data.description !== undefined ? data.description : data.content;
      fields.push('`description` = ?');
      values.push(val);
      fields.push('`content` = ?');
      values.push(val);
    }
    if (data.date !== undefined) {
      fields.push('`date` = ?');
      values.push(data.date);
    }
    if (data.category !== undefined) {
      fields.push('`category` = ?');
      values.push(data.category);
    }
    if (data.priority !== undefined) {
      fields.push('`priority` = ?');
      values.push(data.priority);
    }
    if (data.attachment_url !== undefined) {
      fields.push('`attachment_url` = ?');
      values.push(data.attachment_url);
    }
    if (data.valid_until !== undefined) {
      fields.push('`valid_until` = ?');
      values.push(data.valid_until);
    }
    if (data.status !== undefined) {
      fields.push('`status` = ?');
      values.push(data.status);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    await pool.query(`UPDATE \`announcements\` SET ${fields.join(', ')} WHERE \`id\` = ?`, values);

    return this.findById(id);
  }

  /**
   * Delete announcement
   */
  static async delete(id) {
    const [result] = await pool.query('DELETE FROM `announcements` WHERE `id` = ?', [id]);
    return result.affectedRows > 0;
  }
}

module.exports = AnnouncementRepository;
