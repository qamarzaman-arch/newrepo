import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService } from '../services/authService';
import { getSecureStorageService } from '../services/secureStorageService';
import { useFeatureAccessStore } from './featureAccessStore';

interface User {
  id: string;
  username: string;
  fullName: string;
  role: 'ADMIN' | 'MANAGER' | 'CASHIER' | 'STAFF' | 'KITCHEN' | 'RIDER';
  email?: string;
  phone?: string;
  avatar?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (user, token) => {
        set({
          user,
          token,
          isAuthenticated: true,
        });

        // Use secure storage for auth data
        const secureStorage = getSecureStorageService();
        await secureStorage.setToken(token);
        await secureStorage.setUser(user);

        // Load feature access for this user's role
        const featureAccessStore = useFeatureAccessStore.getState();
        await featureAccessStore.loadFeatureAccess(user.role);
      },

      logout: async () => {
        try {
          await authService.logout();
        } catch (error) {
          console.error('Logout error:', error);
        }

        // Clear secure storage
        const secureStorage = getSecureStorageService();
        await secureStorage.clearAuth();

        // Clear feature access
        const featureAccessStore = useFeatureAccessStore.getState();
        featureAccessStore.clear();

        // QA B42: tear down the WebSocket so the server doesn't keep
        // trusting a socket that authed with the now-invalidated token.
        try {
          // Lazy import to avoid React-hooks-into-store coupling.
          const { destroyGlobalSocket } = await import('../utils/socketRegistry');
          destroyGlobalSocket();
        } catch {
          /* socketRegistry is optional; ignore if not present */
        }

        // QA B64 (parallel): also tear down the offline queue interval.
        try {
          const { getOfflineQueueManager } = await import('../services/offlineQueueManager');
          getOfflineQueueManager().destroy?.();
        } catch {
          /* offline queue may not be present in some builds */
        }

        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });

        localStorage.removeItem('auth-storage');

        // QA B8: broadcast logout to other tabs/windows so they update too.
        try {
          window.dispatchEvent(new StorageEvent('storage', { key: 'auth-storage', newValue: null }));
        } catch {
          /* StorageEvent constructor unavailable in test env; ignore */
        }
      },

      initialize: async () => {
        const secureStorage = getSecureStorageService();
        const token = await secureStorage.getToken() || useAuthStore.getState().token;

        if (!token) {
          await secureStorage.clearAuth();
          set({ user: null, token: null, isAuthenticated: false });
          return;
        }

        // QA B6: decode JWT exp client-side and reject locally before even
        // hitting the network. Saves a round-trip and works offline.
        try {
          const payloadB64 = token.split('.')[1];
          if (payloadB64) {
            const decoded = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));
            if (decoded?.exp && decoded.exp * 1000 < Date.now()) {
              await secureStorage.clearAuth();
              set({ user: null, token: null, isAuthenticated: false });
              return;
            }
          }
        } catch {
          /* malformed token — let the server be the judge */
        }

        try {
          const response = await authService.verifyToken();
          const user = response.data.data.user;

          set({ user, token, isAuthenticated: true });
          await secureStorage.setToken(token);
          await secureStorage.setUser(user);

          const featureAccessStore = useFeatureAccessStore.getState();
          await featureAccessStore.loadFeatureAccess(user.role);
        } catch (error: any) {
          // QA B6: any 401 / 403 path means the stored token is no longer valid.
          // Only network failures keep the user logged in.
          const status = error?.response?.status ?? error?.status;
          const isAuthFailure = status === 401 || status === 403;
          const isNetwork = error?.code === 'NETWORK_ERROR' || error?.message === 'Network Error' || !status;

          if (isAuthFailure) {
            await secureStorage.clearAuth();
            set({ user: null, token: null, isAuthenticated: false });
          } else if (isNetwork) {
            console.warn('Token verify deferred — network unreachable, keeping local session');
          } else {
            // Other server errors (5xx) — clear conservatively to force re-login.
            await secureStorage.clearAuth();
            set({ user: null, token: null, isAuthenticated: false });
          }
        }
      },
    }),
    {
      name: 'auth-storage',
      // Don't persist token in zustand storage - use secure storage instead
      partialize: (_state) => ({
        user: null,
        token: null,
        isAuthenticated: false, // Will be rehydrated from secure storage on init
      }),
    }
  )
);
