const { pool } = require('../config/db');

class SpecialChargeRepository {
  /**
   * Create a special charge and immediately generate assignments for all active homes in the society.
   */
  static async createCharge(data, createdByUserId) {
    const {
      society_id,
      committee_id = null,
      committee_name = null,
      title,
      category = 'REPAIR',
      amount,
      due_date,
      description = null,
      target_scope = 'ALL_HOMES',
    } = data;

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Insert special charge record
      const [insertResult] = await connection.query(
        `INSERT INTO special_charges (
          society_id, committee_id, committee_name, created_by_user_id,
          title, category, amount, due_date, description, target_scope, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')`,
        [
          society_id,
          committee_id || null,
          committee_name || null,
          createdByUserId,
          title,
          category,
          Number(amount),
          due_date,
          description || null,
          target_scope,
        ]
      );

      const chargeId = insertResult.insertId;

      // 2. Query all active homes in this society
      const [homes] = await connection.query(
        `SELECT h.id AS home_id,
                (SELECT r.user_id FROM residents r WHERE r.home_id = h.id AND r.status = 'ACTIVE' LIMIT 1) AS resident_user_id
         FROM homes h
         WHERE h.society_id = ? AND h.status = 'ACTIVE'`,
        [society_id]
      );

      let assignedCount = 0;
      if (homes.length > 0) {
        const values = homes.map((h) => [
          chargeId,
          society_id,
          h.home_id,
          h.resident_user_id || null,
          Number(amount),
          0.00,
          Number(amount),
          'PENDING',
        ]);

        await connection.query(
          `INSERT INTO special_charge_assignments (
            charge_id, society_id, home_id, resident_user_id,
            amount, paid_amount, balance_amount, status
          ) VALUES ?`,
          [values]
        );
        assignedCount = homes.length;
      }

      await connection.commit();

      const createdCharge = await this.findChargeById(chargeId);
      return {
        ...createdCharge,
        assigned_homes_count: assignedCount,
      };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  /**
   * Find a special charge by ID with aggregation metrics.
   */
  static async findChargeById(chargeId) {
    const [rows] = await pool.query(
      `SELECT sc.*,
              s.name AS society_name,
              u.full_name AS created_by_name,
              COUNT(sca.id) AS total_homes_assigned,
              SUM(CASE WHEN sca.status = 'PAID' THEN 1 ELSE 0 END) AS total_homes_paid,
              SUM(CASE WHEN sca.status != 'PAID' THEN 1 ELSE 0 END) AS total_homes_pending,
              COALESCE(SUM(sca.amount), 0) AS total_target_amount,
              COALESCE(SUM(sca.paid_amount), 0) AS total_collected_amount,
              COALESCE(SUM(sca.balance_amount), 0) AS total_pending_amount
       FROM special_charges sc
       JOIN societies s ON sc.society_id = s.id
       JOIN users u ON sc.created_by_user_id = u.id
       LEFT JOIN special_charge_assignments sca ON sc.id = sca.charge_id
       WHERE sc.id = ?
       GROUP BY sc.id`,
      [chargeId]
    );

    return rows[0] || null;
  }

  /**
   * List all special charges with metrics.
   */
  static async findAllCharges(societyId = null, filters = {}) {
    let query = `
      SELECT sc.*,
             s.name AS society_name,
             u.full_name AS created_by_name,
             COUNT(sca.id) AS total_homes_assigned,
             SUM(CASE WHEN sca.status = 'PAID' THEN 1 ELSE 0 END) AS total_homes_paid,
             SUM(CASE WHEN sca.status != 'PAID' THEN 1 ELSE 0 END) AS total_homes_pending,
             COALESCE(SUM(sca.amount), 0) AS total_target_amount,
             COALESCE(SUM(sca.paid_amount), 0) AS total_collected_amount,
             COALESCE(SUM(sca.balance_amount), 0) AS total_pending_amount
      FROM special_charges sc
      JOIN societies s ON sc.society_id = s.id
      JOIN users u ON sc.created_by_user_id = u.id
      LEFT JOIN special_charge_assignments sca ON sc.id = sca.charge_id
      WHERE 1=1
    `;
    const params = [];

    if (societyId && String(societyId) !== 'ALL') {
      query += ` AND sc.society_id = ?`;
      params.push(societyId);
    }

    if (filters.status && filters.status !== 'ALL') {
      query += ` AND sc.status = ?`;
      params.push(filters.status);
    }

    if (filters.category && filters.category !== 'ALL') {
      query += ` AND sc.category = ?`;
      params.push(filters.category);
    }

    if (filters.committee_id) {
      query += ` AND sc.committee_id = ?`;
      params.push(filters.committee_id);
    }

    query += ` GROUP BY sc.id ORDER BY sc.id DESC`;

    const [rows] = await pool.query(query, params);
    return rows;
  }

  /**
   * List all homes/assignments for a particular charge.
   */
  static async findAssignmentsByCharge(chargeId, filters = {}) {
    let query = `
      SELECT sca.*,
             h.home_number,
             h.building_or_wing,
             h.floor,
             h.home_type,
             u.full_name AS resident_name,
             u.phone AS resident_phone,
             r.resident_type,
             sc.title AS charge_title,
             sc.category AS charge_category,
             sc.due_date AS charge_due_date
      FROM special_charge_assignments sca
      JOIN homes h ON sca.home_id = h.id
      JOIN special_charges sc ON sca.charge_id = sc.id
      LEFT JOIN residents r ON sca.home_id = r.home_id AND r.status = 'ACTIVE'
      LEFT JOIN users u ON r.user_id = u.id
      WHERE sca.charge_id = ?
    `;
    const params = [chargeId];

    if (filters.status && filters.status !== 'ALL') {
      query += ` AND sca.status = ?`;
      params.push(filters.status);
    }

    if (filters.home_id) {
      query += ` AND sca.home_id = ?`;
      params.push(filters.home_id);
    }

    query += ` ORDER BY CAST(REGEXP_REPLACE(h.home_number, '[^0-9]', '') AS UNSIGNED) ASC, h.home_number ASC`;

    const [rows] = await pool.query(query, params);
    return rows;
  }

  /**
   * Find special charge assignments for a resident (by resident's user ID).
   */
  static async findAssignmentsForResident(userId, societyId = null) {
    const [residentRows] = await pool.query(
      `SELECT r.home_id, h.society_id
       FROM residents r
       JOIN homes h ON r.home_id = h.id
       WHERE r.user_id = ? AND r.status = 'ACTIVE'
       LIMIT 1`,
      [userId]
    );

    if (residentRows.length === 0) {
      return [];
    }

    const homeId = residentRows[0].home_id;

    let query = `
      SELECT sca.*,
             sc.title AS charge_title,
             sc.category AS charge_category,
             sc.description AS charge_description,
             sc.due_date AS charge_due_date,
             sc.committee_name,
             sc.status AS charge_status,
             s.name AS society_name,
             h.home_number,
             h.home_type
      FROM special_charge_assignments sca
      JOIN special_charges sc ON sca.charge_id = sc.id
      JOIN homes h ON sca.home_id = h.id
      JOIN societies s ON sca.society_id = s.id
      WHERE sca.home_id = ? AND sc.status = 'ACTIVE'
      ORDER BY sca.status ASC, sc.due_date ASC, sca.id DESC
    `;

    const [rows] = await pool.query(query, [homeId]);
    return rows;
  }

  /**
   * Record payment for a specific home's special charge assignment.
   */
  static async recordPayment(data, collectedByUserId = null) {
    const {
      assignment_id,
      amount,
      payment_method = 'UPI',
      transaction_reference = null,
      remarks = null,
    } = data;

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [assignments] = await connection.query(
        `SELECT sca.*, sc.title AS charge_title, h.home_number, s.name AS society_name
         FROM special_charge_assignments sca
         JOIN special_charges sc ON sca.charge_id = sc.id
         JOIN homes h ON sca.home_id = h.id
         JOIN societies s ON sca.society_id = s.id
         WHERE sca.id = ? FOR UPDATE`,
        [assignment_id]
      );

      if (assignments.length === 0) {
        throw new Error('Special charge assignment record not found');
      }

      const assignment = assignments[0];
      const payAmount = Number(amount);
      if (payAmount <= 0) {
        throw new Error('Payment amount must be greater than zero');
      }

      const receiptNumber = `RCP-SC-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

      // 1. Insert into special_charge_payments
      const [payResult] = await connection.query(
        `INSERT INTO special_charge_payments (
          assignment_id, charge_id, society_id, home_id, paid_by_user_id,
          receipt_number, amount, payment_method, transaction_reference,
          collected_by_user_id, remarks
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          assignment.id,
          assignment.charge_id,
          assignment.society_id,
          assignment.home_id,
          assignment.resident_user_id,
          receiptNumber,
          payAmount,
          payment_method,
          transaction_reference,
          collectedByUserId,
          remarks,
        ]
      );

      // 2. Update assignment status and balance
      const newPaidAmount = Number(assignment.paid_amount) + payAmount;
      const newBalanceAmount = Math.max(0, Number(assignment.amount) - newPaidAmount);
      const newStatus = newBalanceAmount === 0 ? 'PAID' : 'PARTIALLY_PAID';

      await connection.query(
        `UPDATE special_charge_assignments
         SET paid_amount = ?,
             balance_amount = ?,
             status = ?,
             paid_date = CURRENT_TIMESTAMP,
             payment_method = ?,
             transaction_reference = ?,
             receipt_number = ?,
             notes = ?
         WHERE id = ?`,
        [
          newPaidAmount,
          newBalanceAmount,
          newStatus,
          payment_method,
          transaction_reference,
          receiptNumber,
          remarks,
          assignment.id,
        ]
      );

      await connection.commit();

      return {
        paymentId: payResult.insertId,
        receiptNumber,
        assignmentId: assignment.id,
        chargeTitle: assignment.charge_title,
        homeNumber: assignment.home_number,
        amount: payAmount,
        paymentMethod: payment_method,
        transactionReference: transaction_reference,
        newStatus,
        newBalanceAmount,
      };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  /**
   * Find payment receipts for special charges.
   */
  static async findAllPayments(societyId = null, filters = {}) {
    let query = `
      SELECT scp.*,
             sc.title AS charge_title,
             sc.category AS charge_category,
             h.home_number,
             s.name AS society_name,
             u.full_name AS resident_name,
             cu.full_name AS collected_by_name
      FROM special_charge_payments scp
      JOIN special_charges sc ON scp.charge_id = sc.id
      JOIN homes h ON scp.home_id = h.id
      JOIN societies s ON scp.society_id = s.id
      LEFT JOIN users u ON scp.paid_by_user_id = u.id
      LEFT JOIN users cu ON scp.collected_by_user_id = cu.id
      WHERE 1=1
    `;
    const params = [];

    if (societyId && String(societyId) !== 'ALL') {
      query += ` AND scp.society_id = ?`;
      params.push(societyId);
    }

    if (filters.charge_id) {
      query += ` AND scp.charge_id = ?`;
      params.push(filters.charge_id);
    }

    if (filters.home_id) {
      query += ` AND scp.home_id = ?`;
      params.push(filters.home_id);
    }

    query += ` ORDER BY scp.payment_date DESC, scp.id DESC`;

    const [rows] = await pool.query(query, params);
    return rows;
  }

  /**
   * Update charge metadata.
   */
  static async updateCharge(chargeId, data) {
    const { title, category, due_date, description, status } = data;
    const updates = [];
    const params = [];

    if (title) {
      updates.push('title = ?');
      params.push(title);
    }
    if (category) {
      updates.push('category = ?');
      params.push(category);
    }
    if (due_date) {
      updates.push('due_date = ?');
      params.push(due_date);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }
    if (status) {
      updates.push('status = ?');
      params.push(status);
    }

    if (updates.length === 0) return this.findChargeById(chargeId);

    params.push(chargeId);
    await pool.query(
      `UPDATE special_charges SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    return this.findChargeById(chargeId);
  }

  /**
   * Delete or deactivate charge.
   */
  static async deleteCharge(chargeId) {
    await pool.query(
      `UPDATE special_charges SET status = 'CANCELLED' WHERE id = ?`,
      [chargeId]
    );
    return { success: true, message: 'Special charge cancelled successfully' };
  }

  /**
   * Overall dashboard stats for special charges.
   */
  static async getStats(societyId = null, homeId = null) {
    let whereSc = 'WHERE 1=1';
    let whereSca = 'WHERE 1=1';
    const paramsSc = [];
    const paramsSca = [];

    if (societyId && String(societyId) !== 'ALL') {
      whereSc += ' AND society_id = ?';
      paramsSc.push(societyId);

      whereSca += ' AND society_id = ?';
      paramsSca.push(societyId);
    }

    if (homeId) {
      whereSca += ' AND home_id = ?';
      paramsSca.push(homeId);
    }

    const [chargeStats] = await pool.query(
      `SELECT
         COUNT(*) AS total_charges,
         SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) AS active_charges
       FROM special_charges
       ${whereSc}`,
      paramsSc
    );

    const [assignmentStats] = await pool.query(
      `SELECT
         COUNT(*) AS total_assignments,
         COALESCE(SUM(amount), 0) AS total_target,
         COALESCE(SUM(paid_amount), 0) AS total_collected,
         COALESCE(SUM(balance_amount), 0) AS total_pending,
         SUM(CASE WHEN status = 'PAID' THEN 1 ELSE 0 END) AS count_paid,
         SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) AS count_pending
       FROM special_charge_assignments
       ${whereSca}`,
      paramsSca
    );

    return {
      total_charges: chargeStats[0]?.total_charges || 0,
      active_charges: chargeStats[0]?.active_charges || 0,
      total_target: assignmentStats[0]?.total_target || 0,
      total_collected: assignmentStats[0]?.total_collected || 0,
      total_pending: assignmentStats[0]?.total_pending || 0,
      count_paid: assignmentStats[0]?.count_paid || 0,
      count_pending: assignmentStats[0]?.count_pending || 0,
    };
  }
}

module.exports = SpecialChargeRepository;
