import apiClient from './apiClient';

/**
 * Super Admin Platform Management API Client
 */
export const superAdminApi = {
  // Platform Overview KPIs and Analytics
  getOverview: () => apiClient.get('/super-admin/overview'),

  // Societies CRUD & Actions
  getSocieties: (params) => apiClient.get('/super-admin/societies', { params }),
  getSocietyById: (id) => apiClient.get(`/super-admin/societies/${id}`),
  createSociety: (data) => apiClient.post('/super-admin/societies', data),
  updateSociety: (id, data) => apiClient.put(`/super-admin/societies/${id}`, data),
  suspendSociety: (id, reason) => apiClient.post(`/super-admin/societies/${id}/suspend`, { reason }),
  activateSociety: (id) => apiClient.post(`/super-admin/societies/${id}/activate`),

  // Society Admins Management
  getSocietyAdmins: (params) => apiClient.get('/super-admin/admins', { params }),
  resetAdminPassword: (userId, newPassword) => apiClient.post(`/super-admin/admins/${userId}/reset-password`, { newPassword }),

  // Subscription Plans CRUD
  getPlans: () => apiClient.get('/super-admin/plans'),
  getPlanById: (id) => apiClient.get(`/super-admin/plans/${id}`),
  createPlan: (data) => apiClient.post('/super-admin/plans', data),
  updatePlan: (id, data) => apiClient.put(`/super-admin/plans/${id}`, data),
  deletePlan: (id) => apiClient.delete(`/super-admin/plans/${id}`),

  // Platform Features
  getPlatformFeatures: () => apiClient.get('/super-admin/features'),

  // Society Subscriptions
  getSubscriptions: (params) => apiClient.get('/super-admin/subscriptions', { params }),
  assignSubscription: (data) => apiClient.post('/super-admin/subscriptions/assign', data),

  // Resource Usage & Limits
  getSocietyUsage: (societyId) => apiClient.get(`/super-admin/societies/${societyId}/usage`),
  setLimitOverride: (societyId, data) => apiClient.post(`/super-admin/societies/${societyId}/limits/override`, data),
  setFeatureOverride: (societyId, data) => apiClient.post(`/super-admin/societies/${societyId}/features/override`, data),

  // Subscription Billing & Invoices
  getInvoices: (params) => apiClient.get('/super-admin/billing/invoices', { params }),
  recordPayment: (invoiceId, data) => apiClient.post(`/super-admin/billing/invoices/${invoiceId}/payments`, data),
  approvePayment: (invoiceId) => apiClient.post(`/super-admin/billing/invoices/${invoiceId}/approve`),
  autoGenerateInvoices: () => apiClient.post('/super-admin/billing/auto-generate'),

  // Audit Logs
  getAuditLogs: (params) => apiClient.get('/super-admin/audit-logs', { params }),
};

export default superAdminApi;
