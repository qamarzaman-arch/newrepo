import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { logger, sanitize } from '../utils/logger';
import { verifyAndUpgradeSecret } from '../utils/pinSecurity';
import { getWebSocketManager } from '../utils/websocket';
import { orderLimiter } from '../middleware/rateLimiter';
import { KITCHEN_PRIORITY_MAP, KITCHEN_STATION_MAP, DEFAULT_KITCHEN_STATION, DEFAULT_KITCHEN_PRIORITY } from '../config/kitchenConfig';
import { parsePagination } from '../utils/parsePagination';
import { postOrderJournalEntry } from '../services/accounting.service';
import { paymentGatewayService } from '../services/paymentGateway.service';
import { nextSequence, dailyScope, dateStampUTC } from '../utils/sequence';
import { normalizePhone } from '../utils/phone';

const router = Router();

// Validation schemas
const createOrderSchema = z.object({
  orderType: z.enum(['DINE_IN', 'WALK_IN', 'TAKEAWAY', 'DELIVERY', 'PICKUP', 'RESERVATION']),
  tableId: z.string().optional().nullable(),
  customerId: z.string().optional().nullable(),
  customerName: z.string().optional().nullable(),
  customerPhone: z.string().optional().nullable(),
  items: z.array(z.object({
    menuItemId: z.string().min(1),
    // QA A18: integer quantities only.
    quantity: z.number().int().min(1).max(9999),
    notes: z.string().max(500).optional().nullable(),
    modifiers: z.string().max(2000).optional().nullable(),
    // QA A72: enforce min(1) when items array is supplied.
  })).min(1).optional(),
  discountCode: z.string().optional().nullable(),
  discountPercent: z.number().min(0).max(100).optional().nullable(),
  discountAmount: z.number().min(0).optional().nullable(),
  tipAmount: z.number().min(0).optional().nullable(),
  notes: z.string().optional().nullable(),
  kitchenNotes: z.string().optional().nullable(),
  idempotencyKey: z.string().optional(),
});

// Valid order status transitions (enforce workflow integrity)
// Note: PENDING can transition directly to READY for quick orders (cashier convenience)
const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  PENDING:   ['CONFIRMED', 'READY', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'READY', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY:     ['SERVED', 'COMPLETED'],
  SERVED:    ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
  REFUNDED:  [],
  VOIDED:    [],
};

// Dashboard summary for web-admin orders page
router.get('/summary', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [activeOrders, completedToday, completedTodayOrders] = await Promise.all([
      prisma.order.count({
        where: { status: { in: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'] } },
      }),
      prisma.order.count({
        where: { status: 'COMPLETED', completedAt: { gte: today } },
      }),
      prisma.order.findMany({
        where: { status: 'COMPLETED', completedAt: { gte: today } },
        select: { totalAmount: true },
      }),
    ]);

    const revenueToday = completedTodayOrders.reduce(
      (sum, o) => sum + Number(o.totalAmount), 0
    );

    res.json({ success: true, data: { activeOrders, completedToday, revenueToday } });
  } catch (error) {
    next(error);
  }
});

