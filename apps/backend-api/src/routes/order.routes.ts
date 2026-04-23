import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { logger, sanitize } from '../utils/logger';
import { getWebSocketManager } from '../utils/websocket';
import { rateLimiters } from '../middleware/rateLimiter';

const router = Router();

// Validation schemas
const createOrderSchema = z.object({
  orderType: z.enum(['DINE_IN', 'WALK_IN', 'TAKEAWAY', 'DELIVERY', 'PICKUP', 'RESERVATION']),
  tableId: z.string().optional().nullable(),
  customerId: z.string().optional().nullable(),
  customerName: z.string().optional().nullable(),
  customerPhone: z.string().optional().nullable(),
  items: z.array(z.object({
    menuItemId: z.string(),
    quantity: z.number().min(1),
    notes: z.string().optional().nullable(),
    modifiers: z.string().optional().nullable(),
  })).min(1),
  discountCode: z.string().optional().nullable(),
  discountPercent: z.number().min(0).max(100).optional().nullable(),
  discountAmount: z.number().min(0).optional().nullable(),
  tipAmount: z.number().min(0).optional().nullable(),
  notes: z.string().optional().nullable(),
  kitchenNotes: z.string().optional().nullable(),
  idempotencyKey: z.string().optional(),
});

// Get all orders with filters
router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status, orderType, paymentMethod, startDate, endDate, page = 1, limit = 50 } = req.query;

    const where: any = {};

    // Support comma-separated status (e.g., status=PENDING,PREPARING,READY)
    if (status) {
      const statusList = (status as string).split(',').filter(Boolean);
      if (statusList.length === 1) {
        where.status = statusList[0];
      } else if (statusList.length > 1) {
        where.status = { in: statusList };
      }
    }

    if (orderType) where.orderType = orderType;

    // Support payment method filtering via payments relation
    let paymentFilter: any = {};
    if (paymentMethod && paymentMethod !== 'all') {
      paymentFilter = {
        some: {
          method: paymentMethod as string,
        },
      };
    }

    if (startDate || endDate) {
      where.orderedAt = {};
      if (startDate) where.orderedAt.gte = new Date(startDate as string);
      if (endDate) where.orderedAt.lte = new Date(endDate as string);
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: {
          ...where,
          ...(paymentMethod && paymentMethod !== 'all' ? { payments: paymentFilter } : {}),
        },
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
          payments: true,
        },
        orderBy: { orderedAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.order.count({
        where: {
          ...where,
          ...(paymentMethod && paymentMethod !== 'all' ? { payments: paymentFilter } : {}),
        },
      }),
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
// Get reservations (orders with RESERVATION type)
router.get('/reservations', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status } = req.query;
    
    const where: any = {
      orderType: 'RESERVATION',
    };
    
    if (status) where.status = status as string;

    const reservations = await prisma.order.findMany({
      where,
      include: {
        customer: true,
        table: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ success: true, data: { reservations } });
  } catch (error) {
    next(error);
  }
});

