import api from './api';

export interface Table {
  id: string;
  number: string;
  capacity: number;
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'NEEDS_CLEANING' | 'OUT_OF_ORDER';
  location?: string;
  shape?: string;
  posX?: number;
  posY?: number;
  width?: number;
  height?: number;
  currentOrderId?: string;
  isActive: boolean;
}

export const tableService = {
  getTables: (params?: { status?: string; location?: string }) =>
    api.get('/tables', { params }),
  getLayout: () => api.get('/tables/layout'),
  getTable: (id: string) => api.get(`/tables/${id}`),
  createTable: (data: Partial<Table>) => api.post('/tables', data),
  updateTable: (id: string, data: Partial<Table>) => api.put(`/tables/${id}`, data),
  updateStatus: (id: string, status: Table['status']) =>
    api.patch(`/tables/${id}/status`, { status }),
  updateLayout: (tables: Array<{ id: string; posX: number; posY: number; width?: number; height?: number }>) =>
    api.put('/tables/layout', { tables }),
  deleteTable: (id: string) => api.delete(`/tables/${id}`),
  mergeTables: (data: { tableIds: string[]; mergedTableNumber?: string }) =>
    api.post('/tables/merge', data),
  splitTable: (data: { tableId: string; splitInto: Array<{ number: string; capacity: number }> }) =>
    api.post('/tables/split', data),
};
