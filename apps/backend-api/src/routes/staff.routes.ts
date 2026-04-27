import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { logger, sanitize } from '../utils/logger';

const router = Router();

// Validation schemas
const createStaffSchema = z.object({
  username: z.string().min(3),
  fullName: z.string().min(1),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  role: z.enum(['STAFF', 'CASHIER', 'MANAGER', 'KITCHEN', 'RIDER', 'ADMIN']),
  pin: z.string().optional(),
  password: z.string().optional(),
});

const updateStaffSchema = z.object({
  username: z.string().min(3).optional(),
  fullName: z.string().min(1).optional(),
  email: z.string().email().optional().or(z.literal('')).optional(),
  phone: z.string().optional(),
  role: z.enum(['STAFF', 'CASHIER', 'MANAGER', 'KITCHEN', 'RIDER', 'ADMIN']).optional(),
  pin: z.string().optional(),
  password: z.string().optional(),
  isActive: z.boolean().optional(),
});

const createShiftSchema = z.object({
  userId: z.string(),
  shiftDate: z.string(),
  startTime: z.string(),
});

const updateShiftSchema = z.object({
  endTime: z.string(),
});

// Create staff
router.post('/', authenticate, authorize('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const validatedData = createStaffSchema.parse(req.body);

    // Check for duplicate username
    const existing = await prisma.user.findUnique({
      where: { username: validatedData.username },
    });

    if (existing) {
      throw new AppError('Username already exists', 409);
    }

    // Hash password if provided (required for CASHIER, MANAGER, RIDER)
    let passwordHash: string | undefined;
    if (validatedData.password) {
      passwordHash = await bcrypt.hash(validatedData.password, 10);
    }

    // Hash PIN if provided (required for CASHIER, MANAGER, RIDER)
    let pinHash: string | undefined;
    if (validatedData.pin) {
      pinHash = await bcrypt.hash(validatedData.pin, 10);
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        username: validatedData.username,
        fullName: validatedData.fullName,
        email: validatedData.email,
        phone: validatedData.phone,
        role: validatedData.role,
        passwordHash,
        pin: pinHash,
      },
    });

    logger.info(`Staff created: ${sanitize(validatedData.username)} with role ${validatedData.role} by ${sanitize(req.user!.username)}`);

    res.status(201).json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
});

// Update staff
router.put('/:id', authenticate, authorize('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = updateStaffSchema.parse(req.body);

    // Check for duplicate username if updating username
    if (data.username) {
      const existing = await prisma.user.findFirst({
        where: {
          id: { not: req.params.id },
          username: data.username,
        },
      });

      if (existing) {
        throw new AppError('Username already exists', 409);
      }
    }

    // Hash password if provided
    let passwordHash: string | undefined;
    if (data.password) {
      passwordHash = await bcrypt.hash(data.password, 10);
    }

    // Hash PIN if provided
    let pinHash: string | undefined;
    if (data.pin) {
      pinHash = await bcrypt.hash(data.pin, 10);
    }

    // Update user
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        ...(data.username && { username: data.username }),
        ...(data.fullName && { fullName: data.fullName }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.role && { role: data.role }),
        ...(passwordHash && { passwordHash }),
        ...(pinHash && { pin: pinHash }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    logger.info(`Staff updated: ${sanitize(data.username || req.params.id)} by ${sanitize(req.user!.username)}`);

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
});

// Delete staff (soft delete)
router.delete('/:id', authenticate, authorize('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });

    logger.info(`Staff deactivated: ${sanitize(req.params.id)} by ${sanitize(req.user!.username)}`);

    res.json({
      success: true,
      message: 'Staff deactivated',
    });
  } catch (error) {
    next(error);
  }
});

// Get active shifts — MUST be before /:id route to avoid param conflict
router.get('/active-shifts', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const shifts = await prisma.shift.findMany({
      where: { status: 'OPEN' },
      include: {
        user: { select: { id: true, fullName: true, role: true } },
      },
      orderBy: { clockedInAt: 'asc' },
    });
    res.json({ success: true, data: { shifts } });
  } catch (error) {
    next(error);
  }
});

