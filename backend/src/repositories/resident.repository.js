const { pool } = require('../config/db');

/**
 * Resident Repository
 * Handles all database operations for residents and associated user accounts.
 */
class ResidentRepository {
  /**
   * Find active primary resident for a home
   */
  static async findActivePrimaryByHomeId(homeId, excludeResidentId = null) {
    let query = `
      SELECT r.id, r.user_id, r.home_id, r.resident_type, r.is_primary_contact, r.status,
             u.full_name, u.phone, u.email
      FROM residents r
      JOIN users u ON r.user_id = u.id
      WHERE r.home_id = ? AND r.is_primary_contact = TRUE AND r.status = 'ACTIVE'
    `;
    const params = [homeId];

    if (excludeResidentId) {
      query += ' AND r.id != ?';
      params.push(excludeResidentId);
    }

    const [rows] = await pool.query(query, params);
    return rows[0] || null;
  }

  /**
   * Create a resident and linked user in transaction
   */
  static async createResidentWithUser(userData, residentData) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Insert or reuse User account
      let userId;
      const [existingUser] = await connection.query(
        'SELECT id, role FROM users WHERE phone = ? LIMIT 1',
        [userData.phone.trim()]
      );

      if (existingUser.length > 0) {
        userId = existingUser[0].id;
        // Update user name/role/avatar if needed
        await connection.query(
          `UPDATE users 
           SET full_name = ?, role = ?, avatar_url = COALESCE(?, avatar_url), 
               email = COALESCE(?, email), status = 'ACTIVE', updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [userData.full_name, userData.role, userData.avatar_url || null, userData.email || null, userId]
        );
      } else {
        const [userResult] = await connection.query(
          `INSERT INTO users (society_id, full_name, email, phone, password, role, avatar_url, flat_number, block_or_tower, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')`,
          [
            userData.society_id,
            userData.full_name.trim(),
            userData.email ? userData.email.trim() : null,
            userData.phone.trim(),
            userData.password, // bcrypt hash
            userData.role,
            userData.avatar_url || null,
            userData.flat_number || null,
            userData.block_or_tower || null,
          ]
        );
        userId = userResult.insertId;
      }

      // 2. Insert Resident record
      const [residentResult] = await connection.query(
        `INSERT INTO residents (user_id, home_id, resident_type, is_primary_contact, move_in_date, status)
         VALUES (?, ?, ?, ?, COALESCE(?, CURRENT_DATE), ?)`,
        [
          userId,
          residentData.home_id,
          residentData.resident_type,
          residentData.is_primary_contact !== undefined ? residentData.is_primary_contact : true,
          residentData.move_in_date || null,
          residentData.status || 'ACTIVE',
        ]
      );

      // 3. Update Home occupancy status
      const occupancyStatus = residentData.resident_type === 'OWNER' ? 'OCCUPIED_BY_OWNER' : 'OCCUPIED_BY_TENANT';
      await connection.query(
        'UPDATE homes SET occupancy_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [occupancyStatus, residentData.home_id]
      );

      // 4. Default Resident Permissions
      await connection.query(
        `INSERT INTO resident_permissions (home_id, user_id, courier_permission, delivery_permission, visitor_permission, worker_permission)
         VALUES (?, ?, TRUE, TRUE, TRUE, TRUE)
         ON DUPLICATE KEY UPDATE courier_permission = TRUE, delivery_permission = TRUE, visitor_permission = TRUE, worker_permission = TRUE`,
        [residentData.home_id, userId]
      );

      await connection.commit();
      return this.findById(residentResult.insertId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Find resident details by resident ID (Excludes user password)
   */
  static async findById(id) {
    const query = `
      SELECT 
        r.id, r.user_id, r.home_id, r.resident_type, r.is_primary_contact,
        r.move_in_date, r.move_out_date, r.lease_expiry_date, r.status,
        r.created_at, r.updated_at,
        u.full_name, u.email, u.phone, u.avatar_url, u.role AS user_role,
        h.society_id,
        COALESCE(h.home_number, h.flat_number) AS home_number,
        COALESCE(h.building_or_wing, h.block_or_tower) AS building_or_wing,
        COALESCE(h.floor, h.floor_number) AS floor,
        h.home_type, h.occupancy_status,
        s.name AS society_name
      FROM residents r
      JOIN users u ON r.user_id = u.id
      JOIN homes h ON r.home_id = h.id
      JOIN societies s ON h.society_id = s.id
      WHERE r.id = ?
      LIMIT 1
    `;
    const [rows] = await pool.query(query, [id]);
    return rows[0] || null;
  }

  /**
   * Find all residents with filtering
   */
  static async findAll(filters = {}) {
    let query = `
      SELECT 
        r.id, r.user_id, r.home_id, r.resident_type, r.is_primary_contact,
        r.move_in_date, r.move_out_date, r.status, r.created_at,
        u.full_name, u.email, u.phone, u.avatar_url,
        h.society_id,
        COALESCE(h.home_number, h.flat_number) AS home_number,
        COALESCE(h.building_or_wing, h.block_or_tower) AS building_or_wing,
        COALESCE(h.floor, h.floor_number) AS floor,
        h.home_type,
        s.name AS society_name,
        s.society_type
      FROM residents r
      JOIN users u ON r.user_id = u.id
      JOIN homes h ON r.home_id = h.id
      JOIN societies s ON h.society_id = s.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.society_id) {
      query += ' AND h.society_id = ?';
      params.push(filters.society_id);
    }

    if (filters.home_id) {
      query += ' AND r.home_id = ?';
      params.push(filters.home_id);
    }

    if (filters.resident_type) {
      query += ' AND r.resident_type = ?';
      params.push(filters.resident_type);
    }

    if (filters.status) {
      query += ' AND r.status = ?';
      params.push(filters.status);
    }

    if (filters.search) {
      query += ' AND (u.full_name LIKE ? OR u.phone LIKE ? OR h.home_number LIKE ? OR h.flat_number LIKE ?)';
      const term = `%${filters.search}%`;
      params.push(term, term, term, term);
    }

    query += ' ORDER BY r.created_at DESC';

    const [rows] = await pool.query(query, params);
    return rows;
  }

  /**
   * Update resident and linked user details
   */
  static async update(id, userData, residentData) {
    const resident = await this.findById(id);
    if (!resident) return null;

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Update user info
      if (userData && Object.keys(userData).length > 0) {
        const uFields = [];
        const uParams = [];

        if (userData.full_name !== undefined) {
          uFields.push('full_name = ?');
          uParams.push(userData.full_name.trim());
        }
        if (userData.email !== undefined) {
          uFields.push('email = ?');
          uParams.push(userData.email ? userData.email.trim() : null);
        }
        if (userData.phone !== undefined) {
          uFields.push('phone = ?');
          uParams.push(userData.phone.trim());
        }
        if (userData.avatar_url !== undefined) {
          uFields.push('avatar_url = ?');
          uParams.push(userData.avatar_url);
        }
        if (userData.role !== undefined) {
          uFields.push('role = ?');
          uParams.push(userData.role);
        }

        if (uFields.length > 0) {
          uFields.push('updated_at = CURRENT_TIMESTAMP');
          uParams.push(resident.user_id);
          await connection.query(`UPDATE users SET ${uFields.join(', ')} WHERE id = ?`, uParams);
        }
      }

      // 2. Update resident info
      if (residentData && Object.keys(residentData).length > 0) {
        const rFields = [];
        const rParams = [];

        if (residentData.resident_type !== undefined) {
          rFields.push('resident_type = ?');
          rParams.push(residentData.resident_type);
        }
        if (residentData.is_primary_contact !== undefined) {
          rFields.push('is_primary_contact = ?');
          rParams.push(residentData.is_primary_contact);
        }
        if (residentData.status !== undefined) {
          rFields.push('status = ?');
          rParams.push(residentData.status);
        }
        if (residentData.move_in_date !== undefined) {
          rFields.push('move_in_date = ?');
          rParams.push(residentData.move_in_date);
        }
        if (residentData.move_out_date !== undefined) {
          rFields.push('move_out_date = ?');
          rParams.push(residentData.move_out_date);
        }

        if (rFields.length > 0) {
          rFields.push('updated_at = CURRENT_TIMESTAMP');
          rParams.push(id);
          await connection.query(`UPDATE residents SET ${rFields.join(', ')} WHERE id = ?`, rParams);
        }
      }

      await connection.commit();
      return this.findById(id);
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  /**
   * Update resident status (e.g. ACTIVE, INACTIVE)
   */
  static async updateStatus(id, status) {
    const resident = await this.findById(id);
    if (!resident) return null;

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      await connection.query('UPDATE residents SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, id]);
      
      // Also update linked user status if deactivating
      const userStatus = status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE';
      await connection.query('UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [userStatus, resident.user_id]);

      await connection.commit();
      return this.findById(id);
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  /**
   * Reset resident password (bcrypt hashed)
   */
  static async resetPassword(userId, hashedPassword) {
    const query = 'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    const [result] = await pool.query(query, [hashedPassword, userId]);
    return result.affectedRows > 0;
  }

  /**
   * Delete resident
   */
  static async delete(id) {
    const resident = await this.findById(id);
    if (!resident) return false;

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Delete resident permissions if any
      await connection.query('DELETE FROM resident_permissions WHERE user_id = ?', [resident.user_id]);

      // 2. Delete resident association
      const [result] = await connection.query('DELETE FROM residents WHERE id = ?', [id]);

      // 3. Delete user account if not admin/security and no other resident records exist
      if (resident.user_role !== 'ADMIN' && resident.user_role !== 'SECURITY') {
        const [otherResidents] = await connection.query(
          'SELECT id FROM residents WHERE user_id = ? LIMIT 1',
          [resident.user_id]
        );
        if (otherResidents.length === 0) {
          await connection.query('DELETE FROM users WHERE id = ?', [resident.user_id]);
        }
      }

      // 4. Update home occupancy
      const [remaining] = await connection.query(
        "SELECT id, resident_type FROM residents WHERE home_id = ? AND status = 'ACTIVE' LIMIT 1",
        [resident.home_id]
      );
      const newOcc = remaining.length > 0
        ? (remaining[0].resident_type === 'OWNER' ? 'OCCUPIED_BY_OWNER' : 'OCCUPIED_BY_TENANT')
        : 'VACANT';
      await connection.query('UPDATE homes SET occupancy_status = ? WHERE id = ?', [newOcc, resident.home_id]);

      await connection.commit();
      return result.affectedRows > 0;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }
}

module.exports = ResidentRepository;
