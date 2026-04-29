/**
 * Shared Constants
 * Centralized configuration values used across the application
 */

// Time constants (in milliseconds)
export const TIME = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
} as const;

// Retry configuration
export const RETRY = {
  MAX_ATTEMPTS: 3,
  DELAY_MS: 1000,
  BACKOFF_MULTIPLIER: 2,
  MAX_DELAY_MS: 10000,
} as const;

// Sync configuration
export const SYNC = {
  AUTO_SYNC_INTERVAL_MS: 30000, // 30 seconds
  MAX_QUEUE_SIZE: 100,
  OFFLINE_ORDER_TTL_MS: 24 * TIME.HOUR, // 24 hours
  CONFLICT_RESOLUTION_TIMEOUT_MS: 5 * TIME.MINUTE,
} as const;

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 500,
  DEFAULT_PAGE: 1,
} as const;

// Order configuration
export const ORDER = {
  ORDER_NUMBER_PREFIX: 'ORD',
  ORDER_NUMBER_PADDING: 4,
  DEFAULT_TAX_RATE: 0,
  DEFAULT_TIP_PERCENT: 0,
  MAX_DISCOUNT_PERCENT: 100,
  TOLERANCE: 0.01, // 1 cent for payment validation
} as const;

// Payment configuration
export const PAYMENT = {
  TIMEOUT_MS: 30000,
  TOLERANCE_CENTS: 1,
  MAX_CASH_BACK: 100, // Maximum cash back amount
  MINIMUM_CASH_RECEIVED: 0, // Minimum cash to accept
} as const;

// Kitchen configuration
export const KITCHEN = {
  DEFAULT_PREP_TIME_MINUTES: 15,
  AUTO_BUMP_MINUTES: 5, // Auto-complete items after this time
  TICKET_EXPIRY_HOURS: 24,
} as const;

// UI configuration
export const UI = {
  DEBOUNCE_MS: 300,
  TOAST_DURATION_MS: 3000,
  MODAL_ANIMATION_MS: 200,
  REFRESH_INTERVAL_MS: 30000,
  KITCHEN_REFRESH_MS: 5000,
} as const;

// Currency defaults
export const CURRENCY = {
  DEFAULT_CODE: 'USD',
  DEFAULT_LOCALE: 'en-US',
  DECIMAL_PLACES: 2,
} as const;

// Storage keys (centralized to avoid typos)
export const STORAGE_KEYS = {
  OFFLINE_QUEUE: 'pos_offline_queue',
  SYNC_CONFLICTS: 'pos_sync_conflicts',
  AUTH_TOKEN: 'auth_token',
  USER_DATA: 'user_data_secure',
  SETTINGS: 'pos_settings',
  LAST_SYNC: 'pos_last_sync',
} as const;

// API configuration
export const API = {
  TIMEOUT_MS: 30000,
  RATE_LIMIT_REQUESTS: 100,
  RATE_LIMIT_WINDOW_MS: 60000, // 1 minute
} as const;

// Error messages (standardized)
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network connection failed. Please check your connection.',
  SYNC_FAILED: 'Sync failed. Orders will retry automatically.',
  ORDER_CREATE_FAILED: 'Failed to create order. Please try again.',
  PAYMENT_FAILED: 'Payment processing failed. Please try again.',
  INSUFFICIENT_STOCK: 'Insufficient stock for one or more items.',
  UNAUTHORIZED: 'Session expired. Please log in again.',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  ORDER_CREATED: 'Order created successfully.',
  ORDER_UPDATED: 'Order updated successfully.',
  PAYMENT_PROCESSED: 'Payment processed successfully.',
  SYNC_COMPLETE: 'Orders synced successfully.',
  OFFLINE_ORDER_QUEUED: 'Order saved offline. Will sync when online.',
} as const;

// Order type display names
export const ORDER_TYPE_LABELS: Record<string, string> = {
  DINE_IN: 'Dine In',
  WALK_IN: 'Walk In',
  TAKEAWAY: 'Takeaway',
  DELIVERY: 'Delivery',
  PICKUP: 'Pickup',
  RESERVATION: 'Reservation',
};

// Payment method labels
export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Cash',
  CARD: 'Card',
  ONLINE_TRANSFER: 'Bank Transfer',
  WALLET: 'Digital Wallet',
  SPLIT: 'Split Payment',
};

// User role labels
export const USER_ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrator',
  MANAGER: 'Manager',
  CASHIER: 'Cashier',
  SERVER: 'Server',
  KITCHEN: 'Kitchen Staff',
  RIDER: 'Delivery Rider',
};
