import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Truck, MapPin, Clock, DollarSign, Phone, Mail,
  User, Navigation, Package, TrendingUp, Plus,
  Search, Filter, CheckCircle, MoreVertical
} from 'lucide-react';
import { useCurrencyFormatter } from '../hooks/useCurrency';

const DeliveryManagementScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'deliveries' | 'riders' | 'zones' | 'analytics'>('deliveries');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { formatCurrency } = useCurrencyFormatter();

  // Mock delivery data
  const deliveries = [
    { id: 'DEL-001', customer: 'John Smith', address: '123 Main St, Apt 4B', phone: '+1 234-567-8900', orderTotal: 45.50, status: 'IN_TRANSIT', rider: 'Mike R.', estimatedTime: '15 min', placedAt: '6:30 PM' },
    { id: 'DEL-002', customer: 'Sarah Johnson', address: '456 Oak Ave', phone: '+1 234-567-8901', orderTotal: 32.75, status: 'PENDING', rider: null, estimatedTime: '30 min', placedAt: '6:45 PM' },
    { id: 'DEL-003', customer: 'David Brown', address: '789 Pine Rd', phone: '+1 234-567-8902', orderTotal: 58.20, status: 'DELIVERED', rider: 'Alex T.', estimatedTime: 'Delivered', placedAt: '5:15 PM' },
    { id: 'DEL-004', customer: 'Emily Davis', address: '321 Elm St', phone: '+1 234-567-8903', orderTotal: 41.90, status: 'PREPARING', rider: null, estimatedTime: '40 min', placedAt: '7:00 PM' },
  ];

  // Mock riders data
  const riders = [
    { id: '1', name: 'Mike Rodriguez', phone: '+1 234-567-8910', email: 'mike@poslytic.com', status: 'ON_DELIVERY', rating: 4.8, totalDeliveries: 234, currentDelivery: 'DEL-001' },
    { id: '2', name: 'Alex Thompson', phone: '+1 234-567-8911', email: 'alex@poslytic.com', status: 'AVAILABLE', rating: 4.9, totalDeliveries: 189, currentDelivery: null },
    { id: '3', name: 'Chris Martinez', phone: '+1 234-567-8912', email: 'chris@poslytic.com', status: 'OFFLINE', rating: 4.7, totalDeliveries: 156, currentDelivery: null },
    { id: '4', name: 'Jessica Lee', phone: '+1 234-567-8913', email: 'jessica@poslytic.com', status: 'ON_DELIVERY', rating: 4.6, totalDeliveries: 201, currentDelivery: 'DEL-005' },
  ];

  // Mock delivery zones
  const zones = [
    { id: '1', name: 'Downtown', radius: '3 miles', fee: 2.99, activeOrders: 5, color: 'bg-blue-500' },
    { id: '2', name: 'Midtown', radius: '5 miles', fee: 4.99, activeOrders: 3, color: 'bg-green-500' },
    { id: '3', name: 'Uptown', radius: '7 miles', fee: 6.99, activeOrders: 2, color: 'bg-purple-500' },
    { id: '4', name: 'Suburbs', radius: '10 miles', fee: 9.99, activeOrders: 1, color: 'bg-orange-500' },
  ];

  // Mock analytics
  const analytics = {
    totalDeliveries: 47,
    avgDeliveryTime: '28 min',
    onTimeRate: 94,
    totalRevenue: 1847.50,
    avgOrderValue: 39.31,
    activeRiders: 2,
  };

  const stats = {
    pending: deliveries.filter(d => d.status === 'PENDING').length,
    preparing: deliveries.filter(d => d.status === 'PREPARING').length,
    inTransit: deliveries.filter(d => d.status === 'IN_TRANSIT').length,
    delivered: deliveries.filter(d => d.status === 'DELIVERED').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 font-manrope">Delivery Management</h1>
          <p className="text-gray-600 mt-1">Manage deliveries, riders, and delivery zones</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="px-4 py-2 bg-gradient-to-r from-primary to-primary-container text-white rounded-xl font-semibold flex items-center gap-2 shadow-lg"
        >
          <Plus className="w-5 h-5" />
          New Delivery
        </motion.button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Today's Deliveries</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{analytics.totalDeliveries}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <Truck className="w-6 h-6 text-blue-600" />
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
              <p className="text-sm text-gray-500">Avg Delivery Time</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{analytics.avgDeliveryTime}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <Clock className="w-6 h-6 text-green-600" />
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
              <p className="text-sm text-gray-500">On-Time Rate</p>
              <p className="text-3xl font-bold text-purple-600 mt-1">{analytics.onTimeRate}%</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-purple-600" />
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
              <p className="text-sm text-gray-500">Delivery Revenue</p>
              <p className="text-3xl font-bold text-primary mt-1">{formatCurrency(analytics.totalRevenue)}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl p-2 shadow-sm border border-gray-100 inline-flex">
        {[
          { id: 'deliveries', label: 'Active Deliveries', icon: Truck },
          { id: 'riders', label: 'Riders', icon: User },
          { id: 'zones', label: 'Delivery Zones', icon: MapPin },
          { id: 'analytics', label: 'Analytics', icon: TrendingUp },
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

      {/* Filters - Only for Deliveries tab */}
      {activeTab === 'deliveries' && (
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search deliveries..."
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
            <option value="all">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="PREPARING">Preparing</option>
            <option value="IN_TRANSIT">In Transit</option>
            <option value="DELIVERED">Delivered</option>
          </select>

          <button className="px-4 py-3 bg-white border-2 border-gray-200 rounded-xl hover:border-primary transition-colors">
            <Filter className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      )}

      {/* DELIVERIES TAB */}
      {activeTab === 'deliveries' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Pending', count: stats.pending, color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
            { label: 'Preparing', count: stats.preparing, color: 'bg-blue-100 text-blue-700 border-blue-300' },
            { label: 'In Transit', count: stats.inTransit, color: 'bg-purple-100 text-purple-700 border-purple-300' },
            { label: 'Delivered', count: stats.delivered, color: 'bg-green-100 text-green-700 border-green-300' },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`rounded-2xl p-4 border-2 ${stat.color}`}
            >
              <p className="text-sm font-semibold">{stat.label}</p>
              <p className="text-3xl font-bold mt-1">{stat.count}</p>
            </motion.div>
          ))}
        </div>
      )}

      {activeTab === 'deliveries' && (
        <div className="space-y-4">
          {deliveries.map((delivery, index) => (
            <motion.div
              key={delivery.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${
                    delivery.status === 'DELIVERED' ? 'bg-green-100' :
                    delivery.status === 'IN_TRANSIT' ? 'bg-purple-100' :
                    delivery.status === 'PREPARING' ? 'bg-blue-100' :
                    'bg-yellow-100'
                  }`}>
                    <Package className={`w-8 h-8 ${
                      delivery.status === 'DELIVERED' ? 'text-green-600' :
                      delivery.status === 'IN_TRANSIT' ? 'text-purple-600' :
                      delivery.status === 'PREPARING' ? 'text-blue-600' :
                      'text-yellow-600'
                    }`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-gray-900">{delivery.id}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        delivery.status === 'DELIVERED' ? 'bg-green-100 text-green-700' :
                        delivery.status === 'IN_TRANSIT' ? 'bg-purple-100 text-purple-700' :
                        delivery.status === 'PREPARING' ? 'bg-blue-100 text-blue-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {delivery.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{delivery.customer}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {delivery.address}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="w-4 h-4" />
                        {delivery.phone}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">{formatCurrency(delivery.orderTotal)}</p>
                  <p className="text-sm text-gray-500 mt-1">Est: {delivery.estimatedTime}</p>
                  {delivery.rider && (
                    <p className="text-xs text-gray-600 mt-1">Rider: {delivery.rider}</p>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* RIDERS TAB */}
      {activeTab === 'riders' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {riders.map((rider, index) => (
            <motion.div
              key={rider.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary-container/20 flex items-center justify-center">
                    <User className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{rider.name}</h3>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                      rider.status === 'AVAILABLE' ? 'bg-green-100 text-green-700' :
                      rider.status === 'ON_DELIVERY' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {rider.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-yellow-500">★</span>
                  <span className="font-bold text-gray-900">{rider.rating}</span>
                </div>
              </div>
              
              <div className="space-y-2 mb-4 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone className="w-4 h-4" />
                  {rider.phone}
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail className="w-4 h-4" />
                  {rider.email}
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Package className="w-4 h-4" />
                  {rider.totalDeliveries} deliveries
                </div>
                {rider.currentDelivery && (
                  <div className="flex items-center gap-2 text-blue-600 font-semibold">
                    <Navigation className="w-4 h-4" />
                    {rider.currentDelivery}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button className="flex-1 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-semibold hover:bg-blue-100 transition-colors">
                  View Details
                </button>
                <button className="p-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ZONES TAB */}
      {activeTab === 'zones' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {zones.map((zone, index) => (
            <motion.div
              key={zone.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{zone.name}</h3>
                  <p className="text-sm text-gray-500">{zone.radius} radius</p>
                </div>
                <div className={`w-12 h-12 rounded-full ${zone.color} flex items-center justify-center`}>
                  <MapPin className="w-6 h-6 text-white" />
                </div>
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Delivery Fee:</span>
                  <span className="font-bold text-primary">{formatCurrency(zone.fee)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Active Orders:</span>
                  <span className="font-semibold">{zone.activeOrders}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button className="flex-1 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-semibold hover:bg-blue-100 transition-colors">
                  Edit Zone
                </button>
                <button className="p-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ANALYTICS TAB */}
      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
          >
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Delivery Performance
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                <span className="text-gray-600">Total Deliveries Today</span>
                <span className="text-2xl font-bold text-gray-900">{analytics.totalDeliveries}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                <span className="text-gray-600">Average Delivery Time</span>
                <span className="text-2xl font-bold text-green-600">{analytics.avgDeliveryTime}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                <span className="text-gray-600">On-Time Delivery Rate</span>
                <span className="text-2xl font-bold text-blue-600">{analytics.onTimeRate}%</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                <span className="text-gray-600">Active Riders</span>
                <span className="text-2xl font-bold text-purple-600">{analytics.activeRiders}</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
          >
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              Revenue Breakdown
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                <span className="text-gray-600">Total Delivery Revenue</span>
                <span className="text-2xl font-bold text-primary">{formatCurrency(analytics.totalRevenue)}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                <span className="text-gray-600">Average Order Value</span>
                <span className="text-2xl font-bold text-green-600">{formatCurrency(analytics.avgOrderValue)}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                <span className="text-gray-600">Delivery Fees Collected</span>
                <span className="text-2xl font-bold text-blue-600">$147.50</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                <span className="text-gray-600">Tips Received</span>
                <span className="text-2xl font-bold text-purple-600">$89.25</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default DeliveryManagementScreen;
