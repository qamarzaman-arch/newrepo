import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, ShoppingCart, Users, AlertTriangle, Clock, MapPin, Package, Truck, Calendar } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { reportService } from '../services/reportService';
import { orderService } from '../services/orderService';
import { inventoryService } from '../services/inventoryService';
import { tableService } from '../services/tableService';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useCurrencyFormatter } from '../hooks/useCurrency';

const DashboardScreen: React.FC = () => {
  const { formatCurrency } = useCurrencyFormatter();
  const { data: dailySales } = useQuery({
    queryKey: ['daily-sales'],
    queryFn: async () => {
      const response = await reportService.getDailySales();
      return response.data.data;
    },
  });

  const { data: monthlySales } = useQuery({
    queryKey: ['monthly-sales'],
    queryFn: async () => {
      const response = await reportService.getMonthlySales('7');
      return response.data.data;
    },
  });

  const { data: topProducts } = useQuery({
    queryKey: ['top-products'],
    queryFn: async () => {
      const response = await reportService.getTopSelling(5);
      return response.data.data.items;
    },
  });

  const { data: pendingOrders } = useQuery({
    queryKey: ['pending-orders'],
    queryFn: async () => {
      const response = await orderService.getOrders({ status: 'PENDING', limit: 10 });
      return response.data.data.orders;
    },
  });

  const { data: lowStockItems } = useQuery({
    queryKey: ['low-stock'],
    queryFn: async () => {
      const response = await inventoryService.getLowStock();
      return response.data.data.items;
    },
  });

  const { data: occupiedTables } = useQuery({
    queryKey: ['occupied-tables'],
    queryFn: async () => {
      const response = await tableService.getTables({ status: 'OCCUPIED' });
      return response.data.data.tables;
    },
  });

  const stats = [
    {
      title: "Today's Revenue",
      value: formatCurrency(dailySales?.totalRevenue || 0),
      icon: TrendingUp,
      color: 'bg-green-500',
    },
    {
      title: "Today's Orders",
      value: dailySales?.totalOrders || 0,
      icon: ShoppingCart,
      color: 'bg-blue-500',
    },
    {
      title: 'Avg Order Value',
      value: formatCurrency(dailySales?.avgOrderValue || 0),
      icon: Users,
      color: 'bg-purple-500',
    },
    {
      title: 'Low Stock Alerts',
      value: lowStockItems?.length || 0,
      icon: AlertTriangle,
      color: 'bg-red-500',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-[32px] border border-red-100 bg-[linear-gradient(135deg,#fff5f5_0%,#ffffff_42%,#fff1f2_100%)] p-6 shadow-soft">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-red-500">Operations Overview</p>
            <h1 className="mt-2 text-3xl font-black text-gray-900">Dashboard</h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-600">
              A compact view of revenue, orders, table pressure, and stock attention.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Revenue', value: formatCurrency(dailySales?.totalRevenue || 0) },
              { label: 'Orders', value: dailySales?.totalOrders || 0 },
              { label: 'Tables', value: occupiedTables?.length || 0 },
              { label: 'Alerts', value: lowStockItems?.length || 0 },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/70 bg-white/90 px-4 py-3 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-400">{item.label}</p>
                <p className="mt-1 text-sm font-bold text-gray-900">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-2xl p-6 shadow-soft border border-red-50"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`${stat.color} p-3 rounded-xl`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Charts and Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Chart */}
        <div className="bg-white rounded-2xl p-6 shadow-soft border border-red-50">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Sales Trend (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={monthlySales?.dailySales || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="revenue" stroke="#00513f" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-2xl p-6 shadow-soft border border-red-50">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Top Selling Items</h3>
          <div className="space-y-3">
            {topProducts?.map((item: any, index: number) => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center font-bold">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-semibold text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-500">{item.category?.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary">{item.totalQuantity} sold</p>
                  <p className="text-xs text-gray-500">{formatCurrency(item.totalRevenue)}</p>
                </div>
              </div>
            ))}
            {(!topProducts || topProducts.length === 0) && (
              <p className="text-center text-gray-500 py-8">No sales data yet</p>
            )}
          </div>
        </div>

        {/* Pending Orders - Enhanced */}
        <div className="bg-white rounded-2xl p-6 shadow-soft border border-red-50">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Current Orders
          </h3>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {pendingOrders?.map((order: any) => {
              const orderTypeConfig = {
                DINE_IN: { icon: Users, color: 'bg-blue-100 text-blue-700', label: 'Dine-in' },
                TAKEAWAY: { icon: Package, color: 'bg-orange-100 text-orange-700', label: 'Takeaway' },
                PICKUP: { icon: Package, color: 'bg-orange-100 text-orange-700', label: 'Pickup' },
                DELIVERY: { icon: Truck, color: 'bg-purple-100 text-purple-700', label: 'Delivery' },
                RESERVATION: { icon: Calendar, color: 'bg-green-100 text-green-700', label: 'Reservation' },
              };
              const config = orderTypeConfig[order.orderType as keyof typeof orderTypeConfig] || orderTypeConfig.DINE_IN;
              const Icon = config.icon;

              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-100 hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`p-2 rounded-lg ${config.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{order.orderNumber}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
                          {config.label}
                        </span>
                        {order.table && (
                          <span className="flex items-center gap-1 text-xs text-gray-600">
                            <MapPin className="w-3 h-3" />
                            T{order.table.number}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right ml-3">
                    <p className="font-bold text-primary text-sm">{formatCurrency(order.totalAmount)}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(order.orderedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </motion.div>
              );
            })}
            {(!pendingOrders || pendingOrders.length === 0) && (
              <div className="text-center py-12">
                <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500 text-sm">No active orders</p>
              </div>
            )}
          </div>
        </div>

        {/* Table Status */}
        <div className="bg-white rounded-2xl p-6 shadow-soft border border-red-50">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Occupied Tables</h3>
          <div className="space-y-2">
            {occupiedTables?.map((table: any) => (
              <div key={table.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div>
                  <p className="font-semibold text-gray-900">Table {table.number}</p>
                  <p className="text-xs text-gray-500">{table.capacity} seats • {table.location}</p>
                </div>
                <div className="text-right">
                  <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                    Occupied
                  </span>
                </div>
              </div>
            ))}
            {!occupiedTables || occupiedTables.length === 0 && (
              <p className="text-center text-gray-500 py-8">No occupied tables</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardScreen;
