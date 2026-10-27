const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { ROLES } = require('../constants/roles');

/**
 * Clean Database Migration:
 * 1. Verifies/creates relational schema from schema.sql.
 * 2. Applies modern enhancements (committees system & announcements schema).
 * 3. Ensures the System Administrator account exists.
 * Note: No mock/dummy societies, residents, or demo data are seeded.
 */
async function migrate() {
  console.log('\n============================================================');
  console.log('  MYVMS: Clean Database Migration & Schema Verification     ');
  console.log('============================================================\n');

  let connection;
  try {
    connection = await pool.getConnection();

    // 1. Read and execute schema.sql DDL if societies table is missing
    const [existing] = await connection.query("SHOW TABLES LIKE 'societies'");
    if (existing.length === 0) {
      const schemaPath = path.join(__dirname, 'schema.sql');
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');

      console.log('[1/3] Executing schema.sql DDL (Core Relational Tables)...');
      await connection.query(schemaSql);
      console.log('✓ Successfully created all core relational tables.');
    } else {
      console.log('[1/3] Database schema verified. Preserving existing operational data.');
    }

    // 2. Ensure committees table and modern columns exist
    console.log('[2/3] Verifying committee and announcement schema alterations...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`committees\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`society_id\` INT NOT NULL,
        \`name\` VARCHAR(150) NOT NULL,
        \`description\` TEXT NULL,
        \`status\` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX \`idx_comm_society\` (\`society_id\`, \`status\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Ensure committee_members columns
    const [commCols] = await connection.query('SHOW COLUMNS FROM committee_members');
    const commColNames = commCols.map((c) => c.Field);
    if (!commColNames.includes('committee_id')) {
      await connection.query('ALTER TABLE committee_members ADD COLUMN committee_id INT NULL AFTER society_id');
    }
    if (!commColNames.includes('committee_name')) {
      await connection.query('ALTER TABLE committee_members ADD COLUMN committee_name VARCHAR(150) NULL AFTER committee_id');
    }
    if (!commColNames.includes('home_id')) {
      await connection.query('ALTER TABLE committee_members ADD COLUMN home_id INT NULL AFTER home_number');
    }
    await connection.query("ALTER TABLE committee_members MODIFY COLUMN designation VARCHAR(100) NOT NULL DEFAULT 'COMMITTEE_MEMBER'");

    // Ensure announcements columns
    const [annCols] = await connection.query('SHOW COLUMNS FROM announcements');
    const annColNames = annCols.map((c) => c.Field);
    if (!annColNames.includes('type')) {
      await connection.query(
        "ALTER TABLE announcements ADD COLUMN type ENUM('GENERAL', 'FESTIVAL', 'EMERGENCY', 'MAINTENANCE', 'MEETING', 'IMPORTANT') NOT NULL DEFAULT 'GENERAL' AFTER title"
      );
    }
    if (!annColNames.includes('description')) {
      await connection.query('ALTER TABLE announcements ADD COLUMN description TEXT NULL AFTER type');
    }
    if (!annColNames.includes('date')) {
      await connection.query('ALTER TABLE announcements ADD COLUMN date DATE NULL DEFAULT (CURRENT_DATE) AFTER description');
    }
    await connection.query(
      "ALTER TABLE announcements MODIFY COLUMN status ENUM('ACTIVE', 'PUBLISHED', 'DRAFT', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE'"
    );

    // Ensure special_charges columns for creator tracking (Admin vs Committee)
    const [scCols] = await connection.query('SHOW COLUMNS FROM special_charges');
    const scColNames = scCols.map((c) => c.Field);
    if (!scColNames.includes('created_by_type')) {
      await connection.query("ALTER TABLE special_charges ADD COLUMN created_by_type VARCHAR(50) NULL DEFAULT 'ADMIN' AFTER created_by_user_id");
    }
    if (!scColNames.includes('creator_member_name')) {
      await connection.query("ALTER TABLE special_charges ADD COLUMN creator_member_name VARCHAR(150) NULL AFTER created_by_type");
    }

    // Ensure resident_permissions is Home-wise (UNIQUE home_id, user_id NULL)
    const [permIndexes] = await connection.query("SHOW INDEX FROM resident_permissions WHERE Key_name = 'uq_home_permission'");
    if (permIndexes.length === 0) {
      await connection.query(`
        DELETE rp1 FROM resident_permissions rp1
        INNER JOIN resident_permissions rp2 
        WHERE rp1.id > rp2.id AND rp1.home_id = rp2.home_id
      `);
      try { await connection.query("ALTER TABLE resident_permissions DROP INDEX uq_home_user_permission"); } catch (_) {}
      await connection.query("ALTER TABLE resident_permissions MODIFY COLUMN user_id INT NULL");
      await connection.query("ALTER TABLE resident_permissions ADD UNIQUE KEY uq_home_permission (home_id)");
    }

    console.log('✓ Schema extensions verified.');

    // 2b. Ensure Maintenance System Tables Exist
    console.log('[2b/3] Verifying maintenance tables (plans, bills, payments)...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`maintenance_plans\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`society_id\` INT NOT NULL,
        \`name\` VARCHAR(150) NOT NULL,
        \`applicable_type\` ENUM('1BHK', '2BHK', '3BHK', '4BHK', 'VILLA', 'BUNGALOW', 'PENTHOUSE', 'STUDIO', 'ALL') NOT NULL DEFAULT 'ALL',
        \`amount\` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        \`billing_cycle\` ENUM('MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY') NOT NULL DEFAULT 'MONTHLY',
        \`due_day\` INT NOT NULL DEFAULT 5,
        \`grace_period_days\` INT NOT NULL DEFAULT 5,
        \`penalty_type\` ENUM('FIXED', 'PERCENTAGE') NOT NULL DEFAULT 'FIXED',
        \`penalty_rate\` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        \`description\` TEXT NULL,
        \`status\` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX \`idx_plan_society\` (\`society_id\`, \`status\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`maintenance_bills\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`bill_number\` VARCHAR(50) NOT NULL UNIQUE,
        \`society_id\` INT NOT NULL,
        \`home_id\` INT NOT NULL,
        \`resident_id\` INT NULL,
        \`plan_id\` INT NULL,
        \`title\` VARCHAR(200) NOT NULL,
        \`billing_period\` VARCHAR(50) NOT NULL,
        \`billing_cycle\` ENUM('MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY') NOT NULL DEFAULT 'MONTHLY',
        \`base_amount\` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        \`penalty_amount\` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        \`total_amount\` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        \`paid_amount\` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        \`balance_amount\` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        \`due_date\` DATE NOT NULL,
        \`status\` ENUM('PENDING', 'PARTIALLY_PAID', 'PENDING_APPROVAL', 'PAID', 'OVERDUE') NOT NULL DEFAULT 'PENDING',
        \`notes\` TEXT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX \`idx_bill_society_status\` (\`society_id\`, \`status\`),
        INDEX \`idx_bill_home\` (\`home_id\`),
        INDEX \`idx_bill_period\` (\`billing_period\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Ensure status enum in maintenance_bills includes PENDING_APPROVAL
    await connection.query(`
      ALTER TABLE \`maintenance_bills\`
      MODIFY COLUMN \`status\` ENUM('PENDING', 'PARTIALLY_PAID', 'PENDING_APPROVAL', 'PAID', 'OVERDUE') NOT NULL DEFAULT 'PENDING';
    `).catch(() => {});

    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`maintenance_payments\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`receipt_number\` VARCHAR(50) NOT NULL UNIQUE,
        \`bill_id\` INT NOT NULL,
        \`society_id\` INT NOT NULL,
        \`home_id\` INT NOT NULL,
        \`paid_by_user_id\` INT NULL,
        \`amount\` DECIMAL(10,2) NOT NULL,
        \`payment_method\` ENUM('CASH', 'UPI', 'NET_BANKING', 'CHEQUE', 'CARD') NOT NULL DEFAULT 'UPI',
        \`status\` ENUM('PENDING_APPROVAL', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'APPROVED',
        \`transaction_reference\` VARCHAR(100) NULL,
        \`payment_date\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`collected_by_user_id\` INT NULL,
        \`approved_by_user_id\` INT NULL,
        \`approved_at\` TIMESTAMP NULL,
        \`rejection_reason\` TEXT NULL,
        \`remarks\` TEXT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX \`idx_pay_bill\` (\`bill_id\`),
        INDEX \`idx_pay_society\` (\`society_id\`),
        INDEX \`idx_pay_home\` (\`home_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Ensure approval columns exist on existing maintenance_payments table
    const [existingPayCols] = await connection.query(`SHOW COLUMNS FROM \`maintenance_payments\` LIKE 'status'`);
    if (existingPayCols.length === 0) {
      await connection.query(`
        ALTER TABLE \`maintenance_payments\`
        ADD COLUMN \`status\` ENUM('PENDING_APPROVAL', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'APPROVED' AFTER \`payment_method\`,
        ADD COLUMN \`approved_by_user_id\` INT NULL AFTER \`collected_by_user_id\`,
        ADD COLUMN \`approved_at\` TIMESTAMP NULL AFTER \`approved_by_user_id\`,
        ADD COLUMN \`rejection_reason\` TEXT NULL AFTER \`approved_at\`;
      `).catch(() => {});
    }

    console.log('✓ Maintenance system tables verified.');

    // 2c. Ensure Special Charges System Tables Exist
    console.log('[2c/3] Verifying special charges tables (special_charges, assignments, payments)...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`special_charges\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`society_id\` INT NOT NULL,
        \`committee_id\` INT NULL,
        \`committee_name\` VARCHAR(150) NULL,
        \`created_by_user_id\` INT NOT NULL,
        \`title\` VARCHAR(255) NOT NULL,
        \`category\` VARCHAR(100) NOT NULL DEFAULT 'REPAIR',
        \`amount\` DECIMAL(10,2) NOT NULL,
        \`due_date\` DATE NOT NULL,
        \`description\` TEXT NULL,
        \`target_scope\` VARCHAR(50) DEFAULT 'ALL_HOMES',
        \`status\` ENUM('ACTIVE','COMPLETED','CANCELLED') DEFAULT 'ACTIVE',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX \`idx_sc_society\` (\`society_id\`, \`status\`),
        INDEX \`idx_sc_committee\` (\`committee_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`special_charge_assignments\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`charge_id\` INT NOT NULL,
        \`society_id\` INT NOT NULL,
        \`home_id\` INT NOT NULL,
        \`resident_user_id\` INT NULL,
        \`amount\` DECIMAL(10,2) NOT NULL,
        \`paid_amount\` DECIMAL(10,2) DEFAULT '0.00',
        \`balance_amount\` DECIMAL(10,2) NOT NULL,
        \`status\` ENUM('PENDING','PAID','PARTIALLY_PAID','WAIVED') DEFAULT 'PENDING',
        \`paid_date\` TIMESTAMP NULL,
        \`payment_method\` VARCHAR(50) NULL,
        \`transaction_reference\` VARCHAR(100) NULL,
        \`receipt_number\` VARCHAR(100) NULL,
        \`notes\` TEXT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX \`idx_sca_charge\` (\`charge_id\`),
        INDEX \`idx_sca_home\` (\`home_id\`),
        INDEX \`idx_sca_status\` (\`status\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`special_charge_payments\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`assignment_id\` INT NOT NULL,
        \`charge_id\` INT NOT NULL,
        \`society_id\` INT NOT NULL,
        \`home_id\` INT NOT NULL,
        \`paid_by_user_id\` INT NULL,
        \`receipt_number\` VARCHAR(100) NOT NULL UNIQUE,
        \`amount\` DECIMAL(10,2) NOT NULL,
        \`payment_method\` ENUM('UPI','CASH','NET_BANKING','CHEQUE','CARD') DEFAULT 'UPI',
        \`transaction_reference\` VARCHAR(100) NULL,
        \`collected_by_user_id\` INT NULL,
        \`remarks\` TEXT NULL,
        \`payment_date\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX \`idx_scp_assignment\` (\`assignment_id\`),
        INDEX \`idx_scp_charge\` (\`charge_id\`),
        INDEX \`idx_scp_home\` (\`home_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Verify special charge approval status and audit columns
    await connection.query(`
      ALTER TABLE \`special_charge_assignments\` 
      MODIFY COLUMN \`status\` ENUM('PENDING', 'PENDING_APPROVAL', 'PAID', 'PARTIALLY_PAID', 'WAIVED') DEFAULT 'PENDING';
    `).catch(() => {});

    const [scaCols] = await connection.query("SHOW COLUMNS FROM `special_charge_assignments`");
    const scaFields = scaCols.map((c) => c.Field);
    if (!scaFields.includes('pending_payment_id')) {
      await connection.query("ALTER TABLE `special_charge_assignments` ADD COLUMN `pending_payment_id` INT NULL");
    }
    if (!scaFields.includes('approved_by_user_id')) {
      await connection.query("ALTER TABLE `special_charge_assignments` ADD COLUMN `approved_by_user_id` INT NULL");
    }
    if (!scaFields.includes('approved_at')) {
      await connection.query("ALTER TABLE `special_charge_assignments` ADD COLUMN `approved_at` TIMESTAMP NULL");
    }

    const [scpCols] = await connection.query("SHOW COLUMNS FROM `special_charge_payments`");
    const scpFields = scpCols.map((c) => c.Field);
    if (!scpFields.includes('status')) {
      await connection.query("ALTER TABLE `special_charge_payments` ADD COLUMN `status` ENUM('PENDING_APPROVAL', 'APPROVED', 'REJECTED') DEFAULT 'APPROVED'");
    }
    if (!scpFields.includes('approved_by_user_id')) {
      await connection.query("ALTER TABLE `special_charge_payments` ADD COLUMN `approved_by_user_id` INT NULL");
    }
    if (!scpFields.includes('approved_at')) {
      await connection.query("ALTER TABLE `special_charge_payments` ADD COLUMN `approved_at` TIMESTAMP NULL");
    }
    if (!scpFields.includes('admin_remarks')) {
      await connection.query("ALTER TABLE `special_charge_payments` ADD COLUMN `admin_remarks` TEXT NULL");
    }

    console.log('✓ Special charges system tables & approval columns verified.');

    // 2d. Ensure Polls & Surveys Tables Exist
    console.log('[2d/3] Verifying Polls & Surveys tables...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`polls\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`society_id\` INT NOT NULL,
        \`committee_id\` INT NULL,
        \`committee_name\` VARCHAR(150) NULL,
        \`created_by_user_id\` INT NOT NULL,
        \`title\` VARCHAR(255) NOT NULL,
        \`description\` TEXT NULL,
        \`category\` VARCHAR(50) NOT NULL DEFAULT 'GENERAL',
        \`status\` ENUM('ACTIVE', 'CLOSED', 'EXPIRED') NOT NULL DEFAULT 'ACTIVE',
        \`end_date\` DATETIME NOT NULL,
        \`allow_multiple\` BOOLEAN NOT NULL DEFAULT FALSE,
        \`is_anonymous\` BOOLEAN NOT NULL DEFAULT FALSE,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX \`idx_poll_society_status\` (\`society_id\`, \`status\`),
        INDEX \`idx_poll_committee\` (\`committee_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`poll_options\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`poll_id\` INT NOT NULL,
        \`option_text\` VARCHAR(255) NOT NULL,
        \`display_order\` INT NOT NULL DEFAULT 0,
        \`votes_count\` INT NOT NULL DEFAULT 0,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX \`idx_option_poll\` (\`poll_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`poll_votes\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`poll_id\` INT NOT NULL,
        \`option_id\` INT NOT NULL,
        \`user_id\` INT NOT NULL,
        \`home_id\` INT NULL,
        \`voted_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY \`uq_poll_user\` (\`poll_id\`, \`user_id\`),
        INDEX \`idx_vote_poll\` (\`poll_id\`),
        INDEX \`idx_vote_option\` (\`option_id\`),
        INDEX \`idx_vote_user\` (\`user_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    try {
      const [pCols] = await connection.query(`SHOW COLUMNS FROM \`polls\``);
      const pFieldNames = pCols.map((c) => c.Field);
      if (!pFieldNames.includes('created_by_type')) {
        await connection.query(`ALTER TABLE \`polls\` ADD COLUMN \`created_by_type\` VARCHAR(50) NULL DEFAULT 'ADMIN' AFTER \`created_by_user_id\``);
      }
      if (!pFieldNames.includes('creator_member_name')) {
        await connection.query(`ALTER TABLE \`polls\` ADD COLUMN \`creator_member_name\` VARCHAR(150) NULL AFTER \`created_by_type\``);
      }
    } catch (_) {}

    console.log('✓ Polls & Surveys system tables verified.');

    // 2e. Ensure Amenities Management System Tables Exist
    console.log('[2e/3] Verifying Amenities Management tables...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`amenities\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`society_id\` INT NOT NULL,
        \`name\` VARCHAR(150) NOT NULL,
        \`category\` VARCHAR(100) NOT NULL DEFAULT 'OTHER',
        \`description\` TEXT NULL,
        \`location_or_building\` VARCHAR(150) NULL,
        \`images_json\` JSON NULL,
        \`max_capacity\` INT NOT NULL DEFAULT 50,
        \`access_type\` ENUM('FREE', 'PAID', 'FREE_WITH_PAID_EVENTS') NOT NULL DEFAULT 'FREE',
        \`booking_type\` ENUM('HOURLY', 'SLOT', 'PER_DAY', 'PER_EVENT') NOT NULL DEFAULT 'HOURLY',
        \`booking_fee\` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        \`security_deposit\` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        \`available_days_json\` JSON NULL,
        \`opening_time\` TIME NOT NULL DEFAULT '06:00:00',
        \`closing_time\` TIME NOT NULL DEFAULT '22:00:00',
        \`slot_duration_minutes\` INT NOT NULL DEFAULT 60,
        \`buffer_minutes\` INT NOT NULL DEFAULT 15,
        \`advance_booking_days\` INT NOT NULL DEFAULT 30,
        \`min_duration_hours\` INT NOT NULL DEFAULT 1,
        \`max_duration_hours\` INT NOT NULL DEFAULT 8,
        \`requires_approval\` BOOLEAN NOT NULL DEFAULT TRUE,
        \`cancellation_policy\` TEXT NULL,
        \`rules\` TEXT NULL,
        \`status\` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX \`idx_amenity_soc_status\` (\`society_id\`, \`status\`),
        INDEX \`idx_amenity_category\` (\`category\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`amenity_blocked_dates\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`amenity_id\` INT NOT NULL,
        \`society_id\` INT NOT NULL,
        \`start_date\` DATE NOT NULL,
        \`end_date\` DATE NOT NULL,
        \`start_time\` TIME NULL,
        \`end_time\` TIME NULL,
        \`reason\` VARCHAR(255) NOT NULL,
        \`created_by_user_id\` INT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX \`idx_abd_amenity_dates\` (\`amenity_id\`, \`start_date\`, \`end_date\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`amenity_pricing_rules\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`amenity_id\` INT NOT NULL,
        \`society_id\` INT NOT NULL,
        \`rule_name\` VARCHAR(150) NOT NULL,
        \`rule_type\` ENUM('WEEKEND', 'PEAK_HOURS', 'FESTIVAL_SPECIAL', 'CUSTOM') NOT NULL DEFAULT 'CUSTOM',
        \`rate_multiplier\` DECIMAL(5,2) DEFAULT 1.00,
        \`flat_rate\` DECIMAL(10,2) NULL,
        \`start_time\` TIME NULL,
        \`end_time\` TIME NULL,
        \`applicable_days_json\` JSON NULL,
        \`special_date\` DATE NULL,
        \`status\` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX \`idx_apr_amenity\` (\`amenity_id\`, \`status\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`amenity_bookings\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`booking_number\` VARCHAR(50) NOT NULL UNIQUE,
        \`society_id\` INT NOT NULL,
        \`amenity_id\` INT NOT NULL,
        \`home_id\` INT NOT NULL,
        \`resident_id\` INT NOT NULL,
        \`booking_date\` DATE NOT NULL,
        \`start_time\` TIME NOT NULL,
        \`end_time\` TIME NOT NULL,
        \`duration_hours\` DECIMAL(4,2) NOT NULL DEFAULT 1.00,
        \`purpose\` VARCHAR(255) NOT NULL,
        \`expected_guests\` INT NOT NULL DEFAULT 1,
        \`additional_notes\` TEXT NULL,
        \`pricing_breakdown_json\` JSON NULL,
        \`booking_fee\` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        \`security_deposit\` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        \`total_amount\` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        \`payment_status\` ENUM('PENDING', 'PARTIALLY_PAID', 'PAID', 'FAILED', 'REFUNDED') NOT NULL DEFAULT 'PENDING',
        \`booking_status\` ENUM('PENDING_APPROVAL', 'APPROVED', 'CONFIRMED', 'REJECTED', 'CANCELLED', 'COMPLETED', 'NO_SHOW') NOT NULL DEFAULT 'PENDING_APPROVAL',
        \`rejection_reason\` TEXT NULL,
        \`cancellation_reason\` TEXT NULL,
        \`damage_notes\` TEXT NULL,
        \`facility_condition_notes\` TEXT NULL,
        \`deposit_collected_amount\` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        \`deposit_deduction_amount\` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        \`deposit_deduction_reason\` TEXT NULL,
        \`deposit_refund_amount\` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        \`deposit_refund_status\` ENUM('NOT_APPLICABLE', 'ELIGIBLE', 'PENDING_APPROVAL', 'APPROVED', 'PROCESSED', 'REJECTED') NOT NULL DEFAULT 'NOT_APPLICABLE',
        \`deposit_refund_txn_ref\` VARCHAR(100) NULL,
        \`deposit_refunded_at\` TIMESTAMP NULL,
        \`rules_accepted\` BOOLEAN NOT NULL DEFAULT TRUE,
        \`approved_by_user_id\` INT NULL,
        \`approved_at\` TIMESTAMP NULL,
        \`invoice_number\` VARCHAR(50) NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX \`idx_ab_amenity_date\` (\`amenity_id\`, \`booking_date\`, \`booking_status\`),
        INDEX \`idx_ab_resident\` (\`resident_id\`),
        INDEX \`idx_ab_home\` (\`home_id\`),
        INDEX \`idx_ab_society_status\` (\`society_id\`, \`booking_status\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`amenity_payments\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`receipt_number\` VARCHAR(50) NOT NULL UNIQUE,
        \`booking_id\` INT NOT NULL,
        \`society_id\` INT NOT NULL,
        \`home_id\` INT NOT NULL,
        \`paid_by_user_id\` INT NULL,
        \`amount\` DECIMAL(10,2) NOT NULL,
        \`payment_type\` ENUM('BOOKING_FEE', 'SECURITY_DEPOSIT', 'FULL_PAYMENT', 'DAMAGE_DEDUCTION', 'REFUND') NOT NULL DEFAULT 'FULL_PAYMENT',
        \`payment_method\` ENUM('UPI', 'CASH', 'NET_BANKING', 'CHEQUE', 'CARD') NOT NULL DEFAULT 'UPI',
        \`transaction_reference\` VARCHAR(100) NULL,
        \`payment_status\` ENUM('PAID', 'PENDING', 'FAILED', 'REFUNDED') NOT NULL DEFAULT 'PAID',
        \`collected_by_user_id\` INT NULL,
        \`payment_date\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`remarks\` TEXT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX \`idx_ap_booking\` (\`booking_id\`),
        INDEX \`idx_ap_society\` (\`society_id\`),
        INDEX \`idx_ap_receipt\` (\`receipt_number\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`amenity_audit_logs\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`booking_id\` INT NOT NULL,
        \`society_id\` INT NOT NULL,
        \`actor_user_id\` INT NOT NULL,
        \`action\` VARCHAR(100) NOT NULL,
        \`previous_status\` VARCHAR(50) NULL,
        \`new_status\` VARCHAR(50) NULL,
        \`details_json\` JSON NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX \`idx_aal_booking\` (\`booking_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('✓ Amenities Management system tables verified.');

    // 2f. Ensure Super Admin, Multi-Society & Subscription System Tables Exist
    console.log('[2f/3] Verifying Super Admin & Subscription system schema alterations...');

    // 1. Alter users.role enum to include 'SUPER_ADMIN'
    try {
      await connection.query(`
        ALTER TABLE \`users\` 
        MODIFY COLUMN \`role\` ENUM('SUPER_ADMIN', 'ADMIN', 'OWNER', 'TENANT', 'FAMILY_MEMBER', 'SECURITY', 'COMMITTEE_MEMBER') NOT NULL DEFAULT 'OWNER';
      `);
      console.log('✓ User role enum updated with SUPER_ADMIN.');
    } catch (e) {
      console.log('Note: users.role enum alteration:', e.message);
    }

    // 2. Ensure societies subscription columns exist
    const [socCols] = await connection.query('SHOW COLUMNS FROM societies');
    const socColNames = socCols.map((c) => c.Field);
    if (!socColNames.includes('subscription_plan_id')) {
      await connection.query('ALTER TABLE societies ADD COLUMN subscription_plan_id INT NULL AFTER status');
    }
    if (!socColNames.includes('subscription_status')) {
      await connection.query("ALTER TABLE societies ADD COLUMN subscription_status ENUM('TRIAL', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'CANCELLED') NOT NULL DEFAULT 'TRIAL' AFTER subscription_plan_id");
    }
    if (!socColNames.includes('max_units')) {
      await connection.query('ALTER TABLE societies ADD COLUMN max_units INT NOT NULL DEFAULT 100 AFTER subscription_status');
    }
    if (!socColNames.includes('max_users')) {
      await connection.query('ALTER TABLE societies ADD COLUMN max_users INT NOT NULL DEFAULT 200 AFTER max_units');
    }
    if (!socColNames.includes('max_workers')) {
      await connection.query('ALTER TABLE societies ADD COLUMN max_workers INT NOT NULL DEFAULT 50 AFTER max_users');
    }
    if (!socColNames.includes('max_gates')) {
      await connection.query('ALTER TABLE societies ADD COLUMN max_gates INT NOT NULL DEFAULT 5 AFTER max_workers');
    }
    if (!socColNames.includes('admin_user_id')) {
      await connection.query('ALTER TABLE societies ADD COLUMN admin_user_id INT NULL AFTER max_gates');
    }

    // Ensure workers table has aadhar_number and photo_url as MEDIUMTEXT
    try {
      const [workerCols] = await connection.query('SHOW COLUMNS FROM `workers`');
      const workerColNames = workerCols.map((c) => c.Field);
      if (!workerColNames.includes('aadhar_number')) {
        await connection.query('ALTER TABLE `workers` ADD COLUMN `aadhar_number` VARCHAR(30) NULL AFTER `status`');
        console.log('✓ Added aadhar_number column to workers table');
      }
      const photoCol = workerCols.find((c) => c.Field === 'photo_url');
      if (photoCol && !photoCol.Type.toLowerCase().includes('text')) {
        await connection.query('ALTER TABLE `workers` MODIFY COLUMN `photo_url` MEDIUMTEXT NULL');
        console.log('✓ Altered workers photo_url to MEDIUMTEXT');
      }
    } catch (workerMigrateErr) {
      console.warn('Note: workers table check:', workerMigrateErr.message);
    }

    // 3. Create subscription system tables
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`subscription_plans\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`name\` VARCHAR(150) NOT NULL,
        \`code\` VARCHAR(50) NOT NULL UNIQUE,
        \`description\` TEXT NULL,
        \`price\` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        \`billing_cycle\` ENUM('MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY') NOT NULL DEFAULT 'MONTHLY',
        \`max_users\` INT NOT NULL DEFAULT 50,
        \`max_units\` INT NOT NULL DEFAULT 100,
        \`max_workers\` INT NOT NULL DEFAULT 20,
        \`max_gates\` INT NOT NULL DEFAULT 5,
        \`trial_days\` INT NOT NULL DEFAULT 14,
        \`status\` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX \`idx_plan_status\` (\`status\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`platform_features\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`code\` VARCHAR(50) NOT NULL UNIQUE,
        \`name\` VARCHAR(150) NOT NULL,
        \`description\` TEXT NULL,
        \`category\` VARCHAR(50) NOT NULL DEFAULT 'CORE',
        \`default_enabled\` BOOLEAN NOT NULL DEFAULT TRUE,
        \`is_active\` BOOLEAN NOT NULL DEFAULT TRUE,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`plan_features\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`plan_id\` INT NOT NULL,
        \`feature_code\` VARCHAR(50) NOT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY \`uq_plan_feature\` (\`plan_id\`, \`feature_code\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`society_subscriptions\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`society_id\` INT NOT NULL,
        \`plan_id\` INT NOT NULL,
        \`start_date\` DATE NOT NULL,
        \`end_date\` DATE NOT NULL,
        \`billing_cycle\` ENUM('MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY') NOT NULL DEFAULT 'MONTHLY',
        \`price_snapshot\` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        \`status\` ENUM('TRIAL', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
        \`trial_ends_at\` DATE NULL,
        \`auto_renew\` BOOLEAN NOT NULL DEFAULT TRUE,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX \`idx_ss_society_status\` (\`society_id\`, \`status\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`society_feature_overrides\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`society_id\` INT NOT NULL,
        \`feature_code\` VARCHAR(50) NOT NULL,
        \`is_enabled\` BOOLEAN NOT NULL DEFAULT TRUE,
        \`reason\` VARCHAR(255) NULL,
        \`created_by_user_id\` INT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY \`uq_sfo_society_feature\` (\`society_id\`, \`feature_code\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`society_limit_overrides\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`society_id\` INT NOT NULL,
        \`max_users\` INT NULL,
        \`max_units\` INT NULL,
        \`max_workers\` INT NULL,
        \`reason\` VARCHAR(255) NULL,
        \`created_by_user_id\` INT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY \`uq_slo_society\` (\`society_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`subscription_invoices\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`invoice_number\` VARCHAR(50) NOT NULL UNIQUE,
        \`society_id\` INT NOT NULL,
        \`plan_id\` INT NOT NULL,
        \`subscription_id\` INT NULL,
        \`amount\` DECIMAL(10,2) NOT NULL,
        \`billing_period_start\` DATE NOT NULL,
        \`billing_period_end\` DATE NOT NULL,
        \`due_date\` DATE NOT NULL,
        \`status\` ENUM('PENDING', 'PAID', 'OVERDUE', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX \`idx_si_society_status\` (\`society_id\`, \`status\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`subscription_payments\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`receipt_number\` VARCHAR(50) NOT NULL UNIQUE,
        \`invoice_id\` INT NOT NULL,
        \`society_id\` INT NOT NULL,
        \`amount\` DECIMAL(10,2) NOT NULL,
        \`payment_method\` VARCHAR(50) NOT NULL DEFAULT 'UPI',
        \`transaction_reference\` VARCHAR(100) NULL,
        \`payment_status\` ENUM('PAID', 'PENDING', 'FAILED', 'REFUNDED') NOT NULL DEFAULT 'PAID',
        \`paid_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`notes\` TEXT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX \`idx_sp_society\` (\`society_id\`),
        INDEX \`idx_sp_receipt\` (\`receipt_number\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    try {
      await connection.query("ALTER TABLE `subscription_payments` MODIFY COLUMN `payment_method` VARCHAR(50) NOT NULL DEFAULT 'UPI'");
    } catch (e) {
      // ignore
    }

    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`platform_audit_logs\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`actor_user_id\` INT NOT NULL,
        \`action\` VARCHAR(100) NOT NULL,
        \`entity_type\` VARCHAR(50) NOT NULL,
        \`entity_id\` INT NULL,
        \`details_json\` JSON NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX \`idx_pal_actor\` (\`actor_user_id\`),
        INDEX \`idx_pal_entity\` (\`entity_type\`, \`entity_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('✓ Super Admin & Subscription system tables verified.');

    // 4. Seed Platform Features Registry
    console.log('✓ Seeding centralized platform features registry...');
    const defaultFeatures = [
      { code: 'RESIDENTS', name: 'Resident Management', description: 'Owners, tenants, family profiles & permissions', category: 'CORE' },
      { code: 'WORKERS', name: 'Worker Management', description: 'Maids, drivers, cooks, home-staff passbook', category: 'CORE' },
      { code: 'SOCIETY_FINANCE', name: 'Society Finance', description: 'Maintenance plans, cycle billing, special charges, payments', category: 'FINANCE' },
      { code: 'POLLS', name: 'Polls & Surveys', description: 'Society-wide democratic polling and resident voting', category: 'ENGAGEMENT' },
      { code: 'GATES_VISITORS', name: 'Gate & Visitor Management', description: 'Security gate passes, visitor movement, vehicle logs', category: 'SECURITY' },
      { code: 'COURIER_DELIVERIES', name: 'Courier & Deliveries', description: 'Parcel tracking, OTP entry, delivery handovers', category: 'SECURITY' },
      { code: 'AMENITIES', name: 'Amenities & Bookings', description: 'Clubhouse, common plot, gym, slots, deposits & refunds', category: 'FACILITIES' },
      { code: 'COMMITTEES', name: 'Committee Management', description: 'Managing committee directory, portfolios & roles', category: 'GOVERNANCE' },
      { code: 'ANNOUNCEMENTS', name: 'Announcements', description: 'Society circulars, emergency alerts, digital notice board', category: 'COMMUNICATION' },
      { code: 'SECURITY_STAFF', name: 'Security Staff Management', description: 'Guard agency rosters, badges, shifts & check-ins', category: 'SECURITY' },
    ];

    for (const feat of defaultFeatures) {
      await connection.query(`
        INSERT INTO platform_features (code, name, description, category, default_enabled, is_active)
        VALUES (?, ?, ?, ?, 1, 1)
        ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description);
      `, [feat.code, feat.name, feat.description, feat.category]);
    }
    console.log('✓ Registered 10 platform modules in feature registry.');

    // 5. Initial Subscription Plans (Dummy plans removed - Super Admin creates plans dynamically)
    console.log('✓ Subscription plans table ready (managed dynamically by Super Admin).');

    // 6. Ensure default Super Admin account exists
    console.log('[3/3] Ensuring Super Admin & System Administrator accounts exist...');
    const [superRows] = await connection.query("SELECT id FROM users WHERE role = 'SUPER_ADMIN' OR email = 'superadmin@myvms.com' LIMIT 1");
    if (superRows.length === 0) {
      const superPassword = await bcrypt.hash('Password@123', 10);
      await connection.query(`
        INSERT INTO \`users\` (\`full_name\`, \`email\`, \`phone\`, \`password\`, \`role\`, \`flat_number\`, \`block_or_tower\`, \`status\`)
        VALUES ('Platform Super Administrator', 'superadmin@myvms.com', '9900000000', ?, 'SUPER_ADMIN', 'Platform HQ', 'Global', 'ACTIVE')
      `, [superPassword]);
      console.log('✓ Created default Super Admin (superadmin@myvms.com / 9900000000 / Password@123)');
    } else {
      console.log('✓ Super Admin account exists [ID: ' + superRows[0].id + '].');
    }

    // Society Admin accounts are created dynamically when Super Admin creates societies

    // 7. Ensure existing society has an active subscription assigned
    const [socList] = await connection.query('SELECT id, subscription_plan_id FROM societies');
    const [entPlan] = await connection.query("SELECT id FROM subscription_plans WHERE code = 'PLAN-ENTERPRISE' LIMIT 1");
    const enterprisePlanId = entPlan.length > 0 ? entPlan[0].id : 1;

    for (const soc of socList) {
      if (!soc.subscription_plan_id) {
        await connection.query(`
          UPDATE societies 
          SET subscription_plan_id = ?, subscription_status = 'ACTIVE', max_units = 350, max_users = 500, max_workers = 100
          WHERE id = ?
        `, [enterprisePlanId, soc.id]);

        const today = new Date().toISOString().split('T')[0];
        const nextYear = new Date();
        nextYear.setFullYear(nextYear.getFullYear() + 1);
        const nextYearStr = nextYear.toISOString().split('T')[0];

        await connection.query(`
          INSERT INTO society_subscriptions (society_id, plan_id, start_date, end_date, billing_cycle, price_snapshot, status)
          VALUES (?, ?, ?, ?, 'YEARLY', 4999.00, 'ACTIVE')
        `, [soc.id, enterprisePlanId, today, nextYearStr]);
      }
    }
    console.log('✓ Active society subscriptions verified.');


    console.log('\n============================================================');
    console.log('✓ DATABASE MIGRATION COMPLETED SUCCESSFULLY!');
    console.log('============================================================\n');
  } catch (error) {
    console.error('✗ Migration failed:', error.message);
    process.exitCode = 1;
  } finally {
    if (connection) connection.release();
  }
}

if (require.main === module) {
  migrate().then(() => {
    process.exit(0);
  });
}

module.exports = migrate;
