import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { parsePagination } from '../utils/parsePagination';
import { generateEntryNumber } from '../services/accounting.service';

const router = Router();

const accountSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE']),
  parentId: z.string().uuid().optional().nullable(),
  description: z.string().optional().nullable(),
});

const journalEntrySchema = z.object({
  date: z.string().datetime().optional(),
  description: z.string().optional().nullable(),
  branchId: z.string().uuid().optional().nullable(),
  lines: z.array(z.object({
    accountId: z.string().uuid(),
    debit: z.number().min(0).default(0),
    credit: z.number().min(0).default(0),
    description: z.string().optional().nullable(),
  })).min(2),
});

const reportAuth = authorize('ADMIN', 'MANAGER', 'ACCOUNTANT');

// ===== ACCOUNTS =====
router.get('/accounts', authenticate, authorize('ADMIN', 'MANAGER', 'ACCOUNTANT'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { type, isActive } = req.query;
    const where: any = {};
    if (type) where.type = String(type);
    if (isActive !== undefined) where.isActive = String(isActive) === 'true';
    const accounts = await prisma.chartOfAccounts.findMany({ where, orderBy: { code: 'asc' } });
    res.json({ success: true, data: { accounts } });
  } catch (error) {
    next(error);
  }
});

router.post('/accounts', authenticate, authorize('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = accountSchema.parse(req.body);
    const existing = await prisma.chartOfAccounts.findUnique({ where: { code: data.code } });
    if (existing) throw new AppError('Account code already exists', 400);
    const account = await prisma.chartOfAccounts.create({
      data: {
        code: data.code,
        name: data.name,
        type: data.type,
        parentId: data.parentId || undefined,
        description: data.description || undefined,
      },
    });
    res.status(201).json({ success: true, data: { account } });
  } catch (error) {
    next(error);
  }
});

router.put('/accounts/:id', authenticate, authorize('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = accountSchema.partial().parse(req.body);
    const account = await prisma.chartOfAccounts.update({
      where: { id: req.params.id },
      data: {
        ...(data.code !== undefined && { code: data.code }),
        ...(data.name !== undefined && { name: data.name }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.parentId !== undefined && { parentId: data.parentId || null }),
        ...(data.description !== undefined && { description: data.description || null }),
      },
    });
    res.json({ success: true, data: { account } });
  } catch (error) {
    next(error);
  }
});

// ===== JOURNAL ENTRIES =====
router.get('/journal-entries', authenticate, authorize('ADMIN', 'MANAGER', 'ACCOUNTANT'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page, limit } = parsePagination(req.query);
    const { from, to, refType, branchId } = req.query;
    const where: any = {};
    if (refType) where.refType = String(refType);
    if (branchId) where.branchId = String(branchId);
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(String(from));
      if (to) where.date.lte = new Date(String(to));
    }
    const [entries, total] = await Promise.all([
      prisma.journalEntry.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.journalEntry.count({ where }),
    ]);
    res.json({
      success: true,
      data: { entries, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/journal-entries/:id', authenticate, authorize('ADMIN', 'MANAGER', 'ACCOUNTANT'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const entry = await prisma.journalEntry.findUnique({
      where: { id: req.params.id },
      include: { lines: { include: { account: true } } },
    });
    if (!entry) throw new AppError('Journal entry not found', 404);
    res.json({ success: true, data: { entry } });
  } catch (error) {
    next(error);
  }
});

router.post('/journal-entries', authenticate, authorize('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = journalEntrySchema.parse(req.body);
    const totalDebit = data.lines.reduce((s, l) => s + Number(l.debit || 0), 0);
    const totalCredit = data.lines.reduce((s, l) => s + Number(l.credit || 0), 0);
    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      throw new AppError('Debit and credit totals must match', 400);
    }

    const entry = await prisma.$transaction(async (tx) => {
      const entryNumber = await generateEntryNumber(tx as any);
      return tx.journalEntry.create({
        data: {
          entryNumber,
          date: data.date ? new Date(data.date) : new Date(),
          description: data.description || undefined,
          refType: 'MANUAL',
          totalDebit,
          totalCredit,
          status: 'POSTED',
          branchId: data.branchId || undefined,
          createdById: req.user!.userId,
          lines: {
            create: data.lines.map((l) => ({
              accountId: l.accountId,
              debit: Number(l.debit || 0),
              credit: Number(l.credit || 0),
              description: l.description || undefined,
            })),
          },
        },
        include: { lines: true },
      });
    });

    res.status(201).json({ success: true, data: { entry } });
  } catch (error) {
    next(error);
  }
});

router.post('/journal-entries/:id/void', authenticate, authorize('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const entry = await prisma.journalEntry.findUnique({
      where: { id: req.params.id },
      include: { lines: true },
    });
    if (!entry) throw new AppError('Journal entry not found', 404);
    if (entry.status === 'VOIDED') throw new AppError('Already voided', 400);

    const result = await prisma.$transaction(async (tx) => {
      const reverseLines = entry.lines.map((l) => ({
        accountId: l.accountId,
        debit: l.credit,
        credit: l.debit,
        description: `Reversal of ${entry.entryNumber}`,
      }));
      const totalDebit = reverseLines.reduce((s, l) => s + Number(l.debit), 0);
      const totalCredit = reverseLines.reduce((s, l) => s + Number(l.credit), 0);
      const entryNumber = await generateEntryNumber(tx as any);

      const reverseEntry = await tx.journalEntry.create({
        data: {
          entryNumber,
          description: `Reversal of ${entry.entryNumber}`,
          reference: entry.id,
          refType: 'REVERSAL',
          totalDebit,
          totalCredit,
          status: 'POSTED',
          branchId: entry.branchId,
          createdById: req.user!.userId,
          lines: { create: reverseLines },
        },
      });

      await tx.journalEntry.update({
        where: { id: entry.id },
        data: { status: 'VOIDED' },
      });

      return reverseEntry;
    });

    res.json({ success: true, data: { reversal: result } });
  } catch (error) {
    next(error);
  }
});

