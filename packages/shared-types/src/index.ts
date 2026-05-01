// Shared types for Restaurant POS System
// Used by both backend-api and pos-desktop

// Order Types
export type OrderType = 'DINE_IN' | 'WALK_IN' | 'TAKEAWAY' | 'DELIVERY' | 'PICKUP' | 'RESERVATION';
export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED';
export type PaymentStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'REFUNDED';
export type PaymentMethod = 'CASH' | 'CARD' | 'ONLINE_TRANSFER' | 'WALLET';

// User Types
export type UserRole = 'ADMIN' | 'MANAGER' | 'CASHIER' | 'SERVER' | 'STAFF' | 'KITCHEN' | 'RIDER';

// Order Item
export interface OrderItem {
  id: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
  modifiers?: string;
  voidedAt?: string;
  voidReason?: string;
  voidedBy?: string;
}

// Order
export interface Order {
  id: string;
  orderNumber: string;
  orderType: OrderType;
  status: OrderStatus;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  tableId?: string;
  tableNumber?: string;
  items: OrderItem[];
  subtotal: number;
  discountAmount: number;
  discountPercent: number;
  taxAmount: number;
  surchargeAmount: number;
  tipAmount?: number;
  totalAmount: number;
  paidAmount: number;
  paymentMethod?: PaymentMethod;
  paymentStatus: PaymentStatus;
  cashierId: string;
  serverId?: string;
  notes?: string;
  kitchenNotes?: string;
  orderedAt: string;
  completedAt?: string;
  cancelledAt?: string;
}

// Menu Types
export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  cost?: number;
  categoryId?: string;
  isAvailable: boolean;
  isActive: boolean;
  displayOrder: number;
}

export interface MenuCategory {
  id: string;
  name: string;
  description?: string;
  displayOrder: number;
  isActive: boolean;
}

// Inventory Types
export interface InventoryItem {
  id: string;
  name: string;
  sku?: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  unit: string;
  costPerUnit: number;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
}

// Payment
export interface Payment {
  id: string;
  orderId: string;
  method: PaymentMethod;
  amount: number;
  reference?: string;
  notes?: string;
  status: string;
  createdAt: string;
}

// API Response Wrapper
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
  };
}

// Pagination
export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Re-export calculation utilities
export * from './orderCalculations';

// Re-export currency utilities
export * from './currency';

// Re-export date formatting utilities
export * from './dateFormatters';

// Re-export constants
export * from './constants';

// Re-export status colors
export * from './statusColors';

// Re-export WebSocket event contracts
export * from './wsContracts';
