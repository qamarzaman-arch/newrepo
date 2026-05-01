import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import { AppError } from './errorHandler';

// QA A48: pin issuer + algorithm so a token signed by a different service that
// happens to share JWT_SECRET (or a token forged with `alg: none`) is rejected.
export const JWT_ISSUER = 'pos-backend';
export const JWT_AUDIENCE = 'pos-clients';
export const JWT_ALGORITHM: jwt.Algorithm = 'HS256';
export const JWT_VERIFY_OPTIONS: jwt.VerifyOptions = {
  issuer: JWT_ISSUER,
  audience: JWT_AUDIENCE,
  algorithms: [JWT_ALGORITHM],
};

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    username: string;
    role: string;
  };
}

export interface JwtPayload {
  userId: string;
  username: string;
  role: string;
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      throw new AppError('Authentication required', 401);
    }

    // Check session in database
    const session = await prisma.session.findFirst({
      where: { token },
      include: { user: true },
    });

    if (!session) {
      throw new AppError('Invalid or expired token', 401);
    }

    if (session.expiresAt < new Date()) {
      await prisma.session.deleteMany({ where: { token } });
      throw new AppError('Token expired', 401);
    }

    if (!session.user.isActive) {
      throw new AppError('User account is disabled', 403);
    }

    // QA A48: verify with explicit issuer/audience/algorithm. jsonwebtoken
    // throws on mismatch — caught below and converted to a 401.
    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(
        token,
        process.env.JWT_SECRET as string,
        JWT_VERIFY_OPTIONS,
      ) as JwtPayload;
    } catch {
      // Treat any verify failure as auth failure; never leak the underlying reason.
      return next(new AppError('Invalid or expired token', 401));
    }

    req.user = {
      userId: decoded.userId,
      username: decoded.username,
      role: decoded.role,
    };

    next();
  } catch (error) {
    next(error);
  }
}

export function authorize(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    if (!roles.includes(req.user.role)) {
      throw new AppError('Insufficient permissions', 403);
    }

    next();
  };
}

// QA C48: backend feature-access enforcement. The admin UI lets admins toggle
// per-role feature flags but until now nothing on the API side honored them —
// any role with a valid token could call any endpoint. requireFeature() checks
// the FeatureAccess table on each call (cached for 30s) and returns 403 if the
// caller's role is disabled for that feature. ADMIN always passes through.
type FeatureAccessCache = { value: boolean; expiresAt: number };
const featureAccessCache = new Map<string, FeatureAccessCache>();
const FEATURE_CACHE_TTL_MS = 30_000;

// Per-role bypass list for endpoints that nominally live under a feature the
// role doesn't own, but are part of a workflow the role legitimately performs.
// Example: a cashier doesn't have the 'reports' feature, but they need
// `/reports/sales/daily` for their till summary and `/reports/shift-summary`
// for their own shift breakdown. The path is matched against `req.path`
// AFTER the express prefix has been stripped (i.e. the path within the
// mounted router).
const FEATURE_BYPASS_PATHS: Record<string, Partial<Record<string, string[]>>> = {
  reports: {
    CASHIER: ['/sales/daily', '/shift-summary', '/daily', '/top-items'],
    STAFF:   ['/sales/daily', '/shift-summary'],
    MANAGER: ['/sales/daily', '/shift-summary', '/daily', '/top-items'],
  },
};

function bypassMatches(bypass: string[] | undefined, path: string): boolean {
  if (!bypass) return false;
  for (const p of bypass) {
    if (path === p || path.startsWith(p + '/') || path.startsWith(p + '?')) return true;
  }
  return false;
}

export function invalidateFeatureAccessCache() {
  featureAccessCache.clear();
}

export function requireFeature(feature: string) {
  return async (req: AuthRequest, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new AppError('Not authenticated', 401);
      if (req.user.role === 'ADMIN') return next();

      // Per-role allowlist — lets a cashier hit a couple of /reports endpoints
      // that are intrinsic to their shift workflow without granting them the
      // entire 'reports' feature.
      const bypass = FEATURE_BYPASS_PATHS[feature]?.[req.user.role];
      if (bypassMatches(bypass, req.path)) return next();

      const cacheKey = `${feature}:${req.user.role}`;
      const now = Date.now();
      const cached = featureAccessCache.get(cacheKey);
      if (cached && cached.expiresAt > now) {
        if (!cached.value) throw new AppError(`Feature '${feature}' is disabled for your role`, 403);
        return next();
      }

      const row = await prisma.featureAccess.findUnique({
        where: { feature_role: { feature, role: req.user.role } },
      });
      const enabled = row?.enabled ?? true; // default-allow if no explicit row
      featureAccessCache.set(cacheKey, { value: enabled, expiresAt: now + FEATURE_CACHE_TTL_MS });
      if (!enabled) throw new AppError(`Feature '${feature}' is disabled for your role`, 403);
      next();
    } catch (err) {
      next(err);
    }
  };
}
