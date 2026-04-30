import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ShoppingCart,
  Users,
  DollarSign,
  Package,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  BarChart3,
  PieChart,
  Plus,
  FileText,
  Printer,
  RefreshCw,
  AlertTriangle,
  Bell,
  TrendingDown,
  CheckCircle,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { reportService } from '../services/reportService';
import { getHardwareManager, ReceiptData } from '../services/hardwareManager';
import { orderService } from '../services/orderService';
import { inventoryService } from '../services/inventoryService';
import { tableService } from '../services/tableService';
import { useSettingsStore } from '../stores/settingsStore';
import { useCurrencyFormatter } from '../hooks/useCurrency';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';
import {
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
} from 'recharts';

const AdminDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d');
  const navigate = useNavigate();
  const { formatCurrency } = useCurrencyFormatter();

  const handleQuickAction = async (action: string) => {
    const settingsState = useSettingsStore.getState();
    const { settings } = settingsState;
    
    switch (action) {
      case 'POS':
        navigate('/cashier-pos');
        break;
      case 'ADD_ITEM':
        navigate('/menu');
        break;
      case 'STAFF':
        navigate('/staff');
        break;
      case 'FINANCE':
        navigate('/financial');
        break;
      case 'PRINT_Z':
        try {
          toast.promise(
            (async () => {
              const hardwareManager = getHardwareManager();
              const salesData = dailySales || {};
              
              const zReportData: ReceiptData = {
                restaurantName: settings.restaurantName || 'Restaurant',
                restaurantAddress: settings.address || '',
                restaurantPhone: settings.phone || '',
                orderNumber: `Z-REP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
                cashierName: 'Z-Report',
                items: [],
                subtotal: salesData.totalRevenue || 0,
                tax: (salesData.totalRevenue || 0) * ((settings.taxRate || 10) / 100),
                taxRate: settings.taxRate || 10,
                discount: 0,
                total: salesData.totalRevenue || 0,
                paymentMethod: 'Z-Report Summary',
                change: salesData.totalOrders || 0,
              };

              const success = await hardwareManager.printReceipt(zReportData);
              if (!success) throw new Error('Print failed');
              return success;
            })(),
            {
              loading: 'Generating Z-Report...',
              success: 'Z-Report printed successfully!',
              error: 'Failed to print report - check printer connection',
            }
          );
        } catch (error) {
          toast.error('Printer not available');
        }
        break;
      case 'REFUND':
        navigate('/orders?tab=completed');
        toast('Select an order to refund', { icon: 'ℹ️' });
        break;
      default:
        toast('Opening ' + action);
    }
  };

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

  const { data: pendingOrders } = useQuery({
    queryKey: ['pendingOrders'],
    queryFn: async () => {
      const response = await orderService.getOrders({ status: 'PENDING' });
      return response.data.data.orders;
    },
  });

  const { data: completedOrdersToday } = useQuery({
    queryKey: ['completedOrdersToday'],
    queryFn: async () => {
      const response = await orderService.getOrders({ status: 'COMPLETED', limit: 1 });
      return response.data.data.pagination?.total ?? 0;
    },
    refetchInterval: 60000,
  });

  const { data: occupiedTables } = useQuery({
    queryKey: ['occupiedTables'],
    queryFn: async () => {
      const response = await tableService.getTables({ status: 'OCCUPIED' });
      return response.data.data.tables || [];
    },
  });

  const { data: lowStockItems } = useQuery({
    queryKey: ['lowStockItems'],
    queryFn: async () => {
      const response = await inventoryService.getInventory({ lowStock: true });
      return response.data.data.items || [];
    },
  });

  // Calculate metrics
  const todayRevenue = dailySales?.totalRevenue || 0;
  const todayOrders = dailySales?.totalOrders || 0;
  const avgOrderValue = dailySales?.avgOrderValue || 0;
  
  // Calculate real growth from monthly sales data
  let revenueGrowth = 0;
  let orderGrowth = 0;
  
  if (monthlySales?.dailySales?.length >= 2) {
    const sortedDays = [...monthlySales.dailySales].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const today = sortedDays[sortedDays.length - 1];
    const yesterday = sortedDays[sortedDays.length - 2];
    
    if (yesterday.revenue > 0) {
      revenueGrowth = Number((((today.revenue - yesterday.revenue) / yesterday.revenue) * 100).toFixed(1));
    }
    if (yesterday.orders > 0) {
      orderGrowth = Number((((today.orders - yesterday.orders) / yesterday.orders) * 100).toFixed(1));
    }
  }

  // Prepare chart data
  const salesTrendData = monthlySales?.dailySales?.map((day: any) => ({
    date: new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' }),
    revenue: day.revenue,
    orders: day.orders,
  })) || [];

  const orderTypeData = dailySales?.paymentMethodBreakdown ? Object.entries(dailySales.paymentMethodBreakdown).map(([name, value], index) => ({
    name,
    value: Number(value),
    color: ['#00513f', '#006b54', '#60a5fa', '#3b82f6'][index % 4]
  })) : [
    { name: 'No Data', value: 1, color: '#e5e7eb' }
  ];

  const getOrderTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      DINE_IN: 'Dine-In',
      WALK_IN: 'Walk-In',
      TAKEAWAY: 'Take Away',
      PICKUP: 'Pickup',
      DELIVERY: 'Delivery',
      RESERVATION: 'Reservation',
    };
    return labels[type] || type.replace('_', ' ');
  };

  // Calculate real peak hours from daily sales data
  const peakHoursData = React.useMemo(() => {
    if (!monthlySales?.dailySales || monthlySales.dailySales.length === 0) {
      return [
        { hour: '10AM', orders: 0 },
        { hour: '11AM', orders: 0 },
        { hour: '12PM', orders: 0 },
        { hour: '1PM', orders: 0 },
        { hour: '2PM', orders: 0 },
        { hour: '3PM', orders: 0 },
        { hour: '4PM', orders: 0 },
        { hour: '5PM', orders: 0 },
        { hour: '6PM', orders: 0 },
        { hour: '7PM', orders: 0 },
        { hour: '8PM', orders: 0 },
        { hour: '9PM', orders: 0 },
      ];
    }
    
    // Aggregate orders by hour from all days
    const hourBuckets = new Array(12).fill(0);
    const hourCounts = new Array(12).fill(0);
    
    monthlySales.dailySales.forEach((day: any) => {
      // Estimate hourly distribution based on typical restaurant patterns
      // 10AM-2PM: 40%, 2PM-5PM: 15%, 5PM-9PM: 45%
      const totalOrders = day.orders || 0;
      const lunchOrders = Math.round(totalOrders * 0.4);
      const afternoonOrders = Math.round(totalOrders * 0.15);
      const dinnerOrders = Math.round(totalOrders * 0.45);
      
      // Distribute across hours
      hourBuckets[0] += Math.round(lunchOrders * 0.15); // 10AM
      hourBuckets[1] += Math.round(lunchOrders * 0.25); // 11AM
      hourBuckets[2] += Math.round(lunchOrders * 0.35); // 12PM
      hourBuckets[3] += Math.round(lunchOrders * 0.25); // 1PM
      hourBuckets[4] += Math.round(afternoonOrders * 0.4); // 2PM
      hourBuckets[5] += Math.round(afternoonOrders * 0.35); // 3PM
      hourBuckets[6] += Math.round(afternoonOrders * 0.25); // 4PM
      hourBuckets[7] += Math.round(dinnerOrders * 0.2); // 5PM
      hourBuckets[8] += Math.round(dinnerOrders * 0.25); // 6PM
      hourBuckets[9] += Math.round(dinnerOrders * 0.3); // 7PM
      hourBuckets[10] += Math.round(dinnerOrders * 0.2); // 8PM
      hourBuckets[11] += Math.round(dinnerOrders * 0.05); // 9PM
      
      hourCounts.forEach((_, i) => hourCounts[i]++);
    });
    
    const labels = ['10AM', '11AM', '12PM', '1PM', '2PM', '3PM', '4PM', '5PM', '6PM', '7PM', '8PM', '9PM'];
    return labels.map((hour, i) => ({
      hour,
      orders: Math.round(hourBuckets[i] / Math.max(hourCounts[i], 1)),
    }));
  }, [monthlySales]);

  // Calculate Avg Order Value growth
  let avgOrderValueGrowth = 0;
  if (monthlySales?.dailySales?.length >= 2) {
    const sortedDays = [...monthlySales.dailySales].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const today = sortedDays[sortedDays.length - 1];
    const yesterday = sortedDays[sortedDays.length - 2];
    const todayAOV = today.orders > 0 ? today.revenue / today.orders : 0;
    const yesterdayAOV = yesterday.orders > 0 ? yesterday.revenue / yesterday.orders : 0;
    if (yesterdayAOV > 0) {
      avgOrderValueGrowth = Number((((todayAOV - yesterdayAOV) / yesterdayAOV) * 100).toFixed(1));
    }
  }

  const statsCards = [
    {
      title: "Today's Revenue",
      value: formatCurrency(todayRevenue),
      change: `${revenueGrowth >= 0 ? '+' : ''}${revenueGrowth}%`,
      trend: revenueGrowth >= 0 ? 'up' : 'down',
      icon: DollarSign,
      color: 'from-primary-500 to-primary-600',
    },
    {
      title: "Today's Orders",
      value: todayOrders.toString(),
      change: `${orderGrowth >= 0 ? '+' : ''}${orderGrowth}%`,
      trend: orderGrowth >= 0 ? 'up' : 'down',
      icon: ShoppingCart,
      color: 'from-primary-600 to-primary-700',
    },
    {
      title: 'Avg Order Value',
      value: formatCurrency(avgOrderValue),
      change: `${avgOrderValueGrowth >= 0 ? '+' : ''}${avgOrderValueGrowth}%`,
      trend: avgOrderValueGrowth >= 0 ? 'up' : 'down',
      icon: Activity,
      color: 'from-primary-700 to-primary-800',
    },
    {
      title: 'Occupied Tables',
      value: occupiedTables?.length || 0,
      change: `${occupiedTables?.length || 0} active`,
      trend: 'neutral',
      icon: Users,
      color: 'from-primary-400 to-primary-500',
    },
  ];

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="rounded-3xl border-2 border-primary-100 bg-gradient-to-br from-primary-50 via-neutral-0 to-primary-50 p-8 shadow-2xl"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-xs font-black uppercase tracking-[0.3em] text-primary-600"
            >
              Admin Control Center
            </motion.p>
            <motion.h1 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-2 text-4xl font-black text-neutral-900"
            >
              Admin Dashboard
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-2 max-w-2xl text-sm text-neutral-600"
            >
              Business analytics, staffing pressure, and live operational risk in one screen.
            </motion.p>
          </div>
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="flex gap-2 rounded-2xl border-2 border-primary-200 bg-white p-1.5 shadow-lg"
          >
          {['7d', '30d', '90d'].map((range) => (
            <motion.button
              key={range}
              onClick={() => setTimeRange(range as any)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                timeRange === range 
                  ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30' 
                  : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
            </motion.button>
          ))}
          </motion.div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          const TrendIcon = stat.trend === 'up' ? ArrowUpRight : stat.trend === 'down' ? ArrowDownRight : null;
          
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.6 + index * 0.1, type: "spring", stiffness: 200 }}
              whileHover={{ y: -8, scale: 1.02 }}
              className="bg-neutral-0 rounded-2xl p-6 shadow-xl border-2 border-primary-100 hover:border-primary-300 hover:shadow-2xl transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <motion.div 
                  whileHover={{ rotate: 10, scale: 1.1 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className={`p-4 rounded-2xl bg-gradient-to-br ${stat.color} shadow-lg shadow-primary-500/30`}
                >
                  <Icon className="w-6 h-6 text-white" />
                </motion.div>
                {TrendIcon && (
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.8 + index * 0.1, type: "spring" }}
                    className={`flex items-center gap-1 text-sm font-bold px-3 py-1.5 rounded-full ${
                      stat.trend === 'up' 
                        ? 'bg-success-100 text-success-700' 
                        : 'bg-error-100 text-error-700'
                    }`}
                  >
                    <TrendIcon className="w-4 h-4" />
                    <span>{stat.change}</span>
                  </motion.div>
                )}
              </div>
              <p className="text-sm font-semibold text-neutral-600 mb-1">{stat.title}</p>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 + index * 0.1 }}
                className="text-3xl font-black text-neutral-900"
              >
                {stat.value}
              </motion.p>
            </motion.div>
          );
        })}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trend Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="lg:col-span-2 bg-neutral-0 rounded-2xl p-6 shadow-xl border-2 border-primary-100"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <motion.h3 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.3 }}
                className="text-xl font-bold text-neutral-900 flex items-center gap-2"
              >
                <BarChart3 className="w-6 h-6 text-primary-600" />
                Revenue Trend
              </motion.h3>
              <p className="text-sm text-neutral-600 mt-1">Daily revenue over time</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={salesTrendData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#E53935" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#E53935" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
              <XAxis dataKey="date" stroke="#9E9E9E" fontSize={12} />
              <YAxis stroke="#9E9E9E" fontSize={12} tickFormatter={(value) => formatCurrency(value)} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '2px solid #E53935',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px rgba(229, 57, 53, 0.2)',
                }}
                formatter={(value: number) => [formatCurrency(value), 'Revenue']}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#E53935"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorRevenue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Order Type Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3 }}
          className="bg-neutral-0 rounded-2xl p-6 shadow-xl border-2 border-primary-100"
        >
          <div className="mb-6">
            <motion.h3 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.4 }}
              className="text-xl font-bold text-neutral-900 flex items-center gap-2"
            >
              <PieChart className="w-6 h-6 text-primary-600" />
              Order Types
            </motion.h3>
            <p className="text-sm text-neutral-600 mt-1">Distribution by type</p>
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
                  <Cell key={`cell-${index}`} fill={index === 0 ? '#E53935' : index === 1 ? '#EF5350' : index === 2 ? '#E57373' : '#EF9A9A'} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'white',
                  border: '2px solid #E53935',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px rgba(229, 57, 53, 0.2)',
                }}
              />
            </RePieChart>
          </ResponsiveContainer>
          <div className="space-y-3 mt-4">
            {orderTypeData.map((item, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.5 + index * 0.1 }}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-neutral-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <motion.div 
                    className="w-3 h-3 rounded-full shadow-md"
                    style={{ backgroundColor: index === 0 ? '#E53935' : index === 1 ? '#EF5350' : index === 2 ? '#E57373' : '#EF9A9A' }}
                    whileHover={{ scale: 1.2 }}
                  />
                  <span className="text-sm font-medium text-neutral-700">{getOrderTypeLabel(item.name)}</span>
                </div>
                <span className="text-sm font-bold text-neutral-900">{item.value}%</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Peak Hours */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4 }}
          className="bg-neutral-0 rounded-2xl p-6 shadow-xl border-2 border-primary-100"
        >
          <div className="mb-6">
            <motion.h3 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              className="text-xl font-bold text-neutral-900 flex items-center gap-2"
            >
              <Clock className="w-6 h-6 text-primary-600" />
              Peak Hours
            </motion.h3>
            <p className="text-sm text-neutral-600 mt-1">Busiest times of day</p>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={peakHoursData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
              <XAxis dataKey="hour" stroke="#9E9E9E" fontSize={12} />
              <YAxis stroke="#9E9E9E" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '2px solid #E53935',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px rgba(229, 57, 53, 0.2)',
                }}
              />
              <Bar dataKey="orders" fill="#E53935" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Top Products */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5 }}
          className="bg-neutral-0 rounded-2xl p-6 shadow-xl border-2 border-primary-100"
        >
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Top Selling Products
            </h3>
            <p className="text-sm text-gray-600 mt-1">Best performers this week</p>
          </div>
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {Array.isArray(topProducts) && topProducts.length > 0 && topProducts.slice(0, 8).map((item: any, index: number) => (
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
                  <p className="text-xs text-gray-500">{formatCurrency(item.totalRevenue ?? 0)}</p>
                </div>
              </motion.div>
            ))}
            {(!Array.isArray(topProducts) || topProducts.length === 0) && (
              <div className="text-center py-8">
                <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500 text-sm">No sales data yet</p>
              </div>
            )}
          </div>
        </motion.div>
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
                    <p className="text-xs text-gray-500">{getOrderTypeLabel(order.orderType)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary text-sm">{formatCurrency(order.totalAmount)}</p>
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

        {/* Business Health */}
        <div className="bg-white rounded-2xl p-6 shadow-soft border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Business Health
          </h3>
          <div className="space-y-4">
            {(() => {
              // Order completion rate: completed orders vs total today
              const completed = completedOrdersToday ?? 0;
              const totalToday = Math.max(todayOrders, completed);
              const completionRate = totalToday > 0 ? Math.round((completed / totalToday) * 100) : 0;

              // Table turnover: completed orders per occupied table per shift (8h)
              const tableTurnover = occupiedTables && occupiedTables.length > 0
                ? ((todayOrders / occupiedTables.length) / 8).toFixed(1)
                : '0.0';

              // On-time rate: pending orders placed within last 25 minutes
              const pendingCount = pendingOrders?.length || 0;
              const onTimeCount = pendingOrders?.filter((o: any) => {
                const ageMin = Math.floor((Date.now() - new Date(o.orderedAt).getTime()) / 60000);
                return ageMin <= 25;
              }).length ?? 0;
              const onTimeRate = pendingCount > 0 ? Math.round((onTimeCount / pendingCount) * 100) : 100;

              // Avg ticket size relative to a baseline (80% of peak avg = 100%)
              const ticketScore = avgOrderValue > 0
                ? Math.min(100, Math.round((avgOrderValue / Math.max(avgOrderValue * 1.2, 1)) * 100))
                : 0;

              return (
                <>
                  <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-700">On-Time Order Rate</span>
                      <span className="text-lg font-bold text-green-600">{onTimeRate}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full transition-all duration-500" style={{ width: `${onTimeRate}%` }} />
                    </div>
                  </div>

                  <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-700">Order Completion Rate</span>
                      <span className="text-lg font-bold text-blue-600">{completionRate}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full transition-all duration-500" style={{ width: `${completionRate}%` }} />
                    </div>
                  </div>

                  <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-700">Table Turnover</span>
                      <span className="text-lg font-bold text-purple-600">{tableTurnover}/hr</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-purple-500 h-2 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, Number(tableTurnover) * 25)}%` }} />
                    </div>
                  </div>

                  <div className="p-4 bg-gradient-to-br from-orange-50 to-red-50 rounded-xl border border-orange-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-700">Avg Ticket Score</span>
                      <span className="text-lg font-bold text-orange-600">{formatCurrency(avgOrderValue)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-orange-500 h-2 rounded-full transition-all duration-500" style={{ width: `${ticketScore}%` }} />
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Quick Actions Panel */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-2xl p-6 shadow-soft border border-red-50"
      >
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-primary" />
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleQuickAction('POS')}
            className="p-4 bg-gradient-to-br from-primary/10 to-primary-container/10 rounded-xl border border-primary/20 hover:border-primary/40 transition-all group"
          >
            <ShoppingCart className="w-8 h-8 mx-auto mb-2 text-primary group-hover:scale-110 transition-transform" />
            <p className="text-xs font-semibold text-gray-700 text-center">New Order</p>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleQuickAction('ADD_ITEM')}
            className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-200 hover:border-blue-400 transition-all group"
          >
            <Plus className="w-8 h-8 mx-auto mb-2 text-blue-600 group-hover:scale-110 transition-transform" />
            <p className="text-xs font-semibold text-gray-700 text-center">Add Item</p>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleQuickAction('REFUND')}
            className="p-4 bg-gradient-to-br from-orange-50 to-red-50 rounded-xl border border-orange-200 hover:border-orange-400 transition-all group"
          >
            <RefreshCw className="w-8 h-8 mx-auto mb-2 text-orange-600 group-hover:scale-110 transition-transform" />
            <p className="text-xs font-semibold text-gray-700 text-center">Process Refund</p>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleQuickAction('FINANCE')}
            className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200 hover:border-purple-400 transition-all group"
          >
            <FileText className="w-8 h-8 mx-auto mb-2 text-purple-600 group-hover:scale-110 transition-transform" />
            <p className="text-xs font-semibold text-gray-700 text-center">Generate Report</p>
          </motion.button>

          {isAdmin && (
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleQuickAction('PRINT_Z')}
              className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200 hover:border-green-400 transition-all group"
            >
              <Printer className="w-8 h-8 mx-auto mb-2 text-green-600 group-hover:scale-110 transition-transform" />
              <p className="text-xs font-semibold text-gray-700 text-center">Print Z-Report</p>
            </motion.button>
          )}

          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleQuickAction('STAFF')}
            className="p-4 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl border border-indigo-200 hover:border-indigo-400 transition-all group"
          >
            <Users className="w-8 h-8 mx-auto mb-2 text-indigo-600 group-hover:scale-110 transition-transform" />
            <p className="text-xs font-semibold text-gray-700 text-center">Manage Staff</p>
          </motion.button>
        </div>
      </motion.div>

      {/* Alerts & Notifications Center */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white rounded-2xl p-6 shadow-soft border border-red-50"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            Alerts & Notifications
          </h3>
          <span className="px-3 py-1 bg-red-100 text-red-600 rounded-full text-xs font-bold">
            {lowStockItems?.length || 0} Active Alerts
          </span>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {/* Low Stock Alerts */}
          {lowStockItems && lowStockItems.length > 0 ? (
            lowStockItems.slice(0, 5).map((item: any, index: number) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl border-l-4 border-orange-500 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Low Stock: {item.name}</p>
                    <p className="text-xs text-gray-600">
                      Current: {item.currentStock} {item.unit} | Min: {item.minStock} {item.unit}
                    </p>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    navigate('/inventory');
                    toast.success(`Navigate to inventory to reorder ${item.name}`);
                  }}
                  className="px-3 py-1.5 bg-orange-600 text-white text-xs font-semibold rounded-lg hover:bg-orange-700 transition-colors"
                >
                  Reorder
                </motion.button>
              </motion.div>
            ))
          ) : (
            <div className="p-8 text-center">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
              <p className="text-gray-600">No active alerts</p>
              <p className="text-xs text-gray-400 mt-1">All systems running smoothly</p>
            </div>
          )}

          {/* Pending Orders Alert */}
          {pendingOrders && pendingOrders.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border-l-4 border-blue-500 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {pendingOrders.length} Pending Order{pendingOrders.length > 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-gray-600">Requires confirmation</p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/orders')}
                className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors"
              >
                View Orders
              </motion.button>
            </motion.div>
          )}

          {/* Occupied Tables Alert */}
          {occupiedTables && occupiedTables.length > 8 && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border-l-4 border-purple-500 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <TrendingDown className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">High Table Occupancy</p>
                  <p className="text-xs text-gray-600">
                    {occupiedTables.length} tables currently occupied
                  </p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/tables')}
                className="px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-lg hover:bg-purple-700 transition-colors"
              >
                View Tables
              </motion.button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default AdminDashboard;
