import rateLimit from 'express-rate-limit';
import { RequestHandler } from 'express';
import { logger } from '../utils/logger';

/**
 * Rate Limiter Configuration
 * Prevents brute force attacks and API abuse
 */

// Strict rate limiting for authentication endpoints (brute force protection)
export const authLimiter: RequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    success: false,
    error: {
      message: 'Too many login attempts. Please try again after 15 minutes.',
      code: 'RATE_LIMIT_EXCEEDED',
    },
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  keyGenerator: (req) => {
    // Use IP + username combination to prevent targeted attacks
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const username = req.body?.username || 'anonymous';
    return `${ip}:${username}`;
  },
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for auth: ${req.ip}`, {
      username: req.body?.username,
      path: req.path,
    });
    res.status(429).json({
      success: false,
      error: {
        message: 'Too many login attempts. Please try again after 15 minutes.',
        code: 'RATE_LIMIT_EXCEEDED',
      },
    });
  },
});

// General API rate limiting (higher limits for normal usage)
export const apiLimiter: RequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window per IP
  // QA A55: standardize the JSON shape with the rest of the API. The previous
  // `message` object was returned as-is by express-rate-limit which doesn't
  // match our `{ success, error: { message, code } }` envelope.
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: { message: 'Too many requests. Please slow down.', code: 'RATE_LIMIT_EXCEEDED' },
    });
  },
  skip: (req) => req.path === '/health',
});

// QA A85: separate, much stricter limiter for upload endpoints. Uploads are
// expensive and an obvious DoS surface.
export const uploadLimiter: RequestHandler = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const userId = (req as any).user?.userId || 'anonymous';
    return `${ip}:${userId}`;
  },
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: { message: 'Too many uploads. Slow down.', code: 'RATE_LIMIT_EXCEEDED' },
    });
  },
});

// Payment endpoints - stricter than general API but more than auth
export const paymentLimiter: RequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 payment attempts per window
  message: {
    success: false,
    error: {
      message: 'Too many payment attempts. Please contact support if this persists.',
      code: 'RATE_LIMIT_EXCEEDED',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use IP + user ID for payment tracking
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const userId = (req as any).user?.userId || 'anonymous';
    return `${ip}:${userId}`;
  },
});

// QA C2 / C33: per-token rate limit for QR ordering. Public endpoints — no auth
// header to key on, so we key on the QR session token (in URL params or body)
// plus IP. Without this a single QR can spam orders or get scraped.
export const qrTokenLimiter: RequestHandler = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const token = (req.params as any)?.token
      || (req.body as any)?.token
      || (req.query as any)?.token
      || 'anonymous';
    return `qr:${ip}:${token}`;
  },
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: { message: 'Too many QR ordering requests. Slow down.', code: 'RATE_LIMIT_EXCEEDED' },
    });
  },
});

// Order creation limiter (prevents spam orders)
export const orderLimiter: RequestHandler = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 30, // 30 orders per 5 minutes (high but reasonable for busy restaurants)
  message: {
    success: false,
    error: {
      message: 'Too many order creations. Please slow down.',
      code: 'RATE_LIMIT_EXCEEDED',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});
