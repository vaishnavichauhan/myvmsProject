const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');

/**
 * Subscription & Platform Multi-Society Repository
 * Handles platform statistics, multi-society tenancy, tiered subscription plans,
 * modular feature entitlement registry, limit enforcement, and subscription billing.
 */
class SubscriptionRepository {
  // ==========================================================================
  // 1. SUPER ADMIN PLATFORM OVERVIEW (REAL DB AGGREGATIONS)
  // ==========================================================================

  static async getPlatformOverview(dateRange = {}) {
    // 1. Societies breakdown
    const [socStats] = await pool.query(`
      SELECT 
        COUNT(*) AS total_societies,
        SUM(CASE WHEN subscription_status = 'ACTIVE' THEN 1 ELSE 0 END) AS active_societies,
        SUM(CASE WHEN subscription_status = 'TRIAL' THEN 1 ELSE 0 END) AS trial_societies,
        SUM(CASE WHEN subscription_status = 'SUSPENDED' THEN 1 ELSE 0 END) AS suspended_societies,
        SUM(CASE WHEN subscription_status = 'EXPIRED' THEN 1 ELSE 0 END) AS expired_subscriptions
      FROM societies
    `);

    // 2. Global Users & Units count
    const [counts] = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM users WHERE role != 'SUPER_ADMIN') AS total_users,
        (SELECT COUNT(*) FROM homes) AS total_units,
        (SELECT COUNT(*) FROM subscription_plans WHERE status = 'ACTIVE') AS active_plans
    `);

    // 3. Subscription Revenue & MRR
    const [revenueStats] = await pool.query(`
      SELECT 
        COALESCE(SUM(CASE 
          WHEN s.status IN ('ACTIVE', 'TRIAL') AND s.billing_cycle = 'MONTHLY' THEN s.price_snapshot
          WHEN s.status IN ('ACTIVE', 'TRIAL') AND s.billing_cycle = 'QUARTERLY' THEN s.price_snapshot / 3
          WHEN s.status IN ('ACTIVE', 'TRIAL') AND s.billing_cycle = 'HALF_YEARLY' THEN s.price_snapshot / 6
          WHEN s.status IN ('ACTIVE', 'TRIAL') AND s.billing_cycle = 'YEARLY' THEN s.price_snapshot / 12
          ELSE 0 END), 0) AS mrr,
        COALESCE((SELECT SUM(amount) FROM subscription_invoices WHERE status = 'PENDING'), 0) AS pending_payments,
        COALESCE((SELECT SUM(amount) FROM subscription_payments WHERE payment_status = 'PAID'), 0) AS total_subscription_revenue
      FROM society_subscriptions s
    `);

    // 4. Recent Societies
    const [recentSocieties] = await pool.query(`
      SELECT s.id, s.name, s.code, s.society_type, s.subscription_status, s.created_at,
             p.name AS plan_name, p.code AS plan_code,
             u.full_name AS admin_name, u.email AS admin_email, u.phone AS admin_phone,
             (SELECT COUNT(*) FROM homes WHERE society_id = s.id) AS current_units,
             (SELECT COUNT(*) FROM users WHERE society_id = s.id) AS current_users
      FROM societies s
      LEFT JOIN subscription_plans p ON s.subscription_plan_id = p.id
      LEFT JOIN users u ON s.admin_user_id = u.id
      ORDER BY s.created_at DESC
      LIMIT 8
    `);

    // 5. Upcoming Expirations (Next 30 days)
    const [upcomingExpirations] = await pool.query(`
      SELECT sub.id, sub.society_id, sub.end_date, sub.status, sub.price_snapshot,
             s.name AS society_name, s.code AS society_code,
             p.name AS plan_name,
             u.full_name AS admin_name, u.phone AS admin_phone, u.email AS admin_email
      FROM society_subscriptions sub
      JOIN societies s ON sub.society_id = s.id
      JOIN subscription_plans p ON sub.plan_id = p.id
      LEFT JOIN users u ON s.admin_user_id = u.id
      WHERE sub.end_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) AND sub.status IN ('ACTIVE', 'TRIAL')
      ORDER BY sub.end_date ASC
      LIMIT 10
    `);

    // 6. Plan Distribution
    const [planDist] = await pool.query(`
      SELECT p.id, p.name, p.code, COUNT(s.id) AS societies_count
      FROM subscription_plans p
      LEFT JOIN societies s ON s.subscription_plan_id = p.id
      GROUP BY p.id, p.name, p.code
      ORDER BY societies_count DESC
    `);

    const stats = {
      totalSocieties: Number(socStats[0]?.total_societies || 0),
      activeSocieties: Number(socStats[0]?.active_societies || 0),
      trialSocieties: Number(socStats[0]?.trial_societies || 0),
      suspendedSocieties: Number(socStats[0]?.suspended_societies || 0),
      expiredSubscriptions: Number(socStats[0]?.expired_subscriptions || 0),
      totalUsers: Number(counts[0]?.total_users || 0),
      totalUnits: Number(counts[0]?.total_units || 0),
      activePlans: Number(counts[0]?.active_plans || 0),
      monthlyRecurringRevenue: Math.round(Number(revenueStats[0]?.mrr || 0)),
      mrr: Math.round(Number(revenueStats[0]?.mrr || 0)),
      pendingPayments: Number(revenueStats[0]?.pending_payments || 0),
      totalRevenue: Number(revenueStats[0]?.total_subscription_revenue || 0),
    };

    return {
      stats,
      overview: stats,
      recentSocieties,
      recent_societies: recentSocieties,
      upcomingExpirations,
      upcoming_expirations: upcomingExpirations,
      planDistribution: planDist,
      plan_distribution: planDist,
    };
  }

  // ==========================================================================
  // 2. SOCIETIES & SOCIETY ADMIN MANAGEMENT
  // ==========================================================================

  static async getSocieties(filters = {}) {
    let query = `
      SELECT s.*,
             p.id AS plan_id, p.name AS plan_name, p.code AS plan_code, p.price AS plan_price,
             u.id AS admin_id, u.full_name AS admin_name, u.email AS admin_email, u.phone AS admin_phone,
             (SELECT COUNT(*) FROM homes WHERE society_id = s.id) AS units_used,
             (SELECT COUNT(DISTINCT id) FROM users WHERE society_id = s.id AND role != 'SUPER_ADMIN') AS users_used,
             (SELECT COUNT(DISTINCT id) FROM workers WHERE society_id = s.id) AS workers_used,
             sub.start_date AS subscription_start_date,
             sub.end_date AS subscription_end_date,
             sub.status AS active_sub_status,
             slo.max_units AS override_max_units,
             slo.max_users AS override_max_users,
             slo.max_workers AS override_max_workers,
             slo.max_gates AS override_max_gates,
             (SELECT COUNT(*) FROM gates WHERE society_id = s.id) AS gates_used
      FROM societies s
      LEFT JOIN subscription_plans p ON s.subscription_plan_id = p.id
      LEFT JOIN users u ON s.admin_user_id = u.id
      LEFT JOIN society_subscriptions sub ON (sub.society_id = s.id AND sub.status IN ('ACTIVE', 'TRIAL'))
      LEFT JOIN society_limit_overrides slo ON slo.society_id = s.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.status && filters.status !== 'ALL') {
      query += ` AND s.subscription_status = ?`;
      params.push(filters.status);
    }

    if (filters.plan_id && filters.plan_id !== 'ALL') {
      query += ` AND s.subscription_plan_id = ?`;
      params.push(filters.plan_id);
    }

    if (filters.search) {
      query += ` AND (s.name LIKE ? OR s.code LIKE ? OR u.full_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)`;
      const searchWild = `%${filters.search.trim()}%`;
      params.push(searchWild, searchWild, searchWild, searchWild, searchWild);
    }

    query += ` ORDER BY s.id DESC`;

    const [rows] = await pool.query(query, params);
    return rows.map((r) => ({
      ...r,
      effective_max_units: r.override_max_units !== null ? r.override_max_units : r.max_units,
      effective_max_users: r.override_max_users !== null ? r.override_max_users : r.max_users,
      effective_max_workers: r.override_max_workers !== null ? r.override_max_workers : r.max_workers,
      effective_max_gates: r.override_max_gates !== null ? r.override_max_gates : (r.max_gates || 5),
    }));
  }

  static async findSocietyById(id) {
    const [rows] = await pool.query(`
      SELECT s.*,
             p.id AS plan_id, p.name AS plan_name, p.code AS plan_code, p.price AS plan_price, p.description AS plan_description,
             u.id AS admin_id, u.full_name AS admin_name, u.email AS admin_email, u.phone AS admin_phone, u.status AS admin_status,
             (SELECT COUNT(*) FROM homes WHERE society_id = s.id) AS units_used,
             (SELECT COUNT(DISTINCT id) FROM users WHERE society_id = s.id AND role != 'SUPER_ADMIN') AS users_used,
             (SELECT COUNT(DISTINCT id) FROM workers WHERE society_id = s.id) AS workers_used,
             sub.id AS subscription_id,
             sub.start_date AS subscription_start_date,
             sub.end_date AS subscription_end_date,
             sub.billing_cycle AS subscription_billing_cycle,
             sub.price_snapshot AS subscription_price,
             sub.status AS active_sub_status,
             slo.max_units AS override_max_units,
             slo.max_users AS override_max_users,
             slo.max_workers AS override_max_workers,
             slo.max_gates AS override_max_gates,
             (SELECT COUNT(*) FROM gates WHERE society_id = s.id) AS gates_used,
             slo.reason AS override_reason
      FROM societies s
      LEFT JOIN subscription_plans p ON s.subscription_plan_id = p.id
      LEFT JOIN users u ON s.admin_user_id = u.id
      LEFT JOIN society_subscriptions sub ON (sub.society_id = s.id AND sub.status IN ('ACTIVE', 'TRIAL'))
      LEFT JOIN society_limit_overrides slo ON slo.society_id = s.id
      WHERE s.id = ?
    `, [id]);

    if (rows.length === 0) return null;
    const soc = rows[0];

    // Fetch feature entitlements
    const entitlements = await this.getSocietyFeatures(id);

    return {
      ...soc,
      effective_max_units: soc.override_max_units !== null ? soc.override_max_units : soc.max_units,
      effective_max_users: soc.override_max_users !== null ? soc.override_max_users : soc.max_users,
      effective_max_workers: soc.override_max_workers !== null ? soc.override_max_workers : soc.max_workers,
      effective_max_gates: soc.override_max_gates !== null ? soc.override_max_gates : (soc.max_gates || 5),
      features: entitlements,
    };
  }

  /**
   * Transactional creation of Society + Society Admin + Subscription + Limits
   */
  static async createSocietyWithAdmin(societyData, adminData, subscriptionData, actorUserId) {
    // Support unified payload object
    if (!adminData && (societyData.adminPhone || societyData.adminName || societyData.planId)) {
      actorUserId = societyData.createdBy || actorUserId;
      adminData = {
        full_name: societyData.adminName,
        phone: societyData.adminPhone,
        email: societyData.adminEmail,
        password: societyData.adminPassword,
      };
      subscriptionData = {
        plan_id: societyData.planId,
        trial_days: societyData.trialDays !== undefined ? Number(societyData.trialDays) : undefined,
        status: (Number(societyData.trialDays) > 0 ? 'TRIAL' : 'ACTIVE'),
      };
      societyData = {
        name: societyData.name,
        code: societyData.code,
        registration_number: societyData.registrationNumber || null,
        society_type: societyData.societyType || societyData.society_type || 'FLAT',
        address: societyData.address || '',
        city: societyData.city || '',
        state: societyData.state || '',
        pincode: societyData.pincode || '',
        contact_number: societyData.contactNumber || '',
        contact_email: societyData.contactEmail || '',
        max_units: societyData.maxUnits !== undefined ? Number(societyData.maxUnits) : 100,
        max_users: societyData.maxUsers !== undefined ? Number(societyData.maxUsers) : 50,
        max_workers: societyData.maxWorkers !== undefined ? Number(societyData.maxWorkers) : 20,
        max_gates: societyData.maxGates !== undefined ? Number(societyData.maxGates) : (societyData.max_gates !== undefined ? Number(societyData.max_gates) : 5),
      };
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const {
        name,
        code,
        registration_number = null,
        society_type = (societyData.societyType || societyData.society_type || 'FLAT'),
        address = '',
        city = '',
        state = '',
        pincode = '',
        contact_number = '',
        contact_email = '',
        max_units = 100,
        max_users = 200,
        max_workers = 50,
        max_gates = 5,
      } = societyData;

      // 1. Resolve Plan
      let planId = subscriptionData?.plan_id;
      if (!planId) {
        const [defaultPlan] = await connection.query('SELECT id FROM subscription_plans WHERE status = "ACTIVE" ORDER BY id ASC LIMIT 1');
        if (defaultPlan.length > 0) planId = defaultPlan[0].id;
      }
      const [planRows] = await connection.query('SELECT * FROM subscription_plans WHERE id = ?', [planId]);
      if (planRows.length === 0) throw new Error('Selected subscription plan not found');
      const plan = planRows[0];

      // 2. Insert Society Record
      const finalMaxUnits = Number(max_units || plan.max_units);
      const finalMaxUsers = Number(max_users || plan.max_users);
      const finalMaxWorkers = Number(max_workers || plan.max_workers);
      const finalMaxGates = Number(max_gates || plan.max_gates || 5);

      // Validate capacity limits against selected plan
      if (plan.max_units && finalMaxUnits > plan.max_units) {
        throw new Error(
          `Cannot create society with ${finalMaxUnits} units. The selected ${plan.name} Plan allows a maximum of ${plan.max_units} units. Please select an upgraded plan or set units up to ${plan.max_units}.`
        );
      }
      if (plan.max_users && finalMaxUsers > plan.max_users) {
        throw new Error(
          `Cannot set max users to ${finalMaxUsers}. The selected ${plan.name} Plan allows a maximum of ${plan.max_users} users.`
        );
      }
      if (plan.max_workers && finalMaxWorkers > plan.max_workers) {
        throw new Error(
          `Cannot set max workers to ${finalMaxWorkers}. The selected ${plan.name} Plan allows a maximum of ${plan.max_workers} workers.`
        );
      }

      const subStatus = subscriptionData.status || (plan.trial_days > 0 ? 'TRIAL' : 'ACTIVE');

      const [socResult] = await connection.query(`
        INSERT INTO societies (
          name, code, registration_number, society_type, address, city, state, pincode,
          contact_number, contact_email, status, subscription_plan_id, subscription_status,
          total_homes, max_units, max_users, max_workers, max_gates
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?, ?, ?, ?, ?)
      `, [
        name.trim(),
        code.trim().toUpperCase(),
        registration_number,
        society_type,
        address,
        city,
        state,
        pincode,
        contact_number,
        contact_email,
        plan.id,
        subStatus,
        finalMaxUnits,
        finalMaxUnits,
        finalMaxUsers,
        finalMaxWorkers,
        finalMaxGates,
      ]);
      const societyId = socResult.insertId;

      // 3. Create Society Admin Account (Hashed password)
      let adminUserId = null;
      if (adminData && (adminData.phone || adminData.email)) {
        const adminPassword = adminData.password || 'Password@123';
        const hashedPassword = await bcrypt.hash(adminPassword, 10);

        // Check if phone already exists
        const [existingUser] = await connection.query('SELECT id FROM users WHERE phone = ?', [adminData.phone.trim()]);
        if (existingUser.length > 0) {
          adminUserId = existingUser[0].id;
          await connection.query(`
            UPDATE users SET society_id = ?, role = 'ADMIN', full_name = ? WHERE id = ?
          `, [societyId, adminData.full_name || 'Society Admin', adminUserId]);
        } else {
          const [userResult] = await connection.query(`
            INSERT INTO users (
              society_id, full_name, email, phone, password, role, flat_number, block_or_tower, status
            ) VALUES (?, ?, ?, ?, ?, 'ADMIN', 'Admin Office', 'HQ', 'ACTIVE')
          `, [
            societyId,
            adminData.full_name || 'Society Admin',
            adminData.email || null,
            adminData.phone.trim(),
            hashedPassword,
          ]);
          adminUserId = userResult.insertId;
        }

        // Link admin to society
        await connection.query('UPDATE societies SET admin_user_id = ? WHERE id = ?', [adminUserId, societyId]);
      }

      // 4. Create Active Subscription Record
      const startDate = subscriptionData.start_date || new Date().toISOString().split('T')[0];
      const endDate = subscriptionData.end_date || (() => {
        const d = new Date(startDate);
        d.setFullYear(d.getFullYear() + 1);
        return d.toISOString().split('T')[0];
      })();
      const trialEndsAt = subStatus === 'TRIAL'
        ? (() => {
            const t = new Date(startDate);
            const days = subscriptionData.trial_days !== undefined && subscriptionData.trial_days !== null
              ? Number(subscriptionData.trial_days)
              : (plan.trial_days || 14);
            t.setDate(t.getDate() + days);
            return t.toISOString().split('T')[0];
          })()
        : null;

      const [subResult] = await connection.query(`
        INSERT INTO society_subscriptions (
          society_id, plan_id, start_date, end_date, billing_cycle,
          price_snapshot, status, trial_ends_at, auto_renew
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
      `, [
        societyId,
        plan.id,
        startDate,
        endDate,
        plan.billing_cycle,
        plan.price,
        subStatus,
        trialEndsAt,
      ]);

      // 5. Generate Subscription Invoice
      const invNumber = `SUB-INV-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
      await connection.query(`
        INSERT INTO subscription_invoices (
          invoice_number, society_id, plan_id, subscription_id, amount,
          billing_period_start, billing_period_end, due_date, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        invNumber,
        societyId,
        plan.id,
        subResult.insertId,
        plan.price,
        startDate,
        endDate,
        startDate,
        subStatus === 'TRIAL' ? 'PAID' : 'PENDING',
      ]);

      // 6. Audit Log
      await connection.query(`
        INSERT INTO platform_audit_logs (actor_user_id, action, entity_type, entity_id, details_json)
        VALUES (?, 'CREATE_SOCIETY', 'SOCIETY', ?, ?)
      `, [
        actorUserId || 1,
        societyId,
        JSON.stringify({ name, code, plan_name: plan.name, adminUserId }),
      ]);

      await connection.commit();
      const soc = await this.findSocietyById(societyId);
      return { ...soc, society: soc };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  static async updateSociety(id, data, actorUserId) {
    const fields = [];
    const params = [];

    // Enforce plan limits if updating units
    if (data.max_units !== undefined || data.total_homes !== undefined) {
      const targetUnits = Number(data.max_units !== undefined ? data.max_units : data.total_homes);
      const [socRows] = await pool.query('SELECT subscription_plan_id FROM societies WHERE id = ?', [id]);
      if (socRows.length > 0 && socRows[0].subscription_plan_id) {
        const [planRows] = await pool.query('SELECT name, max_units FROM subscription_plans WHERE id = ?', [socRows[0].subscription_plan_id]);
        if (planRows.length > 0 && planRows[0].max_units) {
          const [overrideRows] = await pool.query('SELECT max_units FROM society_limit_overrides WHERE society_id = ?', [id]);
          const allowedMax = (overrideRows.length > 0 && overrideRows[0].max_units !== null) ? overrideRows[0].max_units : planRows[0].max_units;
          if (targetUnits > allowedMax) {
            throw new Error(
              `Cannot set units to ${targetUnits}. The subscription plan limit is ${allowedMax} units (${planRows[0].name} Plan). Upgrade your plan or configure a limit override.`
            );
          }
        }
      }
      if (data.total_homes === undefined) data.total_homes = targetUnits;
      if (data.max_units === undefined) data.max_units = targetUnits;
    }
    if (data.maxGates !== undefined && data.max_gates === undefined) { data.max_gates = Number(data.maxGates); }

    const allowed = [
      'name', 'code', 'registration_number', 'society_type', 'address',
      'city', 'state', 'pincode', 'contact_number', 'contact_email',
      'status', 'subscription_status', 'total_homes', 'max_units', 'max_users', 'max_workers', 'max_gates', 'admin_user_id'
    ];

    for (const key of allowed) {
      if (data[key] !== undefined) {
        fields.push(`\`${key}\` = ?`);
        params.push(data[key]);
      }
    }

    if (fields.length > 0) {
      params.push(id);
      await pool.query(`UPDATE societies SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, params);

      // Audit Log
      await pool.query(`
        INSERT INTO platform_audit_logs (actor_user_id, action, entity_type, entity_id, details_json)
        VALUES (?, 'UPDATE_SOCIETY', 'SOCIETY', ?, ?)
      `, [actorUserId || 1, id, JSON.stringify(data)]);
    }

    return this.findSocietyById(id);
  }

  static async suspendSociety(id, reason, actorUserId) {
    await pool.query(`
      UPDATE societies SET subscription_status = 'SUSPENDED', updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `, [id]);
    await pool.query(`
      UPDATE society_subscriptions SET status = 'SUSPENDED', updated_at = CURRENT_TIMESTAMP WHERE society_id = ? AND status = 'ACTIVE'
    `, [id]);

    await pool.query(`
      INSERT INTO platform_audit_logs (actor_user_id, action, entity_type, entity_id, details_json)
      VALUES (?, 'SUSPEND_SOCIETY', 'SOCIETY', ?, ?)
    `, [actorUserId || 1, id, JSON.stringify({ reason })]);

    return this.findSocietyById(id);
  }

  static async activateSociety(id, actorUserId) {
    await pool.query(`
      UPDATE societies SET subscription_status = 'ACTIVE', updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `, [id]);
    await pool.query(`
      UPDATE society_subscriptions SET status = 'ACTIVE', updated_at = CURRENT_TIMESTAMP WHERE society_id = ? AND status = 'SUSPENDED'
    `, [id]);

    await pool.query(`
      INSERT INTO platform_audit_logs (actor_user_id, action, entity_type, entity_id, details_json)
      VALUES (?, 'ACTIVATE_SOCIETY', 'SOCIETY', ?, ?)
    `, [actorUserId || 1, id, JSON.stringify({ action: 'REACTIVATE' })]);

    return this.findSocietyById(id);
  }

  static async getSocietyAdmins() {
    const [rows] = await pool.query(`
      SELECT u.id, u.full_name, u.email, u.phone, u.status, u.created_at,
             s.id AS society_id, s.name AS society_name, s.code AS society_code
      FROM users u
      LEFT JOIN societies s ON u.society_id = s.id
      WHERE u.role = 'ADMIN'
      ORDER BY u.id DESC
    `);
    return rows;
  }

  static async resetAdminPassword(userId, newPassword, actorUserId) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [hashedPassword, userId]);

    await pool.query(`
      INSERT INTO platform_audit_logs (actor_user_id, action, entity_type, entity_id, details_json)
      VALUES (?, 'RESET_ADMIN_PASSWORD', 'USER', ?, ?)
    `, [actorUserId || 1, userId, JSON.stringify({ action: 'PASSWORD_RESET_BY_SUPER_ADMIN' })]);

    return true;
  }

  // ==========================================================================
  // 3. SUBSCRIPTION PLANS & FEATURES
  // ==========================================================================

  static async getPlans() {
    const [plans] = await pool.query(`
      SELECT p.*,
             (SELECT COUNT(*) FROM societies WHERE subscription_plan_id = p.id) AS active_societies_count
      FROM subscription_plans p
      ORDER BY p.price ASC
    `);

    // Attach feature codes
    for (const plan of plans) {
      const [featRows] = await pool.query(
        'SELECT feature_code FROM plan_features WHERE plan_id = ?',
        [plan.id]
      );
      plan.features = featRows.map((f) => f.feature_code);
    }

    return plans;
  }

  static async getPlanById(id) {
    const [rows] = await pool.query('SELECT * FROM subscription_plans WHERE id = ?', [id]);
    if (rows.length === 0) return null;
    const plan = rows[0];

    const [featRows] = await pool.query(
      'SELECT feature_code FROM plan_features WHERE plan_id = ?',
      [id]
    );
    plan.features = featRows.map((f) => f.feature_code);
    return plan;
  }

  static async createPlan(data, actorUserId) {
    const name = data.name;
    const code = data.code;
    const description = data.description || null;
    const price = data.price !== undefined ? parseFloat(data.price) : 0;
    const billing_cycle = data.billing_cycle || data.billingCycle || 'MONTHLY';
    const max_users = data.max_users !== undefined ? Number(data.max_users) : (data.maxUsers !== undefined ? Number(data.maxUsers) : 50);
    const max_units = data.max_units !== undefined ? Number(data.max_units) : (data.maxUnits !== undefined ? Number(data.maxUnits) : 100);
    const max_workers = data.max_workers !== undefined ? Number(data.max_workers) : (data.maxWorkers !== undefined ? Number(data.maxWorkers) : 20);
    const max_gates = data.max_gates !== undefined ? Number(data.max_gates) : (data.maxGates !== undefined ? Number(data.maxGates) : 5);
    const trial_days = data.trial_days !== undefined ? Number(data.trial_days) : (data.trialDays !== undefined ? Number(data.trialDays) : 14);
    const status = data.status || 'ACTIVE';
    const features = Array.isArray(data.features) ? data.features : [];

    const [result] = await pool.query(`
      INSERT INTO subscription_plans (
        name, code, description, price, billing_cycle, max_users, max_units, max_workers, max_gates, trial_days, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      name.trim(),
      code.trim().toUpperCase(),
      description,
      price,
      billing_cycle,
      max_users,
      max_units,
      max_workers,
      max_gates,
      trial_days,
      status,
    ]);

    const planId = result.insertId;

    // Attach features
    for (const featCode of features) {
      await pool.query('INSERT IGNORE INTO plan_features (plan_id, feature_code) VALUES (?, ?)', [planId, featCode]);
    }

    await pool.query(`
      INSERT INTO platform_audit_logs (actor_user_id, action, entity_type, entity_id, details_json)
      VALUES (?, 'CREATE_PLAN', 'PLAN', ?, ?)
    `, [actorUserId || 1, planId, JSON.stringify({ name, code, price })]);

    return this.getPlanById(planId);
  }

  static async updatePlan(id, data, actorUserId) {
    const fields = [];
    const params = [];

    const payload = { ...data };
    if (payload.maxUnits !== undefined && payload.max_units === undefined) {
      payload.max_units = Number(payload.maxUnits);
    }
    if (payload.maxUsers !== undefined && payload.max_users === undefined) {
      payload.max_users = Number(payload.maxUsers);
    }
    if (payload.maxWorkers !== undefined && payload.max_workers === undefined) {
      payload.max_workers = Number(payload.maxWorkers);
    }
    if (payload.maxGates !== undefined && payload.max_gates === undefined) {
      payload.max_gates = Number(payload.maxGates);
    }
    if (payload.billingCycle !== undefined && payload.billing_cycle === undefined) {
      payload.billing_cycle = payload.billingCycle;
    }
    if (payload.trialDays !== undefined && payload.trial_days === undefined) {
      payload.trial_days = Number(payload.trialDays);
    }

    const allowed = ['name', 'code', 'description', 'price', 'billing_cycle', 'max_users', 'max_units', 'max_workers', 'max_gates', 'trial_days', 'status'];
    for (const key of allowed) {
      if (payload[key] !== undefined) {
        fields.push(`\`${key}\` = ?`);
        params.push(payload[key]);
      }
    }

    if (fields.length > 0) {
      params.push(id);
      await pool.query(`UPDATE subscription_plans SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, params);
    }

    // Update features if provided
    if (Array.isArray(payload.features)) {
      await pool.query('DELETE FROM plan_features WHERE plan_id = ?', [id]);
      for (const featCode of payload.features) {
        await pool.query('INSERT IGNORE INTO plan_features (plan_id, feature_code) VALUES (?, ?)', [id, featCode]);
      }
    }

    await pool.query(`
      INSERT INTO platform_audit_logs (actor_user_id, action, entity_type, entity_id, details_json)
      VALUES (?, 'UPDATE_PLAN', 'PLAN', ?, ?)
    `, [actorUserId || 1, id, JSON.stringify(payload)]);

    return this.getPlanById(id);
  }

  static async deletePlan(id, actorUserId) {
    const [assigned] = await pool.query('SELECT COUNT(*) AS count FROM societies WHERE subscription_plan_id = ?', [id]);
    if (assigned[0].count > 0) {
      throw new Error(`Cannot delete plan: currently assigned to ${assigned[0].count} societies. Please migrate them first.`);
    }

    await pool.query('DELETE FROM subscription_plans WHERE id = ?', [id]);
    await pool.query(`
      INSERT INTO platform_audit_logs (actor_user_id, action, entity_type, entity_id, details_json)
      VALUES (?, 'DELETE_PLAN', 'PLAN', ?, NULL)
    `, [actorUserId || 1, id]);

    return true;
  }

  static async getPlatformFeatures() {
    const [rows] = await pool.query('SELECT * FROM platform_features ORDER BY category ASC, name ASC');
    return rows;
  }

  // ==========================================================================
  // 4. ENTITLEMENTS & FEATURE ACCESS CHECKS
  // ==========================================================================

  /**
   * Resolves active features for a society (Plan features + overrides)
   */
  static async getSocietyFeatures(societyId) {
    if (!societyId) return [];

    // Get society's plan
    const [socRows] = await pool.query(
      'SELECT s.subscription_plan_id, s.subscription_status, p.name AS plan_name FROM societies s LEFT JOIN subscription_plans p ON s.subscription_plan_id = p.id WHERE s.id = ?',
      [societyId]
    );
    if (socRows.length === 0) return [];
    const society = socRows[0];

    // If society is SUSPENDED or EXPIRED, access is restricted
    if (society.subscription_status === 'SUSPENDED' || society.subscription_status === 'EXPIRED') {
      const empty = [];
      empty.activeFeatures = [];
      empty.features = [];
      empty.planId = society.subscription_plan_id;
      empty.planName = society.plan_name;
      empty.subscriptionStatus = society.subscription_status;
      return empty;
    }

    // Base features from Plan
    let activeFeatures = new Set();
    if (society.subscription_plan_id) {
      const [pFeats] = await pool.query(
        'SELECT feature_code FROM plan_features WHERE plan_id = ?',
        [society.subscription_plan_id]
      );
      pFeats.forEach((f) => activeFeatures.add(f.feature_code));
    }

    // Apply Overrides
    const [overrides] = await pool.query(
      'SELECT feature_code, is_enabled FROM society_feature_overrides WHERE society_id = ?',
      [societyId]
    );
    for (const ov of overrides) {
      if (ov.is_enabled) {
        activeFeatures.add(ov.feature_code);
      } else {
        activeFeatures.delete(ov.feature_code);
      }
    }

    const featsArray = Array.from(activeFeatures);
    featsArray.activeFeatures = featsArray;
    featsArray.features = featsArray;
    featsArray.planId = society.subscription_plan_id;
    featsArray.planName = society.plan_name;
    featsArray.subscriptionStatus = society.subscription_status;
    return featsArray;
  }

  static async setFeatureOverride(societyId, featureCode, isEnabled, reason, actorUserId) {
    await pool.query(`
      INSERT INTO society_feature_overrides (society_id, feature_code, is_enabled, reason, created_by_user_id)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE is_enabled = VALUES(is_enabled), reason = VALUES(reason), updated_at = CURRENT_TIMESTAMP
    `, [societyId, featureCode, isEnabled ? 1 : 0, reason, actorUserId]);

    return this.getSocietyFeatures(societyId);
  }

  // ==========================================================================
  // 5. CAPACITY & LIMIT MANAGEMENT
  // ==========================================================================

  /**
   * Get accurate usage vs limits for a society
   */
  static async getSocietyUsage(societyId) {
    const society = await this.findSocietyById(societyId);
    if (!society) throw new Error('Society not found');

    const maxUnits = society.effective_max_units;
    const maxUsers = society.effective_max_users;
    const maxWorkers = society.effective_max_workers;

    const currentUnits = Number(society.units_used || 0);
    const currentUsers = Number(society.users_used || 0);
    const currentWorkers = Number(society.workers_used || 0);

    const unitPercentage = maxUnits > 0 ? Math.round((currentUnits / maxUnits) * 100) : 0;
    const userPercentage = maxUsers > 0 ? Math.round((currentUsers / maxUsers) * 100) : 0;
    const workerPercentage = maxWorkers > 0 ? Math.round((currentWorkers / maxWorkers) * 100) : 0;

    return {
      society_id: society.id,
      society_name: society.name,
      society_code: society.code,
      units: {
        current: currentUnits,
        max: maxUnits,
        remaining: Math.max(0, maxUnits - currentUnits),
        percentage: unitPercentage,
        warning: unitPercentage >= 80,
        exceeded: currentUnits >= maxUnits,
      },
      users: {
        current: currentUsers,
        max: maxUsers,
        remaining: Math.max(0, maxUsers - currentUsers),
        percentage: userPercentage,
        warning: userPercentage >= 80,
        exceeded: currentUsers >= maxUsers,
      },
      workers: {
        current: currentWorkers,
        max: maxWorkers,
        remaining: Math.max(0, maxWorkers - currentWorkers),
        percentage: workerPercentage,
        warning: workerPercentage >= 80,
        exceeded: currentWorkers >= maxWorkers,
      },
      status: society.subscription_status,
      override_reason: society.override_reason,
    };
  }

  /**
   * Concurrency-safe limit check
   */
  static async checkLimit(societyId, limitType, delta = 1, connection = pool) {
    const [socRows] = await connection.query(`
      SELECT s.id, s.name, s.subscription_status, s.max_units, s.max_users, s.max_workers, s.max_gates,
             slo.max_units AS ov_units, slo.max_users AS ov_users, slo.max_workers AS ov_workers, slo.max_gates AS ov_gates
      FROM societies s
      LEFT JOIN society_limit_overrides slo ON slo.society_id = s.id
      WHERE s.id = ?
    `, [societyId]);

    if (socRows.length === 0) return { allowed: false, reason: 'Society not found' };
    const soc = socRows[0];

    if (soc.subscription_status === 'SUSPENDED') {
      return { allowed: false, reason: 'Society account is currently suspended.' };
    }
    if (soc.subscription_status === 'EXPIRED') {
      return { allowed: false, reason: 'Society subscription has expired. Please renew.' };
    }

    if (limitType === 'UNITS') {
      const max = soc.ov_units !== null ? soc.ov_units : soc.max_units;
      const [uRows] = await connection.query('SELECT COUNT(*) AS count FROM homes WHERE society_id = ?', [societyId]);
      const current = Number(uRows[0].count);
      if (current + delta > max) {
        return {
          allowed: false,
          current,
          max,
          reason: `Unit limit exceeded! Current: ${current}/${max} homes. Please upgrade your subscription plan or request a unit limit override.`,
        };
      }
      return { allowed: true, current, max };
    }

    if (limitType === 'USERS') {
      const max = soc.ov_users !== null ? soc.ov_users : soc.max_users;
      const [uRows] = await connection.query('SELECT COUNT(DISTINCT id) AS count FROM users WHERE society_id = ? AND role != "SUPER_ADMIN"', [societyId]);
      const current = Number(uRows[0].count);
      if (current + delta > max) {
        return {
          allowed: false,
          current,
          max,
          reason: `User limit exceeded! Current: ${current}/${max} registered users. Please upgrade your subscription plan.`,
        };
      }
      return { allowed: true, current, max };
    }

    if (limitType === 'WORKERS') {
      const max = soc.ov_workers !== null ? soc.ov_workers : soc.max_workers;
      const [wRows] = await connection.query('SELECT COUNT(DISTINCT id) AS count FROM workers WHERE society_id = ?', [societyId]);
      const current = Number(wRows[0].count);
      if (current + delta > max) {
        return {
          allowed: false,
          current,
          max,
          reason: `Worker limit exceeded! Current: ${current}/${max} registered staff.`,
        };
      }
      return { allowed: true, current, max };
    }

    if (limitType === 'GATES') {
      const max = soc.ov_gates ?? soc.max_gates ?? 5;
      const [gRows] = await connection.query('SELECT COUNT(*) AS count FROM gates WHERE society_id = ?', [societyId]);
      const current = Number(gRows[0].count);
      if (current + delta > max) {
        return {
          allowed: false,
          current,
          max,
          reason: `Gate creation limit reached! Your society has reached the maximum capacity of ${max} gates allowed by your subscription plan (${current}/${max} gates created). Please contact super admin or upgrade your plan to create more gates.`,
        };
      }
      return { allowed: true, current, max };
    }

    return { allowed: true };
  }

  static async setLimitOverride(arg1, arg2, arg3, arg4) {
    let societyId, max_units, max_users, max_workers, reason, actorUserId;

    if (typeof arg1 === 'object') {
      societyId = arg1.societyId || arg1.society_id;
      reason = arg1.reason || 'Approved by Super Admin';
      actorUserId = arg1.approvedBy || arg1.actorUserId || 1;

      // Check current limits for the society to preserve other resource limits
      const [curr] = await pool.query('SELECT max_units, max_users, max_workers, max_gates FROM societies WHERE id = ?', [societyId]);
      const [currOv] = await pool.query('SELECT max_units, max_users, max_workers, max_gates FROM society_limit_overrides WHERE society_id = ?', [societyId]);

      max_units = currOv[0]?.max_units ?? curr[0]?.max_units ?? 100;
      max_users = currOv[0]?.max_users ?? curr[0]?.max_users ?? 50;
      max_workers = currOv[0]?.max_workers ?? curr[0]?.max_workers ?? 20;
      max_gates = currOv[0]?.max_gates ?? curr[0]?.max_gates ?? 5;

      const limitType = arg1.limitType || arg1.limit_type;
      const overrideVal = Number(arg1.overrideValue || arg1.override_value);

      if (limitType === 'UNITS') max_units = overrideVal;
      else if (limitType === 'USERS') max_users = overrideVal;
      else if (limitType === 'WORKERS') max_workers = overrideVal;
      else if (limitType === 'GATES') max_gates = overrideVal;
      else {
        if (arg1.maxUnits !== undefined) max_units = arg1.maxUnits;
        if (arg1.maxUsers !== undefined) max_users = arg1.maxUsers;
        if (arg1.maxWorkers !== undefined) max_workers = arg1.maxWorkers;
        if (arg1.maxGates !== undefined) max_gates = arg1.maxGates;
      }
    } else {
      societyId = arg1;
      const limits = arg2 || {};
      max_units = limits.max_units || limits.maxUnits;
      max_users = limits.max_users || limits.maxUsers;
      max_workers = limits.max_workers || limits.maxWorkers;
      reason = arg3;
      actorUserId = arg4;
    }

    await pool.query(`
      INSERT INTO society_limit_overrides (society_id, max_units, max_users, max_workers, max_gates, reason, created_by_user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        max_units = VALUES(max_units), 
        max_users = VALUES(max_users), 
        max_workers = VALUES(max_workers), 
        max_gates = VALUES(max_gates), 
        reason = VALUES(reason),
        updated_at = CURRENT_TIMESTAMP
    `, [societyId, max_units, max_users, max_workers, reason, actorUserId || 1]);

    await pool.query(`
      INSERT INTO platform_audit_logs (actor_user_id, action, entity_type, entity_id, details_json)
      VALUES (?, 'SET_LIMIT_OVERRIDE', 'SOCIETY', ?, ?)
    `, [actorUserId || 1, societyId, JSON.stringify({ max_units, max_users, max_workers, reason })]);

    return this.getSocietyUsage(societyId);
  }

  // ==========================================================================
  // 6. SUBSCRIPTION ASSIGNMENT, CHANGE & RENEWALS
  // ==========================================================================

  static async assignSubscription(arg1, arg2, arg3) {
    let societyId, data, actorUserId;
    if (typeof arg1 === 'object') {
      societyId = arg1.societyId || arg1.society_id;
      actorUserId = arg2 || arg1.actorUserId || 1;
      data = {
        plan_id: arg1.planId || arg1.plan_id,
        billing_cycle: arg1.billingCycle || arg1.billing_cycle || 'MONTHLY',
        start_date: arg1.startDate || arg1.start_date || new Date().toISOString().split('T')[0],
        status: arg1.status || 'ACTIVE',
        notes: arg1.notes || '',
      };
    } else {
      societyId = arg1;
      data = arg2;
      actorUserId = arg3 || 1;
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const { plan_id, billing_cycle = 'MONTHLY', start_date = new Date().toISOString().split('T')[0], status = 'ACTIVE' } = data;

      const [pRows] = await connection.query('SELECT * FROM subscription_plans WHERE id = ?', [plan_id]);
      if (pRows.length === 0) throw new Error('Plan not found');
      const plan = pRows[0];

      // Calculate end date based on billing cycle
      const start = new Date(start_date);
      const end = new Date(start);
      if (billing_cycle === 'YEARLY') end.setFullYear(end.getFullYear() + 1);
      else if (billing_cycle === 'HALF_YEARLY') end.setMonth(end.getMonth() + 6);
      else if (billing_cycle === 'QUARTERLY') end.setMonth(end.getMonth() + 3);
      else end.setMonth(end.getMonth() + 1);

      const endDateStr = end.toISOString().split('T')[0];

      // Expire previous active subscriptions
      await connection.query(
        "UPDATE society_subscriptions SET status = 'CANCELLED' WHERE society_id = ? AND status IN ('ACTIVE', 'TRIAL')",
        [societyId]
      );

      // Create new subscription
      const [subResult] = await connection.query(`
        INSERT INTO society_subscriptions (
          society_id, plan_id, start_date, end_date, billing_cycle,
          price_snapshot, status, auto_renew
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)
      `, [societyId, plan.id, start_date, endDateStr, billing_cycle, plan.price, status]);

      // Update society record
      await connection.query(`
        UPDATE societies 
        SET subscription_plan_id = ?, subscription_status = ?, max_units = ?, max_users = ?, max_workers = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [plan.id, status, plan.max_units, plan.max_users, plan.max_workers, societyId]);

      // Generate invoice
      const invNumber = `SUB-INV-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
      await connection.query(`
        INSERT INTO subscription_invoices (
          invoice_number, society_id, plan_id, subscription_id, amount,
          billing_period_start, billing_period_end, due_date, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
      `, [invNumber, societyId, plan.id, subResult.insertId, plan.price, start_date, endDateStr, start_date]);

      // Audit Log
      await connection.query(`
        INSERT INTO platform_audit_logs (actor_user_id, action, entity_type, entity_id, details_json)
        VALUES (?, 'ASSIGN_SUBSCRIPTION', 'SOCIETY', ?, ?)
      `, [actorUserId || 1, societyId, JSON.stringify({ plan_id, plan_name: plan.name, price: plan.price })]);

      await connection.commit();
      return this.findSocietyById(societyId);
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  // ==========================================================================
  // 7. SUBSCRIPTION BILLING & PAYMENTS
  // ==========================================================================

  static async getSubscriptions(filters = {}) {
    let query = `
      SELECT sub.*,
             s.name AS society_name, s.code AS society_code,
             p.name AS plan_name, p.billing_cycle, p.price, p.max_units, p.max_users, p.max_workers
      FROM society_subscriptions sub
      JOIN societies s ON sub.society_id = s.id
      JOIN subscription_plans p ON sub.plan_id = p.id
      WHERE 1=1
    `;
    const params = [];
    if (filters.societyId || filters.society_id) {
      query += ` AND sub.society_id = ?`;
      params.push(filters.societyId || filters.society_id);
    }
    if (filters.status && filters.status !== 'ALL') {
      query += ` AND sub.status = ?`;
      params.push(filters.status);
    }
    query += ` ORDER BY sub.id DESC`;
    const [rows] = await pool.query(query, params);
    return rows;
  }

  static async getInvoices(filters = {}) {
    let query = `
      SELECT inv.*,
             s.name AS society_name, s.code AS society_code,
             p.name AS plan_name, p.billing_cycle,
             (SELECT COUNT(*) FROM subscription_payments WHERE invoice_id = inv.id AND payment_status = 'PAID') AS is_paid
      FROM subscription_invoices inv
      JOIN societies s ON inv.society_id = s.id
      JOIN subscription_plans p ON inv.plan_id = p.id
      WHERE 1=1
    `;
    const params = [];

    const targetSocId = filters.society_id || filters.societyId;
    if (targetSocId) {
      query += ` AND inv.society_id = ?`;
      params.push(targetSocId);
    }
    if (filters.status && filters.status !== 'ALL') {
      query += ` AND inv.status = ?`;
      params.push(filters.status);
    }

    query += ` ORDER BY inv.id DESC`;

    const [rows] = await pool.query(query, params);
    return rows;
  }

  static async recordSubscriptionPayment(paymentData, actorUserId) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const invoiceId = paymentData.invoice_id || paymentData.invoiceId;
      const amount = paymentData.amount;
      const paymentMethod = paymentData.payment_method || paymentData.paymentMethod || 'BANK_TRANSFER';
      const transactionRef = paymentData.transaction_reference || paymentData.transactionRef || `TXN-${Date.now()}`;
      const notes = paymentData.notes || null;

      const [invRows] = await connection.query('SELECT * FROM subscription_invoices WHERE id = ?', [invoiceId]);
      if (invRows.length === 0) throw new Error('Subscription invoice not found');
      const invoice = invRows[0];

      const receiptNumber = `SUB-RCP-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

      // Insert payment
      await connection.query(`
        INSERT INTO subscription_payments (
          receipt_number, invoice_id, society_id, amount, payment_method,
          transaction_reference, payment_status, notes
        ) VALUES (?, ?, ?, ?, ?, ?, 'PAID', ?)
      `, [
        receiptNumber,
        invoice.id,
        invoice.society_id,
        Number(amount || invoice.amount),
        paymentMethod,
        transactionRef,
        notes,
      ]);

      // Update invoice status to PAID
      await connection.query("UPDATE subscription_invoices SET status = 'PAID', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [invoice.id]);

      // Ensure society subscription status is active
      await connection.query("UPDATE societies SET subscription_status = 'ACTIVE' WHERE id = ?", [invoice.society_id]);
      await connection.query("UPDATE society_subscriptions SET status = 'ACTIVE' WHERE society_id = ?", [invoice.society_id]);

      // Audit Log
      await connection.query(`
        INSERT INTO platform_audit_logs (actor_user_id, action, entity_type, entity_id, details_json)
        VALUES (?, 'SUBSCRIPTION_PAYMENT_RECORDED', 'INVOICE', ?, ?)
      `, [actorUserId || 1, invoice.id, JSON.stringify({ receiptNumber, amount: Number(amount || invoice.amount), paymentMethod, transactionRef })]);

      await connection.commit();
      return { success: true, receiptNumber, receipt_number: receiptNumber, invoiceId: invoice.id, status: 'PAID' };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  static async getPlatformAuditLogs(limit = 50) {
    const [rows] = await pool.query(`
      SELECT pal.*, u.full_name AS actor_name, u.role AS actor_role, u.email AS actor_email
      FROM platform_audit_logs pal
      LEFT JOIN users u ON pal.actor_user_id = u.id
      ORDER BY pal.created_at DESC
      LIMIT ?
    `, [limit]);

    return rows.map((r) => ({
      ...r,
      details: typeof r.details_json === 'string' ? JSON.parse(r.details_json || '{}') : r.details_json,
    }));
  }
}

module.exports = SubscriptionRepository;
