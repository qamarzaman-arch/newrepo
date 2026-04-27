import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Clock, Play, Square, RefreshCw, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { staffService } from '../services/staffService';
import { useAuthStore } from '../stores/authStore';

const AttendanceScreen: React.FC = () => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  // Fetch all staff
  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['staff-attendance'],
    queryFn: async () => {
      const response = await staffService.getStaff();
      return response.data.data.staff || [];
    },
  });

  // Fetch active shifts
  const { data: activeShifts = [] } = useQuery({
    queryKey: ['active-shifts'],
    queryFn: async () => {
      const response = await staffService.getActiveShifts();
      return response.data.data.shifts || [];
    },
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['staff-attendance'] });
    queryClient.invalidateQueries({ queryKey: ['active-shifts'] });
    toast.success('Attendance data refreshed');
  };

  const handleStartShift = async (employeeId: string, employeeName: string) => {
    try {
      await staffService.createShift({
        userId: employeeId,
        shiftDate: new Date().toISOString().split('T')[0],
        startTime: new Date().toISOString(),
      });
      toast.success(`Started shift for ${employeeName}`);
      queryClient.invalidateQueries({ queryKey: ['active-shifts'] });
    } catch (error) {
      toast.error('Failed to start shift');
    }
  };

  const handleEndShift = async (shiftId: string, employeeName: string) => {
    try {
      await staffService.updateShift(shiftId, {
        endTime: new Date().toISOString(),
      });
      toast.success(`Ended shift for ${employeeName}`);
      queryClient.invalidateQueries({ queryKey: ['active-shifts'] });
    } catch (error) {
      toast.error('Failed to end shift');
    }
  };

  // Create a map of active shifts by user ID
  const activeShiftMap = new Map(activeShifts.map((shift: any) => [shift.userId, shift as any]));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 font-manrope">Attendance Management</h1>
          <p className="text-gray-600 mt-1">Mark employee attendance and track shifts</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleRefresh}
          className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl font-semibold flex items-center gap-2 shadow-lg hover:bg-gray-50"
        >
          <RefreshCw className="w-5 h-5" />
          Refresh
        </motion.button>
      </div>

      {/* Date Display */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3">
          <Calendar className="w-6 h-6 text-primary" />
          <div>
            <p className="text-lg font-semibold text-gray-900">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <p className="text-sm text-gray-600">
              {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Employees</p>
              <p className="text-3xl font-bold text-gray-900">{employees.length}</p>
            </div>
            <Users className="w-12 h-12 text-primary/20" />
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Currently On Shift</p>
              <p className="text-3xl font-bold text-green-600">{activeShifts.length}</p>
            </div>
            <Clock className="w-12 h-12 text-green-600/20" />
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Not On Shift</p>
              <p className="text-3xl font-bold text-gray-600">{employees.length - activeShifts.length}</p>
            </div>
            <Users className="w-12 h-12 text-gray-600/20" />
          </div>
        </div>
      </div>

      {/* Employee List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Employee Attendance</h2>
        </div>
        {isLoading ? (
          <div className="p-6 text-center text-gray-600">Loading...</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {employees.map((employee: any) => {
              const activeShift = activeShiftMap.get(employee.id) as any;
              const isOnShift = !!activeShift;

              return (
                <motion.div
                  key={employee.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="px-6 py-4 flex items-center justify-between hover:bg-gray-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary-container rounded-full flex items-center justify-center text-white font-bold">
                      {employee.username?.charAt(0).toUpperCase() || employee.fullName?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{employee.fullName || employee.username}</p>
                      <p className="text-sm text-gray-600">{employee.role}</p>
                      {isOnShift && (
                        <p className="text-xs text-green-600">
                          Started: {new Date(activeShift.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {isOnShift ? (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleEndShift(activeShift.id, employee.fullName || employee.username)}
                        className="px-4 py-2 bg-red-500 text-white rounded-xl font-semibold flex items-center gap-2 shadow-lg hover:bg-red-600"
                      >
                        <Square className="w-4 h-4" />
                        End Shift
                      </motion.button>
                    ) : (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleStartShift(employee.id, employee.fullName || employee.username)}
                        className="px-4 py-2 bg-gradient-to-r from-primary to-primary-container text-white rounded-xl font-semibold flex items-center gap-2 shadow-lg"
                      >
                        <Play className="w-4 h-4" />
                        Start Shift
                      </motion.button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceScreen;
