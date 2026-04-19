import React, { useState } from 'react';
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
  const { currentOrder, getSubtotal, getTotal, getDiscount, getTip, applyDiscount, setTip, setCompletedOrderId, setProcessing } = useOrderStore();
  const { settings } = useSettingsStore();

  const subtotal = getSubtotal();
  const discount = getDiscount();
  const afterDiscount = subtotal - discount;
  const taxRate = settings.taxRate || 8.5;
  const tax = afterDiscount * (taxRate / 100);
  const serviceChargeRate = settings.serviceCharge || 0;
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
      const orderId = orderResponse.data.data.order.id;

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
          taxRate: settings.taxRate || 8.5,
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
    <div className="flex h-full overflow-hidden bg-gray-50">
      {/* Left Side: Payment Details */}
      <div className="flex-1 flex flex-col p-8 overflow-y-auto">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                ✓
              </div>
              <span className="text-gray-500 text-sm">Type</span>
            </div>
            <div className="w-12 h-0.5 bg-primary" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                ✓
              </div>
              <span className="text-gray-500 text-sm">Menu</span>
            </div>
            <div className="w-12 h-0.5 bg-primary" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm">
                3
              </div>
              <span className="text-gray-900 font-bold text-sm">Payment</span>
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="font-manrope text-4xl font-extrabold tracking-tight text-gray-900 mb-2">
            Checkout & Payment
          </h1>
          <p className="text-gray-600 text-lg">Select payment method and complete transaction</p>
        </div>

        {/* Order Summary Card */}
        <div className="bg-white rounded-[2.5rem] p-8 mb-8 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-manrope text-xl font-bold text-gray-900">Order Summary</h2>
            <span className="bg-gray-100 text-gray-600 text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-widest">
              {currentOrder.items.length} Items
            </span>
          </div>

          {/* Items List */}
          <div className="space-y-3 mb-6 max-h-64 overflow-y-auto pr-2">
            {currentOrder.items.map((item) => (
              <div key={item.id} className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">
                    {item.quantity}x {item.name}
                  </p>
                  {item.notes && (
                    <p className="text-xs text-gray-500 mt-1 italic">{item.notes}</p>
                  )}
                </div>
                <span className="text-sm font-manrope font-bold text-gray-900 ml-4">
                  {formatCurrency(item.price * item.quantity, currencyCode)}
                </span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t border-gray-200 pt-6 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="text-gray-900 font-manrope">{formatCurrency(subtotal, currencyCode)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-green-600 font-medium">Discount ({currentOrder.discountPercent}%)</span>
                <span className="text-green-600 font-manrope font-bold">-{formatCurrency(discount, currencyCode)}</span>
              </div>
            )}
            {tip > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-rose-600 font-medium">Tip</span>
                <span className="text-rose-600 font-manrope font-bold">+{formatCurrency(tip, currencyCode)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Tax ({taxRate}%)</span>
              <span className="text-gray-900 font-manrope">{formatCurrency(tax, currencyCode)}</span>
            </div>
            {serviceChargeRate > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Service Charge ({serviceChargeRate}%)</span>
                <span className="text-gray-900 font-manrope">{formatCurrency(serviceCharge, currencyCode)}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-4 border-t border-gray-200">
              <span className="font-manrope text-base font-bold uppercase tracking-widest text-gray-500">
                Total Due
              </span>
              <span className="font-manrope text-4xl font-black text-primary">
                {formatCurrency(total, currencyCode)}
              </span>
            </div>
          </div>
        </div>

        {/* Discount & Tip Buttons */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowDiscountModal(true)}
            className="py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl font-manrope font-bold flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transition-all"
          >
            <Gift className="w-5 h-5" />
            Discount
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowTipModal(true)}
            className="py-4 bg-gradient-to-r from-rose-500 to-orange-500 text-white rounded-2xl font-manrope font-bold flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transition-all"
          >
            <Heart className="w-5 h-5" />
            Tip {tip > 0 ? `(${formatCurrency(tip, currencyCode)})` : ''}
          </motion.button>
        </div>

        {/* Payment Method Selection */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setPaymentMethod('CASH')}
            className={`p-6 rounded-2xl flex flex-col items-center gap-3 transition-all ${
              paymentMethod === 'CASH'
                ? 'bg-gradient-to-br from-primary to-primary-container text-white shadow-xl'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <Banknote className="w-8 h-8" />
            <span className="font-manrope font-bold text-sm uppercase tracking-wider">Cash</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setPaymentMethod('CARD')}
            className={`p-6 rounded-2xl flex flex-col items-center gap-3 transition-all ${
              paymentMethod === 'CARD'
                ? 'bg-gradient-to-br from-primary to-primary-container text-white shadow-xl'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <CreditCard className="w-8 h-8" />
            <span className="font-manrope font-bold text-sm uppercase tracking-wider">Card</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setPaymentMethod('SPLIT')}
            className={`p-6 rounded-2xl flex flex-col items-center gap-3 transition-all ${
              paymentMethod === 'SPLIT'
                ? 'bg-gradient-to-br from-primary to-primary-container text-white shadow-xl'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <Split className="w-8 h-8" />
            <span className="font-manrope font-bold text-sm uppercase tracking-wider">Split</span>
          </motion.button>
        </div>

        {/* Cash Input Section (only for CASH payment) */}
        {paymentMethod === 'CASH' && (
          <div className="bg-white rounded-[2.5rem] p-8 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-manrope text-lg font-bold text-gray-900">
                Cash Received
              </h3>
              <button
                onClick={() => setShowCashCounter(!showCashCounter)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors ${
                  showCashCounter
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Calculator className="w-4 h-4" />
                {showCashCounter ? 'Hide' : 'Show'} Counter
              </button>
            </div>

            {/* Cash Counting Helper */}
            {showCashCounter && (
              <div className="mb-6">
                <CashCountingHelper
                  onTotalCalculated={(total) => setCashReceived(total.toFixed(2))}
                  currencyCode={currencyCode}
                  expectedAmount={total}
                />
              </div>
            )}

            {/* Cash Display */}
            <div className="bg-gray-50 rounded-2xl p-6 mb-4 text-right border border-gray-200">
              <span className="font-manrope text-5xl font-black text-primary">
                {cashReceived ? formatCurrency(cashReceivedNum, currencyCode) : formatCurrency(0, currencyCode)}
              </span>
            </div>

            {/* Quick Amount Buttons */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <button
                onClick={() => handleQuickAmount('exact')}
                className="py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors text-sm"
              >
                Exact Change
              </button>
              <button
                onClick={() => handleQuickAmount('next10')}
                className="py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors text-sm"
              >
                Next {formatCurrency(10, currencyCode).replace(/[0-9.,]/g, '')}10
              </button>
              <button
                onClick={() => handleQuickAmount('next20')}
                className="py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors text-sm"
              >
                Next {formatCurrency(20, currencyCode).replace(/[0-9.,]/g, '')}20
              </button>
            </div>

            {/* Numeric Keypad */}
            <div className="grid grid-cols-3 gap-3">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'BACKSPACE'].map(
                (key) => (
                  <button
                    key={key}
                    onClick={() => handleKeypadPress(key)}
                    className="py-4 bg-gray-100 text-gray-900 rounded-xl font-manrope text-xl font-bold hover:bg-gray-200 transition-all active:scale-95"
                  >
                    {key === 'BACKSPACE' ? '⌫' : key}
                  </button>
                )
              )}
              <button
                onClick={() => handleKeypadPress('CLEAR')}
                className="py-4 bg-red-100 text-red-600 rounded-xl font-manrope text-lg font-bold hover:bg-red-200 transition-all active:scale-95"
              >
                CLEAR
              </button>
            </div>

            {/* Change Due Display */}
            {cashReceived && (
              <div className="mt-6 p-4 bg-primary/10 rounded-2xl border border-primary/30">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">Change Due:</span>
                  <span
                    className={`font-manrope text-3xl font-black ${
                      change >= 0 ? 'text-primary' : 'text-red-500'
                    }`}
                  >
                    {change >= 0 ? formatCurrency(change, currencyCode) : `-${formatCurrency(Math.abs(change), currencyCode)}`}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Card Payment Info */}
        {paymentMethod === 'CARD' && (
          <div className="bg-white rounded-[2.5rem] p-8 text-center shadow-lg border border-gray-100">
            <CreditCard className="w-20 h-20 mx-auto mb-4 text-primary" />
            <h3 className="font-manrope text-xl font-bold text-gray-900 mb-2">
              Card Payment
            </h3>
            <p className="text-gray-600 mb-4">
              Total to charge: <span className="font-bold text-primary">{formatCurrency(total, currencyCode)}</span>
            </p>

            {/* Manual confirmation for non-integrated terminals */}
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
              <p className="text-sm text-gray-600 mb-4">
                For non-integrated terminals: Process payment on your terminal, then confirm below.
              </p>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => cardPaymentConfirmed ? setCardPaymentConfirmed(false) : setShowCardConfirmationModal(true)}
                className={`w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-3 ${
                  cardPaymentConfirmed
                    ? 'bg-green-100 text-green-700 border-2 border-green-500'
                    : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-primary'
                }`}
              >
                {cardPaymentConfirmed ? (
                  <>
                    <Check className="w-6 h-6" />
                    Card Payment Confirmed
                  </>
                ) : (
                  <>
                    <CreditCard className="w-6 h-6" />
                    Process Card Payment
                  </>
                )}
              </motion.button>

              {!cardPaymentConfirmed && (
                <p className="text-xs text-gray-400 mt-3 text-center">
                  Click to open card payment confirmation
                </p>
              )}
            </div>

            <p className="text-xs text-gray-400 mt-4">
              Integrated terminal support coming soon
            </p>
          </div>
        )}

        {/* Split Payment */}
        {paymentMethod === 'SPLIT' && (
          <div className="bg-white rounded-[2.5rem] p-8 shadow-lg border border-gray-100">
            <Split className="w-16 h-16 mx-auto mb-4 text-primary" />
            <h3 className="font-manrope text-xl font-bold text-gray-900 mb-2 text-center">
              Split Payment
            </h3>
            <p className="text-gray-600 mb-6 text-center">
              Divide the payment between cash and card
            </p>

            {/* Split Amount Inputs */}
            <div className="space-y-4 mb-6">
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600 font-medium flex items-center gap-2">
                    <Banknote className="w-5 h-5 text-green-600" />
                    Cash Amount
                  </span>
                  <span className="text-lg font-bold text-gray-900">
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
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 font-semibold focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="Enter cash amount"
                />
              </div>

              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600 font-medium flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-blue-600" />
                    Card Amount
                  </span>
                  <span className="text-lg font-bold text-gray-900">
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
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 font-semibold focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="Enter card amount"
                />
              </div>
            </div>

            {/* Validation */}
            <div className={`p-4 rounded-2xl border-2 ${
              Math.abs(splitPayment.cash + splitPayment.card - total) < 0.01
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex justify-between items-center">
                <span className="font-medium">
                  {Math.abs(splitPayment.cash + splitPayment.card - total) < 0.01
                    ? '✓ Payment split correctly'
                    : '⚠ Split must equal total'}
                </span>
                <span className="font-bold">
                  {formatCurrency(splitPayment.cash + splitPayment.card, currencyCode)}
                  {' / '}
                  {formatCurrency(total, currencyCode)}
                </span>
              </div>
            </div>

            {/* Quick Split Buttons */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <button
                onClick={() => setSplitPayment({ cash: total, card: 0 })}
                className="py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
              >
                All Cash
              </button>
              <button
                onClick={() => setSplitPayment({ cash: 0, card: total })}
                className="py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
              >
                All Card
              </button>
              <button
                onClick={() => setSplitPayment({ cash: Math.ceil(total / 2), card: Math.floor(total / 2) })}
                className="py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
              >
                50/50 Split
              </button>
              <button
                onClick={() => setSplitPayment({ cash: Math.ceil(total / 20) * 10, card: total - Math.ceil(total / 20) * 10 })}
                className="py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
              >
                Round Cash
              </button>
            </div>

            {/* Cash Received Input for Split Payment */}
            {splitPayment.cash > 0 && (
              <div className="mt-6 bg-green-50 rounded-2xl p-4 border border-green-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cash Received
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-green-300 rounded-xl text-gray-900 font-bold text-xl focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder={`Enter cash amount (min: ${formatCurrency(splitPayment.cash, currencyCode)})`}
                />
                {cashReceivedNum >= splitPayment.cash && (
                  <div className="mt-2 text-sm font-semibold text-green-700">
                    Change: {formatCurrency(cashReceivedNum - splitPayment.cash, currencyCode)}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Side: Action Panel */}
      <div className="w-96 bg-[#1c1b1b] flex flex-col shadow-[-20px_0_40px_rgba(0,0,0,0.3)]">
        <div className="flex-1 p-8">
          <h3 className="font-manrope text-xl font-extrabold text-[#e5e2e1] mb-6">
            Complete Transaction
          </h3>

          {/* Transaction Details */}
          <div className="space-y-4 mb-8">
            <div className="flex justify-between items-center p-4 bg-[#2a2a2a] rounded-xl">
              <span className="text-[#bdcabc] text-sm">Payment Method</span>
              <span className="text-[#e5e2e1] font-semibold capitalize">{paymentMethod.toLowerCase()}</span>
            </div>

            {paymentMethod === 'CASH' && cashReceivedNum > 0 && (
              <>
                <div className="flex justify-between items-center p-4 bg-[#2a2a2a] rounded-xl">
                  <span className="text-[#bdcabc] text-sm">Cash Received</span>
                  <span className="text-[#e5e2e1] font-manrope font-bold">
                    {formatCurrency(cashReceivedNum, currencyCode)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-4 bg-[#2a2a2a] rounded-xl">
                  <span className="text-[#bdcabc] text-sm">Change</span>
                  <span
                    className={`font-manrope font-bold ${
                      change >= 0 ? 'text-[#6ee591]' : 'text-red-400'
                    }`}
                  >
                    {change >= 0 ? formatCurrency(change, currencyCode) : 'N/A'}
                  </span>
                </div>
              </>
            )}

            {paymentMethod === 'SPLIT' && (
              <>
                <div className="flex justify-between items-center p-4 bg-[#2a2a2a] rounded-xl">
                  <span className="text-[#bdcabc] text-sm">Cash Portion</span>
                  <span className="text-[#e5e2e1] font-manrope font-bold">
                    {formatCurrency(splitPayment.cash, currencyCode)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-4 bg-[#2a2a2a] rounded-xl">
                  <span className="text-[#bdcabc] text-sm">Card Portion</span>
                  <span className="text-[#e5e2e1] font-manrope font-bold">
                    {formatCurrency(splitPayment.card, currencyCode)}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Place Order Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
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
            className="w-full py-6 bg-gradient-to-br from-[#6ee591] to-[#50c878] text-[#00210c] rounded-2xl font-manrope font-black text-xl tracking-wide hover:opacity-90 transition-all active:scale-95 flex items-center justify-center gap-3 shadow-xl shadow-emerald-950/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <div className="w-6 h-6 border-4 border-black/20 border-t-black rounded-full animate-spin" />
            ) : (
              <Check className="w-6 h-6" />
            )}
            {isSubmitting ? 'Processing...' : 'Place Order & Print'}
          </motion.button>

          {/* Back Button */}
          <button
            onClick={onBack}
            className="w-full mt-4 py-4 bg-[#2a2a2a] text-[#e5e2e1] rounded-2xl font-manrope font-bold text-lg hover:bg-[#353534] transition-all flex items-center justify-center gap-2"
          >
            <ChevronLeft className="w-5 h-5" />
            Back to Menu
          </button>
        </div>

        {/* Footer Info */}
        <div className="p-6 bg-[#0e0e0e] border-t border-white/5">
          <div className="flex items-center gap-3 text-sm text-[#bdcabc]">
            <Printer className="w-4 h-4" />
            <span>Receipt will be printed automatically</span>
          </div>
        </div>
      </div>

      {/* Discount Modal */}
      {showDiscountModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[200]">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl"
          >
            <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <Gift className="w-6 h-6 text-purple-600" />
              Apply Discount
            </h3>

            <div className="space-y-4 mb-6">
              <p className="text-sm text-gray-600">Select a discount percentage:</p>
              <div className="grid grid-cols-4 gap-3">
                {[5, 10, 15, 20, 25, 30, 50, 100].map((percent) => (
                  <motion.button
                    key={percent}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setDiscountPercent(percent)}
                    className={`py-3 rounded-xl font-bold transition-all ${
                      discountPercent === percent
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {percent}%
                  </motion.button>
                ))}
              </div>

              {discountPercent > 0 && (
                <div className="bg-purple-50 p-4 rounded-xl">
                  <p className="text-sm text-gray-600 mb-1">Discount Amount:</p>
                  <p className="text-2xl font-bold text-purple-600">
                    -{formatCurrency(subtotal * (discountPercent / 100), currencyCode)}
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDiscountModal(false);
                  setDiscountPercent(0);
                }}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
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
                className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity"
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
            className="bg-white rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl"
          >
            <h3 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-3">
              <Shield className="w-6 h-6 text-amber-600" />
              Manager Approval Required
            </h3>
            <p className="text-gray-600 mb-6">
              Discounts of {DISCOUNT_PIN_THRESHOLD}% or more require manager approval.
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Enter Manager PIN
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={discountPin}
                  onChange={(e) => setDiscountPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-2xl font-bold text-center tracking-widest text-gray-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                  placeholder="••••••"
                  autoFocus
                />
              </div>

              <div className="bg-amber-50 p-4 rounded-xl">
                <p className="text-sm text-gray-600">Discount to apply:</p>
                <p className="text-2xl font-bold text-amber-600">{pendingDiscountPercent}%</p>
                <p className="text-lg text-amber-700">
                  -{formatCurrency(subtotal * (pendingDiscountPercent / 100), currencyCode)}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDiscountPinModal(false);
                  setDiscountPin('');
                  setPendingDiscountPercent(0);
                }}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={async () => {
                  if (discountPin.length < 4) {
                    toast.error('PIN must be at least 4 digits');
                    return;
                  }
                  
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
                }}
                disabled={discountPin.length < 4}
                className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
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
            className="bg-white rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl"
          >
            <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <Heart className="w-6 h-6 text-rose-600" />
              Add Tip
            </h3>

            <div className="space-y-4 mb-6">
              <p className="text-sm text-gray-600">Select a tip percentage or enter custom amount:</p>
              {/* Percentage buttons */}
              <div className="grid grid-cols-4 gap-3">
                {settings.tipSuggestions?.map((percent: number) => (
                  <motion.button
                    key={percent}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setTipPercent(percent);
                      setCustomTip('');
                    }}
                    className={`py-3 rounded-xl font-bold transition-all ${
                      tipPercent === percent && !customTip
                        ? 'bg-rose-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
                    className={`py-3 rounded-xl font-bold transition-all ${
                    !tipPercent && !customTip
                        ? 'bg-gray-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  No Tip
                </motion.button>
              </div>

              {/* Custom tip input */}
              <div className="bg-gray-50 p-4 rounded-xl">
                <p className="text-sm text-gray-600 mb-2">Custom tip amount:</p>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">{settings.currency === 'USD' ? '$' : settings.currency === 'EUR' ? '€' : settings.currency === 'GBP' ? '£' : settings.currency === 'PKR' ? '₨' : settings.currency === 'INR' ? '₹' : settings.currency === 'BDT' ? '৳' : settings.currency === 'SAR' ? '﷼' : settings.currency === 'AED' ? 'د.إ' : '$'}</span>
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
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 font-semibold focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>
              </div>

              {/* Tip preview */}
              {(tipPercent > 0 || customTip) && (
                <div className="bg-rose-50 p-4 rounded-xl">
                  <p className="text-sm text-gray-600 mb-1">Tip Amount:</p>
                  <p className="text-2xl font-bold text-rose-600">
                    +{formatCurrency(
                      customTip ? parseFloat(customTip) || 0 : (subtotal * tipPercent / 100),
                      currencyCode
                    )}
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowTipModal(false);
                  setTipPercent(0);
                  setCustomTip('');
                }}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  const tipAmount = customTip
                    ? parseFloat(customTip) || 0
                    : (subtotal * tipPercent / 100);
                  setTip(tipAmount);
                  setShowTipModal(false);
                  toast.success(`Tip of ${formatCurrency(tipAmount, currencyCode)} added!`);
                }}
                className="flex-1 py-3 bg-gradient-to-r from-rose-600 to-orange-600 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity"
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
            className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CreditCard className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2 font-manrope">Confirm Card Payment</h3>
              <p className="text-gray-600">Amount: {formatCurrency(total, currencyCode)}</p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Card Last 4 Digits (Optional)
              </label>
              <input
                type="text"
                maxLength={4}
                value={cardLastFour}
                onChange={(e) => setCardLastFour(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter last 4 digits"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none text-center font-mono text-lg tracking-widest"
              />
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-yellow-800 flex items-start gap-2">
                <Shield className="w-5 h-5 flex-shrink-0 mt-0.5" />
                Please ensure the card payment has been successfully processed on your terminal before confirming.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowCardConfirmationModal(false); setCardLastFour(''); }}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={async () => {
                  // Validate card payment via backend/payment gateway
                  const validation = await validationService.validateCardPayment(
                    total,
                    { lastFour: cardLastFour || undefined }
                  );
                  
                  if (validation.success) {
                    setCardPaymentConfirmed(true);
                    setShowCardConfirmationModal(false);
                    toast.success('Card payment confirmed');
                  } else {
                    toast.error(validation.error || 'Card payment validation failed');
                  }
                  setCardLastFour('');
                }}
                className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity"
              >
                Confirm Payment
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default CheckoutPayment;
