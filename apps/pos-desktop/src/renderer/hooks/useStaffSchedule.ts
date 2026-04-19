import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { staffScheduleService } from '../services/staffScheduleService';

export function useStaffSchedule() {
  const queryClient = useQueryClient();

  const { data: schedules, isLoading, error, refetch } = useQuery({
    queryKey: ['staff-schedules'],
    queryFn: async () => {
      const response = await staffScheduleService.getSchedules({});
      return response.data.data?.schedules || [];
    },
  });

  const createSchedule = useMutation({
    mutationFn: staffScheduleService.createSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-schedules'] });
    },
  });

  const updateSchedule = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => staffScheduleService.updateSchedule(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-schedules'] });
    },
  });

  const deleteSchedule = useMutation({
    mutationFn: staffScheduleService.deleteSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-schedules'] });
    },
  });

  const requestSwap = useMutation({
    mutationFn: staffScheduleService.requestSwap,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-schedules'] });
    },
  });

  const respondToSwap = useMutation({
    mutationFn: ({ requestId, accept, reason }: { requestId: string; accept: boolean; reason?: string }) =>
      staffScheduleService.respondToSwap(requestId, accept, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-schedules'] });
    },
  });

  return {
    schedules,
    isLoading,
    error,
    refetch,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    requestSwap,
    respondToSwap,
  };
}

export function useMySchedule(date: string, range: 'day' | 'week' | 'month' = 'week') {
  return useQuery({
    queryKey: ['my-schedule', date, range],
    queryFn: async () => {
      const response = await staffScheduleService.getMySchedule(date, range);
      return response.data.data?.schedules || [];
    },
  });
}

export function useScheduleStats(params?: { startDate?: string; endDate?: string; userId?: string }) {
  return useQuery({
    queryKey: ['schedule-stats', params],
    queryFn: async () => {
      const response = await staffScheduleService.getStats(params || {});
      return response.data.data;
    },
  });
}

export default useStaffSchedule;
