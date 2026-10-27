const { pool } = require('../config/db');

/**
 * Security Staff Repository
 * Handles all database operations for security personnel, user credentials, and gate console management.
 */
class SecurityRepository {
  /**
   * Create security staff member with linked user account in transaction
   */
  static async createSecurityStaff(userData, staffData) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Insert into users table
      const [userResult] = await connection.query(
        `INSERT INTO users (
          society_id, full_name, email, phone, password, role, avatar_url, status
        ) VALUES (?, ?, ?, ?, ?, 'SECURITY', ?, ?)`,
        [
          staffData.society_id,
          userData.full_name.trim(),
          userData.email ? userData.email.trim() : null,
          userData.phone.trim(),
          userData.password, // bcrypt hash
          userData.avatar_url || null,
          staffData.status || 'ACTIVE',
        ]
      );
      const userId = userResult.insertId;

      // 2. Insert into security_staff table
      const employeeId = staffData.employee_id || staffData.badge_number || `SEC-${Date.now().toString().slice(-4)}`;
      const [staffResult] = await connection.query(
        `INSERT INTO security_staff (
          society_id, user_id, badge_number, employee_id, agency_name, shift, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          staffData.society_id,
          userId,
          employeeId,
          employeeId,
          staffData.agency_name || 'In-House Society Security',
          staffData.shift || 'ROTATIONAL',
          staffData.status || 'ACTIVE',
        ]
      );

      await connection.commit();
      return this.findById(staffResult.insertId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Find security staff by ID (excluding password)
   */
  static async findById(id) {
    const query = `
      SELECT 
        ss.id, ss.society_id, ss.user_id, ss.badge_number, ss.employee_id,
        ss.agency_name, ss.shift, ss.status, ss.created_at, ss.updated_at,
        u.full_name, u.phone, u.email, u.avatar_url, u.status AS user_status,
        s.name AS society_name
      FROM security_staff ss
      JOIN users u ON ss.user_id = u.id
      JOIN societies s ON ss.society_id = s.id
      WHERE ss.id = ?
      LIMIT 1
    `;
    const [rows] = await pool.query(query, [id]);
    return rows[0] || null;
  }

  /**
   * Find security staff by User ID
   */
  static async findByUserId(userId) {
    const query = `
      SELECT 
        ss.id, ss.society_id, ss.user_id, ss.badge_number, ss.employee_id,
        ss.agency_name, ss.shift, ss.status, ss.created_at,
        u.full_name, u.phone, u.avatar_url,
        s.name AS society_name
      FROM security_staff ss
      JOIN users u ON ss.user_id = u.id
      JOIN societies s ON ss.society_id = s.id
      WHERE ss.user_id = ?
      LIMIT 1
    `;
    const [rows] = await pool.query(query, [userId]);
    return rows[0] || null;
  }

  /**
   * Ensure a security_staff record exists for the given user, creating one if missing
   */
  static async ensureStaffRecord(user) {
    let staff = await this.findByUserId(user.id);
    if (!staff) {
      const societyId = user.societyId || user.society_id || 1;
      const empId = `SEC-${String(user.id).padStart(4, '0')}`;
      const [res] = await pool.query(
        `INSERT INTO security_staff (society_id, user_id, badge_number, employee_id, agency_name, shift, status)
         VALUES (?, ?, ?, ?, 'In-House Security', 'ROTATIONAL', 'ACTIVE')`,
        [societyId, user.id, empId, empId]
      );
      staff = await this.findById(res.insertId);
    }
    return staff;
  }

  /**
   * List all security personnel for a society
   */
  static async findAll(societyId, filters = {}) {
    let query = `
      SELECT 
        ss.id, ss.society_id, ss.user_id, ss.badge_number, ss.employee_id,
        ss.agency_name, ss.shift, ss.status, ss.created_at, ss.updated_at,
        u.full_name, u.phone, u.email, u.avatar_url,
        s.name AS society_name
      FROM security_staff ss
      JOIN users u ON ss.user_id = u.id
      JOIN societies s ON ss.society_id = s.id
      WHERE 1=1
    `;
    const params = [];

    if (societyId && societyId !== 'ALL') {
      query += ' AND ss.society_id = ?';
      params.push(societyId);
    }

    if (filters.status) {
      query += ' AND ss.status = ?';
      params.push(filters.status);
    }

    if (filters.search) {
      query += ' AND (u.full_name LIKE ? OR u.phone LIKE ? OR ss.badge_number LIKE ? OR ss.employee_id LIKE ?)';
      const term = `%${filters.search.trim()}%`;
      params.push(term, term, term, term);
    }

    query += ' ORDER BY ss.created_at DESC';

    const [rows] = await pool.query(query, params);
    return rows;
  }

  /**
   * Update security staff and linked user account
   */
  static async update(id, userData, staffData) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [existing] = await connection.query('SELECT user_id FROM security_staff WHERE id = ?', [id]);
      if (existing.length === 0) {
        throw new Error('Security staff record not found.');
      }
      const userId = existing[0].user_id;

      // Update security_staff
      const staffUpdates = [];
      const staffParams = [];

      if (staffData.employee_id || staffData.badge_number) {
        const empId = staffData.employee_id || staffData.badge_number;
        staffUpdates.push('badge_number = ?', 'employee_id = ?');
        staffParams.push(empId, empId);
      }
      if (staffData.agency_name !== undefined) {
        staffUpdates.push('agency_name = ?');
        staffParams.push(staffData.agency_name);
      }
      if (staffData.shift) {
        staffUpdates.push('shift = ?');
        staffParams.push(staffData.shift);
      }
      if (staffData.society_id) {
        staffUpdates.push('society_id = ?');
        staffParams.push(staffData.society_id);
      }
      if (staffData.status) {
        staffUpdates.push('status = ?');
        staffParams.push(staffData.status);
      }

      if (staffUpdates.length > 0) {
        staffParams.push(id);
        await connection.query(
          `UPDATE security_staff SET ${staffUpdates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          staffParams
        );
      }

