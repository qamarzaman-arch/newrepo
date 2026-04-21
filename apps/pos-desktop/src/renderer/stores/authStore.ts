import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService } from '../services/authService';
import { getSecureStorageService } from '../services/secureStorageService';

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

        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
      },

      initialize: async () => {
        // Use secure storage
        const secureStorage = getSecureStorageService();
        const token = await secureStorage.getToken() || useAuthStore.getState().token;

        if (!token) {
          await secureStorage.clearAuth();
          set({
            user: null,
            token: null,
            isAuthenticated: false,
          });
          return;
        }

        try {
          const response = await authService.verifyToken();
          const user = response.data.data.user;

          set({
            user,
            token,
            isAuthenticated: true,
          });

          // Re-store in secure storage (in case it was in localStorage before migration)
          await secureStorage.setToken(token);
          await secureStorage.setUser(user);
        } catch (error: any) {
          console.error('Token verification failed:', error);
          // Only clear auth on 401 (unauthorized) errors
          // For network errors or other issues, keep user logged in
          if (error?.response?.status === 401 || error?.status === 401) {
            await secureStorage.clearAuth();
            set({
              user: null,
              token: null,
              isAuthenticated: false,
            });
          } else {
            // For other errors (network, server down, etc.), keep user logged in
            // The token might still be valid, we just couldn't verify it right now
            console.warn('Token verification failed due to network/server error, keeping user logged in');
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
