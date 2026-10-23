import { apiClient } from './apiClient';

/**
 * 1. Authentication API Service
 */
export const authApi = {
  login: (credentials) => apiClient.post('/auth/login', credentials),
  logout: () => apiClient.post('/auth/logout', {}),
  getProfile: () => apiClient.get('/auth/me'),
  updateProfile: (data) => apiClient.put('/auth/me', data),
  changePassword: (data) => apiClient.post('/auth/change-password', data),
  getSystemHealth: () => apiClient.get('/health'),
};

/**
 * 2. Resident Home Dashboard & Family Member API
 */
export const familyMemberApi = {
  getMyHomeDashboard: (homeId) => {
    const url = homeId ? `/family-members/dashboard?homeId=${homeId}` : '/family-members/dashboard';
    return apiClient.get(url);
  },
  getFamilyMembers: (homeId) => {
    const url = homeId ? `/family-members?homeId=${homeId}` : '/family-members';
    return apiClient.get(url);
  },
  getFamilyMemberById: (id) => apiClient.get(`/family-members/${id}`),
  createFamilyMember: (data) => apiClient.post('/family-members', data),
  updateFamilyMember: (id, data) => apiClient.put(`/family-members/${id}`, data),
  deleteFamilyMember: (id) => apiClient.delete(`/family-members/${id}`),
};

/**
 * 3. Visitor Management API
 */
export const visitorApi = {
  getHistory: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiClient.get(`/visitors/history${qs ? `?${qs}` : ''}`);
  },
  getEntryById: (id) => apiClient.get(`/visitors/entries/${id}`),
  createVisitorEntry: (data) => apiClient.post('/visitors/entry', data),
  recordEntry: (id, data = {}) => apiClient.request(`/visitors/entries/${id}/record-entry`, { method: 'PATCH', body: JSON.stringify(data) }),
  recordExit: (id) => apiClient.request(`/visitors/entries/${id}/record-exit`, { method: 'PATCH' }),
  respondToApproval: (id, decision) =>
    apiClient.request(`/visitors/entries/${id}/approval`, {
      method: 'PATCH',
      body: JSON.stringify({ decision }),
    }),
  checkHomePermission: (homeId, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiClient.get(`/visitors/check-permission/${homeId}${qs ? `?${qs}` : ''}`);
  },
  searchHomes: (q) => apiClient.get(`/security/gate/search-homes?q=${encodeURIComponent(q)}`),
};

/**
 * 4. Courier and Delivery API
 */
export const courierDeliveryApi = {
  getHistory: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiClient.get(`/courier-deliveries${qs ? `?${qs}` : ''}`);
  },
  getById: (id) => apiClient.get(`/courier-deliveries/${id}`),
  createEntry: (data) => apiClient.post('/courier-deliveries', data),
  respondToApproval: (id, decision, notes) =>
    apiClient.request(`/courier-deliveries/${id}/approval`, {
      method: 'PATCH',
      body: JSON.stringify({ decision, notes }),
    }),
  recordEntry: (id, data = {}) =>
    apiClient.request(`/courier-deliveries/${id}/record-entry`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  recordExit: (id) => apiClient.request(`/courier-deliveries/${id}/record-exit`, { method: 'PATCH' }),
};

/**
 * 5. Home Workers & Domestic Staff API
 */
export const workerApi = {
  getHomeWorkers: (homeId = null, extraParams = {}) => {
    const params = { ...extraParams };
    if (homeId) params.homeId = homeId;
    const qs = new URLSearchParams(params).toString();
    return apiClient.get(`/workers${qs ? `?${qs}` : ''}`);
  },
  searchWorkers: (workerType = null, search = null, homeId = null, societyId = null) => {
    const params = {};
    if (workerType && workerType !== 'ALL') params.worker_type = workerType;
    if (search) params.search = search;
    if (homeId) params.homeId = homeId;
    if (societyId && societyId !== 'ALL') params.societyId = societyId;
    const qs = new URLSearchParams(params).toString();
    return apiClient.get(`/workers/search${qs ? `?${qs}` : ''}`);
  },
  createWorker: (data) => apiClient.post('/workers', data),
  createNewWorker: (data) => apiClient.post('/workers', data),
  addExistingWorker: (data) => apiClient.post('/workers/assign', data),
  updateAssignment: (assignmentId, data) => apiClient.put(`/workers/assignments/${assignmentId}`, data),
  removeWorker: (assignmentId) => apiClient.delete(`/workers/assignments/${assignmentId}`),
  deleteWorker: (id) => apiClient.delete(`/workers/${id}`),
};

/**
 * 6. Permissions API
 */
export const permissionApi = {
  getHomePermissions: (homeId = null) => {
    const qs = homeId ? `?homeId=${homeId}` : '';
    return apiClient.get(`/permissions${qs}`);
  },
  updateHomePermissions: (homeId, data) => apiClient.put(`/permissions/home/${homeId}`, data),
};

/**
 * 7. Announcements API
 */
export const announcementApi = {
  getAnnouncements: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiClient.get(`/announcements${qs ? `?${qs}` : ''}`);
  },
  getAnnouncementById: (id) => apiClient.get(`/announcements/${id}`),
  createAnnouncement: (data) => apiClient.post('/announcements', data),
  deleteAnnouncement: (id) => apiClient.delete(`/announcements/${id}`),
};

