'use client';

import React, { useState } from 'react';
import { 
  MapPin, Plus, Search, DollarSign, Truck, 
  Edit2, Trash2, CheckCircle, XCircle, Navigation
} from 'lucide-react';
import { Button, Table, TableRow, TableCell, Badge, Modal } from '@poslytic/ui-components';
import apiClient from '../lib/api';
import toast from 'react-hot-toast';

interface DeliveryZone {
  id: string;
  name: string;
  description?: string;
  radius: number; // in kilometers
  baseFee: number;
  perKmFee: number;
  minOrderAmount: number;
  estimatedTime: number; // in minutes
  isActive: boolean;
  color?: string;
}

export default function DeliveryZonesPage() {
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    radius: 5,
    baseFee: 3.99,
    perKmFee: 0.50,
    minOrderAmount: 15,
    estimatedTime: 30,
    isActive: true,
    color: '#6366f1',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get('/delivery-zones');
      setZones(response.data?.data?.zones || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load delivery zones');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchData();
  }, []);

  const handleAddZone = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiClient.post('/delivery-zones', formData);
      toast.success('Delivery zone created successfully!');
      setShowAddModal(false);
      setFormData({
        name: '',
        description: '',
        radius: 5,
        baseFee: 3.99,
        perKmFee: 0.50,
        minOrderAmount: 15,
        estimatedTime: 30,
        isActive: true,
        color: '#6366f1',
      });
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create delivery zone');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteZone = async (id: string) => {
    if (!confirm('Delete this delivery zone?')) return;
    try {
      await apiClient.delete(`/delivery-zones/${id}`);
      toast.success('Delivery zone deleted');
      fetchData();
    } catch (err) {
      toast.error('Failed to delete delivery zone');
    }
  };

  const handleToggleZone = async (id: string, currentStatus: boolean) => {
    try {
      await apiClient.patch(`/delivery-zones/${id}`, { isActive: !currentStatus });
      toast.success(`Zone ${!currentStatus ? 'activated' : 'deactivated'}`);
      fetchData();
    } catch (err) {
      toast.error('Failed to update zone status');
    }
  };

  const filteredZones = zones.filter(zone =>
    zone.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (zone.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const calculateDeliveryFee = (zone: DeliveryZone, distance: number) => {
    if (distance > zone.radius) return null; // Out of range
    return zone.baseFee + (distance * zone.perKmFee);
  };

  const stats = {
    total: zones.length,
    active: zones.filter(z => z.isActive).length,
    avgBaseFee: zones.length > 0 
      ? zones.reduce((sum, z) => sum + z.baseFee, 0) / zones.length 
      : 0,
    avgRadius: zones.length > 0
      ? zones.reduce((sum, z) => sum + z.radius, 0) / zones.length
      : 0,
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-gray-900">Delivery Zones</h1>
          <p className="text-gray-500 mt-2 font-medium">
            Configure delivery areas, fees, and coverage zones
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus size={18} />
          Add Delivery Zone
        </Button>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl">
          {error} — <button onClick={fetchData} className="underline">Retry</button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-soft border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-blue-50 text-blue-600">
              <MapPin size={24} />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Total Zones</p>
              <h3 className="text-2xl font-black text-gray-900">{stats.total}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-soft border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-green-50 text-green-600">
              <CheckCircle size={24} />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Active Zones</p>
              <h3 className="text-2xl font-black text-gray-900">{stats.active}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-soft border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-orange-50 text-orange-600">
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Avg Base Fee</p>
              <h3 className="text-2xl font-black text-gray-900">${stats.avgBaseFee.toFixed(2)}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-soft border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-purple-50 text-purple-600">
              <Navigation size={24} />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Avg Coverage</p>
              <h3 className="text-2xl font-black text-gray-900">{stats.avgRadius.toFixed(1)} km</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-3xl shadow-soft border border-gray-100">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Search delivery zones..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-transparent rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-100 focus:outline-none transition-all font-medium"
          />
        </div>
      </div>

      {/* Delivery Zones Table */}
      {loading ? (
        <div className="bg-white rounded-3xl p-20 text-center shadow-soft border border-gray-100">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Loading delivery zones...</p>
        </div>
      ) : (
        <Table headers={['Zone Name', 'Coverage', 'Base Fee', 'Per KM', 'Min Order', 'Est. Time', 'Status', 'Actions']}>
          {filteredZones.map((zone) => (
            <TableRow key={zone.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${zone.color}20` }}
                  >
                    <MapPin size={20} style={{ color: zone.color }} />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{zone.name}</p>
                    <p className="text-xs text-gray-500">{zone.description || 'No description'}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1 text-sm">
                  <Navigation size={14} className="text-gray-400" />
                  <span className="font-semibold">{zone.radius} km radius</span>
                </div>
              </TableCell>
              <TableCell className="font-black text-indigo-600">
                ${zone.baseFee.toFixed(2)}
              </TableCell>
              <TableCell className="font-bold text-gray-700">
                ${zone.perKmFee.toFixed(2)}/km
              </TableCell>
              <TableCell className="font-semibold text-gray-700">
                ${zone.minOrderAmount.toFixed(2)}
              </TableCell>
              <TableCell>
                <Badge variant="neutral">
                  {zone.estimatedTime} min
                </Badge>
              </TableCell>
              <TableCell>
                <button
                  onClick={() => handleToggleZone(zone.id, zone.isActive)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    zone.isActive 
                      ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {zone.isActive ? <CheckCircle size={14} /> : <XCircle size={14} />}
                  {zone.isActive ? 'Active' : 'Inactive'}
                </button>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDeleteZone(zone.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {filteredZones.length === 0 && (
            <TableRow>
              <TableCell className="text-center py-12 text-gray-400">
                <MapPin className="mx-auto mb-2 text-gray-300" size={32} />
                No delivery zones configured
              </TableCell>
            </TableRow>
          )}
        </Table>
      )}

      {/* Zone Details Cards - Shows actual zone configuration */}
      {zones.length > 0 && (
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-3xl p-6 border border-indigo-100">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <CalculatorIcon />
            Active Delivery Zones
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {zones.slice(0, 3).map(zone => (
              <div key={zone.id} className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm text-gray-900">{zone.name}</span>
                  <Badge variant="success" className="text-xs">Active</Badge>
                </div>
                <div className="space-y-1 text-xs text-gray-600">
                  <p>Max Radius: {zone.radius.toFixed(1)} km</p>
                  <p>Base Fee: ${zone.baseFee.toFixed(2)}</p>
                  <p>Per km: ${zone.perKmFee.toFixed(2)}</p>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500">Zone Coverage:</p>
                  <p className="text-sm font-medium text-gray-900">
                    {zone.radius}km radius
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Delivery Zone Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Delivery Zone"
      >
        <form onSubmit={handleAddZone} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Zone Name</label>
            <input
              required
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-xl focus:outline-none transition-all"
              placeholder="e.g. Downtown Area"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Description (Optional)</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-xl focus:outline-none transition-all"
              placeholder="Central business district..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Radius (km)</label>
              <input
                required
                type="number"
                min="1"
                step="0.5"
                value={formData.radius}
                onChange={(e) => setFormData({ ...formData, radius: parseFloat(e.target.value) })}
                className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-xl focus:outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Color</label>
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-full h-[46px] px-2 py-2 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-xl cursor-pointer"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Base Fee ($)</label>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={formData.baseFee}
                onChange={(e) => setFormData({ ...formData, baseFee: parseFloat(e.target.value) })}
                className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-xl focus:outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Per KM Fee ($)</label>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={formData.perKmFee}
                onChange={(e) => setFormData({ ...formData, perKmFee: parseFloat(e.target.value) })}
                className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-xl focus:outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Min Order Amount ($)</label>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={formData.minOrderAmount}
                onChange={(e) => setFormData({ ...formData, minOrderAmount: parseFloat(e.target.value) })}
                className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-xl focus:outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Est. Delivery Time (min)</label>
              <input
                required
                type="number"
                min="5"
                step="5"
                value={formData.estimatedTime}
                onChange={(e) => setFormData({ ...formData, estimatedTime: parseInt(e.target.value) })}
                className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-xl focus:outline-none transition-all"
              />
            </div>
          </div>

          <div className="bg-indigo-50 rounded-xl p-4">
            <p className="text-xs text-indigo-900 font-semibold mb-2">💡 Fee Calculation Formula:</p>
            <code className="text-xs bg-white px-3 py-2 rounded-lg block">
              Total Fee = Base Fee (${formData.baseFee}) + (Distance × Per KM Fee (${formData.perKmFee}))
            </code>
            <p className="text-xs text-indigo-700 mt-2">
              Example: 5km delivery = ${formData.baseFee} + (5 × ${formData.perKmFee}) = ${(formData.baseFee + 5 * formData.perKmFee).toFixed(2)}
            </p>
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
              {isSubmitting ? 'Creating...' : 'Create Delivery Zone'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function CalculatorIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  );
}
