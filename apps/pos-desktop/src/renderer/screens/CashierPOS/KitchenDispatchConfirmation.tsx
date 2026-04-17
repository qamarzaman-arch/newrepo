import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CookingPot } from 'lucide-react';
import { useOrderStore } from '../../stores/orderStore';

interface KitchenDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const KitchenDispatchModal: React.FC<KitchenDispatchModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const { currentOrder } = useOrderStore();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop with blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/70 backdrop-blur-md"
        />

        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-200"
        >
          {/* Header */}
          <div className="p-8 pb-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center">
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
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Order Details */}
          <div className="px-8 py-4 bg-gray-50 border-b border-gray-200">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Order Type:</span>
                <span className="text-gray-900 font-semibold">{currentOrder.orderType}</span>
              </div>
              {currentOrder.tableId && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Table:</span>
                  <span className="text-primary font-bold">#{currentOrder.tableId}</span>
                </div>
              )}
              {currentOrder.customerName && (
                <div className="flex items-center gap-2 col-span-2">
                  <span className="text-gray-500">Customer:</span>
                  <span className="text-gray-900 font-semibold">{currentOrder.customerName}</span>
                </div>
              )}
            </div>
          </div>

          {/* Items List */}
          <div className="p-8">
            <h3 className="font-manrope text-lg font-bold text-gray-900 mb-4">
              Items to Prepare ({currentOrder.items.length})
            </h3>
            <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
              {currentOrder.items.map((item) => (
                <div
                  key={item.id}
                  className="bg-gray-50 rounded-2xl p-4 flex items-center gap-4 border border-gray-200"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                    {item.quantity}x
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{item.name}</p>
                    {item.notes && (
                      <p className="text-xs text-gray-500 mt-1 italic">{item.notes}</p>
                    )}
                  </div>
                  <span className="font-manrope font-bold text-gray-900">
                    ${(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="p-8 pt-0 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-2xl font-manrope font-bold hover:bg-gray-200 transition-all active:scale-95"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 py-4 bg-gradient-to-br from-primary to-primary-container text-white rounded-2xl font-manrope font-bold shadow-lg hover:shadow-xl transition-all active:scale-95"
            >
              Confirm & Send
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default KitchenDispatchModal;
