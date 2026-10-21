import apiClient from './apiClient';

/**
 * Society and Home REST API client
 */
export const societyApi = {
  // Society Endpoints
  getSocieties: (params) => apiClient.get('/societies', { params }),
  getAllSocieties: (params) => apiClient.get('/societies', { params }),
  getSocietyById: (id) => apiClient.get(`/societies/${id}`),
  createSociety: (data) => apiClient.post('/societies', data),
  updateSociety: (id, data) => apiClient.put(`/societies/${id}`, data),
  deleteSociety: (id, permanent = false) => apiClient.delete(`/societies/${id}?permanent=${permanent}`),

  // Home Endpoints
  getAllHomes: (params) => apiClient.get('/homes', { params }),
  getHomesBySociety: (societyId, params) => apiClient.get(`/societies/${societyId}/homes`, { params }),
  createHome: (societyId, data) => apiClient.post(`/societies/${societyId}/homes`, data),
  batchGenerateHomes: (societyId, config) => apiClient.post(`/societies/${societyId}/homes/batch`, config),
  getHomeById: (id) => apiClient.get(`/homes/${id}`),
  updateHome: (id, data) => apiClient.put(`/homes/${id}`, data),
  deleteHome: (id) => apiClient.delete(`/homes/${id}`),
};
