export interface StatusColorConfig {
  backgroundColor: string;
  textColor: string;
  borderColor?: string;
}

export const ORDER_STATUS_COLORS: Record<string, StatusColorConfig> = {
  PENDING: { backgroundColor: 'bg-yellow-100', textColor: 'text-yellow-800', borderColor: 'border-yellow-300' },
  CONFIRMED: { backgroundColor: 'bg-blue-100', textColor: 'text-blue-800', borderColor: 'border-blue-300' },
  PREPARING: { backgroundColor: 'bg-purple-100', textColor: 'text-purple-800', borderColor: 'border-purple-300' },
  READY: { backgroundColor: 'bg-green-100', textColor: 'text-green-800', borderColor: 'border-green-300' },
  SERVED: { backgroundColor: 'bg-indigo-100', textColor: 'text-indigo-800', borderColor: 'border-indigo-300' },
  COMPLETED: { backgroundColor: 'bg-gray-100', textColor: 'text-gray-800', borderColor: 'border-gray-300' },
  CANCELLED: { backgroundColor: 'bg-red-100', textColor: 'text-red-800', borderColor: 'border-red-300' },
  REFUNDED: { backgroundColor: 'bg-red-100', textColor: 'text-red-800', borderColor: 'border-red-300' },
  PARTIALLY_REFUNDED: { backgroundColor: 'bg-orange-100', textColor: 'text-orange-800', borderColor: 'border-orange-300' },
  OFFLINE_QUEUED: { backgroundColor: 'bg-gray-100', textColor: 'text-gray-600', borderColor: 'border-gray-300' },
};

export const TABLE_STATUS_COLORS: Record<string, StatusColorConfig> = {
  AVAILABLE: { backgroundColor: 'bg-green-100', textColor: 'text-green-700', borderColor: 'border-green-300' },
  OCCUPIED: { backgroundColor: 'bg-red-100', textColor: 'text-red-700', borderColor: 'border-red-300' },
  RESERVED: { backgroundColor: 'bg-blue-100', textColor: 'text-blue-700', borderColor: 'border-blue-300' },
  NEEDS_CLEANING: { backgroundColor: 'bg-yellow-100', textColor: 'text-yellow-700', borderColor: 'border-yellow-300' },
};

export const PAYMENT_STATUS_COLORS: Record<string, StatusColorConfig> = {
  PENDING: { backgroundColor: 'bg-yellow-100', textColor: 'text-yellow-800' },
  PARTIAL: { backgroundColor: 'bg-orange-100', textColor: 'text-orange-800' },
  PAID: { backgroundColor: 'bg-green-100', textColor: 'text-green-800' },
  REFUNDED: { backgroundColor: 'bg-red-100', textColor: 'text-red-800' },
};

import { ORDER_TYPE_LABELS } from './constants';

export function getOrderStatusColor(status: string): StatusColorConfig {
  return ORDER_STATUS_COLORS[status] || ORDER_STATUS_COLORS.PENDING;
}

export function getTableStatusColor(status: string): StatusColorConfig {
  return TABLE_STATUS_COLORS[status] || TABLE_STATUS_COLORS.AVAILABLE;
}

export function getPaymentStatusColor(status: string): StatusColorConfig {
  return PAYMENT_STATUS_COLORS[status] || PAYMENT_STATUS_COLORS.PENDING;
}

export function getOrderTypeLabel(type: string): string {
  return ORDER_TYPE_LABELS[type] || type;
}

export function getStatusColorClasses(status: string): string {
  const config = getOrderStatusColor(status);
  return `${config.backgroundColor} ${config.textColor}`;
}

export function getStatusColorClassesWithBorder(status: string): string {
  const config = getOrderStatusColor(status);
  return `${config.backgroundColor} ${config.textColor} ${config.borderColor || ''}`;
}