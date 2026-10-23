import apiClient from './apiClient';

/**
 * Maintenance & Billing API Client
 */
export const maintenanceApi = {
  // Statistics
  getStats: (params) => apiClient.get('/maintenance/stats', { params }),

  // Maintenance Plans & Penalty Configurations
  getPlans: (params) => apiClient.get('/maintenance/plans', { params }),
  getPlanById: (id) => apiClient.get(`/maintenance/plans/${id}`),
  createPlan: (data) => apiClient.post('/maintenance/plans', data),
  updatePlan: (id, data) => apiClient.put(`/maintenance/plans/${id}`, data),
  deletePlan: (id) => apiClient.delete(`/maintenance/plans/${id}`),

  // Bills / Invoices
  getBills: (params) => apiClient.get('/maintenance/bills', { params }),
  getBillById: (id) => apiClient.get(`/maintenance/bills/${id}`),
  generateBatchBills: (data) => apiClient.post('/maintenance/bills/generate', data),
  createCustomBill: (data) => apiClient.post('/maintenance/bills/custom', data),
  selectResidentPlan: (data) => apiClient.post('/maintenance/bills/select-plan', data),

  // Payments & Receipts
  recordPayment: (data) => apiClient.post('/maintenance/payments', data),
  getPayments: (params) => apiClient.get('/maintenance/payments', { params }),
};

export default maintenanceApi;
