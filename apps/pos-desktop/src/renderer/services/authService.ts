import api from './api';

export const authService = {
  login: (credentials: { username: string; password: string } | { pin: string }) =>
    api.post('/auth/login', credentials),
  register: (data: { username: string; password: string; fullName: string; role: string }) =>
    api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  verifyToken: () => api.get('/auth/verify'),
};
