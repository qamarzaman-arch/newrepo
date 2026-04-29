import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = Router();

const foodpandaWebhookSchema = z.object({
  externalId: z.string().min(1),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  deliveryAddress: z.string().optional(),
  items: z.array(z.any()).optional(),
  totalAmount: z.number().min(0).default(0),
  branchCode: z.string().optional(),
});

// Public webhook with shared-secret header check
router.post('/webhook/foodpanda', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const expected = process.env.FOODPANDA_WEBHOOK_SECRET || 'dev-foodpanda-secret';
    const provided = req.header('x-foodpanda-secret');
    if (provided !== expected) {
      return res.status(401).json({ success: false, error: 'Invalid webhook secret' });
    }

    const data = foodpandaWebhookSchema.parse(req.body);

    let branchId: string | undefined;
    if (data.branchCode) {
      const branch = await prisma.branch.findUnique({ where: { code: data.branchCode } });
      if (branch) branchId = branch.id;
    }

    const existing = await prisma.externalPlatformOrder.findUnique({
      where: { platform_externalId: { platform: 'FOODPANDA', externalId: data.externalId } },
    });
    if (existing) {
      return res.json({ success: true, data: { externalOrder: existing, duplicate: true } });
    }

    const externalOrder = await prisma.externalPlatformOrder.create({
      data: {
        platform: 'FOODPANDA',
        externalId: data.externalId,
        rawPayload: req.body as any,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        deliveryAddress: data.deliveryAddress,
        totalAmount: data.totalAmount,
        status: 'RECEIVED',
        branchId,
      },
    });
    logger.info(`Foodpanda webhook received: ${externalOrder.id}`);
    res.status(200).json({ success: true, data: { externalOrder } });
  } catch (error) {
    next(error);
  }
});

router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { platform, status } = req.query;
    const where: any = {};
    if (platform) where.platform = String(platform);
    if (status) where.status = String(status);
    const orders = await prisma.externalPlatformOrder.findMany({
      where,
      orderBy: { receivedAt: 'desc' },
      include: { branch: { select: { id: true, name: true } } },
    });
    res.json({ success: true, data: { orders } });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const externalOrder = await prisma.externalPlatformOrder.findUnique({
      where: { id: req.params.id },
      include: { order: true, branch: true },
    });
    if (!externalOrder) throw new AppError('External order not found', 404);
    res.json({ success: true, data: { externalOrder } });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/accept', authenticate, authorize('CASHIER', 'MANAGER', 'ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const externalOrder = await prisma.externalPlatformOrder.findUnique({ where: { id: req.params.id } });
    if (!externalOrder) throw new AppError('External order not found', 404);
    if (externalOrder.status !== 'RECEIVED') throw new AppError(`Cannot accept order in status ${externalOrder.status}`, 400);

    const result = await prisma.$transaction(async (tx) => {
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
      const startOfDay = new Date(today);
      startOfDay.setHours(0, 0, 0, 0);
      const count = await tx.order.count({ where: { createdAt: { gte: startOfDay } } });
      const orderNumber = `ORD-${dateStr}-${String(count + 1).padStart(4, '0')}`;

      const order = await tx.order.create({
        data: {
          orderNumber,
          orderType: 'DELIVERY',
          status: 'CONFIRMED',
          customerName: externalOrder.customerName,
          customerPhone: externalOrder.customerPhone,
          subtotal: externalOrder.totalAmount,
          totalAmount: externalOrder.totalAmount,
          cashierId: req.user!.userId,
          branchId: externalOrder.branchId,
          externalSource: externalOrder.platform,
          confirmedAt: new Date(),
        },
      });

      const updatedExternal = await tx.externalPlatformOrder.update({
        where: { id: externalOrder.id },
        data: {
          orderId: order.id,
          status: 'ACCEPTED',
          acceptedAt: new Date(),
        },
      });

      return { order, externalOrder: updatedExternal };
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/reject', authenticate, authorize('CASHIER', 'MANAGER', 'ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { reason } = z.object({ reason: z.string().optional() }).parse(req.body);
    const externalOrder = await prisma.externalPlatformOrder.update({
      where: { id: req.params.id },
      data: { status: 'REJECTED', errorMessage: reason || 'Rejected' },
    });
    res.json({ success: true, data: { externalOrder } });
  } catch (error) {
    next(error);
  }
});

export default router;
