import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

const purchaseOrderItemSchema = z.object({
  inventoryItemId: z.string(),
  quantity: z.number().min(0),
  unitCost: z.number().min(0),
  receivedQuantity: z.number().min(0).default(0),
});

const purchaseOrderSchema = z.object({
  vendorId: z.string(),
  status: z.enum(['PENDING', 'ORDERED', 'SHIPPED', 'RECEIVED', 'CANCELLED']).default('PENDING'),
  notes: z.string().optional(),
  expectedDelivery: z.string().optional(),
  items: z.array(purchaseOrderItemSchema),
});

router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status, vendorId } = req.query;
    const where: any = { isActive: true };
    if (status) where.status = status as string;
    if (vendorId) where.vendorId = vendorId as string;

    const orders = await prisma.purchaseOrder.findMany({
      where,
      include: {
        vendor: true,
        items: {
          include: { inventoryItem: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: { orders } });
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = purchaseOrderSchema.parse(req.body);
    const total = data.items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);

    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.purchaseOrder.create({
        data: {
          vendorId: data.vendorId,
          status: data.status,
          notes: data.notes,
          expectedDelivery: data.expectedDelivery ? new Date(data.expectedDelivery) : null,
          totalAmount: total,
        },
      });

      await tx.purchaseOrderItem.createMany({
        data: data.items.map((item) => ({
          purchaseOrderId: newOrder.id,
          inventoryItemId: item.inventoryItemId,
          quantity: item.quantity,
          unitCost: item.unitCost,
          receivedQuantity: item.receivedQuantity,
        })),
      });

      return newOrder;
    });
    res.status(201).json({ success: true, data: { order } });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = purchaseOrderSchema.partial().parse(req.body);
    const order = await prisma.purchaseOrder.update({
      where: { id: req.params.id },
      data: {
        status: data.status,
        notes: data.notes,
        expectedDelivery: data.expectedDelivery ? new Date(data.expectedDelivery) : null,
      },
    });
    res.json({ success: true, data: { order } });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/receive', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { items } = req.body;
    
    const order = await prisma.$transaction(async (tx) => {
      for (const item of items || []) {
        await tx.purchaseOrderItem.updateMany({
          where: { 
            purchaseOrderId: req.params.id,
            inventoryItemId: item.inventoryItemId,
          },
          data: { receivedQuantity: item.receivedQuantity },
        });

        const poItem = await tx.purchaseOrderItem.findFirst({
          where: {
            purchaseOrderId: req.params.id,
            inventoryItemId: item.inventoryItemId,
          },
        });

        if (poItem && item.receivedQuantity > 0) {
          const inventoryItem = await tx.inventoryItem.findUnique({
            where: { id: item.inventoryItemId },
          });

          if (inventoryItem) {
            await tx.inventoryItem.update({
              where: { id: item.inventoryItemId },
              data: {
                currentStock: inventoryItem.currentStock + item.receivedQuantity,
              },
            });
          }
        }
      }

      const allReceived = await tx.purchaseOrderItem.findMany({
        where: { purchaseOrderId: req.params.id },
      });

      const allFullyReceived = allReceived.every(
        (item) => item.receivedQuantity >= item.quantity
      );

      return tx.purchaseOrder.update({
        where: { id: req.params.id },
        data: {
          status: allFullyReceived ? 'RECEIVED' : 'SHIPPED',
          receivedAt: allFullyReceived ? new Date() : null,
        },
      });
    });
    res.json({ success: true, data: { order } });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.purchaseOrder.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    res.json({ success: true, message: 'Purchase order cancelled' });
  } catch (error) {
    next(error);
  }
});

export default router;