// ===== REPORTS =====
router.get('/reports/profit-loss', authenticate, reportAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { from, to, branchId } = req.query;
    const dateFilter: any = {};
    if (from) dateFilter.gte = new Date(String(from));
    if (to) dateFilter.lte = new Date(String(to));

    const lineWhere: any = {
      entry: {
        status: 'POSTED',
        ...(Object.keys(dateFilter).length ? { date: dateFilter } : {}),
        ...(branchId ? { branchId: String(branchId) } : {}),
      },
    };

    const accounts = await prisma.chartOfAccounts.findMany({
      where: { type: { in: ['REVENUE', 'EXPENSE'] }, isActive: true },
    });

    const revenue: Array<{ accountCode: string; accountName: string; amount: number }> = [];
    const expenses: Array<{ accountCode: string; accountName: string; amount: number }> = [];
    let totalRevenue = 0;
    let totalExpenses = 0;

    for (const acc of accounts) {
      const agg = await prisma.journalLine.aggregate({
        where: { accountId: acc.id, ...lineWhere },
        _sum: { debit: true, credit: true },
      });
      const debit = Number(agg._sum.debit || 0);
      const credit = Number(agg._sum.credit || 0);
      if (acc.type === 'REVENUE') {
        const amount = credit - debit;
        if (amount !== 0) revenue.push({ accountCode: acc.code, accountName: acc.name, amount });
        totalRevenue += amount;
      } else {
        const amount = debit - credit;
        if (amount !== 0) expenses.push({ accountCode: acc.code, accountName: acc.name, amount });
        totalExpenses += amount;
      }
    }

    res.json({
      success: true,
      data: {
        revenue,
        expenses,
        totalRevenue,
        totalExpenses,
        netProfit: totalRevenue - totalExpenses,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/reports/balance-sheet', authenticate, reportAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { asOf, branchId } = req.query;
    const lineWhere: any = {
      entry: {
        status: 'POSTED',
        ...(asOf ? { date: { lte: new Date(String(asOf)) } } : {}),
        ...(branchId ? { branchId: String(branchId) } : {}),
      },
    };

    const accounts = await prisma.chartOfAccounts.findMany({
      where: { type: { in: ['ASSET', 'LIABILITY', 'EQUITY'] }, isActive: true },
    });

    const assets: any[] = [];
    const liabilities: any[] = [];
    const equity: any[] = [];
    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;

    for (const acc of accounts) {
      const agg = await prisma.journalLine.aggregate({
        where: { accountId: acc.id, ...lineWhere },
        _sum: { debit: true, credit: true },
      });
      const debit = Number(agg._sum.debit || 0);
      const credit = Number(agg._sum.credit || 0);
      if (acc.type === 'ASSET') {
        const amount = debit - credit;
        if (amount !== 0) assets.push({ accountCode: acc.code, accountName: acc.name, amount });
        totalAssets += amount;
      } else if (acc.type === 'LIABILITY') {
        const amount = credit - debit;
        if (amount !== 0) liabilities.push({ accountCode: acc.code, accountName: acc.name, amount });
        totalLiabilities += amount;
      } else {
        const amount = credit - debit;
        if (amount !== 0) equity.push({ accountCode: acc.code, accountName: acc.name, amount });
        totalEquity += amount;
      }
    }

    res.json({
      success: true,
      data: {
        assets, liabilities, equity,
        totalAssets, totalLiabilities, totalEquity,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/reports/trial-balance', authenticate, reportAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { from, to, branchId } = req.query;
    const dateFilter: any = {};
    if (from) dateFilter.gte = new Date(String(from));
    if (to) dateFilter.lte = new Date(String(to));

    const lineWhere: any = {
      entry: {
        status: 'POSTED',
        ...(Object.keys(dateFilter).length ? { date: dateFilter } : {}),
        ...(branchId ? { branchId: String(branchId) } : {}),
      },
    };

    const accounts = await prisma.chartOfAccounts.findMany({
      where: { isActive: true },
      orderBy: { code: 'asc' },
    });

    const rows: any[] = [];
    let grandDebit = 0;
    let grandCredit = 0;
    for (const acc of accounts) {
      const agg = await prisma.journalLine.aggregate({
        where: { accountId: acc.id, ...lineWhere },
        _sum: { debit: true, credit: true },
      });
      const totalDebit = Number(agg._sum.debit || 0);
      const totalCredit = Number(agg._sum.credit || 0);
      const balance = ['ASSET', 'EXPENSE'].includes(acc.type) ? totalDebit - totalCredit : totalCredit - totalDebit;
      if (totalDebit !== 0 || totalCredit !== 0) {
        rows.push({
          accountCode: acc.code,
          accountName: acc.name,
          type: acc.type,
          totalDebit,
          totalCredit,
          balance,
        });
        grandDebit += totalDebit;
        grandCredit += totalCredit;
      }
    }

    res.json({
      success: true,
      data: { rows, grandDebit, grandCredit },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
