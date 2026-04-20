export interface User {
  id: string;
  username: string;
  fullName: string;
  role: 'ADMIN' | 'MANAGER' | 'CASHIER' | 'STAFF' | 'KITCHEN' | 'RIDER';
  email?: string;
  avatar?: string;
}

export interface AuthTokens {
  token: string;
  user: User;
}

export const AUTH_TOKEN_KEY = 'auth_token';
export const AUTH_USER_KEY = 'auth_user';

export function setAuth(tokens: AuthTokens): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(AUTH_TOKEN_KEY, tokens.token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(tokens.user));
  }
}

export function clearAuth(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
  }
}

export function getToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  }
  return null;
}

export function getUser(): User | null {
  if (typeof window !== 'undefined') {
    const userStr = localStorage.getItem(AUTH_USER_KEY);
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
  }
  return null;
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

export function hasRole(roles: string[]): boolean {
  const user = getUser();
  if (!user) return false;
  return roles.includes(user.role);
}
