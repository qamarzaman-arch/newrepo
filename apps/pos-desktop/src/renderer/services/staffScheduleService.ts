import apiClient from './api';

export interface CreateScheduleData {
  userId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  breakDuration?: number;
  role?: string;
  notes?: string;
  isRecurring?: boolean;
  recurrencePattern?: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
  recurrenceEndDate?: string;
}

export interface SwapRequestData {
  scheduleId: string;
  targetUserId: string;
  reason: string;
}

export const staffScheduleService = {
  // Get schedules
  getSchedules: async (params: {
    startDate?: string;
    endDate?: string;
    userId?: string;
    role?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.userId) queryParams.append('userId', params.userId);
    if (params.role) queryParams.append('role', params.role);
    return apiClient.get(`/staff-schedules?${queryParams.toString()}`);
  },

  // Get single schedule
  getSchedule: async (id: string) => {
    return apiClient.get(`/staff-schedules/${id}`);
  },

  // Create schedule
  createSchedule: async (data: CreateScheduleData) => {
    return apiClient.post('/staff-schedules', data);
  },

  // Update schedule
  updateSchedule: async (id: string, data: Partial<CreateScheduleData>) => {
    return apiClient.put(`/staff-schedules/${id}`, data);
  },

  // Delete schedule
  deleteSchedule: async (id: string) => {
    return apiClient.delete(`/staff-schedules/${id}`);
  },

  // Check conflicts
  checkConflicts: async (params: {
    userId: string;
    date: string;
    startTime: string;
    endTime: string;
    excludeScheduleId?: string;
  }) => {
    const queryParams = new URLSearchParams();
    queryParams.append('userId', params.userId);
    queryParams.append('date', params.date);
    queryParams.append('startTime', params.startTime);
    queryParams.append('endTime', params.endTime);
    if (params.excludeScheduleId) queryParams.append('excludeScheduleId', params.excludeScheduleId);
    return apiClient.get(`/staff-schedules/conflicts/check?${queryParams.toString()}`);
  },

  // Request shift swap
  requestSwap: async (data: SwapRequestData) => {
    return apiClient.post('/staff-schedules/swap-request', data);
  },

  // Respond to swap request
  respondToSwap: async (requestId: string, accept: boolean, reason?: string) => {
    return apiClient.post(`/staff-schedules/swap-request/${requestId}/respond`, {
      accept,
      reason,
    });
  },

  // Get my schedule
  getMySchedule: async (date: string, range: 'day' | 'week' | 'month' = 'week') => {
    return apiClient.get(`/staff-schedules/my-schedule/${date}?range=${range}`);
  },

  // Get schedule stats
  getStats: async (params: {
    startDate?: string;
    endDate?: string;
    userId?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.userId) queryParams.append('userId', params.userId);
    return apiClient.get(`/staff-schedules/stats/overview?${queryParams.toString()}`);
  },
};

export default staffScheduleService;
