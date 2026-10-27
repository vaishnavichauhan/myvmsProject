import apiClient from './apiClient';

/**
 * Special Charges API Client
 * One-time or occasional charges (Society Repair, Festival Charges, etc.)
 */
export const specialChargeApi = {
  // Statistics Overview
  getStats: (params) => apiClient.get('/special-charges/stats', { params }),

  // Resident / My Home Charges
  getResidentCharges: (params) => apiClient.get('/special-charges/my-charges', { params }),

  // List All Charges (Admin / Committee Member)
  getAllCharges: (params) => apiClient.get('/special-charges', { params }),

  // Charge Detail
  getChargeById: (id) => apiClient.get(`/special-charges/${id}`),

  // Create Special Charge (Admin / Committee Member)
  createCharge: (data) => apiClient.post('/special-charges', data),

  // Update Special Charge
  updateCharge: (id, data) => apiClient.put(`/special-charges/${id}`, data),

  // Delete / Cancel Special Charge
  deleteCharge: (id) => apiClient.delete(`/special-charges/${id}`),

  // Home Assignments breakdown for a specific charge
  getAssignmentsByCharge: (id, params) => apiClient.get(`/special-charges/${id}/assignments`, { params }),

  // Record / Pay Payment
  recordPayment: (data) => apiClient.post('/special-charges/payments', data),

  // Admin Approve Payment
  approvePayment: (id, data) => apiClient.post(`/special-charges/payments/${id}/approve`, data),

  // Admin Reject Payment
  rejectPayment: (id, data) => apiClient.post(`/special-charges/payments/${id}/reject`, data),

  // List all payments / receipts
  getAllPayments: (params) => apiClient.get('/special-charges/payments', { params }),
};

export default specialChargeApi;
