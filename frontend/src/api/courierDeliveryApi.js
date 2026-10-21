import apiClient from './apiClient';

/**
 * Courier and Delivery Management API Client
 */
export const courierDeliveryApi = {
  // Check permission for home & see resident names
  checkPermission: (homeId, params) =>
    apiClient.get(`/courier-deliveries/check-permission/${homeId}`, { params }),

  // Security creates courier / delivery entry
  createEntry: (data) =>
    apiClient.post('/courier-deliveries', data),

  // Security contacts resident when permission is NO ([ Call Resident ])
  callResident: (data) =>
    apiClient.post('/courier-deliveries/call-resident', data),

  // Resident approves or rejects
  respondToApproval: (id, decision, notes) =>
    apiClient.patch(`/courier-deliveries/${id}/approval`, { decision, notes }),

  // Security records entry (transitions to ENTERED)
  recordEntry: (id, data = {}) =>
    apiClient.patch(`/courier-deliveries/${id}/record-entry`, data),

  // Security records exit (transitions to EXITED)
  recordExit: (id) =>
    apiClient.patch(`/courier-deliveries/${id}/record-exit`),

  // Complete Courier & Delivery History
  getHistory: (params) =>
    apiClient.get('/courier-deliveries', { params }),

  // Single record details
  getById: (id) =>
    apiClient.get(`/courier-deliveries/${id}`),

  // Search homes with residents and permissions
  searchHomes: (q) =>
    apiClient.get('/security/gate/search-homes', { params: { q } }),
};
