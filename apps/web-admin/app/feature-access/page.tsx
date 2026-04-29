'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Shield, RefreshCw, AlertTriangle, Save, RotateCcw, Check, X } from 'lucide-react';
import apiClient from '../lib/api';

const FEATURES = [
  { key: 'orders',     label: 'Orders',     description: 'View and manage orders' },
  { key: 'kitchen',    label: 'Kitchen',    description: 'Access kitchen display' },
  { key: 'inventory',  label: 'Inventory',  description: 'Manage inventory items' },
  { key: 'vendors',    label: 'Vendors',    description: 'Manage suppliers' },
  { key: 'customers',  label: 'Customers',  description: 'Access customer records' },
  { key: 'staff',      label: 'Staff',      description: 'Manage staff members' },
  { key: 'attendance', label: 'Attendance', description: 'Clock in/out and track attendance' },
  { key: 'delivery',   label: 'Delivery',   description: 'Delivery management' },
  { key: 'tables',     label: 'Tables',     description: 'Table management' },
  { key: 'menu',       label: 'Menu',       description: 'Edit menu items' },
  { key: 'reports',    label: 'Reports',    description: 'View reports & analytics' },
  { key: 'financial',  label: 'Financial',  description: 'Financial management' },
  { key: 'settings',   label: 'Settings',   description: 'System settings' },
];

const ROLES = ['ADMIN', 'MANAGER', 'STAFF', 'CASHIER', 'RIDER'];

const ROLE_COLORS: Record<string, string> = {
  ADMIN:   'bg-purple-100 text-purple-700',
  MANAGER: 'bg-blue-100 text-blue-700',
  STAFF:   'bg-green-100 text-green-700',
  CASHIER: 'bg-yellow-100 text-yellow-700',
  RIDER:   'bg-orange-100 text-orange-700',
};

type AccessMatrix = Record<string, Record<string, boolean>>;

export default function FeatureAccessPage() {
  const [matrix, setMatrix] = useState<AccessMatrix>({});
  const [original, setOriginal] = useState<AccessMatrix>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchAccess = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get('/feature-access');
      const accessList: { feature: string; role: string; enabled: boolean }[] = res.data?.data?.access || [];
      const data: AccessMatrix = {};
      for (const a of accessList) {
        if (!data[a.feature]) data[a.feature] = {};
        data[a.feature][a.role] = a.enabled;
      }
      setMatrix(JSON.parse(JSON.stringify(data)));
      setOriginal(JSON.parse(JSON.stringify(data)));
    } catch {
      setError('Failed to load feature access rules');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAccess(); }, [fetchAccess]);

  const toggle = (feature: string, role: string) => {
    if (role === 'ADMIN') return; // ADMIN always has access
    setMatrix(prev => ({
      ...prev,
      [feature]: {
        ...(prev[feature] || {}),
        [role]: !(prev[feature]?.[role] ?? false),
      },
    }));
  };

  const hasChanges = JSON.stringify(matrix) !== JSON.stringify(original);

  const saveChanges = async () => {
    setSaving(true);
    setSuccessMsg(null);
    try {
      for (const feature of FEATURES) {
        for (const role of ROLES) {
          if (role === 'ADMIN') continue;
          const currentVal = matrix[feature.key]?.[role] ?? false;
          const originalVal = original[feature.key]?.[role] ?? false;
          if (currentVal !== originalVal) {
            await apiClient.patch('/feature-access', { feature: feature.key, role, enabled: currentVal });
          }
        }
      }
      setOriginal(JSON.parse(JSON.stringify(matrix)));
      setSuccessMsg('Feature access updated successfully');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch {
      setError('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = async () => {
    if (!confirm('Reset all feature access to defaults?')) return;
    try {
      await apiClient.post('/feature-access/reset');
      await fetchAccess();
      setSuccessMsg('Reset to defaults');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch {
      setError('Failed to reset');
    }
  };

  const discardChanges = () => {
    setMatrix(JSON.parse(JSON.stringify(original)));
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
            <Shield className="text-red-600" /> Feature Access
          </h1>
          <p className="text-gray-500 mt-1">Control which roles can access each feature</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchAccess} className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">
            <RefreshCw size={16} /> Refresh
          </button>
          <button onClick={resetToDefaults} className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">
            <RotateCcw size={16} /> Reset Defaults
          </button>
          {hasChanges && (
            <>
              <button onClick={discardChanges} className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">
                <X size={16} /> Discard
              </button>
              <button onClick={saveChanges} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors disabled:opacity-50">
                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={16} />}
                Save Changes
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 p-4 rounded-2xl flex items-center gap-3">
          <AlertTriangle size={20} /> {error}
        </div>
      )}

      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-2xl flex items-center gap-3">
          <Check size={20} /> {successMsg}
        </div>
      )}

      {hasChanges && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 p-3 rounded-2xl text-sm font-medium">
          You have unsaved changes. Click "Save Changes" to apply.
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-5 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-48">Feature</th>
                  {ROLES.map(role => (
                    <th key={role} className="px-4 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${ROLE_COLORS[role]}`}>{role}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {FEATURES.map(feature => (
                  <tr key={feature.key} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-bold text-gray-900">{feature.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{feature.description}</p>
                    </td>
                    {ROLES.map(role => {
                      const isEnabled = role === 'ADMIN' ? true : (matrix[feature.key]?.[role] ?? false);
                      const isAdmin = role === 'ADMIN';
                      return (
                        <td key={role} className="px-4 py-4 text-center">
                          <button
                            onClick={() => toggle(feature.key, role)}
                            disabled={isAdmin}
                            className={`w-8 h-8 rounded-xl flex items-center justify-center mx-auto transition-all ${
                              isEnabled
                                ? isAdmin
                                  ? 'bg-purple-100 text-purple-600 cursor-not-allowed'
                                  : 'bg-green-100 text-green-600 hover:bg-green-200'
                                : 'bg-gray-100 text-gray-300 hover:bg-gray-200 hover:text-gray-400'
                            }`}
                            title={isAdmin ? 'Admin always has access' : isEnabled ? 'Click to disable' : 'Click to enable'}
                          >
                            {isEnabled ? <Check size={14} /> : <X size={14} />}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 text-center">
        ADMIN always has full access to all features. Toggle switches to grant or revoke access per role.
      </p>
    </div>
  );
}
