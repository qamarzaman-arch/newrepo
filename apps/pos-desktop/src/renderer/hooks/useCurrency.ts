import { formatCurrency as baseFormatCurrency } from '../utils/currency';
import { useSettingsStore } from '../stores/settingsStore';

/**
 * Hook-based currency formatter that automatically uses current settings
 */
export const useCurrencyFormatter = () => {
  const { settings } = useSettingsStore();
  
  const formatCurrency = (amount: number): string => {
    return baseFormatCurrency(amount, settings.currency);
  };
  
  return {
    formatCurrency,
    currencyCode: settings.currency,
    taxRate: settings.taxRate,
  };
};
