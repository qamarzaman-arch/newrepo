import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();

// Helper functions for accurate financial reporting
const getOrderTotalAmount = (order: { totalAmount: number | string }) => 
  Number(order.totalAmount);

const getOrderPaidAmount = (order: { payments?: Array<{ amount: number }> }) =>
  (order.payments || []).reduce((sum, payment) => sum + Number(payment.amount), 0);

const getPaymentBreakdown = (orders: Array<{ payments?: Array<{ amount: number; method: string | null }> }>) =>
  orders.reduce((acc, order) => {
    for (const payment of order.payments || []) {
      if (!payment.method || Number(payment.amount) <= 0) {
        continue;
      }
      acc[payment.method] = (acc[payment.method] || 0) + Number(payment.amount);
    }
    return acc;
  }, {} as Record<string, number>);

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

    // Calculate both gross sales and collected amounts
    const totalSales = orders.reduce((sum, order) => sum + getOrderTotalAmount(order), 0);
    const totalCollected = orders.reduce((sum, order) => sum + getOrderPaidAmount(order), 0);
    const outstandingBalance = totalSales - totalCollected;
    
    const totalOrders = orders.length;
    const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
    const paymentMethodBreakdown = getPaymentBreakdown(orders);
    const refundTotal = orders.reduce((sum, order) => {
      const refunds = (order.payments || []).filter((payment) => Number(payment.amount) < 0);
      return sum + refunds.reduce((paymentSum, payment) => paymentSum + Math.abs(Number(payment.amount)), 0);
    }, 0);

    res.json({
      success: true,
      data: {
        date: targetDate,
        totalRevenue: totalSales,  // Alias for frontend compatibility
        totalSales,
        totalCollected,
        outstandingBalance,
        totalOrders,
        avgOrderValue,
        paymentMethodBreakdown,
        refundTotal,
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
    const days = Math.min(parseInt(range as string) || 30, 365);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const orders = await prisma.order.findMany({
      where: {
        orderedAt: { gte: startDate },
        status: { notIn: ['CANCELLED'] },
      },
      orderBy: { orderedAt: 'asc' },
      include: { payments: true },
    });

    // Group by date
    const dailySales = orders.reduce((acc, order) => {
      const date = order.orderedAt.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { date, revenue: 0, orders: 0 };
      }
      acc[date].revenue += getOrderTotalAmount(order);
      acc[date].orders++;
      return acc;
    }, {} as Record<string, { date: string; revenue: number; orders: number }>);

    const totalSales = orders.reduce((sum, order) => sum + getOrderTotalAmount(order), 0);

    res.json({
      success: true,
      data: {
        totalRevenue: totalSales,
        totalSales,
        totalOrders: orders.length,
        dailySales: Object.values(dailySales).map(d => ({
          ...d,
          avgOrderValue: d.orders > 0 ? d.revenue / d.orders : 0,
        })),
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
    const daysCapped = Math.min(parseInt(days as string) || 30, 365);
    const limitCapped = Math.min(parseInt(limit as string) || 10, 100);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysCapped);

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
      take: limitCapped,
    });

    // Batch-fetch all menu items in one query (avoids N+1)
    const menuItemIds = topItems.map((item) => item.menuItemId);
    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: menuItemIds } },
      include: { category: true },
    });
    const menuItemMap = new Map(menuItems.map((m) => [m.id, m]));

    const items = topItems.map((item) => ({
      ...menuItemMap.get(item.menuItemId),
      totalQuantity: item._sum.quantity,
      totalRevenue: item._sum.totalPrice,
      totalSales: item._sum.totalPrice,
    }));

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
    startDate.setDate(startDate.getDate() - Math.min(parseInt(days as string) || 30, 365));

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
router.get('/staff/performance', authenticate, authorize('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Math.min(parseInt(days as string) || 30, 365));

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
router.get('/inventory/valuation', authenticate, authorize('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
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
router.get('/expenses/summary', authenticate, authorize('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Math.min(parseInt(days as string) || 30, 365));

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

    const totalSales = orders.reduce((sum, o) => sum + getOrderTotalAmount(o), 0);
    const totalCollected = orders.reduce((sum, o) => sum + getOrderPaidAmount(o), 0);
    const outstandingBalance = totalSales - totalCollected;
    
    const totalOrders = orders.length;
    const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

    const cashSales = orders.reduce((sum, order) => {
      const cashPayments = order.payments?.filter(payment => payment.method === 'CASH' && Number(payment.amount) > 0) || [];
      return sum + cashPayments.reduce((paymentSum, payment) => paymentSum + Number(payment.amount), 0);
    }, 0);
    const cardSales = orders.reduce((sum, order) => {
      const cardPayments = order.payments?.filter(payment => payment.method !== 'CASH' && Number(payment.amount) > 0) || [];
      return sum + cardPayments.reduce((paymentSum, payment) => paymentSum + Number(payment.amount), 0);
    }, 0);

    res.json({
      success: true,
      data: {
        date: targetDate,
        totalSales,
        totalCollected,
        outstandingBalance,
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
    const limitCapped = Math.min(parseInt(req.query.limit as string) || 5, 100);
    const topItems = await prisma.orderItem.groupBy({
      by: ['menuItemId'],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: limitCapped,
    });

    // Batch-fetch all menu items in one query (avoids N+1)
    const menuItemIds = topItems.map((item) => item.menuItemId);
    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: menuItemIds } },
      select: { id: true, name: true, price: true },
    });
    const menuItemMap = new Map(menuItems.map((m) => [m.id, m]));

    const itemsWithDetails = topItems.map((item) => ({
      ...menuItemMap.get(item.menuItemId),
      totalSold: item._sum.quantity || 0,
    }));

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

    // Get all orders in period (without deep nested item loading)
    const orders = await prisma.order.findMany({
      where: {
        orderedAt: { gte: start, lte: end },
        status: { notIn: ['CANCELLED', 'VOIDED'] },
      },
      include: { payments: true },
    });

    // Calculate revenue
    const totalSales = orders.reduce((sum, o) => sum + getOrderTotalAmount(o), 0);
    const totalCollected = orders.reduce((sum, o) => sum + getOrderPaidAmount(o), 0);
    const outstandingBalance = totalSales - totalCollected;

    // Calculate COGS using aggregated order items
    let totalCOGS = 0;
    
    // 1. Fetch menu items and their recipes (Small memory footprint)
    const menuItems = await prisma.menuItem.findMany({
      include: {
        recipes: { include: { ingredients: { include: { inventoryItem: true } } } }
      }
    });

    // 2. Fetch order items aggregation
    const orderItemsAggregation = await prisma.orderItem.groupBy({
      by: ['menuItemId'],
      _sum: { quantity: true },
      where: {
        order: {
          orderedAt: { gte: start, lte: end },
          status: { notIn: ['CANCELLED', 'VOIDED'] },
        }
      }
    });

    for (const agg of orderItemsAggregation) {
      const menuItem = menuItems.find(m => m.id === agg.menuItemId);
      if (menuItem) {
        const qty = agg._sum.quantity || 0;
        if (menuItem.recipes && menuItem.recipes.length > 0) {
          for (const recipe of menuItem.recipes) {
            for (const ingredient of recipe.ingredients) {
              const unitCost = ingredient.inventoryItem?.costPerUnit || 0;
              totalCOGS += unitCost * ingredient.quantity * qty;
            }
          }
        } else {
          totalCOGS += (menuItem.cost || 0) * qty;
        }
      }
    }

    // Get expenses
    const expenses = await prisma.expense.findMany({
      where: { expenseDate: { gte: start, lte: end } },
    });
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

    // Calculate metrics
    const grossProfit = totalSales - totalCOGS;
    const grossProfitMargin = totalSales > 0 ? (grossProfit / totalSales) * 100 : 0;
    const netProfit = grossProfit - totalExpenses;
    const netProfitMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;

    res.json({
      success: true,
      data: {
        period: { start, end },
        revenue: {
          total: totalSales,
          collected: totalCollected,
          outstanding: outstandingBalance,
          orderCount: orders.length,
          averageOrderValue: orders.length > 0 ? totalSales / orders.length : 0,
        },
        cogs: {
          total: totalCOGS,
          percentage: totalSales > 0 ? (totalCOGS / totalSales) * 100 : 0,
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