/**
 * 8. Committee API
 */
export const committeeApi = {
  getCommittees: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiClient.get(`/committee/committees${qs ? `?${qs}` : ''}`);
  },
  createCommittee: (data) => apiClient.post('/committee/committees', data),
  updateCommittee: (id, data) => apiClient.put(`/committee/committees/${id}`, data),
  deleteCommittee: (id) => apiClient.delete(`/committee/committees/${id}`),
  getHomeOccupants: (homeId) => apiClient.get(`/committee/home-occupants/${homeId}`),
  getCommitteeMembers: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiClient.get(`/committee${qs ? `?${qs}` : ''}`);
  },
  getCommitteeMemberById: (id) => apiClient.get(`/committee/${id}`),
  createCommitteeMember: (data) => apiClient.post('/committee', data),
  updateCommitteeMember: (id, data) => apiClient.put(`/committee/${id}`, data),
  deleteCommitteeMember: (id) => apiClient.delete(`/committee/${id}`),
  checkMyPermissions: () => apiClient.get('/committee/my-permissions'),
};

/**
 * 9. Society Gates API
 */
export const gateApi = {
  getGates: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiClient.get(`/gates${qs ? `?${qs}` : ''}`);
  },
  getGateById: (id) => apiClient.get(`/gates/${id}`),
  getMyAssignedGate: () => apiClient.get('/gates/assigned/me'),
  createGate: (data) => apiClient.post('/gates', data),
  updateGate: (id, data) => apiClient.put(`/gates/${id}`, data),
  deleteGate: (id) => apiClient.delete(`/gates/${id}`),
  assignSecurityStaff: (data) => apiClient.post('/gates/assign', data),
  unassignSecurityStaff: (assignmentId) => apiClient.delete(`/gates/assignments/${assignmentId}`),
};

/**
 * 10. Society Admin API
 */
export const adminApi = {
  getAdminDashboard: () => apiClient.get('/admin/dashboard'),
};

/**
 * 11. Society Profile & Settings API
 */
export const societyApi = {
  getSocieties: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiClient.get(`/societies${qs ? `?${qs}` : ''}`);
  },
  getSocietyById: (id) => apiClient.get(`/societies/${id}`),
  createSociety: (data) => apiClient.post('/societies', data),
  updateSociety: (id, data) => apiClient.put(`/societies/${id}`, data),
  deleteSociety: (id, permanent = false) => apiClient.delete(`/societies/${id}?permanent=${permanent}`),
  getAllHomes: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiClient.get(`/homes${qs ? `?${qs}` : ''}`);
  },
  getHomesBySociety: (societyId, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiClient.get(`/societies/${societyId}/homes${qs ? `?${qs}` : ''}`);
  },
  createHome: (societyId, data) => apiClient.post(`/societies/${societyId}/homes`, data),
  batchGenerateHomes: (societyId, config) => apiClient.post(`/societies/${societyId}/homes/batch`, config),
  deleteHome: (id) => apiClient.delete(`/homes/${id}`),
  updateHome: (id, data) => apiClient.put(`/homes/${id}`, data),
};

/**
 * 12. Resident Management API
 */
export const residentApi = {
  getResidents: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiClient.get(`/residents${qs ? `?${qs}` : ''}`);
  },
  getResidentById: (id) => apiClient.get(`/residents/${id}`),
  createResident: (data) => apiClient.post('/residents', data),
  updateResident: (id, data) => apiClient.put(`/residents/${id}`, data),
  updateResidentStatus: (id, status) =>
    apiClient.request(`/residents/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  resetResidentPassword: (id, newPassword) =>
    apiClient.post(`/residents/${id}/reset-password`, { newPassword }),
  deleteResident: (id) => apiClient.delete(`/residents/${id}`),
};

/**
 * 13. Security Staff & Watchman API
 */
export const securityApi = {
  getSecurityStaff: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiClient.get(`/security${qs ? `?${qs}` : ''}`);
  },
  getSecurityStaffById: (id) => apiClient.get(`/security/${id}`),
  createSecurityStaff: (data) => apiClient.post('/security', data),
  updateSecurityStaff: (id, data) => apiClient.put(`/security/${id}`, data),
  updateSecurityStaffStatus: (id, status) =>
    apiClient.request(`/security/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  resetSecurityStaffPassword: (id, newPassword) =>
    apiClient.post(`/security/${id}/reset-password`, { newPassword }),
  deleteSecurityStaff: (id) => apiClient.delete(`/security/${id}`),

  // Security Gate Operations
  getGateDashboard: (societyId) => {
    const qs = societyId && societyId !== 'ALL' ? `?societyId=${societyId}` : '';
    return apiClient.get(`/security/gate/dashboard${qs}`);
  },
  searchHomes: (query, societyId) => {
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    if (societyId && societyId !== 'ALL') params.append('societyId', societyId);
    const qs = params.toString();
    return apiClient.get(`/security/gate/search-homes${qs ? `?${qs}` : ''}`);
  },
  recordGateEntry: (data) => apiClient.post('/security/gate/entry', data),
  recordGateExit: (id) => apiClient.patch(`/security/gate/exit/${id}`),
  contactResident: (data) => apiClient.post('/security/gate/contact-resident', data),
};

