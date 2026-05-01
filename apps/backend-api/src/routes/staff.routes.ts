import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { logger, sanitize } from '../utils/logger';
import { PIN_BCRYPT_ROUNDS } from '../config/constants';

const router = Router();

// QA-Report #13: shared password-complexity rule applied on BOTH create and
// update so the update path can't sneak in a weak password.
const PASSWORD_COMPLEXITY = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[0-9]/, 'Password must contain a number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain a special character');

const PIN_FORMAT = z.string().regex(/^\d{4,6}$/, 'PIN must be 4–6 digits');

// Validation schemas
const createStaffSchema = z.object({
  username: z.string().min(3),
  fullName: z.string().min(1),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  role: z.enum(['STAFF', 'CASHIER', 'MANAGER', 'KITCHEN', 'RIDER', 'ADMIN']),
  pin: PIN_FORMAT.optional(),
  password: PASSWORD_COMPLEXITY.optional(),
});

const updateStaffSchema = z.object({
  username: z.string().min(3).optional(),
  fullName: z.string().min(1).optional(),
  email: z.string().email().optional().or(z.literal('')).optional(),
  phone: z.string().optional(),
  role: z.enum(['STAFF', 'CASHIER', 'MANAGER', 'KITCHEN', 'RIDER', 'ADMIN']).optional(),
  pin: PIN_FORMAT.optional(),
  password: PASSWORD_COMPLEXITY.optional(),
  isActive: z.boolean().optional(),
});

// QA-Report #16: tighten shift schema — userId must be a UUID, dates ISO 8601,
// startTime "HH:mm" 24-hr.
const createShiftSchema = z.object({
  userId: z.string().uuid(),
  shiftDate: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'shiftDate must be ISO YYYY-MM-DD'),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'startTime must be HH:mm'),
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
      passwordHash = await bcrypt.hash(validatedData.password, 12);
    }

    // Hash PIN if provided (required for CASHIER, MANAGER, RIDER)
    let pinHash: string | undefined;
    if (validatedData.pin) {
      pinHash = await bcrypt.hash(validatedData.pin, PIN_BCRYPT_ROUNDS);
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
      passwordHash = await bcrypt.hash(data.password, 12);
    }

    // Hash PIN if provided
    let pinHash: string | undefined;
    if (data.pin) {
      pinHash = await bcrypt.hash(data.pin, PIN_BCRYPT_ROUNDS);
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
// QA-Report #8/#9: validate `days` (1–365) so days=999999 can't pin the DB,
// and paginate so a heavy user with thousands of records doesn't OOM.
const performanceQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
router.get('/:id/performance', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { days, page, limit } = performanceQuerySchema.parse(req.query);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [performances, total] = await Promise.all([
      prisma.staffPerformance.findMany({
        where: { userId: req.params.id, date: { gte: startDate } },
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.staffPerformance.count({
        where: { userId: req.params.id, date: { gte: startDate } },
      }),
    ]);

    res.json({
      success: true,
      data: {
        performances,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    });
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
