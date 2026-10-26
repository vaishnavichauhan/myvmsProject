const { pool } = require('../config/db');

/**
 * Visitor Management Repository
 * Handles visitor directory, home permission checks, entry/exit logging, and history.
 */
class VisitorRepository {
  /**
   * Check visitor permission for a home & retrieve resident roster
   * Strict privacy: Only resident names & permissions returned, no phone leakage.
   */
  /**
   * Check visitor permission for a home & retrieve resident roster
   * Strict privacy: Only resident names & permissions returned, no phone leakage.
   */
  static async checkHomePermission(homeId, targetUserId = null) {
    // 1. Get Home info by ID or Home Number
    const [homes] = await pool.query(
      `SELECT h.id, h.home_number, h.building_or_wing, h.society_id
       FROM homes h WHERE h.id = ? OR h.home_number = ? LIMIT 1`,
      [homeId, String(homeId)]
    );
    if (homes.length === 0) return null;
    const home = homes[0];

    // 2. Get home-level permissions
    const [permRows] = await pool.query(
      `SELECT COALESCE(visitor_permission, 1) AS visitor_permission
       FROM resident_permissions
       WHERE home_id = ? LIMIT 1`,
      [home.id]
    );
    const homeVisitorPerm = permRows.length > 0 ? Boolean(permRows[0].visitor_permission) : true;

    // 3. Get all residents belonging to this home
    const [residents] = await pool.query(
      `SELECT 
         u.id AS user_id,
         u.full_name,
         u.role
       FROM (
         SELECT r.user_id FROM residents r WHERE r.home_id = ? AND r.status = 'ACTIVE'
         UNION
         SELECT fm.user_id FROM family_members fm WHERE fm.home_id = ? AND fm.status = 'ACTIVE' AND fm.user_id IS NOT NULL
       ) home_users
       JOIN users u ON home_users.user_id = u.id
       ORDER BY FIELD(u.role, 'OWNER', 'TENANT', 'FAMILY_MEMBER') ASC, u.id ASC`,
      [home.id, home.id]
    );

    // Evaluate visitor permission (Home-wise)
    const permissionAllowed = homeVisitorPerm;
    const requiresApproval = !homeVisitorPerm;

    let targetResident = null;
    if (residents.length > 0) {
      if (targetUserId) {
        targetResident = residents.find((r) => r.user_id === Number(targetUserId)) || residents[0];
      } else {
        targetResident = residents[0];
      }
    }

    return {
      home: {
        id: home.id,
        home_number: home.home_number,
        building_or_wing: home.building_or_wing,
        society_id: home.society_id,
      },
      residents: residents.map((r) => ({
        user_id: r.user_id,
        name: r.full_name,
        role: r.role,
        visitor_permission: Boolean(r.visitor_permission) ? 'YES' : 'NO',
      })),
      selected_resident: targetResident
        ? {
            user_id: targetResident.user_id,
            name: targetResident.full_name,
            role: targetResident.role,
            visitor_permission: Boolean(targetResident.visitor_permission) ? 'YES' : 'NO',
          }
        : null,
      permission_allowed: permissionAllowed,
      requires_approval: requiresApproval,
    };
  }

  /**
   * Create visitor entry
   * Statuses: PENDING, APPROVED, REJECTED, ENTERED, EXITED
   */
  static async createVisitorEntry(data) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const {
        society_id,
        home_id,
        name,
        phone,
        purpose = 'Personal Visit',
        visitor_type = 'GUEST',
        vehicle_number = null,
        photo_url = null,
        gate_id = null,
        security_staff_id = null,
        resident_user_id = null,
        approved_by_user_id = null,
        initial_status = 'PENDING',
        approval_status = 'PENDING',
        entry_type = 'GATE_REQUESTED',
      } = data;

      // 1. Find or create visitor in directory
      let visitorId;
      const [existingVis] = await connection.query(
        'SELECT id FROM visitors WHERE society_id = ? AND phone = ? LIMIT 1',
        [society_id, phone.trim()]
      );

