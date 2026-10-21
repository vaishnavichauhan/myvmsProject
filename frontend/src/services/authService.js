import { authApi } from '../api/authApi';

/**
 * Authentication Business Logic Service
 * Keeps UI components clean from validation, formatting, and session storage logic.
 */
export const authService = {
  /**
   * Perform user authentication with Phone Number (or Email) and Password
   */
  async login(phoneOrEmail, password) {
    const trimmedIdentifier = phoneOrEmail ? String(phoneOrEmail).trim() : '';
    if (!trimmedIdentifier || !password) {
      throw new Error('Please enter both your Phone Number (or Email) and password.');
    }

    const payload = trimmedIdentifier.includes('@')
      ? { email: trimmedIdentifier, password }
      : { phone: trimmedIdentifier, password };

    const response = await authApi.login(payload);

    if (response.success && response.data?.token) {
      localStorage.setItem('myvms_token', response.data.token);
      localStorage.setItem('myvms_user', JSON.stringify(response.data.user));
    }

    return response.data;
  },

  /**
   * Change user password securely
   */
  async changePassword(currentPassword, newPassword) {
    if (!currentPassword || !newPassword) {
      throw new Error('Both current password and new password are required.');
    }
    if (newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters long.');
    }
    const response = await authApi.changePassword({ currentPassword, newPassword });
    return response;
  },

  /**
   * Clear session data on logout
   */
  async logout() {
    try {
      await authApi.logout();
    } catch {
      // ignore network errors on logout
    } finally {
      localStorage.removeItem('myvms_token');
      localStorage.removeItem('myvms_user');
    }
  },

  /**
   * Retrieve cached user session
   */
  getStoredSession() {
    const token = localStorage.getItem('myvms_token');
    const userStr = localStorage.getItem('myvms_user');

    if (!token || !userStr) {
      return { token: null, user: null };
    }

    try {
      const user = JSON.parse(userStr);
      return { token, user };
    } catch {
      localStorage.removeItem('myvms_token');
      localStorage.removeItem('myvms_user');
      return { token: null, user: null };
    }
  },

  /**
   * Verify token validity by calling /auth/me
   */
  async verifySession() {
    const { token } = this.getStoredSession();
    if (!token) return null;

    try {
      const response = await authApi.getProfile();
      if (response.success && response.data?.user) {
        localStorage.setItem('myvms_user', JSON.stringify(response.data.user));
        return response.data.user;
      }
      return null;
    } catch {
      this.logout();
      return null;
    }
  },

  /**
   * Fetch backend and database health diagnostics
   */
  async fetchSystemHealth() {
    try {
      const response = await authApi.getHealth();
      return response.data;
    } catch (error) {
      return {
        status: 'DOWN',
        database: { connected: false, message: error.message || 'Cannot reach API service' },
      };
    }
  },
};
