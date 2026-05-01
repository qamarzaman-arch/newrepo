/**
 * QA D23-D26, B22, B41: a single source of truth for every WebSocket payload
 * the backend emits. Both the server and the renderer/admin clients import the
 * same zod schemas, so a renamed field or a missing required prop becomes a
 * type error AND a runtime validation failure instead of a silent UI bug.
 */
import { z } from 'zod';

const isoDate = z.string().datetime({ offset: true }).or(z.date().transform((d) => d.toISOString()));

export const WsOrderSummarySchema = z.object({
  id: z.string(),
  orderNumber: z.string().optional(),
  status: z.string().optional(),
  totalAmount: z.union([z.number(), z.string()]).optional(),
  customerName: z.string().nullable().optional(),
  customerPhone: z.string().nullable().optional(),
});
export type WsOrderSummary = z.infer<typeof WsOrderSummarySchema>;

export const WsOrderStatusChangedSchema = z.object({
  orderId: z.string(),
  status: z.string(),
});
export type WsOrderStatusChanged = z.infer<typeof WsOrderStatusChangedSchema>;

export const WsKotTicketSchema = z.object({
  id: z.string(),
  ticketNumber: z.string().optional(),
  orderId: z.string().optional(),
  status: z.string().optional(),
  station: z.string().nullable().optional(),
});
export type WsKotTicket = z.infer<typeof WsKotTicketSchema>;

export const WsInventoryItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  currentStock: z.union([z.number(), z.string()]).optional(),
  minStock: z.union([z.number(), z.string()]).optional(),
  status: z.string().optional(),
});
export type WsInventoryItem = z.infer<typeof WsInventoryItemSchema>;

export const WsTableStatusSchema = z.object({
  tableId: z.string(),
  status: z.string(),
});
export type WsTableStatus = z.infer<typeof WsTableStatusSchema>;

export const WsDeliveryStatusSchema = z.object({
  deliveryId: z.string(),
  status: z.string(),
  riderId: z.string().nullable().optional(),
});
export type WsDeliveryStatus = z.infer<typeof WsDeliveryStatusSchema>;

export const WsRiderLocationSchema = z.object({
  riderId: z.string(),
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    accuracy: z.number().nonnegative().optional(),
    speed: z.number().optional(),
    heading: z.number().min(0).max(360).optional(),
  }),
  timestamp: isoDate,
  fullName: z.string().optional(),
  status: z.string().optional(),
  isAvailable: z.boolean().optional(),
});
export type WsRiderLocation = z.infer<typeof WsRiderLocationSchema>;

export const WsCashDrawerOpenedSchema = z.object({
  amount: z.number(),
  timestamp: isoDate,
});

export const WsCashDrawerClosedSchema = z.object({
  openingAmount: z.number(),
  closingAmount: z.number(),
  difference: z.number(),
  timestamp: isoDate,
});

export const WsShiftSchema = z.object({
  cashierId: z.string(),
  timestamp: isoDate,
  summary: z.record(z.unknown()).optional(),
});

export const WsNotificationSchema = z.object({
  type: z.string().optional(),
  title: z.string().optional(),
  message: z.string().optional(),
  severity: z.enum(['info', 'warning', 'error', 'success']).optional(),
}).catchall(z.unknown());

/** All event names used across the system, for autocomplete and detection of typos. */
export const WS_EVENTS = {
  ORDER_CREATED: 'order:created',
  ORDER_NEW_TO_KITCHEN: 'order:new',
  ORDER_UPDATED: 'order:updated',
  ORDER_STATUS_CHANGED: 'order:status-changed',
  ORDER_COMPLETED: 'order:completed',
  TICKET_CREATED: 'ticket:created',
  INVENTORY_LOW_STOCK: 'inventory:low-stock',
  TABLE_STATUS: 'table:status',
  DELIVERY_CREATED: 'delivery:created',
  DELIVERY_STATUS: 'delivery:status',
  RIDER_PICKUP_READY: 'rider:pickup-ready',
  RIDER_LOCATION: 'rider:location',
  STAFF_CHECKED_IN: 'staff:checked-in',
  STAFF_CHECKED_OUT: 'staff:checked-out',
  CASH_DRAWER_OPENED: 'cash-drawer:opened',
  CASH_DRAWER_CLOSED: 'cash-drawer:closed',
  SHIFT_STARTED: 'shift:started',
  SHIFT_ENDED: 'shift:ended',
  NOTIFICATION_NEW: 'notification:new',
  ANALYTICS_UPDATE: 'analytics:update',
} as const;
