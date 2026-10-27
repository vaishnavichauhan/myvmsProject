const { pool } = require('../config/db');

class AccountRepository {
  /**
   * Retrieves overall financial summary for a society across:
   * 1. Maintenance
   * 2. Special Charges
   * 3. Amenities Booking
   * 4. Subscription Billing
   */
  static async getOverview(societyId, filters = {}) {
    const { year = null } = filters;
    const sId = Number(societyId);

    // 1. Maintenance Totals
    const [maintenanceRows] = await pool.query(
      `SELECT 
         COALESCE(SUM(total_amount), 0) AS total_billed,
         COALESCE(SUM(paid_amount), 0) AS total_paid,
         COALESCE(SUM(balance_amount), 0) AS total_pending,
         COUNT(*) AS total_bills,
         COALESCE(SUM(CASE WHEN status = 'PAID' THEN 1 ELSE 0 END), 0) AS paid_bills,
         COALESCE(SUM(CASE WHEN status = 'PENDING_APPROVAL' THEN 1 ELSE 0 END), 0) AS pending_approval_bills,
         COALESCE(SUM(CASE WHEN status = 'OVERDUE' THEN 1 ELSE 0 END), 0) AS overdue_bills
       FROM maintenance_bills
       WHERE society_id = ? ${year ? "AND YEAR(created_at) = ?" : ""}`,
      year ? [sId, year] : [sId]
    );

    // 2. Special Charges Totals
    const [specialChargeRows] = await pool.query(
      `SELECT 
         COALESCE(SUM(amount), 0) AS total_billed,
         COALESCE(SUM(paid_amount), 0) AS total_paid,
         COALESCE(SUM(balance_amount), 0) AS total_pending,
         COUNT(*) AS total_assignments,
         COALESCE(SUM(CASE WHEN status = 'PAID' THEN 1 ELSE 0 END), 0) AS paid_assignments
       FROM special_charge_assignments
       WHERE society_id = ? ${year ? "AND YEAR(created_at) = ?" : ""}`,
      year ? [sId, year] : [sId]
    );

    // 3. Amenity Bookings Totals
    const [amenityRows] = await pool.query(
      `SELECT 
         COALESCE(SUM(total_amount), 0) AS total_billed,
         COALESCE(SUM(CASE WHEN payment_status = 'PAID' THEN total_amount ELSE 0 END), 0) AS total_paid,
         COALESCE(SUM(CASE WHEN payment_status != 'PAID' AND booking_status NOT IN ('CANCELLED', 'REJECTED') THEN total_amount ELSE 0 END), 0) AS total_pending,
         COUNT(*) AS total_bookings,
         COALESCE(SUM(CASE WHEN payment_status = 'PAID' THEN 1 ELSE 0 END), 0) AS paid_bookings
       FROM amenity_bookings
       WHERE society_id = ? ${year ? "AND YEAR(booking_date) = ?" : ""}`,
      year ? [sId, year] : [sId]
    );

    // 4. Subscription Billing Totals
    const [subscriptionRows] = await pool.query(
      `SELECT 
         COALESCE(SUM(amount), 0) AS total_billed,
         COALESCE(SUM(CASE WHEN status = 'PAID' THEN amount ELSE 0 END), 0) AS total_paid,
         COALESCE(SUM(CASE WHEN status != 'PAID' THEN amount ELSE 0 END), 0) AS total_pending,
         COUNT(*) AS total_invoices,
         COALESCE(SUM(CASE WHEN status = 'PAID' THEN 1 ELSE 0 END), 0) AS paid_invoices
       FROM subscription_invoices
       WHERE society_id = ? ${year ? "AND YEAR(created_at) = ?" : ""}`,
      year ? [sId, year] : [sId]
    );

    // Fetch active society subscription plan details
    const [activeSubRows] = await pool.query(
      `SELECT ss.*, p.name AS plan_name, p.price, p.billing_cycle AS plan_billing_cycle
       FROM society_subscriptions ss
       LEFT JOIN subscription_plans p ON ss.plan_id = p.id
       WHERE ss.society_id = ?
       ORDER BY ss.id DESC
       LIMIT 1`,
      [sId]
    );

    const m = maintenanceRows[0] || {};
    const sc = specialChargeRows[0] || {};
    const ab = amenityRows[0] || {};
    const sub = subscriptionRows[0] || {};

    const maintenance = {
      billed: Number(m.total_billed || 0),
      paid: Number(m.total_paid || 0),
      pending: Number(m.total_pending || 0),
      count: Number(m.total_bills || 0),
      paidCount: Number(m.paid_bills || 0),
      pendingApprovalCount: Number(m.pending_approval_bills || 0),
      overdueCount: Number(m.overdue_bills || 0),
    };

    const specialCharges = {
      billed: Number(sc.total_billed || 0),
      paid: Number(sc.total_paid || 0),
      pending: Number(sc.total_pending || 0),
      count: Number(sc.total_assignments || 0),
      paidCount: Number(sc.paid_assignments || 0),
    };

    const amenities = {
      billed: Number(ab.total_billed || 0),
      paid: Number(ab.total_paid || 0),
      pending: Number(ab.total_pending || 0),
      count: Number(ab.total_bookings || 0),
      paidCount: Number(ab.paid_bookings || 0),
    };

    const subscription = {
      billed: Number(sub.total_billed || 0),
      paid: Number(sub.total_paid || 0),
      pending: Number(sub.total_pending || 0),
      count: Number(sub.total_invoices || 0),
      paidCount: Number(sub.paid_invoices || 0),
      currentPlan: activeSubRows[0] || null,
    };

    const grandBilled = maintenance.billed + specialCharges.billed + amenities.billed + subscription.billed;
    const grandPaid = maintenance.paid + specialCharges.paid + amenities.paid + subscription.paid;
    const grandPending = maintenance.pending + specialCharges.pending + amenities.pending + subscription.pending;
    const recoveryRate = grandBilled > 0 ? Math.round((grandPaid / grandBilled) * 100) : 100;

    return {
      maintenance,
      specialCharges,
      amenities,
      subscription,
      grandTotals: {
        totalBilled: grandBilled,
        totalPaid: grandPaid,
        totalPending: grandPending,
        recoveryRate,
      },
    };
  }

