import React from 'react';
import { motion } from 'framer-motion';
import { Package, TrendingUp, Truck, DollarSign } from 'lucide-react';

const VendorsScreen: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 font-manrope">Vendor Management</h1>
        <p className="text-gray-600 mt-1">Manage suppliers, purchase orders, and procurement</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active Vendors</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">15</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
              <Truck className="w-6 h-6 text-indigo-600" />
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
              <p className="text-sm text-gray-500">Pending POs</p>
              <p className="text-3xl font-bold text-orange-600 mt-1">7</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
              <Package className="w-6 h-6 text-orange-600" />
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
              <p className="text-sm text-gray-500">Monthly Spend</p>
              <p className="text-3xl font-bold text-green-600 mt-1">$12,450</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
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
              <p className="text-sm text-gray-500">Avg. Delivery Time</p>
              <p className="text-3xl font-bold text-blue-600 mt-1">2.3 days</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Coming Soon Notice */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-br from-primary/5 to-primary-container/5 rounded-3xl p-12 text-center border-2 border-dashed border-primary/20"
      >
        <Truck className="w-16 h-16 mx-auto mb-4 text-primary/40" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Vendor Management System</h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          This module will include vendor database, purchase order management, 
          delivery tracking, performance ratings, contract management, and automated reordering.
        </p>
        <div className="mt-6 flex flex-wrap gap-3 justify-center">
          <span className="px-4 py-2 bg-white rounded-full text-sm text-gray-600 border border-gray-200">Vendor Database</span>
          <span className="px-4 py-2 bg-white rounded-full text-sm text-gray-600 border border-gray-200">Purchase Orders</span>
          <span className="px-4 py-2 bg-white rounded-full text-sm text-gray-600 border border-gray-200">Delivery Tracking</span>
          <span className="px-4 py-2 bg-white rounded-full text-sm text-gray-600 border border-gray-200">Performance Ratings</span>
          <span className="px-4 py-2 bg-white rounded-full text-sm text-gray-600 border border-gray-200">Auto-Reordering</span>
        </div>
      </motion.div>
    </div>
  );
};

export default VendorsScreen;
