const { pool } = require('../config/db');

/**
 * Amenity Repository
 * Production-ready database repository handling Amenities catalog, time slots,
 * double-booking prevention concurrency, payment/deposit tracking, refunds, and audit logging.
 */
class AmenityRepository {
  // ==========================================================================
  // 1. AMENITIES CRUD
  // ==========================================================================

  static async createAmenity(data) {
    const {
      society_id,
      name,
      category = 'OTHER',
      description = null,
      location_or_building = null,
      images_json = '[]',
      max_capacity = 50,
      access_type = 'FREE',
      booking_type = 'HOURLY',
      booking_fee = 0.00,
      security_deposit = 0.00,
      available_days_json = '["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY","SUNDAY"]',
      opening_time = '06:00:00',
      closing_time = '22:00:00',
      slot_duration_minutes = 60,
      buffer_minutes = 15,
      advance_booking_days = 30,
      min_duration_hours = 1,
      max_duration_hours = 8,
      requires_approval = true,
      cancellation_policy = null,
      rules = null,
      status = 'ACTIVE',
    } = data;

    const query = `
      INSERT INTO amenities (
        society_id, name, category, description, location_or_building, images_json,
        max_capacity, access_type, booking_type, booking_fee, security_deposit,
        available_days_json, opening_time, closing_time, slot_duration_minutes,
        buffer_minutes, advance_booking_days, min_duration_hours, max_duration_hours,
        requires_approval, cancellation_policy, rules, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await pool.query(query, [
      society_id,
      name.trim(),
      category,
      description,
      location_or_building,
      typeof images_json === 'string' ? images_json : JSON.stringify(images_json || []),
      max_capacity,
      access_type,
      booking_type,
      booking_fee,
      security_deposit,
      typeof available_days_json === 'string' ? available_days_json : JSON.stringify(available_days_json),
      opening_time,
      closing_time,
      slot_duration_minutes,
      buffer_minutes,
      advance_booking_days,
      min_duration_hours,
      max_duration_hours,
      requires_approval ? 1 : 0,
      cancellation_policy,
      rules,
      status,
    ]);

    return this.findAmenityById(result.insertId);
  }

  static async updateAmenity(id, data) {
    const fields = [];
    const params = [];

    const allowedFields = [
      'name', 'category', 'description', 'location_or_building', 'images_json',
      'max_capacity', 'access_type', 'booking_type', 'booking_fee', 'security_deposit',
      'available_days_json', 'opening_time', 'closing_time', 'slot_duration_minutes',
      'buffer_minutes', 'advance_booking_days', 'min_duration_hours', 'max_duration_hours',
      'requires_approval', 'cancellation_policy', 'rules', 'status'
    ];

    for (const key of allowedFields) {
      if (data[key] !== undefined) {
        fields.push(`\`${key}\` = ?`);
        if ((key === 'images_json' || key === 'available_days_json') && typeof data[key] !== 'string') {
          params.push(JSON.stringify(data[key]));
        } else if (key === 'requires_approval') {
          params.push(data[key] ? 1 : 0);
        } else {
          params.push(data[key]);
        }
      }
    }

    if (fields.length === 0) return this.findAmenityById(id);

    params.push(id);
    const query = `UPDATE amenities SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    await pool.query(query, params);

    return this.findAmenityById(id);
  }

  static async findAmenityById(id) {
    const [rows] = await pool.query(
      `SELECT a.*, s.name AS society_name
       FROM amenities a
       JOIN societies s ON a.society_id = s.id
       WHERE a.id = ?`,
      [id]
    );
    if (rows.length === 0) return null;
    return this._formatAmenity(rows[0]);
  }

  static async getAmenities(societyId, filters = {}) {
    let query = `
      SELECT a.*, s.name AS society_name,
        (SELECT COUNT(*) FROM amenity_bookings b WHERE b.amenity_id = a.id AND b.booking_status IN ('CONFIRMED', 'APPROVED')) AS active_bookings_count
      FROM amenities a
      JOIN societies s ON a.society_id = s.id
      WHERE a.society_id = ?
    `;
    const params = [societyId];

    if (filters.category && filters.category !== 'ALL') {
      query += ` AND a.category = ?`;
      params.push(filters.category);
    }

    if (filters.access_type && filters.access_type !== 'ALL') {
      query += ` AND a.access_type = ?`;
      params.push(filters.access_type);
    }

    if (filters.status && filters.status !== 'ALL') {
      query += ` AND a.status = ?`;
      params.push(filters.status);
    }

    if (filters.search) {
      query += ` AND (a.name LIKE ? OR a.description LIKE ? OR a.location_or_building LIKE ?)`;
      const searchWild = `%${filters.search.trim()}%`;
      params.push(searchWild, searchWild, searchWild);
    }

    query += ` ORDER BY a.name ASC`;

    const [rows] = await pool.query(query, params);
    return rows.map((r) => this._formatAmenity(r));
  }

  static async deleteAmenity(id) {
    const [result] = await pool.query('DELETE FROM amenities WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  // ==========================================================================
  // 2. BLOCKED DATES & PRICING RULES
  // ==========================================================================

  static async getBlockedDates(amenityId, societyId) {
    const [rows] = await pool.query(
      `SELECT b.*, u.full_name AS created_by_name
       FROM amenity_blocked_dates b
       LEFT JOIN users u ON b.created_by_user_id = u.id
       WHERE b.amenity_id = ? AND b.society_id = ?
       ORDER BY b.start_date DESC`,
      [amenityId, societyId]
    );
    return rows;
  }

  static async addBlockedDate(data) {
    const { amenity_id, society_id, start_date, end_date, start_time = null, end_time = null, reason, created_by_user_id = null } = data;
    const [result] = await pool.query(
      `INSERT INTO amenity_blocked_dates (amenity_id, society_id, start_date, end_date, start_time, end_time, reason, created_by_user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [amenity_id, society_id, start_date, end_date, start_time, end_time, reason, created_by_user_id]
    );
    return result.insertId;
  }

  static async removeBlockedDate(id) {
    const [result] = await pool.query('DELETE FROM amenity_blocked_dates WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  static async getPricingRules(amenityId, societyId) {
    const [rows] = await pool.query(
      `SELECT * FROM amenity_pricing_rules
       WHERE amenity_id = ? AND society_id = ?
       ORDER BY id ASC`,
      [amenityId, societyId]
    );
    return rows.map((r) => ({
      ...r,
      applicable_days: typeof r.applicable_days_json === 'string' ? JSON.parse(r.applicable_days_json || '[]') : r.applicable_days_json,
    }));
  }

  static async addPricingRule(data) {
    const {
      amenity_id,
      society_id,
      rule_name,
      rule_type = 'CUSTOM',
      rate_multiplier = 1.00,
      flat_rate = null,
      start_time = null,
      end_time = null,
      applicable_days = [],
      special_date = null,
      status = 'ACTIVE',
    } = data;

    const [result] = await pool.query(
      `INSERT INTO amenity_pricing_rules (
        amenity_id, society_id, rule_name, rule_type, rate_multiplier, flat_rate,
        start_time, end_time, applicable_days_json, special_date, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        amenity_id,
        society_id,
        rule_name,
        rule_type,
        rate_multiplier,
        flat_rate,
        start_time,
        end_time,
        JSON.stringify(applicable_days || []),
        special_date,
        status,
      ]
    );
    return result.insertId;
  }

  static async removePricingRule(id) {
    const [result] = await pool.query('DELETE FROM amenity_pricing_rules WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  // ==========================================================================
  // 3. AVAILABILITY, SLOTS & PRICING BREAKDOWN
  // ==========================================================================

  /**
   * Calculate exact pricing breakdown for given booking request.
   */
  static async calculateBookingPrice(amenityId, bookingDate, startTime, endTime, residentType = 'RESIDENT') {
    const amenity = await this.findAmenityById(amenityId);
    if (!amenity) throw new Error('Amenity not found');

    const start = new Date(`${bookingDate}T${startTime}`);
    const end = new Date(`${bookingDate}T${endTime}`);
    const durationHours = Math.max(0.5, (end - start) / (1000 * 60 * 60));

    let baseFee = 0;
    const bookingType = amenity.booking_type;

    if (amenity.access_type === 'FREE') {
      baseFee = 0;
    } else {
      switch (bookingType) {
        case 'HOURLY':
          baseFee = Number(amenity.booking_fee) * durationHours;
          break;
        case 'PER_DAY':
        case 'PER_EVENT':
        case 'SLOT':
        default:
          baseFee = Number(amenity.booking_fee);
          break;
      }
    }

    // Check pricing rules
    const pricingRules = await this.getPricingRules(amenityId, amenity.society_id);
    const dateObj = new Date(bookingDate);
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const currentDayName = days[dateObj.getDay()];
    const isWeekend = currentDayName === 'SATURDAY' || currentDayName === 'SUNDAY';

    let ruleMultiplier = 1.0;
    const rulesApplied = [];

    for (const rule of pricingRules) {
      if (rule.status !== 'ACTIVE') continue;

      if (rule.rule_type === 'WEEKEND' && isWeekend) {
        ruleMultiplier *= Number(rule.rate_multiplier);
        rulesApplied.push({ name: rule.rule_name, multiplier: rule.rate_multiplier });
      } else if (rule.rule_type === 'FESTIVAL_SPECIAL' && rule.special_date === bookingDate) {
        if (rule.flat_rate !== null) {
          baseFee = Number(rule.flat_rate);
          rulesApplied.push({ name: rule.rule_name, flat_rate: rule.flat_rate });
        } else {
          ruleMultiplier *= Number(rule.rate_multiplier);
          rulesApplied.push({ name: rule.rule_name, multiplier: rule.rate_multiplier });
        }
      }
    }

    const calculatedFee = Math.round(baseFee * ruleMultiplier * 100) / 100;
    const securityDeposit = Number(amenity.security_deposit || 0);
    const totalAmount = calculatedFee + securityDeposit;

    return {
      duration_hours: durationHours,
      booking_type: bookingType,
      base_fee: Number(amenity.booking_fee),
      calculated_fee: calculatedFee,
      rules_applied: rulesApplied,
      security_deposit: securityDeposit,
      total_amount: totalAmount,
    };
  }

  /**
   * Revalidate availability for a slot (supports exclusion for updates).
   */
  static async isSlotAvailable(amenityId, bookingDate, startTime, endTime, excludeBookingId = null, connection = pool) {
    const [amenityRows] = await connection.query('SELECT * FROM amenities WHERE id = ?', [amenityId]);
    if (amenityRows.length === 0) return { available: false, reason: 'Amenity does not exist' };
    const amenity = amenityRows[0];

    if (amenity.status !== 'ACTIVE') {
      return { available: false, reason: 'Amenity is currently inactive' };
    }

    // Advance booking limit check
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const bDate = new Date(bookingDate);
    bDate.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((bDate - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { available: false, reason: 'Cannot book past dates' };
    }
    if (diffDays > amenity.advance_booking_days) {
      return { available: false, reason: `Bookings can only be made up to ${amenity.advance_booking_days} days in advance` };
    }

    // Available days check
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const dayName = days[bDate.getDay()];
    let availableDays = [];
    try {
      availableDays = typeof amenity.available_days_json === 'string' ? JSON.parse(amenity.available_days_json) : (amenity.available_days_json || []);
    } catch {
      availableDays = days;
    }
    if (availableDays.length > 0 && !availableDays.includes(dayName)) {
      return { available: false, reason: `Amenity is not available on ${dayName}s` };
    }

    // Operating hours check
    const opStart = amenity.opening_time.slice(0, 5);
    const opEnd = amenity.closing_time.slice(0, 5);
    const reqStart = startTime.slice(0, 5);
    const reqEnd = endTime.slice(0, 5);

    if (reqStart < opStart || reqEnd > opEnd || reqStart >= reqEnd) {
      return { available: false, reason: `Booking must be within operating hours (${opStart} to ${opEnd})` };
    }

    // Duration check
    const startObj = new Date(`${bookingDate}T${startTime}`);
    const endObj = new Date(`${bookingDate}T${endTime}`);
    const durationHours = (endObj - startObj) / (1000 * 60 * 60);

    if (durationHours < amenity.min_duration_hours || durationHours > amenity.max_duration_hours) {
      return { available: false, reason: `Duration must be between ${amenity.min_duration_hours} and ${amenity.max_duration_hours} hours` };
    }

    // Blocked dates check
    const [blocked] = await connection.query(
      `SELECT * FROM amenity_blocked_dates
       WHERE amenity_id = ?
         AND ? BETWEEN start_date AND end_date`,
      [amenityId, bookingDate]
    );
    if (blocked.length > 0) {
      return { available: false, reason: `Amenity is blocked for maintenance: ${blocked[0].reason}` };
    }

    // Overlapping existing approved/confirmed/pending bookings check
    let overlapQuery = `
      SELECT id, booking_number, start_time, end_time, booking_status
      FROM amenity_bookings
      WHERE amenity_id = ?
        AND booking_date = ?
        AND booking_status IN ('PENDING_APPROVAL', 'APPROVED', 'CONFIRMED')
        AND (
          (start_time < ? AND end_time > ?) OR
          (start_time >= ? AND start_time < ?) OR
          (end_time > ? AND end_time <= ?)
        )
    `;
    const overlapParams = [amenityId, bookingDate, endTime, startTime, startTime, endTime, startTime, endTime];

    if (excludeBookingId) {
      overlapQuery += ` AND id != ?`;
      overlapParams.push(excludeBookingId);
    }

    const [overlapping] = await connection.query(overlapQuery, overlapParams);

    if (overlapping.length > 0) {
      return {
        available: false,
        reason: `Slot overlaps with existing booking (${overlapping[0].booking_number})`,
        conflict: overlapping[0],
      };
    }

    return { available: true };
  }

  /**
   * Get all available time slots and status for a given date
   */
  static async getSlotsForDate(amenityId, bookingDate) {
    const amenity = await this.findAmenityById(amenityId);
    if (!amenity) throw new Error('Amenity not found');

    const opStart = amenity.opening_time.slice(0, 5);
    const opEnd = amenity.closing_time.slice(0, 5);
    const slotMinutes = amenity.slot_duration_minutes || 60;
    const bufferMinutes = amenity.buffer_minutes || 0;

    // Fetch existing bookings on this date
    const [bookings] = await pool.query(
      `SELECT b.id, b.booking_number, b.start_time, b.end_time, b.booking_status, b.purpose,
              u.full_name AS resident_name, h.home_number
       FROM amenity_bookings b
       JOIN users u ON b.resident_id = u.id
       JOIN homes h ON b.home_id = h.id
       WHERE b.amenity_id = ? AND b.booking_date = ? AND b.booking_status NOT IN ('REJECTED', 'CANCELLED')
       ORDER BY b.start_time ASC`,
      [amenityId, bookingDate]
    );

    // Fetch blocked date for this date
    const [blocked] = await pool.query(
      `SELECT * FROM amenity_blocked_dates
       WHERE amenity_id = ? AND ? BETWEEN start_date AND end_date`,
      [amenityId, bookingDate]
    );

    // Generate intervals
    const [startH, startM] = opStart.split(':').map(Number);
    const [endH, endM] = opEnd.split(':').map(Number);

    let current = startH * 60 + startM;
    const maxEnd = endH * 60 + endM;

    const slots = [];

    while (current + slotMinutes <= maxEnd) {
      const sH = String(Math.floor(current / 60)).padStart(2, '0');
      const sM = String(current % 60).padStart(2, '0');
      const eTimeMin = current + slotMinutes;
      const eH = String(Math.floor(eTimeMin / 60)).padStart(2, '0');
      const eM = String(eTimeMin % 60).padStart(2, '0');

      const slotStart = `${sH}:${sM}:00`;
      const slotEnd = `${eH}:${eM}:00`;

      let slotStatus = 'AVAILABLE';
      let bookingInfo = null;

      if (blocked.length > 0) {
        slotStatus = 'BLOCKED';
        bookingInfo = { reason: blocked[0].reason };
      } else {
        // Find if any booking intersects with slot
        const conflict = bookings.find((b) => {
          const bStart = b.start_time.slice(0, 5);
          const bEnd = b.end_time.slice(0, 5);
          return (sH + ':' + sM < bEnd && eH + ':' + eM > bStart);
        });

        if (conflict) {
          slotStatus = conflict.booking_status;
          bookingInfo = conflict;
        }
      }

      slots.push({
        slot_start: `${sH}:${sM}`,
        slot_end: `${eH}:${eM}`,
        duration_minutes: slotMinutes,
        status: slotStatus,
        booking: bookingInfo,
      });

      current += slotMinutes + bufferMinutes;
    }

    return {
      amenity,
      booking_date: bookingDate,
      operating_hours: { start: opStart, end: opEnd },
      is_blocked: blocked.length > 0,
      blocked_reason: blocked.length > 0 ? blocked[0].reason : null,
      slots,
    };
  }

  // ==========================================================================
  // 4. BOOKINGS LIFECYCLE (CONCURRENCY SAFE WITH TRANSACTIONS & LOCKS)
  // ==========================================================================

  /**
   * Create Booking Request with atomic availability re-validation & locking
   */
  static async createBooking(bookingData, actorUserId) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const {
        society_id,
        amenity_id,
        home_id,
        resident_id,
        booking_date,
        start_time,
        end_time,
        purpose,
        expected_guests = 1,
        additional_notes = null,
      } = bookingData;

      // 1. Lock amenity row for concurrency control
      const [amenityRows] = await connection.query(
        'SELECT * FROM amenities WHERE id = ? FOR UPDATE',
        [amenity_id]
      );
      if (amenityRows.length === 0) {
        throw new Error('Amenity not found');
      }
      const amenity = amenityRows[0];

      // 2. Concurrency-safe availability check inside transaction
      const availCheck = await this.isSlotAvailable(amenity_id, booking_date, start_time, end_time, null, connection);
      if (!availCheck.available) {
        throw new Error(`Slot unavailable: ${availCheck.reason}`);
      }

      // 3. Calculate authoritative pricing
      const pricing = await this.calculateBookingPrice(amenity_id, booking_date, start_time, end_time);

      // 4. Initial status determination
      // If requires_approval is false:
      // - If total amount is 0, direct to CONFIRMED
      // - If fee > 0, to APPROVED (payment pending)
      // If requires_approval is true, starts at PENDING_APPROVAL
      let initialStatus = 'PENDING_APPROVAL';
      if (!amenity.requires_approval) {
        initialStatus = pricing.total_amount > 0 ? 'APPROVED' : 'CONFIRMED';
      }

      // 5. Generate unique booking number
      const datePrefix = booking_date.replace(/-/g, '').slice(2, 6);
      const randSuffix = Math.floor(1000 + Math.random() * 9000);
      const bookingNumber = `BK-${datePrefix}-${randSuffix}`;

      // 6. Insert booking record
      const [bookingResult] = await connection.query(
        `INSERT INTO amenity_bookings (
          booking_number, society_id, amenity_id, home_id, resident_id,
          booking_date, start_time, end_time, duration_hours, purpose,
          expected_guests, additional_notes, pricing_breakdown_json,
          booking_fee, security_deposit, total_amount, payment_status,
          booking_status, rules_accepted
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, 1)`,
        [
          bookingNumber,
          society_id,
          amenity_id,
          home_id,
          resident_id,
          booking_date,
          start_time,
          end_time,
          pricing.duration_hours,
          purpose.trim(),
          expected_guests,
          additional_notes,
          JSON.stringify(pricing),
          pricing.calculated_fee,
          pricing.security_deposit,
          pricing.total_amount,
          initialStatus,
        ]
      );

      const bookingId = bookingResult.insertId;

      // 7. Insert audit log
      await connection.query(
        `INSERT INTO amenity_audit_logs (booking_id, society_id, actor_user_id, action, new_status, details_json)
         VALUES (?, ?, ?, 'BOOKING_CREATED', ?, ?)`,
        [bookingId, society_id, actorUserId || resident_id, initialStatus, JSON.stringify({ pricing, purpose })]
      );

      // 8. In-app notification for resident
      await connection.query(
        `INSERT INTO notifications (society_id, user_id, title, message, type, reference_table, reference_id)
         VALUES (?, ?, ?, ?, 'GENERAL', 'amenity_bookings', ?)`,
        [
          society_id,
          resident_id,
          `Amenity Booking Submitted (${bookingNumber})`,
          `Your reservation request for ${amenity.name} on ${booking_date} (${start_time} - ${end_time}) has been submitted. Status: ${initialStatus}.`,
          bookingId,
        ]
      );

      await connection.commit();
      return this.findBookingById(bookingId);
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  static async findBookingById(id) {
    const [rows] = await pool.query(
      `SELECT b.*,
              a.name AS amenity_name, a.category AS amenity_category, a.location_or_building, a.images_json,
              h.home_number, h.block_or_tower,
              u.full_name AS resident_name, u.phone AS resident_phone, u.email AS resident_email,
              app.full_name AS approved_by_name
       FROM amenity_bookings b
       JOIN amenities a ON b.amenity_id = a.id
       JOIN homes h ON b.home_id = h.id
       JOIN users u ON b.resident_id = u.id
       LEFT JOIN users app ON b.approved_by_user_id = app.id
       WHERE b.id = ?`,
      [id]
    );

    if (rows.length === 0) return null;
    const booking = rows[0];

    // Fetch associated payments
    const [payments] = await pool.query(
      `SELECT p.*, u.full_name AS paid_by_name, col.full_name AS collected_by_name
       FROM amenity_payments p
       LEFT JOIN users u ON p.paid_by_user_id = u.id
       LEFT JOIN users col ON p.collected_by_user_id = col.id
       WHERE p.booking_id = ?
       ORDER BY p.id ASC`,
      [id]
    );

    // Fetch audit trail
    const [auditLogs] = await pool.query(
      `SELECT l.*, u.full_name AS actor_name
       FROM amenity_audit_logs l
       LEFT JOIN users u ON l.actor_user_id = u.id
       WHERE l.booking_id = ?
       ORDER BY l.created_at ASC`,
      [id]
    );

    return {
      ...booking,
      pricing_breakdown: typeof booking.pricing_breakdown_json === 'string'
        ? JSON.parse(booking.pricing_breakdown_json || '{}')
        : booking.pricing_breakdown_json,
      payments,
      audit_logs: auditLogs,
    };
  }

  static async getBookings(societyId, filters = {}, userContext = null) {
    let query = `
      SELECT b.*,
             a.name AS amenity_name, a.category AS amenity_category, a.location_or_building,
             h.home_number, h.block_or_tower,
             u.full_name AS resident_name, u.phone AS resident_phone, u.email AS resident_email
      FROM amenity_bookings b
      JOIN amenities a ON b.amenity_id = a.id
      JOIN homes h ON b.home_id = h.id
      JOIN users u ON b.resident_id = u.id
      WHERE b.society_id = ?
    `;
    const params = [societyId];

    // Security & resident isolation: Residents only see their own bookings
    if (userContext && ['OWNER', 'TENANT', 'FAMILY_MEMBER'].includes(userContext.role)) {
      query += ` AND (b.resident_id = ? OR b.home_id = ?)`;
      params.push(userContext.id, userContext.homeId || 0);
    }

    if (filters.amenity_id && filters.amenity_id !== 'ALL') {
      query += ` AND b.amenity_id = ?`;
      params.push(filters.amenity_id);
    }

    if (filters.status && filters.status !== 'ALL') {
      query += ` AND b.booking_status = ?`;
      params.push(filters.status);
    }

    if (filters.payment_status && filters.payment_status !== 'ALL') {
      query += ` AND b.payment_status = ?`;
      params.push(filters.payment_status);
    }

    if (filters.booking_date) {
      query += ` AND b.booking_date = ?`;
      params.push(filters.booking_date);
    }

    if (filters.home_id) {
      query += ` AND b.home_id = ?`;
      params.push(filters.home_id);
    }

    if (filters.search) {
      query += ` AND (b.booking_number LIKE ? OR a.name LIKE ? OR u.full_name LIKE ? OR h.home_number LIKE ?)`;
      const searchWild = `%${filters.search.trim()}%`;
      params.push(searchWild, searchWild, searchWild, searchWild);
    }

    query += ` ORDER BY b.booking_date DESC, b.start_time DESC`;

    const [rows] = await pool.query(query, params);
    return rows.map((b) => ({
      ...b,
      pricing_breakdown: typeof b.pricing_breakdown_json === 'string'
        ? JSON.parse(b.pricing_breakdown_json || '{}')
        : b.pricing_breakdown_json,
    }));
  }

  /**
   * Admin approves booking
   */
  static async approveBooking(bookingId, approverUserId) {
    const booking = await this.findBookingById(bookingId);
    if (!booking) throw new Error('Booking not found');

    if (booking.booking_status !== 'PENDING_APPROVAL') {
      throw new Error(`Cannot approve booking in status '${booking.booking_status}'`);
    }

    // Determine target status:
    // If total amount is 0 or payment already received, move straight to CONFIRMED.
    // If payment is pending, move to APPROVED.
    const newStatus = (Number(booking.total_amount) === 0 || booking.payment_status === 'PAID')
      ? 'CONFIRMED'
      : 'APPROVED';

    await pool.query(
      `UPDATE amenity_bookings
       SET booking_status = ?, approved_by_user_id = ?, approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [newStatus, approverUserId, bookingId]
    );

    // Audit log
    await pool.query(
      `INSERT INTO amenity_audit_logs (booking_id, society_id, actor_user_id, action, previous_status, new_status)
       VALUES (?, ?, ?, 'BOOKING_APPROVED', ?, ?)`,
      [bookingId, booking.society_id, approverUserId, booking.booking_status, newStatus]
    );

    // Notify resident
    await pool.query(
      `INSERT INTO notifications (society_id, user_id, title, message, type, reference_table, reference_id)
       VALUES (?, ?, ?, ?, 'GENERAL', 'amenity_bookings', ?)`,
      [
        booking.society_id,
        booking.resident_id,
        `Booking Approved: ${booking.amenity_name}`,
        `Your booking (${booking.booking_number}) has been approved! Status: ${newStatus}. ${newStatus === 'APPROVED' ? 'Please complete the payment to confirm your slot.' : 'Your reservation is confirmed!'}`,
        bookingId,
      ]
    );

    return this.findBookingById(bookingId);
  }

  /**
   * Admin rejects booking
   */
  static async rejectBooking(bookingId, rejectionReason, approverUserId) {
    const booking = await this.findBookingById(bookingId);
    if (!booking) throw new Error('Booking not found');

    if (['COMPLETED', 'CANCELLED', 'REJECTED'].includes(booking.booking_status)) {
      throw new Error(`Cannot reject booking in status '${booking.booking_status}'`);
    }

    await pool.query(
      `UPDATE amenity_bookings
       SET booking_status = 'REJECTED', rejection_reason = ?, approved_by_user_id = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [rejectionReason, approverUserId, bookingId]
    );

    await pool.query(
      `INSERT INTO amenity_audit_logs (booking_id, society_id, actor_user_id, action, previous_status, new_status, details_json)
       VALUES (?, ?, ?, 'BOOKING_REJECTED', ?, 'REJECTED', ?)`,
      [bookingId, booking.society_id, approverUserId, booking.booking_status, JSON.stringify({ rejectionReason })]
    );

    await pool.query(
      `INSERT INTO notifications (society_id, user_id, title, message, type, reference_table, reference_id)
       VALUES (?, ?, ?, ?, 'GENERAL', 'amenity_bookings', ?)`,
      [
        booking.society_id,
        booking.resident_id,
        `Booking Rejected (${booking.booking_number})`,
        `Your reservation for ${booking.amenity_name} was rejected. Reason: ${rejectionReason}`,
        bookingId,
      ]
    );

    return this.findBookingById(bookingId);
  }

  /**
   * Resident or Admin cancels booking
   */
  static async cancelBooking(bookingId, cancellationReason, actorUserId) {
    const booking = await this.findBookingById(bookingId);
    if (!booking) throw new Error('Booking not found');

    if (['COMPLETED', 'REJECTED', 'CANCELLED'].includes(booking.booking_status)) {
      throw new Error(`Cannot cancel booking in status '${booking.booking_status}'`);
    }

    // Check refund eligibility on deposit
    let refundStatus = booking.deposit_refund_status;
    let refundableDeposit = 0;
    if (Number(booking.deposit_collected_amount) > 0) {
      refundStatus = 'ELIGIBLE';
      refundableDeposit = Number(booking.deposit_collected_amount);
    }

    await pool.query(
      `UPDATE amenity_bookings
       SET booking_status = 'CANCELLED',
           cancellation_reason = ?,
           deposit_refund_status = ?,
           deposit_refund_amount = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [cancellationReason, refundStatus, refundableDeposit, bookingId]
    );

    await pool.query(
      `INSERT INTO amenity_audit_logs (booking_id, society_id, actor_user_id, action, previous_status, new_status, details_json)
       VALUES (?, ?, ?, 'BOOKING_CANCELLED', ?, 'CANCELLED', ?)`,
      [bookingId, booking.society_id, actorUserId, booking.booking_status, JSON.stringify({ cancellationReason, refundableDeposit })]
    );

    await pool.query(
      `INSERT INTO notifications (society_id, user_id, title, message, type, reference_table, reference_id)
       VALUES (?, ?, ?, ?, 'GENERAL', 'amenity_bookings', ?)`,
      [
        booking.society_id,
        booking.resident_id,
        `Booking Cancelled (${booking.booking_number})`,
        `Reservation for ${booking.amenity_name} on ${booking.booking_date} has been cancelled. Reason: ${cancellationReason}`,
        bookingId,
      ]
    );

    return this.findBookingById(bookingId);
  }

  /**
   * Mark Booking as Completed & record condition and deposit deductions
   */
  static async completeBooking(bookingId, completeData, actorUserId) {
    const {
      facility_condition_notes = null,
      damage_notes = null,
      damage_deduction_amount = 0.00,
      deposit_deduction_reason = null,
    } = completeData;

    const booking = await this.findBookingById(bookingId);
    if (!booking) throw new Error('Booking not found');

    const depositCollected = Number(booking.deposit_collected_amount || 0);
    const deduction = Math.min(depositCollected, Number(damage_deduction_amount || 0));
    const refundableAmount = Math.max(0, depositCollected - deduction);

    let refundStatus = 'NOT_APPLICABLE';
    if (depositCollected > 0) {
      refundStatus = refundableAmount > 0 ? 'ELIGIBLE' : 'PROCESSED';
    }

    await pool.query(
      `UPDATE amenity_bookings
       SET booking_status = 'COMPLETED',
           facility_condition_notes = ?,
           damage_notes = ?,
           deposit_deduction_amount = ?,
           deposit_deduction_reason = ?,
           deposit_refund_amount = ?,
           deposit_refund_status = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        facility_condition_notes,
        damage_notes,
        deduction,
        deposit_deduction_reason,
        refundableAmount,
        refundStatus,
        bookingId,
      ]
    );

    await pool.query(
      `INSERT INTO amenity_audit_logs (booking_id, society_id, actor_user_id, action, previous_status, new_status, details_json)
       VALUES (?, ?, ?, 'BOOKING_COMPLETED', ?, 'COMPLETED', ?)`,
      [
        bookingId,
        booking.society_id,
        actorUserId,
        booking.booking_status,
        JSON.stringify({ deduction, refundableAmount, facility_condition_notes }),
      ]
    );

    return this.findBookingById(bookingId);
  }

  /**
   * Mark booking as No-Show
   */
  static async markNoShow(bookingId, notes, actorUserId) {
    const booking = await this.findBookingById(bookingId);
    if (!booking) throw new Error('Booking not found');

    await pool.query(
      `UPDATE amenity_bookings
       SET booking_status = 'NO_SHOW', additional_notes = CONCAT(COALESCE(additional_notes, ''), ' [No-Show: ', ?, ']'), updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [notes || 'Resident did not arrive', bookingId]
    );

    await pool.query(
      `INSERT INTO amenity_audit_logs (booking_id, society_id, actor_user_id, action, previous_status, new_status)
       VALUES (?, ?, ?, 'BOOKING_NO_SHOW', ?, 'NO_SHOW')`,
      [bookingId, booking.society_id, actorUserId, booking.booking_status]
    );

    return this.findBookingById(bookingId);
  }

  // ==========================================================================
  // 5. BILLING & PAYMENTS INTEGRATION
  // ==========================================================================

  /**
   * Record payment for booking fee and/or security deposit
   */
  static async recordPayment(paymentData, actorUserId) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const {
        booking_id,
        amount,
        payment_type = 'FULL_PAYMENT',
        payment_method = 'UPI',
        transaction_reference = null,
        remarks = null,
      } = paymentData;

      const [bookingRows] = await connection.query(
        'SELECT * FROM amenity_bookings WHERE id = ? FOR UPDATE',
        [booking_id]
      );
      if (bookingRows.length === 0) throw new Error('Booking not found');
      const booking = bookingRows[0];

      const payAmount = Number(amount);
      if (payAmount <= 0) throw new Error('Payment amount must be greater than zero');

      // Receipt number generation
      const receiptNumber = `AMN-RCP-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

      // Insert payment entry
      await connection.query(
        `INSERT INTO amenity_payments (
          receipt_number, booking_id, society_id, home_id, paid_by_user_id,
          amount, payment_type, payment_method, transaction_reference,
          payment_status, collected_by_user_id, remarks
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PAID', ?, ?)`,
        [
          receiptNumber,
          booking.id,
          booking.society_id,
          booking.home_id,
          booking.resident_id,
          payAmount,
          payment_type,
          payment_method,
          transaction_reference,
          actorUserId,
          remarks,
        ]
      );

      // Determine updated payment & booking status
      const [sumRows] = await connection.query(
        `SELECT COALESCE(SUM(amount), 0) AS total_paid
         FROM amenity_payments
         WHERE booking_id = ? AND payment_type IN ('FULL_PAYMENT', 'BOOKING_FEE', 'SECURITY_DEPOSIT') AND payment_status = 'PAID'`,
        [booking.id]
      );
      const totalPaid = Number(sumRows[0].total_paid);

      let newPaymentStatus = 'PARTIALLY_PAID';
      if (totalPaid >= Number(booking.total_amount)) {
        newPaymentStatus = 'PAID';
      }

      // If deposit was collected
      let newDepositCollected = Number(booking.deposit_collected_amount || 0);
      if (payment_type === 'SECURITY_DEPOSIT' || payment_type === 'FULL_PAYMENT') {
        newDepositCollected = Number(booking.security_deposit || 0);
      }

      // Transition booking from APPROVED to CONFIRMED once paid
      let newBookingStatus = booking.booking_status;
      if (['APPROVED', 'PENDING_APPROVAL'].includes(booking.booking_status) && newPaymentStatus === 'PAID') {
        newBookingStatus = 'CONFIRMED';
      }

      await connection.query(
        `UPDATE amenity_bookings
         SET payment_status = ?,
             booking_status = ?,
             deposit_collected_amount = ?,
             deposit_refund_status = CASE WHEN ? > 0 THEN 'ELIGIBLE' ELSE deposit_refund_status END,
             deposit_refund_amount = CASE WHEN ? > 0 THEN ? ELSE deposit_refund_amount END,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          newPaymentStatus,
          newBookingStatus,
          newDepositCollected,
          newDepositCollected,
          newDepositCollected,
          newDepositCollected,
          booking.id,
        ]
      );

      // Audit Log
      await connection.query(
        `INSERT INTO amenity_audit_logs (booking_id, society_id, actor_user_id, action, previous_status, new_status, details_json)
         VALUES (?, ?, ?, 'PAYMENT_RECORDED', ?, ?, ?)`,
        [
          booking.id,
          booking.society_id,
          actorUserId,
          booking.booking_status,
          newBookingStatus,
          JSON.stringify({ receiptNumber, amount: payAmount, payment_method, newPaymentStatus }),
        ]
      );

      // Notification
      await connection.query(
        `INSERT INTO notifications (society_id, user_id, title, message, type, reference_table, reference_id)
         VALUES (?, ?, ?, ?, 'GENERAL', 'amenity_bookings', ?)`,
        [
          booking.society_id,
          booking.resident_id,
          `Payment Received: ₹${payAmount} (${receiptNumber})`,
          `We have received your payment for amenity booking ${booking.booking_number}. Booking Status: ${newBookingStatus}.`,
          booking.id,
        ]
      );

      await connection.commit();
      return { receipt_number: receiptNumber, total_paid: totalPaid, payment_status: newPaymentStatus, booking_status: newBookingStatus };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  // ==========================================================================
  // 6. DEPOSITS & REFUNDS
  // ==========================================================================

  /**
   * Process refund of security deposit with audit trail
   */
  static async processRefund(bookingId, refundData, actorUserId) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const { refund_amount, transaction_reference, remarks } = refundData;

      const [bookingRows] = await connection.query(
        'SELECT * FROM amenity_bookings WHERE id = ? FOR UPDATE',
        [bookingId]
      );
      if (bookingRows.length === 0) throw new Error('Booking not found');
      const booking = bookingRows[0];

      const refundVal = Number(refund_amount);
      const maxRefundable = Math.max(0, Number(booking.deposit_collected_amount) - Number(booking.deposit_deduction_amount));

      if (refundVal <= 0 || refundVal > maxRefundable) {
        throw new Error(`Refund amount must be between 1 and ₹${maxRefundable}`);
      }

      const receiptNumber = `AMN-REF-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

      // Insert refund transaction
      await connection.query(
        `INSERT INTO amenity_payments (
          receipt_number, booking_id, society_id, home_id, paid_by_user_id,
          amount, payment_type, payment_method, transaction_reference,
          payment_status, collected_by_user_id, remarks
        ) VALUES (?, ?, ?, ?, ?, ?, 'REFUND', 'UPI', ?, 'REFUNDED', ?, ?)`,
        [
          receiptNumber,
          booking.id,
          booking.society_id,
          booking.home_id,
          booking.resident_id,
          refundVal,
          transaction_reference,
          actorUserId,
          remarks || 'Deposit Refund Processed',
        ]
      );

      // Update booking deposit refund status
      await connection.query(
        `UPDATE amenity_bookings
         SET deposit_refund_status = 'PROCESSED',
             deposit_refund_amount = ?,
             deposit_refund_txn_ref = ?,
             deposit_refunded_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [refundVal, transaction_reference, booking.id]
      );

      // Audit Log
      await connection.query(
        `INSERT INTO amenity_audit_logs (booking_id, society_id, actor_user_id, action, details_json)
         VALUES (?, ?, ?, 'REFUND_PROCESSED', ?)`,
        [booking.id, booking.society_id, actorUserId, JSON.stringify({ receiptNumber, refundVal, transaction_reference })]
      );

      // Notification
      await connection.query(
        `INSERT INTO notifications (society_id, user_id, title, message, type, reference_table, reference_id)
         VALUES (?, ?, ?, ?, 'GENERAL', 'amenity_bookings', ?)`,
        [
          booking.society_id,
          booking.resident_id,
          `Deposit Refund Processed: ₹${refundVal}`,
          `Your security deposit refund of ₹${refundVal} for booking ${booking.booking_number} has been processed (Txn: ${transaction_reference || receiptNumber}).`,
          booking.id,
        ]
      );

      await connection.commit();
      return this.findBookingById(booking.id);
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  // ==========================================================================
  // 7. ANALYTICS & REPORTS
  // ==========================================================================

  static async getReports(societyId, dateRange = {}) {
    const { start_date, end_date, amenity_id } = dateRange;

    let dateFilter = '';
    const dateParams = [societyId];

    if (start_date && end_date) {
      dateFilter += ` AND b.booking_date BETWEEN ? AND ?`;
      dateParams.push(start_date, end_date);
    }
    if (amenity_id && amenity_id !== 'ALL') {
      dateFilter += ` AND b.amenity_id = ?`;
      dateParams.push(amenity_id);
    }

    // 1. Overview counts
    const [amenityStats] = await pool.query(
      `SELECT
        COUNT(*) AS total_amenities,
        SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) AS active_amenities
       FROM amenities
       WHERE society_id = ?`,
      [societyId]
    );

    const [bookingStats] = await pool.query(
      `SELECT
        COUNT(*) AS total_bookings,
        SUM(CASE WHEN b.booking_status = 'PENDING_APPROVAL' THEN 1 ELSE 0 END) AS pending_approvals,
        SUM(CASE WHEN b.booking_status = 'CONFIRMED' THEN 1 ELSE 0 END) AS confirmed_bookings,
        SUM(CASE WHEN b.booking_date = CURDATE() AND b.booking_status IN ('CONFIRMED', 'APPROVED') THEN 1 ELSE 0 END) AS todays_bookings,
        SUM(CASE WHEN b.booking_status IN ('CONFIRMED', 'COMPLETED') THEN b.booking_fee ELSE 0 END) AS total_revenue,
        SUM(CASE WHEN b.payment_status = 'PENDING' AND b.booking_status IN ('APPROVED', 'CONFIRMED') THEN b.total_amount ELSE 0 END) AS outstanding_payments,
        SUM(CASE WHEN b.deposit_refund_status = 'ELIGIBLE' THEN b.deposit_collected_amount - b.deposit_deduction_amount ELSE 0 END) AS deposits_held,
        SUM(CASE WHEN b.deposit_refund_status = 'PENDING_APPROVAL' THEN b.deposit_refund_amount ELSE 0 END) AS pending_refunds
       FROM amenity_bookings b
       WHERE b.society_id = ? ${dateFilter}`,
      dateParams
    );

    // 2. Category breakdown
    const [categoryBreakdown] = await pool.query(
      `SELECT a.category, COUNT(b.id) AS bookings_count, COALESCE(SUM(b.booking_fee), 0) AS total_revenue
       FROM amenities a
       LEFT JOIN amenity_bookings b ON a.id = b.amenity_id ${dateFilter}
       WHERE a.society_id = ?
       GROUP BY a.category
       ORDER BY bookings_count DESC`,
      dateParams
    );

    // 3. Recent bookings
    const [recentBookings] = await pool.query(
      `SELECT b.id, b.booking_number, b.booking_date, b.start_time, b.end_time, b.booking_status, b.payment_status,
              b.total_amount, b.booking_fee, b.security_deposit,
              a.name AS amenity_name, h.home_number, u.full_name AS resident_name
       FROM amenity_bookings b
       JOIN amenities a ON b.amenity_id = a.id
       JOIN homes h ON b.home_id = h.id
       JOIN users u ON b.resident_id = u.id
       WHERE b.society_id = ? ${dateFilter}
       ORDER BY b.created_at DESC
       LIMIT 10`,
      dateParams
    );

    return {
      overview: {
        total_amenities: Number(amenityStats[0]?.total_amenities || 0),
        active_amenities: Number(amenityStats[0]?.active_amenities || 0),
        total_bookings: Number(bookingStats[0]?.total_bookings || 0),
        pending_approvals: Number(bookingStats[0]?.pending_approvals || 0),
        confirmed_bookings: Number(bookingStats[0]?.confirmed_bookings || 0),
        todays_bookings: Number(bookingStats[0]?.todays_bookings || 0),
        booking_revenue: Number(bookingStats[0]?.total_revenue || 0),
        outstanding_payments: Number(bookingStats[0]?.outstanding_payments || 0),
        deposits_held: Number(bookingStats[0]?.deposits_held || 0),
        pending_refunds: Number(bookingStats[0]?.pending_refunds || 0),
      },
      category_breakdown: categoryBreakdown,
      recent_bookings: recentBookings,
    };
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  static _formatAmenity(row) {
    if (!row) return null;
    return {
      ...row,
      images: typeof row.images_json === 'string' ? JSON.parse(row.images_json || '[]') : (row.images_json || []),
      available_days: typeof row.available_days_json === 'string' ? JSON.parse(row.available_days_json || '[]') : (row.available_days_json || []),
      requires_approval: Boolean(row.requires_approval),
      booking_fee: Number(row.booking_fee),
      security_deposit: Number(row.security_deposit),
    };
  }
}

module.exports = AmenityRepository;
