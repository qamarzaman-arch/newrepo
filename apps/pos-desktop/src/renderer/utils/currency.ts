// Currency configuration and formatting utilities

export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
  locale: string;
}

export const CURRENCIES: Record<string, CurrencyConfig> = {
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    locale: 'en-US',
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    locale: 'de-DE',
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    locale: 'en-GB',
  },
  AED: {
    code: 'AED',
    symbol: 'د.إ',
    name: 'UAE Dirham',
    locale: 'ar-AE',
  },
  PKR: {
    code: 'PKR',
    symbol: '₨',
    name: 'Pakistani Rupee',
    locale: 'ur-PK',
  },
  INR: {
    code: 'INR',
    symbol: '₹',
    name: 'Indian Rupee',
    locale: 'en-IN',
  },
  BDT: {
    code: 'BDT',
    symbol: '৳',
    name: 'Bangladeshi Taka',
    locale: 'bn-BD',
  },
  SAR: {
    code: 'SAR',
    symbol: '﷼',
    name: 'Saudi Riyal',
    locale: 'ar-SA',
  },
};

export const DEFAULT_CURRENCY = 'USD';

/**
 * Get currency configuration by code
 */
export const getCurrency = (code: string): CurrencyConfig => {
  return CURRENCIES[code] || CURRENCIES[DEFAULT_CURRENCY];
};

/**
 * Format amount with currency symbol
 */
export const formatCurrency = (amount: number | undefined | null, currencyCode: string = DEFAULT_CURRENCY): string => {
  const currency = getCurrency(currencyCode);
  const safeAmount = amount ?? 0;

  // For RTL currencies like AED, place symbol after amount
  if (currency.code === 'AED') {
    return `${safeAmount.toFixed(2)} ${currency.symbol}`;
  }

  return `${currency.symbol}${safeAmount.toFixed(2)}`;
};

/**
 * Format amount with locale-specific formatting
 */
export const formatCurrencyLocale = (amount: number, currencyCode: string = DEFAULT_CURRENCY): string => {
  const currency = getCurrency(currencyCode);
  
  try {
    return new Intl.NumberFormat(currency.locale, {
      style: 'currency',
      currency: currency.code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (error) {
    // Fallback to simple formatting
    return formatCurrency(amount, currencyCode);
  }
};
