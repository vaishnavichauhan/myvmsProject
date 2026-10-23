import apiClient from './apiClient';

/**
 * Authentication and System API calls
 */
export const authApi = {
  /**
   * Submit login credentials (Phone Number or Email + Password)
   */
  login: (credentials) => apiClient.post('/auth/login', credentials),

  /**
   * Logout from current session
   */
  logout: () => apiClient.post('/auth/logout'),

  /**
   * Fetch current authenticated user's profile
   */
  getProfile: () => apiClient.get('/auth/me'),

  /**
   * Update profile information
   */
  updateProfile: (data) => apiClient.put('/auth/me', data),

  /**
   * Change user password securely
   */
  changePassword: (data) => apiClient.post('/auth/change-password', data),

  /**
   * Register a new user
   */
  register: (userData) => apiClient.post('/auth/register', userData),

  /**
   * Test Admin-only authorization
   */
  testAdminAccess: () => apiClient.get('/auth/admin-only'),

  /**
   * System health and MySQL status
   */
  getHealth: () => apiClient.get('/health'),

  /**
   * Fetch active users for instant login testing
   */
  getTestUsers: () => apiClient.get('/auth/test-users'),
};
