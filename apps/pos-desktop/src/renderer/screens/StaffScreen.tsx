import React, { useState, useEffect } from 'react';
import { Users, Play, Square, Search } from 'lucide-react';
import { staffService, Staff } from '../services/staffService';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';

const StaffScreen: React.FC = () => {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeShifts, setActiveShifts] = useState<Set<string>>(new Set());
  const { user } = useAuthStore();

  const isCashier = user?.role === 'CASHIER';

  useEffect(() => {
    loadStaff();
    if (isCashier) {
      loadActiveShifts();
    }
  }, [isCashier]);

  const loadStaff = async () => {
    try {
      const response = await staffService.getStaff();
      setStaff(response.data.data?.staff || []);
    } catch (error) {
      console.error('Failed to load staff:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadActiveShifts = async () => {
    try {
      const response = await staffService.getActiveShifts();
      const shifts = response.data.data?.shifts || [];
      const activeUserIds = new Set<string>(shifts.map((s: any) => s.userId as string));
      setActiveShifts(activeUserIds);
    } catch (error) {
      console.error('Failed to load active shifts:', error);
    }
  };

  const handleStartShift = async (member: Staff) => {
    // Cashier cannot mark attendance for admin
    if (member.role === 'ADMIN') {
      toast.error('Cannot mark attendance for Admin users');
      return;
    }

    try {
      await staffService.clockInOut(member.id, 'clock-in');
      toast.success(`Shift started for ${member.fullName} at ${new Date().toLocaleTimeString()}`);
      loadActiveShifts();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to start shift');
    }
  };

  const handleEndShift = async (member: Staff) => {
    // Cashier cannot mark attendance for admin
    if (member.role === 'ADMIN') {
      toast.error('Cannot mark attendance for Admin users');
      return;
    }

    try {
      await staffService.clockInOut(member.id, 'clock-out');
      toast.success(`Shift ended for ${member.fullName} at ${new Date().toLocaleTimeString()}`);
      loadActiveShifts();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to end shift');
    }
  };

  const filteredStaff = staff.filter((member: Staff) =>
    member.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Cashier view - simplified attendance view
  if (isCashier) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 font-manrope">Staff Attendance</h1>
            <p className="text-gray-600 mt-1">Mark attendance for staff members</p>
          </div>
        </div>

        {/* Only Total Staff stat for cashier */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Staff</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{staff.length}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search staff..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
          />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-500">Loading...</div>
          ) : filteredStaff.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <p>No staff members found</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Employee Name</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Current Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Attendance Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredStaff.map((member: Staff) => {
                  const isAdmin = member.role === 'ADMIN';
                  const isOnDuty = activeShifts.has(member.id);

                  return (
                    <tr key={member.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-semibold">
                            {member.fullName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{member.fullName}</p>
                            <p className="text-xs text-gray-500">{member.role}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {isOnDuty ? (
                          <span className="text-green-600 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                            On Duty
                          </span>
                        ) : (
                          <span className="text-gray-500 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                            Off Duty
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {isAdmin ? (
                          <span className="text-gray-400 text-sm">Admin - Not Available</span>
                        ) : isOnDuty ? (
                          <button
                            onClick={() => handleEndShift(member)}
                            className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600 flex items-center gap-2"
                          >
                            <Square className="w-4 h-4" />
                            End Shift
                          </button>
                        ) : (
                          <button
                            onClick={() => handleStartShift(member)}
                            className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-semibold hover:bg-green-600 flex items-center gap-2"
                          >
                            <Play className="w-4 h-4" />
                            Start Shift
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  // Admin/Manager view - full staff management
  const stats = {
    totalStaff: staff.length,
    onDutyNow: activeShifts.size,
    scheduledToday: 12,
    totalPayroll: staff.length * 3500,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 font-manrope">Staff Management</h1>
          <p className="text-gray-600 mt-1">Manage employees, schedules, and performance</p>
        </div>
        <button className="px-4 py-2 bg-primary text-white rounded-xl font-semibold flex items-center gap-2 hover:bg-primary-600">
          <Users className="w-5 h-5" />
          Add Employee
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Staff</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalStaff}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">On Duty Now</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{stats.onDutyNow}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <Play className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Scheduled Today</p>
              <p className="text-3xl font-bold text-purple-600 mt-1">{stats.scheduledToday}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Weekly Payroll</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">${stats.totalPayroll.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
              <Users className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Search staff..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">Loading...</div>
        ) : filteredStaff.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <p>No staff members found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Employee</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Role</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredStaff.map((member: Staff) => {
                const isOnDuty = activeShifts.has(member.id);
                return (
                  <tr key={member.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-semibold">
                          {member.fullName.charAt(0)}
                        </div>
                        <p className="font-semibold text-gray-900">{member.fullName}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                        {member.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {isOnDuty ? (
                        <span className="text-green-600 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-green-500"></span>
                          On Duty
                        </span>
                      ) : (
                        <span className="text-gray-500 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                          Off Duty
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200">
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default StaffScreen;
