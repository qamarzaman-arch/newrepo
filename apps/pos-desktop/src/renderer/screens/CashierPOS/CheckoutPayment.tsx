import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
      <div className="flex h-full items-center justify-center bg-neutral-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-neutral-600">Loading order...</p>
          <button
            onClick={onBack}
            className="mt-4 px-4 py-2 bg-neutral-200 rounded-lg hover:bg-neutral-300 transition-colors"
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
      <div className="flex h-full items-center justify-center bg-neutral-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-neutral-600">Loading tax rates...</p>
          <p className="text-sm text-neutral-400 mt-2">Please wait while we load the latest rates</p>
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

  const isPlaceOrderDisabled =
    isSubmitting ||
    (paymentMethod === 'CASH' && cashReceivedNum < total) ||
    (paymentMethod === 'CARD' && !cardPaymentConfirmed) ||
    (paymentMethod === 'SPLIT' && (
      Math.abs(splitPayment.cash + splitPayment.card - total) > 0.01 ||
      (splitPayment.cash > 0 && cashReceivedNum < splitPayment.cash)
    ));

  return (
    <div className="flex h-full overflow-hidden bg-neutral-100">
      {/* ─────────────────── LEFT PANEL: Order Summary ─────────────────── */}
      <div className="w-[45%] flex flex-col bg-neutral-0 border-r border-neutral-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-neutral-100">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-black text-neutral-900 tracking-tight">Order Summary</h1>
            <span className="text-xs font-bold uppercase tracking-wider bg-neutral-100 text-neutral-500 px-3 py-1 rounded-full border border-neutral-200">
              {currentOrder.items.length} {currentOrder.items.length === 1 ? 'item' : 'items'}
            </span>
          </div>
          {currentOrder.customerName && (
            <p className="text-sm text-neutral-500 mt-1 font-medium">{currentOrder.customerName}</p>
          )}
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto px-6 py-3 min-h-0">
          {currentOrder.items.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
              className="flex items-baseline justify-between py-2 border-b border-neutral-100 last:border-0"
            >
              <div className="flex items-baseline gap-2 min-w-0 flex-1">
                <span className="text-sm font-bold text-primary-600 w-7 shrink-0">{item.quantity}x</span>
                <span className="text-sm font-semibold text-neutral-800 truncate">{item.name}</span>
                {item.notes && (
                  <span className="text-xs text-neutral-400 italic truncate hidden sm:inline">"{item.notes}"</span>
                )}
              </div>
              <span className="text-sm font-bold text-neutral-900 ml-3 tabular-nums shrink-0">
                {formatCurrency(item.price * item.quantity, currencyCode)}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Totals */}
        <div className="px-6 pt-3 pb-4 border-t-2 border-neutral-100 bg-neutral-50 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-neutral-500 font-medium">Subtotal</span>
            <span className="text-neutral-700 font-semibold tabular-nums">{formatCurrency(subtotal, currencyCode)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-green-600 font-semibold">Discount ({currentOrder.discountPercent}%)</span>
              <span className="text-green-600 font-bold tabular-nums">-{formatCurrency(discount, currencyCode)}</span>
            </div>
          )}
          {tip > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-blue-500 font-semibold">Tip</span>
              <span className="text-blue-500 font-bold tabular-nums">+{formatCurrency(tip, currencyCode)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-neutral-500 font-medium">Tax ({taxRate}%)</span>
            <span className="text-neutral-700 font-semibold tabular-nums">{formatCurrency(tax, currencyCode)}</span>
          </div>
          {serviceChargeRate > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-neutral-500 font-medium">Service Charge ({serviceChargeRate}%)</span>
              <span className="text-neutral-700 font-semibold tabular-nums">{formatCurrency(serviceCharge, currencyCode)}</span>
            </div>
          )}
          <div className="flex justify-between items-center pt-3 border-t-2 border-neutral-200">
            <span className="text-base font-black uppercase tracking-wider text-neutral-800">Total Due</span>
            <span className="text-3xl font-black text-primary-600 tabular-nums">
              {formatCurrency(total, currencyCode)}
            </span>
          </div>
        </div>

        {/* Discount & Tip compact buttons */}
        <div className="px-6 pb-5 flex gap-3 bg-neutral-50 border-t border-neutral-100">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowDiscountModal(true)}
            className="flex-1 py-2.5 flex items-center justify-center gap-2 text-sm font-bold text-primary-600 bg-primary-50 border border-primary-200 rounded-xl hover:bg-primary-100 transition-colors"
          >
            <Gift className="w-4 h-4" />
            {discount > 0 ? `Discount (${currentOrder.discountPercent}%)` : 'Discount'}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowTipModal(true)}
            className="flex-1 py-2.5 flex items-center justify-center gap-2 text-sm font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors"
          >
            <Heart className="w-4 h-4" />
            {tip > 0 ? `Tip (${formatCurrency(tip, currencyCode)})` : 'Tip'}
          </motion.button>
        </div>
      </div>

      {/* ─────────────────── RIGHT PANEL: Payment ─────────────────── */}
      <motion.div
        initial={{ x: 20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="w-[55%] flex flex-col bg-gradient-to-b from-primary-700 to-primary-800 overflow-hidden"
      >
        {/* Payment Method Tabs */}
        <div className="px-6 pt-5 pb-4 flex gap-3">
          {(['CASH', 'CARD', 'SPLIT'] as const).map((method) => {
            const icons = { CASH: <Banknote className="w-4 h-4" />, CARD: <CreditCard className="w-4 h-4" />, SPLIT: <Split className="w-4 h-4" /> };
            return (
              <motion.button
                key={method}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setPaymentMethod(method)}
                className={`flex-1 py-3 flex items-center justify-center gap-2 rounded-xl font-bold text-sm uppercase tracking-wider transition-all ${
                  paymentMethod === method
                    ? 'bg-neutral-0 text-primary-600 shadow-lg'
                    : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
                }`}
              >
                {icons[method]}
                {method}
              </motion.button>
            );
          })}
        </div>

        {/* Payment Content — scrollable */}
        <div className="flex-1 overflow-y-auto px-6 pb-4 min-h-0">
          <AnimatePresence mode="wait">

            {/* ── CASH ── */}
            {paymentMethod === 'CASH' && (
              <motion.div
                key="cash"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {/* Amount Display */}
                <div className="bg-white/10 rounded-2xl px-5 py-4 border border-white/20">
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-white/60 text-xs font-bold uppercase tracking-wider">Cash Received</span>
                    <span className="text-white/50 text-xs font-medium">or type on keyboard</span>
                  </div>
                  <div className="text-right">
                    <span className="text-4xl font-black text-white tabular-nums">
                      {cashReceived ? `${currencyCode === 'USD' ? '$' : currencyCode}${cashReceived}` : <span className="text-white/30">$0.00</span>}
                    </span>
                  </div>
                </div>

                {/* Cash Counter toggle */}
                <div className="flex items-center justify-between">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setShowCashCounter(!showCashCounter)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                      showCashCounter
                        ? 'bg-white text-primary-600'
                        : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
                    }`}
                  >
                    <Calculator className="w-3.5 h-3.5" />
                    {showCashCounter ? 'Hide Counter' : 'Cash Counter'}
                  </motion.button>
                </div>

                {/* Cash Counting Helper */}
                <AnimatePresence>
                  {showCashCounter && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-white/10 rounded-2xl p-4 border border-white/20">
                        <CashCountingHelper
                          onTotalCalculated={(total) => setCashReceived(total.toFixed(2))}
                          currencyCode={currencyCode}
                          expectedAmount={total}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Quick Amount Buttons */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Exact', action: 'exact' as const },
                    { label: `Next $10`, action: 'next10' as const },
                    { label: `Next $20`, action: 'next20' as const },
                  ].map(({ label, action }) => (
                    <motion.button
                      key={action}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => handleQuickAmount(action)}
                      className="py-2 bg-white/10 text-white/80 rounded-xl text-xs font-bold hover:bg-white/20 hover:text-white transition-colors border border-white/10"
                    >
                      {label}
                    </motion.button>
                  ))}
                </div>

                {/* Numeric Keypad */}
                <div className="grid grid-cols-3 gap-2">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'BACKSPACE'].map((key) => (
                    <motion.button
                      key={key}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.93 }}
                      onClick={() => handleKeypadPress(key)}
                      className="py-4 bg-white/15 text-white rounded-xl text-xl font-bold hover:bg-white/25 transition-colors border border-white/10 active:bg-white/30"
                    >
                      {key === 'BACKSPACE' ? '⌫' : key}
                    </motion.button>
                  ))}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.93 }}
                    onClick={() => handleKeypadPress('CLEAR')}
                    className="col-span-3 py-3 bg-white/10 text-white/70 rounded-xl text-sm font-bold hover:bg-white/20 hover:text-white transition-colors border border-white/10"
                  >
                    CLEAR
                  </motion.button>
                </div>

                {/* Change Due */}
                <AnimatePresence>
                  {cashReceived && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className={`p-4 rounded-2xl border ${
                        change >= 0
                          ? 'bg-green-500/20 border-green-400/40'
                          : 'bg-red-900/40 border-red-400/40'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-white/80 font-bold text-sm">Change Due</span>
                        <span className={`text-2xl font-black tabular-nums ${change >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                          {change >= 0
                            ? formatCurrency(change, currencyCode)
                            : `-${formatCurrency(Math.abs(change), currencyCode)}`}
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* ── CARD ── */}
            {paymentMethod === 'CARD' && (
              <motion.div
                key="card"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col items-center text-center pt-6 space-y-6"
              >
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-20 h-20 bg-white/15 rounded-full flex items-center justify-center border-2 border-white/30"
                >
                  <CreditCard className="w-10 h-10 text-white" />
                </motion.div>

                <div>
                  <p className="text-white/60 text-sm font-semibold uppercase tracking-wider mb-1">Total to Charge</p>
                  <p className="text-4xl font-black text-white tabular-nums">{formatCurrency(total, currencyCode)}</p>
                </div>

                <div className="w-full bg-white/10 rounded-2xl p-5 border border-white/20 text-left">
                  <p className="text-white/70 text-sm font-medium mb-4">
                    Process payment on your terminal, then confirm below.
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => cardPaymentConfirmed ? setCardPaymentConfirmed(false) : setShowCardConfirmationModal(true)}
                    className={`w-full py-4 rounded-xl font-bold text-base transition-all flex items-center justify-center gap-3 ${
                      cardPaymentConfirmed
                        ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                        : 'bg-white text-primary-600 hover:bg-neutral-50'
                    }`}
                  >
                    {cardPaymentConfirmed ? (
                      <>
                        <Check className="w-5 h-5" />
                        Card Payment Confirmed
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-5 h-5" />
                        Confirm Card Payment
                      </>
                    )}
                  </motion.button>
                  {!cardPaymentConfirmed && (
                    <p className="text-white/50 text-xs text-center mt-2">Click to open confirmation dialog</p>
                  )}
                </div>
              </motion.div>
            )}

            {/* ── SPLIT ── */}
            {paymentMethod === 'SPLIT' && (
              <motion.div
                key="split"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {/* Quick Split Presets */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: '50 / 50', action: () => setSplitPayment({ cash: parseFloat((total / 2).toFixed(2)), card: parseFloat((total / 2).toFixed(2)) }) },
                    { label: 'All Cash', action: () => setSplitPayment({ cash: total, card: 0 }) },
                    { label: 'All Card', action: () => setSplitPayment({ cash: 0, card: total }) },
                  ].map(({ label, action }) => (
                    <motion.button
                      key={label}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={action}
                      className="py-2.5 bg-white/10 text-white/80 rounded-xl text-xs font-bold hover:bg-white/20 hover:text-white transition-colors border border-white/10"
                    >
                      {label}
                    </motion.button>
                  ))}
                </div>

                {/* Cash Amount Input */}
                <div className="bg-white/10 rounded-2xl p-4 border border-white/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Banknote className="w-4 h-4 text-green-300" />
                    <span className="text-white/70 text-sm font-bold">Cash Amount</span>
                    <span className="ml-auto text-white font-black tabular-nums">{formatCurrency(splitPayment.cash, currencyCode)}</span>
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
                        card: Math.max(0, parseFloat((total - cash).toFixed(2))),
                      });
                    }}
                    className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white font-bold text-base focus:border-white/50 focus:outline-none placeholder:text-white/30"
                    placeholder="Enter cash amount"
                  />
                </div>

                {/* Card Amount Input */}
                <div className="bg-white/10 rounded-2xl p-4 border border-white/20">
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="w-4 h-4 text-blue-300" />
                    <span className="text-white/70 text-sm font-bold">Card Amount</span>
                    <span className="ml-auto text-white font-black tabular-nums">{formatCurrency(splitPayment.card, currencyCode)}</span>
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
                        cash: Math.max(0, parseFloat((total - card).toFixed(2))),
                        card: Math.min(card, total),
                      });
                    }}
                    className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white font-bold text-base focus:border-white/50 focus:outline-none placeholder:text-white/30"
                    placeholder="Enter card amount"
                  />
                </div>

                {/* Validation Bar */}
                <div className={`p-3 rounded-xl border text-sm font-bold flex justify-between items-center ${
                  Math.abs(splitPayment.cash + splitPayment.card - total) < 0.01
                    ? 'bg-green-500/20 border-green-400/40 text-green-200'
                    : 'bg-red-900/30 border-red-400/40 text-red-200'
                }`}>
                  <span>
                    {Math.abs(splitPayment.cash + splitPayment.card - total) < 0.01
                      ? '✓ Split matches total'
                      : '⚠ Must equal total'}
                  </span>
                  <span className="tabular-nums">
                    {formatCurrency(splitPayment.cash + splitPayment.card, currencyCode)} / {formatCurrency(total, currencyCode)}
                  </span>
                </div>

                {/* Cash Received for Split */}
                {splitPayment.cash > 0 && (
                  <div className="bg-green-500/10 rounded-2xl p-4 border border-green-400/30">
                    <label className="block text-green-200 text-xs font-bold uppercase tracking-wider mb-2">
                      Cash Received (min {formatCurrency(splitPayment.cash, currencyCode)})
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white/10 border border-green-400/40 rounded-xl text-white font-black text-lg focus:border-green-300 focus:outline-none placeholder:text-white/30"
                      placeholder={splitPayment.cash.toFixed(2)}
                    />
                    {cashReceivedNum >= splitPayment.cash && (
                      <p className="text-green-200 text-sm font-bold mt-2">
                        Change: {formatCurrency(cashReceivedNum - splitPayment.cash, currencyCode)}
                      </p>
                    )}
                  </div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* ── Action Buttons ── */}
        <div className="px-6 pb-6 pt-3 space-y-3 border-t border-white/10 bg-primary-800/60">
          <motion.button
            whileHover={{ scale: isPlaceOrderDisabled ? 1 : 1.01, boxShadow: isPlaceOrderDisabled ? 'none' : '0 20px 40px rgba(0,0,0,0.35)' }}
            whileTap={{ scale: isPlaceOrderDisabled ? 1 : 0.99 }}
            onClick={handlePlaceOrder}
            disabled={isPlaceOrderDisabled}
            className="w-full py-5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-2xl font-black text-xl tracking-wide hover:from-green-600 hover:to-green-700 transition-all flex items-center justify-center gap-3 shadow-xl disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Check className="w-6 h-6" />
            )}
            {isSubmitting ? 'Processing...' : 'Place Order & Print'}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={onBack}
            className="w-full py-3.5 bg-white/10 text-white/80 rounded-2xl font-bold text-base hover:bg-white/20 hover:text-white transition-all flex items-center justify-center gap-2 border border-white/10"
          >
            <ChevronLeft className="w-5 h-5" />
            Back to Menu
          </motion.button>

          {settings.autoPrintReceipt && (
            <div className="flex items-center justify-center gap-2 text-white/40 text-xs font-medium">
              <Printer className="w-3.5 h-3.5" />
              Receipt will print automatically
            </div>
          )}
        </div>
      </motion.div>

      {/* ─────────────────── MODALS (unchanged logic) ─────────────────── */}

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
