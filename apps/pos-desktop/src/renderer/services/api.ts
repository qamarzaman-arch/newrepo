import axios from 'axios';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';

const getConfiguredApiBaseUrl = () => {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  if (!env?.VITE_API_URL) {
    console.warn('VITE_API_URL not set, using fallback localhost URL');
  }
  return env?.VITE_API_URL || 'http://localhost:3001/api/v1';
};

export const API_BASE_URL = getConfiguredApiBaseUrl();

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      switch (error.response.status) {
        case 401:
          // Token expired or invalid - logout and redirect to login
          useAuthStore.getState().logout();
          toast.error('Session expired. Please login again.');
          window.location.hash = '#/login';
          break;
        case 403:
          toast.error('You do not have permission to perform this action');
          break;
        case 404:
          toast.error('Resource not found');
          break;
        case 409:
          toast.error(error.response.data?.error?.message || 'Conflict occurred');
          break;
        case 500:
          toast.error('Server error. Please try again later.');
          break;
        default:
          toast.error(error.response.data?.error?.message || 'An error occurred');
      }
    } else if (error.request) {
      toast.error('Network error. Please check your connection.');
    } else {
      toast.error('An unexpected error occurred');
    }
    return Promise.reject(error);
  }
);

export default api;
