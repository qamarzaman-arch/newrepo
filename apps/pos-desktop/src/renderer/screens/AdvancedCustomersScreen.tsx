import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, Tag, PieChart, Search, Filter, Plus, 
  Crown, Mail, Phone, Calendar,
  DollarSign, ShoppingCart, Award, Target, Edit, Eye
} from 'lucide-react';
import { useCustomers } from '../hooks/useCustomers';
import { useCurrencyFormatter } from '../hooks/useCurrency';

const AdvancedCustomersScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'customers' | 'loyalty' | 'promotions' | 'segments'>('customers');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const { formatCurrency } = useCurrencyFormatter();

  const { data: customersData } = useCustomers({
    search: searchQuery || undefined,
    page,
    limit: 20,
  });

  const customers = customersData?.customers || [];
  const pagination = customersData?.pagination || {};

  // Mock loyalty tiers
  const loyaltyTiers = [
    { id: '1', name: 'Bronze', minPoints: 0, discount: 5, color: 'from-amber-600 to-amber-800', members: 145 },
    { id: '2', name: 'Silver', minPoints: 500, discount: 10, color: 'from-gray-400 to-gray-600', members: 78 },
    { id: '3', name: 'Gold', minPoints: 1500, discount: 15, color: 'from-yellow-400 to-yellow-600', members: 32 },
    { id: '4', name: 'Platinum', minPoints: 3000, discount: 20, color: 'from-blue-400 to-blue-600', members: 12 },
  ];

  // Mock promotions
  const promotions = [
    { id: '1', name: 'Happy Hour Special', type: 'PERCENTAGE', value: 20, status: 'ACTIVE', startDate: '2024-01-15', endDate: '2024-02-15', usage: 234 },
    { id: '2', name: 'New Customer Discount', type: 'FIXED', value: 10, status: 'ACTIVE', startDate: '2024-01-01', endDate: '2024-12-31', usage: 89 },
    { id: '3', name: 'Weekend Family Deal', type: 'PERCENTAGE', value: 15, status: 'SCHEDULED', startDate: '2024-01-20', endDate: '2024-01-21', usage: 0 },
    { id: '4', name: 'Birthday Special', type: 'FIXED', value: 25, status: 'ACTIVE', startDate: '2024-01-01', endDate: '2024-12-31', usage: 45 },
  ];

  // Mock customer segments
  const segments = [
    { id: '1', name: 'VIP Customers', count: 45, avgSpend: 125.50, frequency: 'Weekly', criteria: 'Total spent > $1000' },
    { id: '2', name: 'Regular Diners', count: 234, avgSpend: 45.75, frequency: 'Bi-weekly', criteria: '5+ orders in 30 days' },
    { id: '3', name: 'Occasional Visitors', count: 567, avgSpend: 28.30, frequency: 'Monthly', criteria: '1-2 orders per month' },
    { id: '4', name: 'At Risk', count: 89, avgSpend: 35.20, frequency: 'Rarely', criteria: 'No order in 60+ days' },
  ];

  const stats = {
    totalCustomers: customers.length || 678,
    activeLoyaltyMembers: 267,
    totalPromotions: promotions.length,
    avgCustomerValue: 67.50,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 font-manrope">Customer CRM & Loyalty</h1>
          <p className="text-gray-600 mt-1">Manage customers, loyalty programs, and promotions</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="px-4 py-2 bg-gradient-to-r from-primary to-primary-container text-white rounded-xl font-semibold flex items-center gap-2 shadow-lg"
        >
          <Plus className="w-5 h-5" />
          Add Customer
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
              <p className="text-sm text-gray-500">Total Customers</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalCustomers}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
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
              <p className="text-sm text-gray-500">Loyalty Members</p>
              <p className="text-3xl font-bold text-purple-600 mt-1">{stats.activeLoyaltyMembers}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
              <Crown className="w-6 h-6 text-purple-600" />
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
              <p className="text-sm text-gray-500">Active Promotions</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{stats.totalPromotions}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <Tag className="w-6 h-6 text-green-600" />
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
              <p className="text-sm text-gray-500">Avg Customer Value</p>
              <p className="text-3xl font-bold text-primary mt-1">{formatCurrency(stats.avgCustomerValue)}</p>
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
          { id: 'customers', label: 'Customers', icon: Users },
          { id: 'loyalty', label: 'Loyalty Program', icon: Crown },
          { id: 'promotions', label: 'Promotions', icon: Tag },
          { id: 'segments', label: 'Segments', icon: PieChart },
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

      {/* Filters - Only for Customers tab */}
      {activeTab === 'customers' && (
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name, phone, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
            />
          </div>
          
          <button className="px-4 py-3 bg-white border-2 border-gray-200 rounded-xl hover:border-primary transition-colors">
            <Filter className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      )}

      {/* CUSTOMERS TAB */}
      {activeTab === 'customers' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Customer</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Phone</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Email</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Loyalty Points</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Orders</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Total Spent</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {customers.map((customer: any) => (
                <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary-container/20 flex items-center justify-center">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{customer.firstName} {customer.lastName}</p>
                        <p className="text-xs text-gray-500">Since {new Date(customer.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      {customer.phone}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      {customer.email || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-semibold">
                      {customer.loyaltyPoints || 0} pts
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4 text-gray-400" />
                      {customer.totalOrders || 0}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-bold text-primary">{formatCurrency(customer.totalSpent || 0)}</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button className="p-2 hover:bg-blue-100 rounded-lg transition-colors">
                        <Eye className="w-4 h-4 text-blue-600" />
                      </button>
                      <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <Edit className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {customers.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No customers found</p>
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <p className="text-sm text-gray-600">Page {page} of {pagination.totalPages}</p>
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

      {/* LOYALTY PROGRAM TAB */}
      {activeTab === 'loyalty' && (
        <div className="space-y-6">
          {/* Loyalty Tiers */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {loyaltyTiers.map((tier, index) => (
              <motion.div
                key={tier.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${tier.color} flex items-center justify-center mb-4 mx-auto`}>
                  <Crown className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 text-center mb-2">{tier.name}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Min Points:</span>
                    <span className="font-semibold">{tier.minPoints}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Discount:</span>
                    <span className="font-bold text-green-600">{tier.discount}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Members:</span>
                    <span className="font-semibold">{tier.members}</span>
                  </div>
                </div>
                <button className="w-full mt-4 py-2 bg-gray-50 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-100 transition-colors">
                  Configure Tier
                </button>
              </motion.div>
            ))}
          </div>

          {/* Loyalty Settings */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" />
              Loyalty Program Settings
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Points Per Dollar</label>
                <input
                  type="number"
                  defaultValue={10}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Points Expiry (Days)</label>
                <input
                  type="number"
                  defaultValue={365}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Redemption Rate</label>
                <select className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none">
                  <option>$1 = 100 points</option>
                  <option>$1 = 50 points</option>
                  <option>$1 = 200 points</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-2 bg-primary text-white rounded-xl font-semibold"
              >
                Save Settings
              </motion.button>
            </div>
          </div>
        </div>
      )}

      {/* PROMOTIONS TAB */}
      {activeTab === 'promotions' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-4 py-2 bg-gradient-to-r from-primary to-primary-container text-white rounded-xl font-semibold flex items-center gap-2 shadow-lg"
            >
              <Plus className="w-5 h-5" />
              Create Promotion
            </motion.button>
          </div>

          {promotions.map((promo, index) => (
            <motion.div
              key={promo.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-4">
                  <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${
                    promo.status === 'ACTIVE' ? 'bg-green-100' : 'bg-blue-100'
                  }`}>
                    <Tag className={`w-8 h-8 ${
                      promo.status === 'ACTIVE' ? 'text-green-600' : 'text-blue-600'
                    }`} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{promo.name}</h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {promo.startDate} - {promo.endDate}
                      </span>
                      <span className="flex items-center gap-1">
                        <Target className="w-4 h-4" />
                        {promo.usage} uses
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">
                    {promo.type === 'PERCENTAGE' ? `${promo.value}% OFF` : `$${promo.value} OFF`}
                  </p>
                  <span className={`inline-block mt-2 px-4 py-2 rounded-full text-sm font-semibold ${
                    promo.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {promo.status}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* SEGMENTS TAB */}
      {activeTab === 'segments' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {segments.map((segment, index) => (
            <motion.div
              key={segment.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{segment.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{segment.criteria}</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-primary">{segment.count}</p>
                  <p className="text-xs text-gray-500">customers</p>
                </div>
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Avg Spend:</span>
                  <span className="font-semibold">{formatCurrency(segment.avgSpend)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Frequency:</span>
                  <span className="font-semibold">{segment.frequency}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button className="flex-1 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-semibold hover:bg-blue-100 transition-colors">
                  View Customers
                </button>
                <button className="p-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
                  <Edit className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdvancedCustomersScreen;
