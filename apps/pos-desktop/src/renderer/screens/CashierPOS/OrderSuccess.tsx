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
  // Fallback to timestamp-based number for uniqueness if no order ID exists
  const orderNumber = currentOrder.completedOrderId
    ? `#${currentOrder.completedOrderId.slice(-4)}`
    : `#${Date.now().toString().slice(-4)}`;
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
            taxRate: settings.taxRate || 0,
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

  // Confetti particles — red & white theme
  const confettiParticles = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 2 + Math.random() * 2,
    color: ['#E53935', '#D32F2F', '#ffffff', '#EF9A9A', '#FFCDD2'][Math.floor(Math.random() * 5)],
    shape: Math.random() > 0.5 ? '50%' : '2px',
  }));

  const orderTypeLabel =
    receiptData.orderType === 'DINE_IN' ? 'Dine-In' :
    receiptData.orderType === 'PICKUP' ? 'Pickup' :
    receiptData.orderType === 'TAKEAWAY' ? 'Takeaway' :
    receiptData.orderType === 'DELIVERY' ? 'Delivery' :
    receiptData.orderType === 'RESERVATION' ? 'Reservation' :
    receiptData.orderType ?? '';

  return (
    <div className="flex h-full overflow-y-auto bg-neutral-50 relative">
      {/* Confetti Animation */}
      <AnimatePresence>
        {showConfetti && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
            {confettiParticles.map((particle) => (
              <motion.div
                key={particle.id}
                initial={{ y: -20, opacity: 1, rotate: 0 }}
                animate={{ y: '100vh', opacity: 0, rotate: 360 }}
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
                  borderRadius: particle.shape,
                }}
              />
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-start px-6 py-8 z-10 max-w-lg mx-auto w-full">

        {/* Success Checkmark */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.1 }}
          className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-600 to-primary-700 flex items-center justify-center mb-5 shadow-2xl shadow-primary-600/40"
        >
          <Check className="w-12 h-12 text-white" strokeWidth={3} />
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="text-center mb-6"
        >
          <h1 className="text-3xl font-black tracking-tight text-neutral-900 mb-1">
            Order Placed Successfully
          </h1>
          <div className="flex items-center justify-center gap-2 text-sm text-neutral-500 font-medium flex-wrap">
            <span className="font-bold text-primary-600">{receiptData.orderNumber}</span>
            {orderTypeLabel && (
              <>
                <span className="text-neutral-300">•</span>
                <span>{orderTypeLabel}</span>
              </>
            )}
            {receiptData.tableNumber && (
              <>
                <span className="text-neutral-300">•</span>
                <span>Table {receiptData.tableNumber}</span>
              </>
            )}
            {receiptData.customerName && (
              <>
                <span className="text-neutral-300">•</span>
                <span>{receiptData.customerName}</span>
              </>
            )}
          </div>
        </motion.div>

        {/* Stat Cards: Total Paid + Change Due */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="w-full grid grid-cols-2 gap-3 mb-6"
        >
          <div className="bg-white rounded-2xl p-4 border border-neutral-200 shadow-sm text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1">Total Paid</p>
            <p className="text-2xl font-black text-primary-600 tabular-nums">
              {formatCurrency(receiptData.total)}
            </p>
          </div>
          {change > 0 ? (
            <div className="bg-green-50 rounded-2xl p-4 border border-green-200 shadow-sm text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-green-500 mb-1">Change Due</p>
              <p className="text-2xl font-black text-green-600 tabular-nums">
                {formatCurrency(change)}
              </p>
            </div>
          ) : (
            <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-200 shadow-sm text-center flex flex-col items-center justify-center">
              <p className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1">Change Due</p>
              <p className="text-2xl font-black text-neutral-300 tabular-nums">—</p>
            </div>
          )}
        </motion.div>

        {/* Receipt */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="w-full bg-white rounded-2xl border border-neutral-200 shadow-sm mb-5 overflow-hidden"
        >
          {/* Receipt header */}
          <div className="px-5 py-3 border-b border-neutral-100 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-neutral-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Receipt</span>
            <span className="ml-auto text-xs text-neutral-400">{receiptData.timestamp}</span>
          </div>

          {/* Items */}
          <div className="px-5 py-3 space-y-2">
            {receiptData.items.map((item) => (
              <div key={item.id} className="flex justify-between items-baseline text-sm">
                <span className="text-neutral-700">
                  <span className="font-bold text-neutral-500 mr-1">{item.quantity}x</span>
                  {item.name}
                </span>
                <span className="text-neutral-900 font-semibold tabular-nums ml-3">
                  {formatCurrency(item.price * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          {/* Total line */}
          <div className="px-5 py-3 border-t-2 border-neutral-100 flex justify-between items-center">
            <span className="font-black text-neutral-800 text-sm uppercase tracking-wide">Total</span>
            <span className="text-xl font-black text-primary-600 tabular-nums">
              {formatCurrency(receiptData.total)}
            </span>
          </div>

          {/* Loyalty — compact single line */}
          <div className="px-5 py-2.5 bg-amber-50 border-t border-amber-100 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-base">⭐</span>
              <span className="text-xs font-semibold text-amber-700">Loyalty Points Earned</span>
            </div>
            <span className="text-sm font-black text-amber-600">+{Math.floor(receiptData.total)} pts</span>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="w-full space-y-3"
        >
          {/* Print Receipt */}
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
                  taxRate: settings.taxRate || 0,
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
            className="w-full py-3.5 bg-white border-2 border-neutral-200 text-neutral-700 rounded-2xl font-bold text-sm hover:bg-neutral-50 hover:border-neutral-300 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isPrinting ? (
              <div className="w-4 h-4 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Printer className="w-4 h-4" />
            )}
            {isPrinting ? 'Printing...' : 'Print Receipt'}
          </button>

          {/* Auto-print notice */}
          {settings.autoPrintReceipt && (
            <p className="text-center text-xs text-neutral-400 font-medium -mt-1">
              Receipt printed automatically
            </p>
          )}

          {/* Start New Order — BIG red pulse button */}
          <motion.button
            animate={{ boxShadow: ['0 0 0 0 rgba(229, 57, 53, 0.4)', '0 0 0 12px rgba(229, 57, 53, 0)', '0 0 0 0 rgba(229, 57, 53, 0)'] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => { clearOrder(); onNewOrder(); }}
            className="w-full py-5 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-2xl font-black text-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3"
          >
            <span className="text-2xl leading-none">▶</span>
            Start New Order
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
};

export default OrderSuccess;
