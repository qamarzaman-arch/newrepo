import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, Printer, Eye, Calendar, DollarSign, X, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { orderService } from '../../services/orderService';
import { getHardwareManager } from '../../services/hardwareManager';
import { useSettingsStore } from '../../stores/settingsStore';
import { useAuthStore } from '../../stores/authStore';
import { useCurrencyFormatter } from '../../hooks/useCurrency';
import RefundModal from '../../components/RefundModal';
import toast from 'react-hot-toast';

const CashierOrderHistory: React.FC = () => {
  const { settings } = useSettingsStore();
  const { formatCurrency } = useCurrencyFormatter();
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
        taxRate: settings.taxRate || 0,
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
      PICKUP: 'Pickup',
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
      COMPLETED: 'bg-success-100 text-success-700 border-2 border-success-200',
      REFUNDED: 'bg-error-100 text-error-700 border-2 border-error-200',
      PARTIALLY_REFUNDED: 'bg-warning-100 text-warning-700 border-2 border-warning-200',
      CANCELLED: 'bg-neutral-100 text-neutral-700 border-2 border-neutral-200',
    };
    return colors[status] || 'bg-neutral-100 text-neutral-700 border-2 border-neutral-200';
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

  const getJourneyLabel = (status: string) => {
    const labels: Record<string, string> = {
      COMPLETED: 'Closed',
      REFUNDED: 'Refunded',
      PARTIALLY_REFUNDED: 'Partial refund',
      CANCELLED: 'Stopped',
    };
    return labels[status] || 'Recorded';
  };

  const summaryCards = [
    { label: 'Orders shown', value: filteredOrders.length },
    { label: 'Refunded', value: orders.filter((order: any) => order.status === 'REFUNDED' || order.status === 'PARTIALLY_REFUNDED').length },
    { label: 'Cancelled', value: orders.filter((order: any) => order.status === 'CANCELLED').length },
    { label: 'Page', value: `${currentPage}/${Math.max(totalPages, 1)}` },
  ];

  // Refund time limit check (24 hours)
  const canRefundOrder = (order: any) => {
    const orderDate = new Date(order.createdAt);
    const now = new Date();
    const hoursDiff = (now.getTime() - orderDate.getTime()) / (1000 * 60 * 60);
    return hoursDiff <= 24;
  };

  return (
    <div className="h-full flex flex-col bg-neutral-50">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-neutral-0 border-b-2 border-neutral-200 px-8 py-6 shadow-sm"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-4xl font-black text-neutral-900">Order History</h1>
            <p className="text-neutral-600 text-lg mt-2 font-medium">View and manage past orders</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => refetch()}
            className="px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-2xl font-bold hover:shadow-lg shadow-primary-500/30 transition-all"
          >
            Refresh
          </motion.button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {summaryCards.map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
              className="rounded-3xl border-2 border-primary-200 bg-primary-50 px-6 py-4"
            >
              <p className="text-xs font-black uppercase tracking-wider text-primary-600">{item.label}</p>
              <p className="mt-2 text-2xl font-black text-neutral-900">{item.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Search & Filters */}
        <div className="flex gap-4 mt-6">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              type="text"
              placeholder="Search by order ID, customer, or table..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-5 py-4 bg-neutral-50 border-2 border-neutral-200 rounded-2xl focus:border-primary-600 focus:ring-4 focus:ring-primary-500/10 focus:outline-none text-base"
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowFilters(!showFilters)}
            className={`px-6 py-4 rounded-2xl font-bold flex items-center gap-3 transition-colors ${
              showFilters ? 'bg-primary-600 text-white border-2 border-primary-500' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 border-2 border-neutral-200'
            }`}
          >
            <Filter className="w-5 h-5" />
            Filters
          </motion.button>
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
              <div className="grid grid-cols-3 gap-6 mt-6 pt-6 border-t-2 border-neutral-200">
                <div>
                  <label className="text-sm font-bold text-neutral-700 mb-3 block uppercase tracking-wider">Date Range</label>
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="w-full px-4 py-3 bg-neutral-0 border-2 border-neutral-300 rounded-2xl text-base focus:border-primary-600 focus:ring-4 focus:ring-primary-500/10 focus:outline-none"
                  >
                    <option value="today">Today</option>
                    <option value="week">Last 7 Days</option>
                    <option value="month">Last 30 Days</option>
                    <option value="all">All Time</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-bold text-neutral-700 mb-3 block uppercase tracking-wider">Payment Method</label>
                  <select
                    value={paymentFilter}
                    onChange={(e) => setPaymentFilter(e.target.value)}
                    className="w-full px-4 py-3 bg-neutral-0 border-2 border-neutral-300 rounded-2xl text-base focus:border-primary-600 focus:ring-4 focus:ring-primary-500/10 focus:outline-none"
                  >
                    <option value="all">All Methods</option>
                    <option value="CASH">Cash</option>
                    <option value="CARD">Card</option>
                    <option value="CREDIT">Credit</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-bold text-neutral-700 mb-3 block uppercase tracking-wider">Order Type</label>
                  <select
                    value={orderTypeFilter}
                    onChange={(e) => setOrderTypeFilter(e.target.value)}
                    className="w-full px-4 py-3 bg-neutral-0 border-2 border-neutral-300 rounded-2xl text-base focus:border-primary-600 focus:ring-4 focus:ring-primary-500/10 focus:outline-none"
                  >
                    <option value="all">All Types</option>
                    <option value="DINE_IN">Dine-In</option>
                    <option value="WALK_IN">Walk-In</option>
                    <option value="TAKEAWAY">Take Away</option>
                    <option value="PICKUP">Pickup</option>
                    <option value="DELIVERY">Delivery</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Orders List */}
      <div className="flex-1 overflow-y-auto p-8">
        {isLoading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center h-64"
          >
            <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          </motion.div>
        ) : filteredOrders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-64 text-neutral-400"
          >
            <Calendar className="w-20 h-20 mb-6 opacity-30" />
            <p className="text-xl font-bold text-neutral-600">No orders found</p>
            <p className="text-base font-medium">Try adjusting your filters</p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order: any, index: number) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-neutral-0 rounded-3xl p-6 border-2 border-neutral-200 hover:border-primary-400 transition-all shadow-sm hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3 flex-wrap">
                      <span className="font-black text-xl text-neutral-900">#{order.id.slice(-6)}</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        order.orderType === 'DINE_IN' ? 'bg-primary-100 text-primary-700 border-2 border-primary-200' :
                        order.orderType === 'TAKEAWAY' ? 'bg-warning-100 text-warning-700 border-2 border-warning-200' :
                        order.orderType === 'PICKUP' ? 'bg-warning-100 text-warning-700 border-2 border-warning-200' :
                        order.orderType === 'DELIVERY' ? 'bg-purple-100 text-purple-700 border-2 border-purple-200' :
                        'bg-success-100 text-success-700 border-2 border-success-200'
                      }`}>
                        {getOrderTypeLabel(order.orderType)}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-primary-50 text-primary-700 border-2 border-primary-200">
                        Journey: {getJourneyLabel(order.status)}
                      </span>
                      {order.tableNumber && (
                        <span className="text-sm font-semibold text-neutral-600">Table {order.tableNumber}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-5 text-base text-neutral-600">
                      {order.customerName && (
                        <span className="flex items-center gap-2 font-medium">
                          <span className="font-bold text-neutral-900">{order.customerName}</span>
                        </span>
                      )}
                      <span className="font-medium">{new Date(order.createdAt).toLocaleString()}</span>
                      <span className="flex items-center gap-2 font-bold text-neutral-900">
                        <DollarSign className="w-5 h-5 text-primary-600" />
                        {formatCurrency(order.total)}
                      </span>
                      <span className="text-xs px-3 py-1 bg-neutral-100 rounded-full font-semibold border-2 border-neutral-200">
                        {getPaymentMethodLabel(order.payments?.[0]?.method || 'CASH')}
                      </span>
                    </div>
                    <div className="mt-3 text-sm font-semibold text-neutral-500">
                      {order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedOrder(order)}
                      className="p-3 bg-neutral-100 hover:bg-neutral-200 rounded-2xl transition-colors border-2 border-neutral-200"
                      title="View Details"
                    >
                      <Eye className="w-5 h-5 text-neutral-700" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handlePrintReceipt(order)}
                      disabled={isPrinting}
                      className="p-3 bg-primary-100 hover:bg-primary-200 rounded-2xl transition-colors disabled:opacity-50 border-2 border-primary-200"
                      title="Print Receipt"
                    >
                      <Printer className="w-5 h-5 text-primary-600" />
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
                      className="p-3 bg-error-100 hover:bg-error-200 rounded-2xl transition-colors disabled:opacity-30 disabled:cursor-not-allowed border-2 border-error-200"
                      title={order.status === 'REFUNDED' ? 'Already Refunded' : order.status === 'CANCELLED' ? 'Order Cancelled' : 'Process Refund'}
                    >
                      <RotateCcw className="w-5 h-5 text-error-600" />
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-neutral-0 border-t-2 border-neutral-200 px-8 py-6 flex items-center justify-between"
        >
          <p className="text-base font-semibold text-neutral-600">
            Page {currentPage} of {totalPages} • {ordersData?.pagination?.total || 0} total orders
          </p>
          <div className="flex gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-3 bg-neutral-100 hover:bg-neutral-200 rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed border-2 border-neutral-200"
            >
              <ChevronLeft className="w-6 h-6 text-neutral-700" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-3 bg-neutral-100 hover:bg-neutral-200 rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed border-2 border-neutral-200"
            >
              <ChevronRight className="w-6 h-6 text-neutral-700" />
            </motion.button>
          </div>
        </motion.div>
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
              className="bg-neutral-0 rounded-3xl p-10 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto border-2 border-neutral-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="font-display text-3xl font-black text-neutral-900">Order Details</h2>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedOrder(null)}
                  className="p-3 hover:bg-neutral-100 rounded-2xl transition-colors border-2 border-neutral-200"
                >
                  <X className="w-6 h-6 text-neutral-500" />
                </motion.button>
              </div>

              <div className="space-y-8">
                {/* Order Info */}
                <div className="bg-neutral-50 rounded-3xl p-6 border-2 border-neutral-200">
                  <div className="grid grid-cols-2 gap-6 text-base">
                    <div>
                      <p className="text-neutral-500 text-sm font-semibold uppercase tracking-wider mb-1">Order ID</p>
                      <p className="font-black text-neutral-900 text-lg">#{selectedOrder.id.slice(-6)}</p>
                    </div>
                    <div>
                      <p className="text-neutral-500 text-sm font-semibold uppercase tracking-wider mb-1">Date & Time</p>
                      <p className="font-bold text-neutral-900">{new Date(selectedOrder.createdAt).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-neutral-500 text-sm font-semibold uppercase tracking-wider mb-1">Order Type</p>
                      <p className="font-bold text-neutral-900">{getOrderTypeLabel(selectedOrder.orderType)}</p>
                    </div>
                    <div>
                      <p className="text-neutral-500 text-sm font-semibold uppercase tracking-wider mb-1">Payment Method</p>
                      <p className="font-bold text-neutral-900">{getPaymentMethodLabel(selectedOrder.payments?.[0]?.method || 'CASH')}</p>
                    </div>
                    {selectedOrder.tableNumber && (
                      <div>
                        <p className="text-neutral-500 text-sm font-semibold uppercase tracking-wider mb-1">Table</p>
                        <p className="font-bold text-neutral-900">#{selectedOrder.tableNumber}</p>
                      </div>
                    )}
                    {selectedOrder.customerName && (
                      <div>
                        <p className="text-neutral-500 text-sm font-semibold uppercase tracking-wider mb-1">Customer</p>
                        <p className="font-bold text-neutral-900">{selectedOrder.customerName}</p>
                      </div>
                    )}
                  </div>
                  <div className="mt-6 rounded-3xl bg-neutral-0 p-4 border-2 border-primary-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-black uppercase tracking-widest text-primary-600">Order journey</p>
                        <p className="mt-2 text-base font-bold text-neutral-900">{getJourneyLabel(selectedOrder.status)}</p>
                      </div>
                      <span className={`rounded-full px-4 py-2 text-sm font-bold ${getStatusColor(selectedOrder.status)}`}>
                        {getStatusLabel(selectedOrder.status)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Items */}
                <div>
                  <h3 className="font-display text-xl font-black text-neutral-900 mb-4">Items</h3>
                  <div className="space-y-3">
                    {selectedOrder.items?.map((item: any, index: number) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex justify-between items-start p-4 bg-neutral-50 rounded-2xl border-2 border-neutral-200"
                      >
                        <div className="flex-1">
                          <p className="font-bold text-neutral-900 text-base">
                            {item.quantity}x {item.menuItem?.name || item.name || 'Unknown Item'}
                          </p>
                          {item.notes && (
                            <p className="text-sm text-neutral-500 italic mt-2 font-medium">{item.notes}</p>
                          )}
                        </div>
                        <span className="font-black text-neutral-900 text-lg">
                          {formatCurrency(item.price * item.quantity)}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="border-t-2 border-neutral-200 pt-6 space-y-4">
                  <div className="flex justify-between text-base">
                    <span className="text-neutral-600 font-semibold">Subtotal</span>
                    <span className="font-bold text-neutral-900">{formatCurrency(selectedOrder.subtotal || 0)}</span>
                  </div>
                  {selectedOrder.discount > 0 && (
                    <div className="flex justify-between text-base">
                      <span className="text-success-600 font-semibold">Discount</span>
                      <span className="font-bold text-success-600">-{formatCurrency(selectedOrder.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base">
                    <span className="text-neutral-600 font-semibold">Tax</span>
                    <span className="font-bold text-neutral-900">{formatCurrency(selectedOrder.tax || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t-2 border-neutral-200">
                    <span className="font-black text-neutral-900 text-xl">Total</span>
                    <span className="text-3xl font-black text-primary-600">{formatCurrency(selectedOrder.total)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedOrder(null)}
                    className="flex-1 py-4 bg-neutral-100 text-neutral-700 rounded-2xl font-bold hover:bg-neutral-200 transition-colors border-2 border-neutral-200"
                  >
                    Close
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setRefundOrder(selectedOrder);
                      setShowRefundModal(true);
                    }}
                    className="flex-1 py-4 bg-gradient-to-r from-error-600 to-error-700 text-white rounded-2xl font-bold hover:shadow-lg shadow-error-500/30 transition-all flex items-center justify-center gap-3"
                  >
                    <RotateCcw className="w-5 h-5" />
                    Process Refund
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handlePrintReceipt(selectedOrder)}
                    disabled={isPrinting}
                    className="flex-1 py-4 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-2xl font-bold hover:shadow-lg shadow-primary-500/30 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    <Printer className="w-5 h-5" />
                    Print Receipt
                  </motion.button>
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
