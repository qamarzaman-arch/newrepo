import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate, authorize, AuthRequest, JWT_ISSUER, JWT_AUDIENCE, JWT_ALGORITHM, JWT_VERIFY_OPTIONS } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { logger, sanitize } from '../utils/logger';
import { verifyAndUpgradeSecret } from '../utils/pinSecurity';
import { authLimiter } from '../middleware/rateLimiter';
import { PIN_BCRYPT_ROUNDS } from '../config/constants';

const router = Router();

// QA A6: split into a clean discriminated union — exactly one of password/pin
// must be present, and we know which up-front so the route doesn't have to
// re-derive it.
const passwordLoginSchema = z.object({
  username: z.string().min(1).max(64),
  password: z.string().min(1).max(128),
  pin: z.undefined().optional(),
});
const pinLoginSchema = z.object({
  username: z.string().min(1).max(64),
  pin: z.string().length(4).regex(/^\d{4}$/),
  password: z.undefined().optional(),
});
const loginSchema = z.union([passwordLoginSchema, pinLoginSchema]);

const registerSchema = z.object({
  username: z.string().min(3),
  email: z.string().email().optional(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  fullName: z.string().min(2),
  role: z.enum(['ADMIN', 'MANAGER', 'CASHIER', 'STAFF', 'KITCHEN', 'RIDER']),
  phone: z.string().optional(),
  pin: z.string().length(4).optional(),
});

// QA A1 / A2: prebuilt dummy bcrypt hash so a "user not found" path still
// performs an equivalent compare. This stops timing oracles that distinguish
// "valid username + wrong password" from "no such username".
const DUMMY_BCRYPT_HASH = '$2a$12$CwTycUXWue0Thq9StjUM0uJ8R5q8wb5L1.4r5W1sY7sIeY3iQF8Bm';

// Login
router.post('/login', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password, pin } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { username } });

    if (!user || !user.isActive) {
      // Burn an equivalent bcrypt cycle so attackers can't time us into
      // confirming valid usernames.
      await bcrypt.compare(password ?? pin ?? 'dummy', DUMMY_BCRYPT_HASH);
      throw new AppError('Invalid credentials', 401);
    }

    if (pin) {
      if (!user.pin) {
        await bcrypt.compare(pin, DUMMY_BCRYPT_HASH);
        throw new AppError('Invalid PIN', 401);
      }
      const isValidPin = await verifyAndUpgradeSecret(pin, user.pin, async (hashedPin) => {
        try {
          await prisma.user.update({
            where: { id: user.id },
            data: { pin: hashedPin },
          });
        } catch (err) {
          // QA A5: log silent upgrade failures so they're investigable.
          logger.warn(`PIN hash upgrade failed for ${user.username}: ${(err as Error).message}`);
        }
      });
      if (!isValidPin) {
        throw new AppError('Invalid PIN', 401);
      }
    } else {
      if (!password) {
        throw new AppError('Password is required', 400);
      }
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        throw new AppError('Invalid credentials', 401);
      }
    }

    // QA A48 / A4 / A7: pin issuer/audience/algorithm and derive session
    // expiry from the JWT itself instead of recomputing.
    const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '30d';
    if (!/^\d+[dhms]$/.test(jwtExpiresIn)) {
      // Fail fast — silently defaulting to 30d is how tokens "secretly live forever".
      throw new AppError('JWT_EXPIRES_IN is not a valid duration like "30d" / "12h" / "60m"', 500);
    }
    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role,
      },
      process.env.JWT_SECRET as string,
      {
        expiresIn: jwtExpiresIn as any,
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
        algorithm: JWT_ALGORITHM,
      }
    );

    // Derive session expiry from the JWT exp claim — single source of truth.
    const decodedForExpiry = jwt.decode(token) as { exp?: number } | null;
    const sessionExpiryMs = decodedForExpiry?.exp
      ? decodedForExpiry.exp * 1000 - Date.now()
      : 30 * 86_400_000;

    // Create session
    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + sessionExpiryMs),
      },
    });

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    logger.info(`User logged in: ${sanitize(username)}`);

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          role: user.role,
          email: user.email,
          phone: user.phone,
          avatar: user.avatar,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Register (Admin/Manager only)
router.post('/register', authenticate, authorize('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { username, email, password, fullName, role, phone, pin } = registerSchema.parse(req.body);

    // Check if user exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          ...(email ? [{ email }] : []),
        ],
      },
    });

    if (existingUser) {
      throw new AppError('Username or email already exists', 409);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Hash PIN if provided (store hashed value in `User.pin`)
    const pinHash = pin ? await bcrypt.hash(pin, PIN_BCRYPT_ROUNDS) : undefined;

    // Create user
    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
        fullName,
        role,
        phone,
        pin: pinHash,
      },
    });

    logger.info(`New user registered: ${sanitize(username)}`);

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          role: user.role,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Logout
router.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (token) {
      await prisma.session.deleteMany({
        where: { token },
      });
    }

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
});

