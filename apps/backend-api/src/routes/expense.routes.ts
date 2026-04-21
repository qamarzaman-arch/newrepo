import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../server';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { logger, sanitize } from '../utils/logger';
import { AuditLogService } from '../services/auditLog.service';

const router = Router();

const createExpenseSchema = z.object({
  category: z.string().min(1),
  description: z.string().min(1),
  amount: z.number().positive(),
  paymentMethod: z.string().optional(),
  receipt: z.string().optional(),
  notes: z.string().optional(),
  approvedById: z.string().uuid().optional(),
});

// Get expenses
router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { category, startDate, endDate, page = 1, limit = 50 } = req.query;

    const where: any = {};
    if (category) where.category = category;
    if (startDate || endDate) {
      where.expenseDate = {};
      if (startDate) where.expenseDate.gte = new Date(startDate as string);
      if (endDate) where.expenseDate.lte = new Date(endDate as string);
    }

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        include: { createdBy: { select: { id: true, fullName: true } } },
        orderBy: { expenseDate: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.expense.count({ where }),
    ]);

    res.json({
      success: true,
      data: { expenses, pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) } },
    });
  } catch (error) {
    next(error);
  }
});

// Get expense categories
router.get('/categories', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const categories = await prisma.expense.groupBy({
      by: ['category'],
      _count: { id: true },
      _sum: { amount: true },
    });

    res.json({ success: true, data: { categories } });
  } catch (error) {
    next(error);
  }
});

// Get single expense
router.get('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const expense = await prisma.expense.findUnique({
      where: { id: req.params.id },
      include: { createdBy: { select: { id: true, fullName: true } } },
    });

    if (!expense) throw new AppError('Expense not found', 404);
    res.json({ success: true, data: { expense } });
  } catch (error) {
    next(error);
  }
});

// Create expense
router.post('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = createExpenseSchema.parse(req.body);

    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const count = await prisma.expense.count({
      where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
    });
    const expenseNumber = `EXP-${today}-${String(count + 1).padStart(3, '0')}`;

    const expense = await prisma.expense.create({
      data: {
        expenseNumber,
        category: data.category,
        description: data.description,
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        receipt: data.receipt,
        notes: data.notes,
        approvedById: data.approvedById,
        createdBy: {
          connect: { id: req.user!.userId },
        },
      },
      include: { createdBy: { select: { id: true, fullName: true } } },
    });

    logger.info(`Expense created: ${sanitize(expenseNumber)} by ${sanitize(req.user!.username)}`);
    await AuditLogService.log(req.user!.userId, 'CREATE', 'Expense', expense.id);
    res.status(201).json({ success: true, data: { expense } });
  } catch (error) {
    next(error);
  }
});

// Update expense
router.put('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { category, description, amount, paymentMethod, notes } = req.body;

    const expense = await prisma.expense.update({
      where: { id: req.params.id },
      data: { category, description, amount, paymentMethod, notes },
      include: { createdBy: { select: { id: true, fullName: true } } },
    });

    res.json({ success: true, data: { expense } });
  } catch (error) {
    next(error);
  }
});

// Delete expense
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.expense.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Expense deleted' });
  } catch (error) {
    next(error);
  }
});

export default router;
