import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma, io } from '../server';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = Router();

// Validation schemas
const createOrderSchema = z.object({
  orderType: z.enum(['DINE_IN', 'TAKEAWAY', 'DELIVERY', 'PICKUP']),
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
  notes: z.string().optional(),
  kitchenNotes: z.string().optional(),
});

// Get all orders with filters
router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status, orderType, startDate, endDate, page = 1, limit = 50 } = req.query;

    const where: any = {};

    if (status) where.status = status;
    if (orderType) where.orderType = orderType;
    if (startDate || endDate) {
      where.orderedAt = {};
      if (startDate) where.orderedAt.gte = new Date(startDate as string);
      if (endDate) where.orderedAt.lte = new Date(endDate as string);
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: {
            include: {
              menuItem: true,
            },
          },
          table: true,
          customer: true,
          cashier: {
            select: { id: true, fullName: true },
          },
          delivery: true,
        },
        orderBy: { orderedAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.order.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get single order
router.get('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        items: {
          include: {
            menuItem: true,
          },
        },
        table: true,
        customer: true,
        payments: true,
        cashier: {
          select: { id: true, fullName: true },
        },
        delivery: true,
        kotTickets: true,
      },
    });

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    res.json({
      success: true,
      data: { order },
    });
  } catch (error) {
    next(error);
  }
});

// Create new order
router.post('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = createOrderSchema.parse(req.body);

    // Generate order number
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
    const count = await prisma.order.count({
      where: {
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
        where: { id: item.menuItemId },
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

    // Apply discount if code provided
    let discountAmount = 0;
    let discountPercent = 0;

    if (data.discountCode) {
      const discount = await prisma.discount.findUnique({
        where: { code: data.discountCode },
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

    // Calculate tax - get from settings
    const taxSetting = await prisma.setting.findUnique({
      where: { key: 'tax_rate' },
    });
    const taxRate = taxSetting ? parseFloat(taxSetting.value) : 0;
    const taxAmount = (subtotal - discountAmount) * (taxRate / 100);

    // Calculate surcharge - get applicable surcharges
    const surcharges = await prisma.surcharge.findMany({
      where: {
        isActive: true,
        OR: [
          { applicableTo: 'all' },
          { applicableTo: data.orderType.toLowerCase() },
        ],
      },
    });

    let surchargeAmount = 0;
    for (const surcharge of surcharges) {
      if (surcharge.type === 'percentage') {
        surchargeAmount += (subtotal * Number(surcharge.value)) / 100;
      } else {
        surchargeAmount += Number(surcharge.value);
      }
    }

    const totalAmount = subtotal - discountAmount + taxAmount + surchargeAmount;

    // Create order with transaction
    const order = await prisma.$transaction(async (tx) => {
      // Create order
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
          surchargeAmount,
          totalAmount,
          cashierId: req.user!.userId,
          notes: data.notes,
          kitchenNotes: data.kitchenNotes,
          items: {
            create: orderItems,
          },
        },
        include: {
          items: {
            include: {
              menuItem: true,
            },
          },
        },
      });

      // Update table status if dine-in
      if (data.orderType === 'DINE_IN' && data.tableId) {
        await tx.table.update({
          where: { id: data.tableId },
          data: {
            status: 'OCCUPIED',
            currentOrderId: newOrder.id,
          },
        });
      }

      // Create KOT tickets for kitchen
      for (const item of newOrder.items) {
        await tx.kotTicket.create({
          data: {
            ticketNumber: `KOT-${dateStr}-${String(await tx.kotTicket.count() + 1).padStart(3, '0')}`,
            orderId: newOrder.id,
            orderItemId: item.id,
            course: 'main',
            status: 'NEW',
          },
        });
      }

      return newOrder;
    });

    // Emit real-time event
    io.emit('order-created', order);
    io.to('kitchen').emit('new-kot', order);

    logger.info(`Order created: ${orderNumber} by ${req.user!.username}`);

    res.status(201).json({
      success: true,
      data: { order },
    });
  } catch (error) {
    next(error);
  }
});

// Update order status
router.patch('/:id/status', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status, cancelReason } = req.body;

    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
    });

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    const updatedOrder = await prisma.order.update({
      where: { id: req.params.id },
      data: {
        status,
        ...(status === 'CANCELLED' && {
          cancelledAt: new Date(),
          cancelReason,
        }),
        ...(status === 'COMPLETED' && {
          completedAt: new Date(),
        }),
      },
      include: {
        items: {
          include: {
            menuItem: true,
          },
        },
        table: true,
      },
    });

    // Update table status if order completed or cancelled
    if ((status === 'COMPLETED' || status === 'CANCELLED') && order.tableId) {
      await prisma.table.update({
        where: { id: order.tableId },
        data: {
          status: 'NEEDS_CLEANING',
          currentOrderId: null,
        },
      });
    }

    // Emit real-time event
    io.emit('order-updated', updatedOrder);

    res.json({
      success: true,
      data: { order: updatedOrder },
    });
  } catch (error) {
    next(error);
  }
});

// Process payment
router.post('/:id/payment', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { method, amount, reference, notes } = req.body;

    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
    });

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    const paidAmount = Number(order.paidAmount) + amount;

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        method,
        amount,
        reference,
        notes,
        status: 'PAID',
      },
    });

    // Update order
    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: {
        paidAmount,
        paymentStatus: paidAmount >= Number(order.totalAmount) ? 'PAID' : 'PARTIAL',
        paymentMethod: method,
      },
      include: {
        payments: true,
        items: {
          include: {
            menuItem: true,
          },
        },
      },
    });

    // If fully paid and not completed, mark as completed
    if (paidAmount >= Number(order.totalAmount) && order.status !== 'COMPLETED') {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });

      // Free up table
      if (order.tableId) {
        await prisma.table.update({
          where: { id: order.tableId },
          data: {
            status: 'NEEDS_CLEANING',
            currentOrderId: null,
          },
        });
      }
    }

    // Emit real-time event
    io.emit('payment-processed', updatedOrder);

    logger.info(`Payment processed for order ${order.orderNumber}: ${amount}`);

    res.json({
      success: true,
      data: {
        order: updatedOrder,
        payment,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
