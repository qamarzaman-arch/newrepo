import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { logger } from '../utils/logger';

const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// QA A56: explicit list of GET endpoints that mutate state and must therefore
// also be CSRF-protected. Add paths here only as a temporary measure; new code
// should never use GET for mutations.
const STATE_CHANGING_GET_PATHS = new Set<string>([]);

const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';

// Lightweight cookie parser so we don't have to add a runtime dependency.
function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers['cookie'];
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const k = part.slice(0, eq).trim();
    if (k === name) {
      try {
        return decodeURIComponent(part.slice(eq + 1).trim());
      } catch {
        return part.slice(eq + 1).trim();
      }
    }
  }
  return undefined;
}

// Paths that legitimately receive cross-origin POSTs without an Origin header
// because they are server-to-server (Stripe webhooks). The signature check on
// each route is the authentication; this list just exempts them from the
// browser-CSRF check.
const CSRF_EXEMPT_PREFIXES = [
  '/api/v1/payments/webhooks/',
];

// Issue (or refresh) the CSRF cookie on every response. Double-submit pattern:
// the same value lives in a non-HttpOnly cookie and must be echoed back in the
// `x-csrf-token` header on state-changing requests. An attacker on a third-
// party origin can drive a request but cannot read the cookie to set a
// matching header.
export function issueCsrfToken(req: Request, res: Response, next: NextFunction): void {
  const existing = readCookie(req, CSRF_COOKIE_NAME);
  if (!existing || existing.length < 32) {
    const token = crypto.randomBytes(32).toString('hex');
    res.cookie(CSRF_COOKIE_NAME, token, {
      httpOnly: false,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });
  }
  next();
}

function timingSafeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  const isStateChangingGet = req.method === 'GET' && STATE_CHANGING_GET_PATHS.has(req.path);
  if (!STATE_CHANGING_METHODS.has(req.method) && !isStateChangingGet) {
    return next();
  }

  if (CSRF_EXEMPT_PREFIXES.some((p) => req.path.startsWith(p))) {
    return next();
  }

  const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean)
    : [];

  // QA A141 / D58: fail-closed when CORS_ORIGIN isn't set in production.
  // Previously we silently skipped the entire CSRF check, which means a
  // misconfigured deploy lost CSRF defence with no warning.
  if (allowedOrigins.length === 0) {
    if (process.env.NODE_ENV === 'production') {
      logger.error(`CSRF: refusing ${req.method} ${req.path} because CORS_ORIGIN is unset in production`);
      res.status(403).json({ success: false, error: { message: 'Server CSRF policy not configured', code: 'CSRF_NOT_CONFIGURED' } });
      return;
    }
    return next();
  }

  const origin = req.headers['origin'] as string | undefined;
  const referer = req.headers['referer'] as string | undefined;

  const requestOrigin = origin || (referer ? new URL(referer).origin : undefined);

  if (!requestOrigin) {
    logger.warn(`CSRF: missing Origin/Referer on ${req.method} ${req.path}`);
    res.status(403).json({ success: false, error: { message: 'Forbidden: missing origin', code: 'CSRF_REJECTED' } });
    return;
  }

  if (!allowedOrigins.includes(requestOrigin)) {
    logger.warn(`CSRF: rejected origin "${requestOrigin}" on ${req.method} ${req.path}`);
    res.status(403).json({ success: false, error: { message: 'Forbidden: origin not allowed', code: 'CSRF_REJECTED' } });
    return;
  }

  // QA A57: synchronizer (double-submit) token. Bearer-token API clients
  // (Authorization header + no cookies) are not exposed to browser CSRF,
  // so we only enforce the token check when the request carries cookies.
  const hasCookies = !!req.headers['cookie'];
  if (hasCookies) {
    const cookieToken = readCookie(req, CSRF_COOKIE_NAME);
    const headerToken = req.headers[CSRF_HEADER_NAME] as string | undefined;
    if (!cookieToken || !headerToken || !timingSafeEqual(cookieToken, headerToken)) {
      logger.warn(`CSRF: token mismatch on ${req.method} ${req.path}`);
      res.status(403).json({ success: false, error: { message: 'Forbidden: CSRF token missing or invalid', code: 'CSRF_TOKEN_INVALID' } });
      return;
    }
  }

  next();
}
