import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { logger, sanitize } from '../utils/logger';
import { verifyAndUpgradeSecret } from '../utils/pinSecurity';
import { authLimiter } from '../middleware/rateLimiter';
import { PIN_BCRYPT_ROUNDS } from '../config/constants';

const router = Router();

// Validation schemas
const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1).optional(),
  pin: z.string().length(4).optional(),
}).refine((v) => Boolean(v.password) || Boolean(v.pin), {
  message: 'Either password or pin is required',
});

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

// Login
router.post('/login', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password, pin } = loginSchema.parse(req.body);

    // Find user
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user || !user.isActive) {
      throw new AppError('Invalid credentials', 401);
    }

    // Check PIN login (if provided)
    if (pin) {
      if (!user.pin) {
        throw new AppError('Invalid PIN', 401);
      }

      const isValidPin = await verifyAndUpgradeSecret(pin, user.pin, async (hashedPin) => {
        await prisma.user.update({
          where: { id: user.id },
          data: { pin: hashedPin },
        });
      });
      if (!isValidPin) {
        throw new AppError('Invalid PIN', 401);
      }
    } else {
      // Check password
      if (!password) {
        throw new AppError('Password is required', 400);
      }
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        throw new AppError('Invalid credentials', 401);
      }
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role,
      },
      process.env.JWT_SECRET as string,
      { expiresIn: (process.env.JWT_EXPIRES_IN || '30d') as any }
    );

    // Parse JWT_EXPIRES_IN to derive session expiry (keeps DB session aligned with JWT lifetime)
    const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '30d';
    const unitMs: Record<string, number> = { d: 86400000, h: 3600000, m: 60000, s: 1000 };
    const match = jwtExpiresIn.match(/^(\d+)([dhms])$/);
    const sessionExpiryMs = match
      ? parseInt(match[1]) * (unitMs[match[2]] ?? 86400000)
      : 30 * 86400000;

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
      process.env.JWT_SECRET as string
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

// Per-userId rate limiting for validate-pin (max 10 attempts per 15 minutes)
const pinValidationAttempts = new Map<string, { count: number; resetAt: number }>();
const PIN_RATE_WINDOW_MS = 15 * 60 * 1000;
const PIN_RATE_MAX = 10;

function checkPinRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = pinValidationAttempts.get(userId);
  if (!entry || now > entry.resetAt) {
    pinValidationAttempts.set(userId, { count: 1, resetAt: now + PIN_RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= PIN_RATE_MAX) return false;
  entry.count++;
  return true;
}

// Validate PIN for the authenticated user only
router.post('/validate-pin', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { pin, operation } = req.body;

    if (!pin || typeof pin !== 'string') {
      throw new AppError('PIN is required', 400);
    }

    const userId = req.user!.userId;

    if (!checkPinRateLimit(userId)) {
      logger.warn(`PIN rate limit exceeded for userId ${userId}`);
      return res.status(429).json({
        success: false,
        error: { message: 'Too many PIN attempts. Please try again later.', code: 'RATE_LIMIT_EXCEEDED' },
      });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, pin: true, role: true, fullName: true, username: true },
    });

    if (!currentUser) {
      throw new AppError('User not found', 404);
    }

    if (!currentUser.pin) {
      logger.warn(`PIN validation attempted by ${currentUser.username} but no PIN configured`);
      return res.json({
        success: false,
        valid: false,
        message: 'No PIN configured for your account. Please contact administrator.',
      });
    }

    const isValid = await verifyAndUpgradeSecret(pin, currentUser.pin, async (hashedPin) => {
      await prisma.user.update({
        where: { id: currentUser.id },
        data: { pin: hashedPin },
      });
    });

    if (!isValid) {
      logger.warn(`Failed PIN validation attempt by ${currentUser.fullName} (${currentUser.username}) for operation: ${operation}`);
      return res.json({
        success: true,
        data: { valid: false },
      });
    }

    logger.info(`PIN validated successfully for ${currentUser.fullName} (${currentUser.username}, Role: ${currentUser.role}) - Operation: ${operation}`);

    res.json({
      success: true,
      data: {
        valid: true,
        user: {
          id: currentUser.id,
          name: currentUser.fullName,
          username: currentUser.username,
          role: currentUser.role,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
