import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  initialize: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: (user, token) => {
        set({
          user,
          token,
          isAuthenticated: true,
        });
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
      },

      initialize: async () => {
        // Check if we have a stored token
        const token = localStorage.getItem('token');
        if (token) {
          // TODO: Verify token with backend
          // For now, just restore from localStorage
          const userStr = localStorage.getItem('user');
          if (userStr) {
            set({
              user: JSON.parse(userStr),
              token,
              isAuthenticated: true,
            });
          }
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
      }),
    }
  )
);
