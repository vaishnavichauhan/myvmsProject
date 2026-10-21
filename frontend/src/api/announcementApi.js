import apiClient from './apiClient';

/**
 * Society Announcements & Circulars API Client
 * Supports Festival, Emergency, Maintenance, Meeting, Important, and General announcements.
 */
export const announcementApi = {
  // Get all active announcements (All authenticated residents, staff & admins)
  getAnnouncements: (params) => apiClient.get('/announcements', { params }),

  // Get announcement by ID
  getAnnouncementById: (id) => apiClient.get(`/announcements/${id}`),

  // Check current user's announcement publishing permission (Admin or Committee Member)
  checkPermissions: () => apiClient.get('/committee/my-permissions'),

  // Create announcement (Admin or authorized Committee Members only)
  createAnnouncement: (data) => apiClient.post('/announcements', data),

  // Update announcement (Admin or original Author with permissions)
  updateAnnouncement: (id, data) => apiClient.put(`/announcements/${id}`, data),

  // Delete announcement (Admin or original Author with permissions)
  deleteAnnouncement: (id) => apiClient.delete(`/announcements/${id}`),
};

export default announcementApi;
