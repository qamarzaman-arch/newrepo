import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import type { Prisma, PrismaClient } from '@prisma/client';

type PrismaTx = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'> | PrismaClient;

const DEFAULT_ACCOUNTS: Array<{ code: string; name: string; type: string }> = [
  { code: '1000', name: 'Cash', type: 'ASSET' },
  { code: '1100', name: 'Accounts Receivable', type: 'ASSET' },
  { code: '1200', name: 'Inventory', type: 'ASSET' },
  { code: '2000', name: 'Accounts Payable', type: 'LIABILITY' },
  { code: '2100', name: 'Sales Tax Payable', type: 'LIABILITY' },
  { code: '3000', name: "Owner's Equity", type: 'EQUITY' },
  { code: '4000', name: 'Sales Revenue', type: 'REVENUE' },
  { code: '4100', name: 'Tips Revenue', type: 'REVENUE' },
  { code: '5000', name: 'Cost of Goods Sold', type: 'EXPENSE' },
  { code: '5100', name: 'General Expense', type: 'EXPENSE' },
  { code: '5200', name: 'Salaries', type: 'EXPENSE' },
  { code: '5300', name: 'Rent', type: 'EXPENSE' },
  { code: '5400', name: 'Utilities', type: 'EXPENSE' },
];

export async function seedDefaultChartOfAccounts(p: PrismaTx = prisma): Promise<void> {
  for (const acc of DEFAULT_ACCOUNTS) {
    const existing = await (p as PrismaClient).chartOfAccounts.findUnique({ where: { code: acc.code } });
    if (!existing) {
      await (p as PrismaClient).chartOfAccounts.create({
        data: { code: acc.code, name: acc.name, type: acc.type },
      });
    }
  }
}

export async function ensureChartOfAccountsSeeded(): Promise<void> {
  try {
    await seedDefaultChartOfAccounts(prisma);
    logger.info('Chart of accounts ensured/seeded');
  } catch (err) {
    logger.error('Failed to seed chart of accounts:', err);
  }
}

export async function generateEntryNumber(p: PrismaTx = prisma): Promise<string> {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const datePrefix = `${yyyy}${mm}${dd}`;
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  const count = await (p as PrismaClient).journalEntry.count({
    where: { createdAt: { gte: startOfDay, lte: endOfDay } },
  });
  return `JE-${datePrefix}-${String(count + 1).padStart(4, '0')}`;
}

async function findAccountByCode(p: PrismaTx, code: string) {
  return (p as PrismaClient).chartOfAccounts.findUnique({ where: { code } });
}

export interface OrderForJournal {
  id: string;
  paidAmount: number | null;
  subtotal: number | null;
  discountAmount: number | null;
  taxAmount: number | null;
  tipAmount: number | null;
  branchId?: string | null;
}

export async function postOrderJournalEntry(p: PrismaTx, order: OrderForJournal): Promise<void> {
  const cash = await findAccountByCode(p, '1000');
  const salesRev = await findAccountByCode(p, '4000');
  const taxPayable = await findAccountByCode(p, '2100');
  const tipsRev = await findAccountByCode(p, '4100');
  if (!cash || !salesRev || !taxPayable || !tipsRev) {
    throw new Error('Required accounts not found - run seedDefaultChartOfAccounts first');
  }

  const paid = Number(order.paidAmount || 0);
  const subtotal = Number(order.subtotal || 0);
  const discount = Number(order.discountAmount || 0);
  const tax = Number(order.taxAmount || 0);
  const tips = Number(order.tipAmount || 0);
  const netSales = Math.max(0, subtotal - discount);

  const lines: Array<{ accountId: string; debit: number; credit: number; description: string }> = [];
  lines.push({ accountId: cash.id, debit: paid, credit: 0, description: 'Cash received' });
  if (netSales > 0) lines.push({ accountId: salesRev.id, debit: 0, credit: netSales, description: 'Sales revenue' });
  if (tax > 0) lines.push({ accountId: taxPayable.id, debit: 0, credit: tax, description: 'Sales tax' });
  if (tips > 0) lines.push({ accountId: tipsRev.id, debit: 0, credit: tips, description: 'Tips' });

  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
  const entryNumber = await generateEntryNumber(p);

  await (p as PrismaClient).journalEntry.create({
    data: {
      entryNumber,
      description: `Order ${order.id}`,
      reference: order.id,
      refType: 'ORDER',
      totalDebit,
      totalCredit,
      status: 'POSTED',
      branchId: order.branchId || undefined,
      lines: { create: lines },
    },
  });
}

export interface ExpenseForJournal {
  id: string;
  amount: number;
  category?: string | null;
  description?: string | null;
}

const EXPENSE_CATEGORY_TO_CODE: Record<string, string> = {
  SALARY: '5200',
  SALARIES: '5200',
  RENT: '5300',
  UTILITIES: '5400',
  COGS: '5000',
  INVENTORY: '5000',
};

export async function postExpenseJournalEntry(p: PrismaTx, expense: ExpenseForJournal): Promise<void> {
  const cash = await findAccountByCode(p, '1000');
  const categoryUpper = (expense.category || '').toUpperCase();
  const expenseCode = EXPENSE_CATEGORY_TO_CODE[categoryUpper] || '5100';
  const expenseAcc = await findAccountByCode(p, expenseCode);
  if (!cash || !expenseAcc) throw new Error('Required accounts not found');

  const amount = Number(expense.amount || 0);
  const lines = [
    { accountId: expenseAcc.id, debit: amount, credit: 0, description: expense.description || 'Expense' },
    { accountId: cash.id, debit: 0, credit: amount, description: 'Cash payment' },
  ];
  const entryNumber = await generateEntryNumber(p);

  await (p as PrismaClient).journalEntry.create({
    data: {
      entryNumber,
      description: `Expense ${expense.id}`,
      reference: expense.id,
      refType: 'EXPENSE',
      totalDebit: amount,
      totalCredit: amount,
      status: 'POSTED',
      lines: { create: lines },
    },
  });
}
