import { Router, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { logger, sanitize } from '../utils/logger';

const router = Router();

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
      where: { isActive: true, role: { in: ['STAFF', 'KITCHEN', 'CASHIER', 'MANAGER'] } },
      select: {
        id: true, username: true, fullName: true, role: true, email: true, phone: true, isActive: true,
      },
      orderBy: { fullName: 'asc' },
    });
    res.json({ success: true, data: { users } });
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

export default router;
