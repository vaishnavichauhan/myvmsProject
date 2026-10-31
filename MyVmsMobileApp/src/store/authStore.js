import { create } from 'zustand';
import { authApi, gateApi } from '../services/apiServices';
import { storage } from '../services/storage';
import { apiClient } from '../services/apiClient';

export const useAuthStore = create((set, get) => {
  // Listen for automatic token expiration from apiClient
  apiClient.onAuthExpired(() => {
    set({ user: null, token: null, isAuthenticated: false });
  });

  return {
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,

    /**
     * Initialize Auth on App Launch from AsyncStorage
     */
    initializeAuth: async () => {
      set({ isLoading: true });
      try {
        const token = await storage.getToken();
        const cachedUser = await storage.getUser();

        if (token && cachedUser) {
          if (cachedUser?.role === 'SUPER_ADMIN' || cachedUser?.role === 'super_admin') {
            await storage.clearSession();
            set({ token: null, user: null, isAuthenticated: false, isLoading: false });
            return;
          }
          set({ token, user: cachedUser, isAuthenticated: true, isLoading: false });
          // Asynchronously verify profile with backend
          try {
            const res = await authApi.getProfile();
            if (res.success && res.data?.user) {
              if (res.data.user.role === 'SUPER_ADMIN' || res.data.user.role === 'super_admin') {
                await storage.clearSession();
                set({ token: null, user: null, isAuthenticated: false, isLoading: false });
                return;
              }
              await storage.setUser(res.data.user);
              set({ user: res.data.user });
            }
          } catch (e) {
            // If token is invalid (401), apiClient clears storage and notifies
          }
        } else {
          set({ token: null, user: null, isAuthenticated: false, isLoading: false });
        }
      } catch {
        set({ token: null, user: null, isAuthenticated: false, isLoading: false });
      }
    },

    /**
     * Authenticate with Phone/Email and Password
     */
    login: async (phoneOrEmail, password) => {
      set({ isLoading: true, error: null });
      const trimmed = phoneOrEmail ? String(phoneOrEmail).trim() : '';

      if (!trimmed || !password) {
        const msg = 'Please enter both your Phone Number (or Email) and password.';
        set({ isLoading: false, error: msg });
        return { success: false, message: msg };
      }

      const payload = trimmed.includes('@')
        ? { email: trimmed, password }
        : { phone: trimmed, password };

      try {
        const response = await authApi.login(payload);
        if (response.success && response.data?.token) {
          const { token, user } = response.data;

          // Restrict Super Admin from Mobile App
          if (user?.role === 'SUPER_ADMIN' || user?.role === 'super_admin') {
            const msg = 'Super Admin access is only available on the Web Dashboard. Mobile app login is not permitted for Super Admin.';
            set({ isLoading: false, error: msg });
            return { success: false, message: msg };
          }

          await storage.setToken(token);
          await storage.setUser(user);
          await storage.setSavedLoginId(trimmed);

          set({
            token,
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          return { success: true };
        } else {
          const msg = response.message || 'Login failed.';
          set({ isLoading: false, error: msg });
          return { success: false, message: msg };
        }
      } catch (err) {
        const msg = err.message || 'Login failed. Please check your credentials.';
        set({ isLoading: false, error: msg });
        return { success: false, message: msg };
      }
    },

    /**
     * Logout and wipe session (if security officer, auto checkout/leave gate)
     */
    logout: async () => {
      const { user } = get();
      if (user?.role === 'SECURITY' || user?.role === 'security') {
        try {
          await gateApi.selfCheckOut();
        } catch (e) {
          console.warn('Auto gate checkout failed on logout:', e?.message);
        }
      }
      try {
        await authApi.logout();
      } catch {}
      await storage.clearSession();
      set({ user: null, token: null, isAuthenticated: false, error: null });
    },

    /**
     * Change user password
     */
    changePassword: async (currentPassword, newPassword) => {
      set({ isLoading: true, error: null });
      try {
        const res = await authApi.changePassword({ currentPassword, newPassword });
        set({ isLoading: false });
        return { success: true, message: res.message || 'Password updated successfully.' };
      } catch (err) {
        const msg = err.message || 'Failed to change password.';
        set({ isLoading: false, error: msg });
        return { success: false, message: msg };
      }
    },

    clearError: () => set({ error: null }),
  };
});
