import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:3001';

export function useAdminWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const [newOrders, setNewOrders] = useState(0);
  const [lowStockAlerts, setLowStockAlerts] = useState<any[]>([]);

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;

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
      socket.emit('join-room', 'admin');
    });

    socket.on('disconnect', () => {
      console.log('[Admin WS] Disconnected');
      setIsConnected(false);
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

    return () => {
      socket.disconnect();
    };
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
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    isConnected,
    newOrders,
    lowStockAlerts,
    resetNewOrderCount,
  };
}
