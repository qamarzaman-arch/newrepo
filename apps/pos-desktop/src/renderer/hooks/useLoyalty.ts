import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { loyaltyService } from '../services/loyaltyService';

export function useLoyalty(customerId?: string) {
  const queryClient = useQueryClient();

  const { data: transactions, isLoading, error, refetch } = useQuery({
    queryKey: ['loyalty-transactions', customerId],
    queryFn: async () => {
      if (!customerId) return [];
      const response = await loyaltyService.getTransactions(customerId);
      return response.data.data?.transactions || [];
    },
    enabled: !!customerId,
  });

  const updatePoints = useMutation({
    mutationFn: ({ customerId, points, reason, referenceId }: {
      customerId: string;
      points: number;
      reason: string;
      referenceId?: string;
    }) => loyaltyService.updatePoints(customerId, { points, reason, referenceId }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-transactions', variables.customerId] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });

  const awardOrderPoints = useMutation({
    mutationFn: ({ customerId, orderAmount, orderId }: {
      customerId: string;
      orderAmount: number;
      orderId: string;
    }) => loyaltyService.awardOrderPoints(customerId, orderAmount, orderId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-transactions', variables.customerId] });
    },
  });

  const redeemPoints = useMutation({
    mutationFn: ({ customerId, points, orderId }: {
      customerId: string;
      points: number;
      orderId: string;
    }) => loyaltyService.redeemPoints(customerId, points, orderId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-transactions', variables.customerId] });
    },
  });

  return {
    transactions,
    isLoading,
    error,
    refetch,
    updatePoints,
    awardOrderPoints,
    redeemPoints,
    calculatePoints: loyaltyService.calculatePoints,
    calculateRedemptionValue: loyaltyService.calculateRedemptionValue,
  };
}

export default useLoyalty;
