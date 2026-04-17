import { useQuery } from '@tanstack/react-query';
import { customerService } from '../services/customerService';

export const useCustomers = (params?: { search?: string; page?: number; limit?: number }) => {
  return useQuery({
    queryKey: ['customers', params],
    queryFn: async () => {
      const response = await customerService.getCustomers(params);
      return response.data.data;
    },
  });
};

export const useCustomer = (id: string) => {
  return useQuery({
    queryKey: ['customer', id],
    queryFn: async () => {
      const response = await customerService.getCustomer(id);
      return response.data.data.customer;
    },
    enabled: !!id,
  });
};
