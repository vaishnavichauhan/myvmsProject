const { Router } = require('express');
const AmenityController = require('../controllers/amenity.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { roleMiddleware } = require('../middlewares/role.middleware');
const { ROLES } = require('../constants/roles');
const { requireFeature } = require('../middlewares/entitlement.middleware');

const router = Router();

// Protect all amenity routes with auth and AMENITIES module entitlement
router.use(authMiddleware, requireFeature('AMENITIES'));

// ==========================================================================
// 1. AMENITY CATALOG & DETAILS
// ==========================================================================

// List amenities (accessible to all authenticated users)
router.get('/', AmenityController.getAmenities);

// View single amenity
router.get('/:id', AmenityController.getAmenityById);

// Create amenity (Admin only)
router.post(
  '/',
  roleMiddleware(ROLES.ADMIN),
  AmenityController.createAmenity
);

// Update amenity (Admin only)
router.put(
  '/:id',
  roleMiddleware(ROLES.ADMIN),
  AmenityController.updateAmenity
);

// Delete amenity (Admin only)
router.delete(
  '/:id',
  roleMiddleware(ROLES.ADMIN),
  AmenityController.deleteAmenity
);

// ==========================================================================
// 2. AVAILABILITY, TIME SLOTS & PRICING
// ==========================================================================

// Get time slots for date
router.get('/:id/slots', AmenityController.getSlotsForDate);

// Check specific slot availability
router.get('/:id/check-availability', AmenityController.checkAvailability);

// Calculate price breakdown
router.get('/:id/calculate-price', AmenityController.calculatePrice);

// ==========================================================================
// 3. BLOCKED / MAINTENANCE DATES
// ==========================================================================

router.post(
  '/blocked-dates',
  roleMiddleware(ROLES.ADMIN),
  AmenityController.addBlockedDate
);

router.delete(
  '/blocked-dates/:id',
  roleMiddleware(ROLES.ADMIN),
  AmenityController.removeBlockedDate
);

// ==========================================================================
// 4. PRICING RULES
// ==========================================================================

router.post(
  '/pricing-rules',
  roleMiddleware(ROLES.ADMIN),
  AmenityController.addPricingRule
);

router.delete(
  '/pricing-rules/:id',
  roleMiddleware(ROLES.ADMIN),
  AmenityController.removePricingRule
);

// ==========================================================================
// 5. BOOKINGS MANAGEMENT
// ==========================================================================

// List bookings (Admins see all; Residents see their home's bookings)
router.get(
  '/bookings/list',
  roleMiddleware(ROLES.ADMIN, ROLES.COMMITTEE_MEMBER, ROLES.OWNER, ROLES.TENANT, ROLES.FAMILY_MEMBER),
  AmenityController.getBookings
);

// Submit resident booking request
router.post(
  '/bookings',
  roleMiddleware(ROLES.ADMIN, ROLES.OWNER, ROLES.TENANT, ROLES.FAMILY_MEMBER),
  AmenityController.createBooking
);

// View booking detail
router.get(
  '/bookings/:id',
  roleMiddleware(ROLES.ADMIN, ROLES.COMMITTEE_MEMBER, ROLES.OWNER, ROLES.TENANT, ROLES.FAMILY_MEMBER),
  AmenityController.getBookingById
);

// Approve booking request (Admin & Committee Member)
router.patch(
  '/bookings/:id/approve',
  roleMiddleware(ROLES.ADMIN, ROLES.COMMITTEE_MEMBER),
  AmenityController.approveBooking
);

// Reject booking request (Admin & Committee Member)
router.patch(
  '/bookings/:id/reject',
  roleMiddleware(ROLES.ADMIN, ROLES.COMMITTEE_MEMBER),
  AmenityController.rejectBooking
);

// Cancel booking (Resident or Admin)
router.patch(
  '/bookings/:id/cancel',
  roleMiddleware(ROLES.ADMIN, ROLES.OWNER, ROLES.TENANT, ROLES.FAMILY_MEMBER),
  AmenityController.cancelBooking
);

// Complete booking & record condition / deductions (Admin only)
router.patch(
  '/bookings/:id/complete',
  roleMiddleware(ROLES.ADMIN),
  AmenityController.completeBooking
);

// Mark booking as No-Show (Admin only)
router.patch(
  '/bookings/:id/no-show',
  roleMiddleware(ROLES.ADMIN),
  AmenityController.markNoShow
);

// ==========================================================================
// 6. BILLING, PAYMENTS & REFUNDS
// ==========================================================================

// Record payment (Booking fee / Deposit)
router.post(
  '/payments',
  roleMiddleware(ROLES.ADMIN, ROLES.OWNER, ROLES.TENANT, ROLES.FAMILY_MEMBER),
  AmenityController.recordPayment
);

// Process security deposit refund (Admin only)
router.post(
  '/bookings/:id/refund',
  roleMiddleware(ROLES.ADMIN),
  AmenityController.processRefund
);

// ==========================================================================
// 7. REPORTS & ANALYTICS
// ==========================================================================

router.get(
  '/reports/overview',
  roleMiddleware(ROLES.ADMIN, ROLES.COMMITTEE_MEMBER),
  AmenityController.getReports
);

module.exports = router;
