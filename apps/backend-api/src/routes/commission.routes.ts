import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { logger, sanitize } from '../utils/logger';

const router = Router();

const SETTING_KEY = 'commission_rates';

const calculateCommissionSchema = z.object({
  userId: z.string(),
  startDate: z.string(),
  endDate: z.string(),
});

const setCommissionRateSchema = z.object({
  userId: z.string(),
  rate: z.number().min(0).max(100),
  type: z.enum(['DELIVERY', 'SALES', 'SERVICE']).default('DELIVERY'),
  effectiveFrom: z.string(),
  effectiveTo: z.string().optional(),
});

interface RateRecord {
  userId: string;
  rate: number;
  type: 'DELIVERY' | 'SALES' | 'SERVICE';
  effectiveFrom: string;
  effectiveTo?: string;
  createdById: string;
  createdAt: string;
}

async function loadRates(): Promise<RateRecord[]> {
  const setting = await prisma.setting.findUnique({ where: { key: SETTING_KEY } });
  if (!setting?.value) return [];
  try {
    const parsed = JSON.parse(setting.value as unknown as string);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveRates(rates: RateRecord[]): Promise<void> {
  await prisma.setting.upsert({
    where: { key: SETTING_KEY },
    create: { key: SETTING_KEY, value: JSON.stringify(rates), category: 'finance' },
    update: { value: JSON.stringify(rates) },
  });
}

function findRateForPeriod(rates: RateRecord[], userId: string, start: Date, end: Date): number {
  const candidates = rates
    .filter((r) => r.userId === userId)
    .filter((r) => new Date(r.effectiveFrom) <= start)
    .filter((r) => !r.effectiveTo || new Date(r.effectiveTo) >= end)
    .sort((a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime());
  return candidates[0]?.rate ?? 0;
}

router.post('/calculate', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = calculateCommissionSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { id: true, fullName: true, role: true },
    });
    if (!user) throw new AppError('User not found', 404);

    const start = new Date(data.startDate);
    const end = new Date(data.endDate);

    const deliveries = await prisma.delivery.findMany({
      where: {
        riderId: data.userId,
        status: 'DELIVERED',
        deliveredAt: { gte: start, lte: end },
      },
      include: { order: { select: { totalAmount: true } } },
    });

    const rates = await loadRates();
    const rate = findRateForPeriod(rates, data.userId, start, end);
    const totalDeliveries = deliveries.length;
    const totalOrderValue = deliveries.reduce(
      (sum, d) => sum + Number(d.order?.totalAmount ?? 0),
      0
    );
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
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/rate', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = setCommissionRateSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: data.userId }, select: { id: true } });
    if (!user) throw new AppError('User not found', 404);

    const rates = await loadRates();
    const newRecord: RateRecord = {
      userId: data.userId,
      rate: data.rate,
      type: data.type,
      effectiveFrom: data.effectiveFrom,
      effectiveTo: data.effectiveTo,
      createdById: req.user!.userId,
      createdAt: new Date().toISOString(),
    };
    rates.push(newRecord);
    await saveRates(rates);

    logger.info(`Commission rate set for user ${sanitize(data.userId)}: ${data.rate}% by ${sanitize(req.user!.username)}`);

    res.status(201).json({ success: true, data: { rate: newRecord } });
  } catch (error) {
    next(error);
  }
});

router.get('/history/:userId', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const rates = await loadRates();
    const history = rates
      .filter((r) => r.userId === userId)
      .sort((a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime());

    res.json({ success: true, data: { history, total: history.length } });
  } catch (error) {
    next(error);
  }
});

router.get('/report', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      throw new AppError('Start date and end date are required', 400);
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    const users = await prisma.user.findMany({
      where: {
        role: { in: ['RIDER', 'STAFF', 'CASHIER', 'MANAGER'] as any },
        isActive: true,
      },
      select: { id: true, fullName: true, role: true },
    });

    const rates = await loadRates();

    const report = await Promise.all(
      users.map(async (user) => {
        const deliveries = await prisma.delivery.findMany({
          where: {
            riderId: user.id,
            status: 'DELIVERED',
            deliveredAt: { gte: start, lte: end },
          },
          include: { order: { select: { totalAmount: true } } },
        });

        const rate = findRateForPeriod(rates, user.id, start, end);
        const totalOrderValue = deliveries.reduce(
          (sum, d) => sum + Number(d.order?.totalAmount ?? 0),
          0
        );
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

    const totalCommission = report.reduce((sum, r) => sum + r.commissionAmount, 0);

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
