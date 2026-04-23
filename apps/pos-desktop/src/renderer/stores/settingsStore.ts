import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { settingsService } from '../services/settingsService';

export const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD - US Dollar ($)' },
  { value: 'EUR', label: 'EUR - Euro (€)' },
  { value: 'GBP', label: 'GBP - British Pound (£)' },
  { value: 'AED', label: 'AED - UAE Dirham (د.إ)' },
  { value: 'PKR', label: 'PKR - Pakistani Rupee (₨)' },
  { value: 'INR', label: 'INR - Indian Rupee (₹)' },
  { value: 'BDT', label: 'BDT - Bangladeshi Taka (৳)' },
  { value: 'SAR', label: 'SAR - Saudi Riyal (﷼)' },
];

export interface AppSettings {
  // General
  currency: string;
  taxRate: number;
  serviceCharge: number;
  restaurantName: string;
  address: string;
  phone: string;
  tagline: string;
  timezone: string;
  language: string;
  fiscalYearStart: string;
  animationsEnabled: boolean;

  // Payment
  acceptCash: boolean;
  acceptCard: boolean;
  acceptMobileWallet: boolean;
  acceptGiftCards: boolean;
  splitPaymentEnabled: boolean;
  tipSuggestions: number[];

  // Kitchen
  autoPrintKOT: boolean;
  autoPrintReceipt: boolean;

  // Hardware
  cashDrawerEnabled: boolean;
  customerDisplayEnabled: boolean;
  barcodeScannerEnabled: boolean;

  // Notifications
  emailNotifications: boolean;
  smsNotifications: boolean;
  lowStockAlerts: boolean;
  orderAlerts: boolean;
  staffAlerts: boolean;

  // Security
  requirePinForVoid: boolean;
  requirePinForRefund: boolean;
  sessionTimeout: number;
  twoFactorAuth: boolean;

  // Appearance
  theme: 'light' | 'dark' | 'auto';
  compactMode: boolean;
  showImages: boolean;
}

interface SettingsState {
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;
  resetSettings: () => void;
  loadFromDatabase: () => Promise<void>;
  saveToDatabase: () => Promise<void>;
}

const DEFAULT_SETTINGS: AppSettings = {
  currency: 'USD',
  taxRate: 8.5,
  serviceCharge: 0,
  restaurantName: 'POSLytic Restaurant',
  address: '123 Main Street',
  phone: '+1 234 567 8900',
  tagline: 'Smart restaurant operations made simple',
  timezone: 'Asia/Karachi',
  language: 'en',
  fiscalYearStart: 'January',
  animationsEnabled: true,

  acceptCash: true,
  acceptCard: true,
  acceptMobileWallet: true,
  acceptGiftCards: true,
  splitPaymentEnabled: true,
  tipSuggestions: [10, 12, 15, 18],

  autoPrintKOT: true,
  autoPrintReceipt: true,

  cashDrawerEnabled: true,
  customerDisplayEnabled: false,
  barcodeScannerEnabled: true,

  emailNotifications: true,
  smsNotifications: false,
  lowStockAlerts: true,
  orderAlerts: true,
  staffAlerts: true,

  requirePinForVoid: true,
  requirePinForRefund: true,
  sessionTimeout: 30,
  twoFactorAuth: false,

  theme: 'light',
  compactMode: false,
  showImages: true,
};

