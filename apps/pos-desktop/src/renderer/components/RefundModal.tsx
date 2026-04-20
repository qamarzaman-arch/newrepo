import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, Shield, DollarSign, Printer } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { orderService } from '../services/orderService';
import { validationService } from '../services/validationService';
import { getHardwareManager } from '../services/hardwareManager';
import { useSettingsStore } from '../stores/settingsStore';
import { useAuthStore } from '../stores/authStore';
import { useCurrencyFormatter } from '../hooks/useCurrency';
import toast from 'react-hot-toast';

interface RefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any;
  onSuccess?: () => void;
}

type RefundType = 'FULL' | 'PARTIAL';

const RefundModal: React.FC<RefundModalProps> = ({ isOpen, onClose, order, onSuccess }) => {
  const { formatCurrency } = useCurrencyFormatter();
  const { settings } = useSettingsStore();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  
  const [refundType, setRefundType] = useState<RefundType>('FULL');
  const [refundReason, setRefundReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [managerPin, setManagerPin] = useState('');
  const [showPinInput, setShowPinInput] = useState(false);
  const [managerName, setManagerName] = useState('');
  const [partialAmount, setPartialAmount] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [refundToOriginalMethod, setRefundToOriginalMethod] = useState(true);

  const refundReasons = [
    'Customer Request',
    'Wrong Order',
    'Quality Issue',
    'Service Issue',
    'Overcharge',
    'Duplicate Order',
    'Other',
  ];

  const refundMutation = useMutation({
    mutationFn: async (data: any) => {
      return await orderService.refundOrder(order.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashier-order-history'] });
      queryClient.invalidateQueries({ queryKey: ['cashier-active-orders'] });
      queryClient.invalidateQueries({ queryKey: ['cashier-daily-stats'] });
      toast.success('Refund processed successfully');
      
      // Print refund receipt
      if (settings.autoPrintReceipt) {
        printRefundReceipt();
      }
      
      onSuccess?.();
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to process refund');
    },
  });

  const printRefundReceipt = async () => {
    try {
      const hw = getHardwareManager();
      await hw.printReceipt({
        restaurantName: settings.restaurantName || 'POSLytic Restaurant',
        restaurantAddress: settings.address || '',
        restaurantPhone: settings.phone || '',
        orderNumber: `#${order.id.slice(-4)} - REFUND`,
        cashierName: user?.fullName || 'Cashier',
        items: order.items.map((item: any) => ({
          name: item.menuItem?.name || item.name || 'Unknown Item',
          quantity: item.quantity,
          price: item.price,
          notes: 'REFUNDED',
        })),
        subtotal: order.subtotal || 0,
        tax: order.tax || 0,
        taxRate: settings.taxRate || 8.5,
        discount: order.discount || 0,
        total: refundType === 'FULL' ? order.total : parseFloat(partialAmount) || 0,
        paymentMethod: 'REFUND',
        change: 0,
      });
    } catch (error) {
      console.error('Failed to print refund receipt:', error);
    }
  };

  const calculatePartialRefund = () => {
    if (selectedItems.size === 0) return 0;
    
    let total = 0;
    order.items?.forEach((item: any) => {
      if (selectedItems.has(item.id)) {
        total += item.price * item.quantity;
      }
    });
    
    // Add proportional tax
    const taxRate = settings.taxRate || 8.5;
    total += total * (taxRate / 100);
    
    return total;
  };

  const handleSubmitRefund = async () => {
    // Validation
    if (!refundReason && !customReason) {
      toast.error('Please select or enter a refund reason');
      return;
    }

    if (refundType === 'PARTIAL') {
      if (selectedItems.size === 0 && !partialAmount) {
        toast.error('Please select items or enter a partial amount');
        return;
      }
      
      const amount = partialAmount ? parseFloat(partialAmount) : calculatePartialRefund();
      if (amount <= 0 || amount > order.total) {
        toast.error('Invalid refund amount');
        return;
      }
    }

    // Manager approval required
    if (!showPinInput) {
      setShowPinInput(true);
      return;
    }

    if (!managerPin || managerPin.length < 4) {
      toast.error('Please enter manager PIN');
      return;
    }

    // Validate manager PIN
    const isValid = await validationService.validateManagerPin(
      managerPin,
      `refund-${order.id}`
    );

    if (!isValid) {
      toast.error('Invalid manager PIN');
      setManagerPin('');
      return;
    }

    // Store manager name for audit
    setManagerName(user?.fullName || 'Manager');

    // Process refund
    const refundAmount = refundType === 'FULL' 
      ? order.total 
      : (partialAmount ? parseFloat(partialAmount) : calculatePartialRefund());

    const refundData = {
      type: refundType,
      reason: customReason || refundReason,
      amount: refundAmount,
      items: refundType === 'PARTIAL' ? Array.from(selectedItems) : undefined,
      managerPin,
      approvedBy: user?.fullName || 'Manager',
      processedBy: user?.id,
      refundMethod: refundToOriginalMethod ? order.payments?.[0]?.method : 'CASH',
      originalPaymentMethod: order.payments?.[0]?.method,
    };

    refundMutation.mutate(refundData);
  };

  const toggleItemSelection = (itemId: string) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Process Refund</h2>
                <p className="text-sm text-gray-500">Order #{order.id.slice(-6)}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-gray-500" />
            </button>
          </div>

          {/* Warning */}
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-800 flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Warning:</strong> Refunds are permanent and require manager approval. 
                This action will update inventory and financial records.
              </span>
            </p>
          </div>

          {/* Order Summary */}
          <div className="mb-6 p-4 bg-gray-50 rounded-xl">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Order Total</p>
                <p className="font-bold text-gray-900 text-lg">
                  {formatCurrency(order.total)}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Payment Method</p>
                <p className="font-semibold text-gray-900">
                  {order.payments?.[0]?.method || 'CASH'}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Order Date</p>
                <p className="font-semibold text-gray-900">
                  {new Date(order.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Customer</p>
                <p className="font-semibold text-gray-900">
                  {order.customerName || 'Walk-in'}
                </p>
              </div>
            </div>
          </div>

          {/* Refund Type Selection */}
          <div className="mb-6">
            <label className="text-sm font-semibold text-gray-700 mb-3 block">
              Refund Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setRefundType('FULL')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  refundType === 'FULL'
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="font-bold text-gray-900">Full Refund</p>
                <p className="text-sm text-gray-600 mt-1">
                  {formatCurrency(order.total)}
                </p>
              </button>
              <button
                onClick={() => setRefundType('PARTIAL')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  refundType === 'PARTIAL'
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="font-bold text-gray-900">Partial Refund</p>
                <p className="text-sm text-gray-600 mt-1">Select items or amount</p>
              </button>
            </div>
          </div>

          {/* Partial Refund Options */}
          {refundType === 'PARTIAL' && (
            <div className="mb-6 space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Select Items to Refund
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {order.items?.map((item: any) => (
                    <button
                      key={item.id}
                      onClick={() => toggleItemSelection(item.id)}
                      className={`w-full p-3 rounded-xl border-2 transition-all text-left ${
                        selectedItems.has(item.id)
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-gray-900">
                            {item.quantity}x {item.menuItem?.name || item.name}
                          </p>
                        </div>
                        <span className="font-bold text-gray-900">
                          {formatCurrency(item.price * item.quantity)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
                {selectedItems.size > 0 && (
                  <div className="mt-2 p-3 bg-red-50 rounded-lg">
                    <p className="text-sm text-red-800">
                      Selected items total: <strong>{formatCurrency(calculatePartialRefund())}</strong>
                    </p>
                  </div>
                )}
              </div>

              <div className="text-center text-sm text-gray-500 font-semibold">OR</div>

              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Enter Custom Amount
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="number"
                    min="0"
                    max={order.total}
                    step="0.01"
                    value={partialAmount}
                    onChange={(e) => {
                      setPartialAmount(e.target.value);
                      setSelectedItems(new Set());
                    }}
                    placeholder="0.00"
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-red-500 focus:ring-2 focus:ring-red-500/20 text-lg font-bold"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Refund Reason */}
          <div className="mb-6">
            <label className="text-sm font-semibold text-gray-700 mb-3 block">
              Refund Reason
            </label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {refundReasons.map((reason) => (
                <button
                  key={reason}
                  onClick={() => {
                    setRefundReason(reason);
                    if (reason !== 'Other') setCustomReason('');
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    refundReason === reason
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>
            {(refundReason === 'Other' || customReason) && (
              <textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Please specify the reason..."
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl resize-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                rows={3}
              />
            )}
          </div>

          {/* Refund Method */}
          <div className="mb-6">
            <label className="text-sm font-semibold text-gray-700 mb-3 block">
              Refund Method
            </label>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="refundToOriginal"
                  checked={refundToOriginalMethod}
                  onChange={(e) => setRefundToOriginalMethod(e.target.checked)}
                  className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <label htmlFor="refundToOriginal" className="flex-1 cursor-pointer">
                  <p className="text-sm font-semibold text-blue-900">
                    Refund to original payment method
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    Original: {order.payments?.[0]?.method || 'CASH'}
                    {!refundToOriginalMethod && ' → Will refund as CASH'}
                  </p>
                </label>
              </div>
            </div>
          </div>

          {/* Manager PIN Input */}
          {showPinInput && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl"
            >
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-5 h-5 text-amber-600" />
                <p className="text-sm font-semibold text-amber-900">Manager Approval Required</p>
              </div>
              <input
                type="password"
                maxLength={6}
                value={managerPin}
                onChange={(e) => setManagerPin(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter Manager PIN"
                className="w-full px-4 py-3 border-2 border-amber-300 rounded-xl text-center text-2xl font-bold tracking-widest focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                autoFocus
              />
            </motion.div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={refundMutation.isPending}
              className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmitRefund}
              disabled={refundMutation.isPending}
              className="flex-1 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {refundMutation.isPending ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </>
              ) : showPinInput ? (
                <>
                  <Shield className="w-5 h-5" />
                  Confirm Refund
                </>
              ) : (
                <>
                  <AlertTriangle className="w-5 h-5" />
                  Request Approval
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default RefundModal;
