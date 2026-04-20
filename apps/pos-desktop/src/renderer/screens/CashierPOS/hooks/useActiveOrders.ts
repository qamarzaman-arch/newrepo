import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderService } from '../../../services/orderService';
import toast from 'react-hot-toast';

export interface ActiveOrder {
  id: string;
  orderNumber: string;
  status: string;
  orderType: string;
  customerName?: string;
  tableNumber?: string;
  totalAmount: number;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
    notes?: string;
  }>;
  createdAt: string;
}

export function useActiveOrders() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['cashier-active-orders'],
    queryFn: async () => {
      const response = await orderService.getOrders({
        status: 'PENDING,PREPARING,READY',
        limit: 100,
      });
      return response.data.data.orders as ActiveOrder[];
    },
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  const completeOrder = useMutation({
    mutationFn: (orderId: string) =>
      orderService.updateStatus(orderId, 'COMPLETED'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashier-active-orders'] });
      toast.success('Order marked as completed');
    },
    onError: () => toast.error('Failed to complete order'),
  });

  const cancelOrder = useMutation({
    mutationFn: ({ orderId, reason }: { orderId: string; reason: string }) =>
      orderService.cancelOrder(orderId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashier-active-orders'] });
      toast.success('Order cancelled');
    },
    onError: () => toast.error('Failed to cancel order'),
  });

  const modifyOrder = useMutation({
    mutationFn: ({
      orderId,
      items,
      notes,
    }: {
      orderId: string;
      items: any[];
      notes: string;
    }) => orderService.modifyOrder(orderId, { items, notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashier-active-orders'] });
      toast.success('Order modified successfully');
    },
    onError: () => toast.error('Failed to modify order'),
  });

  return {
    orders: data || [],
    isLoading,
    error,
    completeOrder: completeOrder.mutate,
    cancelOrder: cancelOrder.mutate,
    modifyOrder: modifyOrder.mutate,
    refresh: () => queryClient.invalidateQueries({ queryKey: ['cashier-active-orders'] }),
  };
}
