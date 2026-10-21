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
  searchWorkers: (workerType = null, search = null, homeId = null) => {
    const params = {};
    if (workerType && workerType !== 'ALL') params.worker_type = workerType;
    if (search) params.search = search;
    if (homeId) params.homeId = homeId;
    const qs = new URLSearchParams(params).toString();
    return apiClient.get(`/workers/search${qs ? `?${qs}` : ''}`);
  },
  createWorker: (data) => apiClient.post('/workers', data),
  addExistingWorker: (data) => apiClient.post('/workers/assign', data),
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
  getCommitteeMembers: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiClient.get(`/committee${qs ? `?${qs}` : ''}`);
  },
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
  createGate: (data) => apiClient.post('/gates', data),
  updateGate: (id, data) => apiClient.put(`/gates/${id}`, data),
  deleteGate: (id) => apiClient.delete(`/gates/${id}`),
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
  updateSociety: (id, data) => apiClient.put(`/societies/${id}`, data),
  getAllHomes: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiClient.get(`/homes${qs ? `?${qs}` : ''}`);
  },
};
