import { API_CONFIG } from '../config/api.config';
import { storage } from './storage';

/**
 * Mobile Native API Client
 * Automatically attaches Bearer token from AsyncStorage and handles network error states.
 */
class ApiClient {
  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
    this.authExpiryListeners = [];
  }

  onAuthExpired(callback) {
    this.authExpiryListeners.push(callback);
  }

  notifyAuthExpired() {
    this.authExpiryListeners.forEach((cb) => cb());
  }

  async request(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseURL}${endpoint}`;
    const token = await storage.getToken();

    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...options.headers,
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401) {
          await storage.clearSession();
          this.notifyAuthExpired();
        }
        const error = new Error(data.message || `Request failed with status ${response.status}`);
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        const timeoutErr = new Error('Network request timed out. Please check your connection.');
        timeoutErr.status = 408;
        throw timeoutErr;
      }
      throw err;
    }
  }

  get(endpoint, headers = {}) {
    return this.request(endpoint, { method: 'GET', headers });
  }

  post(endpoint, body, headers = {}) {
    return this.request(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
  }

  put(endpoint, body, headers = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });
  }

  delete(endpoint, headers = {}) {
    return this.request(endpoint, { method: 'DELETE', headers });
  }
}

export const apiClient = new ApiClient();
