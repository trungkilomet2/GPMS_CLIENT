import axios from 'axios';
import BASE_URL from './apiconfig';
import { clearAuthStorage, getAuthItem } from './authStorage';

const axiosClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosClient.interceptors.request.use(
  (config) => {
    const token = getAuthItem('token');

    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

axiosClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error?.response?.status;
    const authHeader = String(error?.response?.headers?.['www-authenticate'] ?? '').toLowerCase();

    if (status === 401) {
      clearAuthStorage();
      window.dispatchEvent(new Event('auth-change'));

      if (window.location.pathname !== '/login') {
        const reason = authHeader.includes('expired') ? 'expired' : 'unauthorized';
        window.location.href = `/login?reason=${reason}`;
      }
    }

    return Promise.reject(error);
  }
);

export default axiosClient;
