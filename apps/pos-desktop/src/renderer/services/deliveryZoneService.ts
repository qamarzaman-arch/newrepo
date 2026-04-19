import apiClient from './api';

export interface DeliveryZone {
  id: string;
  name: string;
  description?: string;
  baseFee: number;
  minimumOrder: number;
  freeDeliveryThreshold?: number;
  estimatedTimeMin: number;
  estimatedTimeMax: number;
  isActive: boolean;
  color?: string;
  coordinates?: { lat: number; lng: number }[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateZoneData {
  name: string;
  description?: string;
  baseFee: number;
  minimumOrder?: number;
  freeDeliveryThreshold?: number;
  estimatedTimeMin: number;
  estimatedTimeMax: number;
  isActive?: boolean;
  color?: string;
  coordinates?: { lat: number; lng: number }[];
}

export interface CalculateFeeData {
  latitude: number;
  longitude: number;
  orderAmount: number;
}

export const deliveryZoneService = {
  // Get all zones
  getZones: async () => {
    return apiClient.get('/delivery-zones');
  },

  // Get single zone
  getZone: async (id: string) => {
    return apiClient.get(`/delivery-zones/${id}`);
  },

  // Create zone
  createZone: async (data: CreateZoneData) => {
    return apiClient.post('/delivery-zones', data);
  },

  // Update zone
  updateZone: async (id: string, data: Partial<CreateZoneData>) => {
    return apiClient.put(`/delivery-zones/${id}`, data);
  },

  // Delete zone
  deleteZone: async (id: string) => {
    return apiClient.delete(`/delivery-zones/${id}`);
  },

  // Calculate delivery fee
  calculateFee: async (data: CalculateFeeData) => {
    return apiClient.post('/delivery-zones/calculate-fee', data);
  },
};

export default deliveryZoneService;
