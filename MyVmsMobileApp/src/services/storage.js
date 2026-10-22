import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  TOKEN: '@myvms_token',
  USER: '@myvms_user',
  SAVED_LOGIN_ID: '@myvms_saved_id',
};

export const storage = {
  async getToken() {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
    } catch {
      return null;
    }
  },

  async setToken(token) {
    try {
      if (token) {
        await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, token);
      } else {
        await AsyncStorage.removeItem(STORAGE_KEYS.TOKEN);
      }
    } catch (e) {
      console.error('Failed to set token:', e);
    }
  },

  async getUser() {
    try {
      const str = await AsyncStorage.getItem(STORAGE_KEYS.USER);
      return str ? JSON.parse(str) : null;
    } catch {
      return null;
    }
  },

  async setUser(user) {
    try {
      if (user) {
        await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      } else {
        await AsyncStorage.removeItem(STORAGE_KEYS.USER);
      }
    } catch (e) {
      console.error('Failed to set user:', e);
    }
  },

  async clearSession() {
    try {
      if (typeof AsyncStorage.removeMany === 'function') {
        await AsyncStorage.removeMany([STORAGE_KEYS.TOKEN, STORAGE_KEYS.USER]);
      } else if (typeof AsyncStorage.multiRemove === 'function') {
        await AsyncStorage.multiRemove([STORAGE_KEYS.TOKEN, STORAGE_KEYS.USER]);
      } else {
        await Promise.all([
          AsyncStorage.removeItem(STORAGE_KEYS.TOKEN),
          AsyncStorage.removeItem(STORAGE_KEYS.USER),
        ]);
      }
    } catch (e) {
      try {
        await AsyncStorage.removeItem(STORAGE_KEYS.TOKEN);
        await AsyncStorage.removeItem(STORAGE_KEYS.USER);
      } catch (err) {
        console.error('Failed to clear session:', err);
      }
    }
  },

  async getSavedLoginId() {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.SAVED_LOGIN_ID);
    } catch {
      return null;
    }
  },

  async setSavedLoginId(id) {
    try {
      if (id) {
        await AsyncStorage.setItem(STORAGE_KEYS.SAVED_LOGIN_ID, id);
      }
    } catch {}
  },
};
