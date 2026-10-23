const { pool } = require('../config/db');

/**
 * Maintenance Repository
 * Handles all database operations for Maintenance Plans, Bills (Invoices), and Payment Receipts.
 */
class MaintenanceRepository {
  // ==========================================================================
  // 1. PLANS
  // ==========================================================================

  static async createPlan(data) {
    const {
      society_id,
      name,
      applicable_type = 'ALL',
      resident_type = 'BOTH',
      amount = 0.0,
      billing_cycle = 'MONTHLY',
      due_day = 5,
      grace_period_days = 5,
      penalty_type = 'FIXED',
      penalty_rate = 0.0,
      description = null,
      status = 'ACTIVE',
    } = data;

    const query = `
      INSERT INTO maintenance_plans (
        society_id, name, applicable_type, resident_type, amount, billing_cycle,
        due_day, grace_period_days, penalty_type, penalty_rate, description, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await pool.query(query, [
      society_id,
      name.trim(),
      applicable_type,
      resident_type,
      amount,
      billing_cycle,
      due_day,
      grace_period_days,
      penalty_type,
      penalty_rate,
      description,
      status,
    ]);

    return this.findPlanById(result.insertId);
  }

  static async findPlanById(id) {
    const [rows] = await pool.query(
      `SELECT p.*, s.name AS society_name
       FROM maintenance_plans p
       LEFT JOIN societies s ON p.society_id = s.id
       WHERE p.id = ?`,
      [id]
    );
    return rows[0] || null;
  }

  static async findAllPlans(societyId = null, filters = {}) {
    let query = `
      SELECT p.*, s.name AS society_name,
             (SELECT COUNT(*) FROM homes h WHERE h.society_id = p.society_id AND (p.applicable_type = 'ALL' OR h.home_type = p.applicable_type)) AS matching_homes_count
      FROM maintenance_plans p
      LEFT JOIN societies s ON p.society_id = s.id
      WHERE 1=1
    `;
    const params = [];

    if (societyId && String(societyId) !== 'ALL') {
      query += ` AND p.society_id = ?`;
      params.push(societyId);
    }

    if (filters.status) {
      query += ` AND p.status = ?`;
      params.push(filters.status);
    }

    if (filters.billing_cycle) {
      query += ` AND p.billing_cycle = ?`;
      params.push(filters.billing_cycle);
    }

    if (filters.applicable_type && filters.applicable_type !== 'ALL') {
      query += ` AND p.applicable_type = ?`;
      params.push(filters.applicable_type);
    }

    query += ` ORDER BY p.applicable_type ASC, p.amount ASC, p.created_at DESC`;

    const [rows] = await pool.query(query, params);
    return rows;
  }

  static async updatePlan(id, data) {
    const fields = [];
    const params = [];

    const allowed = [
      'name',
      'applicable_type',
      'resident_type',
      'amount',
      'billing_cycle',
      'due_day',
      'grace_period_days',
      'penalty_type',
      'penalty_rate',
      'description',
      'status',
    ];

    for (const key of allowed) {
      if (data[key] !== undefined) {
        fields.push(`\`${key}\` = ?`);
        params.push(data[key]);
      }
    }

    if (fields.length === 0) return this.findPlanById(id);

    params.push(id);
    await pool.query(`UPDATE maintenance_plans SET ${fields.join(', ')} WHERE id = ?`, params);
    return this.findPlanById(id);
  }

  static async deletePlan(id) {
    // Soft delete or deactivation
    await pool.query("UPDATE maintenance_plans SET status = 'INACTIVE' WHERE id = ?", [id]);
    return true;
  }

  // ==========================================================================
  // 2. LATE PENALTY AUTO-APPLY
  // ==========================================================================

  /**
   * Recalculates late penalties for unpaid overdue bills dynamically.
   */
  static async applyLatePenalties(societyId = null) {
    try {
      let query = `
        SELECT b.id, b.base_amount, b.penalty_amount, b.paid_amount, b.due_date,
               p.grace_period_days, p.penalty_type, p.penalty_rate
        FROM maintenance_bills b
        LEFT JOIN maintenance_plans p ON b.plan_id = p.id
        WHERE b.status IN ('PENDING', 'PARTIALLY_PAID', 'OVERDUE')
          AND CURRENT_DATE > DATE_ADD(b.due_date, INTERVAL COALESCE(p.grace_period_days, 5) DAY)
      `;
      const params = [];
      if (societyId && String(societyId) !== 'ALL') {
        query += ` AND b.society_id = ?`;
        params.push(societyId);
      }

      const [overdueRows] = await pool.query(query, params);

      for (const row of overdueRows) {
        const rate = Number(row.penalty_rate) || 0;
        let expectedPenalty = 0;
        if (row.penalty_type === 'PERCENTAGE') {
          expectedPenalty = Math.round((Number(row.base_amount) * rate) / 100);
        } else {
          expectedPenalty = rate;
        }

        const totalAmount = Number(row.base_amount) + expectedPenalty;
        const balanceAmount = Math.max(0, totalAmount - Number(row.paid_amount));
        const newStatus = balanceAmount === 0 ? 'PAID' : 'OVERDUE';

        await pool.query(
          `UPDATE maintenance_bills
           SET penalty_amount = ?,
               total_amount = ?,
               balance_amount = ?,
               status = ?
           WHERE id = ?`,
          [expectedPenalty, totalAmount, balanceAmount, newStatus, row.id]
        );
      }
    } catch (err) {
      console.error('[MaintenanceRepository.applyLatePenalties] Error:', err.message);
    }
  }

  // ==========================================================================
  // 3. BILLS (INVOICES)
  // ==========================================================================

  static async findAllBills(societyId = null, filters = {}) {
    // Keep penalties and overdue statuses fresh
    await this.applyLatePenalties(societyId);

    let query = `
      SELECT b.*,
             h.home_number,
             h.flat_number,
             h.building_or_wing,
             h.block_or_tower,
             h.floor,
             h.home_type,
             s.name AS society_name,
             p.name AS plan_name,
             p.grace_period_days,
             p.penalty_type,
             p.penalty_rate,
             u.full_name AS resident_name,
             u.phone AS resident_phone,
             u.email AS resident_email,
             r.resident_type
      FROM maintenance_bills b
      JOIN homes h ON b.home_id = h.id
      JOIN societies s ON b.society_id = s.id
      LEFT JOIN maintenance_plans p ON b.plan_id = p.id
      LEFT JOIN residents r ON r.home_id = h.id AND r.is_primary_contact = 1 AND r.status = 'ACTIVE'
      LEFT JOIN users u ON u.id = COALESCE(b.resident_id, r.user_id)
      WHERE 1=1
    `;
    const params = [];

    if (societyId && String(societyId) !== 'ALL') {
      query += ` AND b.society_id = ?`;
      params.push(societyId);
    }

    if (filters.home_id) {
      query += ` AND b.home_id = ?`;
      params.push(filters.home_id);
    }

    if (filters.status && filters.status !== 'ALL') {
      query += ` AND b.status = ?`;
      params.push(filters.status);
    }

    if (filters.billing_period) {
      query += ` AND b.billing_period = ?`;
      params.push(filters.billing_period);
    }

    if (filters.billing_cycle && filters.billing_cycle !== 'ALL') {
      query += ` AND b.billing_cycle = ?`;
      params.push(filters.billing_cycle);
    }

    if (filters.search) {
      query += ` AND (
        b.bill_number LIKE ? OR
        h.home_number LIKE ? OR
        u.full_name LIKE ? OR
        u.phone LIKE ?
      )`;
      const s = `%${filters.search}%`;
      params.push(s, s, s, s);
    }

    query += ` ORDER BY b.due_date DESC, b.id DESC`;

    if (filters.limit) {
      query += ` LIMIT ? OFFSET ?`;
      params.push(Number(filters.limit), Number(filters.offset || 0));
    }

    const [rows] = await pool.query(query, params);
    return rows;
  }

  static async findBillById(id) {
    const [bills] = await pool.query(
      `SELECT b.*,
              h.home_number,
              h.flat_number,
              h.building_or_wing,
              h.block_or_tower,
              h.floor,
              h.home_type,
              s.name AS society_name,
              s.address AS society_address,
              s.contact_phone AS society_phone,
              s.contact_email AS society_email,
              p.name AS plan_name,
              p.grace_period_days,
              p.penalty_type,
              p.penalty_rate,
              u.full_name AS resident_name,
              u.phone AS resident_phone,
              u.email AS resident_email
       FROM maintenance_bills b
       JOIN homes h ON b.home_id = h.id
       JOIN societies s ON b.society_id = s.id
       LEFT JOIN maintenance_plans p ON b.plan_id = p.id
       LEFT JOIN users u ON b.resident_id = u.id
       WHERE b.id = ?`,
      [id]
    );

    if (bills.length === 0) return null;
    const bill = bills[0];

    // Fetch payments made against this bill
    const [payments] = await pool.query(
      `SELECT pay.*, cu.full_name AS collected_by_name
       FROM maintenance_payments pay
       LEFT JOIN users cu ON pay.collected_by_user_id = cu.id
       WHERE pay.bill_id = ?
       ORDER BY pay.payment_date DESC`,
      [id]
    );

    bill.payments = payments;
    return bill;
  }

  static async createBill(data) {
    const {
      society_id,
      home_id,
      resident_id = null,
      plan_id = null,
      title,
      billing_period,
      billing_cycle = 'MONTHLY',
      base_amount,
      penalty_amount = 0.0,
      due_date,
      notes = null,
    } = data;

    const total_amount = Number(base_amount) + Number(penalty_amount);
    const balance_amount = total_amount;
    const bill_number = `INV-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    const query = `
      INSERT INTO maintenance_bills (
        bill_number, society_id, home_id, resident_id, plan_id,
        title, billing_period, billing_cycle, base_amount, penalty_amount,
        total_amount, paid_amount, balance_amount, due_date, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0.00, ?, ?, 'PENDING', ?)
    `;

    const [result] = await pool.query(query, [
      bill_number,
      society_id,
      home_id,
      resident_id,
      plan_id,
      title,
      billing_period,
      billing_cycle,
      base_amount,
      penalty_amount,
      total_amount,
      balance_amount,
      due_date,
      notes,
    ]);

    return this.findBillById(result.insertId);
  }

  /**
   * Allows an Owner or Resident to choose their payment plan (e.g. Monthly vs Quarterly).
   * Generates or retrieves the active bill for that period under the selected plan.
   */
  static async selectResidentPlan(userId, planId) {
    const [residentRows] = await pool.query(
      `SELECT r.*, h.society_id, h.home_number, h.home_type
       FROM residents r
       JOIN homes h ON r.home_id = h.id
       WHERE r.user_id = ? AND r.status = 'ACTIVE' LIMIT 1`,
      [userId]
    );
    if (residentRows.length === 0) {
      throw new Error('No active residential unit found for your account');
    }
    const resident = residentRows[0];

    const [planRows] = await pool.query(
      `SELECT * FROM maintenance_plans WHERE id = ? AND status = 'ACTIVE' LIMIT 1`,
      [planId]
    );
    if (planRows.length === 0) {
      throw new Error('Maintenance plan not found or inactive');
    }
    const plan = planRows[0];

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    let billing_period = `${yyyy}-${mm}`;
    if (plan.billing_cycle === 'QUARTERLY') {
      const q = Math.ceil((today.getMonth() + 1) / 3);
      billing_period = `Q${q}-${yyyy}`;
    } else if (plan.billing_cycle === 'HALF_YEARLY') {
      const h = (today.getMonth() + 1) <= 6 ? 1 : 2;
      billing_period = `H${h}-${yyyy}`;
    } else if (plan.billing_cycle === 'YEARLY') {
      billing_period = `FY-${yyyy}`;
    }

    const [existing] = await pool.query(
      `SELECT id FROM maintenance_bills WHERE home_id = ? AND billing_period = ? LIMIT 1`,
      [resident.home_id, billing_period]
    );
    if (existing.length > 0) {
      return this.findBillById(existing[0].id);
    }

    const dueDay = Math.min(Math.max(plan.due_day || 5, 1), 28);
    const dueDateStr = `${yyyy}-${mm}-${String(dueDay).padStart(2, '0')}`;
    const billNumber = `INV-${billing_period.replace(/[^a-zA-Z0-9]/g, '')}-${resident.home_number.replace(/\s+/g, '')}-${Math.floor(10 + Math.random() * 90)}`;
    const title = `Maintenance - ${billing_period} (${plan.name})`;

    const [res] = await pool.query(
      `INSERT INTO maintenance_bills (
        bill_number, society_id, home_id, resident_id, plan_id,
        title, billing_period, billing_cycle, base_amount, penalty_amount,
        total_amount, paid_amount, balance_amount, due_date, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0.00, ?, 0.00, ?, ?, 'PENDING', ?)`,
      [
        billNumber,
        resident.society_id,
        resident.home_id,
        resident.user_id,
        plan.id,
        title,
        billing_period,
        plan.billing_cycle,
        Number(plan.amount),
        Number(plan.amount),
        Number(plan.amount),
        dueDateStr,
        `Resident selected plan "${plan.name}"`,
      ]
    );

    return this.findBillById(res.insertId);
  }

  /**
   * Batch generates maintenance invoices for all active homes in a society for a given period.
   */
  static async generateBatchBills(society_id, billing_period, billing_cycle = 'MONTHLY', customDueDate = null) {
    // 1. Fetch all active homes for the society
    const [homes] = await pool.query(
      `SELECT h.id, h.home_number, h.home_type, h.building_or_wing,
              r.user_id AS resident_user_id, r.resident_type
       FROM homes h
       LEFT JOIN residents r ON r.home_id = h.id AND r.is_primary_contact = 1 AND r.status = 'ACTIVE'
       WHERE h.society_id = ? AND h.status = 'ACTIVE'
       ORDER BY h.id ASC`,
      [society_id]
    );

    if (homes.length === 0) {
      throw new Error('No active homes found in this society to generate invoices for. Please ensure homes are created first.');
    }

    // 2. Fetch active plans for society
    const [plans] = await pool.query(
      `SELECT * FROM maintenance_plans
       WHERE society_id = ? AND status = 'ACTIVE'`,
      [society_id]
    );

    if (plans.length === 0) {
      throw new Error('No active maintenance plan configured for this society. Please create at least one plan first.');
    }

    // 3. Check existing bills for this period to avoid duplicate invoicing
    const [existingBills] = await pool.query(
      `SELECT home_id FROM maintenance_bills
       WHERE society_id = ? AND billing_period = ?`,
      [society_id, billing_period]
    );
    const existingHomeIds = new Set(existingBills.map((b) => b.home_id));

    let generatedCount = 0;
    let skippedCount = 0;

    for (const home of homes) {
      if (existingHomeIds.has(home.id)) {
        skippedCount++;
        continue;
      }

      const resType = home.resident_type || 'OWNER';

      // Match best plan:
      // A. Specific home_type, matching resident_type (or BOTH), and matching billing_cycle
      let matchedPlan = plans.find(
        (p) => p.applicable_type === home.home_type && (p.resident_type === 'BOTH' || p.resident_type === resType) && p.billing_cycle === billing_cycle
      );
      // B. Specific home_type and matching resident_type (or BOTH)
      if (!matchedPlan) {
        matchedPlan = plans.find(
          (p) => p.applicable_type === home.home_type && (p.resident_type === 'BOTH' || p.resident_type === resType)
        );
      }
      // C. Specific home_type any cycle
      if (!matchedPlan) {
        matchedPlan = plans.find((p) => p.applicable_type === home.home_type);
      }
      // D. Fallback to 'ALL' applicable_type, matching resident_type (or BOTH), matching cycle
      if (!matchedPlan) {
        matchedPlan = plans.find((p) => p.applicable_type === 'ALL' && (p.resident_type === 'BOTH' || p.resident_type === resType) && p.billing_cycle === billing_cycle);
      }
      // E. Fallback to 'ALL' applicable_type, matching resident_type (or BOTH)
      if (!matchedPlan) {
        matchedPlan = plans.find((p) => p.applicable_type === 'ALL' && (p.resident_type === 'BOTH' || p.resident_type === resType));
      }
      // F. Fallback to 'ALL' applicable_type
      if (!matchedPlan) {
        matchedPlan = plans.find((p) => p.applicable_type === 'ALL');
      }
      // G. Fallback to any active plan
      if (!matchedPlan) {
        matchedPlan = plans[0];
      }

      const baseAmount = Number(matchedPlan.amount) || 0;
      const dueDay = Math.min(Math.max(matchedPlan.due_day || 5, 1), 28);

      // Compute due_date
      let dueDateStr;
      if (customDueDate) {
        dueDateStr = customDueDate;
      } else {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        dueDateStr = `${year}-${month}-${String(dueDay).padStart(2, '0')}`;
      }

      const billNumber = `INV-${billing_period.replace(/[^a-zA-Z0-9]/g, '')}-${home.home_number.replace(/\s+/g, '')}-${Math.floor(10 + Math.random() * 90)}`;
      const title = `Maintenance - ${billing_period} (${matchedPlan.name})`;

      await pool.query(
        `INSERT INTO maintenance_bills (
          bill_number, society_id, home_id, resident_id, plan_id,
          title, billing_period, billing_cycle, base_amount, penalty_amount,
          total_amount, paid_amount, balance_amount, due_date, status, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0.00, ?, 0.00, ?, ?, 'PENDING', ?)`,
        [
          billNumber,
          society_id,
          home.id,
          home.resident_user_id || null,
          matchedPlan.id,
          title,
          billing_period,
          matchedPlan.billing_cycle || billing_cycle,
          baseAmount,
          baseAmount, // total_amount
          baseAmount, // balance_amount
          dueDateStr,
          `Auto-generated bill under plan "${matchedPlan.name}"`,
        ]
      );

      generatedCount++;
    }

    return {
      generated: generatedCount,
      skipped: skippedCount,
      totalHomes: homes.length,
      billing_period,
    };
  }

  // ==========================================================================
  // 4. PAYMENTS & RECEIPTS
  // ==========================================================================

  static async recordPayment(data, collectedByUserId = null) {
    const {
      bill_id,
      amount,
      payment_method = 'UPI',
      transaction_reference = null,
      remarks = null,
    } = data;

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Lock and fetch the bill
      const [bills] = await connection.query(
        `SELECT * FROM maintenance_bills WHERE id = ? FOR UPDATE`,
        [bill_id]
      );
      if (bills.length === 0) {
        throw new Error('Maintenance bill not found');
      }
      const bill = bills[0];

      const payAmount = Number(amount);
      if (payAmount <= 0) {
        throw new Error('Payment amount must be greater than zero');
      }

      const receiptNumber = `RCP-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

      // 2. Insert payment record
      const [payResult] = await connection.query(
        `INSERT INTO maintenance_payments (
          receipt_number, bill_id, society_id, home_id, paid_by_user_id,
          amount, payment_method, transaction_reference, collected_by_user_id, remarks
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          receiptNumber,
          bill.id,
          bill.society_id,
          bill.home_id,
          bill.resident_id,
          payAmount,
          payment_method,
          transaction_reference,
          collectedByUserId,
          remarks,
        ]
      );

      // 3. Update bill totals and status
      const newPaidAmount = Number(bill.paid_amount) + payAmount;
      const newBalanceAmount = Math.max(0, Number(bill.total_amount) - newPaidAmount);
      const newStatus = newBalanceAmount === 0 ? 'PAID' : 'PARTIALLY_PAID';

      await connection.query(
        `UPDATE maintenance_bills
         SET paid_amount = ?,
             balance_amount = ?,
             status = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [newPaidAmount, newBalanceAmount, newStatus, bill.id]
      );

      await connection.commit();

      return {
        paymentId: payResult.insertId,
        receiptNumber,
        billId: bill.id,
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

  static async findAllPayments(societyId = null, filters = {}) {
    let query = `
      SELECT p.*,
             b.bill_number,
             b.title AS bill_title,
             b.billing_period,
             h.home_number,
             h.building_or_wing,
             s.name AS society_name,
             u.full_name AS resident_name,
             cu.full_name AS collected_by_name
      FROM maintenance_payments p
      JOIN maintenance_bills b ON p.bill_id = b.id
      JOIN homes h ON p.home_id = h.id
      JOIN societies s ON p.society_id = s.id
      LEFT JOIN users u ON p.paid_by_user_id = u.id
      LEFT JOIN users cu ON p.collected_by_user_id = cu.id
      WHERE 1=1
    `;
    const params = [];

    if (societyId && String(societyId) !== 'ALL') {
      query += ` AND p.society_id = ?`;
      params.push(societyId);
    }

    if (filters.home_id) {
      query += ` AND p.home_id = ?`;
      params.push(filters.home_id);
    }

    if (filters.bill_id) {
      query += ` AND p.bill_id = ?`;
      params.push(filters.bill_id);
    }

    if (filters.payment_method && filters.payment_method !== 'ALL') {
      query += ` AND p.payment_method = ?`;
      params.push(filters.payment_method);
    }

    query += ` ORDER BY p.payment_date DESC, p.id DESC`;

    const [rows] = await pool.query(query, params);
    return rows;
  }

  // ==========================================================================
  // 5. STATS & ANALYTICS
  // ==========================================================================

  static async getStats(societyId = null, homeId = null) {
    await this.applyLatePenalties(societyId);

    let where = 'WHERE 1=1';
    const params = [];
    if (societyId && String(societyId) !== 'ALL') {
      where += ' AND society_id = ?';
      params.push(societyId);
    }
    if (homeId) {
      where += ' AND home_id = ?';
      params.push(homeId);
    }

    const [billStats] = await pool.query(
      `SELECT
         COUNT(*) AS total_bills,
         COALESCE(SUM(total_amount), 0) AS total_billed,
         COALESCE(SUM(paid_amount), 0) AS total_collected,
         COALESCE(SUM(balance_amount), 0) AS total_pending,
         COALESCE(SUM(penalty_amount), 0) AS total_penalties,
         SUM(CASE WHEN status = 'PAID' THEN 1 ELSE 0 END) AS count_paid,
         SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) AS count_pending,
         SUM(CASE WHEN status = 'OVERDUE' THEN 1 ELSE 0 END) AS count_overdue,
         SUM(CASE WHEN status = 'PARTIALLY_PAID' THEN 1 ELSE 0 END) AS count_partially_paid
       FROM maintenance_bills
       ${where}`,
      params
    );

    const [planCount] = await pool.query(
      `SELECT COUNT(*) AS total_plans FROM maintenance_plans ${where} AND status = 'ACTIVE'`,
      params
    );

    return {
      ...billStats[0],
      total_plans: planCount[0]?.total_plans || 0,
    };
  }
}

module.exports = MaintenanceRepository;
