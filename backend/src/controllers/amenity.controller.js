const AmenityService = require('../services/amenity.service');
const ApiResponse = require('../utils/apiResponse');

class AmenityController {
  // ==========================================================================
  // AMENITIES
  // ==========================================================================

  static async createAmenity(req, res, next) {
    try {
      const amenity = await AmenityService.createAmenity(req.body, req.user);
      return ApiResponse.created(res, 'Amenity created successfully', amenity);
    } catch (err) {
      next(err);
    }
  }

  static async updateAmenity(req, res, next) {
    try {
      const amenity = await AmenityService.updateAmenity(req.params.id, req.body);
      return ApiResponse.success(res, 'Amenity updated successfully', amenity);
    } catch (err) {
      next(err);
    }
  }

  static async getAmenities(req, res, next) {
    try {
      const societyId = await AmenityService.resolveSocietyId(req.user, req.query.society_id);
      const amenities = await AmenityService.getAmenities(societyId, req.query);
      return ApiResponse.success(res, 'Amenities retrieved successfully', amenities);
    } catch (err) {
      next(err);
    }
  }

  static async getAmenityById(req, res, next) {
    try {
      const amenity = await AmenityService.getAmenityById(req.params.id);
      return ApiResponse.success(res, 'Amenity retrieved successfully', amenity);
    } catch (err) {
      next(err);
    }
  }

  static async deleteAmenity(req, res, next) {
    try {
      await AmenityService.deleteAmenity(req.params.id);
      return ApiResponse.success(res, 'Amenity deleted successfully');
    } catch (err) {
      next(err);
    }
  }

  // ==========================================================================
  // AVAILABILITY, SLOTS & PRICING
  // ==========================================================================

  static async getSlotsForDate(req, res, next) {
    try {
      const { id } = req.params;
      const { date } = req.query;
      const slots = await AmenityService.getSlotsForDate(id, date);
      return ApiResponse.success(res, 'Slots retrieved successfully', slots);
    } catch (err) {
      next(err);
    }
  }

  static async checkAvailability(req, res, next) {
    try {
      const { id } = req.params;
      const { booking_date, start_time, end_time, exclude_booking_id } = req.query;
      const result = await AmenityService.checkAvailability(id, booking_date, start_time, end_time, exclude_booking_id);
      return ApiResponse.success(res, 'Availability checked', result);
    } catch (err) {
      next(err);
    }
  }

  static async calculatePrice(req, res, next) {
    try {
      const { id } = req.params;
      const { booking_date, start_time, end_time, resident_type } = req.query;
      const pricing = await AmenityService.calculatePrice(id, booking_date, start_time, end_time, resident_type);
      return ApiResponse.success(res, 'Pricing calculated successfully', pricing);
    } catch (err) {
      next(err);
    }
  }

  // ==========================================================================
  // BLOCKED DATES & PRICING RULES
  // ==========================================================================

  static async addBlockedDate(req, res, next) {
    try {
      const id = await AmenityService.addBlockedDate(req.body, req.user);
      return ApiResponse.created(res, 'Maintenance / Blocked date added successfully', { id });
    } catch (err) {
      next(err);
    }
  }

  static async removeBlockedDate(req, res, next) {
    try {
      await AmenityService.removeBlockedDate(req.params.id);
      return ApiResponse.success(res, 'Blocked date removed successfully');
    } catch (err) {
      next(err);
    }
  }

  static async addPricingRule(req, res, next) {
    try {
      const id = await AmenityService.addPricingRule(req.body, req.user);
      return ApiResponse.created(res, 'Pricing rule added successfully', { id });
    } catch (err) {
      next(err);
    }
  }

  static async removePricingRule(req, res, next) {
    try {
      await AmenityService.removePricingRule(req.params.id);
      return ApiResponse.success(res, 'Pricing rule removed successfully');
    } catch (err) {
      next(err);
    }
  }

  // ==========================================================================
  // BOOKINGS
  // ==========================================================================

  static async createBooking(req, res, next) {
    try {
      const booking = await AmenityService.createBooking(req.body, req.user);
      return ApiResponse.created(res, 'Booking request submitted successfully', booking);
    } catch (err) {
      next(err);
    }
  }

  static async getBookings(req, res, next) {
    try {
      const societyId = await AmenityService.resolveSocietyId(req.user, req.query.society_id);
      const bookings = await AmenityService.getBookings(societyId, req.query, req.user);
      return ApiResponse.success(res, 'Bookings retrieved successfully', bookings);
    } catch (err) {
      next(err);
    }
  }

  static async getBookingById(req, res, next) {
    try {
      const booking = await AmenityService.getBookingById(req.params.id, req.user);
      return ApiResponse.success(res, 'Booking retrieved successfully', booking);
    } catch (err) {
      next(err);
    }
  }

  static async approveBooking(req, res, next) {
    try {
      const booking = await AmenityService.approveBooking(req.params.id, req.user);
      return ApiResponse.success(res, 'Booking approved successfully', booking);
    } catch (err) {
      next(err);
    }
  }

  static async rejectBooking(req, res, next) {
    try {
      const { rejection_reason } = req.body;
      const booking = await AmenityService.rejectBooking(req.params.id, rejection_reason, req.user);
      return ApiResponse.success(res, 'Booking rejected successfully', booking);
    } catch (err) {
      next(err);
    }
  }

  static async cancelBooking(req, res, next) {
    try {
      const { cancellation_reason } = req.body;
      const booking = await AmenityService.cancelBooking(req.params.id, cancellation_reason, req.user);
      return ApiResponse.success(res, 'Booking cancelled successfully', booking);
    } catch (err) {
      next(err);
    }
  }

  static async completeBooking(req, res, next) {
    try {
      const booking = await AmenityService.completeBooking(req.params.id, req.body, req.user);
      return ApiResponse.success(res, 'Booking completed and facility condition recorded', booking);
    } catch (err) {
      next(err);
    }
  }

  static async markNoShow(req, res, next) {
    try {
      const { notes } = req.body;
      const booking = await AmenityService.markNoShow(req.params.id, notes, req.user);
      return ApiResponse.success(res, 'Booking marked as No-Show', booking);
    } catch (err) {
      next(err);
    }
  }

  // ==========================================================================
  // BILLING, PAYMENTS & REFUNDS
  // ==========================================================================

  static async recordPayment(req, res, next) {
    try {
      const result = await AmenityService.recordPayment(req.body, req.user);
      return ApiResponse.success(res, 'Payment recorded successfully', result);
    } catch (err) {
      next(err);
    }
  }

  static async processRefund(req, res, next) {
    try {
      const booking = await AmenityService.processRefund(req.params.id, req.body, req.user);
      return ApiResponse.success(res, 'Security deposit refund processed successfully', booking);
    } catch (err) {
      next(err);
    }
  }

  // ==========================================================================
  // REPORTS
  // ==========================================================================

  static async getReports(req, res, next) {
    try {
      const societyId = await AmenityService.resolveSocietyId(req.user, req.query.society_id);
      const reports = await AmenityService.getReports(societyId, req.query);
      return ApiResponse.success(res, 'Amenity reports retrieved successfully', reports);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = AmenityController;
