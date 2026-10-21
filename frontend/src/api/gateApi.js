import apiClient from './apiClient';

/**
 * Gate Management & Security Assignment API Client
 */
export const gateApi = {
  // All authenticated users (Admin gets full management, residents get resident-scoped view)
  getGates: (params) => apiClient.get('/gates', { params }),
  getGateById: (id) => apiClient.get(`/gates/${id}`),

  // Security staff view: Their own assigned gate
  getMyAssignedGate: () => apiClient.get('/gates/assigned/me'),

  // Admin-Only Gate Management
  createGate: (data) => apiClient.post('/gates', data),
  updateGate: (id, data) => apiClient.put(`/gates/${id}`, data),
  deleteGate: (id) => apiClient.delete(`/gates/${id}`),

  // Admin-Only Security Staff Assignment to Gate
  assignSecurityStaff: (data) => apiClient.post('/gates/assign', data),
  unassignSecurityStaff: (assignmentId) => apiClient.delete(`/gates/assignments/${assignmentId}`),
};
