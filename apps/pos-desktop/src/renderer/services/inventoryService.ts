import api from './api';

export interface InventoryItem {
  id: string;
  name: string;
  sku?: string;
  category?: string;
  unit: string;
  currentStock: number;
  minStock: number;
  maxStock?: number;
  costPerUnit: number;
  sellingPrice?: number;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  isActive: boolean;
  supplier?: any;
  warehouse?: any;
}

export const inventoryService = {
  getInventory: (params?: { category?: string; status?: string; lowStock?: boolean }) =>
    api.get('/inventory', { params }),
  getLowStock: () => api.get('/inventory/low-stock'),
  getItem: (id: string) => api.get(`/inventory/${id}`),
  createItem: (data: Partial<InventoryItem>) => api.post('/inventory', data),
  updateItem: (id: string, data: Partial<InventoryItem>) => api.put(`/inventory/${id}`, data),
  deleteItem: (id: string) => api.delete(`/inventory/${id}`),
  recordMovement: (id: string, data: { type: string; quantity: number; reference?: string; notes?: string }) =>
    api.post(`/inventory/${id}/movement`, data),
  recordAdjustment: (id: string, data: { adjustmentType: string; quantity: number; reason: string; notes?: string }) =>
    api.post(`/inventory/${id}/adjustment`, data),
  getMovements: (params?: { itemId?: string; page?: number; limit?: number }) =>
    api.get('/inventory/movements', { params }),
  getValuation: () => api.get('/inventory/reports/valuation'),
  getVendors: () => api.get('/vendors'),
  createVendor: (data: any) => api.post('/vendors', data),
  updateVendor: (id: string, data: any) => api.put(`/vendors/${id}`, data),
  deleteVendor: (id: string) => api.delete(`/vendors/${id}`),
  getRecipes: () => api.get('/recipes'),
  createRecipe: (data: any) => api.post('/recipes', data),
  updateRecipe: (id: string, data: any) => api.put(`/recipes/${id}`, data),
  deleteRecipe: (id: string) => api.delete(`/recipes/${id}`),
  getPurchaseOrders: (params?: { status?: string; vendorId?: string }) =>
    api.get('/purchase-orders', { params }),
  createPurchaseOrder: (data: any) => api.post('/purchase-orders', data),
  updatePurchaseOrder: (id: string, data: any) => api.put(`/purchase-orders/${id}`, data),
  receivePurchaseOrder: (id: string, data: any) => api.post(`/purchase-orders/${id}/receive`, data),
  deletePurchaseOrder: (id: string) => api.delete(`/purchase-orders/${id}`),
};
