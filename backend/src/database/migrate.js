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

    // 3. Ensure System Administrator Account Exists
    console.log('[3/3] Ensuring System Administrator account exists...');
    const [adminRows] = await connection.query("SELECT id FROM users WHERE role = 'ADMIN' OR email = 'admin@myvms.com' LIMIT 1");
    if (adminRows.length === 0) {
      const defaultPassword = await bcrypt.hash('Password@123', 10);
      await connection.query(`
        INSERT INTO \`users\` (\`full_name\`, \`email\`, \`phone\`, \`password\`, \`role\`, \`flat_number\`, \`block_or_tower\`, \`status\`)
        VALUES ('System Administrator', 'admin@myvms.com', '9800000000', ?, 'ADMIN', 'Admin Office', 'Clubhouse', 'ACTIVE')
      `, [defaultPassword]);
      console.log('✓ Created default System Administrator (admin@myvms.com / 9800000000 / Password@123)');
    } else {
      console.log('✓ System Administrator account exists [ID: ' + adminRows[0].id + '].');
    }

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
