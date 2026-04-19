import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderModificationService } from '../services/orderModificationService';

export function useOrderModification(orderId?: string) {
  const queryClient = useQueryClient();

  const { data: modifications, isLoading, error, refetch } = useQuery({
    queryKey: ['order-modifications', orderId],
    queryFn: async () => {
      if (!orderId) return [];
      const response = await orderModificationService.getOrderModifications(orderId);
      return response.data.data?.modifications || [];
    },
    enabled: !!orderId,
  });

  const logModification = useMutation({
    mutationFn: orderModificationService.logModification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-modifications', orderId] });
    },
  });

  const rollbackModification = useMutation({
    mutationFn: ({ id, managerPin }: { id: string; managerPin: string }) =>
      orderModificationService.rollbackModification(id, managerPin),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-modifications', orderId] });
    },
  });

  return {
    modifications,
    isLoading,
    error,
    refetch,
    logModification,
    rollbackModification,
  };
}

export function useAllModifications(params?: {
  orderId?: string;
  modifiedBy?: string;
  fieldName?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: ['modifications', params],
    queryFn: async () => {
      const response = await orderModificationService.getModifications(params || {});
      return response.data.data?.modifications || [];
    },
  });
}

export default useOrderModification;
