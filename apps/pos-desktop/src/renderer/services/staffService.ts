import api from './api';

export interface Staff {
  id: string;
  username: string;
  fullName: string;
  role: string;
  email?: string;
  phone?: string;
  avatar?: string;
  pin?: string;
  password?: string;
  isActive: boolean;
}

export interface Shift {
  id: string;
  userId: string;
  shiftNumber: string;
  status: 'OPEN' | 'CLOSED';
  clockedInAt: Date;
  clockedOutAt?: Date;
}

export const staffService = {
  getStaff: () => api.get('/staff'),
  getStaffMember: (id: string) => api.get(`/staff/${id}`),
  createStaff: (data: Partial<Staff>) => api.post('/staff', data),
  updateStaff: (id: string, data: Partial<Staff>) => api.put(`/staff/${id}`, data),
  deleteStaff: (id: string) => api.delete(`/staff/${id}`),
  getActiveShifts: () => api.get('/staff/active-shifts'),
  clockInOut: (userId: string, action: 'clock-in' | 'clock-out') =>
    api.post(`/staff/${userId}/shift`, { action }),
  clockIn: (userId: string, _pin?: string) =>
    api.post(`/staff/${userId}/shift`, { action: 'clock-in' }),
  clockOut: (userId: string, _pin?: string) =>
    api.post(`/staff/${userId}/shift`, { action: 'clock-out' }),
  getShifts: (userId: string) => api.get(`/staff/${userId}/shifts`),
  getPerformance: (userId?: string, params?: { startDate?: string; endDate?: string }) =>
    api.get(userId ? `/staff/${userId}/performance` : '/staff/performance', { params }),
  createShift: (data: { userId: string; shiftDate: string; startTime: string }) =>
    api.post('/staff/shifts', data),
  updateShift: (shiftId: string, data: { endTime: string }) =>
    api.patch(`/staff/shifts/${shiftId}`, data),
};