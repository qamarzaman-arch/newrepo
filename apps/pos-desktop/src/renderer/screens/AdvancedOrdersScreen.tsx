import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, Filter, Eye, XCircle, Clock, 
  CheckCircle, AlertCircle, Calendar, Users, 
  DollarSign, RefreshCw, MoreVertical,
  Utensils
} from 'lucide-react';
import { useOrders, useAllOrders } from '../hooks/useOrders';
import { orderService } from '../services/orderService';
import { tableService } from '../services/tableService';
import { useQuery } from '@tanstack/react-query';
import { useCurrencyFormatter } from '../hooks/useCurrency';
import toast from 'react-hot-toast';

const AdvancedOrdersScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'orders' | 'tables' | 'reservations'>('orders');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const { formatCurrency } = useCurrencyFormatter();

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

  const { data: tablesData } = useQuery({
    queryKey: ['tables-list'],
    queryFn: async () => {
      const response = await tableService.getTables();
      return response.data.data.tables || [];
    },
  });

  const tables = tablesData ? tablesData.map((t: any) => ({
    id: t.id,
    number: `T${t.number}`,
    capacity: t.capacity || 4,
    status: t.status || 'AVAILABLE',
    guests: t.status === 'OCCUPIED' ? Math.floor(Math.random() * (t.capacity || 4)) + 1 : 0,
    duration: t.status === 'OCCUPIED' ? 'Active' : '-'
  })) : [];

  const { data: reservationData } = useQuery({
    queryKey: ['reservations'],
    queryFn: async () => {
      const response = await orderService.getReservations();
      return response.data.data.reservations || [];
    },
  });

  const reservations = reservationData || [];

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
          onClick={() => refetch()}
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
            onClick={() => { refetch(); toast.success('Orders refreshed!'); }}
            className="px-4 py-3 bg-primary text-white rounded-xl font-semibold flex items-center gap-2 shadow-lg"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </motion.button>

          <button className="px-4 py-3 bg-white border-2 border-gray-200 rounded-xl hover:border-primary transition-colors">
            <Filter className="w-5 h-5 text-gray-600" />
          </button>
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
                      <div className="flex gap-2">
                        <button
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
                        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                          <MoreVertical className="w-4 h-4 text-gray-600" />
                        </button>
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
                <h3 className="text-xl font-bold text-gray-900 mb-1">{table.number}</h3>
                <p className="text-xs text-gray-500 mb-2">Capacity: {table.capacity}</p>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${getTableStatusColor(table.status)}`}>
                  {table.status}
                </span>
                {table.status === 'OCCUPIED' && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-600">
                      <span className="font-semibold">{table.guests}</span> guests
                    </p>
                    <p className="text-xs text-gray-500">{table.duration}</p>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* RESERVATIONS TAB */}
      {activeTab === 'reservations' && (
        <div className="space-y-4">
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
                    <h3 className="text-lg font-bold text-gray-900">{reservation.name}</h3>
                    <p className="text-sm text-gray-500">{reservation.phone}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {reservation.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {reservation.time}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {reservation.party} guests
                      </span>
                      <span className="flex items-center gap-1">
                        <Utensils className="w-4 h-4" />
                        Table {reservation.table}
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
                    {reservation.status}
                  </span>
                  <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <MoreVertical className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdvancedOrdersScreen;
