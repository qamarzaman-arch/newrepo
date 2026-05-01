import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/authStore';
import { registerGlobalSocket } from '../utils/socketRegistry';

const getSocketUrl = () => {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  return env?.VITE_SOCKET_URL || 'http://localhost:3001';
};

const SOCKET_URL = getSocketUrl();

type MessageHandler = (data: any) => void;

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const messageHandlers = useRef<Map<string, MessageHandler[]>>(new Map());
  // QA B40: track which rooms we joined so we can rejoin them after reconnect.
  const joinedRoomsRef = useRef<Set<string>>(new Set());
  const { token } = useAuthStore();
  const isConnectingRef = useRef(false);
  // QA B39: exponential reconnect with hard ceiling. We do reconnects manually
  // so we can pause when the user is logged out (no token).
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 8;
  const BASE_BACKOFF_MS = 1000;
  const MAX_BACKOFF_MS = 30_000;

  const scheduleReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      console.warn('Socket.IO: gave up after max reconnect attempts');
      return;
    }
    const delay = Math.min(BASE_BACKOFF_MS * 2 ** reconnectAttemptsRef.current, MAX_BACKOFF_MS);
    reconnectAttemptsRef.current++;
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    reconnectTimerRef.current = setTimeout(() => {
      // re-call connect — defined below; useCallback ref will capture fresh token.
      connectRef.current?.();
    }, delay);
  }, []);

  const connectRef = useRef<() => void>();

  const connect = useCallback(() => {
    if (!token || isConnectingRef.current) return;
    if (socketRef.current?.connected) return;

    isConnectingRef.current = true;

    try {
      const socket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: false, // QA B39: we own the reconnect loop ourselves.
        timeout: 5000,
      });

      socket.on('connect', () => {
        console.log('Socket.IO connected');
        setIsConnected(true);
        isConnectingRef.current = false;
        reconnectAttemptsRef.current = 0;
        // QA B40: rejoin every room the consumer asked us to be in.
        for (const room of joinedRoomsRef.current) {
          socket.emit('join-room', room);
        }
      });

      socket.on('disconnect', (reason) => {
        console.log('Socket.IO disconnected:', reason);
        setIsConnected(false);
        isConnectingRef.current = false;
        // Only reconnect if we still have a token (logout clears it).
        if (useAuthStore.getState().token) {
          scheduleReconnect();
        }
      });

      socket.on('connect_error', () => {
        setIsConnected(false);
        isConnectingRef.current = false;
        socket.disconnect();
        if (useAuthStore.getState().token) {
          scheduleReconnect();
        }
      });

      socket.onAny((eventName, ...args) => {
        const handlers = messageHandlers.current.get(eventName) || [];
        const payload = args.length === 1 ? args[0] : args;
        handlers.forEach(handler => {
          try {
            handler(payload);
          } catch (err) {
            console.error(`WebSocket handler error for event "${eventName}":`, err);
          }
        });
      });

      socketRef.current = socket;
      registerGlobalSocket(socket);
    } catch (error) {
      console.warn('Socket.IO initialization failed:', error);
      isConnectingRef.current = false;
      scheduleReconnect();
    }
  }, [token, scheduleReconnect]);

  // Keep a ref to the latest connect so scheduleReconnect can re-fire it.
  useEffect(() => { connectRef.current = connect; }, [connect]);

  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    reconnectAttemptsRef.current = MAX_RECONNECT_ATTEMPTS; // halt the loop
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const emit = useCallback((event: string, payload: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, payload);
    } else {
      console.warn('Socket.IO not connected');
    }
  }, []);

  const subscribe = useCallback((event: string, handler: MessageHandler) => {
    const handlers = messageHandlers.current.get(event) || [];
    handlers.push(handler);
    messageHandlers.current.set(event, handlers);

    // Also register directly on socket if connected
    if (socketRef.current) {
      socketRef.current.on(event, handler);
    }

    // Return unsubscribe function
    return () => {
      const currentHandlers = messageHandlers.current.get(event) || [];
      messageHandlers.current.set(
        event,
        currentHandlers.filter(h => h !== handler)
      );
      if (socketRef.current) {
        socketRef.current.off(event, handler);
      }
    };
  }, []);

  const joinRoom = useCallback((room: string) => {
    // QA B40: remember the room set so reconnect can rejoin everything.
    joinedRoomsRef.current.add(room);
    if (socketRef.current?.connected) {
      socketRef.current.emit('join-room', room);
    }
  }, []);

  const leaveRoom = useCallback((room: string) => {
    joinedRoomsRef.current.delete(room);
    if (socketRef.current?.connected) {
      socketRef.current.emit('leave-room', room);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    isConnected,
    emit,
    subscribe,
    connect,
    disconnect,
    joinRoom,
    leaveRoom,
    socket: socketRef.current,
  };
}

// Specialized hook for kitchen real-time updates
export function useKitchenWebSocket(onNewTicket?: (ticket: any) => void, onTicketUpdate?: (ticket: any) => void) {
  const { subscribe, joinRoom, isConnected } = useWebSocket();

  useEffect(() => {
    if (!isConnected) return;

    // Join the kitchen room
    joinRoom('kitchen');

    const unsubNew = subscribe('order:new', onNewTicket || (() => {}));
    const unsubCreated = subscribe('ticket:created', onNewTicket || (() => {}));
    const unsubUpdate = subscribe('order:updated', onTicketUpdate || (() => {}));
    const unsubTicketUpdate = subscribe('ticket:updated', onTicketUpdate || (() => {}));
    const unsubStatusChanged = subscribe('order:status-changed', onTicketUpdate || (() => {}));

    return () => {
      unsubNew();
      unsubCreated();
      unsubUpdate();
      unsubTicketUpdate();
      unsubStatusChanged();
    };
  }, [subscribe, joinRoom, isConnected, onNewTicket, onTicketUpdate]);

  return { isConnected };
}

// Specialized hook for cashier notifications from kitchen
export function useCashierWebSocket(onOrderReady?: (order: any) => void) {
  const { subscribe, joinRoom, isConnected } = useWebSocket();

  useEffect(() => {
    if (!isConnected) return;

    // Join the cashier notifications room
    joinRoom('cashier-notifications');

    // Listen for kitchen completion events
    const unsubOrderReady = subscribe('order:kitchen-ready', onOrderReady || (() => {}));
    const unsubTicketCompleted = subscribe('ticket:completed', onOrderReady || (() => {}));

    return () => {
      unsubOrderReady();
      unsubTicketCompleted();
    };
  }, [subscribe, joinRoom, isConnected, onOrderReady]);

  return { isConnected };
}

// Specialized hook for rider notifications
export function useRiderWebSocket(
  riderId: string,
  onPickupReady?: (data: any) => void,
  onLocationUpdate?: (data: any) => void
) {
  const { subscribe, joinRoom, leaveRoom, isConnected, emit } = useWebSocket();

  useEffect(() => {
    if (!isConnected || !riderId) return;

    // Join rider-specific room
    joinRoom(`rider:${riderId}`);
    joinRoom('delivery');

    // Listen for pickup notifications
    const unsubPickup = subscribe('rider:pickup-ready', onPickupReady || (() => {}));
    const unsubAssigned = subscribe('delivery:assigned', onPickupReady || (() => {}));
    const unsubLocation = onLocationUpdate
      ? subscribe(`rider:${riderId}:location`, onLocationUpdate)
      : () => {};

    return () => {
      unsubPickup();
      unsubAssigned();
      unsubLocation();
      leaveRoom(`rider:${riderId}`);
    };
  }, [subscribe, joinRoom, leaveRoom, isConnected, riderId, onPickupReady, onLocationUpdate]);

  // Function to update rider location
  const updateLocation = useCallback((location: { lat: number; lng: number }) => {
    emit('rider:location-update', { riderId, location });
  }, [emit, riderId]);

  // Function to accept delivery
  const acceptDelivery = useCallback((deliveryId: string) => {
    emit('rider:accept-delivery', { riderId, deliveryId });
  }, [emit, riderId]);

  // Function to mark delivery complete
  const completeDelivery = useCallback((deliveryId: string) => {
    emit('rider:complete-delivery', { riderId, deliveryId });
  }, [emit, riderId]);

  return { isConnected, updateLocation, acceptDelivery, completeDelivery };
}

// Hook for delivery dispatchers to receive live rider location pings.
// Backend emits `rider:location` on the `delivery-tracking` and `admin` rooms
// whenever a rider POSTs to /riders/location.
export interface RiderLocationPayload {
  riderId: string;
  location: { lat: number; lng: number; accuracy?: number; speed?: number; heading?: number };
  timestamp: string;
  fullName?: string;
  status?: string;
  isAvailable?: boolean;
}

export function useDeliveryTrackingWebSocket(
  onRiderLocation?: (payload: RiderLocationPayload) => void
) {
  const { subscribe, joinRoom, leaveRoom, isConnected } = useWebSocket();

  useEffect(() => {
    if (!isConnected) return;
    joinRoom('delivery-tracking');
    const unsub = subscribe('rider:location', (data: RiderLocationPayload) => {
      onRiderLocation?.(data);
    });
    return () => {
      unsub();
      leaveRoom('delivery-tracking');
    };
  }, [subscribe, joinRoom, leaveRoom, isConnected, onRiderLocation]);

  return { isConnected };
}

export default useWebSocket;
