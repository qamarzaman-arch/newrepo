import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { logger, sanitize } from '../utils/logger';

const router = Router();

const createUserSchema = z.object({
  username: z.string().min(3),
  email: z.string().email().optional(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  fullName: z.string().min(1),
  role: z.enum(['ADMIN', 'MANAGER', 'CASHIER', 'STAFF', 'KITCHEN', 'RIDER']),
  pin: z.string().length(4).optional(),
  phone: z.string().optional(),
});

// Get users
router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { role, page = '1', limit = '20', search } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = { isActive: true };
    if (role) where.role = role;
    if (search) {
      where.OR = [
        { fullName: { contains: search as string, mode: 'insensitive' } },
        { username: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, username: true, email: true, fullName: true, role: true, phone: true, avatar: true, isActive: true, lastLoginAt: true,
        },
        orderBy: { fullName: 'asc' },
        skip,
        take: limitNum,
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ 
      success: true, 
      data: { 
        users,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        }
      } 
    });
  } catch (error) {
    next(error);
  }
});

// Get single user
router.get('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, username: true, email: true, fullName: true, role: true, phone: true, avatar: true, isActive: true, lastLoginAt: true, createdAt: true,
      },
    });

    if (!user) throw new AppError('User not found', 404);
    res.json({ success: true, data: { user } });
  } catch (error) {
    next(error);
  }
});

// Create user (Admin/Manager only)
router.post('/', authenticate, authorize('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = createUserSchema.parse(req.body);

    // Check for duplicate username or email
    const existing = await prisma.user.findFirst({
      where: { OR: [{ username: data.username }, ...(data.email ? [{ email: data.email }] : [])] },
    });

    if (existing) {
      throw new AppError('Username or email already exists', 409);
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        username: data.username,
        email: data.email,
        passwordHash,
        fullName: data.fullName,
        role: data.role,
        pin: data.pin,
        phone: data.phone,
      },
      select: {
        id: true, username: true, email: true, fullName: true, role: true, phone: true, avatar: true, isActive: true,
      },
    });

    logger.info(`User created: ${sanitize(user.username)} by ${sanitize(req.user!.username)}`);
    res.status(201).json({ success: true, data: { user } });
  } catch (error) {
    next(error);
  }
});

// Update user (Admin/Manager only)
router.put('/:id', authenticate, authorize('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { fullName, email, phone, role, isActive } = req.body;

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { fullName, email, phone, role, isActive },
      select: {
        id: true, username: true, email: true, fullName: true, role: true, phone: true, avatar: true, isActive: true,
      },
    });

    res.json({ success: true, data: { user } });
  } catch (error) {
    next(error);
  }
});

// Reset password
router.patch('/:id/reset-password', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      throw new AppError('Password must be at least 6 characters', 400);
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: req.params.id },
      data: { passwordHash },
    });

    logger.info(`Password reset for user ${sanitize(req.params.id)} by ${sanitize(req.user!.username)}`);
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    next(error);
  }
});

// Set/change PIN
router.patch('/:id/pin', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { pin } = req.body;

    if (!pin || pin.length !== 4) {
      throw new AppError('PIN must be 4 digits', 400);
    }

    const pinHash = await bcrypt.hash(pin, 12);

    await prisma.user.update({
      where: { id: req.params.id },
      data: { pin: pinHash },
    });

    res.json({ success: true, message: 'PIN updated successfully' });
  } catch (error) {
    next(error);
  }
});

// Delete user (deactivate) (Admin/Manager only)
router.delete('/:id', authenticate, authorize('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });

    res.json({ success: true, message: 'User deactivated' });
  } catch (error) {
    next(error);
  }
});

export default router;
