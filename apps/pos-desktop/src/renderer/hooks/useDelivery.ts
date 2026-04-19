import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { deliveryService } from '../services/deliveryService';

export function useDeliveries() {
  const queryClient = useQueryClient();

  const { data: deliveries, isLoading, error, refetch } = useQuery({
    queryKey: ['deliveries'],
    queryFn: async () => {
      const response = await deliveryService.getDeliveries();
      return response.data.data?.deliveries || [];
    },
  });

  const { data: activeDeliveries } = useQuery({
    queryKey: ['active-deliveries'],
    queryFn: async () => {
      const response = await deliveryService.getActiveDeliveries();
      return response.data.data?.deliveries || [];
    },
  });

  const createDelivery = useMutation({
    mutationFn: deliveryService.createDelivery,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['active-deliveries'] });
    },
  });

  const updateDelivery = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => deliveryService.updateDelivery(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['active-deliveries'] });
    },
  });

  const cancelDelivery = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      deliveryService.cancelDelivery(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['active-deliveries'] });
    },
  });

  return {
    deliveries,
    activeDeliveries,
    isLoading,
    error,
    refetch,
    createDelivery,
    updateDelivery,
    cancelDelivery,
  };
}

export function useDelivery(id: string) {
  return useQuery({
    queryKey: ['delivery', id],
    queryFn: async () => {
      const response = await deliveryService.getDelivery(id);
      return response.data.data?.delivery;
    },
    enabled: !!id,
  });
}

export function useDeliveryZones() {
  const queryClient = useQueryClient();

  const { data: zones, isLoading, error, refetch } = useQuery({
    queryKey: ['delivery-zones'],
    queryFn: async () => {
      const response = await deliveryService.getZones();
      return response.data.data?.zones || [];
    },
  });

  return {
    zones,
    isLoading,
    error,
    refetch,
  };
}

export default useDeliveries;
