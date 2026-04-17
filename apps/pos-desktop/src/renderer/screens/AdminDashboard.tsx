import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Users,
  DollarSign,
  Package,
  Calendar,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  BarChart3,
  PieChart,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { reportService } from '../services/reportService';
import { orderService } from '../services/orderService';
import { inventoryService } from '../services/inventoryService';
import { tableService } from '../services/tableService';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend,
} from 'recharts';

const COLORS = ['#00513f', '#006b54', '#60a5fa', '#3b82f6', '#f59e0b', '#ef4444'];

const AdminDashboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d');

  // Fetch analytics data
  const { data: dailySales } = useQuery({
    queryKey: ['dailySales'],
    queryFn: async () => {
      const response = await reportService.getDailySales();
      return response.data.data;
    },
  });

  const { data: monthlySales } = useQuery({
    queryKey: ['monthlySales', timeRange],
    queryFn: async () => {
      const response = await reportService.getMonthlySales(timeRange);
      return response.data.data;
    },
  });

  const { data: topProducts } = useQuery({
    queryKey: ['topProducts'],
    queryFn: async () => {
      const response = await reportService.getTopSelling(10, 7);
      return response.data.data;
    },
  });

  const { data: lowPerforming } = useQuery({
    queryKey: ['lowPerforming'],
    queryFn: async () => {
      const response = await reportService.getLowPerforming(7);
      return response.data.data;
    },
  });

  const { data: pendingOrders } = useQuery({
    queryKey: ['pendingOrders'],
    queryFn: async () => {
      const response = await orderService.getOrders({ status: 'PENDING' });
      return response.data.data.orders;
    },
  });

  const { data: occupiedTables } = useQuery({
    queryKey: ['occupiedTables'],
    queryFn: async () => {
      const response = await tableService.getTables({ isActive: true });
      return response.data.data.tables?.filter((t: any) => t.status === 'OCCUPIED') || [];
    },
  });

  const { data: lowStockItems } = useQuery({
    queryKey: ['lowStockItems'],
    queryFn: async () => {
      const response = await inventoryService.getInventory({ lowStock: true });
      return response.data.data.items || [];
    },
  });

  const { data: expenseSummary } = useQuery({
    queryKey: ['expenseSummary'],
    queryFn: async () => {
      const response = await reportService.getExpenseSummary(7);
      return response.data.data;
    },
  });

  // Calculate metrics
  const todayRevenue = dailySales?.totalRevenue || 0;
  const todayOrders = dailySales?.totalOrders || 0;
  const avgOrderValue = dailySales?.avgOrderValue || 0;
  const revenueGrowth = 12.5; // Mock data - would come from API
  const orderGrowth = 8.3;

  // Prepare chart data
  const salesTrendData = monthlySales?.dailySales?.map((day: any) => ({
    date: new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' }),
    revenue: day.revenue,
    orders: day.orders,
  })) || [];

  const orderTypeData = [
    { name: 'Dine-in', value: 45, color: '#00513f' },
    { name: 'Takeaway', value: 30, color: '#006b54' },
    { name: 'Delivery', value: 20, color: '#60a5fa' },
    { name: 'Reservation', value: 5, color: '#3b82f6' },
  ];

  const peakHoursData = [
    { hour: '10AM', orders: 15 },
    { hour: '11AM', orders: 25 },
    { hour: '12PM', orders: 45 },
    { hour: '1PM', orders: 50 },
    { hour: '2PM', orders: 35 },
    { hour: '3PM', orders: 20 },
    { hour: '4PM', orders: 15 },
    { hour: '5PM', orders: 25 },
    { hour: '6PM', orders: 40 },
    { hour: '7PM', orders: 55 },
    { hour: '8PM', orders: 45 },
    { hour: '9PM', orders: 30 },
  ];

  const statsCards = [
    {
      title: "Today's Revenue",
      value: `$${todayRevenue.toFixed(2)}`,
      change: `+${revenueGrowth}%`,
      trend: 'up',
      icon: DollarSign,
      color: 'from-green-500 to-emerald-600',
    },
    {
      title: "Today's Orders",
      value: todayOrders.toString(),
      change: `+${orderGrowth}%`,
      trend: 'up',
      icon: ShoppingCart,
      color: 'from-blue-500 to-cyan-600',
    },
    {
      title: 'Avg Order Value',
      value: `$${avgOrderValue.toFixed(2)}`,
      change: '+5.2%',
      trend: 'up',
      icon: Activity,
      color: 'from-purple-500 to-pink-600',
    },
    {
      title: 'Occupied Tables',
      value: occupiedTables?.length || 0,
      change: `${occupiedTables?.length || 0} active`,
      trend: 'neutral',
      icon: Users,
      color: 'from-orange-500 to-red-600',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">Comprehensive business analytics and insights</p>
        </div>
        <div className="flex gap-2 bg-white rounded-xl p-1 shadow-sm border border-gray-200">
          <button
            onClick={() => setTimeRange('7d')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              timeRange === '7d' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            7 Days
          </button>
          <button
            onClick={() => setTimeRange('30d')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              timeRange === '30d' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            30 Days
          </button>
          <button
            onClick={() => setTimeRange('90d')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              timeRange === '90d' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            90 Days
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          const TrendIcon = stat.trend === 'up' ? ArrowUpRight : stat.trend === 'down' ? ArrowDownRight : null;
          
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-2xl p-6 shadow-soft border border-gray-100 hover:shadow-medium transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color}`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                {TrendIcon && (
                  <div className={`flex items-center gap-1 text-sm font-semibold ${
                    stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    <TrendIcon className="w-4 h-4" />
                    <span>{stat.change}</span>
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trend Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-soft border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Revenue Trend
              </h3>
              <p className="text-sm text-gray-600 mt-1">Daily revenue over time</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={salesTrendData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00513f" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00513f" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
              <YAxis stroke="#9ca3af" fontSize={12} tickFormatter={(value) => `$${value}`} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#00513f"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorRevenue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Order Type Distribution */}
        <div className="bg-white rounded-2xl p-6 shadow-soft border border-gray-100">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-primary" />
              Order Types
            </h3>
            <p className="text-sm text-gray-600 mt-1">Distribution by type</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <RePieChart>
              <Pie
                data={orderTypeData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {orderTypeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </RePieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-4">
            {orderTypeData.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm text-gray-700">{item.name}</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Peak Hours */}
        <div className="bg-white rounded-2xl p-6 shadow-soft border border-gray-100">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Peak Hours
            </h3>
            <p className="text-sm text-gray-600 mt-1">Busiest times of day</p>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={peakHoursData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="hour" stroke="#9ca3af" fontSize={12} />
              <YAxis stroke="#9ca3af" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                }}
              />
              <Bar dataKey="orders" fill="#00513f" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-2xl p-6 shadow-soft border border-gray-100">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Top Selling Products
            </h3>
            <p className="text-sm text-gray-600 mt-1">Best performers this week</p>
          </div>
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {topProducts?.slice(0, 8).map((item: any, index: number) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-100 hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{item.name}</p>
                    <p className="text-xs text-gray-500">{item.category?.name}</p>
                  </div>
                </div>
                <div className="text-right ml-3">
                  <p className="font-bold text-primary text-sm">{item.totalQuantity} sold</p>
                  <p className="text-xs text-gray-500">${item.totalRevenue?.toFixed(2)}</p>
                </div>
              </motion.div>
            ))}
            {!topProducts || topProducts.length === 0 && (
              <div className="text-center py-8">
                <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500 text-sm">No sales data yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-2xl p-6 shadow-soft border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary" />
              Recent Orders
            </h3>
            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-semibold">
              {pendingOrders?.length || 0} pending
            </span>
          </div>
          <div className="space-y-2 max-h-[250px] overflow-y-auto">
            {pendingOrders?.slice(0, 5).map((order: any) => (
              <div key={order.id} className="p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{order.orderNumber}</p>
                    <p className="text-xs text-gray-500">{order.orderType}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary text-sm">${order.totalAmount.toFixed(2)}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(order.orderedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {(!pendingOrders || pendingOrders.length === 0) && (
              <p className="text-center text-gray-500 py-8 text-sm">No pending orders</p>
            )}
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white rounded-2xl p-6 shadow-soft border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-red-500" />
              Low Stock Alerts
            </h3>
            <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-semibold">
              {lowStockItems?.length || 0} items
            </span>
          </div>
          <div className="space-y-2 max-h-[250px] overflow-y-auto">
            {lowStockItems?.slice(0, 5).map((item: any) => (
              <div key={item.id} className="p-3 bg-red-50 border border-red-100 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{item.name}</p>
                    <p className="text-xs text-gray-600">Current: {item.currentStock} {item.unit}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-red-600 font-semibold">Min: {item.minStock}</p>
                    <p className="text-xs text-gray-500">Reorder soon</p>
                  </div>
                </div>
              </div>
            ))}
            {(!lowStockItems || lowStockItems.length === 0) && (
              <p className="text-center text-gray-500 py-8 text-sm">All stock levels good</p>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-white rounded-2xl p-6 shadow-soft border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Business Health
          </h3>
          <div className="space-y-4">
            <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-700">Customer Satisfaction</span>
                <span className="text-lg font-bold text-green-600">94%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: '94%' }}></div>
              </div>
            </div>

            <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-700">Order Completion Rate</span>
                <span className="text-lg font-bold text-blue-600">98%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '98%' }}></div>
              </div>
            </div>

            <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-700">Table Turnover</span>
                <span className="text-lg font-bold text-purple-600">3.2/hr</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-purple-500 h-2 rounded-full" style={{ width: '75%' }}></div>
              </div>
            </div>

            <div className="p-4 bg-gradient-to-br from-orange-50 to-red-50 rounded-xl border border-orange-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-700">Staff Efficiency</span>
                <span className="text-lg font-bold text-orange-600">87%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-orange-500 h-2 rounded-full" style={{ width: '87%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
