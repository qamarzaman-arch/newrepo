import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { logger, sanitize } from '../utils/logger';

const router = Router();

// Validation schemas
const createScheduleSchema = z.object({
  userId: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  startTime: z.string().regex(/^\d{2}:\d{2}$/), // HH:MM
  endTime: z.string().regex(/^\d{2}:\d{2}$/), // HH:MM
  breakDuration: z.number().min(0).default(30), // minutes
  role: z.string().optional(),
  notes: z.string().optional(),
  isRecurring: z.boolean().default(false),
  recurrencePattern: z.enum(['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY']).optional(),
  recurrenceEndDate: z.string().optional(),
});

const updateScheduleSchema = createScheduleSchema.partial();

const swapRequestSchema = z.object({
  scheduleId: z.string(),
  targetUserId: z.string(),
  reason: z.string(),
});

// Get schedules for a date range
router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate, userId, role, page = '1', limit = '50' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    
    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      };
    }
    
    if (userId) {
      where.userId = userId as string;
    }

    if (role) {
      where.role = role as string;
    }

    const [schedules, total] = await Promise.all([
      (prisma as any).staffSchedule.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              username: true,
              role: true,
            },
          },
        },
        orderBy: [
          { date: 'asc' },
          { startTime: 'asc' },
        ],
        skip,
        take: limitNum,
      }),
      (prisma as any).staffSchedule.count({ where }),
    ]);

    res.json({
      success: true,
      data: { 
        schedules,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        }
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get single schedule
router.get('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const schedule = await (prisma as any).staffSchedule.findUnique({
      where: { id: req.params.id },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            username: true,
            role: true,
          },
        },
      },
    });

    if (!schedule) {
      throw new AppError('Schedule not found', 404);
    }

    res.json({
      success: true,
      data: { schedule },
    });
  } catch (error) {
    next(error);
  }
});

// Create schedule
router.post('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = createScheduleSchema.parse(req.body);

    // Check for conflicts
    const conflictingSchedule = await (prisma as any).staffSchedule.findFirst({
      where: {
        userId: data.userId,
        date: new Date(data.date),
        OR: [
          {
            AND: [
              { startTime: { lte: data.endTime } },
              { endTime: { gte: data.startTime } },
            ],
          },
        ],
      },
    });

    if (conflictingSchedule) {
      throw new AppError('Schedule conflict detected for this user', 409);
    }

    const schedule = await (prisma as any).staffSchedule.create({
      data: {
        ...data,
        date: new Date(data.date),
        createdById: req.user!.userId,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            username: true,
            role: true,
          },
        },
      },
    });

    logger.info(`Schedule created for user ${sanitize(data.userId)} on ${sanitize(data.date)} by ${sanitize(req.user!.username)}`);

    res.status(201).json({
      success: true,
      data: { schedule },
    });
  } catch (error) {
    next(error);
  }
});

// Update schedule
router.put('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = updateScheduleSchema.parse(req.body);

    const schedule = await (prisma as any).staffSchedule.update({
      where: { id: req.params.id },
      data,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            username: true,
            role: true,
          },
        },
      },
    });

    logger.info(`Schedule updated: ${sanitize(req.params.id)} by ${sanitize(req.user!.username)}`);

    res.json({
      success: true,
      data: { schedule },
    });
  } catch (error) {
    next(error);
  }
});

// Delete schedule
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await (prisma as any).staffSchedule.delete({
      where: { id: req.params.id },
    });

    logger.info(`Schedule deleted: ${sanitize(req.params.id)} by ${sanitize(req.user!.username)}`);

    res.json({
      success: true,
      message: 'Schedule deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

// Get schedule conflicts
router.get('/conflicts/check', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { userId, date, startTime, endTime, excludeScheduleId } = req.query;

    if (!userId || !date || !startTime || !endTime) {
      throw new AppError('Missing required parameters', 400);
    }

    const where: any = {
      userId: userId as string,
      date: new Date(date as string),
      OR: [
        {
          AND: [
            { startTime: { lte: endTime as string } },
            { endTime: { gte: startTime as string } },
          ],
        },
      ],
    };

    if (excludeScheduleId) {
      where.id = { not: excludeScheduleId as string };
    }

    const conflicts = await (prisma as any).staffSchedule.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: {
        hasConflict: conflicts.length > 0,
        conflicts,
      },
    });
  } catch (error) {
    next(error);
  }
});

