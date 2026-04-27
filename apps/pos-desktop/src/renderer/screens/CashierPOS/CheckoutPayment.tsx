import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import {
  CreditCard,
  Banknote,
  Split,
  ChevronLeft,
  Printer,
  Check,
  Gift,
  Heart,
  Shield,
  Calculator,
} from 'lucide-react';
import CashCountingHelper from '../../components/CashCountingHelper';
import { useOrderStore } from '../../stores/orderStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useAuthStore } from '../../stores/authStore';
import { formatCurrency } from '../../utils/currency';
import { orderService } from '../../services/orderService';
import api from '../../services/api';
import { getHardwareManager } from '../../services/hardwareManager';
import { validationService } from '../../services/validationService';
import { getOfflineQueueManager } from '../../services/offlineQueueManager';
import { getPaymentValidationService } from '../../services/paymentValidationService';
import toast from 'react-hot-toast';
import SplitBilling from './SplitBilling';

interface CheckoutPaymentProps {
  onBack: () => void;
  onComplete: (orderId?: string, change?: number) => void;
}

interface SplitPayment {
  cash: number;
  card: number;
}

const CheckoutPayment: React.FC<CheckoutPaymentProps> = ({ onBack, onComplete }) => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'SPLIT'>('CASH');
  const [cashReceived, setCashReceived] = useState('');
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [showDiscountPinModal, setShowDiscountPinModal] = useState(false);
  const [discountPin, setDiscountPin] = useState('');
  const [pendingDiscountPercent, setPendingDiscountPercent] = useState(0);
  const DISCOUNT_PIN_THRESHOLD = 20; // PIN required for discounts >= 20%
  const [showTipModal, setShowTipModal] = useState(false);
  const [tipPercent, setTipPercent] = useState(0);
  const [customTip, setCustomTip] = useState('');
  const [cardPaymentConfirmed, setCardPaymentConfirmed] = useState(false);
  const [showCardConfirmationModal, setShowCardConfirmationModal] = useState(false);
  const [cardLastFour, setCardLastFour] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSubmitTime, setLastSubmitTime] = useState(0);
  const [splitPayment, setSplitPayment] = useState<SplitPayment>({ cash: 0, card: 0 });
  const [showCashCounter, setShowCashCounter] = useState(false);
  const [showSplitBillingModal, setShowSplitBillingModal] = useState(false);
  const { currentOrder, getSubtotal, getTotal, getDiscount, getTip, applyDiscount, setTip, setCompletedOrderId, setProcessing, fetchBackendRates, backendRates } = useOrderStore();
  const { settings } = useSettingsStore();

  // Fetch backend rates on mount if not loaded
  useEffect(() => {
    if (!backendRates) {
      fetchBackendRates();
    }
  }, [backendRates, fetchBackendRates]);

  // Guard for empty orders - redirect back if no items
  console.log('[CheckoutPayment] Rendering with', currentOrder.items?.length || 0, 'items');
  if (!currentOrder.items || currentOrder.items.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading order...</p>
          <button
            onClick={onBack}
            className="mt-4 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Warn if rates not loaded - don't allow checkout without proper rates
  if (!backendRates) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading tax rates...</p>
          <p className="text-sm text-gray-400 mt-2">Please wait while we load the latest rates</p>
        </div>
      </div>
    );
  }

  const subtotal = getSubtotal();
  const discount = getDiscount();
  const afterDiscount = subtotal - discount;
  const taxRate = settings.taxRate || backendRates.taxRate || 0;
  const tax = afterDiscount * (taxRate / 100);
  const serviceChargeRate = settings.serviceCharge || backendRates.serviceChargeRate || 0;
  const serviceCharge = afterDiscount * (serviceChargeRate / 100);
  const total = getTotal();
  const tip = getTip();
  const currencyCode = settings.currency || 'USD';

  const cashReceivedNum = parseFloat(cashReceived) || 0;
  const cashPortion = paymentMethod === 'SPLIT' ? splitPayment.cash : total;
  const change = paymentMethod === 'SPLIT' ? cashReceivedNum - cashPortion : cashReceivedNum - total;

  const handleKeypadPress = (value: string) => {
    if (value === 'CLEAR') {
      setCashReceived('');
    } else if (value === 'BACKSPACE') {
      setCashReceived((prev) => prev.slice(0, -1));
    } else {
      // Prevent multiple decimal points
      if (value === '.' && cashReceived.includes('.')) return;
      setCashReceived((prev) => prev + value);
    }
  };

  // Handle physical keyboard input
  const handleKeyboardInput = useCallback((e: KeyboardEvent) => {
    // Only handle when in CASH or SPLIT mode
    if (paymentMethod !== 'CASH' && paymentMethod !== 'SPLIT') return;
    
    const key = e.key;
    
    // Handle numbers
    if (/^[0-9]$/.test(key)) {
      setCashReceived((prev) => prev + key);
    } else if (key === '.') {
      // Prevent multiple decimal points
      setCashReceived((prev) => prev.includes('.') ? prev : prev + '.');
    } else if (key === 'Backspace') {
      setCashReceived((prev) => prev.slice(0, -1));
    } else if (key === 'Escape') {
      setCashReceived('');
    } else if (key === 'Enter') {
      // Auto-fill exact amount on Enter if no amount entered
      if (!cashReceived) {
        setCashReceived(total.toFixed(2));
      }
    }
  }, [paymentMethod, cashReceived, total]);

  // Subscribe to keyboard events
  useEffect(() => {
    window.addEventListener('keydown', handleKeyboardInput);
    return () => window.removeEventListener('keydown', handleKeyboardInput);
  }, [handleKeyboardInput]);

  const handleQuickAmount = (type: 'exact' | 'next10' | 'next20') => {
    if (type === 'exact') {
      setCashReceived(total.toFixed(2));
    } else if (type === 'next10') {
      const nextTen = Math.ceil(total / 10) * 10;
      setCashReceived(nextTen.toFixed(2));
    } else if (type === 'next20') {
      const nextTwenty = Math.ceil(total / 20) * 20;
      setCashReceived(nextTwenty.toFixed(2));
    }
  };

  const handlePlaceOrder = async () => {
    // Prevent duplicate submissions
    const now = Date.now();
    if (isSubmitting) {
      toast.error('Order is already being processed. Please wait.');
      return;
    }

    // Prevent rapid clicking (debounce)
    if (now - lastSubmitTime < 2000) {
      toast.error('Please wait before submitting again.');
      return;
    }

    setLastSubmitTime(now);

    // Empty order validation
    if (currentOrder.items.length === 0) {
      toast.error('Cannot place an empty order. Please add items to the order.');
      return;
    }

    // Validation based on payment method
    if (paymentMethod === 'CASH' && cashReceivedNum < total) {
      toast.error('Cash received is less than total amount');
      return;
    }

    if (paymentMethod === 'CARD' && !cardPaymentConfirmed) {
      toast.error('Please confirm card payment before proceeding');
      return;
    }

    if (paymentMethod === 'SPLIT') {
      const paymentService = getPaymentValidationService();
      const validation = paymentService.validateSplitPayment(
        [
          { method: 'CASH', amount: splitPayment.cash },
          { method: 'CARD', amount: splitPayment.card },
        ].filter(p => p.amount > 0),
        total
      );

      if (!validation.valid) {
        toast.error(validation.error || 'Invalid split payment');
        return;
      }

      if (splitPayment.cash > 0 && cashReceivedNum < splitPayment.cash) {
        toast.error('Cash received is less than cash portion');
        return;
      }
    }

    setIsSubmitting(true);
    setProcessing(true);

    try {
      const orderData = {
        orderType: currentOrder.orderType as any,
        tableId: currentOrder.tableId,
        customerId: currentOrder.customerId,
        customerName: currentOrder.customerName,
        customerPhone: currentOrder.customerPhone,
        notes: currentOrder.notes,
        discountPercent: currentOrder.discountPercent || undefined,
        discountAmount: discount > 0 ? discount : undefined,
        tipAmount: tip > 0 ? tip : undefined,
        items: currentOrder.items.map(item => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          notes: item.notes,
          modifiers: item.modifiers,
        })),
      };

      // Prepare payment data
      const paymentData = {
        method: paymentMethod,
        amount: total,
        cashReceived: paymentMethod === 'CASH' || paymentMethod === 'SPLIT' ? cashReceivedNum : undefined,
        splitPayments: paymentMethod === 'SPLIT' ? [
          ...(splitPayment.cash > 0 ? [{ method: 'CASH' as const, amount: splitPayment.cash }] : []),
          ...(splitPayment.card > 0 ? [{ method: 'CARD' as const, amount: splitPayment.card }] : []),
        ] : undefined,
        notes: paymentMethod === 'CASH' ? `Cash received: ${cashReceived}` : undefined,
      };

      // Check if online
      if (!navigator.onLine) {
        // Queue order for later sync with payment info
        const offlineQueue = getOfflineQueueManager();
        const queueId = offlineQueue.addToQueue(orderData, paymentData);
        
        // Store order ID for receipt
        setCompletedOrderId(queueId);
        
        toast.success('Order queued offline. Will sync when connection is restored.');
        onComplete(queueId, Math.max(0, change));
        return;
      }

      // 1. Create the order
      const orderResponse = await orderService.createOrder(orderData);
      
      // Handle offline queue response
      if (orderResponse.queued || orderResponse.isOfflineQueued) {
        const queueId = orderResponse.queueId;
        if (!queueId) {
          throw new Error(orderResponse.error?.message || 'Queued order is missing a queue id');
        }
        setCompletedOrderId(queueId);
        toast.success(orderResponse.error?.message || 'Order queued offline. Will sync when connection is restored.');
        onComplete(queueId, Math.max(0, change));
        setIsSubmitting(false);
        setProcessing(false);
        return;
      }
      
      // Handle error response
      if (!orderResponse.success || !orderResponse.data?.order) {
        toast.error(orderResponse.error?.message || 'Failed to create order');
        setIsSubmitting(false);
        setProcessing(false);
        return;
      }
      
      const orderId = orderResponse.data.order.id;

      // Invalidate orders cache to refresh order history
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['cashier-daily-stats'] });
      queryClient.invalidateQueries({ queryKey: ['cashier-active-orders'] });

      // 2. Process the payment(s) using payment validation service
      const paymentService = getPaymentValidationService();
      const paymentResult = await paymentService.processPayment(
        {
          orderId,
          method: paymentMethod,
          amount: total,
          cashReceived: cashReceivedNum,
          splitPayments: paymentMethod === 'SPLIT' ? paymentData.splitPayments : undefined,
          cardLastFour: cardLastFour || undefined,
          notes: paymentData.notes,
        },
        total
      );

      if (!paymentResult.success) {
        toast.error(paymentResult.error || 'Payment processing failed');
        
        if (paymentResult.requiresRollback) {
          toast.error('Order created but payment failed. Please contact manager.');
        }
        
        setIsSubmitting(false);
        setProcessing(false);
        return;
      }

      // 3. Store the order ID for receipt display
      setCompletedOrderId(orderId);

      // Invalidate active orders cache to remove completed order from list
      queryClient.invalidateQueries({ queryKey: ['cashier-active-orders'] });

      // 4. Auto-print receipt if enabled
      if (settings.autoPrintReceipt) {
        const hw = getHardwareManager();
        const printSuccess = await hw.printReceipt({
          restaurantName: settings.restaurantName || 'POSLytic Restaurant',
          restaurantAddress: settings.address || '',
          restaurantPhone: settings.phone || '',
          orderNumber: orderId,
          cashierName: user?.fullName || 'Cashier',
          items: currentOrder.items.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            notes: item.notes,
          })),
          subtotal,
          tax,
          taxRate: settings.taxRate || 0,
          discount,
          total,
          paymentMethod,
          change: Math.max(0, change),
        });
        if (!printSuccess) {
          toast.error('Receipt printing failed. Please check printer connection.');
        }
      }

      // 5. Open cash drawer for cash payments if enabled
      const hasCashPayment = paymentMethod === 'CASH' || (paymentMethod === 'SPLIT' && splitPayment.cash > 0);
      if (hasCashPayment && settings.cashDrawerEnabled) {
        const hw = getHardwareManager();
        await hw.openCashDrawer();
      }

      toast.success('Order placed and paid successfully!');
      onComplete(orderId, Math.max(0, change));
    } catch (error: any) {
      console.error('Failed to place order:', error);
      toast.error(error.response?.data?.message || 'Failed to place order. Please try again.');
    } finally {
      setIsSubmitting(false);
      setProcessing(false);
    }
  };

  return (
    <div className="flex h-full overflow-hidden bg-neutral-50">
      {/* Left Side: Payment Details */}
      <div className="flex-1 flex flex-col p-10 overflow-y-auto">
        {/* Progress Indicator */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-10"
        >
          <div className="flex items-center gap-6 mb-6">
            <div className="flex items-center gap-3">
              <motion.div
                whileHover={{ scale: 1.1 }}
                className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-base border-2 border-primary-200"
              >
                ✓
              </motion.div>
              <span className="text-neutral-600 text-sm font-semibold">Type</span>
            </div>
            <div className="w-16 h-0.5 bg-primary-600 rounded-full" />
            <div className="flex items-center gap-3">
              <motion.div
                whileHover={{ scale: 1.1 }}
                className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-base border-2 border-primary-200"
              >
                ✓
              </motion.div>
              <span className="text-neutral-600 text-sm font-semibold">Menu</span>
            </div>
            <div className="w-16 h-0.5 bg-primary-600 rounded-full" />
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-600 to-primary-700 flex items-center justify-center text-white font-bold text-base shadow-lg shadow-primary-500/30"
              >
                3
              </motion.div>
              <span className="text-neutral-900 font-bold text-sm">Payment</span>
            </div>
          </div>
        </motion.div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="mb-10"
        >
          <h1 className="font-display text-5xl font-black tracking-tight text-neutral-900 mb-3">
            Checkout & Payment
          </h1>
          <p className="text-neutral-600 text-lg font-medium">Select payment method and complete transaction</p>
        </motion.div>

        {/* Order Summary Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="bg-neutral-0 rounded-3xl p-8 mb-8 shadow-lg border-2 border-neutral-200"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-2xl font-bold text-neutral-900">Order Summary</h2>
            <span className="bg-neutral-100 text-neutral-700 text-xs px-4 py-2 rounded-full font-bold uppercase tracking-wider border-2 border-neutral-200">
              {currentOrder.items.length} Items
            </span>
          </div>

          {/* Items List */}
          <div className="space-y-4 mb-8 max-h-72 overflow-y-auto pr-2">
            {currentOrder.items.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.05 }}
                className="flex justify-between items-start p-4 bg-neutral-50 rounded-2xl border-2 border-neutral-200"
              >
                <div className="flex-1">
                  <p className="text-base font-bold text-neutral-900">
                    {item.quantity}x {item.name}
                  </p>
                  {item.notes && (
                    <p className="text-sm text-neutral-600 mt-2 italic">"{item.notes}"</p>
                  )}
                </div>
                <span className="text-base font-bold text-neutral-900 ml-4">
                  {formatCurrency(item.price * item.quantity, currencyCode)}
                </span>
              </motion.div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t-2 border-neutral-200 pt-8 space-y-4">
            <div className="flex justify-between text-base">
              <span className="text-neutral-600 font-semibold">Subtotal</span>
              <span className="text-neutral-900 font-bold">{formatCurrency(subtotal, currencyCode)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-base">
                <span className="text-success-600 font-bold">Discount ({currentOrder.discountPercent}%)</span>
                <span className="text-success-600 font-black">-{formatCurrency(discount, currencyCode)}</span>
              </div>
            )}
            {tip > 0 && (
              <div className="flex justify-between text-base">
                <span className="text-primary-600 font-bold">Tip</span>
                <span className="text-primary-600 font-black">+{formatCurrency(tip, currencyCode)}</span>
              </div>
            )}
            <div className="flex justify-between text-base">
              <span className="text-neutral-600 font-semibold">Tax ({taxRate}%)</span>
              <span className="text-neutral-900 font-bold">{formatCurrency(tax, currencyCode)}</span>
            </div>
            {serviceChargeRate > 0 && (
              <div className="flex justify-between text-base">
                <span className="text-neutral-600 font-semibold">Service Charge ({serviceChargeRate}%)</span>
                <span className="text-neutral-900 font-bold">{formatCurrency(serviceCharge, currencyCode)}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-6 border-t-2 border-neutral-200">
              <span className="font-display text-lg font-black uppercase tracking-wider text-primary-600">
                Total Due
              </span>
              <span className="font-display text-5xl font-black text-primary-600">
                {formatCurrency(total, currencyCode)}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Discount & Tip Buttons */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <motion.button
            whileHover={{ scale: 1.02, boxShadow: '0 10px 25px rgba(229, 57, 53, 0.2)' }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowDiscountModal(true)}
            className="py-5 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-3xl font-bold flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transition-all"
          >
            <Gift className="w-6 h-6" />
            Discount
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02, boxShadow: '0 10px 25px rgba(229, 57, 53, 0.2)' }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowTipModal(true)}
            className="py-5 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-3xl font-bold flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transition-all"
          >
            <Heart className="w-6 h-6" />
            Tip {tip > 0 ? `(${formatCurrency(tip, currencyCode)})` : ''}
          </motion.button>
        </div>

        {/* Payment Method Selection */}
        <div className="grid grid-cols-3 gap-6 mb-10">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setPaymentMethod('CASH')}
            className={`p-8 rounded-3xl flex flex-col items-center gap-4 transition-all ${
              paymentMethod === 'CASH'
                ? 'bg-gradient-to-br from-primary-600 to-primary-700 text-white shadow-xl shadow-primary-500/30 border-2 border-primary-500'
                : 'bg-neutral-0 text-neutral-700 hover:bg-neutral-50 border-2 border-neutral-200'
            }`}
          >
            <Banknote className="w-10 h-10" />
            <span className="font-bold text-base uppercase tracking-wider">Cash</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setPaymentMethod('CARD')}
            className={`p-8 rounded-3xl flex flex-col items-center gap-4 transition-all ${
              paymentMethod === 'CARD'
                ? 'bg-gradient-to-br from-primary-600 to-primary-700 text-white shadow-xl shadow-primary-500/30 border-2 border-primary-500'
                : 'bg-neutral-0 text-neutral-700 hover:bg-neutral-50 border-2 border-neutral-200'
            }`}
          >
            <CreditCard className="w-10 h-10" />
            <span className="font-bold text-base uppercase tracking-wider">Card</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setPaymentMethod('SPLIT')}
            className={`p-8 rounded-3xl flex flex-col items-center gap-4 transition-all ${
              paymentMethod === 'SPLIT'
                ? 'bg-gradient-to-br from-primary-600 to-primary-700 text-white shadow-xl shadow-primary-500/30 border-2 border-primary-500'
                : 'bg-neutral-0 text-neutral-700 hover:bg-neutral-50 border-2 border-neutral-200'
            }`}
          >
            <Split className="w-10 h-10" />
            <span className="font-bold text-base uppercase tracking-wider">Split</span>
          </motion.button>
        </div>

        {/* Cash Input Section (only for CASH payment) */}
        {paymentMethod === 'CASH' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="bg-neutral-0 rounded-3xl p-10 shadow-lg border-2 border-neutral-200"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display text-2xl font-bold text-neutral-900">
                Cash Received
              </h3>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowCashCounter(!showCashCounter)}
                className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors ${
                  showCashCounter
                    ? 'bg-primary-600 text-white border-2 border-primary-500'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 border-2 border-neutral-200'
                }`}
              >
                <Calculator className="w-5 h-5" />
                {showCashCounter ? 'Hide' : 'Show'} Counter
              </motion.button>
            </div>

            {/* Cash Counting Helper */}
            {showCashCounter && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-8"
              >
                <CashCountingHelper
                  onTotalCalculated={(total) => setCashReceived(total.toFixed(2))}
                  currencyCode={currencyCode}
                  expectedAmount={total}
                />
              </motion.div>
            )}

            {/* Cash Display - Editable with Keyboard */}
            <div className="bg-neutral-50 rounded-3xl p-8 mb-6 border-2 border-neutral-200">
              <label className="text-xs font-bold uppercase tracking-wider text-primary-600 mb-3 block">
                Cash Received (Type or use keypad)
              </label>
              <div className="flex items-center justify-end gap-3">
                <span className="text-3xl text-neutral-400 font-bold">{currencyCode === 'USD' ? '$' : currencyCode}</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={cashReceived}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || /^∝*\.?∝*$/.test(val)) {
                      setCashReceived(val);
                    }
                  }}
                  placeholder="0.00"
                  className="font-display text-6xl font-black text-primary-600 bg-transparent border-none outline-none text-right w-full max-w-[350px] placeholder:text-neutral-300"
                  autoFocus
                />
              </div>
              <p className="text-sm text-neutral-500 text-right mt-2 font-medium">
                Press numbers on keyboard or use keypad below
              </p>
            </div>

            {/* Quick Amount Buttons */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleQuickAmount('exact')}
                className="py-4 bg-neutral-100 text-neutral-700 rounded-2xl font-bold hover:bg-neutral-200 transition-colors text-base border-2 border-neutral-200"
              >
                Exact Change
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleQuickAmount('next10')}
                className="py-4 bg-neutral-100 text-neutral-700 rounded-2xl font-bold hover:bg-neutral-200 transition-colors text-base border-2 border-neutral-200"
              >
                Next {formatCurrency(10, currencyCode).replace(/[0-9.,]/g, '')}10
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleQuickAmount('next20')}
                className="py-4 bg-neutral-100 text-neutral-700 rounded-2xl font-bold hover:bg-neutral-200 transition-colors text-base border-2 border-neutral-200"
              >
                Next {formatCurrency(20, currencyCode).replace(/[0-9.,]/g, '')}20
              </motion.button>
            </div>

            {/* Numeric Keypad */}
            <div className="grid grid-cols-3 gap-4">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'BACKSPACE'].map(
                (key) => (
                  <motion.button
                    key={key}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleKeypadPress(key)}
                    className="py-5 bg-neutral-100 text-neutral-900 rounded-2xl font-display text-2xl font-bold hover:bg-neutral-200 transition-all border-2 border-neutral-200"
                  >
                    {key === 'BACKSPACE' ? '⌫' : key}
                  </motion.button>
                )
              )}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleKeypadPress('CLEAR')}
                className="py-5 bg-error-100 text-error-600 rounded-2xl font-display text-xl font-bold hover:bg-error-200 transition-all border-2 border-error-200"
              >
                CLEAR
              </motion.button>
            </div>

            {/* Change Due Display */}
            {cashReceived && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-8 p-6 bg-primary-50 rounded-3xl border-2 border-primary-200"
              >
                <div className="flex justify-between items-center">
                  <span className="text-neutral-700 font-bold text-lg">Change Due:</span>
                  <span
                    className={`font-display text-4xl font-black ${
                      change >= 0 ? 'text-primary-600' : 'text-error-600'
                    }`}
                  >
                    {change >= 0 ? formatCurrency(change, currencyCode) : `-${formatCurrency(Math.abs(change), currencyCode)}`}
                  </span>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Card Payment Info */}
        {paymentMethod === 'CARD' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="bg-neutral-0 rounded-3xl p-10 text-center shadow-lg border-2 border-neutral-200"
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-24 h-24 mx-auto mb-6 bg-primary-100 rounded-full flex items-center justify-center border-2 border-primary-200"
            >
              <CreditCard className="w-12 h-12 text-primary-600" />
            </motion.div>
            <h3 className="font-display text-3xl font-bold text-neutral-900 mb-3">
              Card Payment
            </h3>
            <p className="text-neutral-600 text-lg mb-8">
              Total to charge: <span className="font-black text-primary-600">{formatCurrency(total, currencyCode)}</span>
            </p>

            {/* Manual confirmation for non-integrated terminals */}
            <div className="bg-neutral-50 rounded-3xl p-8 border-2 border-neutral-200">
              <p className="text-base text-neutral-600 mb-6 font-medium">
                For non-integrated terminals: Process payment on your terminal, then confirm below.
              </p>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => cardPaymentConfirmed ? setCardPaymentConfirmed(false) : setShowCardConfirmationModal(true)}
                className={`w-full py-5 rounded-2xl font-bold text-xl transition-all flex items-center justify-center gap-3 ${
                  cardPaymentConfirmed
                    ? 'bg-success-100 text-success-700 border-2 border-success-500'
                    : 'bg-neutral-0 border-2 border-neutral-300 text-neutral-700 hover:border-primary-600 hover:bg-primary-50'
                }`}
              >
                {cardPaymentConfirmed ? (
                  <>
                    <Check className="w-7 h-7" />
                    Card Payment Confirmed
                  </>
                ) : (
                  <>
                    <CreditCard className="w-7 h-7" />
                    Process Card Payment
                  </>
                )}
              </motion.button>

              {!cardPaymentConfirmed && (
                <p className="text-sm text-neutral-500 mt-4 text-center font-medium">
                  Click to open card payment confirmation
                </p>
              )}
            </div>
          </motion.div>
        )}

        {/* Split Payment */}
        {paymentMethod === 'SPLIT' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="bg-neutral-0 rounded-3xl p-10 shadow-lg border-2 border-neutral-200"
          >
            <motion.div
              animate={{ rotate: 180 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="w-20 h-20 mx-auto mb-6 bg-primary-100 rounded-full flex items-center justify-center border-2 border-primary-200"
            >
              <Split className="w-10 h-10 text-primary-600" />
            </motion.div>
            <h3 className="font-display text-3xl font-bold text-neutral-900 mb-3 text-center">
              Split Payment
            </h3>
            <p className="text-neutral-600 text-lg mb-8 text-center">
              Divide the payment between cash and card
            </p>

            {/* Split Amount Inputs */}
            <div className="space-y-6 mb-8">
              <div className="bg-neutral-50 rounded-3xl p-6 border-2 border-neutral-200">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-neutral-700 font-bold text-base flex items-center gap-3">
                    <Banknote className="w-6 h-6 text-success-600" />
                    Cash Amount
                  </span>
                  <span className="text-2xl font-black text-neutral-900">
                    {formatCurrency(splitPayment.cash, currencyCode)}
                  </span>
                </div>
                <input
                  type="number"
                  min="0"
                  max={total}
                  step="0.01"
                  value={splitPayment.cash || ''}
                  onChange={(e) => {
                    const cash = parseFloat(e.target.value) || 0;
                    setSplitPayment({
                      cash: Math.min(cash, total),
                      card: Math.max(0, total - cash),
                    });
                  }}
                  className="w-full px-5 py-4 bg-white border-2 border-neutral-300 rounded-2xl text-neutral-900 font-bold text-lg focus:border-primary-600 focus:ring-4 focus:ring-primary-500/10 focus:outline-none"
                  placeholder="Enter cash amount"
                />
              </div>

              <div className="bg-neutral-50 rounded-3xl p-6 border-2 border-neutral-200">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-neutral-700 font-bold text-base flex items-center gap-3">
                    <CreditCard className="w-6 h-6 text-primary-600" />
                    Card Amount
                  </span>
                  <span className="text-2xl font-black text-neutral-900">
                    {formatCurrency(splitPayment.card, currencyCode)}
                  </span>
                </div>
                <input
                  type="number"
                  min="0"
                  max={total}
                  step="0.01"
                  value={splitPayment.card || ''}
                  onChange={(e) => {
                    const card = parseFloat(e.target.value) || 0;
                    setSplitPayment({
                      cash: Math.max(0, total - card),
                      card: Math.min(card, total),
                    });
                  }}
                  className="w-full px-5 py-4 bg-white border-2 border-neutral-300 rounded-2xl text-neutral-900 font-bold text-lg focus:border-primary-600 focus:ring-4 focus:ring-primary-500/10 focus:outline-none"
                  placeholder="Enter card amount"
                />
              </div>
            </div>

            {/* Validation */}
            <div className={`p-6 rounded-3xl border-2 ${
              Math.abs(splitPayment.cash + splitPayment.card - total) < 0.01
                ? 'bg-success-50 border-success-300'
                : 'bg-error-50 border-error-300'
            }`}>
              <div className="flex justify-between items-center">
                <span className="font-bold text-lg">
                  {Math.abs(splitPayment.cash + splitPayment.card - total) < 0.01
                    ? '✓ Payment split correctly'
                    : '⚠ Split must equal total'}
                </span>
                <span className="font-black text-xl">
                  {formatCurrency(splitPayment.cash + splitPayment.card, currencyCode)}
                  {' / '}
                  {formatCurrency(total, currencyCode)}
                </span>
              </div>
            </div>

            {/* Quick Split Buttons */}
            <div className="grid grid-cols-2 gap-4 mt-6">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSplitPayment({ cash: total, card: 0 })}
                className="py-4 bg-neutral-100 text-neutral-700 rounded-2xl font-bold hover:bg-neutral-200 transition-colors border-2 border-neutral-200"
              >
                All Cash
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSplitPayment({ cash: 0, card: total })}
                className="py-4 bg-neutral-100 text-neutral-700 rounded-2xl font-bold hover:bg-neutral-200 transition-colors border-2 border-neutral-200"
              >
                All Card
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSplitPayment({ cash: Math.ceil(total / 2), card: Math.floor(total / 2) })}
                className="py-4 bg-neutral-100 text-neutral-700 rounded-2xl font-bold hover:bg-neutral-200 transition-colors border-2 border-neutral-200"
              >
                50/50 Split
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSplitPayment({ cash: Math.ceil(total / 20) * 10, card: total - Math.ceil(total / 20) * 10 })}
                className="py-4 bg-neutral-100 text-neutral-700 rounded-2xl font-bold hover:bg-neutral-200 transition-colors border-2 border-neutral-200"
              >
                Round Cash
              </motion.button>
            </div>

            {/* Cash Received Input for Split Payment */}
            {splitPayment.cash > 0 && (
              <div className="mt-8 bg-success-50 rounded-3xl p-6 border-2 border-success-300">
                <label className="block text-base font-bold text-neutral-800 mb-3">
                  Cash Received
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  className="w-full px-5 py-4 bg-white border-2 border-success-400 rounded-2xl text-neutral-900 font-black text-2xl focus:border-primary-600 focus:ring-4 focus:ring-primary-500/10 focus:outline-none"
                  placeholder={`Enter cash amount (min: ${formatCurrency(splitPayment.cash, currencyCode)})`}
                />
                {cashReceivedNum >= splitPayment.cash && (
                  <div className="mt-3 text-base font-bold text-success-700">
                    Change: {formatCurrency(cashReceivedNum - splitPayment.cash, currencyCode)}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Right Side: Action Panel */}
      <motion.div
        initial={{ x: 20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.4 }}
        className="w-[450px] bg-gradient-to-b from-primary-600 to-primary-700 flex flex-col shadow-2xl"
      >
        <div className="flex-1 p-10">
          <h3 className="font-display text-3xl font-black text-white mb-8">
            Complete Transaction
          </h3>

          {/* Transaction Details */}
          <div className="space-y-5 mb-10">
            <div className="flex justify-between items-center p-5 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
              <span className="text-white/90 text-sm font-semibold">Payment Method</span>
              <span className="text-white font-black text-lg capitalize">{paymentMethod.toLowerCase()}</span>
            </div>

            {paymentMethod === 'CASH' && cashReceivedNum > 0 && (
              <>
                <div className="flex justify-between items-center p-5 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
                  <span className="text-white/90 text-sm font-semibold">Cash Received</span>
                  <span className="text-white font-display font-black text-2xl">
                    {formatCurrency(cashReceivedNum, currencyCode)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-5 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
                  <span className="text-white/90 text-sm font-semibold">Change</span>
                  <span
                    className={`font-display font-black text-2xl ${
                      change >= 0 ? 'text-success-300' : 'text-error-300'
                    }`}
                  >
                    {change >= 0 ? formatCurrency(change, currencyCode) : 'N/A'}
                  </span>
                </div>
              </>
            )}

            {paymentMethod === 'SPLIT' && (
              <>
                <div className="flex justify-between items-center p-5 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
                  <span className="text-white/90 text-sm font-semibold">Cash Portion</span>
                  <span className="text-white font-display font-black text-2xl">
                    {formatCurrency(splitPayment.cash, currencyCode)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-5 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
                  <span className="text-white/90 text-sm font-semibold">Card Portion</span>
                  <span className="text-white font-display font-black text-2xl">
                    {formatCurrency(splitPayment.card, currencyCode)}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Place Order Button */}
          <motion.button
            whileHover={{ scale: 1.02, boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)' }}
            whileTap={{ scale: 0.98 }}
            onClick={handlePlaceOrder}
            disabled={
              isSubmitting ||
              (paymentMethod === 'CASH' && cashReceivedNum < total) ||
              (paymentMethod === 'CARD' && !cardPaymentConfirmed) ||
              (paymentMethod === 'SPLIT' && (
                Math.abs(splitPayment.cash + splitPayment.card - total) > 0.01 ||
                (splitPayment.cash > 0 && cashReceivedNum < splitPayment.cash)
              ))
            }
            className="w-full py-7 bg-gradient-to-r from-success-500 to-success-600 text-white rounded-3xl font-display font-black text-2xl tracking-wide hover:from-success-600 hover:to-success-700 transition-all flex items-center justify-center gap-4 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <div className="w-7 h-7 border-4 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Check className="w-8 h-8" />
            )}
            {isSubmitting ? 'Processing...' : 'Place Order & Print'}
          </motion.button>

          {/* Back Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onBack}
            className="w-full mt-6 py-5 bg-white/10 backdrop-blur-sm text-white rounded-3xl font-display font-bold text-xl hover:bg-white/20 transition-all flex items-center justify-center gap-3 border-2 border-white/20"
          >
            <ChevronLeft className="w-6 h-6" />
            Back to Menu
          </motion.button>
        </div>

        {/* Footer Info */}
        <div className="p-8 bg-primary-800 border-t border-white/10">
          <div className="flex items-center gap-4 text-white/80">
            <Printer className="w-5 h-5" />
            <span className="font-medium">Receipt will be printed automatically</span>
          </div>
        </div>
      </motion.div>

      {/* Discount Modal */}
      {showDiscountModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[200]">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-neutral-0 rounded-3xl p-10 max-w-md w-full mx-4 shadow-2xl border-2 border-neutral-200"
          >
            <h3 className="font-display text-3xl font-black text-neutral-900 mb-8 flex items-center gap-4">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 0.5 }}
                className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center border-2 border-primary-200"
              >
                <Gift className="w-6 h-6 text-primary-600" />
              </motion.div>
              Apply Discount
            </h3>

            <div className="space-y-6 mb-8">
              <p className="text-base text-neutral-600 font-medium">Select a discount percentage:</p>
              <div className="grid grid-cols-4 gap-4">
                {[5, 10, 15, 20, 25, 30, 50, 100].map((percent) => (
                  <motion.button
                    key={percent}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setDiscountPercent(percent)}
                    className={`py-4 rounded-2xl font-bold transition-all ${
                      discountPercent === percent
                        ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg shadow-primary-500/30'
                        : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 border-2 border-neutral-200'
                    }`}
                  >
                    {percent}%
                  </motion.button>
                ))}
              </div>

              {discountPercent > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-primary-50 p-6 rounded-2xl border-2 border-primary-200"
                >
                  <p className="text-sm text-neutral-600 mb-2 font-semibold">Discount Amount:</p>
                  <p className="text-3xl font-black text-primary-600">
                    -{formatCurrency(subtotal * (discountPercent / 100), currencyCode)}
                  </p>
                </motion.div>
              )}
            </div>

            <div className="flex gap-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setShowDiscountModal(false);
                  setDiscountPercent(0);
                }}
                className="flex-1 py-4 bg-neutral-100 text-neutral-700 rounded-2xl font-bold hover:bg-neutral-200 transition-colors border-2 border-neutral-200"
              >
                Cancel
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02, boxShadow: '0 10px 25px rgba(229, 57, 53, 0.2)' }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  if (discountPercent >= DISCOUNT_PIN_THRESHOLD) {
                    setPendingDiscountPercent(discountPercent);
                    setShowDiscountPinModal(true);
                  } else {
                    applyDiscount(discountPercent);
                    setShowDiscountModal(false);
                    toast.success(`Discount of ${discountPercent}% applied!`);
                  }
                }}
                className="flex-1 py-4 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-2xl font-bold hover:shadow-lg shadow-primary-500/30 transition-all"
              >
                Apply Discount
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Discount PIN Modal */}
      {showDiscountPinModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[300]">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-neutral-0 rounded-3xl p-10 max-w-md w-full mx-4 shadow-2xl border-2 border-neutral-200"
          >
            <div className="flex items-center gap-4 mb-8">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-12 h-12 bg-warning-100 rounded-full flex items-center justify-center border-2 border-warning-200"
              >
                <Shield className="w-6 h-6 text-warning-600" />
              </motion.div>
              <h3 className="font-display text-3xl font-black text-neutral-900">Manager PIN Required</h3>
            </div>

            <p className="text-base text-neutral-600 mb-8 font-medium">
              Discounts of {DISCOUNT_PIN_THRESHOLD}% or higher require manager authorization.
            </p>

            <div className="space-y-6 mb-8">
              <input
                type="password"
                value={discountPin}
                onChange={(e) => setDiscountPin(e.target.value)}
                placeholder="Enter manager PIN"
                className="w-full px-5 py-4 bg-neutral-50 border-2 border-neutral-300 rounded-2xl text-neutral-900 font-bold text-xl focus:border-primary-600 focus:ring-4 focus:ring-primary-500/10 focus:outline-none"
                maxLength={4}
              />
            </div>

            <div className="flex gap-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setShowDiscountPinModal(false);
                  setDiscountPin('');
                  setPendingDiscountPercent(0);
                }}
                className="flex-1 py-4 bg-neutral-100 text-neutral-700 rounded-2xl font-bold hover:bg-neutral-200 transition-colors border-2 border-neutral-200"
              >
                Cancel
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02, boxShadow: '0 10px 25px rgba(229, 57, 53, 0.2)' }}
                whileTap={{ scale: 0.98 }}
                onClick={async () => {
                  // Validate PIN (simplified - in production, verify against actual manager PIN)
                  if (discountPin.length === 4) {
                    // Validate PIN via backend API for security
                    let managerName = 'Manager';
                    let isValid = false;
                    try {
                      const pinResponse = await api.post('/auth/validate-pin', {
                        pin: discountPin,
                        operation: `discount-${pendingDiscountPercent}%`,
                      });
                      isValid = pinResponse.data.data.valid === true;
                      if (isValid) managerName = pinResponse.data.data.managerName || 'Manager';
                    } catch {
                      isValid = false;
                    }
                    
                    if (isValid) {
                      applyDiscount(pendingDiscountPercent, managerName);
                      setShowDiscountPinModal(false);
                      setShowDiscountModal(false);
                      setDiscountPin('');
                      toast.success(`Discount of ${pendingDiscountPercent}% approved by ${managerName}`);
                    } else {
                      toast.error('Invalid PIN. Access denied.');
                      setDiscountPin('');
                    }
                  }
                }}
                disabled={discountPin.length < 4}
                className="flex-1 py-4 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-2xl font-bold hover:shadow-lg shadow-primary-500/30 transition-all disabled:opacity-50"
              >
                Verify & Apply
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Tip Modal */}
      {showTipModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[200]">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-neutral-0 rounded-3xl p-10 max-w-md w-full mx-4 shadow-2xl border-2 border-neutral-200"
          >
            <h3 className="font-display text-3xl font-black text-neutral-900 mb-8 flex items-center gap-4">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center border-2 border-primary-200"
              >
                <Heart className="w-6 h-6 text-primary-600" />
              </motion.div>
              Add Tip
            </h3>

            <div className="space-y-6 mb-8">
              <p className="text-base text-neutral-600 font-medium">Select a tip percentage or enter custom amount:</p>
              {/* Percentage buttons */}
              <div className="grid grid-cols-4 gap-4">
                {settings.tipSuggestions?.map((percent: number) => (
                  <motion.button
                    key={percent}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setTipPercent(percent);
                      setCustomTip('');
                    }}
                    className={`py-4 rounded-2xl font-bold transition-all ${
                      tipPercent === percent && !customTip
                        ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg shadow-primary-500/30'
                        : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 border-2 border-neutral-200'
                    }`}
                  >
                    {percent}%
                  </motion.button>
                ))}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setTipPercent(0);
                    setCustomTip('');
                  }}
                    className={`py-4 rounded-2xl font-bold transition-all ${
                    !tipPercent && !customTip
                        ? 'bg-neutral-600 text-white'
                        : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 border-2 border-neutral-200'
                    }`}
                >
                  No Tip
                </motion.button>
              </div>

              {/* Custom tip input */}
              <div className="bg-neutral-50 p-6 rounded-2xl border-2 border-neutral-200">
                <p className="text-sm text-neutral-600 mb-3 font-semibold">Custom tip amount:</p>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-neutral-500 font-bold">{settings.currency === 'USD' ? '$' : settings.currency === 'EUR' ? '€' : settings.currency === 'GBP' ? '£' : settings.currency === 'PKR' ? '₨' : settings.currency === 'INR' ? '₹' : settings.currency === 'BDT' ? '৳' : settings.currency === 'SAR' ? '﷼' : settings.currency === 'AED' ? 'د.إ' : '$'}</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={customTip}
                    onChange={(e) => {
                      setCustomTip(e.target.value);
                      setTipPercent(0);
                    }}
                    placeholder="0.00"
                    className="w-full pl-12 pr-5 py-4 bg-white border-2 border-neutral-300 rounded-2xl text-neutral-900 font-bold text-lg focus:border-primary-600 focus:ring-4 focus:ring-primary-500/10 focus:outline-none"
                  />
                </div>
              </div>

              {/* Tip preview */}
              {(tipPercent > 0 || customTip) && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-primary-50 p-6 rounded-2xl border-2 border-primary-200"
                >
                  <p className="text-sm text-neutral-600 mb-2 font-semibold">Tip Amount:</p>
                  <p className="text-3xl font-black text-primary-600">
                    +{formatCurrency(
                      customTip ? parseFloat(customTip) || 0 : (subtotal * tipPercent / 100),
                      currencyCode
                    )}
                  </p>
                </motion.div>
              )}
            </div>

            <div className="flex gap-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setShowTipModal(false);
                  setTipPercent(0);
                  setCustomTip('');
                }}
                className="flex-1 py-4 bg-neutral-100 text-neutral-700 rounded-2xl font-bold hover:bg-neutral-200 transition-colors border-2 border-neutral-200"
              >
                Cancel
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02, boxShadow: '0 10px 25px rgba(229, 57, 53, 0.2)' }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  const tipAmount = customTip
                    ? parseFloat(customTip) || 0
                    : (subtotal * tipPercent / 100);
                  setTip(tipAmount);
                  setShowTipModal(false);
                  toast.success(`Tip of ${formatCurrency(tipAmount, currencyCode)} added!`);
                }}
                className="flex-1 py-4 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-2xl font-bold hover:shadow-lg shadow-primary-500/30 transition-all"
              >
                Add Tip
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Card Payment Confirmation Modal */}
      {showCardConfirmationModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowCardConfirmationModal(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-neutral-0 rounded-3xl p-10 max-w-md w-full mx-4 shadow-2xl border-2 border-neutral-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-8">
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-primary-200"
              >
                <CreditCard className="w-10 h-10 text-primary-600" />
              </motion.div>
              <h3 className="font-display text-3xl font-black text-neutral-900 mb-3">Confirm Card Payment</h3>
              <p className="text-neutral-600 text-lg font-medium">Amount: {formatCurrency(total, currencyCode)}</p>
            </div>

            <div className="mb-8">
              <label className="block text-sm font-bold text-neutral-700 mb-3 uppercase tracking-wider">
                Card Last 4 Digits (Optional)
              </label>
              <input
                type="text"
                maxLength={4}
                value={cardLastFour}
                onChange={(e) => setCardLastFour(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter last 4 digits"
                className="w-full px-5 py-4 border-2 border-neutral-300 rounded-2xl focus:border-primary-600 focus:ring-4 focus:ring-primary-500/10 focus:outline-none text-center font-mono text-xl font-bold tracking-[0.3em]"
              />
            </div>

            <div className="bg-warning-50 border-2 border-warning-200 rounded-2xl p-6 mb-8">
              <p className="text-base text-warning-800 flex items-start gap-3 font-medium">
                <Shield className="w-6 h-6 flex-shrink-0 mt-0.5" />
                Please ensure the card payment has been successfully processed on your terminal before confirming.
              </p>
            </div>

            <div className="flex gap-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => { setShowCardConfirmationModal(false); setCardLastFour(''); }}
                className="flex-1 py-4 bg-neutral-100 text-neutral-700 rounded-2xl font-bold hover:bg-neutral-200 transition-colors border-2 border-neutral-200"
              >
                Cancel
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02, boxShadow: '0 10px 25px rgba(229, 57, 53, 0.2)' }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setCardPaymentConfirmed(true);
                  setShowCardConfirmationModal(false);
                  toast.success('Card payment confirmed!');
                }}
                className="flex-1 py-4 bg-gradient-to-r from-success-500 to-success-600 text-white rounded-2xl font-bold hover:shadow-lg shadow-success-500/30 transition-all"
              >
                Confirm Payment
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Split Billing Modal */}
      <SplitBilling
        isOpen={showSplitBillingModal}
        onClose={() => setShowSplitBillingModal(false)}
        onConfirm={(splits) => {
          // Handle split billing confirmation
          // For now, set the payment method to SPLIT and set the split amounts
          setPaymentMethod('SPLIT');
          const cashAmount = splits.filter(s => s.method === 'CASH').reduce((sum, s) => sum + s.amount, 0);
          const cardAmount = splits.filter(s => s.method === 'CARD').reduce((sum, s) => sum + s.amount, 0);
          setSplitPayment({ cash: cashAmount, card: cardAmount });
          setShowSplitBillingModal(false);
          toast.success(`Split bill: ${formatCurrency(cashAmount, currencyCode)} cash, ${formatCurrency(cardAmount, currencyCode)} card`);
        }}
        totalAmount={total}
      />
    </div>
  );
};

export default CheckoutPayment;
