const { pool } = require('../config/db');

/**
 * Worker Repository
 * Handles all database interactions for workers and many-to-many worker_home associations.
 */
class WorkerRepository {
  /**
   * Search workers across society (used for searchable dropdown & directory)
   */
  static async searchWorkers(societyId, { worker_type, search } = {}) {
    let query = `
      SELECT 
        w.id, w.society_id, w.full_name, w.phone, w.worker_type, 
        w.photo_url, w.address, w.pass_code, w.police_verified, w.status, w.aadhar_number,
        w.created_at, w.updated_at,
        s.name AS society_name,
        COUNT(DISTINCT CASE WHEN wh.status = 'ACTIVE' THEN wh.home_id END) AS active_homes_count,
        GROUP_CONCAT(DISTINCT CASE WHEN wh.status = 'ACTIVE' THEN h.home_number END ORDER BY h.home_number SEPARATOR ', ') AS active_home_numbers
      FROM workers w
      LEFT JOIN societies s ON w.society_id = s.id
      LEFT JOIN worker_home wh ON w.id = wh.worker_id
      LEFT JOIN homes h ON wh.home_id = h.id
      WHERE 1=1
    `;
    const params = [];

    if (societyId && societyId !== 'ALL') {
      query += ' AND w.society_id = ?';
      params.push(societyId);
    }

    if (worker_type && worker_type !== 'ALL') {
      query += ' AND w.worker_type = ?';
      params.push(worker_type);
    }

    if (search) {
      query += ' AND (w.full_name LIKE ? OR w.phone LIKE ? OR w.pass_code LIKE ? OR w.aadhar_number LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    query += ' GROUP BY w.id ORDER BY w.full_name ASC';

    const [rows] = await pool.query(query, params);
    return rows;
  }

  /**
   * Find all workers across society/societies with full home details (used by Admin)
   */
  static async findAllWorkers({ societyId, worker_type, search } = {}) {
    let query = `
      SELECT 
        w.id,
        w.id AS worker_id,
        w.society_id,
        w.full_name,
        w.phone,
        w.worker_type,
        w.photo_url,
        w.address,
        w.pass_code,
        w.police_verified,
        w.status AS worker_status,
        w.status,
        w.aadhar_number,
        w.created_at,
        w.updated_at,
        s.name AS society_name,
        s.code AS society_code,
        COUNT(DISTINCT CASE WHEN wh.status = 'ACTIVE' THEN wh.home_id END) AS active_homes_count,
        GROUP_CONCAT(DISTINCT CASE WHEN wh.status = 'ACTIVE' THEN h.home_number END ORDER BY h.home_number SEPARATOR ', ') AS all_assigned_homes
      FROM workers w
      LEFT JOIN societies s ON w.society_id = s.id
      LEFT JOIN worker_home wh ON w.id = wh.worker_id
      LEFT JOIN homes h ON wh.home_id = h.id
      WHERE 1=1
    `;
    const params = [];

    if (societyId && societyId !== 'ALL') {
      query += ' AND w.society_id = ?';
      params.push(societyId);
    }

    if (worker_type && worker_type !== 'ALL') {
      query += ' AND w.worker_type = ?';
      params.push(worker_type);
    }

    if (search) {
      query += ' AND (w.full_name LIKE ? OR w.phone LIKE ? OR w.pass_code LIKE ? OR w.aadhar_number LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    query += ' GROUP BY w.id ORDER BY w.created_at DESC';

    const [rows] = await pool.query(query, params);
    return rows;
  }

  /**
   * Find worker by phone number within society (to prevent duplicate records)
   */
  static async findByPhoneAndSociety(phone, societyId) {
    const cleanPhone = phone.trim();
    const query = `
      SELECT id, society_id, full_name, phone, worker_type, photo_url, address, pass_code, police_verified, status, aadhar_number
      FROM workers
      WHERE society_id = ? AND (phone = ? OR REPLACE(phone, ' ', '') = REPLACE(?, ' ', ''))
      LIMIT 1
    `;
    const [rows] = await pool.query(query, [societyId, cleanPhone, cleanPhone]);
    return rows[0] || null;
  }

  /**
   * Find worker by ID
   */
  static async findById(id) {
    const query = `
      SELECT 
        w.id, w.society_id, w.full_name, w.phone, w.worker_type, 
        w.photo_url, w.address, w.pass_code, w.police_verified, w.status, w.aadhar_number,
        w.created_at, w.updated_at,
        COUNT(DISTINCT CASE WHEN wh.status = 'ACTIVE' THEN wh.home_id END) AS active_homes_count,
        GROUP_CONCAT(DISTINCT CASE WHEN wh.status = 'ACTIVE' THEN h.home_number END ORDER BY h.home_number SEPARATOR ', ') AS active_home_numbers
      FROM workers w
      LEFT JOIN worker_home wh ON w.id = wh.worker_id
      LEFT JOIN homes h ON wh.home_id = h.id
      WHERE w.id = ?
      GROUP BY w.id
      LIMIT 1
    `;
    const [rows] = await pool.query(query, [id]);
    return rows[0] || null;
  }

  /**
   * Find all workers connected to a specific home
   */
  static async findWorkersByHomeId(homeId) {
    const query = `
      SELECT 
        wh.id AS assignment_id,
        wh.worker_id,
        wh.home_id,
        wh.start_date,
        wh.end_date,
        wh.expected_time_in,
        wh.expected_time_out,
        wh.status AS assignment_status,
        wh.created_at AS assigned_at,
        w.society_id,
        w.full_name,
        w.phone,
        w.worker_type,
        w.photo_url,
        w.address,
        w.pass_code,
        w.police_verified,
        w.status AS worker_status,
        w.aadhar_number,
        (
          SELECT GROUP_CONCAT(DISTINCT h2.home_number ORDER BY h2.home_number SEPARATOR ', ')
          FROM worker_home wh2
          JOIN homes h2 ON wh2.home_id = h2.id
          WHERE wh2.worker_id = w.id AND wh2.status = 'ACTIVE'
        ) AS all_assigned_homes
      FROM worker_home wh
      JOIN workers w ON wh.worker_id = w.id
      WHERE wh.home_id = ?
      ORDER BY wh.status ASC, w.full_name ASC
    `;
    const [rows] = await pool.query(query, [homeId]);
    return rows;
  }

  /**
   * Find worker assignment link by worker_id and home_id
   */
  static async findAssignment(workerId, homeId) {
    const query = `
      SELECT id, worker_id, home_id, assigned_by_resident_id, start_date, expected_time_in, expected_time_out, status
      FROM worker_home
      WHERE worker_id = ? AND home_id = ?
      LIMIT 1
    `;
    const [rows] = await pool.query(query, [workerId, homeId]);
    return rows[0] || null;
  }

  /**
   * Find worker assignment link by assignment ID
   */
  static async findAssignmentById(assignmentId) {
    const query = `
      SELECT wh.id, wh.worker_id, wh.home_id, wh.assigned_by_resident_id, 
             wh.start_date, wh.expected_time_in, wh.expected_time_out, wh.status,
             w.full_name, w.phone, w.worker_type, w.photo_url, w.address, w.aadhar_number,
             h.home_number
      FROM worker_home wh
      JOIN workers w ON wh.worker_id = w.id
      JOIN homes h ON wh.home_id = h.id
      WHERE wh.id = ?
      LIMIT 1
    `;
    const [rows] = await pool.query(query, [assignmentId]);
    return rows[0] || null;
  }

  /**
   * Insert a new worker record into master workers table
   */
  static async createWorker(data) {
    const aadharNum = data.aadhar_number ? data.aadhar_number.trim() : (data.government_id_number ? data.government_id_number.trim() : null);
    const query = `
      INSERT INTO workers (
        society_id, full_name, phone, worker_type, photo_url, address, pass_code, police_verified, status, aadhar_number, government_id_type, government_id_number
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const passCode = data.pass_code || `PASS-${data.worker_type?.substring(0, 3)}-${Date.now().toString().slice(-5)}`;
    const [result] = await pool.query(query, [
      data.society_id,
      data.full_name.trim(),
      data.phone.trim(),
      data.worker_type,
      data.photo_url || null,
      data.address ? data.address.trim() : null,
      passCode,
      data.police_verified !== undefined ? Boolean(data.police_verified) : true,
      data.status || 'ACTIVE',
      aadharNum,
      aadharNum ? 'AADHAAR' : (data.government_id_type || null),
      aadharNum || null,
    ]);

    return this.findById(result.insertId);
  }

  /**
   * Update master worker record
   */
  static async updateWorker(id, data) {
    const updates = [];
    const params = [];

    if (data.full_name) {
      updates.push('full_name = ?');
      params.push(data.full_name.trim());
    }
    if (data.phone) {
      updates.push('phone = ?');
      params.push(data.phone.trim());
    }
    if (data.worker_type) {
      updates.push('worker_type = ?');
      params.push(data.worker_type);
    }
    if (data.photo_url !== undefined) {
      updates.push('photo_url = ?');
      params.push(data.photo_url || null);
    }
    if (data.address !== undefined) {
      updates.push('address = ?');
      params.push(data.address ? data.address.trim() : null);
    }
    if (data.aadhar_number !== undefined || data.government_id_number !== undefined) {
      const aadharNum = data.aadhar_number !== undefined ? (data.aadhar_number ? data.aadhar_number.trim() : null) : (data.government_id_number ? data.government_id_number.trim() : null);
      updates.push('aadhar_number = ?', 'government_id_number = ?', 'government_id_type = ?');
      params.push(aadharNum, aadharNum, aadharNum ? 'AADHAAR' : null);
    }
    if (data.status) {
      updates.push('status = ?');
      params.push(data.status);
    }

    if (updates.length > 0) {
      params.push(id);
      await pool.query(
        `UPDATE workers SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        params
      );
    }

    return this.findById(id);
  }

