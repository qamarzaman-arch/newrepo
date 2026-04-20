import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = Router();

const openDrawerSchema = z.object({
  openingBalance: z.number().positive(),
  notes: z.string().optional(),
});

const closeDrawerSchema = z.object({
  closingBalance: z.number().positive(),
  expectedBalance: z.number().optional(),
  notes: z.string().optional(),
});

// Get current open cash drawer
router.get('/current', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const drawer = await (prisma as any).cashDrawer.findFirst({
      where: { status: 'open' },
      orderBy: { openedAt: 'desc' },
    });

    res.json({
      success: true,
      data: { drawer },
    });
  } catch (error) {
    next(error);
  }
});

// Get cash drawer history
router.get('/history', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { limit = '10', offset = '0' } = req.query;

    const drawers = await (prisma as any).cashDrawer.findMany({
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      orderBy: { openedAt: 'desc' },
    });

    const total = await prisma.cashDrawer.count();

    res.json({
      success: true,
      data: { drawers, total },
    });
  } catch (error) {
    next(error);
  }
});

// Open cash drawer (start shift)
router.post('/open', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { openingBalance } = openDrawerSchema.parse(req.body);

    // Check if there's already an open drawer
    const existingOpen = await (prisma as any).cashDrawer.findFirst({
      where: { status: 'open' },
    });

    if (existingOpen) {
      throw new AppError('A cash drawer is already open. Please close it first.', 400);
    }

    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const sessionNumber = `SHIFT-${dateStr}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

    const drawer = await (prisma as any).cashDrawer.create({
      data: {
        sessionNumber,
        openedById: req.user!.userId,
        openingBalance: openingBalance || 0,
        status: 'open',
      },
    });

    logger.info(`Cash drawer opened: ${sessionNumber} by ${req.user!.userId}`);

    res.status(201).json({
      success: true,
      data: { drawer },
    });
  } catch (error) {
    next(error);
  }
});

// Close cash drawer (end shift)
router.post('/:id/close', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { closingBalance, expectedBalance, notes } = closeDrawerSchema.parse(req.body);

    const drawer = await (prisma as any).cashDrawer.findUnique({
      where: { id: req.params.id },
    });

    if (!drawer) {
      throw new AppError('Cash drawer not found', 404);
    }

    if (drawer.status !== 'open') {
      throw new AppError('Cash drawer is already closed', 400);
    }

    const expectedBalanceNum = expectedBalance || drawer.openingBalance;
    const discrepancy = closingBalance - expectedBalanceNum;

    const updatedDrawer = await (prisma as any).cashDrawer.update({
      where: { id: req.params.id },
      data: {
        closedById: req.user!.userId,
        closingBalance,
        expectedBalance: expectedBalanceNum,
        discrepancy,
        closedAt: new Date(),
        closingNotes: notes || '',
        status: 'closed',
      },
    });

    logger.info(`Cash drawer closed: ${drawer.sessionNumber} by ${req.user!.userId} with discrepancy ${discrepancy}`);

    res.json({
      success: true,
      data: { drawer: updatedDrawer },
    });
  } catch (error) {
    next(error);
  }
});

// Update cash drawer with transaction
router.patch('/:id/transaction', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { type, amount } = req.body;

    const drawer = await (prisma as any).cashDrawer.findUnique({
      where: { id: req.params.id },
    });

    if (!drawer || drawer.status !== 'open') {
      throw new AppError('Cash drawer not found or not open', 404);
    }

    const amountNum = parseFloat(amount) || 0;
    const updateData: any = {
      transactionCount: { increment: 1 },
    };

    if (type === 'cash_in' || type === 'sale') {
      updateData.totalCashIn = { increment: amountNum };
      updateData.totalSales = { increment: amountNum };
    } else if (type === 'cash_out' || type === 'refund') {
      updateData.totalCashOut = { increment: amountNum };
    }

    const updatedDrawer = await (prisma as any).cashDrawer.update({
      where: { id: req.params.id },
      data: updateData,
    });

    res.json({
      success: true,
      data: { drawer: updatedDrawer },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
