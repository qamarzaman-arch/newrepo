import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings, Store, Shield, Printer, Bell,
  CreditCard, Palette, Save, RotateCcw,
  AlertCircle, Smartphone, Monitor, Gavel
} from 'lucide-react';
import { useSettingsStore } from '../stores/settingsStore';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';

const AdvancedSettingsScreen: React.FC = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  const [activeTab, setActiveTab] = useState<'general' | 'business' | 'payment' | 'hardware' | 'notifications' | 'security' | 'appearance'>('general');
  const [saving, setSaving] = useState(false);
  const { settings, updateSettings, resetSettings, saveToDatabase, loadFromDatabase } = useSettingsStore();

  const setSetting = <K extends keyof typeof settings>(key: K, value: (typeof settings)[K]) => {
    updateSettings({ [key]: value } as Pick<typeof settings, K>);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveToDatabase();
      toast.success('Settings saved successfully!');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // Load settings from database on mount
  useEffect(() => {
    loadFromDatabase();
  }, [loadFromDatabase]);

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all settings to defaults?')) {
      resetSettings();
      toast.success('Settings reset to defaults');
    }
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Store },
    { id: 'business', label: 'Business Rules', icon: Gavel },
    { id: 'payment', label: 'Payment Methods', icon: CreditCard },
    { id: 'hardware', label: 'Hardware & Devices', icon: Printer },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'appearance', label: 'Appearance', icon: Palette },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 font-manrope flex items-center gap-3">
            <Settings className="w-8 h-8 text-primary" />
            System Settings
          </h1>
          <p className="text-gray-600 mt-1">Configure your POS system preferences and behavior</p>
        </div>
        <div className="flex gap-3">
          {isAdmin && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleReset}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Reset Defaults
            </motion.button>
          )}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-gradient-to-r from-primary to-primary-container text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </motion.button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="border-b border-gray-200">
          <div className="flex overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-6 py-4 flex items-center gap-2 whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary text-primary font-semibold'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'general' && (
                <div className="space-y-6 max-w-3xl">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Restaurant Information</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Restaurant Name</label>
                        <input
                          type="text"
                          value={settings.restaurantName}
                          onChange={(e) => setSetting('restaurantName', e.target.value)}
                          className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Tagline</label>
                        <input
                          type="text"
                          value={settings.tagline}
                          onChange={(e) => setSetting('tagline', e.target.value)}
                          className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Regional Settings</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
                        <select
                          value={settings.timezone}
                          onChange={(e) => setSetting('timezone', e.target.value)}
                          className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none transition-colors"
                        >
                          <option value="America/New_York">Eastern Time (ET)</option>
                          <option value="America/Chicago">Central Time (CT)</option>
                          <option value="America/Denver">Mountain Time (MT)</option>
                          <option value="America/Los_Angeles">Pacific Time (PT)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
                        <select
                          value={settings.language}
                          onChange={(e) => setSetting('language', e.target.value)}
                          className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none transition-colors"
                        >
                          <option value="en">English</option>
                          <option value="es">Spanish</option>
                          <option value="fr">French</option>
                          <option value="de">German</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'business' && (
                <div className="space-y-6 max-w-3xl">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Tax Configuration</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Tax Rate (%)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={settings.taxRate}
                          onChange={(e) => setSetting('taxRate', parseFloat(e.target.value) || 0)}
                          className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Service Charge (%)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={settings.serviceCharge}
                          onChange={(e) => setSetting('serviceCharge', parseFloat(e.target.value) || 0)}
                          className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Currency & Fiscal Year</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                        <select
                          value={settings.currency}
                          onChange={(e) => setSetting('currency', e.target.value)}
                          className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none transition-colors"
                        >
                          <option value="USD">USD ($)</option>
                          <option value="EUR">EUR (€)</option>
                          <option value="GBP">GBP (£)</option>
                          <option value="AED">AED (د.إ)</option>
                          <option value="PKR">PKR (₨)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Fiscal Year Start</label>
                        <select
                          value={settings.fiscalYearStart}
                          onChange={(e) => setSetting('fiscalYearStart', e.target.value)}
                          className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none transition-colors"
                        >
                          <option value="January">January</option>
                          <option value="April">April</option>
                          <option value="July">July</option>
                          <option value="October">October</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'payment' && (
                <div className="space-y-6 max-w-3xl">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Accepted Payment Methods</h3>
                    <div className="space-y-3">
                      {[
                        { key: 'acceptCash', label: 'Cash', icon: '💵' },
                        { key: 'acceptCard', label: 'Credit/Debit Cards', icon: '💳' },
                        { key: 'acceptMobileWallet', label: 'Mobile Wallets (Apple Pay, Google Pay)', icon: '📱' },
                        { key: 'acceptGiftCards', label: 'Gift Cards', icon: '🎁' },
                      ].map((method) => (
                        <div key={method.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{method.icon}</span>
                            <span className="font-medium text-gray-900">{method.label}</span>
                          </div>
                          <ToggleSwitch
                            value={settings[method.key as keyof typeof settings] as boolean}
                            onChange={(value) => updateSettings({ [method.key]: value } as Partial<typeof settings>)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Payment Options</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                        <div>
                          <p className="font-medium text-gray-900">Split Payment</p>
                          <p className="text-sm text-gray-600">Allow customers to split bills across multiple payment methods</p>
                        </div>
                        <ToggleSwitch
                          value={settings.splitPaymentEnabled}
                          onChange={(value) => setSetting('splitPaymentEnabled', value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Tip Suggestions (%)</h3>
                    <div className="grid grid-cols-4 gap-3">
                      {[0, 1, 2, 3].map((index) => (
                        <input
                          key={index}
                          type="number"
                          value={settings.tipSuggestions[index]}
                          onChange={(e) => {
                            const newTips = [...settings.tipSuggestions];
                            newTips[index] = parseInt(e.target.value) || 0;
                            setSetting('tipSuggestions', newTips);
                          }}
                          className="px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none text-center"
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'hardware' && (
                <div className="space-y-6 max-w-3xl">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Printer Configuration</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                        <div>
                          <p className="font-medium text-gray-900">Auto-print Kitchen Order Tickets</p>
                          <p className="text-sm text-gray-600">Automatically send orders to kitchen printer</p>
                        </div>
                        <ToggleSwitch
                          value={settings.autoPrintKOT}
                          onChange={(value) => setSetting('autoPrintKOT', value)}
                        />
                      </div>
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                        <div>
                          <p className="font-medium text-gray-900">Auto-print Customer Receipts</p>
                          <p className="text-sm text-gray-600">Automatically print receipts after payment</p>
                        </div>
                        <ToggleSwitch
                          value={settings.autoPrintReceipt}
                          onChange={(value) => setSetting('autoPrintReceipt', value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Peripheral Devices</h3>
                    <div className="space-y-3">
                      {[
                        { key: 'cashDrawerEnabled', label: 'Cash Drawer', icon: Monitor },
                        { key: 'customerDisplayEnabled', label: 'Customer Display', icon: Monitor },
                        { key: 'barcodeScannerEnabled', label: 'Barcode Scanner', icon: Smartphone },
                      ].map((device) => {
                        const Icon = device.icon;
                        return (
                          <div key={device.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Icon className="w-5 h-5 text-primary" />
                              </div>
                              <span className="font-medium text-gray-900">{device.label}</span>
                            </div>
                            <ToggleSwitch
                              value={settings[device.key as keyof typeof settings] as boolean}
                              onChange={(value) => updateSettings({ [device.key]: value } as Partial<typeof settings>)}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="space-y-6 max-w-3xl">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Notification Channels</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                        <div>
                          <p className="font-medium text-gray-900">Email Notifications</p>
                          <p className="text-sm text-gray-600">Receive notifications via email</p>
                        </div>
                        <ToggleSwitch
                          value={settings.emailNotifications}
                          onChange={(value) => setSetting('emailNotifications', value)}
                        />
                      </div>
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                        <div>
                          <p className="font-medium text-gray-900">SMS Notifications</p>
                          <p className="text-sm text-gray-600">Receive notifications via SMS</p>
                        </div>
                        <ToggleSwitch
                          value={settings.smsNotifications}
                          onChange={(value) => setSetting('smsNotifications', value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Alert Types</h3>
                    <div className="space-y-3">
                      {[
                        { key: 'lowStockAlerts', label: 'Low Stock Alerts', description: 'Notify when inventory is running low' },
                        { key: 'orderAlerts', label: 'Order Alerts', description: 'Notify on new orders and status changes' },
                        { key: 'staffAlerts', label: 'Staff Alerts', description: 'Notify on staff check-ins and issues' },
                      ].map((alert) => (
                        <div key={alert.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                          <div>
                            <p className="font-medium text-gray-900">{alert.label}</p>
                            <p className="text-sm text-gray-600">{alert.description}</p>
                          </div>
                          <ToggleSwitch
                            value={settings[alert.key as keyof typeof settings] as boolean}
                            onChange={(value) => updateSettings({ [alert.key]: value } as Partial<typeof settings>)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="space-y-6 max-w-3xl">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Access Control</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                        <div>
                          <p className="font-medium text-gray-900">Require PIN for Void Transactions</p>
                          <p className="text-sm text-gray-600">Manager authorization needed to void items</p>
                        </div>
                        <ToggleSwitch
                          value={settings.requirePinForVoid}
                          onChange={(value) => setSetting('requirePinForVoid', value)}
                        />
                      </div>
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                        <div>
                          <p className="font-medium text-gray-900">Require PIN for Refunds</p>
                          <p className="text-sm text-gray-600">Manager authorization needed for refunds</p>
                        </div>
                        <ToggleSwitch
                          value={settings.requirePinForRefund}
                          onChange={(value) => setSetting('requirePinForRefund', value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Session Management</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Session Timeout (minutes)</label>
                        <input
                          type="number"
                          value={settings.sessionTimeout}
                          onChange={(e) => setSetting('sessionTimeout', parseInt(e.target.value) || 0)}
                          className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Two-Factor Authentication</h3>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div>
                        <p className="font-medium text-gray-900">Enable 2FA for Admin Accounts</p>
                        <p className="text-sm text-gray-600">Add extra security layer for admin users</p>
                      </div>
                      <ToggleSwitch
                        value={settings.twoFactorAuth}
                        onChange={(value) => setSetting('twoFactorAuth', value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'appearance' && (
                <div className="space-y-6 max-w-3xl">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Theme Settings</h3>
                    <div className="grid grid-cols-3 gap-4">
                      {['light', 'dark', 'auto'].map((theme) => (
                        <button
                          key={theme}
                          onClick={() => setSetting('theme', theme as typeof settings.theme)}
                          className={`p-4 rounded-xl border-2 transition-all ${
                            settings.theme === theme
                              ? 'border-primary bg-primary/5'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="text-center">
                            <div className={`w-12 h-12 mx-auto mb-2 rounded-lg ${
                              theme === 'light' ? 'bg-white border-2 border-gray-200' :
                              theme === 'dark' ? 'bg-gray-900' :
                              'bg-gradient-to-br from-white to-gray-900'
                            }`} />
                            <p className="font-medium capitalize">{theme}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Display Options</h3>
                    <div className="space-y-3">
                      {[
                        { key: 'compactMode', label: 'Compact Mode', description: 'Reduce spacing for more content on screen' },
                        { key: 'showImages', label: 'Show Product Images', description: 'Display images in menu and orders' },
                        { key: 'animationsEnabled', label: 'Enable Animations', description: 'Smooth transitions and effects' },
                      ].map((option) => (
                        <div key={option.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                          <div>
                            <p className="font-medium text-gray-900">{option.label}</p>
                            <p className="text-sm text-gray-600">{option.description}</p>
                          </div>
                          <ToggleSwitch
                            value={settings[option.key as keyof typeof settings] as boolean}
                            onChange={(value) => updateSettings({ [option.key]: value } as Partial<typeof settings>)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Info Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200"
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 mb-1">Settings Management Tip</h3>
            <p className="text-sm text-gray-700">
              Changes to critical settings like tax rates and payment methods may require a system restart. 
              Always test configuration changes in a safe environment before applying to production.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// Toggle Switch Component
interface ToggleSwitchProps {
  value: boolean;
  onChange: (value: boolean) => void;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ value, onChange }) => {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-14 h-7 rounded-full transition-colors ${
        value ? 'bg-primary' : 'bg-gray-300'
      }`}
    >
      <motion.div
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-md ${
          value ? 'translate-x-7' : 'translate-x-0'
        }`}
      />
    </button>
  );
};

export default AdvancedSettingsScreen;