const settingsToDbFormat = (settings: AppSettings): Array<{ key: string; value: string; category: string }> => [
  { key: 'currency', value: settings.currency, category: 'general' },
  { key: 'tax_rate', value: settings.taxRate.toString(), category: 'general' },
  { key: 'service_charge', value: settings.serviceCharge.toString(), category: 'general' },
  { key: 'restaurant_name', value: settings.restaurantName, category: 'general' },
  { key: 'address', value: settings.address, category: 'general' },
  { key: 'phone', value: settings.phone, category: 'general' },
  { key: 'tagline', value: settings.tagline, category: 'general' },
  { key: 'timezone', value: settings.timezone, category: 'general' },
  { key: 'language', value: settings.language, category: 'general' },
  { key: 'fiscal_year_start', value: settings.fiscalYearStart, category: 'general' },
  { key: 'animations_enabled', value: settings.animationsEnabled.toString(), category: 'general' },
  { key: 'accept_cash', value: settings.acceptCash.toString(), category: 'payment' },
  { key: 'accept_card', value: settings.acceptCard.toString(), category: 'payment' },
  { key: 'accept_mobile_wallet', value: settings.acceptMobileWallet.toString(), category: 'payment' },
  { key: 'accept_gift_cards', value: settings.acceptGiftCards.toString(), category: 'payment' },
  { key: 'split_payment_enabled', value: settings.splitPaymentEnabled.toString(), category: 'payment' },
  { key: 'tip_suggestions', value: JSON.stringify(settings.tipSuggestions), category: 'payment' },
  { key: 'auto_print_kot', value: settings.autoPrintKOT.toString(), category: 'kitchen' },
  { key: 'auto_print_receipt', value: settings.autoPrintReceipt.toString(), category: 'kitchen' },
  { key: 'cash_drawer_enabled', value: settings.cashDrawerEnabled.toString(), category: 'hardware' },
  { key: 'customer_display_enabled', value: settings.customerDisplayEnabled.toString(), category: 'hardware' },
  { key: 'barcode_scanner_enabled', value: settings.barcodeScannerEnabled.toString(), category: 'hardware' },
  { key: 'email_notifications', value: settings.emailNotifications.toString(), category: 'notifications' },
  { key: 'sms_notifications', value: settings.smsNotifications.toString(), category: 'notifications' },
  { key: 'low_stock_alerts', value: settings.lowStockAlerts.toString(), category: 'notifications' },
  { key: 'order_alerts', value: settings.orderAlerts.toString(), category: 'notifications' },
  { key: 'staff_alerts', value: settings.staffAlerts.toString(), category: 'notifications' },
  { key: 'require_pin_for_void', value: settings.requirePinForVoid.toString(), category: 'security' },
  { key: 'require_pin_for_refund', value: settings.requirePinForRefund.toString(), category: 'security' },
  { key: 'session_timeout', value: settings.sessionTimeout.toString(), category: 'security' },
  { key: 'two_factor_auth', value: settings.twoFactorAuth.toString(), category: 'security' },
  { key: 'theme', value: settings.theme, category: 'appearance' },
  { key: 'compact_mode', value: settings.compactMode.toString(), category: 'appearance' },
  { key: 'show_images', value: settings.showImages.toString(), category: 'appearance' },
];

