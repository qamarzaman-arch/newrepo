import { useQuery } from '@tanstack/react-query';
import { tableService } from '../services/tableService';

export const useTables = (filters?: any) => {
  return useQuery({
    queryKey: ['tables', filters],
    queryFn: async () => {
      const response = await tableService.getTables(filters);
      return response.data.data.tables;
    },
  });
};
