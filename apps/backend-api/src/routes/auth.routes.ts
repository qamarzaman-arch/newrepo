import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../server';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { logger, sanitize } from '../utils/logger';

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
  password: z.string().min(6),
  fullName: z.string().min(2),
  role: z.enum(['ADMIN', 'MANAGER', 'CASHIER', 'STAFF', 'KITCHEN', 'RIDER']),
  phone: z.string().optional(),
  pin: z.string().length(4).optional(),
});

// Login
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
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

// Register (Admin only in production)
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
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

    // Get manager PIN from settings
    const managerPinSetting = await prisma.setting.findUnique({
      where: { key: 'manager_pin' },
    });

    if (!managerPinSetting) {
      throw new AppError('Manager PIN not configured', 500);
    }

    // Compare PIN (stored as bcrypt hash)
    const isValid = await bcrypt.compare(pin, managerPinSetting.value);

    if (!isValid) {
      logger.warn(`Failed PIN validation attempt for operation: ${operation}`);
      // Return false instead of error to prevent information leakage
      return res.json({
        success: true,
        data: { valid: false },
      });
    }

    logger.info(`PIN validated successfully for operation: ${operation}`);

    // Get manager name - either from authenticated user (if they're a manager) or find first manager
    let managerName = req.user?.username || 'Manager';
    
    // If the current user is not a manager, try to find a manager user for audit purposes
    if (req.user?.role !== 'MANAGER' && req.user?.role !== 'ADMIN') {
      const managerUser = await prisma.user.findFirst({
        where: { 
          role: { in: ['MANAGER', 'ADMIN'] },
          isActive: true,
        },
        select: { fullName: true, username: true },
        orderBy: { lastLoginAt: 'desc' },
      });
      if (managerUser) {
        managerName = managerUser.fullName || managerUser.username || 'Manager';
      }
    } else {
      // Current user is a manager/admin, get their full name
      const currentUser = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        select: { fullName: true, username: true },
      });
      if (currentUser) {
        managerName = currentUser.fullName || currentUser.username || 'Manager';
      }
    }

    res.json({
      success: true,
      data: { valid: true, managerName },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
