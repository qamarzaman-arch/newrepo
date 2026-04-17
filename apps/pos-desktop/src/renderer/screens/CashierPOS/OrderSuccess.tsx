import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  Printer,
  Receipt,
} from 'lucide-react';
import { useOrderStore } from '../../stores/orderStore';

interface OrderSuccessProps {
  onNewOrder: () => void;
}

const OrderSuccess: React.FC<OrderSuccessProps> = ({ onNewOrder }) => {
  const { currentOrder, getTotal } = useOrderStore();
  const [showConfetti, setShowConfetti] = useState(true);

  // Generate order number (in real app, this would come from backend)
  const orderNumber = `#${Math.floor(1000 + Math.random() * 9000)}`;
  const timestamp = new Date().toLocaleString();

  // Hide confetti after animation
  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  // Confetti particles
  const confettiParticles = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 2 + Math.random() * 2,
    color: ['#6ee591', '#50c878', '#45e3d3', '#ffe2ab'][Math.floor(Math.random() * 4)],
  }));

  return (
    <div className="flex h-screen pt-20 bg-gradient-to-br from-gray-50 to-white relative overflow-hidden">
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
                  repeat: Infinity,
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
                  <span className="text-gray-900 font-semibold">{orderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Type:</span>
                  <span className="text-gray-900 font-semibold">{currentOrder.orderType}</span>
                </div>
                {currentOrder.tableId && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Table:</span>
                    <span className="text-primary font-bold">#{currentOrder.tableId}</span>
                  </div>
                )}
                {currentOrder.customerName && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Customer:</span>
                    <span className="text-gray-900 font-semibold">{currentOrder.customerName}</span>
                  </div>
                )}
              </div>

              {/* Items */}
              <div className="border-t border-gray-200 pt-4 space-y-2">
                {currentOrder.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-gray-700">
                      {item.quantity}x {item.name}
                    </span>
                    <span className="text-gray-900 font-semibold">
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="border-t-2 border-gray-300 pt-4">
                <div className="flex justify-between items-center">
                  <span className="font-manrope font-bold text-gray-900">Total</span>
                  <span className="font-manrope text-2xl font-black text-primary">
                    ${getTotal().toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 space-y-3">
              <button
                onClick={() => window.print()}
                className="w-full py-4 bg-gray-100 text-gray-700 rounded-2xl font-manrope font-bold hover:bg-gray-200 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <Printer className="w-5 h-5" />
                Print Receipt
              </button>
              <button
                onClick={onNewOrder}
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
