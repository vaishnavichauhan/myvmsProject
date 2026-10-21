const { pool } = require('../config/db');

async function migrateCommittees() {
  console.log('Running committee system migration...');

  // 1. Create committees table
  await pool.query(`
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
  console.log('✓ Created/verified committees table');

  // 2. Check and add columns to committee_members table
  const [cols] = await pool.query('SHOW COLUMNS FROM committee_members');
  const colNames = cols.map((c) => c.Field);

  if (!colNames.includes('committee_id')) {
    await pool.query('ALTER TABLE committee_members ADD COLUMN committee_id INT NULL AFTER society_id');
    console.log('✓ Added committee_id to committee_members');
  }

  if (!colNames.includes('committee_name')) {
    await pool.query('ALTER TABLE committee_members ADD COLUMN committee_name VARCHAR(150) NULL AFTER committee_id');
    console.log('✓ Added committee_name to committee_members');
  }

  if (!colNames.includes('home_id')) {
    await pool.query('ALTER TABLE committee_members ADD COLUMN home_id INT NULL AFTER home_number');
    console.log('✓ Added home_id to committee_members');
  }

  // Change designation column to VARCHAR(100) to allow custom designations (Head, Convener, etc.)
  await pool.query("ALTER TABLE committee_members MODIFY COLUMN designation VARCHAR(100) NOT NULL DEFAULT 'COMMITTEE_MEMBER'");
  console.log('✓ Updated designation column to VARCHAR(100)');

  // 3. Seed default committees for SunCity (3) and Emerald Heights (1)
  const defaultCommittees = [
    {
      society_id: 3,
      name: 'Festival & Celebration Committee',
      description: 'Coordinates cultural events, festivals (Diwali, Holi, Navratri, New Year), sports, and community gatherings.',
    },
    {
      society_id: 3,
      name: 'Electricity Management Committee',
      description: 'Oversees society power infrastructure, DG backup, transformer maintenance, and solar power installations.',
    },
    {
      society_id: 3,
      name: 'Water & Sanitation Committee',
      description: 'Manages municipal water supply, borewells, overhead tank cleaning, and society pest control.',
    },
    {
      society_id: 3,
      name: 'Security & Safety Committee',
      description: 'Monitors gate security checkpoints, guard duties, CCTV surveillance, and emergency safety protocols.',
    },
    {
      society_id: 1,
      name: 'Managing Executive Committee',
      description: 'Overall society governance, AGM administration, legal affairs, and statutory compliance.',
    },
    {
      society_id: 1,
      name: 'Festival & Celebration Committee',
      description: 'Cultural programs, annual sports day, festival decor, and resident community functions.',
    },
    {
      society_id: 1,
      name: 'Maintenance & Facilities Committee',
      description: 'Lifts, swimming pool, clubhouse, garden landscaping, and civil maintenance.',
    },
  ];

  for (const c of defaultCommittees) {
    const [existing] = await pool.query('SELECT id FROM committees WHERE society_id = ? AND name = ? LIMIT 1', [
      c.society_id,
      c.name,
    ]);
    if (existing.length === 0) {
      await pool.query('INSERT INTO committees (society_id, name, description, status) VALUES (?, ?, ?, "ACTIVE")', [
        c.society_id,
        c.name,
        c.description,
      ]);
    }
  }
  console.log('✓ Seeded default committees');

  // Link existing committee members to committees if not set
  const [ehExecComm] = await pool.query(
    "SELECT id, name FROM committees WHERE society_id = 1 AND (name LIKE '%Executive%' OR name LIKE '%Managing%') LIMIT 1"
  );

  if (ehExecComm.length > 0) {
    await pool.query(
      'UPDATE committee_members SET committee_id = ?, committee_name = ? WHERE society_id = 1 AND committee_id IS NULL',
      [ehExecComm[0].id, ehExecComm[0].name]
    );
    console.log('✓ Linked Emerald Heights existing members to ' + ehExecComm[0].name);
  }

  process.exit(0);
}

migrateCommittees().catch((err) => {
  console.error('Migration error:', err);
  process.exit(1);
});