// Get all orders with filters
router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status, orderType, paymentMethod, startDate, endDate } = req.query;
    const rawSearch = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 100) : undefined;
    const { page, limit } = parsePagination(req.query);

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

    if (rawSearch) {
      where.OR = [
        { orderNumber: { contains: rawSearch, mode: 'insensitive' } },
        { customerName: { contains: rawSearch, mode: 'insensitive' } },
        { customerPhone: { contains: rawSearch, mode: 'insensitive' } },
      ];
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
        select: {
          id: true,
          orderNumber: true,
          orderType: true,
          status: true,
          subtotal: true,
          totalAmount: true,
          paidAmount: true,
          orderedAt: true,
          table: { select: { number: true, status: true } },
          customer: { select: { firstName: true, lastName: true } },
          cashier: { select: { fullName: true } }
        },
        orderBy: { orderedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
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
          page,
          limit,
          totalPages: Math.ceil(total / limit),
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
router.post('/reservations', authenticate, authorize('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { customerName, customerPhone, tableId, notes, status = 'PENDING' } = req.body;

    // Check for duplicate reservation with same phone number and active status
    const existingReservation = await prisma.order.findFirst({
      where: {
        orderType: 'RESERVATION',
        customerPhone,
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
    });

    if (existingReservation) {
      return res.status(400).json({
        success: false,
        error: 'A reservation with this phone number already exists',
      });
    }

    // QA A9 / A47: use the atomic SequenceCounter instead of count()+create.
    const today = new Date();
    const dateStr = dateStampUTC(today);
    const seq = await nextSequence(dailyScope('RES', today));
    const orderNumber = `RES-${dateStr}-${String(seq).padStart(3, '0')}`;

    // QA A20: validate the table exists and is bookable before creating
    // the reservation.
    if (tableId) {
      const table = await prisma.table.findUnique({ where: { id: tableId } });
      if (!table) {
        throw new AppError('Table not found', 404);
      }
      if (!table.isActive) {
        throw new AppError('Table is not active', 409);
      }
      if (table.status === 'OCCUPIED' || table.status === 'RESERVED') {
        throw new AppError(`Table ${table.number} is currently ${table.status}`, 409);
      }
    }

    const normalizedReservationPhone = normalizePhone(customerPhone);

    const reservation = await prisma.order.create({
      data: {
        orderNumber,
        orderType: 'RESERVATION',
        status,
        customerName,
        customerPhone: normalizedReservationPhone ?? customerPhone,
        tableId,
        notes,
        cashierId: req.user!.userId,
        subtotal: 0,
        totalAmount: 0,
      },
    });

    // Update table status to RESERVED if reservation is CONFIRMED
    if (status === 'CONFIRMED' && tableId) {
      await prisma.table.update({
        where: { id: tableId },
        data: { status: 'RESERVED' },
      });
    }

    res.status(201).json({ success: true, data: { reservation } });
  } catch (error) {
    next(error);
  }
});

// Reprint bill
router.post('/:id/reprint', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
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
      },
    });

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    // Log reprint action
    logger.info(`Bill for order ${sanitize(order.orderNumber)} reprinted by ${sanitize(req.user!.username)}`);

    res.json({
      success: true,
      data: { order },
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

router.post('/', authenticate, orderLimiter, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = createOrderSchema.parse(req.body);

    // Idempotency: if the same key has been seen AND not yet expired, return
    // the previously-created order. QA A12: expired keys must be ignored,
    // otherwise stale 7-day-old replies leak through.
    if (data.idempotencyKey) {
      const existing = await prisma.idempotencyKey.findUnique({
        where: { key: data.idempotencyKey },
      });
      if (existing && existing.expiresAt > new Date() && existing.orderId) {
        const order = await prisma.order.findUnique({
          where: { id: existing.orderId },
          include: { items: true, payments: true, table: true, customer: true },
        });
        if (order) {
          return res.json({ success: true, data: { order }, idempotent: true });
        }
      }
      // Best-effort cleanup of expired key so the new write below doesn't conflict.
      if (existing && existing.expiresAt <= new Date()) {
        await prisma.idempotencyKey.delete({ where: { key: data.idempotencyKey } }).catch(() => undefined);
      }
    }

    // QA A9: atomic per-day order number. Old code did count()+create which
    // races at the millisecond boundary and produces duplicate ORD-...-0001s.
    const today = new Date();
    const dateStr = dateStampUTC(today);
    const seq = await nextSequence(dailyScope('ORD', today));
    const orderNumber = `ORD-${dateStr}-${String(seq).padStart(4, '0')}`;

    // QA A19, A74: normalize phone before lookup so the same number isn't
    // saved as two different customers. Use findUnique (Customer.phone is now
    // @unique in the schema) so we never silently pick up a "first match".
    let customerId = data.customerId;
    const normalizedPhone = normalizePhone(data.customerPhone);
    if (data.customerPhone && !normalizedPhone) {
      throw new AppError('customerPhone is not a valid phone number', 400);
    }
    if (!customerId && data.customerName && normalizedPhone) {
      const existingCustomer = await prisma.customer.findUnique({
        where: { phone: normalizedPhone },
      });

      if (existingCustomer) {
        customerId = existingCustomer.id;
      } else {
        const nameParts = data.customerName.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        const newCustomer = await prisma.customer.create({
          data: {
            firstName,
            lastName,
            phone: normalizedPhone,
          },
        });
        customerId = newCustomer.id;
      }
    }
    // Replace caller-supplied phone with normalized form for downstream writes.
    if (normalizedPhone) data.customerPhone = normalizedPhone;

    // Calculate totals
    let subtotal = 0;
    const orderItems = [];

    if (data.items && data.items.length > 0) {
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
        // QA A43: enforce usageLimit atomically. If we can't bump usedCount
        // because the cap is already reached, treat the code as invalid.
        if (discount.usageLimit != null) {
          const bumped = await prisma.discount.updateMany({
            where: { id: discount.id, usedCount: { lt: discount.usageLimit } },
            data: { usedCount: { increment: 1 } },
          });
          if (bumped.count === 0) {
            throw new AppError('Discount code has reached its usage limit', 409);
          }
        } else {
          await prisma.discount.update({
            where: { id: discount.id },
            data: { usedCount: { increment: 1 } },
          });
        }
        if (discount.type === 'percentage') {
          discountPercent = Number(discount.value);
          discountAmount = (subtotal * discountPercent) / 100;
        } else {
          discountAmount = Number(discount.value);
        }
        // QA A44: cap discount at maxValue when configured.
        if (discount.maxValue != null) {
          discountAmount = Math.min(discountAmount, Number(discount.maxValue));
        }
        // Stash discountId so it gets persisted on the order for audit.
        (data as any).__discountId = discount.id;
      }
    }

    // Calculate tax — QA A45: round to 2dp.
    const taxSetting = await prisma.setting.findUnique({
      where: { key: 'tax_rate' },
    });
    const taxRate = taxSetting ? parseFloat(taxSetting.value) : 0;
    const rawTax = (subtotal - discountAmount) * (taxRate / 100);
    const taxAmount = Math.round(rawTax * 100) / 100;

    // Surcharges. QA A46: documented order — surcharge applies to (subtotal - discount).
    const surcharges = await prisma.surcharge.findMany({
      where: {
        isActive: true,
        OR: [
          { applicableTo: 'all' },
          { applicableTo: data.orderType.toLowerCase() },
        ],
      },
    });

    const taxableBase = subtotal - discountAmount;
    let surchargeAmount = 0;
    for (const surcharge of surcharges) {
      if (surcharge.type === 'percentage') {
        surchargeAmount += (taxableBase * Number(surcharge.value)) / 100;
      } else {
        surchargeAmount += Number(surcharge.value);
      }
    }
    surchargeAmount = Math.round(surchargeAmount * 100) / 100;

    const tipAmount = data.tipAmount || 0;
    // QA A45: total rounded to currency precision.
    const totalAmount = Math.round((subtotal - discountAmount + taxAmount + surchargeAmount + tipAmount) * 100) / 100;

    // Create order with transaction
    const order = await prisma.$transaction(async (tx) => {
      // Create order
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          orderType: data.orderType,
          tableId: data.tableId,
          customerId,
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          subtotal,
          discountAmount,
          discountPercent,
          discountId: (data as any).__discountId,
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

      // Create KOT tickets for kitchen with unique timestamp-based IDs and auto-priority
      const priority = KITCHEN_PRIORITY_MAP[data.orderType] || DEFAULT_KITCHEN_PRIORITY;

      // Fetch all menu items with categories in a single query (fix N+1)
      const menuItemIds = newOrder.items.map((item) => item.menuItemId);
      const menuItemsWithCategory = await tx.menuItem.findMany({
        where: { id: { in: menuItemIds } },
        include: { category: true },
      });
      const menuItemCategoryMap = new Map(menuItemsWithCategory.map((mi) => [mi.id, mi]));

      let kotCounter = 1;
      for (const item of newOrder.items) {
        const menuItem = menuItemCategoryMap.get(item.menuItemId);
        const categoryName = menuItem?.category?.name || 'Main Course';
        const station = KITCHEN_STATION_MAP[categoryName] || DEFAULT_KITCHEN_STATION;

        const timestamp = Date.now();
        const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        await tx.kotTicket.create({
          data: {
            ticketNumber: `KOT-${dateStr}-${String(kotCounter).padStart(3, '0')}-${timestamp}-${randomSuffix}`,
            orderId: newOrder.id,
            orderItemId: item.id,
            course: 'main',
            status: 'NEW',
            priority,
            station,
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

                // Read actual current stock after update for accurate audit trail
                const updatedInventoryItem = await (tx as any).inventoryItem.findUnique({
                  where: { id: inventoryItem.id },
                  select: { currentStock: true },
                });

                // Record stock movement
                try {
                  await (tx as any).stockMovement.create({
                    data: {
                      inventoryItemId: inventoryItem.id,
                      type: 'SALE',
                      quantity: requiredQty,
                      previousStock,
                      newStock: updatedInventoryItem?.currentStock ?? newStock,
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

            // Read actual current stock after update for accurate audit trail
            const updatedDirectItem = await (tx as any).inventoryItem.findUnique({
              where: { id: inventoryItem.id },
              select: { currentStock: true },
            });

            // Record stock movement
            try {
              await (tx as any).stockMovement.create({
                data: {
                  inventoryItemId: inventoryItem.id,
                  type: 'SALE',
                  quantity: requiredQty,
                  previousStock,
                  newStock: updatedDirectItem?.currentStock ?? newStock,
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

    // Record idempotency key so retries return the same order instead of duplicating.
    if (data.idempotencyKey) {
      try {
        await prisma.idempotencyKey.create({
          data: {
            key: data.idempotencyKey,
            requestPath: '/api/v1/orders',
            requestBody: JSON.stringify(data).slice(0, 4000),
            responseBody: JSON.stringify({ id: order.id, orderNumber: order.orderNumber }),
            orderId: order.id,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        });
      } catch (err) {
        logger.warn(`Failed to persist idempotency key ${data.idempotencyKey}: ${err}`);
      }
    }

    // Emit real-time event via WebSocket
    const ws = getWebSocketManager();
    ws.emitOrderCreated(order);

    // QA A77: include item summary in the audit log so compliance reviews
    // don't have to join back to OrderItem.
    const auditItems = (data.items || []).map(it => `${it.menuItemId}x${it.quantity}`).join(',');
    logger.info(`Order created: ${sanitize(orderNumber)} by ${sanitize(req.user!.username)} items=[${sanitize(auditItems)}] total=${totalAmount}`);

    res.status(201).json({
      success: true,
      data: { order },
    });
  } catch (error) {
    next(error);
  }
});

// Update order status — cashiers move orders through the workflow, kitchen marks food ready
router.patch('/:id/status', authenticate, authorize('ADMIN', 'MANAGER', 'CASHIER', 'KITCHEN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status, cancelReason } = req.body;

    if (!status || typeof status !== 'string') {
      throw new AppError('Status is required', 400);
    }

    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
    });

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    // Idempotent check: if order already has target status, return success
    if (order.status === status) {
      const currentOrder = await prisma.order.findUnique({
        where: { id: req.params.id },
        include: {
          items: { include: { menuItem: true } },
          table: true,
        },
      });
      res.json({ success: true, data: { order: currentOrder, idempotent: true } });
      return;
    }

    // Enforce valid status transition to prevent workflow bypassing
    const allowedTransitions = VALID_STATUS_TRANSITIONS[order.status] ?? [];
    if (!allowedTransitions.includes(status)) {
      throw new AppError(
        `Cannot transition order from ${order.status} to ${status}. Allowed: ${allowedTransitions.join(', ') || 'none'}`,
        400
      );
    }

    // QA A14: refuse to complete an order while any KOT ticket is still in
    // a non-terminal state. Otherwise food can be marked done before it leaves
    // the kitchen.
    if (status === 'COMPLETED' || status === 'SERVED') {
      const openTickets = await prisma.kotTicket.count({
        where: {
          orderId: order.id,
          status: { notIn: ['COMPLETED', 'DISPATCHED', 'CANCELLED'] },
        },
      });
      if (openTickets > 0) {
        throw new AppError(
          `Cannot mark order ${status}: ${openTickets} kitchen ticket(s) still open`,
          409
        );
      }
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

    // Log status change to audit trail
    await prisma.orderModificationHistory.create({
      data: {
        orderId: req.params.id,
        fieldName: 'status',
        oldValue: String(order.status),
        newValue: String(status),
        reason: cancelReason || `Status changed from ${order.status} to ${status}`,
        modifiedById: req.user!.userId,
        modifiedAt: new Date(),
      },
    });

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
    const paymentSchema = z.object({
      method: z.string(),
      amount: z.number().positive('Payment amount must be greater than zero'),
      reference: z.string().optional().nullable(),
      notes: z.string().optional().nullable(),
      cashReceived: z.union([z.number(), z.string().transform(v => Number(v))]).optional().nullable(),
      cardLastFour: z.string().optional().nullable(),
      transferReference: z.string().optional().nullable(),
      discountAmount: z.number().optional().nullable(),
      discountPercent: z.number().optional().nullable(),
    });
    
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
    } = paymentSchema.parse(req.body);

    // Wrap entire payment processing in a database transaction
    const result = await prisma.$transaction(async (tx) => {
      // Get order with lock
      const order = await tx.order.findUnique({
        where: { id: req.params.id },
      });

      if (!order) {
        throw new AppError('Order not found', 404);
      }

      // QA A13: discounts must be locked at order creation. Rejecting them
      // here closes the fraud vector where a partial-pay → re-discount could
      // shrink finalTotalAmount mid-collection.
      const finalTotalAmount = Number(order.totalAmount);
      const finalDiscountAmount = Number(order.discountAmount || 0);
      if (discountAmount && discountAmount > 0 && discountAmount !== finalDiscountAmount) {
        throw new AppError('Discounts cannot be changed at payment time. Modify the order instead.', 400);
      }

      const paidAmount = Number(order.paidAmount) + amount;

      if (paidAmount > finalTotalAmount && method !== 'CASH') {
        throw new AppError('Payment amount exceeds order total', 400);
      }

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
      
      // QA A13: discount immutability at payment time — no discount field
      // updates here. The earlier guard rejects any mismatch outright.

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

    // Post journal entry when fully paid
    if (result.paidAmount >= result.finalTotalAmount) {
      try {
        await postOrderJournalEntry(prisma, {
          id: finalOrder.id,
          paidAmount: Number(finalOrder.paidAmount),
          subtotal: Number(finalOrder.subtotal),
          discountAmount: Number(finalOrder.discountAmount),
          taxAmount: Number(finalOrder.taxAmount),
          tipAmount: Number(finalOrder.tipAmount),
          branchId: (finalOrder as any).branchId,
        });
      } catch (jErr) {
        logger.error('Failed to post order journal entry:', jErr);
      }
    }

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
router.put('/reservations/:id', authenticate, authorize('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status, tableId, notes, customerPhone } = req.body;

    // Check for duplicate reservation with same phone number and active status (excluding current reservation)
    if (customerPhone) {
      const existingReservation = await prisma.order.findFirst({
        where: {
          orderType: 'RESERVATION',
          customerPhone,
          status: { in: ['PENDING', 'CONFIRMED'] },
          id: { not: req.params.id },
        },
      });

      if (existingReservation) {
        return res.status(400).json({
          success: false,
          error: 'A reservation with this phone number already exists',
        });
      }
    }

    const reservation = await prisma.order.update({
      where: { id: req.params.id },
      data: {
        status,
        tableId,
        notes,
        ...(customerPhone && { customerPhone }),
      },
    });

    // Update table status to RESERVED if reservation is CONFIRMED
    if (status === 'CONFIRMED' && tableId) {
      await prisma.table.update({
        where: { id: tableId },
        data: { status: 'RESERVED' },
      });
    }

    // Update table status to AVAILABLE if reservation is CANCELLED or COMPLETED
    if ((status === 'CANCELLED' || status === 'COMPLETED') && reservation.tableId) {
      await prisma.table.update({
        where: { id: reservation.tableId },
        data: { status: 'AVAILABLE' },
      });
    }

    res.json({ success: true, data: { reservation } });
  } catch (error) {
    next(error);
  }
});

// Delete/cancel reservation
router.delete('/reservations/:id', authenticate, authorize('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
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

    if (!managerPin) {
      throw new AppError('Manager PIN is required for refunds', 400);
    }

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
    const isValidPin = await verifyAndUpgradeSecret(managerPin, requestingUser.pin, async (hashedPin) => {
      await prisma.user.update({
        where: { id: req.user!.userId },
        data: { pin: hashedPin },
      });
    });
    if (!isValidPin) {
      logger.warn(`Failed refund PIN validation for user ${requestingUser.fullName} (${req.user?.username})`);
      throw new AppError('Invalid manager PIN', 401);
    }

    // Phase 1: validate, lock, and (if applicable) call the payment gateway BEFORE
    // mutating the local DB. We do not want to mark a refund "done" locally while
    // the customer never actually receives money (QA A16). If the gateway call
    // fails the transaction below never starts, so order state stays consistent.
    const preCheck = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { payments: true, items: { include: { menuItem: true } } },
    });

    if (!preCheck) {
      throw new AppError('Order not found', 404);
    }
    if (preCheck.paymentStatus !== 'PAID' && preCheck.paymentStatus !== 'PARTIAL') {
      throw new AppError('Cannot refund unpaid order', 400);
    }

    const positivePayments = preCheck.payments.filter(p => Number(p.amount) > 0);
    const totalPaid = positivePayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const orderTotal = Number(preCheck.totalAmount);

    // QA A15: cap at min(totalPaid, totalAmount). Overpaid orders must NOT
    // allow refunding more than the order itself was worth.
    const maxRefundableAmount = Math.max(0, Math.min(totalPaid, orderTotal));

    const requestedRefundAmount = type === 'FULL'
      ? maxRefundableAmount
      : Number(amount);

    if (!Number.isFinite(requestedRefundAmount) || requestedRefundAmount <= 0) {
      throw new AppError('Refund amount must be greater than zero', 400);
    }
    if (requestedRefundAmount > maxRefundableAmount) {
      throw new AppError(
        `Refund amount ${requestedRefundAmount} exceeds refundable cap ${maxRefundableAmount}`,
        400
      );
    }

    // QA A16: actually call Stripe when the original payment was on Stripe.
    // We refund newest-first up to the requested amount, splitting across
    // intents if needed. CASH / OFFLINE refunds are recorded only in the DB.
    const stripePayments = positivePayments
      .filter(p => p.stripePaymentIntentId)
      .sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime());

    const stripeRefundResults: Array<{ paymentId: string; refundId: string; amount: number }> = [];
    let remainingToRefund = requestedRefundAmount;

    for (const payment of stripePayments) {
      if (remainingToRefund <= 0) break;
      const piId = payment.stripePaymentIntentId;
      if (!piId) continue;
      const refundFromThis = Math.min(remainingToRefund, Number(payment.amount));
      const refundCents = Math.round(refundFromThis * 100);
      try {
        const result = await paymentGatewayService.processStripeRefund({
          paymentIntentId: piId,
          amount: refundCents,
          reason,
        });
        stripeRefundResults.push({
          paymentId: payment.id,
          refundId: result.refundId,
          amount: refundFromThis,
        });
        remainingToRefund -= refundFromThis;
      } catch (err: any) {
        // Hard stop: do not mutate the DB if Stripe rejected. Tell the user.
        logger.error(`Stripe refund failed for order ${preCheck.orderNumber} payment ${payment.id}: ${err.message}`);
        throw new AppError(`Refund failed at payment gateway: ${err.message}`, 502);
      }
    }

    // Phase 2: persist refund records, update order, and reverse inventory atomically.
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: req.params.id },
        include: { payments: true, items: true },
      });
      if (!order) {
        throw new AppError('Order not found', 404);
      }

      const refundReference = `refund-${order.orderNumber}-${Date.now()}`;
      const refundNotes = [
        reason ? `Reason: ${reason}` : null,
        approvedBy ? `Approved By: ${approvedBy}` : null,
        originalPaymentMethod ? `Original Method: ${originalPaymentMethod}` : null,
        items?.length ? `Items: ${JSON.stringify(items)}` : null,
        stripeRefundResults.length
          ? `Stripe refunds: ${stripeRefundResults.map(r => `${r.refundId}=${r.amount}`).join(', ')}`
          : null,
      ].filter(Boolean).join(' | ');

      await tx.payment.create({
        data: {
          orderId: order.id,
          method: refundMethod || originalPaymentMethod || 'REFUND',
          amount: -requestedRefundAmount,
          reference: refundReference,
          notes: refundNotes || undefined,
          status: 'REFUNDED',
          stripeRefundId: stripeRefundResults[0]?.refundId,
        },
      });

      // Stamp the gateway refund id back onto the original Payment rows that
      // we refunded, so reconciliation tools can trace each refund.
      for (const r of stripeRefundResults) {
        await tx.payment.update({
          where: { id: r.paymentId },
          data: { stripeRefundId: r.refundId },
        }).catch(() => undefined);
      }

      const remainingPaidAmount = Math.max(Number(order.paidAmount) - requestedRefundAmount, 0);
      const refundStatus = type === 'FULL' || remainingPaidAmount === 0
        ? 'REFUNDED'
        : 'PARTIALLY_REFUNDED';
      const paymentStatus = remainingPaidAmount <= 0
        ? 'REFUNDED'
        : remainingPaidAmount < Number(order.totalAmount)
          ? 'PARTIAL'
          : 'PAID';

      // QA A16 (inventory reversal): only reverse stock for FULL refunds. Partial
      // refunds usually mean a discount/concession, not goods returned. Refund
      // payload may also list specific items via `items`; if present, reverse
      // only those quantities.
      if (type === 'FULL' || (Array.isArray(items) && items.length > 0)) {
        const itemsToReverse = Array.isArray(items) && items.length > 0
          ? items.map((it: any) => ({
              menuItemId: it.menuItemId,
              quantity: Number(it.quantity) || 0,
            }))
          : order.items.map(oi => ({
              menuItemId: oi.menuItemId,
              quantity: oi.quantity,
            }));

        for (const it of itemsToReverse) {
          if (!it.menuItemId || it.quantity <= 0) continue;
          const recipes = await (tx as any).recipe.findMany({
            where: { menuItemId: it.menuItemId },
            include: { ingredients: true },
          });
          if (recipes.length > 0) {
            for (const recipe of recipes) {
              for (const ing of recipe.ingredients || []) {
                if (!ing.inventoryItemId) continue;
                const qty = Number(ing.quantity) * it.quantity;
                await (tx as any).inventoryItem.update({
                  where: { id: ing.inventoryItemId },
                  data: { currentStock: { increment: qty } },
                }).catch(() => undefined);
                await (tx as any).stockMovement.create({
                  data: {
                    inventoryItemId: ing.inventoryItemId,
                    type: 'REFUND',
                    quantity: qty,
                    previousStock: 0,
                    newStock: 0,
                    reference: `Refund ${order.orderNumber}`,
                    notes: 'Inventory restored on refund',
                    performedById: req.user!.userId,
                  },
                }).catch(() => undefined);
              }
            }
          } else {
            const invItems = await (tx as any).inventoryItem.findMany({
              where: { menuItemId: it.menuItemId, isActive: true },
            });
            for (const inv of invItems) {
              await (tx as any).inventoryItem.update({
                where: { id: inv.id },
                data: { currentStock: { increment: it.quantity } },
              }).catch(() => undefined);
              await (tx as any).stockMovement.create({
                data: {
                  inventoryItemId: inv.id,
                  type: 'REFUND',
                  quantity: it.quantity,
                  previousStock: 0,
                  newStock: 0,
                  reference: `Refund ${order.orderNumber}`,
                  notes: 'Inventory restored on refund',
                  performedById: req.user!.userId,
                },
              }).catch(() => undefined);
            }
          }
        }
      }

      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: refundStatus,
          paidAmount: remainingPaidAmount,
          paymentStatus,
        },
        include: {
          items: { include: { menuItem: true } },
          table: true,
          customer: true,
          payments: true,
        },
      });

      if (order.tableId && refundStatus === 'REFUNDED') {
        await tx.table.update({
          where: { id: order.tableId },
          data: {
            status: 'AVAILABLE',
            currentOrderId: null,
          },
        }).catch(() => undefined);
      }

      return {
        updatedOrder,
        refundAmount: requestedRefundAmount,
        refundType: type,
        stripeRefunds: stripeRefundResults,
      };
    }, {
      isolationLevel: 'Serializable',
      maxWait: 5000,
      timeout: 10000,
    });

    // Update daily stats for reporting
    logger.info(`Refund processed for order ${req.params.id}: ${result.refundAmount} (${result.refundType})`);

    res.json({
      success: true,
      data: {
        order: result.updatedOrder,
        refundAmount: result.refundAmount,
        refundType: result.refundType,
        stripeRefunds: result.stripeRefunds,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Update existing order (for modifying active orders)
router.put('/:id', authenticate, authorize('ADMIN', 'MANAGER', 'CASHIER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
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

        // QA A17: when item lines are replaced, any KOT tickets the kitchen
        // is currently working on reference items that no longer exist. Mark
        // them VOIDED so the line cook isn't preparing food for a deleted
        // line. The new KOT (if notifyKitchen) is created below.
        await tx.kotTicket.updateMany({
          where: { orderId: order.id, status: { in: ['NEW', 'PREPARING'] } },
          data: { status: 'VOIDED' },
        });

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
        updateData.totalAmount = subtotal - Number(order.discountAmount || 0) + Number(order.taxAmount || 0) + Number(order.surchargeAmount || 0);
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

// Delete order
router.delete('/:id', authenticate, authorize('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
    });

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    // Only allow deletion of orders that aren't completed/cancelled
    if (order.status === 'COMPLETED' || order.status === 'CANCELLED') {
      throw new AppError('Cannot delete completed or cancelled orders', 400);
    }

    await prisma.order.update({
      where: { id: req.params.id },
      data: {
        status: 'CANCELLED',
      },
    });

    logger.info(`Order ${sanitize(order.orderNumber)} deleted by ${sanitize(req.user!.username)}`);

    res.json({
      success: true,
      message: 'Order deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
