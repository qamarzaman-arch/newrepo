import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { tableService } from '../services/tableService';
import { useAuthStore } from '../stores/authStore';
import { 
  Users, Plus, Settings, RefreshCw, Clock, 
  CheckCircle2, AlertCircle, Sparkles, LayoutGrid, List,
  MoreVertical, Edit2, Trash2, MapPin, Search
} from 'lucide-react';
import toast from 'react-hot-toast';

const TablesScreen: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isAdminOrManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedTable, setSelectedTable] = useState<any>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    number: '',
    capacity: 4,
    location: '',
    shape: 'round',
    status: 'AVAILABLE',
    isActive: true,
    posX: 0,
    posY: 0,
    width: 100,
    height: 100,
  });

  const { data: tablesData, isLoading, refetch } = useQuery({
    queryKey: ['tables'],
    queryFn: async () => {
      const response = await tableService.getTables();
      return response.data.data.tables || [];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ tableId, status }: { tableId: string; status: string }) =>
      tableService.updateStatus(tableId, status as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      toast.success('Table status updated');
    },
    onError: () => toast.error('Failed to update status'),
  });

  const createTableMutation = useMutation({
    mutationFn: (data: any) => tableService.createTable(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      toast.success('Table created successfully');
      setShowAddModal(false);
      setIsEditing(false);
      setFormData({
        number: '',
        capacity: 4,
        location: '',
        shape: 'round',
        status: 'AVAILABLE',
        isActive: true,
        posX: 0,
        posY: 0,
        width: 100,
        height: 100,
      });
    },
    onError: () => toast.error('Failed to create table'),
  });

  const updateTableMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => tableService.updateTable(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      toast.success('Table updated successfully');
      setShowAddModal(false);
      setIsEditing(false);
      setSelectedTable(null);
      setFormData({
        number: '',
        capacity: 4,
        location: '',
        shape: 'round',
        status: 'AVAILABLE',
        isActive: true,
        posX: 0,
        posY: 0,
        width: 100,
        height: 100,
      });
    },
    onError: () => toast.error('Failed to update table'),
  });

  const deleteTableMutation = useMutation({
    mutationFn: (id: string) => tableService.deleteTable(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      toast.success('Table deleted');
    },
    onError: () => toast.error('Failed to delete table'),
  });

  const tables = tablesData || [];

  const filteredTables = tables.filter((table: any) => {
    const matchesSearch = table.number?.toString().toLowerCase().includes(searchQuery.toLowerCase()) ||
                         table.location?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || table.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { color: string; bg: string; border: string; icon: any; label: string }> = {
      AVAILABLE: { 
        color: 'text-green-700', 
        bg: 'bg-green-100', 
        border: 'border-green-300',
        icon: CheckCircle2,
        label: 'Available'
      },
      OCCUPIED: { 
        color: 'text-red-700', 
        bg: 'bg-red-100', 
        border: 'border-red-300',
        icon: Users,
        label: 'Occupied'
      },
      RESERVED: { 
        color: 'text-amber-700', 
        bg: 'bg-amber-100', 
        border: 'border-amber-300',
        icon: Clock,
        label: 'Reserved'
      },
      NEEDS_CLEANING: { 
        color: 'text-orange-700', 
        bg: 'bg-orange-100', 
        border: 'border-orange-300',
        icon: AlertCircle,
        label: 'Needs Cleaning'
      },
      OUT_OF_ORDER: { 
        color: 'text-gray-700', 
        bg: 'bg-gray-100', 
        border: 'border-gray-300',
        icon: AlertCircle,
        label: 'Out of Order'
      },
    };
    return configs[status] || configs.OUT_OF_ORDER;
  };

  const stats = {
    total: tables.length,
    available: tables.filter((t: any) => t.status === 'AVAILABLE').length,
    occupied: tables.filter((t: any) => t.status === 'OCCUPIED').length,
    reserved: tables.filter((t: any) => t.status === 'RESERVED').length,
    needsCleaning: tables.filter((t: any) => t.status === 'NEEDS_CLEANING').length,
    outOfOrder: tables.filter((t: any) => t.status === 'OUT_OF_ORDER').length,
    utilization: tables.length > 0 
      ? Math.round((tables.filter((t: any) => t.status === 'OCCUPIED').length / tables.length) * 100)
      : 0,
  };

  const floorSummary = [
    { label: 'Live floor', value: `${stats.available + stats.reserved} open seats`, tone: 'text-green-700' },
    { label: 'Busy tables', value: `${stats.occupied} occupied`, tone: 'text-red-700' },
    { label: 'Service attention', value: `${stats.needsCleaning + stats.outOfOrder} pending`, tone: 'text-orange-700' },
    { label: 'Utilization', value: `${stats.utilization}%`, tone: 'text-gray-900' },
  ];

  const handleStatusChange = (tableId: string, newStatus: string) => {
    updateStatusMutation.mutate({ tableId, status: newStatus });
  };

  const handleCreateTable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.number) {
      toast.error('Table number is required');
      return;
    }
    if (isEditing && selectedTable) {
      updateTableMutation.mutate({
        id: selectedTable.id,
        data: formData,
      });
    } else {
      createTableMutation.mutate(formData);
    }
  };

  const handleEditTable = (table: any) => {
    setSelectedTable(table);
    setIsEditing(true);
    setFormData({
      number: table.number || '',
      capacity: table.capacity || 4,
      location: table.location || '',
      shape: table.shape || 'round',
      status: table.status || 'AVAILABLE',
      isActive: table.isActive !== undefined ? table.isActive : true,
      posX: table.posX || 0,
      posY: table.posY || 0,
      width: table.width || 100,
      height: table.height || 100,
    });
    setShowAddModal(true);
  };

  const handleAddTable = () => {
    setSelectedTable(null);
    setIsEditing(false);
    setFormData({
      number: '',
      capacity: 4,
      location: '',
      shape: 'round',
      status: 'AVAILABLE',
      isActive: true,
      posX: 0,
      posY: 0,
      width: 100,
      height: 100,
    });
    setShowAddModal(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-neutral-100">Table Management</h1>
          <div className="animate-pulse w-32 h-10 bg-gray-200 rounded-lg" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse h-24 bg-gray-200 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="animate-pulse h-40 bg-gray-200 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[32px] border border-red-100 bg-[linear-gradient(135deg,#fff5f5_0%,#ffffff_45%,#fff1f2_100%)] p-6 shadow-soft">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-primary">Dining Floor</p>
            <h1 className="mt-2 text-3xl font-black text-neutral-900 dark:text-neutral-100">Table Management</h1>
            <p className="mt-2 text-sm text-neutral-600">
              Keep seating, reservations, and cleaning status visible in one place.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {floorSummary.map((item) => (
              <div key={item.label} className="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-neutral-0 dark:bg-neutral-800 px-4 py-3 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-neutral-400">{item.label}</p>
                <p className={`mt-1 text-sm font-bold ${item.tone}`}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-gray-900 dark:text-neutral-100 flex items-center gap-2">
            <LayoutGrid className="w-8 h-8 text-primary" />
            Floor Controls
          </h2>
          <p className="text-gray-600 mt-1">Refresh live status, add tables, and keep the floor responsive.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              try {
                await refetch();
                toast.success('Tables refreshed');
              } catch (error) {
                console.error('Failed to refresh tables:', error);
                toast.error('Failed to refresh tables');
              }
            }}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5 text-gray-600" />
          </button>
          {isAdminOrManager && (
            <button
              onClick={handleAddTable}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Table
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total Tables', value: stats.total, color: 'bg-blue-100 text-blue-800' },
          { label: 'Available', value: stats.available, color: 'bg-green-100 text-green-800' },
          { label: 'Occupied', value: stats.occupied, color: 'bg-red-100 text-red-800' },
          { label: 'Reserved', value: stats.reserved, color: 'bg-amber-100 text-amber-800' },
          { label: 'Needs Cleaning', value: stats.needsCleaning, color: 'bg-orange-100 text-orange-800' },
          { label: 'Utilization', value: `${stats.utilization}%`, color: 'bg-purple-100 text-purple-800' },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`${stat.color} rounded-2xl p-4 shadow-sm border border-white`}
          >
            <p className="text-sm font-medium opacity-80">{stat.label}</p>
            <p className="text-2xl font-bold">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-white dark:bg-neutral-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-neutral-700">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search tables..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 outline-none text-gray-700"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">All Status</option>
            <option value="AVAILABLE">Available</option>
            <option value="OCCUPIED">Occupied</option>
            <option value="RESERVED">Reserved</option>
            <option value="NEEDS_CLEANING">Needs Cleaning</option>
            <option value="OUT_OF_ORDER">Out of Order</option>
          </select>
          <div className="flex items-center bg-gray-100 dark:bg-neutral-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Tables Grid */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          <AnimatePresence>
            {filteredTables.map((table: any, index: number) => {
              const statusConfig = getStatusConfig(table.status);
              const StatusIcon = statusConfig.icon;
              
              return (
                <motion.div
                  key={table.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.03 }}
                  className={`bg-white dark:bg-neutral-800 rounded-2xl p-5 shadow-soft border-2 ${statusConfig.border} cursor-pointer hover:shadow-medium transition-all group relative overflow-hidden`}
                  onClick={() => setSelectedTable(table)}
                >
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-red-200 via-red-500 to-red-200 opacity-80" />
                  {/* Status Badge */}
                  <div className={`absolute top-3 right-3 ${statusConfig.bg} ${statusConfig.color} px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1`}>
                    <StatusIcon className="w-3 h-3" />
                  </div>

                  {/* Table Shape Icon */}
                  <div className={`w-16 h-16 mx-auto mb-3 ${statusConfig.bg} rounded-full flex items-center justify-center ring-4 ring-white shadow-sm`}>
                    <span className={`text-2xl font-bold ${statusConfig.color}`}>T{table.number}</span>
                  </div>

                  <h3 className="text-lg font-bold text-center text-gray-900 dark:text-neutral-100 mb-1">Table {table.number}</h3>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-center text-gray-400 mb-2">
                    {table.shape || 'Round'} table
                  </p>
                  
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-600 mb-2">
                    <Users className="w-4 h-4" />
                    <span>{table.capacity} seats</span>
                  </div>
                  
                  {table.location && (
                    <p className="text-xs text-center text-gray-500 flex items-center justify-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {table.location}
                    </p>
                  )}
                  <div className="mt-4 flex items-center justify-center">
                    <span className="rounded-full bg-gray-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                      {table.isActive === false ? 'Inactive' : 'Active'}
                    </span>
                  </div>

                  {/* Quick Actions on Hover */}
                  <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-gray-900/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex justify-center gap-1">
                    {table.status === 'OCCUPIED' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusChange(table.id, 'NEEDS_CLEANING');
                        }}
                        className="px-2 py-1 bg-white text-orange-600 text-xs rounded-lg font-medium"
                      >
                        Clean
                      </button>
                    )}
                    {table.status === 'NEEDS_CLEANING' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusChange(table.id, 'AVAILABLE');
                        }}
                        className="px-2 py-1 bg-green-500 text-white text-xs rounded-lg font-medium"
                      >
                        Ready
                      </button>
                    )}
                    {table.status === 'AVAILABLE' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusChange(table.id, 'RESERVED');
                        }}
                        className="px-2 py-1 bg-amber-500 text-white text-xs rounded-lg font-medium"
                      >
                        Reserve
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        /* List View */
        <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-soft border border-gray-200 dark:border-neutral-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-neutral-900 border-b border-gray-200 dark:border-neutral-700">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Table</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Capacity</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Location</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredTables.map((table: any) => {
                const statusConfig = getStatusConfig(table.status);
                const StatusIcon = statusConfig.icon;
                
                return (
                  <tr key={table.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="font-semibold text-gray-900 dark:text-neutral-100">Table {table.number}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusConfig.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {table.capacity}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{table.location || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {isAdminOrManager && (
                          <select
                            value={table.status}
                            onChange={(e) => handleStatusChange(table.id, e.target.value)}
                            className="text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary/20"
                          >
                            <option value="AVAILABLE">Available</option>
                            <option value="OCCUPIED">Occupied</option>
                            <option value="RESERVED">Reserved</option>
                            <option value="NEEDS_CLEANING">Needs Cleaning</option>
                            <option value="OUT_OF_ORDER">Out of Order</option>
                          </select>
                        )}
                        {isAdminOrManager && (
                          <>
                            <button
                              onClick={() => handleEditTable(table)}
                              className="p-1 hover:bg-gray-100 rounded-lg"
                            >
                              <Edit2 className="w-4 h-4 text-gray-600" />
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm('Delete this table?')) {
                                  deleteTableMutation.mutate(table.id);
                                }
                              }}
                              className="p-1 hover:bg-red-100 rounded-lg"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {filteredTables.length === 0 && !isLoading && (
        <div className="text-center py-16 bg-white dark:bg-neutral-800 rounded-[28px] shadow-soft border border-red-100 dark:border-neutral-700">
          <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <LayoutGrid className="w-12 h-12 text-red-300" />
          </div>
          <p className="text-gray-500 text-lg">{searchQuery ? 'No tables match your search' : 'No tables configured yet'}</p>
          {!searchQuery && (
            <button
              onClick={handleAddTable}
              className="mt-4 px-5 py-2.5 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors"
            >
              Add Your First Table
            </button>
          )}
        </div>
      )}

      {/* Add Table Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-neutral-800 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-xl font-bold text-gray-900 dark:text-neutral-100 mb-4 flex items-center gap-2">
                <Plus className="w-6 h-6 text-primary" />
                {isEditing ? 'Edit Table' : 'Add New Table'}
              </h2>
              <form onSubmit={handleCreateTable} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Table Number</label>
                  <input
                    type="text"
                    value={formData.number}
                    onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="e.g., 1, A1, VIP-1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
                  <input
                    type="number"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                    min={1}
                    max={50}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="e.g., Main Hall, Patio, Upstairs"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Shape</label>
                  <select
                    value={formData.shape}
                    onChange={(e) => setFormData({ ...formData, shape: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="round">Round</option>
                    <option value="square">Square</option>
                    <option value="rectangle">Rectangle</option>
                    <option value="booth">Booth</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="AVAILABLE">Available</option>
                    <option value="OCCUPIED">Occupied</option>
                    <option value="RESERVED">Reserved</option>
                    <option value="NEEDS_CLEANING">Needs Cleaning</option>
                    <option value="OUT_OF_ORDER">Out of Order</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Active</label>
                  <select
                    value={formData.isActive ? 'true' : 'false'}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'true' })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Position X</label>
                    <input
                      type="number"
                      value={formData.posX}
                      onChange={(e) => setFormData({ ...formData, posX: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                      min={0}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Position Y</label>
                    <input
                      type="number"
                      value={formData.posY}
                      onChange={(e) => setFormData({ ...formData, posY: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                      min={0}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Width</label>
                    <input
                      type="number"
                      value={formData.width}
                      onChange={(e) => setFormData({ ...formData, width: parseInt(e.target.value) || 100 })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                      min={50}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Height</label>
                    <input
                      type="number"
                      value={formData.height}
                      onChange={(e) => setFormData({ ...formData, height: parseInt(e.target.value) || 100 })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                      min={50}
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createTableMutation.isPending}
                    className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
                  >
                    {createTableMutation.isPending ? 'Creating...' : 'Create Table'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table Details Modal */}
      <AnimatePresence>
        {selectedTable && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedTable(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-neutral-800 rounded-2xl p-6 w-full max-w-md"
            >
              {(() => {
                const statusConfig = getStatusConfig(selectedTable.status);
                const StatusIcon = statusConfig.icon;
                
                return (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-bold text-gray-900 dark:text-neutral-100">Table {selectedTable.number}</h2>
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${statusConfig.bg} ${statusConfig.color}`}>
                        <StatusIcon className="w-4 h-4" />
                        {statusConfig.label}
                      </span>
                    </div>
                    
                    <div className="space-y-3 mb-6">
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-600">Capacity</span>
                        <span className="font-medium flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {selectedTable.capacity} seats
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-600">Location</span>
                        <span className="font-medium">{selectedTable.location || 'Not specified'}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-600">Shape</span>
                        <span className="font-medium capitalize">{selectedTable.shape || 'Round'}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">Quick Status Change:</p>
                      <div className="grid grid-cols-2 gap-2">
                        {['AVAILABLE', 'OCCUPIED', 'RESERVED', 'NEEDS_CLEANING', 'OUT_OF_ORDER'].map((status) => {
                          const config = getStatusConfig(status);
                          const Icon = config.icon;
                          return (
                            <button
                              key={status}
                              onClick={() => {
                                handleStatusChange(selectedTable.id, status);
                                setSelectedTable(null);
                              }}
                              disabled={selectedTable.status === status}
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                selectedTable.status === status
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                  : `${config.bg} ${config.color} hover:opacity-80`
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                              {config.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedTable(null)}
                      className="w-full mt-6 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      Close
                    </button>
                  </>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TablesScreen;
