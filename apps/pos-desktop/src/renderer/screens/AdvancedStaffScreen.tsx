import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, Clock, Calendar, TrendingUp, Plus, Search, Filter,
  UserCheck, DollarSign, Briefcase, Mail, Phone,
  Edit, Eye, CheckCircle, XCircle, Star
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';
import { staffService } from '../services/staffService';
import { reportService } from '../services/reportService';

const AdvancedStaffScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'employees' | 'schedule' | 'time-tracking' | 'performance'>('employees');
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');

  // Real staff data
  const { data: employees = [] } = useQuery({
    queryKey: ['staff-management'],
    queryFn: async () => {
      const response = await staffService.getStaff();
      return response.data.data.staff || [];
    },
  });

  // Real active shifts / schedule
  const { data: scheduleData = [] } = useQuery({
    queryKey: ['staff-shifts'],
    queryFn: async () => {
      const response = await staffService.getActiveShifts();
      return response.data.data.shifts || [];
    },
  });

  // Real performance data
  const { data: performanceData = [] } = useQuery({
    queryKey: ['staff-performance'],
    queryFn: async () => {
      const response = await reportService.getStaffPerformance(30);
      return response.data.data || [];
    },
  });

  // Mapped display arrays using real backend responses with fallbacks for missing fields
  const displayEmployees = employees.map((emp: any) => ({
    id: emp.id, name: emp.username || emp.fullName, role: emp.role, department: 'General', phone: emp.phone || 'N/A', email: emp.email || 'N/A', status: emp.isActive ? 'ACTIVE' : 'INACTIVE', rating: 5, hireDate: new Date(emp.createdAt || Date.now()).toLocaleDateString(), hoursThisWeek: 0
  }));

  const todaySchedule = scheduleData.map((shift: any) => ({
    id: shift.id, employee: shift.userId, role: 'Staff', shift: 'Active Shift', status: shift.status, breakTime: 'None'
  }));

  const timeEntries = scheduleData.map((shift: any) => ({
    id: shift.id, employee: shift.userId, date: new Date(shift.clockedInAt).toLocaleDateString(), clockIn: new Date(shift.clockedInAt).toLocaleTimeString(), clockOut: shift.clockedOutAt ? new Date(shift.clockedOutAt).toLocaleTimeString() : 'Active', hours: 0, overtime: 0, status: shift.status
  }));

  const displayPerformance = employees.map((emp: any) => {
    const perf = performanceData.find((p: any) => p.userId === emp.id) || {};
    return {
      id: emp.id, employee: emp.username, role: emp.role, rating: perf.rating || 5.0, ordersHandled: perf.ordersHandled || 0, avgServiceTime: perf.avgServiceTime || 'N/A', customerFeedback: perf.customerFeedback || 5.0, attendance: perf.attendance || 100
    };
  });

  const stats = {
    totalEmployees: employees.length,
    onDuty: scheduleData.length,
    scheduledToday: scheduleData.length,
    laborCostPercentage: 0, // Requires advanced payroll backend
  };

  // Handler functions
  const handleEditEmployee = (employeeName: string) => {
    toast(`Edit employee ${employeeName} - Coming soon!`, { icon: 'ℹ️' });
  };

  const handleViewEmployee = (employeeName: string) => {
    toast(`View details for ${employeeName} - Coming soon!`, { icon: '👁️' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 font-manrope">Staff Management</h1>
          <p className="text-gray-600 mt-1">Manage employees, schedules, and performance</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="px-4 py-2 bg-gradient-to-r from-primary to-primary-container text-white rounded-xl font-semibold flex items-center gap-2 shadow-lg"
        >
          <Plus className="w-5 h-5" />
          Add Employee
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
              <p className="text-sm text-gray-500">Total Employees</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalEmployees}</p>
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
              <p className="text-3xl font-bold text-green-600 mt-1">{stats.onDuty}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <UserCheck className="w-6 h-6 text-green-600" />
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
              <p className="text-3xl font-bold text-purple-600 mt-1">{stats.scheduledToday}</p>
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
              <p className="text-3xl font-bold text-orange-600 mt-1">{stats.laborCostPercentage}%</p>
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
          { id: 'employees', label: 'Employees', icon: Users },
          { id: 'schedule', label: 'Schedule', icon: Calendar },
          { id: 'time-tracking', label: 'Time Tracking', icon: Clock },
          { id: 'performance', label: 'Performance', icon: TrendingUp },
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

      {/* Filters - Only for Employees tab */}
      {activeTab === 'employees' && (
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search employees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
            />
          </div>
          
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none bg-white"
          >
            <option value="all">All Departments</option>
            <option value="management">Management</option>
            <option value="kitchen">Kitchen</option>
            <option value="front-of-house">Front of House</option>
          </select>

          <button className="px-4 py-3 bg-white border-2 border-gray-200 rounded-xl hover:border-primary transition-colors">
            <Filter className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      )}

      {/* EMPLOYEES TAB */}
      {activeTab === 'employees' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Employee</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Role</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Department</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Contact</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Rating</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Hours/Week</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {displayEmployees.map((employee: any) => (
                <tr key={employee.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary-container/20 flex items-center justify-center">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{employee.name}</p>
                        <p className="text-xs text-gray-500">Since {employee.hireDate}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-gray-400" />
                      {employee.role}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{employee.department}</td>
                  <td className="px-6 py-4">
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Phone className="w-3 h-3" />
                        {employee.phone}
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Mail className="w-3 h-3" />
                        {employee.email}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      employee.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                      employee.status === 'ON_LEAVE' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {employee.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span className="font-semibold text-gray-900">{employee.rating}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">{employee.hoursThisWeek}h</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleViewEmployee(employee.name)}
                        className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4 text-blue-600" />
                      </button>
                      <button 
                        onClick={() => handleEditEmployee(employee.name)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <Edit className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* SCHEDULE TAB */}
      {activeTab === 'schedule' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-900">Today's Schedule - {new Date().toLocaleDateString()}</h3>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-4 py-2 bg-primary text-white rounded-xl font-semibold"
            >
              Edit Schedule
            </motion.button>
          </div>

          {todaySchedule.map((entry: any, index: number) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    entry.status === 'CHECKED_IN' ? 'bg-green-100' : 'bg-blue-100'
                  }`}>
                    <Clock className={`w-6 h-6 ${
                      entry.status === 'CHECKED_IN' ? 'text-green-600' : 'text-blue-600'
                    }`} />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">{entry.employee}</h4>
                    <p className="text-sm text-gray-500">{entry.role}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">{entry.shift}</p>
                  <p className="text-xs text-gray-500">Break: {entry.breakTime}</p>
                </div>
                <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
                  entry.status === 'CHECKED_IN' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {entry.status.replace('_', ' ')}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* TIME TRACKING TAB */}
      {activeTab === 'time-tracking' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Employee</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Clock In</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Clock Out</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Total Hours</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Overtime</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {timeEntries.map((entry: any) => (
                <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-gray-900">{entry.employee}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{entry.date}</td>
                  <td className="px-6 py-4 text-sm text-green-600 font-semibold">{entry.clockIn}</td>
                  <td className="px-6 py-4 text-sm text-red-600 font-semibold">{entry.clockOut}</td>
                  <td className="px-6 py-4 font-bold text-gray-900">{entry.hours.toFixed(2)}h</td>
                  <td className="px-6 py-4 text-sm text-orange-600 font-semibold">
                    {entry.overtime > 0 ? `+${entry.overtime.toFixed(2)}h` : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      entry.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {entry.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {entry.status === 'PENDING' && (
                      <div className="flex gap-2">
                        <button className="p-2 hover:bg-green-100 rounded-lg transition-colors">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        </button>
                        <button className="p-2 hover:bg-red-100 rounded-lg transition-colors">
                          <XCircle className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* PERFORMANCE TAB */}
      {activeTab === 'performance' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayPerformance.map((perf: any, index: number) => (
            <motion.div
              key={perf.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{perf.employee}</h3>
                  <p className="text-sm text-gray-500">{perf.role}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                  <span className="text-xl font-bold text-gray-900">{perf.rating}</span>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Orders Handled:</span>
                  <span className="font-semibold">{perf.ordersHandled}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Avg Service Time:</span>
                  <span className="font-semibold">{perf.avgServiceTime}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Customer Feedback:</span>
                  <span className="font-semibold">{perf.customerFeedback}/5.0</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Attendance Rate:</span>
                  <span className="font-semibold text-green-600">{perf.attendance}%</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-primary to-primary-container h-2 rounded-full"
                    style={{ width: `${(perf.rating / 5) * 100}%` }}
                  ></div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdvancedStaffScreen;
