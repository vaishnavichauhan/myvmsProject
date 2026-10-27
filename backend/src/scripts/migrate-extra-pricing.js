/**
 * Migration: Add extra per-unit pricing columns to subscription_plans
 * Run: node src/scripts/migrate-extra-pricing.js
 */
const { pool } = require('../config/db');

async function columnExists(tableName, columnName) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS cnt
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    [tableName, columnName]
  );
  return rows[0].cnt > 0;
}

async function addColumnIfMissing(tableName, columnName, definition) {
  const exists = await columnExists(tableName, columnName);
  if (!exists) {
    await pool.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${definition}`);
    console.log(`[Migration] ✅ Added column: ${columnName}`);
  } else {
    console.log(`[Migration] ⏭  Column already exists: ${columnName}`);
  }
}

async function migrate() {
  try {
    console.log('[Migration] Adding extra pricing columns to subscription_plans...');

    await addColumnIfMissing(
      'subscription_plans', 'extra_user_price',
      "DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Extra price charged per additional user beyond max_users'"
    );
    await addColumnIfMissing(
      'subscription_plans', 'extra_unit_price',
      "DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Extra price charged per additional unit beyond max_units'"
    );
    await addColumnIfMissing(
      'subscription_plans', 'extra_gate_price',
      "DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Extra price charged per additional gate beyond max_gates'"
    );

    console.log('[Migration] ✅ Migration complete.');
    process.exit(0);
  } catch (err) {
    console.error('[Migration] ❌ Failed:', err.message);
    process.exit(1);
  }
}

migrate();
