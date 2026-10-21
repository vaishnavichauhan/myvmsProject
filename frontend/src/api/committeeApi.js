import apiClient from './apiClient';

/**
 * Society Committee Management & Announcements API
 */
export const committeeApi = {
  // Committees (e.g. Festival Committee, Electricity Management Committee)
  getCommittees: (params) => apiClient.get('/committee/committees', { params }),
  createCommittee: (data) => apiClient.post('/committee/committees', data),
  updateCommittee: (id, data) => apiClient.put(`/committee/committees/${id}`, data),
  deleteCommittee: (id) => apiClient.delete(`/committee/committees/${id}`),

  // Home Occupants (Residents living in a selected home)
  getHomeOccupants: (homeId) => apiClient.get(`/committee/home-occupants/${homeId}`),

  // Committee members
  getCommitteeMembers: (params) => apiClient.get('/committee', { params }),
  getCommitteeMemberById: (id) => apiClient.get(`/committee/${id}`),
  createCommitteeMember: (data) => apiClient.post('/committee', data),
  updateCommitteeMember: (id, data) => apiClient.put(`/committee/${id}`, data),
  deleteCommitteeMember: (id) => apiClient.delete(`/committee/${id}`),

  // Announcement permissions
  checkMyPermissions: () => apiClient.get('/committee/my-permissions'),

  // Announcements
  getAnnouncements: (params) => apiClient.get('/announcements', { params }),
  getAnnouncementById: (id) => apiClient.get(`/announcements/${id}`),
  createAnnouncement: (data) => apiClient.post('/announcements', data),
  updateAnnouncement: (id, data) => apiClient.put(`/announcements/${id}`, data),
  deleteAnnouncement: (id) => apiClient.delete(`/announcements/${id}`),
};

export default committeeApi;
