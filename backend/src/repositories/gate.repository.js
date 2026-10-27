const { pool } = require('../config/db');

/**
 * Gate & Security Duty Roster Repository
 */
class GateRepository {
  /**
   * Create a new gate (Admin only)
   */
  static async create(data) {
    const {
      society_id = 1,
      name,
      gate_number,
      location,
      status = 'ACTIVE',
      gate_type = 'MAIN_ENTRY',
      is_automated_barrier = false,
      allows_entry_registration = true,
    } = data;

    const [result] = await pool.query(
      `INSERT INTO gates (
        society_id, name, gate_number, location, status, gate_type, is_automated_barrier, allows_entry_registration
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        society_id,
        name.trim(),
        gate_number ? String(gate_number).trim() : null,
        location ? location.trim() : null,
        status || 'ACTIVE',
        gate_type || 'MAIN_ENTRY',
        is_automated_barrier ? 1 : 0,
        allows_entry_registration === undefined ? 1 : (allows_entry_registration ? 1 : 0),
      ]
    );

    return this.findById(result.insertId);
  }

  /**
   * Find all gates in a society with their active assigned security staff (multiple guards support)
   */
  static async findAll(societyId, filters = {}) {
    const gatesQuery = `
      SELECT 
        g.id,
        g.society_id,
        s.name AS society_name,
        g.name,
        g.gate_number,
        g.location,
        g.gate_type,
        g.is_automated_barrier,
        g.allows_entry_registration,
        g.status,
        g.created_at,
        g.updated_at
      FROM gates g
      LEFT JOIN societies s ON g.society_id = s.id
      WHERE g.society_id = ?
      ORDER BY g.id ASC
    `;

    const [gates] = await pool.query(gatesQuery, [societyId]);

    // Fetch active assignments for all gates in society
    const assignmentsQuery = `
      SELECT 
        sg.id AS assignment_id,
        sg.gate_id,
        sg.shift,
        sg.status AS assignment_status,
        sg.assigned_date,
        sg.check_in_time,
        ss.id AS security_staff_id,
        ss.employee_id,
        ss.badge_number,
        ss.agency_name,
        u.id AS security_user_id,
        u.full_name AS security_name,
        u.phone AS security_phone
      FROM security_gate sg
      JOIN security_staff ss ON sg.security_staff_id = ss.id
      JOIN users u ON ss.user_id = u.id
      WHERE sg.status IN ('ON_DUTY', 'ASSIGNED')
      ORDER BY sg.id ASC
    `;

    const [assignments] = await pool.query(assignmentsQuery);

    return gates.map((g) => {
      const gateGuards = assignments.filter((a) => a.gate_id === g.id);
      const firstGuard = gateGuards[0] || null;

      return {
        ...g,
        allows_entry_registration: Boolean(g.allows_entry_registration),
        is_automated_barrier: Boolean(g.is_automated_barrier),
        assigned_guards: gateGuards,
        // Legacy single-guard fields compatibility
        assignment_id: firstGuard?.assignment_id || null,
        shift: firstGuard?.shift || null,
        assignment_status: firstGuard?.assignment_status || null,
        assigned_date: firstGuard?.assigned_date || null,
        check_in_time: firstGuard?.check_in_time || null,
        security_staff_id: firstGuard?.security_staff_id || null,
        employee_id: firstGuard?.employee_id || null,
        badge_number: firstGuard?.badge_number || null,
        agency_name: firstGuard?.agency_name || null,
        security_user_id: firstGuard?.security_user_id || null,
        security_name: gateGuards.map((x) => x.security_name).join(', ') || null,
        security_phone: firstGuard?.security_phone || null,
        assigned_security: firstGuard
          ? {
              name: gateGuards.map((x) => x.security_name).join(', '),
              shift: firstGuard.shift || 'Morning',
              phone: firstGuard.security_phone,
              badge_number: firstGuard.badge_number || null,
              agency_name: firstGuard.agency_name || null,
              status: firstGuard.assignment_status || 'ON_DUTY',
            }
          : null,
      };
    });
  }

  /**
   * Find single gate by ID
   */
  static async findById(id) {
    const query = `
      SELECT 
        g.id,
        g.society_id,
        g.name,
        g.gate_number,
        g.location,
        g.gate_type,
        g.is_automated_barrier,
        g.allows_entry_registration,
        g.status,
        g.created_at,
        g.updated_at
      FROM gates g
      WHERE g.id = ?
      LIMIT 1
    `;

    const [rows] = await pool.query(query, [id]);
    if (!rows[0]) return null;

    const gate = rows[0];

    const [assignments] = await pool.query(
      `SELECT 
        sg.id AS assignment_id,
        sg.gate_id,
        sg.shift,
        sg.status AS assignment_status,
        sg.assigned_date,
        sg.check_in_time,
        ss.id AS security_staff_id,
        ss.employee_id,
        ss.badge_number,
        ss.agency_name,
        u.id AS security_user_id,
        u.full_name AS security_name,
        u.phone AS security_phone
      FROM security_gate sg
      JOIN security_staff ss ON sg.security_staff_id = ss.id
      JOIN users u ON ss.user_id = u.id
      WHERE sg.gate_id = ? AND sg.status IN ('ON_DUTY', 'ASSIGNED')
      ORDER BY sg.id ASC`,
      [id]
    );

    const firstGuard = assignments[0] || null;

    return {
      ...gate,
      allows_entry_registration: Boolean(gate.allows_entry_registration),
      is_automated_barrier: Boolean(gate.is_automated_barrier),
      assigned_guards: assignments,
      assignment_id: firstGuard?.assignment_id || null,
      shift: firstGuard?.shift || null,
      assignment_status: firstGuard?.assignment_status || null,
      security_staff_id: firstGuard?.security_staff_id || null,
      employee_id: firstGuard?.employee_id || null,
      security_name: assignments.map((x) => x.security_name).join(', ') || null,
      security_phone: firstGuard?.security_phone || null,
    };
  }

  /**
   * Update gate details
   */
  static async update(id, data) {
    const updates = [];
    const params = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      params.push(data.name.trim());
    }
    if (data.gate_number !== undefined) {
      updates.push('gate_number = ?');
      params.push(data.gate_number ? String(data.gate_number).trim() : null);
    }
    if (data.location !== undefined) {
      updates.push('location = ?');
      params.push(data.location ? data.location.trim() : null);
    }
    if (data.status !== undefined) {
      updates.push('status = ?');
      params.push(data.status);
    }
    if (data.gate_type !== undefined) {
      updates.push('gate_type = ?');
      params.push(data.gate_type);
    }
    if (data.is_automated_barrier !== undefined) {
      updates.push('is_automated_barrier = ?');
      params.push(data.is_automated_barrier ? 1 : 0);
    }
    if (data.allows_entry_registration !== undefined) {
      updates.push('allows_entry_registration = ?');
      params.push(data.allows_entry_registration ? 1 : 0);
    }

    if (updates.length === 0) return this.findById(id);

    params.push(id);
    await pool.query(`UPDATE gates SET ${updates.join(', ')} WHERE id = ?`, params);
    return this.findById(id);
  }

  /**
   * Delete gate
   */
  static async delete(id) {
    const [result] = await pool.query('DELETE FROM gates WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  /**
   * Security Self Check-In:
   * Guard chooses a gate to check in.
   * Records check_in_time as CURRENT_TIMESTAMP, status = 'ON_DUTY'.
   * This is the guard's IN time at that gate.
   */
  static async securitySelfCheckIn({ security_staff_id, gate_id }) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Complete any previous active assignment for this specific guard
      await connection.query(
        `UPDATE security_gate 
         SET status = 'COMPLETED', check_out_time = CURRENT_TIMESTAMP
         WHERE security_staff_id = ? AND status IN ('ON_DUTY', 'ASSIGNED')`,
        [security_staff_id]
      );

      // Determine shift based on current hour
      const hour = new Date().getHours();
      let shift = 'MORNING';
      if (hour >= 14 && hour < 22) {
        shift = 'EVENING';
      } else if (hour >= 22 || hour < 6) {
        shift = 'NIGHT';
      }

      // Insert new duty assignment with check_in_time = CURRENT_TIMESTAMP
      const [res] = await connection.query(
        `INSERT INTO security_gate (
          security_staff_id, gate_id, assigned_date, shift, check_in_time, status
        ) VALUES (?, ?, CURRENT_DATE, ?, CURRENT_TIMESTAMP, 'ON_DUTY')`,
        [security_staff_id, gate_id, shift]
      );

      await connection.commit();
      return {
        assignment_id: res.insertId,
        security_staff_id,
        gate_id,
        shift,
        check_in_time: new Date(),
        status: 'ON_DUTY',
      };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  /**
   * Security Self Check-Out:
   * Guard exits gate (or logs out of the app).
   * Records check_out_time as CURRENT_TIMESTAMP, status = 'COMPLETED'.
   * This is the guard's EXIT gate / out time.
   */
  static async securitySelfCheckOut(securityStaffId) {
    const [result] = await pool.query(
      `UPDATE security_gate 
       SET status = 'COMPLETED', check_out_time = CURRENT_TIMESTAMP
       WHERE security_staff_id = ? AND status IN ('ON_DUTY', 'ASSIGNED')`,
      [securityStaffId]
    );
    return result.affectedRows > 0;
  }

  /**
   * Assign security staff to gate (Legacy helper)
   */
  static async assignSecurityStaff(data) {
    const {
      security_staff_id,
      gate_id,
      shift = 'MORNING',
      assigned_date = null,
      status = 'ON_DUTY',
    } = data;

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Complete previous active assignment for this specific guard (allows multiple guards on gate)
      await connection.query(
        `UPDATE security_gate 
         SET status = 'COMPLETED', check_out_time = CURRENT_TIMESTAMP
         WHERE security_staff_id = ? AND status IN ('ON_DUTY', 'ASSIGNED')`,
        [security_staff_id]
      );

      // Insert new duty assignment
      const [res] = await connection.query(
        `INSERT INTO security_gate (
          security_staff_id, gate_id, assigned_date, shift, check_in_time, status
        ) VALUES (?, ?, COALESCE(?, CURRENT_DATE), ?, CURRENT_TIMESTAMP, ?)`,
        [security_staff_id, gate_id, assigned_date, shift, status]
      );

      await connection.commit();
      return {
        assignment_id: res.insertId,
        security_staff_id,
        gate_id,
        shift,
        status,
      };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  /**
   * Unassign security staff from gate
   */
  static async unassignSecurityStaff(assignmentId) {
    const [result] = await pool.query(
      `UPDATE security_gate 
       SET status = 'COMPLETED', check_out_time = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [assignmentId]
    );
    return result.affectedRows > 0;
  }

