import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { getToken } from '../lib/auth';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:3001';

export function useAdminWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const [newOrders, setNewOrders] = useState(0);
  const [lowStockAlerts, setLowStockAlerts] = useState<any[]>([]);

  // QA C64: state guard so a fast remount/reconnect can't end up with two
  // sockets racing to claim socketRef.
  const connectingRef = useRef(false);

  const connect = useCallback(() => {
    if (socketRef.current?.connected || connectingRef.current) return;
    connectingRef.current = true;

    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const token = getToken();
    if (!token) {
      connectingRef.current = false;
      return;
    }

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 3000,
    });

    socket.on('connect', () => {
      console.log('[Admin WS] Connected');
      setIsConnected(true);
      connectingRef.current = false;
      socket.emit('join-room', 'admin');
    });

    socket.on('disconnect', () => {
      console.log('[Admin WS] Disconnected');
      setIsConnected(false);
      connectingRef.current = false;
    });

    // QA C65: surface socket errors instead of silently swallowing them.
    socket.on('connect_error', (err) => {
      console.warn('[Admin WS] connect_error:', err.message);
      connectingRef.current = false;
    });
    socket.on('error', (err) => {
      console.warn('[Admin WS] socket error:', err);
    });

    // Listen for new orders
    socket.on('order:created', (order) => {
      console.log('[Admin WS] New order:', order);
      setNewOrders(prev => prev + 1);
    });

    // Listen for low stock alerts
    socket.on('inventory:low-stock', (item) => {
      console.log('[Admin WS] Low stock alert:', item);
      setLowStockAlerts(prev => [item, ...prev].slice(0, 10));
    });

    // Listen for cash drawer events
    socket.on('cash-drawer:opened', (data) => {
      console.log('[Admin WS] Cash drawer opened:', data);
    });

    socket.on('cash-drawer:closed', (data) => {
      console.log('[Admin WS] Cash drawer closed:', data);
    });

    // Listen for shift events
    socket.on('shift:started', (data) => {
      console.log('[Admin WS] Shift started:', data);
    });

    socket.on('shift:ended', (data) => {
      console.log('[Admin WS] Shift ended:', data);
    });

    socketRef.current = socket;
  }, []);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const resetNewOrderCount = useCallback(() => {
    setNewOrders(0);
  }, []);

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    newOrders,
    lowStockAlerts,
    resetNewOrderCount,
  };
}
