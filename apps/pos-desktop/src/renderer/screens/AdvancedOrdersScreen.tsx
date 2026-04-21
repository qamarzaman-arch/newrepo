import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, Filter, Eye, XCircle, Clock, 
  CheckCircle, AlertCircle, Calendar, Users, 
  DollarSign, RefreshCw, MoreVertical,
  Utensils, Edit2, Trash2, Plus
} from 'lucide-react';
import { useOrders, useAllOrders } from '../hooks/useOrders';
import { orderService } from '../services/orderService';
import { tableService } from '../services/tableService';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import { useCurrencyFormatter } from '../hooks/useCurrency';
import toast from 'react-hot-toast';

const AdvancedOrdersScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'orders' | 'tables' | 'reservations'>('orders');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [showTableModal, setShowTableModal] = useState(false);
  const [refundManagerPin, setRefundManagerPin] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [isRefunding, setIsRefunding] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [reservationForm, setReservationForm] = useState({
    customerName: '',
    customerPhone: '',
    tableId: '',
    notes: '',
  });
  const [tableForm, setTableForm] = useState({
    number: '',
    capacity: 4,
    location: '',
    shape: 'round',
  });
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [selectedTablesForMerge, setSelectedTablesForMerge] = useState<string[]>([]);
  const [selectedTableForSplit, setSelectedTableForSplit] = useState<string | null>(null);
  const [splitConfig, setSplitConfig] = useState([
    { number: '', capacity: 2 },
    { number: '', capacity: 2 },
  ]);
  const { formatCurrency } = useCurrencyFormatter();
  const { user } = useAuthStore();
  const isAdminOrManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const { data: ordersData, refetch, isLoading } = useOrders({
    status: statusFilter || undefined,
    page,
    limit: 50,
  });

  // Also fetch all orders without status filter
  const { data: allOrdersData } = useAllOrders();

  const orders = statusFilter 
    ? (ordersData?.orders || [])
    : (allOrdersData?.orders || ordersData?.orders || []);
  const pagination = ordersData?.pagination || {};

  const { data: tablesData, refetch: refetchTables } = useQuery({
    queryKey: ['tables-list'],
    queryFn: async () => {
      const response = await tableService.getTables();
      return response.data.data.tables || [];
    },
  });

  const tables = Array.isArray(tablesData) ? tablesData.map((t: any) => ({
    id: String(t.id),
    number: `T${t.number}`,
    capacity: String(t.capacity || 4),
    status: String(t.status || 'AVAILABLE'),
    guests: String(t.status === 'OCCUPIED' ? (t.currentOrder?.guestCount || t.currentOrder?.items?.length || 2) : 0),
    duration: String(t.status === 'OCCUPIED' ?
      (t.currentOrder?.orderedAt ?
        `${Math.floor((Date.now() - new Date(t.currentOrder.orderedAt).getTime()) / 60000)}m` :
        'Active') :
      '-')
  })) : [];

  const { data: reservationData, refetch: refetchReservations } = useQuery({
    queryKey: ['reservations'],
    queryFn: async () => {
      const response = await orderService.getReservations();
      return response.data.data.reservations || [];
    },
  });

  const reservations = Array.isArray(reservationData) ? reservationData.map((r: any) => ({
    id: r.id,
    name: String(r.customerName || r.name || ''),
    phone: String(r.customerPhone || r.phone || ''),
    date: String(r.date || r.reservationDate || ''),
    time: String(r.time || r.reservationTime || ''),
    party: String(r.partySize || r.guestCount || r.party || 2),
    table: String(typeof r.table === 'object' ? (r.table.number || r.tableId || '') : (r.table || r.tableId || '')),
    tableId: String(typeof r.table === 'object' ? r.table.id : (r.tableId || r.table || '')),
    status: String(r.status || 'PENDING'),
    notes: String(r.notes || ''),
    customerName: String(r.customerName || r.name || ''),
    customerPhone: String(r.customerPhone || r.phone || ''),
  })) : [];

  const stats = {
    totalOrders: orders.length,
    activeOrders: orders.filter((o: any) => ['PENDING', 'CONFIRMED', 'PREPARING'].includes(o.status)).length,
    completedToday: orders.filter((o: any) => o.status === 'COMPLETED').length,
    totalRevenue: orders.reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0),
  };

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    try {
      await orderService.updateStatus(orderId, newStatus);
      toast.success(`Order status updated to ${newStatus}`);
      refetch();
    } catch (error) {
      console.error('Failed to update status:', error);
      toast.error('Failed to update order status');
    }
  };

  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await orderService.createReservation(reservationForm);
      toast.success('Reservation created successfully');
      setShowReservationModal(false);
      setReservationForm({ customerName: '', customerPhone: '', tableId: '', notes: '' });
      refetchReservations();
    } catch (error) {
      console.error('Failed to create reservation:', error);
      toast.error('Failed to create reservation');
    }
  };

  const handleDeleteReservation = async (reservationId: string) => {
    if (!window.confirm('Are you sure you want to delete this reservation?')) {
      return;
    }
    try {
      await orderService.cancelReservation(reservationId);
      toast.success('Reservation deleted successfully');
      refetchReservations();
    } catch (error) {
      console.error('Failed to delete reservation:', error);
      toast.error('Failed to delete reservation');
    }
  };

  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await tableService.createTable(tableForm);
      toast.success('Table created successfully');
      setShowTableModal(false);
      setTableForm({ number: '', capacity: 4, location: '', shape: 'round' });
      refetchTables();
    } catch (error) {
      console.error('Failed to create table:', error);
      toast.error('Failed to create table');
    }
  };

  const handleMergeTables = async () => {
    if (selectedTablesForMerge.length < 2) {
      toast.error('Please select at least 2 tables to merge');
      return;
    }
    try {
      const mergedTableNumber = prompt('Enter merged table number (optional)');
      await tableService.mergeTables({
        tableIds: selectedTablesForMerge,
        mergedTableNumber: mergedTableNumber || undefined,
      });
      toast.success('Tables merged successfully');
      setShowMergeModal(false);
      setSelectedTablesForMerge([]);
      refetchTables();
    } catch (error: any) {
      console.error('Failed to merge tables:', error);
      toast.error(error?.response?.data?.error || 'Failed to merge tables');
    }
  };

  const handleSplitTable = async () => {
    if (!selectedTableForSplit) {
      toast.error('Please select a table to split');
      return;
    }
    try {
      await tableService.splitTable({
        tableId: selectedTableForSplit,
        splitInto: splitConfig,
      });
      toast.success('Table split successfully');
      setShowSplitModal(false);
      setSelectedTableForSplit(null);
      setSplitConfig([
        { number: '', capacity: 2 },
        { number: '', capacity: 2 },
      ]);
      refetchTables();
    } catch (error: any) {
      console.error('Failed to split table:', error);
      toast.error(error?.response?.data?.error || 'Failed to split table');
    }
  };

  const toggleTableSelection = (tableId: string) => {
    setSelectedTablesForMerge(prev =>
      prev.includes(tableId)
        ? prev.filter(id => id !== tableId)
        : [...prev, tableId]
    );
  };

  const handleTableStatusUpdate = async (tableId: string, newStatus: string) => {
    try {
      await tableService.updateStatus(tableId, newStatus as any);
      toast.success('Table status updated successfully');
      refetchTables();
    } catch (error) {
      console.error('Failed to update table status:', error);
      toast.error('Failed to update table status');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      CONFIRMED: 'bg-blue-100 text-blue-800 border-blue-300',
      PREPARING: 'bg-purple-100 text-purple-800 border-purple-300',
      READY: 'bg-green-100 text-green-800 border-green-300',
      SERVED: 'bg-indigo-100 text-indigo-800 border-indigo-300',
      COMPLETED: 'bg-gray-100 text-gray-800 border-gray-300',
      CANCELLED: 'bg-red-100 text-red-800 border-red-300',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getTableStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      AVAILABLE: 'bg-green-100 text-green-700 border-green-300',
      OCCUPIED: 'bg-red-100 text-red-700 border-red-300',
      RESERVED: 'bg-blue-100 text-blue-700 border-blue-300',
    };
    return colors[status] || 'bg-gray-100 text-gray-700 border-gray-300';
  };

  return (
    <div className="space-y-6 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 font-manrope">Order Management</h1>
          <p className="text-gray-600 mt-1">Manage orders, tables, and reservations</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            if (activeTab === 'orders') {
              refetch();
            } else if (activeTab === 'tables') {
              refetchTables();
            } else if (activeTab === 'reservations') {
              refetchReservations();
            }
            toast.success(`${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} refreshed!`);
          }}
          className="px-4 py-2 bg-white border-2 border-gray-200 rounded-xl font-semibold flex items-center gap-2 hover:border-primary transition-colors self-start"
        >
          <RefreshCw className="w-5 h-5" />
          Refresh
        </motion.button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Orders</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalOrders}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <Utensils className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active Orders</p>
              <p className="text-3xl font-bold text-orange-600 mt-1">{stats.activeOrders}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Completed Today</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{stats.completedToday}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Revenue</p>
              <p className="text-3xl font-bold text-primary mt-1">${stats.totalRevenue.toFixed(2)}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl p-2 shadow-sm border border-gray-100 inline-flex">
        {[
          { id: 'orders', label: 'Orders', icon: Utensils },
          { id: 'tables', label: 'Tables', icon: Users },
          { id: 'reservations', label: 'Reservations', icon: Calendar },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <motion.button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all ${
                activeTab === tab.id
                  ? 'bg-primary text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-5 h-5" />
              {tab.label}
            </motion.button>
          );
        })}
      </div>

      {/* Filters & Search - Only for Orders tab */}
      {activeTab === 'orders' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Orders</h2>
            <button
              onClick={() => setShowOrderModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Order
            </button>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by order number or customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none bg-white"
            >
              <option value="">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="PREPARING">Preparing</option>
              <option value="READY">Ready</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                if (activeTab === 'orders') {
                  refetch();
                } else if (activeTab === 'tables') {
                  refetchTables();
                } else if (activeTab === 'reservations') {
                  refetchReservations();
                }
                toast.success(`${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} refreshed!`);
              }}
              className="px-4 py-3 bg-primary text-white rounded-xl font-semibold flex items-center gap-2 shadow-lg"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </motion.button>

            <button className="px-4 py-3 bg-white border-2 border-gray-200 rounded-xl hover:border-primary transition-colors">
              <Filter className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      )}

      {/* ORDERS TAB */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">Order #</th>
                  <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">Type</th>
                  <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">Status</th>
                  <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">Items</th>
                  <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">Total</th>
                  <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">Payment</th>
                  <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">Time</th>
                  <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orders.map((order: any) => (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 sm:px-6 py-4 font-semibold text-gray-900 whitespace-nowrap">{order.orderNumber}</td>
                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{order.orderType}</td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{order.items?.length || 0} items</td>
                    <td className="px-4 sm:px-6 py-4 font-bold text-primary whitespace-nowrap">{formatCurrency(order.totalAmount)}</td>
                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{order.paymentStatus}</td>
                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                      {new Date(order.orderedAt).toLocaleTimeString()}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-2 relative">
                        <button
                          onClick={() => {
                            setSelectedOrder(order);
                            setShowOrderModal(true);
                          }}
                          className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4 text-blue-600" />
                        </button>
                        {order.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleStatusUpdate(order.id, 'CONFIRMED')}
                              className="p-2 hover:bg-green-100 rounded-lg transition-colors"
                              title="Confirm"
                            >
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            </button>
                            <button
                              onClick={() => handleStatusUpdate(order.id, 'CANCELLED')}
                              className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                              title="Cancel"
                            >
                              <XCircle className="w-4 h-4 text-red-600" />
                            </button>
                          </>
                        )}
                        {(order.status === 'COMPLETED' || order.status === 'PAID') && (
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowRefundModal(true);
                            }}
                            className="p-2 hover:bg-orange-100 rounded-lg transition-colors"
                            title="Process Refund"
                          >
                            <RefreshCw className="w-4 h-4 text-orange-600" />
                          </button>
                        )}
                        <div className="relative">
                          <button 
                            onClick={() => setDropdownOpen(dropdownOpen === order.id ? null : order.id)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <MoreVertical className="w-4 h-4 text-gray-600" />
                          </button>
                          {dropdownOpen === order.id && (
                            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                              <button
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setShowOrderModal(true);
                                  setDropdownOpen(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                              >
                                <Eye className="w-4 h-4" /> View Details
                              </button>
                              <button
                                onClick={() => {
                                  handleStatusUpdate(order.id, order.status === 'PENDING' ? 'CONFIRMED' : 'COMPLETED');
                                  setDropdownOpen(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                              >
                                <CheckCircle className="w-4 h-4" /> {order.status === 'PENDING' ? 'Confirm' : 'Complete'}
                              </button>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(order.orderNumber);
                                  toast.success('Order number copied!');
                                  setDropdownOpen(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                              >
                                <RefreshCw className="w-4 h-4" /> Copy Order #
                              </button>
                              {(order.status === 'COMPLETED' || order.status === 'PAID') && (
                                <button
                                  onClick={() => {
                                    setSelectedOrder(order);
                                    setShowRefundModal(true);
                                    setDropdownOpen(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 text-orange-600 flex items-center gap-2"
                                >
                                  <XCircle className="w-4 h-4" /> Process Refund
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {orders.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No orders found</p>
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Page {page} of {pagination.totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 bg-gray-100 rounded-lg disabled:opacity-50 hover:bg-gray-200 transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(Math.min(pagination.totalPages, page + 1))}
                  disabled={page === pagination.totalPages}
                  className="px-4 py-2 bg-gray-100 rounded-lg disabled:opacity-50 hover:bg-gray-200 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TABLES TAB */}
      {activeTab === 'tables' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Tables</h2>
            {isAdminOrManager && (
              <button
                onClick={() => setShowTableModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Table
              </button>
            )}
          </div>
          {/* Table Actions */}
          <div className="flex gap-3 mb-4">
            <button
              onClick={() => setShowMergeModal(true)}
              className="px-4 py-2 bg-blue-50 text-blue-700 rounded-xl font-semibold flex items-center gap-2 hover:bg-blue-100 transition-colors"
            >
              <Users className="w-5 h-5" />
              Merge Tables
            </button>
            <button
              onClick={() => setShowSplitModal(true)}
              className="px-4 py-2 bg-orange-50 text-orange-700 rounded-xl font-semibold flex items-center gap-2 hover:bg-orange-100 transition-colors"
            >
              <Users className="w-5 h-5" />
              Split Table
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {tables.map((table: any, index: number) => (
            <motion.div
              key={table.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`bg-white rounded-2xl p-6 shadow-sm border-2 cursor-pointer hover:shadow-md transition-all ${
                table.status === 'AVAILABLE' ? 'border-green-300 hover:border-green-500' :
                table.status === 'OCCUPIED' ? 'border-red-300 hover:border-red-500' :
                'border-blue-300 hover:border-blue-500'
              }`}
            >
              <div className="text-center">
                <div className={`w-16 h-16 mx-auto mb-3 rounded-full flex items-center justify-center ${
                  table.status === 'AVAILABLE' ? 'bg-green-100' :
                  table.status === 'OCCUPIED' ? 'bg-red-100' :
                  'bg-blue-100'
                }`}>
                  <Users className={`w-8 h-8 ${
                    table.status === 'AVAILABLE' ? 'text-green-600' :
                    table.status === 'OCCUPIED' ? 'text-red-600' :
                    'text-blue-600'
                  }`} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">{String(table.number)}</h3>
                <p className="text-xs text-gray-500 mb-2">Capacity: {String(table.capacity)}</p>
                {isAdminOrManager ? (
                  <select
                    value={table.status}
                    onChange={(e) => handleTableStatusUpdate(table.id, e.target.value)}
                    className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${getTableStatusColor(table.status)} focus:outline-none cursor-pointer`}
                  >
                    <option value="AVAILABLE">AVAILABLE</option>
                    <option value="OCCUPIED">OCCUPIED</option>
                    <option value="RESERVED">RESERVED</option>
                    <option value="NEEDS_CLEANING">NEEDS_CLEANING</option>
                    <option value="OUT_OF_ORDER">OUT_OF_ORDER</option>
                  </select>
                ) : (
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${getTableStatusColor(table.status)}`}>
                    {String(table.status)}
                  </span>
                )}
                {table.status === 'OCCUPIED' && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-600">
                      <span className="font-semibold">{String(table.guests)}</span> guests
                    </p>
                    <p className="text-xs text-gray-500">{String(table.duration)}</p>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
      )}

      {/* RESERVATIONS TAB */}
      {activeTab === 'reservations' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Reservations</h2>
            {isAdminOrManager && (
              <button
                onClick={() => setShowReservationModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Reservation
              </button>
            )}
          </div>
          {reservations.map((reservation: any, index: number) => (
            <motion.div
              key={reservation.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/20 to-primary-container/20 flex items-center justify-center">
                    <Calendar className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{String(reservation.name)}</h3>
                    <p className="text-sm text-gray-500">{String(reservation.phone)}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {String(reservation.date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {String(reservation.time)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {String(reservation.party)} guests
                      </span>
                      <span className="flex items-center gap-1">
                        <Utensils className="w-4 h-4" />
                        Table {String(reservation.table)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-4 py-2 rounded-full text-sm font-semibold border ${
                    reservation.status === 'CONFIRMED'
                      ? 'bg-green-100 text-green-700 border-green-300'
                      : 'bg-yellow-100 text-yellow-700 border-yellow-300'
                  }`}>
                    {String(reservation.status)}
                  </span>
                  {isAdminOrManager && (
                    <>
                      <button
                        onClick={() => {
                          setReservationForm({
                            customerName: reservation.customerName || reservation.name || '',
                            customerPhone: reservation.customerPhone || reservation.phone || '',
                            tableId: String(typeof reservation.table === 'object' ? reservation.table.id : (reservation.tableId || reservation.table || '')),
                            notes: reservation.notes || '',
                          });
                          setShowReservationModal(true);
                        }}
                        className="p-2 hover:bg-green-100 rounded-lg transition-colors"
                        title="Edit Reservation"
                      >
                        <Edit2 className="w-4 h-4 text-green-600" />
                      </button>
                      <button
                        onClick={() => handleDeleteReservation(reservation.id)}
                        className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                        title="Delete Reservation"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </>
                  )}
                  <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <MoreVertical className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Order Details Modal */}
      {showOrderModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Order {selectedOrder.orderNumber}</h3>
              <button
                onClick={() => setShowOrderModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-600">Status</p>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(selectedOrder.status)}`}>
                  {selectedOrder.status}
                </span>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-600 mb-2">Items</p>
                <div className="space-y-2">
                  {selectedOrder.items?.map((item: any) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span>{item.quantity}x {item.menuItem?.name || item.name}</span>
                      <span className="font-semibold">{formatCurrency(item.totalPrice || item.unitPrice * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="flex justify-between text-sm mb-1">
                  <span>Subtotal</span>
                  <span>{formatCurrency(selectedOrder.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Tax</span>
                  <span>{formatCurrency(selectedOrder.taxAmount)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Total</span>
                  <span className="text-primary">{formatCurrency(selectedOrder.totalAmount)}</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Create Table Modal */}
      {showTableModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-6 max-w-md w-full"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Add New Table</h3>
              <button
                onClick={() => {
                  setShowTableModal(false);
                  setTableForm({ number: '', capacity: 4, location: '', shape: 'round' });
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateTable} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Table Number</label>
                <input
                  type="text"
                  value={tableForm.number}
                  onChange={(e) => setTableForm({ ...tableForm, number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="e.g., 1, A1, VIP-1"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
                <input
                  type="number"
                  value={tableForm.capacity}
                  onChange={(e) => setTableForm({ ...tableForm, capacity: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  min={1}
                  max={50}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  value={tableForm.location}
                  onChange={(e) => setTableForm({ ...tableForm, location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="e.g., Main Hall, Patio, Upstairs"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Shape</label>
                <select
                  value={tableForm.shape}
                  onChange={(e) => setTableForm({ ...tableForm, shape: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="round">Round</option>
                  <option value="square">Square</option>
                  <option value="rectangle">Rectangle</option>
                  <option value="booth">Booth</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowTableModal(false);
                    setTableForm({ number: '', capacity: 4, location: '', shape: 'round' });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                >
                  Create Table
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Create Reservation Modal */}
      {showReservationModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-6 max-w-md w-full"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Create Reservation</h3>
              <button
                onClick={() => {
                  setShowReservationModal(false);
                  setReservationForm({ customerName: '', customerPhone: '', tableId: '', notes: '' });
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateReservation} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
                <input
                  type="text"
                  value={reservationForm.customerName}
                  onChange={(e) => setReservationForm({ ...reservationForm, customerName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Phone</label>
                <input
                  type="tel"
                  value={reservationForm.customerPhone}
                  onChange={(e) => setReservationForm({ ...reservationForm, customerPhone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Table</label>
                <select
                  value={reservationForm.tableId}
                  onChange={(e) => setReservationForm({ ...reservationForm, tableId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  required
                >
                  <option value="">Select a table</option>
                  {tables.map((table: any) => (
                    <option key={table.id} value={String(table.id)}>
                      Table {table.number} ({table.capacity} seats)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={reservationForm.notes}
                  onChange={(e) => setReservationForm({ ...reservationForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  rows={3}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowReservationModal(false);
                    setReservationForm({ customerName: '', customerPhone: '', tableId: '', notes: '' });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                >
                  Create Reservation
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Merge Tables Modal */}
      {showMergeModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Merge Tables</h2>
              <button onClick={() => setShowMergeModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">Select at least 2 tables to merge:</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {tables.filter(t => t.status === 'AVAILABLE').map((table: any) => (
                  <div
                    key={table.id}
                    onClick={() => toggleTableSelection(table.id)}
                    className={`p-4 border-2 rounded-xl cursor-pointer transition-colors ${
                      selectedTablesForMerge.includes(table.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-center">
                      <div className="font-bold">{table.number}</div>
                      <div className="text-sm text-gray-600">{table.capacity} seats</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    setShowMergeModal(false);
                    setSelectedTablesForMerge([]);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMergeTables}
                  disabled={selectedTablesForMerge.length < 2}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Merge ({selectedTablesForMerge.length})
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Split Table Modal */}
      {showSplitModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Split Table</h2>
              <button onClick={() => setShowSplitModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Table to Split</label>
                <select
                  value={selectedTableForSplit || ''}
                  onChange={(e) => setSelectedTableForSplit(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
                >
                  <option value="">Select a table</option>
                  {tables.filter(t => t.status === 'AVAILABLE').map((table: any) => (
                    <option key={table.id} value={table.id}>
                      Table {table.number} ({table.capacity} seats)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Split Configuration</label>
                {splitConfig.map((split, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      placeholder={`Table ${index + 1} number`}
                      value={split.number}
                      onChange={(e) => {
                        const newConfig = [...splitConfig];
                        newConfig[index].number = e.target.value;
                        setSplitConfig(newConfig);
                      }}
                      className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
                    />
                    <input
                      type="number"
                      placeholder="Capacity"
                      value={split.capacity}
                      onChange={(e) => {
                        const newConfig = [...splitConfig];
                        newConfig[index].capacity = parseInt(e.target.value) || 0;
                        setSplitConfig(newConfig);
                      }}
                      className="w-24 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    setShowSplitModal(false);
                    setSelectedTableForSplit(null);
                    setSplitConfig([
                      { number: '', capacity: 2 },
                      { number: '', capacity: 2 },
                    ]);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSplitTable}
                  disabled={!selectedTableForSplit}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Split Table
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Refund Modal */}
      {showRefundModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-6 max-w-md w-full"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Process Refund</h3>
              <button
                onClick={() => {
                  setShowRefundModal(false);
                  setRefundManagerPin('');
                  setRefundReason('');
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 bg-orange-50 rounded-xl mb-4">
              <p className="text-sm text-gray-600">Order</p>
              <p className="font-semibold">{selectedOrder.orderNumber}</p>
              <p className="text-sm text-gray-600 mt-1">Total Amount</p>
              <p className="font-bold text-primary">{formatCurrency(selectedOrder.totalAmount)}</p>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to process a refund for this order? This action requires manager PIN.
            </p>
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1">Reason for Refund</label>
                <input
                  type="text"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="E.g., Customer dissatisfied, wrong item..."
                  className="w-full px-4 py-2 border-2 text-sm border-gray-200 rounded-xl focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1">Manager PIN</label>
                <input
                  type="password"
                  value={refundManagerPin}
                  onChange={(e) => setRefundManagerPin(e.target.value)}
                  maxLength={6}
                  placeholder="Enter PIN"
                  className="w-full px-4 py-2 text-center tracking-widest text-xl border-2 border-orange-300 rounded-xl focus:border-orange-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRefundModal(false);
                  setRefundManagerPin('');
                  setRefundReason('');
                }}
                disabled={isRefunding}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!refundManagerPin || !refundReason) {
                    toast.error('Please enter reason and manager PIN');
                    return;
                  }
                  setIsRefunding(true);
                  try {
                    await orderService.refundOrder(selectedOrder.id, {
                      type: 'FULL',
                      amount: selectedOrder.totalAmount,
                      reason: refundReason,
                      managerPin: refundManagerPin,
                      approvedBy: user?.id || 'system',
                    });
                    toast.success('Refund processed successfully!');
                    setShowRefundModal(false);
                    setRefundManagerPin('');
                    setRefundReason('');
                    refetch();
                  } catch (error: any) {
                    toast.error(error.response?.data?.error?.message || 'Failed to process refund');
                  } finally {
                    setIsRefunding(false);
                  }
                }}
                disabled={isRefunding || !refundManagerPin || !refundReason}
                className="flex-1 py-3 bg-orange-600 text-white rounded-xl font-semibold hover:bg-orange-700 transition-colors disabled:opacity-50"
              >
                {isRefunding ? 'Processing...' : 'Confirm Refund'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AdvancedOrdersScreen;
