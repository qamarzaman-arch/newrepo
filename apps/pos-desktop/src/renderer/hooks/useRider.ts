import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { riderService } from '../services/riderService';

export function useRiders() {
  const queryClient = useQueryClient();

  const { data: riders, isLoading, error, refetch } = useQuery({
    queryKey: ['riders'],
    queryFn: async () => {
      const response = await riderService.getRiders();
      return response.data.data?.riders || [];
    },
  });

  const { data: availableRiders } = useQuery({
    queryKey: ['available-riders'],
    queryFn: async () => {
      const response = await riderService.getAvailableRiders();
      return response.data.data?.riders || [];
    },
  });

  const assignRider = useMutation({
    mutationFn: riderService.assignRider,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['riders'] });
      queryClient.invalidateQueries({ queryKey: ['available-riders'] });
    },
  });

  const updateDeliveryStatus = useMutation({
    mutationFn: ({ deliveryId, data }: { deliveryId: string; data: any }) =>
      riderService.updateDeliveryStatus(deliveryId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['riders'] });
    },
  });

  return {
    riders,
    availableRiders,
    isLoading,
    error,
    refetch,
    assignRider,
    updateDeliveryStatus,
  };
}

export function useRider(id: string) {
  const queryClient = useQueryClient();

  const { data: rider, isLoading, error, refetch } = useQuery({
    queryKey: ['rider', id],
    queryFn: async () => {
      const response = await riderService.getRider(id);
      return response.data.data?.rider;
    },
    enabled: !!id,
  });

  const { data: location } = useQuery({
    queryKey: ['rider-location', id],
    queryFn: async () => {
      const response = await riderService.getLocation(id);
      return response.data.data;
    },
    enabled: !!id,
    refetchInterval: 30000, // Update every 30 seconds
  });

  return {
    rider,
    location,
    isLoading,
    error,
    refetch,
  };
}

export function useRiderLocationUpdater() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: riderService.updateLocation,
    onSuccess: () => {
      // Don't invalidate queries on location update to avoid excessive re-renders
    },
  });
}

export default useRiders;
