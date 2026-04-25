import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { logger, sanitize } from '../utils/logger';
import { verifyAndUpgradeSecret } from '../utils/pinSecurity';
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

    // Create session
    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
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

    // Get the authenticated user from database
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { id: true, pin: true, role: true, fullName: true, username: true },
    });

    if (!currentUser) {
      throw new AppError('User not found', 404);
    }

    let isValid = false;
    let authorizedUser = null;

    // For sensitive operations (shift management, refunds), check if any MANAGER/ADMIN has this PIN
    const sensitiveOperations = ['shift_management', 'refund', 'void', 'cash_opening', 'cash_closing'];
    const isSensitiveOperation = sensitiveOperations.includes(operation);

    if (isSensitiveOperation) {
      // Find a manager/admin user with matching PIN
      const managers = await prisma.user.findMany({
        where: {
          role: { in: ['MANAGER', 'ADMIN'] },
          isActive: true,
          pin: { not: null },
        },
        select: { id: true, pin: true, role: true, fullName: true, username: true },
      });

      // Check each manager's PIN
      for (const manager of managers) {
        const pinMatched = await verifyAndUpgradeSecret(pin, manager.pin, async (hashedPin) => {
          await prisma.user.update({
            where: { id: manager.id },
            data: { pin: hashedPin },
          });
        });

        if (pinMatched) {
          isValid = true;
          authorizedUser = manager;
          break;
        }
      }

      if (!isValid) {
        logger.warn(`Failed ${operation} PIN validation attempt by ${currentUser.fullName} (${currentUser.username})`);
        return res.json({
          success: true,
          data: { valid: false },
        });
      }
    } else {
      // For non-sensitive operations, validate current user's PIN
      if (!currentUser.pin) {
        logger.warn(`PIN validation attempted by ${currentUser.username} but no PIN configured`);
        return res.json({
          success: false,
          valid: false,
          message: 'No PIN configured for your account. Please contact administrator.',
        });
      }

      isValid = await verifyAndUpgradeSecret(pin, currentUser.pin, async (hashedPin) => {
        await prisma.user.update({
          where: { id: currentUser.id },
          data: { pin: hashedPin },
        });
      });
      authorizedUser = currentUser;

      if (!isValid) {
        logger.warn(`Failed PIN validation attempt by ${currentUser.fullName} (${currentUser.username}) for operation: ${operation}`);
        return res.json({
          success: true,
          data: { valid: false },
        });
      }
    }

    logger.info(`PIN validated successfully for ${authorizedUser.fullName} (${authorizedUser.username}, Role: ${authorizedUser.role}) - Operation: ${operation} (requested by ${currentUser.username})`);

    res.json({
      success: true,
      data: { 
        valid: true,
        user: {
          id: authorizedUser.id,
          name: authorizedUser.fullName,
          username: authorizedUser.username,
          role: authorizedUser.role,
        }
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
