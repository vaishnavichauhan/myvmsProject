import { create } from 'zustand';
import { authService } from '../services/authService';

/**
 * Global Authentication Store with Zustand
 */
export const useAuthStore = create((set, get) => {
  const initialSession = authService.getStoredSession();

  // Listen to cross-app auth expiration events
  if (typeof window !== 'undefined') {
    window.addEventListener('myvms:auth:expired', () => {
      set({ user: null, token: null, isAuthenticated: false });
    });
  }

  return {
    user: initialSession.user,
    token: initialSession.token,
    isAuthenticated: Boolean(initialSession.token && initialSession.user),
    isLoading: false,
    error: null,
    systemHealth: null,

    /**
     * Authenticate user with credentials
     */
    login: async (email, password) => {
      set({ isLoading: true, error: null });
      try {
        const data = await authService.login(email, password);
        set({
          user: data.user,
          token: data.token,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
        return { success: true };
      } catch (err) {
        const message = err.message || 'Login failed. Please check your credentials.';
        set({ error: message, isLoading: false });
        return { success: false, message };
      }
    },

    /**
     * Change password
     */
    changePassword: async (currentPassword, newPassword) => {
      set({ isLoading: true, error: null });
      try {
        const res = await authService.changePassword(currentPassword, newPassword);
        set({ isLoading: false });
        return { success: true, message: res.message || 'Password changed successfully.' };
      } catch (err) {
        const msg = err.message || 'Failed to change password.';
        set({ isLoading: false, error: msg });
        return { success: false, message: msg };
      }
    },

    /**
     * Sign out current user
     */
    logout: async () => {
      await authService.logout();
      set({ user: null, token: null, isAuthenticated: false, error: null });
    },

    /**
     * Verify and refresh user profile on app load
     */
    initializeAuth: async () => {
      const { token } = get();
      if (!token) return;

      try {
        const user = await authService.verifySession();
        if (user) {
          set({ user, isAuthenticated: true });
        } else {
          set({ user: null, token: null, isAuthenticated: false });
        }
      } catch {
        set({ user: null, token: null, isAuthenticated: false });
      }
    },

    /**
     * Check MySQL and backend system health status
     */
    checkHealth: async () => {
      const health = await authService.fetchSystemHealth();
      set({ systemHealth: health });
      return health;
    },

    /**
     * Clear active error message
     */
    clearError: () => set({ error: null }),
  };
});
