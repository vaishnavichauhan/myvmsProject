import apiClient from './apiClient';

/**
 * Resident Management REST API client
 */
export const residentApi = {
  getResidents: (params) => apiClient.get('/residents', { params }),
  getResidentById: (id) => apiClient.get(`/residents/${id}`),
  createResident: (data) => apiClient.post('/residents', data),
  updateResident: (id, data) => apiClient.put(`/residents/${id}`, data),
  updateResidentStatus: (id, status) => apiClient.patch(`/residents/${id}/status`, { status }),
  resetResidentPassword: (id, newPassword) => apiClient.post(`/residents/${id}/reset-password`, { newPassword }),
  deleteResident: (id) => apiClient.delete(`/residents/${id}`),
  importBatchResidents: (data) => apiClient.post('/residents/import-batch', data),
  getSocietyUsers: (params) => apiClient.get('/residents/society-users', { params }),
};
