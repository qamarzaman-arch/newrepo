import { Server as SocketIOServer } from 'socket.io';
import { logger } from './logger';
import {
  WsOrderSummarySchema,
  WsOrderStatusChangedSchema,
  WsKotTicketSchema,
  WsInventoryItemSchema,
  WsTableStatusSchema,
  WsDeliveryStatusSchema,
  WsRiderLocationSchema,
  WsCashDrawerOpenedSchema,
  WsCashDrawerClosedSchema,
  WsShiftSchema,
  WsNotificationSchema,
} from '@restaurant-pos/shared-types';
import type { z } from 'zod';

// QA D23-D26: validate payloads against the shared zod contracts before
// broadcast. A schema violation logs and drops the event so the renderer
// never receives a malformed payload that crashes its reducer.
function safeEmit<S extends z.ZodTypeAny>(
  io: SocketIOServer,
  schema: S,
  payload: unknown,
  emitFn: (validated: z.infer<S>) => void,
  context: string,
) {
  const result = schema.safeParse(payload);
  if (!result.success) {
    logger.warn(`WebSocket payload rejected (${context}): ${result.error.message}`);
    return;
  }
  emitFn(result.data);
}

/**
 * WebSocket Event Manager for Real-Time Updates
 * Manages all Socket.IO events across the application
 */

// Type definitions for WebSocket event payloads
interface Order {
  id: string;
  orderNumber?: string;
  customerName?: string;
  customerPhone?: string;
  delivery?: {
    address?: string;
  };
}

interface Ticket {
  id: string;
}

interface InventoryItem {
  id: string;
  name: string;
}

interface Delivery {
  id: string;
}

interface Notification {
  [key: string]: unknown;
}

interface AnalyticsData {
  [key: string]: unknown;
}

interface ShiftSummary {
  [key: string]: unknown;
}

export class WebSocketManager {
  private io: SocketIOServer;

  constructor(io: SocketIOServer) {
    this.io = io;
  }

  /**
   * Emit order-related events
   */
  emitOrderCreated(order: Order) {
    safeEmit(this.io, WsOrderSummarySchema, order, (v) => {
      this.io.emit('order:created', v);
      this.io.to('kitchen').emit('order:new', v);
    }, 'order:created');
    logger.info(`WebSocket: Order created - ${order.id}`);
  }

  emitOrderUpdated(orderId: string, order: Order) {
    safeEmit(this.io, WsOrderSummarySchema, order, (v) => {
      this.io.emit(`order:${orderId}:updated`, v);
      this.io.to('kitchen').emit('order:updated', v);
    }, 'order:updated');
    logger.info(`WebSocket: Order updated - ${orderId}`);
  }

  emitOrderStatusChanged(orderId: string, status: string) {
    safeEmit(this.io, WsOrderStatusChangedSchema, { orderId, status }, (v) => {
      this.io.emit(`order:${orderId}:status`, v);
      this.io.to('kitchen').emit('order:status-changed', v);
    }, 'order:status-changed');
    logger.info(`WebSocket: Order status changed - ${orderId} to ${status}`);
  }

  emitOrderCompleted(orderId: string) {
    this.io.emit(`order:${orderId}:completed`, { orderId });
    logger.info(`WebSocket: Order completed - ${orderId}`);
  }

  /**
   * Emit kitchen-related events
   */
  emitTicketCreated(ticket: Ticket) {
    safeEmit(this.io, WsKotTicketSchema, ticket, (v) => {
      this.io.to('kitchen').emit('ticket:created', v);
    }, 'ticket:created');
    logger.info(`WebSocket: Kitchen ticket created - ${ticket.id}`);
  }

  emitTicketUpdated(ticketId: string, ticket: Ticket) {
    this.io.to('kitchen').emit(`ticket:${ticketId}:updated`, ticket);
    logger.info(`WebSocket: Kitchen ticket updated - ${ticketId}`);
  }

  emitTicketCompleted(ticketId: string) {
    this.io.to('kitchen').emit(`ticket:${ticketId}:completed`, { ticketId });
    logger.info(`WebSocket: Kitchen ticket completed - ${ticketId}`);
  }

  /**
   * Emit inventory-related events
   */
  emitInventoryLow(item: InventoryItem) {
    safeEmit(this.io, WsInventoryItemSchema, item, (v) => {
      this.io.to('admin').emit('inventory:low-stock', v);
    }, 'inventory:low-stock');
    logger.info(`WebSocket: Low stock alert - ${item.name}`);
  }

  emitInventoryUpdated(itemId: string, item: InventoryItem) {
    this.io.emit(`inventory:${itemId}:updated`, item);
    logger.info(`WebSocket: Inventory updated - ${itemId}`);
  }

  /**
   * Emit table-related events
   */
  emitTableStatusChanged(tableId: string, status: string) {
    safeEmit(this.io, WsTableStatusSchema, { tableId, status }, (v) => {
      this.io.emit(`table:${tableId}:status`, v);
    }, 'table:status');
    logger.info(`WebSocket: Table status changed - ${tableId} to ${status}`);
  }

  /**
   * Emit delivery-related events
   */
  emitDeliveryCreated(delivery: Delivery) {
    this.io.to('delivery').emit('delivery:created', delivery);
    logger.info(`WebSocket: Delivery created - ${delivery.id}`);
  }

