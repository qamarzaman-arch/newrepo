import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/authStore';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

type MessageHandler = (data: any) => void;

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const messageHandlers = useRef<Map<string, MessageHandler[]>>(new Map());
  const { token } = useAuthStore();
  const isConnectingRef = useRef(false);

  const connect = useCallback(() => {
    if (!token || isConnectingRef.current) return;

    // Skip if already connected
    if (socketRef.current?.connected) {
      return;
    }

    isConnectingRef.current = true;

    try {
      const socket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 3000,
        reconnectionDelayMax: 10000,
        timeout: 20000,
      });

      socket.on('connect', () => {
        console.log('Socket.IO connected');
        setIsConnected(true);
        isConnectingRef.current = false;
      });

      socket.on('disconnect', (reason) => {
        console.log('Socket.IO disconnected:', reason);
        setIsConnected(false);
        isConnectingRef.current = false;
      });

      socket.on('connect_error', (error) => {
        console.error('Socket.IO connection error:', error.message);
        setIsConnected(false);
        isConnectingRef.current = false;
      });

      socket.on('reconnect_failed', () => {
        console.error('Socket.IO max reconnection attempts reached');
        isConnectingRef.current = false;
      });

      // Listen for all custom events and dispatch to registered handlers
      socket.onAny((eventName, ...args) => {
        const handlers = messageHandlers.current.get(eventName) || [];
        const payload = args.length === 1 ? args[0] : args;
        handlers.forEach(handler => handler(payload));
      });

      socketRef.current = socket;
    } catch (error) {
      console.error('Failed to connect Socket.IO:', error);
    }
  }, [token]);

  const disconnect = useCallback(() => {
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
    if (socketRef.current?.connected) {
      socketRef.current.emit('join-room', room);
    }
  }, []);

  const leaveRoom = useCallback((room: string) => {
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

    return () => {
      unsubPickup();
      unsubAssigned();
      leaveRoom(`rider:${riderId}`);
    };
  }, [subscribe, joinRoom, leaveRoom, isConnected, riderId, onPickupReady]);

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

export default useWebSocket;
