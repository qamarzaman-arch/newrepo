import api from './api';

export interface Staff {
  id: string;
  username: string;
  fullName: string;
  role: string;
  email?: string;
  phone?: string;
  avatar?: string;
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
  getActiveShifts: () => api.get('/staff/active-shifts'),
  clockInOut: (userId: string, action: 'clock-in' | 'clock-out') =>
    api.post(`/staff/${userId}/shift`, { action }),
  getShifts: (userId: string) => api.get(`/staff/${userId}/shifts`),
};