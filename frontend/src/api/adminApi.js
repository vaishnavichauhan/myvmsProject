import apiClient from './apiClient';

/**
 * Society Admin API Service
 */
export const adminApi = {
  // Fetch comprehensive admin dashboard metrics, occupancy, and activity feed
  getAdminDashboard: () => apiClient.get('/admin/dashboard'),

  // Subscription Billing & Invoices
  getSubscriptionBilling: () => apiClient.get('/admin/subscription'),
  paySubscriptionInvoice: (invoiceId, data) => apiClient.post(`/admin/subscription/invoices/${invoiceId}/pay`, data),
};

export default adminApi;
