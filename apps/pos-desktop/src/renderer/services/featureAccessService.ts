import api from './api';

export interface FeatureAccess {
  id: string;
  feature: string;
  role: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FeatureAccessResponse {
  success: boolean;
  data: {
    features: Array<{ id: string; name: string; description: string }>;
    roles: string[];
    access: FeatureAccess[];
  };
}

export interface UpdateFeatureAccessRequest {
  feature: string;
  role: string;
  enabled: boolean;
}

export interface BulkUpdateRequest {
  feature: string;
  enabled: boolean;
}

export const featureAccessService = {
  /**
   * Get all feature access settings
   */
  async getFeatureAccess(): Promise<FeatureAccessResponse> {
    const response = await api.get('/feature-access');
    return response.data;
  },

  /**
   * Update a single feature access setting
   */
  async updateFeatureAccess(data: UpdateFeatureAccessRequest): Promise<{ success: boolean; data: FeatureAccess }> {
    const response = await api.patch('/feature-access', data);
    return response.data;
  },

  /**
   * Bulk update feature access for all roles
   */
  async bulkUpdateFeatureAccess(data: BulkUpdateRequest): Promise<{ success: boolean; data: FeatureAccess[] }> {
    const response = await api.patch('/feature-access/bulk', data);
    return response.data;
  },

  /**
   * Reset feature access to defaults
   */
  async resetFeatureAccess(): Promise<{ success: boolean; message: string }> {
    const response = await api.post('/feature-access/reset');
    return response.data;
  },

  /**
   * Get all feature access settings for the logged-in user's role
   */
  async getMyFeatureAccess(): Promise<{ success: boolean; data: { role: string; features: Array<{ feature: string; enabled: boolean }> } }> {
    const response = await api.get('/feature-access/my-access');
    return response.data;
  },

  /**
   * Check if user has access to a specific feature
   */
  async checkFeatureAccess(feature: string): Promise<{ success: boolean; data: { enabled: boolean } }> {
    const response = await api.get(`/feature-access/check/${feature}`);
    return response.data;
  },
};
