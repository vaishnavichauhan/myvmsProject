const { pool } = require('../config/db');

/**
 * Courier and Delivery Repository
 * Manages records for COURIER and DELIVERY types with resident permission logic
 * and master gate activity audit logging.
 */
class CourierDeliveryRepository {
  /**
   * Check permission for a home & retrieve resident roster
   */
  static async checkPermission(homeId, type = 'DELIVERY', targetUserId = null) {
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
      `SELECT COALESCE(courier_permission, 1) AS courier_permission,
              COALESCE(delivery_permission, 1) AS delivery_permission
       FROM resident_permissions
       WHERE home_id = ? LIMIT 1`,
      [home.id]
    );
    const homeCourierPerm = permRows.length > 0 ? Boolean(permRows[0].courier_permission) : true;
    const homeDeliveryPerm = permRows.length > 0 ? Boolean(permRows[0].delivery_permission) : true;

    // 3. Get all residents belonging to this home
    const [residents] = await pool.query(
      `SELECT 
         u.id AS user_id,
         u.full_name,
         u.role,
         u.phone
       FROM (
         SELECT r.user_id FROM residents r WHERE r.home_id = ? AND r.status = 'ACTIVE'
         UNION
         SELECT fm.user_id FROM family_members fm WHERE fm.home_id = ? AND fm.status = 'ACTIVE' AND fm.user_id IS NOT NULL
       ) home_users
       JOIN users u ON home_users.user_id = u.id
       ORDER BY FIELD(u.role, 'OWNER', 'TENANT', 'FAMILY_MEMBER') ASC, u.id ASC`,
      [home.id, home.id]
    );

    const checkType = (type || 'DELIVERY').toUpperCase();
    const isCourier = checkType === 'COURIER';

    let targetResident = null;
    if (residents.length > 0) {
      if (targetUserId) {
        targetResident = residents.find((r) => r.user_id === Number(targetUserId)) || residents[0];
      } else {
        targetResident = residents[0];
      }
    }

    // Evaluate permission for home
    const permValue = isCourier ? homeCourierPerm : homeDeliveryPerm;
    const permissionAllowed = permValue;
    const requiresApproval = !permValue;

    const primaryContact = residents.find(r => r.role === 'OWNER') ||
                           residents.find(r => r.role === 'TENANT') ||
                           targetResident || null;

