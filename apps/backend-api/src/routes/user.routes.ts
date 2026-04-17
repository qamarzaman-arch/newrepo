import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../server';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = Router();

const createUserSchema = z.object({
  username: z.string().min(3),
  email: z.string().email().optional(),
  password: z.string().min(6),
  fullName: z.string().min(1),
  role: z.enum(['ADMIN', 'MANAGER', 'CASHIER', 'STAFF', 'KITCHEN', 'RIDER']),
  pin: z.string().length(4).optional(),
  phone: z.string().optional(),
});

// Get users
router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { role } = req.query;
    const where: any = { isActive: true };
    if (role) where.role = role;

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true, username: true, email: true, fullName: true, role: true, phone: true, avatar: true, isActive: true, lastLoginAt: true,
      },
      orderBy: { fullName: 'asc' },
    });

    res.json({ success: true, data: { users } });
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

// Create user
router.post('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
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

    logger.info(`User created: ${user.username} by ${req.user!.username}`);
    res.status(201).json({ success: true, data: { user } });
  } catch (error) {
    next(error);
  }
});

// Update user
router.put('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
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

    logger.info(`Password reset for user ${req.params.id} by ${req.user!.username}`);
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

    await prisma.user.update({
      where: { id: req.params.id },
      data: { pin },
    });

    res.json({ success: true, message: 'PIN updated successfully' });
  } catch (error) {
    next(error);
  }
});

// Delete user (deactivate)
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
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
