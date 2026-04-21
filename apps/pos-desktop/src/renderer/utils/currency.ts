// Re-export shared currency utilities
// This file exists for backward compatibility - new code should import from @restaurant-pos/shared-types

export const DEFAULT_CURRENCY = 'PKR';

export interface CurrencyConfig {
  code: string;
  symbol: string;
  locale: string;
  decimalPlaces: number;
}

export const SUPPORTED_CURRENCIES: Record<string, CurrencyConfig> = {
  USD: { code: 'USD', symbol: '$', locale: 'en-US', decimalPlaces: 2 },
  EUR: { code: 'EUR', symbol: '€', locale: 'de-DE', decimalPlaces: 2 },
  GBP: { code: 'GBP', symbol: '£', locale: 'en-GB', decimalPlaces: 2 },
  PKR: { code: 'PKR', symbol: '₨', locale: 'en-PK', decimalPlaces: 2 },
  INR: { code: 'INR', symbol: '₹', locale: 'en-IN', decimalPlaces: 2 },
  AED: { code: 'AED', symbol: 'د.إ', locale: 'ar-AE', decimalPlaces: 2 },
  SAR: { code: 'SAR', symbol: '﷼', locale: 'ar-SA', decimalPlaces: 2 },
};

export function getCurrency(code: string = DEFAULT_CURRENCY): CurrencyConfig {
  return SUPPORTED_CURRENCIES[code] || SUPPORTED_CURRENCIES[DEFAULT_CURRENCY];
}

export function formatCurrency(amount: number, currencyCode: string = DEFAULT_CURRENCY): string {
  const config = getCurrency(currencyCode);
  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.code,
    minimumFractionDigits: config.decimalPlaces,
    maximumFractionDigits: config.decimalPlaces,
  }).format(amount);
}

export function formatCurrencyLocale(amount: number, locale: string = 'en-US', currencyCode: string = DEFAULT_CURRENCY): string {
  const config = getCurrency(currencyCode);
  return new Intl.NumberFormat(locale || config.locale, {
    style: 'currency',
    currency: config.code,
    minimumFractionDigits: config.decimalPlaces,
    maximumFractionDigits: config.decimalPlaces,
  }).format(amount);
}
