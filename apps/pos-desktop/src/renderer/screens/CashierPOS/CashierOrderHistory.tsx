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
      COMPLETED: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      REFUNDED: 'bg-red-50 text-red-700 border border-red-200',
      PARTIALLY_REFUNDED: 'bg-amber-50 text-amber-700 border border-amber-200',
      CANCELLED: 'bg-neutral-100 text-neutral-600 border border-neutral-200',
    };
    return colors[status] || 'bg-neutral-100 text-neutral-600 border border-neutral-200';
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

  // Refund time limit check (24 hours)
  const canRefundOrder = (order: any) => {
    const orderDate = new Date(order.createdAt);
    const now = new Date();
    const hoursDiff = (now.getTime() - orderDate.getTime()) / (1000 * 60 * 60);
    return hoursDiff <= 24;
  };

  /* ── Date filter pills ── */
  const datePills = [
    { value: 'today', label: 'Today' },
    { value: 'week', label: '7 Days' },
    { value: 'month', label: '30 Days' },
    { value: 'all', label: 'All Time' },
  ];

  const paymentPills = [
    { value: 'all', label: 'All Methods' },
    { value: 'CASH', label: 'Cash' },
    { value: 'CARD', label: 'Card' },
    { value: 'CREDIT', label: 'Credit' },
  ];

  const typePills = [
    { value: 'all', label: 'All Types' },
    { value: 'DINE_IN', label: 'Dine-In' },
    { value: 'WALK_IN', label: 'Walk-In' },
    { value: 'TAKEAWAY', label: 'Take Away' },
    { value: 'PICKUP', label: 'Pickup' },
    { value: 'DELIVERY', label: 'Delivery' },
  ];

  return (
    <div className="h-full flex flex-col bg-neutral-50">
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="bg-white border-b border-neutral-200 px-6 py-4 shadow-sm flex-shrink-0"
      >
        {/* Title row */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary-600">Cashier Desk</p>
            <h1 className="text-2xl font-black text-neutral-900">Order History</h1>
          </div>
          <div className="flex items-center gap-3">
            {/* Summary pills */}
            <div className="hidden md:flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-full bg-neutral-100 border border-neutral-200 text-xs font-bold text-neutral-600">
                {filteredOrders.length} shown
              </span>
              <span className="px-3 py-1.5 rounded-full bg-red-50 border border-red-200 text-xs font-bold text-red-700">
                {orders.filter((o: any) => o.status === 'REFUNDED' || o.status === 'PARTIALLY_REFUNDED').length} refunded
              </span>
              <span className="px-3 py-1.5 rounded-full bg-neutral-100 border border-neutral-200 text-xs font-bold text-neutral-600">
                {orders.filter((o: any) => o.status === 'CANCELLED').length} cancelled
              </span>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => refetch()}
              className="px-4 py-2 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-xl text-sm font-bold hover:shadow-md shadow-primary-500/25 transition-all"
            >
              Refresh
            </motion.button>
          </div>
        </div>

        {/* Search + filter toggle */}
        <div className="flex gap-3 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search by order ID, customer, or table…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 focus:outline-none text-sm"
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 text-sm transition-colors border ${
              showFilters
                ? 'bg-primary-600 text-white border-primary-500'
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 border-neutral-200'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
          </motion.button>
        </div>

        {/* Pill filter bar */}
        <div className="space-y-2.5">
          {/* Date pills — always visible */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mr-1">Period</span>
            {datePills.map((pill) => (
              <button
                key={pill.value}
                onClick={() => { setDateFilter(pill.value); setCurrentPage(1); }}
                className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                  dateFilter === pill.value
                    ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                    : 'bg-white text-neutral-600 border-neutral-200 hover:border-primary-300 hover:text-primary-600'
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>

          {/* Extended filter pills */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-2 space-y-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mr-1">Payment</span>
                    {paymentPills.map((pill) => (
                      <button
                        key={pill.value}
                        onClick={() => { setPaymentFilter(pill.value); setCurrentPage(1); }}
                        className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                          paymentFilter === pill.value
                            ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                            : 'bg-white text-neutral-600 border-neutral-200 hover:border-primary-300 hover:text-primary-600'
                        }`}
                      >
                        {pill.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mr-1">Type</span>
                    {typePills.map((pill) => (
                      <button
                        key={pill.value}
                        onClick={() => { setOrderTypeFilter(pill.value); setCurrentPage(1); }}
                        className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                          orderTypeFilter === pill.value
                            ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                            : 'bg-white text-neutral-600 border-neutral-200 hover:border-primary-300 hover:text-primary-600'
                        }`}
                      >
                        {pill.label}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* ── Orders Table ── */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-neutral-200 px-5 py-3.5 animate-pulse flex items-center gap-4">
                <div className="h-3.5 w-20 bg-neutral-200 rounded" />
                <div className="h-3.5 w-16 bg-neutral-100 rounded" />
                <div className="h-3.5 w-24 bg-neutral-100 rounded" />
                <div className="flex-1" />
                <div className="h-3.5 w-16 bg-neutral-200 rounded" />
                <div className="flex gap-2">
                  <div className="h-7 w-7 bg-neutral-100 rounded-lg" />
                  <div className="h-7 w-7 bg-neutral-100 rounded-lg" />
                  <div className="h-7 w-7 bg-neutral-100 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-56 text-neutral-400"
          >
            <Calendar className="w-14 h-14 mb-4 opacity-25" />
            <p className="text-base font-bold text-neutral-600">No orders found</p>
            <p className="text-sm font-medium text-neutral-400 mt-1">Try adjusting your filters</p>
          </motion.div>
        ) : (
          <div className="space-y-1.5">
            {/* Table header */}
            <div className="hidden lg:grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_auto] gap-4 px-5 py-2 text-[11px] font-bold uppercase tracking-wider text-neutral-400">
              <span>Order</span>
              <span>Customer / Table</span>
              <span>Type</span>
              <span>Payment</span>
              <span>Total</span>
              <span className="text-right">Actions</span>
            </div>

            {filteredOrders.map((order: any, index: number) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="bg-white rounded-xl border border-neutral-200 hover:border-primary-300 hover:shadow-sm transition-all"
              >
                <div className="grid lg:grid-cols-[2fr_1.5fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3.5 items-center">
                  {/* Order ID + status + time */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="font-black text-neutral-900 text-sm">#{order.id.slice(-6)}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap ${getStatusColor(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </span>
                    <span className="hidden xl:block text-xs text-neutral-400 font-medium ml-1">
                      {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Customer / table */}
                  <div className="min-w-0">
                    {order.customerName ? (
                      <p className="font-semibold text-neutral-800 text-sm truncate">{order.customerName}</p>
                    ) : order.tableNumber ? (
                      <p className="font-semibold text-neutral-600 text-sm">Table {order.tableNumber}</p>
                    ) : (
                      <p className="text-neutral-400 text-sm italic">Walk-in</p>
                    )}
                    <p className="text-xs text-neutral-400 mt-0.5">
                      {new Date(order.createdAt).toLocaleDateString()}
                      {order.tableNumber && order.customerName && ` · T${order.tableNumber}`}
                    </p>
                  </div>

                  {/* Order type */}
                  <div>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                      order.orderType === 'DINE_IN'   ? 'bg-primary-50 text-primary-700 border border-primary-200' :
                      order.orderType === 'DELIVERY'  ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                      order.orderType === 'TAKEAWAY' || order.orderType === 'PICKUP'
                                                      ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                                        'bg-neutral-100 text-neutral-600 border border-neutral-200'
                    }`}>
                      {getOrderTypeLabel(order.orderType)}
                    </span>
                  </div>

                  {/* Payment method */}
                  <div>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-neutral-100 text-neutral-600 border border-neutral-200">
                      {getPaymentMethodLabel(order.payments?.[0]?.method || 'CASH')}
                    </span>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      {order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''}
                    </p>
                  </div>

                  {/* Total */}
                  <div>
                    <span className="font-black text-neutral-900 text-sm">{formatCurrency(order.total)}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 justify-end">
                    <motion.button
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.92 }}
                      onClick={() => setSelectedOrder(order)}
                      className="p-2 bg-neutral-100 hover:bg-primary-50 hover:text-primary-600 rounded-lg transition-colors border border-neutral-200"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4 text-neutral-600" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.92 }}
                      onClick={() => handlePrintReceipt(order)}
                      disabled={isPrinting}
                      className="p-2 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors disabled:opacity-50 border border-primary-200"
                      title="Print Receipt"
                    >
                      <Printer className="w-4 h-4 text-primary-600" />
                    </motion.button>
                    {/* Refund: only within 24h, not already refunded/cancelled */}
                    {canRefundOrder(order) && order.status !== 'REFUNDED' && order.status !== 'CANCELLED' ? (
                      <motion.button
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.92 }}
                        onClick={() => {
                          setRefundOrder(order);
                          setShowRefundModal(true);
                        }}
                        className="p-2 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200"
                        title="Process Refund"
                      >
                        <RotateCcw className="w-4 h-4 text-red-600" />
                      </motion.button>
                    ) : (
                      <div className="w-8 h-8 flex-shrink-0" /> /* spacer to keep row height consistent */
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border-t border-neutral-200 px-6 py-3.5 flex items-center justify-between flex-shrink-0"
        >
          <p className="text-sm font-semibold text-neutral-500">
            Page <span className="font-bold text-neutral-800">{currentPage}</span> of {totalPages}
            <span className="text-neutral-400"> · {ordersData?.pagination?.total || 0} orders total</span>
          </p>
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 bg-neutral-100 hover:bg-neutral-200 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed border border-neutral-200 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-neutral-700" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 bg-neutral-100 hover:bg-neutral-200 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed border border-neutral-200 transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-neutral-700" />
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* ── Order Details Modal ── */}
      <AnimatePresence>
        {selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedOrder(null)}
          >
            <motion.div
              initial={{ scale: 0.97, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.97, opacity: 0, y: 8 }}
              className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto border border-neutral-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-primary-600">Order Details</p>
                  <h2 className="text-xl font-black text-neutral-900 mt-0.5">#{selectedOrder.id.slice(-6)}</h2>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 hover:bg-neutral-100 rounded-xl transition-colors border border-neutral-200"
                >
                  <X className="w-5 h-5 text-neutral-500" />
                </motion.button>
              </div>

              <div className="space-y-5">
                {/* Info grid */}
                <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-200 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-neutral-400 text-xs font-semibold uppercase tracking-wider mb-0.5">Date & Time</p>
                    <p className="font-bold text-neutral-900">{new Date(selectedOrder.createdAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-neutral-400 text-xs font-semibold uppercase tracking-wider mb-0.5">Order Type</p>
                    <p className="font-bold text-neutral-900">{getOrderTypeLabel(selectedOrder.orderType)}</p>
                  </div>
                  <div>
                    <p className="text-neutral-400 text-xs font-semibold uppercase tracking-wider mb-0.5">Payment</p>
                    <p className="font-bold text-neutral-900">
                      {getPaymentMethodLabel(selectedOrder.payments?.[0]?.method || 'CASH')}
                    </p>
                  </div>
                  <div>
                    <p className="text-neutral-400 text-xs font-semibold uppercase tracking-wider mb-0.5">Status</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${getStatusColor(selectedOrder.status)}`}>
                      {getStatusLabel(selectedOrder.status)}
                    </span>
                  </div>
                  {selectedOrder.tableNumber && (
                    <div>
                      <p className="text-neutral-400 text-xs font-semibold uppercase tracking-wider mb-0.5">Table</p>
                      <p className="font-bold text-neutral-900">#{selectedOrder.tableNumber}</p>
                    </div>
                  )}
                  {selectedOrder.customerName && (
                    <div>
                      <p className="text-neutral-400 text-xs font-semibold uppercase tracking-wider mb-0.5">Customer</p>
                      <p className="font-bold text-neutral-900">{selectedOrder.customerName}</p>
                    </div>
                  )}
                </div>

                {/* Items */}
                <div>
                  <h3 className="text-sm font-black text-neutral-800 uppercase tracking-wide mb-2.5">Items</h3>
                  <div className="space-y-2">
                    {selectedOrder.items?.map((item: any, index: number) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.04 }}
                        className="flex justify-between items-start px-4 py-3 bg-neutral-50 rounded-xl border border-neutral-200"
                      >
                        <div className="flex-1">
                          <p className="font-bold text-neutral-900 text-sm">
                            {item.quantity}× {item.menuItem?.name || item.name || 'Unknown Item'}
                          </p>
                          {item.notes && (
                            <p className="text-xs text-neutral-400 italic mt-0.5">{item.notes}</p>
                          )}
                        </div>
                        <span className="font-black text-neutral-900 text-sm ml-3 flex-shrink-0">
                          {formatCurrency(item.price * item.quantity)}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="border-t border-neutral-200 pt-4 space-y-2.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-500 font-medium">Subtotal</span>
                    <span className="font-bold text-neutral-900">{formatCurrency(selectedOrder.subtotal || 0)}</span>
                  </div>
                  {selectedOrder.discount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-emerald-600 font-medium">Discount</span>
                      <span className="font-bold text-emerald-600">−{formatCurrency(selectedOrder.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-500 font-medium">Tax</span>
                    <span className="font-bold text-neutral-900">{formatCurrency(selectedOrder.tax || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2.5 border-t border-neutral-200">
                    <span className="font-black text-neutral-900">Total</span>
                    <span className="text-2xl font-black text-primary-600">{formatCurrency(selectedOrder.total)}</span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2.5">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedOrder(null)}
                    className="flex-1 py-3 bg-neutral-100 text-neutral-700 rounded-xl font-bold hover:bg-neutral-200 transition-colors border border-neutral-200 text-sm"
                  >
                    Close
                  </motion.button>
                  {canRefundOrder(selectedOrder) &&
                    selectedOrder.status !== 'REFUNDED' &&
                    selectedOrder.status !== 'CANCELLED' && (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setRefundOrder(selectedOrder);
                          setShowRefundModal(true);
                        }}
                        className="flex-1 py-3 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl font-bold hover:shadow-md shadow-red-500/25 transition-all flex items-center justify-center gap-2 text-sm"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Refund
                      </motion.button>
                    )}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handlePrintReceipt(selectedOrder)}
                    disabled={isPrinting}
                    className="flex-1 py-3 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-xl font-bold hover:shadow-md shadow-primary-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                  >
                    <Printer className="w-4 h-4" />
                    Print Receipt
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Refund Modal ── */}
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
