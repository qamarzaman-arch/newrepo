import api from './api';

export interface Delivery {
  id: string;
  orderId: string;
  status: 'PENDING' | 'ASSIGNED' | 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';
  riderName?: string;
  riderPhone?: string;
  customerName: string;
  customerPhone: string;
  address: string;
  estimatedTime?: string;
  actualTime?: string;
  createdAt: string;
}

export interface CreateDeliveryData {
  orderId: string;
  customerName: string;
  customerPhone: string;
  address: string;
  notes?: string;
  riderId?: string;
}

export const deliveryService = {
  getDeliveries: (params?: { status?: string; page?: number; limit?: number }) =>
    api.get('/delivery', { params }),
  getActiveDeliveries: () => api.get('/delivery/active'),
  getDelivery: (id: string) => api.get(`/delivery/${id}`),
  createDelivery: (data: CreateDeliveryData) => api.post('/delivery', data),
  updateDelivery: (id: string, data: Partial<CreateDeliveryData>) => api.put(`/delivery/${id}`, data),
  updateStatus: (id: string, status: string) => api.patch(`/delivery/${id}/status`, { status }),
  assignRider: (id: string, riderId: string) => api.patch(`/delivery/${id}/assign-rider`, { riderId }),
  cancelDelivery: (id: string, reason: string) => api.patch(`/delivery/${id}/cancel`, { reason }),
  getZones: () => api.get('/delivery-zones'),
  createZone: (data: any) => api.post('/delivery-zones', data),
  updateZone: (id: string, data: any) => api.put(`/delivery-zones/${id}`, data),
  deleteZone: (id: string) => api.delete(`/delivery-zones/${id}`),
};