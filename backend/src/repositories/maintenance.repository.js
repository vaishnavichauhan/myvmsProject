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

  /**
   * Helper to determine which monthly periods are covered by a given billing period and cycle
   */
  static getCoveredMonthsForPeriod(period, cycle) {
    if (!period) return [];
    const qMatch = String(period).match(/Q([1-4])[-_\s]*(\d{4})/i);
    if (qMatch) {
      const q = parseInt(qMatch[1], 10);
      const y = qMatch[2];
      const map = {
        1: [`${y}-01`, `${y}-02`, `${y}-03`],
        2: [`${y}-04`, `${y}-05`, `${y}-06`],
        3: [`${y}-07`, `${y}-08`, `${y}-09`],
        4: [`${y}-10`, `${y}-11`, `${y}-12`],
      };
      return map[q] || [];
    }
    const hMatch = String(period).match(/H([1-2])[-_\s]*(\d{4})/i);
    if (hMatch) {
      const h = parseInt(hMatch[1], 10);
      const y = hMatch[2];
      if (h === 1) return [`${y}-01`, `${y}-02`, `${y}-03`, `${y}-04`, `${y}-05`, `${y}-06`];
      return [`${y}-07`, `${y}-08`, `${y}-09`, `${y}-10`, `${y}-11`, `${y}-12`];
    }
    if (cycle === 'YEARLY' || String(period).startsWith('FY-')) {
      const y = String(period).replace(/\D/g, '') || new Date().getFullYear();
      const months = [];
      for (let i = 1; i <= 12; i++) {
        months.push(`${y}-${String(i).padStart(2, '0')}`);
      }
      return months;
    }
    const mMatch = String(period).match(/(\d{4})[-_](\d{1,2})/);
    if (mMatch) {
      const y = mMatch[1];
      const m = String(parseInt(mMatch[2], 10)).padStart(2, '0');
      return [`${y}-${m}`];
    }
    return [];
  }

  /**
   * Reconciles overlapping bills: cleans up redundant unpaid monthly bills when an overlapping quarterly or annual bill is paid
   */
  static async reconcileOverlappingBills(societyId = null) {
    try {
      const [paidMultiBills] = await pool.query(
        `SELECT home_id, billing_period, billing_cycle 
         FROM maintenance_bills 
         WHERE status = 'PAID' AND billing_cycle IN ('QUARTERLY', 'HALF_YEARLY', 'YEARLY')`
      );
      for (const b of paidMultiBills) {
        const coveredMonths = this.getCoveredMonthsForPeriod(b.billing_period, b.billing_cycle);
        if (coveredMonths.length > 0) {
          await pool.query(
            `DELETE FROM maintenance_bills 
             WHERE home_id = ? 
               AND billing_cycle = 'MONTHLY' 
               AND billing_period IN (?) 
               AND paid_amount = 0`,
            [b.home_id, coveredMonths]
          );
        }
      }
    } catch (err) {
      console.error('[MaintenanceRepository.reconcileOverlappingBills] Error:', err.message);
    }
  }

  // ==========================================================================
  // 3. BILLS (INVOICES)
  // ==========================================================================

  static async findAllBills(societyId = null, filters = {}) {
    // Reconcile any redundant unpaid bills before listing
    await this.reconcileOverlappingBills(societyId);

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
             r.resident_type,
             (SELECT COUNT(*) FROM maintenance_payments mp WHERE mp.bill_id = b.id AND mp.status = 'PENDING_APPROVAL') AS pending_payments_count,
             (SELECT COUNT(*) FROM maintenance_payments mp WHERE mp.bill_id = b.id AND mp.status = 'APPROVED') AS approved_payments_count,
             (SELECT mp.receipt_number FROM maintenance_payments mp WHERE mp.bill_id = b.id AND mp.status = 'APPROVED' ORDER BY mp.id DESC LIMIT 1) AS latest_receipt_number,
             (SELECT au.full_name FROM maintenance_payments mp LEFT JOIN users au ON mp.approved_by_user_id = au.id WHERE mp.bill_id = b.id AND mp.status = 'APPROVED' ORDER BY mp.id DESC LIMIT 1) AS approved_by_name,
             (SELECT mp.approved_at FROM maintenance_payments mp WHERE mp.bill_id = b.id AND mp.status = 'APPROVED' ORDER BY mp.id DESC LIMIT 1) AS approved_at,
             (SELECT mp.id FROM maintenance_payments mp WHERE mp.bill_id = b.id AND mp.status = 'PENDING_APPROVAL' ORDER BY mp.id DESC LIMIT 1) AS pending_payment_id,
             (SELECT mp.amount FROM maintenance_payments mp WHERE mp.bill_id = b.id AND mp.status = 'PENDING_APPROVAL' ORDER BY mp.id DESC LIMIT 1) AS pending_payment_amount,
             (SELECT mp.payment_method FROM maintenance_payments mp WHERE mp.bill_id = b.id AND mp.status = 'PENDING_APPROVAL' ORDER BY mp.id DESC LIMIT 1) AS pending_payment_method,
             (SELECT mp.transaction_reference FROM maintenance_payments mp WHERE mp.bill_id = b.id AND mp.status = 'PENDING_APPROVAL' ORDER BY mp.id DESC LIMIT 1) AS pending_payment_ref
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
      `SELECT pay.*,
              cu.full_name AS collected_by_name,
              au.full_name AS approved_by_name,
              u.full_name AS paid_by_name
       FROM maintenance_payments pay
       LEFT JOIN users cu ON pay.collected_by_user_id = cu.id
       LEFT JOIN users au ON pay.approved_by_user_id = au.id
       LEFT JOIN users u ON pay.paid_by_user_id = u.id
       WHERE pay.bill_id = ?
       ORDER BY pay.payment_date DESC`,
      [id]
    );

    bill.payments = payments;
    const latestApprovedPayment = payments.find((p) => p.status === 'APPROVED' && p.approved_by_name);
    bill.approved_by_name = latestApprovedPayment
      ? latestApprovedPayment.approved_by_name
      : (payments.find((p) => p.approved_by_name)?.approved_by_name || null);
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
  static async selectResidentPlan(userId, planId, requestedPeriod = null) {
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

    // Fetch existing bills for this home to determine what's already paid
    const [homeBills] = await pool.query(
      `SELECT id, billing_period, billing_cycle, status, paid_amount FROM maintenance_bills WHERE home_id = ?`,
      [resident.home_id]
    );

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');

    let billing_period = requestedPeriod ? requestedPeriod.trim() : null;

    // Helper to check if a month (e.g. "2026-10") is already paid for this home
    const isMonthPaid = (mStr) => {
      return homeBills.some((b) => {
        if (b.status !== 'PAID') return false;
        if (b.billing_period === mStr) return true;
        const cov = MaintenanceRepository.getCoveredMonthsForPeriod(b.billing_period, b.billing_cycle);
        return cov.includes(mStr);
      });
    };

    // Helper to check if a quarter (e.g. "Q4-2026") has any month already paid for this home
    const isQuarterPaid = (qStr) => {
      const qMonths = MaintenanceRepository.getCoveredMonthsForPeriod(qStr, 'QUARTERLY');
      return homeBills.some((b) => {
        if (b.status !== 'PAID') return false;
        if (b.billing_period === qStr) return true;
        const bMonths = MaintenanceRepository.getCoveredMonthsForPeriod(b.billing_period, b.billing_cycle);
        return qMonths.some((qm) => bMonths.includes(qm));
      });
    };

    if (!billing_period) {
      if (plan.billing_cycle === 'QUARTERLY') {
        const curQ = Math.ceil((today.getMonth() + 1) / 3);
        let qYear = yyyy;
        let qNum = curQ;
        // Find first unpaid quarter starting from current
        while (true) {
          const testPeriod = `Q${qNum}-${qYear}`;
          if (!isQuarterPaid(testPeriod)) {
            billing_period = testPeriod;
            break;
          }
          qNum++;
          if (qNum > 4) {
            qNum = 1;
            qYear++;
          }
        }
      } else if (plan.billing_cycle === 'MONTHLY') {
        let mYear = yyyy;
        let mMonth = today.getMonth() + 1;
        // Find first unpaid month starting from current
        while (true) {
          const testPeriod = `${mYear}-${String(mMonth).padStart(2, '0')}`;
          if (!isMonthPaid(testPeriod)) {
            billing_period = testPeriod;
            break;
          }
          mMonth++;
          if (mMonth > 12) {
            mMonth = 1;
            mYear++;
          }
        }
      } else {
        billing_period = `${yyyy}-${mm}`;
      }
    }

    // Check if bill already exists for this home and billing_period
    const [existing] = await pool.query(
      `SELECT id, status, paid_amount, total_amount FROM maintenance_bills WHERE home_id = ? AND billing_period = ? LIMIT 1`,
      [resident.home_id, billing_period]
    );

    if (existing.length > 0) {
      const existingBill = existing[0];
      if (existingBill.status === 'PAID') {
        // If this period was already paid, scan forward to next unpaid period!
        if (plan.billing_cycle === 'MONTHLY') {
          let [pY, pM] = billing_period.split('-').map(Number);
          pM++;
          if (pM > 12) {
            pM = 1;
            pY++;
          }
          const nextPeriod = `${pY}-${String(pM).padStart(2, '0')}`;
          return this.selectResidentPlan(userId, planId, nextPeriod);
        }
        return this.findBillById(existingBill.id);
      }

      // If pending, ensure plan_id and amounts are up to date
      await pool.query(
        `UPDATE maintenance_bills 
         SET plan_id = ?, billing_cycle = ?, base_amount = ?, total_amount = ?, balance_amount = ? 
         WHERE id = ?`,
        [plan.id, plan.billing_cycle, Number(plan.amount), Number(plan.amount), Number(plan.amount) - Number(existingBill.paid_amount || 0), existingBill.id]
      );
      return this.findBillById(existingBill.id);
    }

    // Determine due date from plan and billing_period
    const dueDay = Math.min(Math.max(plan.due_day || 5, 1), 28);
    let dueYear = yyyy;
    let dueMonth = mm;
    if (billing_period.startsWith('20')) {
      const parts = billing_period.split('-');
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        dueYear = Number(parts[0]);
        dueMonth = parts[1];
      }
    }
    const dueDateStr = `${dueYear}-${dueMonth}-${String(dueDay).padStart(2, '0')}`;
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
        `Resident selected plan "${plan.name}" for period ${billing_period}`,
      ]
    );

    // Clean up any overlapping UNPAID bills for this home so they do not see duplicate monthly/quarterly bills
    if (['QUARTERLY', 'HALF_YEARLY', 'YEARLY'].includes(plan.billing_cycle)) {
      const coveredMonths = MaintenanceRepository.getCoveredMonthsForPeriod(billing_period, plan.billing_cycle);
      if (coveredMonths.length > 0) {
        await pool.query(
          `DELETE FROM maintenance_bills 
           WHERE home_id = ? 
             AND billing_cycle = 'MONTHLY' 
             AND billing_period IN (?) 
             AND paid_amount = 0`,
          [resident.home_id, coveredMonths]
        );
      }
    } else if (plan.billing_cycle === 'MONTHLY') {
      const q = Math.ceil((today.getMonth() + 1) / 3);
      const qPeriod = `Q${q}-${yyyy}`;
      await pool.query(
        `DELETE FROM maintenance_bills 
         WHERE home_id = ? 
           AND billing_cycle = 'QUARTERLY' 
           AND billing_period = ? 
           AND paid_amount = 0`,
        [resident.home_id, qPeriod]
      );
    }

    return this.findBillById(res.insertId);
  }

  /**
   * Batch generates maintenance invoices for all active homes in a society for a given period.
   */
  static async generateBatchBills(society_id, billing_period, billing_cycle = 'MONTHLY', customDueDate = null, planId = null) {
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

    const explicitPlan = planId && planId !== 'AUTO' ? plans.find((p) => p.id === Number(planId)) : null;

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

      // Check if home already has an active or paid quarterly/annual bill covering this billing period
      if (billing_cycle === 'MONTHLY') {
        const [coveringBills] = await pool.query(
          `SELECT id, billing_period, billing_cycle, status 
           FROM maintenance_bills 
           WHERE home_id = ? 
             AND billing_cycle IN ('QUARTERLY', 'HALF_YEARLY', 'YEARLY')
             AND status IN ('PAID', 'PENDING')`,
          [home.id]
        );
        const isCovered = coveringBills.some((cb) =>
          MaintenanceRepository.getCoveredMonthsForPeriod(cb.billing_period, cb.billing_cycle).includes(billing_period)
        );
        if (isCovered) {
          skippedCount++;
          continue;
        }
      }

      const resType = home.resident_type || 'OWNER';

      // Match best plan (or use explicit plan selected by admin)
      let matchedPlan = explicitPlan;

      // A. Specific home_type, matching resident_type (or BOTH), and matching billing_cycle
      const homeTypeUpper = String(home.home_type || '').toUpperCase();
      if (!matchedPlan) {
        matchedPlan = plans.find(
          (p) => String(p.applicable_type || '').toUpperCase() === homeTypeUpper && (p.resident_type === 'BOTH' || p.resident_type === resType) && p.billing_cycle === billing_cycle
        );
      }
      // B. Specific home_type and matching resident_type (or BOTH)
      if (!matchedPlan) {
        matchedPlan = plans.find(
          (p) => String(p.applicable_type || '').toUpperCase() === homeTypeUpper && (p.resident_type === 'BOTH' || p.resident_type === resType)
        );
      }
      // C. Specific home_type any cycle
      if (!matchedPlan) {
        matchedPlan = plans.find((p) => String(p.applicable_type || '').toUpperCase() === homeTypeUpper);
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

  static async recordPayment(data, callerUser = null) {
    const {
      bill_id,
      amount,
      payment_method = 'UPI',
      transaction_reference = null,
      remarks = null,
    } = data;

    const callerRole = String(callerUser?.role || '').toUpperCase();
    const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'RESIDENTIAL_ADMIN'].includes(callerRole);

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

      if (isAdmin) {
        // ADMIN recording payment directly -> instantly APPROVED
        const [payResult] = await connection.query(
          `INSERT INTO maintenance_payments (
            receipt_number, bill_id, society_id, home_id, paid_by_user_id,
            amount, payment_method, status, transaction_reference,
            collected_by_user_id, approved_by_user_id, approved_at, remarks
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'APPROVED', ?, ?, ?, CURRENT_TIMESTAMP, ?)`,
          [
            receiptNumber,
            bill.id,
            bill.society_id,
            bill.home_id,
            bill.resident_id || callerUser?.id,
            payAmount,
            payment_method,
            transaction_reference,
            callerUser?.id || null,
            callerUser?.id || null,
            remarks,
          ]
        );

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

        if (newStatus === 'PAID' && ['QUARTERLY', 'HALF_YEARLY', 'YEARLY'].includes(bill.billing_cycle)) {
          const coveredMonths = MaintenanceRepository.getCoveredMonthsForPeriod(bill.billing_period, bill.billing_cycle);
          if (coveredMonths.length > 0) {
            await connection.query(
              `DELETE FROM maintenance_bills 
               WHERE home_id = ? 
                 AND billing_cycle = 'MONTHLY' 
                 AND billing_period IN (?) 
                 AND paid_amount = 0`,
              [bill.home_id, coveredMonths]
            );
          }
        }

        await connection.commit();

        return {
          paymentId: payResult.insertId,
          receiptNumber,
          billId: bill.id,
          amount: payAmount,
          paymentMethod: payment_method,
          transactionReference: transaction_reference,
          status: 'APPROVED',
          newStatus,
          newBalanceAmount,
        };
      } else {
        // RESIDENT (Owner / Tenant / Family Member) paying dues -> PENDING_APPROVAL
        const [payResult] = await connection.query(
          `INSERT INTO maintenance_payments (
            receipt_number, bill_id, society_id, home_id, paid_by_user_id,
            amount, payment_method, status, transaction_reference,
            collected_by_user_id, approved_by_user_id, approved_at, remarks
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING_APPROVAL', ?, NULL, NULL, NULL, ?)`,
          [
            receiptNumber,
            bill.id,
            bill.society_id,
            bill.home_id,
            callerUser?.id || bill.resident_id,
            payAmount,
            payment_method,
            transaction_reference,
            remarks,
          ]
        );

        // Update bill status to PENDING_APPROVAL
        await connection.query(
          `UPDATE maintenance_bills
           SET status = 'PENDING_APPROVAL',
               updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [bill.id]
        );

        await connection.commit();

        return {
          paymentId: payResult.insertId,
          receiptNumber,
          billId: bill.id,
          amount: payAmount,
          paymentMethod: payment_method,
          transactionReference: transaction_reference,
          status: 'PENDING_APPROVAL',
          newStatus: 'PENDING_APPROVAL',
          newBalanceAmount: Number(bill.balance_amount),
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
   * Approves and confirms a resident payment by Admin.
   * Updates payment status to APPROVED and marks bill as PAID / PARTIALLY_PAID.
   */
  static async approvePayment(paymentId, adminUser, adminRemarks = null) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [payments] = await connection.query(
        `SELECT * FROM maintenance_payments WHERE id = ? FOR UPDATE`,
        [paymentId]
      );
      if (payments.length === 0) {
        throw new Error('Payment record not found');
      }
      const payment = payments[0];
      if (payment.status === 'APPROVED') {
        throw new Error('This payment has already been approved and confirmed');
      }

      const [bills] = await connection.query(
        `SELECT * FROM maintenance_bills WHERE id = ? FOR UPDATE`,
        [payment.bill_id]
      );
      if (bills.length === 0) {
        throw new Error('Associated maintenance bill not found');
      }
      const bill = bills[0];

      // Update payment record to APPROVED
      const combinedRemarks = adminRemarks
        ? (payment.remarks ? `${payment.remarks} | Admin: ${adminRemarks}` : `Admin: ${adminRemarks}`)
        : payment.remarks;

      await connection.query(
        `UPDATE maintenance_payments
         SET status = 'APPROVED',
             collected_by_user_id = ?,
             approved_by_user_id = ?,
             approved_at = CURRENT_TIMESTAMP,
             remarks = ?
         WHERE id = ?`,
        [adminUser.id, adminUser.id, combinedRemarks, paymentId]
      );

      // Recalculate bill amounts from all approved payments
      const [approvedSums] = await connection.query(
        `SELECT COALESCE(SUM(amount), 0) AS total_approved
         FROM maintenance_payments
         WHERE bill_id = ? AND status = 'APPROVED'`,
        [bill.id]
      );
      const newPaidAmount = Number(approvedSums[0]?.total_approved || 0);
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

      if (newStatus === 'PAID' && ['QUARTERLY', 'HALF_YEARLY', 'YEARLY'].includes(bill.billing_cycle)) {
        const coveredMonths = this.getCoveredMonthsForPeriod(bill.billing_period, bill.billing_cycle);
        if (coveredMonths.length > 0) {
          await connection.query(
            `DELETE FROM maintenance_bills 
             WHERE home_id = ? 
               AND billing_cycle = 'MONTHLY' 
               AND billing_period IN (?) 
               AND paid_amount = 0`,
            [bill.home_id, coveredMonths]
          );
        }
      }

      await connection.commit();

      return {
        paymentId,
        billId: bill.id,
        receiptNumber: payment.receipt_number,
        amount: Number(payment.amount),
        status: 'APPROVED',
        billStatus: newStatus,
        balanceAmount: newBalanceAmount,
      };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  /**
   * Rejects an unverified payment submission by Admin.
   */
  static async rejectPayment(paymentId, adminUser, reason = 'Payment verification rejected by admin') {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [payments] = await connection.query(
        `SELECT * FROM maintenance_payments WHERE id = ? FOR UPDATE`,
        [paymentId]
      );
      if (payments.length === 0) {
        throw new Error('Payment record not found');
      }
      const payment = payments[0];

      await connection.query(
        `UPDATE maintenance_payments
         SET status = 'REJECTED',
             approved_by_user_id = ?,
             approved_at = CURRENT_TIMESTAMP,
             rejection_reason = ?
         WHERE id = ?`,
        [adminUser.id, reason, paymentId]
      );

      const [bills] = await connection.query(
        `SELECT * FROM maintenance_bills WHERE id = ? FOR UPDATE`,
        [payment.bill_id]
      );
      if (bills.length > 0) {
        const bill = bills[0];

        // Check if there are other pending payments for this bill
        const [pendingRows] = await connection.query(
          `SELECT COUNT(*) AS count FROM maintenance_payments WHERE bill_id = ? AND status = 'PENDING_APPROVAL'`,
          [bill.id]
        );

        if (pendingRows[0].count === 0) {
          // Revert bill status based on current paid_amount and due_date
          let restoredStatus = 'PENDING';
          if (Number(bill.paid_amount) >= Number(bill.total_amount)) {
            restoredStatus = 'PAID';
          } else if (Number(bill.paid_amount) > 0) {
            restoredStatus = 'PARTIALLY_PAID';
          } else if (new Date(bill.due_date) < new Date()) {
            restoredStatus = 'OVERDUE';
          }
          await connection.query(
            `UPDATE maintenance_bills SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [restoredStatus, bill.id]
          );
        }
      }

      await connection.commit();

      return {
        paymentId,
        status: 'REJECTED',
        rejection_reason: reason,
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
             b.billing_cycle,
             b.total_amount AS bill_total_amount,
             b.balance_amount AS bill_balance_amount,
             b.status AS bill_status,
             h.home_number,
             h.building_or_wing,
             h.home_type,
             s.name AS society_name,
             u.full_name AS resident_name,
             u.phone AS resident_phone,
             u.role AS resident_role,
             cu.full_name AS collected_by_name,
             au.full_name AS approved_by_name
      FROM maintenance_payments p
      JOIN maintenance_bills b ON p.bill_id = b.id
      JOIN homes h ON p.home_id = h.id
      JOIN societies s ON p.society_id = s.id
      LEFT JOIN users u ON p.paid_by_user_id = u.id
      LEFT JOIN users cu ON p.collected_by_user_id = cu.id
      LEFT JOIN users au ON p.approved_by_user_id = au.id
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

    if (filters.paid_by_user_id) {
      query += ` AND p.paid_by_user_id = ?`;
      params.push(filters.paid_by_user_id);
    }

    if (filters.status && filters.status !== 'ALL') {
      query += ` AND p.status = ?`;
      params.push(filters.status);
    }

    if (filters.payment_method && filters.payment_method !== 'ALL') {
      query += ` AND p.payment_method = ?`;
      params.push(filters.payment_method);
    }

    if (filters.search) {
      query += ` AND (
        p.receipt_number LIKE ? OR
        b.bill_number LIKE ? OR
        h.home_number LIKE ? OR
        u.full_name LIKE ? OR
        p.transaction_reference LIKE ?
      )`;
      const s = `%${filters.search}%`;
      params.push(s, s, s, s, s);
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
         SUM(CASE WHEN status = 'PENDING_APPROVAL' THEN 1 ELSE 0 END) AS count_pending_approval,
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
