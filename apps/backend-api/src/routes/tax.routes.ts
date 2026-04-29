import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { prisma } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { parsePagination } from '../utils/parsePagination';

const router = Router();

async function generateInvoiceNumber(authority: string): Promise<string> {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const datePrefix = `${yyyy}${mm}${dd}`;
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  const count = await prisma.taxFiling.count({
    where: { authority, createdAt: { gte: startOfDay, lte: endOfDay } },
  });
  return `${authority}-${datePrefix}-${String(count + 1).padStart(4, '0')}`;
}

router.get('/', authenticate, authorize('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page, limit } = parsePagination(req.query);
    const { authority, status, branchId } = req.query;
    const where: any = {};
    if (authority) where.authority = String(authority);
    if (status) where.status = String(status);
    if (branchId) where.branchId = String(branchId);
    const [filings, total] = await Promise.all([
      prisma.taxFiling.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { order: { select: { id: true, orderNumber: true } } },
      }),
      prisma.taxFiling.count({ where }),
    ]);
    res.json({
      success: true,
      data: { filings, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/summary', authenticate, authorize('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { from, to, branchId } = req.query;
    const where: any = {};
    if (branchId) where.branchId = String(branchId);
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(String(from));
      if (to) where.createdAt.lte = new Date(String(to));
    }
    const grouped = await prisma.taxFiling.groupBy({
      by: ['authority', 'status'],
      where,
      _sum: { amount: true, taxAmount: true },
      _count: { id: true },
    });
    res.json({ success: true, data: { summary: grouped } });
  } catch (error) {
    next(error);
  }
});

router.post('/submit/:orderId', authenticate, authorize('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { authority } = z.object({ authority: z.enum(['FBR', 'PRA', 'SRB']) }).parse(req.body);
    const order = await prisma.order.findUnique({ where: { id: req.params.orderId } });
    if (!order) throw new AppError('Order not found', 404);

    const existing = await prisma.taxFiling.findUnique({ where: { orderId: order.id } });
    if (existing) throw new AppError('Tax filing already exists for this order', 400);

    const invoiceNumber = await generateInvoiceNumber(authority);
    const filing = await prisma.taxFiling.create({
      data: {
        authority,
        invoiceNumber,
        orderId: order.id,
        amount: order.totalAmount,
        taxAmount: order.taxAmount,
        status: 'SUBMITTED',
        submittedAt: new Date(),
        fbrInvoiceNumber: `MOCK-${randomUUID()}`,
        branchId: order.branchId || undefined,
        responseBody: { mocked: true, submittedAt: new Date().toISOString() } as any,
      },
    });
    res.status(201).json({ success: true, data: { filing } });
  } catch (error) {
    next(error);
  }
});

router.post('/retry/:id', authenticate, authorize('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const filing = await prisma.taxFiling.findUnique({ where: { id: req.params.id } });
    if (!filing) throw new AppError('Tax filing not found', 404);
    if (filing.status === 'ACCEPTED') throw new AppError('Already accepted', 400);

    const updated = await prisma.taxFiling.update({
      where: { id: filing.id },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
        fbrInvoiceNumber: filing.fbrInvoiceNumber || `MOCK-${randomUUID()}`,
        errorMessage: null,
        responseBody: { mocked: true, retriedAt: new Date().toISOString() } as any,
      },
    });
    res.json({ success: true, data: { filing: updated } });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', authenticate, authorize('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const filing = await prisma.taxFiling.findUnique({
      where: { id: req.params.id },
      include: { order: true, branch: true },
    });
    if (!filing) throw new AppError('Tax filing not found', 404);
    res.json({ success: true, data: { filing } });
  } catch (error) {
    next(error);
  }
});

export default router;