// Create reservation (as a separate order type)
router.post('/reservations', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { customerName, customerPhone, tableId, notes } = req.body;

    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
    const count = await prisma.order.count({
      where: {
        orderType: 'RESERVATION',
        createdAt: { gte: new Date(today.setHours(0, 0, 0, 0)) },
      },
    });
    const orderNumber = `RES-${dateStr}-${String(count + 1).padStart(3, '0')}`;

    const reservation = await prisma.order.create({
      data: {
        orderNumber,
        orderType: 'RESERVATION',
        status: 'PENDING',
        customerName,
        customerPhone,
        tableId,
        notes,
        cashierId: req.user!.userId,
        subtotal: 0,
        totalAmount: 0,
      },
    });

    res.status(201).json({ success: true, data: { reservation } });
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

// Create new order with retry logic for order number generation
router.post('/', authenticate, rateLimiters.moderate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = createOrderSchema.parse(req.body);

    // Check idempotency key to prevent duplicate orders
    const idempotencyKey = req.headers['idempotency-key'] as string || data.idempotencyKey;
    
    if (idempotencyKey) {
      const existingKey = await prisma.idempotencyKey.findUnique({
        where: { key: idempotencyKey },
      });

      if (existingKey) {
        // Return cached response
        logger.info(`Idempotency hit for key: ${idempotencyKey}`);
        const cachedOrder = await prisma.order.findUnique({
          where: { id: existingKey.orderId || '' },
          include: {
            items: { include: { menuItem: true } },
            table: true,
            customer: true,
            payments: true,
          },
        });
        
        if (cachedOrder) {
          return res.status(201).json({
            success: true,
            data: { order: cachedOrder, cached: true },
          });
        }
      }
    }

    // Generate unique order number using atomic counter
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
    
    const orderNumber = await prisma.$transaction(async (tx) => {
      // Get or create counter for today
      let counter = await tx.orderCounter.findUnique({
        where: { id: 'global' },
      });
      
      const todayStr = today.toISOString().split('T')[0];
      
      if (!counter || counter.date !== todayStr) {
        // Reset counter for new day
        counter = await tx.orderCounter.upsert({
          where: { id: 'global' },
          update: { count: 1, date: todayStr },
          create: { id: 'global', count: 1, date: todayStr },
        });
        return `ORD-${dateStr}-${String(1).padStart(4, '0')}`;
      } else {
        // Increment counter
        const newCount = counter.count + 1;
        await tx.orderCounter.update({
          where: { id: 'global' },
          data: { count: newCount },
        });
        return `ORD-${dateStr}-${String(newCount).padStart(4, '0')}`;
      }
    }, { 
      isolationLevel: 'Serializable',
      maxWait: 5000,
      timeout: 10000,
    });

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

    // Apply discount - prefer frontend values over code lookup
    let discountAmount = data.discountAmount || 0;
    let discountPercent = data.discountPercent || 0;

    // If discount code provided, look it up (frontend values take precedence if both provided)
    if (data.discountCode && !discountAmount && !discountPercent) {
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

    // Get tip from frontend (cashier-entered tip)
    const tipAmount = data.tipAmount || 0;

    const totalAmount = subtotal - discountAmount + taxAmount + surchargeAmount + tipAmount;

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
          tipAmount: tipAmount || undefined,
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

      // Create KOT tickets for kitchen with unique timestamp-based IDs
      let kotCounter = 1;
      for (const item of newOrder.items) {
        const timestamp = Date.now();
        const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        await tx.kotTicket.create({
          data: {
            ticketNumber: `KOT-${dateStr}-${String(kotCounter).padStart(3, '0')}-${timestamp}-${randomSuffix}`,
            orderId: newOrder.id,
            orderItemId: item.id,
            course: 'main',
            status: 'NEW',
          },
        });
        kotCounter++;
      }

      // Auto-deduct inventory for items with recipes OR direct inventory link
      for (const item of newOrder.items) {
        if (!item.menuItemId) continue;

        // First: Try to deduct via recipe ingredients
        const recipes = await (tx as any).recipe.findMany({
          where: { menuItemId: item.menuItemId },
          include: {
            ingredients: {
              include: { inventoryItem: true },
            },
          },
        });

        if (recipes.length > 0) {
          // Deduct via recipe ingredients
          for (const recipe of recipes) {
            for (const ingredient of recipe.ingredients || []) {
              if (ingredient.inventoryItemId && ingredient.inventoryItem) {
                const requiredQty = ingredient.quantity * item.quantity;
                const inventoryItem = ingredient.inventoryItem;

                // Atomically deduct from inventory with stock check
                // This prevents race conditions by ensuring stock >= required in the update
                const previousStock = inventoryItem.currentStock;
                const newStock = Math.max(0, previousStock - requiredQty);
                const status = newStock === 0 ? 'OUT_OF_STOCK' :
                              newStock <= inventoryItem.minStock ? 'LOW_STOCK' : 'IN_STOCK';

                const updateResult = await (tx as any).inventoryItem.updateMany({
                  where: { 
                    id: inventoryItem.id,
                    currentStock: { gte: requiredQty } // Only update if enough stock
                  },
                  data: {
                    currentStock: { decrement: requiredQty },
                    status,
                  },
                });

                // Verify update happened - if not, stock was insufficient due to race condition
                if (updateResult.count === 0) {
                  logger.error(`Race condition detected: ${inventoryItem.name} - Required: ${requiredQty} but stock was taken by concurrent order`);
                  throw new AppError(`Insufficient stock for ${inventoryItem.name}. Please check inventory and retry.`, 409);
                }

                // Log low stock warning if applicable
                if (previousStock < requiredQty * 2) {
                  logger.warn(`Low stock alert: ${inventoryItem.name} - Required: ${requiredQty}, Available before deduction: ${previousStock}`);
                }

                // Record stock movement
                try {
                  await (tx as any).stockMovement.create({
                    data: {
                      inventoryItemId: inventoryItem.id,
                      type: 'SALE',
                      quantity: requiredQty,
                      previousStock: inventoryItem.currentStock,
                      newStock,
                      reference: `Order ${orderNumber}`,
                      notes: `Auto-deducted via recipe for order item`,
                      performedById: req.user!.userId,
                    },
                  });
                } catch (e) {
                  // Table may not exist, skip
                }
              }
            }
          }
        } else {
          // Second: No recipe - try direct inventory item link
          const inventoryItems = await (tx as any).inventoryItem.findMany({
            where: { menuItemId: item.menuItemId, isActive: true },
          });

          for (const inventoryItem of inventoryItems) {
            const requiredQty = item.quantity;

            // Atomically deduct from inventory with stock check
            // This prevents race conditions by ensuring stock >= required in the update
            const previousStock = inventoryItem.currentStock;
            const newStock = Math.max(0, previousStock - requiredQty);
            const status = newStock === 0 ? 'OUT_OF_STOCK' :
                          newStock <= inventoryItem.minStock ? 'LOW_STOCK' : 'IN_STOCK';

            const updateResult = await (tx as any).inventoryItem.updateMany({
              where: { 
                id: inventoryItem.id,
                currentStock: { gte: requiredQty } // Only update if enough stock
              },
              data: {
                currentStock: { decrement: requiredQty },
                status,
              },
            });

            // Verify update happened - if not, stock was insufficient due to race condition
            if (updateResult.count === 0) {
              logger.error(`Race condition detected: ${inventoryItem.name} - Required: ${requiredQty} but stock was taken by concurrent order`);
              throw new AppError(`Insufficient stock for ${inventoryItem.name}. Please check inventory and retry.`, 409);
            }

            // Log low stock warning if applicable
            if (previousStock < requiredQty * 2) {
              logger.warn(`Low stock alert: ${inventoryItem.name} - Required: ${requiredQty}, Available before deduction: ${previousStock}`);
            }

            // Record stock movement
            try {
              await (tx as any).stockMovement.create({
                data: {
                  inventoryItemId: inventoryItem.id,
                  type: 'SALE',
                  quantity: requiredQty,
                  previousStock: inventoryItem.currentStock,
                  newStock,
                  reference: `Order ${orderNumber}`,
                  notes: `Auto-deducted via direct link: ${inventoryItem.name}`,
                  performedById: req.user!.userId,
                },
              });
            } catch (e) {
              // Table may not exist, skip
            }

            // Create low stock alert if needed (if table exists)
            if (status === 'LOW_STOCK') {
              try {
                await (tx as any).stockAlert.create({
                  data: {
                    inventoryItemId: inventoryItem.id,
                    alertType: 'LOW_STOCK',
                    message: `${inventoryItem.name} is below minimum level. Current: ${newStock}, Min: ${inventoryItem.minStock}`,
                    isResolved: false,
                  },
                });
              } catch (e) {
                // Table may not exist, skip
              }
            }
          }
        }
      }

      return newOrder;
    });

    // Save idempotency key if provided
    if (idempotencyKey) {
      try {
        await (prisma as any).idempotencyKey.create({
          data: {
            key: idempotencyKey,
            requestPath: req.path,
            requestBody: JSON.stringify(data),
            responseBody: JSON.stringify({ order }),
            orderId: order.id,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours TTL
          },
        });
      } catch (e) {
        // Non-critical error, log but don't fail
        logger.warn(`Failed to save idempotency key: ${e}`);
      }
    }

    // Emit real-time event via WebSocket
    const ws = getWebSocketManager();
    ws.emitOrderCreated(order);

    logger.info(`Order created: ${sanitize(orderNumber)} by ${sanitize(req.user!.username)}`);

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

    // Emit real-time event via WebSocket
    const ws = getWebSocketManager();
    ws.emitOrderUpdated(updatedOrder.id, updatedOrder);

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
    const { 
      method, 
      amount, 
      reference, 
      notes,
      cashReceived,
      cardLastFour,
      transferReference,
      discountAmount,
      discountPercent,
    } = req.body;

    // Wrap entire payment processing in a database transaction
    const result = await prisma.$transaction(async (tx) => {
      // Get order with lock
      const order = await tx.order.findUnique({
        where: { id: req.params.id },
      });

      if (!order) {
        throw new AppError('Order not found', 404);
      }

      // Handle discount if applied
      let finalTotalAmount = Number(order.totalAmount);
      let finalDiscountAmount = Number(order.discountAmount || 0);
      
      if (discountAmount && discountAmount > 0) {
        finalDiscountAmount = discountAmount;
        finalTotalAmount = Number(order.subtotal || order.totalAmount) - discountAmount + Number(order.taxAmount || 0);
      }

      const paidAmount = Number(order.paidAmount) + amount;

      // Build payment notes with additional details
      let paymentNotes = notes || '';
      if (method === 'CASH' && cashReceived) {
        const change = Number(cashReceived) - amount;
        paymentNotes = `${paymentNotes} Cash: ${cashReceived}, Change: ${change}`.trim();
      }
      if (method === 'CARD' && cardLastFour) {
        paymentNotes = `${paymentNotes} Card ending: ${cardLastFour}`.trim();
      }
      if (method === 'ONLINE_TRANSFER' && transferReference) {
        paymentNotes = `${paymentNotes} Transfer Ref: ${transferReference}`.trim();
      }

      // Create payment record
      const payment = await tx.payment.create({
        data: {
          orderId: order.id,
          method,
          amount,
          reference: transferReference || reference,
          notes: paymentNotes || undefined,
          status: 'PAID',
        },
      });

      // Update order with discount if applied
      const updateData: any = {
        paidAmount,
        paymentStatus: paidAmount >= finalTotalAmount ? 'PAID' : 'PARTIAL',
        paymentMethod: method,
      };
      
      // Only update discount fields if new discount is applied
      if (discountAmount && discountAmount > 0) {
        updateData.discountAmount = finalDiscountAmount;
        updateData.discountPercent = discountPercent || 0;
        updateData.totalAmount = finalTotalAmount;
      }

      let finalOrder = await tx.order.update({
        where: { id: order.id },
        data: updateData,
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
      if (paidAmount >= finalTotalAmount && order.status !== 'COMPLETED') {
        finalOrder = await tx.order.update({
          where: { id: order.id },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
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

        // Free up table
        if (order.tableId) {
          await tx.table.update({
            where: { id: order.tableId },
            data: {
              status: 'NEEDS_CLEANING',
              currentOrderId: null,
            },
          });
        }
      }

      return { order: finalOrder, payment, paidAmount, finalTotalAmount };
    }, {
      isolationLevel: 'Serializable',
      maxWait: 5000,
      timeout: 10000,
    });

    const { order: finalOrder, payment } = result;

    // Emit WebSocket events outside transaction
    const ws = getWebSocketManager();
    if (result.paidAmount >= result.finalTotalAmount) {
      ws.emitOrderStatusChanged(finalOrder.id, 'COMPLETED');
    }
    ws.emitOrderStatusChanged(finalOrder.id, finalOrder.status);

    logger.info(`Payment processed for order ${sanitize(finalOrder.orderNumber)}: ${amount}`);

    res.json({
      success: true,
      data: {
        order: finalOrder,
        payment,
      },
    });
  } catch (error) {
    next(error);
  }
});


// Update reservation
router.put('/reservations/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status, tableId, notes } = req.body;

    const reservation = await prisma.order.update({
      where: { id: req.params.id },
      data: {
        status,
        tableId,
        notes,
      },
    });

    res.json({ success: true, data: { reservation } });
  } catch (error) {
    next(error);
  }
});

