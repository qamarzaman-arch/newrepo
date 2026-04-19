import apiClient from './api';

export interface OrderModification {
  id: string;
  orderId: string;
  fieldName: string;
  oldValue?: string;
  newValue?: string;
  reason?: string;
  modifiedById: string;
  modifiedAt: string;
  modifiedBy?: {
    id: string;
    fullName: string;
    username: string;
  };
  order?: {
    id: string;
    orderNumber: string;
  };
}

export interface CreateModificationData {
  orderId: string;
  fieldName: string;
  oldValue?: string;
  newValue?: string;
  reason?: string;
}

export const orderModificationService = {
  // Get modification history for an order
  getOrderModifications: async (orderId: string, limit = 50, offset = 0) => {
    return apiClient.get(`/order-modifications/order/${orderId}?limit=${limit}&offset=${offset}`);
  },

  // Get all modifications with filtering
  getModifications: async (params: { orderId?: string; modifiedBy?: string; fieldName?: string; limit?: number; offset?: number } = {}) => {
    const queryParams = new URLSearchParams();
    if (params.orderId) queryParams.append('orderId', params.orderId);
    if (params.modifiedBy) queryParams.append('modifiedBy', params.modifiedBy);
    if (params.fieldName) queryParams.append('fieldName', params.fieldName);
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.offset) queryParams.append('offset', params.offset.toString());
    return apiClient.get(`/order-modifications?${queryParams.toString()}`);
  },

  // Log a modification
  logModification: async (data: CreateModificationData) => {
    return apiClient.post('/order-modifications', data);
  },

  // Rollback a modification (manager only)
  rollbackModification: async (id: string, managerPin: string) => {
    return apiClient.post(`/order-modifications/${id}/rollback`, { managerPin });
  },
};

export default orderModificationService;
