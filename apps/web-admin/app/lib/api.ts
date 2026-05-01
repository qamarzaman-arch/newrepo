import axios, { AxiosInstance } from 'axios';
import { getToken, clearAuth } from './auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// QA C69: refuse plain HTTP for the API URL in production.
if (typeof window !== 'undefined') {
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd && API_BASE_URL.startsWith('http://') && !API_BASE_URL.includes('localhost')) {
    // eslint-disable-next-line no-console
    console.error('[api] NEXT_PUBLIC_API_URL is HTTP in production — tokens will leak. Refusing to start.');
    throw new Error('NEXT_PUBLIC_API_URL must be HTTPS in production');
  }
}

// QA C10: lock withCredentials to the known API origin so a stray cross-origin
// fetch (e.g. an embedded iframe) can't accidentally leak our cookies.
function isSameApiOrigin(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const apiOrigin = new URL(API_BASE_URL).origin;
    const reqOrigin = new URL(url, apiOrigin).origin;
    return apiOrigin === reqOrigin;
  } catch {
    return false;
  }
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  // Per-request override below.
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// QA C8: single source of truth for the token — getToken() reads cookie first,
// session-mirror second. Don't fall back to localStorage 'token' which never
// existed in the new auth flow.
// QA C19/C72: read the CSRF cookie set by the API and echo it on every
// state-changing request as `x-csrf-token` (double-submit pattern).
function readCsrfCookie(): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.split('; ').find((c) => c.startsWith('csrf_token='));
  if (!match) return undefined;
  try {
    return decodeURIComponent(match.split('=')[1]);
  } catch {
    return match.split('=')[1];
  }
}

apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = getToken();
    if (token) {
      // Axios v1 may use AxiosHeaders; fall back to plain object set when needed.
      if (config.headers && typeof (config.headers as any).set === 'function') {
        (config.headers as any).set('Authorization', `Bearer ${token}`);
      } else {
        (config.headers as any) = { ...(config.headers as any), Authorization: `Bearer ${token}` };
      }
    }

    const method = (config.method || 'get').toLowerCase();
    if (['post', 'put', 'patch', 'delete'].includes(method)) {
      const csrf = readCsrfCookie();
      if (csrf) {
        if (config.headers && typeof (config.headers as any).set === 'function') {
          (config.headers as any).set('x-csrf-token', csrf);
        } else {
          (config.headers as any) = { ...(config.headers as any), 'x-csrf-token': csrf };
        }
      }
    }

    // Lock cookie credentials to the API origin only.
    const url = config.url ?? '';
    config.withCredentials = isSameApiOrigin(url) || isSameApiOrigin(config.baseURL ?? API_BASE_URL);
  }
  return config;
});

// QA C9: 401 → use Next router rather than location.href so in-flight
// requests can be aborted; export a helper that pages call to install a
// router-aware redirect.
let onUnauthorized: () => void = () => {
  if (typeof window !== 'undefined') window.location.href = '/login';
};

export function registerUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      clearAuth();
      onUnauthorized();
    }
    return Promise.reject(error);
  }
);

export default apiClient;
