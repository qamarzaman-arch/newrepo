import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  CreditCard,
  Banknote,
  Split,
  ChevronLeft,
  Printer,
  Check,
  Gift,
} from 'lucide-react';
import { useOrderStore } from '../../stores/orderStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { formatCurrency } from '../../utils/currency';
import { orderService } from '../../services/orderService';
import toast from 'react-hot-toast';

interface CheckoutPaymentProps {
  onBack: () => void;
  onComplete: () => void;
}

const CheckoutPayment: React.FC<CheckoutPaymentProps> = ({ onBack, onComplete }) => {
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'SPLIT'>('CASH');
  const [cashReceived, setCashReceived] = useState('');
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { currentOrder, getSubtotal, getTotal, getDiscount, applyDiscount } = useOrderStore();
  const { settings } = useSettingsStore();

  const subtotal = getSubtotal();
  const discount = getDiscount();
  const afterDiscount = subtotal - discount;
  const taxRate = settings.taxRate || 8.5;
  const tax = afterDiscount * (taxRate / 100);
  const total = getTotal();
  const currencyCode = settings.currency || 'USD';

  const cashReceivedNum = parseFloat(cashReceived) || 0;
  const change = cashReceivedNum - total;

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
    if (paymentMethod === 'CASH' && cashReceivedNum < total) {
      toast.error('Cash received is less than total amount');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Create the order
      const orderResponse = await orderService.createOrder({
        orderType: currentOrder.orderType as any,
        tableId: currentOrder.tableId,
        customerId: currentOrder.customerId,
        customerName: currentOrder.customerName,
        customerPhone: currentOrder.customerPhone,
        notes: currentOrder.notes,
        items: currentOrder.items.map(item => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          notes: item.notes,
          modifiers: item.modifiers,
        })),
      });

      const orderId = orderResponse.data.data.order.id;

      // 2. Process the payment
      await orderService.processPayment(orderId, {
        method: paymentMethod,
        amount: total,
        notes: paymentMethod === 'CASH' ? `Cash received: ${cashReceived}` : undefined,
      });

      toast.success('Order placed and paid successfully!');
      onComplete();
    } catch (error: any) {
      console.error('Failed to place order:', error);
      toast.error(error.response?.data?.message || 'Failed to place order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen pt-20 bg-gray-50">
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
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Tax ({taxRate}%)</span>
              <span className="text-gray-900 font-manrope">{formatCurrency(tax, currencyCode)}</span>
            </div>
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

        {/* Discount Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowDiscountModal(true)}
          className="w-full mb-6 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl font-manrope font-bold flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transition-all"
        >
          <Gift className="w-5 h-5" />
          Apply Discount
        </motion.button>

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
            <h3 className="font-manrope text-lg font-bold text-gray-900 mb-4">
              Cash Received
            </h3>

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
                Next $10
              </button>
              <button
                onClick={() => handleQuickAmount('next20')}
                className="py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors text-sm"
              >
                Next $20
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
                    ${Math.abs(change).toFixed(2)}
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
              Ready for Card Payment
            </h3>
            <p className="text-gray-600 mb-6">
              Insert or tap card on the payment terminal
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              <span className="text-primary text-sm font-semibold">Waiting for terminal...</span>
            </div>
          </div>
        )}

        {/* Split Payment Info */}
        {paymentMethod === 'SPLIT' && (
          <div className="bg-[#1c1b1b] rounded-[2.5rem] p-8 text-center">
            <Split className="w-20 h-20 mx-auto mb-4 text-[#6ee591]" />
            <h3 className="font-manrope text-xl font-bold text-[#e5e2e1] mb-2">
              Split Payment
            </h3>
            <p className="text-[#bdcabc] mb-6">
              This feature allows dividing the bill across multiple payment methods
            </p>
            <button className="px-6 py-3 bg-[#2a2a2a] text-[#e5e2e1] rounded-xl font-semibold hover:bg-[#353534] transition-colors">
              Configure Split Payment
            </button>
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
          </div>

          {/* Place Order Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handlePlaceOrder}
            disabled={isSubmitting || (paymentMethod === 'CASH' && cashReceivedNum < total)}
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
                  applyDiscount(discountPercent);
                  setShowDiscountModal(false);
                  toast.success(`Discount of ${discountPercent}% applied!`);
                }}
                className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity"
              >
                Apply Discount
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default CheckoutPayment;
