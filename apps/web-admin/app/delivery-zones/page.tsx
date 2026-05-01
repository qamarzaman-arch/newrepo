'use client';

import React, { useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { MapPin, Plus, RefreshCw, AlertTriangle, Edit2, Trash2, X, Check } from 'lucide-react';
import apiClient from '../lib/api';
import toast from 'react-hot-toast';

// Leaflet uses window at module load — must be client-only
const ZoneMap = dynamic(() => import('../components/ZoneMap'), { ssr: false });

interface LatLng { lat: number; lng: number }

interface DeliveryZone {
  id: string;
  name: string;
  description?: string | null;
  baseFee: number;
  minimumOrder: number;
  freeDeliveryThreshold?: number | null;
  estimatedTimeMin: number;
  estimatedTimeMax: number;
  color?: string | null;
  isActive: boolean;
  coordinates: LatLng[];
}

const EMPTY_FORM = {
  name: '',
  description: '',
  baseFee: '0',
  minimumOrder: '0',
  freeDeliveryThreshold: '',
  estimatedTimeMin: '20',
  estimatedTimeMax: '45',
  color: '#dc2626',
  isActive: true,
  coordinates: [] as LatLng[],
};

export default function DeliveryZonesPage() {
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [feeForm, setFeeForm] = useState({ latitude: '', longitude: '', orderAmount: '' });
  const [feeResult, setFeeResult] = useState<{ zone?: any; fee: number; minimumOrder?: number; estimatedTimeMin?: number; estimatedTimeMax?: number; error?: string } | null>(null);
  const [calculatingFee, setCalculatingFee] = useState(false);

  const calculateFee = async () => {
    const lat = parseFloat(feeForm.latitude);
    const lng = parseFloat(feeForm.longitude);
    // QA C46: bound to legal lat/lng ranges client-side too.
    if (isNaN(lat) || isNaN(lng)) {
      toast.error('Enter valid latitude and longitude');
      return;
    }
    if (lat < -90 || lat > 90) {
      toast.error('Latitude must be between -90 and 90');
      return;
    }
    if (lng < -180 || lng > 180) {
      toast.error('Longitude must be between -180 and 180');
      return;
    }
    // QA C47: defensive default for orderAmount so a NaN never reaches the API.
    const orderAmount = (() => {
      const n = parseFloat(feeForm.orderAmount);
      return Number.isFinite(n) && n >= 0 ? n : 0;
    })();
    setCalculatingFee(true);
    setFeeResult(null);
    try {
      const res = await apiClient.post('/delivery-zones/calculate-fee', {
        latitude: lat, longitude: lng, orderAmount,
      });
      setFeeResult(res.data?.data);
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.response?.data?.message || 'Calculation failed';
      setFeeResult({ fee: 0, error: msg });
    } finally {
      setCalculatingFee(false);
    }
  };

  const fetchZones = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get('/delivery-zones');
      const list: DeliveryZone[] = (res.data?.data?.zones || []).map((z: any) => ({
        ...z,
        baseFee: Number(z.baseFee || 0),
        minimumOrder: Number(z.minimumOrder || 0),
        freeDeliveryThreshold: z.freeDeliveryThreshold != null ? Number(z.freeDeliveryThreshold) : null,
        coordinates: Array.isArray(z.coordinates)
          ? z.coordinates.map((c: any) => ({ lat: Number(c.lat), lng: Number(c.lng) }))
          : [],
      }));
      setZones(list);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load delivery zones');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchZones(); }, [fetchZones]);

  const openCreate = () => {
    setEditingZone(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (zone: DeliveryZone) => {
    setEditingZone(zone);
    setForm({
      name: zone.name,
      description: zone.description || '',
      baseFee: String(zone.baseFee),
      minimumOrder: String(zone.minimumOrder),
      freeDeliveryThreshold: zone.freeDeliveryThreshold != null ? String(zone.freeDeliveryThreshold) : '',
      estimatedTimeMin: String(zone.estimatedTimeMin),
      estimatedTimeMax: String(zone.estimatedTimeMax),
      color: zone.color || '#dc2626',
      isActive: zone.isActive,
      coordinates: zone.coordinates,
    });
    setShowModal(true);
  };

  const saveZone = async () => {
    if (!form.name.trim()) { toast.error('Zone name is required'); return; }
    if (form.coordinates.length < 3) { toast.error('Click on the map to add at least 3 points'); return; }

    setSaving(true);
    try {
      const payload: any = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        baseFee: parseFloat(form.baseFee) || 0,
        minimumOrder: parseFloat(form.minimumOrder) || 0,
        freeDeliveryThreshold: form.freeDeliveryThreshold ? parseFloat(form.freeDeliveryThreshold) : undefined,
        estimatedTimeMin: parseInt(form.estimatedTimeMin, 10) || 20,
        estimatedTimeMax: parseInt(form.estimatedTimeMax, 10) || 45,
        color: form.color,
        isActive: form.isActive,
        coordinates: form.coordinates,
      };

      if (editingZone) {
        await apiClient.put(`/delivery-zones/${editingZone.id}`, payload);
        toast.success('Zone updated');
      } else {
        await apiClient.post('/delivery-zones', payload);
        toast.success('Zone created');
      }
      setShowModal(false);
      setForm(EMPTY_FORM);
      setEditingZone(null);
      await fetchZones();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save zone');
    } finally {
      setSaving(false);
    }
  };

  const deleteZone = async (id: string) => {
    if (!confirm('Delete this delivery zone?')) return;
    try {
      await apiClient.delete(`/delivery-zones/${id}`);
      toast.success('Zone deleted');
      await fetchZones();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
            <MapPin className="text-red-600" /> Delivery Zones
          </h1>
          <p className="text-gray-500 mt-1">Draw geo-fenced polygons. New deliveries auto-assign to the matching zone.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchZones} className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">
            <RefreshCw size={16} /> Refresh
          </button>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors">
            <Plus size={16} /> New Zone
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 p-4 rounded-2xl flex items-center gap-3">
          <AlertTriangle size={20} /> {error}
        </div>
      )}

      {/* Map preview */}
      {!loading && (
        <ZoneMap
          zones={zones.filter(z => z.coordinates.length >= 3)}
          height={420}
        />
      )}

      {/* Fee Calculator */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-extrabold text-gray-900 mb-4 flex items-center gap-2">
          <MapPin size={18} className="text-red-600" /> Test Delivery Fee
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Latitude</label>
            <input
              type="number"
              step="any"
              value={feeForm.latitude}
              onChange={(e) => setFeeForm({ ...feeForm, latitude: e.target.value })}
              placeholder="33.6844"
              className="w-full px-3 py-2 bg-gray-50 border-2 border-transparent focus:border-red-500 rounded-xl focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Longitude</label>
            <input
              type="number"
              step="any"
              value={feeForm.longitude}
              onChange={(e) => setFeeForm({ ...feeForm, longitude: e.target.value })}
              placeholder="73.0479"
              className="w-full px-3 py-2 bg-gray-50 border-2 border-transparent focus:border-red-500 rounded-xl focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Order Amount</label>
            <input
              type="number"
              step="any"
              value={feeForm.orderAmount}
              onChange={(e) => setFeeForm({ ...feeForm, orderAmount: e.target.value })}
              placeholder="0"
              className="w-full px-3 py-2 bg-gray-50 border-2 border-transparent focus:border-red-500 rounded-xl focus:outline-none"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={calculateFee}
              disabled={calculatingFee}
              className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl font-bold"
            >
              {calculatingFee ? 'Calculating...' : 'Calculate'}
            </button>
          </div>
        </div>
        {feeResult && (
          <div className={`mt-4 p-4 rounded-xl ${feeResult.error ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-green-50 border border-green-200 text-green-800'}`}>
            {feeResult.error ? (
              <p className="text-sm font-semibold">{feeResult.error}</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div><span className="block text-xs uppercase font-bold opacity-70">Zone</span><span className="font-extrabold">{feeResult.zone?.name}</span></div>
                <div><span className="block text-xs uppercase font-bold opacity-70">Fee</span><span className="font-extrabold">Rs. {feeResult.fee.toFixed(2)}</span></div>
                <div><span className="block text-xs uppercase font-bold opacity-70">Min Order</span><span className="font-extrabold">Rs. {Number(feeResult.minimumOrder || 0).toFixed(2)}</span></div>
                <div><span className="block text-xs uppercase font-bold opacity-70">ETA</span><span className="font-extrabold">{feeResult.estimatedTimeMin}-{feeResult.estimatedTimeMax} min</span></div>
              </div>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : zones.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border-2 border-dashed border-gray-200 text-center">
          <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="font-bold text-gray-700">No delivery zones yet</p>
          <p className="text-sm text-gray-500 mt-1">Click "New Zone" to draw your first geo-fenced area.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {zones.map(zone => {
            const polygonValid = zone.coordinates.length >= 3;
            return (
              <div key={zone.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: zone.color || '#dc2626' }} />
                    <h3 className="text-base font-bold text-gray-900 truncate">{zone.name}</h3>
                    {!zone.isActive && <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Inactive</span>}
                  </div>
                </div>
                {zone.description && <p className="text-xs text-gray-500 mb-3 line-clamp-2">{zone.description}</p>}
                <div className="space-y-1.5 text-sm mb-3">
                  <div className="flex justify-between"><span className="text-gray-500">Base fee</span><span className="font-bold text-red-600">${zone.baseFee.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Min order</span><span className="font-semibold">${zone.minimumOrder.toFixed(2)}</span></div>
                  {zone.freeDeliveryThreshold != null && (
                    <div className="flex justify-between"><span className="text-gray-500">Free above</span><span className="font-semibold text-emerald-600">${zone.freeDeliveryThreshold.toFixed(2)}</span></div>
                  )}
                  <div className="flex justify-between"><span className="text-gray-500">ETA</span><span className="font-semibold">{zone.estimatedTimeMin}–{zone.estimatedTimeMax} min</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Polygon</span>
                    <span className={`font-semibold ${polygonValid ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {polygonValid ? `${zone.coordinates.length} points` : 'Not drawn'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(zone)} className="flex-1 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-bold hover:bg-blue-100 transition-colors flex items-center justify-center gap-1">
                    <Edit2 size={12} /> Edit
                  </button>
                  <button onClick={() => deleteZone(zone.id)} className="p-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 w-full max-w-5xl my-8 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{editingZone ? 'Edit Delivery Zone' : 'Create Delivery Zone'}</h2>
                <p className="text-sm text-gray-500 mt-0.5">Click on the map to draw the polygon. Click a vertex to remove it.</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-1 space-y-3 text-sm">
                <Field label="Zone Name *">
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g., Downtown Core"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-red-400 focus:outline-none" />
                </Field>
                <Field label="Description">
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-red-400 focus:outline-none" />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Base Fee ($)">
                    <input type="number" step="0.01" min="0" value={form.baseFee} onChange={(e) => setForm({ ...form, baseFee: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-red-400 focus:outline-none" />
                  </Field>
                  <Field label="Min Order ($)">
                    <input type="number" step="0.01" min="0" value={form.minimumOrder} onChange={(e) => setForm({ ...form, minimumOrder: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-red-400 focus:outline-none" />
                  </Field>
                </div>
                <Field label="Free Delivery Above ($)">
                  <input type="number" step="0.01" min="0" value={form.freeDeliveryThreshold}
                    onChange={(e) => setForm({ ...form, freeDeliveryThreshold: e.target.value })}
                    placeholder="Leave blank to disable"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-red-400 focus:outline-none" />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="ETA Min (min)">
                    <input type="number" min="0" value={form.estimatedTimeMin}
                      onChange={(e) => setForm({ ...form, estimatedTimeMin: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-red-400 focus:outline-none" />
                  </Field>
                  <Field label="ETA Max (min)">
                    <input type="number" min="0" value={form.estimatedTimeMax}
                      onChange={(e) => setForm({ ...form, estimatedTimeMax: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-red-400 focus:outline-none" />
                  </Field>
                </div>
                <Field label="Color">
                  <div className="flex items-center gap-2">
                    <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })}
                      className="h-10 w-14 border border-gray-200 rounded-lg cursor-pointer" />
                    <input type="text" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:border-red-400 focus:outline-none font-mono text-xs" />
                  </div>
                </Field>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="w-4 h-4" />
                  <span className="font-semibold text-gray-700">Zone is active</span>
                </label>
                <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2">
                  {form.coordinates.length === 0
                    ? 'Click on the map to start drawing.'
                    : form.coordinates.length < 3
                    ? `${form.coordinates.length} point${form.coordinates.length === 1 ? '' : 's'} — need at least 3.`
                    : `${form.coordinates.length} points · polygon ready.`}
                </div>
              </div>

              <div className="lg:col-span-2">
                <ZoneMap
                  zones={zones.filter(z => z.id !== editingZone?.id && z.coordinates.length >= 3)}
                  editing={{
                    value: form.coordinates,
                    onChange: (coords) => setForm({ ...form, coordinates: coords }),
                    color: form.color,
                  }}
                  height={460}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-5 border-t border-gray-100">
              <button onClick={() => setShowModal(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors">
                Cancel
              </button>
              <button onClick={saveZone}
                disabled={saving || form.coordinates.length < 3 || !form.name.trim()}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check size={16} />}
                {editingZone ? 'Update Zone' : 'Create Zone'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label className="block text-sm font-bold text-gray-700 mb-1">{label}</label>
    {children}
  </div>
);
