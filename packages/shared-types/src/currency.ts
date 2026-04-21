export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
  locale: string;
}

export const SUPPORTED_CURRENCIES: Record<string, CurrencyConfig> = {
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

export const DEFAULT_CURRENCY_CODE = 'USD';

export function getCurrency(code: string): CurrencyConfig {
  return SUPPORTED_CURRENCIES[code] || SUPPORTED_CURRENCIES[DEFAULT_CURRENCY_CODE];
}

export function formatCurrency(
  amount: number | null | undefined,
  currencyCode: string = DEFAULT_CURRENCY_CODE
): string {
  const currency = getCurrency(currencyCode);
  const safeAmount = amount ?? 0;

  if (currency.code === 'AED') {
    return `${safeAmount.toFixed(2)} ${currency.symbol}`;
  }

  return `${currency.symbol}${safeAmount.toFixed(2)}`;
}

export function formatCurrencyLocale(
  amount: number,
  currencyCode: string = DEFAULT_CURRENCY_CODE
): string {
  const currency = getCurrency(currencyCode);
  
  try {
    return new Intl.NumberFormat(currency.locale, {
      style: 'currency',
      currency: currency.code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return formatCurrency(amount, currencyCode);
  }
}
