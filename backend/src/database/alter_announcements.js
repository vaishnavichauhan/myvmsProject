const { pool } = require('../config/db');

async function alterAnnouncements() {
  console.log('[Schema] Upgrading announcements table for Prompt 15...');
  const [cols] = await pool.query('SHOW COLUMNS FROM announcements');
  const colNames = cols.map((c) => c.Field);
  console.log('Existing columns:', colNames);

  // Add type column if missing
  if (!colNames.includes('type')) {
    await pool.query(
      `ALTER TABLE announcements 
       ADD COLUMN type ENUM('GENERAL', 'FESTIVAL', 'EMERGENCY', 'MAINTENANCE', 'MEETING', 'IMPORTANT') 
       NOT NULL DEFAULT 'GENERAL' AFTER title`
    );
    console.log('✓ Added `type` ENUM column');
  } else {
    await pool.query(
      `ALTER TABLE announcements 
       MODIFY COLUMN type ENUM('GENERAL', 'FESTIVAL', 'EMERGENCY', 'MAINTENANCE', 'MEETING', 'IMPORTANT') 
       NOT NULL DEFAULT 'GENERAL'`
    );
    console.log('✓ Updated `type` ENUM column');
  }

  // Add description column if missing
  if (!colNames.includes('description')) {
    await pool.query('ALTER TABLE announcements ADD COLUMN description TEXT NULL AFTER type');
    console.log('✓ Added `description` column');
  }

  // Add date column if missing
  if (!colNames.includes('date')) {
    await pool.query('ALTER TABLE announcements ADD COLUMN date DATE NULL DEFAULT (CURRENT_DATE) AFTER description');
    console.log('✓ Added `date` column');
  }

  // Update status enum to include ACTIVE
  await pool.query(
    "ALTER TABLE announcements MODIFY COLUMN status ENUM('ACTIVE', 'PUBLISHED', 'DRAFT', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE'"
  );
  console.log('✓ Updated status ENUM to include ACTIVE');

  // Copy existing content to description if description is null
  await pool.query('UPDATE announcements SET description = content WHERE description IS NULL AND content IS NOT NULL');
  await pool.query("UPDATE announcements SET type = CASE category WHEN 'EMERGENCY' THEN 'EMERGENCY' WHEN 'MAINTENANCE' THEN 'MAINTENANCE' WHEN 'EVENT' THEN 'FESTIVAL' ELSE 'GENERAL' END WHERE type = 'GENERAL' AND category IS NOT NULL");
  await pool.query("UPDATE announcements SET status = 'ACTIVE' WHERE status = 'PUBLISHED'");

  const [newCols] = await pool.query('SHOW COLUMNS FROM announcements');
  console.log('Updated columns:', newCols.map((c) => c.Field));
  console.log('[Schema] Announcements table successfully updated.');
  process.exit(0);
}

alterAnnouncements().catch((err) => {
  console.error('[Schema Error]:', err);
  process.exit(1);
});
