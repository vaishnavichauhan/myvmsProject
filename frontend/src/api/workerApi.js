import apiClient from './apiClient';

/**
 * Worker API Client
 * Wraps all REST endpoints for Home Worker Management
 */
export const workerApi = {
  /**
   * Get all workers assigned to caller's home (or all society workers if ADMIN)
   */
  getHomeWorkers: (homeId = null, extraParams = {}) => {
    const params = { ...extraParams };
    if (homeId) params.homeId = homeId;
    return apiClient.get('/workers', { params });
  },

  /**
   * Search existing workers in society (for searchable dropdowns)
   */
  searchWorkers: (workerType = null, search = null, homeId = null, societyId = null) => {
    const params = {};
    if (workerType && workerType !== 'ALL') params.worker_type = workerType;
    if (search) params.search = search;
    if (homeId) params.homeId = homeId;
    if (societyId && societyId !== 'ALL') params.societyId = societyId;
    return apiClient.get('/workers/search', { params });
  },

  /**
   * Select an existing worker and link to caller's home
   */
  addExistingWorker: (data) => {
    return apiClient.post('/workers/assign', data);
  },

  /**
   * Create a new worker (or reuse if phone exists)
   */
  createNewWorker: (data) => {
    return apiClient.post('/workers', data);
  },
  createWorker: (data) => {
    return apiClient.post('/workers', data);
  },

  /**
   * Update worker relationship (timings, status)
   */
  updateAssignment: (assignmentId, data) => {
    return apiClient.put(`/workers/assignments/${assignmentId}`, data);
  },

  /**
   * Remove worker from caller's home
   */
  removeWorker: (assignmentId) => {
    return apiClient.delete(`/workers/assignments/${assignmentId}`);
  },

  /**
   * Delete worker master record from society (Admin action)
   */
  deleteWorker: (workerId) => {
    return apiClient.delete(`/workers/${workerId}`);
  },
};
