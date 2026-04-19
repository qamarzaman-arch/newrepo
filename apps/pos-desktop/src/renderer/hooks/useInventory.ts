import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryService } from '../services/inventoryService';

export function useInventory() {
  const queryClient = useQueryClient();

  const { data: inventory, isLoading, error, refetch } = useQuery({
    queryKey: ['inventory'],
    queryFn: async () => {
      const response = await inventoryService.getInventory();
      return response.data.data?.items || [];
    },
  });

  const { data: lowStock } = useQuery({
    queryKey: ['low-stock'],
    queryFn: async () => {
      const response = await inventoryService.getLowStock();
      return response.data.data?.items || [];
    },
  });

  const { data: vendors } = useQuery({
    queryKey: ['vendors'],
    queryFn: async () => {
      const response = await inventoryService.getVendors();
      return response.data.data?.vendors || [];
    },
  });

  const { data: purchaseOrders } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: async () => {
      const response = await inventoryService.getPurchaseOrders();
      return response.data.data?.orders || [];
    },
  });

  const { data: recipes } = useQuery({
    queryKey: ['recipes'],
    queryFn: async () => {
      const response = await inventoryService.getRecipes();
      return response.data.data?.recipes || [];
    },
  });

  const createItem = useMutation({
    mutationFn: inventoryService.createItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['low-stock'] });
    },
  });

  const updateItem = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => inventoryService.updateItem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });

  const deleteItem = useMutation({
    mutationFn: inventoryService.deleteItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });

  const adjustStock = useMutation({
    mutationFn: ({ id, quantity, reason }: { id: string; quantity: number; reason: string }) =>
      inventoryService.adjustStock(id, quantity, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['low-stock'] });
    },
  });

  return {
    inventory,
    lowStock,
    vendors,
    purchaseOrders,
    recipes,
    isLoading,
    error,
    refetch,
    createItem,
    updateItem,
    deleteItem,
    adjustStock,
  };
}

export function useInventoryStats() {
  return useQuery({
    queryKey: ['inventory-stats'],
    queryFn: async () => {
      const response = await inventoryService.getStats();
      return response.data.data;
    },
  });
}

export default useInventory;
