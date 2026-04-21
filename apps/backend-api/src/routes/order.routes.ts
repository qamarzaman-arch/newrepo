import { InventoryService } from '../services/inventory.service';
import { ValidationService } from '../services/validation.service';
import { ReceiptService } from '../services/receipt.service';
import { AuditLogService } from '../services/auditLog.service';
import { Router, Response, NextFunction, Request } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../server';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { logger, sanitize } from '../utils/logger';
import { getWebSocketManager } from '../utils/websocket';

const router = Router();

// Validation schemas
const createOrderSchema = z.object({
  orderType: z.enum(['DINE_IN', 'WALK_IN', 'TAKEAWAY', 'DELIVERY', 'PICKUP']),
  tableId: z.string().optional(),
  customerId: z.string().optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  items: z.array(z.object({
    menuItemId: z.string(),
    quantity: z.number().min(1),
    notes: z.string().optional(),
    modifiers: z.string().optional(),
  })).min(1),
  discountCode: z.string().optional(),
  discountPercent: z.number().min(0).max(100).optional(),
  discountAmount: z.number().min(0).optional(),
  tipAmount: z.number().min(0).optional(),
  notes: z.string().optional(),
  kitchenNotes: z.string().optional(),
});

// Create order
router.post('/', authenticate, (async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = createOrderSchema.parse(req.body);

    // Generate order number
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
    const count = await prisma.order.count({
      where: { storeId: req.storeId,
        orderedAt: {
          gte: new Date(today.setHours(0, 0, 0, 0)),
        },
      },
    });
    const orderNumber = `ORD-${dateStr}-${String(count + 1).padStart(3, '0')}`;

    // Calculate totals
    let subtotal = 0;
    const orderItems = [];

    for (const item of data.items) {
      const menuItem = await prisma.menuItem.findUnique({
        where: { storeId: req.storeId, id: item.menuItemId },
      });

      if (!menuItem || !menuItem.isActive || !menuItem.isAvailable) {
        throw new AppError(`Menu item ${item.menuItemId} is not available`, 400);
      }

      const totalPrice = Number(menuItem.price) * item.quantity;
      subtotal += totalPrice;

      orderItems.push({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        unitPrice: menuItem.price,
        totalPrice,
        notes: item.notes,
        modifiers: item.modifiers,
      });
    }

    let discountAmount = data.discountAmount || 0;
    let discountPercent = data.discountPercent || 0;

    if (data.discountCode && !discountAmount && !discountPercent) {
      const discount = await prisma.discount.findUnique({
        where: { storeId: req.storeId, code: data.discountCode },
      });

      if (discount && discount.isActive) {
        if (discount.type === 'percentage') {
          discountPercent = Number(discount.value);
          discountAmount = (subtotal * discountPercent) / 100;
        } else {
          discountAmount = Number(discount.value);
        }
      }
    }

    const taxSetting = await prisma.setting.findUnique({
      where: { storeId: req.storeId, key: 'tax_rate' },
    });
    const taxRate = taxSetting ? parseFloat(taxSetting.value) : 0;
    const taxAmount = (subtotal - discountAmount) * (taxRate / 100);

    const tipAmount = data.tipAmount || 0;
    const totalAmount = subtotal - discountAmount + taxAmount + tipAmount;

    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          orderType: data.orderType,
          tableId: data.tableId,
          customerId: data.customerId,
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          subtotal,
          discountAmount,
          discountPercent,
          taxAmount,
          tipAmount: tipAmount || undefined,
          totalAmount,
          cashierId: req.user!.userId,
          notes: data.notes,
          kitchenNotes: data.kitchenNotes,
          items: {
            create: orderItems,
          },
        } as any,
        include: {
          items: {
            include: {
              menuItem: true,
            },
          },
        },
      });

      // Deduct ingredients based on recipes
      for (const item of data.items) {
        await InventoryService.deductIngredientsForMenuItem(item.menuItemId, item.quantity, tx);
      }

      if (data.orderType === 'DINE_IN' && data.tableId) {
        await tx.table.update({
          where: { storeId: req.storeId, id: data.tableId },
          data: {
            status: 'OCCUPIED',
            currentOrderId: newOrder.id,
          },
        });
      }

      const kotCount = await tx.kotTicket.count({
        where: { storeId: req.storeId, createdAt: { gte: new Date(today.setHours(0, 0, 0, 0)) } },
      });

      const kot = await tx.kotTicket.create({
        data: {
          ticketNumber: `KOT-${dateStr}-${String(kotCount + 1).padStart(3, '0')}`,
          orderId: newOrder.id,
          status: 'NEW',
          notes: data.kitchenNotes,
        },
      });

      return newOrder;
    });

    const ws = getWebSocketManager();
    ws.emitOrderCreated(order);

    res.status(201).json({
      success: true,
      data: { order },
    });
  } catch (error) {
    next(error);
  }
}) as any);

