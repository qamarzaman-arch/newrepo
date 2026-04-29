import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  if (!STATE_CHANGING_METHODS.has(req.method)) {
    return next();
  }

  const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean)
    : [];

  if (allowedOrigins.length === 0) {
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
