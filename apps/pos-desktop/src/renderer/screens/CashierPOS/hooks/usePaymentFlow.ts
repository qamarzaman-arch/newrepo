import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { orderService } from '../../../services/orderService';
import { validationService } from '../../../services/validationService';
import toast from 'react-hot-toast';

export interface PaymentState {
  orderId: string;
  method: 'CASH' | 'CARD' | 'ONLINE_TRANSFER';
  amount: number;
  cashReceived?: string;
  cardLastFour?: string;
  transferReference?: string;
  discountPercent?: string;
  discountAmount: number;
  managerPin: string;
  showDiscountInput: boolean;
}

export function usePaymentFlow() {
  const queryClient = useQueryClient();
  const [isValidatingPin, setIsValidatingPin] = useState(false);

  const processPayment = useMutation({
    mutationFn: async ({
      orderId,
      method,
      amount,
      cashReceived,
      cardLastFour,
      transferReference,
      discountAmount,
      discountPercent,
    }: {
      orderId: string;
      method: string;
      amount: number;
      cashReceived?: string;
      cardLastFour?: string;
      transferReference?: string;
      discountAmount?: number;
      discountPercent?: string;
    }) => {
      return orderService.processPayment(orderId, {
        method,
        amount,
        cashReceived: cashReceived ? parseFloat(cashReceived) : undefined,
        cardLastFour,
        transferReference,
        discountAmount,
        discountPercent: discountPercent ? parseFloat(discountPercent) : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashier-active-orders'] });
      toast.success('Payment processed successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Payment failed');
    },
  });

  const validateManagerPin = useCallback(async (pin: string): Promise<boolean> => {
    setIsValidatingPin(true);
    try {
      const isValid = await validationService.validateManagerPin(pin, 'payment');
      return isValid;
    } catch {
      return false;
    } finally {
      setIsValidatingPin(false);
    }
  }, []);

  const calculateDiscount = useCallback((subtotal: number, percent: string): number => {
    const percentNum = parseFloat(percent);
    if (isNaN(percentNum) || percentNum <= 0) return 0;
    return (subtotal * percentNum) / 100;
  }, []);

  return {
    processPayment: processPayment.mutateAsync,
    validateManagerPin,
    calculateDiscount,
    isProcessing: processPayment.isPending,
    isValidatingPin,
  };
}