// Verify token
router.get('/verify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      throw new AppError('No token provided', 401);
    }

    const decoded: any = jwt.verify(
      token,
      process.env.JWT_SECRET as string,
      JWT_VERIFY_OPTIONS,
    );

    // Verify that a valid (non-expired, non-revoked) DB session exists for this token
    const session = await prisma.session.findFirst({
      where: { token, expiresAt: { gte: new Date() } },
    });
    if (!session) {
      throw new AppError('Session expired or revoked. Please login again.', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        email: true,
        phone: true,
        avatar: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      throw new AppError('Invalid token', 401);
    }

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
});

// QA A3: PIN attempts persisted in DB so a process restart or a sibling
// replica can't be used to bypass the limiter. Backed by the new PinAttempt
// table — see schema.prisma.
const PIN_RATE_WINDOW_MS = 15 * 60 * 1000;
const PIN_RATE_MAX = 10;

async function checkPinRateLimit(userId: string): Promise<boolean> {
  const now = new Date();
  const existing = await prisma.pinAttempt.findUnique({ where: { userId } });

  if (!existing || existing.resetAt < now) {
    await prisma.pinAttempt.upsert({
      where: { userId },
      create: { userId, count: 1, resetAt: new Date(now.getTime() + PIN_RATE_WINDOW_MS) },
      update: { count: 1, resetAt: new Date(now.getTime() + PIN_RATE_WINDOW_MS) },
    });
    return true;
  }

  if (existing.count >= PIN_RATE_MAX) return false;

  // Atomic increment so two parallel attempts can't both pass the cap.
  const bumped = await prisma.pinAttempt.updateMany({
    where: { userId, count: { lt: PIN_RATE_MAX } },
    data: { count: { increment: 1 } },
  });
  return bumped.count > 0;
}

async function clearPinRateLimit(userId: string): Promise<void> {
  await prisma.pinAttempt.deleteMany({ where: { userId } });
}

// Validate a manager PIN for an override operation (discount, refund, void).
// The submitted PIN is matched against any active ADMIN/MANAGER user, not the
// caller — that's the whole point of the override flow: a cashier who needs a
// supervisor approval enters the supervisor's PIN.
//
// Rate limit is keyed on the caller (req.user!.userId) so brute-force attempts
// across many manager accounts still get capped per-cashier.
router.post('/validate-pin', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { pin, operation } = req.body;

    if (!pin || typeof pin !== 'string') {
      throw new AppError('PIN is required', 400);
    }

    const callerId = req.user!.userId;
    const callerUsername = req.user!.username;

    if (!(await checkPinRateLimit(callerId))) {
      logger.warn(`Manager-PIN rate limit exceeded for caller ${callerUsername}`);
      return res.status(429).json({
        success: false,
        error: { message: 'Too many PIN attempts. Please try again later.', code: 'RATE_LIMIT_EXCEEDED' },
      });
    }

    // Pull every active manager/admin with a configured PIN. There are
    // typically only a handful, so a linear bcrypt compare is acceptable;
    // bcrypt cost dominates and is constant per record.
    const managers = await prisma.user.findMany({
      where: {
        isActive: true,
        role: { in: ['ADMIN', 'MANAGER'] },
        pin: { not: null },
      },
      select: { id: true, pin: true, role: true, fullName: true, username: true },
    });

    let matched: typeof managers[number] | undefined;
    for (const manager of managers) {
      // Run every compare so timing doesn't reveal which usernames have a PIN.
      const ok = await verifyAndUpgradeSecret(pin, manager.pin!, async (hashedPin) => {
        await prisma.user.update({
          where: { id: manager.id },
          data: { pin: hashedPin },
        });
      });
      if (ok && !matched) matched = manager;
    }

    if (!matched) {
      logger.warn(`Failed manager-PIN validation by ${callerUsername} for operation=${operation}`);
      return res.json({
        success: true,
        data: { valid: false },
      });
    }

    // QA A78: log usernames + result only; don't include role.
    logger.info(`Manager PIN validated: approver=${matched.username} caller=${callerUsername} operation=${operation}`);
    // QA A3: clear the caller's counter on success.
    await clearPinRateLimit(callerId);

    res.json({
      success: true,
      data: {
        valid: true,
        user: {
          id: matched.id,
          name: matched.fullName,
          username: matched.username,
          role: matched.role,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
