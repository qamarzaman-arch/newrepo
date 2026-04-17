import { useQuery } from '@tanstack/react-query';
import { menuService } from '../services/menuService';

export const useMenuCategories = () => {
  return useQuery({
    queryKey: ['menu-categories'],
    queryFn: async () => {
      const response = await menuService.getCategories();
      return response.data.data.categories;
    },
  });
};

export const useMenuItems = (params?: { categoryId?: string; search?: string; available?: boolean }) => {
  return useQuery({
    queryKey: ['menu-items', params],
    queryFn: async () => {
      const response = await menuService.getItems(params);
      return response.data.data.items;
    },
  });
};

export const useMenuItem = (id: string) => {
  return useQuery({
    queryKey: ['menu-item', id],
    queryFn: async () => {
      const response = await menuService.getItem(id);
      return response.data.data.item;
    },
    enabled: !!id,
  });
};
