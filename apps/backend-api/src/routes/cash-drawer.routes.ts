import { Router, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/error';
import logger from '../utils/logger';

const prisma = new PrismaClient();
const router = Router();

// Get current open cash drawer
router.get('/current', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const drawer = await prisma.cashDrawer.findFirst({
      where: { status: 'open' },
      orderBy: { openedAt: 'desc' },
      include: {
        openedBy: { select: { id: true, fullName: true, username: true } },
      },
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

    const drawers = await prisma.cashDrawer.findMany({
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      orderBy: { openedAt: 'desc' },
      include: {
        openedBy: { select: { id: true, fullName: true, username: true } },
        closedBy: { select: { id: true, fullName: true, username: true } },
      },
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
    const { openingBalance } = req.body;

    // Check if there's already an open drawer
    const existingOpen = await prisma.cashDrawer.findFirst({
      where: { status: 'open' },
    });

    if (existingOpen) {
      throw new AppError('A cash drawer is already open. Please close it first.', 400);
    }

    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const sessionNumber = `SHIFT-${dateStr}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

    const drawer = await prisma.cashDrawer.create({
      data: {
        sessionNumber,
        openedById: req.user!.id,
        openingBalance: openingBalance || 0,
        status: 'open',
      },
      include: {
        openedBy: { select: { id: true, fullName: true, username: true } },
      },
    });

    logger.info(`Cash drawer opened: ${sessionNumber} by ${req.user!.username}`);

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
    const { closingBalance, closingNotes, expectedBalance } = req.body;

    const drawer = await prisma.cashDrawer.findUnique({
      where: { id: req.params.id },
    });

    if (!drawer) {
      throw new AppError('Cash drawer not found', 404);
    }

    if (drawer.status !== 'open') {
      throw new AppError('Cash drawer is already closed', 400);
    }

    const closingBalanceNum = parseFloat(closingBalance) || 0;
    const expectedBalanceNum = parseFloat(expectedBalance) || drawer.openingBalance;
    const discrepancy = closingBalanceNum - expectedBalanceNum;

    const updatedDrawer = await prisma.cashDrawer.update({
      where: { id: req.params.id },
      data: {
        closedById: req.user!.id,
        closingBalance: closingBalanceNum,
        expectedBalance: expectedBalanceNum,
        discrepancy,
        closedAt: new Date(),
        closingNotes: closingNotes || '',
        status: 'closed',
      },
      include: {
        openedBy: { select: { id: true, fullName: true, username: true } },
        closedBy: { select: { id: true, fullName: true, username: true } },
      },
    });

    logger.info(`Cash drawer closed: ${drawer.sessionNumber} by ${req.user!.username} with discrepancy ${discrepancy}`);

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

    const drawer = await prisma.cashDrawer.findUnique({
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

    const updatedDrawer = await prisma.cashDrawer.update({
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
