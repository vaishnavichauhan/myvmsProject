import apiClient from './apiClient';

/**
 * Amenities & Bookings API Client
 * Connects frontend modules to backend /api/amenities endpoints.
 */
export const amenityApi = {
  // 1. Amenities Catalog
  getAmenities: (params) => apiClient.get('/amenities', { params }),
  getAmenityById: (id) => apiClient.get(`/amenities/${id}`),
  createAmenity: (data) => apiClient.post('/amenities', data),
  updateAmenity: (id, data) => apiClient.put(`/amenities/${id}`, data),
  deleteAmenity: (id) => apiClient.delete(`/amenities/${id}`),

  // 2. Availability & Slots
  getSlotsForDate: (id, date) => apiClient.get(`/amenities/${id}/slots`, { params: { date } }),
  checkAvailability: (id, params) => apiClient.get(`/amenities/${id}/check-availability`, { params }),
  calculatePrice: (id, params) => apiClient.get(`/amenities/${id}/calculate-price`, { params }),

  // 3. Blocked Dates & Pricing Rules
  addBlockedDate: (data) => apiClient.post('/amenities/blocked-dates', data),
  removeBlockedDate: (id) => apiClient.delete(`/amenities/blocked-dates/${id}`),
  addPricingRule: (data) => apiClient.post('/amenities/pricing-rules', data),
  removePricingRule: (id) => apiClient.delete(`/amenities/pricing-rules/${id}`),

  // 4. Bookings Management
  getBookings: (params) => apiClient.get('/amenities/bookings/list', { params }),
  getBookingById: (id) => apiClient.get(`/amenities/bookings/${id}`),
  createBooking: (data) => apiClient.post('/amenities/bookings', data),
  approveBooking: (id) => apiClient.patch(`/amenities/bookings/${id}/approve`),
  rejectBooking: (id, rejection_reason) => apiClient.patch(`/amenities/bookings/${id}/reject`, { rejection_reason }),
  cancelBooking: (id, cancellation_reason) => apiClient.patch(`/amenities/bookings/${id}/cancel`, { cancellation_reason }),
  completeBooking: (id, data) => apiClient.patch(`/amenities/bookings/${id}/complete`, data),
  markNoShow: (id, notes) => apiClient.patch(`/amenities/bookings/${id}/no-show`, { notes }),

  // 5. Billing, Payments & Refunds
  recordPayment: (data) => apiClient.post('/amenities/payments', data),
  processRefund: (id, data) => apiClient.post(`/amenities/bookings/${id}/refund`, data),

  // 6. Reports & Analytics
  getReports: (params) => apiClient.get('/amenities/reports/overview', { params }),
};

export default amenityApi;
