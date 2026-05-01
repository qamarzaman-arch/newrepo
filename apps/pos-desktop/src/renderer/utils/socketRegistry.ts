/**
 * Lightweight handle for the active Socket.IO connection so non-React code
 * (auth store logout) can shut it down without re-creating React hooks.
 *
 * QA B42: WebSocket must be closed on logout so the server doesn't keep
 * trusting a socket authed under the old token.
 */
import type { Socket } from 'socket.io-client';

let activeSocket: Socket | null = null;

export function registerGlobalSocket(socket: Socket): void {
  activeSocket = socket;
}

export function destroyGlobalSocket(): void {
  if (activeSocket) {
    try {
      activeSocket.removeAllListeners();
      activeSocket.disconnect();
    } catch {
      /* swallow — best-effort teardown */
    }
    activeSocket = null;
  }
}

export function getGlobalSocket(): Socket | null {
  return activeSocket;
}
