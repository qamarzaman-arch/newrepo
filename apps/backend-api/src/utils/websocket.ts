import { Server as SocketIOServer } from 'socket.io';
import { logger } from './logger';

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
    this.io.emit('order:created', order);
    this.io.to('kitchen').emit('order:new', order);
    logger.info(`WebSocket: Order created - ${order.id}`);
  }

  emitOrderUpdated(orderId: string, order: Order) {
    this.io.emit(`order:${orderId}:updated`, order);
    this.io.to('kitchen').emit('order:updated', order);
    logger.info(`WebSocket: Order updated - ${orderId}`);
  }

  emitOrderStatusChanged(orderId: string, status: string) {
    this.io.emit(`order:${orderId}:status`, { orderId, status });
    this.io.to('kitchen').emit('order:status-changed', { orderId, status });
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
    this.io.to('kitchen').emit('ticket:created', ticket);
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
    this.io.to('admin').emit('inventory:low-stock', item);
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
    this.io.emit(`table:${tableId}:status`, { tableId, status });
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
    this.io.emit(`delivery:${deliveryId}:status`, { deliveryId, status, riderId });
    // Also notify specific rider room if rider assigned
    if (riderId) {
      this.io.to(`rider:${riderId}`).emit('delivery:assigned', { deliveryId, status });
    }
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

  emitRiderLocationUpdate(riderId: string, location: { lat: number; lng: number }) {
    this.io.to('admin').emit(`rider:${riderId}:location`, { riderId, location, timestamp: new Date().toISOString() });
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
    this.io.emit('notification:new', notification);
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
    this.io.to('admin').emit('cash-drawer:opened', { amount, timestamp: new Date() });
    logger.info(`WebSocket: Cash drawer opened - $${amount}`);
  }

  emitCashDrawerClosed(openingAmount: number, closingAmount: number) {
    this.io.to('admin').emit('cash-drawer:closed', { 
      openingAmount, 
      closingAmount,
      difference: closingAmount - openingAmount,
      timestamp: new Date() 
    });
    logger.info(`WebSocket: Cash drawer closed`);
  }

  emitShiftStarted(cashierId: string) {
    this.io.to('admin').emit('shift:started', { cashierId, timestamp: new Date() });
    logger.info(`WebSocket: Shift started - ${cashierId}`);
  }

  emitShiftEnded(cashierId: string, summary: ShiftSummary) {
    this.io.to('admin').emit('shift:ended', { cashierId, summary, timestamp: new Date() });
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
