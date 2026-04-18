import api from './api';

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  address?: string;
  city?: string;
  loyaltyPoints: number;
  totalOrders: number;
  totalSpent: number;
  lastVisitAt?: string;
  isActive: boolean;
}

export const customerService = {
  getCustomers: (params?: { search?: string; page?: number; limit?: number }) =>
    api.get('/customers', { params }),
  searchCustomers: (query: string) => api.get('/customers/search', { params: { q: query } }),
  getCustomer: (id: string) => api.get(`/customers/${id}`),
  createCustomer: (data: Partial<Customer>) => api.post('/customers', data),
  updateCustomer: (id: string, data: Partial<Customer>) => api.put(`/customers/${id}`, data),
  deleteCustomer: (id: string) => api.delete(`/customers/${id}`),
  getCustomerOrders: (id: string, params?: { page?: number; limit?: number }) =>
    api.get(`/customers/${id}/orders`, { params }),
  updateLoyalty: (id: string, data: { points: number; reason: string; referenceId?: string }) =>
    api.post(`/customers/${id}/loyalty`, data),
  getLoyaltyTiers: () => api.get('/customers/loyalty/tiers'),
  createLoyaltyTier: (data: any) => api.post('/customers/loyalty/tiers', data),
  updateLoyaltyTier: (id: string, data: any) => api.put(`/customers/loyalty/tiers/${id}`, data),
  deleteLoyaltyTier: (id: string) => api.delete(`/customers/loyalty/tiers/${id}`),
  getPromotions: () => api.get('/customers/promotions'),
  createPromotion: (data: any) => api.post('/customers/promotions', data),
  updatePromotion: (id: string, data: any) => api.put(`/customers/promotions/${id}`, data),
  deletePromotion: (id: string) => api.delete(`/customers/promotions/${id}`),
  getSegments: () => api.get('/customers/segments'),
  createSegment: (data: any) => api.post('/customers/segments', data),
  deleteSegment: (id: string) => api.delete(`/customers/segments/${id}`),
};