const dbFormatToSettings = (dbSettings: Array<{ key: string; value: string; category: string }>): AppSettings => {
  const getSetting = (key: string, defaultValue: any) => {
    const setting = dbSettings.find(s => s.key === key);
    if (!setting) return defaultValue;
    
    // Handle different types
    if (typeof defaultValue === 'boolean') {
      return setting.value === 'true';
    }
    if (typeof defaultValue === 'number') {
      return parseFloat(setting.value);
    }
    if (Array.isArray(defaultValue)) {
      try {
        return JSON.parse(setting.value);
      } catch {
        return defaultValue;
      }
    }
    return setting.value;
  };

  return {
    currency: getSetting('currency', DEFAULT_SETTINGS.currency),
    taxRate: getSetting('tax_rate', DEFAULT_SETTINGS.taxRate),
    serviceCharge: getSetting('service_charge', DEFAULT_SETTINGS.serviceCharge),
    restaurantName: getSetting('restaurant_name', DEFAULT_SETTINGS.restaurantName),
    address: getSetting('address', DEFAULT_SETTINGS.address),
    phone: getSetting('phone', DEFAULT_SETTINGS.phone),
    tagline: getSetting('tagline', DEFAULT_SETTINGS.tagline),
    timezone: getSetting('timezone', DEFAULT_SETTINGS.timezone),
    language: getSetting('language', DEFAULT_SETTINGS.language),
    fiscalYearStart: getSetting('fiscal_year_start', DEFAULT_SETTINGS.fiscalYearStart),
    animationsEnabled: getSetting('animations_enabled', DEFAULT_SETTINGS.animationsEnabled),
    acceptCash: getSetting('accept_cash', DEFAULT_SETTINGS.acceptCash),
    acceptCard: getSetting('accept_card', DEFAULT_SETTINGS.acceptCard),
    acceptMobileWallet: getSetting('accept_mobile_wallet', DEFAULT_SETTINGS.acceptMobileWallet),
    acceptGiftCards: getSetting('accept_gift_cards', DEFAULT_SETTINGS.acceptGiftCards),
    splitPaymentEnabled: getSetting('split_payment_enabled', DEFAULT_SETTINGS.splitPaymentEnabled),
    tipSuggestions: getSetting('tip_suggestions', DEFAULT_SETTINGS.tipSuggestions),
    autoPrintKOT: getSetting('auto_print_kot', DEFAULT_SETTINGS.autoPrintKOT),
    autoPrintReceipt: getSetting('auto_print_receipt', DEFAULT_SETTINGS.autoPrintReceipt),
    cashDrawerEnabled: getSetting('cash_drawer_enabled', DEFAULT_SETTINGS.cashDrawerEnabled),
    customerDisplayEnabled: getSetting('customer_display_enabled', DEFAULT_SETTINGS.customerDisplayEnabled),
    barcodeScannerEnabled: getSetting('barcode_scanner_enabled', DEFAULT_SETTINGS.barcodeScannerEnabled),
    emailNotifications: getSetting('email_notifications', DEFAULT_SETTINGS.emailNotifications),
    smsNotifications: getSetting('sms_notifications', DEFAULT_SETTINGS.smsNotifications),
    lowStockAlerts: getSetting('low_stock_alerts', DEFAULT_SETTINGS.lowStockAlerts),
    orderAlerts: getSetting('order_alerts', DEFAULT_SETTINGS.orderAlerts),
    staffAlerts: getSetting('staff_alerts', DEFAULT_SETTINGS.staffAlerts),
    requirePinForVoid: getSetting('require_pin_for_void', DEFAULT_SETTINGS.requirePinForVoid),
    requirePinForRefund: getSetting('require_pin_for_refund', DEFAULT_SETTINGS.requirePinForRefund),
    sessionTimeout: getSetting('session_timeout', DEFAULT_SETTINGS.sessionTimeout),
    twoFactorAuth: getSetting('two_factor_auth', DEFAULT_SETTINGS.twoFactorAuth),
    theme: getSetting('theme', DEFAULT_SETTINGS.theme),
    compactMode: getSetting('compact_mode', DEFAULT_SETTINGS.compactMode),
    showImages: getSetting('show_images', DEFAULT_SETTINGS.showImages),
  };
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,
      
      updateSettings: (updates) => {
        set((state) => ({
          settings: { ...state.settings, ...updates },
        }));
      },
      
      resetSettings: () => {
        set({ settings: DEFAULT_SETTINGS });
      },

      loadFromDatabase: async () => {
        try {
          const { settings: dbSettings } = await settingsService.getSettings();
          if (dbSettings && dbSettings.length > 0) {
            const settings = dbFormatToSettings(dbSettings);
            set({ settings });
          }
        } catch (error) {
          console.error('Failed to load settings from database:', error);
        }
      },

      saveToDatabase: async () => {
        try {
          const { settings } = get();
          const dbSettings = settingsToDbFormat(settings);
          await settingsService.bulkSyncSettings(dbSettings);
        } catch (error) {
          console.error('Failed to save settings to database:', error);
          throw error;
        }
      },
    }),
    {
      name: 'app-settings-storage',
    }
  )
);
