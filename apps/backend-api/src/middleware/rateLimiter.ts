import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

interface RateLimitEntry {
  count: number;
  firstRequest: number;
}

// In-memory store (for production, use Redis)
const rateLimitStore = new Map<string, RateLimitEntry>();

export function rateLimit(options: {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  message?: string;
}) {
  const { windowMs, maxRequests, message = 'Too many requests, please try again later' } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    // Get client identifier (IP or user ID if authenticated)
    const clientId = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const key = `${clientId}:${req.path}`;

    const now = Date.now();
    const entry = rateLimitStore.get(key);

    if (!entry) {
      // First request
      rateLimitStore.set(key, { count: 1, firstRequest: now });
      return next();
    }

    // Check if window has expired
    if (now - entry.firstRequest > windowMs) {
      // Reset window
      rateLimitStore.set(key, { count: 1, firstRequest: now });
      return next();
    }

    // Increment count
    entry.count++;
    rateLimitStore.set(key, entry);

    // Check if limit exceeded
    if (entry.count > maxRequests) {
      const retryAfter = Math.ceil((entry.firstRequest + windowMs - now) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      res.setHeader('X-RateLimit-Limit', String(maxRequests));
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('X-RateLimit-Reset', String(entry.firstRequest + windowMs));
      
      throw new AppError(message, 429);
    }

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', String(maxRequests));
    res.setHeader('X-RateLimit-Remaining', String(maxRequests - entry.count));
    res.setHeader('X-RateLimit-Reset', String(entry.firstRequest + windowMs));

    next();
  };
}

// Cleanup old entries periodically (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now - entry.firstRequest > 300000) { // 5 minutes
      rateLimitStore.delete(key);
    }
  }
}, 300000);

// Pre-configured rate limiters for common use cases
export const rateLimiters = {
  // Strict: For authentication endpoints
  strict: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    message: 'Too many authentication attempts, please try again after 15 minutes',
  }),

  // Moderate: For order creation and payments
  moderate: rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 20,
    message: 'Too many orders, please slow down',
  }),

  // Lenient: For general API usage
  lenient: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    message: 'Too many requests, please slow down',
  }),
};
