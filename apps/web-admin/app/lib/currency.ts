// Re-export shared currency utilities
// This file exists for backward compatibility - new code should import from @restaurant-pos/shared-types

export {
  SUPPORTED_CURRENCIES,
  DEFAULT_CURRENCY_CODE as DEFAULT_CURRENCY,
  getCurrency,
  formatCurrency,
} from '@restaurant-pos/shared-types';

export type { CurrencyConfig } from '@restaurant-pos/shared-types';
