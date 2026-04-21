/**
 * Application Constants
 * Centralized configuration for timeouts, intervals, and limits
 */

export const CONSTANTS = {
  // Sync & Queue
  SYNC_INTERVAL_MS: 30000,              // 30 seconds
  MAX_RETRY_ATTEMPTS: 3,
  OFFLINE_QUEUE_MAX_AGE_MS: 24 * 60 * 60 * 1000, // 24 hours
  
  // Lock Durations
  TABLE_LOCK_DURATION_MS: 5 * 60 * 1000,         // 5 minutes
  SESSION_LOCK_DURATION_MS: 10 * 60 * 1000,        // 10 minutes
  
  // Timeouts
  REQUEST_TIMEOUT_MS: 30000,            // 30 seconds
  WEBSOCKET_TIMEOUT_MS: 20000,          // 20 seconds
  PAYMENT_TIMEOUT_MS: 60000,          // 60 seconds
  
  // Order Management
  HELD_ORDER_MAX_AGE_HOURS: 24,
  ORDER_NUMBER_RETRY_ATTEMPTS: 5,
  KITCHEN_KOT_PRINT_TIMEOUT_MS: 5000, // 5 seconds
  
  // UI/UX
  TOAST_DURATION_MS: 3000,              // 3 seconds
  DEBOUNCE_DELAY_MS: 300,             // 300ms
  DOUBLE_CLICK_THRESHOLD_MS: 500,       // 500ms
  
  // Pagination
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 200,
  
  // Inventory
  LOW_STOCK_THRESHOLD_MULTIPLIER: 2,    // Warn when stock < 2x required
  INVENTORY_DEDUCTION_BATCH_SIZE: 100,
  
  // Rate Limiting
  API_RATE_LIMIT_PER_MINUTE: 100,
  AUTH_RATE_LIMIT_PER_15MIN: 10,
  
  // Cache
  CACHE_TTL_MS: 5 * 60 * 1000,          // 5 minutes
  REPORT_CACHE_TTL_MS: 60 * 60 * 1000,  // 1 hour
  
  // Financial
  MAX_DISCOUNT_PERCENT: 100,
  MAX_TIP_PERCENT: 30,
  DEFAULT_TAX_RATE: 8.5,
  
  // File Uploads
  MAX_FILE_SIZE_MB: 10,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
} as const;

// Freeze to prevent accidental modification
Object.freeze(CONSTANTS);

// Helper type for constant keys
export type ConstantKeys = keyof typeof CONSTANTS;
