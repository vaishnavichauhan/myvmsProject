import axios from 'axios';

/**
 * Centralized Axios API Client
 */
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request Interceptor: Attach JWT Token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('myvms_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Format error or handle auth expiry
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const errorResponse = error.response?.data || {
      success: false,
      message: error.message || 'Network communication error',
    };

    // If 401 Unauthorized, notify/clear session
    if (error.response?.status === 401) {
      localStorage.removeItem('myvms_token');
      localStorage.removeItem('myvms_user');
      window.dispatchEvent(new CustomEvent('myvms:auth:expired'));
    }

    return Promise.reject(errorResponse);
  }
);

export default apiClient;
