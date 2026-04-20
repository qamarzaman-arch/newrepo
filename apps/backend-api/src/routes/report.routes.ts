import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();

// Query validation schemas
const dateQuerySchema = z.object({
  date: z.string().optional(),
});

const dateRangeQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.string().optional(),
});

// Daily sales report
router.get('/sales/daily', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const query = dateQuerySchema.parse(req.query);
    const targetDate = query.date ? new Date(query.date) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    const endDate = new Date(targetDate);
    endDate.setHours(23, 59, 59, 999);

    const orders = await prisma.order.findMany({
      where: {
        orderedAt: { gte: targetDate, lte: endDate },
        status: { notIn: ['CANCELLED'] },
      },
      include: { payments: true, items: { include: { menuItem: true } } },
    });

    const totalRevenue = orders.reduce((sum, order) => sum + Number(order.totalAmount), 0);
    const totalOrders = orders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const paymentMethodBreakdown = orders.reduce((acc, order) => {
      if (order.paymentMethod) {
        acc[order.paymentMethod] = (acc[order.paymentMethod] || 0) + Number(order.totalAmount);
      }
      return acc;
    }, {} as Record<string, number>);

    res.json({
      success: true,
      data: {
        date: targetDate,
        totalRevenue,
        totalOrders,
        avgOrderValue,
        paymentMethodBreakdown,
        orders,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Monthly sales report
router.get('/sales/monthly', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { range = '30' } = req.query;
    const days = parseInt(range as string);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const orders = await prisma.order.findMany({
      where: {
        orderedAt: { gte: startDate },
        status: { notIn: ['CANCELLED'] },
      },
      orderBy: { orderedAt: 'asc' },
    });

    // Group by date
    const dailySales = orders.reduce((acc, order) => {
      const date = order.orderedAt.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { date, revenue: 0, orders: 0 };
      }
      acc[date].revenue += Number(order.totalAmount);
      acc[date].orders++;
      return acc;
    }, {} as Record<string, { date: string; revenue: number; orders: number }>);

    const totalRevenue = orders.reduce((sum, order) => sum + Number(order.totalAmount), 0);

    res.json({
      success: true,
      data: {
        totalRevenue,
        totalOrders: orders.length,
        dailySales: Object.values(dailySales),
        period: { start: startDate, end: new Date() },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Top selling products
router.get('/products/top-selling', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { limit = 10, days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days as string));

    const topItems = await prisma.orderItem.groupBy({
      by: ['menuItemId'],
      _sum: { quantity: true, totalPrice: true },
      where: {
        order: {
          orderedAt: { gte: startDate },
          status: { notIn: ['CANCELLED'] },
        },
      },
      orderBy: { _sum: { quantity: 'desc' } },
      take: parseInt(limit as string),
    });

    const items = await Promise.all(
      topItems.map(async (item) => {
        const menuItem = await prisma.menuItem.findUnique({
          where: { id: item.menuItemId },
          include: { category: true },
        });
        return {
          ...menuItem,
          totalQuantity: item._sum.quantity,
          totalRevenue: item._sum.totalPrice,
        };
      })
    );

    res.json({ success: true, data: { items } });
  } catch (error) {
    next(error);
  }
});

// Low performing products
router.get('/products/low-performing', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days as string));

    const items = await prisma.menuItem.findMany({
      where: { isActive: true },
      include: {
        category: true,
        orderItems: {
          where: {
            order: {
              orderedAt: { gte: startDate },
              status: { notIn: ['CANCELLED'] },
            },
          },
        },
      },
    });

    const lowPerforming = items
      .map((item) => ({
        ...item,
        totalQuantity: item.orderItems.reduce((sum, oi) => sum + oi.quantity, 0),
      }))
      .filter((item) => item.totalQuantity === 0 || item.totalQuantity < 5)
      .sort((a, b) => a.totalQuantity - b.totalQuantity)
      .slice(0, 10);

    res.json({ success: true, data: { items: lowPerforming } });
  } catch (error) {
    next(error);
  }
});

// Top customers
router.get('/customers/top', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { limit = 10 } = req.query;

    const customers = await prisma.customer.findMany({
      orderBy: { totalSpent: 'desc' },
      take: parseInt(limit as string),
    });

    res.json({ success: true, data: { customers } });
  } catch (error) {
    next(error);
  }
});

// Staff performance report
router.get('/staff/performance', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days as string));

    const performances = await prisma.staffPerformance.findMany({
      where: { date: { gte: startDate } },
      orderBy: { date: 'desc' },
    });

    const users = await prisma.user.findMany({
      where: {
        id: {
          in: performances.map((performance) => performance.userId),
        },
      },
      select: { id: true, fullName: true, role: true },
    });

    const userMap = new Map(users.map((user) => [user.id, user]));

    const enrichedPerformances = performances.map((performance) => ({
      ...performance,
      user: userMap.get(performance.userId) ?? null,
    }));

    res.json({ success: true, data: { performances: enrichedPerformances } });
  } catch (error) {
    next(error);
  }
});

