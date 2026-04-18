import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AppSettings {
  // General
  currency: string;
  taxRate: number;
  serviceCharge: number;
  restaurantName: string;
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
}

const DEFAULT_SETTINGS: AppSettings = {
  currency: 'USD',
  taxRate: 8.5,
  serviceCharge: 0,
  restaurantName: 'POSLytic Restaurant',
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

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      
      updateSettings: (updates) => {
        set((state) => ({
          settings: { ...state.settings, ...updates },
        }));
      },
      
      resetSettings: () => {
        set({ settings: DEFAULT_SETTINGS });
      },
    }),
    {
      name: 'app-settings-storage',
    }
  )
);
