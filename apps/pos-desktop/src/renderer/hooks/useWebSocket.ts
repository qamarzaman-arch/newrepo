import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';

interface WebSocketMessage {
  type: string;
  payload: any;
}

type MessageHandler = (data: any) => void;

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const messageHandlers = useRef<Map<string, MessageHandler[]>>(new Map());
  const { token } = useAuthStore();

  const connect = useCallback(() => {
    if (!token || ws.current?.readyState === WebSocket.OPEN) return;

    const wsUrl = `${process.env.REACT_APP_WS_URL || 'ws://localhost:3001'}/ws?token=${token}`;
    
    try {
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
      };

      ws.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(message);
          
          // Call registered handlers for this message type
          const handlers = messageHandlers.current.get(message.type) || [];
          handlers.forEach(handler => handler(message.payload));
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.current.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        
        // Attempt reconnection after 5 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 5000);
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
  }, [token]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    ws.current?.close();
    ws.current = null;
    setIsConnected(false);
  }, []);

  const send = useCallback((type: string, payload: any) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type, payload }));
    } else {
      console.warn('WebSocket not connected');
    }
  }, []);

  const subscribe = useCallback((messageType: string, handler: MessageHandler) => {
    const handlers = messageHandlers.current.get(messageType) || [];
    handlers.push(handler);
    messageHandlers.current.set(messageType, handlers);

    // Return unsubscribe function
    return () => {
      const currentHandlers = messageHandlers.current.get(messageType) || [];
      messageHandlers.current.set(
        messageType,
        currentHandlers.filter(h => h !== handler)
      );
    };
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    isConnected,
    lastMessage,
    send,
    subscribe,
    connect,
    disconnect,
  };
}

// Specialized hook for kitchen real-time updates
export function useKitchenWebSocket(onNewTicket?: (ticket: any) => void, onTicketUpdate?: (ticket: any) => void) {
  const { subscribe, isConnected } = useWebSocket();

  useEffect(() => {
    const unsubNew = subscribe('KITCHEN_TICKET_CREATED', onNewTicket || (() => {}));
    const unsubUpdate = subscribe('KITCHEN_TICKET_UPDATED', onTicketUpdate || (() => {}));

    return () => {
      unsubNew();
      unsubUpdate();
    };
  }, [subscribe, onNewTicket, onTicketUpdate]);

  return { isConnected };
}

export default useWebSocket;