  /**
   * Assign existing worker to a home (creates or reactivates worker_home record)
   */
  static async assignWorkerToHome({
    worker_id,
    home_id,
    assigned_by_resident_id = null,
    start_date = null,
    expected_time_in = null,
    expected_time_out = null,
    status = 'ACTIVE',
  }) {
    const existing = await this.findAssignment(worker_id, home_id);

    if (existing) {
      // Reactivate or update existing assignment
      const query = `
        UPDATE worker_home
        SET status = ?, 
            expected_time_in = COALESCE(?, expected_time_in),
            expected_time_out = COALESCE(?, expected_time_out),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      await pool.query(query, [status, expected_time_in, expected_time_out, existing.id]);
      return this.findAssignmentById(existing.id);
    }

    const query = `
      INSERT INTO worker_home (
        worker_id, home_id, assigned_by_resident_id, start_date, expected_time_in, expected_time_out, status
      ) VALUES (?, ?, ?, COALESCE(?, CURRENT_DATE), ?, ?, ?)
    `;
    const [result] = await pool.query(query, [
      worker_id,
      home_id,
      assigned_by_resident_id,
      start_date,
      expected_time_in || '08:00:00',
      expected_time_out || '19:00:00',
      status || 'ACTIVE',
    ]);

    return this.findAssignmentById(result.insertId);
  }

  /**
   * Update worker relationship/assignment for a home (timings, status)
   */
  static async updateAssignment(assignmentId, { expected_time_in, expected_time_out, status }) {
    const updates = [];
    const params = [];

    if (expected_time_in !== undefined) {
      updates.push('expected_time_in = ?');
      params.push(expected_time_in);
    }
    if (expected_time_out !== undefined) {
      updates.push('expected_time_out = ?');
      params.push(expected_time_out);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }

    if (updates.length > 0) {
      params.push(assignmentId);
      await pool.query(
        `UPDATE worker_home SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        params
      );
    }

    return this.findAssignmentById(assignmentId);
  }

  /**
   * Remove worker from home (deletes or marks terminated in worker_home)
   * Important: Does NOT delete the master worker record, preserving other homes!
   */
  static async removeWorkerFromHome(assignmentId) {
    const [result] = await pool.query('DELETE FROM worker_home WHERE id = ?', [assignmentId]);
    return result.affectedRows > 0;
  }

  /**
   * Delete worker master record from society (Admin action)
   */
  static async deleteWorker(workerId) {
    const [result] = await pool.query('DELETE FROM workers WHERE id = ?', [workerId]);
    return result.affectedRows > 0;
  }
}

module.exports = WorkerRepository;
