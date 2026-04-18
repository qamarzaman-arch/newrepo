import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../server';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

const comboItemSchema = z.object({
  menuItemId: z.string(),
  quantity: z.number().min(1),
  price: z.number().min(0),
});

const comboSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().min(0),
  isAvailable: z.boolean().default(true),
  items: z.array(comboItemSchema).min(1),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const combos = await prisma.combo.findMany({
      where: { isActive: true },
      include: {
        items: {
          include: { menuItem: true },
        },
      },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: { combos } });
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = comboSchema.parse(req.body);
    const combo = await prisma.$transaction(async (tx) => {
      const newCombo = await tx.combo.create({
        data: {
          name: data.name,
          description: data.description,
          price: data.price,
          isAvailable: data.isAvailable,
          startDate: data.startDate ? new Date(data.startDate) : null,
          endDate: data.endDate ? new Date(data.endDate) : null,
        },
      });

      await tx.comboItem.createMany({
        data: data.items.map((item) => ({
          comboId: newCombo.id,
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          price: item.price,
        })),
      });

      return newCombo;
    });
    res.status(201).json({ success: true, data: { combo } });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = comboSchema.partial().parse(req.body);
    const combo = await prisma.combo.update({
      where: { id: req.params.id },
      data: {
        name: data.name,
        description: data.description,
        price: data.price,
        isAvailable: data.isAvailable,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
      },
    });
    res.json({ success: true, data: { combo } });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.combo.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    res.json({ success: true, message: 'Combo deactivated' });
  } catch (error) {
    next(error);
  }
});

export default router;