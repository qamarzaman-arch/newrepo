import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CookingPot, AlertCircle } from 'lucide-react';
import { useOrderStore } from '../../stores/orderStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { getHardwareManager } from '../../services/hardwareManager';
import { orderService } from '../../services/orderService';
import toast from 'react-hot-toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const KitchenDispatchConfirmation: React.FC<Props> = ({ isOpen, onClose, onConfirm }) => {
  const { currentOrder, setOrderId } = useOrderStore();
  const { settings } = useSettingsStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getOrderTypeLabel = (orderType: string) => {
    const labels: Record<string, string> = {
      'DINE_IN': 'Dine-In',
      'WALK_IN': 'Walk-In',
      'TAKEAWAY': 'Take Away',
      'PICKUP': 'Pickup',
      'DELIVERY': 'Delivery',
      'RESERVATION': 'Reservation',
    };
    return labels[orderType] || orderType;
  };

  const handleConfirm = async () => {
    if (currentOrder.items.length === 0) {
      toast.error('No items to send');
      return;
    }

    setIsSubmitting(true);
    try {
      // Create order immediately so it appears in kitchen and cashier screens
      const orderData = {
        orderType: currentOrder.orderType,
        tableId: currentOrder.tableId,
        customerId: currentOrder.customerId,
        customerName: currentOrder.customerName,
        customerPhone: currentOrder.customerPhone,
        items: currentOrder.items.map((item) => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          notes: item.notes,
          modifiers: item.modifiers,
        })),
        notes: currentOrder.notes,
      };

      const response = await orderService.createOrder(orderData);
      const createdOrder = response.data?.order;

      if (!response.success || !createdOrder) {
        throw new Error(response.error?.message || 'Failed to create order');
      }

      // Store order ID in order store for later payment processing
      setOrderId(createdOrder.id);

      // Print KOT if enabled
      if (settings.autoPrintKOT) {
        const hw = getHardwareManager();
        const kotData = {
          ticketNumber: `KOT-${Date.now().toString().slice(-6)}`,
          orderNumber: createdOrder.orderNumber,
          tableNumber: currentOrder.tableNumber,
          orderType: currentOrder.orderType,
          items: currentOrder.items.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            notes: item.notes,
          })),
          specialInstructions: currentOrder.notes,
        };
        await hw.printKOT(kotData);
      }

      toast.success('Order sent to kitchen! Proceed to checkout.');
      onConfirm();
    } catch (error: any) {
      console.error('Kitchen dispatch error:', error);
      toast.error(error.response?.data?.message || 'Failed to send order to kitchen');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-200"
          >
            {/* Header */}
            <div className="p-8 pb-6 border-b border-gray-200">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-primary-100 flex items-center justify-center">
                    <CookingPot className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-manrope text-2xl font-extrabold text-gray-900 tracking-tight">
                      Send to Kitchen?
                    </h2>
                    <p className="text-gray-600 text-sm mt-1">
                      This will notify the kitchen staff to start preparing these items
                    </p>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="p-2 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </motion.button>
              </div>
            </div>

            {/* Order Details */}
            <div className="px-8 py-4 bg-gray-50 border-b border-gray-200">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-sm">Order Type:</span>
                  <span className="text-gray-900 font-semibold">{getOrderTypeLabel(currentOrder.orderType)}</span>
                </div>
                {currentOrder.tableNumber && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 text-sm">Table:</span>
                    <span className="text-primary font-bold">#{currentOrder.tableNumber}</span>
                  </div>
                )}
                {currentOrder.customerName && (
                  <div className="flex items-center gap-2 col-span-2">
                    <span className="text-gray-500 text-sm">Customer:</span>
                    <span className="text-gray-900 font-semibold">{currentOrder.customerName}</span>
                  </div>
                )}
                <div className="col-span-2 rounded-2xl bg-red-50 p-3 text-sm text-red-900">
                  Review this order once before sending. Kitchen receives it immediately after confirmation.
                </div>
              </div>
            </div>

            {/* Items List */}
            <div className="p-8">
              <h3 className="font-manrope text-lg font-bold text-gray-900 mb-4">
                Items to Prepare ({currentOrder.items.length})
              </h3>
              <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                {currentOrder.items.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-gray-50 rounded-2xl p-4 flex items-center gap-4 border border-gray-200"
                  >
                    <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center text-primary font-bold text-lg">
                      {item.quantity}x
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{item.name}</p>
                      {item.notes && (
                        <p className="text-xs text-gray-500 mt-1 italic">Note: {item.notes}</p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>

              {currentOrder.notes && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl flex gap-3"
                >
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-blue-900">Special Instructions</p>
                    <p className="text-sm text-blue-700 mt-1">{currentOrder.notes}</p>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Actions */}
            <div className="p-8 pt-0 flex gap-3 border-t border-gray-200 bg-gray-50">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-2xl font-manrope font-bold hover:bg-gray-200 transition-all active:scale-95 disabled:opacity-50"
              >
                Cancel
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleConfirm}
                disabled={isSubmitting}
                className="flex-1 py-4 bg-gradient-to-br from-primary to-primary-container text-white rounded-2xl font-manrope font-bold shadow-lg hover:shadow-xl transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <CookingPot className="w-5 h-5" />
                    Confirm & Send
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default KitchenDispatchConfirmation;
