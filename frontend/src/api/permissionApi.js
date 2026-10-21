import apiClient from './apiClient';

/**
 * Resident Permission API Client (Home-wise)
 */
export const permissionApi = {
  /**
   * Get home-wise permissions (all homes for Admin, caller's home for residents)
   */
  getHomePermissions: (homeId = null) => {
    const params = homeId ? { homeId } : {};
    return apiClient.get('/permissions', { params });
  },

  /**
   * Update permissions for a home
   * Supported by Owner, Tenant, Family Member of that home, or Admin.
   */
  updateHomePermissions: (homeId, data) => {
    return apiClient.put(`/permissions/home/${homeId}`, data);
  },

  /**
   * Legacy alias for updateHomePermissions
   */
  updatePermissions: (targetId, data) => {
    return apiClient.put(`/permissions/${targetId}`, data);
  },

  /**
   * Check if caller's home has a specific permission
   */
  checkPermission: (type) => {
    return apiClient.get(`/permissions/check/${type}`);
  },

  /**
   * Test backend enforcement actions
   */
  testCourierAction: () => {
    return apiClient.post('/permissions/actions/approve-courier');
  },

  testDeliveryAction: () => {
    return apiClient.post('/permissions/actions/approve-delivery');
  },

  testVisitorAction: () => {
    return apiClient.post('/permissions/actions/approve-visitor');
  },

  testWorkerAction: () => {
    return apiClient.post('/permissions/actions/manage-worker');
  },
};
