import api from './api';

export interface MenuCategory {
  id: string;
  name: string;
  description?: string;
  displayOrder: number;
  isActive: boolean;
  image?: string;
}

export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  cost: number;
  sku?: string;
  barcode?: string;
  isActive: boolean;
  isAvailable: boolean;
  prepTimeMinutes: number;
  taxRate: number;
  displayOrder: number;
  image?: string;
  category?: MenuCategory;
  tags?: Array<{ id: string; tag: string }>;
  modifiers?: Array<any>;
}

export const menuService = {
  getCategories: () => api.get('/menu/categories'),
  getItems: (params?: { categoryId?: string; search?: string; available?: boolean }) =>
    api.get('/menu/items', { params }),
  getItem: (id: string) => api.get(`/menu/items/${id}`),
  createItem: (data: Partial<MenuItem>) => api.post('/menu/items', data),
  updateItem: (id: string, data: Partial<MenuItem>) => api.put(`/menu/items/${id}`, data),
  deleteItem: (id: string) => api.delete(`/menu/items/${id}`),
  createCategory: (data: Partial<MenuCategory>) => api.post('/menu/categories', data),
  updateCategory: (id: string, data: Partial<MenuCategory>) => api.put(`/menu/categories/${id}`, data),
  deleteCategory: (id: string) => api.delete(`/menu/categories/${id}`),
};