// Inventory valuation report
router.get('/inventory/valuation', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const items = await prisma.inventoryItem.findMany({
      where: { isActive: true },
      include: { supplier: true, warehouse: true },
    });

    const totalValue = items.reduce((sum, item) => sum + (item.currentStock * item.costPerUnit), 0);

    res.json({
      success: true,
      data: {
        items,
        summary: {
          totalItems: items.length,
          totalValue,
          lowStockCount: items.filter((i) => i.currentStock <= i.minStock).length,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Expense summary report
router.get('/expenses/summary', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days as string));

    const expenses = await prisma.expense.findMany({
      where: { expenseDate: { gte: startDate } },
    });

    const byCategory = expenses.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + Number(exp.amount);
      return acc;
    }, {} as Record<string, number>);

    const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);

    res.json({
      success: true,
      data: {
        totalExpenses,
        byCategory,
        count: expenses.length,
        expenses,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Alias: /daily → /sales/daily (for web-admin dashboard)
router.get('/daily', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date as string) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    const endDate = new Date(targetDate);
    endDate.setHours(23, 59, 59, 999);

    const orders = await prisma.order.findMany({
      where: {
        orderedAt: { gte: targetDate, lte: endDate },
        status: { notIn: ['CANCELLED'] },
      },
      include: { payments: true },
    });

    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
    const totalOrders = orders.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const cashSales = orders
      .filter(o => o.paymentMethod === 'CASH')
      .reduce((sum, o) => sum + Number(o.totalAmount), 0);
    const cardSales = orders
      .filter(o => o.paymentMethod !== 'CASH' && o.paymentMethod)
      .reduce((sum, o) => sum + Number(o.totalAmount), 0);

    res.json({
      success: true,
      data: {
        date: targetDate,
        totalRevenue,
        totalOrders,
        averageOrderValue,
        paymentBreakdown: { cash: cashSales, card: cardSales },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Top selling items
router.get('/top-items', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { limit = 5 } = req.query;
    const topItems = await prisma.orderItem.groupBy({
      by: ['menuItemId'],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: parseInt(limit as string),
    });

    const itemsWithDetails = await Promise.all(
      topItems.map(async (item) => {
        const menuItem = await prisma.menuItem.findUnique({
          where: { id: item.menuItemId },
          select: { id: true, name: true, price: true },
        });
        return { ...menuItem, totalSold: item._sum.quantity || 0 };
      })
    );

    res.json({ success: true, data: { items: itemsWithDetails } });
  } catch (error) {
    next(error);
  }
});

// Profit & Loss report with COGS calculation
router.get('/profit-loss', authenticate, authorize('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date();
    start.setHours(0, 0, 0, 0);
    if (!startDate) start.setDate(start.getDate() - 30); // Default: last 30 days

    const end = endDate ? new Date(endDate as string) : new Date();
    end.setHours(23, 59, 59, 999);

    // Get all orders in period
    const orders = await prisma.order.findMany({
      where: {
        orderedAt: { gte: start, lte: end },
        status: { notIn: ['CANCELLED', 'VOIDED'] },
      },
      include: {
        items: {
          include: {
            menuItem: {
              include: {
                recipes: {
                  include: {
                    ingredients: {
                      include: {
                        inventoryItem: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    // Calculate revenue
    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);

    // Calculate COGS based on recipe ingredients
    let totalCOGS = 0;
    for (const order of orders) {
      for (const item of order.items) {
        const menuItem = item.menuItem;
        if (menuItem?.recipes && menuItem.recipes.length > 0) {
          // Use recipe to calculate COGS
          for (const recipe of menuItem.recipes) {
            for (const ingredient of recipe.ingredients) {
              const unitCost = ingredient.inventoryItem?.costPerUnit || 0;
              totalCOGS += unitCost * ingredient.quantity * item.quantity;
            }
          }
        } else {
          // Fallback: use menu item cost if no recipe
          totalCOGS += (menuItem?.cost || 0) * item.quantity;
        }
      }
    }

    // Get expenses
    const expenses = await prisma.expense.findMany({
      where: { expenseDate: { gte: start, lte: end } },
    });
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

    // Calculate metrics
    const grossProfit = totalRevenue - totalCOGS;
    const grossProfitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    const netProfit = grossProfit - totalExpenses;
    const netProfitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    res.json({
      success: true,
      data: {
        period: { start, end },
        revenue: {
          total: totalRevenue,
          orderCount: orders.length,
          averageOrderValue: orders.length > 0 ? totalRevenue / orders.length : 0,
        },
        cogs: {
          total: totalCOGS,
          percentage: totalRevenue > 0 ? (totalCOGS / totalRevenue) * 100 : 0,
        },
        grossProfit: {
          total: grossProfit,
          margin: grossProfitMargin,
        },
        expenses: {
          total: totalExpenses,
          breakdown: expenses.reduce((acc, e) => {
            acc[e.category] = (acc[e.category] || 0) + Number(e.amount);
            return acc;
          }, {} as Record<string, number>),
        },
        netProfit: {
          total: netProfit,
          margin: netProfitMargin,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Export sales report as CSV
router.get('/export/sales', authenticate, authorize('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date();
    start.setHours(0, 0, 0, 0);
    if (!startDate) start.setDate(start.getDate() - 30);

    const end = endDate ? new Date(endDate as string) : new Date();
    end.setHours(23, 59, 59, 999);

    const orders = await prisma.order.findMany({
      where: {
        orderedAt: { gte: start, lte: end },
        status: { notIn: ['CANCELLED'] },
      },
      include: {
        items: { include: { menuItem: true } },
        customer: true,
        cashier: { select: { fullName: true } },
      },
      orderBy: { orderedAt: 'asc' },
    });

    // Generate CSV
    const headers = ['Order Number', 'Date', 'Customer', 'Cashier', 'Items', 'Subtotal', 'Tax', 'Discount', 'Total', 'Status'];
    const rows = orders.map(order => [
      order.orderNumber,
      order.orderedAt.toISOString(),
      order.customerName || 'Walk-in',
      order.cashier?.fullName || '',
      order.items.map(i => `${i.menuItem?.name} x${i.quantity}`).join('; '),
      order.subtotal.toString(),
      order.taxAmount.toString(),
      order.discountAmount.toString(),
      order.totalAmount.toString(),
      order.status,
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="sales-report-${start.toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch (error) {
    next(error);
  }
});

// Per-cashier shift summary
router.get('/shift-summary', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { cashierId, startDate, endDate } = req.query;
    
    // Default to current user if no cashierId specified (for cashiers viewing their own shift)
    const targetCashierId = (cashierId as string) || req.user!.userId;
    
    // Default date range: today
    const targetStartDate = startDate ? new Date(startDate as string) : new Date();
    targetStartDate.setHours(0, 0, 0, 0);
    const targetEndDate = endDate ? new Date(endDate as string) : new Date();
    targetEndDate.setHours(23, 59, 59, 999);

    const orders = await prisma.order.findMany({
      where: {
        cashierId: targetCashierId,
        orderedAt: { gte: targetStartDate, lte: targetEndDate },
        status: { notIn: ['CANCELLED'] },
      },
      include: { payments: true },
    });

    // Calculate per-cashier stats from actual payment amounts (not order totals)
    // This correctly handles split payments without double-counting
    const cashSales = orders.reduce((sum, o) => {
      const cashPayments = o.payments?.filter(p => p.method === 'CASH' && p.amount > 0) || [];
      return sum + cashPayments.reduce((pSum, p) => pSum + Number(p.amount), 0);
    }, 0);
    
    const cardSales = orders.reduce((sum, o) => {
      const cardPayments = o.payments?.filter(p => p.method === 'CARD' && p.amount > 0) || [];
      return sum + cardPayments.reduce((pSum, p) => pSum + Number(p.amount), 0);
    }, 0);

    // Calculate refunds from negative payment amounts
    const refunds = orders.reduce((sum, o) => {
      const refundPayments = o.payments?.filter(p => p.amount < 0) || [];
      return sum + refundPayments.reduce((pSum, p) => pSum + Math.abs(Number(p.amount)), 0);
    }, 0);
    
    // Tips are not tracked separately in current schema - would need tipAmount field on Order
    // For now, return 0 (this would need schema update to track properly)
    const tips = 0;
    
    const voidedOrders = orders.filter(o => o.status === 'VOIDED').length;
    
    // Get user info for cashier name
    const user = await prisma.user.findUnique({
      where: { id: targetCashierId },
      select: { fullName: true },
    });

    res.json({
      success: true,
      data: {
        cashierId: targetCashierId,
        cashierName: user?.fullName || req.user!.username,
        period: { start: targetStartDate, end: targetEndDate },
        totalOrders: orders.length,
        totalSales: orders.reduce((sum, o) => sum + Number(o.totalAmount), 0),
        paymentMethodBreakdown: {
          CASH: cashSales,
          CARD: cardSales,
          CREDIT: 0, // Not tracked separately in this model
        },
        refunds,
        tips,
        voidedOrders,
        orders,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
