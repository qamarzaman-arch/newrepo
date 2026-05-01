import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Lock, Unlock, RefreshCw, Save, Settings, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { featureAccessService } from '../services/featureAccessService';
import { useAuthStore } from '../stores/authStore';

interface Feature {
  id: string;
  name: string;
  description: string;
}

interface RoleAccess {
  role: string;
  enabled: boolean;
}

interface FeatureAccessData {
  feature: string;
  role: string;
  enabled: boolean;
}

const AVAILABLE_FEATURES: Feature[] = [
  { id: 'orders', name: 'Orders Management', description: 'Create, view, and manage orders' },
  { id: 'kitchen', name: 'Kitchen Display System', description: 'View and manage kitchen orders' },
  { id: 'inventory', name: 'Inventory Management', description: 'Manage inventory items and stock' },
  { id: 'vendors', name: 'Vendor Management', description: 'Manage vendors and purchase orders' },
  { id: 'customers', name: 'Customer Management', description: 'Manage customer data and loyalty' },
  { id: 'staff', name: 'Staff Management', description: 'Manage staff and schedules' },
  { id: 'attendance', name: 'Attendance Management', description: 'Mark and track employee attendance' },
  { id: 'delivery', name: 'Delivery Management', description: 'Manage deliveries and riders' },
  { id: 'tables', name: 'Table Management', description: 'Manage dining tables' },
  { id: 'menu', name: 'Menu Management', description: 'Manage menu items and categories' },
  { id: 'reports', name: 'Reports & Analytics', description: 'View financial and sales reports' },
  { id: 'financial', name: 'Financial Management', description: 'Manage expenses and budgets' },
  { id: 'settings', name: 'System Settings', description: 'Configure system settings' },
];

const ROLES = ['ADMIN', 'MANAGER', 'STAFF', 'RIDER', 'CASHIER'];

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-purple-100 text-purple-700 border-purple-200',
  MANAGER: 'bg-blue-100 text-blue-700 border-blue-200',
  STAFF: 'bg-green-100 text-green-700 border-green-200',
  RIDER: 'bg-orange-100 text-orange-700 border-orange-200',
  CASHIER: 'bg-pink-100 text-pink-700 border-pink-200',
};