  /**
   * Security Guard view: Find assigned gate for the logged in security guard
   * "Security should see their assigned gate."
   */
  static async findAssignedGateForSecurity(userId) {
    const query = `
      SELECT 
        g.id AS gate_id,
        g.name AS gate_name,
        g.gate_number,
        g.location,
        g.status AS gate_status,
        g.gate_type,
        g.allows_entry_registration,
        sg.id AS assignment_id,
        sg.shift,
        sg.status AS assignment_status,
        sg.assigned_date,
        sg.check_in_time,
        ss.id AS security_staff_id,
        ss.employee_id,
        ss.badge_number,
        u.full_name AS security_name
      FROM security_staff ss
      JOIN users u ON ss.user_id = u.id
      JOIN security_gate sg 
        ON ss.id = sg.security_staff_id 
        AND sg.status IN ('ON_DUTY', 'ASSIGNED')
      JOIN gates g ON sg.gate_id = g.id
      WHERE ss.user_id = ?
      ORDER BY sg.id DESC
      LIMIT 1
    `;

    const [rows] = await pool.query(query, [userId]);
    return rows[0] || null;
  }

  /**
   * Residents view: Available society gates and assigned security staff
   * Security information shown to residents:
   * - Security Name
   * - Gate
   * - Call action
   * DO NOT expose security passwords or unnecessary private information.
   */
  static async getGatesForResidents(societyId) {
    const gatesQuery = `
      SELECT 
        g.id AS gate_id,
        g.id,
        g.society_id,
        s.name AS society_name,
        g.name AS gate_name,
        g.name,
        g.gate_number,
        g.location,
        g.status AS gate_status,
        g.status,
        g.gate_type,
        g.is_automated_barrier
      FROM gates g
      LEFT JOIN societies s ON g.society_id = s.id
      WHERE g.society_id = ? AND g.status != 'CLOSED'
      ORDER BY g.id ASC
    `;

    const [gates] = await pool.query(gatesQuery, [societyId]);

    const assignmentsQuery = `
      SELECT 
        sg.id AS assignment_id,
        sg.gate_id,
        sg.shift,
        sg.status AS assignment_status,
        sg.assigned_date,
        sg.check_in_time,
        ss.id AS security_staff_id,
        ss.employee_id,
        ss.badge_number,
        ss.agency_name,
        u.id AS security_user_id,
        u.full_name AS security_name,
        u.phone AS security_phone
      FROM security_gate sg
      JOIN security_staff ss ON sg.security_staff_id = ss.id
      JOIN users u ON ss.user_id = u.id
      WHERE sg.status IN ('ON_DUTY', 'ASSIGNED')
      ORDER BY sg.id ASC
    `;

    const [assignments] = await pool.query(assignmentsQuery);

    return gates.map((row) => {
      const gateGuards = assignments.filter((a) => a.gate_id === row.id || a.gate_id === row.gate_id);
      const firstGuard = gateGuards[0] || null;

      return {
        id: row.gate_id,
        gate_id: row.gate_id,
        society_id: row.society_id,
        society_name: row.society_name || 'Society',
        name: row.gate_name,
        gate_name: row.gate_name,
        gate_number: row.gate_number || String(row.gate_id),
        location: row.location || 'Society Perimeter',
        status: row.gate_status,
        gate_status: row.gate_status,
        gate_type: row.gate_type,
        is_automated_barrier: Boolean(row.is_automated_barrier),
        assigned_guards: gateGuards,
        security_name: gateGuards.map((x) => x.security_name).join(', ') || null,
        security_phone: firstGuard?.security_phone || null,
        badge_number: firstGuard?.badge_number || null,
        agency_name: firstGuard?.agency_name || null,
        shift: firstGuard?.shift || (firstGuard ? 'Morning' : null),
        assignment_status: firstGuard?.assignment_status || null,
        check_in_time: firstGuard?.check_in_time || null,
        assigned_security: firstGuard
          ? {
              name: gateGuards.map((x) => x.security_name).join(', '),
              shift: firstGuard.shift || 'Morning',
              phone: firstGuard.security_phone,
              badge_number: firstGuard.badge_number || null,
              agency_name: firstGuard.agency_name || null,
              status: firstGuard.assignment_status || 'ON_DUTY',
            }
          : null,
      };
    });
  }
}

module.exports = GateRepository;
