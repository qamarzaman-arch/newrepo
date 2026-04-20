import React, { useState } from 'react';
import { Store, CreditCard, Printer, Shield, Bell, Monitor, Palette } from 'lucide-react';
import { useSettingsStore, AppSettings } from '../stores/settingsStore';
import api from '../services/api';
import toast from 'react-hot-toast';

const SettingsScreen: React.FC = () => {
  const { settings, updateSettings, resetSettings } = useSettingsStore();
  const [localSettings, setLocalSettings] = useState<AppSettings>({ ...settings });
  const [isChangingPin, setIsChangingPin] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinLoading, setPinLoading] = useState(false);

  const handleToggle = (key: string) => {
    setLocalSettings({
      ...localSettings,
      [key]: !localSettings[key as keyof typeof localSettings],
    } as AppSettings);
  };

  const handleSave = () => {
    updateSettings(localSettings);
    toast.success('Settings saved successfully');
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      resetSettings();
      setLocalSettings(useSettingsStore.getState().settings);
      toast.success('Settings reset to defaults');
    }
  };

  const handleChangePin = () => {
    setIsChangingPin(true);
  };

  const handleConfirmPinChange = async () => {
    if (newPin.length < 4) {
      toast.error('PIN must be at least 4 characters');
      return;
    }
    if (newPin !== confirmPin) {
      toast.error('PINs do not match');
      return;
    }
    setPinLoading(true);
    try {
      // Validate current PIN first
      const validRes = await api.post('/auth/validate-pin', { pin: currentPin, operation: 'change_pin' });
      if (!validRes.data.data.valid) {
        toast.error('Current PIN is incorrect');
        setPinLoading(false);
        return;
      }
      // Update PIN on backend
      await api.put('/settings/manager-pin', { newPin });
      toast.success('Manager PIN updated successfully');
      setIsChangingPin(false);
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to update PIN');
    } finally {
      setPinLoading(false);
    }
  };

  const settingsSections = [
    {
      title: 'General Settings',
      icon: Store,
      items: [
        { label: 'Restaurant Name', key: 'restaurantName', value: localSettings.restaurantName, type: 'text' },
        { label: 'Address', key: 'address', value: localSettings.address, type: 'text' },
        { label: 'Phone', key: 'phone', value: localSettings.phone, type: 'text' },
        { label: 'Tagline', key: 'tagline', value: localSettings.tagline, type: 'text' },
        { label: 'Currency', key: 'currency', value: localSettings.currency, type: 'text' },
        { label: 'Timezone', key: 'timezone', value: localSettings.timezone, type: 'text' },
        { label: 'Language', key: 'language', value: localSettings.language, type: 'text' },
      ],
    },
    {
      title: 'Payment Settings',
      icon: CreditCard,
      items: [
        { label: 'Accept Cash', key: 'acceptCash', value: localSettings.acceptCash, type: 'toggle' },
        { label: 'Accept Card', key: 'acceptCard', value: localSettings.acceptCard, type: 'toggle' },
        { label: 'Accept Mobile Wallet', key: 'acceptMobileWallet', value: localSettings.acceptMobileWallet, type: 'toggle' },
        { label: 'Accept Gift Cards', key: 'acceptGiftCards', value: localSettings.acceptGiftCards, type: 'toggle' },
        { label: 'Split Payment Enabled', key: 'splitPaymentEnabled', value: localSettings.splitPaymentEnabled, type: 'toggle' },
        { label: 'Service Charge (%)', key: 'serviceCharge', value: localSettings.serviceCharge, type: 'number' },
        { label: 'Tax Rate (%)', key: 'taxRate', value: localSettings.taxRate, type: 'number' },
      ],
    },
    {
      title: 'Kitchen Settings',
      icon: Printer,
      items: [
        { label: 'Auto-print KOT', key: 'autoPrintKOT', value: localSettings.autoPrintKOT, type: 'toggle' },
        { label: 'Auto-print Receipt', key: 'autoPrintReceipt', value: localSettings.autoPrintReceipt, type: 'toggle' },
      ],
    },
    {
      title: 'Hardware Settings',
      icon: Monitor,
      items: [
        { label: 'Cash Drawer Enabled', key: 'cashDrawerEnabled', value: localSettings.cashDrawerEnabled, type: 'toggle' },
        { label: 'Customer Display Enabled', key: 'customerDisplayEnabled', value: localSettings.customerDisplayEnabled, type: 'toggle' },
        { label: 'Barcode Scanner Enabled', key: 'barcodeScannerEnabled', value: localSettings.barcodeScannerEnabled, type: 'toggle' },
      ],
    },
    {
      title: 'Notification Settings',
      icon: Bell,
      items: [
        { label: 'Email Notifications', key: 'emailNotifications', value: localSettings.emailNotifications, type: 'toggle' },
        { label: 'SMS Notifications', key: 'smsNotifications', value: localSettings.smsNotifications, type: 'toggle' },
        { label: 'Low Stock Alerts', key: 'lowStockAlerts', value: localSettings.lowStockAlerts, type: 'toggle' },
        { label: 'Order Alerts', key: 'orderAlerts', value: localSettings.orderAlerts, type: 'toggle' },
        { label: 'Staff Alerts', key: 'staffAlerts', value: localSettings.staffAlerts, type: 'toggle' },
      ],
    },
    {
      title: 'Security Settings',
      icon: Shield,
      items: [
        { label: 'Require PIN for Void', key: 'requirePinForVoid', value: localSettings.requirePinForVoid, type: 'toggle' },
        { label: 'Require PIN for Refund', key: 'requirePinForRefund', value: localSettings.requirePinForRefund, type: 'toggle' },
        { label: 'Change Manager PIN', key: 'changePin', value: '••••••', type: 'action', action: handleChangePin },
        { label: 'Session Timeout (min)', key: 'sessionTimeout', value: localSettings.sessionTimeout, type: 'number' },
        { label: 'Two Factor Auth', key: 'twoFactorAuth', value: localSettings.twoFactorAuth, type: 'toggle' },
      ],
    },
    {
      title: 'Appearance Settings',
      icon: Palette,
      items: [
        { label: 'Theme (light/dark/auto)', key: 'theme', value: localSettings.theme, type: 'text' },
        { label: 'Compact Mode', key: 'compactMode', value: localSettings.compactMode, type: 'toggle' },
        { label: 'Show Images', key: 'showImages', value: localSettings.showImages, type: 'toggle' },
        { label: 'Animations Enabled', key: 'animationsEnabled', value: localSettings.animationsEnabled, type: 'toggle' },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Settings</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {settingsSections.map((section, index) => {
          const Icon = section.icon;
          return (
            <div key={index} className="bg-surface-lowest rounded-2xl p-6 shadow-soft">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">{section.title}</h2>
              </div>

              <div className="space-y-4">
                {section.items.map((item, itemIndex) => (
                  <div key={itemIndex} className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">{item.label}</label>
                    {item.type === 'toggle' ? (
                      <div
                        onClick={() => item.key && handleToggle(item.key)}
                        className={`w-12 h-6 rounded-full cursor-pointer transition-colors ${
                          item.value ? 'bg-primary' : 'bg-gray-300'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${
                            item.value ? 'translate-x-6' : 'translate-x-1'
                          } mt-0.5`}
                        ></div>
                      </div>
                    ) : item.type === 'action' ? (
                      <button
                        onClick={'action' in item ? item.action : undefined}
                        className="px-4 py-2 bg-primary/10 text-primary rounded-lg text-sm font-semibold hover:bg-primary/20 transition-colors"
                      >
                        Change PIN
                      </button>
                    ) : item.type === 'info' ? (
                      <span className="text-sm font-semibold text-gray-900">{item.value}</span>
                    ) : (
                      <input
                        type={item.type}
                        value={String(item.value)}
                        onChange={(e) => setLocalSettings({ ...localSettings, [item.key!]: e.target.value } as AppSettings)}
                        className="px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-primary focus:outline-none w-48"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {isChangingPin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-surface-lowest rounded-2xl p-6 shadow-soft w-96">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Change Manager PIN</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Current PIN</label>
                <input
                  type="password"
                  value={currentPin}
                  onChange={(e) => setCurrentPin(e.target.value)}
                  className="px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-primary focus:outline-none w-48"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">New PIN</label>
                <input
                  type="password"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  className="px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-primary focus:outline-none w-48"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Confirm PIN</label>
                <input
                  type="password"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  className="px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-primary focus:outline-none w-48"
                />
              </div>
            </div>
            <div className="flex justify-end gap-4 mt-6">
              <button
                onClick={() => setIsChangingPin(false)}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPinChange}
                className="px-6 py-3 gradient-btn rounded-xl font-semibold"
                disabled={pinLoading}
              >
                {pinLoading ? 'Loading...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-4">
        <button onClick={handleReset} className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200">
          Reset to Defaults
        </button>
        <button onClick={handleSave} className="px-6 py-3 gradient-btn rounded-xl font-semibold">
          Save Changes
        </button>
      </div>
    </div>
  );
};

export default SettingsScreen;