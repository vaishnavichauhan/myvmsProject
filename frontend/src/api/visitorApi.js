import apiClient from './apiClient';

/**
 * Visitor Management API Client
 */
export const visitorApi = {
  // Check permission for home & see resident names
  checkHomePermission: (homeId, params) =>
    apiClient.get(`/visitors/check-permission/${homeId}`, { params }),

  // Security creates visitor entry
  createVisitorEntry: (data) =>
    apiClient.post('/visitors/entry', data),

  // Security records entry (transitions to ENTERED)
  recordEntry: (id, data = {}) =>
    apiClient.patch(`/visitors/entries/${id}/record-entry`, data),

  // Security records exit (transitions to EXITED)
  recordExit: (id) =>
    apiClient.patch(`/visitors/entries/${id}/record-exit`),

  // Resident approves or rejects visitor
  respondToApproval: (id, decision) =>
    apiClient.patch(`/visitors/entries/${id}/approval`, { decision }),

  // Complete Visitor History
  getHistory: (params) =>
    apiClient.get('/visitors/history', { params }),

  // Single visitor entry details
  getEntryById: (id) =>
    apiClient.get(`/visitors/entries/${id}`),

  // Contact resident action (Intercom phone authorization)
  contactResident: (data) =>
    apiClient.post('/security/gate/contact-resident', data),

  // Search homes with residents and permission summary
  searchHomes: (q) =>
    apiClient.get('/security/gate/search-homes', { params: { q } }),

  // Quick lookup returning visitor by phone or gate pass number
  lookupVisitor: (query) =>
    apiClient.get('/visitors/lookup', { params: { query } }),
};