// Delete/cancel reservation
router.delete('/reservations/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.order.update({
      where: { id: req.params.id },
      data: {
        status: 'CANCELLED',
      },
    });
    res.json({ success: true, message: 'Reservation cancelled' });
  } catch (error) {
    next(error);
  }
});

// Process refund for order
router.post('/:id/refund', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { type, reason, amount, items, managerPin, approvedBy, refundMethod, originalPaymentMethod } = req.body;

    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { payments: true },
    });

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    // Verify order was paid
    if (order.paymentStatus !== 'PAID') {
      throw new AppError('Cannot refund unpaid order', 400);
    }

    // Validate manager authorization
    // Check if requesting user has manager/admin role
    if (req.user?.role !== 'MANAGER' && req.user?.role !== 'ADMIN') {
      logger.warn(`Unauthorized refund attempt by ${req.user?.username} (role: ${req.user?.role})`);
      throw new AppError('Manager or Admin authorization required for refunds', 403);
    }

    // Get the user's PIN from database and validate
    const requestingUser = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { pin: true, fullName: true },
    });

    if (!requestingUser || !requestingUser.pin) {
      logger.warn(`Refund attempted by ${req.user?.username} without PIN configured`);
      throw new AppError('Manager PIN not configured for your account. Please contact admin.', 400);
    }

    // Validate provided PIN against user's stored PIN hash
    const isValidPin = await bcrypt.compare(managerPin, requestingUser.pin);
    if (!isValidPin) {
      logger.warn(`Failed refund PIN validation for user ${requestingUser.fullName} (${req.user?.username})`);
      throw new AppError('Invalid manager PIN', 401);
    }

    // Create refund record (using Payment model with negative amount for tracking)
