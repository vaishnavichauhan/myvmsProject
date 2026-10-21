const { pool } = require('../config/db');

/**
 * Resident Permission Repository
 * Handles Home-wise permissions (COURIER, DELIVERY, VISITOR, WORKER)
 * Common per home number - shared across Owner, Tenant, and Family Members.
 */
class PermissionRepository {
  /**
   * Helper to fetch all active residents & family members living in a home
   */
  static async getHomeMembers(homeId) {
    const query = `
      SELECT 
        r.home_id,
        u.id AS user_id,
        u.full_name,
        u.phone,
        u.role,
        r.resident_type,
        NULL AS relationship,
        CASE WHEN r.resident_type = 'OWNER' THEN 'Primary Owner' ELSE 'Primary Tenant' END AS user_label
      FROM residents r
      JOIN users u ON r.user_id = u.id
      WHERE r.home_id = ? AND r.status = 'ACTIVE'
      UNION ALL
      SELECT 
        fm.home_id,
        COALESCE(fm.user_id, u.id) AS user_id,
        COALESCE(u.full_name, fm.full_name) AS full_name,
        COALESCE(u.phone, fm.phone) AS phone,
        COALESCE(u.role, 'FAMILY_MEMBER') AS role,
        'FAMILY_MEMBER' AS resident_type,
        fm.relationship,
        CONCAT('Family (', COALESCE(fm.relationship, 'Member'), ')') AS user_label
      FROM family_members fm
      LEFT JOIN users u ON fm.user_id = u.id
      WHERE fm.home_id = ? AND fm.status = 'ACTIVE'
      ORDER BY 
        CASE WHEN role = 'OWNER' THEN 1 WHEN role = 'TENANT' THEN 2 ELSE 3 END,
        full_name ASC
    `;
    const [rows] = await pool.query(query, [homeId, homeId]);
    return rows;
  }

  /**
   * Find permissions and member roster for a specific home
   */
  static async findByHomeId(homeId) {
    const query = `
      SELECT 
        h.id AS home_id,
        h.home_number,
        h.flat_number,
        h.building_or_wing,
        h.block_or_tower,
        h.society_id,
        s.name AS society_name,
        rp.id AS permission_id,
        COALESCE(rp.courier_permission, 1) AS courier_permission,
        COALESCE(rp.delivery_permission, 1) AS delivery_permission,
        COALESCE(rp.visitor_permission, 1) AS visitor_permission,
        COALESCE(rp.worker_permission, 1) AS worker_permission,
        rp.updated_at,
        rp.user_id AS last_updated_by_id,
        updater.full_name AS last_updated_by_name
      FROM homes h
      LEFT JOIN societies s ON h.society_id = s.id
      LEFT JOIN resident_permissions rp ON rp.home_id = h.id
      LEFT JOIN users updater ON rp.user_id = updater.id
      WHERE h.id = ?
      LIMIT 1
    `;
    const [rows] = await pool.query(query, [homeId]);
    if (rows.length === 0) return null;

    const row = rows[0];
    const residents = await this.getHomeMembers(homeId);

    return {
      id: row.permission_id || row.home_id,
      permission_id: row.permission_id,
      home_id: row.home_id,
      home_number: row.home_number,
      flat_number: row.flat_number,
      building_or_wing: row.building_or_wing,
      block_or_tower: row.block_or_tower,
      society_id: row.society_id,
      society_name: row.society_name,
      courier_permission: Boolean(row.courier_permission),
      delivery_permission: Boolean(row.delivery_permission),
      visitor_permission: Boolean(row.visitor_permission),
      worker_permission: Boolean(row.worker_permission),
      updated_at: row.updated_at,
      last_updated_by_id: row.last_updated_by_id,
      last_updated_by_name: row.last_updated_by_name,
      residents,
    };
  }

