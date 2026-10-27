import apiClient from './apiClient';

/**
 * Gate Management API Client
 */
export const gateApi = {
  // All authenticated users
  getGates: (params) => apiClient.get('/gates', { params }),
  getGateById: (id) => apiClient.get(`/gates/${id}`),

  // Security staff view: Their own active gate check-in
  getMyAssignedGate: () => apiClient.get('/gates/assigned/me'),

  // Security Self Check-In: Security picks their gate when starting duty
  selfCheckIn: (data) => apiClient.post('/gates/self-checkin', data),

  // Security Self Check-Out: Security exits their gate (called on logout)
  selfCheckOut: () => apiClient.post('/gates/self-checkout'),

  // Admin-Only Gate Management
  createGate: (data) => apiClient.post('/gates', data),
  updateGate: (id, data) => apiClient.put(`/gates/${id}`, data),
  deleteGate: (id) => apiClient.delete(`/gates/${id}`),
};

