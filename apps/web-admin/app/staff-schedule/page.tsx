'use client';

import React, { useState } from 'react';
import {
  Calendar, Clock, Users, Plus, ChevronLeft, ChevronRight,
  CheckCircle, XCircle, AlertCircle, ArrowRightLeft, Check, X
} from 'lucide-react';
import { Button, Modal } from '@poslytic/ui-components';
import apiClient from '../lib/api';
import toast from 'react-hot-toast';

interface StaffSchedule {
  id: string;
  userId: string;
  userName: string;
  date: string;
  startTime: string;
  endTime: string;
  role: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
}

export default function StaffSchedulePage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedules, setSchedules] = useState<StaffSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    userId: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '17:00',
    role: 'STAFF',
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [stats, setStats] = useState<{ totalShifts: number; totalHours: number; roleBreakdown: Record<string, number> } | null>(null);
  const [swapRequests, setSwapRequests] = useState<any[]>([]);
  const [swapModal, setSwapModal] = useState<StaffSchedule | null>(null);
  const [swapTargetUserId, setSwapTargetUserId] = useState('');
  const [swapReason, setSwapReason] = useState('');
  const [swapBusy, setSwapBusy] = useState(false);

  // Load schedules for current week
  React.useEffect(() => {
    loadSchedules();
    loadStaff();
    loadStats();
    loadSwapRequests();
  }, [currentDate]);

  const loadStats = async () => {
    try {
      const startDate = getWeekStart(currentDate).toISOString().split('T')[0];
      const endDate = getWeekEnd(currentDate).toISOString().split('T')[0];
      const response = await apiClient.get('/staff-schedules/stats/overview', {
        params: { startDate, endDate },
      });
      setStats(response.data?.data || null);
    } catch {
      setStats(null);
    }
  };

  const loadSwapRequests = async () => {
    try {
      const response = await apiClient.get('/staff-schedules/swap-requests');
      setSwapRequests(response.data?.data?.requests || response.data?.data || []);
    } catch {
      setSwapRequests([]);
    }
  };

  const submitSwap = async () => {
    if (!swapModal || !swapTargetUserId || !swapReason.trim()) {
      toast.error('Pick a target staff member and provide a reason');
      return;
    }
    setSwapBusy(true);
    try {
      await apiClient.post('/staff-schedules/swap-request', {
        scheduleId: swapModal.id,
        targetUserId: swapTargetUserId,
        reason: swapReason.trim(),
      });
      toast.success('Swap request sent');
      setSwapModal(null);
      setSwapTargetUserId('');
      setSwapReason('');
      loadSwapRequests();
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Failed to send swap request');
    } finally {
      setSwapBusy(false);
    }
  };

  const respondToSwap = async (id: string, accept: boolean) => {
    try {
      await apiClient.post(`/staff-schedules/swap-request/${id}/respond`, { accept });
      toast.success(accept ? 'Swap approved' : 'Swap rejected');
      loadSwapRequests();
      loadSchedules();
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Failed to respond');
    }
  };

  const loadSchedules = async () => {
    try {
      setLoading(true);
      const startDate = getWeekStart(currentDate).toISOString().split('T')[0];
      const endDate = getWeekEnd(currentDate).toISOString().split('T')[0];
      
      const response = await apiClient.get('/staff-schedules', {
        params: { startDate, endDate },
      });
      setSchedules(response.data?.data?.schedules || []);
    } catch (error: any) {
      console.error('Failed to load schedules:', error);
      toast.error('Failed to load schedules');
    } finally {
      setLoading(false);
    }
  };

  const loadStaff = async () => {
    try {
      const response = await apiClient.get('/users');
      setStaffList(response.data?.data?.users || []);
    } catch (error) {
      console.error('Failed to load staff:', error);
    }
  };

  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();

    // QA C51: detect overlapping shifts for the same user on the same day
    // before sending. The backend should also enforce, but the client-side
    // check gives an instant clear error.
    const newStart = `${formData.date}T${formData.startTime}`;
    const newEnd = `${formData.date}T${formData.endTime}`;
    if (newEnd <= newStart) {
      toast.error('End time must be after start time');
      return;
    }
    const conflicts = (schedules || []).filter((s: any) => {
      if (s.userId !== formData.userId) return false;
      const sDate = (s.date || '').slice(0, 10);
      if (sDate !== formData.date) return false;
      const sStart = `${sDate}T${s.startTime}`;
      const sEnd = `${sDate}T${s.endTime}`;
      // Overlap if one starts before the other ends.
      return newStart < sEnd && sStart < newEnd;
    });
    if (conflicts.length > 0) {
      toast.error('This user already has an overlapping shift on that day');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post('/staff-schedules', formData);
      toast.success('Schedule added successfully!');
      setShowAddModal(false);
      setFormData({
        userId: '',
        date: new Date().toISOString().split('T')[0],
        startTime: '09:00',
        endTime: '17:00',
        role: 'STAFF',
        notes: '',
      });
      loadSchedules();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add schedule');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!confirm('Cancel this scheduled shift?')) return;
    try {
      await apiClient.delete(`/staff-schedules/${id}`);
      toast.success('Schedule cancelled');
      loadSchedules();
    } catch (error) {
      toast.error('Failed to cancel schedule');
    }
  };

  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  const getWeekEnd = (date: Date) => {
    const start = getWeekStart(date);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return end;
  };

  const getDaysOfWeek = () => {
    const days = [];
    const start = getWeekStart(currentDate);
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(day.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const getSchedulesForDay = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return schedules.filter(s => s.date === dateStr);
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentDate(newDate);
  };

  const weekDays = getDaysOfWeek();
  const weekStart = getWeekStart(currentDate);
  const weekEnd = getWeekEnd(currentDate);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-gray-900">Staff Scheduling</h1>
          <p className="text-gray-500 mt-2 font-medium">
            {weekStart.toLocaleDateString()} - {weekEnd.toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigateWeek('prev')}>
            <ChevronLeft size={18} />
            Previous Week
          </Button>
          <Button variant="outline" onClick={() => navigateWeek('next')}>
            Next Week
            <ChevronRight size={18} />
          </Button>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus size={18} />
            Add Schedule
          </Button>
        </div>
      </header>

      {/* Calendar Grid */}
      {loading ? (
        <div className="bg-white rounded-3xl p-20 text-center shadow-soft border border-gray-100">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Loading schedules...</p>
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-4">
          {weekDays.map((day, idx) => {
            const daySchedules = getSchedulesForDay(day);
            const isToday = day.toDateString() === new Date().toDateString();
            
            return (
              <div key={idx} className={`bg-white rounded-2xl shadow-soft border ${isToday ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-gray-100'} overflow-hidden`}>
                {/* Day Header */}
                <div className={`p-4 border-b ${isToday ? 'bg-indigo-50 border-indigo-200' : 'bg-gray-50 border-gray-100'}`}>
                  <p className="text-xs font-bold uppercase text-gray-500">
                    {day.toLocaleDateString('en-US', { weekday: 'short' })}
                  </p>
                  <p className={`text-2xl font-black ${isToday ? 'text-indigo-600' : 'text-gray-900'}`}>
                    {day.getDate()}
                  </p>
                </div>

                {/* Schedules */}
                <div className="p-3 space-y-2 min-h-[200px]">
                  {daySchedules.length > 0 ? (
                    daySchedules.map((schedule) => (
                      <div key={schedule.id} className="bg-gray-50 rounded-xl p-3 hover:bg-gray-100 transition-colors group">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <p className="font-bold text-sm text-gray-900">{schedule.userName}</p>
                            <p className="text-xs text-gray-500">{schedule.role}</p>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <button
                              title="Request swap"
                              onClick={() => { setSwapModal(schedule); setSwapTargetUserId(''); setSwapReason(''); }}
                              className="p-1 text-gray-400 hover:text-indigo-600"
                            >
                              <ArrowRightLeft size={14} />
                            </button>
                            <button
                              title="Cancel shift"
                              onClick={() => handleDeleteSchedule(schedule.id)}
                              className="p-1 text-gray-400 hover:text-red-500"
                            >
                              <XCircle size={14} />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <Clock size={12} />
                          <span>{schedule.startTime} - {schedule.endTime}</span>
                        </div>
                        {schedule.notes && (
                          <p className="text-xs text-gray-500 mt-2 italic">{schedule.notes}</p>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-gray-300">
                      <Calendar size={24} />
                      <p className="text-xs mt-2">No shifts</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-soft border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-blue-50 text-blue-600">
              <Users size={24} />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Total Shifts</p>
              <h3 className="text-2xl font-black text-gray-900">{schedules.length}</h3>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-3xl shadow-soft border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-green-50 text-green-600">
              <CheckCircle size={24} />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Scheduled</p>
              <h3 className="text-2xl font-black text-gray-900">
                {schedules.filter(s => s.status === 'SCHEDULED').length}
              </h3>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-soft border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-orange-50 text-orange-600">
              <AlertCircle size={24} />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Conflicts</p>
              <h3 className="text-2xl font-black text-gray-900">0</h3>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-soft border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-purple-50 text-purple-600">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Total Hours</p>
              <h3 className="text-2xl font-black text-gray-900">
                {stats?.totalHours ?? Math.round(schedules.reduce((acc, s) => {
                  const start = parseInt(s.startTime.split(':')[0]);
                  const end = parseInt(s.endTime.split(':')[0]);
                  return acc + (end - start);
                }, 0))}
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Swap Requests */}
      <div className="bg-white rounded-3xl shadow-soft border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <ArrowRightLeft size={20} /> Shift Swap Requests
          </h2>
          <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
            {swapRequests.filter(r => r.status === 'PENDING').length} pending
          </span>
        </div>
        {swapRequests.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No swap requests.</p>
        ) : (
          <div className="space-y-3">
            {swapRequests.map((req: any) => (
              <div key={req.id} className="border border-gray-100 rounded-2xl p-4 flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold">
                    {req.requester?.fullName || 'Requester'} → {req.targetUser?.fullName || 'Target'}
                  </p>
                  <p className="text-xs text-gray-500">
                    Schedule {new Date(req.schedule?.date || Date.now()).toLocaleDateString()} {req.schedule?.startTime}-{req.schedule?.endTime}
                  </p>
                  <p className="text-xs text-gray-600 italic mt-1">"{req.reason}"</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  req.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                  req.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                  'bg-red-100 text-red-700'
                }`}>{req.status}</span>
                {req.status === 'PENDING' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => respondToSwap(req.id, true)}
                      className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                    ><Check size={12} /> Approve</button>
                    <button
                      onClick={() => respondToSwap(req.id, false)}
                      className="px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-xs font-bold flex items-center gap-1"
                    ><X size={12} /> Reject</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Swap Request Modal */}
      <Modal isOpen={!!swapModal} onClose={() => setSwapModal(null)} title="Request Shift Swap">
        {swapModal && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-4 text-sm">
              <p><span className="font-bold">{swapModal.userName}</span> — {swapModal.role}</p>
              <p className="text-gray-600">{swapModal.date} · {swapModal.startTime}-{swapModal.endTime}</p>
            </div>
            <div>
              <label className="text-sm font-bold text-gray-700">Swap with *</label>
              <select
                value={swapTargetUserId}
                onChange={(e) => setSwapTargetUserId(e.target.value)}
                className="mt-1 w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-xl focus:outline-none"
              >
                <option value="">Select staff member</option>
                {staffList.filter(s => s.id !== swapModal.userId).map(s => (
                  <option key={s.id} value={s.id}>{s.fullName} ({s.role})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-bold text-gray-700">Reason *</label>
              <textarea
                value={swapReason}
                onChange={(e) => setSwapReason(e.target.value)}
                rows={3}
                className="mt-1 w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-xl focus:outline-none"
                placeholder="Why do you need to swap?"
              />
            </div>
            <div className="flex gap-4">
              <Button variant="outline" type="button" className="flex-1" onClick={() => setSwapModal(null)}>Cancel</Button>
              <Button type="button" className="flex-1" disabled={swapBusy} onClick={submitSwap}>
                {swapBusy ? 'Sending...' : 'Send Request'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add Schedule Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Staff Schedule"
      >
        <form onSubmit={handleAddSchedule} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Staff Member</label>
            <select
              required
              value={formData.userId}
              onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-xl focus:outline-none transition-all"
            >
              <option value="">Select Staff Member</option>
              {staffList.map(staff => (
                <option key={staff.id} value={staff.id}>{staff.fullName} ({staff.role})</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Date</label>
            <input
              required
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-xl focus:outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Start Time</label>
              <input
                required
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-xl focus:outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">End Time</label>
              <input
                required
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-xl focus:outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Notes (Optional)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-xl focus:outline-none transition-all"
              placeholder="Additional notes..."
              rows={3}
            />
          </div>

          <div className="flex gap-4">
            <Button
              variant="outline"
              type="button"
              className="flex-1"
              onClick={() => setShowAddModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Adding...' : 'Add Schedule'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
