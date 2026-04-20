// Auth & Users
export { useAuthStore } from '../stores/authStore';

// Menu
export { useMenuItems, useMenuCategories } from './useMenu';

// Orders
export { useOrders, useOrder } from './useOrders';
export { useOrderModification } from './useOrderModification';

// Customers
export { useCustomers } from './useCustomers';

// Inventory
export { useInventory, useInventoryStats } from './useInventory';

// Tables
export { useTables } from './useTables';

// Staff
export { useStaff, useStaffPerformance } from './useStaff';
export { useStaffSchedule, useMySchedule, useScheduleStats } from './useStaffSchedule';

// Delivery & Riders
export { useDeliveries, useDelivery, useDeliveryZones } from './useDelivery';
export { useRiders, useRider, useRiderLocationUpdater } from './useRider';

// Loyalty
export { useLoyalty } from './useLoyalty';

// Audit Logs
export { useAuditLogs, useEntityAuditLogs } from './useAuditLogs';

// WebSocket
export { useWebSocket, useKitchenWebSocket, useCashierWebSocket, useRiderWebSocket } from './useWebSocket';

// Currency
export { useCurrencyFormatter } from './useCurrency';

// Offline - Placeholder for future implementation
// export { useOfflineSync } from './useOfflineSync';

// Commission - Placeholder for future implementation
// export { useCommission, useCommissionReport } from './useCommission';

// Payment Gateway - Placeholder for future implementation
// export { usePaymentGateway } from './usePaymentGateway';

// Delivery Zones (exported from useDelivery)
// export { useDeliveryZones as useZones } from './useDeliveryZones';

// Reports - Placeholder for future implementation
// export { useReports } from './useReports';
