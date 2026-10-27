import apiClient from './apiClient';

/**
 * Society Financial Accounts API Client
 * Endpoints for financial overview, month-wise payment & pending breakdown, and ledger.
 */
export const accountApi = {
  // Financial Overview across Maintenance, Special Charges, Amenities, Subscriptions
  getOverview: (params) => apiClient.get('/accounts/overview', { params }),

  // Month-wise total payments collected and pending amounts
  getMonthly: (params) => apiClient.get('/accounts/monthly', { params }),

  // Unified financial transaction ledger
  getTransactions: (params) => apiClient.get('/accounts/transactions', { params }),
};

export default accountApi;
