import { useQuery } from '@tanstack/react-query';
import { orderService } from '../services/orderService';

export const useOrders = (params?: { status?: string; orderType?: string; page?: number; limit?: number }) => {
  return useQuery({
    queryKey: ['orders', params],
    queryFn: async () => {
      const response = await orderService.getOrders(params);
      return response.data.data;
    },
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