    return {
      home: {
        id: home.id,
        home_number: home.home_number,
        building_or_wing: home.building_or_wing,
        society_id: home.society_id,
      },
      type: checkType,
      primary_contact: primaryContact
        ? {
            user_id: primaryContact.user_id,
            name: primaryContact.full_name,
            phone: primaryContact.phone,
            role: primaryContact.role,
          }
        : null,
      residents: residents.map((r) => ({
        user_id: r.user_id,
        name: r.full_name,
        phone: r.phone,
        role: r.role,
        courier_permission: homeCourierPerm ? 'YES' : 'NO',
        delivery_permission: homeDeliveryPerm ? 'YES' : 'NO',
      })),
      selected_resident: targetResident
        ? {
            user_id: targetResident.user_id,
            name: targetResident.full_name,
            phone: targetResident.phone,
            role: targetResident.role,
            courier_permission: homeCourierPerm ? 'YES' : 'NO',
            delivery_permission: homeDeliveryPerm ? 'YES' : 'NO',
          }
        : null,
      permission_allowed: permissionAllowed,
      requires_approval: requiresApproval,
      rule_message: permissionAllowed
        ? `Allowed according to ${checkType.toLowerCase()} permission.`
        : `${checkType === 'COURIER' ? 'Courier' : 'Delivery'} permission = NO. Security must contact ${targetResident ? `${targetResident.full_name} (${targetResident.phone || 'No phone'})` : 'resident'}.`,
    };
  }

  /**
   * Create a Courier or Delivery record & log to master gate activity
   */
  static async create(data) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const {
        society_id,
        home_id,
        gate_id = null,
        security_staff_id = null,
        type,
        company_or_person_name,
        phone,
        vehicle_number = null,
        status = 'PENDING',
        resident_user_id = null,
        approved_by_user_id = null,
        notes = null,
      } = data;

      const entryTime = status === 'ENTERED' ? new Date() : null;

      const [insertResult] = await connection.query(
        `INSERT INTO courier_deliveries (
          society_id, home_id, gate_id, security_staff_id, type,
          company_or_person_name, phone, vehicle_number, entry_time,
          status, resident_user_id, approved_by_user_id, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          society_id,
          home_id,
          gate_id || null,
          security_staff_id || null,
          type,
          company_or_person_name.trim(),
          phone.trim(),
          vehicle_number ? vehicle_number.trim().toUpperCase() : null,
          entryTime,
          status,
          resident_user_id || null,
          approved_by_user_id || null,
          notes || null,
        ]
      );

      const recordId = insertResult.insertId;

      // Master Gate Activity Audit Log
      // Only log IN direction if entering/approved
      let gateStatus = 'PENDING';
      if (status === 'ENTERED' || status === 'APPROVED') {
        gateStatus = 'APPROVED';
      }

      await connection.query(
        `INSERT INTO gate_entries (
          society_id, gate_id, security_staff_id, entry_person_type,
          person_name, person_phone, target_home_id, vehicle_number,
          entry_time, direction, reference_id, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'IN', ?, ?)`,
        [
          society_id,
          gate_id || 1,
          security_staff_id || null,
          type, // 'COURIER' or 'DELIVERY'
          company_or_person_name.trim(),
          phone.trim(),
          home_id,
          vehicle_number ? vehicle_number.trim().toUpperCase() : null,
          entryTime || new Date(),
          recordId,
          gateStatus,
        ]
      );

      await connection.commit();
      return this.findById(recordId);
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  /**
   * Find record by ID
   */
  static async findById(id) {
    const [rows] = await pool.query(
      `SELECT 
         cd.id,
         cd.society_id,
         cd.home_id,
         cd.gate_id,
         cd.security_staff_id,
         cd.type,
         cd.company_or_person_name,
         cd.phone,
         cd.vehicle_number,
         cd.entry_time,
         cd.exit_time,
         cd.status,
         cd.resident_user_id,
         cd.approved_by_user_id,
         cd.notes,
         cd.created_at,
         cd.updated_at,
         h.home_number,
         h.building_or_wing,
         s.name AS society_name,
         g.name AS gate_name,
         u_res.full_name AS resident_name,
         u_app.full_name AS approved_by_name,
         sec_user.full_name AS recorded_by_staff_name
       FROM courier_deliveries cd
       JOIN homes h ON cd.home_id = h.id
       JOIN societies s ON cd.society_id = s.id
       LEFT JOIN gates g ON cd.gate_id = g.id
       LEFT JOIN users u_res ON cd.resident_user_id = u_res.id
       LEFT JOIN users u_app ON cd.approved_by_user_id = u_app.id
       LEFT JOIN security_staff ss ON cd.security_staff_id = ss.id
       LEFT JOIN users sec_user ON ss.user_id = sec_user.id
       WHERE cd.id = ? LIMIT 1`,
      [id]
    );

    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Record entry (Approved/Allowed -> ENTERED)
   */
  static async recordEntry(id, gateId = null) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      await connection.query(
        `UPDATE courier_deliveries 
         SET status = 'ENTERED',
             entry_time = CURRENT_TIMESTAMP,
             gate_id = COALESCE(?, gate_id)
         WHERE id = ?`,
        [gateId || null, id]
      );

      // Update gate_entries audit log
      await connection.query(
        `UPDATE gate_entries 
         SET status = 'APPROVED', entry_time = CURRENT_TIMESTAMP
         WHERE reference_id = ? AND entry_person_type IN ('COURIER', 'DELIVERY')`,
        [id]
      );

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
   * Record exit (ENTERED -> EXITED)
   */
  static async recordExit(id) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      await connection.query(
        `UPDATE courier_deliveries 
         SET status = 'EXITED',
             exit_time = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [id]
      );

      // Update gate_entries audit log
      await connection.query(
        `UPDATE gate_entries 
         SET exit_time = CURRENT_TIMESTAMP, direction = 'OUT'
         WHERE reference_id = ? AND entry_person_type IN ('COURIER', 'DELIVERY')`,
        [id]
      );

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
   * Resident approval / rejection
   */
  static async respondToApproval(id, decision, approverUserId, notes = null) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const newStatus = decision === 'APPROVED' ? 'APPROVED' : 'REJECTED';

      await connection.query(
        `UPDATE courier_deliveries 
         SET status = ?,
             approved_by_user_id = ?,
             notes = COALESCE(?, notes)
         WHERE id = ?`,
        [newStatus, approverUserId, notes, id]
      );

      // If rejected, update gate_entries status
      if (newStatus === 'REJECTED') {
        await connection.query(
          `UPDATE gate_entries 
           SET status = 'DENIED', direction = 'OUT'
           WHERE reference_id = ? AND entry_person_type IN ('COURIER', 'DELIVERY')`,
          [id]
        );
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
   * Retrieve complete history with filters
   */
  static async getHistory(filters = {}) {
    const {
      society_id = 1,
      home_id = null,
      type = null,
      status = null,
      search = null,
      page = 1,
      limit = 20,
    } = filters;

    const conditions = ['cd.society_id = ?'];
    const params = [society_id];

    if (home_id) {
      conditions.push('cd.home_id = ?');
      params.push(Number(home_id));
    }

    if (type && type !== 'ALL') {
      conditions.push('cd.type = ?');
      params.push(type.toUpperCase());
    }

    if (status && status !== 'ALL') {
      conditions.push('cd.status = ?');
      params.push(status.toUpperCase());
    }

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      conditions.push(`(
        cd.company_or_person_name LIKE ? 
        OR cd.phone LIKE ? 
        OR cd.vehicle_number LIKE ? 
        OR h.home_number LIKE ?
      )`);
      params.push(q, q, q, q);
    }

    const whereClause = conditions.join(' AND ');

    // Count
    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total 
       FROM courier_deliveries cd
       JOIN homes h ON cd.home_id = h.id
       WHERE ${whereClause}`,
      params
    );
    const total = countRows[0].total;

    // Data query
    const offset = (Number(page) - 1) * Number(limit);
    const queryParams = [...params, Number(limit), offset];

    const [rows] = await pool.query(
      `SELECT 
         cd.id,
         cd.society_id,
         cd.home_id,
         cd.gate_id,
         cd.security_staff_id,
         cd.type,
         cd.company_or_person_name,
         cd.phone,
         cd.vehicle_number,
         cd.entry_time,
         cd.exit_time,
         cd.status,
         cd.resident_user_id,
         cd.approved_by_user_id,
         cd.notes,
         cd.created_at,
         cd.updated_at,
         h.home_number,
         h.building_or_wing,
         s.name AS society_name,
         g.name AS gate_name,
         u_res.full_name AS resident_name,
         u_app.full_name AS approved_by_name,
         sec_user.full_name AS recorded_by_staff_name
       FROM courier_deliveries cd
       JOIN homes h ON cd.home_id = h.id
       JOIN societies s ON cd.society_id = s.id
       LEFT JOIN gates g ON cd.gate_id = g.id
       LEFT JOIN users u_res ON cd.resident_user_id = u_res.id
       LEFT JOIN users u_app ON cd.approved_by_user_id = u_app.id
       LEFT JOIN security_staff ss ON cd.security_staff_id = ss.id
       LEFT JOIN users sec_user ON ss.user_id = sec_user.id
       WHERE ${whereClause}
       ORDER BY cd.created_at DESC
       LIMIT ? OFFSET ?`,
      queryParams
    );

    return {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
      entries: rows,
    };
  }
}

module.exports = CourierDeliveryRepository;
