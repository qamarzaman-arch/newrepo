// Cookie name matches STORAGE_KEYS.AUTH_TOKEN in packages/shared-types/src/constants.ts
const COOKIE_NAME = 'auth_token';

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

export const AUTH_USER_KEY = 'user';

function setCookie(name: string, value: string, maxAgeSeconds = 24 * 60 * 60) {
  if (typeof window === 'undefined') return;

  const cookieParts = [
    `${name}=${encodeURIComponent(value)}`,
    `Max-Age=${maxAgeSeconds}`,
    'Path=/',
    'SameSite=Strict',
  ];

  if (window.location.protocol === 'https:') {
    cookieParts.push('Secure');
  }

  document.cookie = cookieParts.join('; ');
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`));
  if (!match) return null;
  return decodeURIComponent(match.slice(name.length + 1));
}

function deleteCookie(name: string) {
  if (typeof window === 'undefined') return;
  document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Strict`;
}

export function setAuth(tokens: AuthTokens): void {
  setCookie(COOKIE_NAME, tokens.token);
  if (typeof window !== 'undefined') {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(tokens.user));
  }
}

export function clearAuth(): void {
  deleteCookie(COOKIE_NAME);
  if (typeof window !== 'undefined') {
    localStorage.removeItem(AUTH_USER_KEY);
  }
}

export function getToken(): string | null {
  return getCookie(COOKIE_NAME);
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
