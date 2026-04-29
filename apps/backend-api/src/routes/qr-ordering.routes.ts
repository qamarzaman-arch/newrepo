import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { prisma } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

const createSessionSchema = z.object({
  tableId: z.string().uuid().optional().nullable(),
  branchId: z.string().uuid().optional().nullable(),
});

const placeOrderSchema = z.object({
  customerName: z.string().min(1),
  customerPhone: z.string().optional().nullable(),
  items: z.array(z.object({
    menuItemId: z.string().uuid(),
    quantity: z.number().int().min(1),
    notes: z.string().optional().nullable(),
  })).min(1),
});

async function getActiveSessionByToken(token: string) {
  const session = await prisma.qrSession.findUnique({
    where: { token },
    include: {
      table: { select: { id: true, number: true } },
      branch: { select: { id: true, name: true } },
    },
  });
  if (!session) return null;
  if (session.status !== 'ACTIVE' && session.status !== 'ORDERED') return null;
  if (session.expiresAt < new Date()) return null;
  return session;
}

// ===== PUBLIC =====
router.post('/sessions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createSessionSchema.parse(req.body);
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const session = await prisma.qrSession.create({
      data: {
        token,
        tableId: data.tableId || undefined,
        branchId: data.branchId || undefined,
        status: 'ACTIVE',
        expiresAt,
      },
    });
    res.status(201).json({ success: true, data: { token: session.token, expiresAt: session.expiresAt } });
  } catch (error) {
    next(error);
  }
});

router.get('/sessions/:token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const session = await getActiveSessionByToken(req.params.token);
    if (!session) throw new AppError('Session not found or expired', 404);
    res.json({ success: true, data: { session } });
  } catch (error) {
    next(error);
  }
});

router.get('/menu/:token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const session = await getActiveSessionByToken(req.params.token);
    if (!session) throw new AppError('Session not found or expired', 404);

    const categories = await prisma.menuCategory.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
      include: {
        items: {
          where: { isActive: true, isAvailable: true },
          orderBy: { displayOrder: 'asc' },
        },
      },
    });
    res.json({ success: true, data: { categories } });
  } catch (error) {
    next(error);
  }
});

router.post('/orders/:token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const session = await getActiveSessionByToken(req.params.token);
    if (!session) throw new AppError('Session not found or expired', 404);

    const data = placeOrderSchema.parse(req.body);

    // Need a system cashier for the cashierId FK. Use the first ADMIN user as default.
    const systemUser = await prisma.user.findFirst({ where: { role: 'ADMIN', isActive: true } });
    if (!systemUser) throw new AppError('No system user available to handle QR order', 500);

    const menuItemIds = data.items.map((i) => i.menuItemId);
    const menuItems = await prisma.menuItem.findMany({ where: { id: { in: menuItemIds } } });
    const menuMap = new Map(menuItems.map((m) => [m.id, m]));
    for (const it of data.items) {
      if (!menuMap.has(it.menuItemId)) throw new AppError(`Menu item ${it.menuItemId} not found`, 400);
    }

    let subtotal = 0;
    let taxAmount = 0;
    const orderItemsData = data.items.map((it) => {
      const m = menuMap.get(it.menuItemId)!;
      const lineTotal = m.price * it.quantity;
      subtotal += lineTotal;
      taxAmount += lineTotal * (m.taxRate || 0);
      return {
        menuItemId: m.id,
        quantity: it.quantity,
        unitPrice: m.price,
        totalPrice: lineTotal,
        notes: it.notes || undefined,
      };
    });
    const totalAmount = subtotal + taxAmount;

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
          orderType: 'DINE_IN',
          status: 'PENDING',
          customerName: data.customerName,
          customerPhone: data.customerPhone || undefined,
          subtotal,
          taxAmount,
          totalAmount,
          cashierId: systemUser.id,
          tableId: session.tableId || undefined,
          branchId: session.branchId || undefined,
          qrSessionId: session.id,
          externalSource: 'QR',
          items: { create: orderItemsData },
        },
        include: { items: true },
      });

      await tx.qrSession.update({
        where: { id: session.id },
        data: { status: 'ORDERED' },
      });

      return order;
    });

    res.status(201).json({
      success: true,
      data: { orderNumber: result.orderNumber, totalAmount: result.totalAmount },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/orders/:token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const session = await prisma.qrSession.findUnique({ where: { token: req.params.token } });
    if (!session) throw new AppError('Session not found', 404);
    const orders = await prisma.order.findMany({
      where: { qrSessionId: session.id },
      include: { items: { include: { menuItem: { select: { name: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: { orders } });
  } catch (error) {
    next(error);
  }
});

// ===== ADMIN =====
router.get('/admin/sessions', authenticate, authorize('MANAGER', 'ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const sessions = await prisma.qrSession.findMany({
      orderBy: { startedAt: 'desc' },
      take: 200,
      include: {
        table: { select: { id: true, number: true } },
        branch: { select: { id: true, name: true } },
      },
    });
    res.json({ success: true, data: { sessions } });
  } catch (error) {
    next(error);
  }
});

router.post('/admin/expire/:id', authenticate, authorize('MANAGER', 'ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const session = await prisma.qrSession.update({
      where: { id: req.params.id },
      data: { status: 'CLOSED', closedAt: new Date() },
    });
    res.json({ success: true, data: { session } });
  } catch (error) {
    next(error);
  }
});

export default router;
