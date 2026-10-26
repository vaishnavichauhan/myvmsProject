const AmenityRepository = require('../repositories/amenity.repository');
const { pool } = require('../config/db');

class AmenityService {
  /**
   * Helper: Resolve effective society ID for current request
   */
  static async resolveSocietyId(user, queryOrBodySocietyId) {
    if (queryOrBodySocietyId && queryOrBodySocietyId !== 'ALL' && !isNaN(Number(queryOrBodySocietyId))) {
      return Number(queryOrBodySocietyId);
    }
    if (user?.societyId) return Number(user.societyId);
    if (user?.society_id) return Number(user.society_id);

    // If user is resident, check home's society
    if (user?.homeId) {
      const [hRows] = await pool.query('SELECT society_id FROM homes WHERE id = ?', [user.homeId]);
      if (hRows.length > 0) return hRows[0].society_id;
    }

    // Default to first active society
    const [sRows] = await pool.query('SELECT id FROM societies WHERE status = "ACTIVE" ORDER BY id ASC LIMIT 1');
    if (sRows.length > 0) return sRows[0].id;

    throw new Error('No active society found.');
  }

  /**
   * Helper: Resolve resident's authorized home ID
   */
  static async resolveResidentHomeId(user, requestedHomeId) {
    // If Admin, they can specify any valid home
    if (user.role === 'ADMIN') {
      if (requestedHomeId) return Number(requestedHomeId);
      const [firstHome] = await pool.query('SELECT id FROM homes LIMIT 1');
      return firstHome.length > 0 ? firstHome[0].id : null;
    }

    // For Residents (OWNER, TENANT, FAMILY_MEMBER):
    // 1. Check user.homeId
    if (user.homeId) return Number(user.homeId);

    // 2. Query resident mapping
    const [resRows] = await pool.query(
      'SELECT home_id FROM residents WHERE user_id = ? AND status = "ACTIVE" LIMIT 1',
      [user.id]
    );
    if (resRows.length > 0) return resRows[0].home_id;

    // 3. Query family member mapping
    const [famRows] = await pool.query(
      'SELECT home_id FROM family_members WHERE user_id = ? AND status = "ACTIVE" LIMIT 1',
      [user.id]
    );
    if (famRows.length > 0) return famRows[0].home_id;

    throw new Error('Authorized home could not be resolved for your resident account.');
  }

  // ==========================================================================
  // AMENITIES
  // ==========================================================================

  static async createAmenity(data, user) {
    const societyId = await this.resolveSocietyId(user, data.society_id);

    if (!data.name || !data.name.trim()) {
      throw new Error('Amenity name is required.');
    }

    if (data.booking_fee && Number(data.booking_fee) < 0) {
      throw new Error('Booking fee cannot be negative.');
    }
    if (data.security_deposit && Number(data.security_deposit) < 0) {
      throw new Error('Security deposit cannot be negative.');
    }

    return AmenityRepository.createAmenity({
      ...data,
      society_id: societyId,
    });
  }

  static async updateAmenity(id, data) {
    const existing = await AmenityRepository.findAmenityById(id);
    if (!existing) throw new Error('Amenity not found.');

    if (data.booking_fee !== undefined && Number(data.booking_fee) < 0) {
      throw new Error('Booking fee cannot be negative.');
    }
    if (data.security_deposit !== undefined && Number(data.security_deposit) < 0) {
      throw new Error('Security deposit cannot be negative.');
    }

    return AmenityRepository.updateAmenity(id, data);
  }

  static async getAmenities(societyId, filters) {
    return AmenityRepository.getAmenities(societyId, filters);
  }

  static async getAmenityById(id) {
    const amenity = await AmenityRepository.findAmenityById(id);
    if (!amenity) throw new Error('Amenity not found.');

    const pricingRules = await AmenityRepository.getPricingRules(id, amenity.society_id);
    const blockedDates = await AmenityRepository.getBlockedDates(id, amenity.society_id);

    return {
      ...amenity,
      pricing_rules: pricingRules,
      blocked_dates: blockedDates,
    };
  }

  static async deleteAmenity(id) {
    const existing = await AmenityRepository.findAmenityById(id);
    if (!existing) throw new Error('Amenity not found.');
    return AmenityRepository.deleteAmenity(id);
  }

  // ==========================================================================
  // AVAILABILITY & SLOTS
  // ==========================================================================

  static async getSlotsForDate(amenityId, date) {
    if (!date) throw new Error('Date is required to check slot availability.');
    return AmenityRepository.getSlotsForDate(amenityId, date);
  }

  static async checkAvailability(amenityId, bookingDate, startTime, endTime, excludeBookingId = null) {
    if (!bookingDate || !startTime || !endTime) {
      throw new Error('Booking date, start time, and end time are required.');
    }
    return AmenityRepository.isSlotAvailable(amenityId, bookingDate, startTime, endTime, excludeBookingId);
  }

  static async calculatePrice(amenityId, bookingDate, startTime, endTime, residentType = 'RESIDENT') {
    if (!bookingDate || !startTime || !endTime) {
      throw new Error('Booking date, start time, and end time are required.');
    }
    return AmenityRepository.calculateBookingPrice(amenityId, bookingDate, startTime, endTime, residentType);
  }

