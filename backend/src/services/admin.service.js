const { pool } = require('../config/db');

/**
 * Admin Service: Gathers high-level society analytics, core metrics,
 * and comprehensive audit activity feeds for the Admin Dashboard.
 */
class AdminService {
  /**
   * Fetch complete Admin Dashboard data
   */
  static async getDashboardData(societyId = null) {
    // 1. Core 12 Metrics
    const [homesRow] = await pool.query(`
      SELECT 
        COUNT(*) AS totalHomes,
        SUM(CASE WHEN occupancy_status IN ('OCCUPIED_BY_OWNER', 'OCCUPIED_BY_TENANT') THEN 1 ELSE 0 END) AS occupiedHomes,
        SUM(CASE WHEN occupancy_status = 'VACANT' THEN 1 ELSE 0 END) AS vacantHomes,
        SUM(CASE WHEN occupancy_status = 'OCCUPIED_BY_OWNER' THEN 1 ELSE 0 END) AS ownerOccupied,
        SUM(CASE WHEN occupancy_status = 'OCCUPIED_BY_TENANT' THEN 1 ELSE 0 END) AS tenantOccupied
      FROM homes
      ${societyId ? 'WHERE society_id = ?' : ''}
    `, societyId ? [societyId] : []);

    const [ownersRow] = await pool.query(`
      SELECT COUNT(*) AS total 
      FROM residents r
      JOIN homes h ON r.home_id = h.id
      WHERE r.resident_type = 'OWNER' AND r.status = 'ACTIVE'
      ${societyId ? 'AND h.society_id = ?' : ''}
    `, societyId ? [societyId] : []);

    const [tenantsRow] = await pool.query(`
      SELECT COUNT(*) AS total 
      FROM residents r
      JOIN homes h ON r.home_id = h.id
      WHERE r.resident_type = 'TENANT' AND r.status = 'ACTIVE'
      ${societyId ? 'AND h.society_id = ?' : ''}
    `, societyId ? [societyId] : []);

    const [familyRow] = await pool.query(`
      SELECT COUNT(*) AS total 
      FROM family_members fm
      JOIN homes h ON fm.home_id = h.id
      WHERE fm.status = 'ACTIVE'
      ${societyId ? 'AND h.society_id = ?' : ''}
    `, societyId ? [societyId] : []);

    const [securityRow] = await pool.query(`
      SELECT COUNT(*) AS total 
      FROM security_staff 
      WHERE status = 'ACTIVE'
      ${societyId ? 'AND society_id = ?' : ''}
    `, societyId ? [societyId] : []);

    const [workersRow] = await pool.query(`
      SELECT COUNT(*) AS total 
      FROM workers 
      WHERE status = 'ACTIVE'
      ${societyId ? 'AND society_id = ?' : ''}
    `, societyId ? [societyId] : []);

    const [committeeRow] = await pool.query(`
      SELECT COUNT(*) AS total 
      FROM committee_members 
      WHERE status = 'ACTIVE'
      ${societyId ? 'AND society_id = ?' : ''}
    `, societyId ? [societyId] : []);

    const [todayVisitorsRow] = await pool.query(`
      SELECT COUNT(*) AS total 
      FROM visitor_entries ve
      JOIN homes h ON ve.home_id = h.id
      WHERE DATE(ve.created_at) = CURRENT_DATE()
      ${societyId ? 'AND h.society_id = ?' : ''}
    `, societyId ? [societyId] : []);

    const [todayDeliveriesRow] = await pool.query(`
      SELECT COUNT(*) AS total 
      FROM deliveries d
      WHERE DATE(d.created_at) = CURRENT_DATE()
      ${societyId ? 'AND d.society_id = ?' : ''}
    `, societyId ? [societyId] : []);

    const [todayGateEntriesRow] = await pool.query(`
      SELECT COUNT(*) AS total 
      FROM gate_entries ge
      WHERE DATE(ge.created_at) = CURRENT_DATE()
      ${societyId ? 'AND ge.society_id = ?' : ''}
    `, societyId ? [societyId] : []);

    const [totalAnnouncementsRow] = await pool.query(`
      SELECT COUNT(*) AS total 
      FROM announcements
      ${societyId ? 'WHERE society_id = ?' : ''}
    `, societyId ? [societyId] : []);

    // Society general info
    const [societyRow] = await pool.query(`
      SELECT 
        s.id, s.name, s.code, s.society_type, s.total_homes, s.address, s.contact_number, s.status,
        s.subscription_plan_id, s.subscription_status, s.max_units, s.max_users, s.max_workers
      FROM societies s
      ${societyId ? 'WHERE s.id = ?' : 'ORDER BY s.id ASC LIMIT 1'}
    `, societyId ? [societyId] : []);

    const societyTotal = Number(societyRow[0]?.total_homes || 0);
    const dbTotalHomes = Number(homesRow[0]?.totalHomes || 0);
    const totalHomes = societyTotal > 0 ? societyTotal : dbTotalHomes;
    const occupiedHomes = Number(homesRow[0]?.occupiedHomes || 0);
    const vacantHomes = Math.max(0, totalHomes - occupiedHomes);
    const ownerOccupied = Number(homesRow[0]?.ownerOccupied || 0);
    const tenantOccupied = Number(homesRow[0]?.tenantOccupied || 0);

    const stats = {
      totalHomes,
      occupiedHomes,
      vacantHomes,
      owners: Number(ownersRow[0]?.total || 0),
      tenants: Number(tenantsRow[0]?.total || 0),
      familyMembers: Number(familyRow[0]?.total || 0),
      securityStaff: Number(securityRow[0]?.total || 0),
      workers: Number(workersRow[0]?.total || 0),
      committeeMembers: Number(committeeRow[0]?.total || 0),
      announcements: Number(totalAnnouncementsRow[0]?.total || 0),
      todayVisitors: Number(todayVisitorsRow[0]?.total || 0),
      todayDeliveries: Number(todayDeliveriesRow[0]?.total || 0),
      todayGateEntries: Number(todayGateEntriesRow[0]?.total || 0),
    };

    // 2. Fetch Recent Activities for all 6 required categories
    // Category 1: Visitor entered
    const [visitorEnteredRows] = await pool.query(`
      SELECT 
        ve.id,
        'VISITOR_ENTERED' AS activity_type,
        'Visitor entered' AS activity_label,
        v.full_name AS person_name,
        h.home_number,
        ve.purpose,
        ve.check_in_time,
        ve.created_at,
        v.visitor_type,
        v.vehicle_number
      FROM visitor_entries ve
      JOIN visitors v ON ve.visitor_id = v.id
      JOIN homes h ON ve.home_id = h.id
      WHERE ve.status IN ('INSIDE', 'ENTERED', 'APPROVED')
      ${societyId ? 'AND h.society_id = ?' : ''}
      ORDER BY ve.created_at DESC
      LIMIT 6
    `, societyId ? [societyId] : []);

    // Category 2: Delivery approved
    const [deliveryApprovedRows] = await pool.query(`
      SELECT 
        d.id,
        'DELIVERY_APPROVED' AS activity_type,
        'Delivery approved' AS activity_label,
        d.delivery_company,
        d.delivery_person_name,
        h.home_number,
        d.approval_status,
        d.created_at,
        d.status
      FROM deliveries d
      JOIN homes h ON d.home_id = h.id
      WHERE d.approval_status = 'APPROVED'
      ${societyId ? 'AND d.society_id = ?' : ''}
      ORDER BY d.created_at DESC
      LIMIT 6
    `, societyId ? [societyId] : []);

    // Category 3: Visitor exited
    const [visitorExitedRows] = await pool.query(`
      SELECT 
        ve.id,
        'VISITOR_EXITED' AS activity_type,
        'Visitor exited' AS activity_label,
        v.full_name AS person_name,
        h.home_number,
        ve.purpose,
        ve.check_out_time,
        COALESCE(ve.check_out_time, ve.created_at) AS created_at,
        v.visitor_type
      FROM visitor_entries ve
      JOIN visitors v ON ve.visitor_id = v.id
      JOIN homes h ON ve.home_id = h.id
      WHERE ve.status IN ('CHECKED_OUT', 'EXITED')
      ${societyId ? 'AND h.society_id = ?' : ''}
      ORDER BY ve.created_at DESC
      LIMIT 6
    `, societyId ? [societyId] : []);

    // Category 4: New resident
    const [newResidentRows] = await pool.query(`
      SELECT 
        r.id,
        'NEW_RESIDENT' AS activity_type,
        'New resident' AS activity_label,
        u.full_name AS person_name,
        r.resident_type,
        h.home_number,
        r.created_at
      FROM residents r
      JOIN users u ON r.user_id = u.id
      JOIN homes h ON r.home_id = h.id
      ${societyId ? 'WHERE h.society_id = ?' : ''}
      ORDER BY r.created_at DESC
      LIMIT 6
    `, societyId ? [societyId] : []);

    // Category 5: New worker
    const [newWorkerRows] = await pool.query(`
      SELECT 
        w.id,
        'NEW_WORKER' AS activity_type,
        'New worker' AS activity_label,
        w.full_name AS person_name,
        w.worker_type,
        w.pass_code,
        w.created_at
      FROM workers w
      ${societyId ? 'WHERE w.society_id = ?' : ''}
      ORDER BY w.created_at DESC
      LIMIT 6
    `, societyId ? [societyId] : []);

    // Category 6: Committee announcement
    const [announcementRows] = await pool.query(`
      SELECT 
        a.id,
        'COMMITTEE_ANNOUNCEMENT' AS activity_type,
        'Committee announcement' AS activity_label,
        a.title,
        a.type AS announcement_type,
        a.priority,
        a.created_at,
        u.full_name AS created_by_name
      FROM announcements a
      LEFT JOIN users u ON a.created_by_user_id = u.id
      ${societyId ? 'WHERE a.society_id = ?' : ''}
      ORDER BY a.created_at DESC
      LIMIT 6
    `, societyId ? [societyId] : []);

    // Format all activities into standardized timeline items
    const formattedActivities = [];

    visitorEnteredRows.forEach((item) => {
      formattedActivities.push({
        id: `act-vis-in-${item.id}`,
        type: 'VISITOR_ENTERED',
        label: 'Visitor entered',
        title: `${item.person_name} entered for Home ${item.home_number}`,
        subtitle: `Purpose: ${item.purpose || 'Visit'} ${item.vehicle_number ? `• Vehicle: ${item.vehicle_number}` : ''}`,
        homeNumber: item.home_number,
        timestamp: item.check_in_time || item.created_at,
        badgeColor: 'emerald',
      });
    });

    deliveryApprovedRows.forEach((item) => {
      formattedActivities.push({
        id: `act-del-app-${item.id}`,
        type: 'DELIVERY_APPROVED',
        label: 'Delivery approved',
        title: `${item.delivery_company} delivery approved for Home ${item.home_number}`,
        subtitle: `Agent: ${item.delivery_person_name || 'Delivery Partner'} • Status: Gate Entry Granted`,
        homeNumber: item.home_number,
        timestamp: item.created_at,
        badgeColor: 'blue',
      });
    });

    visitorExitedRows.forEach((item) => {
      formattedActivities.push({
        id: `act-vis-out-${item.id}`,
        type: 'VISITOR_EXITED',
        label: 'Visitor exited',
        title: `${item.person_name} exited from Home ${item.home_number}`,
        subtitle: `Check-out completed at gate • Visit completed`,
        homeNumber: item.home_number,
        timestamp: item.check_out_time || item.created_at,
        badgeColor: 'amber',
      });
    });

    newResidentRows.forEach((item) => {
      formattedActivities.push({
        id: `act-res-${item.id}`,
        type: 'NEW_RESIDENT',
        label: 'New resident',
        title: `${item.person_name} registered as ${item.resident_type}`,
        subtitle: `Assigned to Home ${item.home_number} • Account verified & active`,
        homeNumber: item.home_number,
        timestamp: item.created_at,
        badgeColor: 'purple',
      });
    });

    newWorkerRows.forEach((item) => {
      formattedActivities.push({
        id: `act-wrk-${item.id}`,
        type: 'NEW_WORKER',
        label: 'New worker',
        title: `${item.person_name} registered as ${item.worker_type}`,
        subtitle: `Pass Code: ${item.pass_code || 'VERIFIED'} • Domestic staff registry updated`,
        homeNumber: null,
        timestamp: item.created_at,
        badgeColor: 'cyan',
      });
    });

    announcementRows.forEach((item) => {
      formattedActivities.push({
        id: `act-ann-${item.id}`,
        type: 'COMMITTEE_ANNOUNCEMENT',
        label: 'Committee announcement',
        title: `Announcement: ${item.title}`,
        subtitle: `Type: ${item.announcement_type} • Posted by ${item.created_by_name || 'Society Committee'}`,
        homeNumber: null,
        timestamp: item.created_at,
        badgeColor: item.announcement_type === 'EMERGENCY' ? 'rose' : 'indigo',
      });
    });

    // Sort all activities chronologically descending
    formattedActivities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // 3. Occupancy & Gate Traffic Charts
    const occupancyBreakdown = {
      total: totalHomes,
      occupied: occupiedHomes,
      vacant: vacantHomes,
      ownerOccupied,
      tenantOccupied,
      occupancyPercentage: totalHomes > 0 ? Math.round((occupiedHomes / totalHomes) * 100) : 0,
      vacantPercentage: totalHomes > 0 ? Math.round((vacantHomes / totalHomes) * 100) : 0,
    };

    // Gate entry traffic by type
    const [trafficByType] = await pool.query(`
      SELECT 
        entry_person_type, 
        COUNT(*) AS count 
      FROM gate_entries 
      WHERE DATE(created_at) = CURRENT_DATE()
      ${societyId ? 'AND society_id = ?' : ''}
      GROUP BY entry_person_type
    `, societyId ? [societyId] : []);

    const trafficDistribution = {
      VISITOR: 0,
      DELIVERY: 0,
      RESIDENT: 0,
      WORKER: 0,
      STAFF: 0,
    };

    trafficByType.forEach((t) => {
      trafficDistribution[t.entry_person_type] = Number(t.count || 0);
    });

    // 3. Subscription & Purchased Plan Information
    let subscriptionInfo = null;
    const targetSocId = societyRow[0]?.id;
    if (targetSocId) {
      const [subRows] = await pool.query(`
        SELECT ss.id, ss.plan_id, ss.start_date, ss.end_date, ss.billing_cycle, ss.price_snapshot,
               ss.status, ss.trial_ends_at, ss.auto_renew,
               p.name AS plan_name, p.code AS plan_code, p.description AS plan_description,
               p.price AS plan_catalog_price, p.trial_days AS plan_trial_days,
               s.max_units, s.max_users, s.max_workers, s.max_gates, s.subscription_status
        FROM societies s
        LEFT JOIN society_subscriptions ss ON s.id = ss.society_id
        LEFT JOIN subscription_plans p ON (ss.plan_id = p.id OR s.subscription_plan_id = p.id)
        WHERE s.id = ?
        ORDER BY ss.id DESC LIMIT 1
      `, [targetSocId]);

      if (subRows.length > 0 && (subRows[0].plan_name || subRows[0].plan_id || societyRow[0]?.subscription_plan_id)) {
        const sub = subRows[0];
        const planId = sub.plan_id || societyRow[0]?.subscription_plan_id;
        let features = [];
        if (planId) {
          const [featRows] = await pool.query('SELECT feature_code FROM plan_features WHERE plan_id = ?', [planId]);
          features = featRows.map(r => r.feature_code);
        }

        const maxUnits = Number(sub.max_units || societyRow[0]?.max_units || totalHomes || 100);
        const maxUsers = Number(sub.max_users || societyRow[0]?.max_users || 100);
        const maxWorkers = Number(sub.max_workers || societyRow[0]?.max_workers || 50);
        const maxGates = Number(sub.max_gates || societyRow[0]?.max_gates || 5);

        const [gatesCountRow] = await pool.query('SELECT COUNT(*) AS total FROM gates WHERE society_id = ?', [targetSocId]);

        subscriptionInfo = {
          planId,
          planName: sub.plan_name || 'Basic Tier',
          planCode: sub.plan_code || 'BASIC-01',
          planDescription: sub.plan_description || '',
          price: sub.price_snapshot || sub.plan_catalog_price || '0.00',
          billingCycle: sub.billing_cycle || 'MONTHLY',
          status: sub.status || sub.subscription_status || societyRow[0]?.subscription_status || 'ACTIVE',
          startDate: sub.start_date,
          endDate: sub.end_date,
          trialEndsAt: sub.trial_ends_at,
          autoRenew: Boolean(sub.auto_renew),
          maxUnits,
          maxUsers,
          maxWorkers,
          maxGates,
          trialDays: sub.plan_trial_days || 14,
          features,
          usage: {
            totalUnits: totalHomes,
            occupiedUnits: occupiedHomes,
            vacantUnits: vacantHomes,
            totalUsers: Number(ownersRow[0]?.total || 0) + Number(tenantsRow[0]?.total || 0) + Number(familyRow[0]?.total || 0),
            totalGates: Number(gatesCountRow[0]?.total || 0),
            totalWorkers: Number(workersRow[0]?.total || 0),
            totalSecurity: Number(securityRow[0]?.total || 0),
          }
        };
      }
    }

    return {
      society: societyRow[0] || null,
      stats,
      subscription: subscriptionInfo,
      recentActivity: formattedActivities,
      occupancyBreakdown,
      trafficDistribution,
    };
  }
}

module.exports = AdminService;
