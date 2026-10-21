const { pool } = require('../config/db');

async function seedAnnouncements() {
  console.log('[Seed] Seeding Society Announcements according to Prompt 15...');

  // Find user IDs for authoring: Pravin (President, id 8 or email pravin@emeraldheights.org)
  const [users] = await pool.query("SELECT id, email, full_name, role FROM users WHERE role = 'ADMIN' OR email LIKE 'pravin%' LIMIT 2");
  const adminId = users.find((u) => u.role === 'ADMIN')?.id || 1;
  const pravinId = users.find((u) => u.email.includes('pravin'))?.id || adminId;

  await pool.query('DELETE FROM announcements');

  const seedData = [
    {
      society_id: 1,
      created_by_user_id: pravinId,
      title: 'Navratri Celebration',
      type: 'FESTIVAL',
      date: '2026-10-15',
      description: 'Navratri Dandiya & Garba Raas celebration with live orchestra, prasad distribution, and traditional dress awards.\nTime: 8:00 PM\nVenue: Society Ground',
      content: 'Navratri Dandiya & Garba Raas celebration with live orchestra, prasad distribution, and traditional dress awards.\nTime: 8:00 PM\nVenue: Society Ground',
      category: 'EVENT',
      priority: 'HIGH',
      attachment_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80',
      valid_until: '2026-10-24',
      status: 'ACTIVE',
    },
    {
      society_id: 1,
      created_by_user_id: pravinId,
      title: 'Emergency: Water Supply Disruption',
      type: 'EMERGENCY',
      date: '2026-10-15',
      description: 'Water supply will be unavailable from 2 PM to 5 PM today due to urgent municipal main valve replacement. Residents are requested to store adequate water.',
      content: 'Water supply will be unavailable from 2 PM to 5 PM today due to urgent municipal main valve replacement. Residents are requested to store adequate water.',
      category: 'EMERGENCY',
      priority: 'URGENT',
      attachment_url: null,
      valid_until: '2026-10-16',
      status: 'ACTIVE',
    },
    {
      society_id: 1,
      created_by_user_id: adminId,
      title: 'Scheduled Elevator Maintenance & Generator Dry Run',
      type: 'MAINTENANCE',
      date: '2026-10-17',
      description: 'Quarterly lubrication and sensor inspection for passenger lifts in Tower A and Tower B between 10:00 AM and 01:00 PM. Service lift will remain functional.',
      content: 'Quarterly lubrication and sensor inspection for passenger lifts in Tower A and Tower B between 10:00 AM and 01:00 PM. Service lift will remain functional.',
      category: 'MAINTENANCE',
      priority: 'MEDIUM',
      attachment_url: null,
      valid_until: '2026-10-18',
      status: 'ACTIVE',
    },
    {
      society_id: 1,
      created_by_user_id: pravinId,
      title: 'Quarterly Managing Committee & Resident Open House',
      type: 'MEETING',
      date: '2026-10-20',
      description: 'Agenda: Solar rooftop installation proposals, monsoon drain maintenance, and festive budget approval.\nTime: 6:30 PM\nVenue: Society Clubhouse Main Hall',
      content: 'Agenda: Solar rooftop installation proposals, monsoon drain maintenance, and festive budget approval.\nTime: 6:30 PM\nVenue: Society Clubhouse Main Hall',
      category: 'GENERAL',
      priority: 'HIGH',
      attachment_url: null,
      valid_until: '2026-10-21',
      status: 'ACTIVE',
    },
    {
      society_id: 1,
      created_by_user_id: adminId,
      title: 'Mandatory Visitor & Delivery Gate-Pass System',
      type: 'IMPORTANT',
      date: '2026-10-14',
      description: 'All food delivery couriers (Swiggy, Zomato, Blinkit) and visiting guests must register at Main Gate 1 for 4-digit resident OTP verification before entering residential towers.',
      content: 'All food delivery couriers (Swiggy, Zomato, Blinkit) and visiting guests must register at Main Gate 1 for 4-digit resident OTP verification before entering residential towers.',
      category: 'RULES',
      priority: 'HIGH',
      attachment_url: null,
      valid_until: '2026-11-30',
      status: 'ACTIVE',
    },
  ];

  for (const item of seedData) {
    await pool.query(
      `INSERT INTO \`announcements\`
        (\`society_id\`, \`created_by_user_id\`, \`title\`, \`type\`, \`date\`, \`description\`, \`content\`, \`category\`, \`priority\`, \`attachment_url\`, \`valid_until\`, \`status\`)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.society_id,
        item.created_by_user_id,
        item.title,
        item.type,
        item.date,
        item.description,
        item.content,
        item.category,
        item.priority,
        item.attachment_url,
        item.valid_until,
        item.status,
      ]
    );
  }

  const [rows] = await pool.query('SELECT id, title, type, date, status, priority FROM announcements');
  console.log('[Seed] Announcements successfully seeded:');
  console.table(rows);
  process.exit(0);
}

seedAnnouncements().catch((err) => {
  console.error('[Seed Error]:', err);
  process.exit(1);
});