  // ==========================================================================
  // BLOCKED DATES & PRICING RULES
  // ==========================================================================

  static async addBlockedDate(data, user) {
    const societyId = await this.resolveSocietyId(user, data.society_id);
    if (!data.amenity_id || !data.start_date || !data.end_date || !data.reason) {
      throw new Error('Amenity, start date, end date, and reason are required.');
    }
    return AmenityRepository.addBlockedDate({
      ...data,
      society_id: societyId,
      created_by_user_id: user.id,
    });
  }

  static async removeBlockedDate(id) {
    return AmenityRepository.removeBlockedDate(id);
  }

  static async addPricingRule(data, user) {
    const societyId = await this.resolveSocietyId(user, data.society_id);
    if (!data.amenity_id || !data.rule_name) {
      throw new Error('Amenity and rule name are required.');
    }
    return AmenityRepository.addPricingRule({
      ...data,
      society_id: societyId,
    });
  }

  static async removePricingRule(id) {
    return AmenityRepository.removePricingRule(id);
  }

  // ==========================================================================
  // BOOKINGS
  // ==========================================================================

  static async createBooking(data, user) {
    const societyId = await this.resolveSocietyId(user, data.society_id);
    const homeId = await this.resolveResidentHomeId(user, data.home_id);

    if (!data.amenity_id) throw new Error('Amenity is required.');
    if (!data.booking_date) throw new Error('Booking date is required.');
    if (!data.start_time || !data.end_time) throw new Error('Start time and end time are required.');
    if (!data.purpose || !data.purpose.trim()) throw new Error('Booking purpose is required.');

    const bookingPayload = {
      ...data,
      society_id: societyId,
      home_id: homeId,
      resident_id: user.id,
    };

    return AmenityRepository.createBooking(bookingPayload, user.id);
  }

  static async getBookings(societyId, filters, user) {
    return AmenityRepository.getBookings(societyId, filters, user);
  }

  static async getBookingById(id, user) {
    const booking = await AmenityRepository.findBookingById(id);
    if (!booking) throw new Error('Booking not found.');

    // Security check: Residents only access their own bookings
    if (['OWNER', 'TENANT', 'FAMILY_MEMBER'].includes(user.role)) {
      if (booking.resident_id !== user.id && booking.home_id !== user.homeId) {
        throw new Error('Access denied. You can only view your own home reservations.');
      }
    }

    return booking;
  }

  static async approveBooking(id, user) {
    if (user.role !== 'ADMIN' && user.role !== 'COMMITTEE_MEMBER') {
      throw new Error('Only Admins and Committee Members can approve bookings.');
    }
    return AmenityRepository.approveBooking(id, user.id);
  }

  static async rejectBooking(id, rejectionReason, user) {
    if (user.role !== 'ADMIN' && user.role !== 'COMMITTEE_MEMBER') {
      throw new Error('Only Admins and Committee Members can reject bookings.');
    }
    if (!rejectionReason || !rejectionReason.trim()) {
      throw new Error('A rejection reason must be provided.');
    }
    return AmenityRepository.rejectBooking(id, rejectionReason.trim(), user.id);
  }

  static async cancelBooking(id, cancellationReason, user) {
    const booking = await AmenityRepository.findBookingById(id);
    if (!booking) throw new Error('Booking not found.');

    // Resident cancellation validation
    if (['OWNER', 'TENANT', 'FAMILY_MEMBER'].includes(user.role)) {
      if (booking.resident_id !== user.id && booking.home_id !== user.homeId) {
        throw new Error('You cannot cancel another resident\'s booking.');
      }
    }

    if (!cancellationReason || !cancellationReason.trim()) {
      throw new Error('A cancellation reason must be provided.');
    }

    return AmenityRepository.cancelBooking(id, cancellationReason.trim(), user.id);
  }

  static async completeBooking(id, completeData, user) {
    if (user.role !== 'ADMIN') {
      throw new Error('Only Admins can record facility condition and complete bookings.');
    }
    return AmenityRepository.completeBooking(id, completeData, user.id);
  }

  static async markNoShow(id, notes, user) {
    if (user.role !== 'ADMIN') {
      throw new Error('Only Admins can mark a booking as No-Show.');
    }
    return AmenityRepository.markNoShow(id, notes, user.id);
  }

  // ==========================================================================
  // PAYMENTS & REFUNDS
  // ==========================================================================

  static async recordPayment(paymentData, user) {
    if (!paymentData.booking_id || !paymentData.amount) {
      throw new Error('Booking ID and payment amount are required.');
    }
    return AmenityRepository.recordPayment(paymentData, user.id);
  }

  static async processRefund(bookingId, refundData, user) {
    if (user.role !== 'ADMIN') {
      throw new Error('Only Admins can approve and process security deposit refunds.');
    }
    if (!refundData.refund_amount) {
      throw new Error('Refund amount is required.');
    }
    return AmenityRepository.processRefund(bookingId, refundData, user.id);
  }

  // ==========================================================================
  // REPORTS
  // ==========================================================================

  static async getReports(societyId, query) {
    return AmenityRepository.getReports(societyId, query);
  }
}

module.exports = AmenityService;