// List swap requests (filter by user or status)
router.get('/swap-requests', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status, mine } = req.query;
    const where: any = {};
    if (status) where.status = status as string;
    if (mine === 'true') {
      where.OR = [
        { requesterId: req.user!.userId },
        { targetUserId: req.user!.userId },
      ];
    }

    const requests = await (prisma as any).shiftSwapRequest.findMany({
      where,
      include: {
        schedule: true,
        requester: { select: { id: true, fullName: true } },
        targetUser: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    res.json({ success: true, data: { requests } });
  } catch (error) {
    next(error);
  }
});

// Request shift swap
router.post('/swap-request', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = swapRequestSchema.parse(req.body);

    const swapRequest = await (prisma as any).shiftSwapRequest.create({
      data: {
        scheduleId: data.scheduleId,
        requesterId: req.user!.userId,
        targetUserId: data.targetUserId,
        reason: data.reason,
        status: 'PENDING',
      },
      include: {
        schedule: true,
        requester: {
          select: {
            id: true,
            fullName: true,
          },
        },
        targetUser: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    logger.info(`Shift swap requested by ${sanitize(req.user!.username)} for schedule ${sanitize(data.scheduleId)}`);

    res.status(201).json({
      success: true,
      data: { swapRequest },
    });
  } catch (error) {
    next(error);
  }
});

// Respond to swap request
router.post('/swap-request/:id/respond', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { accept, reason } = req.body;

    const swapRequest = await (prisma as any).shiftSwapRequest.findUnique({
      where: { id },
    });

    if (!swapRequest) {
      throw new AppError('Swap request not found', 404);
    }

    if (swapRequest.targetUserId !== req.user!.userId && req.user!.role !== 'MANAGER' && req.user!.role !== 'ADMIN') {
      throw new AppError('Not authorized to respond to this request', 403);
    }

    const updatedSwapRequest = await (prisma as any).shiftSwapRequest.update({
      where: { id },
      data: {
        status: accept ? 'APPROVED' : 'REJECTED',
        responseReason: reason,
        respondedAt: new Date(),
      },
    });

    // If accepted, swap the schedules
    if (accept) {
      await (prisma as any).staffSchedule.update({
        where: { id: swapRequest.scheduleId },
        data: {
          userId: swapRequest.targetUserId,
        },
      });
    }

    logger.info(`Shift swap ${accept ? 'approved' : 'rejected'} for request ${sanitize(id)} by ${sanitize(req.user!.username)}`);

    res.json({
      success: true,
      data: { swapRequest: updatedSwapRequest },
    });
  } catch (error) {
    next(error);
  }
});

// Get user's schedule
router.get('/my-schedule/:date', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { date } = req.params;
    const { range = 'week' } = req.query; // day, week, month

    const startDate = new Date(date);
    const endDate = new Date(startDate);

    if (range === 'day') {
      endDate.setDate(startDate.getDate() + 1);
    } else if (range === 'week') {
      endDate.setDate(startDate.getDate() + 7);
    } else if (range === 'month') {
      endDate.setMonth(startDate.getMonth() + 1);
    }

    const schedules = await (prisma as any).staffSchedule.findMany({
      where: {
        userId: req.user!.userId,
        date: {
          gte: startDate,
          lt: endDate,
        },
      },
      orderBy: { date: 'asc' },
    });

    res.json({
      success: true,
      data: { schedules },
    });
  } catch (error) {
    next(error);
  }
});

// Get schedule statistics
router.get('/stats/overview', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate, userId } = req.query;

    const where: any = {};
    
    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      };
    }

    if (userId) {
      where.userId = userId as string;
    }

    const schedules = await (prisma as any).staffSchedule.findMany({ where });

    // Calculate statistics
    const totalShifts = schedules.length;
    const totalHours = schedules.reduce((sum: number, s: any) => {
      const start = new Date(`2000-01-01T${s.startTime}`);
      const end = new Date(`2000-01-01T${s.endTime}`);
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      return sum + hours - (s.breakDuration / 60);
    }, 0);

    const roleBreakdown = schedules.reduce((acc: Record<string, number>, s: any) => {
      acc[s.role || 'Unspecified'] = (acc[s.role || 'Unspecified'] || 0) + 1;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        totalShifts,
        totalHours: Math.round(totalHours * 100) / 100,
        roleBreakdown,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
