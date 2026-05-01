import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Paths that legitimately receive cross-origin POSTs without an Origin header
// because they are server-to-server (Stripe webhooks). The signature check on
// each route is the authentication; this list just exempts them from the
// browser-CSRF check.
const CSRF_EXEMPT_PREFIXES = [
  '/api/v1/payments/webhooks/',
];

export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  if (!STATE_CHANGING_METHODS.has(req.method)) {
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

  next();
}
