import apiClient from './apiClient';

/**
 * Society Admin API Service
 */
export const adminApi = {
  // Fetch comprehensive admin dashboard metrics, occupancy, and activity feed
  getAdminDashboard: () => apiClient.get('/admin/dashboard'),
};

export default adminApi;
