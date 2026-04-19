import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { staffService } from '../services/staffService';

export function useStaff() {
  const queryClient = useQueryClient();

  const { data: staff, isLoading, error, refetch } = useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      const response = await staffService.getStaff();
      return response.data.data?.users || [];
    },
  });

  const { data: shifts } = useQuery({
    queryKey: ['active-shifts'],
    queryFn: async () => {
      const response = await staffService.getActiveShifts();
      return response.data.data?.shifts || [];
    },
  });

  const createStaff = useMutation({
    mutationFn: staffService.createStaff,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    },
  });

  const updateStaff = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => staffService.updateStaff(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    },
  });

  const deleteStaff = useMutation({
    mutationFn: staffService.deleteStaff,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    },
  });

  const clockIn = useMutation({
    mutationFn: ({ userId, pin }: { userId: string; pin: string }) => staffService.clockIn(userId, pin),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-shifts'] });
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    },
  });

  const clockOut = useMutation({
    mutationFn: ({ userId, pin }: { userId: string; pin: string }) => staffService.clockOut(userId, pin),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-shifts'] });
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    },
  });

  return {
    staff,
    shifts,
    isLoading,
    error,
    refetch,
    createStaff,
    updateStaff,
    deleteStaff,
    clockIn,
    clockOut,
  };
}

export function useStaffPerformance(userId?: string, params?: { startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: ['staff-performance', userId, params],
    queryFn: async () => {
      const response = await staffService.getPerformance(userId, params);
      return response.data.data;
    },
    enabled: !!userId,
  });
}

export default useStaff;
