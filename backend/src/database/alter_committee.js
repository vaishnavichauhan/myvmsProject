const { pool } = require('../config/db');

async function alterTable() {
  console.log('Altering committee_members table...');
  const [cols] = await pool.query('SHOW COLUMNS FROM committee_members');
  const colNames = cols.map((c) => c.Field);
  console.log('Existing columns:', colNames);

  if (!colNames.includes('name')) {
    await pool.query('ALTER TABLE committee_members ADD COLUMN name VARCHAR(150) NULL AFTER user_id');
    console.log('✓ Added name');
  }

  if (!colNames.includes('phone')) {
    await pool.query('ALTER TABLE committee_members ADD COLUMN phone VARCHAR(30) NULL AFTER name');
    console.log('✓ Added phone');
  }

  if (!colNames.includes('home_number')) {
    await pool.query('ALTER TABLE committee_members ADD COLUMN home_number VARCHAR(50) NULL AFTER designation');
    console.log('✓ Added home_number');
  }

  if (!colNames.includes('photo_url')) {
    await pool.query('ALTER TABLE committee_members ADD COLUMN photo_url VARCHAR(255) NULL AFTER home_number');
    console.log('✓ Added photo_url');
  }

  if (!colNames.includes('can_create_announcements')) {
    await pool.query('ALTER TABLE committee_members ADD COLUMN can_create_announcements BOOLEAN NOT NULL DEFAULT TRUE AFTER status');
    console.log('✓ Added can_create_announcements');
  }

  await pool.query("ALTER TABLE committee_members MODIFY COLUMN status ENUM('ACTIVE', 'INACTIVE', 'TENURE_COMPLETED', 'RESIGNED') NOT NULL DEFAULT 'ACTIVE'");
  console.log('✓ Updated status ENUM');

  await pool.query('ALTER TABLE committee_members MODIFY COLUMN term_start DATE NULL DEFAULT (CURRENT_DATE)');
  console.log('✓ Updated term_start to default CURRENT_DATE');

  const [newCols] = await pool.query('SHOW COLUMNS FROM committee_members');
  console.log('New columns:', newCols.map((c) => c.Field));
  process.exit(0);
}

alterTable().catch((err) => {
  console.error('Error altering table:', err);
  process.exit(1);
});
