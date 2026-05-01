// Cookie name matches STORAGE_KEYS.AUTH_TOKEN in packages/shared-types/src/constants.ts
const COOKIE_NAME = 'auth_token';

/**
 * QA C5 / C6: a true HttpOnly auth cookie cannot be set from client JS.
 * The hardening plan is to migrate this whole flow to a Next.js Route Handler
 * (`/api/auth/login`) that calls the backend, then sets a Set-Cookie header
 * with `HttpOnly; Secure; SameSite=Strict`.
 *
 * Until that handler exists in production, the helpers below still write the
 * cookie from the browser AND mirror the value into a sessionStorage key so
 * the API client doesn't fall back to localStorage. They also strictly tag
 * SameSite=Strict + Secure on HTTPS, which closes the worst CSRF window.
 *
 * IMPORTANT: any new code MUST treat `getToken()` as a read-only convenience
 * for the migration window. The long-term fix is a server-side cookie.
 */
const TOKEN_SESSION_KEY = '__poslytic_token_mirror';

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

// Zod-style structural validator without pulling in zod for one helper.
function isValidUser(u: any): u is User {
  return !!u
    && typeof u === 'object'
    && typeof u.id === 'string'
    && typeof u.username === 'string'
    && typeof u.fullName === 'string'
    && ['ADMIN', 'MANAGER', 'CASHIER', 'STAFF', 'KITCHEN', 'RIDER'].includes(u.role);
}

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
    // QA C8: single source of truth — token mirror in sessionStorage so the
    // API client doesn't fall back to localStorage. Cleared on tab close.
    try { sessionStorage.setItem(TOKEN_SESSION_KEY, tokens.token); } catch { /* private mode */ }
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(tokens.user));
  }
}

export function clearAuth(): void {
  deleteCookie(COOKIE_NAME);
  if (typeof window !== 'undefined') {
    try { sessionStorage.removeItem(TOKEN_SESSION_KEY); } catch { /* ignore */ }
    localStorage.removeItem(AUTH_USER_KEY);
  }
}

export function getToken(): string | null {
  // Prefer the cookie (will become HttpOnly post-migration; this branch then
  // returns null from JS by design and the server-side handler attaches it).
  const fromCookie = getCookie(COOKIE_NAME);
  if (fromCookie) return fromCookie;
  if (typeof window === 'undefined') return null;
  try { return sessionStorage.getItem(TOKEN_SESSION_KEY); } catch { return null; }
}

export function getUser(): User | null {
  if (typeof window === 'undefined') return null;
  const userStr = localStorage.getItem(AUTH_USER_KEY);
  if (!userStr) return null;
  try {
    const parsed = JSON.parse(userStr);
    // QA C7: validate structure on read so a tampered/garbage entry doesn't
    // end up flowing through the rest of the app as a "valid" user object.
    return isValidUser(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

export function hasRole(roles: string[]): boolean {
  const user = getUser();
  if (!user) return false;
  return roles.includes(user.role);
}
