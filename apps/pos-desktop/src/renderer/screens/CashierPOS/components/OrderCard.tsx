import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Edit, Eye, Send, CheckCircle, DollarSign, XCircle } from 'lucide-react';
import { useCurrencyFormatter } from '../../../hooks/useCurrency';

interface OrderCardProps {
  order: {
    id: string;
    orderNumber: string;
    status: string;
    orderType: string;
    customerName?: string;
    tableNumber?: string;
    totalAmount: number;
    items: Array<{
      name: string;
      quantity: number;
    }>;
    createdAt: string;
  };
  onView: () => void;
  onEdit: () => void;
  onPay: () => void;
  onComplete: () => void;
  onCancel: () => void;
}

export const OrderCard: React.FC<OrderCardProps> = ({
  order,
  onView,
  onEdit,
  onPay,
  onComplete,
  onCancel,
}) => {
  const { formatCurrency } = useCurrencyFormatter();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-amber-100 text-amber-700';
      case 'PREPARING':
        return 'bg-blue-100 text-blue-700';
      case 'READY':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getOrderTypeIcon = (type: string) => {
    switch (type) {
      case 'DINE_IN':
        return '🪑';
      case 'WALK_IN':
        return '🚶';
      case 'TAKEAWAY':
        return '🥡';
      case 'DELIVERY':
        return '🛵';
      case 'PICKUP':
        return '📦';
      default:
        return '📝';
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">{getOrderTypeIcon(order.orderType)}</span>
            <span className="font-bold text-gray-900">{order.orderNumber}</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
              {order.status}
            </span>
          </div>
          <span className="text-sm text-gray-500">
            {new Date(order.createdAt).toLocaleTimeString()}
          </span>
        </div>

        {/* Customer/Table Info */}
        <div className="text-sm text-gray-600 mb-3">
          {order.tableNumber ? `Table ${order.tableNumber}` : order.customerName || 'Walk-in'}
        </div>

        {/* Items Preview */}
        <div className="text-sm text-gray-500 mb-4">
          {order.items.slice(0, 3).map((item, i) => (
            <span key={i} className="inline-block mr-3">
              {item.quantity}x {item.name}
            </span>
          ))}
          {order.items.length > 3 && (
            <span className="text-gray-400">+{order.items.length - 3} more</span>
          )}
        </div>

        {/* Total */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-lg font-black text-gray-900">
            {formatCurrency(order.totalAmount)}
          </span>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={onView}
            className="flex-1 min-w-[80px] px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-1"
          >
            <Eye size={16} />
            View
          </button>
          <button
            onClick={onEdit}
            className="flex-1 min-w-[80px] px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-1"
          >
            <Edit size={16} />
            Edit
          </button>
          <button
            onClick={onPay}
            className="flex-1 min-w-[80px] px-3 py-2 bg-green-50 hover:bg-green-100 text-green-600 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-1"
          >
            <DollarSign size={16} />
            Pay
          </button>
          {order.status === 'READY' && (
            <button
              onClick={onComplete}
              className="flex-1 min-w-[80px] px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-1"
            >
              <CheckCircle size={16} />
              Complete
            </button>
          )}
          <button
            onClick={onCancel}
            className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-sm font-medium transition-colors"
          >
            <XCircle size={16} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};
