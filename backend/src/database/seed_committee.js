const { pool } = require('../config/db');

async function seedCommittee() {
  console.log('[Seed] Seeding Committee Members according to Prompt 14...');

  const committeeData = [
    {
      society_id: 1,
      user_id: 8, // Pravin
      name: 'Pravin',
      phone: '9876543210',
      designation: 'PRESIDENT',
      home_number: '10',
      photo_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      responsibilities: 'Executive leadership, society governance, liaison with local municipal authorities, general administration',
      status: 'ACTIVE',
      can_create_announcements: 1,
      term_start: '2024-01-01',
      term_end: '2026-12-31',
    },
    {
      society_id: 1,
      user_id: 10, // Amit
      name: 'Amit',
      phone: '+91 9876543218',
      designation: 'SECRETARY',
      home_number: '42',
      photo_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      responsibilities: 'Society administration, meetings & minutes, notices, circulars, compliance & dispute resolutions',
      status: 'ACTIVE',
      can_create_announcements: 1,
      term_start: '2024-01-01',
      term_end: '2026-12-31',
    },
    {
      society_id: 1,
      user_id: 9, // Neha
      name: 'Neha',
      phone: '+91 9876543217',
      designation: 'TREASURER',
      home_number: '25',
      photo_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      responsibilities: 'Society accounts, maintenance dues, budgeting, vendor payments & annual audits',
      status: 'ACTIVE',
      can_create_announcements: 1,
      term_start: '2024-01-01',
      term_end: '2026-12-31',
    },
    {
      society_id: 1,
      user_id: 7, // Dr. Anita Mehta
      name: 'Dr. Anita Mehta',
      phone: '+91 9876543215',
      designation: 'COMMITTEE_MEMBER',
      home_number: '501',
      photo_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      responsibilities: 'Resident welfare, cultural events, green initiatives & clubhouse amenities oversight',
      status: 'ACTIVE',
      can_create_announcements: 1,
      term_start: '2024-01-01',
      term_end: '2026-12-31',
    },
  ];

  await pool.query('DELETE FROM committee_members');

  for (const item of committeeData) {
    await pool.query(
      `INSERT INTO committee_members 
       (society_id, user_id, name, phone, designation, home_number, photo_url, responsibilities, status, can_create_announcements, term_start, term_end)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.society_id,
        item.user_id,
        item.name,
        item.phone,
        item.designation,
        item.home_number,
        item.photo_url,
        item.responsibilities,
        item.status,
        item.can_create_announcements,
        item.term_start,
        item.term_end,
      ]
    );
  }

  const [rows] = await pool.query(
    'SELECT id, name, phone, designation, home_number, status, can_create_announcements FROM committee_members'
  );
  console.log('[Seed] Committee members seeded successfully:');
  console.table(rows);
  process.exit(0);
}

seedCommittee().catch((err) => {
  console.error('[Seed Error]:', err);
  process.exit(1);
});
