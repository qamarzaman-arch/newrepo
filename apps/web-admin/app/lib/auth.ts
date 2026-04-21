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

// Use same keys as POS Desktop for consistency
export const AUTH_TOKEN_KEY = 'token';
export const AUTH_USER_KEY = 'user';

function setCookie(name: string, value: string, maxAgeSeconds = 24 * 60 * 60) {
  if (typeof window === 'undefined') return;

  const cookieParts = [
    `${name}=${encodeURIComponent(value)}`,
    `Max-Age=${maxAgeSeconds}`,
    'Path=/',
    'SameSite=Lax',
  ];

  if (window.location.protocol === 'https:') {
    cookieParts.push('Secure');
  }

  document.cookie = cookieParts.join('; ');
}

function deleteCookie(name: string) {
  if (typeof window === 'undefined') return;

  document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
}

export function setAuth(tokens: AuthTokens): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(AUTH_TOKEN_KEY, tokens.token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(tokens.user));
    setCookie(AUTH_TOKEN_KEY, tokens.token);
  }
}

export function clearAuth(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    deleteCookie(AUTH_TOKEN_KEY);
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