      if (existingVis.length > 0) {
        visitorId = existingVis[0].id;
        // Update vehicle and photo if newly provided
        await connection.query(
          `UPDATE visitors SET 
            full_name = COALESCE(?, full_name),
            vehicle_number = COALESCE(?, vehicle_number),
            photo_url = COALESCE(?, photo_url),
            visitor_type = COALESCE(?, visitor_type)
           WHERE id = ?`,
          [name.trim(), vehicle_number || null, photo_url || null, visitor_type, visitorId]
        );
      } else {
        const [newVis] = await connection.query(
          `INSERT INTO visitors (society_id, full_name, phone, visitor_type, vehicle_number, photo_url)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [society_id, name.trim(), phone.trim(), visitor_type, vehicle_number || null, photo_url || null]
        );
        visitorId = newVis.insertId;
      }

      // Resolve valid gate_id
      let resolvedGateId = gate_id;
      if (!resolvedGateId) {
        const [activeGates] = await connection.query(
          'SELECT id FROM gates WHERE society_id = ? AND status = "ACTIVE" ORDER BY id ASC LIMIT 1',
          [society_id]
        );
        resolvedGateId = activeGates[0]?.id || null;
      }
      if (!resolvedGateId) {
        const [anyGates] = await connection.query('SELECT id FROM gates LIMIT 1');
        resolvedGateId = anyGates[0]?.id || null;
      }

      // 2. Generate OTP and Gate Pass Number
      const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
      const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, '');
      const randPart = Math.floor(1000 + Math.random() * 9000);
      const gatePassNumber = `GP-${datePart}-${randPart}`;

      // Determine check_in_time
      const checkInTime = initial_status === 'ENTERED' ? new Date() : null;

      // 3. Insert visitor_entry
      const [entryResult] = await connection.query(
        `INSERT INTO visitor_entries (
          visitor_id, home_id, gate_id, security_staff_id, resident_user_id, approved_by_user_id,
          purpose, entry_type, otp_code, gate_pass_number, approval_status, check_in_time, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          visitorId,
          home_id,
          gate_id || resolvedGateId || null,
          security_staff_id || null,
          resident_user_id || null,
          approved_by_user_id || null,
          purpose.trim(),
          entry_type,
          otpCode,
          gatePassNumber,
          approval_status,
          checkInTime,
          initial_status,
        ]
      );

      const entryId = entryResult.insertId;

      // 4. Record in Master Gate Entries Audit Log
      let gateStatus = 'PENDING';
      if (initial_status === 'ENTERED' || initial_status === 'APPROVED') {
        gateStatus = 'APPROVED';
      }

      if (resolvedGateId) {
        await connection.query(
          `INSERT INTO gate_entries (
            society_id, gate_id, security_staff_id, entry_person_type,
            person_name, person_phone, target_home_id, vehicle_number,
            entry_time, direction, reference_id, status
          ) VALUES (?, ?, ?, 'VISITOR', ?, ?, ?, ?, ?, 'IN', ?, ?)`,
          [
            society_id,
            resolvedGateId,
            security_staff_id || null,
            name.trim(),
            phone.trim(),
            home_id,
            vehicle_number ? vehicle_number.trim().toUpperCase() : null,
            checkInTime || new Date(),
            entryId,
            gateStatus,
          ]
        );
      }

      await connection.commit();
      return this.findById(entryId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Find entry by ID with full details
   */
  static async findById(id) {
    const query = `
      SELECT 
        ve.id,
        ve.visitor_id,
        ve.home_id,
        ve.gate_id,
        ve.security_staff_id,
        ve.resident_user_id,
        ve.approved_by_user_id,
        ve.purpose,
        ve.entry_type,
        ve.otp_code,
        ve.gate_pass_number,
        ve.approval_status,
        ve.check_in_time AS entry_time,
        ve.check_out_time AS exit_time,
        CASE 
          WHEN ve.status = 'INSIDE' THEN 'ENTERED'
          WHEN ve.status = 'CHECKED_OUT' THEN 'EXITED'
          ELSE ve.status
        END AS status,
        ve.created_at,
        ve.updated_at,
        v.full_name AS visitor_name,
        v.phone AS phone_number,
        v.vehicle_number,
        v.photo_url,
        v.visitor_type,
        h.home_number,
        h.building_or_wing,
        g.name AS gate_name,
        g.gate_number,
        u_res.full_name AS resident_name,
        u_appr.full_name AS approved_by_name,
        u_sec.full_name AS security_staff_name
      FROM visitor_entries ve
      JOIN visitors v ON ve.visitor_id = v.id
      JOIN homes h ON ve.home_id = h.id
      LEFT JOIN gates g ON ve.gate_id = g.id
      LEFT JOIN security_staff ss ON ve.security_staff_id = ss.id
      LEFT JOIN users u_sec ON ss.user_id = u_sec.id
      LEFT JOIN users u_res ON ve.resident_user_id = u_res.id
      LEFT JOIN users u_appr ON ve.approved_by_user_id = u_appr.id
      WHERE ve.id = ?
      LIMIT 1
    `;
    const [rows] = await pool.query(query, [id]);
    return rows[0] || null;
  }

  /**
   * Security records entry (transitions from APPROVED/PENDING -> ENTERED)
   */
  static async recordEntry(entryId, securityStaffId = null, gateId = null) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const updates = [
        "status = 'ENTERED'",
        "approval_status = 'APPROVED'",
        "check_in_time = CURRENT_TIMESTAMP",
      ];
      const params = [];

      if (securityStaffId) {
        updates.push('security_staff_id = ?');
        params.push(securityStaffId);
      }
      if (gateId) {
        updates.push('gate_id = ?');
        params.push(gateId);
      }

      params.push(entryId);
      await connection.query(
        `UPDATE visitor_entries SET ${updates.join(', ')} WHERE id = ?`,
        params
      );

      // Master Gate Activity audit log update
      await connection.query(
        `UPDATE gate_entries 
         SET status = 'APPROVED', entry_time = CURRENT_TIMESTAMP, direction = 'IN'
         WHERE reference_id = ? AND entry_person_type = 'VISITOR'`,
        [entryId]
      );

      await connection.commit();
      return this.findById(entryId);
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  /**
   * Security records exit (transitions from ENTERED -> EXITED)
   */
  static async recordExit(entryId) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      await connection.query(
        `UPDATE visitor_entries 
         SET status = 'EXITED', check_out_time = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [entryId]
      );

      // Master Gate Activity audit log update
      await connection.query(
        `UPDATE gate_entries 
         SET exit_time = CURRENT_TIMESTAMP, direction = 'OUT'
         WHERE reference_id = ? AND entry_person_type = 'VISITOR'`,
        [entryId]
      );

      await connection.commit();
      return this.findById(entryId);
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  /**
   * Resident approves/rejects visitor request
   * approvalStatus: 'APPROVED' or 'REJECTED'
   */
  static async updateApprovalStatus(entryId, approvalStatus, approvedByUserId) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const newStatus = approvalStatus === 'APPROVED' ? 'APPROVED' : 'REJECTED';
      await connection.query(
        `UPDATE visitor_entries 
         SET approval_status = ?, status = ?, approved_by_user_id = ?
         WHERE id = ?`,
        [approvalStatus, newStatus, approvedByUserId, entryId]
      );

      // If rejected, mark gate_entries as DENIED
      if (newStatus === 'REJECTED') {
        await connection.query(
          `UPDATE gate_entries 
           SET status = 'DENIED', direction = 'OUT'
           WHERE reference_id = ? AND entry_person_type = 'VISITOR'`,
          [entryId]
        );
      }

      await connection.commit();
      return this.findById(entryId);
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  /**
   * Complete Visitor History with filtering
   * Supports: society_id, home_id, status, search, date_from, date_to
   */
  static async findAll(filters = {}) {
    const conditions = [];
    const params = [];

    if (filters.society_id) {
      conditions.push('h.society_id = ?');
      params.push(filters.society_id);
    }
    if (filters.home_id) {
      conditions.push('ve.home_id = ?');
      params.push(filters.home_id);
    }
    if (filters.status) {
      if (filters.status === 'ENTERED') {
        conditions.push("ve.status IN ('ENTERED', 'INSIDE')");
      } else if (filters.status === 'EXITED') {
        conditions.push("ve.status IN ('EXITED', 'CHECKED_OUT')");
      } else {
        conditions.push('ve.status = ?');
        params.push(filters.status);
      }
    }
    if (filters.search) {
      const q = `%${filters.search.trim()}%`;
      conditions.push('(v.full_name LIKE ? OR v.phone LIKE ? OR v.vehicle_number LIKE ? OR h.home_number LIKE ? OR ve.gate_pass_number LIKE ?)');
      params.push(q, q, q, q, q);
    }
    if (filters.date_from) {
      conditions.push('ve.created_at >= ?');
      params.push(filters.date_from);
    }
    if (filters.date_to) {
      conditions.push('ve.created_at <= ?');
      params.push(filters.date_to);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = Number(filters.limit) || 100;
    const offset = Number(filters.offset) || 0;

    const query = `
      SELECT 
        ve.id,
        ve.visitor_id,
        ve.home_id,
        ve.gate_id,
        ve.security_staff_id,
        ve.resident_user_id,
        ve.approved_by_user_id,
        ve.purpose,
        ve.entry_type,
        ve.otp_code,
        ve.gate_pass_number,
        ve.approval_status,
        ve.check_in_time AS entry_time,
        ve.check_out_time AS exit_time,
        CASE 
          WHEN ve.status = 'INSIDE' THEN 'ENTERED'
          WHEN ve.status = 'CHECKED_OUT' THEN 'EXITED'
          ELSE ve.status
        END AS status,
        ve.created_at,
        ve.updated_at,
        v.full_name AS visitor_name,
        v.phone AS phone_number,
        v.vehicle_number,
        v.photo_url,
        v.visitor_type,
        h.home_number,
        h.building_or_wing,
        g.name AS gate_name,
        g.gate_number,
        u_res.full_name AS resident_name,
        u_appr.full_name AS approved_by_name,
        u_sec.full_name AS security_staff_name
      FROM visitor_entries ve
      JOIN visitors v ON ve.visitor_id = v.id
      JOIN homes h ON ve.home_id = h.id
      LEFT JOIN gates g ON ve.gate_id = g.id
      LEFT JOIN security_staff ss ON ve.security_staff_id = ss.id
      LEFT JOIN users u_sec ON ss.user_id = u_sec.id
      LEFT JOIN users u_res ON ve.resident_user_id = u_res.id
      LEFT JOIN users u_appr ON ve.approved_by_user_id = u_appr.id
      ${whereClause}
      ORDER BY ve.created_at DESC
      LIMIT ? OFFSET ?
    `;

    params.push(limit, offset);
    const [rows] = await pool.query(query, params);
    return rows;
  }

  /**
   * Quick Lookup for Returning Visitor:
   * Finds latest visitor profile and past visit info by Phone Number OR Gate Pass Number
   */
  static async findVisitorByPhoneOrPass(societyId, queryStr) {
    if (!queryStr || !queryStr.trim()) return null;
    const cleanQuery = queryStr.trim();
    const cleanDigits = cleanQuery.replace(/\D/g, '');

    const sql = `
      SELECT 
        v.id AS visitor_id,
        v.full_name AS name,
        v.phone,
        v.vehicle_number,
        v.photo_url,
        v.visitor_type,
        ve.id AS last_entry_id,
        ve.gate_pass_number,
        ve.purpose,
        ve.home_id,
        h.home_number,
        h.building_or_wing,
        ve.status AS last_status,
        ve.check_in_time AS last_check_in_time
      FROM visitors v
      LEFT JOIN visitor_entries ve ON ve.visitor_id = v.id
      LEFT JOIN homes h ON ve.home_id = h.id
      WHERE (v.society_id = ? OR ? IS NULL)
        AND (
          v.phone = ?
          OR (LENGTH(?) >= 7 AND v.phone LIKE ?)
          OR ve.gate_pass_number = ?
          OR UPPER(ve.gate_pass_number) = UPPER(?)
        )
      ORDER BY ve.id DESC
      LIMIT 1
    `;

    const [rows] = await pool.query(sql, [
      societyId,
      societyId,
      cleanQuery,
      cleanDigits,
      `%${cleanDigits}%`,
      cleanQuery,
      cleanQuery,
    ]);

    if (!rows || rows.length === 0) return null;
    return rows[0];
  }
}

module.exports = VisitorRepository;
