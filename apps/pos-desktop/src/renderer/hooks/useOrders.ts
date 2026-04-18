import { useQuery } from '@tanstack/react-query';
import { orderService } from '../services/orderService';

export const useOrders = (params?: { status?: string; orderType?: string; page?: number; limit?: number }) => {
  return useQuery({
    queryKey: ['orders', params],
    queryFn: async () => {
      const response = await orderService.getOrders(params);
      return response.data.data;
    },
    refetchInterval: 10000, // Refetch every 10 seconds to catch new orders
  });
};

export const useOrder = (id: string) => {
  return useQuery({
    queryKey: ['order', id],
    queryFn: async () => {
      const response = await orderService.getOrder(id);
      return response.data.data.order;
    },
    enabled: !!id,
  });
};

export const useAllOrders = () => {
  return useQuery({
    queryKey: ['orders', 'all'],
    queryFn: async () => {
      const response = await orderService.getOrders({ limit: 100 });
      return response.data.data;
    },
    refetchInterval: 10000,
  });
};
