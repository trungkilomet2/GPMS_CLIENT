import axios from 'axios';
import BASE_URL from './apiconfig';
import { getAuthItem } from './authStorage';

const axiosClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosClient.interceptors.request.use(
  (config) => {
    const token = getAuthItem('token');
    const userId = getAuthItem('userId');

    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (userId) {
      config.headers = config.headers ?? {};
      if (!config.headers.UserId) config.headers.UserId = userId;
      if (!config.headers['X-User-Id']) config.headers['X-User-Id'] = userId;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

axiosClient.interceptors.response.use(
  (response) => response.data,
  (error) => Promise.reject(error)
);

export default axiosClient;
