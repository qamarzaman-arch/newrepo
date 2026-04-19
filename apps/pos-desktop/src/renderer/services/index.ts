// Centralized service exports for cleaner imports
// Usage: import { authService, orderService } from '@/services';

export { authService } from './authService';
export { orderService, type CreateOrderData, type OrderItem } from './orderService';
export { menuService, type MenuItem, type MenuCategory } from './menuService';
export { tableService, type Table } from './tableService';
export { customerService, type Customer } from './customerService';
export { inventoryService, type InventoryItem } from './inventoryService';
export { kitchenService, type KotTicket } from './kitchenService';
export { reportService } from './reportService';
export { staffService } from './staffService';
export { expenseService } from './expenseService';
export { deliveryService } from './deliveryService';
export { deliveryZoneService } from './deliveryZoneService';
export { riderService } from './riderService';
export { paymentGatewayService } from './paymentGatewayService';
export { orderModificationService } from './orderModificationService';
export { staffScheduleService } from './staffScheduleService';
export { validationService } from './validationService';
export { cashDrawerService, type CashDrawer } from './cashDrawerService';
export { auditLogService, logAction } from './auditLogService';
export { loyaltyService } from './loyaltyService';

// Hardware and utilities
export { getHardwareManager, type ReceiptData } from './hardwareManager';
export { getOfflineQueueManager } from './offlineQueueManager';
export { getTableLockService } from './tableLockService';
export { getBarcodeScannerService } from './barcodeScannerService';
export { getKeyboardShortcutsManager } from './keyboardShortcutsManager';
// Payment validation exports a singleton instance getter
export { getPaymentValidationService } from './paymentValidationService';

// API instance
export { api as default, API_BASE_URL } from './api';