  /**
   * Retrieves Month-Wise Financial Breakdown for a society:
   * Aggregates month by month for Maintenance, Special Charges, Amenities, and Subscriptions.
   */
  static async getMonthWiseBreakdown(societyId, filters = {}) {
    const { year = null } = filters;
    const sId = Number(societyId);

    // Maintenance by month
    const [maintMonths] = await pool.query(
      `SELECT 
         DATE_FORMAT(created_at, '%Y-%m') AS month_key,
         DATE_FORMAT(created_at, '%M %Y') AS month_label,
         COALESCE(SUM(total_amount), 0) AS billed,
         COALESCE(SUM(paid_amount), 0) AS paid,
         COALESCE(SUM(balance_amount), 0) AS pending
       FROM maintenance_bills
       WHERE society_id = ? ${year ? "AND YEAR(created_at) = ?" : ""}
       GROUP BY month_key, month_label
       ORDER BY month_key DESC`,
      year ? [sId, year] : [sId]
    );

    // Special Charges by month
    const [scMonths] = await pool.query(
      `SELECT 
         DATE_FORMAT(created_at, '%Y-%m') AS month_key,
         DATE_FORMAT(created_at, '%M %Y') AS month_label,
         COALESCE(SUM(amount), 0) AS billed,
         COALESCE(SUM(paid_amount), 0) AS paid,
         COALESCE(SUM(balance_amount), 0) AS pending
       FROM special_charge_assignments
       WHERE society_id = ? ${year ? "AND YEAR(created_at) = ?" : ""}
       GROUP BY month_key, month_label
       ORDER BY month_key DESC`,
      year ? [sId, year] : [sId]
    );

    // Amenity Bookings by month
    const [amenityMonths] = await pool.query(
      `SELECT 
         DATE_FORMAT(booking_date, '%Y-%m') AS month_key,
         DATE_FORMAT(booking_date, '%M %Y') AS month_label,
         COALESCE(SUM(total_amount), 0) AS billed,
         COALESCE(SUM(CASE WHEN payment_status = 'PAID' THEN total_amount ELSE 0 END), 0) AS paid,
         COALESCE(SUM(CASE WHEN payment_status != 'PAID' AND booking_status NOT IN ('CANCELLED', 'REJECTED') THEN total_amount ELSE 0 END), 0) AS pending
       FROM amenity_bookings
       WHERE society_id = ? ${year ? "AND YEAR(booking_date) = ?" : ""}
       GROUP BY month_key, month_label
       ORDER BY month_key DESC`,
      year ? [sId, year] : [sId]
    );

    // Subscription Invoices by month
    const [subMonths] = await pool.query(
      `SELECT 
         DATE_FORMAT(created_at, '%Y-%m') AS month_key,
         DATE_FORMAT(created_at, '%M %Y') AS month_label,
         COALESCE(SUM(amount), 0) AS billed,
         COALESCE(SUM(CASE WHEN status = 'PAID' THEN amount ELSE 0 END), 0) AS paid,
         COALESCE(SUM(CASE WHEN status != 'PAID' THEN amount ELSE 0 END), 0) AS pending
       FROM subscription_invoices
       WHERE society_id = ? ${year ? "AND YEAR(created_at) = ?" : ""}
       GROUP BY month_key, month_label
       ORDER BY month_key DESC`,
      year ? [sId, year] : [sId]
    );

    // Build unified map of months
    const monthMap = new Map();

    const getOrSetMonth = (key, label) => {
      if (!monthMap.has(key)) {
        monthMap.set(key, {
          monthKey: key,
          monthLabel: label || key,
          maintenance: { billed: 0, paid: 0, pending: 0 },
          specialCharges: { billed: 0, paid: 0, pending: 0 },
          amenities: { billed: 0, paid: 0, pending: 0 },
          subscription: { billed: 0, paid: 0, pending: 0 },
          totalPayment: 0,
          totalPending: 0,
          totalBilled: 0,
          recoveryRate: 100,
        });
      }
      return monthMap.get(key);
    };

    // 1. Populate Maintenance
    for (const r of maintMonths) {
      if (!r.month_key) continue;
      const m = getOrSetMonth(r.month_key, r.month_label);
      m.maintenance.billed = Number(r.billed || 0);
      m.maintenance.paid = Number(r.paid || 0);
      m.maintenance.pending = Number(r.pending || 0);
    }

    // 2. Populate Special Charges
    for (const r of scMonths) {
      if (!r.month_key) continue;
      const m = getOrSetMonth(r.month_key, r.month_label);
      m.specialCharges.billed = Number(r.billed || 0);
      m.specialCharges.paid = Number(r.paid || 0);
      m.specialCharges.pending = Number(r.pending || 0);
    }

    // 3. Populate Amenities
    for (const r of amenityMonths) {
      if (!r.month_key) continue;
      const m = getOrSetMonth(r.month_key, r.month_label);
      m.amenities.billed = Number(r.billed || 0);
      m.amenities.paid = Number(r.paid || 0);
      m.amenities.pending = Number(r.pending || 0);
    }

    // 4. Populate Subscription
    for (const r of subMonths) {
      if (!r.month_key) continue;
      const m = getOrSetMonth(r.month_key, r.month_label);
      m.subscription.billed = Number(r.billed || 0);
      m.subscription.paid = Number(r.paid || 0);
      m.subscription.pending = Number(r.pending || 0);
    }

    // Calculate aggregated totals per month
    const result = Array.from(monthMap.values()).map((m) => {
      m.totalPayment =
        m.maintenance.paid + m.specialCharges.paid + m.amenities.paid + m.subscription.paid;
      m.totalPending =
        m.maintenance.pending + m.specialCharges.pending + m.amenities.pending + m.subscription.pending;
      m.totalBilled =
        m.maintenance.billed + m.specialCharges.billed + m.amenities.billed + m.subscription.billed;
      m.recoveryRate =
        m.totalBilled > 0 ? Math.round((m.totalPayment / m.totalBilled) * 100) : 100;
      return m;
    });

    // Sort descending by monthKey
    result.sort((a, b) => b.monthKey.localeCompare(a.monthKey));

    return result;
  }

