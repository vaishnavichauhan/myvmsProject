const { pool } = require('../config/db');

/**
 * Family Member Repository
 * Handles all database operations for family members, their user accounts, and home portal data.
 */
class FamilyMemberRepository {
  /**
   * Find all family members belonging to a home
   */
  static async findByHomeId(homeId) {
    const query = `
      SELECT 
        fm.id, fm.home_id, fm.resident_id, fm.user_id,
        fm.full_name, fm.relationship, fm.phone, fm.is_minor, fm.status,
        fm.created_at, fm.updated_at,
        u.avatar_url, u.status AS user_status,
        h.home_number, h.building_or_wing,
        s.name AS society_name,
        pr_u.full_name AS primary_resident_name
      FROM family_members fm
      JOIN homes h ON fm.home_id = h.id
      JOIN societies s ON h.society_id = s.id
      LEFT JOIN users u ON fm.user_id = u.id
      LEFT JOIN residents r ON fm.resident_id = r.id
      LEFT JOIN users pr_u ON r.user_id = pr_u.id
      WHERE fm.home_id = ?
      ORDER BY fm.created_at ASC
    `;
    const [rows] = await pool.query(query, [homeId]);
    return rows;
  }

  /**
   * Find single family member by ID
   */
  static async findById(id) {
    const query = `
      SELECT 
        fm.id, fm.home_id, fm.resident_id, fm.user_id,
        fm.full_name, fm.relationship, fm.phone, fm.is_minor, fm.status,
        fm.created_at, fm.updated_at,
        u.avatar_url,
        h.home_number, h.building_or_wing,
        s.id AS society_id, s.name AS society_name,
        r.resident_type AS primary_resident_type,
        pr_u.full_name AS primary_resident_name
      FROM family_members fm
      JOIN homes h ON fm.home_id = h.id
      JOIN societies s ON h.society_id = s.id
      LEFT JOIN users u ON fm.user_id = u.id
      LEFT JOIN residents r ON fm.resident_id = r.id
      LEFT JOIN users pr_u ON r.user_id = pr_u.id
      WHERE fm.id = ?
      LIMIT 1
    `;
    const [rows] = await pool.query(query, [id]);
    return rows[0] || null;
  }

  /**
   * Find family member record by linked User ID
   */
  static async findByUserId(userId) {
    const query = `
      SELECT 
        fm.id, fm.home_id, fm.resident_id, fm.user_id,
        fm.full_name, fm.relationship, fm.phone, fm.is_minor, fm.status,
        h.home_number, h.building_or_wing, h.society_id,
        s.name AS society_name
      FROM family_members fm
      JOIN homes h ON fm.home_id = h.id
      JOIN societies s ON h.society_id = s.id
      WHERE fm.user_id = ?
      LIMIT 1
    `;
    const [rows] = await pool.query(query, [userId]);
    return rows[0] || null;
  }

  /**
   * Create a family member with linked independent login user account in transaction
   */
  static async createFamilyMember(homeId, residentId, data) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Resolve society_id and home_number
      const [homeRows] = await connection.query(
        'SELECT society_id, home_number, building_or_wing FROM homes WHERE id = ?',
        [homeId]
      );
      if (homeRows.length === 0) {
        throw new Error('Home not found');
      }
      const societyId = homeRows[0].society_id;
      const homeNumber = homeRows[0].home_number;
      const buildingOrWing = homeRows[0].building_or_wing;

      // 2. Insert or update User account for independent login
      let userId;
      const cleanPhone = data.phone.trim();
      const [existingUsers] = await connection.query(
        'SELECT id, role FROM users WHERE phone = ? LIMIT 1',
        [cleanPhone]
      );