      // Update user account
      const userUpdates = [];
      const userParams = [];

      if (userData.full_name) {
        userUpdates.push('full_name = ?');
        userParams.push(userData.full_name.trim());
      }
      if (userData.phone) {
        userUpdates.push('phone = ?');
        userParams.push(userData.phone.trim());
      }
      if (userData.avatar_url !== undefined) {
        userUpdates.push('avatar_url = ?');
        userParams.push(userData.avatar_url);
      }
      if (userData.society_id) {
        userUpdates.push('society_id = ?');
        userParams.push(userData.society_id);
      }
      if (staffData.status) {
        userUpdates.push('status = ?');
        userParams.push(staffData.status === 'TERMINATED' ? 'INACTIVE' : staffData.status);
      }

      if (userUpdates.length > 0) {
        userParams.push(userId);
        await connection.query(
          `UPDATE users SET ${userUpdates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          userParams
        );
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
   * Update status (Activate / Deactivate)
   */
  static async updateStatus(id, status) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [existing] = await connection.query('SELECT user_id FROM security_staff WHERE id = ?', [id]);
      if (existing.length === 0) throw new Error('Security staff not found');
      const userId = existing[0].user_id;

      await connection.query(
        'UPDATE security_staff SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [status, id]
      );

      const userStatus = status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE';
      await connection.query(
        'UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [userStatus, userId]
      );

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
   * Reset security staff password
   */
  static async resetPassword(userId, hashedPassword) {
    const [result] = await pool.query(
      'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [hashedPassword, userId]
    );
    return result.affectedRows > 0;
  }

  /**
   * Delete security staff
   */
  static async delete(id) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [existing] = await connection.query('SELECT user_id, badge_number FROM security_staff WHERE id = ?', [id]);
      if (existing.length === 0) throw new Error('Security staff not found');
      const { user_id, badge_number } = existing[0];

      await connection.query('DELETE FROM security_staff WHERE id = ?', [id]);
      if (user_id) {
        await connection.query("DELETE FROM users WHERE id = ? AND role = 'SECURITY'", [user_id]);
      }

      await connection.commit();
      return { success: true, badge_number };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // --------------------------------------------------------------------------
  // GATE DASHBOARD AGGREGATION (Gate Console for Watchmen)
  // --------------------------------------------------------------------------

  /**
   * Get Gate Dashboard Data for Security Staff
   */
  static async getGateDashboardData(societyId) {
    // 1. Recent Visitor Entries
    const [visitors] = await pool.query(`
      SELECT ve.id, ve.entry_type, ve.purpose, ve.approval_status, ve.otp_code,
             ve.check_in_time, ve.check_out_time, ve.status,
             v.full_name AS visitor_name, v.phone AS visitor_phone, v.vehicle_number,
             h.home_number, h.building_or_wing
      FROM visitor_entries ve
      JOIN visitors v ON ve.visitor_id = v.id
      JOIN homes h ON ve.home_id = h.id
      WHERE h.society_id = ?
      ORDER BY ve.created_at DESC
      LIMIT 15
    `, [societyId]);

    // 2. Deliveries
    const [deliveries] = await pool.query(`
      SELECT d.id, d.delivery_company, d.entry_code,
             d.delivery_person_name, d.delivery_person_phone, d.approval_status,
             d.check_in_time, d.check_out_time, d.status,
             h.home_number, h.building_or_wing
      FROM deliveries d
      JOIN homes h ON d.home_id = h.id
      WHERE h.society_id = ?
      ORDER BY d.created_at DESC
      LIMIT 15
    `, [societyId]);

    // 3. Couriers
    const [couriers] = await pool.query(`
      SELECT c.id, c.tracking_number, c.courier_company, c.recipient_name,
             c.number_of_parcels, c.storage_location, c.status, c.handed_over_at, c.created_at,
             h.home_number, h.building_or_wing
      FROM couriers c
      JOIN homes h ON c.home_id = h.id
      WHERE h.society_id = ?
      ORDER BY c.created_at DESC
      LIMIT 15
    `, [societyId]);

    // 4. Daily Workers & Helpers
    const [workers] = await pool.query(`
      SELECT w.id, w.full_name, w.phone, w.worker_type, w.pass_code, w.police_verified, w.status,
             GROUP_CONCAT(DISTINCT h.home_number SEPARATOR ', ') AS active_homes
      FROM workers w
      LEFT JOIN worker_home wh ON w.id = wh.worker_id AND wh.status = 'ACTIVE'
      LEFT JOIN homes h ON wh.home_id = h.id
      WHERE w.society_id = ? AND w.status = 'ACTIVE'
      GROUP BY w.id
      ORDER BY w.full_name ASC
      LIMIT 25
    `, [societyId]);

    // 5. Active Gates
    const [gates] = await pool.query(`
      SELECT id, name, gate_type, is_automated_barrier, status
      FROM gates
      WHERE society_id = ?
    `, [societyId]);

    // 6. Summary metrics & Today's Activity (Prompt 17: Visitors, Deliveries, Couriers, Workers, Vehicles)
    const [summaryRows] = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM visitor_entries ve JOIN homes h ON ve.home_id = h.id WHERE h.society_id = ? AND ve.status = 'INSIDE') AS inside_visitors,
        (SELECT COUNT(*) FROM deliveries d JOIN homes h ON d.home_id = h.id WHERE h.society_id = ? AND d.status = 'IN_TRANSIT_INSIDE') AS pending_deliveries,
        (SELECT COUNT(*) FROM couriers c JOIN homes h ON c.home_id = h.id WHERE h.society_id = ? AND c.status = 'RECEIVED_AT_GATE') AS gate_couriers,
        (SELECT COUNT(*) FROM workers WHERE society_id = ? AND status = 'ACTIVE') AS registered_workers
    `, [societyId, societyId, societyId, societyId]);

    const [todayActivityRows] = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM visitor_entries ve JOIN homes h ON ve.home_id = h.id WHERE h.society_id = ? AND (DATE(ve.created_at) = CURRENT_DATE() OR DATE(ve.check_in_time) = CURRENT_DATE() OR ve.status = 'INSIDE')) AS visitors,
        (SELECT COUNT(*) FROM deliveries d JOIN homes h ON d.home_id = h.id WHERE h.society_id = ? AND (DATE(d.created_at) = CURRENT_DATE() OR DATE(d.check_in_time) = CURRENT_DATE() OR d.status = 'IN_TRANSIT_INSIDE')) AS deliveries,
        (SELECT COUNT(*) FROM couriers c JOIN homes h ON c.home_id = h.id WHERE h.society_id = ? AND (DATE(c.created_at) = CURRENT_DATE() OR c.status = 'RECEIVED_AT_GATE')) AS couriers,
        (SELECT COUNT(*) FROM workers WHERE society_id = ? AND status = 'ACTIVE') AS workers,
        (SELECT COUNT(*) FROM gate_entries ge WHERE ge.society_id = ? AND (DATE(ge.created_at) = CURRENT_DATE() OR ge.vehicle_type IS NOT NULL)) AS vehicles
    `, [societyId, societyId, societyId, societyId, societyId]);

    const today_activity = todayActivityRows[0] || {
      visitors: 0,
      deliveries: 0,
      couriers: 0,
      workers: 0,
      vehicles: 0,
    };

    return {
      summary: summaryRows[0] || {
        inside_visitors: 0,
        pending_deliveries: 0,
        gate_couriers: 0,
        registered_workers: 0,
      },
      today_activity,
      visitors,
      deliveries,
      couriers,
      workers,
      gates,
    };
  }

  /**
   * Search homes for security watchman gate verification
   * STRICT PRIVACY RULE ENFORCED:
   * - Security can see: Home number, resident names, worker names/types, permission statuses.
   * - Security CANNOT automatically see: Resident phone numbers, passwords, emails, private info.
   */
  static async searchHomes(societyId, query) {
    const trimmed = (query || '').trim();
    let homesSql;
    let params;

    const hasSocietyFilter = societyId && societyId !== 'ALL';

    if (!trimmed) {
      homesSql = `
        SELECT DISTINCT
          h.id AS home_id,
          h.society_id,
          s.name AS society_name,
          s.code AS society_code,
          h.home_number,
          h.building_or_wing,
          h.floor,
          h.home_type,
          h.occupancy_status,
          h.intercom_number
        FROM homes h
        LEFT JOIN societies s ON h.society_id = s.id
        ${hasSocietyFilter ? 'WHERE h.society_id = ?' : ''}
        ORDER BY CAST(h.home_number AS UNSIGNED) ASC, h.home_number ASC
        LIMIT 25
      `;
      params = hasSocietyFilter ? [societyId] : [];
    } else {
      const q = `%${trimmed}%`;
      homesSql = `
        SELECT DISTINCT
          h.id AS home_id,
          h.society_id,
          s.name AS society_name,
          s.code AS society_code,
          h.home_number,
          h.building_or_wing,
          h.floor,
          h.home_type,
          h.occupancy_status,
          h.intercom_number
        FROM homes h
        LEFT JOIN societies s ON h.society_id = s.id
        LEFT JOIN residents r ON h.id = r.home_id AND r.status = 'ACTIVE'
        LEFT JOIN users u ON r.user_id = u.id
        LEFT JOIN family_members fm ON h.id = fm.home_id AND fm.status = 'ACTIVE'
        WHERE ${hasSocietyFilter ? 'h.society_id = ? AND ' : ''}(
            h.home_number LIKE ? 
            OR h.building_or_wing LIKE ? 
            OR h.intercom_number LIKE ? 
            OR u.full_name LIKE ? 
            OR fm.full_name LIKE ?
            OR s.name LIKE ?
          )
        ORDER BY CAST(h.home_number AS UNSIGNED) ASC, h.home_number ASC
        LIMIT 25
      `;
      params = hasSocietyFilter ? [societyId, q, q, q, q, q, q] : [q, q, q, q, q, q];
    }

    const [homes] = await pool.query(homesSql, params);

    if (homes.length === 0) return [];

    // Enrich each home with privacy-scrubbed residents, workers, and permission profiles
    const enrichedHomes = await Promise.all(
      homes.map(async (home) => {
        // 1. Residents: Primary residents + family members (NO PHONE, NO EMAIL, NO PASSWORD)
        const [primaryResidents] = await pool.query(
          `SELECT u.id AS user_id, u.full_name AS name, r.resident_type, r.is_primary_contact
           FROM residents r
           JOIN users u ON r.user_id = u.id
           WHERE r.home_id = ? AND r.status = 'ACTIVE'
           ORDER BY r.is_primary_contact DESC, u.full_name ASC`,
          [home.home_id]
        );

        const [familyMembers] = await pool.query(
          `SELECT COALESCE(fm.user_id, fm.id) AS user_id, fm.full_name AS name,
                  'FAMILY_MEMBER' AS resident_type, 0 AS is_primary_contact,
                  fm.relationship
           FROM family_members fm
           WHERE fm.home_id = ? AND fm.status = 'ACTIVE'
           ORDER BY 
             CASE WHEN fm.full_name = 'Vaishnavi' THEN 1 ELSE 2 END ASC,
             fm.full_name ASC`,
          [home.home_id]
        );

        const allResidents = [...primaryResidents, ...familyMembers];

        // 2. Workers assigned to this home (Worker name, type, status)
        const [workers] = await pool.query(
          `SELECT w.id, w.full_name AS name, w.worker_type, wh.status
           FROM worker_home wh
           JOIN workers w ON wh.worker_id = w.id
           WHERE wh.home_id = ? AND wh.status = 'ACTIVE'
           ORDER BY 
             CASE w.worker_type WHEN 'DRIVER' THEN 1 WHEN 'MAID' THEN 2 ELSE 3 END ASC,
             w.full_name ASC`,
          [home.home_id]
        );

        // 3. Resident Permissions for this home (Home-wise)
        const [perms] = await pool.query(
          `SELECT rp.courier_permission, rp.delivery_permission,
                  rp.visitor_permission, rp.worker_permission
           FROM resident_permissions rp
           WHERE rp.home_id = ?
           LIMIT 1`,
          [home.home_id]
        );

        const homePerm = perms[0] || null;
        const homeCourier = homePerm ? Boolean(homePerm.courier_permission) : true;
        const homeDelivery = homePerm ? Boolean(homePerm.delivery_permission) : true;
        const homeVisitor = homePerm ? Boolean(homePerm.visitor_permission) : true;
        const homeWorker = homePerm ? Boolean(homePerm.worker_permission) : true;

        const disallowed = [];
        if (!homeCourier) disallowed.push('COURIER');
        if (!homeDelivery) disallowed.push('DELIVERY');
        if (!homeVisitor) disallowed.push('VISITOR');
        if (!homeWorker) disallowed.push('WORKER');

        // Map residents with their permissions and available contact actions (WITHOUT revealing phone numbers)
        const residentsWithPrivacy = allResidents.map((r) => {
          return {
            user_id: r.user_id,
            name: r.name,
            resident_type: r.resident_type,
            relationship: r.relationship || null,
            is_primary_contact: Boolean(r.is_primary_contact),
            permissions: {
              courier: homeCourier ? 'YES' : 'NO',
              delivery: homeDelivery ? 'YES' : 'NO',
              visitor: homeVisitor ? 'YES' : 'NO',
              worker: homeWorker ? 'YES' : 'NO',
            },
            disallowed_permissions: disallowed,
            // Only residents with disallowed permissions have contact action available for gate clearance
            can_contact: disallowed.length > 0,
          };
        });

        return {
          home_id: home.home_id,
          society_id: home.society_id,
          society_name: home.society_name,
          society_code: home.society_code,
          home_number: home.home_number,
          building_or_wing: home.building_or_wing,
          floor: home.floor,
          home_type: home.home_type,
          intercom_number: home.intercom_number,
          occupancy_status: home.occupancy_status,
          primary_resident_name: primaryResidents[0]?.name || null,
          residents: residentsWithPrivacy,
          workers: workers.map((w) => {
            const formattedType = w.worker_type === 'DRIVER' ? 'Driver' : w.worker_type === 'MAID' ? 'Maid' : w.worker_type;
            const cleanName = w.name.replace(/^(Driver|Maid)\s+/i, '').replace(/\s*\((Maid|Driver)\)/i, '');
            return {
              id: w.id,
              name: cleanName,
              worker_type: w.worker_type,
              status: w.status,
              display: `${cleanName} - ${formattedType}`,
            };
          }),
          permissions: {
            courier: homeCourier ? 'YES' : 'NO',
            delivery: homeDelivery ? 'YES' : 'NO',
            visitor: homeVisitor ? 'YES' : 'NO',
            worker: homeWorker ? 'YES' : 'NO',
          },
        };
      })
    );

    return enrichedHomes;
  }

  /**
   * Minimum Information Contact Action for Security
   * Discloses ONLY the specific resident's phone number when their permission is NO
   * and a gate contact action is explicitly requested.
   */
  static async getResidentContactForAction(societyId, homeId, residentUserId, permissionType, reason, securityUser) {
    // 1. Verify home exists in caller's society
    const [homeRows] = await pool.query(
      'SELECT id, home_number, building_or_wing FROM homes WHERE id = ? AND society_id = ? LIMIT 1',
      [homeId, societyId]
    );
    if (homeRows.length === 0) {
      return { success: false, status: 404, message: 'Home not found in society.' };
    }
    const home = homeRows[0];

    // 2. Verify resident is affiliated with this home
    const [residentRows] = await pool.query(
      `SELECT u.id, u.full_name, u.phone
       FROM users u
       WHERE u.id = ?
         AND (
           EXISTS (SELECT 1 FROM residents r WHERE r.user_id = u.id AND r.home_id = ? AND r.status = 'ACTIVE')
           OR EXISTS (SELECT 1 FROM family_members fm WHERE fm.user_id = u.id AND fm.home_id = ? AND fm.status = 'ACTIVE')
         )
       LIMIT 1`,
      [residentUserId, homeId, homeId]
    );

    if (residentRows.length === 0) {
      return { success: false, status: 404, message: 'Resident not found in this home.' };
    }
    const resident = residentRows[0];

    // 3. Strict Permission & Privacy Enforcement Check:
    // Only disclose if permission for this activity type is NO
    const permColMap = {
      DELIVERY: 'delivery_permission',
      COURIER: 'courier_permission',
      VISITOR: 'visitor_permission',
      WORKER: 'worker_permission',
    };

    const permCol = permColMap[(permissionType || '').toUpperCase()];
    if (!permCol) {
      return {
        success: false,
        status: 400,
        message: 'Invalid permission type. Must be one of: DELIVERY, COURIER, VISITOR, WORKER',
      };
    }

    const [permRows] = await pool.query(
      `SELECT ${permCol} AS is_allowed
       FROM resident_permissions
       WHERE home_id = ? LIMIT 1`,
      [homeId]
    );

    const isAllowed = permRows.length > 0 ? Boolean(permRows[0].is_allowed) : true;

    if (isAllowed) {
      // Privacy rule violation: If permission is YES, phone number cannot be disclosed to security
      return {
        success: false,
        status: 403,
        message: `Privacy Rule Enforcement: Contact phone number is withheld. ${permissionType} permission for ${resident.full_name} is active (YES) and does not require gate exception call.`,
      };
    }

    // 4. Log contact action audit
    try {
      await pool.query(
        `INSERT INTO notifications (society_id, user_id, title, message, type)
         VALUES (?, ?, ?, ?, 'DELIVERY_ALERT')`,
        [
          societyId,
          residentUserId,
          `Gate Contact: ${permissionType} Exception`,
          `Security staff initiated contact verification for Home ${home.home_number} (${permissionType} = NO). Reason: ${reason || 'Arrival at security gate'}`,
        ]
      );
    } catch (e) {
      console.warn('Audit notification write skipped:', e.message);
    }

    // 5. Return ONLY minimum necessary information for this specific action
    return {
      success: true,
      status: 200,
      data: {
        resident_user_id: resident.id,
        resident_name: resident.full_name,
        home_number: home.home_number,
        building_or_wing: home.building_or_wing,
        permission_type: permissionType.toUpperCase(),
        permission_status: 'NO',
        phone: resident.phone, // Disclosed strictly for this action
        action: 'CALL_RESIDENT',
        reason: reason || `${permissionType} arrived but permission is NO`,
      },
    };
  }

  /**
   * Record gate entry (visitor, courier, delivery, vehicle)
   */
  static async recordVisitorGateEntry(data) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Resolve valid gate_id
      let resolvedGateId = data.gate_id || null;
      if (!resolvedGateId) {
        const [activeGates] = await connection.query(
          'SELECT id FROM gates WHERE society_id = ? AND status = "ACTIVE" ORDER BY id ASC LIMIT 1',
          [data.society_id]
        );
        resolvedGateId = activeGates[0]?.id || null;
      }
      if (!resolvedGateId) {
        const [anyGates] = await connection.query('SELECT id FROM gates LIMIT 1');
        resolvedGateId = anyGates[0]?.id || null;
      }

      // 1. Find or create visitor in directory
      let visitorId;
      const phoneToUse = (data.phone && data.phone.trim() !== 'N/A' && data.phone.trim() !== '') ? data.phone.trim() : '9999999999';
      const [existingVis] = await connection.query(
        'SELECT id FROM visitors WHERE society_id = ? AND phone = ? LIMIT 1',
        [data.society_id, phoneToUse]
      );

      if (existingVis.length > 0) {
        visitorId = existingVis[0].id;
      } else {
        const [newVis] = await connection.query(
          `INSERT INTO visitors (society_id, full_name, phone, visitor_type, vehicle_number)
           VALUES (?, ?, ?, ?, ?)`,
          [data.society_id, data.name.trim(), phoneToUse, data.visitor_type || 'GUEST', data.vehicle_number || null]
        );
        visitorId = newVis.insertId;
      }

      // 2. Generate OTP and record entry
      const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
      const [entryResult] = await connection.query(
        `INSERT INTO visitor_entries (
          visitor_id, home_id, security_staff_id, gate_id, entry_type, purpose,
          approval_status, otp_code, check_in_time, status
        ) VALUES (?, ?, ?, ?, ?, ?, 'APPROVED', ?, CURRENT_TIMESTAMP, 'INSIDE')`,
        [
          visitorId,
          data.home_id || null,
          data.security_staff_id || null,
          resolvedGateId,
          data.entry_type === 'PRE_APPROVED' ? 'PRE_APPROVED' : 'GATE_REQUESTED',
          data.purpose || 'Personal Visit',
          otpCode,
        ]
      );

      // 3. Record in gate_entries table for activity logs if resolvedGateId is valid
      if (resolvedGateId) {
        let personType = 'VISITOR';
        if (data.entry_type === 'COURIER') personType = 'COURIER';
        else if (data.entry_type === 'DELIVERY') personType = 'DELIVERY';
        else if (data.entry_type === 'WORKER') personType = 'WORKER';

        await connection.query(
          `INSERT INTO gate_entries (
            society_id, gate_id, security_staff_id, entry_person_type,
            person_name, person_phone, target_home_id, vehicle_number,
            entry_time, direction, reference_id, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 'IN', ?, 'APPROVED')`,
          [
            data.society_id,
            resolvedGateId,
            data.security_staff_id || null,
            personType,
            data.name.trim(),
            phoneToUse,
            data.home_id || null,
            data.vehicle_number ? data.vehicle_number.trim().toUpperCase() : null,
            entryResult.insertId,
          ]
        );
      }

      await connection.commit();
      return {
        entry_id: entryResult.insertId,
        visitor_id: visitorId,
        otp_code: otpCode,
        status: 'INSIDE',
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Record gate exit
   */
  static async recordVisitorGateExit(entryId) {
    const [result] = await pool.query(
      `UPDATE visitor_entries 
       SET check_out_time = CURRENT_TIMESTAMP, status = 'CHECKED_OUT'
       WHERE id = ?`,
      [entryId]
    );
    return result.affectedRows > 0;
  }
}

module.exports = SecurityRepository;