  /**
   * Retrieves combined recent financial transactions across all 4 modules.
   */
  static async getTransactions(societyId, filters = {}) {
    const { category = 'ALL', limit = 50 } = filters;
    const sId = Number(societyId);

    const transactions = [];

    // 1. Maintenance Payments
    if (category === 'ALL' || category === 'MAINTENANCE') {
      const [maintPayments] = await pool.query(
        `SELECT 
           mp.id,
           'MAINTENANCE' AS category,
           mp.receipt_number AS reference_number,
           b.bill_number AS invoice_number,
           h.home_number,
           u.full_name AS resident_name,
           u.phone AS resident_phone,
           mp.amount,
           mp.payment_method,
           mp.transaction_reference,
           mp.status,
           mp.payment_date AS transaction_date,
           mp.remarks
         FROM maintenance_payments mp
         JOIN maintenance_bills b ON mp.bill_id = b.id
         JOIN homes h ON mp.home_id = h.id
         LEFT JOIN users u ON mp.paid_by_user_id = u.id
         WHERE mp.society_id = ?
         ORDER BY mp.payment_date DESC
         LIMIT ?`,
        [sId, Number(limit)]
      );
      transactions.push(...maintPayments);
    }

    // 2. Special Charge Payments
    if (category === 'ALL' || category === 'SPECIAL_CHARGES') {
      const [scPayments] = await pool.query(
        `SELECT 
           scp.id,
           'SPECIAL_CHARGES' AS category,
           scp.receipt_number AS reference_number,
           sc.title AS invoice_number,
           h.home_number,
           u.full_name AS resident_name,
           u.phone AS resident_phone,
           scp.amount,
           scp.payment_method,
           scp.transaction_reference,
           'APPROVED' AS status,
           scp.payment_date AS transaction_date,
           scp.remarks
         FROM special_charge_payments scp
         JOIN special_charges sc ON scp.charge_id = sc.id
         JOIN homes h ON scp.home_id = h.id
         LEFT JOIN users u ON scp.paid_by_user_id = u.id
         WHERE scp.society_id = ?
         ORDER BY scp.payment_date DESC
         LIMIT ?`,
        [sId, Number(limit)]
      );
      transactions.push(...scPayments);
    }

    // 3. Amenity Booking Payments
    if (category === 'ALL' || category === 'AMENITIES') {
      const [amenityPayments] = await pool.query(
        `SELECT 
           ap.id,
           'AMENITIES' AS category,
           ap.receipt_number AS reference_number,
           ab.booking_number AS invoice_number,
           h.home_number,
           u.full_name AS resident_name,
           u.phone AS resident_phone,
           ap.amount,
           ap.payment_method,
           ap.transaction_reference,
           CASE WHEN ap.payment_status = 'SUCCESS' THEN 'APPROVED' ELSE ap.payment_status END AS status,
           ap.payment_date AS transaction_date,
           ap.remarks
         FROM amenity_payments ap
         JOIN amenity_bookings ab ON ap.booking_id = ab.id
         JOIN homes h ON ap.home_id = h.id
         LEFT JOIN users u ON ap.paid_by_user_id = u.id
         WHERE ap.society_id = ?
         ORDER BY ap.payment_date DESC
         LIMIT ?`,
        [sId, Number(limit)]
      );
      transactions.push(...amenityPayments);
    }

    // 4. Subscription Payments
    if (category === 'ALL' || category === 'SUBSCRIPTION') {
      const [subPayments] = await pool.query(
        `SELECT 
           sp.id,
           'SUBSCRIPTION' AS category,
           sp.receipt_number AS reference_number,
           si.invoice_number AS invoice_number,
           'Society Management' AS home_number,
           s.name AS resident_name,
           s.contact_phone AS resident_phone,
           sp.amount,
           sp.payment_method,
           sp.transaction_reference,
           CASE WHEN sp.payment_status = 'SUCCESS' THEN 'APPROVED' ELSE sp.payment_status END AS status,
           sp.paid_at AS transaction_date,
           sp.notes AS remarks
         FROM subscription_payments sp
         JOIN subscription_invoices si ON sp.invoice_id = si.id
         JOIN societies s ON sp.society_id = s.id
         WHERE sp.society_id = ?
         ORDER BY sp.paid_at DESC
         LIMIT ?`,
        [sId, Number(limit)]
      );
      transactions.push(...subPayments);
    }

    // Sort by transaction_date descending
    transactions.sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date));

    return transactions.slice(0, Number(limit));
  }
}

module.exports = AccountRepository;
