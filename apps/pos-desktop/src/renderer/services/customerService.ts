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
};
