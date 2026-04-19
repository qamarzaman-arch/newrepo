import apiClient from './api';

export interface UpdateLocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
}

export interface AssignRiderData {
  deliveryId: string;
  riderId: string;
  estimatedPickupTime?: string;
  estimatedDeliveryTime?: string;
  notes?: string;
}

export interface UpdateDeliveryStatusData {
  status: 'ASSIGNED' | 'PICKED_UP' | 'IN_TRANSIT' | 'ARRIVED' | 'DELIVERED' | 'FAILED';
  notes?: string;
  proofImage?: string;
  recipientName?: string;
  recipientSignature?: string;
}

export const riderService = {
  // Get all riders
  getRiders: async (params?: { status?: string; isAvailable?: boolean }) => {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.isAvailable !== undefined) queryParams.append('isAvailable', String(params.isAvailable));
    return apiClient.get(`/riders?${queryParams.toString()}`);
  },

  // Get single rider
  getRider: async (id: string) => {
    return apiClient.get(`/riders/${id}`);
  },

  // Update rider location (rider only)
  updateLocation: async (data: UpdateLocationData) => {
    return apiClient.post('/riders/location', data);
  },

  // Get rider location (for tracking)
  getLocation: async (id: string) => {
    return apiClient.get(`/riders/${id}/location`);
  },

  // Assign rider to delivery
  assignRider: async (data: AssignRiderData) => {
    return apiClient.post('/riders/assign', data);
  },

  // Update delivery status
  updateDeliveryStatus: async (deliveryId: string, data: UpdateDeliveryStatusData) => {
    return apiClient.post(`/riders/delivery/${deliveryId}/status`, data);
  },

  // Get available riders near location
  getAvailableRiders: async (params?: {
    latitude?: number;
    longitude?: number;
    radius?: number;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.latitude) queryParams.append('latitude', String(params.latitude));
    if (params?.longitude) queryParams.append('longitude', String(params.longitude));
    if (params?.radius) queryParams.append('radius', String(params.radius));
    return apiClient.get(`/riders/available/list?${queryParams.toString()}`);
  },
};

export default riderService;
