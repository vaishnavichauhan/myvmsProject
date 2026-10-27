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
      created_by_type = 'ADMIN',
      creator_member_name = null,
      title,
      category = 'SPECIAL_CHARGE',
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
          created_by_type, creator_member_name,
          title, category, amount, due_date, description, target_scope, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')`,
        [
          society_id,
          committee_id || null,
          committee_name || null,
          createdByUserId,
          created_by_type || 'ADMIN',
          creator_member_name || null,
          title,
          category || 'SPECIAL_CHARGE',
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
              u.role AS created_by_role,
              COUNT(sca.id) AS total_homes_assigned,
              SUM(CASE WHEN sca.status = 'PAID' THEN 1 ELSE 0 END) AS total_homes_paid,
              SUM(CASE WHEN sca.status != 'PAID' THEN 1 ELSE 0 END) AS total_homes_pending,
              COALESCE(SUM(sca.amount), 0) AS total_target_amount,
              COALESCE(SUM(sca.paid_amount), 0) AS total_collected_amount,
              COALESCE(SUM(sca.balance_amount), 0) AS total_pending_amount
       FROM special_charges sc
       LEFT JOIN societies s ON sc.society_id = s.id
       LEFT JOIN users u ON sc.created_by_user_id = u.id
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
             u.role AS created_by_role,
             COUNT(sca.id) AS total_homes_assigned,
             SUM(CASE WHEN sca.status = 'PAID' THEN 1 ELSE 0 END) AS total_homes_paid,
             SUM(CASE WHEN sca.status != 'PAID' THEN 1 ELSE 0 END) AS total_homes_pending,
             COALESCE(SUM(sca.amount), 0) AS total_target_amount,
             COALESCE(SUM(sca.paid_amount), 0) AS total_collected_amount,
             COALESCE(SUM(sca.balance_amount), 0) AS total_pending_amount
      FROM special_charges sc
      LEFT JOIN societies s ON sc.society_id = s.id
      LEFT JOIN users u ON sc.created_by_user_id = u.id
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

    if (filters.search) {
      query += ` AND (sc.title LIKE ? OR sc.description LIKE ? OR sc.committee_name LIKE ?)`;
      const term = `%${filters.search}%`;
      params.push(term, term, term);
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
             COALESCE(u.full_name, u2.full_name, 'Resident') AS resident_name,
             COALESCE(u.phone, u2.phone, '-') AS resident_phone,
             COALESCE(r.resident_type, 'RESIDENT') AS resident_type,
             sc.title AS charge_title,
             sc.category AS charge_category,
             sc.due_date AS charge_due_date,
             sc.committee_name,
             u_app.full_name AS approved_by_name,
             scp.id AS pending_payment_id,
             scp.amount AS pending_payment_amount,
             scp.payment_method AS pending_payment_method,
             scp.transaction_reference AS pending_payment_ref,
             scp.payment_date AS pending_payment_date,
             scp.remarks AS pending_payment_remarks
      FROM special_charge_assignments sca
      JOIN homes h ON sca.home_id = h.id
      JOIN special_charges sc ON sca.charge_id = sc.id
      LEFT JOIN residents r ON sca.home_id = r.home_id AND r.status = 'ACTIVE'
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN users u2 ON sca.resident_user_id = u2.id
      LEFT JOIN users u_app ON sca.approved_by_user_id = u_app.id
      LEFT JOIN special_charge_payments scp ON scp.id = sca.pending_payment_id
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

    if (filters.search) {
      query += ` AND (h.home_number LIKE ? OR u.full_name LIKE ? OR u2.full_name LIKE ?)`;
      const term = `%${filters.search}%`;
      params.push(term, term, term);
    }

    query += ` ORDER BY CAST(REGEXP_REPLACE(h.home_number, '[^0-9]', '') AS UNSIGNED) ASC, h.home_number ASC`;

    const [rows] = await pool.query(query, params);
    return rows;
  }

  /**
   * Find special charge assignments for a resident (by resident's user ID).
   */
  static async findAssignmentsForResident(userId, societyId = null) {
    let homeId = null;
    const [residentRows] = await pool.query(
      `SELECT r.home_id, h.society_id
       FROM residents r
       JOIN homes h ON r.home_id = h.id
       WHERE r.user_id = ? AND r.status = 'ACTIVE'
       LIMIT 1`,
      [userId]
    );

    if (residentRows.length > 0) {
      homeId = residentRows[0].home_id;
    } else {
      const [fmRows] = await pool.query(
        `SELECT fm.home_id, h.society_id
         FROM family_members fm
         JOIN homes h ON fm.home_id = h.id
         WHERE fm.user_id = ? AND fm.status = 'ACTIVE'
         LIMIT 1`,
        [userId]
      );
      if (fmRows.length > 0) {
        homeId = fmRows[0].home_id;
      } else {
        const [cmRows] = await pool.query(
          `SELECT cm.home_id, h.society_id
           FROM committee_members cm
           JOIN homes h ON cm.home_id = h.id
           WHERE cm.user_id = ? AND cm.status = 'ACTIVE' AND cm.home_id IS NOT NULL
           LIMIT 1`,
          [userId]
        );
        if (cmRows.length > 0) homeId = cmRows[0].home_id;
      }
    }

    if (!homeId) {
      return [];
    }

    let query = `
      SELECT sca.*,
             sc.title AS charge_title,
             sc.category AS charge_category,
             sc.description AS charge_description,
             sc.due_date AS charge_due_date,
             sc.committee_name,
             sc.committee_id,
             sc.created_by_type,
             sc.creator_member_name,
             sc.status AS charge_status,
             s.name AS society_name,
             h.home_number,
             h.home_type,
             h.building_or_wing,
             u_app.full_name AS approved_by_name,
             scp.id AS pending_payment_id,
             scp.amount AS pending_payment_amount,
             scp.payment_method AS pending_payment_method,
             scp.transaction_reference AS pending_payment_ref,
             scp.payment_date AS pending_payment_date
      FROM special_charge_assignments sca
      JOIN special_charges sc ON sca.charge_id = sc.id
      JOIN homes h ON sca.home_id = h.id
      JOIN societies s ON sca.society_id = s.id
      LEFT JOIN users u_app ON sca.approved_by_user_id = u_app.id
      LEFT JOIN special_charge_payments scp ON scp.id = sca.pending_payment_id
      WHERE sca.home_id = ? AND sc.status = 'ACTIVE'
      ORDER BY 
        CASE sca.status
          WHEN 'PENDING' THEN 1
          WHEN 'PARTIALLY_PAID' THEN 2
          WHEN 'PAID' THEN 3
          ELSE 4
        END ASC,
        sc.due_date ASC,
        sca.id DESC
    `;

    const [rows] = await pool.query(query, [homeId]);
    return rows;
  }

  /**
   * Record payment for a specific home's special charge assignment.
   */
  /**
   * Record payment for a specific home's special charge assignment.
   * If recorded by admin -> auto-approved as PAID.
   * If paid by resident -> set status to PENDING_APPROVAL awaiting admin approval.
   */
  static async recordPayment(data, user = null) {
    const {
      assignment_id,
      amount,
      payment_method = 'UPI',
      transaction_reference = null,
      remarks = null,
    } = data;

    const userObj = typeof user === 'object' && user !== null ? user : { id: user, role: 'OWNER' };
    const userRole = String(userObj.role || '').toUpperCase();
    const isAdminOrSuper = ['ADMIN', 'SUPER_ADMIN'].includes(userRole);

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [assignments] = await connection.query(
        `SELECT sca.*, sc.title AS charge_title, h.home_number, s.name AS society_name
         FROM special_charge_assignments sca
         JOIN special_charges sc ON sca.charge_id = sc.id
         LEFT JOIN homes h ON sca.home_id = h.id
         LEFT JOIN societies s ON sca.society_id = s.id
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

      if (isAdminOrSuper) {
        // ADMIN DIRECT RECORDING: Auto-approved immediately
        const [payResult] = await connection.query(
          `INSERT INTO special_charge_payments (
            assignment_id, charge_id, society_id, home_id, paid_by_user_id,
            receipt_number, amount, payment_method, transaction_reference,
            collected_by_user_id, remarks, status, approved_by_user_id, approved_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'APPROVED', ?, CURRENT_TIMESTAMP)`,
          [
            assignment.id,
            assignment.charge_id,
            assignment.society_id,
            assignment.home_id,
            assignment.resident_user_id || userObj.id,
            receiptNumber,
            payAmount,
            payment_method,
            transaction_reference,
            userObj.id,
            remarks,
            userObj.id,
          ]
        );

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
               notes = ?,
               approved_by_user_id = ?,
               approved_at = CURRENT_TIMESTAMP,
               pending_payment_id = NULL
           WHERE id = ?`,
          [
            newPaidAmount,
            newBalanceAmount,
            newStatus,
            payment_method,
            transaction_reference,
            receiptNumber,
            remarks || 'Paid and verified by admin',
            userObj.id,
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
          status: 'APPROVED',
          newStatus,
          newBalanceAmount,
          message: 'Payment recorded and confirmed successfully',
        };
      } else {
        // RESIDENT PAYMENT SUBMISSION: Awaiting admin approval
        const [payResult] = await connection.query(
          `INSERT INTO special_charge_payments (
            assignment_id, charge_id, society_id, home_id, paid_by_user_id,
            receipt_number, amount, payment_method, transaction_reference,
            collected_by_user_id, remarks, status, approved_by_user_id, approved_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING_APPROVAL', NULL, NULL)`,
          [
            assignment.id,
            assignment.charge_id,
            assignment.society_id,
            assignment.home_id,
            userObj.id,
            receiptNumber,
            payAmount,
            payment_method,
            transaction_reference,
            null,
            remarks,
          ]
        );

        await connection.query(
          `UPDATE special_charge_assignments
           SET status = 'PENDING_APPROVAL',
               pending_payment_id = ?,
               payment_method = ?,
               transaction_reference = ?,
               receipt_number = ?,
               notes = ?
           WHERE id = ?`,
          [
            payResult.insertId,
            payment_method,
            transaction_reference,
            receiptNumber,
            'Payment submitted by resident. Awaiting admin approval.',
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
          status: 'PENDING_APPROVAL',
          newStatus: 'PENDING_APPROVAL',
          newBalanceAmount: Number(assignment.balance_amount),
          message: 'Payment submitted successfully! Waiting for admin approval.',
        };
      }
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  /**
   * Approve a pending special charge payment by admin.
   */
  static async approvePayment(paymentId, user, adminRemarks = null) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [payments] = await connection.query(
        `SELECT scp.*, sca.amount AS total_charge_amount, sca.paid_amount AS current_paid_amount,
                sca.balance_amount AS current_balance_amount, sc.title AS charge_title, h.home_number
         FROM special_charge_payments scp
         JOIN special_charge_assignments sca ON scp.assignment_id = sca.id
         JOIN special_charges sc ON scp.charge_id = sc.id
         LEFT JOIN homes h ON scp.home_id = h.id
         WHERE scp.id = ? FOR UPDATE`,
        [paymentId]
      );

      if (payments.length === 0) {
        throw new Error('Special charge payment record not found');
      }

      const payment = payments[0];
      if (payment.status === 'APPROVED') {
        throw new Error('This payment has already been approved');
      }

      const payAmount = Number(payment.amount);
      const newPaidAmount = Number(payment.current_paid_amount) + payAmount;
      const newBalanceAmount = Math.max(0, Number(payment.total_charge_amount) - newPaidAmount);
      const newStatus = newBalanceAmount === 0 ? 'PAID' : 'PARTIALLY_PAID';

      // 1. Mark payment as APPROVED
      await connection.query(
        `UPDATE special_charge_payments
         SET status = 'APPROVED',
             approved_by_user_id = ?,
             approved_at = CURRENT_TIMESTAMP,
             admin_remarks = ?
         WHERE id = ?`,
        [user.id, adminRemarks, payment.id]
      );

      // 2. Mark assignment as PAID / PARTIALLY_PAID
      await connection.query(
        `UPDATE special_charge_assignments
         SET paid_amount = ?,
             balance_amount = ?,
             status = ?,
             paid_date = CURRENT_TIMESTAMP,
             receipt_number = ?,
             approved_by_user_id = ?,
             approved_at = CURRENT_TIMESTAMP,
             notes = ?,
             pending_payment_id = NULL
         WHERE id = ?`,
        [
          newPaidAmount,
          newBalanceAmount,
          newStatus,
          payment.receipt_number,
          user.id,
          adminRemarks || 'Payment approved by admin',
          payment.assignment_id,
        ]
      );

      await connection.commit();

      return {
        paymentId: payment.id,
        assignmentId: payment.assignment_id,
        receiptNumber: payment.receipt_number,
        chargeTitle: payment.charge_title,
        homeNumber: payment.home_number,
        amount: payAmount,
        status: 'APPROVED',
        newStatus,
        newBalanceAmount,
        message: 'Special charge payment verified and approved successfully! Marked as Payment Done.',
      };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  /**
   * Reject a pending special charge payment by admin.
   */
  static async rejectPayment(paymentId, user, rejectReason = 'Payment verification failed') {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [payments] = await connection.query(
        `SELECT scp.*, sca.paid_amount, sca.amount AS total_charge_amount
         FROM special_charge_payments scp
         JOIN special_charge_assignments sca ON scp.assignment_id = sca.id
         WHERE scp.id = ? FOR UPDATE`,
        [paymentId]
      );

      if (payments.length === 0) {
        throw new Error('Special charge payment record not found');
      }

      const payment = payments[0];

      // 1. Mark payment as REJECTED
      await connection.query(
        `UPDATE special_charge_payments
         SET status = 'REJECTED',
             approved_by_user_id = ?,
             approved_at = CURRENT_TIMESTAMP,
             admin_remarks = ?
         WHERE id = ?`,
        [user.id, rejectReason, payment.id]
      );

      // 2. Revert assignment status
      const prevStatus = Number(payment.paid_amount) > 0 ? 'PARTIALLY_PAID' : 'PENDING';
      await connection.query(
        `UPDATE special_charge_assignments
         SET status = ?,
             pending_payment_id = NULL,
             notes = ?
         WHERE id = ?`,
        [prevStatus, `Payment rejected by admin: ${rejectReason}`, payment.assignment_id]
      );

      await connection.commit();

      return {
        paymentId: payment.id,
        assignmentId: payment.assignment_id,
        status: 'REJECTED',
        newStatus: prevStatus,
        message: 'Payment rejected. Status reverted to pending.',
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
             cu.full_name AS collected_by_name,
             u_app.full_name AS approved_by_name
      FROM special_charge_payments scp
      JOIN special_charges sc ON scp.charge_id = sc.id
      JOIN homes h ON scp.home_id = h.id
      JOIN societies s ON scp.society_id = s.id
      LEFT JOIN users u ON scp.paid_by_user_id = u.id
      LEFT JOIN users cu ON scp.collected_by_user_id = cu.id
      LEFT JOIN users u_app ON scp.approved_by_user_id = u_app.id
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

    if (filters.status && filters.status !== 'ALL') {
      query += ` AND scp.status = ?`;
      params.push(filters.status);
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