export const FeatureAccessScreen: React.FC = () => {
  const { token } = useAuthStore();
  const [featureAccess, setFeatureAccess] = useState<Record<string, Record<string, boolean>>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Load feature access from API
  const loadFeatureAccess = async () => {
    if (!token) {
      console.warn('No authentication token - skipping feature access load');
      initializeFeatureAccess();
      return;
    }

    setIsLoading(true);
    try {
      const response = await featureAccessService.getFeatureAccess();
      const accessMap: Record<string, Record<string, boolean>> = {};
      
      response.data.access.forEach((access) => {
        if (!accessMap[access.feature]) {
          accessMap[access.feature] = {};
        }
        accessMap[access.feature][access.role] = access.enabled;
      });
      
      setFeatureAccess(accessMap);
    } catch (error: any) {
      // Handle 401 errors silently (user not authenticated)
      if (error?.response?.status === 401 || error?.status === 401) {
        console.warn('User not authenticated - using default feature access');
        initializeFeatureAccess();
      } else {
        console.error('Failed to load feature access:', error);
        toast.error('Failed to load feature access settings');
        initializeFeatureAccess();
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize feature access with defaults (fallback)
  const initializeFeatureAccess = () => {
    const initialAccess: Record<string, Record<string, boolean>> = {};
    AVAILABLE_FEATURES.forEach((feature) => {
      initialAccess[feature.id] = {};
      ROLES.forEach((role) => {
        // Default: ADMIN has all features, others have limited access
        initialAccess[feature.id][role] = role === 'ADMIN' ||
          (role === 'MANAGER' && feature.id !== 'settings') ||
          (role === 'STAFF' && ['orders', 'kitchen', 'tables', 'customers', 'attendance'].includes(feature.id)) ||
          (role === 'RIDER' && ['delivery', 'attendance'].includes(feature.id)) ||
          (role === 'CASHIER' && ['orders', 'menu', 'tables', 'kitchen', 'customers', 'delivery', 'attendance'].includes(feature.id));
      });
    });
    setFeatureAccess(initialAccess);
  };

  React.useEffect(() => {
    loadFeatureAccess();
  }, []);

  const handleToggle = (featureId: string, role: string) => {
    setFeatureAccess((prev) => {
      const currentFeature = prev[featureId] ?? {};
      return {
        ...prev,
        [featureId]: {
          ...currentFeature,
          [role]: !currentFeature[role],
        },
      };
    });
    setHasChanges(true);
  };

  const handleBulkToggle = (featureId: string, enabled: boolean) => {
    setFeatureAccess((prev) => ({
      ...prev,
      [featureId]: ROLES.reduce((acc, role) => ({ ...acc, [role]: enabled }), {}),
    }));
    setHasChanges(true);
    toast.success(`${enabled ? 'Enabled' : 'Disabled'} ${AVAILABLE_FEATURES.find(f => f.id === featureId)?.name} for all roles`);
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Save all changes to the API
      const updates: Promise<{ success: boolean; data: any }>[] = [];
      for (const featureId of Object.keys(featureAccess)) {
        const roleAccess = featureAccess[featureId];
        if (!roleAccess) continue;
        
        for (const role of Object.keys(roleAccess)) {
          const enabled = roleAccess[role];
          if (typeof enabled !== 'boolean') continue;
          
          updates.push(
            featureAccessService.updateFeatureAccess({
              feature: featureId,
              role,
              enabled,
            })
          );
        }
      }
      
      await Promise.all(updates);
      setHasChanges(false);
      toast.success('Feature access settings saved successfully');
    } catch (error) {
      console.error('Failed to save feature access:', error);
      toast.error('Failed to save feature access settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    setIsLoading(true);
    try {
      await featureAccessService.resetFeatureAccess();
      // Reload from API after reset
      await loadFeatureAccess();
      setHasChanges(false);
      toast.success('Feature access reset to defaults');
    } catch (error) {
      console.error('Failed to reset feature access:', error);
      toast.error('Failed to reset feature access');
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleInitials = (role: string) => {
    return role.substring(0, 2);
  };

  // Guard against undefined constants (can happen during HMR)
  if (!ROLE_COLORS || !ROLES || !AVAILABLE_FEATURES) {
    return (
      <div className="p-6 bg-gray-50 dark:bg-neutral-900 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading feature access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 dark:bg-neutral-900 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
              <Shield className="w-8 h-8 text-primary" />
              Feature Access Management
            </h1>
            <p className="text-gray-600 mt-2">
              Control which features are available to each role in the system
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-neutral-800 border-2 border-gray-200 dark:border-neutral-700 rounded-xl hover:border-primary hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Reset to Defaults
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading || !hasChanges}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              Save Changes
            </button>
          </div>
        </div>
      </div>

      {/* Role Legend */}
      <div className="mb-6 p-4 bg-white dark:bg-neutral-800 rounded-xl border border-gray-200 dark:border-neutral-700">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-700">Roles</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {ROLES.map((role) => (
            <div
              key={role}
              className={`px-3 py-1 rounded-full text-sm font-medium border ${ROLE_COLORS?.[role] ?? 'bg-gray-100 text-gray-700 border-gray-200'}`}
            >
              {role}
            </div>
          ))}
        </div>
      </div>

      {/* Feature Access Table */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-gray-200 dark:border-neutral-700 overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-6 gap-4 p-4 bg-gray-50 dark:bg-neutral-900 border-b border-gray-200 dark:border-neutral-700 font-semibold text-gray-700">
          <div className="col-span-2">Feature</div>
          {ROLES.map((role) => (
            <div key={role} className="text-center">
              <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${ROLE_COLORS?.[role] ?? 'bg-gray-100 text-gray-700'}`}>
                {getRoleInitials(role)}
              </div>
            </div>
          ))}
        </div>

        {/* Feature Rows */}
        <AnimatePresence>
          {AVAILABLE_FEATURES.map((feature, index) => (
            <motion.div
              key={feature.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="grid grid-cols-6 gap-4 p-4 border-b border-gray-100 dark:border-neutral-700 hover:bg-gray-50 transition-colors items-center"
            >
              {/* Feature Info */}
              <div className="col-span-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Settings className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800">{feature.name}</h4>
                    <p className="text-sm text-gray-500">{feature.description}</p>
                  </div>
                </div>
              </div>

              {/* Role Toggles */}
              {ROLES.map((role) => (
                <div key={role} className="text-center">
                  <button
                    onClick={() => handleToggle(feature.id, role)}
                    disabled={role === 'ADMIN'}
                    className={`relative inline-flex items-center justify-center w-12 h-6 rounded-full transition-colors ${
                      role === 'ADMIN' ? 'bg-purple-400 cursor-not-allowed' : 
                      featureAccess[feature.id]?.[role] ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-300 hover:bg-gray-400'
                    }`}
                  >
                    <span
                      className={`absolute w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                        featureAccess[feature.id]?.[role] ? 'translate-x-3' : 'translate-x-0.5'
                      }`}
                    />
                    {featureAccess[feature.id]?.[role] ? (
                      <Unlock className="w-3 h-3 text-white ml-1" />
                    ) : (
                      <Lock className="w-3 h-3 text-white ml-0.5" />
                    )}
                  </button>
                </div>
              ))}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Bulk Actions */}
      <div className="mt-6 p-4 bg-white dark:bg-neutral-800 rounded-xl border border-gray-200 dark:border-neutral-700">
        <h3 className="font-semibold text-gray-700 mb-3">Bulk Actions</h3>
        <div className="flex flex-wrap gap-3">
          {AVAILABLE_FEATURES.map((feature) => (
            <div key={feature.id} className="flex items-center gap-2">
              <button
                onClick={() => handleBulkToggle(feature.id, true)}
                className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium"
              >
                Enable {feature.name}
              </button>
              <button
                onClick={() => handleBulkToggle(feature.id, false)}
                className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
              >
                Disable {feature.name}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Unsaved Changes Warning */}
      <AnimatePresence>
        {hasChanges && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 bg-amber-50 border-2 border-amber-300 rounded-xl p-4 shadow-lg max-w-sm"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                <Shield className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-amber-800">Unsaved Changes</p>
                <p className="text-sm text-amber-700">You have unsaved feature access changes</p>
              </div>
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="px-3 py-1.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors text-sm font-medium disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
