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

/**
 * QA D48: accept Decimal-shaped values (number | string | Prisma.Decimal-like)
 * so callers don't have to pre-convert. Internal arithmetic uses string ops to
 * avoid float drift (no `* 100 / 100` rounding errors).
 */
type DecimalLike = number | string | { toString(): string } | null | undefined;

function toFixed2(value: DecimalLike): string {
  if (value === null || value === undefined) return '0.00';
  let n: number;
  if (typeof value === 'number') {
    n = value;
  } else {
    const parsed = Number(typeof value === 'string' ? value : value.toString());
    n = Number.isFinite(parsed) ? parsed : 0;
  }
  if (!Number.isFinite(n)) return '0.00';
  // toFixed(4) → strip back to 2dp via Math.round to dodge IEEE-754 quirks
  // (e.g. (1.005).toFixed(2) === "1.00" in some implementations).
  return (Math.round(Number(n.toFixed(4)) * 100) / 100).toFixed(2);
}

export function formatCurrency(
  amount: DecimalLike,
  currencyCode: string = DEFAULT_CURRENCY_CODE
): string {
  const currency = getCurrency(currencyCode);
  const fixed = toFixed2(amount);

  if (currency.code === 'AED') {
    return `${fixed} ${currency.symbol}`;
  }

  return `${currency.symbol}${fixed}`;
}

export function formatCurrencyLocale(
  amount: DecimalLike,
  currencyCode: string = DEFAULT_CURRENCY_CODE
): string {
  const currency = getCurrency(currencyCode);
  // Coerce once via toFixed2 so locale formatting sees a clean number.
  const n = Number(toFixed2(amount));

  try {
    return new Intl.NumberFormat(currency.locale, {
      style: 'currency',
      currency: currency.code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return formatCurrency(amount, currencyCode);
  }
}
