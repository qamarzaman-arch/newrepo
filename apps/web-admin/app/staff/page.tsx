'use client';

import React, { useEffect, useState } from 'react';
import { 
  Users, UserPlus, Search, 
  Mail, Phone, Shield, Briefcase, Clock, CheckCircle, Trash2
} from 'lucide-react';
import { Button, Table, TableRow, TableCell, Badge, Modal } from '@poslytic/ui-components';
import apiClient from '../lib/api';
import toast from 'react-hot-toast';

interface StaffMember {
  id: string;
  username: string;
  fullName: string;
  email?: string;
  phone?: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

interface ActiveShift {
  id: string;
  userId: string;
  clockedInAt: string;
  status: string;
  user?: StaffMember;
}

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [activeShifts, setActiveShifts] = useState<ActiveShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    email: '',
    phone: '',
    role: 'STAFF',
    password: 'password123',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [usersRes, shiftsRes] = await Promise.all([
        apiClient.get('/users'),
        apiClient.get('/staff/active-shifts'),
      ]);
      setStaff(usersRes.data?.data?.users || []);
      setActiveShifts(shiftsRes.data?.data?.shifts || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load staff data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiClient.post('/users', formData);
      toast.success('Staff member added successfully!');
      setShowAddModal(false);
      setFormData({
        username: '',
        fullName: '',
        email: '',
        phone: '',
        role: 'STAFF',
        password: 'password123',
      });
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to add staff');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStaff = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to deactivate ${name}?`)) return;
    try {
      await apiClient.delete(`/users/${id}`);
      toast.success(`${name} deactivated`);
      fetchData();
    } catch (err: any) {
      toast.error('Failed to delete staff');
    }
  };

  const filteredStaff = staff.filter(m =>
    m.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeStaffIds = new Set(activeShifts.map(s => s.userId));
  const activeCount = activeShifts.length;

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      ADMIN: 'text-purple-600',
      MANAGER: 'text-blue-600',
      CASHIER: 'text-green-600',
      KITCHEN: 'text-orange-600',
      STAFF: 'text-gray-600',
    };
    return colors[role] || 'text-gray-600';
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 font-manrope">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-gray-900">Staff Management</h1>
          <p className="text-gray-500 mt-2 font-medium">Manage team members, roles, and active shifts.</p>
        </div>
        <Button className="gap-2" onClick={() => setShowAddModal(true)}>
          <UserPlus size={18} />
          Add Staff Member
        </Button>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl">
          {error} — <button onClick={fetchData} className="underline">Retry</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-soft border border-gray-100">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-2xl bg-blue-50 text-blue-600">
              <Briefcase size={24} />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Total Staff</p>
              <h3 className="text-2xl font-black text-gray-900">{staff.length} Members</h3>
            </div>
          </div>
          <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
            <div className="bg-blue-600 h-full" style={{ width: `${Math.min((staff.length / 20) * 100, 100)}%` }} />
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-soft border border-gray-100">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-2xl bg-green-50 text-green-600">
              <CheckCircle size={24} />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Clocked In Now</p>
              <h3 className="text-2xl font-black text-gray-900">{activeCount} Active</h3>
            </div>
          </div>
          <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-green-600 h-full" 
              style={{ width: staff.length > 0 ? `${(activeCount / staff.length) * 100}%` : '0%' }} 
            />
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-soft border border-gray-100">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-2xl bg-orange-50 text-orange-600">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Not Clocked In</p>
              <h3 className="text-2xl font-black text-gray-900">{Math.max(0, staff.length - activeCount)} Members</h3>
            </div>
          </div>
          <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-orange-600 h-full" 
              style={{ width: staff.length > 0 ? `${((staff.length - activeCount) / staff.length) * 100}%` : '0%' }} 
            />
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-3xl shadow-soft border border-gray-100">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Search staff by name, role, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-transparent rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-100 focus:outline-none transition-all font-medium"
          />
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-3xl p-20 text-center shadow-soft border border-gray-100">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Loading staff data...</p>
        </div>
      ) : (
        <Table headers={['Staff Member', 'Role', 'Contact Info', 'Joined Date', 'Status', 'Shift']}>
          {filteredStaff.map((member) => (
            <TableRow key={member.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-600">
                    {member.fullName.charAt(0)}
                  </div>
                  <div>
                    <div className="text-gray-900 font-bold">{member.fullName}</div>
                    <div className="text-[10px] text-gray-400 font-mono uppercase">@{member.username}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className={`flex items-center gap-2 font-medium ${getRoleColor(member.role)}`}>
                  <Shield size={14} />
                  {member.role}
                </div>
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  {member.email && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Mail size={12} />
                      {member.email}
                    </div>
                  )}
                  {member.phone && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Phone size={12} />
                      {member.phone}
                    </div>
                  )}
                  {!member.email && !member.phone && <span className="text-xs text-gray-400">—</span>}
                </div>
              </TableCell>
              <TableCell className="text-gray-500 font-medium text-sm">
                {new Date(member.createdAt).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <Badge variant={member.isActive ? 'success' : 'error'}>
                  {member.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Badge variant={activeStaffIds.has(member.id) ? 'success' : 'neutral'}>
                    {activeStaffIds.has(member.id) ? 'Clocked In' : 'Off Shift'}
                  </Badge>
                  <button 
                    onClick={() => handleDeleteStaff(member.id, member.fullName)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    title="Deactivate"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {filteredStaff.length === 0 && (
            <TableRow>
              <TableCell className="text-center py-12 text-gray-400">
                <Users className="mx-auto mb-2 text-gray-300" size={32} />
                No staff members found
              </TableCell>
            </TableRow>
          )}
        </Table>
      )}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Staff Member"
      >
        <form onSubmit={handleAddStaff} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Full Name</label>
              <input
                required
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-xl focus:outline-none transition-all"
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Username</label>
              <input
                required
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-xl focus:outline-none transition-all"
                placeholder="johndoe"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Email Address</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-xl focus:outline-none transition-all"
                placeholder="john@example.com"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Phone Number</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-xl focus:outline-none transition-all"
                placeholder="+1 234 567 890"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Role</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-xl focus:outline-none transition-all"
              >
                <option value="STAFF">Staff</option>
                <option value="CASHIER">Cashier</option>
                <option value="KITCHEN">Kitchen</option>
                <option value="MANAGER">Manager</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Default Password</label>
              <input
                required
                type="text"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-xl focus:outline-none transition-all"
              />
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100 flex gap-4">
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
              {isSubmitting ? 'Adding...' : 'Add Staff Member'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