// Get all staff
router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const users = await prisma.user.findMany({
      where: { isActive: true, role: { in: ['STAFF', 'KITCHEN', 'CASHIER', 'MANAGER', 'RIDER', 'ADMIN'] } },
      select: {
        id: true, username: true, fullName: true, role: true, email: true, phone: true, isActive: true,
      },
      orderBy: { fullName: 'asc' },
    });
    res.json({ success: true, data: { staff: users } });
  } catch (error) {
    next(error);
  }
});

// Get single staff
router.get('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, username: true, fullName: true, role: true, email: true, phone: true, avatar: true, isActive: true,
      },
    });
    if (!user) throw new AppError('User not found', 404);
    res.json({ success: true, data: { user } });
  } catch (error) {
    next(error);
  }
});

// Get staff shifts
router.get('/:id/shifts', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const shifts = await prisma.shift.findMany({
      where: { userId: req.params.id },
      orderBy: { clockedInAt: 'desc' },
      take: 30,
    });
    res.json({ success: true, data: { shifts } });
  } catch (error) {
    next(error);
  }
});

// Clock in/out
router.post('/:id/shift', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { action } = req.body; // 'clock-in' or 'clock-out'

    if (action === 'clock-in') {
      const today = new Date().toISOString().split('T')[0];
      const count = await prisma.shift.count({
        where: { clockedInAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
      });
      const shiftNumber = `SH-${today}-${String(count + 1).padStart(3, '0')}`;

      const shift = await prisma.shift.create({
        data: { userId: req.params.id, shiftNumber, status: 'OPEN' },
      });

      logger.info(`Staff ${sanitize(req.params.id)} clocked in by ${sanitize(req.user!.username)}`);
      res.status(201).json({ success: true, data: { shift } });
    } else if (action === 'clock-out') {
      const openShift = await prisma.shift.findFirst({
        where: { userId: req.params.id, status: 'OPEN' },
        orderBy: { clockedInAt: 'desc' },
      });

      if (!openShift) throw new AppError('No open shift found', 404);

      const shift = await prisma.shift.update({
        where: { id: openShift.id },
        data: { clockedOutAt: new Date(), status: 'CLOSED' },
      });

      logger.info(`Staff ${sanitize(req.params.id)} clocked out by ${sanitize(req.user!.username)}`);
      res.json({ success: true, data: { shift } });
    } else {
      throw new AppError('Invalid action. Use clock-in or clock-out', 400);
    }
  } catch (error) {
    next(error);
  }
});

// Get staff performance
router.get('/:id/performance', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days as string));

    const performances = await prisma.staffPerformance.findMany({
      where: { userId: req.params.id, date: { gte: startDate } },
      orderBy: { date: 'desc' },
    });

    res.json({ success: true, data: { performances } });
  } catch (error) {
    next(error);
  }
});

// Create shift (for attendance marking)
router.post('/shifts', authenticate, authorize('ADMIN', 'MANAGER', 'CASHIER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const validatedData = createShiftSchema.parse(req.body);

    const today = new Date().toISOString().split('T')[0];
    const count = await prisma.shift.count({
      where: {
        clockedInAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    });
    const shiftNumber = `SH-${today}-${String(count + 1).padStart(3, '0')}`;

    const shift = await prisma.shift.create({
      data: {
        userId: validatedData.userId,
        shiftNumber,
        status: 'OPEN',
        clockedInAt: new Date(validatedData.startTime),
      },
    });

    logger.info(`Shift created for user ${sanitize(validatedData.userId)} by ${sanitize(req.user!.username)}`);
    res.status(201).json({ success: true, data: { shift } });
  } catch (error) {
    next(error);
  }
});

// Update shift (for ending shift)
router.patch('/shifts/:id', authenticate, authorize('ADMIN', 'MANAGER', 'CASHIER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const validatedData = updateShiftSchema.parse(req.body);

    const shift = await prisma.shift.update({
      where: { id: req.params.id },
      data: {
        clockedOutAt: new Date(validatedData.endTime),
        status: 'CLOSED',
      },
    });

    logger.info(`Shift ${sanitize(req.params.id)} ended by ${sanitize(req.user!.username)}`);
    res.json({ success: true, data: { shift } });
  } catch (error) {
    next(error);
  }
});

export default router;