      if (existingUsers.length > 0) {
        userId = existingUsers[0].id;
        // Update user profile and password
        await connection.query(
          `UPDATE users 
           SET full_name = ?, password = ?, role = 'FAMILY_MEMBER', 
               avatar_url = COALESCE(?, avatar_url), flat_number = ?, block_or_tower = ?,
               status = 'ACTIVE', updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [data.full_name, data.password, data.avatar_url || null, homeNumber, buildingOrWing, userId]
        );
      } else {
        const [userResult] = await connection.query(
          `INSERT INTO users (society_id, full_name, email, phone, password, role, avatar_url, flat_number, block_or_tower, status)
           VALUES (?, ?, ?, ?, ?, 'FAMILY_MEMBER', ?, ?, ?, 'ACTIVE')`,
          [
            societyId,
            data.full_name,
            data.email ? data.email.trim() : null,
            cleanPhone,
            data.password, // bcrypt hash
            data.avatar_url || null,
            homeNumber,
            buildingOrWing,
          ]
        );
        userId = userResult.insertId;
      }

      // 3. Insert family_members record
      const [fmResult] = await connection.query(
        `INSERT INTO family_members (home_id, resident_id, user_id, full_name, relationship, phone, is_minor, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          homeId,
          residentId,
          userId,
          data.full_name,
          data.relationship,
          cleanPhone,
          Boolean(data.is_minor),
          data.status || 'ACTIVE',
        ]
      );

      // 4. Default user-specific permissions for family member
      if (userId) {
        await connection.query(
          `INSERT INTO resident_permissions (home_id, user_id, courier_permission, delivery_permission, visitor_permission, worker_permission)
           VALUES (?, ?, TRUE, TRUE, TRUE, TRUE)
           ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP`,
          [homeId, userId]
        );
      }

      await connection.commit();
      return this.findById(fmResult.insertId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Update family member details
   */
  static async updateFamilyMember(id, data) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [existing] = await connection.query(
        'SELECT user_id FROM family_members WHERE id = ?',
        [id]
      );
      if (existing.length === 0) {
        throw new Error('Family member not found');
      }
      const userId = existing[0].user_id;

      // Update family_members table
      const updates = [];
      const params = [];

      if (data.full_name || data.name) {
        updates.push('full_name = ?');
        params.push((data.full_name || data.name).trim());
      }
      if (data.relationship) {
        updates.push('relationship = ?');
        params.push(data.relationship.trim());
      }
      if (data.phone) {
        updates.push('phone = ?');
        params.push(data.phone.trim());
      }
      if (data.status) {
        updates.push('status = ?');
        params.push(data.status);
      }
      if (data.is_minor !== undefined) {
        updates.push('is_minor = ?');
        params.push(Boolean(data.is_minor));
      }

      if (updates.length > 0) {
        params.push(id);
        await connection.query(
          `UPDATE family_members SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          params
        );
      }

      // Also update linked user account if exists
      if (userId) {
        const userUpdates = [];
        const userParams = [];

        if (data.full_name || data.name) {
          userUpdates.push('full_name = ?');
          userParams.push((data.full_name || data.name).trim());
        }
        if (data.phone) {
          userUpdates.push('phone = ?');
          userParams.push(data.phone.trim());
        }
        if (data.avatar_url !== undefined) {
          userUpdates.push('avatar_url = ?');
          userParams.push(data.avatar_url || null);
        }
        if (data.status) {
          userUpdates.push('status = ?');
          userParams.push(data.status);
        }

        if (userUpdates.length > 0) {
          userParams.push(userId);
          await connection.query(
            `UPDATE users SET ${userUpdates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            userParams
          );
        }
      }

      await connection.commit();
      return this.findById(id);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Delete family member and cleanup linked user account
   */
  static async deleteFamilyMember(id) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [existing] = await connection.query(
        'SELECT user_id, full_name FROM family_members WHERE id = ?',
        [id]
      );
      if (existing.length === 0) {
        throw new Error('Family member not found');
      }
      const { user_id, full_name } = existing[0];

      // Delete family member record
      await connection.query('DELETE FROM family_members WHERE id = ?', [id]);

      // If user was created specifically as FAMILY_MEMBER, remove or deactivate
      if (user_id) {
        await connection.query(
          "DELETE FROM users WHERE id = ? AND role = 'FAMILY_MEMBER'",
          [user_id]
        );
      }

      await connection.commit();
      return { success: true, full_name };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get all Home Portal data for a specific home
   * Feeds the complete dashboard: Home, Primary Resident, Family Members, Workers, Permissions, Committee, Announcements, Gates, Visitors
   */
  static async getHomePortalData(homeId) {
    // 1. Home Info
    const [homeRows] = await pool.query(
      `SELECT h.id, h.society_id, h.home_number, h.building_or_wing, h.floor, h.home_type, h.occupancy_status,
              s.name AS society_name, s.code AS society_code, s.address AS society_address, s.contact_number AS society_contact,
              s.emergency_number AS society_emergency
       FROM homes h
       JOIN societies s ON h.society_id = s.id
       WHERE h.id = ?`,
      [homeId]
    );
    const home = homeRows[0] || null;
    if (!home) return null;

    const societyId = home.society_id;

    // 2. Primary Resident
    const [residentRows] = await pool.query(
      `SELECT r.id, r.user_id, r.resident_type, r.is_primary_contact, r.move_in_date, r.status,
              u.full_name, u.phone, u.email, u.avatar_url
       FROM residents r
       JOIN users u ON r.user_id = u.id
       WHERE r.home_id = ? AND r.is_primary_contact = TRUE AND r.status = 'ACTIVE'
       LIMIT 1`,
      [homeId]
    );
    const primaryResident = residentRows[0] || null;

    // 3. Family Members
    const [familyMembers] = await pool.query(
      `SELECT fm.id, fm.user_id, fm.full_name, fm.relationship, fm.phone, fm.is_minor, fm.status, fm.created_at,
              u.avatar_url
       FROM family_members fm
       LEFT JOIN users u ON fm.user_id = u.id
       WHERE fm.home_id = ?
       ORDER BY fm.id ASC`,
      [homeId]
    );

    // 4. Home Workers (via worker_home junction, e.g. Driver Ramesh, Maid Sunita)
    const [homeWorkers] = await pool.query(
      `SELECT w.id, w.full_name, w.phone, w.worker_type, w.pass_code, w.police_verified,
              wh.start_date, wh.expected_time_in, wh.expected_time_out, wh.status AS assignment_status
       FROM worker_home wh
       JOIN workers w ON wh.worker_id = w.id
       WHERE wh.home_id = ? AND wh.status = 'ACTIVE'`,
      [homeId]
    );

    // 5. Permissions (Home-wise resident_permissions)
    const [permissionRows] = await pool.query(
      `SELECT rp.id, rp.home_id, rp.user_id,
              rp.courier_permission, rp.delivery_permission, rp.visitor_permission, rp.worker_permission,
              rp.created_at, rp.updated_at,
              updater.full_name AS updated_by_name
       FROM resident_permissions rp
       LEFT JOIN users updater ON rp.user_id = updater.id
       WHERE rp.home_id = ?
       LIMIT 1`,
      [homeId]
    );
    const permissions = permissionRows;

    // 6. Committee Members
    const [committeeMembers] = await pool.query(
      `SELECT cm.id, 
              cm.committee_id,
              COALESCE(c.name, cm.committee_name, 'General Committee') AS committee_name,
              COALESCE(cm.name, u.full_name) AS full_name,
              COALESCE(cm.name, u.full_name) AS name,
              COALESCE(cm.phone, u.phone) AS phone,
              cm.designation,
              cm.designation AS position,
              COALESCE(cm.home_number, u.flat_number) AS home_number,
              COALESCE(cm.photo_url, u.avatar_url) AS photo,
              COALESCE(cm.photo_url, u.avatar_url) AS photo_url,
              cm.term_start, cm.term_end, cm.responsibilities,
              cm.status, cm.can_create_announcements,
              u.email
       FROM committee_members cm
       LEFT JOIN committees c ON cm.committee_id = c.id
       LEFT JOIN users u ON cm.user_id = u.id
       WHERE cm.society_id = ? AND cm.status = 'ACTIVE'
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
           ELSE 6
         END ASC, cm.id ASC`,
      [societyId]
    );

    // 7. Announcements
    const [announcements] = await pool.query(
      `SELECT a.id, a.title, 
              COALESCE(a.type, 'GENERAL') AS type,
              COALESCE(a.description, a.content) AS description,
              COALESCE(a.date, DATE(a.created_at)) AS date,
              a.content, a.category, a.priority, a.attachment_url, a.valid_until, a.created_at,
              COALESCE(u.full_name, 'Society Management') AS posted_by,
              COALESCE(u.full_name, 'Society Management') AS created_by,
              cm.designation AS committee_position,
              COALESCE(c.name, cm.committee_name) AS committee_name,
              cm.home_number AS author_home_number
       FROM announcements a
       LEFT JOIN users u ON a.created_by_user_id = u.id
       LEFT JOIN committee_members cm ON cm.user_id = u.id AND cm.status = 'ACTIVE'
       LEFT JOIN committees c ON cm.committee_id = c.id
       WHERE a.society_id = ? AND a.status IN ('PUBLISHED', 'ACTIVE')
       ORDER BY 
         CASE WHEN a.type = 'EMERGENCY' OR a.priority = 'URGENT' THEN 0 ELSE 1 END ASC,
         a.date DESC,
         a.created_at DESC
       LIMIT 10`,
      [societyId]
    );

    // 8. Gates & On-Duty Security (All active guards on gate roster)
    const [gateRows] = await pool.query(
      `SELECT g.id, g.name, g.gate_number, g.location, g.gate_type, g.is_automated_barrier, g.status
       FROM gates g
       WHERE g.society_id = ? AND g.status != 'CLOSED'
       ORDER BY g.id ASC`,
      [societyId]
    );

    const [assignmentRows] = await pool.query(
      `SELECT sg.id AS assignment_id, sg.gate_id, sg.shift, sg.status AS assignment_status,
              sg.assigned_date, sg.check_in_time,
              ss.id AS security_staff_id, ss.badge_number, ss.agency_name,
              u.id AS security_user_id, u.full_name AS security_name, u.phone AS security_phone
       FROM security_gate sg
       JOIN security_staff ss ON sg.security_staff_id = ss.id
       JOIN users u ON ss.user_id = u.id
       WHERE sg.status IN ('ON_DUTY', 'ASSIGNED')
       ORDER BY sg.id ASC`
    );

    const gates = gateRows.map((g) => {
      const gateGuards = assignmentRows.filter((a) => a.gate_id === g.id);
      const firstGuard = gateGuards[0] || null;
      return {
        ...g,
        assigned_guards: gateGuards,
        guard_on_duty: gateGuards.map((x) => x.security_name).join(', ') || null,
        guard_phone: firstGuard?.security_phone || null,
        badge_number: firstGuard?.badge_number || null,
        shift: firstGuard?.shift || (firstGuard ? 'Morning' : null),
        security_name: gateGuards.map((x) => x.security_name).join(', ') || null,
        security_phone: firstGuard?.security_phone || null,
        assigned_security: firstGuard
          ? {
            name: gateGuards.map((x) => x.security_name).join(', '),
            shift: firstGuard.shift || 'Morning',
            phone: firstGuard.security_phone,
            badge_number: firstGuard.badge_number || null,
            status: firstGuard.assignment_status || 'ON_DUTY',
          }
          : null,
      };
    });

    // 9. Visitor Information relevant to this home
    const [visitors] = await pool.query(
      `SELECT ve.id, ve.purpose, ve.entry_type, ve.otp_code, ve.approval_status,
              ve.check_in_time AS entry_time, ve.check_out_time AS exit_time,
              CASE 
                WHEN ve.status = 'INSIDE' THEN 'ENTERED'
                WHEN ve.status = 'CHECKED_OUT' THEN 'EXITED'
                ELSE ve.status
              END AS status,
              v.full_name AS visitor_name, v.phone AS visitor_phone, v.vehicle_number, v.photo_url
       FROM visitor_entries ve
       JOIN visitors v ON ve.visitor_id = v.id
       WHERE ve.home_id = ?
       ORDER BY ve.created_at DESC
       LIMIT 20`,
      [homeId]
    );

    // 10. Couriers and Deliveries relevant to this home
    const [courierDeliveries] = await pool.query(
      `SELECT cd.id, cd.type, cd.company_or_person_name, cd.phone, cd.vehicle_number,
              cd.entry_time, cd.exit_time, cd.status, cd.notes, cd.created_at,
              u.full_name AS resident_name
       FROM courier_deliveries cd
       LEFT JOIN users u ON cd.resident_user_id = u.id
       WHERE cd.home_id = ?
       ORDER BY cd.created_at DESC
       LIMIT 20`,
      [homeId]
    );

    // 11. Today's visitors count for this home
    const [todayCountRows] = await pool.query(
      `SELECT COUNT(*) AS count FROM visitor_entries 
       WHERE home_id = ? AND (DATE(created_at) = CURRENT_DATE() OR DATE(check_in_time) = CURRENT_DATE())`,
      [homeId]
    );
    const todayVisitorsCount = todayCountRows[0]?.count || 0;

    // 12. Security staff count for the society
    const [securityStaffRows] = await pool.query(
      `SELECT COUNT(*) AS count FROM security_staff WHERE society_id = ? AND status != 'INACTIVE'`,
      [societyId]
    );
    const uniqueGuardIds = new Set(assignmentRows.map((a) => a.security_staff_id));
    const securityStaffCount = Number(securityStaffRows[0]?.count) || uniqueGuardIds.size || 0;

    // 13. Gate Entry statistics (Total, Inside, Outside) for this home
    const [gateStatsRows] = await pool.query(
      `SELECT 
         COUNT(*) AS total_count,
         COALESCE(SUM(CASE WHEN (status IN ('INSIDE', 'ENTERED') AND check_out_time IS NULL) THEN 1 ELSE 0 END), 0) AS inside_count,
         COALESCE(SUM(CASE WHEN (status IN ('EXITED', 'CHECKED_OUT') OR check_out_time IS NOT NULL) THEN 1 ELSE 0 END), 0) AS outside_count
       FROM visitor_entries
       WHERE home_id = ?`,
      [homeId]
    );
    const gateEntryStats = {
      total: Number(gateStatsRows[0]?.total_count) || 0,
      inside: Number(gateStatsRows[0]?.inside_count) || 0,
      outside: Number(gateStatsRows[0]?.outside_count) || 0,
    };

    return {
      home,
      primaryResident,
      familyMembers,
      homeWorkers,
      permissions,
      committeeMembers,
      announcements,
      gates,
      visitors,
      courierDeliveries,
      todayVisitorsCount,
      securityStaffCount,
      gateEntryStats,
    };
  }
}

module.exports = FamilyMemberRepository;
