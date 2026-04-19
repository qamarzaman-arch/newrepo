import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../server';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { logger, sanitize } from '../utils/logger';

const router = Router();

// Validation schemas
const calculateCommissionSchema = z.object({
  userId: z.string(),
  startDate: z.string(),
  endDate: z.string(),
});

const setCommissionRateSchema = z.object({
  userId: z.string(),
  rate: z.number().min(0).max(100), // percentage
  type: z.enum(['DELIVERY', 'SALES', 'SERVICE']).default('DELIVERY'),
  effectiveFrom: z.string(),
  effectiveTo: z.string().optional(),
});

// Calculate commission for a user
router.post('/calculate', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = calculateCommissionSchema.parse(req.body);

    const user = await (prisma as any).user.findUnique({
      where: { id: data.userId },
      select: {
        id: true,
        fullName: true,
        role: true,
        commissionRates: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Get deliveries completed by this user
    const deliveries = await (prisma as any).delivery.findMany({
      where: {
        riderId: data.userId,
        status: 'DELIVERED',
        deliveredAt: {
          gte: new Date(data.startDate),
          lte: new Date(data.endDate),
        },
      },
      include: {
        order: {
          select: {
            totalAmount: true,
          },
        },
      },
    });

    // Get applicable commission rate
    const commissionRate = await (prisma as any).commissionRate.findFirst({
      where: {
        userId: data.userId,
        effectiveFrom: { lte: new Date(data.startDate) },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: new Date(data.endDate) } },
        ],
      },
      orderBy: { effectiveFrom: 'desc' },
    });

    const rate = commissionRate?.rate || 0;
    const totalDeliveries = deliveries.length;
    const totalOrderValue = deliveries.reduce((sum: number, d: any) => sum + (d.order?.totalAmount || 0), 0);
    const commissionAmount = (totalOrderValue * rate) / 100;

    res.json({
      success: true,
      data: {
        userId: data.userId,
        userName: user.fullName,
        period: { start: data.startDate, end: data.endDate },
        totalDeliveries,
        totalOrderValue,
        commissionRate: rate,
        commissionAmount,
        currency: 'USD',
      },
    });
  } catch (error) {
    next(error);
  }
});

// Set commission rate
router.post('/rate', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = setCommissionRateSchema.parse(req.body);

    const rate = await (prisma as any).commissionRate.create({
      data: {
        userId: data.userId,
        rate: data.rate,
        type: data.type,
        effectiveFrom: new Date(data.effectiveFrom),
        effectiveTo: data.effectiveTo ? new Date(data.effectiveTo) : null,
        createdById: req.user!.userId,
      },
    });

    logger.info(`Commission rate set for user ${sanitize(data.userId)}: ${data.rate}% by ${sanitize(req.user!.username)}`);

    res.status(201).json({
      success: true,
      data: { rate },
    });
  } catch (error) {
    next(error);
  }
});

// Get commission history
router.get('/history/:userId', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const { limit = '50', offset = '0' } = req.query;

    const history = await (prisma as any).commissionHistory.findMany({
      where: { userId },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      orderBy: { periodEnd: 'desc' },
    });

    const total = await (prisma as any).commissionHistory.count({ where: { userId } });

    res.json({
      success: true,
      data: { history, total },
    });
  } catch (error) {
    next(error);
  }
});

// Get commission report for all staff
router.get('/report', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      throw new AppError('Start date and end date are required', 400);
    }

    // Get all riders/staff with commission rates
    const users = await (prisma as any).user.findMany({
      where: {
        role: { in: ['RIDER', 'STAFF'] },
        isActive: true,
      },
      select: {
        id: true,
        fullName: true,
        role: true,
        commissionRates: {
          where: {
            effectiveFrom: { lte: new Date(endDate as string) },
            OR: [
              { effectiveTo: null },
              { effectiveTo: { gte: new Date(startDate as string) } },
            ],
          },
          take: 1,
          orderBy: { effectiveFrom: 'desc' },
        },
      },
    });

    // Calculate commissions for each user
    const report = await Promise.all(
      users.map(async (user: any) => {
        const deliveries = await (prisma as any).delivery.findMany({
          where: {
            riderId: user.id,
            status: 'DELIVERED',
            deliveredAt: {
              gte: new Date(startDate as string),
              lte: new Date(endDate as string),
            },
          },
          include: {
            order: { select: { totalAmount: true } },
          },
        });

        const rate = user.commissionRates[0]?.rate || 0;
        const totalOrderValue = deliveries.reduce((sum: number, d: any) => sum + (d.order?.totalAmount || 0), 0);
        const commissionAmount = (totalOrderValue * rate) / 100;

        return {
          userId: user.id,
          userName: user.fullName,
          role: user.role,
          totalDeliveries: deliveries.length,
          totalOrderValue,
          commissionRate: rate,
          commissionAmount,
        };
      })
    );

    const totalCommission = report.reduce((sum: number, r: any) => sum + r.commissionAmount, 0);

    res.json({
      success: true,
      data: {
        period: { start: startDate, end: endDate },
        totalCommission,
        report,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