// Update existing order
router.put('/:id', authenticate, (async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { notes, items, kitchenNotes, notifyKitchen } = req.body;
    const order = await prisma.order.findUnique({
      where: { storeId: req.storeId, id: req.params.id },
      include: { items: { include: { menuItem: true } } },
    });
    if (!order) throw new AppError('Order not found', 404);

    let updatedOrder;
    await prisma.$transaction(async (tx) => {
      const updateData: any = { notes, kitchenNotes };
      if (items && items.length > 0) {
        // Simple replace items for this enhancement
        await tx.orderItem.deleteMany({ where: { storeId: req.storeId, orderId: order.id } });
        for (const item of items) {
           const menuItem = await tx.menuItem.findUnique({ where: { storeId: req.storeId, id: item.menuItemId } });
           if (menuItem) {
              await tx.orderItem.create({
                 data: {
                    orderId: order.id,
                    menuItemId: menuItem.id,
                    quantity: item.quantity,
                    unitPrice: menuItem.price,
                    totalPrice: Number(menuItem.price) * item.quantity,
                 }
              });
              // Deduct added ingredients
              await InventoryService.deductIngredientsForMenuItem(menuItem.id, item.quantity, tx);
           }
        }
      }
      updatedOrder = await tx.order.update({
        where: { storeId: req.storeId, id: order.id },
        data: updateData,
        include: { items: { include: { menuItem: true } }, table: true },
      });
    });

    const ws = getWebSocketManager();
    ws.emitOrderUpdated(updatedOrder!.id, updatedOrder!);
    res.json({ success: true, data: { order: updatedOrder } });
  } catch (error) {
    next(error);
  }
}) as any);

// Get all orders
router.get('/', authenticate, (async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status, orderType, page = 1, limit = 20 } = req.query as any;
    const where: any = {};
    if (status) where.status = status;
    if (orderType) where.orderType = orderType;

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: { include: { menuItem: true } },
        table: true,
        customer: true,
      },
      orderBy: { orderedAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    });

    res.json({ success: true, data: { orders } });
  } catch (error) {
    next(error);
  }
}) as any);

// Payment processing
router.post('/:id/payment', authenticate, (async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { method, amount } = req.body;
    const order = await prisma.order.findUnique({ where: { storeId: req.storeId, id: req.params.id } });
    if (!order) throw new AppError('Order not found', 404);

    const paidAmount = Number(order.paidAmount) + amount;
    const updatedOrder = await prisma.order.update({
      where: { storeId: req.storeId, id: order.id },
      data: {
        paidAmount,
        paymentStatus: paidAmount >= Number(order.totalAmount) ? 'PAID' : 'PARTIAL',
        paymentMethod: method,
        status: paidAmount >= Number(order.totalAmount) ? 'COMPLETED' : order.status,
      },
    });

    if (updatedOrder.status === 'COMPLETED' && order.tableId) {
      await prisma.table.update({
        where: { storeId: req.storeId, id: order.tableId },
        data: { status: 'NEEDS_CLEANING', currentOrderId: null },
      });
    }

    res.json({ success: true, data: { order: updatedOrder } });
  } catch (error) {
    next(error);
  }
}) as any);

// Receipt retrieval
router.get('/:id/receipt', authenticate, (async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const order = await prisma.order.findUnique({
      where: { storeId: req.storeId, id: req.params.id },
      include: { items: { include: { menuItem: true } } },
    });
    if (!order) throw new AppError('Order not found', 404);

    const settingsRecords = await prisma.setting.findMany();
    const settings: any = {};
    settingsRecords.forEach(s => settings[s.key] = s.value);

    const receiptText = ReceiptService.generateReceiptText(order, settings);
    res.json({ success: true, data: { receiptText } });
  } catch (error) {
    next(error);
  }
}) as any);

export default router;