// Duplicate payment create removed to fix double refund accounting
// Only one payment record for refund

    // Update order with refund info
    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: type === 'FULL' ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
      },
      include: {
        items: { include: { menuItem: true } },
        table: true,
        customer: true,
        payments: true,
      },
    });

    // Update daily stats for reporting
    logger.info(`Refund processed for order ${order.id}: ${amount} (${type})`);

    res.json({
      success: true,
      data: { order: updatedOrder, refundAmount: amount, refundType: type },
    });
  } catch (error) {
    next(error);
  }
});

// Update existing order (for modifying active orders)
router.put('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { notes, items, kitchenNotes, notifyKitchen } = req.body;

    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { items: { include: { menuItem: true } } },
    });

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    // Only allow updates to orders that aren't completed/cancelled
    if (order.status === 'COMPLETED' || order.status === 'CANCELLED' || order.status === 'REFUNDED') {
      throw new AppError('Cannot modify completed or cancelled orders', 400);
    }

    let updatedOrder;

    await prisma.$transaction(async (tx) => {
      // Update basic fields
      const updateData: any = {
        notes,
        kitchenNotes,
      };

      // If items changed, recalculate totals
      if (items && items.length > 0) {
        let subtotal = 0;
        const orderItems = [];

        // Delete existing items
        await tx.orderItem.deleteMany({
          where: { orderId: order.id },
        });

        // Create new items
        for (const item of items) {
          const menuItem = await tx.menuItem.findUnique({
            where: { id: item.menuItemId || item.menuItem?.id },
          });

          if (!menuItem) continue;

          const totalPrice = Number(menuItem.price) * item.quantity;
          subtotal += totalPrice;

          orderItems.push({
            orderId: order.id,
            menuItemId: menuItem.id,
            quantity: item.quantity,
            unitPrice: menuItem.price,
            totalPrice,
            notes: item.notes,
            modifiers: item.modifiers,
          });
        }

        // Create all new items
        await tx.orderItem.createMany({
          data: orderItems,
        });

        // Update order totals
        updateData.subtotal = subtotal;
        updateData.totalAmount = subtotal - (order.discountAmount || 0) + (order.taxAmount || 0) + (order.surchargeAmount || 0);
      }

      updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: updateData,
        include: {
          items: { include: { menuItem: true } },
          table: true,
          customer: true,
        },
      });

      // Create new KOT tickets if kitchen notification requested
      if (notifyKitchen && items) {
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');

        for (const item of items) {
          const kotCount = await tx.kotTicket.count({
            where: { createdAt: { gte: new Date(today.setHours(0, 0, 0, 0)) } },
          });

          await tx.kotTicket.create({
            data: {
              ticketNumber: `KOT-${dateStr}-${String(kotCount + 1).padStart(3, '0')}-MOD`,
              orderId: order.id,
              course: 'main',
              status: 'NEW',
              notes: `Order modified - added ${item.quantity}x ${item.name || 'item'}`,
            },
          });
        }
      }
    });

    // Emit real-time event
    const ws = getWebSocketManager();
    ws.emitOrderUpdated(updatedOrder!.id, updatedOrder!);

    res.json({
      success: true,
      data: { order: updatedOrder },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
