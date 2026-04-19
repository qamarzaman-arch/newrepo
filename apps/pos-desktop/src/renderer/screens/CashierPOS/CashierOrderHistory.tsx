import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, Printer, Eye, Calendar, DollarSign, X, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { orderService } from '../../services/orderService';
import { getHardwareManager } from '../../services/hardwareManager';
import { useSettingsStore } from '../../stores/settingsStore';
import { useAuthStore } from '../../stores/authStore';
import { formatCurrency } from '../../utils/currency';
import RefundModal from '../../components/RefundModal';
import toast from 'react-hot-toast';

const CashierOrderHistory: React.FC = () => {
  const { settings } = useSettingsStore();
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [dateFilter, setDateFilter] = useState('today');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [orderTypeFilter, setOrderTypeFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [isPrinting, setIsPrinting] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundOrder, setRefundOrder] = useState<any>(null);
  const ordersPerPage = 10;

  const { data: ordersData, isLoading, refetch } = useQuery({
    queryKey: ['cashier-order-history', dateFilter, paymentFilter, orderTypeFilter, currentPage],
    queryFn: async () => {
      const params: any = {
        page: currentPage,
        limit: ordersPerPage,
        status: 'COMPLETED,REFUNDED,PARTIALLY_REFUNDED,CANCELLED',
      };

      if (dateFilter === 'today') {
        params.startDate = new Date().toISOString().split('T')[0];
      } else if (dateFilter === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        params.startDate = weekAgo.toISOString().split('T')[0];
      } else if (dateFilter === 'month') {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        params.startDate = monthAgo.toISOString().split('T')[0];
      }

      if (paymentFilter !== 'all') params.paymentMethod = paymentFilter;
      if (orderTypeFilter !== 'all') params.orderType = orderTypeFilter;

      const response = await orderService.getOrders(params);
      return response.data.data;
    },
    refetchInterval: 30000,
  });

  const orders = ordersData?.orders || [];
  const totalPages = Math.ceil((ordersData?.pagination?.total || 0) / ordersPerPage);

  const filteredOrders = orders.filter((order: any) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      order.id.toLowerCase().includes(query) ||
      order.customerName?.toLowerCase().includes(query) ||
      order.tableNumber?.toLowerCase().includes(query)
    );
  });

  const handlePrintReceipt = async (order: any) => {
    setIsPrinting(true);
    try {
      const hw = getHardwareManager();
      await hw.printReceipt({
        restaurantName: settings.restaurantName || 'POSLytic Restaurant',
        restaurantAddress: settings.address || '',
        restaurantPhone: settings.phone || '',
        orderNumber: `#${order.id.slice(-4)}`,
        cashierName: user?.fullName || 'Cashier',
        items: order.items.map((item: any) => ({
          name: item.menuItem?.name || item.name || 'Unknown Item',
          quantity: item.quantity,
          price: item.price,
          notes: item.notes,
        })),
        subtotal: order.subtotal || 0,
        tax: order.tax || 0,
        taxRate: settings.taxRate || 8.5,
        discount: order.discount || 0,
        total: order.total,
        paymentMethod: order.payments?.[0]?.method || 'CASH',
        change: 0,
      });
      toast.success('Receipt printed!');
    } catch (error) {
      console.error('Print error:', error);
      toast.error('Failed to print receipt');
    } finally {
      setIsPrinting(false);
    }
  };

  const getOrderTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      DINE_IN: 'Dine-In',
      WALK_IN: 'Walk-In',
      TAKEAWAY: 'Take Away',
      DELIVERY: 'Delivery',
    };
    return labels[type] || type;
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      CASH: 'Cash',
      CARD: 'Card',
      CREDIT: 'Credit',
      SPLIT: 'Split',
    };
    return labels[method] || method;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      COMPLETED: 'bg-green-100 text-green-700',
      REFUNDED: 'bg-red-100 text-red-700',
      PARTIALLY_REFUNDED: 'bg-orange-100 text-orange-700',
      CANCELLED: 'bg-gray-100 text-gray-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      COMPLETED: 'Completed',
      REFUNDED: 'Fully Refunded',
      PARTIALLY_REFUNDED: 'Partially Refunded',
      CANCELLED: 'Cancelled',
    };
    return labels[status] || status;
  };

  // Refund time limit check (24 hours)
  const canRefundOrder = (order: any) => {
    const orderDate = new Date(order.createdAt);
    const now = new Date();
    const hoursDiff = (now.getTime() - orderDate.getTime()) / (1000 * 60 * 60);
    return hoursDiff <= 24;
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Order History</h1>
            <p className="text-sm text-gray-500 mt-1">View and manage past orders</p>
          </div>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-primary text-white rounded-xl font-semibold hover:opacity-90 transition-opacity"
          >
            Refresh
          </button>
        </div>

        {/* Search & Filters */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by order ID, customer, or table..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-colors ${
              showFilters ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Filter className="w-5 h-5" />
            Filters
          </button>
        </div>

        {/* Filter Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-2 block">Date Range</label>
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                  >
                    <option value="today">Today</option>
                    <option value="week">Last 7 Days</option>
                    <option value="month">Last 30 Days</option>
                    <option value="all">All Time</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-2 block">Payment Method</label>
                  <select
                    value={paymentFilter}
                    onChange={(e) => setPaymentFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                  >
                    <option value="all">All Methods</option>
                    <option value="CASH">Cash</option>
                    <option value="CARD">Card</option>
                    <option value="CREDIT">Credit</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-2 block">Order Type</label>
                  <select
                    value={orderTypeFilter}
                    onChange={(e) => setOrderTypeFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                  >
                    <option value="all">All Types</option>
                    <option value="DINE_IN">Dine-In</option>
                    <option value="WALK_IN">Walk-In</option>
                    <option value="TAKEAWAY">Take Away</option>
                    <option value="DELIVERY">Delivery</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Orders List */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <Calendar className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-lg font-semibold">No orders found</p>
            <p className="text-sm">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map((order: any) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl p-4 border border-gray-200 hover:border-primary transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-bold text-gray-900">#{order.id.slice(-6)}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        order.orderType === 'DINE_IN' ? 'bg-blue-100 text-blue-700' :
                        order.orderType === 'TAKEAWAY' ? 'bg-amber-100 text-amber-700' :
                        order.orderType === 'DELIVERY' ? 'bg-purple-100 text-purple-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {getOrderTypeLabel(order.orderType)}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                      {order.tableNumber && (
                        <span className="text-sm text-gray-500">Table {order.tableNumber}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      {order.customerName && (
                        <span className="flex items-center gap-1">
                          <span className="font-medium">{order.customerName}</span>
                        </span>
                      )}
                      <span>{new Date(order.createdAt).toLocaleString()}</span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4" />
                        {formatCurrency(order.total, settings.currency)}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full">
                        {getPaymentMethodLabel(order.payments?.[0]?.method || 'CASH')}
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-gray-500">
                      {order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedOrder(order)}
                      className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-5 h-5 text-gray-600" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handlePrintReceipt(order)}
                      disabled={isPrinting}
                      className="p-2 bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors disabled:opacity-50"
                      title="Print Receipt"
                    >
                      <Printer className="w-5 h-5 text-primary" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        if (!canRefundOrder(order)) {
                          toast.error('Refund not allowed: Order is older than 24 hours');
                          return;
                        }
                        setRefundOrder(order);
                        setShowRefundModal(true);
                      }}
                      disabled={order.status === 'REFUNDED' || order.status === 'CANCELLED'}
                      className="p-2 bg-red-100 hover:bg-red-200 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title={order.status === 'REFUNDED' ? 'Already Refunded' : order.status === 'CANCELLED' ? 'Order Cancelled' : 'Process Refund'}
                    >
                      <RotateCcw className="w-5 h-5 text-red-600" />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Page {currentPage} of {totalPages} • {ordersData?.pagination?.total || 0} total orders
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedOrder(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Order Details</h2>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-gray-500" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Order Info */}
                <div className="bg-gray-50 rounded-2xl p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Order ID</p>
                      <p className="font-bold text-gray-900">#{selectedOrder.id.slice(-6)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Date & Time</p>
                      <p className="font-semibold text-gray-900">{new Date(selectedOrder.createdAt).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Order Type</p>
                      <p className="font-semibold text-gray-900">{getOrderTypeLabel(selectedOrder.orderType)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Payment Method</p>
                      <p className="font-semibold text-gray-900">{getPaymentMethodLabel(selectedOrder.payments?.[0]?.method || 'CASH')}</p>
                    </div>
                    {selectedOrder.tableNumber && (
                      <div>
                        <p className="text-gray-500">Table</p>
                        <p className="font-semibold text-gray-900">#{selectedOrder.tableNumber}</p>
                      </div>
                    )}
                    {selectedOrder.customerName && (
                      <div>
                        <p className="text-gray-500">Customer</p>
                        <p className="font-semibold text-gray-900">{selectedOrder.customerName}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Items */}
                <div>
                  <h3 className="font-bold text-gray-900 mb-3">Items</h3>
                  <div className="space-y-2">
                    {selectedOrder.items?.map((item: any, index: number) => (
                      <div key={index} className="flex justify-between items-start p-3 bg-gray-50 rounded-xl">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">
                            {item.quantity}x {item.menuItem?.name || item.name || 'Unknown Item'}
                          </p>
                          {item.notes && (
                            <p className="text-xs text-gray-500 italic mt-1">{item.notes}</p>
                          )}
                        </div>
                        <span className="font-bold text-gray-900">
                          {formatCurrency(item.price * item.quantity, settings.currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="border-t border-gray-200 pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-semibold">{formatCurrency(selectedOrder.subtotal || 0, settings.currency)}</span>
                  </div>
                  {selectedOrder.discount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-green-600">Discount</span>
                      <span className="font-semibold text-green-600">-{formatCurrency(selectedOrder.discount, settings.currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tax</span>
                    <span className="font-semibold">{formatCurrency(selectedOrder.tax || 0, settings.currency)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                    <span className="font-bold text-gray-900">Total</span>
                    <span className="text-2xl font-black text-primary">{formatCurrency(selectedOrder.total, settings.currency)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setRefundOrder(selectedOrder);
                      setShowRefundModal(true);
                    }}
                    className="flex-1 py-3 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-5 h-5" />
                    Process Refund
                  </button>
                  <button
                    onClick={() => handlePrintReceipt(selectedOrder)}
                    disabled={isPrinting}
                    className="flex-1 py-3 bg-gradient-to-r from-primary to-primary-container text-white rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Printer className="w-5 h-5" />
                    {isPrinting ? 'Printing...' : 'Print Receipt'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Refund Modal */}
      {showRefundModal && refundOrder && (
        <RefundModal
          isOpen={showRefundModal}
          onClose={() => {
            setShowRefundModal(false);
            setRefundOrder(null);
            setSelectedOrder(null);
          }}
          order={refundOrder}
          onSuccess={() => {
            refetch();
          }}
        />
      )}
    </div>
  );
};

export default CashierOrderHistory;
