import React from 'react';
import { motion } from 'framer-motion';
import { Users, Clock, Calendar, TrendingUp, DollarSign } from 'lucide-react';

const StaffScreen: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 font-manrope">Staff Management</h1>
        <p className="text-gray-600 mt-1">Manage employees, schedules, and performance</p>
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
              <p className="text-sm text-gray-500">Total Staff</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">24</p>
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
              <p className="text-sm text-gray-500">On Duty Now</p>
              <p className="text-3xl font-bold text-green-600 mt-1">8</p>
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
              <p className="text-sm text-gray-500">Scheduled Today</p>
              <p className="text-3xl font-bold text-purple-600 mt-1">12</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-purple-600" />
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
              <p className="text-sm text-gray-500">Labor Cost %</p>
              <p className="text-3xl font-bold text-orange-600 mt-1">28.5%</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-orange-600" />
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
        <TrendingUp className="w-16 h-16 mx-auto mb-4 text-primary/40" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Advanced Staff Management</h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          This module will include employee profiles, time tracking, shift scheduling, 
          performance metrics, payroll integration, and labor cost optimization tools.
        </p>
        <div className="mt-6 flex flex-wrap gap-3 justify-center">
          <span className="px-4 py-2 bg-white rounded-full text-sm text-gray-600 border border-gray-200">Employee Profiles</span>
          <span className="px-4 py-2 bg-white rounded-full text-sm text-gray-600 border border-gray-200">Time & Attendance</span>
          <span className="px-4 py-2 bg-white rounded-full text-sm text-gray-600 border border-gray-200">Shift Scheduling</span>
          <span className="px-4 py-2 bg-white rounded-full text-sm text-gray-600 border border-gray-200">Performance Tracking</span>
          <span className="px-4 py-2 bg-white rounded-full text-sm text-gray-600 border border-gray-200">Payroll Integration</span>
        </div>
      </motion.div>
    </div>
  );
};

export default StaffScreen;