  emitDeliveryStatusChanged(deliveryId: string, status: string, riderId?: string) {
    safeEmit(this.io, WsDeliveryStatusSchema, { deliveryId, status, riderId: riderId ?? null }, (v) => {
      this.io.emit(`delivery:${deliveryId}:status`, v);
      if (v.riderId) this.io.to(`rider:${v.riderId}`).emit('delivery:assigned', { deliveryId, status });
    }, 'delivery:status');
    logger.info(`WebSocket: Delivery status changed - ${deliveryId} to ${status}`);
  }

  /**
   * Emit rider-specific events
   */
  emitRiderPickupNotification(riderId: string, order: Order) {
    this.io.to(`rider:${riderId}`).emit('rider:pickup-ready', {
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerAddress: order.delivery?.address,
      customerPhone: order.customerPhone,
      pickupTime: new Date().toISOString(),
      message: `Order ${order.orderNumber} is ready for pickup!`,
    });
    logger.info(`WebSocket: Rider pickup notification - ${riderId} for order ${order.id}`);
  }

  emitRiderLocationUpdate(
    riderId: string,
    location: { lat: number; lng: number; accuracy?: number; speed?: number; heading?: number },
    extra?: { fullName?: string; status?: string; isAvailable?: boolean }
  ) {
    // QA D27: bound the location payload before broadcast — bad GPS readings
    // pollute every dashboard subscribed to this socket.
    const payload = { riderId, location, timestamp: new Date().toISOString(), ...extra };
    safeEmit(this.io, WsRiderLocationSchema, payload, (v) => {
      this.io.emit(`rider:${riderId}:location`, v);
      this.io.to('delivery-tracking').emit('rider:location', v);
      this.io.to('admin').emit('rider:location', v);
    }, 'rider:location');
  }

  /**
   * Emit staff-related events
   */
  emitStaffCheckedIn(staffId: string) {
    this.io.to('admin').emit('staff:checked-in', { staffId });
    logger.info(`WebSocket: Staff checked in - ${staffId}`);
  }

  emitStaffCheckedOut(staffId: string) {
    this.io.to('admin').emit('staff:checked-out', { staffId });
    logger.info(`WebSocket: Staff checked out - ${staffId}`);
  }

  /**
   * Broadcast system-wide notifications
   */
  broadcastNotification(notification: Notification) {
    safeEmit(this.io, WsNotificationSchema, notification, (v) => {
      this.io.emit('notification:new', v);
    }, 'notification:new');
    logger.info(`WebSocket: Notification broadcast`);
  }

  /**
   * Generic broadcast to all connected clients
   */
  broadcast(event: string, data: unknown) {
    this.io.emit(event, data);
    logger.info(`WebSocket: Broadcast ${event}`);
  }

  /**
   * Send real-time analytics updates
   */
  emitAnalyticsUpdate(data: AnalyticsData) {
    this.io.to('admin').emit('analytics:update', data);
    logger.info(`WebSocket: Analytics update sent`);
  }

  /**
   * Handle cashier-specific events
   */
  emitCashDrawerOpened(amount: number) {
    safeEmit(this.io, WsCashDrawerOpenedSchema, { amount, timestamp: new Date().toISOString() }, (v) => {
      this.io.to('admin').emit('cash-drawer:opened', v);
    }, 'cash-drawer:opened');
    logger.info(`WebSocket: Cash drawer opened - $${amount}`);
  }

  emitCashDrawerClosed(openingAmount: number, closingAmount: number) {
    const payload = {
      openingAmount,
      closingAmount,
      difference: closingAmount - openingAmount,
      timestamp: new Date().toISOString(),
    };
    safeEmit(this.io, WsCashDrawerClosedSchema, payload, (v) => {
      this.io.to('admin').emit('cash-drawer:closed', v);
    }, 'cash-drawer:closed');
    logger.info(`WebSocket: Cash drawer closed`);
  }

  emitShiftStarted(cashierId: string) {
    safeEmit(this.io, WsShiftSchema, { cashierId, timestamp: new Date().toISOString() }, (v) => {
      this.io.to('admin').emit('shift:started', v);
    }, 'shift:started');
    logger.info(`WebSocket: Shift started - ${cashierId}`);
  }

  emitShiftEnded(cashierId: string, summary: ShiftSummary) {
    safeEmit(this.io, WsShiftSchema, { cashierId, summary, timestamp: new Date().toISOString() }, (v) => {
      this.io.to('admin').emit('shift:ended', v);
    }, 'shift:ended');
    logger.info(`WebSocket: Shift ended - ${cashierId}`);
  }
}

// Singleton instance
let websocketManager: WebSocketManager | null = null;

export function getWebSocketManager(): WebSocketManager {
  if (!websocketManager) {
    if (global.socketIO) {
      websocketManager = new WebSocketManager(global.socketIO);
    } else {
      throw new Error('WebSocketManager not initialized. Call initializeWebSocketManager() first in server.ts');
    }
  }
  return websocketManager;
}

export function initializeWebSocketManager(io: SocketIOServer): WebSocketManager {
  websocketManager = new WebSocketManager(io);
  return websocketManager;
}
