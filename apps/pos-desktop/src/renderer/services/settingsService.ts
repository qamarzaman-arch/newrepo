import api from './api';

export interface CurrentRates {
  taxRate: number;
  serviceChargeRate: number;
  surcharges: Array<{
    id: string;
    name: string;
    type: string;
    value: number;
  }>;
}

export const settingsService = {
  async getCurrentRates(): Promise<CurrentRates> {
    const response = await api.get('/settings/current-rates');
    return response.data.data;
  },

  async getSettings(category?: string): Promise<{ settings: Array<{ key: string; value: string; category: string }> }> {
    const response = await api.get('/settings', {
      params: category ? { category } : undefined,
    });
    return response.data.data;
  },

  async updateSetting(key: string, value: string, category?: string): Promise<void> {
    await api.put(`/settings/${key}`, { value, category });
  },

  async bulkSyncSettings(settings: Array<{ key: string; value: string; category?: string }>): Promise<{ updated: number }> {
    const response = await api.post('/settings/bulk-sync', { settings });
    return response.data.data;
  },
};

export default settingsService;
