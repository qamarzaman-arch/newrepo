'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Users, Clock, UserCheck, UserX, Plus, RefreshCw, AlertTriangle, X, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '../lib/api';

interface Employee {
  id: string;
  fullName: string;
  username: string;
  role: string;
  isActive: boolean;
}

interface ActiveShift {
  id: string;
  userId: string;
  shiftDate: string;
  startTime: string;
  endTime: string | null;
  user?: { fullName: string; role: string };
}

export default function AttendancePage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [activeShifts, setActiveShifts] = useState<ActiveShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [startTime, setStartTime] = useState('');
  const [saving, setSaving] = useState(false);
  const [endingShiftId, setEndingShiftId] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(tick);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [empRes, shiftRes] = await Promise.allSettled([
        apiClient.get('/users'),
        apiClient.get('/staff/active-shifts'),
      ]);
      if (empRes.status === 'fulfilled') setEmployees(empRes.value.data?.data?.users || []);
      if (shiftRes.status === 'fulfilled') setActiveShifts(shiftRes.value.data?.data?.shifts || []);
    } catch {
      setError('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const activeUserIds = new Set(activeShifts.map(s => s.userId));

  const startShift = async () => {
    if (!selectedEmployee) {
      toast.error('Select an employee');
      return;
    }
    setSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const time = startTime || new Date().toTimeString().slice(0, 5);
      await apiClient.post('/staff/shifts', { userId: selectedEmployee, shiftDate: today, startTime: time });
      setShowModal(false);
      setSelectedEmployee('');
      setStartTime('');
      await fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to start shift');
    } finally {
      setSaving(false);
    }
  };

  const endShift = async (shiftId: string) => {
    setEndingShiftId(shiftId);
    try {
      const time = new Date().toTimeString().slice(0, 5);
      await apiClient.patch(`/staff/shifts/${shiftId}`, { endTime: time });
      await fetchData();
    } catch {
      toast.error('Failed to end shift');
    } finally {
      setEndingShiftId(null);
    }
  };

  const elapsedHours = (startTime: string, shiftDate: string): string => {
    const start = new Date(`${shiftDate}T${startTime}`);
    const diff = now.getTime() - start.getTime();
    if (diff < 0) return '—';
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${h}h ${m}m`;
  };

  const stats = {
    total: employees.filter(e => e.isActive).length,
    onShift: activeShifts.length,
    notOnShift: employees.filter(e => e.isActive && !activeUserIds.has(e.id)).length,
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Attendance</h1>
          <p className="text-gray-500 mt-1">
            {now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            {' · '}{now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">
            <RefreshCw size={16} /> Refresh
          </button>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors">
            <Plus size={16} /> Clock In
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 p-4 rounded-2xl flex items-center gap-3">
          <AlertTriangle size={20} /> {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Staff', value: stats.total, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'On Shift', value: stats.onShift, icon: UserCheck, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Not Clocked In', value: stats.notOnShift, icon: UserX, color: 'text-gray-600', bg: 'bg-gray-50' },
        ].map((s, i) => (
          <div key={i} className="bg-white dark:bg-neutral-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-neutral-700">
            <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center ${s.color} mb-3`}><s.icon size={20} /></div>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{s.label}</p>
            <p className="text-2xl font-extrabold text-gray-900 mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active Shifts */}
          <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-700 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-neutral-700 flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <h2 className="font-extrabold text-gray-900">Currently On Shift ({activeShifts.length})</h2>
            </div>
            {activeShifts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                <UserX size={32} className="mb-2 text-gray-200" />
                <p className="text-sm font-medium">Nobody clocked in</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {activeShifts.map(shift => {
                  const emp = employees.find(e => e.id === shift.userId);
                  return (
                    <div key={shift.id} className="flex items-center justify-between px-5 py-4">
                      <div>
                        <p className="font-bold text-gray-900">{emp?.fullName || shift.user?.fullName || 'Unknown'}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-gray-500 capitalize">{(emp?.role || shift.user?.role || '').toLowerCase()}</span>
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Clock size={10} /> Since {shift.startTime}
                          </span>
                          <span className="text-xs font-bold text-green-600">{elapsedHours(shift.startTime, shift.shiftDate)}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => endShift(shift.id)}
                        disabled={endingShiftId === shift.id}
                        className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-bold hover:bg-red-200 transition-colors disabled:opacity-50">
                        {endingShiftId === shift.id ? '…' : 'Clock Out'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Not On Shift */}
          <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-700 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-neutral-700">
              <h2 className="font-extrabold text-gray-900">Not Clocked In ({stats.notOnShift})</h2>
            </div>
            {stats.notOnShift === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                <UserCheck size={32} className="mb-2 text-gray-200" />
                <p className="text-sm font-medium">All staff are on shift</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {employees.filter(e => e.isActive && !activeUserIds.has(e.id)).map(emp => (
                  <div key={emp.id} className="flex items-center justify-between px-5 py-3.5">
                    <div>
                      <p className="font-bold text-gray-900">{emp.fullName}</p>
                      <p className="text-xs text-gray-500 capitalize">{emp.role.toLowerCase()}</p>
                    </div>
                    <button onClick={() => { setSelectedEmployee(emp.id); setShowModal(true); }}
                      className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-bold hover:bg-green-200 transition-colors">
                      Clock In
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Clock In Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-neutral-800 rounded-3xl p-8 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-extrabold text-gray-900">Clock In Employee</h2>
              <button onClick={() => { setShowModal(false); setSelectedEmployee(''); setStartTime(''); }} className="p-2 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Employee</label>
              <select value={selectedEmployee} onChange={e => setSelectedEmployee(e.target.value)}
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-red-400 focus:outline-none">
                <option value="">Select employee…</option>
                {employees.filter(e => e.isActive && !activeUserIds.has(e.id)).map(e => (
                  <option key={e.id} value={e.id}>{e.fullName} ({e.role})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Start Time (optional, defaults to now)</label>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-red-400 focus:outline-none" />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => { setShowModal(false); setSelectedEmployee(''); setStartTime(''); }}
                className="flex-1 py-3 border-2 border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={startShift} disabled={saving}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check size={16} />}
                Clock In
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
