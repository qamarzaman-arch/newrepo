import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  Printer,
  Receipt,
} from 'lucide-react';
import { useOrderStore } from '../../stores/orderStore';
import { getHardwareManager } from '../../services/hardwareManager';
import { useSettingsStore } from '../../stores/settingsStore';
import { useCurrencyFormatter } from '../../hooks/useCurrency';
import toast from 'react-hot-toast';

interface OrderSuccessProps {
  onNewOrder: () => void;
  change?: number;
}

const OrderSuccess: React.FC<OrderSuccessProps> = ({ onNewOrder, change = 0 }) => {
  const { currentOrder, getTotal, clearOrder } = useOrderStore();
  const { settings } = useSettingsStore();
  const { formatCurrency } = useCurrencyFormatter();
  const [showConfetti, setShowConfetti] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);

  // Use real order ID from store (set by KitchenDispatchConfirmation or CheckoutPayment)
  const orderNumber = currentOrder.completedOrderId
    ? `#${currentOrder.completedOrderId.slice(-4)}`
    : `#${Math.floor(1000 + Math.random() * 9000)}`;
  const timestamp = new Date().toLocaleString();

  // Snapshot receipt data before any clearOrder happens
  const receiptData = React.useMemo(() => ({
    items: [...currentOrder.items],
    orderType: currentOrder.orderType,
    tableId: currentOrder.tableId,
    tableNumber: currentOrder.tableNumber,
    customerName: currentOrder.customerName,
    total: getTotal(),
    orderNumber,
    timestamp,
  }), [currentOrder.items, currentOrder.orderType, currentOrder.tableId, currentOrder.tableNumber, currentOrder.customerName, getTotal, orderNumber, timestamp]);

  // Hide confetti after animation
  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  // Auto-print receipt if enabled in settings
  useEffect(() => {
    const autoPrintReceipt = async () => {
      if (settings.autoPrintReceipt) {
        setIsPrinting(true);
        try {
          const hw = getHardwareManager();
          await hw.printReceipt({
            restaurantName: settings.restaurantName || 'POSLytic Restaurant',
            restaurantAddress: settings.address || '',
            restaurantPhone: settings.phone || '',
            orderNumber: receiptData.orderNumber,
            cashierName: receiptData.customerName || 'Cashier',
            items: receiptData.items.map(item => ({
              name: item.name,
              quantity: item.quantity,
              price: item.price,
              notes: item.notes,
            })),
            subtotal: receiptData.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
            tax: 0,
            taxRate: settings.taxRate || 8.5,
            discount: 0,
            total: receiptData.total,
            paymentMethod: 'CASH',
            change: change,
          });
          toast.success('Receipt printed automatically!');
        } catch (error) {
          console.error('Auto-print failed:', error);
          toast.error('Auto-print failed. Please print manually.');
        } finally {
          setIsPrinting(false);
        }
      }
    };

    // Small delay to ensure UI is ready
    const timer = setTimeout(autoPrintReceipt, 500);
    return () => clearTimeout(timer);
  }, [settings.autoPrintReceipt, settings.restaurantName, settings.address, settings.phone, settings.taxRate, receiptData, change]);

  // Confetti particles
  const confettiParticles = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 2 + Math.random() * 2,
    color: ['#6ee591', '#50c878', '#45e3d3', '#ffe2ab'][Math.floor(Math.random() * 4)],
  }));

  return (
    <div className="flex h-full overflow-y-auto bg-gradient-to-br from-gray-50 to-white relative overflow-hidden">
      {/* Confetti Animation */}
      <AnimatePresence>
        {showConfetti && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {confettiParticles.map((particle) => (
              <motion.div
                key={particle.id}
                initial={{ y: -20, opacity: 1 }}
                animate={{ y: '100vh', opacity: 0 }}
                transition={{
                  duration: particle.duration,
                  delay: particle.delay,
                  ease: 'easeOut',
                }}
                style={{
                  position: 'absolute',
                  left: `${particle.x}%`,
                  width: '8px',
                  height: '8px',
                  backgroundColor: particle.color,
                  borderRadius: '50%',
                }}
              />
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 z-10">
        {/* Success Icon */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 15, stiffness: 200 }}
          className="w-32 h-32 rounded-full bg-primary flex items-center justify-center mb-8 shadow-2xl"
        >
          <Check className="w-16 h-16 text-white" strokeWidth={3} />
        </motion.div>

        {/* Success Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-12"
        >
          <h1 className="font-manrope text-5xl font-black tracking-tight text-gray-900 mb-2">
            Order Complete!
          </h1>
          <p className="text-gray-600 text-xl">
            Your order has been successfully placed
          </p>
        </motion.div>

        {/* Receipt Card */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="w-full max-w-md"
        >
          <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl border border-gray-200">
            {/* Receipt Header */}
            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-200">
              <Receipt className="w-6 h-6 text-primary" />
              <h2 className="font-manrope text-xl font-bold text-gray-900">Receipt Preview</h2>
            </div>

            {/* Receipt Content */}
            <div className="bg-gray-50 rounded-2xl p-6 space-y-4 border border-gray-200">
              {/* Restaurant Info */}
              <div className="text-center pb-4 border-b border-gray-200">
                <h3 className="font-manrope text-lg font-bold text-primary">POSLytic</h3>
                <p className="text-xs text-gray-500 mt-1">Restaurant Management System</p>
                <p className="text-xs text-gray-500">{timestamp}</p>
              </div>

              {/* Order Details */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Order #:</span>
                  <span className="text-gray-900 font-semibold">{receiptData.orderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Type:</span>
                  <span className="text-gray-900 font-semibold">
                    {receiptData.orderType === 'DINE_IN' ? 'Dine-In' :
                     receiptData.orderType === 'TAKEAWAY' ? 'Takeaway' :
                     receiptData.orderType === 'DELIVERY' ? 'Delivery' :
                     receiptData.orderType === 'PICKUP' ? 'Pickup' :
                     receiptData.orderType}
                  </span>
                </div>
                {receiptData.tableNumber && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Table:</span>
                    <span className="text-primary font-bold">#{receiptData.tableNumber}</span>
                  </div>
                )}
                {receiptData.customerName && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Customer:</span>
                    <span className="text-gray-900 font-semibold">{receiptData.customerName}</span>
                  </div>
                )}
              </div>

              {/* Items */}
              <div className="border-t border-gray-200 pt-4 space-y-2">
                {receiptData.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-gray-700">
                      {item.quantity}x {item.name}
                    </span>
                    <span className="text-gray-900 font-semibold">
                      {formatCurrency(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="border-t-2 border-gray-300 pt-4">
                <div className="flex justify-between items-center">
                  <span className="font-manrope font-bold text-gray-900">Total</span>
                  <span className="font-manrope text-2xl font-black text-primary">
                    {formatCurrency(receiptData.total)}
                  </span>
                </div>
              </div>

              {/* Loyalty Points */}
              <div className="mt-4 p-4 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">⭐</span>
                    <span className="text-sm font-semibold text-amber-800">Loyalty Points Earned</span>
                  </div>
                  <span className="text-2xl font-black text-amber-600">
                    +{Math.floor(receiptData.total)}
                  </span>
                </div>
                <p className="text-xs text-amber-600 mt-1">
                  1 point per $1 spent. Points can be redeemed on future orders.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 space-y-3">
              <button
                onClick={async () => {
                  setIsPrinting(true);
                  try {
                    const hw = getHardwareManager();
                    await hw.printReceipt({
                      restaurantName: settings.restaurantName || 'POSLytic Restaurant',
                      restaurantAddress: settings.address || '',
                      restaurantPhone: settings.phone || '',
                      orderNumber: receiptData.orderNumber,
                      cashierName: receiptData.customerName || 'Cashier',
                      items: receiptData.items.map(item => ({
                        name: item.name,
                        quantity: item.quantity,
                        price: item.price,
                        notes: item.notes,
                      })),
                      subtotal: receiptData.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
                      tax: 0, // Tax is already included in total
                      taxRate: settings.taxRate || 8.5,
                      discount: 0,
                      total: receiptData.total,
                      paymentMethod: 'CASH', // Default since we don't track payment method here
                      change: change,
                    });
                    toast.success('Receipt printed!');
                  } catch (error) {
                    console.error('Print error:', error);
                    // Fallback to browser print
                    window.print();
                  } finally {
                    setIsPrinting(false);
                  }
                }}
                disabled={isPrinting}
                className="w-full py-4 bg-gray-100 text-gray-700 rounded-2xl font-manrope font-bold hover:bg-gray-200 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isPrinting ? (
                  <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Printer className="w-5 h-5" />
                )}
                {isPrinting ? 'Printing...' : 'Print Receipt'}
              </button>
              <button
                onClick={() => { clearOrder(); onNewOrder(); }}
                className="w-full py-4 bg-gradient-to-br from-primary to-primary-container text-white rounded-2xl font-manrope font-bold shadow-lg hover:shadow-xl transition-all active:scale-95"
              >
                Start New Order
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default OrderSuccess;
