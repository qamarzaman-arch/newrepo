'use client';

import React, { useState } from 'react';
import { 
  Calendar, Clock, Users, Plus, ChevronLeft, ChevronRight,
  CheckCircle, XCircle, AlertCircle
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

  // Load schedules for current week
  React.useEffect(() => {
    loadSchedules();
    loadStaff();
  }, [currentDate]);

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
                          <button
                            onClick={() => handleDeleteSchedule(schedule.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"
                          >
                            <XCircle size={14} />
                          </button>
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
                {Math.round(schedules.reduce((acc, s) => {
                  const start = parseInt(s.startTime.split(':')[0]);
                  const end = parseInt(s.endTime.split(':')[0]);
                  return acc + (end - start);
                }, 0))}
              </h3>
            </div>
          </div>
        </div>
      </div>

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
