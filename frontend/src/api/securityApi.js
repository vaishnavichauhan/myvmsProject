import apiClient from './apiClient';

/**
 * Security Management & Watchman Gate Console API client
 */
export const securityApi = {
  // Admin Staff Management
  getSecurityStaff: (params) => apiClient.get('/security', { params }),
  getSecurityStaffById: (id) => apiClient.get(`/security/${id}`),
  createSecurityStaff: (data) => apiClient.post('/security', data),
  updateSecurityStaff: (id, data) => apiClient.put(`/security/${id}`, data),
  updateSecurityStaffStatus: (id, status) => apiClient.patch(`/security/${id}/status`, { status }),
  resetSecurityStaffPassword: (id, newPassword) => apiClient.post(`/security/${id}/reset-password`, { newPassword }),
  deleteSecurityStaff: (id) => apiClient.delete(`/security/${id}`),

  // Security Gate Operations
  getGateDashboard: (societyId) => apiClient.get('/security/gate/dashboard', { params: { societyId } }),
  searchHomes: (query, societyId) => apiClient.get('/security/gate/search-homes', { params: { q: query, societyId } }),
  recordGateEntry: (data) => apiClient.post('/security/gate/entry', data),
  recordGateExit: (id) => apiClient.patch(`/security/gate/exit/${id}`),
  contactResident: (data) => apiClient.post('/security/gate/contact-resident', data),
};

