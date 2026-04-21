import api from './api';

export const settingsService = {
  getAll: () => api.get('/settings'),
  getByKey: (key: string) => api.get(`/settings/${key}`),
  update: (key: string, value: any) => api.put(`/settings/${key}`, { value }),
  bulkUpdate: (settings: Record<string, any>) => api.put('/settings', { settings }),
};

export const settingService = settingsService;
