import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../server';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

const updateSettingSchema = z.object({
  value: z.string(),
});

// Get all settings
router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { category } = req.query;
    const where: any = {};
    if (category) where.category = category;

    const settings = await prisma.setting.findMany({ where, orderBy: { key: 'asc' } });
    res.json({ success: true, data: { settings } });
  } catch (error) {
    next(error);
  }
});

// Get settings by category
router.get('/category/:category', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const settings = await prisma.setting.findMany({
      where: { category: req.params.category },
      orderBy: { key: 'asc' },
    });
    res.json({ success: true, data: { settings } });
  } catch (error) {
    next(error);
  }
});

// Get setting by key
router.get('/:key', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const setting = await prisma.setting.findUnique({ where: { key: req.params.key } });
    if (!setting) throw new AppError('Setting not found', 404);
    res.json({ success: true, data: { setting } });
  } catch (error) {
    next(error);
  }
});

// Update setting
router.put('/:key', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { value } = updateSettingSchema.parse(req.body);

    const setting = await prisma.setting.upsert({
      where: { key: req.params.key },
      create: { key: req.params.key, value, category: req.body.category || 'general' },
      update: { value },
    });

    res.json({ success: true, data: { setting } });
  } catch (error) {
    next(error);
  }
});

export default router;
