import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { logger, sanitize } from '../utils/logger';
import { rateLimiters } from '../middleware/rateLimiter';

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
router.post('/login', rateLimiters.strict, async (req: Request, res: Response, next: NextFunction) => {
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

      // `user.pin` is treated as a bcrypt hash.
      const isValidPin = await bcrypt.compare(pin, user.pin);
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
      { expiresIn: (process.env.JWT_EXPIRES_IN || '24h') as any }
    );

    // Create session
    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
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
    const pinHash = pin ? await bcrypt.hash(pin, 12) : undefined;

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

// Validate manager PIN for sensitive operations
router.post('/validate-pin', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { pin, operation } = req.body;

    if (!pin || typeof pin !== 'string') {
      throw new AppError('PIN is required', 400);
    }

    // Get the authenticated user's PIN from database
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { id: true, pin: true, role: true, fullName: true, username: true },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Check if user has PIN configured
    if (!user.pin) {
      logger.warn(`PIN validation attempted by ${user.username} but no PIN configured`);
      return res.json({
        success: false,
        valid: false,
        message: 'No PIN configured for your account. Please contact administrator.',
      });
    }

    // Compare provided PIN with user's stored PIN hash
    const isValid = await bcrypt.compare(pin, user.pin);

    if (!isValid) {
      logger.warn(`Failed PIN validation attempt by ${user.fullName} (${user.username}) for operation: ${operation}`);
      // Return false instead of error to prevent information leakage
      return res.json({
        success: true,
        data: { valid: false },
      });
    }

    logger.info(`PIN validated successfully for ${user.fullName} (${user.username}) - Operation: ${operation}`);

    res.json({
      success: true,
      data: { 
        valid: true,
        user: {
          id: user.id,
          name: user.fullName,
          username: user.username,
          role: user.role,
        }
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
