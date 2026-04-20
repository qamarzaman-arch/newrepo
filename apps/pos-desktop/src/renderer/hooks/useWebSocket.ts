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

  const connect = useCallback(() => {
    if (!token) return;

    // Disconnect existing socket if any
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    try {
      const socket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });

      socket.on('connect', () => {
        console.log('Socket.IO connected');
        setIsConnected(true);
      });

      socket.on('disconnect', (reason) => {
        console.log('Socket.IO disconnected:', reason);
        setIsConnected(false);
      });

      socket.on('connect_error', (error) => {
        console.error('Socket.IO connection error:', error.message);
        setIsConnected(false);
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

export default useWebSocket;