  /**
   * Find all homes with their permissions and resident rosters (for Admin)
   */
  static async findAllHomes(societyId = null) {
    let query = `
      SELECT 
        h.id AS home_id,
        h.home_number,
        h.flat_number,
        h.building_or_wing,
        h.block_or_tower,
        h.society_id,
        s.name AS society_name,
        rp.id AS permission_id,
        COALESCE(rp.courier_permission, 1) AS courier_permission,
        COALESCE(rp.delivery_permission, 1) AS delivery_permission,
        COALESCE(rp.visitor_permission, 1) AS visitor_permission,
        COALESCE(rp.worker_permission, 1) AS worker_permission,
        rp.updated_at,
        rp.user_id AS last_updated_by_id,
        updater.full_name AS last_updated_by_name
      FROM homes h
      LEFT JOIN societies s ON h.society_id = s.id
      LEFT JOIN resident_permissions rp ON rp.home_id = h.id
      LEFT JOIN users updater ON rp.user_id = updater.id
      WHERE h.status = 'ACTIVE'
    `;
    const params = [];
    if (societyId) {
      query += ' AND h.society_id = ?';
      params.push(societyId);
    }
    query += ' ORDER BY CAST(h.home_number AS UNSIGNED) ASC, h.home_number ASC';

    const [homes] = await pool.query(query, params);

    // Fetch all active residents & family members in one go
    const [allMembers] = await pool.query(`
      SELECT 
        r.home_id,
        u.id AS user_id,
        u.full_name,
        u.phone,
        u.role,
        r.resident_type,
        NULL AS relationship,
        CASE WHEN r.resident_type = 'OWNER' THEN 'Primary Owner' ELSE 'Primary Tenant' END AS user_label
      FROM residents r
      JOIN users u ON r.user_id = u.id
      WHERE r.status = 'ACTIVE'
      UNION ALL
      SELECT 
        fm.home_id,
        COALESCE(fm.user_id, u.id) AS user_id,
        COALESCE(u.full_name, fm.full_name) AS full_name,
        COALESCE(u.phone, fm.phone) AS phone,
        COALESCE(u.role, 'FAMILY_MEMBER') AS role,
        'FAMILY_MEMBER' AS resident_type,
        fm.relationship,
        CONCAT('Family (', COALESCE(fm.relationship, 'Member'), ')') AS user_label
      FROM family_members fm
      LEFT JOIN users u ON fm.user_id = u.id
      WHERE fm.status = 'ACTIVE'
      ORDER BY 
        CASE WHEN role = 'OWNER' THEN 1 WHEN role = 'TENANT' THEN 2 ELSE 3 END,
        full_name ASC
    `);

    // Group members by home_id
    const memberMap = new Map();
    allMembers.forEach((m) => {
      if (!memberMap.has(m.home_id)) {
        memberMap.set(m.home_id, []);
      }
      memberMap.get(m.home_id).push(m);
    });

    return homes.map((h) => ({
      id: h.permission_id || h.home_id,
      permission_id: h.permission_id,
      home_id: h.home_id,
      home_number: h.home_number,
      flat_number: h.flat_number,
      building_or_wing: h.building_or_wing,
      block_or_tower: h.block_or_tower,
      society_id: h.society_id,
      society_name: h.society_name,
      courier_permission: Boolean(h.courier_permission),
      delivery_permission: Boolean(h.delivery_permission),
      visitor_permission: Boolean(h.visitor_permission),
      worker_permission: Boolean(h.worker_permission),
      updated_at: h.updated_at,
      last_updated_by_id: h.last_updated_by_id,
      last_updated_by_name: h.last_updated_by_name,
      residents: memberMap.get(h.home_id) || [],
    }));
  }

  /**
   * Upsert home-wise permissions
   */
  static async upsertPermission(data) {
    const {
      home_id,
      user_id = null,
      courier_permission = false,
      delivery_permission = false,
      visitor_permission = false,
      worker_permission = false,
    } = data;

    const query = `
      INSERT INTO resident_permissions (
        home_id, user_id, courier_permission, delivery_permission, visitor_permission, worker_permission
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        user_id = VALUES(user_id),
        courier_permission = VALUES(courier_permission),
        delivery_permission = VALUES(delivery_permission),
        visitor_permission = VALUES(visitor_permission),
        worker_permission = VALUES(worker_permission),
        updated_at = CURRENT_TIMESTAMP
    `;

    await pool.query(query, [
      home_id,
      user_id,
      Boolean(courier_permission),
      Boolean(delivery_permission),
      Boolean(visitor_permission),
      Boolean(worker_permission),
    ]);

    return this.findByHomeId(home_id);
  }

  /**
   * Check if home has a specific permission type
   */
  static async hasPermission(homeId, permissionType) {
    const [rows] = await pool.query(
      `SELECT courier_permission, delivery_permission, visitor_permission, worker_permission
       FROM resident_permissions
       WHERE home_id = ?
       LIMIT 1`,
      [homeId]
    );

    if (rows.length === 0) return false; // Default deny (NO) if record doesn't exist
    const perm = rows[0];

    switch (permissionType.toUpperCase()) {
      case 'COURIER':
        return Boolean(perm.courier_permission);
      case 'DELIVERY':
        return Boolean(perm.delivery_permission);
      case 'VISITOR':
        return Boolean(perm.visitor_permission);
      case 'WORKER':
        return Boolean(perm.worker_permission);
      default:
        return false;
    }
  }

  /**
   * Check if a user is an active resident or family member of a home
   */
  static async isUserMemberOfHome(userId, homeId) {
    const query = `
      SELECT 1 FROM residents WHERE user_id = ? AND home_id = ? AND status = 'ACTIVE'
      UNION
      SELECT 1 FROM family_members WHERE user_id = ? AND home_id = ? AND status = 'ACTIVE'
      LIMIT 1
    `;
    const [rows] = await pool.query(query, [userId, homeId, userId, homeId]);
    return rows.length > 0;
  }

  /**
   * Compatibility methods for existing references
   */
  static async findByHomeAndUser(homeId) {
    return this.findByHomeId(homeId);
  }

  static async findByUserId(userId) {
    const [rows] = await pool.query(
      `SELECT r.home_id FROM residents r WHERE r.user_id = ? AND r.status = 'ACTIVE'
       UNION
       SELECT fm.home_id FROM family_members fm WHERE fm.user_id = ? AND fm.status = 'ACTIVE'
       LIMIT 1`,
      [userId, userId]
    );
    if (rows.length === 0) return null;
    return this.findByHomeId(rows[0].home_id);
  }

  static async findHomeResidentUsers(homeId) {
    return this.getHomeMembers(homeId);
  }
}

module.exports = PermissionRepository;
